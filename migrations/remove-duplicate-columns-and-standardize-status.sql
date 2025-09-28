-- Migration: Remove Duplicate Columns and Standardize Status
-- Purpose: Remove duplicate columns from analysis_results and standardize status values
-- Date: 2025-01-28
-- Author: System Refactoring

-- Connect to the database
\c atma_db;

-- Set search path to include archive schema
SET search_path TO archive, public;

-- Start transaction
BEGIN;

-- =====================================================
-- STEP 1: Update existing status values to standardized format
-- =====================================================

-- Update analysis_jobs: change 'cancelled' to 'failed' with appropriate error message
UPDATE archive.analysis_jobs
SET
    status = 'failed',
    error_message = COALESCE(error_message, 'Job was cancelled'),
    completed_at = COALESCE(completed_at, updated_at)
WHERE status = 'cancelled';

-- Update analysis_jobs: change 'complete' to 'completed'
UPDATE archive.analysis_jobs
SET status = 'completed'
WHERE status = 'complete';

-- Update analysis_jobs: change 'queue' to 'queued'
UPDATE archive.analysis_jobs
SET status = 'queued'
WHERE status = 'queue';

-- Log the number of updated jobs
DO $$
DECLARE
    cancelled_count INTEGER;
    complete_count INTEGER;
    queue_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO cancelled_count FROM archive.analysis_jobs WHERE status = 'failed' AND error_message LIKE '%cancelled%';
    SELECT COUNT(*) INTO complete_count FROM archive.analysis_jobs WHERE status = 'completed';
    SELECT COUNT(*) INTO queue_count FROM archive.analysis_jobs WHERE status = 'queued';

    RAISE NOTICE 'Updated status values:';
    RAISE NOTICE '  - cancelled to failed: % jobs', cancelled_count;
    RAISE NOTICE '  - complete to completed: % jobs', complete_count;
    RAISE NOTICE '  - queue to queued: % jobs', queue_count;
END $$;

-- =====================================================
-- STEP 2: Handle view dependency and remove duplicate columns
-- =====================================================

-- First, drop the status_summary view that depends on analysis_results.status
DROP VIEW IF EXISTS archive.status_summary;

-- Drop indexes related to columns we're removing
DROP INDEX IF EXISTS archive.idx_analysis_results_status;
DROP INDEX IF EXISTS archive.idx_analysis_results_assessment_name;

-- Remove duplicate columns from analysis_results table
-- These columns are now managed only in analysis_jobs table
ALTER TABLE archive.analysis_results
    DROP COLUMN IF EXISTS status,
    DROP COLUMN IF EXISTS error_message,
    DROP COLUMN IF EXISTS assessment_name;

-- Recreate the status_summary view using only analysis_jobs
CREATE VIEW archive.status_summary AS
SELECT 'jobs'::text AS table_name,
    analysis_jobs.status,
    count(*) AS count,
    min(analysis_jobs.created_at) AS oldest,
    max(analysis_jobs.created_at) AS newest
FROM archive.analysis_jobs
GROUP BY analysis_jobs.status
ORDER BY 1, 2;

-- =====================================================
-- STEP 3: Update status constraints in analysis_jobs
-- =====================================================

-- First, check if there are any invalid status values
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM archive.analysis_jobs 
    WHERE status NOT IN ('queued', 'processing', 'completed', 'failed');
    
    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Found % jobs with invalid status values. Please fix these before running migration.', invalid_count;
    END IF;
    
    RAISE NOTICE 'All status values are valid. Proceeding with constraint update.';
END $$;

-- Drop existing check constraint if it exists
ALTER TABLE archive.analysis_jobs 
    DROP CONSTRAINT IF EXISTS analysis_jobs_status_check;

-- Add new check constraint with only 4 allowed status values
ALTER TABLE archive.analysis_jobs 
    ADD CONSTRAINT analysis_jobs_status_check 
    CHECK (status IN ('queued', 'processing', 'completed', 'failed'));

-- Log the constraint update
DO $$
BEGIN
    RAISE NOTICE 'Updated status constraint to allow only: queued, processing, completed, failed';
END $$;

-- =====================================================
-- STEP 4: Add validation for failed status
-- =====================================================

-- Add check constraint to ensure failed jobs have error messages
ALTER TABLE archive.analysis_jobs 
    ADD CONSTRAINT analysis_jobs_failed_error_message_check 
    CHECK (
        (status = 'failed' AND error_message IS NOT NULL AND trim(error_message) != '') 
        OR status != 'failed'
    );

-- Log the validation constraint
DO $$
BEGIN
    RAISE NOTICE 'Added validation constraint: failed jobs must have error_message';
END $$;

-- =====================================================
-- STEP 5: Update any jobs that violate the new constraint
-- =====================================================

-- Fix any failed jobs without error messages
UPDATE archive.analysis_jobs 
SET error_message = 'Job failed - no specific error message available'
WHERE status = 'failed' 
  AND (error_message IS NULL OR trim(error_message) = '');

-- Log the fix
DO $$
DECLARE
    fixed_count INTEGER;
BEGIN
    GET DIAGNOSTICS fixed_count = ROW_COUNT;
    RAISE NOTICE 'Fixed % failed jobs without error messages', fixed_count;
END $$;

-- =====================================================
-- STEP 6: Verify the migration
-- =====================================================

-- Check final status distribution
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE 'Final status distribution in analysis_jobs:';
    FOR rec IN 
        SELECT status, COUNT(*) as count 
        FROM archive.analysis_jobs 
        GROUP BY status 
        ORDER BY status
    LOOP
        RAISE NOTICE '  %: % jobs', rec.status, rec.count;
    END LOOP;
END $$;

-- Verify analysis_results structure
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns 
    WHERE table_schema = 'archive' 
      AND table_name = 'analysis_results'
      AND column_name IN ('status', 'error_message', 'assessment_name');
    
    IF col_count = 0 THEN
        RAISE NOTICE 'SUCCESS: All duplicate columns removed from analysis_results';
    ELSE
        RAISE WARNING 'WARNING: % duplicate columns still exist in analysis_results', col_count;
    END IF;
END $$;

-- Commit the transaction
COMMIT;

-- =====================================================
-- STEP 7: Show final summary
-- =====================================================

\echo '=============================================='
\echo 'MIGRATION COMPLETED SUCCESSFULLY'
\echo '=============================================='
\echo 'Changes made:'
\echo '1. Updated cancelled jobs to failed status'
\echo '2. Removed duplicate columns from analysis_results:'
\echo '   - status'
\echo '   - error_message' 
\echo '   - assessment_name'
\echo '3. Updated status constraint to 4 values only:'
\echo '   - queued, processing, completed, failed'
\echo '4. Added validation for failed jobs error messages'
\echo '5. Fixed any failed jobs without error messages'
\echo '=============================================='

-- Show current table structures
\echo 'Current analysis_jobs columns:'
\d archive.analysis_jobs

\echo 'Current analysis_results columns:'
\d archive.analysis_results
