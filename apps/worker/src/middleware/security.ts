import type { Context, Next } from "hono";
import type { Env } from "../env";

/**
 * Security headers middleware
 */
export const securityHeaders = () => {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    await next();

    // Security headers
    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-Frame-Options", "DENY");
    c.header("X-XSS-Protection", "1; mode=block");
    c.header("Referrer-Policy", "strict-origin-when-cross-origin");

    // CSP for SVG responses
    const contentType = c.res.headers.get("Content-Type") || "";
    if (contentType.includes("image/svg")) {
      c.header(
        "Content-Security-Policy",
        "default-src 'none'; style-src 'unsafe-inline'",
      );
    } else if (contentType.includes("application/json")) {
      // Prevent JSON responses from being rendered as HTML
      c.header(
        "Content-Security-Policy",
        "default-src 'none'; frame-ancestors 'none'",
      );
    }

    // Remove server identification
    c.res.headers.delete("Server");
  };
};

/**
 * Rate limiting using CF-Connecting-IP
 *
 * WARNING: This in-memory implementation is NOT effective in production!
 * Cloudflare Workers run in distributed isolates, each with their own memory.
 * For production rate limiting, configure Cloudflare Rate Limiting rules
 * in the dashboard or use Workers rate limit bindings with KV/Durable Objects.
 *
 * This implementation is suitable for local development only.
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export const rateLimit = (
  options: { windowMs?: number; max?: number } = {},
) => {
  const windowMs = options.windowMs || 60_000; // 1 minute
  const max = options.max || 100;

  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const ip =
      c.req.header("CF-Connecting-IP") ||
      c.req.header("X-Forwarded-For") ||
      "unknown";
    const now = Date.now();

    let entry = rateLimitStore.get(ip);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      rateLimitStore.set(ip, entry);
    }

    entry.count++;

    // Add rate limit headers
    c.header("X-RateLimit-Limit", max.toString());
    c.header(
      "X-RateLimit-Remaining",
      Math.max(0, max - entry.count).toString(),
    );
    c.header("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000).toString());

    if (entry.count > max) {
      c.header(
        "Retry-After",
        Math.ceil((entry.resetAt - now) / 1000).toString(),
      );
      return c.json(
        {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests, please try again later",
          },
        },
        429,
      );
    }

    await next();
  };
};

/**
 * CORS middleware with configurable origins
 */
export const corsMiddleware = () => {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const origin = c.req.header("Origin");
    const allowedOrigins =
      c.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()) || [];

    // Determine allowed origin
    let allowOrigin = "*";
    if (allowedOrigins.length > 0 && !allowedOrigins.includes("*")) {
      if (origin && allowedOrigins.includes(origin)) {
        allowOrigin = origin;
      } else if (origin) {
        // Origin not allowed
        return c.json(
          {
            error: {
              code: "CORS_ERROR",
              message: "Origin not allowed",
            },
          },
          403,
        );
      }
    } else if (origin) {
      allowOrigin = origin;
    }

    c.header("Access-Control-Allow-Origin", allowOrigin);
    c.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    c.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, If-None-Match",
    );
    c.header("Access-Control-Max-Age", "86400");
    c.header(
      "Access-Control-Expose-Headers",
      "X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-Cache",
    );

    if (c.req.method === "OPTIONS") {
      return c.body(null, 204);
    }

    await next();
  };
};
