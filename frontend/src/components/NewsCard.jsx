import { ArrowUpRight, ExternalLink } from "lucide-react";

const sentimentColor = (s) =>
  s === "Bullish" ? "text-[var(--bull)] border-[var(--bull)]/40"
  : s === "Bearish" ? "text-[var(--bear)] border-[var(--bear)]/40"
  : "text-[var(--text-muted)] border-[var(--border)]";

export default function NewsCard({ item }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="block surface surface-hover p-4 rounded-sm transition-colors group"
      data-testid="news-card"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <span
          className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border rounded-sm ${sentimentColor(item.sentiment)}`}
        >
          {item.sentiment} · {item.sentiment_rating ? item.sentiment_rating.toFixed(1) : (item.sentiment_score > 0 ? "+" : "") + item.sentiment_score}/10
        </span>
        <ExternalLink size={14} className="text-[var(--text-muted)] group-hover:text-white shrink-0" />
      </div>
      <h4 className="font-display font-bold text-sm leading-tight mb-2">{item.title}</h4>
      <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
        <span className="truncate">{item.publisher}</span>
        <span>{new Date(item.published_at).toLocaleDateString()}</span>
      </div>
    </a>
  );
}
