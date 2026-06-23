import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { api, formatApiError } from "@/lib/api";
import AnalysisPanel from "@/components/AnalysisPanel";
import { Trash2, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast, Toaster } from "sonner";

export default function History() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/analyses`);
      setItems(data.items || []);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const remove = async (id, sym) => {
    try {
      await api.delete(`/analyses/${id}`);
      setItems((prev) => prev.filter((p) => p.id !== id));
      toast.success(`Removed analysis for ${sym}`);
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
          <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1">/ History</div>
          <h1 className="font-display font-black text-3xl tracking-tight">Saved analyses</h1>
        </div>

        {loading ? (
          <div className="surface p-12 rounded-sm flex items-center justify-center gap-3 text-[var(--text-muted)]">
            <Loader2 size={16} className="animate-spin" />
            <span className="font-mono text-sm">Loading...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="surface p-12 rounded-sm text-center" data-testid="history-empty">
            <h3 className="font-display font-bold text-lg mb-2">No saved analyses</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">Run an AI analysis and save it to revisit later.</p>
            <Link to="/dashboard" className="inline-flex px-4 py-2 bg-[var(--accent)] hover:bg-blue-500 text-white text-xs font-mono uppercase tracking-wider rounded-sm transition-colors" data-testid="goto-dashboard">
              Run an analysis
            </Link>
          </div>
        ) : (
          <div className="space-y-3" data-testid="history-list">
            {items.map((it) => (
              <div key={it.id} className="surface rounded-sm" data-testid={`history-row-${it.symbol}`}>
                <div className="flex items-center justify-between gap-3 p-4 flex-wrap">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="font-display font-black text-lg">{it.symbol}</span>
                    <span className="text-xs font-mono text-[var(--text-muted)] truncate max-w-xs">{it.name || ""}</span>
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 border rounded-sm ${
                      it.analysis?.recommendation === "BUY" ? "text-[var(--bull)] border-[var(--bull)]/40"
                        : it.analysis?.recommendation === "SELL" ? "text-[var(--bear)] border-[var(--bear)]/40"
                        : "text-[var(--warn)] border-[var(--warn)]/40"
                    }`}>
                      {it.analysis?.recommendation}
                    </span>
                    <span className="text-xs font-mono text-[var(--text-muted)]">
                      Entry ${it.analysis?.ideal_entry_price} · SL ${it.analysis?.stop_loss} · R/R {it.analysis?.risk_reward_ratio}
                    </span>
                    <span className="text-xs font-mono text-[var(--text-muted)]">
                      {new Date(it.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setExpanded(expanded === it.id ? null : it.id)}
                      className="p-1.5 border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] rounded-sm transition-colors"
                      data-testid={`expand-${it.symbol}`}
                    >
                      {expanded === it.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button
                      onClick={() => remove(it.id, it.symbol)}
                      className="p-1.5 border border-[var(--border)] hover:border-[var(--bear)] hover:text-[var(--bear)] rounded-sm transition-colors"
                      data-testid={`delete-${it.symbol}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {expanded === it.id && (
                  <div className="border-t border-[var(--border)] p-4">
                    <AnalysisPanel analysis={it.analysis} indicators={it.indicators} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
