import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const PHASES = [
  { label: "Fetching live quote data", ms: 600 },
  { label: "Computing technical indicators", ms: 700 },
  { label: "Detecting chart patterns", ms: 900 },
  { label: "AI model reasoning", ms: 1500 },
  { label: "Calibrating entry, stop & R/R", ms: 800 },
];

export default function AnalysisProgress() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    let idx = 0;
    const advance = () => {
      idx++;
      if (idx < PHASES.length) {
        setStep(idx);
        timer = setTimeout(advance, PHASES[idx].ms);
      }
    };
    let timer = setTimeout(advance, PHASES[0].ms);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="surface p-6 rounded-sm" data-testid="analysis-progress">
      <div className="flex items-center gap-2 mb-4">
        <Loader2 size={14} className="animate-spin text-[var(--accent)]" />
        <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">AI Analysis in progress</span>
      </div>
      <div className="space-y-2">
        {PHASES.map((p, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div key={i} className="flex items-center gap-3 text-xs font-mono">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  done ? "bg-[var(--bull)]" : active ? "bg-[var(--accent)] pulse-dot" : "bg-[var(--border-bright)]"
                }`}
              />
              <span className={done ? "text-white" : active ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}>
                {p.label}
                {done && " ✓"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
