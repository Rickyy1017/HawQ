import { Pool } from "pg";
import type {
  ProtocolTVL,
  ChainTVL,
  WalletSnapshot,
  ChainNetworkStats,
  PricePoint,
  PerpsMarket,
  PredictionMarket,
} from "@hawq/types";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgresql://hawq:hawq_dev_password@localhost:5432/hawq",
});

export async function upsertProtocols(protocols: ProtocolTVL[]): Promise<void> {
  const client = await pool.connect();
  const now = new Date();
  try {
    await client.query("BEGIN");
    for (const p of protocols) {
      await client.query(
        `INSERT INTO protocols (slug, name, chain, chains, category, logo, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name, chain = EXCLUDED.chain, chains = EXCLUDED.chains,
           category = EXCLUDED.category, logo = EXCLUDED.logo, updated_at = EXCLUDED.updated_at`,
        [p.slug, p.name, p.chain, p.chains, p.category ?? null, p.logo ?? null, now],
      );
      await client.query(
        `INSERT INTO protocol_tvl_snapshots (time, slug, tvl, change_1d, change_7d, mcap)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [now, p.slug, p.tvl, p.change1d ?? null, p.change7d ?? null, p.mcap ?? null],
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function insertChainDistribution(chains: ChainTVL[]): Promise<void> {
  const now = new Date();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const c of chains) {
      await client.query(
        `INSERT INTO chain_tvl_snapshots (time, chain, tvl, share) VALUES ($1, $2, $3, $4)`,
        [now, c.chain, c.tvl, c.share],
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function upsertTotalTvlHistory(points: { date: number; tvl: number }[]): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const p of points) {
      await client.query(
        `INSERT INTO total_tvl_history (date, tvl) VALUES (to_timestamp($1), $2)
         ON CONFLICT (date) DO UPDATE SET tvl = EXCLUDED.tvl`,
        [p.date, p.tvl],
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function insertPrices(prices: PricePoint[]): Promise<void> {
  const now = new Date();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const p of prices) {
      await client.query(
        `INSERT INTO price_snapshots (time, symbol, price, change_24h) VALUES ($1, $2, $3, $4)`,
        [now, p.symbol, p.price, p.change24h],
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function insertWalletSnapshot(snap: WalletSnapshot, raw?: unknown): Promise<void> {
  await pool.query(
    `INSERT INTO chain_wallet_snapshots (time, chain, address, native_balance, tx_count_recent, raw)
     VALUES (to_timestamp($1 / 1000.0), $2, $3, $4, $5, $6)`,
    [snap.fetchedAt, snap.chain, snap.address, snap.nativeBalance, snap.txCountRecent, raw ? JSON.stringify(raw) : null],
  );
}

export async function insertNetworkStats(stats: ChainNetworkStats): Promise<void> {
  await pool.query(
    `INSERT INTO chain_network_stats (time, chain, block_height, metrics)
     VALUES (to_timestamp($1 / 1000.0), $2, $3, $4)`,
    [stats.fetchedAt, stats.chain, stats.blockHeight ?? null, JSON.stringify(stats.metrics)],
  );
}

export async function insertPerpsSnapshots(markets: PerpsMarket[]): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const m of markets) {
      await client.query(
        `INSERT INTO perps_market_snapshots (time, venue, symbol, mark_price, funding_rate, open_interest, day_volume)
         VALUES (to_timestamp($1 / 1000.0), $2, $3, $4, $5, $6, $7)`,
        [m.fetchedAt, m.venue, m.symbol, m.markPrice, m.fundingRate, m.openInterest, m.dayVolume],
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function upsertPredictionMarkets(markets: PredictionMarket[]): Promise<void> {
  const now = new Date();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const m of markets) {
      await client.query(
        `INSERT INTO prediction_markets (id, venue, question, category, region_tag, end_date, updated_at)
         VALUES ($1, $2, $3, $4, $5, to_timestamp($6 / 1000.0), $7)
         ON CONFLICT (id) DO UPDATE SET
           question = EXCLUDED.question, category = EXCLUDED.category,
           region_tag = EXCLUDED.region_tag, end_date = EXCLUDED.end_date, updated_at = EXCLUDED.updated_at`,
        [m.id, m.venue, m.question, m.category, m.regionTag ?? null, m.endDate ?? null, now],
      );
      await client.query(
        `INSERT INTO prediction_market_snapshots (time, market_id, yes_price, no_price, volume, liquidity)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [now, m.id, m.yesPrice, m.noPrice, m.volume, m.liquidity],
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function logRunStart(job: string): Promise<number> {
  const res = await pool.query<{ id: number }>(
    `INSERT INTO ingestion_runs (job, started_at, status) VALUES ($1, now(), 'running') RETURNING id`,
    [job],
  );
  return res.rows[0].id;
}

export async function logRunEnd(id: number, status: "success" | "failed", error?: string): Promise<void> {
  await pool.query(
    `UPDATE ingestion_runs SET finished_at = now(), status = $2, error = $3 WHERE id = $1`,
    [id, status, error ?? null],
  );
}
