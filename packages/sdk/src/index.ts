/**
 * SVG API TypeScript SDK
 *
 * A production-ready TypeScript/JavaScript SDK for the SVG API.
 * Provides full API coverage with retry logic, exponential backoff,
 * and support for both Node.js and browser environments.
 *
 * @example
 * ```ts
 * import { SvgApi } from '@svg-api/sdk';
 *
 * const api = new SvgApi();
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

/**
 * SVG API Client
 *
 * Main class for interacting with the SVG API. Supports all endpoints
 * with automatic retry logic and exponential backoff.
 */
export class SvgApi {
  private readonly baseUrl: string;
  private readonly version: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly fetchImpl: typeof fetch;
  private readonly headers: Record<string, string>;

  /**
   * Creates a new SvgApi client instance
   *
   * @param config - SDK configuration options
   *
   * @example
   * ```ts
   * // Default configuration
   * const api = new SvgApi();
   *
   * // Custom configuration
   * const api = new SvgApi({
   *   baseUrl: 'https://api.example.com',
   *   timeout: 5000,
   *   maxRetries: 5,
   * });
   * ```
   */
  constructor(config: SvgApiConfig = {}) {
    this.baseUrl = config.baseUrl ?? "https://svg-api.org";
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
  }

  /**
   * Builds the User-Agent header for requests
   */
  private buildUserAgent(): string {
    const version = process.env.npm_package_version ?? "0.1.0";
    const runtime = isBrowser ? "browser" : `node/${process.version}`;
    return `svg-api-sdk/${version} (${runtime})`;
  }

  /**
   * Builds the full URL for an API endpoint
   */
  private buildUrl(
    path: string,
    queryParams?: Record<string, string | number | boolean | undefined>,
  ): string {
    const basePath = path.startsWith("/") ? path : `/${path}`;
    const versionPath = this.version ? `/${this.version}${basePath}` : basePath;
    const queryString = buildQueryString(queryParams || {});
    return `${this.baseUrl}${versionPath}${queryString}`;
  }

  /**
   * Makes an HTTP request with retry logic
   */
  private async request<T>(
    url: string,
    options: RequestInit & { timeout?: number } = {},
    requestOptions?: RequestOptions,
  ): Promise<T> {
    const mergedOptions = mergeRequestOptions(
      { headers: this.headers },
      requestOptions,
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
        );

        // Handle non-JSON responses (like SVG)
        if (response.headers.get("content-type")?.includes("image/svg+xml")) {
          return (await response.text()) as unknown as T;
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
            errorData.error.details,
          );

          // Don't retry client errors (4xx) except rate limit
          if (
            response.status >= 400 &&
            response.status < 500 &&
            response.status !== 429
          ) {
            throw error;
          }

          lastError = error;

          // Check if we should retry
          if (attempt < this.maxRetries && isRetryableError(error)) {
            const delay = calculateRetryDelay(attempt, this.retryDelay);
            await sleep(delay);
            continue;
          }

          throw error;
        }

