import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { toast } from "sonner";
import {
  ChevronRight,
  CircleDollarSign,
  Globe2,
  Plus,
  Search,
  ShieldCheck,
  Trophy,
  WalletCards,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { usePositions } from "../hooks/usePositions";
import {
  createHawqMarket,
  createHawqMarketsBatch,
  getHawqAdminMarkets,
  getPredictionMarkets,
  resolveHawqMarket,
  updateHawqMarketImage,
  type HawqAdminMarket,
  type PredictionMarket,
} from "../lib/api/hawq";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

export const Route = createFileRoute("/markets")({
  head: () => ({
    meta: [
      { title: "Predictions — HawQ" },
      {
        name: "description",
        content: "Explore HawQ community forecasts and live Polymarket markets.",
      },
      { property: "og:title", content: "Predictions — HawQ" },
      {
        property: "og:description",
        content: "Explore HawQ community forecasts and live Polymarket markets.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MarketsPage,
});

const compactVolume = (volume: number) =>
  Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(volume);

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-1 text-base font-semibold">
      {children}
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </h2>
  );
}

function MarketHeading({ market }: { market: PredictionMarket }) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = market.image || market.icon;
  return (
    <div className="flex min-w-0 items-center gap-3">
      {image && !imageFailed ? (
        <img
          src={image}
          alt=""
          className="h-10 w-10 shrink-0 rounded-xl bg-secondary object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
          <CircleDollarSign className="h-5 w-5" />
        </span>
      )}
      <p className="min-w-0 flex-1 text-sm font-semibold leading-snug">
        {market.question}
      </p>
    </div>
  );
}

function artworkForMarket(market: HawqAdminMarket) {
  if (market.category === "politics") {
    if (market.question.includes("outside the APC and PDP")) return "https://pbs.twimg.com/profile_images/1962564103559368705/P8L3ibiF.jpg";
    if (market.question.includes("APC")) return "https://cdn.legit.ng/tags/600x600/a0da72ecbc113504.jpeg?v=1";
    if (market.question.includes("PDP")) return "https://static.africa-press.net/nigeria/sites/3/2022/01/img-61e57a39f2ba1.jpg";
    return "https://pbs.twimg.com/profile_images/1962564103559368705/P8L3ibiF.jpg";
  }
  if (market.category === "finance") {
    if (market.question.startsWith("Will the NGX")) return "https://d1jcea4y7xhp7l.cloudfront.net/2021/04/NGX-Logo.png";
    if (market.question.startsWith("Will the CBN's official USD/NGN")) return "https://s3-ap-southeast-1.amazonaws.com/mint-news/buy-nigerian-polymer-banknote.jpg";
    return "https://getpocketmoni.com/images/cbn.png";
  }
  if (market.category === "sports") {
    return market.question.startsWith("Will Nigeria's Super Falcons")
      ? "https://www.classicfootballshirts.co.uk/cdn-cgi/image/fit%3Dpad%2Cq%3D80%2Cw%3D1000%2Ch%3D1000%2Cf%3Dwebp/pub/media/catalog/product/1/0/100425505872-1_s3s2psavmapny8mg.jpg"
      : "https://s.yimg.com/os/en/foot_africa_articles_352/de010fbfd162ad7e2408c01496943651";
  }
  return market.question.includes("Oscar")
    ? "https://cdns.klimg.com/kapanlagi.com/p/paging/academy-awards-ke-99-digelar-1-1-16e7c.jpg"
    : "https://datg-cms-source-repo.s3.amazonaws.com/ABC/ComingSoon/grammys2027/277b20e8-2cf2-4f53-b3c4-edf0347073e9.jpg";
}

function PriceButton({
  side,
  price,
  onClick,
  disabled,
  compact = false,
}: {
  side: string;
  price: number;
  onClick: () => void;
  disabled: boolean;
  compact?: boolean;
}) {
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={disabled}
      onClick={onClick}
      className={`${compact ? "h-7 px-2" : "h-9"} rounded-lg ${side === "YES" ? "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 dark:text-rose-300"}`}
    >
      {side} {Math.round(price * 100)}¢
    </Button>
  );
}

function MarketsPage() {
  const [category, setCategory] = useState<string>("all");
  const [region, setRegion] = useState("nigeria");
  const [createOpen, setCreateOpen] = useState(false);
  const [size, setSize] = useState("100");
  const [pending, setPending] = useState<string | null>(null);
  const [betSelection, setBetSelection] = useState<{
    market: PredictionMarket;
    side: "yes" | "no";
  } | null>(null);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
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
  const sportsMarkets = (liveMarkets.data ?? [])
    .filter((market) => market.category === "sports")
    .slice(0, 6);
  const visibleMarkets = allMarkets.filter((market) => {
    const text = market.question.toLowerCase();
    return !search || text.includes(search.toLowerCase());
  });

  const buy = async (market: PredictionMarket, side: "yes" | "no") => {
    const usd = Number(size);
    if (!Number.isFinite(usd) || usd <= 0) {
      toast.error("Enter a valid USD size");
      return false;
    }
    setPending(market.id);
    try {
      await log({
        product: "prediction",
        venue: market.venue,
        symbolOrMarket: market.id,
        side,
        sizeUsd: usd,
        entryPrice: side === "yes" ? market.yesPrice : market.noPrice,
        isTestnet: true,
      });
      toast.success(`${side.toUpperCase()} demo position logged`, {
        description: `${market.question} · $${usd.toLocaleString()} · simulated, not a real trade.`,
      });
      return true;
    } catch {
      toast.error("Could not log the demo position. Please try again.");
      return false;
    } finally {
      setPending(null);
    }
  };

  const confirmBet = async () => {
    if (!betSelection) return;
    if (await buy(betSelection.market, betSelection.side))
      setBetSelection(null);
  };
  const selectedPrice = betSelection
    ? betSelection.side === "yes"
      ? betSelection.market.yesPrice
      : betSelection.market.noPrice
    : 0;
  const stake = Number(size);
  const estimatedShares =
    selectedPrice > 0 && Number.isFinite(stake) && stake > 0
      ? stake / selectedPrice
      : 0;

  return (
    <main className="mx-auto w-full space-y-7 py-4 sm:py-6">
      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Predictions</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Nigerian community forecasts and global prediction markets
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Create market
            </Button>
            <Link to="/my-positions" className="rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10">
              Positions
            </Link>
          </div>
        </div>
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search predictions"
            className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
          />
        </label>
      </header>

      {sportsMarkets.length > 0 && (
        <section className="space-y-3">
          <SectionTitle>Popular sports</SectionTitle>
          <div className="flex snap-x gap-3 overflow-x-auto pb-2">
            {sportsMarkets.map((market) => (
              <article
                key={market.id}
                className="w-[min(82vw,330px)] shrink-0 snap-start rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
              >
              <MarketHeading market={market} />
                <div className="my-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="capitalize">{market.category}</span>
                  <span>{compactVolume(market.volume)} vol.</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <PriceButton
                    side="YES"
                    price={market.yesPrice}
                    onClick={() => setBetSelection({ market, side: "yes" })}
                    disabled={pending !== null}
                  />
                  <PriceButton
                    side="NO"
                    price={market.noPrice}
                    onClick={() => setBetSelection({ market, side: "no" })}
                    disabled={pending !== null}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <SectionTitle>Categories</SectionTitle>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(
            [
              ["politics", "Politics", Globe2],
              ["sports", "Sports", Trophy],
              ["finance", "Finance", CircleDollarSign],
              ["entertainment", "Entertainment", WalletCards],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              onClick={() => {
                setCategory(value);
              }}
              className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border p-3 text-xs font-medium transition ${category === value ? "border-primary/40 bg-primary/10" : "border-transparent bg-secondary/60 hover:bg-secondary"}`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle>{region === "nigeria" ? "Nigeria markets" : "Trending"}</SectionTitle>
          <div className="flex items-center gap-2">
            <select
              aria-label="Region"
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
            >
              <option value="all">All regions</option>
              <option value="nigeria">Nigeria</option>
            </select>
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
        ) : !visibleMarkets.length ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 px-5 py-10 text-center">
            <p className="font-medium">
              {region === "nigeria" && category === "all" && !search
                ? "No Nigeria markets have been published yet."
                : "No markets found for this filter."}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              HawQ markets are created with a real event, an image, and a resolution source. Picks are simulated and do not use real money.
            </p>
            {region === "nigeria" && category === "all" && !search && (
              <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> Create the first market
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleMarkets.map((market) => (
              <article
                key={market.id}
                className="rounded-2xl border border-border/60 bg-card p-3.5 shadow-sm sm:p-4"
              >
                <MarketHeading market={market} />
                <div className="mt-2 flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${market.venue === "hawq" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
                    {market.venue === "hawq" ? "HawQ community" : "Polymarket"}
                  </span>
                  <span className="text-[10px] capitalize text-muted-foreground">{market.category}</span>
                </div>
                {market.description && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{market.description}</p>}
                {market.venue === "hawq" && market.resolutionSource && (
                  <a href={market.resolutionSource} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-primary hover:underline">
                    View resolution source
                  </a>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-secondary/40 px-2 py-1.5">
                    <span className="text-xs text-muted-foreground">
                      Yes · {Math.round(market.yesPrice * 100)}%
                    </span>
                    <PriceButton
                      compact
                      side="YES"
                      price={market.yesPrice}
                      onClick={() => setBetSelection({ market, side: "yes" })}
                      disabled={pending !== null}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-secondary/40 px-2 py-1.5">
                    <span className="text-xs text-muted-foreground">
                      No · {Math.round(market.noPrice * 100)}%
                    </span>
                    <PriceButton
                      compact
                      side="NO"
                      price={market.noPrice}
                      onClick={() => setBetSelection({ market, side: "no" })}
                      disabled={pending !== null}
                    />
                  </div>
                </div>
                {market.venue === "hawq" && market.volume === 0 && (
                  <p className="mt-2 text-[10px] text-muted-foreground">No picks yet · 50% neutral opening price</p>
                )}
                <div className="mt-3 flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
                  ${compactVolume(market.volume)} Vol.{" "}
                  <ChevronRight className="h-3 w-3" />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <Link
        to="/my-positions"
        className="inline-block text-sm text-primary hover:underline"
      >
        View all demo positions →
      </Link>
      <Dialog
        open={betSelection !== null}
        onOpenChange={(open) => {
          if (!open && pending === null) setBetSelection(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto rounded-2xl p-5 sm:p-6">
          {betSelection && (
            <>
              <DialogHeader className="pr-7 text-left">
                <DialogTitle className="text-xl">
                  Review your prediction
                </DialogTitle>
                <DialogDescription>
                  Check your pick and amount before confirming.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-xl border border-border/70 bg-secondary/30 p-3.5">
                <MarketHeading market={betSelection.market} />
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/60 pt-3 text-sm">
                  <span className="text-muted-foreground">Your pick</span>
                  <span
                    className={`font-semibold ${betSelection.side === "yes" ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"}`}
                  >
                    {betSelection.side.toUpperCase()} at{" "}
                    {Math.round(selectedPrice * 100)}¢
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="prediction-stake"
                  className="text-sm font-medium"
                >
                  Simulated stake
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="prediction-stake"
                    type="number"
                    min="1"
                    step="any"
                    inputMode="decimal"
                    value={size}
                    onChange={(event) => setSize(event.target.value)}
                    className="h-12 pl-8 text-lg font-semibold tabular-nums"
                    autoFocus
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {[10, 25, 50, 100].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setSize(String(amount))}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${size === String(amount) ? "border-primary/50 bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground hover:bg-secondary"}`}
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 rounded-xl bg-secondary/40 p-3.5 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    Estimated shares
                  </span>
                  <span className="font-medium tabular-nums">
                    {estimatedShares.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    Payout if correct
                  </span>
                  <span className="font-semibold tabular-nums">
                    ${estimatedShares.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between gap-4 border-t border-border/60 pt-2">
                  <span className="text-muted-foreground">
                    Potential profit
                  </span>
                  <span className="font-semibold tabular-nums text-success">
                    $
                    {Math.max(
                      estimatedShares - (Number.isFinite(stake) ? stake : 0),
                      0,
                    ).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs leading-relaxed text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <p>
                  This is a simulated demo forecast. HawQ records a paper position
                  only; it does not place a real order, transfer funds, or request a wallet signature.
                </p>
              </div>

              <DialogFooter className="gap-2 sm:flex-col-reverse sm:space-x-0">
                <Button
                  variant="outline"
                  onClick={() => setBetSelection(null)}
                  disabled={pending !== null}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmBet}
                  disabled={
                    pending !== null ||
                    !Number.isFinite(stake) ||
                    stake < 1 ||
                    selectedPrice <= 0
                  }
                >
                  <WalletCards className="h-4 w-4" />
                  {pending
                    ? "Recording demo bet…"
                    : `Confirm demo ${betSelection.side.toUpperCase()}`}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      <CreateMarketDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ["hawq-predictions-markets"] })}
      />
    </main>
  );
}

function CreateMarketDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => Promise<unknown>;
}) {
  const [adminKey, setAdminKey] = useState("");
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("politics");
  const [image, setImage] = useState("");
  const [endDate, setEndDate] = useState("");
  const [resolutionSource, setResolutionSource] = useState("");
  const [saving, setSaving] = useState(false);
  const [managedMarkets, setManagedMarkets] = useState<HawqAdminMarket[] | null>(null);
  const [loadingMarkets, setLoadingMarkets] = useState(false);
  const [resolvingMarket, setResolvingMarket] = useState<string | null>(null);
  const [importingPack, setImportingPack] = useState(false);
  const [addingArtwork, setAddingArtwork] = useState(false);
  const [savingImageFor, setSavingImageFor] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  const importStarterPack = async () => {
    setImportingPack(true);
    try {
      const response = await fetch("/nigeria-market-starter-pack.json");
      if (!response.ok) throw new Error("Could not load the Nigeria market starter pack.");
      const pack = await response.json();
      const created = await createHawqMarketsBatch(adminKey, pack);
      toast.success(`${created.length} Nigeria markets published`, {
        description: "They are now in the HawQ database. Apply the matching artwork from this dialog.",
      });
      await onCreated();
      await loadManagedMarkets();
    } catch (error) {
      toast.error("Could not import markets", {
        description: error instanceof Error ? error.message : "Check that the admin key and database migration are ready.",
      });
    } finally {
      setImportingPack(false);
    }
  };

  const loadManagedMarkets = async () => {
    if (!adminKey) return;
    setLoadingMarkets(true);
    try {
      setManagedMarkets(await getHawqAdminMarkets(adminKey));
    } catch (error) {
      toast.error("Could not load HawQ markets", {
        description: error instanceof Error ? error.message : "Check the admin key and try again.",
      });
    } finally {
      setLoadingMarkets(false);
    }
  };

  const addMatchingArtwork = async () => {
    setAddingArtwork(true);
    try {
      const markets = await getHawqAdminMarkets(adminKey);
      const nigeriaMarkets = markets.filter((market) => market.regionTag === "nigeria");
      if (nigeriaMarkets.length === 0) {
        toast.error("No Nigeria markets found", { description: "Publish the starter pack first." });
        return;
      }
      const marketsNeedingArtwork = nigeriaMarkets.filter((market) =>
        !market.image || market.image.includes("/market-artwork/"),
      );
      if (marketsNeedingArtwork.length === 0) {
        toast.success("All Nigeria markets already have artwork.");
        return;
      }
      for (const market of marketsNeedingArtwork) {
        await updateHawqMarketImage(adminKey, market.id, artworkForMarket(market));
      }
      toast.success(`Updated images for ${marketsNeedingArtwork.length} Nigeria markets`, {
        description: "Each market now uses imagery for its specific party, institution, team, or event.",
      });
      await loadManagedMarkets();
      await onCreated();
    } catch (error) {
      toast.error("Could not add market artwork", {
        description: error instanceof Error ? error.message : "Check the admin key and try again.",
      });
    } finally {
      setAddingArtwork(false);
    }
  };

  const resolveMarket = async (market: HawqAdminMarket, outcome: "yes" | "no") => {
    setResolvingMarket(market.id);
    try {
      await resolveHawqMarket(adminKey, market.id, outcome);
      toast.success(`Market resolved ${outcome.toUpperCase()}`, { description: market.question });
      await loadManagedMarkets();
      await onCreated();
    } catch (error) {
      toast.error("Could not resolve market", {
        description: error instanceof Error ? error.message : "Check the market close date and try again.",
      });
    } finally {
      setResolvingMarket(null);
    }
  };

  const saveMarketImage = async (market: HawqAdminMarket) => {
    setSavingImageFor(market.id);
    try {
      await updateHawqMarketImage(adminKey, market.id, imageUrls[market.id]?.trim() || null);
      toast.success("Market artwork updated", { description: market.question });
      setImageUrls((current) => ({ ...current, [market.id]: "" }));
      await loadManagedMarkets();
      await onCreated();
    } catch (error) {
      toast.error("Could not update market artwork", {
        description: error instanceof Error ? error.message : "Use an HTTPS image URL and try again.",
      });
    } finally {
      setSavingImageFor(null);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const created = await createHawqMarket(adminKey, {
        question,
        description,
        category,
        image,
        endDate: new Date(endDate).toISOString(),
        resolutionSource,
      });
      toast.success("HawQ market created", { description: created.question });
      setQuestion("");
      setDescription("");
      setImage("");
      setEndDate("");
      setResolutionSource("");
      onOpenChange(false);
      await onCreated();
      await loadManagedMarkets();
    } catch (error) {
      toast.error("Could not create market", {
        description: error instanceof Error ? error.message : "Check the details and try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto rounded-2xl p-5 sm:p-6">
        <DialogHeader className="text-left">
          <DialogTitle>Create a Nigeria market</DialogTitle>
          <DialogDescription>
            Publish a HawQ play-money forecast with a verifiable resolution source and matching artwork.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Input type="password" autoComplete="current-password" placeholder="HawQ markets admin key" value={adminKey} onChange={(event) => setAdminKey(event.target.value)} required />
          <Input placeholder="Market question" minLength={12} maxLength={240} value={question} onChange={(event) => setQuestion(event.target.value)} required />
          <textarea className="min-h-20 w-full rounded-xl border border-border bg-background p-3 text-sm" placeholder="Context (optional)" maxLength={1200} value={description} onChange={(event) => setDescription(event.target.value)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <select aria-label="Market category" className="h-10 rounded-xl border border-border bg-background px-3 text-sm" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="politics">Politics</option>
              <option value="finance">Finance</option>
              <option value="sports">Sports</option>
              <option value="entertainment">Entertainment</option>
              <option value="other">Other</option>
            </select>
            <Input type="datetime-local" aria-label="Market close date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required />
          </div>
          <Input type="url" placeholder="Market image URL (optional; add later)" value={image} onChange={(event) => setImage(event.target.value)} />
          {image && <img key={image} src={image} alt="Market image preview" className="h-28 w-full rounded-xl bg-secondary object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />}
          <Input type="url" placeholder="Resolution source URL" value={resolutionSource} onChange={(event) => setResolutionSource(event.target.value)} required />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Markets are Nigeria-tagged and use simulated picks only. The admin key is sent to the API for this request and is not saved in browser storage.
          </p>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Creating market…" : "Publish market"}
          </Button>
        </form>
        <section className="space-y-3 border-t border-border pt-4">
          <div className="space-y-2 rounded-xl bg-secondary/50 p-3">
            <p className="text-sm font-medium">Nigeria starter pack · 20 markets</p>
            <p className="text-xs text-muted-foreground">Imports the prepared politics, finance, sports, and entertainment markets into HawQ's database.</p>
            <Button type="button" variant="outline" className="w-full" disabled={!adminKey || importingPack} onClick={importStarterPack}>
              {importingPack ? "Publishing 20 markets…" : "Publish Nigeria starter pack"}
            </Button>
          </div>
          <div className="space-y-2 rounded-xl bg-secondary/50 p-3">
            <p className="text-sm font-medium">Market-specific images</p>
            <p className="text-xs text-muted-foreground">Use recognizable party, CBN, NGX, Super Falcons, AFCON, Grammy, and Oscars images on the matching markets.</p>
            <Button type="button" variant="outline" className="w-full" disabled={!adminKey || addingArtwork} onClick={addMatchingArtwork}>
              {addingArtwork ? "Updating market images…" : "Update Nigeria market images"}
            </Button>
          </div>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Manage HawQ markets</h3>
            <Button type="button" variant="outline" size="sm" onClick={loadManagedMarkets} disabled={!adminKey || loadingMarkets}>
              {loadingMarkets ? "Loading…" : "Load markets"}
            </Button>
          </div>
          {managedMarkets?.length === 0 && <p className="text-xs text-muted-foreground">No HawQ markets yet.</p>}
          {managedMarkets?.map((market) => {
            const isClosed = new Date(market.endDate).getTime() <= Date.now();
            return (
              <div key={market.id} className="flex items-start gap-3 rounded-xl border border-border/70 p-3">
                {market.image ? <img src={market.image} alt="" className="h-11 w-11 shrink-0 rounded-lg bg-secondary object-cover" /> : <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-xs font-bold text-primary">NG</div>}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug">{market.question}</p>
                  <a href={market.resolutionSource} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-primary hover:underline">Resolution source</a>
                  <div className="mt-2 flex gap-2">
                    <Input
                      type="url"
                      aria-label={`Artwork URL for ${market.question}`}
                      placeholder={market.image ? "Replace artwork URL" : "Add artwork URL later"}
                      value={imageUrls[market.id] ?? ""}
                      onChange={(event) => setImageUrls((current) => ({ ...current, [market.id]: event.target.value }))}
                      className="h-8 text-xs"
                    />
                    <Button type="button" size="sm" variant="outline" className="h-8 shrink-0" disabled={!imageUrls[market.id]?.trim() || savingImageFor !== null} onClick={() => saveMarketImage(market)}>
                      {savingImageFor === market.id ? "Saving…" : "Save image"}
                    </Button>
                  </div>
                  <p className="mt-1 text-[11px] capitalize text-muted-foreground">
                    {market.category} · {market.status === "resolved" ? `Resolved ${market.resolvedOutcome?.toUpperCase()}` : isClosed ? "Ready to resolve" : `Closes ${new Date(market.endDate).toLocaleString()}`}
                  </p>
                  {market.status === "open" && isClosed && (
                    <div className="mt-2 flex gap-2">
                      <Button type="button" size="sm" className="h-7" disabled={resolvingMarket !== null} onClick={() => resolveMarket(market, "yes")}>
                        {resolvingMarket === market.id ? "Saving…" : "Resolve Yes"}
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="h-7" disabled={resolvingMarket !== null} onClick={() => resolveMarket(market, "no")}>
                        Resolve No
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      </DialogContent>
    </Dialog>
  );
}
