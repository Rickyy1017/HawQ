import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { formatUSD } from '../../lib/format';
import type { TVLHistoryPoint } from '../../types';

function GlassTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-xl px-3 py-2 text-xs">
      <p className="mb-1 text-muted-foreground">
        {new Date(label * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
      </p>
      <p className="font-semibold text-foreground">{formatUSD(payload[0].value)}</p>
    </div>
  );
}

export function TVLAreaChart({ data }: { data: TVLHistoryPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="tvlFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.62 0.21 300)" stopOpacity={0.45} />
            <stop offset="100%" stopColor="oklch(0.62 0.21 300)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.7 0.05 300 / 8%)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => new Date(v * 1000).toLocaleDateString(undefined, { month: "short" })}
          tick={{ fill: "oklch(0.7 0.03 292)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          minTickGap={40}
        />
        <YAxis
          tickFormatter={(v) => formatUSD(v)}
          tick={{ fill: "oklch(0.7 0.03 292)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip content={<GlassTooltip />} />
        <Area
          type="monotone"
          dataKey="tvl"
          stroke="oklch(0.7 0.2 300)"
          strokeWidth={2}
          fill="url(#tvlFill)"
          activeDot={{ r: 4, fill: "oklch(0.8 0.18 300)" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
