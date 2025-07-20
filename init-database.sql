-- =====================================================
-- ATMA Backend Database Initialization Script
-- =====================================================
-- This script creates the complete database schema for ATMA Backend
-- including all schemas, tables, indexes, and initial data
-- 
-- Services covered:
-- - auth-service (auth schema)
-- - archive-service (archive schema) 
-- - assessment-service (assessment schema - placeholder)
-- - analysis-worker (uses archive schema)
-- - public schema for shared data
-- =====================================================

-- Create database if not exists (run this separately if needed)
-- CREATE DATABASE atma_db;

-- Connect to the database
\c atma_db;

-- =====================================================
-- 1. CREATE SCHEMAS
-- =====================================================

-- Create schemas for different services
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS archive;
CREATE SCHEMA IF NOT EXISTS assessment;
-- public schema already exists

-- =====================================================
-- 2. CREATE EXTENSIONS
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable JSONB GIN indexing
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- =====================================================
-- 3. PUBLIC SCHEMA TABLES
-- =====================================================

-- Schools table (shared across services)
CREATE TABLE IF NOT EXISTS public.schools (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for schools table
CREATE INDEX IF NOT EXISTS idx_schools_name ON public.schools(name);
CREATE INDEX IF NOT EXISTS idx_schools_city ON public.schools(city);
CREATE INDEX IF NOT EXISTS idx_schools_province ON public.schools(province);
CREATE INDEX IF NOT EXISTS idx_schools_created_at ON public.schools(created_at);
CREATE INDEX IF NOT EXISTS idx_schools_location ON public.schools(province, city);
CREATE INDEX IF NOT EXISTS idx_schools_full_info ON public.schools(name, city, province);

-- =====================================================
-- 4. AUTH SCHEMA TABLES
-- =====================================================

-- Users table
CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    user_type VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (user_type IN ('user', 'admin', 'superadmin', 'moderator')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    token_balance INTEGER NOT NULL DEFAULT 0 CHECK (token_balance >= 0),
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for users table
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON auth.users(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON auth.users(username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_user_type ON auth.users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON auth.users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON auth.users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_admin_lookup ON auth.users(user_type, is_active, email);

-- User profiles table
CREATE TABLE IF NOT EXISTS auth.user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    full_name VARCHAR(100),
    school_origin VARCHAR(150),
    date_of_birth DATE,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
    school_id INTEGER REFERENCES public.schools(id) ON DELETE SET NULL ON UPDATE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for user_profiles table
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON auth.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON auth.user_profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_school_id ON auth.user_profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_demographics_optimized ON auth.user_profiles(gender, date_of_birth, school_origin);
CREATE INDEX IF NOT EXISTS idx_user_profiles_school_origin ON auth.user_profiles(school_origin);
CREATE INDEX IF NOT EXISTS idx_user_profiles_school_id_idx ON auth.user_profiles(school_id);

-- =====================================================
-- 5. ARCHIVE SCHEMA TABLES
-- =====================================================

-- Analysis results table
CREATE TABLE IF NOT EXISTS archive.analysis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    assessment_data JSONB,
    persona_profile JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'processing', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    assessment_name VARCHAR(255) NOT NULL DEFAULT 'AI-Driven Talent Mapping' CHECK (assessment_name IN ('AI-Driven Talent Mapping', 'AI-Based IQ Test', 'Custom Assessment'))
);

-- Create indexes for analysis_results table
CREATE INDEX IF NOT EXISTS idx_analysis_results_user_id ON archive.analysis_results(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_status ON archive.analysis_results(status);
CREATE INDEX IF NOT EXISTS idx_analysis_results_created_at ON archive.analysis_results(created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_results_assessment_name ON archive.analysis_results(assessment_name);
CREATE INDEX IF NOT EXISTS idx_analysis_results_user_status ON archive.analysis_results(user_id, status);
CREATE INDEX IF NOT EXISTS idx_analysis_results_user_created ON archive.analysis_results(user_id, created_at);

-- GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_analysis_results_assessment_data_gin ON archive.analysis_results USING GIN (assessment_data);
CREATE INDEX IF NOT EXISTS idx_analysis_results_persona_profile_gin ON archive.analysis_results USING GIN (persona_profile);

-- Analysis jobs table
CREATE TABLE IF NOT EXISTS archive.analysis_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id VARCHAR(255) NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    result_id UUID,
    error_message TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    processing_started_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    assessment_name VARCHAR(255) NOT NULL DEFAULT 'AI-Driven Talent Mapping' CHECK (assessment_name IN ('AI-Driven Talent Mapping', 'AI-Based IQ Test', 'Custom Assessment')),
    priority INTEGER NOT NULL DEFAULT 0,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3
);

-- Create indexes for analysis_jobs table
CREATE UNIQUE INDEX IF NOT EXISTS idx_analysis_jobs_job_id ON archive.analysis_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_user_id ON archive.analysis_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status ON archive.analysis_jobs(status);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_created_at ON archive.analysis_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_user_status ON archive.analysis_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_queue_processing ON archive.analysis_jobs(status, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_retry_logic ON archive.analysis_jobs(status, retry_count, max_retries);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_user_status_created ON archive.analysis_jobs(user_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_assessment_name ON archive.analysis_jobs(assessment_name);

-- =====================================================
-- 6. ASSESSMENT SCHEMA TABLES (Placeholder)
-- =====================================================
-- Assessment service is currently stateless, but schema is prepared for future use

-- =====================================================
-- 7. CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON auth.user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_analysis_results_updated_at BEFORE UPDATE ON archive.analysis_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_analysis_jobs_updated_at BEFORE UPDATE ON archive.analysis_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. INSERT INITIAL DATA
-- =====================================================

-- Insert sample schools
INSERT INTO public.schools (name, address, city, province) VALUES
('Universitas Indonesia', 'Jl. Margonda Raya, Pondok Cina', 'Depok', 'Jawa Barat'),
('Institut Teknologi Bandung', 'Jl. Ganesha No.10', 'Bandung', 'Jawa Barat'),
('Universitas Gadjah Mada', 'Bulaksumur', 'Yogyakarta', 'DI Yogyakarta'),
('Institut Teknologi Sepuluh Nopember', 'Jl. Arief Rahman Hakim', 'Surabaya', 'Jawa Timur'),
('Universitas Airlangga', 'Jl. Dharmawangsa Dalam Selatan', 'Surabaya', 'Jawa Timur')
ON CONFLICT DO NOTHING;

-- Insert superadmin user (password: admin123)
-- Note: This is the bcrypt hash for "admin123" with 12 rounds
INSERT INTO auth.users (id, username, email, password_hash, user_type, is_active, token_balance) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'superadmin', 'admin@atma.com', '$2b$12$LQv3c1yqBwEHFl5aBLloe.ays4Vm6pkmvEHQAiULIQu1jW.Ys16WK', 'superadmin', true, 1000)
ON CONFLICT (email) DO NOTHING;

-- Insert superadmin profile
INSERT INTO auth.user_profiles (user_id, full_name, school_origin, gender) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Super Administrator', 'ATMA System', 'prefer_not_to_say')
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================

-- Grant usage on schemas
GRANT USAGE ON SCHEMA auth TO PUBLIC;
GRANT USAGE ON SCHEMA archive TO PUBLIC;
GRANT USAGE ON SCHEMA assessment TO PUBLIC;
GRANT USAGE ON SCHEMA public TO PUBLIC;

-- Grant permissions on tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA auth TO PUBLIC;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA archive TO PUBLIC;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA assessment TO PUBLIC;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO PUBLIC;

-- Grant permissions on sequences
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA auth TO PUBLIC;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA archive TO PUBLIC;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA assessment TO PUBLIC;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO PUBLIC;

-- =====================================================
-- 10. VERIFICATION QUERIES
-- =====================================================

-- Show created schemas
SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('auth', 'archive', 'assessment', 'public') ORDER BY schema_name;

-- Show created tables
SELECT schemaname, tablename FROM pg_tables WHERE schemaname IN ('auth', 'archive', 'assessment', 'public') ORDER BY schemaname, tablename;

-- Show table counts
SELECT 
    'auth.users' as table_name, 
    COUNT(*) as row_count 
FROM auth.users
UNION ALL
SELECT 
    'auth.user_profiles' as table_name, 
    COUNT(*) as row_count 
FROM auth.user_profiles
UNION ALL
SELECT 
    'public.schools' as table_name, 
    COUNT(*) as row_count 
FROM public.schools
UNION ALL
SELECT 
    'archive.analysis_results' as table_name, 
    COUNT(*) as row_count 
FROM archive.analysis_results
UNION ALL
SELECT 
    'archive.analysis_jobs' as table_name, 
    COUNT(*) as row_count 
FROM archive.analysis_jobs;

-- =====================================================
-- SCRIPT COMPLETED SUCCESSFULLY
-- =====================================================

\echo 'Database initialization completed successfully!'
\echo 'Schemas created: auth, archive, assessment, public'
\echo 'Tables created with proper indexes and constraints'
\echo 'Initial data inserted (superadmin user and sample schools)'
\echo 'Superadmin credentials: admin@atma.com / admin123'
