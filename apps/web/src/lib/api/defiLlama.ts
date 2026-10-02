import { cached, safeFetch } from "./client";

export type LlamaProtocol = {
  name: string;
  slug: string;
  chain: string;
  chains: string[];
  tvl: number;
  change_1d: number | null;
  change_7d: number | null;
  category: string;
  logo: string;
  mcap: number | null;
};

export type LlamaProtocolDetail = {
  name: string;
  description?: string;
  url?: string;
  logo?: string;
  category?: string;
  chains: string[];
  currentChainTvls: Record<string, number>;
  tvl: { date: number; totalLiquidityUSD: number }[];
};

/** Raw DeFiLlama protocols list. */
export async function fetchDefiLlamaTVL(): Promise<LlamaProtocol[]> {
  return cached("llama:protocols", 5 * 60_000, () =>
    safeFetch<LlamaProtocol[]>("https://api.llama.fi/protocols"),
  );
}

/** Raw DeFiLlama protocol detail by slug. */
export async function fetchDefiLlamaProtocol(
  slug: string,
): Promise<LlamaProtocolDetail> {
  return cached(`llama:protocol:${slug}`, 5 * 60_000, () =>
    safeFetch<LlamaProtocolDetail>(`https://api.llama.fi/protocol/${slug}`),
  );
}

/** DeFiLlama historical chain TVL (used for total TVL trend). */
export async function fetchDefiLlamaChartAll(): Promise<
  { date: string; tvl: number }[]
> {
  return cached("llama:chart:all", 10 * 60_000, async () => {
    const raw = await safeFetch<{ date: string; tvl: number }[]>(
      "https://api.llama.fi/v2/historicalChainTvl",
    );
    return raw;
  });
}
