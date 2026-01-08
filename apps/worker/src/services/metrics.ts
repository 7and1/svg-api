/**
 * Performance Metrics Service
 *
 * Collects and reports performance metrics for API operations.
 * Designed to work with Cloudflare Workers Analytics Engine.
 */

export interface MetricData {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp?: number;
}

export interface RequestMetrics {
  endpoint: string;
  method: string;
  status: number;
  duration_ms: number;
  cache_hit: boolean;
  source?: string;
  query?: string;
  result_count?: number;
}

export interface SearchMetrics {
  query: string;
  tokens: number;
  expanded_tokens: number;
  candidates: number;
  results: number;
  search_time_ms: number;
  method: "inverted_index" | "linear" | "cached";
  cache_hit: boolean;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  size: number;
  evictions: number;
}

/**
 * In-memory metrics collector for development and testing.
 * In production, this would send to Analytics Engine or similar.
 */
export class MetricsCollector {
  private metrics: MetricData[] = [];
  private requestMetrics: RequestMetrics[] = [];
  private searchMetrics: SearchMetrics[] = [];
  private cacheStats: CacheMetrics = {
    hits: 0,
    misses: 0,
    size: 0,
    evictions: 0,
  };

  private readonly maxMetrics: number;
  private readonly enabled: boolean;

  constructor(options: { maxMetrics?: number; enabled?: boolean } = {}) {
    this.maxMetrics = options.maxMetrics ?? 1000;
    this.enabled = options.enabled ?? true;
  }

  /**
   * Record a generic metric
   */
  record(data: MetricData): void {
    if (!this.enabled) return;

    this.metrics.push({
      ...data,
      timestamp: data.timestamp ?? Date.now(),
    });

    // Keep metrics bounded
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Record request-level metrics
   */
  recordRequest(metrics: RequestMetrics): void {
    if (!this.enabled) return;

    this.requestMetrics.push(metrics);

    // Keep bounded
    if (this.requestMetrics.length > this.maxMetrics) {
      this.requestMetrics = this.requestMetrics.slice(-this.maxMetrics);
    }

    // Record as generic metric too
    this.record({
      name: "request_duration",
      value: metrics.duration_ms,
      tags: {
        endpoint: metrics.endpoint,
        method: metrics.method,
        status: metrics.status.toString(),
        cache_hit: metrics.cache_hit.toString(),
      },
    });
  }

  /**
   * Record search-specific metrics
   */
  recordSearch(metrics: SearchMetrics): void {
    if (!this.enabled) return;

    this.searchMetrics.push(metrics);

    // Keep bounded
    if (this.searchMetrics.length > this.maxMetrics) {
      this.searchMetrics = this.searchMetrics.slice(-this.maxMetrics);
    }

    // Record as generic metrics
    this.record({
      name: "search_duration",
      value: metrics.search_time_ms,
      tags: {
        method: metrics.method,
        cache_hit: metrics.cache_hit.toString(),
      },
    });

    this.record({
      name: "search_results",
      value: metrics.results,
      tags: {
        method: metrics.method,
      },
    });
  }

  /**
   * Record cache hit
   */
  recordCacheHit(): void {
    if (!this.enabled) return;
    this.cacheStats.hits++;
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(): void {
    if (!this.enabled) return;
    this.cacheStats.misses++;
  }

  /**
   * Record cache eviction
   */
  recordCacheEviction(): void {
    if (!this.enabled) return;
    this.cacheStats.evictions++;
  }

  /**
   * Update cache size
   */
  updateCacheSize(size: number): void {
    if (!this.enabled) return;
    this.cacheStats.size = size;
  }

  /**
   * Get cache hit rate
   */
  getCacheHitRate(): number {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    if (total === 0) return 0;
    return this.cacheStats.hits / total;
  }

  /**
   * Get average request duration for an endpoint
   */
  getAverageRequestDuration(endpoint?: string): number {
    const filtered = endpoint
      ? this.requestMetrics.filter((m) => m.endpoint === endpoint)
      : this.requestMetrics;

    if (filtered.length === 0) return 0;

    const total = filtered.reduce((sum, m) => sum + m.duration_ms, 0);
    return total / filtered.length;
  }

  /**
   * Get average search time
   */
  getAverageSearchTime(): number {
    if (this.searchMetrics.length === 0) return 0;

    const total = this.searchMetrics.reduce(
      (sum, m) => sum + m.search_time_ms,
      0,
    );
    return total / this.searchMetrics.length;
  }

  /**
   * Get percentile value for request duration
   */
  getRequestDurationPercentile(percentile: number): number {
    if (this.requestMetrics.length === 0) return 0;

    const sorted = [...this.requestMetrics]
      .map((m) => m.duration_ms)
      .sort((a, b) => a - b);

    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] ?? 0;
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    total_requests: number;
    total_searches: number;
    avg_request_duration_ms: number;
    avg_search_time_ms: number;
    p50_duration_ms: number;
    p95_duration_ms: number;
    p99_duration_ms: number;
    cache_hit_rate: number;
    cache_stats: CacheMetrics;
  } {
    return {
      total_requests: this.requestMetrics.length,
      total_searches: this.searchMetrics.length,
      avg_request_duration_ms: Math.round(this.getAverageRequestDuration()),
      avg_search_time_ms: Math.round(this.getAverageSearchTime()),
      p50_duration_ms: Math.round(this.getRequestDurationPercentile(50)),
      p95_duration_ms: Math.round(this.getRequestDurationPercentile(95)),
      p99_duration_ms: Math.round(this.getRequestDurationPercentile(99)),
      cache_hit_rate: Number(this.getCacheHitRate().toFixed(3)),
      cache_stats: { ...this.cacheStats },
    };
  }

