import type { Context } from "hono";
import type { Env } from "../env";

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  environment: string;
  timestamp: string;
  checks: {
    kv: { status: "ok" | "error"; latency_ms?: number; error?: string };
    r2: { status: "ok" | "error"; latency_ms?: number; error?: string };
  };
  uptime_ms: number;
}

const startTime = Date.now();
const VERSION = "1.0.0";

/**
 * Health check endpoint for monitoring and load balancers
 */
export const healthHandler = async (c: Context<{ Bindings: Env }>) => {
  const checks: HealthStatus["checks"] = {
    kv: { status: "ok" },
    r2: { status: "ok" },
  };

  // Check KV
  try {
    const kvStart = Date.now();
    await c.env.SVG_INDEX.get("health-check", { type: "text" });
    checks.kv.latency_ms = Date.now() - kvStart;
  } catch (err) {
    checks.kv.status = "error";
    checks.kv.error = err instanceof Error ? err.message : "Unknown error";
  }

  // Check R2 (head request for a known object or list with limit 1)
  try {
    const r2Start = Date.now();
    await c.env.SVG_BUCKET.list({ limit: 1 });
    checks.r2.latency_ms = Date.now() - r2Start;
  } catch (err) {
    checks.r2.status = "error";
    checks.r2.error = err instanceof Error ? err.message : "Unknown error";
  }

  const allHealthy = checks.kv.status === "ok" && checks.r2.status === "ok";
  const someHealthy = checks.kv.status === "ok" || checks.r2.status === "ok";

  const response: HealthStatus = {
    status: allHealthy ? "healthy" : someHealthy ? "degraded" : "unhealthy",
    version: VERSION,
    environment: c.env.ENVIRONMENT || "unknown",
    timestamp: new Date().toISOString(),
    checks,
    uptime_ms: Date.now() - startTime,
  };

  const statusCode = allHealthy ? 200 : someHealthy ? 200 : 503;

  return c.json(response, statusCode);
};

/**
 * Simple liveness probe (always returns 200 if worker is running)
 */
export const livenessHandler = (c: Context<{ Bindings: Env }>) => {
  return c.json({ status: "alive", timestamp: new Date().toISOString() });
};

/**
 * Readiness probe (checks if dependencies are available)
 */
export const readinessHandler = async (c: Context<{ Bindings: Env }>) => {
  try {
    // Quick check - just verify bindings exist
    if (!c.env.SVG_INDEX || !c.env.SVG_BUCKET) {
      return c.json({ status: "not_ready", reason: "Missing bindings" }, 503);
    }
    return c.json({ status: "ready", timestamp: new Date().toISOString() });
  } catch {
    return c.json({ status: "not_ready" }, 503);
  }
};
