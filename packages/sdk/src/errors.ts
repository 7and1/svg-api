/**
 * SVG API TypeScript SDK - Error Handling
 *
 * @packageDocumentation
 */

import type {
  SvgApiError,
  IconNotFoundError,
  InvalidParameterError,
  RateLimitError,
  ServerError,
  NetworkError,
  TimeoutError,
} from "./types";

/**
 * Creates an appropriate error instance from an API error response
 */
export function createErrorFromResponse(
  code: string,
  message: string,
  status: number,
  details?: Record<string, unknown>,
): SvgApiError {
  // Dynamically import to avoid circular dependencies
  const {
    IconNotFoundError: IconNotFound,
    InvalidParameterError: InvalidParam,
    RateLimitError: RateLimit,
    ServerError: ServErr,
  } = require("./types");

  switch (code) {
    case "ICON_NOT_FOUND":
    case "CATEGORY_NOT_FOUND":
      return new IconNotFound(message, details);
    case "INVALID_PARAMETER":
    case "INVALID_SIZE":
    case "INVALID_COLOR":
    case "BATCH_LIMIT_EXCEEDED":
      return new InvalidParam(message, details);
    case "RATE_LIMIT_EXCEEDED":
      return new RateLimit(message, details);
    case "INTERNAL_ERROR":
      return new ServErr(message, details);
    default:
      // Generic error with the status from response
      const BaseError = (require("./types") as any).SvgApiError;
      const err = Object.create(BaseError.prototype);
      Error.call(err, message);
      err.name = "ApiError";
      err.code = code;
      err.status = status;
      err.details = details;
      Object.setPrototypeOf(err, BaseError);
      return err;
  }
}

/**
 * Checks if a value is an SvgApiError instance
 */
export function isSvgApiError(error: unknown): error is SvgApiError {
  return error instanceof Error && "code" in error && "status" in error;
}

/**
 * Checks if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (!isSvgApiError(error)) {
    return false;
  }

  const { status, code } = error;

  // Retry on rate limits, server errors, and network timeouts
  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    code === "TIMEOUT" ||
    code === "NETWORK_ERROR"
  );
}

/**
 * Wraps a non-Error value in an Error object
 */
export function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  if (typeof value === "string") {
    return new Error(value);
  }
  if (typeof value === "object" && value !== null) {
    if ("message" in value && typeof value.message === "string") {
      const err = new Error(value.message);
      Object.assign(err, value);
      return err;
    }
  }
  return new Error(String(value));
}
