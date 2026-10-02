/** Realistic fallback data used when live APIs fail or are rate-limited. */
import type {
  ProtocolTVL,
  PricePoint,
  ChainActivity,
  StablecoinSignal,
  TVLHistoryPoint,
} from '../../types';

export const MOCK_PROTOCOLS: ProtocolTVL[] = [
  { name: "Lido", slug: "lido", chain: "Ethereum", chains: ["Ethereum"], tvl: 38400000000, change1d: 1.2, change7d: 4.1, category: "Liquid Staking", mcap: 1800000000 },
  { name: "EigenLayer", slug: "eigenlayer", chain: "Ethereum", chains: ["Ethereum"], tvl: 18900000000, change1d: -0.8, change7d: 2.3, category: "Restaking" },
  { name: "Aave", slug: "aave", chain: "Ethereum", chains: ["Ethereum", "Polygon", "Avalanche"], tvl: 17200000000, change1d: 0.6, change7d: -1.1, category: "Lending", mcap: 2400000000 },
  { name: "MakerDAO", slug: "makerdao", chain: "Ethereum", chains: ["Ethereum"], tvl: 9200000000, change1d: 0.2, change7d: 1.0, category: "CDP" },
  { name: "Uniswap", slug: "uniswap", chain: "Ethereum", chains: ["Ethereum", "Polygon", "BSC"], tvl: 6100000000, change1d: 2.4, change7d: 6.7, category: "Dexes", mcap: 6000000000 },
  { name: "Pendle", slug: "pendle", chain: "Ethereum", chains: ["Ethereum", "BSC"], tvl: 4800000000, change1d: 3.1, change7d: 9.2, category: "Yield" },
  { name: "PancakeSwap", slug: "pancakeswap", chain: "BSC", chains: ["BSC", "Ethereum"], tvl: 2300000000, change1d: -1.4, change7d: -3.2, category: "Dexes" },
  { name: "Venus", slug: "venus", chain: "BSC", chains: ["BSC"], tvl: 1900000000, change1d: 0.9, change7d: 2.1, category: "Lending" },
  { name: "Curve", slug: "curve-dex", chain: "Ethereum", chains: ["Ethereum", "Polygon"], tvl: 1800000000, change1d: -0.3, change7d: 0.4, category: "Dexes" },
  { name: "Quickswap", slug: "quickswap", chain: "Polygon", chains: ["Polygon"], tvl: 420000000, change1d: 1.7, change7d: 5.0, category: "Dexes" },
];

export const MOCK_PRICES: PricePoint[] = [
  { symbol: "BTC", price: 96420, change24h: 1.8 },
  { symbol: "ETH", price: 3380, change24h: 2.4 },
  { symbol: "USDT", price: 1.0, change24h: 0.01 },
];

export const MOCK_ACTIVITY: ChainActivity[] = [
  { chain: "Ethereum", txCount24h: 1180000, gasGwei: 28, trend: "up" },
  { chain: "BSC", txCount24h: 4200000, gasGwei: 3, trend: "up" },
  { chain: "Polygon", txCount24h: 3100000, gasGwei: 45, trend: "flat" },
];

export function buildMockStablecoinSignals(): StablecoinSignal[] {
  const out: StablecoinSignal[] = [];
  let dom = 61;
  let spread = 4.2;
  const now = Date.now();
  for (let i = 29; i >= 0; i--) {
    dom += (Math.sin(i / 3) + (Math.random() - 0.5)) * 0.4;
    spread += (Math.cos(i / 4) + (Math.random() - 0.5)) * 0.3;
    out.push({
      date: new Date(now - i * 86400000).toISOString().slice(0, 10),
      usdtDominance: +dom.toFixed(2),
      ngnSpread: +Math.max(0, spread).toFixed(2),
      inflow: +(Math.random() * 800 + 200).toFixed(0),
    });
  }
  return out;
}

export function buildMockHistory(seedTvl: number): TVLHistoryPoint[] {
  const out: TVLHistoryPoint[] = [];
  let v = seedTvl * 0.7;
  const now = Math.floor(Date.now() / 1000);
  for (let i = 90; i >= 0; i--) {
    v *= 1 + (Math.random() - 0.46) * 0.04;
    out.push({ date: now - i * 86400, tvl: Math.round(v) });
  }
  out[out.length - 1].tvl = seedTvl;
  return out;
}
