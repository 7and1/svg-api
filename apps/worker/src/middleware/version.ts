/**
 * API Versioning Middleware
 *
 * Adds version headers to all responses and validates API-Version header.
 */

import type { Context, Next } from "hono";
import type { Env } from "../env";
import {
  generateVersionHeaders,
  validateApiVersionHeader,
  CURRENT_API_VERSION,
} from "../services/version";

/**
 * API versioning middleware
 */
export const versioningMiddleware = () => {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    // Validate API-Version header if present
    const apiVersionHeader = c.req.header("API-Version");
    const validation = validateApiVersionHeader(apiVersionHeader);

    if (!validation.valid) {
      return c.json(
        {
          error: {
            code: "INVALID_API_VERSION",
            message: validation.error,
            supported_versions: ["1.0", "1.1"],
          },
        },
        400,
      );
    }

    await next();

    // Add version headers to response
    const versionHeaders = generateVersionHeaders(
      validation.version ?? CURRENT_API_VERSION,
      c.req.path,
    );

    for (const [key, value] of Object.entries(versionHeaders)) {
      c.header(key, value);
    }
  };
};
