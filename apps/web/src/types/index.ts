import { z } from "zod";

/** Unified protocol model — the output of our "indexing engine". */
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

export type ChainTVL = {
  chain: string;
  tvl: number;
  share: number;
};

export type PricePoint = {
  symbol: string;
  price: number;
  change24h: number;
  logo?: string;
  source?: "Chainlink" | "CoinGecko" | "Mock";
};

export type TVLHistoryPoint = {
  date: number; // unix seconds
  tvl: number;
};

export type StablecoinSignal = {
  date: string;
  usdtDominance: number;
  ngnSpread: number; // NGN/USDT premium %
  inflow: number;
};

export type ChainActivity = {
  chain: string;
  txCount24h: number;
  gasGwei: number;
  trend: "up" | "down" | "flat";
};

export type MarketInsight = {
  id: string;
  title: string;
  detail: string;
  tone: "positive" | "warning" | "neutral";
};

export type EventType =
  "deposit" | "withdrawal" | "swap" | "tvl_spike" | "whale_move";

export type ProtocolEvent = {
  id: string;
  protocol: string;
  slug: string;
  chain: string;
  type: EventType;
  amountUSD: number;
  address: string;
  timestamp: number; // ms epoch
};

export type WatchedAddress = {
  address: string;
  label?: string;
};

export type WalletPosition = {
  protocol: string;
  slug: string;
  chain: string;
  valueUSD: number;
};

export type WalletBalance = {
  address: string;
  totalUSD: number;
  change24h: number;
  positions: WalletPosition[];
  lastActivity: number;
  recentEvents: ProtocolEvent[];
};

export type SuiTokenBalance = {
  coinType: string;
  symbol: string;
  balance: number;
};

export type SuiWalletData = {
  address: string;
  suiBalance: number;
  tokens: SuiTokenBalance[];
  recentTxCount: number;
  lastTxDigest?: string;
  fetchedAt: number;
};

export type SuiTransaction = {
  digest: string;
  timestampMs: number;
  type: string;
  status: "success" | "failed" | "pending";
};

export type WalrusWriteResult = {
  blobId: string;
  verifyUrl: string;
  sizeBytes: number;
};

export type AiSignal = {
  id: string;
  chain: string;
  asset: string;
  signal: "BULLISH" | "BEARISH" | "NEUTRAL";
  confidence: number;
  reasoning: string;
  walletRefs: string[];
  generatedAt: number;
  walrusBlobId: string;
  verifyUrl: string;
};

export type WalrusBlob = {
  blobId: string;
  type?: string;
  version?: string;
  platform?: string;
  storedAt?: number;
  [key: string]: unknown;
};