        // Parse JSON response
        try {
          const data = JSON.parse(text);
          // Unwrap the data field if present
          return "data" in data ? data.data : data;
        } catch {
          // Return raw text if not JSON
          return text as unknown as T;
        }
      } catch (error) {
        const err = error as Error;

        // Don't retry validation errors
        if (err instanceof InvalidParameterError) {
          throw err;
        }

        // Retry on network errors or timeouts
        if (
          (err.name === "TimeoutError" ||
            err.name === "AbortError" ||
            err.message.includes("fetch")) &&
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

  /**
   * Gets an icon by name
   *
   * @param name - The icon name (e.g., "home", "user", "settings")
   * @param options - Optional icon parameters
   * @param requestOptions - Optional request overrides
   * @returns The icon response with SVG content
   *
   * @example
   * ```ts
   * // Get default icon
   * const icon = await api.getIcon('home');
   *
   * // Get custom styled icon
   * const icon = await api.getIcon('heart', {
   *   source: 'lucide',
   *   size: 32,
   *   color: '#ef4444',
   *   stroke: 2.5,
   * });
   *
   * // Get raw SVG string
   * const svg = await api.getIcon('star', { format: 'svg' });
   * ```
   */
  async getIcon(
    name: string,
    options: GetIconOptions = {},
    requestOptions?: RequestOptions,
  ): Promise<IconResponse | string> {
    const queryParams = {
      source: options.source,
      size: options.size,
      color: options.color,
      stroke: options.stroke,
      format: options.format,
    };

    const url = this.buildUrl(`/icons/${name}`, queryParams);

    // Set Accept header for SVG format
    const headers: RequestInit = {};
    if (options.format === "svg") {
      headers.headers = {
        ...this.headers,
        Accept: "image/svg+xml",
      };
    }

    return this.request<IconResponse | string>(url, headers, requestOptions);
  }

  /**
   * Gets an icon by source and name
   *
   * @param source - The icon source (e.g., "lucide", "tabler")
   * @param name - The icon name
   * @param options - Optional icon parameters
   * @param requestOptions - Optional request overrides
   * @returns The icon response with SVG content
   *
   * @example
   * ```ts
   * const icon = await api.getIconBySource('lucide', 'home');
   * ```
   */
  async getIconBySource(
    source: string,
    name: string,
    options: Omit<GetIconOptions, "source"> = {},
    requestOptions?: RequestOptions,
  ): Promise<IconResponse | string> {
    return this.getIcon(name, { ...options, source }, requestOptions);
  }

  /**
   * Gets a batch of icons in a single request
   *
   * @param options - Batch request options
   * @param requestOptions - Optional request overrides
   * @returns Array of icon results (success or error)
   *
   * @example
   * ```ts
   * const result = await api.getBatch({
   *   icons: [
   *     { name: 'home' },
   *     { name: 'user', source: 'lucide', size: 32 },
   *     { name: 'settings', color: '#6366f1' },
   *   ],
   *   defaults: {
   *     source: 'lucide',
   *     size: 24,
   *   },
   * });
   *
   * result.data.forEach(item => {
   *   if ('error' in item) {
   *     console.error(`Failed to load ${item.name}:`, item.error);
   *   } else {
   *     console.log(`Loaded ${item.name}:`, item.svg);
   *   }
   * });
   * ```
   */
  async getBatch(
    options: BatchOptions,
    requestOptions?: RequestOptions,
  ): Promise<BatchResponse> {
    const url = this.buildUrl("/icons/batch");

    return this.request<BatchResponse>(
      url,
      {
        method: "POST",
        body: JSON.stringify(options),
      },
      requestOptions,
    );
  }

  /**
   * Searches for icons by query
   *
   * @param options - Search options
   * @param requestOptions - Optional request overrides
   * @returns Search results with metadata
   *
   * @example
   * ```ts
   * // Simple search
   * const results = await api.search({ query: 'home' });
   *
   * // Search with filters
   * const results = await api.search({
   *   query: 'arrow',
   *   source: 'lucide',
   *   category: 'navigation',
   *   limit: 50,
   *   offset: 0,
   * });
   *
   * console.log(`Found ${results.meta.total} icons`);
   * results.data.forEach(result => {
   *   console.log(`${result.name}: ${result.preview_url}`);
   * });
   * ```
   */
  async search(
    options: SearchOptions,
    requestOptions?: RequestOptions,
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

  /**
   * Gets all available icon sources
   *
   * @param requestOptions - Optional request overrides
   * @returns List of icon sources with metadata
   *
   * @example
   * ```ts
   * const sources = await api.getSources();
   *
   * sources.data.forEach(source => {
   *   console.log(`${source.name}: ${source.iconCount} icons`);
   * });
   * ```
   */
  async getSources(requestOptions?: RequestOptions): Promise<SourcesResponse> {
    const url = this.buildUrl("/sources");
    return this.request<SourcesResponse>(url, {}, requestOptions);
  }

  /**
   * Gets all available icon categories
   *
   * @param source - Optional source filter
   * @param requestOptions - Optional request overrides
   * @returns List of categories with metadata
   *
   * @example
   * ```ts
   * // Get all categories
   * const categories = await api.getCategories();
   *
   * // Get categories for a specific source
   * const lucideCategories = await api.getCategories('lucide');
   * ```
   */
  async getCategories(
    source?: string,
    requestOptions?: RequestOptions,
  ): Promise<CategoriesResponse> {
    const queryParams = source ? { source } : undefined;
    const url = this.buildUrl("/categories", queryParams);
    return this.request<CategoriesResponse>(url, {}, requestOptions);
  }

  /**
   * Gets a random icon
   *
   * @param options - Optional filters and styling options
   * @param requestOptions - Optional request overrides
   * @returns A random icon with metadata
   *
   * @example
   * ```ts
   * // Get any random icon
   * const icon = await api.getRandomIcon();
   *
   * // Get a random icon from a specific source
   * const icon = await api.getRandomIcon({ source: 'lucide' });
   *
   * // Get a random icon with custom styling
   * const icon = await api.getRandomIcon({
   *   category: 'navigation',
   *   size: 48,
   *   color: '#10b981',
   * });
   * ```
   */
  async getRandomIcon(
    options: GetRandomIconOptions = {},
    requestOptions?: RequestOptions,
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

  /**
   * Checks if an icon exists
   *
   * @param name - The icon name
   * @param source - Optional source (defaults to "lucide")
   * @returns True if the icon exists
   *
   * @example
   * ```ts
   * const exists = await api.iconExists('home');
   * if (!exists) {
   *   console.log('Icon not found');
   * }
   * ```
   */
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
}

/**
 * Default SDK instance with default configuration
 *
 * @example
 * ```ts
 * import { api } from '@svg-api/sdk';
 *
 * const icon = await api.getIcon('home');
 * ```
 */
export const api = new SvgApi();

// Re-export types
export * from "./types";
export * from "./errors";
export * from "./utils";
