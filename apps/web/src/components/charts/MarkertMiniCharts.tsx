import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatUSD } from "../../lib/format";
import type { ChainTVL, ProtocolTVL, StablecoinSignal } from "../../types";

function MiniTooltip({
  active,
  payload,
  label,
  percent = false,
}: {
  active?: boolean;
  payload?: { value?: number }[];
  label?: string;
  percent?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value;
  return (
    <div className="glass-strong rounded-md px-2.5 py-2 text-xs text-foreground">
      {label}:{" "}
      {value == null
        ? "—"
        : percent
          ? `${value.toFixed(1)}%`
          : formatUSD(value)}
    </div>
  );
}

export function ChainTVLBars({ data }: { data: ChainTVL[] }) {
  const rows = data.slice(0, 7).map((d) => ({ name: d.chain, value: d.tvl }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 8, left: 0, right: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: string) => (v.length > 5 ? v.slice(0, 4) : v)}
        />
        <YAxis hide />
        <Tooltip
          content={<MiniTooltip />}
          cursor={{ fill: "var(--secondary)" }}
        />
        <Bar
          dataKey="value"
          fill="var(--chart-market)"
          maxBarSize={22}
          radius={[2, 2, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ProtocolTVLBars({ data }: { data: ProtocolTVL[] }) {
  const rows = data.slice(0, 7).map((d) => ({ name: d.name, value: d.tvl }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 8, left: 0, right: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: string) =>
            v.length > 6 ? `${v.slice(0, 5)}…` : v
          }
        />
        <YAxis hide />
        <Tooltip
          content={<MiniTooltip />}
          cursor={{ fill: "var(--secondary)" }}
        />
        <Bar
          dataKey="value"
          fill="var(--primary)"
          maxBarSize={22}
          radius={[2, 2, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StablecoinLine({ data }: { data: StablecoinSignal[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, left: 0, right: 2, bottom: 0 }}>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="date" hide />
        <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
        <Tooltip content={<MiniTooltip percent />} />
        <Line
          type="monotone"
          dataKey="usdtDominance"
          stroke="var(--success)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
