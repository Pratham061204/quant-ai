import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";

/**
 * Position size calculator based on AI entry & stop.
 * Inputs: account size + risk % per trade.
 * Outputs: share count, $ risk, $ reward, position $ value.
 */
export default function PositionCalculator({ entry, stop, tp1, tp2 }) {
  const [account, setAccount] = useState(10000);
  const [riskPct, setRiskPct] = useState(1);

  const calc = useMemo(() => {
    if (!entry || !stop || entry <= 0) return null;
    const riskPerShare = Math.abs(entry - stop);
    if (riskPerShare === 0) return null;
    const dollarRisk = (account * riskPct) / 100;
    const shares = Math.floor(dollarRisk / riskPerShare);
    const positionValue = shares * entry;
    const rewardPerShare1 = tp1 ? Math.abs(tp1 - entry) : 0;
    const rewardPerShare2 = tp2 ? Math.abs(tp2 - entry) : 0;
    return {
      shares,
      dollarRisk: shares * riskPerShare,
      positionValue,
      rewardTp1: shares * rewardPerShare1,
      rewardTp2: shares * rewardPerShare2,
      riskPerShare,
    };
  }, [entry, stop, tp1, tp2, account, riskPct]);

  return (
    <div className="surface p-4 rounded-sm" data-testid="position-calculator">
      <h3 className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] mb-3 flex items-center gap-1.5">
        <Calculator size={12} /> Position Size Calculator
      </h3>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] block mb-1">Account ($)</label>
          <input
            type="number"
            value={account}
            onChange={(e) => setAccount(Math.max(0, Number(e.target.value)))}
            data-testid="calc-account"
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-sm px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] block mb-1">Risk / Trade (%)</label>
          <input
            type="number"
            value={riskPct}
            step="0.1"
            onChange={(e) => setRiskPct(Math.max(0.1, Math.min(100, Number(e.target.value))))}
            data-testid="calc-risk-pct"
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-sm px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
      </div>

      {calc ? (
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="border border-[var(--border)] p-2 rounded-sm">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-0.5">Shares</div>
            <div className="text-base font-semibold" data-testid="calc-shares">{calc.shares.toLocaleString()}</div>
          </div>
          <div className="border border-[var(--border)] p-2 rounded-sm">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-0.5">Position $</div>
            <div className="text-base font-semibold" data-testid="calc-position-value">${calc.positionValue.toFixed(0)}</div>
          </div>
          <div className="border border-[var(--bear)]/30 bg-[var(--bear)]/5 p-2 rounded-sm">
            <div className="text-[10px] uppercase tracking-wider text-[var(--bear)] mb-0.5">$ At Risk</div>
            <div className="text-base font-semibold text-[var(--bear)]" data-testid="calc-risk-dollar">${calc.dollarRisk.toFixed(0)}</div>
          </div>
          <div className="border border-[var(--bull)]/30 bg-[var(--bull)]/5 p-2 rounded-sm">
            <div className="text-[10px] uppercase tracking-wider text-[var(--bull)] mb-0.5">$ Reward (TP1)</div>
            <div className="text-base font-semibold text-[var(--bull)]" data-testid="calc-reward-tp1">${calc.rewardTp1.toFixed(0)}</div>
          </div>
          {calc.rewardTp2 > 0 && (
            <div className="col-span-2 border border-[var(--bull)]/30 bg-[var(--bull)]/5 p-2 rounded-sm">
              <div className="text-[10px] uppercase tracking-wider text-[var(--bull)] mb-0.5">$ Reward (TP2)</div>
              <div className="text-base font-semibold text-[var(--bull)]" data-testid="calc-reward-tp2">${calc.rewardTp2.toFixed(0)}</div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs font-mono text-[var(--text-muted)]">Need entry &amp; stop to compute size.</div>
      )}
    </div>
  );
}
