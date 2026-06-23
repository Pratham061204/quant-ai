import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { toast, Toaster } from "sonner";
import Navbar from "@/components/Navbar";
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign, PieChart, Loader2, Pencil, Check, X, RefreshCw } from "lucide-react";

function AddPositionForm({ onAdd }) {
  const [symbol, setSymbol] = useState("");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [adding, setAdding] = useState(false);

  const handleSubmit = async () => {
    if (!symbol || !qty || !price) return toast.error("Symbol, quantity, and buy price are required");
    setAdding(true);
    try {
      await api.post("/portfolio", {
        symbol: symbol.toUpperCase(),
        quantity: parseFloat(qty),
        buy_price: parseFloat(price),
        buy_date: date || null,
        notes: notes || null,
      });
      toast.success(`Added ${symbol.toUpperCase()}`);
      setSymbol(""); setQty(""); setPrice(""); setDate(""); setNotes("");
      onAdd();
    } catch (e) {
      toast.error("Failed to add position");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="surface p-4 rounded-sm">
      <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-3">
        / Add Position
      </div>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <input
          value={symbol} onChange={(e) => setSymbol(e.target.value)}
          placeholder="Symbol" className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-sm px-3 py-2 text-sm font-mono focus:border-[var(--accent)] outline-none"
        />
        <input
          value={qty} onChange={(e) => setQty(e.target.value)} type="number" step="any"
          placeholder="Qty" className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-sm px-3 py-2 text-sm font-mono focus:border-[var(--accent)] outline-none"
        />
        <input
          value={price} onChange={(e) => setPrice(e.target.value)} type="number" step="any"
          placeholder="Buy Price" className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-sm px-3 py-2 text-sm font-mono focus:border-[var(--accent)] outline-none"
        />
        <input
          value={date} onChange={(e) => setDate(e.target.value)} type="date"
          className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-sm px-3 py-2 text-sm font-mono focus:border-[var(--accent)] outline-none"
        />
        <input
          value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)" className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-sm px-3 py-2 text-sm font-mono focus:border-[var(--accent)] outline-none"
        />
        <button
          onClick={handleSubmit} disabled={adding}
          className="flex items-center justify-center gap-1 bg-[var(--accent)] text-white px-4 py-2 rounded-sm text-sm font-mono font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Add
        </button>
      </div>
    </div>
  );
}

