import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { ChevronRight, CircleDollarSign, Globe2, Search, Trophy } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { usePositions } from "../hooks/usePositions";
import { getPredictionMarkets, type PredictionMarket } from "../lib/api/hawq";

export const Route = createFileRoute("/markets")({
  head: () => ({
    meta: [
      { title: "Predictions — HawQ" },
      { name: "description", content: "Explore live Polymarket prediction markets." },
      { property: "og:title", content: "Predictions — HawQ" },
      { property: "og:description", content: "Explore live Polymarket prediction markets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MarketsPage,
});

const topics = ["Trump", "Fed", "Nobel Prize", "Midterms", "Bitcoin"];
const compactVolume = (volume: number) => Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(volume);

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="flex items-center gap-1 text-base font-semibold">{children}<ChevronRight className="h-4 w-4 text-muted-foreground" /></h2>;
}

function MarketHeading({ market }: { market: PredictionMarket }) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = market.image || market.icon;
  return <div className="flex min-w-0 items-center gap-3">
    {image && !imageFailed ? <img src={image} alt="" className="h-10 w-10 shrink-0 rounded-xl bg-secondary object-cover" onError={() => setImageFailed(true)} /> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><CircleDollarSign className="h-5 w-5" /></span>}
    <p className="min-w-0 flex-1 text-sm font-semibold leading-snug">{market.question}</p>
  </div>;
}

function PriceButton({ side, price, onClick, disabled, compact = false }: { side: string; price: number; onClick: () => void; disabled: boolean; compact?: boolean }) {
  return <Button variant="secondary" size="sm" disabled={disabled} onClick={onClick} className={`${compact ? "h-7 px-2" : "h-9"} rounded-lg ${side === "YES" ? "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 dark:text-rose-300"}`}>
    {side} {Math.round(price * 100)}¢
  </Button>;
}

function MarketsPage() {
  const [category, setCategory] = useState<string>("all");
  const [region, setRegion] = useState("all");
  const [size, setSize] = useState("100");
  const [pending, setPending] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [search, setSearch] = useState("");
  const markets = useQuery({
    queryKey: ["hawq-predictions-markets", category, region],
    queryFn: () => getPredictionMarkets(category, region),
    refetchInterval: 15_000,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
  const liveMarkets = useQuery({
    queryKey: ["hawq-predictions-markets", "all", region],
    queryFn: () => getPredictionMarkets("all", region),
    refetchInterval: 15_000,
    staleTime: 10_000,
    retry: 1,
  });
  const { log } = usePositions();
  const allMarkets = markets.data ?? [];
  const sportsMarkets = (liveMarkets.data ?? []).filter((market) => market.category === "sports").slice(0, 6);
  const visibleMarkets = allMarkets.filter((market) => {
    const text = market.question.toLowerCase();
    return (!topic || text.includes(topic.toLowerCase())) && (!search || text.includes(search.toLowerCase()));
  });

  const buy = async (market: PredictionMarket, side: "yes" | "no") => {
    const usd = Number(size);
    if (!Number.isFinite(usd) || usd <= 0) {
      toast.error("Enter a valid USD size");
      return;
    }
    setPending(market.id);
    try {
      await log({ product: "prediction", venue: "polymarket", symbolOrMarket: market.id, side, sizeUsd: usd, entryPrice: side === "yes" ? market.yesPrice : market.noPrice, isTestnet: true });
      toast.success(`${side.toUpperCase()} demo position logged`, { description: `${market.question} · $${usd.toLocaleString()} · simulated, not a real trade.` });
    } catch {
      toast.error("Could not log the demo position. Please try again.");
    } finally {
      setPending(null);
    }
  };

  return <main className="mx-auto w-full space-y-7 py-4 sm:py-6">
    <header className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Predictions</h1><p className="mt-1 text-xs text-muted-foreground">Explore what the world is predicting</p></div>
        <Link to="/my-positions" className="rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10">Positions</Link>
      </div>
      <label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search predictions" className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50" /></label>
    </header>

    {sportsMarkets.length > 0 && <section className="space-y-3">
      <SectionTitle>Popular sports</SectionTitle>
      <div className="flex snap-x gap-3 overflow-x-auto pb-2">
        {sportsMarkets.map((market) => <article key={market.id} className="w-[min(82vw,330px)] shrink-0 snap-start rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
          <MarketHeading market={market} />
          <div className="my-4 flex items-center justify-between text-xs text-muted-foreground"><span className="capitalize">{market.category}</span><span>{compactVolume(market.volume)} vol.</span></div>
          <div className="grid grid-cols-2 gap-2"><PriceButton side="YES" price={market.yesPrice} onClick={() => buy(market, "yes")} disabled={pending !== null} /><PriceButton side="NO" price={market.noPrice} onClick={() => buy(market, "no")} disabled={pending !== null} /></div>
        </article>)}
      </div>
    </section>}

    <section className="space-y-3">
      <SectionTitle>Categories</SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        {([["politics", "Politics", Globe2], ["sports", "Sports", Trophy], ["finance", "Crypto", CircleDollarSign]] as const).map(([value, label, Icon]) => <button key={value} onClick={() => { setCategory(value); setTopic(""); }} className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border p-3 text-xs font-medium transition ${category === value ? "border-primary/40 bg-primary/10" : "border-transparent bg-secondary/60 hover:bg-secondary"}`}><Icon className="h-4 w-4" />{label}</button>)}
      </div>
    </section>

    <section className="space-y-3">
      <SectionTitle>Popular today</SectionTitle>
      <div className="flex flex-wrap gap-2">{topics.map((item) => <button key={item} onClick={() => { setTopic(topic === item ? "" : item); setCategory("all"); }} className={`rounded-full px-3 py-1.5 text-xs ${topic === item ? "bg-primary text-primary-foreground" : "bg-secondary/70 hover:bg-secondary"}`}>{item}</button>)}</div>
    </section>

    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle>Trending</SectionTitle>
        <div className="flex items-center gap-2">
          <select aria-label="Region" value={region} onChange={(event) => setRegion(event.target.value)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"><option value="all">All regions</option><option value="nigeria">Nigeria</option></select>
          <Input aria-label="Position size in USD" type="number" min="0.01" step="any" value={size} onChange={(event) => setSize(event.target.value)} className="h-8 w-24 text-xs" />
        </div>
      </div>
      {markets.isLoading ? <p className="py-10 text-center text-muted-foreground">Loading markets…</p> : markets.isError ? <p className="py-10 text-center text-destructive">Markets unavailable. Please try again later.</p> : !visibleMarkets.length ? <p className="py-10 text-center text-muted-foreground">No markets found for this filter.</p> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visibleMarkets.map((market) => <article key={market.id} className="rounded-2xl border border-border/60 bg-card p-3.5 shadow-sm sm:p-4">
          <MarketHeading market={market} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between gap-2 rounded-lg bg-secondary/40 px-2 py-1.5"><span className="text-xs text-muted-foreground">Yes · {Math.round(market.yesPrice * 100)}%</span><PriceButton compact side="YES" price={market.yesPrice} onClick={() => buy(market, "yes")} disabled={pending !== null} /></div>
            <div className="flex items-center justify-between gap-2 rounded-lg bg-secondary/40 px-2 py-1.5"><span className="text-xs text-muted-foreground">No · {Math.round(market.noPrice * 100)}%</span><PriceButton compact side="NO" price={market.noPrice} onClick={() => buy(market, "no")} disabled={pending !== null} /></div>
          </div>
          <div className="mt-3 flex items-center justify-end gap-1 text-[11px] text-muted-foreground">${compactVolume(market.volume)} Vol. <ChevronRight className="h-3 w-3" /></div>
        </article>)}
      </div>}
    </section>
    <Link to="/my-positions" className="inline-block text-sm text-primary hover:underline">View all demo positions →</Link>
  </main>;
}
