/**
 * Structured Error Handling with Classification and Logging
 *
 * Provides error registry, classification, and structured JSON logging
 * with Sentry integration for the SVG API worker.
 */

import type { Context } from "hono";
import type { Env } from "../env";
import { getSentry } from "../services/sentry";

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface ErrorDefinition {
  code: string;
  status: number;
  logLevel: LogLevel;
  exposeToClient: boolean;
  message: string;
}

/**
 * Error registry with all error types
 */
export const ERROR_REGISTRY: Record<string, ErrorDefinition> = {
  // Storage errors
  STORAGE_ERROR: {
    code: "STORAGE_ERROR",
    status: 503,
    logLevel: "error",
    exposeToClient: true,
    message: "Storage service temporarily unavailable",
  },

  // Rate limiting
  RATE_LIMITED: {
    code: "RATE_LIMITED",
    status: 429,
    logLevel: "warn",
    exposeToClient: true,
    message: "Rate limit exceeded. Please try again later.",
  },

  // Client errors
  BAD_REQUEST: {
    code: "BAD_REQUEST",
    status: 400,
    logLevel: "info",
    exposeToClient: true,
    message: "Invalid request parameters",
  },

  NOT_FOUND: {
    code: "NOT_FOUND",
    status: 404,
    logLevel: "info",
    exposeToClient: true,
    message: "Resource not found",
  },

  UNAUTHORIZED: {
    code: "UNAUTHORIZED",
    status: 401,
    logLevel: "warn",
    exposeToClient: true,
    message: "Authentication required",
  },

  FORBIDDEN: {
    code: "FORBIDDEN",
    status: 403,
    logLevel: "warn",
    exposeToClient: true,
    message: "Access denied",
  },

  // Server errors
  INTERNAL_ERROR: {
    code: "INTERNAL_ERROR",
    status: 500,
    logLevel: "error",
    exposeToClient: false,
    message: "An unexpected error occurred",
  },

  TIMEOUT: {
    code: "TIMEOUT",
    status: 504,
    logLevel: "error",
    exposeToClient: true,
    message: "Request timeout",
  },

  // Validation errors
  VALIDATION_ERROR: {
    code: "VALIDATION_ERROR",
    status: 422,
    logLevel: "info",
    exposeToClient: true,
    message: "Validation failed",
  },

  // External service errors
  UPSTREAM_ERROR: {
    code: "UPSTREAM_ERROR",
    status: 502,
    logLevel: "error",
    exposeToClient: true,
    message: "Upstream service error",
  },
};

/**
 * Custom application error class
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly logLevel: LogLevel;
  public readonly exposeToClient: boolean;
  public readonly details: Record<string, unknown>;
  public readonly requestId: string;

  constructor(
    errorDef: ErrorDefinition,
    message?: string,
    details: Record<string, unknown> = {},
    requestId?: string,
  ) {
    super(message || errorDef.message);
    this.name = "AppError";
    this.code = errorDef.code;
    this.status = errorDef.status;
    this.logLevel = errorDef.logLevel;
    this.exposeToClient = errorDef.exposeToClient;
    this.details = details;
    this.requestId = requestId || generateRequestId();
  }
}

/**
 * Generate a unique request ID
 */
const generateRequestId = (): string => `req_${crypto.randomUUID()}`;

/**
 * Error classification patterns
 */
const ERROR_PATTERNS: Array<{
  pattern: RegExp;
  errorDef: ErrorDefinition;
  extractDetails?: (error: Error) => Record<string, unknown>;
}> = [
  {
    pattern: /KV_ERROR|KV.*error|CloudflareKV/i,
    errorDef: ERROR_REGISTRY.STORAGE_ERROR,
    extractDetails: (err) => ({ service: "KV", originalError: err.message }),
  },
  {
    pattern: /R2_ERROR|R2.*error|CloudflareR2/i,
    errorDef: ERROR_REGISTRY.STORAGE_ERROR,
    extractDetails: (err) => ({ service: "R2", originalError: err.message }),
  },
  {
    pattern: /RATE_LIMIT|rate.*limit|too.*many.*requests/i,
    errorDef: ERROR_REGISTRY.RATE_LIMITED,
    extractDetails: () => ({ retryAfter: "60" }),
  },
  {
    pattern: /VALIDATION|validation.*error|invalid.*input|zod.*error/i,
    errorDef: ERROR_REGISTRY.BAD_REQUEST,
    extractDetails: (err) => ({ validationError: err.message }),
  },
  {
    pattern: /TIMEOUT|timeout|ETIMEDOUT/i,
    errorDef: ERROR_REGISTRY.TIMEOUT,
    extractDetails: () => ({ timeout: true }),
  },
  {
    pattern: /NOT_FOUND|not.*found|does.*not.*exist/i,
    errorDef: ERROR_REGISTRY.NOT_FOUND,
    extractDetails: () => ({ resource: "unknown" }),
  },
  {
    pattern: /UNAUTHORIZED|unauthorized|auth.*failed/i,
    errorDef: ERROR_REGISTRY.UNAUTHORIZED,
    extractDetails: () => ({ auth: "failed" }),
  },
  {
    pattern: /FORBIDDEN|forbidden|access.*denied/i,
    errorDef: ERROR_REGISTRY.FORBIDDEN,
    extractDetails: () => ({ access: "denied" }),
  },
  {
    pattern: /UPSTREAM|upstream|external.*service/i,
    errorDef: ERROR_REGISTRY.UPSTREAM_ERROR,
    extractDetails: (err) => ({ upstreamError: err.message }),
  },
];

