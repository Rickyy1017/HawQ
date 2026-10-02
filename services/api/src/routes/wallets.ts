import type { FastifyInstance } from "fastify";
import { pool } from "../db";
import { WALLET_TRACKABLE_CHAINS } from "@hawq/types";

export async function walletsRoutes(app: FastifyInstance) {
  // Most recent stored snapshot for a tracked address on a given chain.
  // Wallet-level tracking is only offered for chains where balances are
  // actually public — see @hawq/types WALLET_TRACKABLE_CHAINS (excludes zcash).
  app.get("/:chain/:address", async (req, reply) => {
    const { chain, address } = req.params as { chain: string; address: string };

    if (!WALLET_TRACKABLE_CHAINS.includes(chain as (typeof WALLET_TRACKABLE_CHAINS)[number])) {
      return reply.code(400).send({
        error: `Wallet-level tracking is not offered for "${chain}". ` +
          `Only transparent-pool and network stats are public for that chain, if it's Zcash — ` +
          `see /api/chains/network-stats instead.`,
      });
    }

    const { rows } = await pool.query(
      `SELECT time, native_balance AS "nativeBalance", tx_count_recent AS "txCountRecent"
       FROM chain_wallet_snapshots
       WHERE chain = $1 AND address = $2
       ORDER BY time DESC LIMIT 1`,
      [chain, address],
    );

    if (!rows.length) {
      return reply.code(404).send({ error: "No snapshot yet for this address — it will appear after the next ingestion run once added to the watchlist." });
    }
    return rows[0];
  });

  app.get("/:chain/:address/history", async (req) => {
    const { chain, address } = req.params as { chain: string; address: string };
    const { rows } = await pool.query(
      `SELECT time, native_balance AS "nativeBalance", tx_count_recent AS "txCountRecent"
       FROM chain_wallet_snapshots
       WHERE chain = $1 AND address = $2
       ORDER BY time ASC LIMIT 500`,
      [chain, address],
    );
    return rows;
  });
}
