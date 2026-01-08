-- D1 Database Schema for SVG API Metrics
--
-- This schema defines tables for storing aggregated metrics
-- from Cloudflare Analytics Engine.
--
-- To initialize:
-- wrangler d1 execute svg-api-metrics --file=db/schema.sql

-- Drop existing tables if they exist (for recreation)
DROP TABLE IF EXISTS metrics_hourly;
DROP TABLE IF EXISTS popular_icons;
DROP TABLE IF EXISTS search_terms;
DROP TABLE IF EXISTS aggregation_state;

-- Hourly aggregated metrics
-- Stores request metrics aggregated by endpoint and hour
CREATE TABLE IF NOT EXISTS metrics_hourly (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hour TEXT NOT NULL, -- ISO 8601 format (YYYY-MM-DDTHH:00:00Z)
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  request_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  avg_duration_ms REAL DEFAULT 0,
  p95_duration_ms REAL DEFAULT 0,
  p99_duration_ms REAL DEFAULT 0,
  cache_hit_count INTEGER DEFAULT 0,
  cache_miss_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('utc')),
  updated_at TEXT DEFAULT (datetime('utc')),
  UNIQUE(hour, endpoint, method)
);

-- Popular icons tracking
-- Tracks which icons are most frequently requested
CREATE TABLE IF NOT EXISTS popular_icons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hour TEXT NOT NULL,
  source TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  request_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('utc')),
  updated_at TEXT DEFAULT (datetime('utc')),
  UNIQUE(hour, source, icon_name)
);

-- Search terms tracking (with privacy via hashing)
-- Tracks search terms without storing the actual query text
CREATE TABLE IF NOT EXISTS search_terms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hour TEXT NOT NULL,
  query_hash TEXT NOT NULL, -- SHA-256 hash of query
  query_length INTEGER NOT NULL, -- Length of original query
  search_count INTEGER DEFAULT 0,
  avg_result_count REAL DEFAULT 0,
  zero_result_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('utc')),
  updated_at TEXT DEFAULT (datetime('utc')),
  UNIQUE(hour, query_hash)
);

-- Aggregation state tracking
-- Tracks the last hour that was successfully aggregated
CREATE TABLE IF NOT EXISTS aggregation_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_processed_hour TEXT,
  last_updated_at TEXT DEFAULT (datetime('utc'))
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_metrics_hourly_time ON metrics_hourly(hour DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_hourly_endpoint ON metrics_hourly(endpoint);
CREATE INDEX IF NOT EXISTS idx_metrics_hourly_method ON metrics_hourly(method);
CREATE INDEX IF NOT EXISTS idx_popular_icons_time ON popular_icons(hour DESC);
CREATE INDEX IF NOT EXISTS idx_popular_icons_count ON popular_icons(request_count DESC);
CREATE INDEX IF NOT EXISTS idx_popular_icons_source ON popular_icons(source);
CREATE INDEX IF NOT EXISTS idx_search_terms_time ON search_terms(hour DESC);
CREATE INDEX IF NOT EXISTS idx_search_terms_count ON search_terms(search_count DESC);

-- Initialize aggregation state
INSERT OR IGNORE INTO aggregation_state (id, last_processed_hour)
VALUES (1, '2024-01-01T00:00:00Z');

-- Create a view for current status
CREATE VIEW IF NOT EXISTS metrics_status AS
SELECT
  datetime('utc') as current_time,
  (SELECT last_processed_hour FROM aggregation_state WHERE id = 1) as last_processed_hour,
  (SELECT COUNT(*) FROM metrics_hourly WHERE hour >= datetime('utc', '-24 hours')) as metrics_last_24h,
  (SELECT COUNT(DISTINCT source || ':' || icon_name) FROM popular_icons WHERE hour >= datetime('utc', '-24 hours')) as unique_icons_last_24h,
  (SELECT SUM(search_count) FROM search_terms WHERE hour >= datetime('utc', '-24 hours')) as total_searches_last_24h;
