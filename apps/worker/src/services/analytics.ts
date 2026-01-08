/**
 * Analytics Service
 *
 * Uses Cloudflare Analytics Engine for write-optimized metrics collection
 * and D1 for aggregated, queryable data.
 */

import type {
  RequestMetrics,
  SearchMetrics as BaseSearchMetrics,
} from "./metrics";

// Analytics Engine event types
export type AnalyticsEventType =
  | "request"
  | "icon_fetch"
  | "search"
  | "batch"
  | "error";

// Analytics Engine event blob structure
export interface AnalyticsEvent {
  // Common fields (automatically indexed by Analytics Engine)
  endpoint?: string;
  method?: string;
  status?: number; // Converted to double
  cache_hit?: number; // 1 for true, 0 for false (boolean not supported)
  duration_ms?: number;

  // Icon-specific fields
  source?: string;
  icon_name?: string;

  // Search-specific fields
  query?: string;
  result_count?: number;
  search_method?: string; // "inverted_index", "linear", "cached"

  // Error tracking
  error_type?: string;
  error_message?: string;

  // Request metadata
  user_agent_hash?: string; // Hashed for privacy
  country?: string; // Auto-populated by CF

  // Versioning
  api_version?: string;
}

// D1 aggregated metrics tables
export interface HourlyMetricsRow {
  hour: string; // ISO 8601 format (YYYY-MM-DDTHH:00:00Z)
  endpoint: string;
  method: string;
  request_count: number;
  success_count: number;
  error_count: number;
  avg_duration_ms: number;
  p95_duration_ms: number;
  p99_duration_ms: number;
  cache_hit_count: number;
  cache_miss_count: number;
}

export interface PopularIconRow {
  hour: string;
  source: string;
  icon_name: string;
  request_count: number;
  unique_sources: number; // Number of different sources (if tracking)
}

export interface SearchTermRow {
  hour: string;
  query_hash: string; // SHA-256 hash of query for privacy
  query_length: number; // Length of original query
  search_count: number;
  avg_result_count: number;
  zero_result_count: number;
}

// D1 schema SQL
export const D1_SCHEMA = `
-- Drop existing tables if they exist (for recreation)
DROP TABLE IF EXISTS metrics_hourly;
DROP TABLE IF EXISTS popular_icons;
DROP TABLE IF EXISTS search_terms;
DROP TABLE IF EXISTS aggregation_state;

-- Hourly aggregated metrics
CREATE TABLE metrics_hourly (
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
  UNIQUE(hour, endpoint, method)
);

-- Popular icons tracking
CREATE TABLE popular_icons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hour TEXT NOT NULL,
  source TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  request_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('utc')),
  UNIQUE(hour, source, icon_name)
);

-- Search terms tracking (with privacy via hashing)
CREATE TABLE search_terms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hour TEXT NOT NULL,
  query_hash TEXT NOT NULL, -- SHA-256 hash
  query_length INTEGER NOT NULL,
  search_count INTEGER DEFAULT 0,
  avg_result_count REAL DEFAULT 0,
  zero_result_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('utc')),
  UNIQUE(hour, query_hash)
);

-- Aggregation state tracking
CREATE TABLE aggregation_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_processed_hour TEXT,
  last_updated_at TEXT DEFAULT (datetime('utc'))
);

-- Create indexes for faster queries
CREATE INDEX idx_metrics_hourly_time ON metrics_hourly(hour DESC);
CREATE INDEX idx_metrics_hourly_endpoint ON metrics_hourly(endpoint);
CREATE INDEX idx_popular_icons_time ON popular_icons(hour DESC);
CREATE INDEX idx_popular_icons_count ON popular_icons(request_count DESC);
CREATE INDEX idx_search_terms_time ON search_terms(hour DESC);
CREATE INDEX idx_search_terms_count ON search_terms(search_count DESC);

-- Initialize aggregation state
INSERT OR IGNORE INTO aggregation_state (id, last_processed_hour)
VALUES (1, '2024-01-01T00:00:00Z');
`;

export class AnalyticsService {
  constructor(
    private analyticsEngine: AnalyticsEngineDataset,
    private db: D1Database,
  ) {}

