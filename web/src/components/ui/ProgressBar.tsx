export function ProgressBar({
  value,
  indeterminate = false,
  className = '',
}: {
  value: number;
  indeterminate?: boolean;
  className?: string;
}) {
  if (indeterminate) {
    return (
      <div
        className={`relative h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700 ${className}`}
      >
        <div className="animate-indeterminate absolute top-0 h-full w-1/3 rounded-full bg-indigo-500" />
      </div>
    );
  }
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`relative h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700 ${className}`}
    >
      <div
        className="relative h-full rounded-full bg-indigo-500 transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      >
        {pct > 0 && pct < 100 && <div className="progress-shimmer absolute inset-0 rounded-full" />}
      </div>
    </div>
  );
}
