/**
 * SVG API TypeScript SDK - Type Definitions
 *
 * @packageDocumentation
 */

/**
 * Available icon sources
 */
export type IconSource =
  | "lucide"
  | "tabler"
  | "heroicons"
  | "bootstrap"
  | "remix"
  | "ionicons"
  | "mdi";

/**
 * Icon variant types
 */
export type IconVariant = "default" | "outline" | "solid" | "mini" | string;

/**
 * Icon license information
 */
export interface IconLicense {
  /** License type (e.g., "MIT", "ISC", "Apache-2.0") */
  type: string;
  /** URL to the license text */
  url: string;
}

/**
 * Source metadata
 */
export interface SourceMeta {
  /** Unique source identifier */
  id: string;
  /** Human-readable source name */
  name: string;
  /** Source description */
  description: string;
  /** Version of the icon library */
  version: string;
  /** Number of icons in this source */
  iconCount: number;
  /** Source website URL */
  website: string;
  /** Source repository URL */
  repository: string;
  /** License information */
  license: IconLicense;
  /** Available icon variants */
  variants: IconVariant[];
  /** Default variant */
  defaultVariant: IconVariant;
  /** Available categories */
  categories: string[];
}

/**
 * Category metadata
 */
export interface CategoryMeta {
  /** Category identifier */
  id: string;
  /** Human-readable category name */
  name: string;
  /** Category description */
  description: string;
  /** Number of icons in this category */
  iconCount: number;
  /** Sources that have icons in this category */
  sources: string[];
}

/**
 * Search result item
 */
export interface SearchResult {
  /** Icon name */
  name: string;
  /** Icon source */
  source: string;
  /** Icon category */
  category: string;
  /** Search relevance score */
  score: number;
  /** Preview URL for the icon */
  preview_url?: string;
  /** Match information */
  matches?: {
    /** Whether the query matched the icon name */
    name: boolean;
    /** Tags that matched the query */
    tags: string[];
  };
}

/**
 * Search response metadata
 */
export interface SearchMeta {
  /** The search query */
  query: string;
  /** Total number of results */
  total: number;
  /** Results per page limit */
  limit: number;
  /** Current offset */
  offset: number;
  /** Whether there are more results */
  has_more: boolean;
  /** Search time in milliseconds */
  search_time_ms: number;
  /** Search method used */
  search_method: string;
  /** Whether the result was from cache */
  cache_hit: boolean;
}

/**
 * Full search response
 */
export interface SearchResponse {
  /** Array of search results */
  data: SearchResult[];
  /** Response metadata */
  meta: SearchMeta;
}

/**
 * Icon response
 */
export interface IconResponse {
  /** Icon name */
  name: string;
  /** Icon source */
  source: string;
  /** Icon category */
  category: string;
  /** Associated tags */
  tags: string[];
  /** The SVG content */
  svg: string;
  /** Available variants */
  variants: IconVariant[];
  /** License information */
  license: IconLicense;
}

/**
 * Random icon response
 */
export interface RandomIconResponse {
  /** Icon name */
  name: string;
  /** Icon source */
  source: string;
  /** Icon category */
  category: string;
  /** Associated tags */
  tags: string[];
  /** The SVG content */
  svg: string;
  /** Direct URL to this icon */
  preview_url: string;
}

/**
 * Batch icon request options
 */
export interface BatchIconOptions {
  /** Icon name */
  name: string;
  /** Icon source (defaults to "lucide") */
  source?: string;
  /** Icon size in pixels (8-512, default 24) */
  size?: number;
  /** Icon color (hex or name, default "currentColor") */
  color?: string;
  /** Stroke width (0.5-3, default 2) */
  stroke?: number;
}

/**
 * Batch request options
 */
export interface BatchOptions {
  /** Array of icon requests */
  icons: BatchIconOptions[];
  /** Default values applied to all icons */
  defaults?: Partial<BatchIconOptions>;
}

/**
 * Batch result for a single icon
 */
export interface BatchIconResult {
  /** Icon name */
  name: string;
  /** Icon source */
  source: string;
  /** Icon category */
  category: string;
  /** Associated tags */
  tags: string[];
  /** The SVG content */
  svg: string;
  /** Available variants */
  variants: IconVariant[];
  /** License information */
  license: IconLicense;
}

/**
 * Batch result with error
 */
export interface BatchIconError {
  /** Icon name */
  name: string;
  /** Icon source */
  source: string;
  /** Error information */
  error: {
    /** Error code */
    code: string;
    /** Error message */
    message: string;
  };
}

/**
 * Batch response item (success or error)
 */
export type BatchItemResult = BatchIconResult | BatchIconError;

/**
 * Batch response metadata
 */
export interface BatchMeta {
  /** Number of icons requested */
  requested: number;
  /** Number of successful results */
  successful: number;
  /** Number of failed results */
  failed: number;
}

