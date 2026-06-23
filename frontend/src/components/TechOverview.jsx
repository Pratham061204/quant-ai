import { Activity, TrendingUp, TrendingDown, Minus, BarChart2 } from "lucide-react";

function ScoreRing({ value, label, size = 64 }) {
  const pct = ((value - 1) / 9) * 100;
  const color = value >= 6.5 ? "var(--bull)" : value <= 3.5 ? "var(--bear)" : "var(--warn)";
  const circumference = 2 * Math.PI * 26;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="26" fill="none" stroke="var(--surface-alt)" strokeWidth="4" />
        <circle
          cx="32" cy="32" r="26" fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 32 32)"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
        <text x="32" y="30" textAnchor="middle" fontSize="16" fontWeight="800" fill={color} fontFamily="'IBM Plex Mono', monospace">
          {value.toFixed(1)}
        </text>
        <text x="32" y="42" textAnchor="middle" fontSize="8" fill="var(--text-muted)" fontFamily="'IBM Plex Mono', monospace">
          /10
        </text>
      </svg>
      <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color }}>{label}</span>
    </div>
  );
}

function RSBar({ label, stock, spy, diff }) {
  const color = diff > 0 ? "var(--bull)" : diff < 0 ? "var(--bear)" : "var(--text-muted)";
  return (
    <div className="flex items-center justify-between text-xs font-mono">
      <span className="text-[var(--text-muted)] w-8">{label}</span>
      <div className="flex items-center gap-3">
        <span className={stock >= 0 ? "text-[var(--bull)]" : "text-[var(--bear)]"}>
          {stock >= 0 ? "+" : ""}{stock}%
        </span>
        <span className="text-[var(--text-muted)]">vs</span>
        <span className={spy >= 0 ? "text-[var(--bull)]" : "text-[var(--bear)]"}>
          {spy >= 0 ? "+" : ""}{spy}%
        </span>
        <span className="px-1.5 py-0.5 rounded-sm text-[10px]" style={{ color }}>
          {diff > 0 ? "+" : ""}{diff}%
        </span>
      </div>
    </div>
  );
}

export default function TechOverview({ indicators }) {
  if (!indicators) return null;

  const { tech_score, tech_label, fibonacci, relative_strength } = indicators;

  return (
    <div className="surface p-5 rounded-sm space-y-4">
      <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)]">
        / Technical Overview
      </div>

      <div className="flex gap-6 items-start">
        {/* Tech Score */}
        {tech_score && (
          <div className="flex items-center gap-4">
            <ScoreRing value={tech_score} label={tech_label} />
            <div className="text-xs font-mono text-[var(--text-muted)] space-y-0.5">
              <div className="flex items-center gap-1">
                <Activity size={10} />
                <span>Technical Score</span>
              </div>
              <div className="text-[10px]">
                Based on RSI, MACD, trend, SMAs, Bollinger, volume
              </div>
            </div>
          </div>
        )}

        {/* Fibonacci Levels */}
        {fibonacci && (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-2">
              <BarChart2 size={10} className="text-[var(--text-muted)]" />
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">Fibonacci Levels</span>
            </div>
            <div className="grid grid-cols-4 gap-x-3 gap-y-1 text-[10px] font-mono">
              {[
                { k: "0", l: "0% (High)" },
                { k: "236", l: "23.6%" },
                { k: "382", l: "38.2%" },
                { k: "500", l: "50.0%" },
                { k: "618", l: "61.8%" },
                { k: "786", l: "78.6%" },
                { k: "100", l: "100% (Low)" },
              ].map(({ k, l }) => (
                <div key={k} className="flex justify-between gap-1">
                  <span className="text-[var(--text-muted)]">{l}</span>
                  <span className="text-[var(--accent)]">${fibonacci[k]}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Relative Strength vs S&P 500 */}
      {relative_strength && relative_strength.periods && (
        <div className="pt-3 border-t border-[var(--border)] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {relative_strength.rating === "Outperforming" ? (
                <TrendingUp size={12} className="text-[var(--bull)]" />
              ) : relative_strength.rating === "Underperforming" ? (
                <TrendingDown size={12} className="text-[var(--bear)]" />
              ) : (
                <Minus size={12} className="text-[var(--text-muted)]" />
              )}
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                vs S&P 500
              </span>
            </div>
            <span className={`text-xs font-mono font-semibold ${
              relative_strength.rating === "Outperforming" ? "text-[var(--bull)]" :
              relative_strength.rating === "Underperforming" ? "text-[var(--bear)]" :
              "text-[var(--text-muted)]"
            }`}>
              {relative_strength.rating}
            </span>
          </div>
          <div className="space-y-1">
            {Object.entries(relative_strength.periods).map(([period, vals]) => (
              <RSBar key={period} label={period} stock={vals.stock} spy={vals.spy} diff={vals.diff} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
