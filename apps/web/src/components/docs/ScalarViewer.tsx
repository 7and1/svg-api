"use client";

/**
 * Scalar API Reference Viewer Component
 *
 * Renders interactive OpenAPI documentation using Scalar.
 *
 * @packageDocumentation
 */

import { ApiReferenceReact } from "@scalar/api-reference-react";
import { useTheme } from "next-themes";
import { useMemo } from "react";

interface ScalarViewerProps {
  /**
   * URL to the OpenAPI specification
   */
  specUrl?: string;
  /**
   * Inline OpenAPI specification as JSON object
   */
  spec?: object;
}

/**
 * OpenAPI specification for SVG API
 */
const defaultSpec = {
  openapi: "3.1.0",
  info: {
    title: "SVG API",
    version: "1.0.0",
    description: `A fast, free API for fetching SVG icons from multiple popular libraries.

## Features
- **22,000+ icons** from 7 popular icon libraries
- **Edge caching** for < 50ms response times
- **Customizable** size, color, and stroke via query parameters
- **Full-text search** across all icons
- **Batch requests** to fetch up to 50 icons at once
- **No API key required**

## Authentication
No authentication is required for public endpoints.

## Rate Limits
- 100 requests per minute per IP address
- Rate limit headers are included in all responses`,
    contact: {
      name: "SVG API",
      url: "https://svg-api.org",
    },
    license: {
      name: "MIT",
      url: "https://github.com/svg-api/svg-api/blob/main/LICENSE",
    },
  },
  servers: [
    {
      url: "https://svg-api.org",
      description: "Production server",
    },
  ],
  tags: [
    { name: "Icons", description: "Icon retrieval endpoints" },
    { name: "Search", description: "Icon search endpoints" },
    { name: "Metadata", description: "Sources and categories endpoints" },
  ],
  paths: {
    "/v1/icons/{name}": {
      get: {
        tags: ["Icons"],
        summary: "Get an icon by name",
        description:
          "Fetches a single icon with optional customization options. Returns JSON by default, but can return raw SVG content.",
        operationId: "getIcon",
        parameters: [
          {
            name: "name",
            in: "path",
            required: true,
            description: "The icon name (kebab-case)",
            schema: {
              type: "string",
              pattern: "^[a-z0-9-]+$",
              example: "home",
            },
          },
          {
            name: "source",
            in: "query",
            description: "Icon source library",
            schema: {
              type: "string",
              enum: [
                "lucide",
                "tabler",
                "heroicons",
                "bootstrap",
                "remix",
                "ionicons",
                "mdi",
              ],
              default: "lucide",
            },
            example: "lucide",
          },
          {
            name: "size",
            in: "query",
            description: "Icon size in pixels",
            schema: { type: "number", minimum: 8, maximum: 512, default: 24 },
            example: 24,
          },
          {
            name: "color",
            in: "query",
            description: "Icon color (hex code or color name)",
            schema: {
              type: "string",
              pattern: "^(#([0-9a-fA-F]{3}){1,2}|[a-zA-Z]+)$",
              default: "currentColor",
            },
            example: "#000000",
          },
          {
            name: "stroke",
            in: "query",
            description: "Stroke width in pixels (for outlined icons)",
            schema: { type: "number", minimum: 0.5, maximum: 3, default: 2 },
            example: 2,
          },
          {
            name: "format",
            in: "query",
            description:
              "Response format. Use 'svg' with Accept header for raw SVG.",
            schema: { type: "string", enum: ["svg", "json"] },
            example: "json",
          },
        ],
        responses: {
          "200": {
            description: "Icon retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { $ref: "#/components/schemas/IconResponse" },
                    meta: { $ref: "#/components/schemas/ResponseMeta" },
                  },
                },
                example: {
                  data: {
                    name: "home",
                    source: "lucide",
                    category: "navigation",
                    tags: ["home", "house", "index"],
                    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
                    variants: ["default"],
                    license: {
                      type: "ISC",
                      url: "https://github.com/lucide-icons/lucide/blob/main/LICENSE",
                    },
                  },
                  meta: {
                    request_id: "req_1234567890",
                    timestamp: "2024-01-01T00:00:00.000Z",
                  },
                },
              },
              "image/svg+xml": {
                schema: { type: "string", format: "binary" },
              },
            },
          },
          "404": {
            description: "Icon not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/v1/icons/{source}/{name}": {
      get: {
        tags: ["Icons"],
        summary: "Get an icon by source and name",
        description:
          "Fetches a single icon from a specific source with optional customization.",
        operationId: "getIconBySource",
        parameters: [
          {
            name: "source",
            in: "path",
            required: true,
            description: "Icon source library",
            schema: {
              type: "string",
              enum: [
                "lucide",
                "tabler",
                "heroicons",
                "bootstrap",
                "remix",
                "ionicons",
                "mdi",
              ],
            },
            example: "lucide",
          },
          {
            name: "name",
            in: "path",
            required: true,
            description: "The icon name (kebab-case)",
            schema: { type: "string", pattern: "^[a-z0-9-]+$" },
            example: "home",
          },
          {
            name: "size",
            in: "query",
            description: "Icon size in pixels",
            schema: { type: "number", minimum: 8, maximum: 512, default: 24 },
          },
          {
            name: "color",
            in: "query",
            description: "Icon color (hex code or color name)",
            schema: {
              type: "string",
              pattern: "^(#([0-9a-fA-F]{3}){1,2}|[a-zA-Z]+)$",
              default: "currentColor",
            },
          },
          {
            name: "stroke",
            in: "query",
            description: "Stroke width in pixels",
            schema: { type: "number", minimum: 0.5, maximum: 3, default: 2 },
          },
          {
            name: "format",
            in: "query",
            description: "Response format",
            schema: { type: "string", enum: ["svg", "json"] },
          },
        ],
        responses: {
          "200": {
            description: "Icon retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { $ref: "#/components/schemas/IconResponse" },
                    meta: { $ref: "#/components/schemas/ResponseMeta" },
                  },
                },
              },
              "image/svg+xml": {
                schema: { type: "string", format: "binary" },
              },
            },
          },
        },
      },
    },
    "/v1/icons/batch": {
      post: {
        tags: ["Icons"],
        summary: "Get multiple icons in one request",
        description:
          "Fetches up to 50 icons in a single request. Each icon can have its own customization options, or use the defaults.",
        operationId: "getBatch",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BatchRequest" },
              example: {
                icons: [
                  { name: "home" },
                  { name: "user", source: "lucide", size: 32 },
                  { name: "settings", color: "#6366f1" },
                ],
                defaults: {
                  source: "lucide",
                  size: 24,
                  color: "currentColor",
                  stroke: 2,
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Batch request completed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: {
                        oneOf: [
                          { $ref: "#/components/schemas/BatchIconResult" },
                          { $ref: "#/components/schemas/BatchIconError" },
                        ],
                      },
                    },
                    meta: { $ref: "#/components/schemas/BatchMeta" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/v1/search": {
      get: {
        tags: ["Search"],
        summary: "Search for icons",
        description:
          "Performs a full-text search across all icons. Results are ranked by relevance score.",
        operationId: "searchIcons",
        parameters: [
          {
            name: "q",
            in: "query",
            required: true,
            description: "Search query (minimum 2 characters)",
            schema: { type: "string", minLength: 2 },
            example: "arrow",
          },
          {
            name: "source",
            in: "query",
            description: "Filter by icon source",
            schema: {
              type: "string",
              enum: [
                "lucide",
                "tabler",
                "heroicons",
                "bootstrap",
                "remix",
                "ionicons",
                "mdi",
              ],
            },
          },
          {
            name: "category",
            in: "query",
            description: "Filter by category",
            schema: { type: "string" },
          },
          {
            name: "limit",
            in: "query",
            description: "Maximum results per page",
            schema: { type: "number", minimum: 1, maximum: 100, default: 20 },
          },
          {
            name: "offset",
            in: "query",
            description: "Pagination offset",
            schema: { type: "number", minimum: 0, default: 0 },
          },
        ],
        responses: {
          "200": {
            description: "Search results",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/SearchResult" },
                    },
                    meta: { $ref: "#/components/schemas/SearchMeta" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/v1/sources": {
      get: {
        tags: ["Metadata"],
        summary: "Get all icon sources",
        description:
          "Returns metadata about all available icon libraries including icon counts, variants, and license information.",
        operationId: "getSources",
        responses: {
          "200": {
            description: "List of icon sources",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/SourceMeta" },
                    },
                    meta: { $ref: "#/components/schemas/SourcesMeta" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/v1/categories": {
      get: {
        tags: ["Metadata"],
        summary: "Get all icon categories",
        description:
          "Returns a list of all icon categories with icon counts and source information.",
        operationId: "getCategories",
        parameters: [
          {
            name: "source",
            in: "query",
            description: "Filter categories by source",
            schema: {
              type: "string",
              enum: [
                "lucide",
                "tabler",
                "heroicons",
                "bootstrap",
                "remix",
                "ionicons",
                "mdi",
              ],
            },
          },
        ],
        responses: {
          "200": {
            description: "List of categories",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/CategoryMeta" },
                    },
                    meta: { $ref: "#/components/schemas/CategoriesMeta" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/v1/random": {
      get: {
        tags: ["Icons"],
        summary: "Get a random icon",
        description:
          "Returns a random icon, optionally filtered by source or category.",
        operationId: "getRandomIcon",
        parameters: [
          {
            name: "source",
            in: "query",
            description: "Filter by icon source",
            schema: {
              type: "string",
              enum: [
                "lucide",
                "tabler",
                "heroicons",
                "bootstrap",
                "remix",
                "ionicons",
                "mdi",
              ],
            },
          },
          {
            name: "category",
            in: "query",
            description: "Filter by category",
            schema: { type: "string" },
          },
          {
            name: "size",
            in: "query",
            description: "Icon size in pixels",
            schema: { type: "number", minimum: 8, maximum: 512 },
          },
          {
            name: "color",
            in: "query",
            description: "Icon color",
            schema: {
              type: "string",
              pattern: "^(#([0-9a-fA-F]{3}){1,2}|[a-zA-Z]+)$",
            },
          },
          {
            name: "stroke",
            in: "query",
            description: "Stroke width",
            schema: { type: "number", minimum: 0.5, maximum: 3 },
          },
        ],
        responses: {
          "200": {
            description: "Random icon retrieved",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { $ref: "#/components/schemas/RandomIconResponse" },
                    meta: { $ref: "#/components/schemas/ResponseMeta" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      IconResponse: {
        type: "object",
        required: ["name", "source", "category", "tags", "svg", "license"],
        properties: {
          name: { type: "string", description: "Icon name" },
          source: { type: "string", description: "Icon source" },
          category: { type: "string", description: "Icon category" },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Associated tags",
          },
          svg: { type: "string", description: "SVG content" },
          variants: {
            type: "array",
            items: { type: "string" },
            description: "Available variants",
          },
          license: { $ref: "#/components/schemas/License" },
        },
      },
      RandomIconResponse: {
        type: "object",
        required: ["name", "source", "category", "tags", "svg", "preview_url"],
        properties: {
          name: { type: "string", description: "Icon name" },
          source: { type: "string", description: "Icon source" },
          category: { type: "string", description: "Icon category" },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Associated tags",
          },
          svg: { type: "string", description: "SVG content" },
          preview_url: {
            type: "string",
            description: "Direct URL to this icon",
          },
        },
      },
      License: {
        type: "object",
        required: ["type", "url"],
        properties: {
          type: {
            type: "string",
            description: "License type (e.g., MIT, ISC, Apache-2.0)",
          },
          url: { type: "string", description: "URL to license text" },
        },
      },
      BatchRequest: {
        type: "object",
        required: ["icons"],
        properties: {
          icons: {
            type: "array",
            maxItems: 50,
            items: { $ref: "#/components/schemas/BatchIconInput" },
          },
          defaults: { $ref: "#/components/schemas/BatchIconInput" },
        },
      },
      BatchIconInput: {
        type: "object",
        properties: {
          name: { type: "string", description: "Icon name" },
          source: { type: "string", description: "Icon source" },
          size: { type: "number", minimum: 8, maximum: 512 },
          color: {
            type: "string",
            pattern: "^(#([0-9a-fA-F]{3}){1,2}|[a-zA-Z]+)$",
          },
          stroke: { type: "number", minimum: 0.5, maximum: 3 },
        },
      },
      BatchIconResult: {
        type: "object",
        required: ["name", "source", "category", "tags", "svg"],
        properties: {
          name: { type: "string" },
          source: { type: "string" },
          category: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          svg: { type: "string" },
          variants: { type: "array", items: { type: "string" } },
          license: { $ref: "#/components/schemas/License" },
        },
      },
      BatchIconError: {
        type: "object",
        required: ["name", "source", "error"],
        properties: {
          name: { type: "string" },
          source: { type: "string" },
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: { type: "string" },
              message: { type: "string" },
            },
          },
        },
      },
      BatchMeta: {
        type: "object",
        required: ["requested", "successful", "failed"],
        properties: {
          requested: {
            type: "number",
            description: "Number of icons requested",
          },
          successful: {
            type: "number",
            description: "Number of successful results",
          },
          failed: { type: "number", description: "Number of failed results" },
        },
      },
      SearchResult: {
        type: "object",
        required: ["name", "source", "category", "score"],
        properties: {
          name: { type: "string", description: "Icon name" },
          source: { type: "string", description: "Icon source" },
          category: { type: "string", description: "Icon category" },
          score: { type: "number", description: "Relevance score" },
          preview_url: { type: "string", description: "Preview URL" },
          matches: {
            type: "object",
            properties: {
              name: {
                type: "boolean",
                description: "Whether query matched name",
              },
              tags: {
                type: "array",
                items: { type: "string" },
                description: "Matching tags",
              },
            },
          },
        },
      },
      SearchMeta: {
        type: "object",
        required: [
          "query",
          "total",
          "limit",
          "offset",
          "has_more",
          "search_time_ms",
          "search_method",
          "cache_hit",
        ],
        properties: {
          query: { type: "string" },
          total: { type: "number" },
          limit: { type: "number" },
          offset: { type: "number" },
          has_more: { type: "boolean" },
          search_time_ms: { type: "number" },
          search_method: {
            type: "string",
            enum: ["inverted_index", "linear", "cached"],
          },
          cache_hit: { type: "boolean" },
        },
      },
      SourceMeta: {
        type: "object",
        required: [
          "id",
          "name",
          "description",
          "version",
          "iconCount",
          "website",
          "repository",
          "license",
          "variants",
          "defaultVariant",
          "categories",
        ],
        properties: {
          id: { type: "string", description: "Source identifier" },
          name: { type: "string", description: "Human-readable name" },
          description: { type: "string" },
          version: { type: "string" },
          iconCount: { type: "number" },
          website: { type: "string", format: "uri" },
          repository: { type: "string", format: "uri" },
          license: { $ref: "#/components/schemas/License" },
          variants: { type: "array", items: { type: "string" } },
          defaultVariant: { type: "string" },
          categories: { type: "array", items: { type: "string" } },
        },
      },
      SourcesMeta: {
        type: "object",
        required: ["total_sources", "total_icons"],
        properties: {
          total_sources: { type: "number" },
          total_icons: { type: "number" },
        },
      },
      CategoryMeta: {
        type: "object",
        required: ["id", "name", "description", "icon_count", "sources"],
        properties: {
          id: { type: "string", description: "Category identifier" },
          name: { type: "string", description: "Human-readable name" },
          description: { type: "string" },
          icon_count: { type: "number" },
          sources: { type: "array", items: { type: "string" } },
        },
      },
      CategoriesMeta: {
        type: "object",
        required: ["total"],
        properties: {
          total: { type: "number" },
        },
      },
      ResponseMeta: {
        type: "object",
        required: ["request_id", "timestamp"],
        properties: {
          request_id: {
            type: "string",
            description: "Unique request identifier",
          },
          timestamp: {
            type: "string",
            format: "date-time",
            description: "Response timestamp",
          },
        },
      },
      ErrorResponse: {
        type: "object",
        required: ["error", "meta"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: { type: "string", description: "Error code" },
              message: {
                type: "string",
                description: "Human-readable error message",
              },
              details: { type: "object", additionalProperties: true },
            },
          },
          meta: { $ref: "#/components/schemas/ResponseMeta" },
        },
      },
    },
  },
};

/**
 * Scalar API Reference Viewer Component
 */
export function ScalarViewer({ specUrl, spec }: ScalarViewerProps) {
  const { resolvedTheme } = useTheme();

  const configuration = useMemo(
    () => ({
      spec: {
        content: spec ?? defaultSpec,
        url: specUrl,
      },
      theme: (resolvedTheme === "dark" ? "kepler" : "default") as
        | "default"
        | "kepler",
      proxy: "https://proxy.scalar.com",
    }),
    [resolvedTheme, spec, specUrl],
  );

  return (
    <div className="scalar-documentation">
      <ApiReferenceReact configuration={configuration} />
    </div>
  );
}
