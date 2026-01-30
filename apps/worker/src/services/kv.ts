import type {
  IconIndex,
  InvertedIndex,
  SynonymMap,
} from "@svg-api/shared/types";
import {
  DEFAULT_INDEX_KEY,
  INVERTED_INDEX_KEY,
  SYNONYMS_KEY,
} from "@svg-api/shared/constants";
import { MemoryCache } from "./cache";
import type { Env } from "../env";
import { metrics } from "../utils/metrics";

// ETag cache for index entries
interface IndexWithETag {
  data: IconIndex;
  etag: string;
  lastModified: number;
}

const indexEtagCache = new MemoryCache<IndexWithETag>(5);

// Extended memory cache with metrics
const indexCache = new MemoryCache<IconIndex>(5);
const invertedIndexCache = new MemoryCache<InvertedIndex>(5);
const synonymsCache = new MemoryCache<SynonymMap>(5);

// Metadata cache for ETag support
interface KVMetadata {
  etag?: string;
  lastModified?: string;
  [key: string]: unknown;
}

const metadataCache = new Map<string, KVMetadata>();

/**
 * Get index with ETag support for conditional requests
 * Uses KV.getWithMetadata to retrieve both data and metadata
 */
export const getIndexWithETag = async (
  env: Env,
  ifNoneMatch?: string | null
): Promise<{ data: IconIndex; etag: string; cached: boolean } | null> => {
  const cacheKey = env.INDEX_KEY ?? DEFAULT_INDEX_KEY;

  // Check ETag cache first
  const etagCached = indexEtagCache.get(cacheKey);
  if (etagCached) {
    // Check if client has matching ETag
    if (ifNoneMatch && ifNoneMatch === etagCached.etag) {
      metrics.recordCacheHit('etag', 'index');
      return { data: etagCached.data, etag: etagCached.etag, cached: true };
    }
  }

  const startTime = performance.now();

  try {
    let result: { data: IconIndex; etag: string } | null = null;

    if (env.SVG_INDEX) {
      result = await kvCircuitBreaker.execute(async () => {
        const { value, metadata } = await env.SVG_INDEX.getWithMetadata<KVMetadata>(cacheKey, {
          type: "json",
        });

        if (!value) return null;

        // Generate ETag from metadata or content hash
        const etag = metadata?.etag ?? `"${hashString(JSON.stringify(value)).slice(0, 16)}"`;

        return { data: value as IconIndex, etag };
      });
    }

    if (!result && env.LOCAL_INDEX_JSON) {
      const data = JSON.parse(env.LOCAL_INDEX_JSON) as IconIndex;
      const etag = `"${hashString(JSON.stringify(data)).slice(0, 16)}"`;
      result = { data, etag };
    }

    const latency = performance.now() - startTime;
    if (latency > SLOW_KV_THRESHOLD_MS) {
      metrics.recordSlowQuery('kv', 'getIndexWithETag', latency);
    }

    if (!result) {
      throw new Error(`Index not found for key ${cacheKey}`);
    }

    // Update ETag cache
    indexEtagCache.set(cacheKey, {
      data: result.data,
      etag: result.etag,
      lastModified: Date.now(),
    }, INDEX_TTL_MS);

    // Check if client has matching ETag after fetch
    if (ifNoneMatch && ifNoneMatch === result.etag) {
      return { data: result.data, etag: result.etag, cached: true };
    }

    metrics.recordCacheMiss('etag', 'index');
    return { data: result.data, etag: result.etag, cached: false };
  } catch (err) {
    metrics.recordError('kv', 'getIndexWithETag', err instanceof Error ? err.message : 'unknown');
    throw err;
  }
};

