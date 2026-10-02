import { createFileRoute } from "@tanstack/react-router";
import { GlassCard } from '../components/GlassCard';
import { MetricCard } from '../components/MetricBackground';
import { Skeleton } from '../components/Skeleton';
import { useProtocols } from '../hooks/useDefiData';
import { getTotalTVL } from '../lib/analytics/insights';
import { formatUSD, formatNum, formatPct } from '../lib/format';
import { cn } from '../lib/utils';
import { Activity, Layers, TrendingUp, TrendingDown, Boxes } from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/metrics")({
  head: () => ({
    meta: [
      { title: "Metrics — DeFi Hawk" },
      { name: "description", content: "Aggregate DeFi metrics: total TVL, protocol counts, category breakdown, top movers." },
    ],
  }),
  component: MetricsPage,
});

function MetricsPage() {
  const { data: protocols, isLoading } = useProtocols();

  const stats = useMemo(() => {
    if (!protocols) return null;
    const totalTVL = getTotalTVL(protocols);
    const categories = new Map<string, { tvl: number; count: number }>();
    for (const p of protocols) {
      const c = p.category ?? "Other";
      const prev = categories.get(c) ?? { tvl: 0, count: 0 };
      categories.set(c, { tvl: prev.tvl + p.tvl, count: prev.count + 1 });
    }
    const topCategories = [...categories.entries()]
      .map(([name, v]) => ({ name, ...v, share: v.tvl / totalTVL }))
      .sort((a, b) => b.tvl - a.tvl)
      .slice(0, 8);
    const withChange = protocols.filter((p) => typeof p.change1d === "number");
    const gainers = [...withChange].sort((a, b) => (b.change1d ?? 0) - (a.change1d ?? 0)).slice(0, 5);
    const losers = [...withChange].sort((a, b) => (a.change1d ?? 0) - (b.change1d ?? 0)).slice(0, 5);
    const avgChange =
      withChange.reduce((s, p) => s + (p.change1d ?? 0), 0) / (withChange.length || 1);
    return {
      totalTVL,
      count: protocols.length,
      categoryCount: categories.size,
      avgChange,
      topCategories,
      gainers,
      losers,
    };
  }, [protocols]);

  if (isLoading || !stats) {
    return (
      <div className="space-y-4 py-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6">
      <header>
        <h1 className="mb-1 text-3xl font-bold">
          <span className="text-gradient">Metrics</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Aggregate protocol and category metrics across the indexed DeFi universe.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total TVL" value={stats.totalTVL} format={(n) => formatUSD(n)} icon={Activity} hint="all protocols" />
        <MetricCard label="Protocols Tracked" value={stats.count} format={(n) => formatNum(n)} icon={Boxes} />
        <MetricCard label="Categories" value={stats.categoryCount} format={(n) => formatNum(n)} icon={Layers} delay={0.05} />
        <MetricCard label="Avg 24h Change" value={stats.avgChange} format={(n) => formatPct(n)} change={stats.avgChange} icon={TrendingUp} delay={0.1} />
      </div>

      <GlassCard className="p-5">
        <h2 className="mb-4 font-display text-lg font-semibold">TVL by Category</h2>
        <div className="space-y-3">
          {stats.topCategories.map((c) => (
            <div key={c.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{c.name}</span>
                <span className="text-muted-foreground">
                  {formatUSD(c.tvl)} · {c.count} protocols
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary/50">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                  style={{ width: `${Math.max(2, c.share * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <MoverList title="Top Gainers (24h)" items={stats.gainers} positive />
        <MoverList title="Top Losers (24h)" items={stats.losers} positive={false} />
      </div>
    </div>
  );
}

function MoverList({
  title,
  items,
  positive,
}: {
  title: string;
  items: { name: string; tvl: number; change1d?: number }[];
  positive: boolean;
}) {
  return (
    <GlassCard className="p-5">
      <div className="mb-4 flex items-center gap-2">
        {positive ? (
          <TrendingUp className="h-4 w-4 text-success" />
        ) : (
          <TrendingDown className="h-4 w-4 text-destructive" />
        )}
        <h2 className="font-display text-lg font-semibold">{title}</h2>
      </div>
      <div className="space-y-2">
        {items.map((p) => (
          <div key={p.name} className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-2 text-sm">
            <span className="font-medium">{p.name}</span>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">{formatUSD(p.tvl)}</span>
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-xs font-semibold",
                  (p.change1d ?? 0) >= 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
                )}
              >
                {formatPct(p.change1d)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
