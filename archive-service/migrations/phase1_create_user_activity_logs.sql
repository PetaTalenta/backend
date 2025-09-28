-- Migration: Create User Activity Logs Table for Admin Actions Tracking
-- Purpose: Implement audit trail for all admin actions on users
-- Date: 2025-01-20
-- Phase: 1 - Enhanced User Management

-- Connect to the database
\c atma_db;

-- Set search path to include archive schema
SET search_path TO archive, public;

-- Create user_activity_logs table for tracking admin actions
CREATE TABLE IF NOT EXISTS archive.user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL, -- Track which admin performed the action
  activity_type VARCHAR(50) NOT NULL,
  activity_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id 
ON archive.user_activity_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_user_activity_logs_admin_id 
ON archive.user_activity_logs(admin_id);

CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at 
ON archive.user_activity_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_user_activity_logs_activity_type 
ON archive.user_activity_logs(activity_type);

-- Composite index for common queries (admin actions by date)
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_admin_date 
ON archive.user_activity_logs(admin_id, created_at);

-- Composite index for user activity timeline
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_date 
ON archive.user_activity_logs(user_id, created_at);

-- Add comments for documentation
COMMENT ON TABLE archive.user_activity_logs IS 'Audit trail for all admin actions performed on users';
COMMENT ON COLUMN archive.user_activity_logs.user_id IS 'ID of the user being acted upon';
COMMENT ON COLUMN archive.user_activity_logs.admin_id IS 'ID of the admin performing the action';
COMMENT ON COLUMN archive.user_activity_logs.activity_type IS 'Type of activity: profile_update, token_balance_update, user_delete, etc.';
COMMENT ON COLUMN archive.user_activity_logs.activity_data IS 'JSON data containing details of the action performed';
COMMENT ON COLUMN archive.user_activity_logs.ip_address IS 'IP address of the admin performing the action';
COMMENT ON COLUMN archive.user_activity_logs.user_agent IS 'User agent string of the admin client';

-- Grant necessary permissions to atma_user
GRANT SELECT, INSERT, UPDATE ON archive.user_activity_logs TO atma_user;
GRANT USAGE ON SEQUENCE archive.user_activity_logs_id_seq TO atma_user;

-- Verify the migration
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'archive' 
    AND table_name = 'user_activity_logs'
ORDER BY ordinal_position;

-- Show created indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'archive' 
    AND tablename = 'user_activity_logs'
ORDER BY indexname;

-- Success message
SELECT 'User Activity Logs table created successfully with indexes' as migration_status;
