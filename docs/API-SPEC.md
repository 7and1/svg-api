# SVG API Specification

**Base URL:** `https://api.svg-api.org/v1`
**Version:** 1.0.0
**License:** MIT

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [Common Headers](#common-headers)
5. [Error Handling](#error-handling)
6. [Endpoints](#endpoints)
7. [OpenAPI 3.0 Specification](#openapi-30-specification)
8. [SDK Examples](#sdk-examples)

---

## Overview

SVG API provides a unified interface to access icons from multiple open-source icon libraries. All endpoints return JSON by default, with SVG available via content negotiation.

### Features

- Access to 50,000+ icons from 20+ sources
- Full-text search with relevance scoring
- Batch operations for efficiency
- Customizable icon properties (size, color, stroke)
- Comprehensive metadata including licenses

---

## Authentication

Public API - no authentication required for read operations.

Optional API key for higher rate limits:

```
Authorization: Bearer sk_live_xxxxxxxxxxxxx
```

---

## Rate Limiting

| Tier       | Requests/min | Requests/day |
| ---------- | ------------ | ------------ |
| Anonymous  | 60           | 1,000        |
| Registered | 300          | 10,000       |
| Pro        | 1,000        | 100,000      |

### Rate Limit Headers

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1704672000
X-RateLimit-Policy: 60;w=60
```

---

## Common Headers

### Request Headers

| Header          | Description         | Example                             |
| --------------- | ------------------- | ----------------------------------- |
| `Accept`        | Response format     | `image/svg+xml`, `application/json` |
| `Authorization` | API key (optional)  | `Bearer sk_live_xxx`                |
| `If-None-Match` | Conditional request | `"abc123"`                          |

### Response Headers

| Header                        | Description               | Example                 |
| ----------------------------- | ------------------------- | ----------------------- |
| `Content-Type`                | Response format           | `application/json`      |
| `Cache-Control`               | Caching directive         | `public, max-age=86400` |
| `ETag`                        | Resource version          | `"abc123"`              |
| `Access-Control-Allow-Origin` | CORS origin               | `*`                     |
| `X-Request-Id`                | Unique request identifier | `req_abc123`            |

---

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "ICON_NOT_FOUND",
    "message": "Icon 'nonexistent' not found in source 'heroicons'",
    "details": {
      "icon": "nonexistent",
      "source": "heroicons",
      "suggestions": ["search", "magnifying-glass", "find"]
    }
  },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2024-01-07T12:00:00Z"
  }
}
```

### Error Codes

| HTTP Status | Error Code             | Description                    |
| ----------- | ---------------------- | ------------------------------ |
| 400         | `INVALID_PARAMETER`    | Invalid query parameter        |
| 400         | `INVALID_SIZE`         | Size must be between 8 and 512 |
| 400         | `INVALID_COLOR`        | Invalid color format           |
| 400         | `BATCH_LIMIT_EXCEEDED` | Exceeded 50 icons per batch    |
| 404         | `ICON_NOT_FOUND`       | Icon does not exist            |
| 404         | `SOURCE_NOT_FOUND`     | Icon source does not exist     |
| 404         | `CATEGORY_NOT_FOUND`   | Category does not exist        |
| 429         | `RATE_LIMITED`         | Too many requests              |
| 500         | `INTERNAL_ERROR`       | Unexpected server error        |
| 503         | `SERVICE_UNAVAILABLE`  | Temporary service outage       |

---

## Endpoints

### GET /icons/{name}

Retrieve a single icon by name.

#### Parameters

| Name     | In    | Type    | Required | Description                                          |
| -------- | ----- | ------- | -------- | ---------------------------------------------------- |
| `name`   | path  | string  | Yes      | Icon name (e.g., `home`, `arrow-right`)              |
| `source` | query | string  | No       | Icon source (e.g., `heroicons`, `lucide`, `feather`) |
| `size`   | query | integer | No       | Icon size in pixels (8-512, default: 24)             |
| `stroke` | query | number  | No       | Stroke width (0.5-3, default: 2)                     |
| `color`  | query | string  | No       | Color as hex (e.g., `#ff0000`) or name               |

#### Content Negotiation

| Accept Header      | Response Type | Description       |
| ------------------ | ------------- | ----------------- |
| `image/svg+xml`    | SVG           | Raw SVG content   |
| `application/json` | JSON          | SVG with metadata |
| `*/*`              | JSON          | Default to JSON   |

#### Response (JSON)

```json
{
  "data": {
    "name": "home",
    "source": "heroicons",
    "category": "navigation",
    "tags": ["house", "main", "index"],
    "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\">...</svg>",
    "variants": ["outline", "solid", "mini"],
    "license": {
      "type": "MIT",
      "url": "https://github.com/tailwindlabs/heroicons/blob/master/LICENSE"
    }
  },
  "meta": {
    "request_id": "req_abc123",
    "cached": true,
    "cache_age": 3600
  }
}
```

#### Response (SVG)

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2">
  <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
</svg>
```

#### Example

```bash
# Get icon as JSON with metadata
curl -H "Accept: application/json" \
  "https://api.svg-api.org/v1/icons/home?source=heroicons&size=32&color=%23ff0000"

# Get raw SVG
curl -H "Accept: image/svg+xml" \
  "https://api.svg-api.org/v1/icons/home?source=heroicons"
```

---

### GET /search

Full-text search across all icons with relevance scoring.

#### Parameters

| Name       | In    | Type    | Required | Description                           |
| ---------- | ----- | ------- | -------- | ------------------------------------- |
| `q`        | query | string  | Yes      | Search query (min 2 chars)            |
| `source`   | query | string  | No       | Filter by source                      |
| `category` | query | string  | No       | Filter by category                    |
| `limit`    | query | integer | No       | Results per page (1-100, default: 20) |
| `offset`   | query | integer | No       | Pagination offset (default: 0)        |

#### Response

```json
{
  "data": [
    {
      "name": "home",
      "source": "heroicons",
      "category": "navigation",
      "score": 0.95,
      "preview_url": "https://api.svg-api.org/v1/icons/home?source=heroicons",
      "matches": {
        "name": true,
        "tags": ["house", "main"]
      }
    },
    {
      "name": "home-modern",
      "source": "heroicons",
      "category": "buildings",
      "score": 0.72,
      "preview_url": "https://api.svg-api.org/v1/icons/home-modern?source=heroicons",
      "matches": {
        "name": true,
        "tags": []
      }
    }
  ],
  "meta": {
    "query": "home",
    "total": 156,
    "limit": 20,
    "offset": 0,
    "has_more": true,
    "search_time_ms": 12,
    "request_id": "req_abc123"
  }
}
```

#### Example

```bash
# Search for home icons in heroicons
curl "https://api.svg-api.org/v1/search?q=home&source=heroicons&limit=10"

# Search with category filter
curl "https://api.svg-api.org/v1/search?q=arrow&category=navigation&limit=50"
```

---

### POST /icons/batch

Fetch multiple icons in a single request. Maximum 50 icons per request.

#### Request Body

```json
{
  "icons": [
    { "name": "home", "source": "heroicons" },
    { "name": "search", "source": "lucide", "size": 32 },
    { "name": "user", "source": "feather", "color": "#3b82f6" }
  ],
  "defaults": {
    "size": 24,
    "stroke": 2
  }
}
```

#### Response

```json
{
  "data": {
    "home:heroicons": {
      "success": true,
      "name": "home",
      "source": "heroicons",
      "svg": "<svg>...</svg>",
      "category": "navigation"
    },
    "search:lucide": {
      "success": true,
      "name": "search",
      "source": "lucide",
      "svg": "<svg>...</svg>",
      "category": "general"
    },
    "user:feather": {
      "success": true,
      "name": "user",
      "source": "feather",
      "svg": "<svg>...</svg>",
      "category": "users"
    }
  },
  "errors": {},
  "meta": {
    "requested": 3,
    "successful": 3,
    "failed": 0,
    "request_id": "req_abc123"
  }
}
```

#### Response with Errors

```json
{
  "data": {
    "home:heroicons": {
      "success": true,
      "name": "home",
      "source": "heroicons",
      "svg": "<svg>...</svg>"
    }
  },
  "errors": {
    "nonexistent:heroicons": {
      "code": "ICON_NOT_FOUND",
      "message": "Icon 'nonexistent' not found in source 'heroicons'"
    },
    "home:unknownsource": {
      "code": "SOURCE_NOT_FOUND",
      "message": "Source 'unknownsource' does not exist"
    }
  },
  "meta": {
    "requested": 3,
    "successful": 1,
    "failed": 2,
    "request_id": "req_abc123"
  }
}
```

#### Example

```bash
curl -X POST "https://api.svg-api.org/v1/icons/batch" \
  -H "Content-Type: application/json" \
  -d '{
    "icons": [
      {"name": "home", "source": "heroicons"},
      {"name": "search", "source": "lucide"}
    ],
    "defaults": {"size": 24}
  }'
```

---

### GET /sources

List all available icon sources with metadata.

#### Response

```json
{
  "data": [
    {
      "id": "heroicons",
      "name": "Heroicons",
      "description": "Beautiful hand-crafted SVG icons by the makers of Tailwind CSS",
      "version": "2.1.1",
      "icon_count": 292,
      "website": "https://heroicons.com",
      "repository": "https://github.com/tailwindlabs/heroicons",
      "license": {
        "type": "MIT",
        "url": "https://github.com/tailwindlabs/heroicons/blob/master/LICENSE"
      },
      "variants": ["outline", "solid", "mini"],
      "default_variant": "outline",
      "categories": ["navigation", "media", "communication", "commerce"]
    },
    {
      "id": "lucide",
      "name": "Lucide",
      "description": "Beautiful & consistent icon toolkit made by the community",
      "version": "0.303.0",
      "icon_count": 1420,
      "website": "https://lucide.dev",
      "repository": "https://github.com/lucide-icons/lucide",
      "license": {
        "type": "ISC",
        "url": "https://github.com/lucide-icons/lucide/blob/main/LICENSE"
      },
      "variants": ["default"],
      "default_variant": "default",
      "categories": ["arrows", "devices", "files", "shapes"]
    },
    {
      "id": "feather",
      "name": "Feather Icons",
      "description": "Simply beautiful open source icons",
      "version": "4.29.1",
      "icon_count": 287,
      "website": "https://feathericons.com",
      "repository": "https://github.com/feathericons/feather",
      "license": {
        "type": "MIT",
        "url": "https://github.com/feathericons/feather/blob/master/LICENSE"
      },
      "variants": ["default"],
      "default_variant": "default",
      "categories": ["general", "social", "devices"]
    }
  ],
  "meta": {
    "total_sources": 3,
    "total_icons": 1999,
    "request_id": "req_abc123"
  }
}
```

#### Example

```bash
curl "https://api.svg-api.org/v1/sources"
```

---

### GET /categories

List all icon categories with counts.

#### Parameters

| Name     | In    | Type   | Required | Description           |
| -------- | ----- | ------ | -------- | --------------------- |
| `source` | query | string | No       | Filter by icon source |

#### Response

```json
{
  "data": [
    {
      "id": "navigation",
      "name": "Navigation",
      "description": "Arrows, menus, and navigation elements",
      "icon_count": 342,
      "sources": ["heroicons", "lucide", "feather"]
    },
    {
      "id": "communication",
      "name": "Communication",
      "description": "Email, chat, and messaging icons",
      "icon_count": 156,
      "sources": ["heroicons", "lucide"]
    },
    {
      "id": "media",
      "name": "Media",
      "description": "Audio, video, and playback controls",
      "icon_count": 89,
      "sources": ["heroicons", "lucide", "feather"]
    }
  ],
  "meta": {
    "total_categories": 3,
    "request_id": "req_abc123"
  }
}
```

#### Example

```bash
# Get all categories
curl "https://api.svg-api.org/v1/categories"

# Get categories for specific source
curl "https://api.svg-api.org/v1/categories?source=heroicons"
```

---

### GET /random

Get a random icon. Useful for testing or inspiration.

#### Parameters

| Name       | In    | Type   | Required | Description                |
| ---------- | ----- | ------ | -------- | -------------------------- |
| `source`   | query | string | No       | Limit to specific source   |
| `category` | query | string | No       | Limit to specific category |

#### Response

```json
{
  "data": {
    "name": "sparkles",
    "source": "heroicons",
    "category": "effects",
    "tags": ["magic", "stars", "shine"],
    "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\">...</svg>",
    "preview_url": "https://api.svg-api.org/v1/icons/sparkles?source=heroicons"
  },
  "meta": {
    "request_id": "req_abc123"
  }
}
```

#### Example

```bash
# Get random icon from any source
curl "https://api.svg-api.org/v1/random"

# Get random icon from heroicons
curl "https://api.svg-api.org/v1/random?source=heroicons"

# Get random navigation icon
curl "https://api.svg-api.org/v1/random?category=navigation"
```

---

## OpenAPI 3.0 Specification

```yaml
openapi: 3.0.3
info:
  title: SVG API
  description: |
    A unified API for accessing icons from multiple open-source icon libraries.

    ## Features
    - Access 50,000+ icons from 20+ sources
    - Full-text search with relevance scoring
    - Batch operations for efficiency
    - Customizable icon properties

    ## Rate Limiting
    Anonymous users: 60 requests/minute, 1,000/day
    Registered users: 300 requests/minute, 10,000/day
  version: 1.0.0
  contact:
    name: SVG API Support
    url: https://svg-api.org/support
    email: support@svg-api.org
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: https://api.svg-api.org/v1
    description: Production server
  - url: https://staging-api.svg-api.org/v1
    description: Staging server

tags:
  - name: Icons
    description: Icon retrieval operations
  - name: Search
    description: Search and discovery
  - name: Metadata
    description: Sources and categories

paths:
  /icons/{name}:
    get:
      summary: Get icon by name
      description: |
        Retrieve a single icon by name. Returns JSON with metadata by default,
        or raw SVG when Accept header is set to image/svg+xml.
      operationId: getIcon
      tags:
        - Icons
      parameters:
        - name: name
          in: path
          required: true
          description: Icon name (e.g., home, arrow-right)
          schema:
            type: string
            minLength: 1
            maxLength: 100
            pattern: "^[a-z0-9-]+$"
          example: home
        - name: source
          in: query
          description: Icon source library
          schema:
            type: string
            enum:
              [
                heroicons,
                lucide,
                feather,
                phosphor,
                tabler,
                bootstrap,
                fontawesome,
              ]
          example: heroicons
        - name: size
          in: query
          description: Icon size in pixels
          schema:
            type: integer
            minimum: 8
            maximum: 512
            default: 24
          example: 32
        - name: stroke
          in: query
          description: Stroke width
          schema:
            type: number
            minimum: 0.5
            maximum: 3
            default: 2
          example: 1.5
        - name: color
          in: query
          description: Icon color (hex or named color)
          schema:
            type: string
            pattern: "^#[0-9a-fA-F]{6}$|^[a-z]+$"
          example: "#3b82f6"
      responses:
        "200":
          description: Icon retrieved successfully
          headers:
            Cache-Control:
              schema:
                type: string
              example: "public, max-age=86400"
            ETag:
              schema:
                type: string
              example: '"abc123"'
            X-RateLimit-Limit:
              schema:
                type: integer
              example: 60
            X-RateLimit-Remaining:
              schema:
                type: integer
              example: 59
            X-RateLimit-Reset:
              schema:
                type: integer
              example: 1704672000
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/IconResponse"
            image/svg+xml:
              schema:
                type: string
                format: binary
              example: '<svg xmlns="http://www.w3.org/2000/svg">...</svg>'
        "400":
          $ref: "#/components/responses/BadRequest"
        "404":
          $ref: "#/components/responses/NotFound"
        "429":
          $ref: "#/components/responses/RateLimited"
        "500":
          $ref: "#/components/responses/InternalError"

  /search:
    get:
      summary: Search icons
      description: Full-text search across all icons with relevance scoring
      operationId: searchIcons
      tags:
        - Search
      parameters:
        - name: q
          in: query
          required: true
          description: Search query
          schema:
            type: string
            minLength: 2
            maxLength: 100
          example: home
        - name: source
          in: query
          description: Filter by source
          schema:
            type: string
          example: heroicons
        - name: category
          in: query
          description: Filter by category
          schema:
            type: string
          example: navigation
        - name: limit
          in: query
          description: Results per page
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
          example: 20
        - name: offset
          in: query
          description: Pagination offset
          schema:
            type: integer
            minimum: 0
            default: 0
          example: 0
      responses:
        "200":
          description: Search results
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/SearchResponse"
        "400":
          $ref: "#/components/responses/BadRequest"
        "429":
          $ref: "#/components/responses/RateLimited"
        "500":
          $ref: "#/components/responses/InternalError"

  /icons/batch:
    post:
      summary: Batch fetch icons
      description: Fetch multiple icons in a single request. Maximum 50 icons.
      operationId: batchGetIcons
      tags:
        - Icons
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/BatchRequest"
      responses:
        "200":
          description: Batch results
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/BatchResponse"
        "400":
          $ref: "#/components/responses/BadRequest"
        "429":
          $ref: "#/components/responses/RateLimited"
        "500":
          $ref: "#/components/responses/InternalError"

  /sources:
    get:
      summary: List icon sources
      description: Get all available icon libraries with metadata
      operationId: getSources
      tags:
        - Metadata
      responses:
        "200":
          description: List of sources
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/SourcesResponse"
        "500":
          $ref: "#/components/responses/InternalError"

  /categories:
    get:
      summary: List categories
      description: Get all icon categories with counts
      operationId: getCategories
      tags:
        - Metadata
      parameters:
        - name: source
          in: query
          description: Filter by source
          schema:
            type: string
          example: heroicons
      responses:
        "200":
          description: List of categories
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/CategoriesResponse"
        "500":
          $ref: "#/components/responses/InternalError"

  /random:
    get:
      summary: Get random icon
      description: Get a random icon for testing or inspiration
      operationId: getRandomIcon
      tags:
        - Icons
      parameters:
        - name: source
          in: query
          description: Limit to specific source
          schema:
            type: string
          example: heroicons
        - name: category
          in: query
          description: Limit to specific category
          schema:
            type: string
          example: navigation
      responses:
        "200":
          description: Random icon
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/RandomIconResponse"
        "404":
          $ref: "#/components/responses/NotFound"
        "500":
          $ref: "#/components/responses/InternalError"

components:
  schemas:
    Icon:
      type: object
      required:
        - name
        - source
        - svg
      properties:
        name:
          type: string
          description: Icon name
          example: home
        source:
          type: string
          description: Source library
          example: heroicons
        category:
          type: string
          description: Icon category
          example: navigation
        tags:
          type: array
          items:
            type: string
          example: ["house", "main", "index"]
        svg:
          type: string
          description: SVG content
          example: '<svg xmlns="http://www.w3.org/2000/svg">...</svg>'
        variants:
          type: array
          items:
            type: string
          example: ["outline", "solid", "mini"]
        license:
          $ref: "#/components/schemas/License"

    License:
      type: object
      properties:
        type:
          type: string
          example: MIT
        url:
          type: string
          format: uri
          example: https://github.com/tailwindlabs/heroicons/blob/master/LICENSE

    Source:
      type: object
      required:
        - id
        - name
        - icon_count
        - license
      properties:
        id:
          type: string
          example: heroicons
        name:
          type: string
          example: Heroicons
        description:
          type: string
          example: Beautiful hand-crafted SVG icons
        version:
          type: string
          example: "2.1.1"
        icon_count:
          type: integer
          example: 292
        website:
          type: string
          format: uri
          example: https://heroicons.com
        repository:
          type: string
          format: uri
          example: https://github.com/tailwindlabs/heroicons
        license:
          $ref: "#/components/schemas/License"
        variants:
          type: array
          items:
            type: string
          example: ["outline", "solid", "mini"]
        default_variant:
          type: string
          example: outline
        categories:
          type: array
          items:
            type: string
          example: ["navigation", "media", "communication"]

    Category:
      type: object
      required:
        - id
        - name
        - icon_count
      properties:
        id:
          type: string
          example: navigation
        name:
          type: string
          example: Navigation
        description:
          type: string
          example: Arrows, menus, and navigation elements
        icon_count:
          type: integer
          example: 342
        sources:
          type: array
          items:
            type: string
          example: ["heroicons", "lucide", "feather"]

    SearchResult:
      type: object
      required:
        - name
        - source
        - score
      properties:
        name:
          type: string
          example: home
        source:
          type: string
          example: heroicons
        category:
          type: string
          example: navigation
        score:
          type: number
          format: float
          minimum: 0
          maximum: 1
          example: 0.95
        preview_url:
          type: string
          format: uri
          example: https://api.svg-api.org/v1/icons/home?source=heroicons
        matches:
          type: object
          properties:
            name:
              type: boolean
            tags:
              type: array
              items:
                type: string

    BatchIconRequest:
      type: object
      required:
        - name
      properties:
        name:
          type: string
          example: home
        source:
          type: string
          example: heroicons
        size:
          type: integer
          minimum: 8
          maximum: 512
        stroke:
          type: number
          minimum: 0.5
          maximum: 3
        color:
          type: string

    BatchRequest:
      type: object
      required:
        - icons
      properties:
        icons:
          type: array
          minItems: 1
          maxItems: 50
          items:
            $ref: "#/components/schemas/BatchIconRequest"
        defaults:
          type: object
          properties:
            size:
              type: integer
              default: 24
            stroke:
              type: number
              default: 2

    BatchIconResult:
      type: object
      properties:
        success:
          type: boolean
        name:
          type: string
        source:
          type: string
        svg:
          type: string
        category:
          type: string

    Error:
      type: object
      required:
        - code
        - message
      properties:
        code:
          type: string
          example: ICON_NOT_FOUND
        message:
          type: string
          example: Icon 'nonexistent' not found
        details:
          type: object
          additionalProperties: true

    Meta:
      type: object
      properties:
        request_id:
          type: string
          example: req_abc123
        timestamp:
          type: string
          format: date-time
        cached:
          type: boolean
        cache_age:
          type: integer

    PaginationMeta:
      allOf:
        - $ref: "#/components/schemas/Meta"
        - type: object
          properties:
            total:
              type: integer
            limit:
              type: integer
            offset:
              type: integer
            has_more:
              type: boolean

    IconResponse:
      type: object
      properties:
        data:
          $ref: "#/components/schemas/Icon"
        meta:
          $ref: "#/components/schemas/Meta"

    SearchResponse:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: "#/components/schemas/SearchResult"
        meta:
          allOf:
            - $ref: "#/components/schemas/PaginationMeta"
            - type: object
              properties:
                query:
                  type: string
                search_time_ms:
                  type: integer

    BatchResponse:
      type: object
      properties:
        data:
          type: object
          additionalProperties:
            $ref: "#/components/schemas/BatchIconResult"
        errors:
          type: object
          additionalProperties:
            $ref: "#/components/schemas/Error"
        meta:
          allOf:
            - $ref: "#/components/schemas/Meta"
            - type: object
              properties:
                requested:
                  type: integer
                successful:
                  type: integer
                failed:
                  type: integer

    SourcesResponse:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: "#/components/schemas/Source"
        meta:
          allOf:
            - $ref: "#/components/schemas/Meta"
            - type: object
              properties:
                total_sources:
                  type: integer
                total_icons:
                  type: integer

    CategoriesResponse:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: "#/components/schemas/Category"
        meta:
          allOf:
            - $ref: "#/components/schemas/Meta"
            - type: object
              properties:
                total_categories:
                  type: integer

    RandomIconResponse:
      type: object
      properties:
        data:
          allOf:
            - $ref: "#/components/schemas/Icon"
            - type: object
              properties:
                preview_url:
                  type: string
                  format: uri
        meta:
          $ref: "#/components/schemas/Meta"

    ErrorResponse:
      type: object
      properties:
        error:
          $ref: "#/components/schemas/Error"
        meta:
          $ref: "#/components/schemas/Meta"

  responses:
    BadRequest:
      description: Invalid request parameters
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ErrorResponse"
          examples:
            invalid_size:
              summary: Invalid size parameter
              value:
                error:
                  code: INVALID_SIZE
                  message: Size must be between 8 and 512
                  details:
                    provided: 1000
                    min: 8
                    max: 512
                meta:
                  request_id: req_abc123
            invalid_color:
              summary: Invalid color format
              value:
                error:
                  code: INVALID_COLOR
                  message: "Invalid color format. Use hex (#rrggbb) or named color"
                  details:
                    provided: "not-a-color"
                meta:
                  request_id: req_abc123

    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ErrorResponse"
          example:
            error:
              code: ICON_NOT_FOUND
              message: Icon 'nonexistent' not found in source 'heroicons'
              details:
                icon: nonexistent
                source: heroicons
                suggestions: ["search", "magnifying-glass"]
            meta:
              request_id: req_abc123

    RateLimited:
      description: Rate limit exceeded
      headers:
        Retry-After:
          schema:
            type: integer
          example: 60
        X-RateLimit-Limit:
          schema:
            type: integer
          example: 60
        X-RateLimit-Remaining:
          schema:
            type: integer
          example: 0
        X-RateLimit-Reset:
          schema:
            type: integer
          example: 1704672000
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ErrorResponse"
          example:
            error:
              code: RATE_LIMITED
              message: Rate limit exceeded. Please retry after 60 seconds.
              details:
                limit: 60
                window: 60
                retry_after: 60
            meta:
              request_id: req_abc123

    InternalError:
      description: Internal server error
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ErrorResponse"
          example:
            error:
              code: INTERNAL_ERROR
              message: An unexpected error occurred
            meta:
              request_id: req_abc123

  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      description: Optional API key for higher rate limits

security:
  - {}
  - BearerAuth: []
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
// Installation: npm install svg-api

import { SvgApi } from "svg-api";

const client = new SvgApi({
  apiKey: "sk_live_xxxxxxxxxxxxx", // optional
});

// Get single icon
const icon = await client.icons.get("home", {
  source: "heroicons",
  size: 32,
  color: "#3b82f6",
});
console.log(icon.svg);

// Search icons
const results = await client.search("arrow", {
  source: "lucide",
  category: "navigation",
  limit: 20,
});
console.log(`Found ${results.meta.total} icons`);

// Batch fetch
const batch = await client.icons.batch([
  { name: "home", source: "heroicons" },
  { name: "search", source: "lucide" },
  { name: "user", source: "feather" },
]);

for (const [key, icon] of Object.entries(batch.data)) {
  if (icon.success) {
    console.log(`${key}: ${icon.svg.slice(0, 50)}...`);
  }
}

// List sources
const sources = await client.sources.list();
console.log(`${sources.meta.total_sources} sources available`);

// Get categories
const categories = await client.categories.list({ source: "heroicons" });

// Random icon
const random = await client.random({ category: "navigation" });
console.log(`Random icon: ${random.name} from ${random.source}`);
```

### Using Fetch (No SDK)

```javascript
const API_BASE = "https://api.svg-api.org/v1";

// Get icon as JSON
async function getIcon(name, options = {}) {
  const params = new URLSearchParams(options);
  const response = await fetch(`${API_BASE}/icons/${name}?${params}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }

  return response.json();
}

// Get icon as raw SVG
async function getIconSvg(name, options = {}) {
  const params = new URLSearchParams(options);
  const response = await fetch(`${API_BASE}/icons/${name}?${params}`, {
    headers: { Accept: "image/svg+xml" },
  });

  if (!response.ok) {
    throw new Error(`Icon not found: ${name}`);
  }

  return response.text();
}

// Search
async function searchIcons(query, options = {}) {
  const params = new URLSearchParams({ q: query, ...options });
  const response = await fetch(`${API_BASE}/search?${params}`);
  return response.json();
}

// Usage
const icon = await getIcon("home", { source: "heroicons", size: 32 });
const svg = await getIconSvg("home", { source: "heroicons" });
const results = await searchIcons("arrow", { limit: 10 });
```

### Python

```python
# Installation: pip install svg-api

from svg_api import SvgApi

client = SvgApi(api_key="sk_live_xxxxxxxxxxxxx")  # optional

# Get single icon
icon = client.icons.get("home", source="heroicons", size=32, color="#3b82f6")
print(icon.svg)

# Get raw SVG
svg = client.icons.get_svg("home", source="heroicons")
print(svg)

# Search icons
results = client.search("arrow", source="lucide", limit=20)
print(f"Found {results.meta.total} icons")

for result in results.data:
    print(f"- {result.name} ({result.source}): score={result.score}")

# Batch fetch
batch = client.icons.batch([
    {"name": "home", "source": "heroicons"},
    {"name": "search", "source": "lucide"},
    {"name": "user", "source": "feather"},
])

for key, icon in batch.data.items():
    if icon.success:
        print(f"{key}: OK")

for key, error in batch.errors.items():
    print(f"{key}: {error.message}")

# List sources
sources = client.sources.list()
for source in sources.data:
    print(f"{source.name}: {source.icon_count} icons")

# Get categories
categories = client.categories.list(source="heroicons")

# Random icon
random_icon = client.random(category="navigation")
print(f"Random: {random_icon.name} from {random_icon.source}")
```

### Using Requests (No SDK)

```python
import requests

API_BASE = "https://api.svg-api.org/v1"

def get_icon(name: str, **options) -> dict:
    """Get icon with metadata."""
    response = requests.get(
        f"{API_BASE}/icons/{name}",
        params=options,
        headers={"Accept": "application/json"},
    )
    response.raise_for_status()
    return response.json()

def get_icon_svg(name: str, **options) -> str:
    """Get raw SVG content."""
    response = requests.get(
        f"{API_BASE}/icons/{name}",
        params=options,
        headers={"Accept": "image/svg+xml"},
    )
    response.raise_for_status()
    return response.text

def search_icons(query: str, **options) -> dict:
    """Search icons."""
    response = requests.get(
        f"{API_BASE}/search",
        params={"q": query, **options},
    )
    response.raise_for_status()
    return response.json()

def batch_get_icons(icons: list, defaults: dict = None) -> dict:
    """Batch fetch multiple icons."""
    response = requests.post(
        f"{API_BASE}/icons/batch",
        json={"icons": icons, "defaults": defaults or {}},
    )
    response.raise_for_status()
    return response.json()

# Usage
icon = get_icon("home", source="heroicons", size=32)
svg = get_icon_svg("home", source="heroicons")
results = search_icons("arrow", limit=10)
batch = batch_get_icons([
    {"name": "home", "source": "heroicons"},
    {"name": "search", "source": "lucide"},
])
```

### cURL Examples

```bash
# Get icon as JSON
curl -H "Accept: application/json" \
  "https://api.svg-api.org/v1/icons/home?source=heroicons&size=32"

# Get icon as SVG
curl -H "Accept: image/svg+xml" \
  "https://api.svg-api.org/v1/icons/home?source=heroicons" > home.svg

# Get icon with custom color
curl "https://api.svg-api.org/v1/icons/home?source=heroicons&color=%233b82f6"

# Search icons
curl "https://api.svg-api.org/v1/search?q=arrow&source=lucide&limit=10"

# Batch fetch icons
curl -X POST "https://api.svg-api.org/v1/icons/batch" \
  -H "Content-Type: application/json" \
  -d '{
    "icons": [
      {"name": "home", "source": "heroicons"},
      {"name": "search", "source": "lucide"},
      {"name": "user", "source": "feather"}
    ],
    "defaults": {"size": 24}
  }'

# List sources
curl "https://api.svg-api.org/v1/sources"

# List categories
curl "https://api.svg-api.org/v1/categories?source=heroicons"

# Get random icon
curl "https://api.svg-api.org/v1/random?category=navigation"

# With authentication (for higher rate limits)
curl -H "Authorization: Bearer sk_live_xxxxxxxxxxxxx" \
  "https://api.svg-api.org/v1/icons/home?source=heroicons"
```

---

## Caching Strategy

| Endpoint       | Cache-Control            | TTL  |
| -------------- | ------------------------ | ---- |
| `/icons/*`     | `public, max-age=86400`  | 24h  |
| `/search`      | `public, max-age=300`    | 5min |
| `/sources`     | `public, max-age=3600`   | 1h   |
| `/categories`  | `public, max-age=3600`   | 1h   |
| `/random`      | `no-cache`               | 0    |
| `/icons/batch` | `private, max-age=86400` | 24h  |

### ETag Support

All cacheable endpoints return ETags. Use conditional requests to reduce bandwidth:

```bash
# First request - get ETag
curl -i "https://api.svg-api.org/v1/icons/home?source=heroicons"
# ETag: "abc123"

# Subsequent request - use If-None-Match
curl -H "If-None-Match: \"abc123\"" \
  "https://api.svg-api.org/v1/icons/home?source=heroicons"
# Returns 304 Not Modified if unchanged
```

---

## CORS Configuration

The API supports CORS for browser-based applications:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, Accept
Access-Control-Max-Age: 86400
Access-Control-Expose-Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-Request-Id, ETag
```

---

## Changelog

### v1.0.0 (2024-01-07)

- Initial release
- 6 endpoints: icons, search, batch, sources, categories, random
- Support for 20+ icon libraries
- Full OpenAPI 3.0 specification
- JavaScript and Python SDKs
