import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function TickerTape() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let alive = true;
    api.get("/market/overview").then((r) => {
      if (alive) setItems(r.data.tape || []);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!items.length) {
    return <div className="border-y border-[var(--border)] h-9" data-testid="ticker-tape-empty"></div>;
  }

  // duplicate items for seamless scroll
  const looped = [...items, ...items];

  return (
    <div className="border-y border-[var(--border)] overflow-hidden bg-[var(--surface)]" data-testid="ticker-tape">
      <div className="ticker-tape flex whitespace-nowrap py-2.5">
        {looped.map((it, i) => {
          const isUp = it.change_pct >= 0;
          return (
            <span key={i} className="inline-flex items-center gap-2 px-5 font-mono text-xs">
              <span className="font-semibold">{it.symbol}</span>
              <span className="text-[var(--text-muted)]">${it.price.toFixed(2)}</span>
              <span className={isUp ? "text-[var(--bull)]" : "text-[var(--bear)]"}>
                {isUp ? "+" : ""}{it.change_pct.toFixed(2)}%
              </span>
              <span className="text-[var(--border-bright)]">|</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
