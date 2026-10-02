import { safeFetch } from "../http";

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

/** Raw DeFiLlama protocols list. Ported as-is from src/lib/api/defiLlama.ts —
 *  same shape, no caching here since ingestion runs on its own schedule. */
export async function fetchDefiLlamaTVL(): Promise<LlamaProtocol[]> {
  return safeFetch<LlamaProtocol[]>("https://api.llama.fi/protocols");
}

export async function fetchDefiLlamaChartAll(): Promise<
  { date: string; tvl: number }[]
> {
  return safeFetch<{ date: string; tvl: number }[]>(
    "https://api.llama.fi/v2/historicalChainTvl",
  );
}
