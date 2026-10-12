-- Allow HawQ markets to be published before matching artwork is available.
ALTER TABLE hawq_prediction_markets
  ALTER COLUMN image DROP NOT NULL;
