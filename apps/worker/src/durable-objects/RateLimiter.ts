/**
 * RateLimiter Durable Object
 *
 * Provides global rate limiting across all Cloudflare Worker isolates.
 * Uses token bucket algorithm with burst support.
 */

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  burst?: number;
}

interface RateLimitState {
  count: number;
  resetAt: number;
  tokens: number;
  lastRefill: number;
}

export class RateLimiter {
  private state: DurableObjectState;
  private config: RateLimitConfig;

  constructor(state: DurableObjectState, config: RateLimitConfig) {
    this.state = state;
    this.config = config;
  }

  /**
   * Check and update rate limit for a key
   * Returns rate limit status and headers
   */
  async checkLimit(key: string): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    resetAt: number;
    retryAfter?: number;
  }> {
    const now = Date.now();
    const windowMs = this.config.windowMs;
    const max = this.config.max;
    const burst = this.config.burst || max;

    // Get or initialize state for this key
    const stateKey = `rl:${key}`;
    let entry = await this.state.storage.get<RateLimitState>(stateKey);

    if (!entry || now > entry.resetAt) {
      // New window or expired
      entry = {
        count: 0,
        resetAt: now + windowMs,
        tokens: burst,
        lastRefill: now,
      };
    }

    // Token bucket refill
    const elapsed = now - entry.lastRefill;
    const refillRate = (max - burst) / windowMs; // tokens per ms after burst
    const tokensToAdd = Math.floor(elapsed * refillRate);

    if (tokensToAdd > 0) {
      entry.tokens = Math.min(burst, entry.tokens + tokensToAdd);
      entry.lastRefill = now;
    }

    // Check if allowed
    const allowed = entry.tokens > 0;

    if (allowed) {
      entry.tokens--;
      entry.count++;
    }

    // Save state
    await this.state.storage.put(stateKey, entry);

    // Schedule cleanup
    this.state.waitUntil(this.scheduleCleanup(stateKey, entry.resetAt));

    return {
      allowed,
      limit: max,
      remaining: Math.max(0, entry.tokens),
      resetAt: entry.resetAt,
      retryAfter: allowed ? undefined : Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  /**
   * Schedule cleanup of expired entries
   */
  private async scheduleCleanup(key: string, resetAt: number): Promise<void> {
    // Set alarm to clean up after window expires
    const existingAlarm = await this.state.storage.getAlarm();
    if (!existingAlarm || existingAlarm > resetAt) {
      await this.state.storage.setAlarm(resetAt + 1000);
    }
  }

  /**
   * Alarm handler - cleanup expired entries
   */
  async alarm(): Promise<void> {
    const now = Date.now();
    const keys = await this.state.storage.list<RateLimitState>({ prefix: "rl:" });

    const toDelete: string[] = [];
    for (const [key, entry] of keys) {
      if (now > entry.resetAt + 60000) {
        // Keep 1 minute buffer
        toDelete.push(key);
      }
    }

    if (toDelete.length > 0) {
      await this.state.storage.delete(toDelete);
    }

    // Set next alarm if there are remaining entries
    const remaining = await this.state.storage.list<RateLimitState>({
      prefix: "rl:",
      limit: 1,
    });
    if (remaining.size > 0) {
      const nextExpiry = Math.min(
        ...Array.from(remaining.values()).map((e) => e.resetAt)
      );
      await this.state.storage.setAlarm(nextExpiry + 60000);
    }
  }

  /**
   * Check rate limit with dynamic configuration from headers
   */
  async checkLimitWithConfig(
    key: string,
    config: RateLimitConfig
  ): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    resetAt: number;
    retryAfter?: number;
  }> {
    const now = Date.now();
    const windowMs = config.windowMs;
    const max = config.max;
    const burst = config.burst || max;

    const stateKey = `rl:${key}`;
    let entry = await this.state.storage.get<RateLimitState>(stateKey);

    if (!entry || now > entry.resetAt) {
      entry = {
        count: 0,
        resetAt: now + windowMs,
        tokens: burst,
        lastRefill: now,
      };
    }

    const elapsed = now - entry.lastRefill;
    const refillRate = (max - burst) / windowMs;
    const tokensToAdd = Math.floor(elapsed * refillRate);

    if (tokensToAdd > 0) {
      entry.tokens = Math.min(burst, entry.tokens + tokensToAdd);
      entry.lastRefill = now;
    }

    const allowed = entry.tokens > 0;

    if (allowed) {
      entry.tokens--;
      entry.count++;
    }

    await this.state.storage.put(stateKey, entry);
    this.state.waitUntil(this.scheduleCleanup(stateKey, entry.resetAt));

    return {
      allowed,
      limit: max,
      remaining: Math.max(0, entry.tokens),
      resetAt: entry.resetAt,
      retryAfter: allowed ? undefined : Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  /**
   * Fetch handler for Durable Object
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");

    if (!key) {
      return new Response(JSON.stringify({ error: "Missing key" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get configuration from headers
    const windowMs = parseInt(
      request.headers.get("X-RateLimit-Window") || "60000",
      10
    );
    const max = parseInt(request.headers.get("X-RateLimit-Max") || "60", 10);
    const burst = parseInt(
      request.headers.get("X-RateLimit-Burst") || max.toString(),
      10
    );

    const result = await this.checkLimitWithConfig(key, { windowMs, max, burst });

    return new Response(JSON.stringify(result), {
      status: result.allowed ? 200 : 429,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": Math.ceil(result.resetAt / 1000).toString(),
        ...(result.retryAfter
          ? { "Retry-After": result.retryAfter.toString() }
          : {}),
      },
    });
  }
}

/**
 * Rate limit configuration by tier
 */
export const TIER_LIMITS: Record<string, RateLimitConfig> = {
  free: { windowMs: 60_000, max: 60, burst: 10 },
  pro: { windowMs: 60_000, max: 600, burst: 50 },
  enterprise: { windowMs: 60_000, max: 6000, burst: 200 },
  internal: { windowMs: 60_000, max: 10000, burst: 500 },
};

export const ENDPOINT_LIMITS: Record<string, RateLimitConfig> = {
  "/api/v1/icon": { windowMs: 60_000, max: 120, burst: 20 },
  "/api/v1/search": { windowMs: 60_000, max: 30, burst: 5 },
  "/api/v1/batch": { windowMs: 60_000, max: 10, burst: 2 },
  "/health": { windowMs: 60_000, max: 10, burst: 3 },
};
