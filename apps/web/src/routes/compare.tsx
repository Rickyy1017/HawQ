import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, X, GitCompareArrows, Search } from "lucide-react";
import { GlassCard } from '../components/GlassCard';
import { Skeleton } from '../components/Skeleton';
import { TVLAreaChart } from '../components/charts/TVLAreaChart';
import { Sparkline } from '../components/charts/Sparkline';
import { useProtocols, useProtocolDetail } from '../hooks/useDefiData';
import { getTopProtocolsByTVL } from '../lib/analytics/insights';
import { formatUSD, formatPct } from '../lib/format';
import { cn } from '../lib/utils';
import type { ProtocolTVL } from '../types';

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Compare Protocols — DeFi Hawk" },
      {
        name: "description",
        content:
          "Select multiple DeFi protocols and compare TVL, chain distribution and recent changes side by side.",
      },
    ],
  }),
  component: ComparePage,
});

function ComparePage() {
  const { data: protocols, isLoading } = useProtocols();
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    if (!protocols) return [];
    const top = getTopProtocolsByTVL(protocols, 100);
    if (!query.trim()) return top.slice(0, 40);
    const q = query.toLowerCase();
    return top.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 40);
  }, [protocols, query]);

  const selectedProtocols = useMemo(
    () => (protocols ?? []).filter((p) => selected.includes(p.slug)),
    [protocols, selected],
  );

  const toggle = (slug: string) =>
    setSelected((s) =>
      s.includes(slug) ? s.filter((x) => x !== slug) : s.length >= 4 ? s : [...s, slug],
    );

  return (
    <div className="space-y-6 py-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <GitCompareArrows className="h-7 w-7 text-primary" />
          <span className="text-gradient">Compare Protocols</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick up to 4 protocols to compare TVL, chain distribution and recent changes side by side.
        </p>
      </div>

      <GlassCard className="p-5">
        <div className="relative mb-4 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search protocols to add…"
            className="w-full rounded-xl border border-border bg-secondary/40 py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:bg-secondary/70"
          />
        </div>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="flex flex-wrap gap-2">
            {list.map((p) => {
              const on = selected.includes(p.slug);
              const disabled = !on && selected.length >= 4;
              return (
                <button
                  key={p.slug}
                  onClick={() => toggle(p.slug)}
                  disabled={disabled}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                    on
                      ? "bg-primary/25 text-foreground ring-1 ring-primary/50"
                      : "bg-secondary/40 text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
                    disabled && "cursor-not-allowed opacity-40",
                  )}
                >
                  {on ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                  {p.name}
                </button>
              );
            })}
          </div>
        )}
      </GlassCard>

      {selectedProtocols.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center gap-3 p-16 text-center">
          <div className="rounded-2xl bg-primary/15 p-5 text-primary ring-1 ring-primary/20">
            <GitCompareArrows className="h-8 w-8" />
          </div>
          <p className="font-display text-lg font-semibold">Nothing selected yet</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Choose protocols above to build a side-by-side comparison.
          </p>
        </GlassCard>
      ) : (
        <div
          className={cn(
            "grid gap-4",
            selectedProtocols.length === 1
              ? "grid-cols-1"
              : "grid-cols-1 md:grid-cols-2",
          )}
        >
          {selectedProtocols.map((p, i) => (
            <CompareCard key={p.slug} protocol={p} onRemove={() => toggle(p.slug)} delay={i * 0.05} />
          ))}
        </div>
      )}
    </div>
  );
}

function CompareCard({
  protocol,
  onRemove,
  delay,
}: {
  protocol: ProtocolTVL;
  onRemove: () => void;
  delay: number;
}) {
  const { data, isLoading } = useProtocolDetail(protocol.slug);

  const history = (data?.tvl ?? []).map((t) => ({ date: t.date, tvl: t.totalLiquidityUSD }));
  const current = history.length ? history[history.length - 1].tvl : protocol.tvl;
  const spark24h = history.slice(-2);
  const spark7d = history.slice(-8);
  const totalChainTvl = data?.currentChainTvls
    ? Object.entries(data.currentChainTvls)
        .filter(([k]) => !k.includes("-"))
        .reduce((a, [, v]) => a + v, 0)
    : current;
  const chainTvls = data?.currentChainTvls
    ? Object.entries(data.currentChainTvls)
        .filter(([k]) => !k.includes("-"))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    : [];

  return (
    <GlassCard className="p-5" delay={delay}>
      <div className="mb-4 flex items-center gap-3">
        {protocol.logo ? (
          <img src={protocol.logo} alt="" className="h-9 w-9 rounded-full ring-1 ring-border" />
        ) : (
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-xs text-primary">
            {protocol.name.slice(0, 2)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-semibold">{protocol.name}</p>
          <p className="text-xs text-muted-foreground">{protocol.category ?? "DeFi"}</p>
        </div>
        <button
          onClick={onRemove}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-secondary/30 p-2.5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">TVL</p>
          <p className="font-display text-sm font-semibold">{formatUSD(current)}</p>
        </div>
        <div className="rounded-xl bg-secondary/30 p-2.5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">1d</p>
          <p className={cn("text-sm font-semibold", (protocol.change1d ?? 0) >= 0 ? "text-success" : "text-destructive")}>
            {formatPct(protocol.change1d)}
          </p>
          <div className="mt-1.5 h-7">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <Sparkline data={spark24h} positive={(protocol.change1d ?? 0) >= 0} />
            )}
          </div>
        </div>
        <div className="rounded-xl bg-secondary/30 p-2.5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">7d</p>
          <p className={cn("text-sm font-semibold", (protocol.change7d ?? 0) >= 0 ? "text-success" : "text-destructive")}>
            {formatPct(protocol.change7d)}
          </p>
          <div className="mt-1.5 h-7">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <Sparkline data={spark7d} positive={(protocol.change7d ?? 0) >= 0} />
            )}
          </div>
        </div>
      </div>

      <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">TVL History</p>
      <div className="h-[180px]">
        {isLoading ? <Skeleton className="h-full w-full" /> : <TVLAreaChart data={history} />}
      </div>

      <p className="mb-2 mt-4 text-xs uppercase tracking-wider text-muted-foreground">
        Chain Allocation
      </p>
      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <div className="space-y-2">
          {chainTvls.map(([chain, tvl]) => {
            const pct = totalChainTvl ? (tvl / totalChainTvl) * 100 : 0;
            return (
              <div key={chain}>
                <div className="mb-1 flex justify-between text-xs">
                  <span>{chain}</span>
                  <span className="text-muted-foreground">{pct.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary/50">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
          {chainTvls.length === 0 && (
            <p className="text-xs text-muted-foreground">No chain breakdown available.</p>
          )}
        </div>
      )}
    </GlassCard>
  );
}
