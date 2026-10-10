import { z } from "zod";

/** Chains HawQ has a real read integration for. Keep in sync with adapters/. */
export const SUPPORTED_CHAINS = [
  "solana",
  "base",
  "arbitrum",
  "robinhood",
  "zcash",
] as const;
export type SupportedChain = (typeof SUPPORTED_CHAINS)[number];

/** Chains that support wallet-level balance/tx tracking (i.e. not Zcash — see below). */
export const WALLET_TRACKABLE_CHAINS = [
  "solana",
  "base",
  "arbitrum",
  "robinhood",
] as const;
export type WalletTrackableChain = (typeof WALLET_TRACKABLE_CHAINS)[number];

// ── Protocol / TVL ──────────────────────────────────────────────────────────
export const ProtocolTVLSchema = z.object({
  name: z.string(),
  slug: z.string(),
  chain: z.string(),
  chains: z.array(z.string()).default([]),
  tvl: z.number(),
  change1d: z.number().optional(),
  change7d: z.number().optional(),
  category: z.string().optional(),
  logo: z.string().optional(),
  mcap: z.number().optional(),
});
export type ProtocolTVL = z.infer<typeof ProtocolTVLSchema>;

export const ChainTVLSchema = z.object({
  chain: z.string(),
  tvl: z.number(),
  share: z.number(),
});
export type ChainTVL = z.infer<typeof ChainTVLSchema>;

export const TVLHistoryPointSchema = z.object({
  date: z.number(), // unix seconds
  tvl: z.number(),
});
export type TVLHistoryPoint = z.infer<typeof TVLHistoryPointSchema>;

export const PricePointSchema = z.object({
  symbol: z.string(),
  price: z.number(),
  change24h: z.number(),
});
export type PricePoint = z.infer<typeof PricePointSchema>;

// ── Multi-chain wallet intelligence ─────────────────────────────────────────
export const WalletSnapshotSchema = z.object({
  chain: z.enum(WALLET_TRACKABLE_CHAINS),
  address: z.string(),
  nativeBalance: z.number(),
  txCountRecent: z.number(),
  fetchedAt: z.number(), // ms epoch
});
export type WalletSnapshot = z.infer<typeof WalletSnapshotSchema>;

// ── Chain-level network stats (all 5 chains, including Zcash) ─────────────
export const ChainNetworkStatsSchema = z.object({
  chain: z.enum(SUPPORTED_CHAINS),
  blockHeight: z.number().nullable().optional(),
  metrics: z.record(z.string(), z.unknown()),
  fetchedAt: z.number(),
});
export type ChainNetworkStats = z.infer<typeof ChainNetworkStatsSchema>;

// ── Perps (Hyperliquid) ─────────────────────────────────────────────────────
export const PerpsMarketSchema = z.object({
  venue: z.literal("hyperliquid"),
  symbol: z.string(),
  markPrice: z.number(),
  fundingRate: z.number(),
  openInterest: z.number(),
  dayVolume: z.number(),
  fetchedAt: z.number(),
});
export type PerpsMarket = z.infer<typeof PerpsMarketSchema>;

// ── Predictions (Polymarket) ────────────────────────────────────────────────
export const PREDICTION_CATEGORIES = ["sports", "politics", "finance", "other"] as const;
export type PredictionCategory = (typeof PREDICTION_CATEGORIES)[number];

export const PredictionMarketSchema = z.object({
  id: z.string(),
  venue: z.literal("polymarket"),
  question: z.string(),
  image: z.string().url().nullable().optional(),
  icon: z.string().url().nullable().optional(),
  category: z.enum(PREDICTION_CATEGORIES),
  regionTag: z.string().nullable().optional(), // e.g. "nigeria"
  endDate: z.number().nullable().optional(),
  yesPrice: z.number(),
  noPrice: z.number(),
  volume: z.number(),
  liquidity: z.number(),
});
export type PredictionMarket = z.infer<typeof PredictionMarketSchema>;

// ── Simulated positions (demo scope — never real money) ────────────────────
// product 'perp': a REAL Hyperliquid TESTNET order (real matching engine, fake funds).
// product 'prediction': fully simulated — never sent anywhere, logged only.
// product 'spot': a non-custodial swap the user chose to log after signing themselves.
export const SimulatedPositionSchema = z.object({
  product: z.enum(["perp", "prediction", "spot"]),
  venue: z.string(),
  symbolOrMarket: z.string(),
  side: z.string(), // "long"/"short" for perps, "yes"/"no" for predictions
  sizeUsd: z.number().positive(),
  entryPrice: z.number().optional(),
  isTestnet: z.boolean().default(true),
  walletAddress: z.string().optional(),
});
export type SimulatedPosition = z.infer<typeof SimulatedPositionSchema>;

/**
 * Zcash is deliberately modeled differently: it never appears in
 * WalletSnapshotSchema. Only transparent-address activity is public on
 * Zcash — shielded balances/amounts/participants are not readable from
 * the chain itself, so HawQ never claims wallet-level intelligence for it.
 * Zcash gets network + transparent-pool stats via ChainNetworkStatsSchema
 * instead. See services/ingestion/src/adapters/zcash.ts.
 */
