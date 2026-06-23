"""Stock data + analysis service backed by yfinance and Claude."""
import os
import asyncio
import json
import re
from datetime import datetime, timezone
from typing import Optional

import yfinance as yf
import pandas as pd
import numpy as np
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

from groq import Groq

_sentiment = SentimentIntensityAnalyzer()


def _safe(val, default=0.0):
    """Replace NaN/Inf with a safe default so JSON serialization doesn't blow up."""
    if isinstance(val, float) and (np.isnan(val) or np.isinf(val)):
        return default
    return val


def _run(func, *args, **kwargs):
    """Run a sync function in a thread to keep FastAPI non-blocking."""
    return asyncio.to_thread(func, *args, **kwargs)


async def get_quote(symbol: str) -> dict:
    def _q():
        t = yf.Ticker(symbol)
        info = t.fast_info
        full_info = t.info or {}
        hist = t.history(period="5d", interval="1d")
        if hist.empty:
            raise ValueError("No data")
        last = hist.iloc[-1]
        prev_close = hist.iloc[-2]["Close"] if len(hist) > 1 else last["Open"]
        price = float(last["Close"])
        change = price - float(prev_close)
        pct = (change / float(prev_close) * 100) if prev_close else 0.0

        # Market status + extended hours pricing
        market_state = full_info.get("marketState", "REGULAR")

        import logging
        _log = logging.getLogger("stockai")
        _log.info(f"{symbol} marketState={market_state} preMarketPrice={full_info.get('preMarketPrice')} postMarketPrice={full_info.get('postMarketPrice')}")

        extended = {}
        pm_price = full_info.get("preMarketPrice")
        ah_price = full_info.get("postMarketPrice")

        # Use whatever extended price is available, prefer pre-market over post-market
        if market_state != "REGULAR":
            if pm_price and float(pm_price) > 0:
                pm_price = float(pm_price)
                pm_change = pm_price - price
                pm_pct = (pm_change / price * 100) if price else 0
                extended = {
                    "label": "Pre-Market",
                    "price": round(_safe(pm_price), 2),
                    "change": round(_safe(pm_change), 2),
                    "change_pct": round(_safe(pm_pct), 2),
                }
            elif ah_price and float(ah_price) > 0:
                ah_price = float(ah_price)
                ah_change = ah_price - price
                ah_pct = (ah_change / price * 100) if price else 0
                label = "Pre-Market" if market_state in ("PRE", "PREPRE") else "After-Hours"
                extended = {
                    "label": label,
                    "price": round(_safe(ah_price), 2),
                    "change": round(_safe(ah_change), 2),
                    "change_pct": round(_safe(ah_pct), 2),
                }

        return {
            "symbol": symbol.upper(),
            "name": getattr(info, "shortname", None) or symbol.upper(),
            "price": round(_safe(price), 2),
            "change": round(_safe(change), 2),
            "change_pct": round(_safe(pct), 2),
            "open": round(_safe(float(last["Open"])), 2),
            "high": round(_safe(float(last["High"])), 2),
            "low": round(_safe(float(last["Low"])), 2),
            "volume": int(_safe(last["Volume"], 0)),
            "prev_close": round(_safe(float(prev_close)), 2),
            "currency": getattr(info, "currency", "USD"),
            "market_state": market_state,
            "extended": extended if extended else None,
        }
    return await _run(_q)


async def get_history(symbol: str, period: str = "6mo", interval: str = "1d") -> list:
    # Auto-select interval based on period for intraday
    INTERVAL_MAP = {
        "1d": "5m",
        "5d": "15m",
        "1mo": "1h",
        "3mo": "1d",
        "6mo": "1d",
        "1y": "1d",
        "2y": "1wk",
    }
    actual_interval = INTERVAL_MAP.get(period, interval)
    is_intraday = actual_interval in ("1m", "5m", "15m", "30m", "1h")

    def _h():
        t = yf.Ticker(symbol)
        hist = t.history(period=period, interval=actual_interval)
        if hist.empty:
            return []
        rows = []
        for ts, r in hist.iterrows():
            if is_intraday:
                date_str = ts.strftime("%Y-%m-%d %H:%M")
            else:
                date_str = ts.strftime("%Y-%m-%d")
            rows.append({
                "date": date_str,
                "open": round(_safe(float(r["Open"])), 2),
                "high": round(_safe(float(r["High"])), 2),
                "low": round(_safe(float(r["Low"])), 2),
                "close": round(_safe(float(r["Close"])), 2),
                "volume": int(_safe(float(r["Volume"]), 0)),
            })
        return rows
    return await _run(_h)


