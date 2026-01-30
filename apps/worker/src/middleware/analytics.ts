/**
 * Analytics Middleware
 *
 * Captures request metrics and sends them to Analytics Engine.
 * Runs asynchronously to avoid impacting request performance.
 * Records ALL requests including rate-limited ones for complete visibility.
 */

import type { Context, Next } from "hono";
import type { Env } from "../env";
import { getAnalyticsService } from "../services/analytics";

// Track cold starts
let isColdStart = true;

// Filter patterns for ignoring certain requests (only health checks)
const IGNORE_PATTERNS = [
  "/health",
  "/health/live",
  "/health/ready",
  "/favicon.ico",
];

/**
 * Check if a request should be tracked
 * Note: We now track ALL requests including rate-limited ones for complete visibility
 */
const shouldTrack = (path: string): boolean => {
  // Skip health checks only
  if (IGNORE_PATTERNS.some((pattern) => path.startsWith(pattern))) {
    return false;
  }

  return true;
};

/**
 * Analytics middleware for tracking requests
 * Positioned after CORS but before rate limiting to capture all requests
 * including those that get rate limited
 */
export const analyticsMiddleware = () => {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const startTime = Date.now();
    const path = c.req.path;
    const userAgent = c.req.header("User-Agent");
    const apiVersion = c.req.header("API-Version") || "1.0";

    // Store cache status and rate limit info for analytics
    let cacheStatus: "HIT" | "MISS" | "NONE" = "NONE";
    let rateLimitTier: string | undefined;
    let rateLimitRemaining: number | undefined;

    // Track if response was already sent (for rate limit detection)
    let responseSent = false;

    try {
      await next();

      // Track after response is sent
      const duration = Date.now() - startTime;
      const status = c.res?.status || 0;
      responseSent = true;

      // Capture rate limit info from response headers if available
      rateLimitTier = c.res?.headers.get("X-RateLimit-Tier") || undefined;
      const remainingHeader = c.res?.headers.get("X-RateLimit-Remaining");
      if (remainingHeader) {
        rateLimitRemaining = parseInt(remainingHeader, 10);
      }

      // Capture cache status from headers
      const cacheHeader = c.res?.headers.get("X-Cache");
      if (cacheHeader === "HIT" || cacheHeader === "MISS") {
        cacheStatus = cacheHeader;
      }

      if (shouldTrack(path)) {
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
                  rateLimitTier,
                  rateLimitRemaining,
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
      // Track errors - including those from rate limiting or other middleware
      if (shouldTrack(path)) {
        const analytics = getAnalyticsService(c.env);
        const duration = Date.now() - startTime;

        if (analytics) {
          c.executionCtx.waitUntil(
            (async () => {
              try {
                // Record as error or as request depending on error type
                if (err instanceof Error && err.name === "RateLimitError") {
                  analytics.recordRequest({
                    endpoint: path,
                    method: c.req.method,
                    status: 429,
                    duration_ms: duration,
                    cache_hit: false,
                    source: extractSourceFromPath(path),
                    userAgent,
                    apiVersion,
                    rateLimitTier: rateLimitTier || "unknown",
                    rateLimitRemaining: 0,
                  });
                } else {
                  analytics.recordError({
                    endpoint: path,
                    errorType: err instanceof Error ? err.name : "UnknownError",
                    errorMessage:
                      err instanceof Error ? err.message : String(err),
                    userAgent,
                    apiVersion,
                  });
                }
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
