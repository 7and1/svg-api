/**
 * SVG API TypeScript SDK
 *
 * A production-ready TypeScript/JavaScript SDK for the SVG API.
 * Provides full API coverage with retry logic, exponential backoff,
 * in-memory caching, and intelligent batching.
 *
 * @example
 * ```ts
 * import { SvgApi } from '@svg-api/sdk';
 *
 * const api = new SvgApi({
 *   cache: { maxSize: 500, maxAge: 60000 },
 *   batch: { autoBatch: true, maxWaitMs: 10 }
 * });
 * const icon = await api.getIcon('home');
 * console.log(icon.svg);
 * ```
 *
 * @packageDocumentation
 */

import type {
  SvgApiConfig,
  GetIconOptions,
  IconResponse,
  SearchOptions,
  SearchResponse,
  SourcesResponse,
  CategoriesResponse,
  RandomIconResponse,
  GetRandomIconOptions,
  BatchOptions,
  BatchResponse,
  BatchIconOptions,
  BatchItemResult,
  RequestOptions,
  ErrorResponse,
} from "./types";
import { IconNotFoundError, InvalidParameterError, ServerError } from "./types";
import { createErrorFromResponse, isRetryableError } from "./errors";
import {
  defaultFetch,
  fetchWithTimeout,
  buildQueryString,
  mergeRequestOptions,
  calculateRetryDelay,
  sleep,
  isBrowser,
} from "./utils";
import { SvgApiCache, CacheConfig } from "./cache";
import { IconBatcher, BatcherConfig, chunkArray } from "./batch";

export interface EnhancedSvgApiConfig extends SvgApiConfig {
  cache?: CacheConfig | boolean;
  batch?: BatcherConfig | boolean;
}

/**
 * SVG API Client
 *
 * Main class for interacting with the SVG API. Supports all endpoints
 * with automatic retry logic, exponential backoff, caching, and batching.
 */
export class SvgApi {
  private readonly baseUrl: string;
  private readonly version: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly fetchImpl: typeof fetch;
  private readonly headers: Record<string, string>;
  private readonly cache: SvgApiCache | null;
  private readonly batcher: IconBatcher | null;

  /**
   * Creates a new SvgApi client instance
   */
  constructor(config: EnhancedSvgApiConfig = {}) {
    this.baseUrl = config.baseUrl ?? "https://api.svg-api.org";
    this.version = config.version ?? "v1";
    this.timeout = config.timeout ?? 10000;
    this.maxRetries = config.maxRetries ?? 3;
    this.retryDelay = config.retryDelay ?? 1000;
    this.fetchImpl = config.fetch ?? defaultFetch;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": this.buildUserAgent(),
      ...config.headers,
    };

    // Initialize cache
    if (config.cache === false) {
      this.cache = null;
    } else if (config.cache === true || config.cache === undefined) {
      this.cache = new SvgApiCache();
    } else {
      this.cache = new SvgApiCache(config.cache);
    }

