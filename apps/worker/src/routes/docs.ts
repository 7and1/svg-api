/**
 * API Documentation Routes
 *
 * Serves the OpenAPI specification as JSON.
 *
 * @packageDocumentation
 */

import type { Context } from "hono";
import { jsonResponse } from "../utils/response";
import { getOpenAPISpecJSON } from "../docs/openapi";

/**
 * GET /docs/openapi.json
 *
 * Returns the OpenAPI 3.1 specification as JSON.
 * This can be used with Swagger UI, Scalar, or other OpenAPI tools.
 */
export const openApiHandler = async (c: Context) => {
  const spec = getOpenAPISpecJSON();

  return c.json(JSON.parse(spec), 200, {
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=3600",
  });
};

/**
 * GET /docs
 *
 * Returns information about available documentation formats.
 */
export const docsInfoHandler = async (c: Context) => {
  return jsonResponse(
    c,
    {
      openapi: "/docs/openapi.json",
      swagger_ui: "https://svg-api.org/docs/swagger",
      scalar: "https://svg-api.org/docs/api",
    },
    {
      version: "1.0.0",
      formats: ["openapi", "swagger", "scalar"],
    },
  );
};
