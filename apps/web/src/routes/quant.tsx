import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Check,
  Clock3,
  FlaskConical,
  Info,
  Layers3,
  RefreshCw,
  Settings2,
  ShieldAlert,
  SlidersHorizontal,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { GlassCard } from "../components/GlassCard";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { getPerpMarkets, getQuantCandles } from "../lib/api/hawq";
import { fetchCoinGeckoLogos } from "../lib/api/coinGecko";
import { TokenLogo } from "../components/markets/TokenLogo";
import { runBacktest, type StrategyId } from "../lib/quant/backtest";

export const Route = createFileRoute("/quant")({
  head: () => ({
    meta: [
      { title: "Quant Lab — HawQ" },
      {
        name: "description",
        content:
          "Research, backtest and paper trade crypto strategies with historical Hyperliquid data.",
      },
      { property: "og:title", content: "Quant Lab — HawQ" },
      {
        property: "og:description",
        content: "Crypto strategy research and backtesting.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QuantPage,
});

type PaperPosition = {
  coin: string;
  entryPrice: number;
  quantity: number;
  capital: number;
  feeBps: number;
  openedAt: number;
};
type PaperTrade = {
  coin: string;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  openedAt: number;
  closedAt: number;
};
type PaperLedger = { position: PaperPosition | null; trades: PaperTrade[] };
type Range = "30" | "90" | "180";

const STORAGE_KEY = "hawq:quant-paper:v2";
const EMPTY_LEDGER: PaperLedger = { position: null, trades: [] };
const money = (value: number, digits = 2) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: digits,
  }).format(value);
const pct = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
const compactMoney = (value: number) =>
  `$${Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value)}`;
const dateLabel = (value: number) =>
  new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

function Stat({
  label,
  value,
  caption,
  tone = "neutral",
  icon: Icon,
}: {
  label: string;
  value: string;
  caption?: string;
  tone?: "neutral" | "good" | "bad";
  icon?: typeof Activity;
}) {
  return (
    <GlassCard hover={false} className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-primary/80" />}
      </div>
      <p
        className={`mt-3 text-2xl font-semibold tracking-tight tabular-nums ${tone === "good" ? "text-success" : tone === "bad" ? "text-destructive" : "text-foreground"}`}
      >
        {value}
      </p>
      {caption && (
        <p className="mt-1.5 text-xs text-muted-foreground">{caption}</p>
      )}
    </GlassCard>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {children}
      {hint && (
        <span className="block text-[10px] leading-relaxed text-muted-foreground/80">
          {hint}
        </span>
      )}
    </label>
  );
}

function QuantPage() {
  const [coin, setCoin] = useState("BTC");
  const [interval, setInterval] = useState<"1h" | "4h" | "1d">("1h");
  const [range, setRange] = useState<Range>("90");
  const [strategy, setStrategy] = useState<StrategyId>("ema");
  const [fast, setFast] = useState("12");
  const [slow, setSlow] = useState("26");
  const [rsiPeriod, setRsiPeriod] = useState("14");
  const [rsiLow, setRsiLow] = useState("30");
  const [rsiHigh, setRsiHigh] = useState("70");
  const [capital, setCapital] = useState("10000");
  const [feeBps, setFeeBps] = useState("4.5");
  const [slippageBps, setSlippageBps] = useState("2");
  const [paperEntryPrice, setPaperEntryPrice] = useState("");
  const [ledger, setLedger] = useState<PaperLedger>(EMPTY_LEDGER);
  const [ledgerReady, setLedgerReady] = useState(false);
  const [activeTab, setActiveTab] = useState("performance");

  const markets = useQuery({
    queryKey: ["hawq-perps-markets"],
    queryFn: getPerpMarkets,
    refetchInterval: 15_000,
    staleTime: 10_000,
    retry: 1,
  });
  const marketSymbols = (markets.data ?? []).map((item) =>
    item.symbol.replace(/-PERP$/i, "").toUpperCase(),
  );
  const logos = useQuery({
    queryKey: ["quant-token-logos", marketSymbols],
    queryFn: () => fetchCoinGeckoLogos(marketSymbols),
    enabled: marketSymbols.length > 0,
    staleTime: 6 * 60 * 60_000,
    retry: 0,
  });
  const history = useQuery({
    queryKey: ["hawq-quant-candles", coin, interval, range],
    queryFn: () => getQuantCandles(coin, interval, Number(range)),
    staleTime: 60_000,
    retry: 1,
  });

  const barsPerYear =
    interval === "1h" ? 24 * 365 : interval === "4h" ? 6 * 365 : 365;
  const intervalMs =
    interval === "1h" ? 3_600_000 : interval === "4h" ? 14_400_000 : 86_400_000;
  const values = useMemo(
    () =>
      history.data &&
      runBacktest(history.data.candles, history.data.fundingRates, {
        strategy,
        fastPeriod: Number(fast),
        slowPeriod: Number(slow),
        rsiPeriod: Number(rsiPeriod),
        rsiLower: Number(rsiLow),
        rsiUpper: Number(rsiHigh),
        initialCapital: Number(capital),
        feeBps: Number(feeBps),
        slippageBps: Number(slippageBps),
        barsPerYear,
        intervalMs,
      }),
    [
      history.data,
      strategy,
      fast,
      slow,
      rsiPeriod,
      rsiLow,
      rsiHigh,
      capital,
      feeBps,
      slippageBps,
      barsPerYear,
      intervalMs,
    ],
  );
  const holdoutStart = Math.max(
    strategy === "ema" ? Number(slow) : Number(rsiPeriod),
    Math.floor((history.data?.candles.length ?? 0) * 0.7),
  );
  const holdout = useMemo(
    () =>
      history.data &&
      runBacktest(history.data.candles, history.data.fundingRates, {
        strategy,
        fastPeriod: Number(fast),
        slowPeriod: Number(slow),
        rsiPeriod: Number(rsiPeriod),
        rsiLower: Number(rsiLow),
        rsiUpper: Number(rsiHigh),
        initialCapital: Number(capital),
        feeBps: Number(feeBps),
        slippageBps: Number(slippageBps),
        barsPerYear,
        intervalMs,
        evaluationStartIndex: holdoutStart,
      }),
    [
      history.data,
      strategy,
      fast,
      slow,
      rsiPeriod,
      rsiLow,
      rsiHigh,
      capital,
      feeBps,
      slippageBps,
      barsPerYear,
      intervalMs,
      holdoutStart,
    ],
  );
  const holdoutReady = (history.data?.candles.length ?? 0) - holdoutStart >= 30;

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as PaperLedger;
        if (Array.isArray(parsed.trades))
          setLedger({
            position: parsed.position ?? null,
            trades: parsed.trades.slice(0, 30),
          });
      }
    } catch {
      setLedger(EMPTY_LEDGER);
    } finally {
      setLedgerReady(true);
    }
  }, []);
  useEffect(() => {
    if (ledgerReady)
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ledger));
  }, [ledger, ledgerReady]);

  const openPosition = ledger.position;
  const livePrice = openPosition
    ? markets.data?.find(
        (item) => item.symbol.replace(/-PERP$/i, "") === openPosition.coin,
      )?.markPrice
    : undefined;
  const livePnl =
    openPosition && livePrice !== undefined
      ? openPosition.quantity * (livePrice - openPosition.entryPrice) -
        (openPosition.capital * openPosition.feeBps) / 10_000
      : undefined;

  const openPaper = () => {
    const market = markets.data?.find(
      (item) => item.symbol.replace(/-PERP$/i, "") === coin,
    );
    const size = Number(capital);
    const entryPrice = Number(paperEntryPrice);
    if (
      !market ||
      !values ||
      values.currentSignal === 0 ||
      !Number.isFinite(size) ||
      size <= 0 ||
      !Number.isFinite(entryPrice) ||
      entryPrice <= 0
    )
      return;
    const direction = values.currentSignal;
    setLedger((old) => ({
      ...old,
      position: {
        coin,
        entryPrice,
        quantity: (direction * size) / entryPrice,
        capital: size,
        feeBps: Number(feeBps),
        openedAt: Date.now(),
      },
    }));
  };
  const closePaper = () => {
    const position = ledger.position;
    if (!position || livePrice === undefined) return;
    const exitFee =
      (Math.abs(position.quantity * livePrice) * position.feeBps) / 10_000;
    const pnl =
      position.quantity * (livePrice - position.entryPrice) -
      (position.capital * position.feeBps) / 10_000 -
      exitFee;
    setLedger((old) => ({
      position: null,
      trades: [
        {
          coin: position.coin,
          entryPrice: position.entryPrice,
          exitPrice: livePrice,
          pnl,
          openedAt: position.openedAt,
          closedAt: Date.now(),
        },
        ...old.trades,
      ].slice(0, 30),
    }));
  };

  const market = markets.data?.find(
    (item) => item.symbol.replace(/-PERP$/i, "") === coin,
  );
  const logo = logos.data?.[coin];
  const signal = values?.currentSignal ?? 0;
  const warmupReady =
    strategy === "ema"
      ? Number(slow) < (history.data?.candles.length ?? 0)
      : Number(rsiPeriod) < (history.data?.candles.length ?? 0);
  const validParameters =
    strategy === "ema"
      ? Number.isInteger(Number(fast)) &&
        Number.isInteger(Number(slow)) &&
        Number(fast) >= 2 &&
        Number(slow) > Number(fast)
      : Number.isInteger(Number(rsiPeriod)) &&
        Number(rsiPeriod) >= 2 &&
        Number(rsiLow) > 0 &&
        Number(rsiHigh) < 100 &&
        Number(rsiLow) < 50 &&
        Number(rsiHigh) > 50;
  const validPortfolio =
    Number.isFinite(Number(capital)) &&
    Number(capital) > 0 &&
    Number.isFinite(Number(feeBps)) &&
    Number(feeBps) >= 0 &&
    Number.isFinite(Number(slippageBps)) &&
    Number(slippageBps) >= 0;
  const chart =
    values?.equity.map((point) => ({ ...point, day: dateLabel(point.time) })) ??
    [];
  const priceChart =
    history.data?.candles.map((bar) => ({
      time: bar.time,
      price: bar.close,
      day: dateLabel(bar.time),
    })) ?? [];
  const lastBar = history.data?.candles.at(-1);
  const currentSignalText =
    signal === 1 ? "LONG" : signal === -1 ? "SHORT" : "FLAT";
  const strategyName = strategy === "ema" ? "EMA trend" : "RSI reversion";

  return (
    <main className="space-y-6 py-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <FlaskConical className="h-4 w-4" /> HawQ Research
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-gradient">Quant Lab</span>
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            Build a hypothesis, test it against market history, and inspect the
            risk before paper trading.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="gap-1.5 border-border/70 bg-secondary/40 px-3 py-1.5 text-[11px] text-muted-foreground"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> HYPERLIQUID
            DATA
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void history.refetch()}
            disabled={history.isFetching}
            className="gap-2"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${history.isFetching ? "animate-spin" : ""}`}
            />{" "}
            Refresh
          </Button>
        </div>
      </header>

      <GlassCard
        hover={false}
        strong
        className="overflow-hidden border-primary/20 p-4 sm:p-5"
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <TokenLogo
              symbol={coin}
              logoUrl={logo}
              className="h-12 w-12 rounded-2xl border border-border/70 bg-background/60"
            />
            <div className="min-w-[130px]">
              <p className="text-xs text-muted-foreground">
                Researching market
              </p>
              <select
                value={coin}
                onChange={(event) => {
                  setCoin(event.target.value);
                  setPaperEntryPrice("");
                }}
                className="mt-0.5 cursor-pointer bg-transparent text-lg font-semibold outline-none"
              >
                {(markets.data?.length
                  ? markets.data.map((item) =>
                      item.symbol.replace(/-PERP$/i, "").toUpperCase(),
                    )
                  : ["BTC", "ETH", "SOL", "HYPE"]
                ).map((symbol) => (
                  <option key={symbol} value={symbol}>
                    {symbol}-PERP
                  </option>
                ))}
              </select>
            </div>
            <div className="hidden h-10 w-px bg-border sm:block" />
            <div>
              <p className="text-xs text-muted-foreground">Hyperliquid mark</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">
                {market
                  ? money(market.markPrice, market.markPrice < 1 ? 5 : 2)
                  : "—"}
              </p>
            </div>
            <div className="hidden h-10 w-px bg-border sm:block" />
            <div>
              <p className="text-xs text-muted-foreground">
                Current model signal
              </p>
              <Badge
                className={`mt-1 ${signal > 0 ? "bg-success/15 text-success hover:bg-success/15" : signal < 0 ? "bg-destructive/15 text-destructive hover:bg-destructive/15" : "bg-secondary text-muted-foreground hover:bg-secondary"}`}
              >
                {signal > 0 ? (
                  <ArrowUpRight className="mr-1 h-3.5 w-3.5" />
                ) : signal < 0 ? (
                  <ArrowDownRight className="mr-1 h-3.5 w-3.5" />
                ) : (
                  <Activity className="mr-1 h-3.5 w-3.5" />
                )}
                {currentSignalText}
              </Badge>
            </div>
            {market && <div className="hidden h-10 w-px bg-border md:block" />}
            {market && (
              <div>
                <p className="text-xs text-muted-foreground">Funding rate</p>
                <p
                  className={`mt-0.5 text-sm font-semibold tabular-nums ${market.fundingRate < 0 ? "text-success" : "text-foreground"}`}
                >
                  {(market.fundingRate * 100).toFixed(4)}%{" "}
                  <span className="text-[10px] font-normal text-muted-foreground">
                    / 8h
                  </span>
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/40 p-1">
            {(["1h", "4h", "1d"] as const).map((value) => (
              <button
                key={value}
                onClick={() => setInterval(value)}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${interval === value ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
              >
                {value.toUpperCase()}
              </button>
            ))}
            <span className="mx-1 h-5 w-px bg-border" />
            {(["30", "90", "180"] as const).map((value) => (
              <button
                key={value}
                onClick={() => setRange(value)}
                className={`rounded-lg px-2.5 py-2 text-xs transition-colors ${range === value ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {value}D
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <GlassCard hover={false} className="p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                <h2 className="font-display font-semibold">Strategy setup</h2>
              </div>
              <Settings2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="space-y-4">
              <Field label="Strategy model">
                <select
                  value={strategy}
                  onChange={(event) =>
                    setStrategy(event.target.value as StrategyId)
                  }
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ema">EMA trend following</option>
                  <option value="rsi">RSI mean reversion</option>
                </select>
              </Field>
              {strategy === "ema" ? (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Fast EMA">
                    <Input
                      type="number"
                      min="2"
                      value={fast}
                      onChange={(event) => setFast(event.target.value)}
                    />
                  </Field>
                  <Field label="Slow EMA">
                    <Input
                      type="number"
                      min="3"
                      value={slow}
                      onChange={(event) => setSlow(event.target.value)}
                    />
                  </Field>
                </div>
              ) : (
                <div className="space-y-3">
                  <Field label="RSI lookback">
                    <Input
                      type="number"
                      min="2"
                      value={rsiPeriod}
                      onChange={(event) => setRsiPeriod(event.target.value)}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Oversold entry">
                      <Input
                        type="number"
                        min="1"
                        max="49"
                        value={rsiLow}
                        onChange={(event) => setRsiLow(event.target.value)}
                      />
                    </Field>
                    <Field label="Overbought entry">
                      <Input
                        type="number"
                        min="51"
                        max="99"
                        value={rsiHigh}
                        onChange={(event) => setRsiHigh(event.target.value)}
                      />
                    </Field>
                  </div>
                </div>
              )}
              <div className="h-px bg-border/70" />
              <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Wallet className="h-3.5 w-3.5" /> BACKTEST & PAPER SETTINGS
              </p>
              <Field label="Starting capital">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    min="1"
                    value={capital}
                    onChange={(event) => setCapital(event.target.value)}
                    className="pl-7"
                  />
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Fee (bps / side)" hint="Your venue tier">
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={feeBps}
                    onChange={(event) => setFeeBps(event.target.value)}
                  />
                </Field>
                <Field label="Slippage (bps)" hint="Estimated per fill">
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={slippageBps}
                    onChange={(event) => setSlippageBps(event.target.value)}
                  />
                </Field>
              </div>
              <p className="rounded-lg bg-secondary/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
                Signals use completed candles and fill at the next bar open.
                Position exposure is capped at 1× equity. Both long and short
                signals are simulated.
              </p>
            </div>
          </GlassCard>

          <GlassCard hover={false} className="p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-warning" />
              <h2 className="font-display font-semibold">Model assumptions</h2>
            </div>
            <div className="space-y-2.5 text-xs text-muted-foreground">
              <div className="flex items-center justify-between gap-2">
                <span>Historical candles</span>
                <Badge variant="secondary" className="font-normal">
                  {history.data?.candles.length.toLocaleString() ?? "—"} bars
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Funding history</span>
                <span
                  className={
                    history.data?.fundingAvailable
                      ? "text-success"
                      : "text-warning"
                  }
                >
                  {history.data?.fundingAvailable
                    ? `${history.data.fundingRates.length} events loaded`
                    : "Unavailable"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Trading costs</span>
                <span>{Number(feeBps) + Number(slippageBps)} bps / side</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Leverage</span>
                <span>1× max</span>
              </div>
            </div>
            {!history.data?.fundingAvailable && (
              <p className="mt-3 rounded-md bg-warning/10 p-2.5 text-[10px] leading-relaxed text-warning">
                Funding history could not be loaded, so this run excludes
                funding payments.
              </p>
            )}
          </GlassCard>
        </aside>

        <section className="min-w-0 space-y-5">
          {history.isPending ? (
            <GlassCard
              hover={false}
              className="grid min-h-[360px] place-items-center p-8 text-sm text-muted-foreground"
            >
              <span className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" /> Loading
                historical market data…
              </span>
            </GlassCard>
          ) : history.isError ? (
            <GlassCard
              hover={false}
              className="grid min-h-[300px] place-items-center p-8 text-center"
            >
              <div>
                <AlertTriangle className="mx-auto mb-3 h-6 w-6 text-warning" />
                <p className="font-semibold">Market history is unavailable</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  The API or Hyperliquid did not return data. Try refreshing in
                  a moment.
                </p>
              </div>
            </GlassCard>
          ) : !validParameters || !validPortfolio ? (
            <GlassCard
              hover={false}
              className="p-8 text-center text-sm text-destructive"
            >
              Check the strategy inputs, capital and execution cost assumptions.
            </GlassCard>
          ) : !warmupReady || !values ? (
            <GlassCard
              hover={false}
              className="p-8 text-center text-sm text-muted-foreground"
            >
              This lookback does not contain enough candles to warm up the
              selected indicators.
            </GlassCard>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                <Stat
                  label="Net return"
                  value={pct(values.totalReturnPct)}
                  caption={`${money(values.finalEquity, 0)} final equity`}
                  tone={values.totalReturnPct >= 0 ? "good" : "bad"}
                  icon={values.totalReturnPct >= 0 ? TrendingUp : TrendingDown}
                />
                <Stat
                  label="CAGR"
                  value={pct(values.cagrPct)}
                  caption={`${range} day sample`}
                  tone={values.cagrPct >= 0 ? "good" : "bad"}
                  icon={Activity}
                />
                <Stat
                  label="Max drawdown"
                  value={`−${values.maxDrawdownPct.toFixed(2)}%`}
                  caption="Peak-to-trough decline"
                  tone="bad"
                  icon={TrendingDown}
                />
                <Stat
                  label="Sharpe ratio"
                  value={values.sharpeRatio.toFixed(2)}
                  caption={`Sortino ${values.sortinoRatio.toFixed(2)} · annualized`}
                  icon={Target}
                />
              </div>

              <GlassCard hover={false} className="min-w-0 p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-lg font-semibold">
                        Portfolio performance
                      </h2>
                      <Badge variant="outline" className="text-[10px]">
                        {strategyName}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Strategy equity versus passive {coin} exposure ·{" "}
                      {interval} bars
                    </p>
                  </div>
                  {lastBar && (
                    <div className="text-right text-xs text-muted-foreground">
                      <p>Last data point</p>
                      <p className="mt-0.5 font-medium text-foreground">
                        {new Date(lastBar.time).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
                <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <i className="h-0.5 w-4 rounded bg-primary" /> Strategy
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <i className="h-0.5 w-4 border-t border-dashed border-muted-foreground" />{" "}
                    Buy & hold
                  </span>
                </div>
                <div className="h-[280px] w-full sm:h-[340px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chart}>
                      <defs>
                        <linearGradient
                          id="quantEquityFill"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="var(--primary)"
                            stopOpacity={0.22}
                          />
                          <stop
                            offset="95%"
                            stopColor="var(--primary)"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        stroke="var(--chart-grid)"
                        strokeDasharray="3 5"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="day"
                        minTickGap={42}
                        tickLine={false}
                        axisLine={false}
                        tick={{
                          fill: "var(--muted-foreground)",
                          fontSize: 10,
                        }}
                      />
                      <YAxis
                        tickFormatter={(value: number) => compactMoney(value)}
                        tickLine={false}
                        axisLine={false}
                        width={64}
                        tick={{
                          fill: "var(--muted-foreground)",
                          fontSize: 10,
                        }}
                      />
                      <Tooltip
                        formatter={(value, name) => [
                          money(Number(value)),
                          name === "strategy"
                            ? `${strategyName} equity`
                            : "Buy & hold",
                        ]}
                        labelFormatter={(label) => String(label)}
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          fontSize: 12,
                          color: "var(--popover-foreground)",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="strategy"
                        stroke="var(--primary)"
                        strokeWidth={2.2}
                        fill="url(#quantEquityFill)"
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="buyAndHold"
                        stroke="var(--muted-foreground)"
                        strokeDasharray="5 5"
                        strokeWidth={1.4}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border/60 pt-4 sm:grid-cols-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Benchmark return
                    </p>
                    <p
                      className={`mt-1 text-sm font-semibold tabular-nums ${values.buyAndHoldEquity >= Number(capital) ? "text-success" : "text-destructive"}`}
                    >
                      {pct(
                        (values.buyAndHoldEquity / Number(capital) - 1) * 100,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Win rate
                    </p>
                    <p className="mt-1 text-sm font-semibold tabular-nums">
                      {values.winRatePct.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Profit factor
                    </p>
                    <p className="mt-1 text-sm font-semibold tabular-nums">
                      {values.profitFactor === null
                        ? "∞"
                        : values.profitFactor.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Avg. trade
                    </p>
                    <p
                      className={`mt-1 text-sm font-semibold tabular-nums ${values.expectancyUsd >= 0 ? "text-success" : "text-destructive"}`}
                    >
                      {money(values.expectancyUsd)}
                    </p>
                  </div>
                </div>
              </GlassCard>

              {holdout && holdoutReady && (
                <GlassCard
                  hover={false}
                  className="border-primary/20 p-4 sm:p-5"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="max-w-sm">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <h2 className="font-display font-semibold">
                          Chronological holdout
                        </h2>
                        <Badge variant="outline" className="text-[10px]">
                          OUT OF SAMPLE
                        </Badge>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                        The last 30% of candles are simulated separately with
                        the same fixed settings. Indicators warm up on prior
                        candles; no parameter search is performed.
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-3 sm:min-w-[390px]">
                      <div className="rounded-lg bg-background/40 p-3">
                        <p className="text-[10px] text-muted-foreground">
                          Holdout return
                        </p>
                        <p
                          className={`mt-1 text-base font-semibold tabular-nums ${holdout.totalReturnPct >= 0 ? "text-success" : "text-destructive"}`}
                        >
                          {pct(holdout.totalReturnPct)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-background/40 p-3">
                        <p className="text-[10px] text-muted-foreground">
                          Holdout Sharpe
                        </p>
                        <p className="mt-1 text-base font-semibold tabular-nums">
                          {holdout.sharpeRatio.toFixed(2)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-background/40 p-3">
                        <p className="text-[10px] text-muted-foreground">
                          Holdout drawdown
                        </p>
                        <p className="mt-1 text-base font-semibold tabular-nums text-destructive">
                          −{holdout.maxDrawdownPct.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              )}
              {holdout && !holdoutReady && (
                <p className="rounded-lg border border-border/60 bg-background/30 p-3 text-xs text-muted-foreground">
                  Use a longer lookback for holdout validation. This sample
                  leaves fewer than 30 candles after indicator warm-up.
                </p>
              )}

              <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
                <GlassCard hover={false} className="min-w-0 p-4 sm:p-5">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="font-display text-lg font-semibold">
                          Backtest analysis
                        </h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Inspect the trades and risk profile behind the curve.
                        </p>
                      </div>
                      <TabsList>
                        <TabsTrigger value="performance" className="text-xs">
                          Risk
                        </TabsTrigger>
                        <TabsTrigger value="trades" className="text-xs">
                          Trades{" "}
                          <span className="ml-1 rounded bg-secondary px-1.5 py-0.5 text-[10px]">
                            {values.trades.length}
                          </span>
                        </TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent value="performance" className="mt-0">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-xl border border-border/60 bg-background/35 p-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <BarChart3 className="h-3.5 w-3.5 text-primary" />{" "}
                            Annualized volatility
                          </div>
                          <p className="mt-2 text-lg font-semibold tabular-nums">
                            {values.volatilityPct.toFixed(2)}%
                          </p>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-background/35 p-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Layers3 className="h-3.5 w-3.5 text-primary" />{" "}
                            Time in market
                          </div>
                          <p className="mt-2 text-lg font-semibold tabular-nums">
                            {values.exposurePct.toFixed(1)}%
                          </p>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-background/35 p-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Wallet className="h-3.5 w-3.5 text-primary" /> Fees
                            paid
                          </div>
                          <p className="mt-2 text-lg font-semibold tabular-nums">
                            {money(values.totalFeesUsd)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-background/35 p-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock3 className="h-3.5 w-3.5 text-primary" />{" "}
                            Funding paid / received
                          </div>
                          <p className="mt-2 text-lg font-semibold tabular-nums">
                            {money(values.totalFundingUsd)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 overflow-hidden rounded-xl border border-border/60">
                        <div className="flex items-center justify-between border-b border-border/60 bg-secondary/30 px-3 py-2.5">
                          <p className="text-xs font-semibold">Drawdown path</p>
                          <p className="text-[10px] text-muted-foreground">
                            Below zero = decline from peak equity
                          </p>
                        </div>
                        <div className="h-[130px] p-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chart}>
                              <CartesianGrid
                                stroke="var(--chart-grid)"
                                strokeDasharray="3 5"
                                vertical={false}
                              />
                              <XAxis dataKey="day" hide />
                              <YAxis
                                tickFormatter={(value: number) => `${value}%`}
                                domain={[
                                  (dataMin: number) => Math.min(dataMin, -1),
                                  0,
                                ]}
                                width={42}
                                tickLine={false}
                                axisLine={false}
                                tick={{
                                  fill: "var(--muted-foreground)",
                                  fontSize: 10,
                                }}
                              />
                              <ReferenceLine y={0} stroke="var(--chart-grid)" />
                              <Tooltip
                                formatter={(value) => [
                                  `${Number(value).toFixed(2)}%`,
                                  "Drawdown",
                                ]}
                                contentStyle={{
                                  background: "var(--popover)",
                                  border: "1px solid var(--border)",
                                  borderRadius: 10,
                                  fontSize: 11,
                                  color: "var(--popover-foreground)",
                                }}
                              />
                              <Area
                                type="monotone"
                                dataKey="drawdown"
                                stroke="var(--destructive)"
                                fill="var(--destructive)"
                                fillOpacity={0.1}
                                isAnimationActive={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="trades" className="mt-0">
                      <div className="max-h-[380px] overflow-auto rounded-xl border border-border/60">
                        <table className="w-full min-w-[600px] text-xs">
                          <thead className="sticky top-0 bg-card">
                            <tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                              <th className="px-3 py-3">Side / market</th>
                              <th className="px-3 py-3">Opened</th>
                              <th className="px-3 py-3">Closed</th>
                              <th className="px-3 py-3 text-right">Entry</th>
                              <th className="px-3 py-3 text-right">Exit</th>
                              <th className="px-3 py-3 text-right">Net P&L</th>
                            </tr>
                          </thead>
                          <tbody>
                            {values.trades
                              .slice()
                              .reverse()
                              .map((trade, index) => (
                                <tr
                                  key={`${trade.entryTime}-${index}`}
                                  className="border-b border-border/40 last:border-0"
                                >
                                  <td className="px-3 py-3">
                                    <span
                                      className={`font-semibold ${trade.side === "Long" ? "text-success" : "text-destructive"}`}
                                    >
                                      {trade.side}
                                    </span>
                                    <span className="ml-1.5 text-muted-foreground">
                                      {coin}-PERP
                                    </span>
                                  </td>
                                  <td className="px-3 py-3 text-muted-foreground">
                                    {new Date(trade.entryTime).toLocaleString()}
                                  </td>
                                  <td className="px-3 py-3 text-muted-foreground">
                                    {new Date(trade.exitTime).toLocaleString()}
                                  </td>
                                  <td className="px-3 py-3 text-right tabular-nums">
                                    {money(trade.entryPrice)}
                                  </td>
                                  <td className="px-3 py-3 text-right tabular-nums">
                                    {money(trade.exitPrice)}
                                  </td>
                                  <td
                                    className={`px-3 py-3 text-right font-semibold tabular-nums ${trade.pnlUsd >= 0 ? "text-success" : "text-destructive"}`}
                                  >
                                    {money(trade.pnlUsd)}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                        {values.trades.length === 0 && (
                          <p className="p-8 text-center text-sm text-muted-foreground">
                            No trades were generated for this sample.
                          </p>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </GlassCard>

                <GlassCard hover={false} className="p-4 sm:p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="font-display text-lg font-semibold">
                        Paper execution
                      </h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Manual simulation · browser-local only
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-warning/40 bg-warning/10 text-warning"
                    >
                      PAPER
                    </Badge>
                  </div>
                  {openPosition ? (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            Open {openPosition.coin}-PERP
                          </span>
                          <span
                            className={`text-xs font-semibold ${openPosition.quantity > 0 ? "text-success" : "text-destructive"}`}
                          >
                            {openPosition.quantity > 0 ? "LONG" : "SHORT"}
                          </span>
                        </div>
                        <p className="mt-1 text-lg font-semibold tabular-nums">
                          {money(
                            Math.abs(
                              openPosition.quantity *
                                (livePrice ?? openPosition.entryPrice),
                            ),
                            0,
                          )}{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            notional
                          </span>
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] text-muted-foreground">
                            Entry
                          </p>
                          <p className="mt-1 text-sm font-medium tabular-nums">
                            {money(openPosition.entryPrice)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">
                            Mark
                          </p>
                          <p className="mt-1 text-sm font-medium tabular-nums">
                            {livePrice === undefined
                              ? "Loading…"
                              : money(livePrice)}
                          </p>
                        </div>
                      </div>
                      <div className="rounded-lg bg-secondary/40 p-3">
                        <p className="text-[10px] text-muted-foreground">
                          Unrealized paper P&L
                        </p>
                        <p
                          className={`mt-1 text-xl font-semibold tabular-nums ${livePnl === undefined ? "" : livePnl >= 0 ? "text-success" : "text-destructive"}`}
                        >
                          {livePnl === undefined ? "—" : money(livePnl)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={closePaper}
                        disabled={livePrice === undefined}
                      >
                        Close simulated position
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-dashed border-border p-4 text-center">
                        <div className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-secondary/60">
                          <Target className="h-4 w-4 text-primary" />
                        </div>
                        <p className="mt-2 text-sm font-medium">
                          No open paper position
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Current {strategyName} signal:{" "}
                          <span
                            className={
                              signal > 0
                                ? "text-success"
                                : signal < 0
                                  ? "text-destructive"
                                  : ""
                            }
                          >
                            {currentSignalText}
                          </span>
                        </p>
                      </div>
                      <Field
                        label="Your simulated entry price (USD)"
                        hint={
                          market
                            ? `Live mark: ${money(market.markPrice)}. Your simulation uses the price you enter.`
                            : "Enter the price you want to model."
                        }
                      >
                        <Input
                          type="number"
                          min="0.00000001"
                          step="any"
                          value={paperEntryPrice}
                          onChange={(event) =>
                            setPaperEntryPrice(event.target.value)
                          }
                          placeholder="Enter your price"
                          inputMode="decimal"
                        />
                      </Field>
                      <Button
                        className="w-full"
                        onClick={openPaper}
                        disabled={
                          !ledgerReady ||
                          !market ||
                          signal === 0 ||
                          !Number.isFinite(Number(paperEntryPrice)) ||
                          Number(paperEntryPrice) <= 0
                        }
                      >
                        Open simulated {signal < 0 ? "short" : "long"}
                      </Button>
                    </div>
                  )}
                  <div className="border-t border-border/60 pt-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold">
                        Recent paper trades
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        {ledger.trades.length}
                      </span>
                    </div>
                    {ledger.trades.length ? (
                      <div className="space-y-2">
                        {ledger.trades.slice(0, 4).map((trade, index) => (
                          <div
                            key={`${trade.closedAt}-${index}`}
                            className="flex items-center justify-between gap-2 text-xs"
                          >
                            <div>
                              <p className="font-medium">{trade.coin}-PERP</p>
                              <p className="mt-0.5 text-[10px] text-muted-foreground">
                                {dateLabel(trade.closedAt)}
                              </p>
                            </div>
                            <span
                              className={`font-semibold tabular-nums ${trade.pnl >= 0 ? "text-success" : "text-destructive"}`}
                            >
                              {money(trade.pnl)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        Closed simulations will show here.
                      </p>
                    )}
                  </div>
                </GlassCard>
              </div>

              <GlassCard hover={false} className="overflow-hidden p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-base font-semibold">
                      {coin} market context
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Historical close price · source: Hyperliquid
                    </p>
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {priceChart.length.toLocaleString()} bars
                  </span>
                </div>
                <div className="h-[110px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={priceChart}>
                      <XAxis dataKey="day" hide />
                      <YAxis domain={["auto", "auto"]} hide />
                      <Tooltip
                        formatter={(value) => [money(Number(value)), "Close"]}
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 10,
                          fontSize: 11,
                          color: "var(--popover-foreground)",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="var(--muted-foreground)"
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </>
          )}
        </section>
      </div>
      <div className="flex items-start gap-2 rounded-xl border border-warning/25 bg-warning/5 p-3 text-[11px] leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
        <p>
          Research tool, not financial advice. The backtest is a simplified
          simulation using OHLCV bars, configurable fees and slippage, and
          historical funding when available. It does not model order-book depth,
          liquidation, queue position, or market impact. Past performance does
          not predict future results.
        </p>
      </div>
    </main>
  );
}
