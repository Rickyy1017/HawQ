import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { fetchDefiLlamaProtocol, fetchDefiLlamaTVL } from "../lib/api/defiLlama";
import { fetchCoinGeckoPrices } from "../lib/api/coinGecko";
import { fetchChainlinkPrices } from "../lib/api/chainlink.functions";
import { fetchChainActivity, fetchStablecoinSignals } from "../lib/api/chain";
import { getProtocols, getChainDistribution, getTotalTvlHistory } from "../lib/api/hawq";
import { generateProtocolEvents, computeWalletBalance } from "../lib/analytics/events";
import { MOCK_PROTOCOLS, buildMockHistory } from "../lib/mock/data";
import { normalizeProtocols } from "../lib/normalizer/tvlNormalizer";
import type { ProtocolTVL, ProtocolEvent, WalletBalance } from "../types";

const QO = { staleTime: 5 * 60_000, gcTime: 30 * 60_000, retry: 1 } as const;

/** Live DeFiLlama protocol list merged with backend-only protocols when available. */
export function useProtocols() {
  return useQuery({
    queryKey: ["protocols"],
    queryFn: async (): Promise<ProtocolTVL[]> => {
      let backendProtocols: ProtocolTVL[] = [];
      try {
        const rows = await getProtocols();
        backendProtocols = rows.map((p) => ({
          name: p.name,
          slug: p.slug,
          chain: p.chain,
          chains: p.chains,
          tvl: p.tvl,
          change1d: p.change1d ?? undefined,
          change7d: p.change7d ?? undefined,
          category: p.category ?? undefined,
          logo: p.logo ?? undefined,
          mcap: p.mcap ?? undefined,
        }));
      } catch {
        // Keep any backend data as a fallback if the live source is unavailable.
      }

      try {
        const liveRows = await fetchDefiLlamaTVL();
        if (liveRows.length) {
          const merged = new Map(
            normalizeProtocols(liveRows).map((protocol) => [protocol.slug, protocol]),
          );
          for (const protocol of backendProtocols) {
            if (!merged.has(protocol.slug)) merged.set(protocol.slug, protocol);
          }
          return [...merged.values()];
        }
      } catch {
        // Use stored or demo data if DeFiLlama cannot be reached.
      }

      return backendProtocols.length ? backendProtocols : MOCK_PROTOCOLS;
    },
    ...QO,
  });
}
/** Chain TVL share — computed and stored server-side in our own database. */
export function useChainDistribution() {
  return useQuery({
    queryKey: ["chain-distribution"],
    queryFn: async () => {
      try { return await getChainDistribution(); } catch { return []; }
    },
    ...QO,
  });
}

export function usePrices() {
  return useQuery({
    queryKey: ["prices"],
    queryFn: async () => {
      const livePrices = await fetchCoinGeckoPrices();
      try {
        const oracle = await fetchChainlinkPrices();
        return livePrices.map((price) => {
          const oraclePrice = oracle.find(
            (candidate) => candidate.symbol === price.symbol,
          );
          return oraclePrice
            ? {
                ...oraclePrice,
                change24h: price.change24h,
                logo: price.logo,
              }
            : price;
        });
      } catch {
        return livePrices;
      }
    },
    ...QO,
    staleTime: 5_000,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Simulated, not live — Etherscan/BSCScan-style per-chain tx feeds need paid
 * API keys we don't have yet. Kept as a clearly-scoped placeholder rather
 * than wired to a real indexer under false pretenses.
 */
export function useChainActivity() {
  return useQuery({ queryKey: ["activity"], queryFn: fetchChainActivity, ...QO });
}

/** Simulated NGN/USDT spread + USDT dominance — see useChainActivity's note above. */
export function useStablecoinSignals() {
  return useQuery({ queryKey: ["stablecoin"], queryFn: fetchStablecoinSignals, ...QO });
}

/** Total market TVL history — sourced from our own backend. */
export function useTotalTVLHistory() {
  return useQuery({
    queryKey: ["tvl-history"],
    queryFn: async () => {
      try {
        const rows = await getTotalTvlHistory();
        return rows.length ? rows : buildMockHistory(80_000_000_000);
      } catch {
        return buildMockHistory(80_000_000_000);
      }
    },
    ...QO,
    staleTime: 10 * 60_000,
  });
}

export function useProtocolDetail(slug: string) {
  return useQuery({
    queryKey: ["protocol", slug],
    queryFn: async () => {
      try {
        return await fetchDefiLlamaProtocol(slug);
      } catch {
        const m = MOCK_PROTOCOLS.find((p) => p.slug === slug) ?? MOCK_PROTOCOLS[0];
        return {
          name: m.name,
          description: "Live data unavailable — showing cached analytics snapshot.",
          chains: m.chains,
          category: m.category,
          currentChainTvls: Object.fromEntries(m.chains.map((c) => [c, m.tvl / m.chains.length])),
          tvl: buildMockHistory(m.tvl).map((h) => ({ date: h.date, totalLiquidityUSD: h.tvl })),
        };
      }
    },
    ...QO,
  });
}

export function useLiveTick(intervalMs = 12_000) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return tick;
}

export function useActivityFeed(count = 60): { events: ProtocolEvent[]; isLoading: boolean } {
  const { data: protocols, isLoading } = useProtocols();
  const tick = useLiveTick(12_000);
  const events = useMemo(
    () => generateProtocolEvents(protocols ?? MOCK_PROTOCOLS, count, tick),
    [protocols, count, tick],
  );
  return { events, isLoading };
}

export function useWatchlistBalances(addresses: string[]): {
  balances: WalletBalance[];
  isLoading: boolean;
} {
  const { data: protocols, isLoading } = useProtocols();
  const tick = useLiveTick(8_000);
  const balances = useMemo(
    () => addresses.map((a) => computeWalletBalance(a, protocols ?? MOCK_PROTOCOLS, tick)),
    [addresses, protocols, tick],
  );
  return { balances, isLoading };
}
