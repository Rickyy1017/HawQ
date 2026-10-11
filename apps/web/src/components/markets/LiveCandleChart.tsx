import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMarketCandles, type CandleInterval } from "../../lib/api/hawq";
import { Button } from "../ui/button";

type MarketKind = "perp" | "spot";
type RangeOption = {
  label: string;
  interval: CandleInterval;
  days: number;
  lookbackMs: number;
};

const RANGES: RangeOption[] = [
  { label: "1H", interval: "1m", days: 1, lookbackMs: 60 * 60_000 },
  { label: "1D", interval: "5m", days: 1, lookbackMs: 24 * 60 * 60_000 },
  { label: "1W", interval: "1h", days: 7, lookbackMs: 7 * 24 * 60 * 60_000 },
  { label: "1M", interval: "4h", days: 30, lookbackMs: 30 * 24 * 60 * 60_000 },
  {
    label: "6M",
    interval: "1d",
    days: 180,
    lookbackMs: 180 * 24 * 60 * 60_000,
  },
];

const chartWidth = 1000;
const chartHeight = 330;
const left = 8;
const right = 82;
const top = 12;
const priceBottom = 240;
const volumeTop = 258;
const volumeBottom = 298;
const axisBottom = 322;

function priceText(value: number) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: value < 1 ? 6 : value < 100 ? 4 : 2,
  });
}

