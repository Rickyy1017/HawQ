import type { FastifyInstance } from "fastify";
import { pool } from "../db";

export async function perpsRoutes(app: FastifyInstance) {
  app.get("/markets", async () => {
    const { rows } = await pool.query(`
      SELECT DISTINCT ON (symbol)
        symbol, mark_price AS "markPrice", funding_rate AS "fundingRate",
        open_interest AS "openInterest", day_volume AS "dayVolume", time
      FROM perps_market_snapshots
      WHERE venue = 'hyperliquid'
      ORDER BY symbol, time DESC
    `);
    return rows;
  });

  app.get("/markets/:symbol/history", async (req) => {
    const { symbol } = req.params as { symbol: string };
    const { rows } = await pool.query(
      `SELECT time, mark_price AS "markPrice", funding_rate AS "fundingRate"
       FROM perps_market_snapshots WHERE symbol = $1 ORDER BY time ASC LIMIT 500`,
      [symbol],
    );
    return rows;
  });
}
