-- Add chatbot_id column to analysis_results table
-- This allows linking analysis results to chatbot conversations
-- Migration: add-chatbot-id-column.sql
-- Date: 2025-01-26

-- Connect to the database
\c atma_db;

-- Set search path to include archive schema
SET search_path TO archive, chat, public;

-- Add chatbot_id column to analysis_results table
-- This column references chat.conversations.id to link analysis results with chatbot conversations
ALTER TABLE archive.analysis_results
ADD COLUMN IF NOT EXISTS chatbot_id UUID NULL;

-- Add foreign key constraint to reference chat.conversations.id
-- Note: We use ON DELETE SET NULL to preserve analysis results if conversation is deleted
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_analysis_results_chatbot_id'
        AND table_schema = 'archive'
        AND table_name = 'analysis_results'
    ) THEN
        ALTER TABLE archive.analysis_results
        ADD CONSTRAINT fk_analysis_results_chatbot_id
        FOREIGN KEY (chatbot_id) REFERENCES chat.conversations(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add index for better query performance on chatbot_id
CREATE INDEX IF NOT EXISTS idx_analysis_results_chatbot_id
ON archive.analysis_results(chatbot_id)
WHERE chatbot_id IS NOT NULL;

-- Add composite index for common query patterns (chatbot_id + status)
CREATE INDEX IF NOT EXISTS idx_analysis_results_chatbot_status
ON archive.analysis_results(chatbot_id, status)
WHERE chatbot_id IS NOT NULL;

-- Add composite index for chatbot_id + created_at for chronological queries
CREATE INDEX IF NOT EXISTS idx_analysis_results_chatbot_created
ON archive.analysis_results(chatbot_id, created_at)
WHERE chatbot_id IS NOT NULL;

-- Show the updated table structure
\d archive.analysis_results;

-- Show index creation progress
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'archive' 
    AND tablename = 'analysis_results'
    AND indexname LIKE '%chatbot%'
ORDER BY indexname;

-- Add comment for documentation
COMMENT ON COLUMN archive.analysis_results.chatbot_id IS 'Reference to chat.conversations.id - links analysis result to chatbot conversation';

-- Grant necessary permissions to atma_user
GRANT SELECT, INSERT, UPDATE ON archive.analysis_results TO atma_user;

-- Verify the migration
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'archive' 
    AND table_name = 'analysis_results' 
    AND column_name = 'chatbot_id';

-- Show foreign key constraints
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'archive'
    AND tc.table_name = 'analysis_results'
    AND kcu.column_name = 'chatbot_id';

COMMIT;
