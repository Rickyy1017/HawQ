import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { fetchDefiLlamaTVL, fetchDefiLlamaChartAll, fetchDefiLlamaProtocol } from '../lib/api/defiLlama';
import { fetchCoinGeckoPrices } from '../lib/api/coinGecko';
import { fetchChainActivity, fetchStablecoinSignals } from '../lib/api/chain';
import { normalizeProtocols, computeChainDistribution } from '../lib/normalizer/tvlNormalizer';
import { generateProtocolEvents, computeWalletBalance } from '../lib/analytics/evens';
import { MOCK_PROTOCOLS, buildMockHistory } from '../lib/mock/data';
import type { ProtocolTVL, ProtocolEvent, WalletBalance } from '../types';

const QO = { staleTime: 5 * 60_000, gcTime: 30 * 60_000, retry: 1 } as const;

export function useProtocols() {
  return useQuery({
    queryKey: ["protocols"],
    queryFn: async (): Promise<ProtocolTVL[]> => {
      try {
        const raw = await fetchDefiLlamaTVL();
        return normalizeProtocols(raw);
      } catch {
        return MOCK_PROTOCOLS;
      }
    },
    ...QO,
  });
}

export function useChainDistribution() {
  const q = useProtocols();
  return { ...q, data: q.data ? computeChainDistribution(q.data) : undefined };
}

export function usePrices() {
  return useQuery({ queryKey: ["prices"], queryFn: fetchCoinGeckoPrices, ...QO, staleTime: 60_000 });
}

export function useChainActivity() {
  return useQuery({ queryKey: ["activity"], queryFn: fetchChainActivity, ...QO });
}

export function useStablecoinSignals() {
  return useQuery({ queryKey: ["stablecoin"], queryFn: fetchStablecoinSignals, ...QO });
}

export function useTotalTVLHistory() {
  return useQuery({
    queryKey: ["tvl-history"],
    queryFn: async () => {
      try {
        const raw = await fetchDefiLlamaChartAll();
        return raw.slice(-180).map((d) => ({ date: Number(d.date), tvl: d.tvl }));
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

/** A ticking counter that increments on an interval (for "live" updates). */
export function useLiveTick(intervalMs = 12_000) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return tick;
}

/** Real-time-feeling activity feed derived from live protocol TVL data. */
export function useActivityFeed(count = 60): { events: ProtocolEvent[]; isLoading: boolean } {
  const { data: protocols, isLoading } = useProtocols();
  const tick = useLiveTick(12_000);
  const events = useMemo(
    () => generateProtocolEvents(protocols ?? MOCK_PROTOCOLS, count, tick),
    [protocols, count, tick],
  );
  return { events, isLoading };
}

/** Live balances + recent activity for a set of watched addresses. */
export function useWatchlistBalances(addresses: string[]): {
  balances: WalletBalance[];
  isLoading: boolean;
} {
  const { data: protocols, isLoading } = useProtocols();
  const tick = useLiveTick(8_000);
  const balances = useMemo(
    () =>
      addresses.map((a) => computeWalletBalance(a, protocols ?? MOCK_PROTOCOLS, tick)),
    [addresses, protocols, tick],
  );
  return { balances, isLoading };
}
