import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { formatUSD } from "../../lib/format";
import type { ChainTVL } from "../../types";

const COLORS = [
  "oklch(0.62 0.21 300)",
  "oklch(0.55 0.2 270)",
  "oklch(0.7 0.18 330)",
  "oklch(0.74 0.17 162)",
  "oklch(0.78 0.15 95)",
];

function ChainTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as ChainTVL;
  return (
    <div className="glass-strong rounded-xl px-3 py-2 text-xs">
      <p className="font-semibold">{d.chain}</p>
      <p className="text-muted-foreground">
        {formatUSD(d.tvl)} · {d.share.toFixed(1)}%
      </p>
    </div>
  );
}

export function ChainPieChart({ data }: { data: ChainTVL[] }) {
  return (
    <div className="flex h-full min-w-0 items-center gap-2">
      <div className="h-[180px] min-w-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="tvl"
              nameKey="chain"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChainTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="max-h-full min-w-[118px] max-w-[155px] overflow-y-auto pr-1">
        {data.map((d, i) => (
          <div
            key={d.chain}
            className="flex min-h-5 items-center gap-1 text-xs"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: COLORS[i % COLORS.length] }}
            />
            <span
              className="min-w-0 flex-1 truncate text-muted-foreground"
              title={d.chain}
            >
              {d.chain}
            </span>
            <span className="font-medium">{d.share.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
