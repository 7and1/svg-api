import type { Context } from "hono";
import type { Env } from "../env";

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Extract client information from request
 */
export function getClientInfo(c: Context<{ Bindings: Env }>): {
  ip: string;
  country?: string;
  colo?: string;
  userAgent?: string;
  apiKey: string | null;
} {
  // Get IP from Cloudflare headers
  const ip = c.req.header("CF-Connecting-IP") ||
    c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unknown";

  // Extract API key from various sources
  let apiKey: string | null = null;

  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    apiKey = authHeader.slice(7).trim();
  }

  const apiKeyHeader = c.req.header("X-API-Key");
  if (apiKeyHeader) {
    apiKey = apiKeyHeader.trim();
  }

  // Only check query param for GET requests
  if (c.req.method === "GET") {
    const queryKey = c.req.query("api_key");
    if (queryKey) {
      apiKey = queryKey.trim();
    }
  }

  return {
    ip,
    country: c.req.header("CF-IPCountry"),
    colo: c.req.header("CF-Ray")?.split("-")[1],
    userAgent: c.req.header("User-Agent"),
    apiKey,
  };
}

/**
 * Get request timing information
 */
export function getRequestTiming(startTime: number): {
  durationMs: number;
  durationSeconds: number;
} {
  const durationMs = performance.now() - startTime;
  return {
    durationMs,
    durationSeconds: durationMs / 1000,
  };
}

/**
 * Parse Accept header for content negotiation
 */
export function parseAcceptHeader(accept: string | undefined): Array<{
  type: string;
  subtype: string;
  q: number;
}> {
  if (!accept) return [];

  return accept
    .split(",")
    .map(part => {
      const [mediaType, ...params] = part.trim().split(";");
      const [type, subtype] = mediaType.split("/");

      // Parse q value
      let q = 1;
      for (const param of params) {
        const [key, value] = param.trim().split("=");
        if (key === "q") {
          q = parseFloat(value) || 1;
        }
      }

      return { type: type || "*", subtype: subtype || "*", q };
    })
    .sort((a, b) => b.q - a.q);
}

/**
 * Check if client accepts a specific content type
 */
export function acceptsType(
  acceptHeader: string | undefined,
  contentType: string
): boolean {
  const accepted = parseAcceptHeader(acceptHeader);
  const [targetType, targetSubtype] = contentType.split("/");

  return accepted.some(({ type, subtype }) => {
    if (type === "*" && subtype === "*") return true;
    if (type === targetType && subtype === "*") return true;
    if (type === targetType && subtype === targetSubtype) return true;
    return false;
  });
}

/**
 * Get cache key for request
 */
export function getCacheKey(c: Context<{ Bindings: Env }>): string {
  const url = new URL(c.req.url);
  // Remove api_key from cache key
  url.searchParams.delete("api_key");
  return url.toString();
}

/**
 * Check if request is cacheable
 */
export function isCacheableRequest(c: Context<{ Bindings: Env }>): boolean {
  // Only cache GET requests
  if (c.req.method !== "GET") return false;

  // Don't cache authenticated requests
  if (c.req.header("Authorization") || c.req.header("X-API-Key")) {
    return false;
  }

  // Don't cache requests with no-cache header
  const cacheControl = c.req.header("Cache-Control");
  if (cacheControl?.includes("no-cache") || cacheControl?.includes("no-store")) {
    return false;
  }

  return true;
}

/**
 * Extract pagination parameters from request
 */
export function getPaginationParams(
  c: Context<{ Bindings: Env }>,
  defaults: { limit: number; maxLimit: number; offset: number }
): { limit: number; offset: number } {
  const limitParam = c.req.query("limit");
  const offsetParam = c.req.query("offset");

  let limit = defaults.limit;
  let offset = defaults.offset;

  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (!isNaN(parsed) && parsed > 0) {
      limit = Math.min(parsed, defaults.maxLimit);
    }
  }

  if (offsetParam) {
    const parsed = parseInt(offsetParam, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      offset = parsed;
    }
  }

  return { limit, offset };
}

/**
 * Build pagination links
 */
export function buildPaginationLinks(
  baseUrl: string,
  params: { limit: number; offset: number },
  total: number
): {
  self: string;
  first: string;
  prev?: string;
  next?: string;
  last: string;
} {
  const url = new URL(baseUrl);

  // Helper to build URL with params
  const buildUrl = (offset: number): string => {
    url.searchParams.set("limit", params.limit.toString());
    url.searchParams.set("offset", offset.toString());
    return url.toString();
  };

  const lastOffset = Math.floor((total - 1) / params.limit) * params.limit;

  return {
    self: buildUrl(params.offset),
    first: buildUrl(0),
    prev: params.offset > 0 ? buildUrl(Math.max(0, params.offset - params.limit)) : undefined,
    next: params.offset + params.limit < total ? buildUrl(params.offset + params.limit) : undefined,
    last: buildUrl(lastOffset),
  };
}
