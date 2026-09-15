interface PieChartDatum {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieChartDatum[];
  size?: number;
  /** 0 = full pie, 0.6 = donut with a 60%-radius hole */
  innerRadiusRatio?: number;
}

const RADIUS = 100; // fixed viewBox units; `size` scales via width/height only

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}

/**
* Simple, dependency-free SVG pie/donut chart with an adjacent legend.
* Renders nothing but an empty state if every value is 0.
*/
export function PieChart({ data, size = 260, innerRadiusRatio = 0 }: PieChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-slate-400">No data to display</p>
      </div>
    );
  }

  const cx = RADIUS;
  const cy = RADIUS;
  let cumulativeAngle = 0;

  const slices = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const angle = (d.value / total) * 360;
      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + angle;
      cumulativeAngle = endAngle;
      return { ...d, startAngle, endAngle };
    });

  return (
    <div className="flex flex-col items-center gap-6">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${RADIUS * 2} ${RADIUS * 2}`}
        className="shrink-0"
      >
        {slices.map((slice) => (
          <path
            key={slice.label}
            d={arcPath(cx, cy, RADIUS, slice.startAngle, slice.endAngle)}
            fill={slice.color}
            stroke="#fff"
            strokeWidth={1}
          />
        ))}
        {innerRadiusRatio > 0 && (
          <circle cx={cx} cy={cy} r={RADIUS * innerRadiusRatio} fill="#fff" />
        )}
      </svg>

      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
        {data.map((d) => {
          const pct = total > 0 ? (d.value / total) * 100 : 0;
          return (
            <div key={d.label} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: d.color }}
                />
                <span className="text-slate-700 truncate">{d.label}</span>
              </div>
              <span className="text-slate-500 shrink-0">
                {d.value} ({pct.toFixed(1)}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}