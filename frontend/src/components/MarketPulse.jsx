import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ArrowDownRight, Activity, Flame, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

function MoverRow({ r, idx }) {
  const isUp = r.change_pct >= 0;
  return (
    <Link
      to={`/dashboard?symbol=${r.symbol}`}
      className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface-hover)] transition-colors group"
      data-testid={`mover-${r.symbol}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-mono text-[var(--text-muted)] w-4">{idx + 1}</span>
        <span className="font-mono font-semibold text-sm group-hover:text-[var(--accent)] transition-colors">{r.symbol}</span>
      </div>
      <div className="flex items-center gap-3 font-mono text-xs">
        <span className="text-[var(--text-muted)]">${r.price.toFixed(2)}</span>
        <span className={`flex items-center gap-1 w-16 justify-end ${isUp ? "text-[var(--bull)]" : "text-[var(--bear)]"}`}>
          {isUp ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
          {isUp ? "+" : ""}{r.change_pct.toFixed(2)}%
        </span>
      </div>
    </Link>
  );
}

function IndexCard({ r }) {
  const isUp = r.change_pct >= 0;
  return (
    <Link
      to={`/dashboard?symbol=${r.symbol === "VIX" ? "^VIX" : r.symbol}`}
      className="surface surface-hover p-4 rounded-sm transition-colors block"
      data-testid={`index-${r.symbol}`}
    >
      <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1">{r.label}</div>
      <div className="font-mono font-semibold text-xl mb-1">{r.price.toFixed(2)}</div>
      <div className={`text-xs font-mono ${isUp ? "text-[var(--bull)]" : "text-[var(--bear)]"}`}>
        {isUp ? "+" : ""}{r.change.toFixed(2)} ({isUp ? "+" : ""}{r.change_pct.toFixed(2)}%)
      </div>
    </Link>
  );
}

export default function MarketPulse() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.get("/market/overview").then((r) => {
      if (alive) setData(r.data);
    }).catch(() => {}).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  if (loading) {
    return (
      <div className="surface p-12 rounded-sm flex items-center justify-center gap-3 text-[var(--text-muted)]" data-testid="pulse-loading">
        <Loader2 size={16} className="animate-spin" />
        <span className="font-mono text-sm">Loading market pulse...</span>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4" data-testid="market-pulse">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-3 flex items-center gap-2">
          <Activity size={11} /> / Market Indices
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {(data.indices || []).map((r) => <IndexCard key={r.symbol} r={r} />)}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="surface rounded-sm overflow-hidden" data-testid="gainers-list">
          <div className="px-3 py-2.5 border-b border-[var(--border)] flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--bull)] flex items-center gap-1.5">
              <ArrowUpRight size={11} /> Top Gainers
            </span>
          </div>
          {(data.gainers || []).map((r, i) => <MoverRow key={r.symbol} r={r} idx={i} />)}
        </div>

        <div className="surface rounded-sm overflow-hidden" data-testid="losers-list">
          <div className="px-3 py-2.5 border-b border-[var(--border)] flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--bear)] flex items-center gap-1.5">
              <ArrowDownRight size={11} /> Top Losers
            </span>
          </div>
          {(data.losers || []).map((r, i) => <MoverRow key={r.symbol} r={r} idx={i} />)}
        </div>

        <div className="surface rounded-sm overflow-hidden" data-testid="active-list">
          <div className="px-3 py-2.5 border-b border-[var(--border)] flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--warn)] flex items-center gap-1.5">
              <Flame size={11} /> Most Active
            </span>
          </div>
          {(data.most_active || []).map((r, i) => <MoverRow key={r.symbol} r={r} idx={i} />)}
        </div>
      </div>
    </div>
  );
}