  /**
   * Record a request event to Analytics Engine
   */
  recordRequest(
    metrics: RequestMetrics & {
      userAgent?: string;
      country?: string;
      apiVersion?: string;
    },
  ): void {
    const userAgentHash = metrics.userAgent
      ? this.hashUserAgent(metrics.userAgent)
      : undefined;

    this.analyticsEngine.writeDataPoint({
      blobs: [
        metrics.endpoint ?? "unknown",
        metrics.method ?? "GET",
        metrics.source ?? "",
        metrics.apiVersion ?? "1.0",
      ],
      doubles: [metrics.status, metrics.duration_ms, metrics.cache_hit ? 1 : 0],
      indexes: [userAgentHash ?? ""],
    });
  }

  /**
   * Record an icon fetch event
   */
  recordIconFetch(options: {
    source: string;
    iconName: string;
    durationMs: number;
    cacheHit: boolean;
    status: number;
    userAgent?: string;
    apiVersion?: string;
  }): void {
    const userAgentHash = options.userAgent
      ? this.hashUserAgent(options.userAgent)
      : undefined;

    this.analyticsEngine.writeDataPoint({
      blobs: [
        "icon_fetch",
        options.source,
        options.iconName,
        options.apiVersion ?? "1.0",
      ],
      doubles: [options.durationMs, options.cacheHit ? 1 : 0, options.status],
      indexes: [userAgentHash ?? ""],
    });
  }

  /**
   * Record a search event
   */
  recordSearch(
    metrics: Omit<BaseSearchMetrics, "expanded_tokens"> & {
      query: string;
      userAgent?: string;
      apiVersion?: string;
    },
  ): void {
    const userAgentHash = metrics.userAgent
      ? this.hashUserAgent(metrics.userAgent)
      : undefined;

    this.analyticsEngine.writeDataPoint({
      blobs: [
        "search",
        metrics.query,
        metrics.method,
        metrics.cache_hit ? "true" : "false",
        metrics.apiVersion ?? "1.0",
      ],
      doubles: [
        metrics.search_time_ms,
        metrics.tokens,
        metrics.candidates,
        metrics.results,
      ],
      indexes: [userAgentHash ?? ""],
    });
  }

  /**
   * Record an error event
   */
  recordError(options: {
    endpoint: string;
    errorType: string;
    errorMessage: string;
    userAgent?: string;
    apiVersion?: string;
  }): void {
    const userAgentHash = options.userAgent
      ? this.hashUserAgent(options.userAgent)
      : undefined;

    this.analyticsEngine.writeDataPoint({
      blobs: [
        "error",
        options.endpoint,
        options.errorType,
        options.errorMessage.substring(0, 100), // Truncate long messages
        options.apiVersion ?? "1.0",
      ],
      indexes: [userAgentHash ?? ""],
    });
  }

  /**
   * Aggregate metrics from Analytics Engine to D1
   * This should be called by a cron trigger on an hourly basis
   */
  async aggregateHourlyMetrics(targetHour?: string): Promise<{
    processed: number;
    errors: number;
  }> {
    const hour =
      targetHour ||
      new Date(Date.now() - 60 * 60 * 1000).toISOString().slice(0, 13) +
        ":00:00Z";

    let processed = 0;
    let errors = 0;

    try {
      // Note: Analytics Engine SQL API doesn't support direct aggregation
      // This is a placeholder for the actual aggregation logic
      // In production, you would use CF's Analytics Engine API to query
      // and then insert into D1

      // For now, we'll set up prepared statements for manual insertion
      const metricsStmt = this.db.prepare(`
        INSERT INTO metrics_hourly (
          hour, endpoint, method, request_count, success_count, error_count,
          avg_duration_ms, cache_hit_count, cache_miss_count
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
        ON CONFLICT(hour, endpoint, method) DO UPDATE SET
          request_count = request_count + ?4,
          success_count = success_count + ?5,
          error_count = error_count + ?6,
          avg_duration_ms = (avg_duration_ms + ?7) / 2,
          cache_hit_count = cache_hit_count + ?8,
          cache_miss_count = cache_miss_count + ?9
      `);

      const popularIconsStmt = this.db.prepare(`
        INSERT INTO popular_icons (hour, source, icon_name, request_count)
        VALUES (?1, ?2, ?3, ?4)
        ON CONFLICT(hour, source, icon_name) DO UPDATE SET
          request_count = request_count + ?4
      `);

      const searchTermsStmt = this.db.prepare(`
        INSERT INTO search_terms (hour, query_hash, query_length, search_count, avg_result_count, zero_result_count)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        ON CONFLICT(hour, query_hash) DO UPDATE SET
          search_count = search_count + ?4,
          avg_result_count = (avg_result_count + ?5) / 2,
          zero_result_count = zero_result_count + ?6
      `);

      // Update aggregation state
      await this.db
        .prepare(
          `UPDATE aggregation_state SET last_processed_hour = ?1, last_updated_at = datetime('utc')`,
        )
        .bind(hour)
        .run();

      processed = 1;
    } catch (err) {
      errors++;
      console.error("Error aggregating metrics:", err);
    }

    return { processed, errors };
  }

