-- Migration: add assessment_data JSONB column to archive.analysis_jobs
-- Safe to run multiple times (IF NOT EXISTS guards)

ALTER TABLE archive.analysis_jobs
  ADD COLUMN IF NOT EXISTS assessment_data JSONB;

-- Optional GIN index if you plan to query inside assessment_data frequently.
-- Comment out if not needed.
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_assessment_data
  ON archive.analysis_jobs USING GIN (assessment_data);

-- Rollback (manual):
-- ALTER TABLE archive.analysis_jobs DROP COLUMN assessment_data; -- (will also drop index automatically)
