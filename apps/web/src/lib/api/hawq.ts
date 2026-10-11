import { z } from "zod";

const baseUrl = import.meta.env.VITE_HAWQ_API_URL as string | undefined;

async function request(path: string, init?: RequestInit): Promise<unknown> {
  if (!baseUrl) throw new Error("HawQ API is not configured.");
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    signal: init?.signal ?? AbortSignal.timeout(12_000),
  });
  if (!response.ok)
    throw new Error(
      `HawQ API unavailable (${response.status}). Please try again.`,
    );
  return response.json();
}

export const perpMarketSchema = z.object({
  symbol: z.string(),
  markPrice: z.number(),
  fundingRate: z.number(),
  openInterest: z.number(),
  dayVolume: z.number(),
});
export type PerpMarket = z.infer<typeof perpMarketSchema>;
export const predictionMarketSchema = z.object({
  id: z.string(),
  question: z.string(),
  image: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  category: z.string(),
  regionTag: z.string().nullable().optional(),
  yesPrice: z.number(),
  noPrice: z.number(),
  volume: z.number(),
});
export type PredictionMarket = z.infer<typeof predictionMarketSchema>;
const positionResponseSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    product: z.string(),
    venue: z.string(),
    symbol_or_market: z.string(),
    side: z.string(),
    size_usd: z.coerce.number(),
    entry_price: z.coerce.number().nullable().optional(),
    status: z.string(),
    created_at: z.string().optional().nullable(),
    is_testnet: z.boolean().optional(),
  })
  .passthrough();
export type Position = {
  id: string | number;
  product: string;
  venue: string;
  symbolOrMarket: string;
  side: string;
  sizeUsd: number;
  entryPrice?: number | null;
  status: string;
  createdAt?: string | null;
  isTestnet?: boolean;
};

export type PositionInput = {
  product: "perp" | "spot" | "prediction";
  venue: string;
  symbolOrMarket: string;
  side: "long" | "short" | "buy" | "sell" | "yes" | "no";
  sizeUsd: number;
  entryPrice?: number;
  isTestnet: true;
};

export async function getPerpMarkets(): Promise<PerpMarket[]> {
  return z.array(perpMarketSchema).parse(await request("/api/perps/markets"));
}

