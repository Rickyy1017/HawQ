import type { FastifyInstance } from "fastify";
import { pool } from "../db";
import { PREDICTION_CATEGORIES } from "@hawq/types";

export async function predictionsRoutes(app: FastifyInstance) {
  // ?category=sports|politics|finance|other  &region=nigeria
  app.get("/markets", async (req) => {
    const { category, region } = req.query as { category?: string; region?: string };

    const conditions: string[] = [];
    const params: unknown[] = [];
    if (category && (PREDICTION_CATEGORIES as readonly string[]).includes(category)) {
      params.push(category);
      conditions.push(`pm.category = $${params.length}`);
    }
    if (region) {
      params.push(region);
      conditions.push(`pm.region_tag = $${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await pool.query(
      `
      SELECT DISTINCT ON (pm.id)
        pm.id, pm.question, pm.image, pm.icon, pm.category, pm.region_tag AS "regionTag", pm.end_date AS "endDate",
        s.yes_price AS "yesPrice", s.no_price AS "noPrice", s.volume, s.liquidity, s.time
      FROM prediction_markets pm
      JOIN prediction_market_snapshots s ON s.market_id = pm.id
      ${where}
      ORDER BY pm.id, s.time DESC
      `,
      params,
    );
    return rows;
  });
}
