/**
 * Sentry Error Tracking Service for Cloudflare Workers
 *
 * Captures errors with request context and filters noise from cold starts.
 */

import type { Context } from "hono";
import type { Env } from "../env";

// Sentry event structure
interface SentryEvent {
  message?: string;
  level: "fatal" | "error" | "warning" | "info" | "debug";
  extra?: Record<string, unknown>;
  tags?: Record<string, string>;
  request?: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
  };
  user?: {
    id?: string;
    ip_address?: string;
    user_agent?: string;
  };
  stacktrace?: {
    frames: Array<{
      filename?: string;
      function?: string;
      lineno?: number;
      colno?: number;
    }>;
  };
  timestamp: number;
  environment: string;
  platform: "node" | "javascript";
  sdk: {
    name: string;
    version: string;
  };
  server_name?: string;
}

interface SentryResponse {
  id?: string;
}

// Track cold starts to filter noise
let requestCount = 0;
const COLD_START_THRESHOLD = 3; // Ignore first N errors (likely cold starts)

// Error patterns to filter as noise
const NOISE_PATTERNS = [
  // Cold start related
  /Worker.*startup/i,
  /Isolate.*startup/i,
  /Cold.*start/i,

  // Known transient errors
  /ETIMEDOUT/i,
  /ECONNRESET/i,
  /Temporarily unavailable/i,

  // Bot/monitoring noise
  /health.*check/i,
  /readiness.*probe/i,
  /liveness.*probe/i,
];

/**
 * Check if an error should be filtered as noise
 */
const isNoise = (error: Error | string, context: { path: string }): boolean => {
  const message = typeof error === "string" ? error : error.message;

  // Skip health check endpoint errors
  if (context.path.startsWith("/health")) {
    return true;
  }

  // Skip cold start errors
  if (requestCount <= COLD_START_THRESHOLD) {
    const coldStartPatterns = [
      /timeout/i,
      /worker.*not.*ready/i,
      /isolate.*not.*ready/i,
    ];
    if (coldStartPatterns.some((p) => p.test(message))) {
      return true;
    }
  }

  // Check against noise patterns
  return NOISE_PATTERNS.some((pattern) => pattern.test(message));
};

/**
 * Extract stack frames from error
 */
const extractStackFrames = (
  error: Error,
): Array<{
  filename?: string;
  function?: string;
  lineno?: number;
  colno?: number;
}> => {
  if (!error.stack) return [];

  const lines = error.stack.split("\n").slice(1);
  const frames: Array<{
    filename?: string;
    function?: string;
    lineno?: number;
    colno?: number;
  }> = [];

  for (const line of lines) {
    // Parse stack frames (simplified for Cloudflare Workers)
    const match = line.match(/at\s+([^\s]+)\s+\(([^:]+):(\d+):(\d+)\)/);
    if (match) {
      frames.push({
        function: match[1],
        filename: match[2],
        lineno: parseInt(match[3], 10),
        colno: parseInt(match[4], 10),
      });
    }
  }

  return frames;
};

/**
 * Hash user agent for privacy
 */
