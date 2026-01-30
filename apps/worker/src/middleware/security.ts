import type { Context, Next } from "hono";
import type { Env } from "../env";
import { getClientInfo, generateRequestId } from "../utils/request";
import { metrics } from "../utils/metrics";
import {
  TIER_LIMITS,
  ENDPOINT_LIMITS,
  type RateLimitConfig,
} from "../durable-objects/RateLimiter";

/**
 * Security headers middleware - P2 Production Hardened
 * Adds comprehensive security headers for production deployment
 */
export const securityHeaders = () => {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    await next();

    // Essential security headers
    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-Frame-Options", "DENY");
    c.header("X-XSS-Protection", "1; mode=block");
    c.header("Referrer-Policy", "strict-origin-when-cross-origin");
    c.header("Permissions-Policy", "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()");

    // HSTS for HTTPS enforcement (only in production)
    if (c.env.ENVIRONMENT === "production") {
      c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    }

    // Cross-Origin headers
    c.header("Cross-Origin-Resource-Policy", "same-origin");
    c.header("Cross-Origin-Opener-Policy", "same-origin");
    c.header("Cross-Origin-Embedder-Policy", "require-corp");

    // CSP for SVG responses - strict policy
    const contentType = c.res.headers.get("Content-Type") || "";
    if (contentType.includes("image/svg")) {
      c.header(
        "Content-Security-Policy",
        "default-src 'none'; script-src 'none'; style-src 'none'; img-src 'self'; sandbox;"
      );
    } else if (contentType.includes("application/json")) {
      // Prevent JSON responses from being rendered as HTML
      c.header(
        "Content-Security-Policy",
        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none';"
      );
    } else if (contentType.includes("text/html")) {
      // Strict CSP for any HTML responses
      c.header(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
      );
    }

    // Remove server identification
    c.res.headers.delete("Server");
    c.res.headers.delete("X-Powered-By");

    // Add request ID for tracing
    const requestId = c.get("requestId") || generateRequestId();
    c.header("X-Request-ID", requestId);
  };
};

/**
 * Generate rate limit key from multiple dimensions
 */
function generateRateLimitKey(
  ip: string,
  apiKey: string | null,
  endpoint: string,
  tier: string
): string {
  // Use API key if available, otherwise IP
  const identifier = apiKey ? `key:${apiKey.slice(0, 16)}` : `ip:${ip}`;
  const normalizedEndpoint = endpoint.split("?")[0];
  return `${identifier}:${normalizedEndpoint}:${tier}`;
}

/**
 * Get client tier from API key or default to free
 */
function getClientTier(apiKey: string | null, env: Env): string {
  if (!apiKey) return "free";

  // Check for internal/master keys
  if (apiKey === env.INTERNAL_API_KEY) return "internal";

  // Parse key prefix for tier (e.g., "sk_free_xxx", "sk_pro_xxx", "sk_ent_xxx")
  if (apiKey.startsWith("sk_ent_")) return "enterprise";
  if (apiKey.startsWith("sk_pro_")) return "pro";

  return "free";
}

/**
 * Hierarchical rate limiting middleware (IP + API Key + Endpoint)
 * Uses Durable Objects for global rate limiting across all Worker isolates
 */
