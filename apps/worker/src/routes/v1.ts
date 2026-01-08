import { Hono } from "hono";
import type { Env } from "../env";
import { iconHandler } from "../handlers/icons";
import { batchHandler } from "../handlers/batch";
import { searchHandler } from "../handlers/search";
import { sourcesHandler } from "../handlers/sources";
import { categoriesHandler } from "../handlers/categories";
import { randomHandler } from "../handlers/random";

/**
 * v1 API Routes
 * Contains all versioned API endpoints
 */
export const createV1Routes = () => {
  const app = new Hono<{ Bindings: Env }>();

  // Icon endpoints
  app.get("/icons/:source/:name", iconHandler);
  app.get("/icons/:name", iconHandler);

  // Batch operations (up to 50 icons, returns JSON)
  app.post("/icons/batch", batchHandler);

  // Bulk download operations (up to 100 icons, returns files)
  // Format options: zip, svg-bundle, json-sprite
  app.post("/bulk?format=zip", batchHandler);
  app.post("/bulk?format=svg-bundle", batchHandler);
  app.post("/bulk?format=json-sprite", batchHandler);

  // Search and discovery
  app.get("/search", searchHandler);
  app.get("/sources", sourcesHandler);
  app.get("/categories", categoriesHandler);
  app.get("/random", randomHandler);

  return app;
};
