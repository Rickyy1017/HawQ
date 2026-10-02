import { safeFetch } from "../http";
import type { PerpsMarket } from "@hawq/types";

/**
 * Hyperliquid's public "info" API needs no auth/key. Market data (mid
 * prices, funding, open interest) is read from mainnet since it's the
 * liquid, real market — testnet mirrors the same symbols but with sparse/
 * fake liquidity, so testnet is used only for the *order placement* side
 * (wallet-signed, client-side, real testnet fill on fake funds), never for
 * the market-data side. Verify current endpoint shape against
 * https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api
 * before relying on this in production — API surfaces like this do shift.
 */
const INFO_URL = "https://api.hyperliquid.xyz/info";

type MetaAndCtx = [
  { universe: { name: string }[] },
  Array<{
    dayNtlVlm: string;
    funding: string;
    openInterest: string;
    markPx: string;
  }>,
];

export async function fetchHyperliquidPerps(): Promise<PerpsMarket[]> {
  const [meta, ctxs] = await safeFetch<MetaAndCtx>(INFO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "metaAndAssetCtxs" }),
  });

  const fetchedAt = Date.now();
  return meta.universe.map((asset, i) => {
    const ctx = ctxs[i];
    return {
      venue: "hyperliquid" as const,
      symbol: asset.name,
      markPrice: Number(ctx?.markPx ?? 0),
      fundingRate: Number(ctx?.funding ?? 0),
      openInterest: Number(ctx?.openInterest ?? 0),
      dayVolume: Number(ctx?.dayNtlVlm ?? 0),
      fetchedAt,
    };
  });
}
