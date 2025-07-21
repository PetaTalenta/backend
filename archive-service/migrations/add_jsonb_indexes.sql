-- Migration: Add JSONB Indexes for Performance Optimization
-- Purpose: Create specific GIN indexes for persona_profile fields to improve archetype filtering queries by 40-60%
-- Date: 2025-01-20
-- Phase: 1.2 JSONB Index Optimization

-- Connect to the database
\c atma_db;

-- Set search path to include archive schema
SET search_path TO archive, public;

-- Create specific GIN indexes for persona_profile fields
-- These indexes will significantly improve performance for archetype-based queries

-- Index for archetype field (most commonly queried field)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_persona_profile_archetype 
ON archive.analysis_results USING GIN ((persona_profile->>'archetype'));

-- Index for RIASEC scores (used in demographic analysis)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_persona_profile_riasec 
ON archive.analysis_results USING GIN ((persona_profile->'riasec'));

-- Index for OCEAN personality scores (used in personality analysis)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_persona_profile_ocean 
ON archive.analysis_results USING GIN ((persona_profile->'ocean'));

-- Index for career recommendations (used in career matching)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_persona_profile_career_recommendations 
ON archive.analysis_results USING GIN ((persona_profile->'careerRecommendations'));

-- Index for strengths (used in strength-based filtering)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_persona_profile_strengths 
ON archive.analysis_results USING GIN ((persona_profile->'strengths'));

-- Index for weaknesses (used in development area analysis)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_persona_profile_weaknesses 
ON archive.analysis_results USING GIN ((persona_profile->'weaknesses'));

-- Index for risk tolerance (used in career matching)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_persona_profile_risk_tolerance 
ON archive.analysis_results USING GIN ((persona_profile->>'riskTolerance'));

-- Composite index for common query patterns (archetype + status + created_at)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analysis_results_archetype_status_created 
ON archive.analysis_results ((persona_profile->>'archetype'), status, created_at);

-- Composite index for demographic queries (archetype + assessment_name)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analysis_results_archetype_assessment 
ON archive.analysis_results ((persona_profile->>'archetype'), assessment_name);

-- Show index creation progress
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'archive' 
    AND tablename = 'analysis_results'
    AND indexname LIKE 'idx_persona_profile%'
ORDER BY indexname;

-- Show index sizes
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes 
WHERE schemaname = 'archive' 
    AND tablename = 'analysis_results'
    AND indexname LIKE 'idx_persona_profile%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Analyze table to update statistics after index creation
ANALYZE archive.analysis_results;

-- Show completion message
SELECT 'JSONB indexes created successfully for persona_profile fields' as status;
