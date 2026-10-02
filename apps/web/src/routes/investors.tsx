import { createFileRoute } from "@tanstack/react-router";
import { GlassCard } from '../components/GlassCard';
import { MetricCard } from '../components/MetricBackground';
import { Skeleton } from '../components/Skeleton';
import { useProtocols } from '../hooks/useDefiData';
import { getTotalTVL } from '../lib/analytics/insights';
import { formatUSD } from '../lib/format';
import { TrendingUp, Users, Globe, FileText } from "lucide-react";

export const Route = createFileRoute("/investors")({
  head: () => ({
    meta: [
      { title: "Investor Relations — DeFi-Wolf" },
      { name: "description", content: "Investor relations, traction metrics and company updates for DeFi-Wolf." },
    ],
  }),
  component: InvestorsPage,
});

const UPDATES = [
  { date: "Q2 2026", title: "Multi-chain expansion to 12+ networks", body: "Added Solana, Base, Sui and Arbitrum coverage to the indexing engine." },
  { date: "Q1 2026", title: "Activity Feed & Watchlist launch", body: "Real-time wallet tracking and protocol event streaming shipped to all users." },
  { date: "Q4 2025", title: "Seed round closed", body: "Raised to scale the normalization layer and grow the analyst team." },
];

function InvestorsPage() {
  const { data: protocols, isLoading } = useProtocols();
  const totalTVL = protocols ? getTotalTVL(protocols) : 0;

  return (
    <div className="space-y-6 py-6">
      <header>
        <h1 className="mb-1 text-3xl font-bold">
          <span className="text-gradient">Investor Relations</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Traction, coverage and the latest company updates.
        </p>
      </header>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="TVL Tracked" value={totalTVL} format={(n) => formatUSD(n)} icon={TrendingUp} />
          <MetricCard label="Protocols Indexed" value={protocols?.length ?? 0} format={(n) => String(n)} icon={FileText} delay={0.05} />
          <MetricCard label="Chains Covered" value={12} format={(n) => `${n}+`} icon={Globe} delay={0.1} />
          <MetricCard label="Monthly Analysts" value={8400} format={(n) => `${(n / 1000).toFixed(1)}K`} icon={Users} delay={0.15} />
        </div>
      )}

      <GlassCard className="p-5">
        <h2 className="mb-4 font-display text-lg font-semibold">Company updates</h2>
        <div className="space-y-4">
          {UPDATES.map((u) => (
            <div key={u.title} className="flex gap-4 border-b border-border/50 pb-4 last:border-0 last:pb-0">
              <span className="shrink-0 rounded-md bg-primary/15 px-2 py-1 text-xs font-semibold text-primary ring-1 ring-primary/20">
                {u.date}
              </span>
              <div>
                <p className="font-medium">{u.title}</p>
                <p className="text-sm text-muted-foreground">{u.body}</p>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="flex flex-col items-center gap-2 p-8 text-center">
        <p className="font-display text-lg font-semibold">Interested in investing?</p>
        <p className="max-w-md text-sm text-muted-foreground">
          We're always happy to connect with mission-aligned investors building the future of on-chain intelligence.
        </p>
        <a
          href="mailto:investors@defiwolf.app"
          className="mt-2 rounded-xl bg-primary/20 px-5 py-2.5 text-sm font-medium text-foreground ring-1 ring-primary/40 transition-colors hover:bg-primary/30"
        >
          investors@defiwolf.app
        </a>
      </GlassCard>
    </div>
  );
}
