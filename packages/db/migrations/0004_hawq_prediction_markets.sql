-- HawQ-authored, play-money prediction markets.
CREATE TABLE IF NOT EXISTS hawq_prediction_markets (
  id                 TEXT PRIMARY KEY,
  question           TEXT NOT NULL,
  description        TEXT,
  category           TEXT NOT NULL CHECK (category IN ('sports', 'politics', 'finance', 'entertainment', 'other')),
  region_tag         TEXT NOT NULL DEFAULT 'nigeria',
  image              TEXT NOT NULL,
  end_date           TIMESTAMPTZ NOT NULL,
  resolution_source  TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'resolved')),
  resolved_outcome   TEXT CHECK (resolved_outcome IN ('yes', 'no')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hawq_prediction_region_category
  ON hawq_prediction_markets (region_tag, category, status, end_date);
