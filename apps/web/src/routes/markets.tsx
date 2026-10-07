import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { GlassCard } from "../components/GlassCard";
import { DemoNotice } from "../components/DemoNotice";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { usePositions } from "../hooks/usePositions";
import { getPredictionMarkets, type PredictionMarket } from "../lib/api/hawq";

export const Route = createFileRoute("/markets")({
  head: () => ({
    meta: [
      { title: "Markets — HawQ Predict" },
      {
        name: "description",
        content:
          "Browse live prediction markets and log simulated positions on HawQ.",
      },
      { property: "og:title", content: "Markets — HawQ Predict" },
      {
        property: "og:description",
        content:
          "Browse live prediction markets and log simulated positions on HawQ.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MarketsPage,
});

const categories = ["all", "sports", "politics", "finance", "other"] as const;

function MarketsPage() {
  const [category, setCategory] = useState<string>("all");
  const [region, setRegion] = useState("all");
  const [size, setSize] = useState("100");
  const [pending, setPending] = useState<string | null>(null);
  const markets = useQuery({
    queryKey: ["hawq-predictions-markets", category, region],
    queryFn: () => getPredictionMarkets(category, region),
    refetchInterval: 15_000,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
  const { log } = usePositions();

  const buy = async (market: PredictionMarket, side: "yes" | "no") => {
    const usd = Number(size);
    if (!Number.isFinite(usd) || usd <= 0) {
      toast.error("Enter a valid USD size");
      return;
    }
    setPending(market.id);
    try {
      await log({
        product: "prediction",
        venue: "polymarket",
        symbolOrMarket: market.id,
        side,
        sizeUsd: usd,
        entryPrice: side === "yes" ? market.yesPrice : market.noPrice,
        isTestnet: true,
      });
      toast.success(`${side.toUpperCase()} demo position logged`, {
        description: `${market.question} · $${usd.toLocaleString()} · simulated, not a real trade.`,
      });
    } catch {
      toast.error("Could not log the demo position. Please try again.");
    } finally {
      setPending(null);
    }
  };

  return (
    <main className="space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-bold">
          <span className="text-gradient">Markets</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Prediction markets · live market data, simulated positions
        </p>
      </div>
      <DemoNotice />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 max-w-full overflow-x-auto">
          <Tabs value={category} onValueChange={setCategory}>
            <TabsList>
              {categories.map((item) => (
                <TabsTrigger key={item} value={item} className="capitalize">
                  {item}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <div className="flex items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="region">Region</Label>
            <select
              id="region"
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              <option value="all">All regions</option>
              <option value="nigeria">Nigeria</option>
            </select>
          </div>
          <div className="w-28 space-y-1">
            <Label htmlFor="predict-size">Size (USD)</Label>
            <Input
              id="predict-size"
              type="number"
              min="0.01"
              step="any"
              value={size}
              onChange={(event) => setSize(event.target.value)}
            />
          </div>
        </div>
      </div>
      {markets.isLoading ? (
        <p className="py-10 text-center text-muted-foreground">
          Loading markets…
        </p>
      ) : markets.isError ? (
        <p className="py-10 text-center text-destructive">
          Markets unavailable. Please try again later.
        </p>
      ) : !markets.data?.length ? (
        <p className="py-10 text-center text-muted-foreground">
          No markets found for this filter.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {markets.data.map((market) => (
            <GlassCard
              key={market.id}
              className="flex min-w-0 flex-col gap-4 p-5"
              hover={false}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 font-medium leading-snug">
                  {market.question}
                </p>
                <Badge variant="secondary" className="shrink-0 capitalize">
                  {market.category}
                </Badge>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-sm font-semibold tabular-nums">
                  <span className="text-success">
                    YES {(market.yesPrice * 100).toFixed(1)}%
                  </span>
                  <span className="text-destructive">
                    NO {(market.noPrice * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-destructive/30">
                  <div
                    className="h-full bg-success"
                    style={{
                      width: `${Math.min(100, Math.max(0, market.yesPrice * 100))}%`,
                    }}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Vol $
                {Intl.NumberFormat("en", {
                  notation: "compact",
                  maximumFractionDigits: 1,
                }).format(market.volume)}
              </p>
              <div className="mt-auto grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="border-success/40 text-success hover:bg-success/10"
                  disabled={pending !== null}
                  onClick={() => buy(market, "yes")}
                >
                  Buy YES
                </Button>
                <Button
                  variant="outline"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                  disabled={pending !== null}
                  onClick={() => buy(market, "no")}
                >
                  Buy NO
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
      <Link
        to="/my-positions"
        className="inline-block text-sm text-primary hover:underline"
      >
        View all demo positions →
      </Link>
    </main>
  );
}
