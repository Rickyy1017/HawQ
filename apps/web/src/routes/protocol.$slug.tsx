import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { Skeleton } from "@/components/Skeleton";
import { TVLAreaChart } from "@/components/charts/TVLAreaChart";
import { useProtocolDetail } from "@/hooks/useDefiData";
import { formatUSD } from "@/lib/format";

export const Route = createFileRoute("/protocol/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — HawQ Protocol Analytics` },
      {
        name: "description",
        content: `TVL history, chain breakdown and analytics for ${params.slug}.`,
      },
      {
        property: "og:title",
        content: `${params.slug} — HawQ Protocol Analytics`,
      },
      {
        property: "og:description",
        content: `TVL history, chain breakdown and analytics for ${params.slug}.`,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProtocolPage,
  errorComponent: ({ error }) => (
    <div role="alert" className="py-10 text-sm text-destructive">
      {error instanceof Error ? error.message : "Could not load this protocol."}
    </div>
  ),
  notFoundComponent: () => (
    <div className="py-10 text-sm text-muted-foreground">
      Protocol not found.
    </div>
  ),
});

function ProtocolPage() {
  const { slug } = Route.useParams();
  const router = useRouter();
  const { data, isLoading } = useProtocolDetail(slug);

  const history = (data?.tvl ?? []).map((t) => ({
    date: t.date,
    tvl: t.totalLiquidityUSD,
  }));
  const current = history.length ? history[history.length - 1].tvl : 0;
  const chainTvls = data?.currentChainTvls
    ? Object.entries(data.currentChainTvls)
        .filter(([k]) => !k.includes("-"))
        .sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className="space-y-6 py-6">
      <button
        onClick={() => router.history.back()}
        className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex items-center gap-4">
        {data?.logo && (
          <img
            src={data.logo}
            alt=""
            className="h-12 w-12 rounded-xl ring-1 ring-border"
          />
        )}
        <div>
          <h1 className="text-3xl font-bold">{data?.name ?? slug}</h1>
          <p className="text-sm text-muted-foreground">
            {data?.category ?? "DeFi protocol"}
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Current TVL
          </p>
          <p className="font-display text-2xl font-semibold">
            {isLoading ? "…" : formatUSD(current)}
          </p>
        </div>
      </div>

      <GlassCard className="p-5">
        <h2 className="mb-3 font-display text-base font-semibold">
          TVL History
        </h2>
        <div className="h-[320px]">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <TVLAreaChart data={history} />
          )}
        </div>
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard className="p-5">
          <h2 className="mb-4 font-display text-base font-semibold">
            Chain Breakdown
          </h2>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="space-y-3">
              {chainTvls.slice(0, 8).map(([chain, tvl]) => {
                const pct = current ? (tvl / current) * 100 : 0;
                return (
                  <div key={chain}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{chain}</span>
                      <span className="text-muted-foreground">
                        {formatUSD(tvl)} · {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary/50">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {chainTvls.length === 0 && (
                <p className="text-sm text-muted-foreground">No chain data.</p>
              )}
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-5" delay={0.05}>
          <h2 className="mb-3 font-display text-base font-semibold">About</h2>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {data?.description ??
                  "No description available for this protocol."}
              </p>
              {data?.url && (
                <Link
                  to="/protocol/$slug"
                  params={{ slug }}
                  className="mt-4 inline-block text-sm text-primary hover:underline"
                >
                  {data.url}
                </Link>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {data?.chains?.map((c) => (
                  <span
                    key={c}
                    className="rounded-lg bg-secondary/50 px-2.5 py-1 text-xs text-muted-foreground"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