function CandleSvg({
  candles,
}: {
  candles: Awaited<ReturnType<typeof getMarketCandles>>;
}) {
  const visible = candles.slice(-100);
  if (!visible.length) return null;
  const low = Math.min(...visible.map((candle) => candle.low));
  const high = Math.max(...visible.map((candle) => candle.high));
  const padding = Math.max((high - low) * 0.08, high * 0.001);
  const minPrice = Math.max(0, low - padding);
  const maxPrice = high + padding;
  const priceRange = maxPrice - minPrice || 1;
  const maxVolume = Math.max(...visible.map((candle) => candle.volume), 1);
  const plotWidth = chartWidth - right - left;
  const slot = plotWidth / visible.length;
  const bodyWidth = Math.max(2, Math.min(10, slot * 0.64));
  const yFor = (price: number) =>
    top + ((maxPrice - price) / priceRange) * (priceBottom - top);
  const volumeFor = (volume: number) =>
    volumeBottom - (volume / maxVolume) * (volumeBottom - volumeTop);
  const last = visible[visible.length - 1]!;
  const isPositive = last.close >= last.open;
  const color = isPositive ? "var(--success)" : "var(--destructive)";

  return (
    <svg
      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      preserveAspectRatio="none"
      className="h-full w-full overflow-visible"
      role="img"
      aria-label={`Candlestick price chart, latest close ${priceText(last.close)}`}
    >
      {[0, 1, 2, 3].map((step) => {
        const y = top + ((priceBottom - top) / 3) * step;
        const price = maxPrice - (priceRange / 3) * step;
        return (
          <g key={step}>
            <line
              x1={left}
              x2={chartWidth - right + 8}
              y1={y}
              y2={y}
              stroke="var(--chart-grid)"
              strokeDasharray="3 6"
              strokeOpacity="0.7"
            />
            <text
              x={chartWidth - right + 16}
              y={y + 4}
              fill="var(--muted-foreground)"
              fontSize="12"
            >
              {priceText(price)}
            </text>
          </g>
        );
      })}
      {visible.map((candle, index) => {
        const x = left + slot * index + slot / 2;
        const up = candle.close >= candle.open;
        const candleColor = up
          ? "var(--success)"
          : "var(--destructive)";
        const openY = yFor(candle.open);
        const closeY = yFor(candle.close);
        const bodyY = Math.min(openY, closeY);
        const bodyHeight = Math.max(Math.abs(closeY - openY), 1.4);
        return (
          <g key={candle.time}>
            <title>
              {`${new Date(candle.time).toLocaleString()} · O ${priceText(candle.open)} · H ${priceText(candle.high)} · L ${priceText(candle.low)} · C ${priceText(candle.close)}`}
            </title>
            <line
              x1={x}
              x2={x}
              y1={yFor(candle.high)}
              y2={yFor(candle.low)}
              stroke={candleColor}
              strokeWidth="1.5"
            />
            <rect
              x={x - bodyWidth / 2}
              y={bodyY}
              width={bodyWidth}
              height={bodyHeight}
              rx="1"
              fill={candleColor}
            />
            <rect
              x={x - bodyWidth / 2}
              y={volumeFor(candle.volume)}
              width={bodyWidth}
              height={volumeBottom - volumeFor(candle.volume)}
              fill={candleColor}
              opacity="0.45"
            />
          </g>
        );
      })}
      <line
        x1={left}
        x2={chartWidth - right + 8}
        y1={yFor(last.close)}
        y2={yFor(last.close)}
        stroke={color}
        strokeDasharray="5 5"
        strokeOpacity="0.8"
      />
      <text
        x={chartWidth - right + 16}
        y={Math.min(Math.max(yFor(last.close) - 6, top + 12), priceBottom - 4)}
        fill={color}
        fontSize="12"
        fontWeight="600"
      >
        {priceText(last.close)}
      </text>
      <line
        x1={left}
        x2={chartWidth - right + 8}
        y1={volumeTop}
        y2={volumeTop}
        stroke="var(--chart-grid)"
        strokeOpacity="0.55"
      />
      {[visible[0], visible[Math.floor(visible.length / 2)], last].map(
        (candle, index) =>
          candle && (
            <text
              key={`${candle.time}-${index}`}
              x={
                left +
                slot *
                  (index === 0
                    ? 0.5
                    : index === 1
                      ? visible.length / 2
                      : visible.length - 0.5)
              }
              y={axisBottom}
              textAnchor={
                index === 0 ? "start" : index === 2 ? "end" : "middle"
              }
              fill="var(--muted-foreground)"
              fontSize="11"
            >
              {new Date(candle.time).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </text>
          ),
      )}
    </svg>
  );
}

export function LiveCandleChart({
  symbol,
  kind,
}: {
  symbol: string;
  kind: MarketKind;
}) {
  const [rangeLabel, setRangeLabel] = useState("1D");
  const range = RANGES.find((item) => item.label === rangeLabel) ?? RANGES[1]!;
  const candlesQuery = useQuery({
    queryKey: ["market-candles", kind, symbol, range.interval, range.days],
    queryFn: () => getMarketCandles(symbol, range.interval, range.days, kind),
    refetchInterval: 15_000,
    staleTime: 10_000,
    retry: 1,
  });
  const candles = useMemo(() => {
    const data = candlesQuery.data ?? [];
    if (!data.length) return data;
    const from = Date.now() - range.lookbackMs;
    return data.filter((candle) => candle.time >= from);
  }, [candlesQuery.data, range.lookbackMs]);
  const current = candles[candles.length - 1];
  const first = candles[0];
  const change =
    current && first ? ((current.close - first.open) / first.open) * 100 : 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card/70">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-3 py-3 sm:px-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {kind === "perp" ? "Perpetual" : "Spot"} chart · live data
          </p>
          {current && (
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-lg font-semibold tabular-nums">
                ${priceText(current.close)}
              </span>
              <span
                className={`text-xs font-semibold tabular-nums ${change >= 0 ? "text-success" : "text-destructive"}`}
              >
                {change >= 0 ? "+" : ""}
                {change.toFixed(2)}%
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-0.5 rounded-lg bg-secondary/50 p-1">
          {RANGES.map((item) => (
            <Button
              key={item.label}
              type="button"
              variant={rangeLabel === item.label ? "secondary" : "ghost"}
              size="sm"
              className="h-7 min-w-9 rounded-md px-2 text-[10px]"
              onClick={() => setRangeLabel(item.label)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="relative h-[260px] px-2 py-3 sm:h-[350px] sm:px-3">
        {candlesQuery.isLoading ? (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            Loading live candles...
          </div>
        ) : candlesQuery.isError ? (
          <div className="grid h-full place-items-center px-4 text-center text-sm text-muted-foreground">
            Candle history is temporarily unavailable. Market prices will keep
            refreshing.
          </div>
        ) : candles.length ? (
          <CandleSvg candles={candles} />
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            No candle history is available for this market yet.
          </div>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-border/50 px-3 py-2 text-[10px] text-muted-foreground sm:px-4">
        <span>Volume</span>
        <span>Updates every 15 seconds · Hyperliquid</span>
      </div>
    </section>
  );
}
