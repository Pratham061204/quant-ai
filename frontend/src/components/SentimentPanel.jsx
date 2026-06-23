import { TrendingUp, TrendingDown, Minus, MessageCircle, Newspaper } from "lucide-react";

function RatingBar({ value, label, icon: Icon }) {
  const pct = ((value - 1) / 9) * 100;
  const color =
    value >= 6.5 ? "var(--bull)" : value <= 3.5 ? "var(--bear)" : "var(--warn)";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon size={12} className="text-[var(--text-muted)]" />}
          <span className="text-xs font-mono text-[var(--text-muted)]">{label}</span>
        </div>
        <span className="text-sm font-mono font-semibold" style={{ color }}>
          {value.toFixed(1)}/10
        </span>
      </div>
      <div className="h-1.5 bg-[var(--surface-alt)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function SentimentPanel({ data }) {
  if (!data) return null;

  const { overall_rating, overall_label, news, reddit } = data;

  const overallColor =
    overall_rating >= 6.5
      ? "var(--bull)"
      : overall_rating <= 3.5
        ? "var(--bear)"
        : "var(--warn)";

  const overallIcon =
    overall_label === "Bullish"
      ? TrendingUp
      : overall_label === "Bearish"
        ? TrendingDown
        : Minus;

  const OverallIcon = overallIcon;

  return (
    <div className="surface p-5 rounded-sm space-y-4">
      <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)]">
        / Sentiment Analysis
      </div>

      {/* Overall score */}
      <div className="flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-sm border-2 flex flex-col items-center justify-center"
          style={{ borderColor: overallColor }}
        >
          <span className="text-xl font-mono font-black" style={{ color: overallColor }}>
            {overall_rating.toFixed(1)}
          </span>
          <span className="text-[8px] font-mono uppercase" style={{ color: overallColor }}>
            /10
          </span>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <OverallIcon size={14} style={{ color: overallColor }} />
            <span className="text-sm font-mono font-semibold" style={{ color: overallColor }}>
              {overall_label}
            </span>
          </div>
          <span className="text-[10px] font-mono text-[var(--text-muted)]">
            Overall Sentiment
          </span>
        </div>
      </div>

      {/* Individual sources */}
      <div className="space-y-3">
        {news && (
          <div className="space-y-2">
            <RatingBar value={news.rating} label="News Sentiment" icon={Newspaper} />
            <div className="flex gap-3 text-[10px] font-mono">
              <span className="text-[var(--bull)]">{news.bullish} Bullish</span>
              <span className="text-[var(--warn)]">{news.neutral} Neutral</span>
              <span className="text-[var(--bear)]">{news.bearish} Bearish</span>
              <span className="text-[var(--text-muted)]">({news.total} articles)</span>
            </div>
          </div>
        )}

        {reddit && reddit.rating && (
          <div className="space-y-2">
            <RatingBar value={reddit.rating} label="Reddit Sentiment" icon={MessageCircle} />
            <div className="text-[10px] font-mono text-[var(--text-muted)]">
              {reddit.posts} posts analyzed
            </div>
            {reddit.sample && reddit.sample.length > 0 && (
              <div className="max-h-28 overflow-y-auto space-y-1 mt-1">
                {reddit.sample.map((p, i) => {
                  const pColor =
                    p.sentiment === "Bullish"
                      ? "var(--bull)"
                      : p.sentiment === "Bearish"
                        ? "var(--bear)"
                        : "var(--text-muted)";
                  return (
                    <div key={i} className="flex items-start justify-between gap-2 text-[10px] font-mono">
                      <div className="min-w-0">
                        <span className="text-[var(--text-muted)]">r/{p.subreddit} </span>
                        <span className="text-xs">{p.title}</span>
                      </div>
                      <span className="shrink-0 px-1 rounded-sm" style={{ color: pColor }}>
                        {p.sentiment_rating.toFixed(1)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {reddit && !reddit.rating && (
          <div className="text-[10px] font-mono text-[var(--text-muted)]">
            No Reddit data available for this ticker
          </div>
        )}
      </div>
    </div>
  );
}
