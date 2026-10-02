import { readdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";

/**
 * Runs every .sql file in ./migrations, in filename order, against
 * DATABASE_URL. Safe to re-run — each migration file is already written
 * with IF NOT EXISTS / ON CONFLICT guards, so re-running a file that
 * already applied is a no-op, not an error.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." bun run packages/db/migrate.ts
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "migrations");

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  // Hosted providers (Railway, Timescale Cloud, etc.) require SSL; local
  // Docker Postgres does not support it. Set PGSSL=true when pointing at a
  // hosted database.
  const useSsl = process.env.PGSSL === "true";
  const pool = new Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`Found ${files.length} migration file(s): ${files.join(", ")}`);

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf-8");
    console.log(`Applying ${file}...`);
    try {
      await pool.query(sql);
      console.log(`  ✓ ${file} applied`);
    } catch (err) {
      console.error(`  ✗ ${file} failed:`, err instanceof Error ? err.message : err);
      await pool.end();
      process.exit(1);
    }
  }

  console.log("All migrations applied.");
  await pool.end();
}

main();