def _compute_indicators(hist: pd.DataFrame) -> dict:
    close = hist["Close"]
    high = hist["High"]
    low = hist["Low"]
    volume = hist["Volume"]

    sma20 = float(close.rolling(20).mean().iloc[-1]) if len(close) >= 20 else float(close.mean())
    sma50 = float(close.rolling(50).mean().iloc[-1]) if len(close) >= 50 else float(close.mean())
    sma200 = float(close.rolling(200).mean().iloc[-1]) if len(close) >= 200 else float(close.mean())

    # RSI 14
    delta = close.diff()
    gain = delta.where(delta > 0, 0).rolling(14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
    rs = gain / loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    rsi_val = float(rsi.iloc[-1]) if not rsi.empty and not np.isnan(rsi.iloc[-1]) else 50.0

    # ATR 14
    tr = pd.concat([
        high - low,
        (high - close.shift()).abs(),
        (low - close.shift()).abs(),
    ], axis=1).max(axis=1)
    atr = float(tr.rolling(14).mean().iloc[-1])

    # MACD 12/26/9
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    macd_line = ema12 - ema26
    signal_line = macd_line.ewm(span=9, adjust=False).mean()
    macd_hist = macd_line - signal_line
    macd_val = float(macd_line.iloc[-1])
    macd_signal = float(signal_line.iloc[-1])
    macd_h = float(macd_hist.iloc[-1])
    if macd_val > macd_signal and macd_hist.iloc[-1] > 0:
        macd_state = "Bullish crossover"
    elif macd_val < macd_signal and macd_hist.iloc[-1] < 0:
        macd_state = "Bearish crossover"
    else:
        macd_state = "Neutral"

    # Bollinger Bands 20, 2
    mid = close.rolling(20).mean()
    std = close.rolling(20).std()
    bb_upper = float((mid + 2 * std).iloc[-1])
    bb_lower = float((mid - 2 * std).iloc[-1])
    bb_mid = float(mid.iloc[-1])
    bb_width = ((bb_upper - bb_lower) / bb_mid * 100) if bb_mid else 0
    # squeeze if width near 6-month low
    width_series = (mid + 2 * std - (mid - 2 * std)) / mid * 100
    bb_squeeze = bool(bb_width <= float(width_series.tail(120).quantile(0.2)))
    last = float(close.iloc[-1])
    if last > bb_upper:
        bb_pos = "Above upper"
    elif last < bb_lower:
        bb_pos = "Below lower"
    elif last > bb_mid:
        bb_pos = "Above mid"
    else:
        bb_pos = "Below mid"

    # Volume ratio
    avg_vol = float(volume.tail(20).mean())
    cur_vol = float(volume.iloc[-1])
    vol_ratio = (cur_vol / avg_vol) if avg_vol else 1.0

    # Support/Resistance from recent 60 bars
    recent = hist.tail(60)
    resistance = float(recent["High"].max())
    support = float(recent["Low"].min())

    # Trend
    if last > sma50 and sma20 > sma50:
        trend = "Uptrend"
    elif last < sma50 and sma20 < sma50:
        trend = "Downtrend"
    else:
        trend = "Sideways"

    # 52w high/low
    yearly = hist.tail(252) if len(hist) >= 252 else hist
    high_52w = float(yearly["High"].max())
    low_52w = float(yearly["Low"].min())

    # --- Technical Score (1-10) ---
    score = 5.0  # Start neutral
    # RSI: oversold bullish (+), overbought bearish (-)
    if rsi_val < 30: score += 1.0
    elif rsi_val < 40: score += 0.5
    elif rsi_val > 70: score -= 1.0
    elif rsi_val > 60: score -= 0.3
    # MACD
    if macd_state == "Bullish crossover": score += 1.0
    elif macd_state == "Bearish crossover": score -= 1.0
    # Trend
    if trend == "Uptrend": score += 1.0
    elif trend == "Downtrend": score -= 1.0
    # SMA alignment (price above all 3 = strong)
    above_smas = sum([1 for s in [sma20, sma50, sma200] if last > s])
    score += (above_smas - 1.5) * 0.5
    # Bollinger position
    if bb_pos == "Above upper": score -= 0.5  # overextended
    elif bb_pos == "Below lower": score += 0.5  # oversold bounce
    elif bb_pos == "Above mid": score += 0.3
    elif bb_pos == "Below mid": score -= 0.3
    # Volume confirmation
    if vol_ratio > 1.5 and trend == "Uptrend": score += 0.5
    elif vol_ratio > 1.5 and trend == "Downtrend": score -= 0.5
    # 52w proximity
    if high_52w > 0:
        pct_from_high = (last - high_52w) / high_52w * 100
        if pct_from_high > -3: score += 0.3  # near highs = momentum
    tech_score = round(max(1.0, min(10.0, score)), 1)
    if tech_score >= 6.5:
        tech_label = "Bullish"
    elif tech_score <= 3.5:
        tech_label = "Bearish"
    else:
        tech_label = "Neutral"

    # --- Fibonacci Retracement ---
    # Use 52w high/low for fib levels
    fib_high = high_52w
    fib_low = low_52w
    fib_range = fib_high - fib_low
    fib_levels = {
        "0": round(fib_high, 2),
        "236": round(fib_high - fib_range * 0.236, 2),
        "382": round(fib_high - fib_range * 0.382, 2),
        "500": round(fib_high - fib_range * 0.500, 2),
        "618": round(fib_high - fib_range * 0.618, 2),
        "786": round(fib_high - fib_range * 0.786, 2),
        "100": round(fib_low, 2),
    }

    return {
        "price": round(_safe(last), 2),
        "sma20": round(_safe(sma20), 2),
        "sma50": round(_safe(sma50), 2),
        "sma200": round(_safe(sma200), 2),
        "rsi": round(_safe(rsi_val, 50.0), 2),
        "atr": round(_safe(atr), 2),
        "macd": round(_safe(macd_val), 3),
        "macd_signal": round(_safe(macd_signal), 3),
        "macd_hist": round(_safe(macd_h), 3),
        "macd_state": macd_state,
        "bb_upper": round(_safe(bb_upper), 2),
        "bb_mid": round(_safe(bb_mid), 2),
        "bb_lower": round(_safe(bb_lower), 2),
        "bb_width_pct": round(_safe(bb_width), 2),
        "bb_squeeze": bb_squeeze,
        "bb_position": bb_pos,
        "avg_volume_20d": int(_safe(avg_vol, 0)),
        "volume_ratio": round(_safe(vol_ratio, 1.0), 2),
        "support": round(_safe(support), 2),
        "resistance": round(_safe(resistance), 2),
        "trend": trend,
        "high_52w": round(_safe(high_52w), 2),
        "low_52w": round(_safe(low_52w), 2),
        "tech_score": tech_score,
        "tech_label": tech_label,
        "fibonacci": fib_levels,
    }


async def get_indicators(symbol: str) -> dict:
    def _i():
        t = yf.Ticker(symbol)
        hist = t.history(period="1y", interval="1d")
        if hist.empty:
            raise ValueError("No data")
        result = _compute_indicators(hist)

        # --- Relative Strength vs S&P 500 ---
        try:
            spy = yf.Ticker("SPY")
            spy_hist = spy.history(period="1y", interval="1d")
            if not spy_hist.empty and len(spy_hist) >= 20:
                # Calculate performance over multiple periods
                periods = {"1w": 5, "1m": 21, "3m": 63, "6m": 126}
                rs = {}
                for label, days in periods.items():
                    if len(hist) >= days and len(spy_hist) >= days:
                        stock_ret = (float(hist["Close"].iloc[-1]) / float(hist["Close"].iloc[-days]) - 1) * 100
                        spy_ret = (float(spy_hist["Close"].iloc[-1]) / float(spy_hist["Close"].iloc[-days]) - 1) * 100
                        rs[label] = {
                            "stock": round(_safe(stock_ret), 2),
                            "spy": round(_safe(spy_ret), 2),
                            "diff": round(_safe(stock_ret - spy_ret), 2),
                        }
                # Overall RS rating
                diffs = [v["diff"] for v in rs.values()]
                avg_diff = sum(diffs) / len(diffs) if diffs else 0
                rs_rating = "Outperforming" if avg_diff > 2 else "Underperforming" if avg_diff < -2 else "In Line"
                result["relative_strength"] = {"periods": rs, "rating": rs_rating}
            else:
                result["relative_strength"] = None
        except Exception:
            result["relative_strength"] = None

        return result
    return await _run(_i)


def _extract_json(text: str) -> Optional[dict]:
    """Pull the first JSON object out of an LLM response, handling reasoning models."""
    # Strip reasoning/thinking tags — handle both closed and unclosed
    text = re.sub(r"<think>[\s\S]*?</think>", "", text)
    # If <think> is still present (unclosed), strip from <think> to end or to first {
    if "<think>" in text:
        think_start = text.index("<think>")
        first_brace = text.find("{", think_start)
        if first_brace != -1:
            text = text[:think_start] + text[first_brace:]
        else:
            text = text[:think_start]
    text = re.sub(r"```json\s*", "", text)
    text = re.sub(r"```\s*$", "", text)

    # Try direct parse first
    text_stripped = text.strip()
    if text_stripped.startswith("{"):
        try:
            return json.loads(text_stripped)
        except json.JSONDecodeError:
            pass

    # Find the outermost { ... } block using bracket counting
    start = text.find("{")
    if start == -1:
        return None
    depth = 0
    end = start
    for i in range(start, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    if depth != 0:
        # Truncated JSON — try to close it
        chunk = text[start:]
        chunk = chunk.rstrip(", \n\r\t")
        open_brackets = chunk.count("[") - chunk.count("]")
        open_braces = chunk.count("{") - chunk.count("}")
        chunk += "]" * max(open_brackets, 0)
        chunk += "}" * max(open_braces, 0)
        try:
            return json.loads(chunk)
        except Exception:
            return None
    try:
        return json.loads(text[start:end])
    except Exception:
        return None


async def analyze_with_ai(symbol: str, quote: dict, indicators: dict, analyst_data: dict = None) -> dict:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY not configured")

    model = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

    # Pre-compute contextual data the model should reason about
    price = quote["price"]
    high_52 = indicators["high_52w"]
    low_52 = indicators["low_52w"]
    pct_from_high = round((price - high_52) / high_52 * 100, 1) if high_52 else 0
    pct_from_low = round((price - low_52) / low_52 * 100, 1) if low_52 else 0
    atr = indicators["atr"]
    atr_pct = round(atr / price * 100, 2) if price else 0
    sma20_dist = round((price - indicators['sma20']) / indicators['sma20'] * 100, 1) if indicators['sma20'] else 0

    # Build analyst context string
    analyst_section = ""
    if analyst_data:
        targets = analyst_data.get("targets")
        consensus = analyst_data.get("consensus")
        earnings = analyst_data.get("earnings_date")
        if targets and targets.get("mean"):
            upside = round((targets["mean"] - price) / price * 100, 1)
            analyst_section += f"\nANALYST PRICE TARGETS ({targets.get('num_analysts', 'N/A')} analysts):\n"
            analyst_section += f"- Low: ${targets['low']} | Mean: ${targets['mean']} | Median: ${targets['median']} | High: ${targets['high']}\n"
            analyst_section += f"- Implied upside/downside from mean: {upside}%\n"
        if consensus:
            analyst_section += f"\nANALYST CONSENSUS: {consensus.get('label', 'N/A')} "
            analyst_section += f"(Strong Buy: {consensus.get('strong_buy', 0)}, Buy: {consensus.get('buy', 0)}, "
            analyst_section += f"Hold: {consensus.get('hold', 0)}, Sell: {consensus.get('sell', 0)}, "
            analyst_section += f"Strong Sell: {consensus.get('strong_sell', 0)})\n"
        if earnings:
            analyst_section += f"\nUPCOMING EARNINGS: {earnings}\n"

    system_msg = (
        "You are a senior technical analyst at a top hedge fund, specializing in US equities swing trading. "
        "You combine price action, momentum, volatility, and mean-reversion analysis to produce institutional-quality trade plans. "
        "CRITICAL RULES:\n"
        "1. ALWAYS respond with valid JSON only — no prose, no markdown fences, no explanation outside JSON.\n"
        "2. Be CONSERVATIVE: prefer HOLD or WAIT when risk/reward is unclear or the stock is extended.\n"
        "3. Stop loss MUST be 1-2 ATR from ideal_entry_price. Verify the math: abs(ideal_entry_price - stop_loss) >= ATR value.\n"
        "4. Consider proximity to 52-week highs/lows — stocks near highs have resistance risk, stocks near lows may be catching a falling knife.\n"
        "5. If RSI > 70, the stock is overbought — bias toward HOLD/WAIT. If RSI < 30, oversold — look for reversal setups.\n"
        "6. Support and resistance levels MUST be derived from the actual data provided — use SMA20, SMA50, SMA200, Bollinger bands, 52w high/low, and the given support/resistance values. "
        "Do NOT round to clean numbers like $1000 or $950. Use precise values like $965.58 (SMA20) or $1149.43 (52w high). "
        "Each level should be traceable to a specific indicator. Provide EXACTLY 3 support and 3 resistance levels. "
        "SPACING RULES: levels must be at least 3% apart from each other — never list two levels within 1-2% of each other. "
        "Use different indicator sources for each level (e.g., one from SMA, one from Bollinger, one from 52w high/ATR projection). "
        "ORDER: list from nearest to farthest from current price. "
        "PRACTICAL RANGE: all 3 support and 3 resistance levels should be within 40% of current price. "
        "If SMA200 is >40% below price, do NOT use it — use Bollinger lower, recent swing lows, or entry - 2*ATR instead. "
        "The first support should be the nearest level BELOW price (often Bollinger mid, recent low, or partial pullback level). "
        "The first resistance should be the nearest level ABOVE price.\n"
        "7. chart_patterns should list 3-5 specific observations. If price is >15% above SMA20, include 'Parabolic overextension'. "
        "If price is above upper Bollinger Band, include 'Extended beyond upper Bollinger Band'.\n"
        "8. thesis should be 3-4 sentences with SPECIFIC numbers and percentages from the data — never generic. "
        "Mention distance from SMA20, Bollinger Band position, and any overextension.\n"
        "9. risks should be 2-3 sentences covering the primary risk AND what would invalidate the trade.\n"
        "10. ENTRY LOGIC: entry_zone_low and entry_zone_high must BOTH be BELOW the current price. "
        "For WAIT/HOLD: entry should be a REALISTIC pullback achievable within 1-4 weeks — typically 3-10% below current price. "
        "Do NOT set entry at SMA20 if it's >15% below current price — that pullback is unlikely in 1-4 weeks. "
        "Instead use a partial pullback: Bollinger mid, a recent swing low, or current price minus 1-2 ATR. "
        "For BUY: entry can be near current price but entry_zone_high must still be at or below current price. "
        "NEVER set entry_zone_high above current price.\n"
        "11. TAKE PROFIT TARGETS should be grounded in technical levels (52w high/low, SMAs, Bollinger bands, support/resistance) but also consider momentum. "
        "If a stock is surging with strong volume and bullish momentum, breakout targets above the 52w high are valid — use ATR-based projections (e.g., 52w high + 1-2 ATR). "
        "Don't be afraid to set aggressive targets when momentum justifies it, but don't pick random round numbers either."
    )

    prompt = f"""Analyze {symbol} ({quote.get('name')}) for a swing trade (1-4 week horizon).

PRICE DATA:
- Current Price: ${price}
- Today's Change: {quote['change_pct']}%
- Open: ${quote.get('open', 'N/A')} | High: ${quote.get('high', 'N/A')} | Low: ${quote.get('low', 'N/A')}
- 52w High: ${high_52} (price is {pct_from_high}% from high)
- 52w Low: ${low_52} (price is {pct_from_low}% from low)

MOVING AVERAGES:
- SMA20: ${indicators['sma20']} (price {'above' if price > indicators['sma20'] else 'below'} by {round(abs(price - indicators['sma20']) / indicators['sma20'] * 100, 1)}%)
- SMA50: ${indicators['sma50']} (price {'above' if price > indicators['sma50'] else 'below'} by {round(abs(price - indicators['sma50']) / indicators['sma50'] * 100, 1)}%)
- SMA200: ${indicators['sma200']} (price {'above' if price > indicators['sma200'] else 'below'} by {round(abs(price - indicators['sma200']) / indicators['sma200'] * 100, 1)}%)

MOMENTUM & VOLATILITY:
- RSI(14): {indicators['rsi']} ({'overbought' if indicators['rsi'] > 70 else 'oversold' if indicators['rsi'] < 30 else 'neutral'})
- ATR(14): ${atr} ({atr_pct}% of price — {'high' if atr_pct > 3 else 'moderate' if atr_pct > 1.5 else 'low'} volatility)
- MACD: {indicators['macd']} | Signal: {indicators['macd_signal']} | State: {indicators['macd_state']}
- Bollinger Bands: upper ${indicators['bb_upper']} / mid ${indicators['bb_mid']} / lower ${indicators['bb_lower']}
  Position: {indicators['bb_position']} | Width: {indicators['bb_width_pct']}% | Squeeze: {indicators['bb_squeeze']}

VOLUME & STRUCTURE:
- Volume vs 20d avg: {indicators['volume_ratio']}x ({'high' if indicators['volume_ratio'] > 1.5 else 'normal' if indicators['volume_ratio'] > 0.8 else 'low'} volume)
- Trend: {indicators['trend']}
- Distance from SMA20: {sma20_dist}% ({'OVEREXTENDED — mean reversion likely' if abs(sma20_dist) > 15 else 'extended' if abs(sma20_dist) > 8 else 'normal'})
- Nearest Support: ${indicators['support']} | Nearest Resistance: ${indicators['resistance']}
{analyst_section}
Respond with JSON ONLY in this exact schema:
{{
  "recommendation": "BUY" | "SELL" | "HOLD" | "WAIT",
  "confidence": "Low" | "Medium" | "High",
  "ideal_entry_price": <number>,
  "entry_zone_low": <number>,
  "entry_zone_high": <number>,
  "stop_loss": <number>,
  "take_profit_1": <number>,
  "take_profit_2": <number>,
  "risk_reward_ratio": <number>,
  "chart_patterns": ["<pattern1>", "<pattern2>", "<pattern3>", ...],
  "key_levels": {{"support": [<num>, <num>, <num>], "resistance": [<num>, <num>, <num>]}},
  "thesis": "<3-4 sentences with specific numbers and percentages>",
  "risks": "<2-3 sentences covering primary risk and invalidation level>",
  "time_horizon": "<e.g., '1-4 weeks'>"
}}"""

    client = Groq(api_key=api_key)

    def _call():
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_completion_tokens=2048,
        )
        return response.choices[0].message.content

    text = await asyncio.to_thread(_call)
    data = _extract_json(text)
    if not data:
        raise RuntimeError(f"AI returned non-JSON: {text[:300]}")
    return _post_process_analysis(data, price, indicators)


def _post_process_analysis(data: dict, price: float, indicators: dict) -> dict:
    """Validate and fix common AI output issues."""
    atr = indicators.get("atr", 0)

    # --- Fix key_levels: sort, deduplicate, ensure spacing ---
    levels = data.get("key_levels", {})
    if isinstance(levels, dict):
        for key in ("support", "resistance"):
            raw = levels.get(key, [])
            if not isinstance(raw, list):
                continue
            # Convert to floats
            nums = []
            for v in raw:
                try:
                    nums.append(round(float(v), 2))
                except (ValueError, TypeError):
                    continue

            # Sort: support descending (nearest first), resistance ascending (nearest first)
            if key == "support":
                nums.sort(reverse=True)
            else:
                nums.sort()

            # Remove levels >40% from current price (not useful for swing trades)
            nums = [n for n in nums if abs(n - price) / max(price, 0.01) <= 0.40]

            # Remove levels within 3% of each other (keep first occurrence)
            deduped = []
            for n in nums:
                if not deduped or all(abs(n - d) / max(d, 0.01) > 0.03 for d in deduped):
                    deduped.append(n)
            levels[key] = deduped[:3]

        # If support is missing levels, fill from SMA values
        if len(levels.get("support", [])) < 3:
            sma_vals = sorted(
                [v for v in [indicators.get("sma20"), indicators.get("sma50"), indicators.get("sma200")]
                 if v and v < price],
                reverse=True,
            )
            for sv in sma_vals:
                sv = round(sv, 2)
                existing = levels.get("support", [])
                if len(existing) >= 3:
                    break
                if all(abs(sv - e) / max(e, 0.01) > 0.03 for e in existing):
                    existing.append(sv)
                    existing.sort(reverse=True)
            levels["support"] = levels.get("support", [])[:3]

        data["key_levels"] = levels

    # --- Fix entry zone: must contain ideal_entry and be at or below current price ---
    entry = data.get("ideal_entry_price", price)
    entry_high = data.get("entry_zone_high")
    entry_low = data.get("entry_zone_low")

    # entry_zone_high should not exceed current price
    if entry_high and entry_high > price:
        entry_high = round(price * 0.99, 2)
        data["entry_zone_high"] = entry_high

    # Cap entry — if >15% below price, set to price - 2*ATR or -10% whichever is closer
    max_pullback = max(price - 2 * atr, price * 0.85)
    if entry < max_pullback:
        entry = round(max_pullback, 2)
        data["ideal_entry_price"] = entry

    # ideal_entry must be within the zone
    if entry_high and entry > entry_high:
        data["ideal_entry_price"] = entry_high
        entry = entry_high
    if entry_low and entry < entry_low:
        data["entry_zone_low"] = round(entry * 0.97, 2)
        entry_low = data["entry_zone_low"]

    # entry_zone_low must be below entry_zone_high
    if entry_low and entry_high and entry_low > entry_high:
        data["entry_zone_low"] = round(entry_high * 0.97, 2)

    # --- Fix stop loss: must be at least 1 ATR from entry ---
    entry = data.get("ideal_entry_price", price)
    stop = data.get("stop_loss")
    if stop and atr and abs(entry - stop) < atr * 0.8:
        # Push stop to 1 ATR below entry
        data["stop_loss"] = round(entry - atr, 2)

    # --- Recalculate R/R ratio ---
    stop = data.get("stop_loss", 0)
    tp1 = data.get("take_profit_1", 0)
    if stop and tp1 and entry:
        risk = abs(entry - stop)
        reward = abs(tp1 - entry)
        if risk > 0:
            data["risk_reward_ratio"] = round(reward / risk, 2)

    return data


async def get_analyst_targets(symbol: str) -> dict:
    """Fetch analyst price targets and recommendations from Yahoo Finance."""
    def _targets():
        t = yf.Ticker(symbol)
        info = t.info or {}
        result = {}

        # Price targets from t.info
        try:
            mean = info.get("targetMeanPrice")
            if mean and float(mean) > 0:
                result["targets"] = {
                    "low": round(_safe(float(info.get("targetLowPrice", 0))), 2),
                    "high": round(_safe(float(info.get("targetHighPrice", 0))), 2),
                    "mean": round(_safe(float(mean)), 2),
                    "median": round(_safe(float(info.get("targetMedianPrice", mean))), 2),
                    "current": round(_safe(float(info.get("currentPrice", 0))), 2),
                    "num_analysts": int(info.get("numberOfAnalystOpinions", 0)),
                }
            else:
                result["targets"] = None
        except Exception:
            result["targets"] = None

        # Recent analyst upgrades/downgrades (last 3 months)
        try:
            upgrades = t.upgrades_downgrades
            if upgrades is not None and not upgrades.empty:
                from datetime import datetime as dt, timedelta
                cutoff = dt.now() - timedelta(days=90)
                # Index is the date
                upgrades_idx = upgrades.copy()
                upgrades_idx.index = pd.to_datetime(upgrades_idx.index)
                recent = upgrades_idx[upgrades_idx.index >= pd.Timestamp(cutoff)]
                actions = []
                for ts, row in recent.iterrows():
                    actions.append({
                        "date": ts.strftime("%Y-%m-%d"),
                        "firm": str(row.get("Firm", "")),
                        "action": str(row.get("Action", "")),
                        "from_grade": str(row.get("FromGrade", "")),
                        "to_grade": str(row.get("ToGrade", "")),
                    })
                result["recent_actions"] = actions[:15]  # Cap at 15 most recent
            else:
                result["recent_actions"] = []
        except Exception:
            result["recent_actions"] = []

        # Recommendation summary (buy/hold/sell counts)
        try:
            rec = t.recommendations
            if rec is not None and not rec.empty:
                latest = rec.iloc[-1]
                def _get_rec(row, *keys):
                    for k in keys:
                        v = row.get(k, None)
                        if v is not None:
                            return int(_safe(float(v), 0))
                    return 0

                result["consensus"] = {
                    "strong_buy": _get_rec(latest, "strongBuy", "Strong Buy"),
                    "buy": _get_rec(latest, "buy", "Buy"),
                    "hold": _get_rec(latest, "hold", "Hold"),
                    "sell": _get_rec(latest, "sell", "Sell"),
                    "strong_sell": _get_rec(latest, "strongSell", "Strong Sell"),
                }
                total = sum(result["consensus"].values())
                result["consensus"]["total"] = total
                buys = result["consensus"]["strong_buy"] + result["consensus"]["buy"]
                sells = result["consensus"]["sell"] + result["consensus"]["strong_sell"]
                if total > 0:
                    if buys / total >= 0.6:
                        result["consensus"]["label"] = "Strong Buy" if result["consensus"]["strong_buy"] > result["consensus"]["buy"] else "Buy"
                    elif sells / total >= 0.4:
                        result["consensus"]["label"] = "Sell"
                    else:
                        result["consensus"]["label"] = "Hold"
                else:
                    result["consensus"]["label"] = "N/A"
            else:
                result["consensus"] = None
        except Exception:
            result["consensus"] = None

        # Upcoming earnings date
        try:
            dates = t.earnings_dates
            if dates is not None and not dates.empty:
                from datetime import datetime as dt
                now = dt.now()
                future = dates[dates.index >= pd.Timestamp(now)]
                if not future.empty:
                    result["earnings_date"] = future.index[0].strftime("%Y-%m-%d")
                else:
                    result["earnings_date"] = dates.index[0].strftime("%Y-%m-%d")
            else:
                result["earnings_date"] = None
        except Exception:
            result["earnings_date"] = None

        return result
    return await _run(_targets)


async def get_news(symbol: str, limit: int = 8) -> list:
    def _n():
        t = yf.Ticker(symbol)
        try:
            items = t.news or []
        except Exception:
            items = []
        out = []
        for item in items[:limit]:
            content = item.get("content") or item
            title = content.get("title") or item.get("title") or ""
            if not title:
                continue
            publisher = (content.get("provider") or {}).get("displayName") or item.get("publisher") or ""
            link = (content.get("canonicalUrl") or {}).get("url") or content.get("clickThroughUrl", {}).get("url") or item.get("link") or ""
            pub_time = content.get("pubDate") or item.get("providerPublishTime")
            if isinstance(pub_time, (int, float)):
                pub_iso = datetime.fromtimestamp(pub_time, tz=timezone.utc).isoformat()
            elif isinstance(pub_time, str):
                pub_iso = pub_time
            else:
                pub_iso = datetime.now(timezone.utc).isoformat()
            score = _sentiment.polarity_scores(title)
            compound = score["compound"]
            if compound >= 0.2:
                label = "Bullish"
            elif compound <= -0.2:
                label = "Bearish"
            else:
                label = "Neutral"
            # Convert compound (-1 to +1) to 1-10 scale
            score_10 = round((compound + 1) * 4.5 + 1, 1)
            score_10 = max(1.0, min(10.0, score_10))
            out.append({
                "title": title,
                "publisher": publisher,
                "link": link,
                "published_at": pub_iso,
                "sentiment_score": round(compound, 3),
                "sentiment_rating": score_10,
                "sentiment": label,
            })
        return out
    return await _run(_n)


async def get_sentiment_summary(symbol: str) -> dict:
    """Aggregate sentiment from news."""
    news = await get_news(symbol, limit=10)

    if news:
        scores = [n["sentiment_score"] for n in news]
        avg_compound = sum(scores) / len(scores)
        news_rating = round((avg_compound + 1) * 4.5 + 1, 1)
        news_rating = max(1.0, min(10.0, news_rating))
        bullish = sum(1 for n in news if n["sentiment"] == "Bullish")
        bearish = sum(1 for n in news if n["sentiment"] == "Bearish")
        neutral = sum(1 for n in news if n["sentiment"] == "Neutral")
    else:
        news_rating = 5.0
        bullish = bearish = neutral = 0

    return {
        "overall_rating": news_rating,
        "overall_label": "Bullish" if news_rating >= 6.5 else "Bearish" if news_rating <= 3.5 else "Neutral",
        "news": {
            "rating": news_rating,
            "bullish": bullish,
            "bearish": bearish,
            "neutral": neutral,
            "total": len(news),
        },
        "reddit": None,
    }


async def search_symbols(query: str) -> list:
    """Lightweight ticker search using yahoo's quote autocomplete."""
    def _s():
        import requests
        try:
            r = requests.get(
                "https://query2.finance.yahoo.com/v1/finance/search",
                params={"q": query, "quotesCount": 8, "newsCount": 0},
                headers={"User-Agent": "Mozilla/5.0"},
                timeout=5,
            )
            data = r.json()
        except Exception:
            return []
        results = []
        for q in data.get("quotes", []):
            sym = q.get("symbol")
            if not sym:
                continue
            # US stocks only — filter exchanges
            exch = q.get("exchange", "")
            if exch in ("NMS", "NYQ", "ASE", "PCX", "BTS", "NGM", "NCM", "NIM"):
                results.append({
                    "symbol": sym,
                    "name": q.get("shortname") or q.get("longname") or sym,
                    "exchange": exch,
                    "type": q.get("quoteType", ""),
                })
        return results
    return await _run(_s)