import { createFileRoute } from "@tanstack/react-router";
import { GlassCard } from "@/components/GlassCard";
import { Skeleton } from "@/components/Skeleton";
import { useProtocols } from "@/hooks/useDefiData";
import { fetchCoinGeckoLogos } from "@/lib/api/coinGecko";
import { TokenLogo } from "@/components/markets/TokenLogo";
import { formatUSD } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/yields")({
  head: () => ({
    meta: [
      { title: "Yields — HawQ" },
      {
        name: "description",
        content:
          "Explore sample yield estimates across DeFi protocols.",
      },
      { property: "og:title", content: "Yields — HawQ" },
      {
        property: "og:description",
        content:
          "Explore sample yield estimates across DeFi protocols.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: YieldsPage,
});

// deterministic pseudo-random from a string seed
function seeded(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

type Pool = {
  protocol: string;
  slug: string;
  chain: string;
  symbol: string;
  tvl: number;
  apy: number;
  apyBase: number;
  risk: "Low" | "Medium" | "High";
};

const SYMBOLS = [
  "USDC",
  "ETH-USDC",
  "stETH",
  "DAI",
  "WBTC-ETH",
  "USDT",
  "GHO",
  "rETH",
];

function buildPools(
  protocols: { name: string; slug: string; chain: string; tvl: number }[],
): Pool[] {
  return protocols.slice(0, 40).map((p) => {
    const r = seeded(p.slug);
    const apy = 1.5 + r * 22;
    const apyBase = apy * (0.4 + seeded(p.slug + "b") * 0.4);
    const risk = apy > 16 ? "High" : apy > 7 ? "Medium" : "Low";
    return {
      protocol: p.name,
      slug: p.slug,
      chain: p.chain,
      symbol: SYMBOLS[Math.floor(seeded(p.slug + "s") * SYMBOLS.length)],
      tvl: p.tvl * (0.05 + seeded(p.slug + "t") * 0.25),
      apy,
      apyBase,
      risk,
    };
  });
}

const riskColor: Record<Pool["risk"], string> = {
  Low: "bg-success/15 text-success",
  Medium: "bg-warning/15 text-warning",
  High: "bg-destructive/15 text-destructive",
};

export default function YieldsPage() {
  const { data: protocols, isLoading } = useProtocols();
  const [query, setQuery] = useState("");
  const [risk, setRisk] = useState<"All" | Pool["risk"]>("All");

  const pools = useMemo(() => {
    if (!protocols) return [];
    return buildPools(protocols)
      .filter((p) => (risk === "All" ? true : p.risk === risk))
      .filter((p) =>
        query.trim()
          ? (p.protocol + p.symbol + p.chain)
              .toLowerCase()
              .includes(query.toLowerCase())
          : true,
      )
      .sort((a, b) => b.apy - a.apy);
  }, [protocols, query, risk]);
  const poolSymbols = [
    ...new Set(pools.flatMap((pool) => pool.symbol.split("-"))),
  ].sort();
  const tokenLogos = useQuery({
    queryKey: ["yield-token-logos", poolSymbols],
    queryFn: () => fetchCoinGeckoLogos(poolSymbols),
    enabled: poolSymbols.length > 0,
    staleTime: 6 * 60 * 60_000,
    gcTime: 24 * 60 * 60_000,
    retry: 0,
  });

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
          <span className="text-gradient">Yields</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Demo yield estimates across {pools.length} sample pools.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pools…"
            className="w-full rounded-xl border border-border bg-secondary/40 py-2 pl-9 pr-3 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary/50"
          />
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-border bg-secondary/40 p-1">
          {(["All", "Low", "Medium", "High"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRisk(r)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                risk === r
                  ? "bg-primary/20 text-foreground ring-1 ring-primary/40"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <GlassCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Pool</th>
                <th className="px-4 py-3 font-medium">Chain</th>
                <th className="px-4 py-3 text-right font-medium">TVL</th>
                <th className="px-4 py-3 text-right font-medium">Base APY</th>
                <th className="px-4 py-3 text-right font-medium">Total APY</th>
                <th className="px-4 py-3 text-right font-medium">Risk</th>
              </tr>
            </thead>
            <tbody>
              {pools.map((p) => (
                <tr
                  key={p.slug}
                  className="border-b border-border/50 transition-colors hover:bg-secondary/30"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <TokenLogo
                        symbol={p.symbol.split("-")[0]}
                        logoUrl={
                          tokenLogos.data?.[
                            p.symbol.split("-")[0].toUpperCase()
                          ]
                        }
                        className="h-6 w-6"
                      />
                      <div>
                        <p className="font-medium">{p.symbol}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.protocol}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">
                    {p.chain}
                  </td>
                  <td className="px-4 py-3 text-right">{formatUSD(p.tvl)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {p.apyBase.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-success">
                    {p.apy.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-xs font-semibold",
                        riskColor[p.risk],
                      )}
                    >
                      {p.risk}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
