import { TrendingUp, TrendingDown, Users, Calendar } from "lucide-react";

export default function AnalystTargets({ data, price }) {
  if (!data) return null;

  const { targets, consensus, earnings_date, recent_actions } = data;
  if (!targets && !consensus && (!recent_actions || recent_actions.length === 0)) return null;

  const impliedUpside = targets?.mean
    ? (((targets.mean - price) / price) * 100).toFixed(1)
    : null;

  const isUpside = impliedUpside && parseFloat(impliedUpside) > 0;

  // Build consensus bar
  const total = consensus?.total || 0;
  const segments = consensus
    ? [
        { key: "strong_buy", label: "Strong Buy", count: consensus.strong_buy, color: "var(--bull)" },
        { key: "buy", label: "Buy", count: consensus.buy, color: "#4ade80" },
        { key: "hold", label: "Hold", count: consensus.hold, color: "var(--warn)" },
        { key: "sell", label: "Sell", count: consensus.sell, color: "#f87171" },
        { key: "strong_sell", label: "Strong Sell", count: consensus.strong_sell, color: "var(--bear)" },
      ]
    : [];

  return (
    <div className="surface p-5 rounded-sm space-y-4">
      <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)]">
        / Analyst Price Targets
      </div>

      {/* Price target bar */}
      {targets && targets.mean > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-[var(--text-muted)]" />
              <span className="text-xs font-mono text-[var(--text-muted)]">
                {targets.num_analysts || "—"} Analysts
              </span>
            </div>
            {impliedUpside && (
              <span
                className={`text-xs font-mono px-2 py-0.5 border rounded-sm ${
                  isUpside
                    ? "text-[var(--bull)] border-[var(--bull)]/40 bg-[var(--bull)]/5"
                    : "text-[var(--bear)] border-[var(--bear)]/40 bg-[var(--bear)]/5"
                }`}
              >
                {isUpside ? (
                  <TrendingUp size={10} className="inline mr-1" />
                ) : (
                  <TrendingDown size={10} className="inline mr-1" />
                )}
                {isUpside ? "+" : ""}
                {impliedUpside}% implied
              </span>
            )}
          </div>

          {/* Visual range bar */}
          <div className="relative h-8 bg-[var(--surface-alt)] rounded-sm overflow-hidden">
            {(() => {
              const low = targets.low;
              const high = targets.high;
              const range = high - low || 1;
              const meanPos = ((targets.mean - low) / range) * 100;
              const pricePos = ((price - low) / range) * 100;

              return (
                <>
                  {/* Mean target line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-[var(--accent)]"
                    style={{ left: `${Math.min(Math.max(meanPos, 2), 98)}%` }}
                  />
                  {/* Current price marker */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white border border-[var(--border)]"
                    style={{ left: `${Math.min(Math.max(pricePos, 2), 98)}%` }}
                  />
                </>
              );
            })()}
          </div>

          {/* Labels */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Low</div>
              <div className="text-sm font-mono font-semibold text-[var(--bear)]">
                ${targets.low.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Mean</div>
              <div className="text-sm font-mono font-semibold text-[var(--accent)]">
                ${targets.mean.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Median</div>
              <div className="text-sm font-mono font-semibold">
                ${targets.median.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase">High</div>
              <div className="text-sm font-mono font-semibold text-[var(--bull)]">
                ${targets.high.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Consensus bar */}
      {consensus && total > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)]">
              Consensus
            </span>
            <span className="text-xs font-mono font-semibold" style={{
              color: consensus.label?.includes("Buy")
                ? "var(--bull)"
                : consensus.label?.includes("Sell")
                  ? "var(--bear)"
                  : "var(--warn)"
            }}>
              {consensus.label}
            </span>
          </div>
          <div className="flex h-3 rounded-sm overflow-hidden gap-px">
            {segments.map((s) =>
              s.count > 0 ? (
                <div
                  key={s.key}
                  className="h-full transition-all"
                  style={{
                    width: `${(s.count / total) * 100}%`,
                    backgroundColor: s.color,
                    opacity: 0.8,
                  }}
                  title={`${s.label}: ${s.count}`}
                />
              ) : null
            )}
          </div>
          <div className="flex justify-between text-[10px] font-mono text-[var(--text-muted)]">
            {segments.map((s) =>
              s.count > 0 ? (
                <span key={s.key} style={{ color: s.color }}>
                  {s.count} {s.label.split(" ").pop()}
                </span>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* Recent analyst actions (last 3 months) */}
      {recent_actions && recent_actions.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-[var(--border)]">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)]">
            Recent Analyst Activity (90d)
          </div>
          <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
            {recent_actions.map((a, i) => {
              const actionColor =
                a.action === "up" || a.to_grade?.toLowerCase().includes("buy")
                  ? "var(--bull)"
                  : a.action === "down" || a.to_grade?.toLowerCase().includes("sell")
                    ? "var(--bear)"
                    : "var(--text-muted)";
              return (
                <div key={i} className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] text-[var(--text-muted)] shrink-0">{a.date}</span>
                    <span className="truncate">{a.firm}</span>
                  </div>
                  <span className="shrink-0 ml-2 px-1.5 py-0.5 rounded-sm text-[10px]" style={{ color: actionColor }}>
                    {a.to_grade || a.action}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Earnings date */}
      {earnings_date && (
        <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
          <Calendar size={12} className="text-[var(--warn)]" />
          <span className="text-xs font-mono text-[var(--text-muted)]">
            Next Earnings:
          </span>
          <span className="text-xs font-mono font-semibold text-[var(--warn)]">
            {earnings_date}
          </span>
        </div>
      )}
    </div>
  );
}
