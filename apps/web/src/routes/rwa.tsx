import { createFileRoute } from "@tanstack/react-router";
import { GlassCard } from "@/components/GlassCard";
import { MetricCard } from "@/components/MetricCard";
import { Skeleton } from "@/components/Skeleton";
import { Link } from "@tanstack/react-router";
import { useProtocols } from "@/hooks/useDefiData";
import { formatUSD, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Building2 } from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/rwa")({
  head: () => ({
    meta: [
      { title: "RWA — HawQ" },
      {
        name: "description",
        content:
          "Real-world asset tokenization protocols and their TVL on-chain.",
      },
      { property: "og:title", content: "RWA — HawQ" },
      {
        property: "og:description",
        content:
          "Real-world asset tokenization protocols and their TVL on-chain.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RWAPage,
});

const RWA_KEYWORDS = [
  "rwa",
  "real world",
  "treasur",
  "bond",
  "credit",
  "private credit",
];

function RWAPage() {
  const { data: protocols, isLoading } = useProtocols();

  const { list, total } = useMemo(() => {
    if (!protocols) return { list: [], total: 0 };
    const filtered = protocols
      .filter((p) => {
        const hay = `${p.category ?? ""} ${p.name}`.toLowerCase();
        return RWA_KEYWORDS.some((k) => hay.includes(k));
      })
      .sort((a, b) => b.tvl - a.tvl);
    const source = filtered.length ? filtered : protocols.slice(0, 12);
    return {
      list: source.slice(0, 24),
      total: source.reduce((s, p) => s + p.tvl, 0),
    };
  }, [protocols]);

  if (isLoading) {
    return (
      <div className="space-y-4 py-6">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6">
      <header>
        <h1 className="mb-1 text-3xl font-bold">
          <span className="text-gradient">Real-World Assets</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Tokenized treasuries, credit and bonds bridging traditional finance
          on-chain.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="RWA TVL"
          value={total}
          format={(n) => formatUSD(n)}
          icon={Building2}
        />
        <MetricCard
          label="Protocols"
          value={list.length}
          format={(n) => String(n)}
          icon={Building2}
          delay={0.05}
        />
        <MetricCard
          label="Avg Size"
          value={total / (list.length || 1)}
          format={(n) => formatUSD(n)}
          icon={Building2}
          delay={0.1}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {list.map((p, i) => (
          <Link key={p.slug} to="/protocol/$slug" params={{ slug: p.slug }}>
            <GlassCard delay={i * 0.03} className="h-full p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display font-semibold">{p.name}</p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {p.category ?? "RWA"}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-xs font-semibold",
                    (p.change1d ?? 0) >= 0
                      ? "bg-success/15 text-success"
                      : "bg-destructive/15 text-destructive",
                  )}
                >
                  {formatPct(p.change1d)}
                </span>
              </div>
              <p className="mt-4 font-display text-xl font-semibold">
                {formatUSD(p.tvl)}
              </p>
              <p className="text-xs text-muted-foreground">
                Total value locked
              </p>
            </GlassCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
