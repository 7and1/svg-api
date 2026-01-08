/**
 * Analytics Middleware
 *
 * Captures request metrics and sends them to Analytics Engine.
 * Runs asynchronously to avoid impacting request performance.
 */

import type { Context, Next } from "hono";
import type { Env } from "../env";
import { getAnalyticsService } from "../services/analytics";

// Track cold starts
let isColdStart = true;

// Filter patterns for ignoring certain requests
const IGNORE_PATTERNS = [
  "/health",
  "/health/live",
  "/health/ready",
  "/favicon.ico",
];

// User-Agent patterns to filter out (bots, monitoring)
const BOT_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /curl/i,
  /wget/i,
  /monitoring/i,
  /uptimerobot/i,
  /pingdom/i,
];

/**
 * Check if a request should be tracked
 */
const shouldTrack = (path: string, userAgent?: string): boolean => {
  // Skip health checks
  if (IGNORE_PATTERNS.some((pattern) => path.startsWith(pattern))) {
    return false;
  }

  // Skip bots
  if (userAgent && BOT_PATTERNS.some((pattern) => pattern.test(userAgent))) {
    return false;
  }

  return true;
};

/**
 * Analytics middleware for tracking requests
 */
export const analyticsMiddleware = () => {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const startTime = Date.now();
    const path = c.req.path;
    const userAgent = c.req.header("User-Agent");
    const apiVersion = c.req.header("API-Version") || "1.0";

    // Store cache status for analytics
    let cacheStatus: "HIT" | "MISS" | "NONE" = "NONE";

    // Intercept response to capture cache status
    const originalSet = c.res.headers.set.bind(c.res.headers);
    c.res.headers.set = (name: string, value: string) => {
      if (name.toLowerCase() === "x-cache") {
        if (value === "HIT" || value === "MISS") {
          cacheStatus = value;
        }
      }
      return originalSet(name, value);
    };

    try {
      await next();

      // Track after response is sent
      const duration = Date.now() - startTime;
      const status = c.res.status;

      if (shouldTrack(path, userAgent)) {
        const analytics = getAnalyticsService(c.env);

        if (analytics) {
          // Record in background to avoid blocking response
          c.executionCtx.waitUntil(
            (async () => {
              try {
                analytics.recordRequest({
                  endpoint: path,
                  method: c.req.method,
                  status,
                  duration_ms: duration,
                  cache_hit: cacheStatus === "HIT",
                  source: extractSourceFromPath(path),
                  userAgent,
                  apiVersion,
                });
              } catch (err) {
                // Fail silently - analytics shouldn't break the app
                console.debug("Analytics recording failed:", err);
              }
            })(),
          );
        }

        // Update legacy metrics (in-memory)
        if (c.env.ENVIRONMENT !== "production") {
          const { getMetrics } = await import("../services/metrics");
          const metrics = getMetrics();
          metrics.recordRequest({
            endpoint: path,
            method: c.req.method,
            status,
            duration_ms: duration,
            cache_hit: cacheStatus === "HIT",
            source: extractSourceFromPath(path),
          });
        }
      }
    } catch (err) {
      // Track errors
      if (shouldTrack(path, userAgent)) {
        const analytics = getAnalyticsService(c.env);

        if (analytics) {
          c.executionCtx.waitUntil(
            (async () => {
              try {
                analytics.recordError({
                  endpoint: path,
                  errorType: err instanceof Error ? err.name : "UnknownError",
                  errorMessage:
                    err instanceof Error ? err.message : String(err),
                  userAgent,
                  apiVersion,
                });
              } catch {
                // Fail silently
              }
            })(),
          );
        }
      }
      throw err;
    } finally {
      isColdStart = false;
    }
  };
};

/**
 * Extract source from request path
 */
const extractSourceFromPath = (path: string): string | undefined => {
  const match = path.match(/\/icons\/([^\/]+)/);
  if (match) {
    const potentialSource = match[1];
    // Check if it's a known source or actual icon name
    // This is a simple heuristic - could be improved
    const knownSources = [
      "lucide",
      "heroicons",
      "tabler",
      "phosphor",
      "feather",
      "fontawesome",
    ];
    if (knownSources.includes(potentialSource)) {
      return potentialSource;
    }
  }
  return undefined;
};

/**
 * Get cold start status
 */
export const getColdStartStatus = (): boolean => isColdStart;

/**
 * Reset cold start flag (for testing)
 */
export const resetColdStart = (): void => {
  isColdStart = true;
};