  /**
   * Get metrics by tag
   */
  getMetricsByTag(tagName: string, tagValue: string): MetricData[] {
    return this.metrics.filter((m) => m.tags?.[tagName] === tagValue);
  }

  /**
   * Get request metrics by status
   */
  getRequestsByStatus(status: number): RequestMetrics[] {
    return this.requestMetrics.filter((m) => m.status === status);
  }

  /**
   * Get error rate (4xx and 5xx responses)
   */
  getErrorRate(): number {
    if (this.requestMetrics.length === 0) return 0;

    const errors = this.requestMetrics.filter((m) => m.status >= 400).length;
    return errors / this.requestMetrics.length;
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clear(): void {
    this.metrics = [];
    this.requestMetrics = [];
    this.searchMetrics = [];
    this.cacheStats = { hits: 0, misses: 0, size: 0, evictions: 0 };
  }

  /**
   * Export metrics in Prometheus format
   */
  toPrometheusFormat(): string {
    const lines: string[] = [];
    const summary = this.getSummary();

    lines.push("# HELP svg_api_requests_total Total number of requests");
    lines.push("# TYPE svg_api_requests_total counter");
    lines.push(`svg_api_requests_total ${summary.total_requests}`);

    lines.push("# HELP svg_api_searches_total Total number of searches");
    lines.push("# TYPE svg_api_searches_total counter");
    lines.push(`svg_api_searches_total ${summary.total_searches}`);

    lines.push(
      "# HELP svg_api_request_duration_ms Average request duration in milliseconds",
    );
    lines.push("# TYPE svg_api_request_duration_ms gauge");
    lines.push(
      `svg_api_request_duration_ms ${summary.avg_request_duration_ms}`,
    );

    lines.push(
      "# HELP svg_api_search_duration_ms Average search duration in milliseconds",
    );
    lines.push("# TYPE svg_api_search_duration_ms gauge");
    lines.push(`svg_api_search_duration_ms ${summary.avg_search_time_ms}`);

    lines.push("# HELP svg_api_cache_hit_rate Cache hit rate");
    lines.push("# TYPE svg_api_cache_hit_rate gauge");
    lines.push(`svg_api_cache_hit_rate ${summary.cache_hit_rate}`);

    lines.push("# HELP svg_api_cache_hits_total Total cache hits");
    lines.push("# TYPE svg_api_cache_hits_total counter");
    lines.push(`svg_api_cache_hits_total ${summary.cache_stats.hits}`);

    lines.push("# HELP svg_api_cache_misses_total Total cache misses");
    lines.push("# TYPE svg_api_cache_misses_total counter");
    lines.push(`svg_api_cache_misses_total ${summary.cache_stats.misses}`);

    lines.push(
      "# HELP svg_api_request_duration_p50_ms 50th percentile request duration",
    );
    lines.push("# TYPE svg_api_request_duration_p50_ms gauge");
    lines.push(`svg_api_request_duration_p50_ms ${summary.p50_duration_ms}`);

    lines.push(
      "# HELP svg_api_request_duration_p95_ms 95th percentile request duration",
    );
    lines.push("# TYPE svg_api_request_duration_p95_ms gauge");
    lines.push(`svg_api_request_duration_p95_ms ${summary.p95_duration_ms}`);

    lines.push(
      "# HELP svg_api_request_duration_p99_ms 99th percentile request duration",
    );
    lines.push("# TYPE svg_api_request_duration_p99_ms gauge");
    lines.push(`svg_api_request_duration_p99_ms ${summary.p99_duration_ms}`);

    return lines.join("\n");
  }
}

// Global metrics instance
let globalMetrics: MetricsCollector | null = null;

/**
 * Get or create global metrics collector
 */
export const getMetrics = (options?: {
  maxMetrics?: number;
  enabled?: boolean;
}): MetricsCollector => {
  if (!globalMetrics) {
    globalMetrics = new MetricsCollector(options);
  }
  return globalMetrics;
};

/**
 * Reset global metrics (for testing)
 */
export const resetMetrics = (): void => {
  globalMetrics = null;
};

/**
 * Create a timer for measuring duration
 */
export const createTimer = (): { stop: () => number } => {
  const start = Date.now();
  return {
    stop: () => Date.now() - start,
  };
};
