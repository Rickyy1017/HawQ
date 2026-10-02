import { cached, safeFetch } from "./client";
import type { PricePoint } from '../../types';
import { MOCK_PRICES } from '../mock/data';

type SimplePrice = Record<string, { usd: number; usd_24h_change: number }>;

const IDS = { bitcoin: "BTC", ethereum: "ETH", tether: "USDT" } as const;

/** CoinGecko simple price for BTC/ETH/USDT. Falls back to mock on failure. */
export async function fetchCoinGeckoPrices(): Promise<PricePoint[]> {
  try {
    return await cached("cg:prices", 60_000, async () => {
      const data = await safeFetch<SimplePrice>(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether&vs_currencies=usd&include_24hr_change=true",
      );
      return (Object.keys(IDS) as (keyof typeof IDS)[]).map((id) => ({
        symbol: IDS[id],
        price: data[id]?.usd ?? 0,
        change24h: +(data[id]?.usd_24h_change ?? 0).toFixed(2),
      }));
    });
  } catch {
    return MOCK_PRICES;
  }
}
