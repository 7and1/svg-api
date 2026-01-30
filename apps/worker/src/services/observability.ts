import type { Context, Next } from "hono";
import type { Env } from "../env";

// ============================================================================
// Types and Interfaces
// ============================================================================

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId: string;
  traceId?: string;
  spanId?: string;
  service: string;
  environment: string;
  version?: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  http?: {
    method: string;
    path: string;
    statusCode?: number;
    durationMs?: number;
    bytesIn?: number;
    bytesOut?: number;
    userAgent?: string;
    referer?: string;
    clientIp?: string;
    cfRay?: string;
    country?: string;
    colo?: string;
  };
  performance?: {
    cpuTimeMs?: number;
    wallTimeMs?: number;
    memoryUsedMB?: number;
    kvReads?: number;
    kvWrites?: number;
    r2Reads?: number;
    cacheHits?: number;
    cacheMisses?: number;
  };
}

export interface MetricPoint {
  name: string;
  value: number;
  timestamp: number;
  tags: Record<string, string>;
}

export interface HealthCheck {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  responseTimeMs: number;
  lastChecked: string;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface DistributedTrace {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operation: string;
  startTime: number;
  endTime?: number;
  tags: Record<string, string>;
  logs: Array<{
    timestamp: number;
    fields: Record<string, unknown>;
  }>;
}

// ============================================================================
// Structured Logger
// ============================================================================

export class StructuredLogger {
  private env: Env;
  private serviceName: string;
  private version: string;

  constructor(env: Env, serviceName = "svg-api", version = "1.0.0") {
    this.env = env;
    this.serviceName = serviceName;
    this.version = version;
  }

  /**
   * Create a log entry with full context
   */
  private createEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    const requestId = this.getCurrentRequestId();
    const traceContext = this.getTraceContext();

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      requestId,
      service: this.serviceName,
      environment: this.env.ENVIRONMENT,
      version: this.version,
      context: this.sanitizeContext(context),
    };

