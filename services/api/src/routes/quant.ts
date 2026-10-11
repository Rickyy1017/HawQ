import type { FastifyInstance } from "fastify";

const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";
const INTERVAL_MS: Record<string, number> = {
  "1m": 60_000,
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
};
const MAX_CANDLES = 5_000;
const PAGE_SIZE = 500;
let spotMarketCache: { expiresAt: number; markets: SpotMarket[] } | null = null;

type SpotMarket = {
  symbol: string;
  candleSymbol: string;
  baseSymbol: string;
  quoteSymbol: string;
  markPrice: number;
  previousPrice: number;
  dayVolume: number;
};

type HyperliquidCandle = {
  t: number;
  T: number;
  s: string;
  i: string;
  o: string;
  h: string;
  l: string;
  c: string;
  v: string;
  n: number;
};

type HyperliquidFundingRate = {
  coin: string;
  fundingRate: string;
  time: number;
};

async function fetchCandlePage(
  coin: string,
  interval: string,
  startTime: number,
  endTime: number,
): Promise<HyperliquidCandle[]> {
  const response = await fetch(HYPERLIQUID_INFO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "candleSnapshot",
      req: { coin, interval, startTime, endTime },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`Hyperliquid candle request failed (${response.status})`);
  }
  return (await response.json()) as HyperliquidCandle[];
}

async function fetchFundingHistory(
  coin: string,
  startTime: number,
  endTime: number,
): Promise<HyperliquidFundingRate[]> {
  const response = await fetch(HYPERLIQUID_INFO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "fundingHistory", coin, startTime, endTime }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`Hyperliquid funding request failed (${response.status})`);
  }
  return (await response.json()) as HyperliquidFundingRate[];
}

async function fetchSpotMarkets(): Promise<SpotMarket[]> {
  if (spotMarketCache && spotMarketCache.expiresAt > Date.now()) {
    return spotMarketCache.markets;
  }
  const response = await fetch(HYPERLIQUID_INFO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "spotMetaAndAssetCtxs" }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(
      `Hyperliquid spot market request failed (${response.status})`,
    );
  }
  const [meta, assetCtxs] = (await response.json()) as [
    {
      tokens: Array<{ name: string }>;
      universe: Array<{
        name: string;
        tokens: [number, number];
        index: number;
        isCanonical: boolean;
      }>;
    },
    Array<{
      markPx: string;
      midPx: string | null;
      prevDayPx: string;
      dayNtlVlm: string;
    }>,
  ];

  const markets = meta.universe
    .map((market) => {
      const [baseIndex, quoteIndex] = market.tokens;
      const rawBaseSymbol = meta.tokens[baseIndex]?.name;
      const quoteSymbol = meta.tokens[quoteIndex]?.name;
      const context = assetCtxs[market.index];
      const markPrice = Number(context?.midPx ?? context?.markPx);
      const previousPrice = Number(context?.prevDayPx);
      const dayVolume = Number(context?.dayNtlVlm);
      if (
        !rawBaseSymbol ||
        quoteSymbol !== "USDC" ||
        !context ||
        !Number.isFinite(markPrice) ||
        markPrice <= 0 ||
        !Number.isFinite(previousPrice) ||
        !Number.isFinite(dayVolume)
      ) {
        return null;
      }
      const baseSymbol =
        rawBaseSymbol === "UBTC"
          ? "BTC"
          : rawBaseSymbol === "UETH"
            ? "ETH"
            : rawBaseSymbol === "USOL"
              ? "SOL"
              : rawBaseSymbol;
      return {
        symbol: `${baseSymbol}/${quoteSymbol}`,
        candleSymbol:
          market.name === "PURR/USDC" ? market.name : `@${market.index}`,
        baseSymbol,
        quoteSymbol,
        markPrice,
        previousPrice,
        dayVolume,
      };
    })
    .filter((market): market is SpotMarket => market !== null)
    .sort((a, b) => b.dayVolume - a.dayVolume);

  spotMarketCache = { expiresAt: Date.now() + 15_000, markets };
  return markets;
}

export async function quantRoutes(app: FastifyInstance) {
  app.get("/spot-markets", async (_req, reply) => {
    try {
      return await fetchSpotMarkets();
    } catch (error) {
      app.log.error(error);
      return reply
        .code(502)
        .send({ error: "Hyperliquid spot markets are unavailable." });
    }
  });

  app.get("/candles", async (req, reply) => {
    const query = req.query as {
      coin?: string;
      interval?: string;
      days?: string;
      market?: string;
    };
    const coin = (query.coin ?? "BTC").trim().toUpperCase();
    const interval = query.interval ?? "1h";
    const days = Number(query.days ?? 90);
    const isSpot = query.market === "spot";

    if (!/^[A-Z0-9:@/]{1,40}$/.test(coin)) {
      return reply.code(400).send({ error: "Invalid market symbol." });
    }
    if (!(interval in INTERVAL_MS)) {
      return reply.code(400).send({ error: "Unsupported candle interval." });
    }
    if (!Number.isInteger(days) || days < 1 || days > 180) {
      return reply.code(400).send({ error: "Days must be between 1 and 180." });
    }
    if (isSpot && !coin.includes("/") && !/^@\d+$/.test(coin)) {
      return reply
        .code(400)
        .send({ error: "Spot candles require a pair or spot market index." });
    }

    const endTime = Date.now();
    const startTime = endTime - days * 24 * 60 * 60_000;
    const intervalMs = INTERVAL_MS[interval]!;
    const candles: HyperliquidCandle[] = [];
    let cursor = startTime;

    while (cursor < endTime && candles.length < MAX_CANDLES) {
      const page = await fetchCandlePage(coin, interval, cursor, endTime);
      if (!page.length) break;

      candles.push(...page);
      const lastCloseTime = Math.max(...page.map((candle) => candle.T));
      const nextCursor = lastCloseTime + 1;
      if (nextCursor <= cursor || page.length < PAGE_SIZE) break;
      cursor = nextCursor;
    }

    const fundingResult = isSpot
      ? ({ status: "fulfilled", value: [] } as const)
      : await Promise.allSettled([
          fetchFundingHistory(coin, startTime, endTime),
        ]).then(([result]) => result);
    const fundingRates =
      fundingResult.status === "fulfilled"
        ? fundingResult.value
            .map((item) => ({
              time: item.time,
              rate: Number(item.fundingRate),
            }))
            .filter((item) => Number.isFinite(item.rate))
            .sort((a, b) => a.time - b.time)
        : [];

    const unique = [
      ...new Map(candles.map((candle) => [candle.t, candle])).values(),
    ]
      .sort((a, b) => a.t - b.t)
      .slice(-MAX_CANDLES)
      .filter((candle) => candle.T <= endTime)
      .map((candle) => ({
        time: candle.t,
        open: Number(candle.o),
        high: Number(candle.h),
        low: Number(candle.l),
        close: Number(candle.c),
        volume: Number(candle.v),
        trades: candle.n,
      }))
      .filter((candle) =>
        [candle.open, candle.high, candle.low, candle.close].every(
          (price) => Number.isFinite(price) && price > 0,
        ),
      );

    return {
      venue: "hyperliquid",
      market: isSpot ? "spot" : "perp",
      coin,
      interval,
      days,
      intervalMs,
      candles: unique,
      fundingRates,
      fundingAvailable: !isSpot && fundingResult.status === "fulfilled",
    };
  });
}