export const hierarchicalRateLimit = () => {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const clientInfo = getClientInfo(c);
    const ip = clientInfo.ip;
    const apiKey = clientInfo.apiKey;
    const endpoint = c.req.path;

    // Determine client tier
    const tier = getClientTier(apiKey, c.env);
    const tierConfig = TIER_LIMITS[tier] || TIER_LIMITS.free;

    // Check endpoint-specific limits
    const endpointPattern = Object.keys(ENDPOINT_LIMITS).find((pattern) =>
      endpoint.startsWith(pattern)
    );
    const endpointConfig = endpointPattern
      ? ENDPOINT_LIMITS[endpointPattern]
      : null;

    // Use the more restrictive limit
    const config =
      endpointConfig && endpointConfig.max < tierConfig.max
        ? endpointConfig
        : tierConfig;

    // Generate unique key for this request
    const rateLimitKey = generateRateLimitKey(ip, apiKey, endpoint, tier);

    // Get Durable Object instance for global rate limiting
    const durableObjectId = c.env.RATE_LIMITER.idFromName("global-rate-limiter");
    const rateLimiter = c.env.RATE_LIMITER.get(durableObjectId);

    // Call Durable Object to check rate limit
    const response = await rateLimiter.fetch(
      `http://rate-limiter/check?key=${encodeURIComponent(rateLimitKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Window": config.windowMs.toString(),
          "X-RateLimit-Max": config.max.toString(),
          "X-RateLimit-Burst": (config.burst || config.max).toString(),
        },
      }
    );

    const result = (await response.json()) as {
      allowed: boolean;
      limit: number;
      remaining: number;
      resetAt: number;
      retryAfter?: number;
    };

    // Set rate limit headers from Durable Object response
    c.header("X-RateLimit-Limit", result.limit.toString());
    c.header("X-RateLimit-Remaining", result.remaining.toString());
    c.header("X-RateLimit-Reset", Math.ceil(result.resetAt / 1000).toString());
    c.header("X-RateLimit-Tier", tier);
    c.header("X-RateLimit-Policy", endpointConfig ? "endpoint" : "tier");

    // Check if limit exceeded
    if (!result.allowed) {
      c.header("Retry-After", result.retryAfter?.toString() || "60");

      // Log rate limit hit for monitoring
      metrics.increment(`rate_limit_exceeded_${tier}`);
      console.warn(
        JSON.stringify({
          event: "rate_limit_exceeded",
          ip: ip.substring(0, 7) + "...",
          tier,
          endpoint,
          timestamp: new Date().toISOString(),
        })
      );

      return c.json(
        {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message:
              "Rate limit exceeded. Please upgrade your plan or try again later.",
            details: {
              tier,
              limit: result.limit,
              resetAt: new Date(result.resetAt).toISOString(),
              upgradeUrl:
                tier === "free" ? "https://api.example.com/upgrade" : undefined,
            },
          },
        },
        429
      );
    }

    // Store rate limit info for downstream use
    c.set("rateLimit", {
      tier,
      remaining: result.remaining,
      resetAt: result.resetAt,
    });

    await next();
  };
};

/**
 * Simple rate limiting middleware (backward compatible)
 * Uses Durable Objects for global consistency
 */
export const rateLimit = (_options: { windowMs: number; max: number }) => {
  return hierarchicalRateLimit();
};

/**
 * Request signature verification middleware
 * Validates HMAC-SHA256 signatures for webhook and sensitive endpoints
 */
export const signatureVerification = (options: {
  header?: string;
  secret?: string;
  algorithm?: string;
  toleranceMs?: number;
} = {}) => {
  const {
    header = "X-Signature",
    algorithm = "sha256",
    toleranceMs = 300_000, // 5 minutes default
  } = options;

  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    // Skip for non-mutating methods unless explicitly required
    if (c.req.method === "GET" || c.req.method === "HEAD") {
      await next();
      return;
    }

    const signature = c.req.header(header);
    const timestamp = c.req.header("X-Timestamp");
    const secret = options.secret || c.env.API_SECRET || c.env.WEBHOOK_SECRET;

    if (!secret) {
      console.warn("Signature verification skipped: no secret configured");
      await next();
      return;
    }

    if (!signature) {
      return c.json(
        {
          error: {
            code: "MISSING_SIGNATURE",
            message: `Missing ${header} header`,
          },
        },
        401
      );
    }

    // Verify timestamp to prevent replay attacks
    if (timestamp) {
      const requestTime = parseInt(timestamp, 10);
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - requestTime) > toleranceMs / 1000) {
        return c.json(
          {
            error: {
              code: "REQUEST_EXPIRED",
              message: "Request timestamp too old or too far in the future",
            },
          },
          401
        );
      }
    }

    // Compute expected signature
    const body = await c.req.raw.clone().text();
    const payload = timestamp ? `${timestamp}.${body}` : body;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: algorithm },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    // Constant-time comparison
    const providedSig = signature.replace(/^sha256=/, "").toLowerCase();
    if (!timingSafeEqual(providedSig, expectedSignature)) {
      return c.json(
        {
          error: {
            code: "INVALID_SIGNATURE",
            message: "Invalid request signature",
          },
        },
        401
      );
    }

    await next();
  };
};

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Enhanced CORS middleware with strict origin validation
 * Production-ready with preflight caching and credential support
 */
export const corsMiddleware = (options: {
  allowCredentials?: boolean;
  maxAge?: number;
} = {}) => {
  const { allowCredentials = false, maxAge = 86400 } = options;

  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const origin = c.req.header("Origin");
    const requestOrigin = origin || "";

    // Parse allowed origins from environment
    const allowedOrigins = c.env.ALLOWED_ORIGINS
      ? c.env.ALLOWED_ORIGINS.split(",").map(o => o.trim().toLowerCase())
      : [];

    // Determine if origin is allowed
    let allowOrigin: string | null = null;
    let varyOrigin = false;

    if (allowedOrigins.length === 0 || allowedOrigins.includes("*")) {
      // Allow any origin (development mode)
      allowOrigin = allowCredentials && origin ? origin : "*";
      varyOrigin = allowCredentials;
    } else {
      // Check against whitelist
      const normalizedOrigin = requestOrigin.toLowerCase();
      const isAllowed = allowedOrigins.some(allowed => {
        if (allowed === normalizedOrigin) return true;
        // Support wildcard subdomains: *.example.com
        if (allowed.startsWith("*.")) {
          const domain = allowed.slice(2);
          return normalizedOrigin.endsWith(domain) &&
                 normalizedOrigin.split(".").length === domain.split(".").length + 1;
        }
        return false;
      });

      if (isAllowed && origin) {
        allowOrigin = origin;
      } else if (origin) {
        // Log CORS violation
        metrics.increment('cors_violation');
        console.warn(JSON.stringify({
          event: "cors_violation",
          origin: requestOrigin,
          path: c.req.path,
          timestamp: new Date().toISOString(),
        }));

        return c.json(
          {
            error: {
              code: "CORS_ERROR",
              message: "Origin not allowed",
              allowedOrigins: allowedOrigins.filter(o => !o.includes("internal")),
            },
          },
          403
        );
      }
    }

    // Set CORS headers
    if (allowOrigin) {
      c.header("Access-Control-Allow-Origin", allowOrigin);
      if (varyOrigin) {
        c.header("Vary", "Origin");
      }
    }

    c.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    c.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-API-Key, X-Request-ID, X-Timestamp, X-Signature, If-None-Match, Accept-Encoding"
    );
    c.header("Access-Control-Max-Age", maxAge.toString());
    c.header(
      "Access-Control-Expose-Headers",
      "X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-RateLimit-Tier, X-Cache, X-Cache-Layer, X-Request-ID, X-Response-Time"
    );

    if (allowCredentials) {
      c.header("Access-Control-Allow-Credentials", "true");
    }

    // Handle preflight
    if (c.req.method === "OPTIONS") {
      return c.body(null, 204);
    }

    await next();
  };
};

/**
 * API key extraction and validation middleware
 * Extracts and validates API key format before rate limiting
 */
export const apiKeyExtractor = () => {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    // Extract API key from multiple sources
    const authHeader = c.req.header("Authorization");
    const apiKeyHeader = c.req.header("X-API-Key");
    const queryKey = c.req.query("api_key");

    let apiKey: string | null = null;
    let keySource: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      apiKey = authHeader.slice(7);
      keySource = "bearer";
    } else if (apiKeyHeader) {
      apiKey = apiKeyHeader;
      keySource = "header";
    } else if (queryKey) {
      // Only allow query key for GET requests
      if (c.req.method === "GET") {
        apiKey = queryKey;
        keySource = "query";
      }
    }

    // Validate key format (sk_tier_xxxxxx)
    if (apiKey && !isValidApiKeyFormat(apiKey)) {
      return c.json(
        {
          error: {
            code: "INVALID_API_KEY_FORMAT",
            message: "API key format is invalid. Expected: sk_{tier}_{token}",
          },
        },
        401
      );
    }

    // Store for downstream use
    c.set("apiKey", apiKey);
    c.set("apiKeySource", keySource);

    await next();
  };
};

/**
 * Validate API key format
 */
function isValidApiKeyFormat(key: string): boolean {
  // Format: sk_{tier}_{32-char-alphanumeric}
  const keyRegex = /^sk_(free|pro|ent|internal)_[a-zA-Z0-9]{32,64}$/;
  return keyRegex.test(key);
}

/**
 * Bot detection and blocking middleware
 * Identifies and blocks known bad actors
 */
export const botDetection = () => {
  // Pre-compiled regex patterns for performance
  const blockedPatterns = [
    /bot\/\d+\.\d+/i,           // Generic bot pattern
    /scrap/i,                   // Scrapers
    /crawl/i,                   // Unauthorized crawlers
    /python-requests/i,         // Python scripts
    /curl\/\d/i,                // Curl requests (often automated)
    /wget/i,                    // Wget
  ];

  const allowedBots = [
    /googlebot/i,
    /bingbot/i,
    /slurp/i,                   // Yahoo
    /duckduckbot/i,
    /baiduspider/i,
  ];

  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const userAgent = c.req.header("User-Agent") || "";

    // Allow legitimate search engines
    if (allowedBots.some(pattern => pattern.test(userAgent))) {
      await next();
      return;
    }

    // Check for blocked patterns
    if (blockedPatterns.some(pattern => pattern.test(userAgent))) {
      // Log bot detection
      metrics.increment('bot_blocked');
      console.warn(JSON.stringify({
        event: "bot_blocked",
        userAgent: userAgent.substring(0, 100),
        ip: (c.req.header("CF-Connecting-IP") || "unknown").substring(0, 7) + "...",
        path: c.req.path,
        timestamp: new Date().toISOString(),
      }));

      return c.json(
        {
          error: {
            code: "ACCESS_DENIED",
            message: "Automated access detected. Please use the API with proper authentication.",
          },
        },
        403
      );
    }

    await next();
  };
};

/**
 * Request size limiting middleware
 * Prevents large payload attacks
 */
export const requestSizeLimit = (maxSizeBytes: number = 10 * 1024 * 1024) => {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const contentLength = c.req.header("Content-Length");

    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (size > maxSizeBytes) {
        return c.json(
          {
            error: {
              code: "PAYLOAD_TOO_LARGE",
              message: `Request body too large. Maximum size is ${maxSizeBytes} bytes.`,
            },
          },
          413
        );
      }
    }

    await next();
  };
};

/**
 * IP allowlist/blocklist middleware
 * Restricts access based on IP address
 */
export const ipRestriction = (options: {
  allowlist?: string[];
  blocklist?: string[];
} = {}) => {
  const { allowlist, blocklist } = options;

  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const clientInfo = getClientInfo(c);
    const ip = clientInfo.ip;

    // Check blocklist first
    if (blocklist && blocklist.length > 0) {
      if (blocklist.includes(ip)) {
        metrics.increment('ip_blocked');
        return c.json(
          {
            error: {
              code: "IP_BLOCKED",
              message: "Access denied from this IP address",
            },
          },
          403
        );
      }
    }

    // Check allowlist
    if (allowlist && allowlist.length > 0) {
      if (!allowlist.includes(ip)) {
        metrics.increment('ip_not_allowed');
        return c.json(
          {
            error: {
              code: "IP_NOT_ALLOWED",
              message: "Access restricted to specific IP addresses",
            },
          },
          403
        );
      }
    }

    await next();
  };
};

/**
 * Early security middleware - runs first in the chain
 * Performs basic security checks with minimal overhead:
 * - IP blocking from environment blocklist
 * - Basic request validation
 * - Early threat detection
 */
export const earlySecurityMiddleware = () => {
  // Pre-compiled patterns for performance
  const suspiciousPathPatterns = [
    /\.\./,                    // Path traversal attempts
    /\/\./,                    // Hidden file access
    /\.(php|asp|jsp|cgi)$/i,   // Script file access
    /\/admin/i,                // Admin panel probes
    /\/wp-/i,                  // WordPress probes
    /\/\.env/i,                // Environment file access
    /\/config/i,               // Config file access
    /\.git/i,                  // Git repository access
    /\.svn/i,                  // SVN repository access
  ];

  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const clientInfo = getClientInfo(c);
    const ip = clientInfo.ip;
    const path = c.req.path;

    // Check environment-based IP blocklist
    const blocklistEnv = c.env.IP_BLOCKLIST;
    if (blocklistEnv) {
      const blocklist = blocklistEnv.split(',').map(s => s.trim());
      if (blocklist.includes(ip)) {
        metrics.increment('early_security_ip_blocked');
        console.warn(JSON.stringify({
          event: "early_security_ip_blocked",
          ip: ip.substring(0, 7) + "...",
          path,
          timestamp: new Date().toISOString(),
        }));
        return c.json(
          {
            error: {
              code: "ACCESS_DENIED",
              message: "Access denied",
            },
          },
          403
        );
      }
    }

    // Check for suspicious path patterns (quick rejection)
    if (suspiciousPathPatterns.some(pattern => pattern.test(path))) {
      metrics.increment('early_security_suspicious_path');
      console.warn(JSON.stringify({
        event: "early_security_suspicious_path",
        path,
        ip: ip.substring(0, 7) + "...",
        timestamp: new Date().toISOString(),
      }));
      return c.json(
        {
          error: {
            code: "ACCESS_DENIED",
            message: "Access denied",
          },
        },
        403
      );
    }

    // Validate request method (block non-standard HTTP methods early)
    const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'];
    if (!allowedMethods.includes(c.req.method)) {
      metrics.increment('early_security_invalid_method');
      return c.json(
        {
          error: {
            code: "INVALID_METHOD",
            message: "HTTP method not allowed",
          },
        },
        405
      );
    }

    // Store client info for downstream middleware
    c.set("clientInfo", clientInfo);

    await next();
  };
};
