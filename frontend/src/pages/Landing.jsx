import { Link } from "react-router-dom";
import { ArrowRight, LineChart, Cpu, Target, Activity } from "lucide-react";
import Navbar from "@/components/Navbar";
import TickerTape from "@/components/TickerTape";

function Feature({ icon: Icon, title, desc, testId }) {
  return (
    <div className="surface p-6 rounded-sm" data-testid={testId}>
      <Icon size={20} className="text-[var(--accent)] mb-4" />
      <h3 className="font-display font-bold text-lg mb-2">{title}</h3>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed">{desc}</p>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <TickerTape />

      {/* Hero */}
      <section className="relative grid-bg overflow-hidden">
        <div className="max-w-[1600px] mx-auto px-6 pt-24 pb-32 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] border border-[var(--border)] px-3 py-1.5 rounded-sm mb-8" data-testid="hero-badge">
              <span className="w-1.5 h-1.5 bg-[var(--bull)] rounded-full pulse-dot"></span>
              Live · Powered by Claude Sonnet 4.5
            </div>
            <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.05] mb-6">
              Institutional-grade<br />
              <span className="text-[var(--accent)]">stock analysis,</span><br />
              one ticker away.
            </h1>
            <p className="text-lg text-[var(--text-muted)] max-w-2xl mb-10 leading-relaxed">
              Enter any US ticker. Get the ideal entry price, calibrated stop-loss, risk/reward
              ratio, and live chart-pattern detection — engineered by an AI quant, in seconds.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-[var(--accent)] hover:bg-blue-500 text-white px-6 py-3 text-sm font-mono uppercase tracking-wider rounded-sm transition-colors"
                data-testid="hero-cta-start"
              >
                Run a free analysis <ArrowRight size={16} />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 border border-[var(--border)] hover:border-white px-6 py-3 text-sm font-mono uppercase tracking-wider rounded-sm transition-colors"
                data-testid="hero-cta-signin"
              >
                Sign in
              </Link>
            </div>
          </div>

          {/* Mock terminal */}
          <div className="mt-16 surface p-4 rounded-sm max-w-3xl">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-[var(--border)]">
              <div className="font-mono text-xs text-[var(--text-muted)]">$ analyze NVDA --horizon=swing</div>
              <span className="text-[10px] font-mono text-[var(--bull)]">● LIVE</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
              <div><div className="text-[var(--text-muted)] uppercase text-[10px] mb-1">Entry</div><div className="text-[var(--accent)] text-base">$478.20</div></div>
              <div><div className="text-[var(--text-muted)] uppercase text-[10px] mb-1">Stop</div><div className="text-[var(--bear)] text-base">$461.40</div></div>
              <div><div className="text-[var(--text-muted)] uppercase text-[10px] mb-1">TP1</div><div className="text-[var(--bull)] text-base">$512.90</div></div>
              <div><div className="text-[var(--text-muted)] uppercase text-[10px] mb-1">R/R</div><div className="text-[var(--bull)] text-base">1 : 2.07</div></div>
            </div>
            <div className="mt-3 pt-3 border-t border-[var(--border)] text-[var(--text-muted)] font-mono text-xs">
              <span className="text-[var(--bull)]">→</span> Pattern: Bull flag, ascending triangle · RSI: 58.2 · Trend: Uptrend
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-[var(--border)]">
        <div className="max-w-[1600px] mx-auto px-6 py-24">
          <div className="mb-12">
            <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-3">/ Capabilities</div>
            <h2 className="font-display font-black text-3xl sm:text-4xl tracking-tight max-w-2xl">
              Built for traders who treat decisions like data.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Feature
              icon={Target}
              title="Precision Entries"
              desc="Calculate ideal entry zones using ATR-adjusted technicals and momentum, not gut feel."
              testId="feature-entry"
            />
            <Feature
              icon={Activity}
              title="R/R Ratio"
              desc="Every trade plan ships with calibrated stop-loss and two take-profit levels."
              testId="feature-rr"
            />
            <Feature
              icon={LineChart}
              title="Pattern Detection"
              desc="Bull flags, head-and-shoulders, ascending triangles — surfaced in real time."
              testId="feature-pattern"
            />
            <Feature
              icon={Cpu}
              title="News Sentiment"
              desc="Headlines scored bullish, bearish or neutral so context never gets lost."
              testId="feature-news"
            />
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] py-8">
        <div className="max-w-[1600px] mx-auto px-6 flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
          <span>QUANT.AI · Not investment advice. For educational use.</span>
          <span>v1.0</span>
        </div>
      </footer>
    </div>
  );
}
