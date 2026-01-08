/**
 * Sentry Error Handler Middleware
 *
 * Captures unhandled errors and sends them to Sentry.
 */

import type { Context, Next } from "hono";
import type { Env } from "../env";
import { getSentry, incrementRequestCount } from "../services/sentry";

/**
 * Sentry error handler middleware
 */
export const sentryMiddleware = () => {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    // Increment request counter for cold start detection
    incrementRequestCount();

    try {
      await next();
    } catch (err) {
      const sentry = getSentry(c.env);

      // Only send to Sentry in non-development environments
      if (sentry && c.env.ENVIRONMENT !== "development") {
        const error =
          err instanceof Error
            ? err
            : new Error(String(err ?? "Unknown error"));

        // Send asynchronously to avoid blocking response
        c.executionCtx.waitUntil(
          sentry.captureException(error, {
            request: c,
            tags: {
              status_code: c.res.status.toString(),
            },
            extra: {
              query_params: Object.fromEntries(
                new URLSearchParams(c.req.query()),
              ),
            },
          }),
        );
      }

      // Re-throw for the app's error handler
      throw err;
    }
  };
};
