/**
 * Metrics collection utility for performance monitoring
 * Tracks cache hits/misses, latencies, errors, and throughput
 */

interface Counter {
  value: number;
  lastUpdated: number;
}

interface HistogramEntry {
  sum: number;
  count: number;
  min: number;
  max: number;
  buckets: Map<number, number>; // threshold -> count
}

interface TimerMetric {
  totalMs: number;
  count: number;
  avgMs: number;
  p95Ms: number;
  p99Ms: number;
  samples: number[];
}

// In-memory metrics store (resets on worker restart)
const counters = new Map<string, Counter>();
const histograms = new Map<string, HistogramEntry>();
const timers = new Map<string, TimerMetric>();

// Default histogram buckets in ms
const DEFAULT_BUCKETS = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

// Maximum samples to keep for timer metrics
const MAX_SAMPLES = 1000;

/**
 * Record a cache hit
 */
export const recordCacheHit = (layer: string, name: string): void => {
  increment(`cache_hit_${layer}_${name}`);
};

/**
 * Record a cache miss
 */
export const recordCacheMiss = (layer: string, name: string): void => {
  increment(`cache_miss_${layer}_${name}`);
};

/**
 * Record request deduplication hit
 */
export const recordDedupHit = (source: string, key: string): void => {
  increment(`dedup_hit_${source}`);
};

/**
 * Record operation latency
 */
export const recordLatency = (service: string, operation: string, ms: number): void => {
  const key = `${service}_${operation}`;
  recordHistogram(key, ms);
  recordTimer(key, ms);
};

/**
 * Record a slow query
 */
export const recordSlowQuery = (service: string, operation: string, ms: number): void => {
  increment(`slow_query_${service}_${operation}`);
  console.warn(`[Slow Query] ${service}.${operation}: ${ms.toFixed(2)}ms`);
};

/**
 * Record an error
 */
export const recordError = (service: string, operation: string, errorType: string): void => {
  increment(`error_${service}_${operation}_${errorType}`);
};

/**
 * Record bytes transferred
 */
export const recordBytesTransferred = (direction: 'r2_read' | 'r2_write' | 'edge_read' | 'edge_write', bytes: number): void => {
  incrementBy(`bytes_${direction}`, bytes);
};

/**
 * Record a counter increment
 */
export const increment = (name: string, value = 1): void => {
  const existing = counters.get(name);
  if (existing) {
    existing.value += value;
    existing.lastUpdated = Date.now();
  } else {
    counters.set(name, { value, lastUpdated: Date.now() });
  }
};

/**
 * Increment counter by specific amount
 */
export const incrementBy = (name: string, value: number): void => {
  increment(name, value);
};

/**
 * Record a histogram value
 */
export const recordHistogram = (name: string, value: number, buckets: number[] = DEFAULT_BUCKETS): void => {
  let entry = histograms.get(name);
  if (!entry) {
    entry = {
      sum: 0,
      count: 0,
      min: Infinity,
      max: -Infinity,
      buckets: new Map(buckets.map(b => [b, 0])),
    };
    histograms.set(name, entry);
  }

  entry.sum += value;
  entry.count++;
  entry.min = Math.min(entry.min, value);
  entry.max = Math.max(entry.max, value);

  // Update buckets
  for (const threshold of buckets) {
    if (value <= threshold) {
      entry.buckets.set(threshold, (entry.buckets.get(threshold) || 0) + 1);
    }
  }
};

/**
 * Record a timer sample
 */
export const recordTimer = (name: string, ms: number): void => {
  let timer = timers.get(name);
  if (!timer) {
    timer = {
      totalMs: 0,
      count: 0,
      avgMs: 0,
      p95Ms: 0,
      p99Ms: 0,
      samples: [],
    };
    timers.set(name, timer);
  }

  timer.totalMs += ms;
  timer.count++;
  timer.samples.push(ms);

  // Limit samples
  if (timer.samples.length > MAX_SAMPLES) {
    timer.samples = timer.samples.slice(-MAX_SAMPLES);
  }

  // Recalculate stats
  timer.avgMs = timer.totalMs / timer.count;
  const sorted = [...timer.samples].sort((a, b) => a - b);
  timer.p95Ms = sorted[Math.floor(sorted.length * 0.95)] || 0;
  timer.p99Ms = sorted[Math.floor(sorted.length * 0.99)] || 0;
};

