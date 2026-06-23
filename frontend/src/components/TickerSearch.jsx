import { useEffect, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

export default function TickerSearch({ onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef();
  const wrapRef = useRef();

  useEffect(() => {
    if (!query || query.length < 1) {
      setResults([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/stock/search`, { params: { q: query } });
        setResults(data.results || []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  }, [query]);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handlePick = (sym, name) => {
    setOpen(false);
    setQuery("");
    onSelect(sym, name);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      handlePick(query.trim().toUpperCase(), null);
    }
  };

  return (
    <div ref={wrapRef} className="relative w-full">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            data-testid="ticker-search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Search ticker (e.g., AAPL, TSLA, NVDA)..."
            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-sm pl-9 pr-9 py-3 text-sm font-mono uppercase placeholder:normal-case placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
          {loading && (
            <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] animate-spin" />
          )}
        </div>
      </form>

      {open && results.length > 0 && (
        <div
          data-testid="ticker-search-results"
          className="absolute left-0 right-0 mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-sm z-40 max-h-72 overflow-auto"
        >
          {results.map((r) => (
            <button
              key={r.symbol}
              type="button"
              onClick={() => handlePick(r.symbol, r.name)}
              className="w-full px-3 py-2.5 text-left hover:bg-[var(--surface-hover)] border-b border-[var(--border)] last:border-b-0 flex items-center justify-between transition-colors"
              data-testid={`ticker-result-${r.symbol}`}
            >
              <div>
                <div className="font-mono font-semibold text-sm">{r.symbol}</div>
                <div className="text-xs text-[var(--text-muted)] truncate max-w-[260px]">{r.name}</div>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] border border-[var(--border)] px-1.5 py-0.5 rounded-sm">
                {r.exchange}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
