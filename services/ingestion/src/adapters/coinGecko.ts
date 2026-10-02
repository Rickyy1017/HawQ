import { safeFetch } from "../http";
import type { PricePoint } from "@hawq/types";

type SimplePrice = Record<string, { usd: number; usd_24h_change: number }>;

const IDS = { bitcoin: "BTC", ethereum: "ETH", tether: "USDT", solana: "SOL", zcash: "ZEC" } as const;

export async function fetchCoinGeckoPrices(): Promise<PricePoint[]> {
  const data = await safeFetch<SimplePrice>(
    `https://api.coingecko.com/api/v3/simple/price?ids=${Object.keys(IDS).join(",")}&vs_currencies=usd&include_24hr_change=true`,
  );
  return (Object.keys(IDS) as (keyof typeof IDS)[])
    .filter((id) => data[id])
    .map((id) => ({
      symbol: IDS[id],
      price: data[id].usd,
      change24h: +(data[id].usd_24h_change ?? 0).toFixed(2),
    }));
}
