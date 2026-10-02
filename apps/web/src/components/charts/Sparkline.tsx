import { ResponsiveContainer, AreaChart, Area } from "recharts";

/** Minimal inline sparkline for compact TVL trend display. */
export function Sparkline({
  data,
  positive = true,
}: {
  data: { tvl: number }[];
  positive?: boolean;
}) {
  if (!data.length) return null;
  const color = positive ? "oklch(0.72 0.17 155)" : "oklch(0.62 0.21 18)";
  const id = `spark-${positive ? "up" : "down"}`;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="tvl"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${id})`}
          isAnimationActive={false}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