/**
 * Get all metrics as a serializable object
 */
export const getMetrics = () => {
  const result: Record<string, unknown> = {
    timestamp: Date.now(),
    counters: Object.fromEntries(
      Array.from(counters.entries()).map(([k, v]) => [k, v.value])
    ),
    histograms: Object.fromEntries(
      Array.from(histograms.entries()).map(([k, v]) => [
        k,
        {
          sum: v.sum,
          count: v.count,
          min: v.min === Infinity ? 0 : v.min,
          max: v.max === -Infinity ? 0 : v.max,
          avg: v.count > 0 ? v.sum / v.count : 0,
          buckets: Object.fromEntries(v.buckets),
        },
      ])
    ),
    timers: Object.fromEntries(
      Array.from(timers.entries()).map(([k, v]) => [
        k,
        {
          count: v.count,
          avgMs: v.avgMs,
          p95Ms: v.p95Ms,
          p99Ms: v.p99Ms,
        },
      ])
    ),
  };

  // Calculate cache hit rates
  const cacheHitRate = calculateCacheHitRate();
  if (cacheHitRate !== null) {
    result.cacheHitRate = cacheHitRate;
  }

  return result;
};

/**
 * Calculate overall cache hit rate
 */
export const calculateCacheHitRate = (): number | null => {
  let totalHits = 0;
  let totalMisses = 0;

  for (const [key, counter] of counters) {
    if (key.startsWith('cache_hit_')) {
      totalHits += counter.value;
    } else if (key.startsWith('cache_miss_')) {
      totalMisses += counter.value;
    }
  }

  const total = totalHits + totalMisses;
  return total > 0 ? totalHits / total : null;
};

/**
 * Get cache hit rate for a specific layer
 */
export const getCacheHitRate = (layer: string): number | null => {
  let hits = 0;
  let misses = 0;

  for (const [key, counter] of counters) {
    if (key.startsWith(`cache_hit_${layer}_`)) {
      hits += counter.value;
    } else if (key.startsWith(`cache_miss_${layer}_`)) {
      misses += counter.value;
    }
  }

  const total = hits + misses;
  return total > 0 ? hits / total : null;
};

/**
 * Reset all metrics (useful for testing)
 */
export const resetMetrics = (): void => {
  counters.clear();
  histograms.clear();
  timers.clear();
};

/**
 * Export metrics in Prometheus format
 */
export const exportPrometheusMetrics = (): string => {
  const lines: string[] = [];
  const timestamp = Date.now();

  // Counters
  for (const [name, counter] of counters) {
    lines.push(`# TYPE ${name} counter`);
    lines.push(`${name} ${counter.value} ${timestamp}`);
  }

  // Histograms
  for (const [name, hist] of histograms) {
    lines.push(`# TYPE ${name} histogram`);
    for (const [bucket, count] of hist.buckets) {
      lines.push(`${name}_bucket{le="${bucket}"} ${count} ${timestamp}`);
    }
    lines.push(`${name}_sum ${hist.sum} ${timestamp}`);
    lines.push(`${name}_count ${hist.count} ${timestamp}`);
  }

  // Timers as summaries
  for (const [name, timer] of timers) {
    lines.push(`# TYPE ${name} summary`);
    lines.push(`${name}{quantile="0.5"} ${timer.avgMs} ${timestamp}`);
    lines.push(`${name}{quantile="0.95"} ${timer.p95Ms} ${timestamp}`);
    lines.push(`${name}{quantile="0.99"} ${timer.p99Ms} ${timestamp}`);
    lines.push(`${name}_sum ${timer.totalMs} ${timestamp}`);
    lines.push(`${name}_count ${timer.count} ${timestamp}`);
  }

  return lines.join('\n');
};

// Export singleton for convenience
export const metrics = {
  recordCacheHit,
  recordCacheMiss,
  recordDedupHit,
  recordLatency,
  recordSlowQuery,
  recordError,
  recordBytesTransferred,
  increment,
  incrementBy,
  recordHistogram,
  recordTimer,
  getMetrics,
  calculateCacheHitRate,
  getCacheHitRate,
  resetMetrics,
  exportPrometheusMetrics,
};
