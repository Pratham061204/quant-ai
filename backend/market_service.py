"""Market overview: indices + curated top movers, cached for 60s."""
import asyncio
import time
from typing import Optional

import yfinance as yf
import math


def _safe(val, default=0.0):
    """Replace NaN/Inf with a safe default."""
    if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
        return default
    return val

INDICES = [
    ("SPY", "S&P 500"),
    ("QQQ", "Nasdaq 100"),
    ("DIA", "Dow Jones"),
    ("IWM", "Russell 2000"),
    ("^VIX", "Volatility"),
]

# Curated popular US universe for top movers (S&P megacaps + retail favs)
UNIVERSE = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA", "AVGO", "ORCL", "NFLX",
    "AMD", "INTC", "CRM", "ADBE", "CSCO", "QCOM", "TXN", "IBM", "PYPL", "UBER",
    "JPM", "BAC", "WFC", "GS", "MS", "V", "MA", "AXP", "COIN", "SQ",
    "WMT", "COST", "TGT", "HD", "LOW", "NKE", "SBUX", "MCD", "PG", "KO",
    "PEP", "DIS", "T", "VZ", "TMUS", "BA", "F", "GM", "RIVN", "LCID",
    "JNJ", "PFE", "UNH", "LLY", "MRK", "ABBV", "XOM", "CVX", "OXY", "SHEL",
    "PLTR", "SNOW", "SHOP", "ABNB", "ROKU", "SPOT", "PINS", "SNAP", "RBLX", "MARA",
]

_cache = {"ts": 0.0, "data": None}
CACHE_TTL = 60.0


def _quote_row(sym: str, label: Optional[str] = None) -> Optional[dict]:
    try:
        t = yf.Ticker(sym)
        hist = t.history(period="5d", interval="1d")
        if hist.empty or len(hist) < 2:
            return None
        last = hist.iloc[-1]
        prev = hist.iloc[-2]
        price = float(last["Close"])
        change = price - float(prev["Close"])
        pct = (change / float(prev["Close"])) * 100 if prev["Close"] else 0
        return {
            "symbol": sym.replace("^", ""),
            "label": label or sym.replace("^", ""),
            "price": round(_safe(price), 2),
            "change": round(_safe(change), 2),
            "change_pct": round(_safe(pct), 2),
            "volume": int(_safe(float(last["Volume"]), 0)),
        }
    except Exception:
        return None


def _build_overview() -> dict:
    indices = [r for r in (_quote_row(s, lbl) for s, lbl in INDICES) if r]

    # Bulk download universe in one request for speed
    try:
        df = yf.download(
            UNIVERSE, period="5d", interval="1d",
            group_by="ticker", auto_adjust=False, progress=False, threads=True,
        )
    except Exception:
        df = None

    rows = []
    if df is not None and not df.empty:
        for sym in UNIVERSE:
            try:
                sub = df[sym].dropna()
                if len(sub) < 2:
                    continue
                last = sub.iloc[-1]
                prev = sub.iloc[-2]
                price = float(last["Close"])
                change = price - float(prev["Close"])
                pct = (change / float(prev["Close"])) * 100 if prev["Close"] else 0
                rows.append({
                    "symbol": sym,
                    "price": round(_safe(price), 2),
                    "change": round(_safe(change), 2),
                    "change_pct": round(_safe(pct), 2),
                    "volume": int(_safe(float(last["Volume"]), 0)),
                })
            except Exception:
                continue

    gainers = sorted(rows, key=lambda r: r["change_pct"], reverse=True)[:6]
    losers = sorted(rows, key=lambda r: r["change_pct"])[:6]
    most_active = sorted(rows, key=lambda r: r["volume"], reverse=True)[:6]

    return {
        "indices": indices,
        "gainers": gainers,
        "losers": losers,
        "most_active": most_active,
        "tape": rows[:30],  # for ticker tape
    }


async def get_market_overview() -> dict:
    now = time.time()
    if _cache["data"] and (now - _cache["ts"]) < CACHE_TTL:
        return _cache["data"]
    data = await asyncio.to_thread(_build_overview)
    _cache["ts"] = now
    _cache["data"] = data
    return data