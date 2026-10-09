import { cached, safeFetch } from "./client";
import type { PricePoint } from "../../types";

type CoinMarket = {
  id: string;
  symbol: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number | null;
  market_cap_rank?: number | null;
};

const IDS = {
  bitcoin: "BTC",
  ethereum: "ETH",
  solana: "SOL",
  tether: "USDT",
} as const;

/** Live CoinGecko prices, 24-hour changes, and logos for BTC/ETH/SOL/USDT. */
export async function fetchCoinGeckoPrices(): Promise<PricePoint[]> {
  return cached("cg:prices", 5_000, async () => {
    const data = await safeFetch<CoinMarket[]>(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,tether&price_change_percentage=24h",
    );
    const prices = (Object.entries(IDS) as [string, string][]).map(
      ([id, symbol]) => {
        const quote = data.find((coin) => coin.id === id);
        if (
          !quote ||
          !Number.isFinite(quote.current_price) ||
          quote.current_price <= 0 ||
          quote.price_change_percentage_24h == null ||
          !Number.isFinite(quote.price_change_percentage_24h) ||
          !quote.image
        ) {
          throw new Error(`CoinGecko returned incomplete ${symbol} data`);
        }
        return {
          symbol,
          price: quote.current_price,
          change24h: +quote.price_change_percentage_24h.toFixed(2),
          logo: quote.image,
          source: "CoinGecko" as const,
        };
      },
    );
    return prices;
  });
}

/** Fetches logos for a list of market symbols, choosing the highest-ranked match. */
export async function fetchCoinGeckoLogos(
  symbols: string[],
): Promise<Record<string, string>> {
  const normalized = [...new Set(symbols.map((symbol) => symbol.toUpperCase()))]
    .filter(Boolean)
    .sort();
  if (!normalized.length) return {};

  return cached(`cg:logos:${normalized.join(",")}`, 6 * 60 * 60_000, async () => {
    const batches = Array.from(
      { length: Math.ceil(normalized.length / 50) },
      (_, index) => normalized.slice(index * 50, index * 50 + 50),
    );
    const results = await Promise.allSettled(
      batches.map(async (batch) => {
        const params = new URLSearchParams({
          vs_currency: "usd",
          symbols: batch.join(",").toLowerCase(),
          include_tokens: "all",
          order: "market_cap_desc",
          per_page: "250",
          page: "1",
          sparkline: "false",
        });
        return safeFetch<CoinMarket[]>(
          `https://api.coingecko.com/api/v3/coins/markets?${params}`,
        );
      }),
    );

    const logos: Record<string, string> = {};
    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      for (const coin of result.value) {
        const symbol = coin.symbol.toUpperCase();
        if (normalized.includes(symbol) && coin.image && !logos[symbol]) {
          logos[symbol] = coin.image;
        }
      }
    }
    return logos;
  });
}
