import { safeFetch } from "../http";
import type { ChainNetworkStats } from "@hawq/types";

/**
 * Zcash intentionally has no wallet-balance adapter. Zcash supports two
 * address types: transparent addresses, which are publicly visible like
 * Bitcoin, and shielded addresses, which use zero-knowledge proofs to hide
 * sender, receiver, and amount. HawQ only reports what the chain itself
 * makes public: network stats and transparent-pool activity. It never
 * infers a shielded balance, sender, recipient, or amount.
 *
 * Uses Blockchair's public API (no key required for light usage; rate
 * limited — swap in a paid tier or run zebra/lightwalletd directly if
 * ingestion volume grows). Verify current endpoint shape against
 * https://blockchair.com/api/docs before relying on this in production.
 */
const BLOCKCHAIR_BASE = "https://api.blockchair.com/zcash";

type BlockchairStatsResponse = {
  data: {
    blocks: number;
    transactions: number;
    circulation: number; // in zatoshi
    hashrate_24h: string;
    difficulty: number;
    market_price_usd: number;
  };
};

export async function fetchZcashNetworkStats(): Promise<ChainNetworkStats> {
  const res = await safeFetch<BlockchairStatsResponse>(`${BLOCKCHAIR_BASE}/stats`);
  const d = res.data;

  return {
    chain: "zcash",
    blockHeight: d.blocks,
    metrics: {
      transactions: d.transactions,
      circulationZec: d.circulation / 1e8,
      hashrate24h: d.hashrate_24h,
      difficulty: d.difficulty,
      priceUsd: d.market_price_usd,
      note: "transparent-pool and network stats only — shielded activity is not public on Zcash",
    },
    fetchedAt: Date.now(),
  };
}

type BlockchairAddressResponse = {
  data: Record<
    string,
    {
      address: { balance: number; transaction_count: number };
    }
  >;
};

/** Transparent-address (t-addr) balance + tx count only. Will not resolve a
 *  shielded (z-addr / unified) address — that's by design, not a bug. */
export async function fetchZcashTransparentAddress(
  tAddress: string,
): Promise<{ address: string; balanceZec: number; txCount: number }> {
  const res = await safeFetch<BlockchairAddressResponse>(
    `${BLOCKCHAIR_BASE}/dashboards/address/${tAddress}`,
  );
  const entry = res.data[tAddress];
  if (!entry) throw new Error(`No transparent-address data for ${tAddress}`);
  return {
    address: tAddress,
    balanceZec: entry.address.balance / 1e8,
    txCount: entry.address.transaction_count,
  };
}
