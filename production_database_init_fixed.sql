-- =============================================================================
-- ATMA Backend - Production Database Initialization Script
-- =============================================================================
-- This script should be run AFTER the main database dump to prepare for production
-- Run this script as atma_user user

-- =============================================================================
-- 0. CREATE MISSING SCHEMAS
-- =============================================================================

-- Create maintenance schema for cleanup functions
CREATE SCHEMA IF NOT EXISTS maintenance;
ALTER SCHEMA maintenance OWNER TO atma_user;

-- Create monitoring schema for system health views
CREATE SCHEMA IF NOT EXISTS monitoring;
ALTER SCHEMA monitoring OWNER TO atma_user;

-- =============================================================================
-- 1. ENABLE ROW LEVEL SECURITY FOR PRODUCTION
-- =============================================================================

-- Enable RLS globally (was disabled in dump)
SET row_security = on;

-- Enable RLS for sensitive tables
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive.analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive.analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.idempotency_cache ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. FIX PERMISSION ISSUES - REMOVE DANGEROUS PUBLIC ACCESS
-- =============================================================================

-- Revoke dangerous PUBLIC permissions
REVOKE ALL ON TABLE archive.analysis_jobs FROM PUBLIC;
REVOKE ALL ON TABLE archive.analysis_results FROM PUBLIC;
REVOKE ALL ON TABLE auth.user_profiles FROM PUBLIC;
REVOKE ALL ON TABLE auth.users FROM PUBLIC;
REVOKE ALL ON TABLE public.schools FROM PUBLIC;

-- Keep only necessary permissions for atma_user user (which services will use)
GRANT ALL ON ALL TABLES IN SCHEMA auth TO atma_user;
GRANT ALL ON ALL TABLES IN SCHEMA archive TO atma_user;
GRANT ALL ON ALL TABLES IN SCHEMA assessment TO atma_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO atma_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO atma_user;

-- =============================================================================
-- 3. ENABLE ROW LEVEL SECURITY FOR PRODUCTION (SIMPLIFIED)
-- =============================================================================

-- Note: For production with atma_user user, we'll enable RLS but allow atma_user full access
-- This provides security framework while allowing services to function properly

-- Enable RLS for sensitive tables
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive.analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive.analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.idempotency_cache ENABLE ROW LEVEL SECURITY;

-- Create permissive policy for atma_user user (services will use application-level security)
CREATE POLICY atma_user_full_access ON auth.users
    FOR ALL TO atma_user
    USING (true);

CREATE POLICY atma_user_full_access_profiles ON auth.user_profiles
    FOR ALL TO atma_user
    USING (true);

CREATE POLICY atma_user_full_access_jobs ON archive.analysis_jobs
    FOR ALL TO atma_user
    USING (true);

CREATE POLICY atma_user_full_access_results ON archive.analysis_results
    FOR ALL TO atma_user
    USING (true);

CREATE POLICY atma_user_full_access_cache ON assessment.idempotency_cache
    FOR ALL TO atma_user
    USING (true);

-- =============================================================================
-- 4. INSERT INITIAL PRODUCTION DATA
-- =============================================================================

-- Insert superadmin user (password: admin123)
INSERT INTO auth.users (
    id, 
    username, 
    email, 
    password_hash, 
    user_type, 
    is_active, 
    token_balance,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'superadmin',
    'admin@atma.com',
    '$2b$10$FmFCtaG3LEGDxVI/VEL39OoUDTaXdVvac4YMp8qQbroptSxZ2JG4a',  -- admin123
    'superadmin',
    true,
    1000,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    user_type = EXCLUDED.user_type,
    token_balance = EXCLUDED.token_balance,
    updated_at = NOW();

-- Insert sample schools for testing
INSERT INTO public.schools (name, address, city, province, created_at) VALUES
('SMA Negeri 1 Jakarta', 'Jl. Budi Utomo No. 7', 'Jakarta Pusat', 'DKI Jakarta', NOW()),
('SMA Negeri 3 Bandung', 'Jl. Belitung No. 8', 'Bandung', 'Jawa Barat', NOW()),
('SMA Negeri 1 Surabaya', 'Jl. Wijaya Kusuma No. 48', 'Surabaya', 'Jawa Timur', NOW()),
('SMA Negeri 1 Yogyakarta', 'Jl. HOS Cokroaminoto No. 10', 'Yogyakarta', 'DI Yogyakarta', NOW()),
('SMA Negeri 1 Medan', 'Jl. Mistar No. 7', 'Medan', 'Sumatera Utara', NOW())
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 5. CREATE PRODUCTION MAINTENANCE FUNCTIONS
-- =============================================================================

-- Function to cleanup old idempotency cache (run daily)
CREATE OR REPLACE FUNCTION maintenance.cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Cleanup expired idempotency cache
    DELETE FROM assessment.idempotency_cache 
    WHERE expires_at < NOW() - INTERVAL '1 day';
    
    -- Cleanup old analysis jobs (keep last 30 days)
    DELETE FROM archive.analysis_jobs 
    WHERE created_at < NOW() - INTERVAL '30 days'
    AND status IN ('completed', 'failed');
    
    -- Log cleanup
    RAISE NOTICE 'Cleanup completed at %', NOW();
END;
$$;

-- =============================================================================
-- 6. CREATE MONITORING VIEWS
-- =============================================================================

-- View for monitoring system health
CREATE OR REPLACE VIEW monitoring.system_health AS
SELECT 
    'users' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as new_today
FROM auth.users
UNION ALL
SELECT 
    'analysis_jobs',
    COUNT(*),
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')
FROM archive.analysis_jobs
UNION ALL
SELECT 
    'analysis_results',
    COUNT(*),
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')
FROM archive.analysis_results;

-- =============================================================================
-- 7. GRANT NECESSARY PERMISSIONS
-- =============================================================================

-- Grant usage on schemas (atma_user user already has all permissions as superuser)
GRANT USAGE ON SCHEMA auth TO atma_user;
GRANT USAGE ON SCHEMA archive TO atma_user;
GRANT USAGE ON SCHEMA assessment TO atma_user;
GRANT USAGE ON SCHEMA public TO atma_user;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION assessment.cleanup_expired_idempotency_cache() TO atma_user;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO atma_user;

COMMIT;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================
-- Run these to verify the setup:

-- 1. Check superadmin user exists
-- SELECT * FROM auth.users WHERE user_type = 'superadmin';

-- 2. Check schools data
-- SELECT COUNT(*) FROM public.schools;

-- 3. Check RLS is enabled
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables 
-- WHERE schemaname IN ('auth', 'archive', 'assessment') AND rowsecurity = true;

-- 4. Check ownership
-- SELECT schemaname, tablename, tableowner FROM pg_tables 
-- WHERE schemaname IN ('auth', 'archive', 'assessment');
