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
  name: z.string(), slug: z.string(), chain: z.string(), chains: z.array(z.string()).default([]),
  category: z.string().nullable().optional(), logo: z.string().nullable().optional(),
  tvl: z.coerce.number(), change1d: z.coerce.number().nullable().optional(),
  change7d: z.coerce.number().nullable().optional(), mcap: z.coerce.number().nullable().optional(),
});
export type ProtocolTvl = z.infer<typeof protocolTvlSchema>;

export const chainDistributionSchema = z.object({
  chain: z.string(), tvl: z.coerce.number(), share: z.coerce.number(),
});
export type ChainDistribution = z.infer<typeof chainDistributionSchema>;

const tvlHistoryRowSchema = z.object({ date: z.string(), tvl: z.coerce.number() });

export async function getProtocols(): Promise<ProtocolTvl[]> {
  return z.array(protocolTvlSchema).parse(await request("/api/protocols"));
}
export async function getChainDistribution(): Promise<ChainDistribution[]> {
  return z.array(chainDistributionSchema).parse(await request("/api/chains/distribution"));
}
export async function getTotalTvlHistory(): Promise<{ date: number; tvl: number }[]> {
  const rows = z.array(tvlHistoryRowSchema).parse(await request("/api/protocols/tvl/history"));
  return rows.map((r) => ({ date: Math.floor(new Date(r.date).getTime() / 1000), tvl: r.tvl }));
}
