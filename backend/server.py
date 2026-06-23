from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId

from auth_utils import (
    hash_password,
    verify_password,
    create_access_token,
    decode_token,
    extract_token,
)
from stock_service import (
    get_quote,
    get_history,
    get_indicators,
    analyze_with_ai,
    get_analyst_targets,
    get_news,
    get_sentiment_summary,
    search_symbols,
)
from market_service import get_market_overview

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("stockai")

# Mongo
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="AI Stock Analysis API")
api = APIRouter(prefix="/api")


# ---------- Models ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    name: Optional[str] = None


class WatchlistIn(BaseModel):
    symbol: str


class PortfolioIn(BaseModel):
    symbol: str
    quantity: float
    buy_price: float
    buy_date: Optional[str] = None
    notes: Optional[str] = None


class PortfolioUpdateIn(BaseModel):
    quantity: Optional[float] = None
    buy_price: Optional[float] = None
    buy_date: Optional[str] = None
    notes: Optional[str] = None
    name: Optional[str] = None


class SaveAnalysisIn(BaseModel):
    symbol: str
    name: Optional[str] = None
    quote: dict
    indicators: dict
    analysis: dict


# ---------- Auth dependency ----------
async def current_user(request: Request) -> dict:
    token = extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(token)
    try:
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    except Exception:
        user = None
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return {"id": str(user["_id"]), "email": user["email"], "name": user.get("name")}


# ---------- Auth routes ----------
@api.post("/auth/register")
async def register(body: RegisterIn):
    email = body.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name or email.split("@")[0],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.users.insert_one(doc)
    uid = str(res.inserted_id)
    token = create_access_token(uid, email)
    return {"user": {"id": uid, "email": email, "name": doc["name"]}, "token": token}


@api.post("/auth/login")
async def login(body: LoginIn):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    uid = str(user["_id"])
    token = create_access_token(uid, email)
    return {"user": {"id": uid, "email": email, "name": user.get("name")}, "token": token}


@api.get("/auth/me")
async def me(user: dict = Depends(current_user)):
    return user


# ---------- Stock routes (public read, but search/quote can be open) ----------
@api.get("/stock/search")
async def stock_search(q: str):
    if not q or len(q) < 1:
        return {"results": []}
    results = await search_symbols(q)
    return {"results": results}


@api.get("/stock/quote/{symbol}")
async def stock_quote(symbol: str):
    try:
        return await get_quote(symbol)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Could not fetch quote: {e}")


@api.get("/stock/history/{symbol}")
async def stock_history(symbol: str, period: str = "6mo", interval: str = "1d"):
    try:
        data = await get_history(symbol, period, interval)
        return {"symbol": symbol.upper(), "period": period, "interval": interval, "candles": data}
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Could not fetch history: {e}")


@api.get("/stock/indicators/{symbol}")
async def stock_indicators(symbol: str):
    try:
        return await get_indicators(symbol)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Could not compute indicators: {e}")


@api.get("/stock/news/{symbol}")
async def stock_news(symbol: str):
    items = await get_news(symbol)
    return {"symbol": symbol.upper(), "items": items}


@api.get("/stock/analysts/{symbol}")
async def stock_analysts(symbol: str):
    try:
        data = await get_analyst_targets(symbol)
        return {"symbol": symbol.upper(), **data}
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Could not fetch analyst data: {e}")


@api.get("/stock/sentiment/{symbol}")
async def stock_sentiment(symbol: str):
    try:
        data = await get_sentiment_summary(symbol)
        return {"symbol": symbol.upper(), **data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sentiment analysis failed: {e}")


@api.post("/stock/analyze/{symbol}")
async def stock_analyze(symbol: str):
    try:
        quote = await get_quote(symbol)
        indicators = await get_indicators(symbol)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"No data for {symbol}: {e}")
    # Fetch analyst targets (non-critical — don't fail if unavailable)
    analyst_data = {}
    try:
        analyst_data = await get_analyst_targets(symbol)
    except Exception:
        pass
    try:
        analysis = await analyze_with_ai(symbol, quote, indicators, analyst_data)
    except Exception as e:
        logger.exception("AI analysis failed")
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {e}")
    return {"symbol": symbol.upper(), "quote": quote, "indicators": indicators, "analysis": analysis, "analysts": analyst_data}


