export function Skeleton({ className = "", ...rest }) {
  return <div className={`bg-[var(--surface-hover)] animate-pulse rounded-sm ${className}`} {...rest} />;
}

export function ChartSkeleton({ height = 360 }) {
  return (
    <div className="surface p-5 rounded-sm" data-testid="chart-skeleton">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-6 w-44" />
      </div>
      <Skeleton className="w-full" style={{ height }} />
    </div>
  );
}

export function QuoteSkeleton() {
  return (
    <div className="surface p-5 rounded-sm" data-testid="quote-skeleton">
      <Skeleton className="h-8 w-32 mb-3" />
      <Skeleton className="h-9 w-48 mb-3" />
      <div className="flex gap-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-20" />
      ))}
    </div>
  );
}
