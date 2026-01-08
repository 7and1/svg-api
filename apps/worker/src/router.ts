import { Hono } from "hono";
import type { Env } from "./env";
import { errorResponse } from "./utils/response";
import {
  corsMiddleware,
  securityHeaders,
  rateLimit,
} from "./middleware/security";
import { analyticsMiddleware } from "./middleware/analytics";
import { sentryMiddleware } from "./middleware/sentry";
import { versioningMiddleware } from "./middleware/version";
import { iconHandler } from "./handlers/icons";
import { searchHandler } from "./handlers/search";
import { batchHandler } from "./handlers/batch";
import { sourcesHandler } from "./handlers/sources";
import { categoriesHandler } from "./handlers/categories";
import { randomHandler } from "./handlers/random";
import {
  healthHandler,
  livenessHandler,
  readinessHandler,
} from "./handlers/health";
import { versionHandler } from "./handlers/version";
import { openApiHandler, docsInfoHandler } from "./routes/docs";

export const createApp = () => {
  const app = new Hono<{ Bindings: Env }>();

  // Global middleware order matters
  app.use("*", corsMiddleware());
  app.use("*", securityHeaders());
  app.use("*", rateLimit({ windowMs: 60_000, max: 100 }));
  app.use("*", versioningMiddleware());
  app.use("*", analyticsMiddleware());
  app.use("*", sentryMiddleware());

  // Health check endpoints (no auth required, minimal tracking)
  app.get("/health", healthHandler);
  app.get("/health/live", livenessHandler);
  app.get("/health/ready", readinessHandler);

  // Version endpoint
  app.get("/v1/version", versionHandler);

  app.get("/", (c) => c.text("svg-api worker"));

  // Documentation endpoints
  app.get("/docs", docsInfoHandler);
  app.get("/docs/openapi.json", openApiHandler);

  const registerRoutes = (prefix = "") => {
    app.get(`${prefix}/icons/:source/:name`, iconHandler);
    app.get(`${prefix}/icons/:name`, iconHandler);
    app.post(`${prefix}/icons/batch`, batchHandler);
    app.get(`${prefix}/search`, searchHandler);
    app.get(`${prefix}/sources`, sourcesHandler);
    app.get(`${prefix}/categories`, categoriesHandler);
    app.get(`${prefix}/random`, randomHandler);
  };

  registerRoutes("");
  registerRoutes("/v1");

  // Bulk download routes with higher rate limit (10x multiplier)
  // These routes check the format query parameter internally
  app.post("/v1/bulk", batchHandler);
  app.post("/bulk", batchHandler);

  app.notFound((c) => errorResponse(c, "NOT_FOUND", "Endpoint not found", 404));

  app.onError((err, c) => {
    console.error(`[Error] ${c.req.method} ${c.req.path}:`, err.message);
    // Never expose internal error details to clients in production
    const isProduction = c.env.ENVIRONMENT === "production";
    const message = isProduction
      ? "An unexpected error occurred"
      : err.message || "Unexpected error";
    return errorResponse(c, "INTERNAL_ERROR", message, 500);
  });

  return app;
};