  /**
   * Query hourly metrics from D1
   */
  async getHourlyMetrics(hours: number = 24): Promise<HourlyMetricsRow[]> {
    const result = await this.db
      .prepare(
        `
        SELECT * FROM metrics_hourly
        WHERE hour >= datetime('utc', '-' || ?1 || ' hours')
        ORDER BY hour DESC, endpoint
      `,
      )
      .bind(hours.toString())
      .all<HourlyMetricsRow>();

    return result.results ?? [];
  }

  /**
   * Get popular icons for a time period
   */
  async getPopularIcons(
    hours: number = 24,
    limit: number = 50,
  ): Promise<PopularIconRow[]> {
    const result = await this.db
      .prepare(
        `
        SELECT * FROM popular_icons
        WHERE hour >= datetime('utc', '-' || ?1 || ' hours')
        GROUP BY source, icon_name
        ORDER BY SUM(request_count) DESC
        LIMIT ?2
      `,
      )
      .bind(hours.toString(), limit.toString())
      .all<PopularIconRow>();

    return result.results ?? [];
  }

  /**
   * Get top search terms
   */
  async getTopSearchTerms(
    hours: number = 24,
    limit: number = 50,
  ): Promise<SearchTermRow[]> {
    const result = await this.db
      .prepare(
        `
        SELECT query_hash, query_length, SUM(search_count) as search_count,
               AVG(avg_result_count) as avg_result_count, SUM(zero_result_count) as zero_result_count
        FROM search_terms
        WHERE hour >= datetime('utc', '-' || ?1 || ' hours')
        GROUP BY query_hash
        ORDER BY search_count DESC
        LIMIT ?2
      `,
      )
      .bind(hours.toString(), limit.toString())
      .all<SearchTermRow>();

    return result.results ?? [];
  }

  /**
   * Get aggregation status
   */
  async getAggregationStatus(): Promise<{
    lastProcessedHour: string | null;
    lastUpdatedAt: string | null;
  }> {
    const result = await this.db
      .prepare(
        `SELECT last_processed_hour, last_updated_at FROM aggregation_state WHERE id = 1`,
      )
      .first<{
        last_processed_hour: string | null;
        last_updated_at: string | null;
      }>();

    return {
      lastProcessedHour: result?.last_processed_hour ?? null,
      lastUpdatedAt: result?.last_updated_at ?? null,
    };
  }

  /**
   * Hash user agent for privacy (simple hash, in production use crypto)
   */
  private hashUserAgent(userAgent: string): string {
    // Simple hash for demonstration - use crypto.subtle.digest in production
    let hash = 0;
    const str = userAgent.substring(0, 100); // Limit input length
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

/**
 * Get analytics service from env
 */
export const getAnalyticsService = (env: {
  ANALYTICS?: AnalyticsEngineDataset;
  METRICS_DB?: D1Database;
}): AnalyticsService | null => {
  if (!env.ANALYTICS || !env.METRICS_DB) {
    return null;
  }
  return new AnalyticsService(env.ANALYTICS, env.METRICS_DB);
};