    // Initialize batcher
    if (config.batch === false) {
      this.batcher = null;
    } else {
      const batchConfig = config.batch === true || config.batch === undefined
        ? {}
        : config.batch;
      this.batcher = new IconBatcher(
        (icons) => this.executeBatch(icons),
        batchConfig
      );
    }
  }

  private buildUserAgent(): string {
    const version = process.env.npm_package_version ?? "0.1.0";
    const runtime = isBrowser ? "browser" : `node/${process.version}`;
    return `svg-api-sdk/${version} (${runtime})`;
  }

  private buildUrl(
    path: string,
    queryParams?: Record<string, string | number | boolean | undefined>
  ): string {
    const basePath = path.startsWith("/") ? path : `/${path}`;
    const versionPath = this.version ? `/${this.version}${basePath}` : basePath;
    const queryString = buildQueryString(queryParams || {});
    return `${this.baseUrl}${versionPath}${queryString}`;
  }

  private getCacheKey(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>
  ): string {
    return SvgApiCache.generateKey(endpoint, params);
  }

  private async request<T>(
    url: string,
    options: RequestInit & { timeout?: number } = {},
    requestOptions?: RequestOptions,
    cacheKey?: string
  ): Promise<T> {
    // Check cache first
    if (cacheKey && this.cache) {
      const cached = this.cache.get<T>(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }

    const mergedOptions = mergeRequestOptions(
      { headers: this.headers },
      requestOptions
    );
    const timeout = requestOptions?.timeout ?? this.timeout;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetchWithTimeout(
          url,
          {
            ...options,
            headers: mergedOptions.headers,
          },
          this.fetchImpl,
          timeout
        );

        if (response.headers.get("content-type")?.includes("image/svg+xml")) {
          const data = (await response.text()) as unknown as T;
          if (cacheKey && this.cache) {
            this.cache.set(cacheKey, data);
          }
          return data;
        }

        const text = await response.text();

        if (!response.ok) {
          let errorData: ErrorResponse;
          try {
            errorData = JSON.parse(text);
          } catch {
            errorData = {
              error: {
                code: "UNKNOWN",
                message: text || response.statusText,
              },
              meta: {
                request_id: "",
                timestamp: new Date().toISOString(),
              },
            };
          }

          const error = createErrorFromResponse(
            errorData.error.code,
            errorData.error.message,
            response.status,
            errorData.error.details
          );

          if (
            response.status >= 400 &&
            response.status < 500 &&
            response.status !== 429
          ) {
            throw error;
          }

          lastError = error;

          if (attempt < this.maxRetries && isRetryableError(error)) {
            const delay = calculateRetryDelay(attempt, this.retryDelay);
            await sleep(delay);
            continue;
          }

          throw error;
        }

        try {
          const data = JSON.parse(text);
          const result = "data" in data ? data.data : data;
          
          if (cacheKey && this.cache) {
            this.cache.set(cacheKey, result);
          }
          
          return result;
        } catch {
          return text as unknown as T;
        }
      } catch (error) {
        const err = error as Error;

        if (err instanceof InvalidParameterError) {
          throw err;
        }

        if (
          (err.name === "TimeoutError" ||
            err.name === "AbortError" ||
            err.message?.includes("fetch")) &&
          attempt < this.maxRetries
        ) {
          const delay = calculateRetryDelay(attempt, this.retryDelay);
          await sleep(delay);
          continue;
        }

        throw err;
      }
    }

    throw lastError ?? new ServerError("Request failed after retries");
  }

  private async executeBatch(icons: BatchIconOptions[]): Promise<BatchResponse> {
    const url = this.buildUrl("/icons/batch");
    return this.request<BatchResponse>(
      url,
      {
        method: "POST",
        body: JSON.stringify({ icons }),
      },
      undefined
    );
  }

  async getIcon(
    name: string,
    options: GetIconOptions = {},
    requestOptions?: RequestOptions
  ): Promise<IconResponse | string> {
    const queryParams = {
      source: options.source,
      size: options.size,
      color: options.color,
      stroke: options.stroke,
      format: options.format,
    };

    const url = this.buildUrl(`/icons/${name}`, queryParams);
    const cacheKey = this.getCacheKey(`/icons/${name}`, queryParams);

    const headers: RequestInit = {};
    if (options.format === "svg") {
      headers.headers = {
        ...this.headers,
        Accept: "image/svg+xml",
      };
    }

    return this.request<IconResponse | string>(url, headers, requestOptions, cacheKey);
  }

  async getIconBySource(
    source: string,
    name: string,
    options: Omit<GetIconOptions, "source"> = {},
    requestOptions?: RequestOptions
  ): Promise<IconResponse | string> {
    return this.getIcon(name, { ...options, source }, requestOptions);
  }

  async getBatch(
    options: BatchOptions,
    requestOptions?: RequestOptions
  ): Promise<BatchResponse> {
    const url = this.buildUrl("/icons/batch");
    return this.request<BatchResponse>(
      url,
      {
        method: "POST",
        body: JSON.stringify(options),
      },
      requestOptions
    );
  }

  async getBatchOptimized(
    icons: BatchIconOptions[],
    chunkSize: number = 50
  ): Promise<BatchItemResult[]> {
    if (icons.length === 0) return [];

    // Use batcher if available
    if (this.batcher) {
      return this.batcher.requestMany(icons);
    }

    // Otherwise, chunk and send requests
    const chunks = chunkArray(icons, chunkSize);
    const results: BatchItemResult[] = [];

    for (const chunk of chunks) {
      const response = await this.getBatch({ icons: chunk });
      results.push(...response.data);
    }

    return results;
  }

  async search(
    options: SearchOptions,
    requestOptions?: RequestOptions
  ): Promise<SearchResponse> {
    const queryParams = {
      q: options.query,
      source: options.source,
      category: options.category,
      limit: options.limit,
      offset: options.offset,
    };

    const url = this.buildUrl("/search", queryParams);
    return this.request<SearchResponse>(url, {}, requestOptions);
  }

  async getSources(requestOptions?: RequestOptions): Promise<SourcesResponse> {
    const url = this.buildUrl("/sources");
    const cacheKey = this.getCacheKey("/sources");
    return this.request<SourcesResponse>(url, {}, requestOptions, cacheKey);
  }

  async getCategories(
    source?: string,
    requestOptions?: RequestOptions
  ): Promise<CategoriesResponse> {
    const queryParams = source ? { source } : undefined;
    const url = this.buildUrl("/categories", queryParams);
    const cacheKey = this.getCacheKey("/categories", queryParams);
    return this.request<CategoriesResponse>(url, {}, requestOptions, cacheKey);
  }

  async getRandomIcon(
    options: GetRandomIconOptions = {},
    requestOptions?: RequestOptions
  ): Promise<RandomIconResponse> {
    const queryParams = {
      source: options.source,
      category: options.category,
      size: options.size,
      color: options.color,
      stroke: options.stroke,
    };

    const url = this.buildUrl("/random", queryParams);
    return this.request<RandomIconResponse>(url, {}, requestOptions);
  }

  async iconExists(name: string, source?: string): Promise<boolean> {
    try {
      await this.getIcon(name, { source });
      return true;
    } catch (error) {
      if (error instanceof IconNotFoundError) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache?.getStats() ?? { hits: 0, misses: 0, size: 0, entries: 0 };
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache?.clear();
  }

  /**
   * Flush pending batch requests
   */
  async flushBatch(): Promise<void> {
    await this.batcher?.flush();
  }

  /**
   * Get batcher statistics
   */
  getBatchStats() {
    return {
      pending: this.batcher?.getPendingCount() ?? 0,
    };
  }
}

/**
 * Default SDK instance with default configuration
 */
export const api = new SvgApi();

// Re-export types and utilities
export * from "./types";
export * from "./errors";
export * from "./utils";
export * from "./cache";
export * from "./batch";