/**
 * Full batch response
 */
export interface BatchResponse {
  /** Array of results (success or error) */
  data: BatchItemResult[];
  /** Response metadata */
  meta: BatchMeta;
}

/**
 * Sources response metadata
 */
export interface SourcesMeta {
  /** Total number of sources */
  total_sources: number;
  /** Total number of icons across all sources */
  total_icons: number;
}

/**
 * Full sources response
 */
export interface SourcesResponse {
  /** Array of source metadata */
  data: SourceMeta[];
  /** Response metadata */
  meta: SourcesMeta;
}

/**
 * Categories response metadata
 */
export interface CategoriesMeta {
  /** Total number of categories */
  total: number;
}

/**
 * Full categories response
 */
export interface CategoriesResponse {
  /** Array of category metadata */
  data: CategoryMeta[];
  /** Response metadata */
  meta: CategoriesMeta;
}

/**
 * Common metadata for API responses
 */
export interface ApiMeta {
  /** Unique request ID */
  request_id: string;
  /** ISO timestamp of the response */
  timestamp: string;
}

/**
 * Error response from the API
 */
export interface ApiError {
  /** Error code */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error details */
  details?: Record<string, unknown>;
}

/**
 * Full error response
 */
export interface ErrorResponse {
  /** Error information */
  error: ApiError;
  /** Response metadata */
  meta: ApiMeta;
}

/**
 * Options for icon requests
 */
export interface GetIconOptions {
  /** Icon source (defaults to "lucide") */
  source?: string;
  /** Icon size in pixels (8-512, default 24) */
  size?: number;
  /** Icon color (hex or name, default "currentColor") */
  color?: string;
  /** Stroke width (0.5-3, default 2) */
  stroke?: number;
  /** Response format ("json" or "svg", default "json") */
  format?: "json" | "svg";
}

/**
 * Options for search requests
 */
export interface SearchOptions {
  /** Search query */
  query: string;
  /** Filter by source */
  source?: string;
  /** Filter by category */
  category?: string;
  /** Maximum results to return (default 20, max 100) */
  limit?: number;
  /** Offset for pagination (default 0) */
  offset?: number;
}

/**
 * Options for random icon requests
 */
export interface GetRandomIconOptions {
  /** Filter by source */
  source?: string;
  /** Filter by category */
  category?: string;
  /** Icon size in pixels (8-512, default 24) */
  size?: number;
  /** Icon color (hex or name, default "currentColor") */
  color?: string;
  /** Stroke width (0.5-3, default 2) */
  stroke?: number;
}

/**
 * SDK configuration options
 */
export interface SvgApiConfig {
  /** API base URL (default: "https://svg-api.org") */
  baseUrl?: string;
  /** API version (default: "v1") */
  version?: string;
  /** Request timeout in milliseconds (default: 10000) */
  timeout?: number;
  /** Maximum number of retries (default: 3) */
  maxRetries?: number;
  /** Initial retry delay in milliseconds (default: 1000) */
  retryDelay?: number;
  /** Custom fetch implementation (for Node.js compatibility) */
  fetch?: typeof fetch;
  /** Request headers to include with all requests */
  headers?: Record<string, string>;
}

/**
 * Request options that override SDK config
 */
export interface RequestOptions {
  /** Override timeout for this request */
  timeout?: number;
  /** Additional headers for this request */
  headers?: Record<string, string>;
}

/**
 * Base class for SDK errors
 */
export abstract class SvgApiError extends Error {
  /** Error code from the API */
  code: string;
  /** HTTP status code */
  status: number;
  /** Additional error details */
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    status: number,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/**
 * Error raised when an icon is not found
 */
export class IconNotFoundError extends SvgApiError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "ICON_NOT_FOUND", 404, details);
  }
}

/**
 * Error raised for invalid parameters
 */
export class InvalidParameterError extends SvgApiError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "INVALID_PARAMETER", 400, details);
  }
}

/**
 * Error raised when the rate limit is exceeded
 */
export class RateLimitError extends SvgApiError {
  /** When the limit will reset */
  resetAt?: Date;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "RATE_LIMIT_EXCEEDED", 429, details);
    if (details?.retry_after) {
      this.resetAt = new Date(
        Date.now() + (details.retry_after as number) * 1000,
      );
    }
  }
}

/**
 * Error raised for server-side issues
 */
export class ServerError extends SvgApiError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "INTERNAL_ERROR", 500, details);
  }
}

/**
 * Error raised when a network request fails
 */
export class NetworkError extends SvgApiError {
  constructor(message: string) {
    super(message, "NETWORK_ERROR", 0);
  }
}

/**
 * Error raised when a request times out
 */
export class TimeoutError extends SvgApiError {
  constructor(message: string) {
    super(message, "TIMEOUT", 0);
  }
}
