import type { ProtocolTVL, ChainTVL } from "@hawq/types";
import { ProtocolTVLSchema } from "@hawq/types";
import type { LlamaProtocol } from "./adapters/defiLlama";

// Chains HawQ cares about surfacing in the "chain distribution" view.
// Kept broader than SUPPORTED_CHAINS (wallet-integration chains) since this
// distribution is TVL-based, sourced from DefiLlama's full chain list.
const SUPPORTED = [
  "Ethereum",
  "Solana",
  "BSC",
  "Tron",
  "Arbitrum",
  "Base",
  "Polygon",
  "Avalanche",
  "Optimism",
  "Zcash",
  "Robinhood Chain",
];

export function normalizeProtocols(raw: LlamaProtocol[]): ProtocolTVL[] {
  return raw
    .filter((p) => typeof p.tvl === "number" && p.tvl > 0)
    .map((p) => {
      const candidate: ProtocolTVL = {
        name: p.name,
        slug: p.slug,
        chain: p.chain,
        chains: p.chains ?? [],
        tvl: p.tvl,
        change1d: p.change_1d ?? undefined,
        change7d: p.change_7d ?? undefined,
        category: p.category,
        logo: p.logo,
        mcap: p.mcap ?? undefined,
      };
      const parsed = ProtocolTVLSchema.safeParse(candidate);
      return parsed.success ? parsed.data : null;
    })
    .filter((p): p is ProtocolTVL => p !== null);
}

export function computeChainDistribution(protocols: ProtocolTVL[]): ChainTVL[] {
  const totals: Record<string, number> = {};
  for (const p of protocols) {
    const chains = p.chains.length ? p.chains : [p.chain];
    const relevant = chains.filter((c) => SUPPORTED.includes(c));
    const list = relevant.length ? relevant : [p.chain];
    const per = p.tvl / list.length;
    for (const c of list) totals[c] = (totals[c] ?? 0) + per;
  }
  const filtered = Object.entries(totals).filter(([c]) => SUPPORTED.includes(c));
  const sum = filtered.reduce((a, [, v]) => a + v, 0) || 1;
  return filtered
    .map(([chain, tvl]) => ({ chain, tvl, share: (tvl / sum) * 100 }))
    .sort((a, b) => b.tvl - a.tvl);
}

