import { createFileRoute } from "@tanstack/react-router";
import { GlassCard } from "@/components/GlassCard";
import { ChainPieChart } from "@/components/charts/ChainPieChart";
import { Skeleton } from "@/components/Skeleton";
import { useChainDistribution, useChainActivity } from "@/hooks/useDefiData";
import { formatUSD, formatNum } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

export const Route = createFileRoute("/chains")({
  head: () => ({
    meta: [
      { title: "Chains — HawQ" },
      { name: "description", content: "TVL distribution and on-chain activity across Ethereum, BSC and Polygon." },
      { property: "og:title", content: "Chains — HawQ" },
      { property: "og:description", content: "TVL distribution and on-chain activity across Ethereum, BSC and Polygon."  },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChainsPage,
});

function ChainsPage() {
  const dist = useChainDistribution();
  const activity = useChainActivity();

  return (
    <div className="space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-bold"><span className="text-gradient">Chains</span></h1>
        <p className="mt-1 text-sm text-muted-foreground">Cross-chain TVL share and activity signals.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard className="p-5">
          <h2 className="mb-3 font-display text-base font-semibold">TVL Distribution</h2>
          <div className="h-[260px]">
            {dist.isLoading ? <Skeleton className="h-full w-full" /> : <ChainPieChart data={dist.data ?? []} />}
          </div>
        </GlassCard>

        <GlassCard className="p-5" delay={0.05}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Activity Indicator</h2>
            <span className="rounded-md bg-warning/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning">Simulated</span>
          </div>
          <div className="space-y-3">
            {activity.isLoading
              ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
              : activity.data?.map((a) => (
                  <div key={a.chain} className="flex items-center justify-between rounded-xl bg-secondary/30 p-4">
                    <div>
                      <p className="font-medium">{a.chain}</p>
                      <p className="text-xs text-muted-foreground">{formatNum(a.txCount24h)} txs / 24h · {a.gasGwei} gwei</p>
                    </div>
                    <span className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-semibold capitalize",
                      a.trend === "up" ? "bg-success/15 text-success" : a.trend === "down" ? "bg-destructive/15 text-destructive" : "bg-secondary text-muted-foreground",
                    )}>
                      {a.trend === "up" ? <><ArrowUpRight className="mr-1 inline h-3 w-3" />rising</> : a.trend === "down" ? <><ArrowDownRight className="mr-1 inline h-3 w-3" />falling</> : <><Minus className="mr-1 inline h-3 w-3" />stable</>}
                    </span>
                  </div>
                ))}
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-5" delay={0.05}>
        <h2 className="mb-3 font-display text-base font-semibold">Chain Ranking</h2>
        {dist.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-3">#</th><th className="px-3 py-2">Chain</th>
                <th className="px-3 py-2 text-right">TVL</th><th className="px-3 py-2 text-right">Share</th>
              </tr>
            </thead>
            <tbody>
              {dist.data?.map((c, i) => (
                <tr key={c.chain} className="border-t border-border/60">
                  <td className="py-3 pr-3 text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-3 font-medium">{c.chain}</td>
                  <td className="px-3 py-3 text-right">{formatUSD(c.tvl)}</td>
                  <td className="px-3 py-3 text-right text-muted-foreground">{c.share.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </GlassCard>
    </div>
  );
}
