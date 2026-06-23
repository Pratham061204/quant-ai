import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { api, formatApiError } from "@/lib/api";
import { Trash2, ExternalLink, Loader2 } from "lucide-react";
import { toast, Toaster } from "sonner";

export default function Watchlist() {
  const [items, setItems] = useState([]);
  const [quotes, setQuotes] = useState({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/watchlist`);
      setItems(data.items || []);
      // load quotes
      const qmap = {};
      await Promise.all(
        (data.items || []).map(async (it) => {
          try {
            const r = await api.get(`/stock/quote/${it.symbol}`);
            qmap[it.symbol] = r.data;
          } catch {}
        })
      );
      setQuotes(qmap);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const remove = async (id, sym) => {
    try {
      await api.delete(`/watchlist/${id}`);
      setItems((prev) => prev.filter((p) => p.id !== id));
      toast.success(`${sym} removed`);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <Toaster theme="dark" position="top-right" />
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="mb-6">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1">/ Watchlist</div>
          <h1 className="font-display font-black text-3xl tracking-tight">Your tracked tickers</h1>
        </div>

        {loading ? (
          <div className="surface p-12 rounded-sm flex items-center justify-center gap-3 text-[var(--text-muted)]">
            <Loader2 size={16} className="animate-spin" />
            <span className="font-mono text-sm">Loading...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="surface p-12 rounded-sm text-center" data-testid="watchlist-empty">
            <h3 className="font-display font-bold text-lg mb-2">No tickers yet</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">Add stocks from the dashboard to track them here.</p>
            <Link
              to="/dashboard"
              className="inline-flex px-4 py-2 bg-[var(--accent)] hover:bg-blue-500 text-white text-xs font-mono uppercase tracking-wider rounded-sm transition-colors"
              data-testid="goto-dashboard"
            >
              Go to dashboard
            </Link>
          </div>
        ) : (
          <div className="surface rounded-sm overflow-hidden" data-testid="watchlist-table">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] px-4 py-3">Symbol</th>
                  <th className="text-left text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] px-4 py-3 hidden md:table-cell">Name</th>
                  <th className="text-right text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] px-4 py-3">Price</th>
                  <th className="text-right text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] px-4 py-3">Change</th>
                  <th className="text-right text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const q = quotes[it.symbol];
                  const isUp = q && q.change >= 0;
                  return (
                    <tr key={it.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors" data-testid={`watchlist-row-${it.symbol}`}>
                      <td className="px-4 py-3 font-mono font-semibold">
                        <Link to={`/dashboard?symbol=${it.symbol}`} className="hover:text-[var(--accent)]">
                          {it.symbol}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--text-muted)] hidden md:table-cell truncate max-w-xs">{it.name || "--"}</td>
                      <td className="px-4 py-3 text-right font-mono">{q ? `$${q.price.toFixed(2)}` : "--"}</td>
                      <td className={`px-4 py-3 text-right font-mono ${q ? (isUp ? "text-[var(--bull)]" : "text-[var(--bear)]") : ""}`}>
                        {q ? `${isUp ? "+" : ""}${q.change_pct.toFixed(2)}%` : "--"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-2">
                          <Link
                            to={`/dashboard?symbol=${it.symbol}`}
                            className="p-1.5 border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] rounded-sm transition-colors"
                            data-testid={`open-${it.symbol}`}
                          >
                            <ExternalLink size={12} />
                          </Link>
                          <button
                            onClick={() => remove(it.id, it.symbol)}
                            className="p-1.5 border border-[var(--border)] hover:border-[var(--bear)] hover:text-[var(--bear)] rounded-sm transition-colors"
                            data-testid={`remove-${it.symbol}`}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
