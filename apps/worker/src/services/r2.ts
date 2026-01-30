import type { Env } from "../env";
import { metrics } from "../utils/metrics";

export interface R2IconObject {
  body: string;
  etag: string | null;
  size: number;
  uploaded: Date | null;
}

export interface R2ConditionalResult {
  object: R2IconObject | null;
  notModified: boolean;
  etag: string | null;
}

// Pre-compiled regex patterns for performance
const PATH_TRAVERSAL_PATTERN = /\.\.|\/\/|^\//;
const VALID_KEY_PATTERN = /^[a-zA-Z0-9\-_.\/]+$/;

/**
 * Validates and sanitizes R2 object keys to prevent path traversal
 */
const sanitizeKey = (key: string): string | null => {
  // Reject empty keys
  if (!key || typeof key !== "string") return null;

  // Reject keys with path traversal attempts
  if (PATH_TRAVERSAL_PATTERN.test(key)) {
    return null;
  }

  // Only allow alphanumeric, dash, underscore, dot, and forward slash
  if (!VALID_KEY_PATTERN.test(key)) {
    return null;
  }

  // Normalize and return
  return key.replace(/\/+/g, "/");
};

// In-flight request deduplication
interface PendingRequest {
  promise: Promise<R2IconObject | null>;
  timestamp: number;
}

const pendingRequests = new Map<string, PendingRequest>();
const IN_FLIGHT_TIMEOUT_MS = 30_000;

// Cleanup stale pending requests periodically
const cleanupStaleRequests = (): void => {
  const now = Date.now();
  for (const [key, request] of pendingRequests.entries()) {
    if (now - request.timestamp > IN_FLIGHT_TIMEOUT_MS) {
      pendingRequests.delete(key);
    }
  }
};

// Note: setInterval not allowed in Workers global scope
// Cleanup happens lazily on each request instead

// Circuit breaker for R2 operations
class R2CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private readonly threshold = 5;
  private readonly timeoutMs = 30_000;

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.timeoutMs) {
        this.state = 'half-open';
      } else {
        throw new Error('R2 circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }

  getState(): string {
    return this.state;
  }
}

const r2CircuitBreaker = new R2CircuitBreaker();

// Connection pool simulation for R2 (limit concurrent connections)
class R2ConnectionPool {
  private activeConnections = 0;
  private readonly maxConnections = 50;
  private queue: Array<() => void> = [];

  async acquire(): Promise<void> {
    if (this.activeConnections < this.maxConnections) {
      this.activeConnections++;
      return;
    }

    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.activeConnections--;
    }
  }

  getActiveConnections(): number {
    return this.activeConnections;
  }
}

const connectionPool = new R2ConnectionPool();

const SLOW_R2_THRESHOLD_MS = 500;

// SVG validation functions for security (SEC-004)
function isValidSvg(content: string): boolean {
	// Check for SVG tag
	return content.includes('<svg') && content.includes('</svg>');
}

function detectSvgThreats(content: string): string[] {
	const threats: string[] = [];
	// Check for script tags
	if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(content)) {
		threats.push('script_tag');
	}
	// Check for event handlers
	if (/\son\w+\s*=/i.test(content)) {
		threats.push('event_handler');
	}
	// Check for javascript: protocol
	if (/javascript:/i.test(content)) {
		threats.push('javascript_protocol');
	}
	return threats;
}

function validateSvgContent(content: string, key: string): boolean {
	const isValid = isValidSvg(content);
	if (!isValid) {
		console.error(`[Security] Invalid SVG structure for key: ${key}`);
		return false;
	}

	const threats = detectSvgThreats(content);
	if (threats.length > 0) {
		console.error(`[Security] SVG threats detected in ${key}: ${threats.join(', ')}`);
		return false;
	}

	return true;
}

export const getIconFromR2 = async (
  env: Env,
  key: string,
  ifNoneMatch?: string | null,
): Promise<R2ConditionalResult> => {
  const safeKey = sanitizeKey(key);
  if (!safeKey) {
    console.warn(`[Security] Rejected invalid R2 key: ${key}`);
    return { object: null, notModified: false, etag: null };
  }

  // Check for in-flight request deduplication
  const existingRequest = pendingRequests.get(safeKey);
  if (existingRequest) {
    metrics.recordDedupHit('r2', safeKey);
    const result = await existingRequest.promise;
    // Check ETag match after deduped request completes
    if (ifNoneMatch && result?.etag === ifNoneMatch) {
      return { object: null, notModified: true, etag: result.etag };
    }
    return { object: result, notModified: false, etag: result?.etag ?? null };
  }

  // Create new request promise
  const requestPromise = fetchIconFromR2(env, safeKey);
  pendingRequests.set(safeKey, {
    promise: requestPromise,
    timestamp: Date.now(),
  });

  try {
    const result = await requestPromise;
    // Check ETag match
    if (ifNoneMatch && result?.etag === ifNoneMatch) {
      return { object: null, notModified: true, etag: result.etag };
    }
    return { object: result, notModified: false, etag: result?.etag ?? null };
  } finally {
    // Clean up pending request after completion
    pendingRequests.delete(safeKey);
  }
};

