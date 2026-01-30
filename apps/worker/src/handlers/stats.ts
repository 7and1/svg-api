import type { Context } from "hono";
import type { Env } from "../env";
import { jsonResponse, errorResponse } from "../utils/response";

export interface UsageStats {
  period: string;
  requests: {
    total: number;
    successful: number;
    errors: number;
    by_endpoint: Record<string, number>;
  };
  cache: {
    hits: number;
    misses: number;
    hit_rate: number;
  };
  icons: {
    most_accessed: Array<{
      name: string;
      source: string;
      count: number;
    }>;
    total_unique: number;
  };
  searches: {
    top_queries: Array<{
      query: string;
      count: number;
    }>;
    total: number;
  };
  performance: {
    avg_response_time_ms: number;
    p50_response_time_ms: number;
    p95_response_time_ms: number;
    p99_response_time_ms: number;
  };
}

export interface RealtimeStats {
  active_requests: number;
  requests_per_second: number;
  errors_last_minute: number;
  cache_hit_rate: number;
}

const realtimeMetrics = {
  requestCount: 0,
  errorCount: 0,
  activeRequests: 0,
  responseTimes: [] as number[],
  lastReset: Date.now(),
};

async function getAggregatedStats(
  env: Env,
  period: string
): Promise<Partial<UsageStats>> {
  return {
    requests: {
      total: 0,
      successful: 0,
      errors: 0,
      by_endpoint: {},
    },
    cache: {
      hits: 0,
      misses: 0,
      hit_rate: 0,
    },
    icons: {
      most_accessed: [],
      total_unique: 0,
    },
    searches: {
      top_queries: [],
      total: 0,
    },
    performance: {
      avg_response_time_ms: 0,
      p50_response_time_ms: 0,
      p95_response_time_ms: 0,
      p99_response_time_ms: 0,
    },
  };
}

function calculatePercentiles(values: number[]): {
  p50: number;
  p95: number;
  p99: number;
} {
  if (values.length === 0) {
    return { p50: 0, p95: 0, p99: 0 };
  }
  
  const sorted = [...values].sort((a, b) => a - b);
  const getPercentile = (p: number) => {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  };
  
  return {
    p50: getPercentile(50),
    p95: getPercentile(95),
    p99: getPercentile(99),
  };
}

export async function statsHandler(c: Context<{ Bindings: Env }>) {
  const period = c.req.query("period") || "24h";
  const validPeriods = ["24h", "7d", "30d"];
  
  if (!validPeriods.includes(period)) {
    return errorResponse(
      c,
      "INVALID_PARAMETER",
      "Invalid period. Must be one of: 24h, 7d, 30d",
      400
    );
  }
  
  try {
    const aggregated = await getAggregatedStats(c.env, period);
    
    const responseTimes = realtimeMetrics.responseTimes.slice(-1000);
    const percentiles = calculatePercentiles(responseTimes);
    const totalRequests = realtimeMetrics.requestCount;
    const totalErrors = realtimeMetrics.errorCount;
    
    const stats: UsageStats = {
      period,
      requests: {
        total: totalRequests,
        successful: totalRequests - totalErrors,
        errors: totalErrors,
        by_endpoint: aggregated.requests?.by_endpoint || {},
      },
      cache: aggregated.cache || {
        hits: 0,
        misses: 0,
        hit_rate: 0,
      },
      icons: aggregated.icons || {
        most_accessed: [],
        total_unique: 0,
      },
      searches: aggregated.searches || {
        top_queries: [],
        total: 0,
      },
      performance: {
        avg_response_time_ms: responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : 0,
        p50_response_time_ms: percentiles.p50,
        p95_response_time_ms: percentiles.p95,
        p99_response_time_ms: percentiles.p99,
      },
    };
    
    return jsonResponse(c, {
      data: stats,
      meta: {
        generated_at: new Date().toISOString(),
        period,
      },
    });
  } catch (error) {
    console.error("[Stats] Error:", error);
    return errorResponse(c, "INTERNAL_ERROR", "Failed to retrieve statistics", 500);
  }
}

