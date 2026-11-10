import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgresql://hawq:hawq_dev_password@localhost:5432/hawq",
});

try {
  const u = new URL(process.env.DATABASE_URL ?? "");
  console.log("DB host:", u.hostname, "port:", u.port, "protocol:", u.protocol);
} catch {
  console.log("DATABASE_URL invalid or missing:", JSON.stringify(process.env.DATABASE_URL?.slice(0, 40)));
}

console.log("PGHOST env:", process.env.PGHOST, "| pool host:", (pool as any).options?.host, "| url query:", (() => { try { return new URL(process.env.DATABASE_URL ?? "").search; } catch { return "n/a"; } })());
pool.query("select 1 as ok").then(
  () => console.log("DB startup test: OK"),
  (e) => console.log("DB startup test FAILED:", e?.code, e?.message, e?.stack),
);