async function fetchIconFromR2(
  env: Env,
  safeKey: string
): Promise<R2IconObject | null> {
  const startTime = performance.now();

  try {
    await connectionPool.acquire();

    let result: R2IconObject | null = null;

    if (env.LOCAL_ICONS_BASE_URL) {
      result = await fetchFromLocal(env, safeKey);
    } else {
      result = await r2CircuitBreaker.execute(async () => {
        const object = await env.SVG_BUCKET.get(safeKey);
        if (!object) return null;

        const body = await object.text();

        // Validate SVG content (SEC-004)
        if (!validateSvgContent(body, safeKey)) {
          return null;
        }

        return {
          body,
          etag: object.httpEtag ?? object.etag ?? null,
          size: object.size,
          uploaded: object.uploaded ?? null,
        };
      });
    }

    const latency = performance.now() - startTime;
    metrics.recordLatency('r2', 'get', latency);

    if (latency > SLOW_R2_THRESHOLD_MS) {
      metrics.recordSlowQuery('r2', `get:${safeKey}`, latency);
    }

    if (result) {
      metrics.recordBytesTransferred('r2_read', result.size);
    }

    return result;
  } catch (err) {
    metrics.recordError('r2', 'get', err instanceof Error ? err.message : 'unknown');

    // Log error but don't expose internal details
    console.error(`[R2 Error] Failed to fetch ${safeKey}:`,
      err instanceof Error ? err.message : 'Unknown error');

    return null;
  } finally {
    connectionPool.release();
  }
}

async function fetchFromLocal(
  env: Env,
  safeKey: string
): Promise<R2IconObject | null> {
  const url = `${env.LOCAL_ICONS_BASE_URL!.replace(/\/$/, "")}/${safeKey}`;

  const response = await fetch(url, {
    cf: {
      // Use Cloudflare cache for local development
      cacheTtl: 300,
      cacheEverything: true,
    },
  });

  if (!response.ok) return null;

  const body = await response.text();

  // Validate SVG content (SEC-004)
  if (!validateSvgContent(body, safeKey)) {
    return null;
  }

  const etag = response.headers.get("etag");
  const size = Number(response.headers.get("content-length") ?? body.length);

  return { body, etag, size, uploaded: null };
}

// Batch fetch multiple icons with concurrency control
export const batchGetIconsFromR2 = async (
  env: Env,
  keys: string[],
  etags?: Map<string, string | null>
): Promise<Map<string, R2ConditionalResult>> => {
  const results = new Map<string, R2ConditionalResult>();
  const uniqueKeys = [...new Set(keys)];

  // Check for pending requests first
  const keysToFetch: string[] = [];
  const pendingPromises: Promise<void>[] = [];

  for (const key of uniqueKeys) {
    const safeKey = sanitizeKey(key);
    if (!safeKey) {
      results.set(key, { object: null, notModified: false, etag: null });
      continue;
    }

    const pending = pendingRequests.get(safeKey);
    if (pending) {
      pendingPromises.push(
        pending.promise.then((result) => {
          const ifNoneMatch = etags?.get(key);
          if (ifNoneMatch && result?.etag === ifNoneMatch) {
            results.set(key, { object: null, notModified: true, etag: result.etag });
          } else {
            results.set(key, { object: result, notModified: false, etag: result?.etag ?? null });
          }
        })
      );
    } else {
      keysToFetch.push(safeKey);
    }
  }

  // Wait for pending requests
  if (pendingPromises.length > 0) {
    await Promise.all(pendingPromises);
  }

  // Fetch remaining with concurrency limit
  const CONCURRENCY = 10;
  const chunks: string[][] = [];
  for (let i = 0; i < keysToFetch.length; i += CONCURRENCY) {
    chunks.push(keysToFetch.slice(i, i + CONCURRENCY));
  }

  for (const chunk of chunks) {
    const chunkResults = await Promise.all(
      chunk.map(async (safeKey) => {
        const ifNoneMatch = etags?.get(safeKey);
        const result = await getIconFromR2(env, safeKey, ifNoneMatch);
        return { safeKey, result };
      })
    );

    for (const { safeKey, result } of chunkResults) {
      results.set(safeKey, result);
    }
  }

  return results;
};

// Get R2 service stats for monitoring
export const getR2Stats = () => {
  return {
    pendingRequests: pendingRequests.size,
    activeConnections: connectionPool.getActiveConnections(),
    circuitBreaker: r2CircuitBreaker.getState(),
  };
};