# ---------- Watchlist ----------
@api.get("/watchlist")
async def watchlist_list(user: dict = Depends(current_user)):
    items = await db.watchlist.find({"user_id": user["id"]}).sort("created_at", -1).to_list(100)
    out = []
    for it in items:
        out.append({
            "id": str(it["_id"]),
            "symbol": it["symbol"],
            "name": it.get("name"),
            "created_at": it.get("created_at"),
        })
    return {"items": out}


@api.post("/watchlist")
async def watchlist_add(body: WatchlistIn, user: dict = Depends(current_user)):
    symbol = body.symbol.upper()
    existing = await db.watchlist.find_one({"user_id": user["id"], "symbol": symbol})
    if existing:
        return {"id": str(existing["_id"]), "symbol": symbol, "name": existing.get("name")}
    doc = {
        "user_id": user["id"],
        "symbol": symbol,
        "name": body.name,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.watchlist.insert_one(doc)
    return {"id": str(res.inserted_id), "symbol": symbol, "name": body.name}


@api.delete("/watchlist/{item_id}")
async def watchlist_remove(item_id: str, user: dict = Depends(current_user)):
    try:
        res = await db.watchlist.delete_one({"_id": ObjectId(item_id), "user_id": user["id"]})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


# ---------- Portfolio ----------
@api.get("/portfolio")
async def portfolio_list(user: dict = Depends(current_user)):
    items = await db.portfolio.find({"user_id": user["id"]}).sort("created_at", -1).to_list(100)
    out = []
    for it in items:
        out.append({
            "id": str(it["_id"]),
            "symbol": it["symbol"],
            "quantity": it["quantity"],
            "buy_price": it["buy_price"],
            "buy_date": it.get("buy_date"),
            "notes": it.get("notes", ""),
            "created_at": it.get("created_at"),
        })
    return out


@api.get("/portfolio/summary")
async def portfolio_summary(user: dict = Depends(current_user)):
    """Portfolio with live prices, P&L, and extended hours data."""
    items = await db.portfolio.find({"user_id": user["id"]}).sort("created_at", -1).to_list(100)
    positions = []
    total_invested = 0
    total_current = 0
    total_extended = 0
    has_extended = False
    extended_label = None
    for it in items:
        symbol = it["symbol"]
        qty = it["quantity"]
        buy_price = it["buy_price"]
        cost_basis = qty * buy_price
        total_invested += cost_basis
        try:
            quote = await get_quote(symbol)
            current_price = quote["price"]
            change_pct = quote.get("change_pct", 0)
            ext = quote.get("extended")
            market_state = quote.get("market_state", "REGULAR")
        except Exception:
            current_price = buy_price
            change_pct = 0
            ext = None
            market_state = "REGULAR"
        market_value = qty * current_price
        total_current += market_value
        pnl = market_value - cost_basis
        pnl_pct = (pnl / cost_basis * 100) if cost_basis else 0

        # Extended hours
        ext_price = None
        ext_value = None
        ext_pnl = None
        ext_pnl_pct = None
        ext_change = None
        if ext and ext.get("price"):
            has_extended = True
            extended_label = ext.get("label", "Extended")
            ext_price = ext["price"]
            ext_value = qty * ext_price
            total_extended += ext_value
            ext_pnl = ext_value - cost_basis
            ext_pnl_pct = (ext_pnl / cost_basis * 100) if cost_basis else 0
            ext_change = ext.get("change_pct", 0)
        else:
            total_extended += market_value  # use regular price if no extended

        positions.append({
            "id": str(it["_id"]),
            "symbol": symbol,
            "quantity": qty,
            "buy_price": buy_price,
            "buy_date": it.get("buy_date"),
            "notes": it.get("notes", ""),
            "current_price": round(current_price, 2),
            "day_change_pct": round(change_pct, 2),
            "cost_basis": round(cost_basis, 2),
            "market_value": round(market_value, 2),
            "pnl": round(pnl, 2),
            "pnl_pct": round(pnl_pct, 2),
            "ext_price": round(ext_price, 2) if ext_price else None,
            "ext_change_pct": round(ext_change, 2) if ext_change else None,
            "ext_pnl": round(ext_pnl, 2) if ext_pnl is not None else None,
            "ext_pnl_pct": round(ext_pnl_pct, 2) if ext_pnl_pct is not None else None,
        })
    total_pnl = total_current - total_invested
    total_pnl_pct = (total_pnl / total_invested * 100) if total_invested else 0
    total_ext_pnl = total_extended - total_invested if has_extended else None
    total_ext_pnl_pct = (total_ext_pnl / total_invested * 100) if total_ext_pnl is not None and total_invested else None
    return {
        "positions": positions,
        "total_invested": round(total_invested, 2),
        "total_current": round(total_current, 2),
        "total_pnl": round(total_pnl, 2),
        "total_pnl_pct": round(total_pnl_pct, 2),
        "has_extended": has_extended,
        "extended_label": extended_label,
        "total_extended": round(total_extended, 2) if has_extended else None,
        "total_ext_pnl": round(total_ext_pnl, 2) if total_ext_pnl is not None else None,
        "total_ext_pnl_pct": round(total_ext_pnl_pct, 2) if total_ext_pnl_pct is not None else None,
    }


@api.post("/portfolio")
async def portfolio_add(body: PortfolioIn, user: dict = Depends(current_user)):
    symbol = body.symbol.upper().strip()
    doc = {
        "user_id": user["id"],
        "symbol": symbol,
        "quantity": body.quantity,
        "buy_price": body.buy_price,
        "buy_date": body.buy_date,
        "notes": body.notes or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.portfolio.insert_one(doc)
    return {"id": str(res.inserted_id), "symbol": symbol}


@api.put("/portfolio/{item_id}")
async def portfolio_update(item_id: str, body: PortfolioUpdateIn, user: dict = Depends(current_user)):
    update = {}
    if body.quantity is not None: update["quantity"] = body.quantity
    if body.buy_price is not None: update["buy_price"] = body.buy_price
    if body.buy_date is not None: update["buy_date"] = body.buy_date
    if body.notes is not None: update["notes"] = body.notes
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")
    try:
        res = await db.portfolio.update_one(
            {"_id": ObjectId(item_id), "user_id": user["id"]}, {"$set": update}
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


@api.delete("/portfolio/{item_id}")
async def portfolio_remove(item_id: str, user: dict = Depends(current_user)):
    try:
        res = await db.portfolio.delete_one({"_id": ObjectId(item_id), "user_id": user["id"]})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


# ---------- Saved analyses ----------
@api.get("/analyses")
async def analyses_list(user: dict = Depends(current_user)):
    items = await db.analyses.find({"user_id": user["id"]}).sort("created_at", -1).to_list(100)
    out = []
    for it in items:
        out.append({
            "id": str(it["_id"]),
            "symbol": it["symbol"],
            "name": it.get("name"),
            "created_at": it.get("created_at"),
            "quote": it.get("quote"),
            "indicators": it.get("indicators"),
            "analysis": it.get("analysis"),
        })
    return {"items": out}


@api.post("/analyses")
async def analyses_save(body: SaveAnalysisIn, user: dict = Depends(current_user)):
    doc = {
        "user_id": user["id"],
        "symbol": body.symbol.upper(),
        "name": body.name,
        "quote": body.quote,
        "indicators": body.indicators,
        "analysis": body.analysis,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.analyses.insert_one(doc)
    return {"id": str(res.inserted_id)}


@api.delete("/analyses/{item_id}")
async def analyses_remove(item_id: str, user: dict = Depends(current_user)):
    try:
        res = await db.analyses.delete_one({"_id": ObjectId(item_id), "user_id": user["id"]})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


@api.get("/market/overview")
async def market_overview():
    return await get_market_overview()


@api.get("/")
async def root():
    return {"status": "ok", "service": "AI Stock Analysis"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.watchlist.create_index([("user_id", 1), ("symbol", 1)], unique=True)
    await db.analyses.create_index([("user_id", 1), ("created_at", -1)])


@app.on_event("shutdown")
async def shutdown():
    client.close()