export const quantCandleSchema = z.object({
  time: z.number(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
  trades: z.number(),
});
export type QuantCandle = z.infer<typeof quantCandleSchema>;
export const spotMarketSchema = z.object({
  symbol: z.string(),
  candleSymbol: z.string(),
  baseSymbol: z.string(),
  quoteSymbol: z.string(),
  markPrice: z.number(),
  previousPrice: z.number(),
  dayVolume: z.number(),
});
export type SpotMarket = z.infer<typeof spotMarketSchema>;
export const quantFundingRateSchema = z.object({
  time: z.number(),
  rate: z.number(),
});
export type QuantFundingRate = z.infer<typeof quantFundingRateSchema>;

export async function getSpotMarkets(): Promise<SpotMarket[]> {
  try {
    const markets = await getHyperliquidSpotMarkets();
    if (markets.length) return markets;
  } catch {
    // Fall back to Railway if direct exchange access is unavailable.
  }
  try {
    return z
      .array(spotMarketSchema)
      .parse(await request("/api/quant/spot-markets"));
  } catch {
    throw new Error("Hyperliquid spot markets are temporarily unavailable.");
  }
}

async function getHyperliquidSpotMarkets(): Promise<SpotMarket[]> {
  const response = await fetch("https://api.hyperliquid.xyz/info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "spotMetaAndAssetCtxs" }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok)
    throw new Error(`Hyperliquid spot markets failed (${response.status})`);

  const [meta, contexts] = z
    .tuple([
      z.object({
        tokens: z.array(z.object({ name: z.string() })),
        universe: z.array(
          z.object({
            name: z.string().optional(),
            tokens: z.tuple([z.number(), z.number()]),
            index: z.number(),
          }),
        ),
      }),
      z.array(
        z.object({
          markPx: z.string().optional(),
          midPx: z.string().nullable().optional(),
          prevDayPx: z.string(),
          dayNtlVlm: z.string(),
        }),
      ),
    ])
    .parse(await response.json());

  return meta.universe
    .map((pair) => {
      const [baseIndex, quoteIndex] = pair.tokens;
      const rawBaseSymbol = meta.tokens[baseIndex]?.name;
      const quoteSymbol = meta.tokens[quoteIndex]?.name;
      const context = contexts[pair.index];
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
      )
        return null;

      const baseSymbol =
        rawBaseSymbol === "UBTC"
          ? "BTC"
          : rawBaseSymbol === "UETH"
            ? "ETH"
            : rawBaseSymbol === "USOL"
              ? "SOL"
              : rawBaseSymbol;
      const symbol = `${baseSymbol}/${quoteSymbol}`;
      return {
        symbol,
        candleSymbol: pair.name === "PURR/USDC" ? pair.name : `@${pair.index}`,
        baseSymbol,
        quoteSymbol,
        markPrice,
        previousPrice,
        dayVolume,
      };
    })
    .filter((market): market is SpotMarket => market !== null)
    .sort((a, b) => b.dayVolume - a.dayVolume);
}

export type CandleInterval = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

export async function getMarketCandles(
  coin: string,
  interval: CandleInterval,
  days: number,
  market: "perp" | "spot" = "perp",
): Promise<QuantCandle[]> {
  const params = new URLSearchParams({
    coin,
    interval,
    days: String(days),
    market,
  });
  try {
    const candles = await getHyperliquidCandles(coin, interval, days);
    if (candles.length) return candles;
  } catch {
    // Fall through to the API when direct exchange access is unavailable.
  }
  const response = z
    .object({ candles: z.array(quantCandleSchema) })
    .parse(await request(`/api/quant/candles?${params}`));
  return response.candles;
}

async function getHyperliquidCandles(
  coin: string,
  interval: CandleInterval,
  days: number,
): Promise<QuantCandle[]> {
  const endTime = Date.now();
  const startTime = endTime - Math.min(days, 180) * 24 * 60 * 60_000;
  const response = await fetch("https://api.hyperliquid.xyz/info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "candleSnapshot",
      req: { coin, interval, startTime, endTime },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok)
    throw new Error(`Hyperliquid candles failed (${response.status})`);
  const payload = z
    .array(
      z.object({
        t: z.number(),
        o: z.string(),
        h: z.string(),
        l: z.string(),
        c: z.string(),
        v: z.string(),
        n: z.number().optional().default(0),
      }),
    )
    .parse(await response.json());
  return payload.map((candle) => ({
    time: candle.t,
    open: Number(candle.o),
    high: Number(candle.h),
    low: Number(candle.l),
    close: Number(candle.c),
    volume: Number(candle.v),
    trades: candle.n,
  }));
}

export async function getQuantCandles(
  coin: string,
  interval: "1h" | "4h" | "1d",
  days: number,
): Promise<{
  candles: QuantCandle[];
  fundingRates: QuantFundingRate[];
  fundingAvailable: boolean;
}> {
  const params = new URLSearchParams({
    coin,
    interval,
    days: String(days),
    market: "perp",
  });
  const response = z
    .object({
      candles: z.array(quantCandleSchema),
      fundingRates: z.array(quantFundingRateSchema).default([]),
      fundingAvailable: z.boolean().default(false),
    })
    .parse(await request(`/api/quant/candles?${params}`));
  return response;
}

export async function getPredictionMarkets(
  category: string,
  region: string,
): Promise<PredictionMarket[]> {
  const params = new URLSearchParams();
  if (category !== "all") params.set("category", category);
  if (region !== "all") params.set("region", region);
  const query = params.size ? `?${params}` : "";
  return z
    .array(predictionMarketSchema)
    .parse(await request(`/api/predictions/markets${query}`));
}
export async function getPositions(): Promise<Position[]> {
  return z
    .array(positionResponseSchema)
    .parse(await request("/api/positions"))
    .map((position) => ({
      id: position.id,
      product: position.product,
      venue: position.venue,
      symbolOrMarket: position.symbol_or_market,
      side: position.side,
      sizeUsd: position.size_usd,
      entryPrice: position.entry_price,
      status: position.status,
      createdAt: position.created_at,
      isTestnet: position.is_testnet,
    }));
}
export async function logPosition(input: PositionInput): Promise<unknown> {
  return request("/api/positions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export const protocolTvlSchema = z.object({
  name: z.string(),
  slug: z.string(),
  chain: z.string(),
  chains: z.array(z.string()).default([]),
  category: z.string().nullable().optional(),
  logo: z.string().nullable().optional(),
  tvl: z.coerce.number(),
  change1d: z.coerce.number().nullable().optional(),
  change7d: z.coerce.number().nullable().optional(),
  mcap: z.coerce.number().nullable().optional(),
});
export type ProtocolTvl = z.infer<typeof protocolTvlSchema>;

export const chainDistributionSchema = z.object({
  chain: z.string(),
  tvl: z.coerce.number(),
  share: z.coerce.number(),
});
export type ChainDistribution = z.infer<typeof chainDistributionSchema>;

const tvlHistoryRowSchema = z.object({
  date: z.string(),
  tvl: z.coerce.number(),
});

export async function getProtocols(): Promise<ProtocolTvl[]> {
  return z.array(protocolTvlSchema).parse(await request("/api/protocols"));
}
export async function getChainDistribution(): Promise<ChainDistribution[]> {
  return z
    .array(chainDistributionSchema)
    .parse(await request("/api/chains/distribution"));
}
export async function getTotalTvlHistory(): Promise<
  { date: number; tvl: number }[]
> {
  const rows = z
    .array(tvlHistoryRowSchema)
    .parse(await request("/api/protocols/tvl/history"));
  return rows.map((r) => ({
    date: Math.floor(new Date(r.date).getTime() / 1000),
    tvl: r.tvl,
  }));
}
