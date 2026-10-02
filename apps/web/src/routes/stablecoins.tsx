import { createFileRoute } from "@tanstack/react-router";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { GlassCard } from '../components/GlassCard';
import { Skeleton } from '../components/Skeleton';
import { MetricCard } from '../components/MetricBackground';
import { useStablecoinSignals } from '../hooks/useDefiData';
import { detectStablecoinDemandTrend } from '../lib/analytics/insights';
import { Coins, TrendingUp, Activity } from "lucide-react";

export const Route = createFileRoute("/stablecoins")({
  head: () => ({
    meta: [
      { title: "Stablecoins — DeFi-Wolf" },
      { name: "description", content: "USDT dominance, NGN/USDT spread and stablecoin demand signals." },
    ],
  }),
  component: StablecoinsPage,
});

function StableTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-xl px-3 py-2 text-xs">
      <p className="mb-1 text-muted-foreground">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="font-medium">{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

function StablecoinsPage() {
  const { data, isLoading } = useStablecoinSignals();
  const latest = data?.[data.length - 1];
  const trend = data ? detectStablecoinDemandTrend(data) : { direction: "stable" as const, delta: 0 };

  return (
    <div className="space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-bold"><span className="text-gradient">Stablecoins</span></h1>
        <p className="mt-1 text-sm text-muted-foreground">USDT dominance proxy & NGN/USDT P2P spread (simulated signal engine).</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {isLoading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)
        ) : (
          <>
            <MetricCard label="USDT Dominance" value={latest?.usdtDominance ?? 0} format={(n) => `${n.toFixed(1)}%`} icon={Coins} hint={`7d trend: ${trend.direction}`} change={trend.delta} />
            <MetricCard label="NGN/USDT Spread" value={latest?.ngnSpread ?? 0} format={(n) => `${n.toFixed(2)}%`} icon={TrendingUp} hint="P2P premium" delay={0.05} />
            <MetricCard label="Daily Inflow" value={latest?.inflow ?? 0} format={(n) => `$${Math.round(n)}M`} icon={Activity} hint="Net stablecoin flow" delay={0.1} />
          </>
        )}
      </div>

      <GlassCard className="p-5">
        <h2 className="mb-3 font-display text-base font-semibold">USDT Dominance vs NGN Spread (30d)</h2>
        <div className="h-[320px]">
          {isLoading ? <Skeleton className="h-full w-full" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.7 0.05 300 / 8%)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "oklch(0.7 0.03 292)", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={40} />
                <YAxis tick={{ fill: "oklch(0.7 0.03 292)", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<StableTooltip />} />
                <Line type="monotone" dataKey="usdtDominance" name="USDT Dom %" stroke="oklch(0.7 0.2 300)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="ngnSpread" name="NGN Spread %" stroke="oklch(0.74 0.17 162)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
