import { fetchDefiLlamaTVL, fetchDefiLlamaChartAll } from "./adapters/defiLlama";
import { fetchCoinGeckoPrices } from "./adapters/coinGecko";
import { fetchSolanaNetworkStats } from "./adapters/solana";
import { EVM_CHAINS, fetchEvmNetworkStats } from "./adapters/evm";
import { fetchZcashNetworkStats } from "./adapters/zcash";
import { fetchHyperliquidPerps } from "./adapters/hyperliquid";
import { fetchPolymarketMarkets } from "./adapters/polymarket";
import { normalizeProtocols, computeChainDistribution } from "./normalizer";
import {
  upsertProtocols,
  insertChainDistribution,
  upsertTotalTvlHistory,
  insertPrices,
  insertNetworkStats,
  insertPerpsSnapshots,
  upsertPredictionMarkets,
  logRunStart,
  logRunEnd,
} from "./db";

async function runJob(name: string, fn: () => Promise<void>): Promise<void> {
  const runId = await logRunStart(name);
  try {
    await fn();
    await logRunEnd(runId, "success");
    console.log(`[ingestion] ${name} ok`);
  } catch (err) {
    await logRunEnd(runId, "failed", err instanceof Error ? err.message : String(err));
    console.error(`[ingestion] ${name} failed:`, err);
  }
}

async function tvlJob(): Promise<void> {
  const raw = await fetchDefiLlamaTVL();
  const protocols = normalizeProtocols(raw);
  await upsertProtocols(protocols);
  await insertChainDistribution(computeChainDistribution(protocols));
}

async function totalTvlHistoryJob(): Promise<void> {
  const raw = await fetchDefiLlamaChartAll();
  await upsertTotalTvlHistory(raw.slice(-365).map((d) => ({ date: Number(d.date), tvl: d.tvl })));
}

async function pricesJob(): Promise<void> {
  await insertPrices(await fetchCoinGeckoPrices());
}

async function networkStatsJob(): Promise<void> {
  const results = await Promise.allSettled([
    fetchSolanaNetworkStats(),
    fetchZcashNetworkStats(),
    ...EVM_CHAINS.map((cfg) => fetchEvmNetworkStats(cfg)),
  ]);
  for (const r of results) {
    if (r.status === "fulfilled") await insertNetworkStats(r.value);
    else console.error("[ingestion] network stats chain failed:", r.reason);
  }
}

async function perpsJob(): Promise<void> {
  await insertPerpsSnapshots(await fetchHyperliquidPerps());
}

async function predictionsJob(): Promise<void> {
  await upsertPredictionMarkets(await fetchPolymarketMarkets());
}

function every(ms: number, fn: () => Promise<void>): void {
  fn();
  setInterval(fn, ms);
}

export function startScheduler(): void {
  every(5 * 60_000, () => runJob("tvl", tvlJob));
  every(15 * 60_000, () => runJob("total-tvl-history", totalTvlHistoryJob));
  every(60_000, () => runJob("prices", pricesJob));
  every(2 * 60_000, () => runJob("network-stats", networkStatsJob));
  every(30_000, () => runJob("perps", perpsJob));
  every(5 * 60_000, () => runJob("predictions", predictionsJob));
  console.log("[ingestion] scheduler started");
}

if (require.main === module) {
  startScheduler();
}
