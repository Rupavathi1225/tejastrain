-- Add wr column to related_searches table
ALTER TABLE related_searches ADD COLUMN IF NOT EXISTS wr integer DEFAULT 1;

-- Add comment to explain the column
COMMENT ON COLUMN related_searches.wr IS 'Web Result set identifier (1-4). Each value maps to a different set of web results.';