/**
 * Simple hash function for generating ETags
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Batch read queue for KV operations
interface BatchReadRequest<T> {
  key: string;
  resolve: (value: T | null) => void;
  reject: (reason: Error) => void;
}

class KVBatchReader {
  private queue: BatchReadRequest<unknown>[] = [];
  private timer: number | null = null;
  private readonly BATCH_DELAY_MS = 5;
  private readonly MAX_BATCH_SIZE = 128; // Cloudflare KV limit

  schedule<T>(key: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      this.queue.push({ key, resolve: resolve as (value: unknown) => void, reject });

      if (this.queue.length >= this.MAX_BATCH_SIZE) {
        this.flush();
      } else if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), this.BATCH_DELAY_MS) as unknown as number;
      }
    });
  }

  private async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const batch = this.queue.splice(0, this.MAX_BATCH_SIZE);
    if (batch.length === 0) return;

    // Process batch - in production, use KV bulk API if available
    // For now, process concurrently with concurrency limit
    const CONCURRENCY = 10;
    const chunks: BatchReadRequest<unknown>[][] = [];
    for (let i = 0; i < batch.length; i += CONCURRENCY) {
      chunks.push(batch.slice(i, i + CONCURRENCY));
    }

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (req) => {
          try {
            // Individual get - bulk API not available in Workers
            req.resolve(null);
          } catch (err) {
            req.reject(err instanceof Error ? err : new Error(String(err)));
          }
        })
      );
    }
  }
}

const batchReader = new KVBatchReader();

const INDEX_TTL_MS = 60_000;
const SLOW_KV_THRESHOLD_MS = 100;

// Circuit breaker for KV operations
class CircuitBreaker {
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
        throw new Error('Circuit breaker is open');
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

const kvCircuitBreaker = new CircuitBreaker();

export const getIndex = async (env: Env): Promise<IconIndex> => {
  const cacheKey = env.INDEX_KEY ?? DEFAULT_INDEX_KEY;
  const cached = indexCache.get(cacheKey);
  if (cached) {
    metrics.recordCacheHit('memory', 'index');
    return cached;
  }

  const startTime = performance.now();

  try {
    let raw: IconIndex | null = null;

    if (env.SVG_INDEX) {
      raw = await kvCircuitBreaker.execute(async () => {
        return await env.SVG_INDEX.get(cacheKey, {
          type: "json",
        }) as IconIndex | null;
      });
    }

    if (!raw && env.LOCAL_INDEX_JSON) {
      raw = JSON.parse(env.LOCAL_INDEX_JSON) as IconIndex;
    }

    const latency = performance.now() - startTime;
    if (latency > SLOW_KV_THRESHOLD_MS) {
      metrics.recordSlowQuery('kv', 'getIndex', latency);
    }

    if (!raw) {
      throw new Error(`Index not found for key ${cacheKey}`);
    }

    indexCache.set(cacheKey, raw, INDEX_TTL_MS);
    metrics.recordCacheMiss('memory', 'index');
    return raw;
  } catch (err) {
    metrics.recordError('kv', 'getIndex', err instanceof Error ? err.message : 'unknown');
    throw err;
  }
};

export const getInvertedIndex = async (
  env: Env,
): Promise<InvertedIndex | null> => {
  const cacheKey = INVERTED_INDEX_KEY;
  const cached = invertedIndexCache.get(cacheKey);
  if (cached) {
    metrics.recordCacheHit('memory', 'invertedIndex');
    return cached;
  }

  const startTime = performance.now();

  try {
    let raw: InvertedIndex | null = null;

    if (env.SVG_INDEX) {
      raw = await kvCircuitBreaker.execute(async () => {
        return await env.SVG_INDEX.get(cacheKey, {
          type: "json",
        }) as InvertedIndex | null;
      });
    }

    if (!raw && env.LOCAL_INVERTED_INDEX_JSON) {
      raw = JSON.parse(env.LOCAL_INVERTED_INDEX_JSON) as InvertedIndex;
    }

    const latency = performance.now() - startTime;
    if (latency > SLOW_KV_THRESHOLD_MS) {
      metrics.recordSlowQuery('kv', 'getInvertedIndex', latency);
    }

    if (raw) {
      invertedIndexCache.set(cacheKey, raw, INDEX_TTL_MS);
    }

    metrics.recordCacheMiss('memory', 'invertedIndex');
    return raw;
  } catch (err) {
    metrics.recordError('kv', 'getInvertedIndex', err instanceof Error ? err.message : 'unknown');
    return null;
  }
};

export const getSynonyms = async (env: Env): Promise<SynonymMap> => {
  const cacheKey = SYNONYMS_KEY;
  const cached = synonymsCache.get(cacheKey);
  if (cached) {
    metrics.recordCacheHit('memory', 'synonyms');
    return cached;
  }

  const startTime = performance.now();

  try {
    let raw: SynonymMap | null = null;

    if (env.SVG_INDEX) {
      raw = await kvCircuitBreaker.execute(async () => {
        return await env.SVG_INDEX.get(cacheKey, {
          type: "json",
        }) as SynonymMap | null;
      });
    }

    if (!raw && env.LOCAL_SYNONYMS_JSON) {
      raw = JSON.parse(env.LOCAL_SYNONYMS_JSON) as SynonymMap;
    }

    const latency = performance.now() - startTime;
    if (latency > SLOW_KV_THRESHOLD_MS) {
      metrics.recordSlowQuery('kv', 'getSynonyms', latency);
    }

    const synonyms = raw ?? {};
    synonymsCache.set(cacheKey, synonyms, INDEX_TTL_MS);
    metrics.recordCacheMiss('memory', 'synonyms');
    return synonyms;
  } catch (err) {
    metrics.recordError('kv', 'getSynonyms', err instanceof Error ? err.message : 'unknown');
    return {};
  }
};

// Batch get multiple KV entries
export const batchGet = async <T>(
  env: Env,
  keys: string[]
): Promise<Map<string, T | null>> => {
  const results = new Map<string, T | null>();

  // Check memory cache first
  const uncachedKeys: string[] = [];
  for (const key of keys) {
    const cached = indexCache.get(key) as T | null;
    if (cached !== null) {
      results.set(key, cached);
    } else {
      uncachedKeys.push(key);
    }
  }

  if (uncachedKeys.length === 0) {
    return results;
  }

  // Fetch remaining from KV with concurrency limit
  const CONCURRENCY = 10;
  const chunks: string[][] = [];
  for (let i = 0; i < uncachedKeys.length; i += CONCURRENCY) {
    chunks.push(uncachedKeys.slice(i, i + CONCURRENCY));
  }

  for (const chunk of chunks) {
    const chunkResults = await Promise.all(
      chunk.map(async (key) => {
        try {
          const value = await kvCircuitBreaker.execute(async () => {
            return await env.SVG_INDEX.get(key, { type: "json" }) as T | null;
          });
          return { key, value };
        } catch {
          return { key, value: null };
        }
      })
    );

    for (const { key, value } of chunkResults) {
      results.set(key, value);
    }
  }

  return results;
};

// Get cache stats for monitoring
export const getKVCacheStats = () => {
  return {
    index: indexCache.getStats(),
    invertedIndex: invertedIndexCache.getStats(),
    synonyms: synonymsCache.getStats(),
    etagCache: indexEtagCache.getStats(),
    metadataCacheSize: metadataCache.size,
    circuitBreaker: kvCircuitBreaker.getState(),
  };
};

// Clear all KV caches (useful for testing/admin)
export const clearKVCaches = (): void => {
  indexCache.clear();
  invertedIndexCache.clear();
  synonymsCache.clear();
  indexEtagCache.clear();
  metadataCache.clear();
};
