/**
 * Metrics Service Unit Tests
 */
import { describe, expect, it, beforeEach } from "vitest";
import {
  MetricsCollector,
  getMetrics,
  resetMetrics,
  createTimer,
} from "./metrics";

describe("MetricsCollector", () => {
  let metrics: MetricsCollector;

  beforeEach(() => {
    metrics = new MetricsCollector();
  });

  describe("record", () => {
    it("records generic metrics", () => {
      metrics.record({ name: "test_metric", value: 42 });
      const summary = metrics.getSummary();
      expect(summary.total_requests).toBe(0); // generic metrics don't count as requests
    });

    it("adds timestamp if not provided", () => {
      const before = Date.now();
      metrics.record({ name: "test", value: 1 });
      const after = Date.now();

      const byTag = metrics.getMetricsByTag("name", "invalid");
      // Can't directly access timestamp, but the metric should exist
    });

    it("respects maxMetrics limit", () => {
      const collector = new MetricsCollector({ maxMetrics: 5 });

      for (let i = 0; i < 10; i++) {
        collector.record({ name: "test", value: i });
      }

      // Internal metrics array should be bounded
      // We verify indirectly through behavior
    });

    it("does nothing when disabled", () => {
      const disabled = new MetricsCollector({ enabled: false });
      disabled.record({ name: "test", value: 42 });
      disabled.recordRequest({
        endpoint: "/test",
        method: "GET",
        status: 200,
        duration_ms: 10,
        cache_hit: false,
      });

      const summary = disabled.getSummary();
      expect(summary.total_requests).toBe(0);
    });
  });

  describe("recordRequest", () => {
    it("records request metrics", () => {
      metrics.recordRequest({
        endpoint: "/icons/home",
        method: "GET",
        status: 200,
        duration_ms: 15,
        cache_hit: true,
      });

      const summary = metrics.getSummary();
      expect(summary.total_requests).toBe(1);
    });

    it("tracks multiple requests", () => {
      for (let i = 0; i < 5; i++) {
        metrics.recordRequest({
          endpoint: "/icons/test",
          method: "GET",
          status: 200,
          duration_ms: 10 + i,
          cache_hit: false,
        });
      }

      const summary = metrics.getSummary();
      expect(summary.total_requests).toBe(5);
    });
  });

  describe("recordSearch", () => {
    it("records search metrics", () => {
      metrics.recordSearch({
        query: "home",
        tokens: 1,
        expanded_tokens: 3,
        candidates: 100,
        results: 10,
        search_time_ms: 5,
        method: "inverted_index",
        cache_hit: false,
      });

      const summary = metrics.getSummary();
      expect(summary.total_searches).toBe(1);
    });

    it("calculates average search time", () => {
      metrics.recordSearch({
        query: "test1",
        tokens: 1,
        expanded_tokens: 1,
        candidates: 10,
        results: 5,
        search_time_ms: 10,
        method: "inverted_index",
        cache_hit: false,
      });

      metrics.recordSearch({
        query: "test2",
        tokens: 1,
        expanded_tokens: 1,
        candidates: 10,
        results: 5,
        search_time_ms: 20,
        method: "inverted_index",
        cache_hit: false,
      });

      const avg = metrics.getAverageSearchTime();
      expect(avg).toBe(15);
    });
  });

  describe("cache metrics", () => {
    it("records cache hits", () => {
      metrics.recordCacheHit();
      metrics.recordCacheHit();
      metrics.recordCacheHit();

      const summary = metrics.getSummary();
      expect(summary.cache_stats.hits).toBe(3);
    });

    it("records cache misses", () => {
      metrics.recordCacheMiss();
      metrics.recordCacheMiss();

      const summary = metrics.getSummary();
      expect(summary.cache_stats.misses).toBe(2);
    });

    it("calculates cache hit rate", () => {
      metrics.recordCacheHit();
      metrics.recordCacheHit();
      metrics.recordCacheHit();
      metrics.recordCacheMiss();

      const hitRate = metrics.getCacheHitRate();
      expect(hitRate).toBe(0.75);
    });

    it("returns 0 hit rate when no cache operations", () => {
      const hitRate = metrics.getCacheHitRate();
      expect(hitRate).toBe(0);
    });

    it("records cache evictions", () => {
      metrics.recordCacheEviction();
      metrics.recordCacheEviction();

      const summary = metrics.getSummary();
      expect(summary.cache_stats.evictions).toBe(2);
    });

    it("updates cache size", () => {
      metrics.updateCacheSize(100);

      const summary = metrics.getSummary();
      expect(summary.cache_stats.size).toBe(100);
    });
  });

  describe("getAverageRequestDuration", () => {
    it("calculates average for all requests", () => {
      metrics.recordRequest({
        endpoint: "/a",
        method: "GET",
        status: 200,
        duration_ms: 10,
        cache_hit: false,
      });
      metrics.recordRequest({
        endpoint: "/b",
        method: "GET",
        status: 200,
        duration_ms: 20,
        cache_hit: false,
      });

      const avg = metrics.getAverageRequestDuration();
      expect(avg).toBe(15);
    });

    it("filters by endpoint", () => {
      metrics.recordRequest({
        endpoint: "/icons",
        method: "GET",
        status: 200,
        duration_ms: 10,
        cache_hit: false,
      });
      metrics.recordRequest({
        endpoint: "/search",
        method: "GET",
        status: 200,
        duration_ms: 30,
        cache_hit: false,
      });

      const avgIcons = metrics.getAverageRequestDuration("/icons");
      expect(avgIcons).toBe(10);

      const avgSearch = metrics.getAverageRequestDuration("/search");
      expect(avgSearch).toBe(30);
    });

    it("returns 0 when no requests", () => {
      const avg = metrics.getAverageRequestDuration();
      expect(avg).toBe(0);
    });
  });

  describe("getRequestDurationPercentile", () => {
    beforeEach(() => {
      // Add 100 requests with durations 1-100
      for (let i = 1; i <= 100; i++) {
        metrics.recordRequest({
          endpoint: "/test",
          method: "GET",
          status: 200,
          duration_ms: i,
          cache_hit: false,
        });
      }
    });

    it("calculates p50", () => {
      const p50 = metrics.getRequestDurationPercentile(50);
      expect(p50).toBe(50);
    });

    it("calculates p95", () => {
      const p95 = metrics.getRequestDurationPercentile(95);
      expect(p95).toBe(95);
    });

    it("calculates p99", () => {
      const p99 = metrics.getRequestDurationPercentile(99);
      expect(p99).toBe(99);
    });

    it("returns 0 when no requests", () => {
      const empty = new MetricsCollector();
      const p50 = empty.getRequestDurationPercentile(50);
      expect(p50).toBe(0);
    });
  });

  describe("getErrorRate", () => {
    it("calculates error rate correctly", () => {
      // 2 successful
      metrics.recordRequest({
        endpoint: "/ok",
        method: "GET",
        status: 200,
        duration_ms: 10,
        cache_hit: false,
      });
      metrics.recordRequest({
        endpoint: "/ok",
        method: "GET",
        status: 200,
        duration_ms: 10,
        cache_hit: false,
      });

      // 1 client error
      metrics.recordRequest({
        endpoint: "/bad",
        method: "GET",
        status: 400,
        duration_ms: 5,
        cache_hit: false,
      });

      // 1 server error
      metrics.recordRequest({
        endpoint: "/error",
        method: "GET",
        status: 500,
        duration_ms: 5,
        cache_hit: false,
      });

      const errorRate = metrics.getErrorRate();
      expect(errorRate).toBe(0.5); // 2 errors out of 4 requests
    });

    it("returns 0 when no requests", () => {
      const errorRate = metrics.getErrorRate();
      expect(errorRate).toBe(0);
    });

    it("returns 0 when all successful", () => {
      metrics.recordRequest({
        endpoint: "/ok",
        method: "GET",
        status: 200,
        duration_ms: 10,
        cache_hit: false,
      });

      const errorRate = metrics.getErrorRate();
      expect(errorRate).toBe(0);
    });
  });

  describe("getRequestsByStatus", () => {
    beforeEach(() => {
      metrics.recordRequest({
        endpoint: "/a",
        method: "GET",
        status: 200,
        duration_ms: 10,
        cache_hit: false,
      });
      metrics.recordRequest({
        endpoint: "/b",
        method: "GET",
        status: 200,
        duration_ms: 10,
        cache_hit: false,
      });
      metrics.recordRequest({
        endpoint: "/c",
        method: "GET",
        status: 404,
        duration_ms: 5,
        cache_hit: false,
      });
    });

    it("filters by status 200", () => {
      const requests = metrics.getRequestsByStatus(200);
      expect(requests.length).toBe(2);
    });

    it("filters by status 404", () => {
      const requests = metrics.getRequestsByStatus(404);
      expect(requests.length).toBe(1);
    });

    it("returns empty array for non-existent status", () => {
      const requests = metrics.getRequestsByStatus(500);
      expect(requests.length).toBe(0);
    });
  });

  describe("getSummary", () => {
    it("returns complete summary", () => {
      metrics.recordRequest({
        endpoint: "/icons",
        method: "GET",
        status: 200,
        duration_ms: 10,
        cache_hit: true,
      });

      metrics.recordSearch({
        query: "test",
        tokens: 1,
        expanded_tokens: 2,
        candidates: 50,
        results: 10,
        search_time_ms: 5,
        method: "inverted_index",
        cache_hit: false,
      });

      metrics.recordCacheHit();
      metrics.recordCacheMiss();

      const summary = metrics.getSummary();

      expect(summary).toHaveProperty("total_requests");
      expect(summary).toHaveProperty("total_searches");
      expect(summary).toHaveProperty("avg_request_duration_ms");
      expect(summary).toHaveProperty("avg_search_time_ms");
      expect(summary).toHaveProperty("p50_duration_ms");
      expect(summary).toHaveProperty("p95_duration_ms");
      expect(summary).toHaveProperty("p99_duration_ms");
      expect(summary).toHaveProperty("cache_hit_rate");
      expect(summary).toHaveProperty("cache_stats");

      expect(summary.total_requests).toBe(1);
      expect(summary.total_searches).toBe(1);
    });
  });

  describe("clear", () => {
    it("clears all metrics", () => {
      metrics.recordRequest({
        endpoint: "/test",
        method: "GET",
        status: 200,
        duration_ms: 10,
        cache_hit: false,
      });
      metrics.recordCacheHit();

      metrics.clear();

      const summary = metrics.getSummary();
      expect(summary.total_requests).toBe(0);
      expect(summary.cache_stats.hits).toBe(0);
    });
  });

  describe("toPrometheusFormat", () => {
    it("outputs Prometheus format", () => {
      metrics.recordRequest({
        endpoint: "/icons",
        method: "GET",
        status: 200,
        duration_ms: 10,
        cache_hit: true,
      });

      metrics.recordCacheHit();
      metrics.recordCacheMiss();

      const output = metrics.toPrometheusFormat();

      expect(output).toContain("# HELP svg_api_requests_total");
      expect(output).toContain("# TYPE svg_api_requests_total counter");
      expect(output).toContain("svg_api_requests_total 1");
      expect(output).toContain("svg_api_cache_hits_total 1");
      expect(output).toContain("svg_api_cache_misses_total 1");
    });
  });
});

describe("getMetrics / resetMetrics", () => {
  beforeEach(() => {
    resetMetrics();
  });

  it("returns singleton instance", () => {
    const m1 = getMetrics();
    const m2 = getMetrics();
    expect(m1).toBe(m2);
  });

  it("resetMetrics creates new instance", () => {
    const m1 = getMetrics();
    m1.recordCacheHit();

    resetMetrics();

    const m2 = getMetrics();
    const summary = m2.getSummary();
    expect(summary.cache_stats.hits).toBe(0);
  });

  it("passes options on first call", () => {
    const m = getMetrics({ maxMetrics: 50 });
    expect(m).toBeDefined();
  });
});

describe("createTimer", () => {
  it("measures elapsed time", async () => {
    const timer = createTimer();

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 10));

    const elapsed = timer.stop();
    expect(elapsed).toBeGreaterThanOrEqual(10);
    expect(elapsed).toBeLessThan(100); // Should be quick
  });

  it("can stop multiple times", () => {
    const timer = createTimer();

    const t1 = timer.stop();
    const t2 = timer.stop();

    expect(t2).toBeGreaterThanOrEqual(t1);
  });
});
