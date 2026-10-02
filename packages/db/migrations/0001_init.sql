-- HawQ initial schema
-- Applied automatically on first container start via docker-entrypoint-initdb.d,
-- or manually with: psql "$DATABASE_URL" -f packages/db/migrations/0001_init.sql

CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ── Protocols (DefiLlama-sourced) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS protocols (
  slug        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  chain       TEXT NOT NULL,
  chains      TEXT[] NOT NULL DEFAULT '{}',
  category    TEXT,
  logo        TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Time-series TVL snapshots, one row per protocol per ingestion run.
CREATE TABLE IF NOT EXISTS protocol_tvl_snapshots (
  time        TIMESTAMPTZ NOT NULL,
  slug        TEXT NOT NULL REFERENCES protocols(slug) ON DELETE CASCADE,
  tvl         DOUBLE PRECISION NOT NULL,
  change_1d   DOUBLE PRECISION,
  change_7d   DOUBLE PRECISION,
  mcap        DOUBLE PRECISION
);
SELECT create_hypertable('protocol_tvl_snapshots', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_tvl_snapshots_slug_time
  ON protocol_tvl_snapshots (slug, time DESC);

-- Chain-level aggregate TVL over time (computed from protocol_tvl_snapshots).
CREATE TABLE IF NOT EXISTS chain_tvl_snapshots (
  time   TIMESTAMPTZ NOT NULL,
  chain  TEXT NOT NULL,
  tvl    DOUBLE PRECISION NOT NULL,
  share  DOUBLE PRECISION NOT NULL
);
SELECT create_hypertable('chain_tvl_snapshots', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_chain_tvl_chain_time
  ON chain_tvl_snapshots (chain, time DESC);

-- ── Total TVL history (DefiLlama historicalChainTvl) ──────────────────────
CREATE TABLE IF NOT EXISTS total_tvl_history (
  date  TIMESTAMPTZ PRIMARY KEY,
  tvl   DOUBLE PRECISION NOT NULL
);

-- ── Prices ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_snapshots (
  time    TIMESTAMPTZ NOT NULL,
  symbol  TEXT NOT NULL,
  price   DOUBLE PRECISION NOT NULL,
  change_24h DOUBLE PRECISION
);
SELECT create_hypertable('price_snapshots', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_price_symbol_time ON price_snapshots (symbol, time DESC);

-- ── Multi-chain wallet intelligence (Solana / Base / Arbitrum / Robinhood Chain) ──
-- One row per tracked address per ingestion run. Zcash is intentionally excluded here:
-- only transparent-address activity is ever public on Zcash, so wallet-level balance
-- tracking is not offered for it — see chain_network_stats instead.
CREATE TABLE IF NOT EXISTS chain_wallet_snapshots (
  time            TIMESTAMPTZ NOT NULL,
  chain           TEXT NOT NULL,          -- 'solana' | 'base' | 'arbitrum' | 'robinhood'
  address         TEXT NOT NULL,
  native_balance  DOUBLE PRECISION NOT NULL,
  tx_count_recent INTEGER NOT NULL DEFAULT 0,
  raw             JSONB
);
SELECT create_hypertable('chain_wallet_snapshots', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_wallet_snapshots_chain_addr_time
  ON chain_wallet_snapshots (chain, address, time DESC);

-- ── Chain-level network stats (covers Zcash: transparent-pool + network only) ──
CREATE TABLE IF NOT EXISTS chain_network_stats (
  time          TIMESTAMPTZ NOT NULL,
  chain         TEXT NOT NULL,             -- 'zcash' | 'solana' | 'base' | 'arbitrum' | 'robinhood'
  block_height  BIGINT,
  metrics       JSONB NOT NULL             -- chain-specific: hashrate, shielded-pool size, gas price, tps, etc.
);
SELECT create_hypertable('chain_network_stats', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_network_stats_chain_time
  ON chain_network_stats (chain, time DESC);

-- ── Ingestion job run log (observability) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS ingestion_runs (
  id          BIGSERIAL PRIMARY KEY,
  job         TEXT NOT NULL,
  started_at  TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  status      TEXT NOT NULL DEFAULT 'running', -- running | success | failed
  error       TEXT
);
