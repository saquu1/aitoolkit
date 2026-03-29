-- Schema Toolkit PostgreSQL Initialization Script
-- This script runs when the PostgreSQL container is first created

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create schema for application data
CREATE SCHEMA IF NOT EXISTS app;

-- Set default search path
ALTER DATABASE schema_toolkit SET search_path TO public, app;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA app TO schema_toolkit;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA app TO schema_toolkit;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA app TO schema_toolkit;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA app TO schema_toolkit;

-- Default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT ALL ON TABLES TO schema_toolkit;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT ALL ON SEQUENCES TO schema_toolkit;

-- Create a simple test table to verify connection
CREATE TABLE IF NOT EXISTS app._health_check (
    id SERIAL PRIMARY KEY,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'healthy'
);

-- Insert health check record
INSERT INTO app._health_check (status) VALUES ('initialized');

-- Output success message
DO $$
BEGIN
    RAISE NOTICE 'Schema Toolkit database initialized successfully!';
END $$;
