/**
 * SVG API TypeScript SDK - In-Memory Cache
 *
 * Provides LRU (Least Recently Used) caching for icon responses
 * to minimize redundant API calls.
 */

export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  size: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  entries: number;
}

export interface CacheConfig {
  maxSize?: number;        // Maximum number of entries
  maxAge?: number;         // Default TTL in milliseconds
  maxMemoryMB?: number;    // Maximum memory usage in MB
}

/**
 * LRU Cache implementation for SDK
 */
export class SvgApiCache {
  private cache: Map<string, CacheEntry<unknown>>;
  private maxSize: number;
  private maxAge: number;
  private maxMemoryBytes: number;
  private currentMemoryBytes: number;
  private stats: { hits: number; misses: number };

  constructor(config: CacheConfig = {}) {
    this.cache = new Map();
    this.maxSize = config.maxSize ?? 1000;
    this.maxAge = config.maxAge ?? 5 * 60 * 1000; // 5 minutes default
    this.maxMemoryBytes = (config.maxMemoryMB ?? 50) * 1024 * 1024;
    this.currentMemoryBytes = 0;
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Generate cache key from request parameters
   */
  static generateKey(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>
  ): string {
    const sortedParams = params
      ? Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== null)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}=${v}`)
          .join("&")
      : "";
    return sortedParams ? `${endpoint}?${sortedParams}` : endpoint;
  }

  /**
   * Get item from cache
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      this.stats.misses++;
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    this.stats.hits++;
    return entry.data as T;
  }

  /**
   * Set item in cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const size = this.estimateSize(data);
    
    // Check if we need to evict entries
    while (
      this.cache.size >= this.maxSize ||
      (this.currentMemoryBytes + size > this.maxMemoryBytes && this.cache.size > 0)
    ) {
      this.evictLRU();
    }

    // Remove old entry if exists
    const oldEntry = this.cache.get(key);
    if (oldEntry) {
      this.currentMemoryBytes -= oldEntry.size;
    }

    const entry: CacheEntry<T> = {
      data,
      expiresAt: Date.now() + (ttl ?? this.maxAge),
      size,
    };

    this.cache.set(key, entry as CacheEntry<unknown>);
    this.currentMemoryBytes += size;
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentMemoryBytes -= entry.size;
      return this.cache.delete(key);
    }
    return false;
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.currentMemoryBytes = 0;
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.currentMemoryBytes,
      entries: this.cache.size,
    };
  }

  /**
   * Get cache hit rate
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.delete(firstKey);
    }
  }

  /**
   * Estimate memory size of data
   */
  private estimateSize(data: unknown): number {
    if (data === null || data === undefined) return 0;
    
    switch (typeof data) {
      case "boolean":
        return 4;
      case "number":
        return 8;
      case "string":
        return (data as string).length * 2; // UTF-16
      case "object":
        return JSON.stringify(data).length * 2;
      default:
        return 0;
    }
  }
}

/**
 * Default cache instance
 */
export const defaultCache = new SvgApiCache();
