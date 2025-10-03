-- Phase 2: Create system_metrics table for admin monitoring
-- This migration creates the system_metrics table for tracking system-wide metrics

-- Create system_metrics table
CREATE TABLE IF NOT EXISTS archive.system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(100) NOT NULL,
  metric_value NUMERIC,
  metric_data JSONB,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance (following Phase 1 indexing strategy)
CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON archive.system_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded_at ON archive.system_metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_system_metrics_name_recorded ON archive.system_metrics(metric_name, recorded_at);

-- Insert initial system health metric
INSERT INTO archive.system_metrics (metric_name, metric_value, metric_data)
VALUES ('system_health', 1, ('{"status": "healthy", "initialized_at": "' || NOW() || '"}')::jsonb)
ON CONFLICT DO NOTHING;

-- Grant permissions to atma_user (the actual database user)
GRANT SELECT, INSERT, UPDATE, DELETE ON archive.system_metrics TO atma_user;
GRANT USAGE ON SCHEMA archive TO atma_user;

-- Add comment for documentation
COMMENT ON TABLE archive.system_metrics IS 'System-wide metrics for admin monitoring and analytics - Phase 2 implementation';
COMMENT ON COLUMN archive.system_metrics.metric_name IS 'Name of the metric (e.g., system_health, job_queue_length, success_rate)';
COMMENT ON COLUMN archive.system_metrics.metric_value IS 'Numeric value of the metric';
COMMENT ON COLUMN archive.system_metrics.metric_data IS 'Additional JSON data for complex metrics';
COMMENT ON COLUMN archive.system_metrics.recorded_at IS 'Timestamp when the metric was recorded';
