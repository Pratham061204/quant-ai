# QUANT.AI — AI-Powered Stock Analysis & Portfolio Tracker

A full-stack stock analysis dashboard that combines AI trade recommendations, technical scoring, candlestick charting, news sentiment, analyst consensus, and a personal portfolio tracker — built with free APIs and self-hostable.

![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white) ![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black) ![Tailwind](https://img.shields.io/badge/Tailwind-06B6D4?style=flat&logo=tailwindcss&logoColor=white) ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)

## What It Does

Search any US stock and get a complete analysis dashboard:

- **AI Trade Plans** — ideal entry, stop-loss, two take-profit targets, risk/reward ratio, chart patterns, and a detailed thesis powered by Llama 3.3 70B (via Groq, free)
- **Technical Score (1-10)** — aggregates RSI, MACD, trend, SMA alignment, Bollinger Bands, and volume into one number
- **Candlestick Charts** — SMA overlays, AI level lines, Fibonacci retracement, mouse wheel zoom, drag-to-pan, and 7 time periods (1d through 2y)
- **Relative Strength vs S&P 500** — compares performance across 1w, 1m, 3m, 6m
- **News Sentiment** — headlines scored 1-10 with bullish/bearish/neutral aggregate
- **Analyst Targets** — Wall Street price targets, consensus breakdown, recent upgrades/downgrades, and upcoming earnings
- **Pre-Market & After-Hours Pricing** — extended hours data when US markets are closed
- **Market Pulse** — live index quotes, top gainers, losers, most active
- **Portfolio Tracker** — manually add positions, track live P&L (including pre/after-hours P&L), inline editing, 30s auto-refresh
- **Watchlist & Saved Analyses** — bookmark tickers and save AI analyses for later

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Tailwind CSS, Lucide Icons |
| Backend | FastAPI (Python), async with Motor |
| Database | MongoDB Atlas (free tier) |
| AI | Groq API — Llama 3.3 70B (free) |
| Market Data | Yahoo Finance (no API key needed) |
| Sentiment | VADER NLP |
| Auth | JWT + bcrypt |
| Hosting | Render |

## Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.10
- **MongoDB Atlas** account — [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas) (free)
- **Groq API key** — [console.groq.com](https://console.groq.com) (free, no credit card)

## Local Setup

### Backend

```bash
cd backend
python -m venv venv

# Windows:
.\venv\Scripts\Activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Fill in your keys in .env (see below)

uvicorn server:app --reload --port 8000
```

### Frontend

```bash
cd frontend
cp .env.example .env

npm install --legacy-peer-deps
npm install ajv@8 --legacy-peer-deps
npm start
```

Open [http://localhost:3000](http://localhost:3000) and create an account.

## Environment Variables

### Backend (`backend/.env`)

```env
# MongoDB — Free cloud database
# 1. Sign up at https://mongodb.com/atlas
# 2. Create a free M0 cluster
# 3. Add a database user (simple password, no special chars)
# 4. Whitelist your IP (or "Allow Access from Anywhere")
# 5. Click Connect → Drivers → copy the connection string
# 6. Replace <password> with your actual password
MONGO_URL=mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
DB_NAME=stockai

# JWT Secret — Secures your login tokens
# Just type any random string, at least 32 characters
JWT_SECRET=replace-this-with-any-random-string-32-chars-min

# Groq API — Free AI (powers the stock analysis)
# 1. Sign up at https://console.groq.com (Google/GitHub login)
# 2. Go to API Keys → Create API Key → copy it
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx

# Model (optional — defaults to llama-3.3-70b-versatile)
# Other options: qwen/qwen3.6-27b, openai/gpt-oss-120b
# GROQ_MODEL=llama-3.3-70b-versatile

# CORS — Which frontend URL can talk to this backend
# For local dev: http://localhost:3000
# For production: your actual frontend URL
CORS_ORIGINS=http://localhost:3000
```

### Frontend (`frontend/.env`)

```env
# Backend URL — where the FastAPI server runs
# For local dev: http://localhost:8000
# For production: your actual backend URL
REACT_APP_BACKEND_URL=http://localhost:8000
```

## AI Models

Switch models in your backend `.env`:

| Model | Value | Notes |
|---|---|---|
| **Llama 3.3 70B** | `llama-3.3-70b-versatile` | Default, good all-rounder |
| **Qwen 3.6 27B** | `qwen/qwen3.6-27b` | Reasoning model (uses more tokens) |
| **GPT-OSS 120B** | `openai/gpt-oss-120b` | Largest available |

## License

MIT
