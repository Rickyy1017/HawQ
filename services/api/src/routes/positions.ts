import type { FastifyInstance } from "fastify";
import { pool } from "../db";
import { SimulatedPositionSchema } from "@hawq/types";

/**
 * This route only ever LOGS a position record — it never places, signs, or
 * broadcasts a transaction on the user's behalf. For 'perp', the actual
 * testnet order is placed client-side (the user's wallet signs it against
 * Hyperliquid testnet); the frontend calls this route afterward to record
 * the result for the track-record / portfolio view. For 'prediction', there
 * is no real order anywhere — this IS the entire "trade". HawQ never
 * custodies funds in any of these paths.
 */
export async function positionsRoutes(app: FastifyInstance) {
  app.post("/", async (req, reply) => {
    const parsed = SimulatedPositionSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const p = parsed.data;
    const { rows } = await pool.query(
      `INSERT INTO simulated_positions
         (product, venue, symbol_or_market, side, size_usd, entry_price, is_testnet, wallet_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, created_at AS "createdAt"`,
      [p.product, p.venue, p.symbolOrMarket, p.side, p.sizeUsd, p.entryPrice ?? null, p.isTestnet, p.walletAddress ?? null],
    );
    return reply.code(201).send(rows[0]);
  });

  app.get("/", async (req) => {
    const { wallet } = req.query as { wallet?: string };
    const { rows } = await pool.query(
      wallet
        ? `SELECT * FROM simulated_positions WHERE wallet_address = $1 ORDER BY created_at DESC LIMIT 200`
        : `SELECT * FROM simulated_positions ORDER BY created_at DESC LIMIT 200`,
      wallet ? [wallet] : [],
    );
    return rows;
  });
}
