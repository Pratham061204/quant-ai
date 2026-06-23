import { TrendingUp, TrendingDown, Target, Shield, Activity, AlertTriangle } from "lucide-react";

const fmt = (n) => (typeof n === "number" ? n.toFixed(2) : "--");

function MetricBox({ label, value, accent = "text-white", testId }) {
  return (
    <div className="border border-[var(--border)] p-3 rounded-sm" data-testid={testId}>
      <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1">{label}</div>
      <div className={`font-mono font-semibold text-lg ${accent}`}>{value}</div>
    </div>
  );
}

const recColor = (r) => {
  if (r === "BUY") return "bg-[var(--bull)]/10 text-[var(--bull)] border-[var(--bull)]/40";
  if (r === "SELL") return "bg-[var(--bear)]/10 text-[var(--bear)] border-[var(--bear)]/40";
  if (r === "WAIT") return "bg-[var(--warn)]/10 text-[var(--warn)] border-[var(--warn)]/40";
  return "bg-[var(--surface-hover)] text-[var(--text-muted)] border-[var(--border)]";
};

export default function AnalysisPanel({ analysis, indicators, onSave, saving, saved }) {
  if (!analysis) return null;
  const a = analysis;
  const isBuy = a.recommendation === "BUY";
  const isSell = a.recommendation === "SELL";
  const targetPrice = a.take_profit_1 ?? a.take_profit_2;
  const upside = targetPrice && a.ideal_entry_price
    ? (((targetPrice - a.ideal_entry_price) / a.ideal_entry_price) * 100).toFixed(1)
    : null;

  return (
    <div className="space-y-4" data-testid="analysis-panel">
      {/* Header recommendation */}
      <div className="surface p-5 rounded-sm">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1">
              AI Recommendation
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className={`px-3 py-1.5 text-sm font-mono font-bold uppercase tracking-wider border rounded-sm ${recColor(a.recommendation)}`}
                data-testid="recommendation-badge"
              >
                {isBuy && <TrendingUp size={14} className="inline mr-1.5 -mt-0.5" />}
                {isSell && <TrendingDown size={14} className="inline mr-1.5 -mt-0.5" />}
                {a.recommendation}
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] border border-[var(--border)] px-2 py-0.5 rounded-sm">
                Confidence: {a.confidence}
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] border border-[var(--border)] px-2 py-0.5 rounded-sm">
                {a.time_horizon}
              </span>
            </div>
          </div>
          {onSave && (
            <button
              onClick={onSave}
              disabled={saving || saved}
              className="px-3 py-1.5 text-xs uppercase tracking-wider font-mono border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors duration-150 rounded-sm disabled:opacity-50"
              data-testid="save-analysis-btn"
            >
              {saved ? "Saved" : saving ? "Saving..." : "Save Analysis"}
            </button>
          )}
        </div>
      </div>

      {/* Key levels grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricBox
          label="Ideal Entry"
          value={`$${fmt(a.ideal_entry_price)}`}
          accent="text-[var(--accent)]"
          testId="metric-entry"
        />
        <MetricBox
          label="Stop Loss"
          value={`$${fmt(a.stop_loss)}`}
          accent="text-[var(--bear)]"
          testId="metric-stop-loss"
        />
        <MetricBox
          label="Take Profit 1"
          value={`$${fmt(a.take_profit_1)}`}
          accent="text-[var(--bull)]"
          testId="metric-tp1"
        />
        <MetricBox
          label="Risk / Reward"
          value={`1 : ${fmt(a.risk_reward_ratio)}`}
          accent="text-[var(--bull)]"
          testId="metric-rr"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="border border-[var(--border)] p-3 rounded-sm">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1">Entry Zone</div>
          <div className="font-mono text-sm">
            <span className="text-[var(--text-muted)]">${fmt(a.entry_zone_low)}</span>
            <span className="text-[var(--text-muted)] mx-1">—</span>
            <span>${fmt(a.entry_zone_high)}</span>
          </div>
        </div>
        <div className="border border-[var(--border)] p-3 rounded-sm">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1">Take Profit 2</div>
          <div className="font-mono text-sm text-[var(--bull)]">${fmt(a.take_profit_2)}</div>
        </div>
        <div className="border border-[var(--border)] p-3 rounded-sm">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1">Upside to TP1</div>
          <div className="font-mono text-sm text-[var(--bull)]">{upside ? `+${upside}%` : "--"}</div>
        </div>
      </div>

      {/* Patterns + thesis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="surface p-4 rounded-sm">
          <h3 className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] mb-3 flex items-center gap-1.5">
            <Activity size={12} /> Chart Patterns Detected
          </h3>
          {a.chart_patterns && a.chart_patterns.length > 0 ? (
            <div className="flex flex-wrap gap-2" data-testid="chart-patterns">
              {a.chart_patterns.map((p, i) => (
                <span
                  key={i}
                  className="text-xs font-mono px-2.5 py-1 border border-[var(--border)] rounded-sm"
                >
                  {p}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-xs font-mono text-[var(--text-muted)]">No distinct pattern detected</div>
          )}
        </div>

        <div className="surface p-4 rounded-sm">
          <h3 className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] mb-3 flex items-center gap-1.5">
            <Target size={12} /> Key Levels
          </h3>
          <div className="space-y-1.5 text-xs font-mono">
            <div>
              <span className="text-[var(--bull)]">Support:</span>{" "}
              {(a.key_levels?.support || []).map((s) => `$${fmt(s)}`).join("  ·  ") || "--"}
            </div>
            <div>
              <span className="text-[var(--bear)]">Resistance:</span>{" "}
              {(a.key_levels?.resistance || []).map((s) => `$${fmt(s)}`).join("  ·  ") || "--"}
            </div>
          </div>
        </div>
      </div>

      {/* Thesis */}
      <div className="surface p-4 rounded-sm">
        <h3 className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center gap-1.5">
          <Shield size={12} /> Trade Thesis
        </h3>
        <p className="text-sm leading-relaxed text-white/90" data-testid="thesis">{a.thesis}</p>
      </div>

      {a.risks && (
        <div className="border border-[var(--warn)]/30 bg-[var(--warn)]/5 p-4 rounded-sm">
          <h3 className="text-[10px] font-mono uppercase tracking-wider text-[var(--warn)] mb-2 flex items-center gap-1.5">
            <AlertTriangle size={12} /> Primary Risk
          </h3>
          <p className="text-sm leading-relaxed text-white/90" data-testid="risks">{a.risks}</p>
        </div>
      )}

      {/* Indicators sidebar style */}
      {indicators && (
        <>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 pt-1">
            <MetricBox label="RSI(14)" value={fmt(indicators.rsi)} testId="ind-rsi"
              accent={indicators.rsi > 70 ? "text-[var(--bear)]" : indicators.rsi < 30 ? "text-[var(--bull)]" : "text-white"} />
            <MetricBox label="ATR(14)" value={fmt(indicators.atr)} testId="ind-atr" />
            <MetricBox label="SMA 20" value={fmt(indicators.sma20)} testId="ind-sma20" />
            <MetricBox label="SMA 50" value={fmt(indicators.sma50)} testId="ind-sma50" />
            <MetricBox label="SMA 200" value={fmt(indicators.sma200)} testId="ind-sma200" />
            <MetricBox label="Trend" value={indicators.trend} testId="ind-trend"
              accent={indicators.trend === "Uptrend" ? "text-[var(--bull)]" : indicators.trend === "Downtrend" ? "text-[var(--bear)]" : "text-[var(--warn)]"} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="border border-[var(--border)] p-3 rounded-sm" data-testid="ind-macd">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1">MACD</div>
              <div className={`font-mono font-semibold text-sm ${
                indicators.macd_state?.includes("Bullish") ? "text-[var(--bull)]"
                  : indicators.macd_state?.includes("Bearish") ? "text-[var(--bear)]" : "text-white"
              }`}>{indicators.macd_state}</div>
              <div className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">{fmt(indicators.macd)} / {fmt(indicators.macd_signal)}</div>
            </div>
            <div className="border border-[var(--border)] p-3 rounded-sm" data-testid="ind-bb">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1">Bollinger</div>
              <div className="font-mono font-semibold text-sm">{indicators.bb_position}</div>
              <div className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
                Width {fmt(indicators.bb_width_pct)}%{indicators.bb_squeeze ? " · Squeeze" : ""}
              </div>
            </div>
            <div className="border border-[var(--border)] p-3 rounded-sm" data-testid="ind-volume">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1">Volume vs 20d</div>
              <div className={`font-mono font-semibold text-sm ${indicators.volume_ratio >= 1.5 ? "text-[var(--bull)]" : indicators.volume_ratio < 0.7 ? "text-[var(--text-muted)]" : "text-white"}`}>
                {fmt(indicators.volume_ratio)}x
              </div>
            </div>
            <div className="border border-[var(--border)] p-3 rounded-sm" data-testid="ind-52w">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1">52w Range</div>
              <div className="font-mono text-sm">${fmt(indicators.low_52w)} — ${fmt(indicators.high_52w)}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
