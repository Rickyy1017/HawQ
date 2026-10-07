import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Trash2, Wallet, Radio, AlertCircle } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { Skeleton } from "@/components/Skeleton";
import { useWatchlistBalances } from "@/hooks/useDefiData";
import { isValidAddress } from "@/lib/analytics/events";
import { formatUSD, formatPct, timeAgo, shortenAddress } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WalletBalance } from "@/types";

export const Route = createFileRoute("/watchlist")({
  head: () => ({
    meta: [
      { title: "Whale Watchlist — HawQ" },
      {
        name: "description",
        content:
          "Track wallet addresses and monitor their DeFi positions, balances and recent protocol activity with real-time updates.",
      },
      { property: "og:title", content: "Whale Watchlist — HawQ" },
      {
        property: "og:description",
        content:
          "Track wallet addresses and monitor their DeFi positions, balances and recent protocol activity with real-time updates.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WatchlistPage,
});

const STORAGE_KEY = "defiwolf:watchlist";

function loadAddresses(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function WatchlistPage() {
  const [addresses, setAddresses] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setAddresses(loadAddresses());
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
    }
  }, [addresses]);

  const { balances, isLoading } = useWatchlistBalances(addresses);

  const add = () => {
    const a = input.trim();
    if (!isValidAddress(a)) {
      setError("Enter a valid EVM address (0x… 40 hex chars).");
      return;
    }
    if (addresses.some((x) => x.toLowerCase() === a.toLowerCase())) {
      setError("Address is already on your watchlist.");
      return;
    }
    setAddresses((s) => [a, ...s]);
    setInput("");
    setError("");
  };

  const remove = (addr: string) =>
    setAddresses((s) => s.filter((x) => x !== addr));

  const totalTracked = useMemo(
    () => balances.reduce((a, b) => a + b.totalUSD, 0),
    [balances],
  );

  return (
    <div className="space-y-6 py-6">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold">
          <Wallet className="h-7 w-7 text-primary" />
          <span className="text-gradient">Whale Watchlist</span>
          <span className="flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success ring-1 ring-success/30">
            <Radio className="h-3 w-3 animate-pulse" /> Live
          </span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add wallet addresses to track positions, balances and recent protocol
          activity in real time.
        </p>
      </div>

      <GlassCard className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="0x0000000000000000000000000000000000000000"
            spellCheck={false}
            className="flex-1 rounded-xl border border-border bg-secondary/40 px-3 py-2.5 font-mono text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary/50 focus:bg-secondary/70"
          />
          <button
            onClick={add}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-[1.02]"
          >
            <Plus className="h-4 w-4" /> Track address
          </button>
        </div>
        {error && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5" /> {error}
          </p>
        )}
        {addresses.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Tracking {addresses.length} wallet{addresses.length > 1 ? "s" : ""}{" "}
            · combined value{" "}
            <span className="font-semibold text-foreground">
              {formatUSD(totalTracked)}
            </span>
          </p>
        )}
      </GlassCard>

      {addresses.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center gap-3 p-16 text-center">
          <div className="rounded-2xl bg-primary/15 p-5 text-primary ring-1 ring-primary/20">
            <Wallet className="h-8 w-8" />
          </div>
          <p className="font-display text-lg font-semibold">
            No wallets tracked yet
          </p>
          <p className="max-w-md text-sm text-muted-foreground">
            Paste any EVM address above to start monitoring its DeFi footprint.
          </p>
        </GlassCard>
      ) : isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {addresses.map((a) => (
            <Skeleton key={a} className="h-64 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {balances.map((b, i) => (
            <WalletCard
              key={b.address}
              balance={b}
              onRemove={() => remove(b.address)}
              delay={i * 0.05}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WalletCard({
  balance,
  onRemove,
  delay,
}: {
  balance: WalletBalance;
  onRemove: () => void;
  delay: number;
}) {
  const positive = balance.change24h >= 0;
  return (
    <GlassCard className="p-5" delay={delay}>
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20">
          <Wallet className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-sm font-medium">
            {shortenAddress(balance.address)}
          </p>
          <p className="text-xs text-muted-foreground">
            Last active {timeAgo(balance.lastActivity)}
          </p>
        </div>
        <button
          onClick={onRemove}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-4 flex items-end justify-between rounded-xl bg-secondary/30 p-4">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Portfolio value
          </p>
          <p className="font-display text-2xl font-semibold">
            {formatUSD(balance.totalUSD)}
          </p>
        </div>
        <span
          className={cn(
            "rounded-md px-2 py-1 text-xs font-semibold",
            positive
              ? "bg-success/15 text-success"
              : "bg-destructive/15 text-destructive",
          )}
        >
          {formatPct(balance.change24h)} 24h
        </span>
      </div>

      <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
        Positions
      </p>
      <div className="mb-4 space-y-1.5">
        {balance.positions.map((pos) => (
          <Link
            key={pos.slug + pos.chain}
            to="/protocol/$slug"
            params={{ slug: pos.slug }}
            className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-secondary/40"
          >
            <span className="flex items-center gap-2">
              <span className="font-medium">{pos.protocol}</span>
              <span className="rounded bg-secondary/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {pos.chain}
              </span>
            </span>
            <span className="font-medium">{formatUSD(pos.valueUSD)}</span>
          </Link>
        ))}
      </div>

      <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
        Recent activity
      </p>
      <div className="space-y-1.5">
        {balance.recentEvents.slice(0, 4).map((e) => (
          <div key={e.id} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {e.type.replace("_", " ")} · {e.protocol}
            </span>
            <span className="text-muted-foreground">
              {formatUSD(e.amountUSD)} · {timeAgo(e.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
