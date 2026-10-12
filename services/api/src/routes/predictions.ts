import { randomUUID, timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { CreateHawqPredictionMarketSchema, CreateHawqPredictionMarketsBatchSchema, PREDICTION_CATEGORIES } from "@hawq/types";
import { pool } from "../db";

function isAdmin(req: { headers: Record<string, string | string[] | undefined> }) {
  const configured = process.env.HAWQ_MARKETS_ADMIN_KEY;
  const supplied = req.headers["x-hawq-admin-key"];
  if (!configured || typeof supplied !== "string") return false;
  const expected = Buffer.from(configured);
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function predictionsRoutes(app: FastifyInstance) {
  app.get("/markets/admin", async (req, reply) => {
    if (!isAdmin(req)) return reply.code(401).send({ error: "Admin key required." });
    const { rows } = await pool.query(
      `SELECT id, question, category, region_tag AS "regionTag", image,
        end_date AS "endDate", resolution_source AS "resolutionSource", status,
        resolved_outcome AS "resolvedOutcome"
       FROM hawq_prediction_markets
       ORDER BY created_at DESC`,
    );
    return rows;
  });

  // ?category=sports|politics|finance|entertainment|other &region=nigeria
  app.get("/markets", async (req) => {
    const { category, region } = req.query as { category?: string; region?: string };
    const polyConditions = ["(pm.image IS NOT NULL OR pm.icon IS NOT NULL)"];
    const polyParams: unknown[] = [];
    const hawqConditions = ["hm.status = 'open'", "hm.end_date > now()"];
    const hawqParams: unknown[] = [];

    if (category && (PREDICTION_CATEGORIES as readonly string[]).includes(category)) {
      polyParams.push(category);
      hawqParams.push(category);
      polyConditions.push(`pm.category = $${polyParams.length}`);
      hawqConditions.push(`hm.category = $${hawqParams.length}`);
    }
    if (region) {
      polyParams.push(region);
      hawqParams.push(region);
      polyConditions.push(`pm.region_tag = $${polyParams.length}`);
      hawqConditions.push(`hm.region_tag = $${hawqParams.length}`);
    }

    const [poly, hawq] = await Promise.all([
      pool.query(
        `SELECT DISTINCT ON (pm.id)
          pm.id, pm.question, pm.image, pm.icon, pm.category,
          pm.region_tag AS "regionTag", pm.end_date AS "endDate",
          s.yes_price AS "yesPrice", s.no_price AS "noPrice", s.volume, s.liquidity,
          'polymarket' AS venue, NULL::text AS description, NULL::text AS "resolutionSource",
          'open'::text AS status
         FROM prediction_markets pm
         JOIN prediction_market_snapshots s ON s.market_id = pm.id
         WHERE ${polyConditions.join(" AND ")}
         ORDER BY pm.id, s.time DESC`,
        polyParams,
      ),
      pool.query(
        `SELECT hm.id, hm.question, hm.description, hm.image, hm.image AS icon,
          hm.category, hm.region_tag AS "regionTag", hm.end_date AS "endDate",
          hm.resolution_source AS "resolutionSource", hm.status,
          COALESCE((votes.yes_stake + 1) / NULLIF(votes.yes_stake + votes.no_stake + 2, 0), 0.5)::float8 AS "yesPrice",
          COALESCE((votes.no_stake + 1) / NULLIF(votes.yes_stake + votes.no_stake + 2, 0), 0.5)::float8 AS "noPrice",
          COALESCE(votes.volume, 0)::float8 AS volume,
          0::float8 AS liquidity, 'hawq' AS venue
         FROM hawq_prediction_markets hm
         LEFT JOIN LATERAL (
           SELECT
             COALESCE(SUM(size_usd) FILTER (WHERE side = 'yes'), 0)::float8 AS yes_stake,
             COALESCE(SUM(size_usd) FILTER (WHERE side = 'no'), 0)::float8 AS no_stake,
             COALESCE(SUM(size_usd), 0)::float8 AS volume
           FROM simulated_positions
           WHERE product = 'prediction' AND venue = 'hawq'
             AND symbol_or_market = hm.id AND status = 'open'
         ) votes ON TRUE
         WHERE ${hawqConditions.join(" AND ")}
         ORDER BY hm.created_at DESC`,
        hawqParams,
      ),
    ]);
    return [...hawq.rows, ...poly.rows];
  });

  app.post("/markets", async (req, reply) => {
    if (!isAdmin(req)) return reply.code(401).send({ error: "Admin key required." });
    const parsed = CreateHawqPredictionMarketSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid market." });

    const market = parsed.data;
    const id = `hawq-${randomUUID()}`;
    const { rows } = await pool.query(
      `INSERT INTO hawq_prediction_markets
        (id, question, description, category, region_tag, image, end_date, resolution_source)
       VALUES ($1, $2, $3, $4, 'nigeria', $5, $6, $7)
       RETURNING id, question, description, category, region_tag AS "regionTag",
         image, image AS icon, end_date AS "endDate", resolution_source AS "resolutionSource",
         status, 0.5::float8 AS "yesPrice", 0.5::float8 AS "noPrice",
         0::float8 AS volume, 0::float8 AS liquidity, 'hawq' AS venue`,
      [id, market.question, market.description, market.category, market.image ?? null, market.endDate, market.resolutionSource],
    );
    return reply.code(201).send(rows[0]);
  });

  app.post("/markets/bulk", async (req, reply) => {
    if (!isAdmin(req)) return reply.code(401).send({ error: "Admin key required." });
    const parsed = CreateHawqPredictionMarketsBatchSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid market batch." });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const rows = [];
      for (const market of parsed.data) {
        const id = `hawq-${randomUUID()}`;
        const result = await client.query(
          `INSERT INTO hawq_prediction_markets
            (id, question, description, category, region_tag, image, end_date, resolution_source)
           VALUES ($1, $2, $3, $4, 'nigeria', $5, $6, $7)
           RETURNING id, question, description, category, region_tag AS "regionTag",
             image, image AS icon, end_date AS "endDate", resolution_source AS "resolutionSource",
             status, 0.5::float8 AS "yesPrice", 0.5::float8 AS "noPrice",
             0::float8 AS volume, 0::float8 AS liquidity, 'hawq' AS venue`,
          [id, market.question, market.description, market.category, market.image ?? null, market.endDate, market.resolutionSource],
        );
        rows.push(result.rows[0]);
      }
      await client.query("COMMIT");
      return reply.code(201).send(rows);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  });

  app.post("/markets/:id/resolve", async (req, reply) => {
    if (!isAdmin(req)) return reply.code(401).send({ error: "Admin key required." });
    const { id } = req.params as { id: string };
    const body = req.body as { outcome?: unknown };
    if (body?.outcome !== "yes" && body?.outcome !== "no") {
      return reply.code(400).send({ error: "Outcome must be yes or no." });
    }
    const result = await pool.query(
      `UPDATE hawq_prediction_markets
       SET status = 'resolved', resolved_outcome = $2, updated_at = now()
       WHERE id = $1 AND status = 'open' AND end_date <= now()
       RETURNING id, status, resolved_outcome AS "resolvedOutcome"`,
      [id, body.outcome],
    );
    if (!result.rowCount) {
      const existing = await pool.query(
        `SELECT status, end_date > now() AS "notClosed" FROM hawq_prediction_markets WHERE id = $1`,
        [id],
      );
      if (!existing.rowCount) return reply.code(404).send({ error: "HawQ market not found." });
      if (existing.rows[0].notClosed) return reply.code(409).send({ error: "This market has not reached its close date." });
      return reply.code(409).send({ error: "This market has already been resolved or closed." });
    }
    return result.rows[0];
  });

  app.patch("/markets/:id/image", async (req, reply) => {
    if (!isAdmin(req)) return reply.code(401).send({ error: "Admin key required." });
    const { id } = req.params as { id: string };
    const body = req.body as { image?: unknown };
    if (body?.image !== null && (typeof body?.image !== "string" || !body.image.startsWith("https://"))) {
      return reply.code(400).send({ error: "Image must be an HTTPS URL or null." });
    }
    const result = await pool.query(
      `UPDATE hawq_prediction_markets SET image = $2, updated_at = now()
       WHERE id = $1 RETURNING id, image`,
      [id, body.image],
    );
    if (!result.rowCount) return reply.code(404).send({ error: "HawQ market not found." });
    return result.rows[0];
  });
}
