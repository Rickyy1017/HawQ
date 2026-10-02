import { createFileRoute } from "@tanstack/react-router";
import { GlassCard } from '../components/GlassCard';
import { Skeleton } from '../components/Skeleton';
import { useProtocols } from '../hooks/useDefiData';
import { formatUSD } from '../lib/format';
import { cn } from '../lib/utils';
import { Repeat, ArrowDown } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/dex")({
  head: () => ({
    meta: [
      { title: "DEX Aggregator — DeFi-Wolf" },
      { name: "description", content: "Simulated best-price swap routing across decentralized exchanges." },
    ],
  }),
  component: DexPage,
});

const TOKENS = ["ETH", "USDC", "USDT", "DAI", "WBTC", "ARB", "OP", "MATIC"];

function seeded(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function DexPage() {
  const { data: protocols, isLoading } = useProtocols();
  const [fromTok, setFromTok] = useState("ETH");
  const [toTok, setToTok] = useState("USDC");
  const [amount, setAmount] = useState("1");

  const dexes = useMemo(() => {
    if (!protocols) return [];
    const dexProtocols = protocols.filter((p) =>
      (p.category ?? "").toLowerCase().includes("dex"),
    );
    return (dexProtocols.length ? dexProtocols : protocols).slice(0, 6);
  }, [protocols]);

  const routes = useMemo(() => {
    const amt = parseFloat(amount) || 0;
    const basePrice = 3200; // illustrative ETH price reference
    return dexes
      .map((d) => {
        const slip = seeded(d.slug + fromTok + toTok) * 0.012;
        const fee = 0.001 + seeded(d.slug + "f") * 0.0025;
        const out = amt * basePrice * (1 - slip - fee);
        return { name: d.name, slug: d.slug, out, slip: slip * 100, fee: fee * 100, tvl: d.tvl };
      })
      .sort((a, b) => b.out - a.out);
  }, [dexes, amount, fromTok, toTok]);

  if (isLoading) {
    return (
      <div className="space-y-4 py-6">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6">
      <header>
        <h1 className="mb-1 text-3xl font-bold">
          <span className="text-gradient">DEX Aggregator</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Compare simulated swap routes across the largest decentralized exchanges.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="space-y-3 p-5">
          <h2 className="font-display text-lg font-semibold">Swap</h2>
          <div className="rounded-xl border border-border bg-secondary/30 p-3">
            <div className="flex items-center justify-between">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                className="w-1/2 bg-transparent text-2xl font-semibold outline-none"
              />
              <select
                value={fromTok}
                onChange={(e) => setFromTok(e.target.value)}
                className="rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-sm outline-none"
              >
                {TOKENS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/15 p-2 text-primary ring-1 ring-primary/20">
              <ArrowDown className="h-4 w-4" />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-secondary/30 p-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-semibold text-muted-foreground">
                {routes[0] ? routes[0].out.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0"}
              </span>
              <select
                value={toTok}
                onChange={(e) => setToTok(e.target.value)}
                className="rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-sm outline-none"
              >
                {TOKENS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          {routes[0] && (
            <p className="text-center text-xs text-muted-foreground">
              Best route via <span className="text-foreground">{routes[0].name}</span>
            </p>
          )}
        </GlassCard>

        <GlassCard className="p-5">
          <h2 className="mb-4 font-display text-lg font-semibold">Routes</h2>
          <div className="space-y-2">
            {routes.map((r, i) => (
              <div
                key={r.slug}
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm",
                  i === 0 ? "bg-primary/10 ring-1 ring-primary/30" : "bg-secondary/30",
                )}
              >
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Fee {r.fee.toFixed(2)}% · Slippage {r.slip.toFixed(2)}%
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{r.out.toLocaleString(undefined, { maximumFractionDigits: 2 })} {toTok}</p>
                  {i === 0 && <p className="text-xs text-success">Best price</p>}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