const hashUserAgent = (userAgent: string): string => {
  let hash = 0;
  const str = userAgent.substring(0, 100);
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

/**
 * Hash IP for privacy
 */
const hashIp = (ip: string): string => {
  // For IPv4, keep first 2 octets, hash the rest
  if (ip && ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) {
      const prefix = parts.slice(0, 2).join(".");
      let hash = 0;
      const suffix = parts.slice(2).join(".");
      for (let i = 0; i < suffix.length; i++) {
        const char = suffix.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      return `${prefix}.x.x-${Math.abs(hash).toString(16)}`;
    }
  }
  return "hash-" + hashUserAgent(ip || "");
};

/**
 * Sentry service for Cloudflare Workers
 */
export class SentryService {
  private readonly dsn: string;
  private readonly environment: string;
  private readonly enabled: boolean;

  constructor(dsn: string, environment: string) {
    this.dsn = dsn;
    this.environment = environment;
    this.enabled = !!dsn && environment !== "development";
  }

  /**
   * Capture an exception and send to Sentry
   */
  async captureException(
    error: Error,
    context?: {
      request?: Context<{ Bindings: Env }>;
      tags?: Record<string, string>;
      extra?: Record<string, unknown>;
    },
  ): Promise<SentryResponse | null> {
    if (!this.enabled) return null;

    const path = context?.request?.req.path ?? "unknown";

    // Filter noise
    if (isNoise(error, { path })) {
      return null;
    }

    const userAgent = context?.request?.req.header("User-Agent");
    const ip = context?.request?.req.header("CF-Connecting-IP");

    const event: SentryEvent = {
      level: "error",
      message: error.message,
      stacktrace: {
        frames: extractStackFrames(error),
      },
      timestamp: Date.now(),
      environment: this.environment,
      platform: "javascript",
      sdk: {
        name: "svg-api-worker-sentry",
        version: "1.0.0",
      },
      tags: {
        ...context?.tags,
        endpoint: path,
        method: context?.request?.req.method,
        cold_start: requestCount <= COLD_START_THRESHOLD ? "true" : "false",
      },
      extra: {
        ...context?.extra,
        error_name: error.name,
      },
      user: userAgent
        ? {
            id: hashUserAgent(userAgent),
            ip_address: ip ? hashIp(ip) : undefined,
            user_agent: userAgent.substring(0, 200),
          }
        : undefined,
      request: context?.request
        ? {
            method: context.request.req.method,
            url: context.request.req.url,
            headers: this.filterSensitiveHeaders(
              Object.fromEntries(context.request.req.raw.headers.entries()),
            ),
          }
        : undefined,
    };

    return this.sendEvent(event);
  }

  /**
   * Capture a message and send to Sentry
   */
  async captureMessage(
    message: string,
    level: SentryEvent["level"] = "info",
    context?: {
      request?: Context<{ Bindings: Env }>;
      tags?: Record<string, string>;
      extra?: Record<string, unknown>;
    },
  ): Promise<SentryResponse | null> {
    if (!this.enabled) return null;

    const path = context?.request?.req.path ?? "unknown";

    // Filter noise messages
    if (NOISE_PATTERNS.some((p) => p.test(message))) {
      return null;
    }

    const userAgent = context?.request?.req.header("User-Agent");
    const ip = context?.request?.req.header("CF-Connecting-IP");

    const event: SentryEvent = {
      level,
      message,
      timestamp: Date.now(),
      environment: this.environment,
      platform: "javascript",
      sdk: {
        name: "svg-api-worker-sentry",
        version: "1.0.0",
      },
      tags: {
        ...context?.tags,
        endpoint: path,
      },
      extra: context?.extra,
      user: userAgent
        ? {
            id: hashUserAgent(userAgent),
            ip_address: ip ? hashIp(ip) : undefined,
          }
        : undefined,
    };

    return this.sendEvent(event);
  }

  /**
   * Send event to Sentry via HTTP API
   */
  private async sendEvent(event: SentryEvent): Promise<SentryResponse | null> {
    try {
      const url = new URL(this.dsn);
      const envelopeUrl = `${url.protocol}//${url.host}/api/${url.pathname.split("/")[3]}/envelope/`;

      // Create Sentry envelope
      const envelope = this.createEnvelope(event);

      const response = await fetch(envelopeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-sentry-envelope",
        },
        body: envelope,
      });

      if (response.ok) {
        const data = (await response.json()) as { id?: string };
        return data;
      }
    } catch (err) {
      // Fail silently - don't let Sentry errors break the app
      console.debug("Sentry send failed:", err);
    }

    return null;
  }

  /**
   * Create Sentry envelope format
   */
  private createEnvelope(event: SentryEvent): string {
    const header = JSON.stringify({
      sent_at: new Date().toISOString(),
      dsn: this.dsn,
      sdk: event.sdk,
    });

    const itemHeader = JSON.stringify({
      type: "event",
      content_type: "application/json",
    });

    const payload = JSON.stringify(event);

    return `${header}\n${itemHeader}\n${payload}`;
  }

  /**
   * Filter sensitive headers
   */
  private filterSensitiveHeaders(
    headers: Record<string, string>,
  ): Record<string, string> {
    const filtered: Record<string, string> = {};
    const sensitive = ["authorization", "cookie", "set-cookie", "x-api-key"];

    for (const [key, value] of Object.entries(headers)) {
      if (sensitive.includes(key.toLowerCase())) {
        filtered[key] = "[REDACTED]";
      } else {
        filtered[key] = value;
      }
    }

    return filtered;
  }
}

// Global Sentry instance
let globalSentry: SentryService | null = null;

/**
 * Get or create Sentry service
 */
export const getSentry = (env: Env): SentryService | null => {
  if (!env.SENTRY_DSN) return null;

  if (!globalSentry) {
    globalSentry = new SentryService(env.SENTRY_DSN, env.ENVIRONMENT);
  }

  return globalSentry;
};

/**
 * Increment request counter (call at start of each request)
 */
export const incrementRequestCount = (): void => {
  requestCount++;
};

/**
 * Get current request count (useful for cold start detection)
 */
export const getRequestCount = (): number => requestCount;

/**
 * Reset request counter (for testing)
 */
export const resetRequestCount = (): void => {
  requestCount = 0;
};
