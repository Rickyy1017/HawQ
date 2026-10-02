-- HawQ migration 0002 — Perps + Predictions (demo scope)
-- Run after 0001_init.sql: psql "$DATABASE_URL" -f packages/db/migrations/0002_perps_predictions.sql

-- ── Perps market data (Hyperliquid) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS perps_market_snapshots (
  time            TIMESTAMPTZ NOT NULL,
  venue           TEXT NOT NULL DEFAULT 'hyperliquid',
  symbol          TEXT NOT NULL,           -- e.g. 'BTC', 'ETH', 'SOL'
  mark_price      DOUBLE PRECISION,
  funding_rate    DOUBLE PRECISION,        -- current/predicted funding rate
  open_interest   DOUBLE PRECISION,
  day_volume      DOUBLE PRECISION
);
SELECT create_hypertable('perps_market_snapshots', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_perps_venue_symbol_time
  ON perps_market_snapshots (venue, symbol, time DESC);

-- ── Prediction market data (Polymarket) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS prediction_markets (
  id            TEXT PRIMARY KEY,          -- Polymarket condition/market id
  venue         TEXT NOT NULL DEFAULT 'polymarket',
  question      TEXT NOT NULL,
  category      TEXT NOT NULL,             -- 'sports' | 'politics' | 'finance' | 'other'
  region_tag    TEXT,                      -- e.g. 'nigeria' when detected, else null
  end_date      TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prediction_market_snapshots (
  time          TIMESTAMPTZ NOT NULL,
  market_id     TEXT NOT NULL REFERENCES prediction_markets(id) ON DELETE CASCADE,
  yes_price     DOUBLE PRECISION,          -- implied probability, 0-1
  no_price      DOUBLE PRECISION,
  volume        DOUBLE PRECISION,
  liquidity     DOUBLE PRECISION
);
SELECT create_hypertable('prediction_market_snapshots', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_pred_market_time ON prediction_market_snapshots (market_id, time DESC);

-- ── Simulated / testnet positions (demo only — never real-money) ──────────
-- product: 'perp' (Hyperliquid testnet order — real testnet fill, fake funds)
--          'prediction' (Polymarket — fully simulated, logged only, never sent anywhere)
--          'spot' (non-custodial swap quote a user chose to log)
CREATE TABLE IF NOT EXISTS simulated_positions (
  id            BIGSERIAL PRIMARY KEY,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  product       TEXT NOT NULL,
  venue         TEXT NOT NULL,
  symbol_or_market TEXT NOT NULL,
  side          TEXT NOT NULL,             -- 'long'|'short' for perps, 'yes'|'no' for predictions
  size_usd      DOUBLE PRECISION NOT NULL,
  entry_price   DOUBLE PRECISION,
  status        TEXT NOT NULL DEFAULT 'open', -- open | closed
  is_testnet    BOOLEAN NOT NULL DEFAULT true,
  wallet_address TEXT,                     -- the user's own wallet; HawQ never custodies funds
  meta          JSONB
);
CREATE INDEX IF NOT EXISTS idx_sim_positions_wallet ON simulated_positions (wallet_address, created_at DESC);
