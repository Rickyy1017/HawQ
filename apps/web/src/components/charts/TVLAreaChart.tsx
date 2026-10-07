import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Brush,
} from "recharts";
import { formatUSD } from "../../lib/format";
import type { TVLHistoryPoint } from "../../types";

function GlassTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-md px-3 py-2 text-xs">
      <p className="mb-1 text-muted-foreground">
        {new Date(label * 1000).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>
      <p className="font-semibold text-foreground">
        {formatUSD(payload[0].value)}
      </p>
    </div>
  );
}

export function TVLAreaChart({ data }: { data: TVLHistoryPoint[] }) {
  const values = data.map((d) => d.tvl);
  const domain: [number, number | "auto"] = values.length
    ? [Math.min(...values) * 0.9, Math.max(...values) * 1.05]
    : [0, "auto"];
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 12, right: 12, bottom: 0, left: 0 }}
      >
        <defs>
          <linearGradient id="tvlFill" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--chart-market)"
              stopOpacity={0.32}
            />
            <stop
              offset="100%"
              stopColor="var(--chart-market)"
              stopOpacity={0.01}
            />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(v) =>
            new Date(v * 1000).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })
          }
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          minTickGap={48}
        />
        <YAxis
          tickFormatter={(v) => formatUSD(v)}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={65}
          domain={domain}
          tickCount={5}
        />
        <Tooltip content={<GlassTooltip />} />
        <Area
          type="monotone"
          dataKey="tvl"
          stroke="var(--chart-market)"
          strokeWidth={2}
          fill="url(#tvlFill)"
          activeDot={{ r: 4, fill: "var(--chart-market)" }}
          isAnimationActive={false}
        />
        {data.length > 30 && (
          <Brush
            dataKey="date"
            height={25}
            travellerWidth={7}
            stroke="var(--chart-market)"
            fill="var(--secondary)"
            tickFormatter={() => ""}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
