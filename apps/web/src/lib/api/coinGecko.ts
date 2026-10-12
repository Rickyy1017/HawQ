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

const COINGECKO_ID_BY_SYMBOL: Record<string, string> = {
  AAVE: "aave",
  ADA: "cardano",
  AVAX: "avalanche-2",
  BNB: "binancecoin",
  BTC: "bitcoin",
  DAI: "dai",
  DOGE: "dogecoin",
  ETH: "ethereum",
  HYPE: "hyperliquid",
  GHO: "gho",
  LINK: "chainlink",
  PEPE: "pepe",
  PUMP: "pump-fun",
  RETH: "rocket-pool-eth",
  SOL: "solana",
  STRK: "starknet",
  STETH: "staked-ether",
  SUI: "sui",
  USDC: "usd-coin",
  USDT: "tether",
  WBTC: "wrapped-bitcoin",
  W: "wormhole",
  ENA: "ethena",
  ONDO: "ondo-finance",
  ZRO: "layerzero",
  XRP: "ripple",
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

/** Loads exact CoinGecko token IDs for known symbols; unknowns use TokenLogo's icon fallback. */
export async function fetchCoinGeckoLogos(
  symbols: string[],
): Promise<Record<string, string>> {
  const normalized = [...new Set(symbols.map((symbol) => symbol.toUpperCase()))]
    .filter(Boolean)
    .sort();
  if (!normalized.length) return {};

  const symbolIds = normalized.flatMap((symbol) => {
    const id = COINGECKO_ID_BY_SYMBOL[symbol];
    return id ? [[symbol, id] as const] : [];
  });
  const ids = symbolIds.map(([, id]) => id);
  const exactLogos: Record<string, string> = {};
  if (ids.length) {
    try {
      const coins = await cached(
        `cg:logos:${ids.slice().sort().join(",")}`,
        6 * 60 * 60_000,
        () => {
          const params = new URLSearchParams({
            vs_currency: "usd",
            ids: ids.join(","),
          });
          return safeFetch<CoinMarket[]>(
            `https://api.coingecko.com/api/v3/coins/markets?${params}`,
          );
        },
      );
      for (const coin of coins) {
        const symbol = symbolIds.find(([, id]) => id === coin.id)?.[0];
        if (symbol && coin.image) exactLogos[symbol] = coin.image;
      }
    } catch {
      // Fall through to the ranked list lookup when the exact lookup is unavailable.
    }
  }

  return exactLogos;
}