    if (traceContext) {
      entry.traceId = traceContext.traceId;
      entry.spanId = traceContext.spanId;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: this.env.ENVIRONMENT === "development" ? error.stack : undefined,
        code: (error as { code?: string }).code,
      };
    }

    return entry;
  }

  /**
   * Output log entry
   */
  private output(entry: LogEntry): void {
    // In production, use JSON format
    if (this.env.ENVIRONMENT === "production") {
      console.log(JSON.stringify(entry));
    } else {
      // Development: pretty print
      const color = this.getLevelColor(entry.level);
      const prefix = `[${entry.timestamp}] ${entry.level.toUpperCase()}`;
      console.log(`${color}${prefix}\x1b[0m ${entry.message}`);
      if (entry.context && Object.keys(entry.context).length > 0) {
        console.log("  Context:", JSON.stringify(entry.context, null, 2));
      }
      if (entry.error) {
        console.log("  Error:", entry.error);
      }
    }

    // Send to external logging service if configured
    this.sendToExternal(entry);
  }

  /**
   * Send logs to external service (e.g., Datadog, Splunk)
   */
  private async sendToExternal(entry: LogEntry): Promise<void> {
    // Example: Send to HTTP endpoint
    const logEndpoint = this.env.LOG_ENDPOINT;
    if (logEndpoint && this.env.ENVIRONMENT === "production") {
      try {
        await fetch(logEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.env.LOG_API_KEY || ""}`,
          },
          body: JSON.stringify(entry),
        });
      } catch (err) {
        // Silent fail - don't let logging errors affect the request
        console.error("Failed to send log to external service:", err);
      }
    }
  }

  /**
   * Get ANSI color code for log level
   */
  private getLevelColor(level: LogLevel): string {
    const colors: Record<LogLevel, string> = {
      debug: "\x1b[36m",    // Cyan
      info: "\x1b[32m",     // Green
      warn: "\x1b[33m",     // Yellow
      error: "\x1b[31m",    // Red
      fatal: "\x1b[35m",    // Magenta
    };
    return colors[level] || "";
  }

  /**
   * Sanitize context to remove sensitive data
   */
  private sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!context) return undefined;

    const sensitiveKeys = ["password", "token", "secret", "key", "authorization", "api_key", "apikey"];
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(context)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = this.sanitizeContext(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Get current request ID from async context
   */
  private getCurrentRequestId(): string {
    // This would be set by middleware
    return (globalThis as { __requestId?: string }).__requestId || "unknown";
  }

  /**
   * Get trace context from async context
   */
  private getTraceContext(): { traceId: string; spanId: string } | undefined {
    return (globalThis as { __traceContext?: { traceId: string; spanId: string } }).__traceContext;
  }

  // Public logging methods
  debug(message: string, context?: Record<string, unknown>): void {
    this.output(this.createEntry("debug", message, context));
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.output(this.createEntry("info", message, context));
  }

  warn(message: string, context?: Record<string, unknown>, error?: Error): void {
    this.output(this.createEntry("warn", message, context, error));
  }

  error(message: string, error: Error, context?: Record<string, unknown>): void {
    this.output(this.createEntry("error", message, context, error));
  }

  fatal(message: string, error: Error, context?: Record<string, unknown>): void {
    this.output(this.createEntry("fatal", message, context, error));
  }

  /**
   * Log HTTP request/response
   */
  logHttp(
    c: Context,
    durationMs: number,
    bytesIn?: number,
    bytesOut?: number
  ): void {
    const entry = this.createEntry("info", "HTTP Request", {
      method: c.req.method,
      path: c.req.path,
      statusCode: c.res.status,
      durationMs,
    });

    entry.http = {
      method: c.req.method,
      path: c.req.path,
      statusCode: c.res.status,
      durationMs,
      bytesIn,
      bytesOut,
      userAgent: c.req.header("User-Agent"),
      referer: c.req.header("Referer"),
      clientIp: c.req.header("CF-Connecting-IP"),
      cfRay: c.req.header("CF-Ray"),
      country: c.req.header("CF-IPCountry"),
      colo: c.req.header("CF-Worker"),
    };

    // Log at appropriate level based on status code
    if (c.res.status >= 500) {
      entry.level = "error";
    } else if (c.res.status >= 400) {
      entry.level = "warn";
    }

    this.output(entry);
  }
}

// ============================================================================
// Metrics Collector
// ============================================================================

export class MetricsCollector {
  private env: Env;
  private metrics: MetricPoint[] = [];
  private flushInterval: number;

  constructor(env: Env, flushIntervalMs = 60000) {
    this.env = env;
    this.flushInterval = flushIntervalMs;
  }

  /**
   * Record a metric point
   */
  record(name: string, value: number, tags: Record<string, string> = {}): void {
    const point: MetricPoint = {
      name: `svg_api.${name}`,
      value,
      timestamp: Date.now(),
      tags: {
        environment: this.env.ENVIRONMENT,
        ...tags,
      },
    };

    this.metrics.push(point);

    // Send to Analytics Engine immediately if available
    if (this.env.ANALYTICS) {
      this.env.ANALYTICS.writeDataPoint({
        blobs: [name, JSON.stringify(tags)],
        doubles: [value],
        indexes: [name],
      });
    }

    // Flush if buffer is full
    if (this.metrics.length >= 100) {
      this.flush();
    }
  }

  /**
   * Record request metrics
   */
  recordRequest(
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
    tier?: string
  ): void {
    const tags = {
      method,
      path: this.normalizePath(path),
      status: statusCode.toString(),
      tier: tier || "anonymous",
    };

    this.record("request.count", 1, tags);
    this.record("request.duration", durationMs, tags);

    // Bucket latencies
    const latencyBucket = this.getLatencyBucket(durationMs);
    this.record(`request.latency.${latencyBucket}`, 1, tags);

    // Error rates
    if (statusCode >= 500) {
      this.record("error.server", 1, tags);
    } else if (statusCode >= 400) {
      this.record("error.client", 1, tags);
    }
  }

  /**
   * Record cache metrics
   */
  recordCache(hit: boolean, tier?: string): void {
    this.record(`cache.${hit ? "hit" : "miss"}`, 1, { tier: tier || "anonymous" });
  }

  /**
   * Record storage metrics
   */
  recordStorage(operation: "kv_read" | "kv_write" | "r2_read", bytes: number, success: boolean): void {
    this.record(`storage.${operation}.count`, 1, { success: success.toString() });
    this.record(`storage.${operation}.bytes`, bytes, { success: success.toString() });
  }

  /**
   * Flush metrics to storage
   */
  async flush(): Promise<void> {
    if (this.metrics.length === 0) return;

    // Store in D1 if available
    if (this.env.METRICS_DB) {
      const batch = this.metrics.splice(0, 100);

      try {
        const stmt = this.env.METRICS_DB.prepare(`
          INSERT INTO metrics (name, value, tags, timestamp)
          VALUES (?, ?, ?, ?)
        `);

        await this.env.METRICS_DB.batch(
          batch.map(m => stmt.bind(m.name, m.value, JSON.stringify(m.tags), m.timestamp))
        );
      } catch (err) {
        console.error("Failed to flush metrics:", err);
        // Re-add failed metrics
        this.metrics.unshift(...batch);
      }
    } else {
      // Just clear if no storage
      this.metrics = [];
    }
  }

  /**
   * Normalize path for metrics (remove IDs and query params)
   */
  private normalizePath(path: string): string {
    // Replace UUIDs, numeric IDs, and hashes
    return path
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "/:id")
      .replace(/\/\d+/g, "/:id")
      .replace(/\?.*$/, "");
  }

  /**
   * Get latency bucket for histogram
   */
  private getLatencyBucket(ms: number): string {
    if (ms < 10) return "0_10ms";
    if (ms < 50) return "10_50ms";
    if (ms < 100) return "50_100ms";
    if (ms < 250) return "100_250ms";
    if (ms < 500) return "250_500ms";
    if (ms < 1000) return "500_1000ms";
    if (ms < 2500) return "1000_2500ms";
    if (ms < 5000) return "2500_5000ms";
    return "5000ms_plus";
  }
}

// ============================================================================
// Distributed Tracing
// ============================================================================

export class Tracer {
  private traceId: string;
  private spans: DistributedTrace[] = [];
  private activeSpan: DistributedTrace | null = null;

  constructor(traceId?: string) {
    this.traceId = traceId || this.generateId();
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * Start a new span
   */
  startSpan(operation: string, tags: Record<string, string> = {}): string {
    const span: DistributedTrace = {
      traceId: this.traceId,
      spanId: this.generateId(),
      parentSpanId: this.activeSpan?.spanId,
      operation,
      startTime: performance.now(),
      tags: {
        ...tags,
        service: "svg-api",
      },
      logs: [],
    };

    this.spans.push(span);
    this.activeSpan = span;

    return span.spanId;
  }

  /**
   * End current span
   */
  endSpan(spanId?: string): void {
    const span = spanId
      ? this.spans.find(s => s.spanId === spanId)
      : this.activeSpan;

    if (span) {
      span.endTime = performance.now();

      // Restore parent span
      if (span.parentSpanId) {
        this.activeSpan = this.spans.find(s => s.spanId === span.parentSpanId) || null;
      } else {
        this.activeSpan = null;
      }
    }
  }

  /**
   * Add log to current span
   */
  log(fields: Record<string, unknown>): void {
    if (this.activeSpan) {
      this.activeSpan.logs.push({
        timestamp: performance.now(),
        fields,
      });
    }
  }

  /**
   * Add tags to current span
   */
  setTag(key: string, value: string): void {
    if (this.activeSpan) {
      this.activeSpan.tags[key] = value;
    }
  }

  /**
   * Get trace context for propagation
   */
  getContext(): { traceId: string; spanId: string } {
    return {
      traceId: this.traceId,
      spanId: this.activeSpan?.spanId || this.traceId,
    };
  }

  /**
   * Export spans for external system
   */
  export(): DistributedTrace[] {
    return this.spans.map(span => ({
      ...span,
      durationMs: span.endTime ? span.endTime - span.startTime : undefined,
    }));
  }
}

// ============================================================================
// Health Check Service
// ============================================================================

export class HealthService {
  private env: Env;
  private checks: Map<string, () => Promise<HealthCheck>> = new Map();

  constructor(env: Env) {
    this.env = env;
    this.registerDefaultChecks();
  }

  /**
   * Register default health checks
   */
  private registerDefaultChecks(): void {
    // KV health check
    this.register("kv", async () => {
      const start = performance.now();
      try {
        await this.env.SVG_INDEX.get("health:check");
        return {
          name: "kv",
          status: "healthy",
          responseTimeMs: performance.now() - start,
          lastChecked: new Date().toISOString(),
        };
      } catch (err) {
        return {
          name: "kv",
          status: "unhealthy",
          responseTimeMs: performance.now() - start,
          lastChecked: new Date().toISOString(),
          message: err instanceof Error ? err.message : "KV check failed",
        };
      }
    });

    // R2 health check
    this.register("r2", async () => {
      const start = performance.now();
      try {
        await this.env.SVG_BUCKET.head("health-check.txt");
        return {
          name: "r2",
          status: "healthy",
          responseTimeMs: performance.now() - start,
          lastChecked: new Date().toISOString(),
        };
      } catch (err) {
        // 404 is OK - bucket exists but object doesn't
        if (err instanceof Error && err.message.includes("404")) {
          return {
            name: "r2",
            status: "healthy",
            responseTimeMs: performance.now() - start,
            lastChecked: new Date().toISOString(),
          };
        }
        return {
          name: "r2",
          status: "unhealthy",
          responseTimeMs: performance.now() - start,
          lastChecked: new Date().toISOString(),
          message: err instanceof Error ? err.message : "R2 check failed",
        };
      }
    });

    // D1 health check (if configured)
    if (this.env.METRICS_DB) {
      this.register("d1", async () => {
        const start = performance.now();
        try {
          await this.env.METRICS_DB!.prepare("SELECT 1").first();
          return {
            name: "d1",
            status: "healthy",
            responseTimeMs: performance.now() - start,
            lastChecked: new Date().toISOString(),
          };
        } catch (err) {
          return {
            name: "d1",
            status: "unhealthy",
            responseTimeMs: performance.now() - start,
            lastChecked: new Date().toISOString(),
            message: err instanceof Error ? err.message : "D1 check failed",
          };
        }
      });
    }
  }

  /**
   * Register a custom health check
   */
  register(name: string, check: () => Promise<HealthCheck>): void {
    this.checks.set(name, check);
  }

  /**
   * Run all health checks
   */
  async checkAll(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    checks: HealthCheck[];
    timestamp: string;
    version: string;
  }> {
    const results: HealthCheck[] = [];
    let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";

    for (const [name, checkFn] of this.checks) {
      try {
        const result = await checkFn();
        results.push(result);

        if (result.status === "unhealthy") {
          overallStatus = "unhealthy";
        } else if (result.status === "degraded" && overallStatus === "healthy") {
          overallStatus = "degraded";
        }
      } catch (err) {
        results.push({
          name,
          status: "unhealthy",
          responseTimeMs: 0,
          lastChecked: new Date().toISOString(),
          message: err instanceof Error ? err.message : "Check threw exception",
        });
        overallStatus = "unhealthy";
      }
    }

    return {
      status: overallStatus,
      checks: results,
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    };
  }

  /**
   * Get readiness status (can accept traffic)
   */
  async isReady(): Promise<boolean> {
    const result = await this.checkAll();
    return result.status !== "unhealthy";
  }

  /**
   * Get liveness status (is running)
   */
  isAlive(): boolean {
    return true; // Worker is always "alive" if this code runs
  }
}

// ============================================================================
// Middleware
// ============================================================================

/**
 * Request logging middleware
 */
export function requestLogger() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const start = performance.now();
    const logger = new StructuredLogger(c.env);

    // Generate request ID
    const requestId = crypto.randomUUID();
    c.set("requestId", requestId);
    (globalThis as { __requestId?: string }).__requestId = requestId;

    // Create tracer
    const tracer = new Tracer();
    tracer.startSpan("http_request", {
      method: c.req.method,
      path: c.req.path,
    });
    c.set("tracer", tracer);

    // Log request start
    logger.debug("Request started", {
      method: c.req.method,
      path: c.req.path,
      query: Object.fromEntries(new URL(c.req.url).searchParams),
    });

    try {
      await next();
    } catch (err) {
      // Log error
      logger.error("Request failed", err as Error, {
        method: c.req.method,
        path: c.req.path,
      });
      throw err;
    } finally {
      const duration = performance.now() - start;

      // End trace
      tracer.endSpan();

      // Log response
      logger.logHttp(c, duration);

      // Record metrics
      const metrics = new MetricsCollector(c.env);
      const auth = c.get("auth");
      metrics.recordRequest(
        c.req.method,
        c.req.path,
        c.res.status,
        duration,
        auth?.tier
      );
    }
  };
}

/**
 * Error tracking middleware
 */
export function errorTracker() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    try {
      await next();
    } catch (err) {
      const logger = new StructuredLogger(c.env);

      // Log the error
      logger.error("Unhandled exception", err as Error, {
        method: c.req.method,
        path: c.req.path,
        requestId: c.get("requestId"),
      });

      // Send to Sentry if configured
      if (c.env.SENTRY_DSN) {
        try {
          await sendToSentry(c.env.SENTRY_DSN, err as Error, c);
        } catch (sentryErr) {
          logger.warn("Failed to send to Sentry", {}, sentryErr as Error);
        }
      }

      // Return generic error response
      return c.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: c.env.ENVIRONMENT === "production"
              ? "An internal error occurred"
              : (err as Error).message,
            requestId: c.get("requestId"),
          },
        },
        500
      );
    }
  };
}

/**
 * Send error to Sentry
 */
async function sendToSentry(dsn: string, error: Error, c: Context): Promise<void> {
  const event = {
    event_id: crypto.randomUUID().replace(/-/g, ""),
    timestamp: new Date().toISOString(),
    platform: "javascript",
    level: "error",
    exception: {
      values: [{
        type: error.name,
        value: error.message,
        stacktrace: {
          frames: error.stack?.split("\n").map(line => ({
            filename: line.match(/at (.+) \((.+):\d+:\d+\)/)?.[2] || "unknown",
            function: line.match(/at (.+) \((.+):\d+:\d+\)/)?.[1] || "anonymous",
          })) || [],
        },
      }],
    },
    request: {
      url: c.req.url,
      method: c.req.method,
      headers: Object.fromEntries(
        Object.entries(c.req.header()).map(([k, v]) => [k, v || ""])
      ),
    },
    tags: {
      environment: c.env.ENVIRONMENT,
    },
  };

  const url = new URL(dsn);
  const sentryUrl = `https://${url.host}/api${url.pathname}/store/`;

  await fetch(sentryUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${url.username}, sentry_client=svg-api/1.0.0`,
    },
    body: JSON.stringify(event),
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate request ID
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Get client info from request
 */
export function getClientInfo(c: Context): {
  ip: string;
  country?: string;
  colo?: string;
  userAgent?: string;
  apiKey?: string | null;
} {
  return {
    ip: c.req.header("CF-Connecting-IP") ||
        c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ||
        "unknown",
    country: c.req.header("CF-IPCountry"),
    colo: c.req.header("CF-Ray")?.split("-")[1],
    userAgent: c.req.header("User-Agent"),
    apiKey: c.req.header("X-API-Key") ||
            c.req.header("Authorization")?.replace("Bearer ", ""),
  };
}
