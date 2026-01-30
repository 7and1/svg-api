import { Hono } from "hono";
import type { Env } from "./env";
import { errorResponse } from "./utils/response";
import {
  corsMiddleware,
  securityHeaders,
  hierarchicalRateLimit,
  botDetection,
  requestSizeLimit,
  earlySecurityMiddleware,
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
import {
  listCollectionsHandler,
  getCollectionHandler,
  createCollectionHandler,
  updateCollectionHandler,
  deleteCollectionHandler,
  addIconToCollectionHandler,
  removeIconFromCollectionHandler,
  exportCollectionHandler,
} from "./handlers/collections";
import {
  recommendationsHandler,
  similarIconsHandler,
  complementaryIconsHandler,
  trackUsageHandler,
} from "./handlers/recommendations";
import {
  statsHandler,
  realtimeStatsHandler,
  popularIconsHandler,
  topSearchesHandler,
  cacheStatsHandler,
  healthStatsHandler,
} from "./handlers/stats";
import { metrics } from "./utils/metrics";
import { getKVCacheStats } from "./services/kv";
import { getR2Stats } from "./services/r2";
import { getTransformCacheStats } from "./utils/transform";
import { handleError } from "./utils/errors";

export const createApp = () => {
  const app = new Hono<{ Bindings: Env }>();

  // Global middleware order - optimized for performance and security
  // 1. Early security checks (IP blocking, basic validation) - minimal overhead
  app.use("*", earlySecurityMiddleware());
  // 2. Early rejection of large requests
  app.use("*", requestSizeLimit(10 * 1024 * 1024)); // 10MB max request size
  // 3. Early bot blocking
  app.use("*", botDetection());
  // 4. CORS validation
  app.use("*", corsMiddleware());
  // 5. Analytics - record all requests including rate-limited ones
  app.use("*", analyticsMiddleware());
  // 6. Rate limiting
  app.use("*", hierarchicalRateLimit());
  // 7. API versioning
  app.use("*", versioningMiddleware());
  // 8. Error tracking
  app.use("*", sentryMiddleware());
  // 9. Security headers - set response headers last
  app.use("*", securityHeaders());

  // Health check endpoints (no auth required, minimal tracking)
  app.get("/health", healthHandler);
  app.get("/health/live", livenessHandler);
  app.get("/health/ready", readinessHandler);

  // Version endpoint
  app.get("/v1/version", versionHandler);

  // Metrics endpoint (for monitoring)
  app.get("/metrics", (c) => {
    const metricsData = metrics.getMetrics();
    return c.json({
      ...metricsData,
      caches: {
        kv: getKVCacheStats(),
        r2: getR2Stats(),
        transform: getTransformCacheStats(),
      },
    });
  });

  // Prometheus-compatible metrics endpoint
  app.get("/metrics/prometheus", (c) => {
    const prometheusMetrics = metrics.exportPrometheusMetrics();
    return c.text(prometheusMetrics, 200, {
      "Content-Type": "text/plain; version=0.0.4",
    });
  });

  app.get("/", (c) => c.text("svg-api worker"));

  // Documentation endpoints
  app.get("/docs", docsInfoHandler);
  app.get("/docs/openapi.json", openApiHandler);

  const registerRoutes = (prefix = "") => {
    // Icon routes
    app.get(`${prefix}/icons/:source/:name`, iconHandler);
    app.get(`${prefix}/icons/:name`, iconHandler);
    app.post(`${prefix}/icons/batch`, batchHandler);

    // Search and discovery
    app.get(`${prefix}/search`, searchHandler);
    app.get(`${prefix}/sources`, sourcesHandler);
    app.get(`${prefix}/categories`, categoriesHandler);
    app.get(`${prefix}/random`, randomHandler);

    // Collections
    app.get(`${prefix}/collections`, listCollectionsHandler);
    app.post(`${prefix}/collections`, createCollectionHandler);
    app.get(`${prefix}/collections/:id`, getCollectionHandler);
    app.put(`${prefix}/collections/:id`, updateCollectionHandler);
    app.delete(`${prefix}/collections/:id`, deleteCollectionHandler);
    app.post(`${prefix}/collections/:id/icons`, addIconToCollectionHandler);
    app.delete(`${prefix}/collections/:id/icons/:source/:name`, removeIconFromCollectionHandler);
    app.get(`${prefix}/collections/:id/export`, exportCollectionHandler);

    // Recommendations
    app.get(`${prefix}/recommendations`, recommendationsHandler);
    app.get(`${prefix}/recommendations/similar/:name`, similarIconsHandler);
    app.get(`${prefix}/recommendations/complementary/:category`, complementaryIconsHandler);
    app.post(`${prefix}/recommendations/track`, trackUsageHandler);

    // Stats
    app.get(`${prefix}/stats`, statsHandler);
    app.get(`${prefix}/stats/realtime`, realtimeStatsHandler);
    app.get(`${prefix}/stats/popular-icons`, popularIconsHandler);
    app.get(`${prefix}/stats/top-searches`, topSearchesHandler);
    app.get(`${prefix}/stats/cache`, cacheStatsHandler);
    app.get(`${prefix}/stats/health`, healthStatsHandler);
  };

  registerRoutes("");
  registerRoutes("/v1");

  // Bulk download routes with higher rate limit (10x multiplier)
  app.post("/v1/bulk", batchHandler);
  app.post("/bulk", batchHandler);

  app.notFound((c) => errorResponse(c, "NOT_FOUND", "Endpoint not found", 404));

  app.onError((err, c) => {
    return handleError(c, err instanceof Error ? err : new Error(String(err)));
  });

  return app;
};
