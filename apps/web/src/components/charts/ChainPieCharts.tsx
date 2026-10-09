import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { formatUSD } from "../../lib/format";
import type { ChainTVL } from "../../types";

const COLORS = [
  "#9657f5",
  "#4c6ef5",
  "#d65ad8",
  "#08b985",
  "#d9ae20",
  "#a855f7",
  "#6366f1",
  "#e879c7",
  "#14b8a6",
  "#c7a51a",
  "#8b5cf6",
  "#64748b",
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
  const totalTvl = data.reduce((total, chain) => total + chain.tvl, 0);
  const maxShare = Math.max(...data.map((chain) => chain.share), 0);

  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-center">
      <div className="relative mx-auto h-[230px] w-full max-w-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="tvl"
              nameKey="chain"
              innerRadius="62%"
              outerRadius="88%"
              paddingAngle={2}
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChainTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Tracked TVL
          </span>
          <span className="mt-1 font-display text-xl font-semibold tracking-tight">
            {formatUSD(totalTvl)}
          </span>
          <span className="mt-0.5 text-[11px] text-muted-foreground">
            {data.length} chains
          </span>
        </div>
      </div>
      <div className="grid min-w-0 gap-2 sm:grid-cols-2">
        {data.map((d, i) => (
          <div
            key={d.chain}
            className="min-w-0 rounded-xl border border-border/60 bg-secondary/20 px-3 py-2.5"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-background"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              <span className="min-w-0 flex-1 truncate text-xs font-medium" title={d.chain}>
                {d.chain}
              </span>
              <span className="shrink-0 text-xs font-semibold tabular-nums">
                {d.share.toFixed(1)}%
              </span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary/80">
              <div
                className="h-full rounded-full transition-[width]"
                style={{
                  width: `${maxShare ? Math.max(3, (d.share / maxShare) * 100) : 0}%`,
                  background: COLORS[i % COLORS.length],
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
