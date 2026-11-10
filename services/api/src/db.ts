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
