import type { FastifyInstance } from "fastify";
import { pool } from "../db";
import { SUPPORTED_CHAINS } from "@hawq/types";

export async function chainsRoutes(app: FastifyInstance) {
  // Latest TVL share per chain (from DefiLlama-derived aggregation).
  app.get("/distribution", async () => {
    const { rows } = await pool.query(`
      SELECT DISTINCT ON (chain) chain, tvl, share, time
      FROM chain_tvl_snapshots
      ORDER BY chain, time DESC
    `);
    return rows;
  });

  // Latest network stats for every chain HawQ has a live adapter for.
  // Zcash rows only ever contain network/transparent-pool metrics — see
  // services/ingestion/src/adapters/zcash.ts for why.
  app.get("/network-stats", async () => {
    const { rows } = await pool.query(`
      SELECT DISTINCT ON (chain) chain, block_height AS "blockHeight", metrics, time
      FROM chain_network_stats
      WHERE chain = ANY($1)
      ORDER BY chain, time DESC
    `, [SUPPORTED_CHAINS as unknown as string[]]);
    return rows;
  });

  app.get("/:chain/network-stats/history", async (req) => {
    const { chain } = req.params as { chain: string };
    const { rows } = await pool.query(
      `SELECT time, block_height AS "blockHeight", metrics FROM chain_network_stats
       WHERE chain = $1 ORDER BY time ASC LIMIT 500`,
      [chain],
    );
    return rows;
  });
}
