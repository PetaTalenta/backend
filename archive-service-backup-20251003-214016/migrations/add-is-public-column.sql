-- Add is_public column to analysis_results table
-- This allows analysis results to be shared publicly

ALTER TABLE archive.analysis_results
ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

-- Add index for better query performance on public results
CREATE INDEX IF NOT EXISTS idx_analysis_results_is_public
ON archive.analysis_results(is_public)
WHERE is_public = TRUE;

-- Add composite index for public results with user_id
CREATE INDEX IF NOT EXISTS idx_analysis_results_public_user
ON archive.analysis_results(user_id, is_public)
WHERE is_public = TRUE;