/**
 * Classify an error into a known error type
 */
export function classifyError(error: Error): {
  errorDef: ErrorDefinition;
  details: Record<string, unknown>;
} {
  // Check if it's already an AppError
  if (error instanceof AppError) {
    return {
      errorDef: {
        code: error.code,
        status: error.status,
        logLevel: error.logLevel,
        exposeToClient: error.exposeToClient,
        message: error.message,
      },
      details: error.details,
    };
  }

  const errorMessage = error.message || "";

  // Match against patterns
  for (const { pattern, errorDef, extractDetails } of ERROR_PATTERNS) {
    if (pattern.test(errorMessage)) {
      return {
        errorDef,
        details: extractDetails ? extractDetails(error) : {},
      };
    }
  }

  // Default to internal error
  return {
    errorDef: ERROR_REGISTRY.INTERNAL_ERROR,
    details: { originalError: errorMessage },
  };
}

/**
 * Structured log entry
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  requestId: string;
  method: string;
  path: string;
  errorCode: string;
  errorMessage: string;
  statusCode: number;
  cf?: {
    colo?: string;
    country?: string;
    ray?: string;
  };
  details?: Record<string, unknown>;
  stack?: string;
  environment: string;
}

/**
 * Create a structured log entry
 */
function createLogEntry(
  c: Context<{ Bindings: Env }>,
  error: Error,
  classified: { errorDef: ErrorDefinition; details: Record<string, unknown> },
  requestId: string,
): LogEntry {
  const isProduction = c.env.ENVIRONMENT === "production";
  const cf = c.req.raw.cf as Record<string, unknown> | undefined;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: classified.errorDef.logLevel,
    requestId,
    method: c.req.method,
    path: c.req.path,
    errorCode: classified.errorDef.code,
    errorMessage: error.message,
    statusCode: classified.errorDef.status,
    cf: {
      colo: cf?.colo as string,
      country: cf?.country as string,
      ray: c.req.header("CF-Ray"),
    },
    details: classified.details,
    environment: c.env.ENVIRONMENT || "unknown",
  };

  // Only include stack trace in non-production environments
  if (!isProduction && error.stack) {
    entry.stack = error.stack;
  }

  return entry;
}

/**
 * Output structured JSON log
 */
function outputLog(entry: LogEntry): void {
  const logOutput = JSON.stringify(entry);

  switch (entry.level) {
    case "debug":
      console.debug(logOutput);
      break;
    case "info":
      console.info(logOutput);
      break;
    case "warn":
      console.warn(logOutput);
      break;
    case "error":
    case "fatal":
      console.error(logOutput);
      break;
  }
}

/**
 * Send error to Sentry
 */
async function sendToSentry(
  c: Context<{ Bindings: Env }>,
  error: Error,
  classified: { errorDef: ErrorDefinition; details: Record<string, unknown> },
  requestId: string,
): Promise<void> {
  const sentry = getSentry(c.env);

  if (!sentry) return;

  // Only send error-level and above to Sentry
  const levelsToSend: LogLevel[] = ["error", "fatal"];
  if (!levelsToSend.includes(classified.errorDef.logLevel)) {
    return;
  }

  try {
    await sentry.captureException(error, {
      request: c,
      tags: {
        error_code: classified.errorDef.code,
        status_code: classified.errorDef.status.toString(),
        request_id: requestId,
      },
      extra: {
        ...classified.details,
        log_level: classified.errorDef.logLevel,
      },
    });
  } catch (sentryErr) {
    // Fail silently - don't let Sentry errors break the app
    console.error("Failed to send to Sentry:", sentryErr);
  }
}

/**
 * Handle error with structured logging and Sentry integration
 */
export async function handleError(
  c: Context<{ Bindings: Env }>,
  error: Error,
): Promise<Response> {
  const requestId = generateRequestId();

  // Classify the error
  const classified = classifyError(error);

  // Create and output structured log
  const logEntry = createLogEntry(c, error, classified, requestId);
  outputLog(logEntry);

  // Send to Sentry asynchronously (don't await to avoid blocking)
  c.executionCtx.waitUntil(sendToSentry(c, error, classified, requestId));

  // Build client response
  const isProduction = c.env.ENVIRONMENT === "production";
  const errorDef = classified.errorDef;

  // Determine what message to show client
  let clientMessage: string;
  if (errorDef.exposeToClient) {
    clientMessage = error.message || errorDef.message;
  } else {
    clientMessage = isProduction
      ? errorDef.message
      : error.message || errorDef.message;
  }

  // Include stack trace in development
  const details: Record<string, unknown> = {
    ...classified.details,
    request_id: requestId,
  };

  if (!isProduction && error.stack) {
    details.stack = error.stack.split("\n").slice(0, 5);
  }

  const payload = {
    error: {
      code: errorDef.code,
      message: clientMessage,
      details: Object.keys(details).length > 0 ? details : undefined,
    },
    meta: {
      request_id: requestId,
      timestamp: logEntry.timestamp,
    },
  };

  return c.json(payload, errorDef.status as 200 | 400 | 401 | 403 | 404 | 429 | 500 | 503);
}

/**
 * Create a typed error factory
 */
export function createError(
  code: keyof typeof ERROR_REGISTRY,
  message?: string,
  details?: Record<string, unknown>,
): AppError {
  const errorDef = ERROR_REGISTRY[code];
  if (!errorDef) {
    throw new Error(`Unknown error code: ${code}`);
  }
  return new AppError(errorDef, message, details);
}
