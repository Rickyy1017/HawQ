import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { DemoNotice } from "../components/DemoNotice";
import { GlassCard } from "../components/GlassCard";
import { PositionsTable } from "../components/PositionsTable";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { usePositions } from "../hooks/usePositions";

export const Route = createFileRoute("/spot")({
  head: () => ({
    meta: [
      { title: "Spot — HawQ Trade" },
      {
        name: "description",
        content: "Log simulated spot swaps and view demo positions on HawQ.",
      },
      { property: "og:title", content: "Spot — HawQ Trade" },
      {
        property: "og:description",
        content: "Log simulated spot swaps and view demo positions on HawQ.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SpotPage,
});

function SpotPage() {
  const [symbol, setSymbol] = useState("ETH/USDC");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [size, setSize] = useState("100");
  const { positions, log, isSubmitting, isLoading, error } =
    usePositions("spot");
  const swap = async () => {
    const usd = Number(size);
    if (!symbol.trim() || !Number.isFinite(usd) || usd <= 0) {
      toast.error("Enter a pair and valid USD size");
      return;
    }
    try {
      await log({
        product: "spot",
        venue: "demo",
        symbolOrMarket: symbol.trim().toUpperCase(),
        side,
        sizeUsd: usd,
        isTestnet: true,
      });
      toast.success(`${side.toUpperCase()} ${symbol} demo swap logged`, {
        description: "Simulated only — no swap or funds moved.",
      });
    } catch {
      toast.error("Could not log the demo swap. Please try again.");
    }
  };
  return (
    <main className="space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-bold">
          <span className="text-gradient">Spot</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          No wallet connected · swaps are logged as demo positions only
        </p>
      </div>
      <DemoNotice />
      <GlassCard className="max-w-md space-y-4 p-5" hover={false}>
        <h2 className="font-display text-lg font-semibold">Demo swap</h2>
        <div className="space-y-2">
          <Label htmlFor="spot-pair">Pair</Label>
          <Input
            id="spot-pair"
            value={symbol}
            onChange={(event) => setSymbol(event.target.value)}
            placeholder="ETH/USDC"
          />
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
        <Button className="w-full" onClick={swap} disabled={isSubmitting}>
          {isSubmitting ? "Logging…" : "Swap"}
        </Button>
        <p className="text-center text-xs font-semibold text-warning">
          Demo only — no real swap is executed
        </p>
      </GlassCard>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">Spot positions</h2>
        <Link
          to="/my-positions"
          className="text-sm text-primary hover:underline"
        >
          All positions →
        </Link>
      </div>
      <PositionsTable
        positions={positions}
        title="Spot positions"
        isLoading={isLoading}
        error={error}
      />
    </main>
  );
}
