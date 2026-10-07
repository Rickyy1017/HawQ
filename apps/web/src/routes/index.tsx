import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, Layers, Trophy, Gauge, Search } from "lucide-react";
import { GlassCard } from "../components/GlassCard";
import { MetricCard } from "../components/MetricCard";
import { MetricSkeleton, Skeleton } from "../components/Skeleton";
import { ChainPieChart } from "../components/charts/ChainPieChart";
import { TVLAreaChart } from "../components/charts/TVLAreaChart";
import {
  ChainTVLBars,
  ProtocolTVLBars,
  StablecoinLine,
} from "../components/charts/MarketMiniCharts";
import { ProtocolTable } from "../components/ProtocolTable";
import { InsightPanel } from "../components/InsightPanel";
import { useSearch } from "../components/SearchContext";
import {
  useProtocols,
  useChainDistribution,
  usePrices,
  useChainActivity,
  useStablecoinSignals,
  useTotalTVLHistory,
} from "../hooks/useDefiData";
import {
  getTopProtocolsByTVL,
  getTotalTVL,
  detectMarketSignal,
} from "../lib/analytics/insights";
import { formatUSD } from "../lib/format";
import { cn } from "../lib/utils";
import { Button } from "../components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HawQ — Multi-chain DeFi Analytics Dashboard" },
      {
        name: "description",
        content:
          "Real-time multi-chain DeFi analytics: TVL, chain dominance, stablecoin signals and rule-based market intelligence.",
      },
      { property: "og:title", content: "HawQ — Multi-chain DeFi Analytics" },
      {
        property: "og:description",
        content:
          "Track TVL, chains, stablecoins and market signals across DeFi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { query, setQuery } = useSearch();
  const [chainFilter, setChainFilter] = useState("All");
  const protocols = useProtocols();
  const fallbackChains = useChainDistribution();
  const chainQuery = useQuery({
    queryKey: ["overview-chain-tvl"],
    queryFn: async () => {
      const response = await fetch("https://api.llama.fi/v2/chains");
      if (!response.ok) throw new Error("Chain TVL unavailable");
      const raw = (await response.json()) as { name: string; tvl: number }[];
      const supported = [
        "Ethereum",
        "Solana",
        "BSC",
        "Tron",
        "Arbitrum",
        "Base",
        "Polygon",
        "Avalanche",
        "Optimism",
        "Aptos",
        "Hyperliquid",
        "Robinhood Chain",
        "Zcash",
      ];
      const rows = raw.filter(
        (c) =>
          supported.includes(c.name) && Number.isFinite(c.tvl) && c.tvl > 0,
      );
      const total = rows.reduce((sum, c) => sum + c.tvl, 0) || 1;
      return rows
        .map((c) => ({
          chain: c.name,
          tvl: c.tvl,
          share: (c.tvl / total) * 100,
        }))
        .sort((a, b) => b.tvl - a.tvl);
    },
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const chains = {
    ...chainQuery,
    data:
      chainQuery.data ?? fallbackChains.data?.filter((c) => c.chain !== "Sui"),
  };
  const prices = usePrices();
  const activity = useChainActivity();
  const signals = useStablecoinSignals();
  const history = useTotalTVLHistory();

  const totalTVL = protocols.data ? getTotalTVL(protocols.data) : 0;
  const top = protocols.data ? getTopProtocolsByTVL(protocols.data, 10) : [];
  const topProtocol = top[0];

  const chainTabs = useMemo(() => {
    const derived = (chains.data ?? []).map((c) => c.chain);
    for (const c of ["Robinhood Chain", "Zcash"])
      if (!derived.includes(c)) derived.push(c);
    return ["All", ...derived];
  }, [chains.data]);

  const filtered = useMemo(() => {
    if (!protocols.data) return [];
    let list = getTopProtocolsByTVL(protocols.data, 250);
    if (chainFilter !== "All") {
      list = list.filter((p) =>
        (p.chains.length ? p.chains : [p.chain]).includes(chainFilter),
      );
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category ?? "").toLowerCase().includes(q),
      );
    }
    return list.slice(0, query.trim() ? 25 : 15);
  }, [protocols.data, query, chainFilter]);

  const insights = useMemo(() => {
    if (
      !protocols.data ||
      !chains.data ||
      !signals.data ||
      !activity.data ||
      !prices.data
    )
      return [];
    return detectMarketSignal({
      protocols: protocols.data,
      chains: chains.data,
      signals: signals.data,
      activity: activity.data,
      prices: prices.data,
    });
  }, [protocols.data, chains.data, signals.data, activity.data, prices.data]);

  const stable = signals.data?.[signals.data.length - 1];
  const sentiment =
    insights.filter((i) => i.tone === "positive").length -
    insights.filter((i) => i.tone === "warning").length;
  const sentimentLabel =
    sentiment > 0 ? "Bullish" : sentiment < 0 ? "Cautious" : "Neutral";

  return (
    <div className="space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-bold md:text-4xl">
          <span className="text-gradient">Overview</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Multi-chain DeFi intelligence across all major networks.
        </p>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {protocols.isLoading ? (
          <>
            {[0, 1, 2, 3].map((i) => (
              <MetricSkeleton key={i} />
            ))}
          </>
        ) : (
          <>
            <MetricCard
              label="Total TVL"
              value={totalTVL}
              format={(n) => formatUSD(n)}
              icon={DollarSign}
              hint="Tracked protocols"
              change={topProtocol?.change1d}
              delay={0}
            />
            <MetricCard
              label="Active Chains"
              value={chains.data?.length ?? 0}
              format={(n) => String(Math.round(n))}
              icon={Layers}
              hint="Major networks tracked"
              delay={0.05}
            />
            <MetricCard
              label="Top Protocol"
              value={topProtocol?.tvl ?? 0}
              format={(n) => formatUSD(n)}
              icon={Trophy}
              hint={topProtocol?.name}
              change={topProtocol?.change7d}
              delay={0.1}
            />
            <MetricCard
              label="USDT Dominance"
              value={stable?.usdtDominance ?? 0}
              format={(n) => `${n.toFixed(1)}%`}
              icon={Gauge}
              hint={`Sentiment: ${sentimentLabel}`}
              delay={0.15}
            />
          </>
        )}
      </div>

      {/* Market charts */}
      <GlassCard className="p-5" hover={false}>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-4">
          <div>
            <h2 className="font-display text-base font-semibold">
              Total Value Locked in DeFi
            </h2>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
              {history.data?.length
                ? formatUSD(history.data[history.data.length - 1].tvl)
                : "—"}
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            Historical TVL · DeFiLlama
          </span>
        </div>
        <div className="h-[310px] sm:h-[390px]">
          {history.isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <TVLAreaChart data={history.data ?? []} />
          )}
        </div>
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <GlassCard className="min-w-0 p-5" hover={false}>
          <h2 className="font-display text-sm font-semibold">
            Largest Chains by TVL
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Top networks · DeFiLlama
          </p>
          <div className="mt-4 h-36">
            {chains.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ChainTVLBars data={chains.data ?? []} />
            )}
          </div>
        </GlassCard>
        <GlassCard className="min-w-0 p-5" hover={false}>
          <h2 className="font-display text-sm font-semibold">
            Top Protocol TVL
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Largest protocols · DeFiLlama
          </p>
          <div className="mt-4 h-36">
            {protocols.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ProtocolTVLBars data={top} />
            )}
          </div>
        </GlassCard>
        <GlassCard className="min-w-0 p-5" hover={false}>
          <h2 className="font-display text-sm font-semibold">USDT Dominance</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {stable ? `${stable.usdtDominance.toFixed(1)}%` : "—"} · simulated
            signal
          </p>
          <div className="mt-4 h-36">
            {signals.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <StablecoinLine data={signals.data ?? []} />
            )}
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-5" hover={false}>
        <h2 className="mb-3 font-display text-base font-semibold">
          Chain Dominance
        </h2>
        <div className="h-[240px]">
          {chains.isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ChainPieChart data={chains.data ?? []} />
          )}
        </div>
      </GlassCard>

      {/* protocols + insight */}
      <GlassCard className="p-5" delay={0.05}>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="font-display text-base font-semibold">
            {query ? `Results for "${query}"` : "Top Protocols by TVL"}
          </h2>
          <div className="relative w-full lg:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search protocols…"
              className="w-full rounded-xl border border-border bg-secondary/40 py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:bg-secondary/70"
            />
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {chainTabs.map((c) => (
            <Button
              variant="ghost"
              key={c}
              onClick={() => setChainFilter(c)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                chainFilter === c
                  ? "bg-primary/20 text-foreground ring-1 ring-primary/40"
                  : "bg-secondary/40 text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
              )}
            >
              {c}
            </Button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} shown
          </span>
        </div>

        {protocols.isLoading ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : filtered.length ? (
          <ProtocolTable protocols={filtered} />
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {chainFilter === "Robinhood Chain" || chainFilter === "Zcash"
              ? `No tracked protocols on ${chainFilter} yet; chain TVL is sourced separately.`
              : "No protocols found for this filter."}
          </p>
        )}
      </GlassCard>

      <InsightPanel insights={insights} />
    </div>
  );
}
