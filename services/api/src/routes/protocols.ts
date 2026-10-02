import type { FastifyInstance } from "fastify";
import { pool } from "../db";

export async function protocolsRoutes(app: FastifyInstance) {
  // Latest known TVL per protocol (most recent snapshot for each slug).
  app.get("/", async () => {
    const { rows } = await pool.query(`
      SELECT DISTINCT ON (s.slug)
        p.name, p.slug, p.chain, p.chains, p.category, p.logo,
        s.tvl, s.change_1d AS "change1d", s.change_7d AS "change7d", s.mcap, s.time
      FROM protocol_tvl_snapshots s
      JOIN protocols p ON p.slug = s.slug
      ORDER BY s.slug, s.time DESC
    `);
    return rows;
  });

  app.get("/:slug/history", async (req) => {
    const { slug } = req.params as { slug: string };
    const { rows } = await pool.query(
      `SELECT time, tvl FROM protocol_tvl_snapshots WHERE slug = $1 ORDER BY time ASC LIMIT 500`,
      [slug],
    );
    return rows;
  });

  app.get("/tvl/history", async () => {
    const { rows } = await pool.query(
      `SELECT date, tvl FROM total_tvl_history ORDER BY date ASC LIMIT 400`,
    );
    return rows;
  });
}
