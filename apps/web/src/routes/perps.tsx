import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ChevronRight, Search } from "lucide-react";
import { GlassCard } from "../components/GlassCard";
import { DemoNotice } from "../components/DemoNotice";
import { PositionsTable } from "../components/PositionsTable";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { usePositions } from "../hooks/usePositions";
import { getPerpMarkets } from "../lib/api/hawq";
import { LiveCandleChart } from "../components/markets/LiveCandleChart";
import { TokenLogo } from "../components/markets/TokenLogo";

export const Route = createFileRoute("/perps")({
  head: () => ({
    meta: [
      { title: "Perps -- HawQ Trade" },
      {
        name: "description",
        content: "Live perpetual market data and demo-only positions on HawQ.",
      },
      { property: "og:title", content: "Perps -- HawQ Trade" },
      {
        property: "og:description",
        content: "Live perpetual market data and demo-only positions on HawQ.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PerpsPage,
});

const compact = (n: number) =>
  `$${Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(n)}`;

function PerpsPage() {
  const [selected, setSelected] = useState("BTC");
  const [detailOpen, setDetailOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [side, setSide] = useState<"long" | "short">("long");
  const [size, setSize] = useState("1000");
  const [entryPrice, setEntryPrice] = useState("");
  const [isPlacing, setIsPlacing] = useState(false);
  const markets = useQuery({
    queryKey: ["hawq-perps-markets"],
    queryFn: getPerpMarkets,
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
  } = usePositions("perp");
  const market =
    markets.data?.find((item) => item.symbol === selected) ?? markets.data?.[0];

  const selectMarket = (symbol: string) => {
    setSelected(symbol);
    setEntryPrice("");
    setDetailOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filteredMarkets = useMemo(
    () =>
      [...(markets.data ?? [])]
        .sort((a, b) => b.dayVolume - a.dayVolume)
        .filter((item) =>
          item.symbol.toLowerCase().includes(search.trim().toLowerCase()),
        ),
    [markets.data, search],
  );

  const placeOrder = async () => {
    const usd = Number(size);
    const price = Number(entryPrice);
    if (
      !market ||
      !Number.isFinite(usd) ||
      usd <= 0 ||
      !Number.isFinite(price) ||
      price <= 0
    ) {
      toast.error("Enter a valid USD size and your entry price");
      return;
    }

    setIsPlacing(true);
    try {
      await log({
        product: "perp",
        venue: "paper",
        symbolOrMarket: market.symbol,
        side,
        sizeUsd: usd,
        entryPrice: price,
        isTestnet: true,
      });
      toast.success(
        `${side.toUpperCase()} ${market.symbol} paper position logged`,
        {
          description: `Simulated at your $${price.toLocaleString()} entry price. No order was sent.`,
        },
      );
    } catch {
      toast.error("Could not log the paper position. Please try again.");
    } finally {
      setIsPlacing(false);
    }
  };

  const selectedSymbol =
    market?.symbol.replace(/-PERP$/i, "").toUpperCase() ?? "";

  if (detailOpen && market) {
    return (
      <main className="space-y-4 py-4 sm:space-y-6 sm:py-6">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 gap-2"
          onClick={() => setDetailOpen(false)}
        >
          <ArrowLeft className="h-4 w-4" /> All perpetuals
        </Button>
        <div className="flex items-center gap-3">
          <TokenLogo symbol={selectedSymbol} className="h-11 w-11" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {selectedSymbol}
                <span className="ml-1 text-sm font-medium text-muted-foreground">
                  Perpetual
                </span>
              </h1>
              <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                PAPER TRADING
              </span>
            </div>
            <p className="mt-1 text-sm tabular-nums text-muted-foreground">
              Mark price{" "}
              <span className="font-semibold text-foreground">
                $
                {market.markPrice.toLocaleString(undefined, {
                  maximumFractionDigits: 6,
                })}
              </span>
            </p>
          </div>
        </div>
        <LiveCandleChart symbol={selectedSymbol} kind="perp" />
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <GlassCard hover={false} className="p-3">
            <p className="text-[10px] text-muted-foreground">24h volume</p>
            <p className="mt-1 truncate text-sm font-semibold tabular-nums">
              {compact(market.dayVolume)}
            </p>
          </GlassCard>
          <GlassCard hover={false} className="p-3">
            <p className="text-[10px] text-muted-foreground">Funding</p>
            <p
              className={`mt-1 text-sm font-semibold tabular-nums ${market.fundingRate >= 0 ? "text-success" : "text-destructive"}`}
            >
              {(market.fundingRate * 100).toFixed(4)}%
            </p>
          </GlassCard>
          <GlassCard hover={false} className="p-3">
            <p className="text-[10px] text-muted-foreground">Open interest</p>
            <p className="mt-1 truncate text-sm font-semibold tabular-nums">
              {compact(market.openInterest)}
            </p>
          </GlassCard>
        </div>
        <DemoNotice />
        <GlassCard className="space-y-4 p-4 sm:p-5" hover={false}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">
                Trade {selectedSymbol}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Paper trade using your entry price.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/40 p-1">
            {(["long", "short"] as const).map((option) => (
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
            <Label htmlFor="perp-size">Size (USD)</Label>
            <Input
              id="perp-size"
              type="number"
              min="0.01"
              step="any"
              value={size}
              onChange={(event) => setSize(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="perp-entry-price">Your entry price (USD)</Label>
            <Input
              id="perp-entry-price"
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
            onClick={placeOrder}
            disabled={isSubmitting || isPlacing}
          >
            {isPlacing ? "Recording..." : `Place paper ${side}`}
          </Button>
          <p className="text-center text-[10px] text-warning">
            No wallet required � no order is sent
          </p>
        </GlassCard>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-base font-semibold">
            Perps positions
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
          title="Perps positions"
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
            <span className="text-gradient">Perps</span>
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Explore live perpetual markets
          </p>
        </div>
        <span className="rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-[10px] font-semibold text-warning">
          PAPER TRADING
        </span>
      </div>
      <DemoNotice />
      <GlassCard hover={false} className="overflow-hidden">
        <div className="border-b border-border/60 px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-semibold">
                Perpetual markets
              </h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Tap a market to open its live chart
              </p>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {markets.data?.length ?? 0} markets
            </span>
          </div>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search markets"
              className="h-10 pl-9"
            />
          </div>
        </div>
        {markets.isLoading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Loading live markets...
          </p>
        ) : markets.isError ? (
          <p className="py-12 text-center text-sm text-destructive">
            Markets unavailable. Please try again later.
          </p>
        ) : !filteredMarkets.length ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No matching markets.
          </p>
        ) : (
          <div className="divide-y divide-border/50">
            {filteredMarkets.map((item) => {
              const tokenSymbol = item.symbol
                .replace(/-PERP$/i, "")
                .toUpperCase();
              return (
                <button
                  key={item.symbol}
                  type="button"
                  onClick={() => selectMarket(item.symbol)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-primary/5 active:bg-primary/10 sm:px-5"
                >
                  <TokenLogo symbol={tokenSymbol} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold">
                        {tokenSymbol}
                      </span>
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-[9px] text-muted-foreground">
                        PERP
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[10px] text-muted-foreground">
                      {compact(item.dayVolume)} 24h vol · funding{" "}
                      {(item.fundingRate * 100).toFixed(3)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">
                      $
                      {item.markPrice.toLocaleString(undefined, {
                        maximumFractionDigits: 6,
                      })}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Mark price
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        )}
      </GlassCard>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-semibold">
          Your perps positions
        </h2>
        <Link
          to="/my-positions"
          className="text-xs text-primary hover:underline"
        >
          View all <ChevronRight className="inline h-3.5 w-3.5" />
        </Link>
      </div>
      <PositionsTable
        positions={positions}
        title="Perps positions"
        isLoading={positionsLoading}
        error={positionsError}
      />
    </main>
  );
}
