import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { GlassCard } from "../components/GlassCard";
import { DemoNotice } from "../components/DemoNotice";
import { PositionsTable } from "../components/PositionsTable";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { usePositions } from "../hooks/usePositions";
import { getPerpMarkets } from "../lib/api/hawq";

export const Route = createFileRoute("/perps")({
  head: () => ({
    meta: [
      { title: "Perps — HawQ Trade" },
      {
        name: "description",
        content: "Live perpetual market data and demo-only positions on HawQ.",
      },
      { property: "og:title", content: "Perps — HawQ Trade" },
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
  const [side, setSide] = useState<"long" | "short">("long");
  const [size, setSize] = useState("1000");
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

  const placeOrder = async () => {
    const usd = Number(size);
    if (!market || !Number.isFinite(usd) || usd <= 0) {
      toast.error("Select a market and enter a valid USD size");
      return;
    }
    try {
      await log({
        product: "perp",
        venue: "hyperliquid",
        symbolOrMarket: market.symbol,
        side,
        sizeUsd: usd,
        entryPrice: market.markPrice,
        isTestnet: true,
      });
      toast.success(
        `${side.toUpperCase()} ${market.symbol} demo position logged`,
        { description: "Testnet demo — not a live order." },
      );
    } catch {
      toast.error("Could not log the demo position. Please try again.");
    }
  };

  return (
    <main className="space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-bold">
          <span className="text-gradient">Perps</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Market data refreshes automatically every 15 seconds
        </p>
      </div>
      <DemoNotice />
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <GlassCard className="min-w-0 p-5" hover={false}>
          {markets.isLoading ? (
            <p className="py-8 text-center text-muted-foreground">
              Loading markets…
            </p>
          ) : markets.isError ? (
            <p className="py-8 text-center text-destructive">
              Markets unavailable. Please try again later.
            </p>
          ) : !markets.data?.length ? (
            <p className="py-8 text-center text-muted-foreground">
              No markets available.
            </p>
          ) : (
            <div className="max-h-[580px] overflow-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-4">Symbol</th>
                    <th className="py-2 pr-4 text-right">Mark price</th>
                    <th className="py-2 pr-4 text-right">Funding rate</th>
                    <th className="py-2 pr-4 text-right">Open interest</th>
                    <th className="py-2 text-right">24h volume</th>
                  </tr>
                </thead>
                <tbody>
                  {markets.data.map((m) => (
                    <tr
                      key={m.symbol}
                      className={`border-b border-border/50 last:border-0 ${market?.symbol === m.symbol ? "bg-primary/10" : ""}`}
                    >
                      <td className="py-2 pr-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelected(m.symbol)}
                          className="font-semibold"
                        >
                          {m.symbol}
                        </Button>
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        $
                        {m.markPrice.toLocaleString(undefined, {
                          maximumFractionDigits: 6,
                        })}
                      </td>
                      <td
                        className={`py-2 pr-4 text-right tabular-nums ${m.fundingRate >= 0 ? "text-success" : "text-destructive"}`}
                      >
                        {(m.fundingRate * 100).toFixed(4)}%
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {compact(m.openInterest)}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {compact(m.dayVolume)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
        <GlassCard className="h-fit space-y-4 p-5" hover={false}>
          <div>
            <p className="text-xs text-muted-foreground">Demo order</p>
            <p className="font-display text-xl font-semibold">
              {market?.symbol ?? "—"}
            </p>
            <p className="text-sm text-muted-foreground tabular-nums">
              Mark {market ? `$${market.markPrice.toLocaleString()}` : "—"}
            </p>
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
          <Button
            className="w-full"
            onClick={placeOrder}
            disabled={!market || isSubmitting}
          >
            {isSubmitting ? "Logging…" : "Place order"}
          </Button>
          <p className="text-center text-xs font-semibold text-warning">
            Testnet demo — not a live order
          </p>
        </GlassCard>
      </div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">Perps positions</h2>
        <Link
          to="/my-positions"
          className="text-sm text-primary hover:underline"
        >
          All positions →
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
