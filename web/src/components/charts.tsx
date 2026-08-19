export interface ChartDatum {
  label: string;
  value: number;
}

export function BarChart({
  data,
  color = 'bg-indigo-500',
}: {
  data: ChartDatum[];
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex h-40 items-end gap-1">
      {data.map((d, i) => (
        <div
          key={i}
          className="group flex h-full flex-1 flex-col items-center justify-end gap-1"
          title={`${d.label}: ${d.value}`}
        >
          <div
            className={`w-full max-w-[26px] rounded-t transition-colors ${
              d.value > 0 ? color : 'bg-slate-100 dark:bg-slate-800'
            }`}
            style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 4 : 2 }}
          />
          <span className="w-full truncate text-center text-[10px] text-slate-400">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export interface DonutDatum {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({ data, size = 156 }: { data: DonutDatum[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const segments = data.map((d) => {
    const frac = d.value / total;
    const len = frac * c;
    const seg = { ...d, dash: `${len} ${c - len}`, offset };
    offset += len;
    return seg;
  });

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 shrink-0">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={18}
          className="stroke-slate-100 dark:stroke-slate-800"
        />
        {segments.map((s, i) => (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={18}
            strokeDasharray={s.dash}
            strokeDashoffset={-s.offset}
          />
        ))}
      </svg>
      <div className="flex min-w-0 flex-col gap-1.5">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
            <span className="truncate text-slate-600 dark:text-slate-300">{s.label}</span>
            <span className="ml-auto pl-2 font-medium text-slate-900 dark:text-slate-100">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LineChart({
  data,
  color = '#6366f1',
  height = 160,
}: {
  data: ChartDatum[];
  color?: string;
  height?: number;
}) {
  const w = 560;
  const pad = 22;
  const max = Math.max(1, ...data.map((d) => d.value));
  const stepX = data.length > 1 ? (w - pad * 2) / (data.length - 1) : 0;
  const points = data.map((d, i) => {
    const x = pad + i * stepX;
    const y = height - pad - (d.value / max) * (height - pad * 2);
    return [x, y] as const;
  });
  const line = points.map((p) => `${p[0]},${p[1]}`).join(' ');
  const area = `${pad},${height - pad} ${line} ${data.length > 1 ? w - pad : pad},${height - pad}`;

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#area-grad)" />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={2.5} fill={color} />
      ))}
    </svg>
  );
}
