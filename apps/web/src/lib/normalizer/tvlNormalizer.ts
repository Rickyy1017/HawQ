import type { ProtocolTVL, ChainTVL } from "@/types";
import { ProtocolTVLSchema } from "@/types";
import type { LlamaProtocol } from "@/lib/api/defiLlama";
import { MOCK_PROTOCOLS } from "@/lib/mock/data";

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
  "Robinhood Chain",
  "Zcash",
  "Aptos",
  "Hyperliquid",
];

/** Convert raw DeFiLlama protocols into our unified ProtocolTVL model. */
export function normalizeProtocols(raw: LlamaProtocol[]): ProtocolTVL[] {
  const mapped = raw
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

  return mapped.length ? mapped : MOCK_PROTOCOLS;
}

/** Aggregate TVL across the supported chains using each protocol's chain list. */
export function computeChainDistribution(protocols: ProtocolTVL[]): ChainTVL[] {
  const totals: Record<string, number> = {};
  for (const p of protocols) {
    const chains = p.chains.length ? p.chains : [p.chain];
    const relevant = chains.filter((c) => SUPPORTED.includes(c));
    const list = relevant.length ? relevant : [p.chain];
    const per = p.tvl / list.length;
    for (const c of list) totals[c] = (totals[c] ?? 0) + per;
  }
  const filtered = Object.entries(totals).filter(([c]) =>
    SUPPORTED.includes(c),
  );
  const sum = filtered.reduce((a, [, v]) => a + v, 0) || 1;
  return filtered
    .map(([chain, tvl]) => ({ chain, tvl, share: (tvl / sum) * 100 }))
    .sort((a, b) => b.tvl - a.tvl);
}
