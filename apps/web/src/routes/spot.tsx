import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ChevronRight, Search } from "lucide-react";
import { DemoNotice } from "../components/DemoNotice";
import { GlassCard } from "../components/GlassCard";
import { LiveCandleChart } from "../components/markets/LiveCandleChart";
import { TokenLogo } from "../components/markets/TokenLogo";
import { PositionsTable } from "../components/PositionsTable";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { usePositions } from "../hooks/usePositions";
import { getSpotMarkets } from "../lib/api/hawq";

export const Route = createFileRoute("/spot")({
  head: () => ({
    meta: [
      { title: "Spot — HawQ Trade" },
      {
        name: "description",
        content:
          "Browse live Hyperliquid spot markets with charts and demo swaps.",
      },
      { property: "og:title", content: "Spot — HawQ Trade" },
      {
        property: "og:description",
        content: "Live spot market prices, charts, and demo swaps.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SpotPage,
});

const compact = (value: number) =>
  `$${Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(value)}`;

function SpotPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [size, setSize] = useState("100");
  const [entryPrice, setEntryPrice] = useState("");
  const [isLogging, setIsLogging] = useState(false);
  const markets = useQuery({
    queryKey: ["hyperliquid-spot-markets"],
    queryFn: getSpotMarkets,
    refetchInterval: 15_000,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
  const {
    positions,
    log,
    isSubmitting,
    isLoading: positionsLoading,
    error: positionsError,
  } = usePositions("spot");
  const market = markets.data?.find((item) => item.symbol === selected) ?? null;
  const filteredMarkets = useMemo(
    () =>
      [...(markets.data ?? [])].filter((item) =>
        `${item.baseSymbol}/${item.quoteSymbol}`
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      ),
    [markets.data, search],
  );

  const openMarket = (symbol: string) => {
    setSelected(symbol);
    setEntryPrice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const logSwap = async () => {
    const usd = Number(size);
    const price = Number(entryPrice);
    if (
      !market ||
      !Number.isFinite(usd) ||
      usd <= 0 ||
      !Number.isFinite(price) ||
      price <= 0
    ) {
      toast.error("Enter a valid USD size and your price");
      return;
    }
    setIsLogging(true);
    try {
      await log({
        product: "spot",
        venue: "demo",
        symbolOrMarket: market.symbol,
        side,
        sizeUsd: usd,
        entryPrice: price,
        isTestnet: true,
      });
      toast.success(`${side.toUpperCase()} ${market.symbol} demo swap logged`, {
        description: `Simulated at your $${price.toLocaleString()} price. No funds moved.`,
      });
    } catch {
      toast.error("Could not log the demo swap. Please try again.");
    } finally {
      setIsLogging(false);
    }
  };

  if (market) {
    const change =
      market.previousPrice > 0
        ? ((market.markPrice - market.previousPrice) / market.previousPrice) *
          100
        : 0;
    return (
      <main className="space-y-4 py-4 sm:space-y-6 sm:py-6">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 gap-2"
          onClick={() => setSelected(null)}
        >
          <ArrowLeft className="h-4 w-4" /> All spot markets
        </Button>
        <div className="flex items-center gap-3">
          <TokenLogo symbol={market.baseSymbol} className="h-11 w-11" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {market.baseSymbol}
                <span className="ml-1 text-sm font-medium text-muted-foreground">
                  /{market.quoteSymbol}
                </span>
              </h1>
              <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                SPOT
              </span>
            </div>
            <p className="mt-1 text-sm tabular-nums text-muted-foreground">
              Price{" "}
              <span className="font-semibold text-foreground">
                $
                {market.markPrice.toLocaleString(undefined, {
                  maximumFractionDigits: 8,
                })}
              </span>{" "}
              <span
                className={change >= 0 ? "text-success" : "text-destructive"}
              >
                {change >= 0 ? "+" : ""}
                {change.toFixed(2)}%
              </span>
            </p>
          </div>
        </div>
        <LiveCandleChart symbol={market.candleSymbol} kind="spot" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          <GlassCard hover={false} className="p-3">
            <p className="text-[10px] text-muted-foreground">24h volume</p>
            <p className="mt-1 truncate text-sm font-semibold tabular-nums">
              {compact(market.dayVolume)}
            </p>
          </GlassCard>
          <GlassCard hover={false} className="p-3">
            <p className="text-[10px] text-muted-foreground">Previous close</p>
            <p className="mt-1 truncate text-sm font-semibold tabular-nums">
              $
              {market.previousPrice.toLocaleString(undefined, {
                maximumFractionDigits: 8,
              })}
            </p>
          </GlassCard>
          <GlassCard hover={false} className="col-span-2 p-3 sm:col-span-1">
            <p className="text-[10px] text-muted-foreground">Market</p>
            <p className="mt-1 truncate text-sm font-semibold">
              Hyperliquid spot
            </p>
          </GlassCard>
        </div>
        <DemoNotice />
        <GlassCard hover={false} className="space-y-4 p-4 sm:p-5">
          <div>
            <h2 className="font-display text-lg font-semibold">Demo swap</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Simulated only. HawQ does not execute a live spot swap.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/40 p-1">
            {(["buy", "sell"] as const).map((option) => (
              <Button
                key={option}
                variant={side === option ? "default" : "ghost"}
                onClick={() => setSide(option)}
                className="capitalize"
              >
                {option}
              </Button>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="spot-size">Size (USD)</Label>
            <Input
              id="spot-size"
              type="number"
              min="0.01"
              step="any"
              value={size}
              onChange={(event) => setSize(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="spot-entry-price">Your price (USD)</Label>
            <Input
              id="spot-entry-price"
              type="number"
              min="0.00000001"
              step="any"
              value={entryPrice}
              onChange={(event) => setEntryPrice(event.target.value)}
              placeholder="Enter your price"
              inputMode="decimal"
            />
          </div>
          <Button
            className="w-full"
            onClick={logSwap}
            disabled={isLogging || isSubmitting}
          >
            {isLogging || isSubmitting ? "Logging..." : `Log ${side} demo swap`}
          </Button>
          <p className="text-center text-[10px] text-warning">
            Demo only — no live swap or funds moved
          </p>
        </GlassCard>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-base font-semibold">
            Spot positions
          </h2>
          <Link
            to="/my-positions"
            className="text-xs text-primary hover:underline"
          >
            All positions <ChevronRight className="inline h-3.5 w-3.5" />
          </Link>
        </div>
        <PositionsTable
          positions={positions}
          title="Spot positions"
          isLoading={positionsLoading}
          error={positionsError}
        />
      </main>
    );
  }

  return (
    <main className="space-y-5 py-4 sm:space-y-6 sm:py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            <span className="text-gradient">Spot</span>
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Explore live spot markets and price charts
          </p>
        </div>
        <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
          LIVE MARKETS
        </span>
      </div>
      <DemoNotice />
      <GlassCard hover={false} className="overflow-hidden">
        <div className="border-b border-border/60 px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-semibold">
                Spot markets
              </h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Tap an asset to view its live chart
              </p>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {markets.data?.length ?? 0} pairs
            </span>
          </div>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search assets"
              className="h-10 pl-9"
            />
          </div>
        </div>
        {markets.isLoading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Loading live spot markets...
          </p>
        ) : markets.isError ? (
          <p className="px-4 py-12 text-center text-sm text-destructive">
            Spot markets are unavailable. Please try again later.
          </p>
        ) : !filteredMarkets.length ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No matching spot markets.
          </p>
        ) : (
          <div className="divide-y divide-border/50">
            {filteredMarkets.map((item) => {
              const change =
                item.previousPrice > 0
                  ? ((item.markPrice - item.previousPrice) /
                      item.previousPrice) *
                    100
                  : 0;
              return (
                <button
                  key={item.symbol}
                  type="button"
                  onClick={() => openMarket(item.symbol)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-primary/5 active:bg-primary/10 sm:px-5"
                >
                  <TokenLogo symbol={item.baseSymbol} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold">
                        {item.baseSymbol}
                      </span>
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-[9px] text-muted-foreground">
                        {item.quoteSymbol}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[10px] text-muted-foreground">
                      {compact(item.dayVolume)} 24h volume
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">
                      $
                      {item.markPrice.toLocaleString(undefined, {
                        maximumFractionDigits: 8,
                      })}
                    </p>
                    <p
                      className={`mt-1 text-[10px] font-medium tabular-nums ${change >= 0 ? "text-success" : "text-destructive"}`}
                    >
                      {change >= 0 ? "+" : ""}
                      {change.toFixed(2)}%
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        )}
      </GlassCard>
      <p className="text-center text-[10px] text-muted-foreground">
        Market prices and candle data refresh from Hyperliquid. Swaps in HawQ
        are demo-only.
      </p>
    </main>
  );
}