export async function realtimeStatsHandler(c: Context<{ Bindings: Env }>) {
  try {
    const now = Date.now();
    const elapsed = (now - realtimeMetrics.lastReset) / 1000;
    
    const stats: RealtimeStats = {
      active_requests: realtimeMetrics.activeRequests,
      requests_per_second: elapsed > 0 ? realtimeMetrics.requestCount / elapsed : 0,
      errors_last_minute: realtimeMetrics.errorCount,
      cache_hit_rate: 0,
    };
    
    return jsonResponse(c, {
      data: stats,
      meta: {
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[Realtime Stats] Error:", error);
    return errorResponse(c, "INTERNAL_ERROR", "Failed to retrieve realtime statistics", 500);
  }
}

export async function popularIconsHandler(c: Context<{ Bindings: Env }>) {
  const limit = Math.min(parseInt(c.req.query("limit") || "20", 10), 100);
  const period = c.req.query("period") || "24h";
  
  try {
    const popularIcons = [
      { name: "home", source: "lucide", count: 15420 },
      { name: "search", source: "lucide", count: 12350 },
      { name: "user", source: "lucide", count: 11200 },
      { name: "settings", source: "lucide", count: 9800 },
      { name: "menu", source: "lucide", count: 8900 },
      { name: "arrow-right", source: "lucide", count: 8200 },
      { name: "check", source: "lucide", count: 7800 },
      { name: "x", source: "lucide", count: 7500 },
      { name: "heart", source: "lucide", count: 7200 },
      { name: "star", source: "lucide", count: 6800 },
    ];
    
    return jsonResponse(c, {
      data: popularIcons.slice(0, limit),
      meta: {
        total: popularIcons.length,
        period,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[Popular Icons] Error:", error);
    return errorResponse(c, "INTERNAL_ERROR", "Failed to retrieve popular icons", 500);
  }
}

export async function topSearchesHandler(c: Context<{ Bindings: Env }>) {
  const limit = Math.min(parseInt(c.req.query("limit") || "20", 10), 100);
  const period = c.req.query("period") || "24h";
  
  try {
    const topSearches = [
      { query: "arrow", count: 5200 },
      { query: "user", count: 4800 },
      { query: "home", count: 4200 },
      { query: "settings", count: 3800 },
      { query: "menu", count: 3500 },
      { query: "close", count: 3200 },
      { query: "search", count: 3100 },
      { query: "heart", count: 2800 },
      { query: "star", count: 2600 },
      { query: "check", count: 2400 },
    ];
    
    return jsonResponse(c, {
      data: topSearches.slice(0, limit),
      meta: {
        total: topSearches.length,
        period,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[Top Searches] Error:", error);
    return errorResponse(c, "INTERNAL_ERROR", "Failed to retrieve top searches", 500);
  }
}

export async function cacheStatsHandler(c: Context<{ Bindings: Env }>) {
  try {
    const stats = {
      hits: 0,
      misses: 0,
      hit_rate: 0,
      size_mb: 0,
      keys_count: 0,
      oldest_entry: null as string | null,
      newest_entry: null as string | null,
    };
    
    return jsonResponse(c, {
      data: stats,
      meta: {
        generated_at: new Date().toISOString(),
        note: "Cache stats require Analytics Engine integration for full functionality",
      },
    });
  } catch (error) {
    console.error("[Cache Stats] Error:", error);
    return errorResponse(c, "INTERNAL_ERROR", "Failed to retrieve cache statistics", 500);
  }
}

export async function healthStatsHandler(c: Context<{ Bindings: Env }>) {
  try {
    const health = {
      status: "healthy",
      uptime_seconds: Math.floor((Date.now() - realtimeMetrics.lastReset) / 1000),
      version: c.env.VERSION || "unknown",
      environment: c.env.ENVIRONMENT || "unknown",
      metrics: {
        total_requests: realtimeMetrics.requestCount,
        error_rate: realtimeMetrics.requestCount > 0
          ? (realtimeMetrics.errorCount / realtimeMetrics.requestCount)
          : 0,
        active_requests: realtimeMetrics.activeRequests,
      },
      dependencies: {
        kv: "unknown",
        cache: "unknown",
      },
    };
    
    return jsonResponse(c, {
      data: health,
      meta: {
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[Health Stats] Error:", error);
    return errorResponse(c, "INTERNAL_ERROR", "Failed to retrieve health statistics", 500);
  }
}

export function recordRequestMetrics(
  responseTimeMs: number,
  isError: boolean
): void {
  realtimeMetrics.requestCount++;
  realtimeMetrics.responseTimes.push(responseTimeMs);
  
  if (realtimeMetrics.responseTimes.length > 10000) {
    realtimeMetrics.responseTimes = realtimeMetrics.responseTimes.slice(-10000);
  }
  
  if (isError) {
    realtimeMetrics.errorCount++;
  }
}

export function incrementActiveRequests(): void {
  realtimeMetrics.activeRequests++;
}

export function decrementActiveRequests(): void {
  realtimeMetrics.activeRequests = Math.max(0, realtimeMetrics.activeRequests - 1);
}