function PositionRow({ pos, onDelete, onUpdate, showExtended }) {
  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState(pos.quantity);
  const [price, setPrice] = useState(pos.buy_price);

  const pnlColor = pos.pnl >= 0 ? "text-[var(--bull)]" : "text-[var(--bear)]";
  const dayColor = pos.day_change_pct >= 0 ? "text-[var(--bull)]" : "text-[var(--bear)]";

  const handleSave = async () => {
    try {
      await api.put(`/portfolio/${pos.id}`, { quantity: parseFloat(qty), buy_price: parseFloat(price) });
      setEditing(false);
      onUpdate();
    } catch { toast.error("Update failed"); }
  };

  return (
    <tr className="border-b border-[var(--border)] hover:bg-[var(--surface-alt)]/50 transition-colors">
      <td className="py-3 px-3 font-mono font-semibold text-sm">{pos.symbol}</td>
      <td className="py-3 px-3 font-mono text-sm">
        {editing ? (
          <input value={qty} onChange={(e) => setQty(e.target.value)} type="number" step="any"
            className="w-16 bg-[var(--surface-alt)] border border-[var(--accent)] rounded-sm px-1 py-0.5 text-xs font-mono" />
        ) : pos.quantity}
      </td>
      <td className="py-3 px-3 font-mono text-sm">
        {editing ? (
          <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" step="any"
            className="w-20 bg-[var(--surface-alt)] border border-[var(--accent)] rounded-sm px-1 py-0.5 text-xs font-mono" />
        ) : `$${pos.buy_price.toFixed(2)}`}
      </td>
      <td className="py-3 px-3 font-mono text-sm">${pos.current_price.toFixed(2)}</td>
      <td className={`py-3 px-3 font-mono text-sm ${dayColor}`}>
        {pos.day_change_pct >= 0 ? "+" : ""}{pos.day_change_pct}%
      </td>
      {showExtended && (
        <>
          <td className="py-3 px-3 font-mono text-sm">
            {pos.ext_price ? (
              <span>${pos.ext_price.toFixed(2)}</span>
            ) : (
              <span className="text-[var(--text-muted)]">—</span>
            )}
          </td>
          <td className="py-3 px-3 font-mono text-sm">
            {pos.ext_pnl != null ? (
              <span className={pos.ext_pnl >= 0 ? "text-[var(--bull)]" : "text-[var(--bear)]"}>
                {pos.ext_pnl >= 0 ? "+" : ""}${pos.ext_pnl.toFixed(2)}
                <span className="text-[10px] ml-1">({pos.ext_pnl_pct >= 0 ? "+" : ""}{pos.ext_pnl_pct.toFixed(1)}%)</span>
              </span>
            ) : (
              <span className="text-[var(--text-muted)]">—</span>
            )}
          </td>
        </>
      )}
      <td className="py-3 px-3 font-mono text-sm">${pos.market_value.toFixed(2)}</td>
      <td className={`py-3 px-3 font-mono text-sm font-semibold ${pnlColor}`}>
        {pos.pnl >= 0 ? "+" : ""}${pos.pnl.toFixed(2)}
        <span className="text-[10px] ml-1">({pos.pnl_pct >= 0 ? "+" : ""}{pos.pnl_pct.toFixed(1)}%)</span>
      </td>
      <td className="py-3 px-3">
        <div className="flex gap-1">
          {editing ? (
            <>
              <button onClick={handleSave} className="p-1 text-[var(--bull)] hover:opacity-70"><Check size={14} /></button>
              <button onClick={() => setEditing(false)} className="p-1 text-[var(--text-muted)] hover:opacity-70"><X size={14} /></button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="p-1 text-[var(--text-muted)] hover:text-white"><Pencil size={14} /></button>
              <button onClick={() => onDelete(pos.id)} className="p-1 text-[var(--text-muted)] hover:text-[var(--bear)]"><Trash2 size={14} /></button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function Portfolio() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);
    try {
      const { data: d } = await api.get("/portfolio/summary");
      setData(d);
    } catch {
      toast.error("Failed to load portfolio");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => load(false), 30000);
    return () => clearInterval(interval);
  }, [load]);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/portfolio/${id}`);
      toast.success("Position removed");
      load();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const totalPnlColor = data?.total_pnl >= 0 ? "text-[var(--bull)]" : "text-[var(--bear)]";
  const showExtended = data?.has_extended;

  return (
    <>
      <Navbar />
      <Toaster theme="dark" position="top-right" />
      <div className="max-w-7xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl">Portfolio</h1>
        <button
          onClick={() => load(false)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-sm text-xs font-mono text-[var(--text-muted)] hover:text-white hover:border-[var(--accent)] transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing..." : "Refresh Prices"}
        </button>
      </div>

      <AddPositionForm onAdd={load} />

      {/* Summary cards */}
      {data && data.positions.length > 0 && (
        <div className={`grid grid-cols-2 ${showExtended ? "md:grid-cols-5" : "md:grid-cols-4"} gap-3`}>
          <div className="surface p-4 rounded-sm">
            <div className="flex items-center gap-1 text-[10px] font-mono uppercase text-[var(--text-muted)] mb-1">
              <DollarSign size={10} /> Total Invested
            </div>
            <div className="font-mono font-bold text-lg">${data.total_invested.toLocaleString()}</div>
          </div>
          <div className="surface p-4 rounded-sm">
            <div className="flex items-center gap-1 text-[10px] font-mono uppercase text-[var(--text-muted)] mb-1">
              <PieChart size={10} /> Market Value
            </div>
            <div className="font-mono font-bold text-lg">${data.total_current.toLocaleString()}</div>
          </div>
          <div className="surface p-4 rounded-sm">
            <div className="flex items-center gap-1 text-[10px] font-mono uppercase text-[var(--text-muted)] mb-1">
              {data.total_pnl >= 0 ? <TrendingUp size={10} className="text-[var(--bull)]" /> : <TrendingDown size={10} className="text-[var(--bear)]" />}
              Total P&L
            </div>
            <div className={`font-mono font-bold text-lg ${totalPnlColor}`}>
              {data.total_pnl >= 0 ? "+" : ""}${data.total_pnl.toLocaleString()}
              <span className="text-xs ml-1">({data.total_pnl_pct >= 0 ? "+" : ""}{data.total_pnl_pct.toFixed(2)}%)</span>
            </div>
          </div>
          <div className="surface p-4 rounded-sm">
            <div className="flex items-center gap-1 text-[10px] font-mono uppercase text-[var(--text-muted)] mb-1">
              Return %
            </div>
            <div className={`font-mono font-bold text-lg ${totalPnlColor}`}>
              {data.total_pnl_pct >= 0 ? "+" : ""}{data.total_pnl_pct.toFixed(2)}%
            </div>
          </div>
          {showExtended && (
            <div className="surface p-4 rounded-sm border-l-2 border-[var(--warn)]">
              <div className="flex items-center gap-1 text-[10px] font-mono uppercase text-[var(--warn)] mb-1">
                {data.extended_label || "Extended"} P&L
              </div>
              <div className={`font-mono font-bold text-lg ${data.total_ext_pnl >= 0 ? "text-[var(--bull)]" : "text-[var(--bear)]"}`}>
                {data.total_ext_pnl >= 0 ? "+" : ""}${data.total_ext_pnl?.toLocaleString()}
                {data.total_ext_pnl_pct != null && (
                  <span className="text-xs ml-1">({data.total_ext_pnl_pct >= 0 ? "+" : ""}{data.total_ext_pnl_pct.toFixed(2)}%)</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Positions table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-[var(--accent)]" />
        </div>
      ) : data && data.positions.length > 0 ? (
        <div className="surface rounded-sm overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                <th className="py-3 px-3 text-left">Symbol</th>
                <th className="py-3 px-3 text-left">Qty</th>
                <th className="py-3 px-3 text-left">Avg Cost</th>
                <th className="py-3 px-3 text-left">Price</th>
                <th className="py-3 px-3 text-left">Day</th>
                {showExtended && (
                  <>
                    <th className="py-3 px-3 text-left text-[var(--warn)]">{data.extended_label}</th>
                    <th className="py-3 px-3 text-left text-[var(--warn)]">{data.extended_label} P&L</th>
                  </>
                )}
                <th className="py-3 px-3 text-left">Value</th>
                <th className="py-3 px-3 text-left">P&L</th>
                <th className="py-3 px-3 text-left w-20"></th>
              </tr>
            </thead>
            <tbody>
              {data.positions.map((pos) => (
                <PositionRow key={pos.id} pos={pos} onDelete={handleDelete} onUpdate={() => load(false)} showExtended={showExtended} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="surface p-12 rounded-sm text-center">
          <PieChart size={28} className="text-[var(--accent)] mx-auto mb-3" />
          <h3 className="font-display font-bold text-lg mb-2">No Positions Yet</h3>
          <p className="text-sm text-[var(--text-muted)]">
            Add your first position above to start tracking your portfolio.
          </p>
        </div>
      )}
    </div>
    </>
  );
}
