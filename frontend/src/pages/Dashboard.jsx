import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import TickerSearch from "@/components/TickerSearch";
import CandlestickChart from "@/components/CandlestickChart";
import AnalysisPanel from "@/components/AnalysisPanel";
import AnalystTargets from "@/components/AnalystTargets";
import SentimentPanel from "@/components/SentimentPanel";
import TechOverview from "@/components/TechOverview";
import NewsCard from "@/components/NewsCard";
import MarketPulse from "@/components/MarketPulse";
import AnalysisProgress from "@/components/AnalysisProgress";
import { ChartSkeleton, QuoteSkeleton, CardGridSkeleton } from "@/components/Skeleton";
import { api, formatApiError } from "@/lib/api";
import { Star, StarOff, Zap, Loader2 } from "lucide-react";
import { toast, Toaster } from "sonner";

const PERIODS = ["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y"];

export default function Dashboard() {
  const [params, setParams] = useSearchParams();
  const [symbol, setSymbol] = useState(params.get("symbol") || "");
  const [period, setPeriod] = useState("6mo");
  const [quote, setQuote] = useState(null);
  const [history, setHistory] = useState([]);
  const [indicators, setIndicators] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [news, setNews] = useState([]);
  const [analysts, setAnalysts] = useState(null);
  const [sentiment, setSentiment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [watched, setWatched] = useState(false);
  const [watchId, setWatchId] = useState(null);
  const [savingAnalysis, setSavingAnalysis] = useState(false);
  const [savedAnalysis, setSavedAnalysis] = useState(false);

  // sync symbol from URL on mount and when params change externally
  useEffect(() => {
    const fromUrl = params.get("symbol") || "";
    if (fromUrl && fromUrl !== symbol) setSymbol(fromUrl);
     
  }, [params]);

  const loadAll = async (sym) => {
    if (!sym) return;
    setLoading(true);
    setAnalysis(null);
    setSavedAnalysis(false);
    try {
      const [q, h, ind, n, wl, an, sent] = await Promise.all([
        api.get(`/stock/quote/${sym}`),
        api.get(`/stock/history/${sym}`, { params: { period } }),
        api.get(`/stock/indicators/${sym}`),
        api.get(`/stock/news/${sym}`),
        api.get(`/watchlist`),
        api.get(`/stock/analysts/${sym}`).catch(() => ({ data: null })),
        api.get(`/stock/sentiment/${sym}`).catch(() => ({ data: null })),
      ]);
      setQuote(q.data);
      setHistory(h.data.candles || []);
      setIndicators(ind.data);
      setNews(n.data.items || []);
      setAnalysts(an.data);
      setSentiment(sent.data);
      const w = (wl.data.items || []).find((i) => i.symbol === sym.toUpperCase());
      setWatched(!!w);
      setWatchId(w?.id || null);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (symbol) loadAll(symbol);
     
  }, [symbol]);

  useEffect(() => {
    if (!symbol) return;
    api
      .get(`/stock/history/${symbol}`, { params: { period } })
      .then((r) => setHistory(r.data.candles || []))
      .catch(() => {});
     
  }, [period]);

  const handleSelect = (sym) => {
    setSymbol(sym);
    setParams({ symbol: sym });
  };

  const handleAnalyze = async () => {
    if (!symbol) return;
    setAnalyzing(true);
    setAnalysis(null);
    setSavedAnalysis(false);
    try {
      const { data } = await api.post(`/stock/analyze/${symbol}`);
      setAnalysis(data.analysis);
      setIndicators(data.indicators);
      setQuote(data.quote);
      if (data.analysts) setAnalysts(data.analysts);
      toast.success(`AI analysis complete for ${symbol}`);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleWatch = async () => {
    if (!symbol) return;
    try {
      if (watched && watchId) {
        await api.delete(`/watchlist/${watchId}`);
        setWatched(false);
        setWatchId(null);
        toast.success(`${symbol} removed from watchlist`);
      } else {
        const { data } = await api.post(`/watchlist`, { symbol, name: quote?.name });
        setWatched(true);
        setWatchId(data.id);
        toast.success(`${symbol} added to watchlist`);
      }
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const handleSaveAnalysis = async () => {
    if (!analysis || !quote || !indicators) return;
    setSavingAnalysis(true);
    try {
      await api.post(`/analyses`, { symbol, name: quote.name, quote, indicators, analysis });
      setSavedAnalysis(true);
      toast.success("Analysis saved");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSavingAnalysis(false);
    }
  };

  const isUp = quote && quote.change >= 0;

  const chartLevels = analysis ? {
    entry: analysis.ideal_entry_price,
    stop: analysis.stop_loss,
    tp1: analysis.take_profit_1,
    tp2: analysis.take_profit_2,
  } : null;

  return (
    <div className="min-h-screen">
      <Navbar />
      <Toaster theme="dark" position="top-right" />
      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-4">
        {/* Search */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <TickerSearch onSelect={handleSelect} />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={!symbol || analyzing}
            data-testid="analyze-btn"
            className="px-5 py-3 bg-[var(--accent)] hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-mono uppercase tracking-wider rounded-sm transition-colors flex items-center justify-center gap-2"
          >
            {analyzing ? (<><Loader2 size={16} className="animate-spin" /> Analyzing...</>) : (<><Zap size={16} /> Run AI Analysis</>)}
          </button>
        </div>

        {!symbol && (
          <>
            <div className="surface p-8 rounded-sm" data-testid="dashboard-empty">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-2">/ Welcome</div>
              <h2 className="font-display font-black text-2xl mb-2 tracking-tight">Search a US ticker or pick from the movers below</h2>
              <p className="text-sm text-[var(--text-muted)] max-w-2xl">
                Get live quote, candlestick chart with SMAs &amp; AI trade levels, technical indicators (RSI, MACD, Bollinger),
                recent news with sentiment, and a Claude-generated trade plan with entry, stop, R/R and chart patterns.
              </p>
            </div>
            <MarketPulse />
          </>
        )}

        {symbol && loading && (
          <>
            <QuoteSkeleton />
            <ChartSkeleton height={360} />
            <CardGridSkeleton count={4} />
          </>
        )}

        {symbol && !loading && quote && (
          <>
            {/* Quote header */}
            <div className="surface p-5 rounded-sm" data-testid="quote-header">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <h1 className="font-display font-black text-3xl tracking-tight" data-testid="symbol-name">{quote.symbol}</h1>
                    <span className="text-sm text-[var(--text-muted)] font-mono">{quote.name}</span>
                  </div>
                  <div className="flex items-baseline gap-3 mt-2 flex-wrap">
                    <span className="font-mono font-semibold text-3xl" data-testid="quote-price">${quote.price.toFixed(2)}</span>
                    <span className={`font-mono text-sm px-2 py-0.5 border rounded-sm ${
                      isUp ? "text-[var(--bull)] border-[var(--bull)]/40 bg-[var(--bull)]/5" : "text-[var(--bear)] border-[var(--bear)]/40 bg-[var(--bear)]/5"
                    }`} data-testid="quote-change">
                      {isUp ? "+" : ""}{quote.change.toFixed(2)} ({isUp ? "+" : ""}{quote.change_pct.toFixed(2)}%)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs font-mono text-[var(--text-muted)]">
                    <span>O <span className="text-white">{quote.open.toFixed(2)}</span></span>
                    <span>H <span className="text-white">{quote.high.toFixed(2)}</span></span>
                    <span>L <span className="text-white">{quote.low.toFixed(2)}</span></span>
                    <span>Vol <span className="text-white">{(quote.volume / 1e6).toFixed(2)}M</span></span>
                    <span>Prev <span className="text-white">{quote.prev_close.toFixed(2)}</span></span>
                  </div>
                  {quote.extended && (
                    <div className="flex items-baseline gap-2 mt-2 pt-2 border-t border-[var(--border)]">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                        {quote.extended.label}
                      </span>
                      <span className="font-mono font-semibold text-sm">${quote.extended.price.toFixed(2)}</span>
                      <span className={`font-mono text-xs px-1.5 py-0.5 border rounded-sm ${
                        quote.extended.change >= 0
                          ? "text-[var(--bull)] border-[var(--bull)]/40 bg-[var(--bull)]/5"
                          : "text-[var(--bear)] border-[var(--bear)]/40 bg-[var(--bear)]/5"
                      }`}>
                        {quote.extended.change >= 0 ? "+" : ""}{quote.extended.change.toFixed(2)} ({quote.extended.change >= 0 ? "+" : ""}{quote.extended.change_pct.toFixed(2)}%)
                      </span>
                    </div>
                  )}
                  {quote.market_state && quote.market_state !== "REGULAR" && !quote.extended && (
                    <div className="mt-2 pt-2 border-t border-[var(--border)]">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--warn)]">
                        Market Closed
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={toggleWatch}
                  data-testid="watchlist-toggle"
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs uppercase tracking-wider font-mono border rounded-sm transition-colors ${
                    watched ? "border-[var(--warn)] text-[var(--warn)]" : "border-[var(--border)] hover:border-[var(--warn)] hover:text-[var(--warn)]"
                  }`}
                >
                  {watched ? <Star size={12} fill="currentColor" /> : <StarOff size={12} />}
                  {watched ? "Watching" : "Add to Watchlist"}
                </button>
              </div>
            </div>

            {/* Chart with AI levels overlay */}
            <div className="surface p-5 rounded-sm">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)]">
                  / Price History {chartLevels && <span className="text-[var(--accent)] ml-2">· AI levels overlaid</span>}
                </h3>
                <div className="flex gap-1" data-testid="period-selector">
                  {PERIODS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      data-testid={`period-${p}`}
                      className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider rounded-sm border transition-colors ${
                        period === p ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--text-muted)] hover:text-white"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <CandlestickChart key={`${symbol}-${period}`} data={history} height={400} levels={chartLevels} fibonacci={indicators?.fibonacci} />
            </div>

            {/* AI analysis progress or panel */}
            {/* Technical Overview */}
            {indicators && <TechOverview indicators={indicators} />}

            {analyzing && <AnalysisProgress />}

            {!analyzing && analysis && (
              <AnalysisPanel
                analysis={analysis}
                indicators={indicators}
                onSave={handleSaveAnalysis}
                saving={savingAnalysis}
                saved={savedAnalysis}
              />
            )}

            {!analyzing && !analysis && (
              <div className="surface p-8 rounded-sm text-center" data-testid="analysis-prompt">
                <Zap size={20} className="text-[var(--accent)] mx-auto mb-3" />
                <h3 className="font-display font-bold text-lg mb-2">Get AI Trade Plan</h3>
                <p className="text-sm text-[var(--text-muted)] mb-4 max-w-md mx-auto">
                  Generate entry zones, stop-loss, R/R ratio, and chart pattern detection using Claude Sonnet 4.5.
                  AI levels will be drawn directly on the chart.
                </p>
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  data-testid="analysis-prompt-btn"
                  className="px-5 py-2.5 bg-[var(--accent)] hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-mono uppercase tracking-wider rounded-sm inline-flex items-center gap-2 transition-colors"
                >
                  <Zap size={14} /> Run Analysis
                </button>
              </div>
            )}

            {/* News */}
            {news.length > 0 && (
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-3">
                  / Recent News &amp; Sentiment
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="news-list">
                  {news.map((n, i) => (<NewsCard key={i} item={n} />))}
                </div>
              </div>
            )}

            {/* Sentiment Analysis */}
            {sentiment && <SentimentPanel data={sentiment} />}

            {/* Analyst Targets & Activity */}
            {analysts && <AnalystTargets data={analysts} price={quote.price} />}
          </>
        )}
      </div>
    </div>
  );
}
