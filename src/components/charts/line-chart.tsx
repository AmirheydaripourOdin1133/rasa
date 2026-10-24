"use client";

/**
 * Lightweight SVG line chart. RTL-safe: time axis is drawn LTR (older→newer)
 * with Persian labels. Null values create a visible GAP — missing data is
 * never drawn as zero and never bridged by a continuous line.
 */

export interface SeriesPoint {
  /** ISO date ascending. */
  date: string;
  value: number | null;
}

export interface LineSeries {
  label: string;
  color: string;
  points: SeriesPoint[];
}

export function LineChart({
  series,
  height = 160,
  yLabel,
}: {
  series: LineSeries[];
  height?: number;
  yLabel?: string;
}) {
  const width = 320;
  const pad = { top: 10, right: 10, bottom: 22, left: 10 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const allValues = series.flatMap((s) => s.points.map((p) => p.value).filter((v): v is number => v !== null));
  if (allValues.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg bg-surface-container-low t-body-md text-on-surface-variant">
        داده کافی برای نمایش روند وجود ندارد
      </div>
    );
  }
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const span = max - min || 1;
  const maxLen = Math.max(...series.map((s) => s.points.length));

  const x = (i: number, len: number) =>
    pad.left + (len <= 1 ? innerW / 2 : (i / (len - 1)) * innerW);
  const y = (v: number) => pad.top + innerH - ((v - min) / span) * innerH;

  return (
    <figure className="w-full" dir="ltr">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label={series.map((s) => s.label).join("، ")}
      >
        {/* grid: min / mid / max */}
        {[min, (min + max) / 2, max].map((v, i) => (
          <g key={i}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={y(v)}
              y2={y(v)}
              stroke="#c0c8cb"
              strokeOpacity="0.5"
              strokeDasharray="3 4"
            />
            <text x={width - pad.right} y={y(v) - 3} fontSize="8" fill="#70787c" textAnchor="end">
              {v.toLocaleString("fa-IR", { maximumFractionDigits: 1 })}
            </text>
          </g>
        ))}
        {series.map((s) => {
          // Build segments split at nulls — gaps are real gaps.
          const segments: { x: number; y: number }[][] = [];
          let current: { x: number; y: number }[] = [];
          s.points.forEach((p, i) => {
            if (p.value === null) {
              if (current.length) segments.push(current);
              current = [];
            } else {
              current.push({ x: x(i, s.points.length), y: y(p.value) });
            }
          });
          if (current.length) segments.push(current);
          return (
            <g key={s.label}>
              {segments.map((seg, si) => (
                <path
                  key={si}
                  d={seg.map((pt, pi) => `${pi === 0 ? "M" : "L"}${pt.x},${pt.y}`).join(" ")}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {s.points.map((p, i) =>
                p.value === null ? null : (
                  <circle
                    key={i}
                    cx={x(i, s.points.length)}
                    cy={y(p.value)}
                    r={maxLen > 20 ? 1.8 : 3}
                    fill={s.color}
                  />
                ),
              )}
            </g>
          );
        })}
      </svg>
      {yLabel ? (
        <figcaption className="t-label-md mt-1 text-center text-on-surface-variant" dir="rtl">
          {yLabel}
        </figcaption>
      ) : null}
    </figure>
  );
}
