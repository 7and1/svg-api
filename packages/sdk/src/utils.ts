/**
 * SVG API TypeScript SDK - Utility Functions
 *
 * @packageDocumentation
 */

import type { RequestOptions } from "./types";
import { TimeoutError, NetworkError } from "./types";

/**
 * Default fetch implementation (uses global fetch if available)
 */
export const defaultFetch: typeof fetch =
  typeof fetch !== "undefined"
    ? fetch.bind(globalThis)
    : (() => {
        // Node.js compatibility - require undici/node-fetch if needed
        try {
          return require("undici").fetch;
        } catch {
          try {
            return require("node-fetch").default;
          } catch {
            throw new Error(
              "Fetch is not available. Please provide a fetch implementation or install undici/node-fetch.",
            );
          }
        }
      })();

/**
 * Calculates delay for exponential backoff with jitter
 */
export function calculateRetryDelay(
  attempt: number,
  baseDelay: number,
): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  // Add jitter: +/- 25% of the delay
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.max(0, exponentialDelay + jitter);
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wraps a fetch with timeout support
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number },
  fetchImpl: typeof fetch = defaultFetch,
): Promise<Response> {
  const { timeout = 10000, ...fetchOptions } = options;

  if (timeout === 0) {
    return fetchImpl(url, fetchOptions);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetchImpl(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new TimeoutError(`Request timed out after ${timeout}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Builds query string from parameters
 */
export function buildQueryString(
  params: Record<string, string | number | boolean | undefined>,
): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  }
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

/**
 * Merges request options with SDK config
 */
export function mergeRequestOptions(
  config: RequestOptions | undefined,
  overrides: RequestOptions | undefined,
): RequestOptions {
  return {
    ...config,
    ...overrides,
    headers: {
      ...config?.headers,
      ...overrides?.headers,
    },
  };
}

/**
 * Checks if running in a browser environment
 */
export const isBrowser =
  typeof window !== "undefined" && typeof document !== "undefined";

/**
 * Checks if running in Node.js
 */
export const isNode =
  typeof process !== "undefined" &&
  process.versions != null &&
  process.versions.node != null;

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

/**
 * Validates icon name format
 */
export function isValidIconName(name: string): boolean {
  return /^[a-z0-9-]+$/.test(name);
}

/**
 * Validates source name format
 */
export function isValidSource(source: string): boolean {
  return /^[a-z0-9-]+$/.test(source);
}

/**
 * Validates size parameter
 */
export function isValidSize(size: number): boolean {
  return Number.isFinite(size) && size >= 8 && size <= 512;
}

/**
 * Validates stroke width parameter
 */
export function isValidStrokeWidth(stroke: number): boolean {
  return Number.isFinite(stroke) && stroke >= 0.5 && stroke <= 3;
}

/**
 * Validates color format (hex or named color)
 */
export function isValidColor(color: string): boolean {
  return /^(#([0-9a-fA-F]{3}){1,2}|[a-zA-Z]+)$/.test(color);
}

/**
 * Normalizes a color value (adds # to hex if needed)
 */
export function normalizeColor(color: string): string {
  if (!color) return "currentColor";
  if (color.startsWith("#")) return color;
  if (/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(color)) {
    return `#${color}`;
  }
  return color;
}
