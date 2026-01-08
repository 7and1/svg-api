# SVG-API Architecture

> Production-ready SVG icon microservice at svg-api.org

**Version**: 1.0.0
**Last Updated**: 2026-01-07
**Status**: Production

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Storage Layer](#2-storage-layer)
3. [Index Design](#3-index-design)
4. [Worker Architecture](#4-worker-architecture)
5. [Build Pipeline](#5-build-pipeline)
6. [Performance Targets](#6-performance-targets)
7. [Security](#7-security)
8. [Monitoring](#8-monitoring)

---

## 1. System Overview

### High-Level Architecture

```
                                    svg-api.org
                                         |
                                         v
+------------------+    +----------------------------------------+
|    Clients       |    |         Cloudflare Edge Network        |
|  (Browser/API)   |--->|  +----------------------------------+  |
+------------------+    |  |         Edge Cache (CDN)         |  |
                        |  |   TTL: 1h (static), 5m (search)  |  |
                        |  +-----------------|----------------+  |
                        |                    | MISS                |
                        |                    v                    |
                        |  +----------------------------------+  |
                        |  |      Cloudflare Worker           |  |
                        |  |   - Request Router               |  |
                        |  |   - Search Engine                |  |
                        |  |   - Response Builder             |  |
                        |  +----------|------------|----------+  |
                        +-------------|------------|-------------+
                                      |            |
                         +------------+            +------------+
                         v                                      v
              +-------------------+                  +-------------------+
              |  Cloudflare KV    |                  |  Cloudflare R2    |
              |  (Index Storage)  |                  |  (SVG Files)      |
              |                   |                  |                   |
              | - Search Index    |                  | - Raw SVGs        |
              | - Inverted Index  |                  | - Optimized SVGs  |
              | - Aliases         |                  | - Icon Metadata   |
              +-------------------+                  +-------------------+
                         ^                                      ^
                         |                                      |
              +----------------------------------------------------------+
              |                  GitHub Actions CI/CD                     |
              |  - Fetch icon sources (Lucide, Heroicons, etc.)          |
              |  - Process & optimize SVGs                                |
              |  - Generate search index                                  |
              |  - Deploy to KV & R2                                      |
              +----------------------------------------------------------+
```

### Component Responsibilities

| Component          | Responsibility                                                    |
| ------------------ | ----------------------------------------------------------------- |
| **Edge Cache**     | First-layer caching, geographic distribution, DDoS protection     |
| **Worker**         | Request routing, search logic, response formatting, cache control |
| **KV**             | Fast key-value lookups for indexes (<1ms read latency)            |
| **R2**             | Object storage for SVG files (S3-compatible, no egress fees)      |
| **GitHub Actions** | Automated builds, icon processing, deployment                     |

### Data Flow

```
Request Flow (Search):
  Client -> Edge -> Worker -> KV (index lookup) -> Worker -> Edge -> Client

Request Flow (Icon Fetch):
  Client -> Edge (HIT) -> Client
  Client -> Edge (MISS) -> Worker -> R2 -> Worker -> Edge -> Client

Build Flow:
  GitHub Actions -> Process Icons -> Generate Index -> Deploy to KV/R2
```

---

## 2. Storage Layer

### Why KV for Index (Not R2)

| Factor             | KV                       | R2                        |
| ------------------ | ------------------------ | ------------------------- |
| **Read Latency**   | <1ms (edge-replicated)   | 10-50ms (single region)   |
| **Max Value Size** | 25MB                     | Unlimited                 |
| **Cost Model**     | Per-read ($0.50/M)       | Per-request + storage     |
| **Consistency**    | Eventually consistent    | Strong                    |
| **Use Case**       | Hot data, frequent reads | Large files, cold storage |

**Decision**: Index (~5MB) requires sub-millisecond reads for search. KV's edge replication ensures low latency globally. R2's higher latency is acceptable for SVG files (cacheable, less frequent).

### KV Structure

```
Key                          Value                    TTL
-----------------------------------------------------------------
index:v1                     {full index JSON}        -
index:meta                   {version, generated}     -
cache:search:{hash}          {search results}         5m
```

### R2 Structure

```
Bucket: svg-api-icons
/
├── lucide/
│   ├── activity.svg
│   ├── airplay.svg
│   └── ...
├── heroicons/
│   ├── outline/
│   │   └── academic-cap.svg
│   └── solid/
│       └── academic-cap.svg
├── simple-icons/
│   └── github.svg
└── _meta/
    ├── manifest.json
    └── checksums.json
```

### Cache Hierarchy

```
Layer 1: Edge Cache (Cloudflare CDN)
├── TTL: 1 hour (static assets)
├── TTL: 5 minutes (search results)
├── Cache Key: URL + Accept header
└── Bypass: Cache-Control: no-cache

Layer 2: Worker Memory (Isolate Cache)
├── LRU cache for hot indexes
├── Max entries: 100
├── TTL: 60 seconds
└── Size limit: 128MB per isolate

Layer 3: KV (Edge-Replicated)
├── Eventual consistency (~60s)
├── Global replication
└── 25MB value limit

Layer 4: R2 (Origin Storage)
├── Single-region storage
├── Strong consistency
└── Source of truth
```

**Cache Hit Flow**:

```
Request -> Edge Cache (95% hit rate)
        -> Worker Memory (hot data)
        -> KV (index data)
        -> R2 (cold SVGs)
```

---

## 3. Index Design

### Full Index Structure

```json
{
  "version": "1.0.0",
  "generated": "2024-01-01T00:00:00Z",
  "stats": {
    "totalIcons": 15000,
    "sources": ["lucide", "heroicons", "simple-icons"],
    "lastUpdated": "2024-01-01T00:00:00Z"
  },
  "icons": {
    "lucide:activity": {
      "name": "activity",
      "source": "lucide",
      "path": "lucide/activity.svg",
      "tags": ["chart", "graph", "pulse", "heartbeat", "monitor"],
      "category": "charts",
      "width": 24,
      "height": 24,
      "viewBox": "0 0 24 24"
    }
  },
  "inverted": {
    "chart": ["lucide:activity", "lucide:bar-chart", "heroicons:chart-bar"],
    "home": ["lucide:home", "heroicons:home", "simple-icons:homebridge"],
    "user": ["lucide:user", "lucide:users", "heroicons:user"]
  },
  "aliases": {
    "house": "home",
    "person": "user",
    "people": "users",
    "graph": "chart",
    "diagram": "chart"
  },
  "synonyms": {
    "search": ["find", "lookup", "magnify", "glass"],
    "settings": ["config", "configuration", "gear", "cog", "preferences"],
    "delete": ["remove", "trash", "bin", "garbage"]
  }
}
```

### Inverted Index Structure

The inverted index maps search terms to icon IDs for O(1) lookup:

```
Term          -> [Icon IDs]
----------------------------------
"arrow"       -> ["lucide:arrow-up", "lucide:arrow-down", ...]
"chart"       -> ["lucide:bar-chart", "heroicons:chart-pie", ...]
"notification"-> ["lucide:bell", "heroicons:bell-alert", ...]
```

**Index Generation Algorithm**:

```typescript
function buildInvertedIndex(icons: Icon[]): InvertedIndex {
  const inverted: Record<string, string[]> = {};

  for (const icon of icons) {
    const terms = extractTerms(icon);
    for (const term of terms) {
      if (!inverted[term]) inverted[term] = [];
      inverted[term].push(icon.id);
    }
  }

  return inverted;
}

function extractTerms(icon: Icon): string[] {
  return [
    ...tokenize(icon.name), // "arrow-up" -> ["arrow", "up"]
    ...icon.tags, // ["direction", "navigation"]
    icon.category, // "arrows"
    icon.source, // "lucide"
  ].map(normalize);
}
```

### Synonym Handling

Synonyms expand search queries to improve recall:

```typescript
function expandQuery(query: string, synonyms: Synonyms): string[] {
  const terms = tokenize(query);
  const expanded = new Set<string>();

  for (const term of terms) {
    expanded.add(term);
    if (synonyms[term]) {
      synonyms[term].forEach((syn) => expanded.add(syn));
    }
  }

  return Array.from(expanded);
}

// Example:
// expandQuery("settings", synonyms)
// -> ["settings", "config", "configuration", "gear", "cog", "preferences"]
```

### Scoring Algorithm

Multi-factor relevance scoring:

```typescript
interface ScoringFactors {
  exactMatch: number; // 100 - Exact name match
  prefixMatch: number; // 50  - Name starts with query
  tagMatch: number; // 30  - Tag contains query
  categoryMatch: number; // 20  - Category matches
  sourceBoost: number; // 10  - Preferred source bonus
  popularityBoost: number; // 5   - Download count factor
}

function calculateScore(
  icon: Icon,
  query: string,
  factors: ScoringFactors,
): number {
  let score = 0;
  const normalizedQuery = normalize(query);
  const normalizedName = normalize(icon.name);

  // Exact match bonus
  if (normalizedName === normalizedQuery) {
    score += factors.exactMatch;
  }

  // Prefix match
  if (normalizedName.startsWith(normalizedQuery)) {
    score += factors.prefixMatch;
  }

  // Tag matches
  const matchingTags = icon.tags.filter((tag) =>
    normalize(tag).includes(normalizedQuery),
  );
  score += matchingTags.length * factors.tagMatch;

  // Category match
  if (normalize(icon.category) === normalizedQuery) {
    score += factors.categoryMatch;
  }

  // Source preference (configurable)
  if (isPreferredSource(icon.source)) {
    score += factors.sourceBoost;
  }

  return score;
}
```

**Default Weights**:

```json
{
  "exactMatch": 100,
  "prefixMatch": 50,
  "tagMatch": 30,
  "categoryMatch": 20,
  "sourceBoost": 10,
  "popularityBoost": 5
}
```

---

## 4. Worker Architecture

### Request Routing

```typescript
// src/router.ts
export async function handleRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // Route matching
  const routes: Route[] = [
    { pattern: /^\/api\/search$/, handler: handleSearch },
    { pattern: /^\/api\/icon\/(.+)$/, handler: handleIcon },
    { pattern: /^\/api\/icons$/, handler: handleList },
    { pattern: /^\/api\/sources$/, handler: handleSources },
    { pattern: /^\/health$/, handler: handleHealth },
    { pattern: /^\/$/, handler: handleDocs },
  ];

  for (const route of routes) {
    const match = path.match(route.pattern);
    if (match) {
      return route.handler(request, env, match);
    }
  }

  return new Response("Not Found", { status: 404 });
}
```

### API Endpoints

```
GET /api/search?q={query}&limit={n}&source={source}
  -> Search icons by query
  -> Returns: { results: Icon[], total: number, took: number }

GET /api/icon/{source}/{name}
  -> Fetch single SVG icon
  -> Returns: SVG content (image/svg+xml)

GET /api/icon/{source}/{name}?format=json
  -> Fetch icon metadata
  -> Returns: { icon: Icon, svg: string }

GET /api/icons?source={source}&category={category}&page={n}
  -> List icons with pagination
  -> Returns: { icons: Icon[], total: number, page: number }

GET /api/sources
  -> List available icon sources
  -> Returns: { sources: Source[] }

GET /health
  -> Health check endpoint
  -> Returns: { status: "ok", version: string }
```

### Search Algorithm

```typescript
// src/search.ts
export async function search(
  query: string,
  options: SearchOptions,
  env: Env,
): Promise<SearchResult> {
  const startTime = Date.now();

  // 1. Normalize and validate query
  const normalizedQuery = normalizeQuery(query);
  if (!normalizedQuery || normalizedQuery.length < 2) {
    return { results: [], total: 0, took: 0 };
  }

  // 2. Check cache
  const cacheKey = buildCacheKey(normalizedQuery, options);
  const cached = await env.KV.get(cacheKey, "json");
  if (cached) {
    return { ...cached, fromCache: true };
  }

  // 3. Load index (with memory cache)
  const index = await getIndex(env);

  // 4. Expand query with synonyms and aliases
  const expandedTerms = expandQuery(
    normalizedQuery,
    index.aliases,
    index.synonyms,
  );

  // 5. Find candidates from inverted index
  const candidates = new Set<string>();
  for (const term of expandedTerms) {
    const matches = index.inverted[term] || [];
    matches.forEach((id) => candidates.add(id));

    // Prefix matching for partial queries
    for (const [indexTerm, ids] of Object.entries(index.inverted)) {
      if (indexTerm.startsWith(term)) {
        ids.forEach((id) => candidates.add(id));
      }
    }
  }

  // 6. Score and rank results
  const scored = Array.from(candidates)
    .map((id) => ({
      icon: index.icons[id],
      score: calculateScore(index.icons[id], normalizedQuery),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  // 7. Apply filters
  let filtered = scored;
  if (options.source) {
    filtered = filtered.filter((item) => item.icon.source === options.source);
  }

  // 8. Paginate
  const limit = Math.min(options.limit || 20, 100);
  const results = filtered.slice(0, limit).map((item) => item.icon);

  // 9. Cache results
  const result = {
    results,
    total: filtered.length,
    took: Date.now() - startTime,
  };

  await env.KV.put(cacheKey, JSON.stringify(result), { expirationTtl: 300 });

  return result;
}
```

### Caching Strategy

```typescript
// src/cache.ts

// In-memory LRU cache for hot data
const memoryCache = new LRUCache<string, any>({
  max: 100,
  ttl: 60 * 1000, // 60 seconds
});

export async function getIndex(env: Env): Promise<Index> {
  const cacheKey = "index:v1";

  // L1: Memory cache
  const memoryCached = memoryCache.get(cacheKey);
  if (memoryCached) {
    return memoryCached;
  }

  // L2: KV
  const kvCached = await env.KV.get(cacheKey, "json");
  if (kvCached) {
    memoryCache.set(cacheKey, kvCached);
    return kvCached;
  }

  // L3: R2 (fallback)
  const r2Object = await env.R2.get("_meta/index.json");
  if (r2Object) {
    const index = await r2Object.json();
    await env.KV.put(cacheKey, JSON.stringify(index));
    memoryCache.set(cacheKey, index);
    return index;
  }

  throw new Error("Index not found");
}

// Response caching headers
export function getCacheHeaders(
  type: "static" | "dynamic" | "search",
): Headers {
  const headers = new Headers();

  switch (type) {
    case "static":
      headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400");
      headers.set("CDN-Cache-Control", "public, max-age=86400");
      break;
    case "dynamic":
      headers.set("Cache-Control", "public, max-age=60, s-maxage=300");
      break;
    case "search":
      headers.set("Cache-Control", "public, max-age=60, s-maxage=300");
      headers.set("Vary", "Accept, Accept-Encoding");
      break;
  }

  return headers;
}
```

### Error Handling

```typescript
// src/errors.ts

export class APIError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function handleError(error: unknown): Response {
  console.error("Request error:", error);

  if (error instanceof APIError) {
    return new Response(
      JSON.stringify({
        error: {
          code: error.code,
          message: error.message,
        },
      }),
      {
        status: error.statusCode,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Unknown error
  return new Response(
    JSON.stringify({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    }),
    {
      status: 500,
      headers: { "Content-Type": "application/json" },
    },
  );
}

// Error codes
export const ErrorCodes = {
  INVALID_QUERY: { status: 400, code: "INVALID_QUERY" },
  ICON_NOT_FOUND: { status: 404, code: "ICON_NOT_FOUND" },
  SOURCE_NOT_FOUND: { status: 404, code: "SOURCE_NOT_FOUND" },
  RATE_LIMITED: { status: 429, code: "RATE_LIMITED" },
  INTERNAL_ERROR: { status: 500, code: "INTERNAL_ERROR" },
};
```

---

## 5. Build Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/build-and-deploy.yml
name: Build and Deploy

on:
  schedule:
    - cron: "0 0 * * *" # Daily at midnight UTC
  push:
    branches: [main]
  workflow_dispatch:

env:
  NODE_VERSION: "20"

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Fetch icon sources
        run: |
          npm run fetch:lucide
          npm run fetch:heroicons
          npm run fetch:simple-icons

      - name: Process icons
        run: npm run process:icons

      - name: Optimize SVGs
        run: npm run optimize:svgs

      - name: Generate index
        run: npm run generate:index

      - name: Validate index
        run: npm run validate:index

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: |
            dist/icons/
            dist/index.json
          retention-days: 7

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Download artifacts
        uses: actions/download-artifact@v4
        with:
          name: build-output
          path: dist/

      - name: Deploy to R2
        env:
          CF_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
          CF_ACCOUNT_ID: ${{ secrets.CF_ACCOUNT_ID }}
        run: |
          npx wrangler r2 object put svg-api-icons/ \
            --file dist/icons/ \
            --recursive

      - name: Deploy index to KV
        env:
          CF_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
          CF_ACCOUNT_ID: ${{ secrets.CF_ACCOUNT_ID }}
        run: |
          npx wrangler kv:key put index:v1 \
            --binding SVG_INDEX \
            --path dist/index.json

      - name: Deploy Worker
        env:
          CF_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
        run: npx wrangler deploy

      - name: Purge cache
        run: |
          curl -X POST "https://api.cloudflare.com/client/v4/zones/${{ secrets.CF_ZONE_ID }}/purge_cache" \
            -H "Authorization: Bearer ${{ secrets.CF_API_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d '{"purge_everything":true}'

      - name: Health check
        run: |
          sleep 10
          curl -f https://svg-api.org/health || exit 1
```

### Icon Processing Steps

```typescript
// scripts/process-icons.ts

import { optimize } from "svgo";
import { parse } from "svg-parser";

interface ProcessingPipeline {
  fetch(): Promise<RawIcon[]>;
  validate(icon: RawIcon): boolean;
  normalize(icon: RawIcon): NormalizedIcon;
  optimize(svg: string): string;
  extract(svg: string): IconMetadata;
}

// Step 1: Fetch from sources
async function fetchIcons(): Promise<RawIcon[]> {
  const sources = [
    { name: "lucide", url: "https://github.com/lucide-icons/lucide" },
    { name: "heroicons", url: "https://github.com/tailwindlabs/heroicons" },
    {
      name: "simple-icons",
      url: "https://github.com/simple-icons/simple-icons",
    },
  ];

  const icons: RawIcon[] = [];
  for (const source of sources) {
    const fetched = await fetchFromSource(source);
    icons.push(...fetched);
  }

  return icons;
}

// Step 2: Validate SVGs
function validateIcon(icon: RawIcon): boolean {
  const checks = [
    () => icon.svg.includes("<svg"),
    () => !icon.svg.includes("<script"),
    () => icon.svg.length < 50000,
    () => /viewBox="[^"]+"/.test(icon.svg),
  ];

  return checks.every((check) => check());
}

// Step 3: Normalize structure
function normalizeIcon(icon: RawIcon): NormalizedIcon {
  return {
    id: `${icon.source}:${icon.name}`,
    name: icon.name.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
    source: icon.source,
    path: `${icon.source}/${icon.name}.svg`,
    tags: extractTags(icon),
    category: detectCategory(icon),
    ...extractDimensions(icon.svg),
  };
}

// Step 4: Optimize with SVGO
function optimizeSvg(svg: string): string {
  const result = optimize(svg, {
    multipass: true,
    plugins: [
      "preset-default",
      "removeDimensions",
      {
        name: "addAttributesToSVGElement",
        params: {
          attributes: [{ fill: "currentColor" }],
        },
      },
    ],
  });

  return result.data;
}

// Step 5: Extract metadata
function extractMetadata(svg: string): IconMetadata {
  const parsed = parse(svg);
  const svgNode = parsed.children[0];

  return {
    viewBox: svgNode.properties.viewBox,
    width: parseInt(svgNode.properties.width) || 24,
    height: parseInt(svgNode.properties.height) || 24,
  };
}
```

### Index Generation

```typescript
// scripts/generate-index.ts

async function generateIndex(icons: NormalizedIcon[]): Promise<Index> {
  const index: Index = {
    version: "1.0.0",
    generated: new Date().toISOString(),
    stats: {
      totalIcons: icons.length,
      sources: [...new Set(icons.map((i) => i.source))],
      lastUpdated: new Date().toISOString(),
    },
    icons: {},
    inverted: {},
    aliases: loadAliases(),
    synonyms: loadSynonyms(),
  };

  // Build icons map
  for (const icon of icons) {
    index.icons[icon.id] = icon;
  }

  // Build inverted index
  for (const icon of icons) {
    const terms = extractSearchTerms(icon);
    for (const term of terms) {
      if (!index.inverted[term]) {
        index.inverted[term] = [];
      }
      index.inverted[term].push(icon.id);
    }
  }

  // Sort inverted index entries by icon name
  for (const term of Object.keys(index.inverted)) {
    index.inverted[term].sort();
  }

  return index;
}

function extractSearchTerms(icon: NormalizedIcon): string[] {
  const terms = new Set<string>();

  // From name: "arrow-up-right" -> ["arrow", "up", "right"]
  icon.name.split("-").forEach((t) => terms.add(t));

  // From tags
  icon.tags.forEach((t) => terms.add(t.toLowerCase()));

  // From category
  if (icon.category) {
    terms.add(icon.category.toLowerCase());
  }

  // Source as searchable term
  terms.add(icon.source);

  return Array.from(terms).filter((t) => t.length >= 2);
}
```

---

## 6. Performance Targets

### Latency SLOs

| Metric             | Target | Measurement      |
| ------------------ | ------ | ---------------- |
| **p50 latency**    | <20ms  | Edge to client   |
| **p95 latency**    | <50ms  | Edge to client   |
| **p99 latency**    | <100ms | Edge to client   |
| **Search p50**     | <30ms  | Query processing |
| **Icon fetch p50** | <15ms  | With edge cache  |

### Throughput

| Metric                | Target          |
| --------------------- | --------------- |
| **Requests/second**   | 10,000+         |
| **Concurrent users**  | 1,000+          |
| **Index size**        | <10MB           |
| **Max response time** | 500ms (timeout) |

### Cache Performance

| Metric                    | Target |
| ------------------------- | ------ |
| **Edge cache hit rate**   | >95%   |
| **KV read latency**       | <5ms   |
| **R2 read latency**       | <50ms  |
| **Memory cache hit rate** | >80%   |

### Optimization Strategies

```typescript
// 1. Preload critical data
addEventListener("fetch", (event) => {
  // Warm up index on first request
  event.waitUntil(warmupIndex(event.request));
});

// 2. Use streaming responses for large payloads
async function streamIcons(icons: Icon[]): Response {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  (async () => {
    await writer.write(encoder.encode("["));
    for (let i = 0; i < icons.length; i++) {
      if (i > 0) await writer.write(encoder.encode(","));
      await writer.write(encoder.encode(JSON.stringify(icons[i])));
    }
    await writer.write(encoder.encode("]"));
    await writer.close();
  })();

  return new Response(readable, {
    headers: { "Content-Type": "application/json" },
  });
}

// 3. Early hints for predictable requests
function addEarlyHints(response: Response, hints: string[]): Response {
  const linkHeader = hints.map((h) => `<${h}>; rel=preload`).join(", ");
  response.headers.set("Link", linkHeader);
  return response;
}
```

---

## 7. Security

### Rate Limiting

```typescript
// src/rate-limit.ts

interface RateLimitConfig {
  requests: number; // Max requests
  window: number; // Time window in seconds
  keyPrefix: string; // KV key prefix
}

const limits: Record<string, RateLimitConfig> = {
  search: { requests: 100, window: 60, keyPrefix: "rl:search:" },
  icon: { requests: 500, window: 60, keyPrefix: "rl:icon:" },
  global: { requests: 1000, window: 60, keyPrefix: "rl:global:" },
};

export async function checkRateLimit(
  request: Request,
  type: keyof typeof limits,
  env: Env,
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  const config = limits[type];
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const key = `${config.keyPrefix}${ip}`;

  const current = (await env.KV.get(key, "json")) as {
    count: number;
    reset: number;
  } | null;
  const now = Math.floor(Date.now() / 1000);

  if (!current || current.reset < now) {
    // New window
    const data = { count: 1, reset: now + config.window };
    await env.KV.put(key, JSON.stringify(data), {
      expirationTtl: config.window,
    });
    return { allowed: true, remaining: config.requests - 1, reset: data.reset };
  }

  if (current.count >= config.requests) {
    return { allowed: false, remaining: 0, reset: current.reset };
  }

  // Increment counter
  current.count++;
  await env.KV.put(key, JSON.stringify(current), {
    expirationTtl: current.reset - now,
  });

  return {
    allowed: true,
    remaining: config.requests - current.count,
    reset: current.reset,
  };
}

// Response headers for rate limit info
export function addRateLimitHeaders(
  response: Response,
  info: { remaining: number; reset: number },
): Response {
  response.headers.set("X-RateLimit-Remaining", info.remaining.toString());
  response.headers.set("X-RateLimit-Reset", info.reset.toString());
  return response;
}
```

### CORS Policy

```typescript
// src/cors.ts

const ALLOWED_ORIGINS = [
  "https://svg-api.org",
  /^https:\/\/.*\.svg-api\.org$/,
  /^http:\/\/localhost:\d+$/,
];

export function handleCORS(request: Request): Headers {
  const origin = request.headers.get("Origin");
  const headers = new Headers();

  // Check if origin is allowed
  const isAllowed = ALLOWED_ORIGINS.some((allowed) => {
    if (typeof allowed === "string") return allowed === origin;
    return allowed.test(origin || "");
  });

  if (isAllowed && origin) {
    headers.set("Access-Control-Allow-Origin", origin);
  } else {
    headers.set("Access-Control-Allow-Origin", "*");
  }

  headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Accept");
  headers.set("Access-Control-Max-Age", "86400");

  return headers;
}

// Preflight handler
export function handlePreflight(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: handleCORS(request),
  });
}
```

### Input Validation

```typescript
// src/validation.ts

import { z } from "zod";

// Search query validation
const searchSchema = z.object({
  q: z
    .string()
    .min(1, "Query required")
    .max(100, "Query too long")
    .regex(/^[\w\s\-]+$/, "Invalid characters"),
  limit: z.coerce.number().min(1).max(100).default(20),
  source: z.enum(["lucide", "heroicons", "simple-icons"]).optional(),
  category: z.string().max(50).optional(),
});

// Icon path validation
const iconPathSchema = z.object({
  source: z.enum(["lucide", "heroicons", "simple-icons"]),
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9\-]+$/, "Invalid icon name"),
});

export function validateSearchQuery(url: URL): SearchQuery {
  const params = Object.fromEntries(url.searchParams);
  return searchSchema.parse(params);
}

export function validateIconPath(path: string): IconPath {
  const match = path.match(/^\/api\/icon\/([^/]+)\/([^/]+)$/);
  if (!match) throw new Error("Invalid path");
  return iconPathSchema.parse({ source: match[1], name: match[2] });
}

// SVG sanitization (for any user-uploaded content)
export function sanitizeSvg(svg: string): string {
  const dangerous = [
    /<script/gi,
    /javascript:/gi,
    /on\w+=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
  ];

  for (const pattern of dangerous) {
    if (pattern.test(svg)) {
      throw new Error("Potentially dangerous SVG content");
    }
  }

  return svg;
}
```

### Security Headers

```typescript
// src/security.ts

export function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);

  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-XSS-Protection", "1; mode=block");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "interest-cohort=()");

  // CSP for SVG responses
  if (response.headers.get("Content-Type")?.includes("svg")) {
    headers.set(
      "Content-Security-Policy",
      "default-src 'none'; style-src 'unsafe-inline'",
    );
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
```

---

## 8. Monitoring

### Cloudflare Analytics

Built-in metrics available in Cloudflare dashboard:

- **Requests**: Total, cached, uncached
- **Bandwidth**: Data transferred
- **Threats**: Blocked attacks
- **Performance**: Latency percentiles
- **Errors**: 4xx, 5xx breakdown

### Custom Metrics

```typescript
// src/metrics.ts

interface Metrics {
  searchQueries: number;
  searchLatency: number[];
  iconFetches: number;
  cacheHits: number;
  cacheMisses: number;
  errors: Record<string, number>;
}

// Using Cloudflare Analytics Engine
export async function recordMetric(
  env: Env,
  name: string,
  value: number,
  tags: Record<string, string> = {},
): Promise<void> {
  env.ANALYTICS?.writeDataPoint({
    blobs: [name, JSON.stringify(tags)],
    doubles: [value],
    indexes: [name],
  });
}

// Structured logging
export function log(
  level: "info" | "warn" | "error",
  message: string,
  context: Record<string, unknown> = {},
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };

  console[level](JSON.stringify(entry));
}

// Request tracing
export function traceRequest(request: Request): string {
  const traceId = request.headers.get("CF-Ray") || crypto.randomUUID();
  return traceId;
}

// Performance timing
export function timing(name: string): () => void {
  const start = performance.now();
  return () => {
    const duration = performance.now() - start;
    log("info", `Timing: ${name}`, { duration });
  };
}
```

### Health Checks

```typescript
// src/health.ts

interface HealthStatus {
  status: "ok" | "degraded" | "down";
  version: string;
  timestamp: string;
  checks: {
    kv: CheckResult;
    r2: CheckResult;
    index: CheckResult;
  };
}

interface CheckResult {
  status: "pass" | "fail";
  latency?: number;
  message?: string;
}

export async function healthCheck(env: Env): Promise<HealthStatus> {
  const checks = await Promise.all([
    checkKV(env),
    checkR2(env),
    checkIndex(env),
  ]);

  const [kv, r2, index] = checks;
  const allPassing = checks.every((c) => c.status === "pass");

  return {
    status: allPassing ? "ok" : "degraded",
    version: env.VERSION || "1.0.0",
    timestamp: new Date().toISOString(),
    checks: { kv, r2, index },
  };
}

async function checkKV(env: Env): Promise<CheckResult> {
  const start = Date.now();
  try {
    await env.KV.get("health-check");
    return { status: "pass", latency: Date.now() - start };
  } catch (e) {
    return { status: "fail", message: e.message };
  }
}

async function checkR2(env: Env): Promise<CheckResult> {
  const start = Date.now();
  try {
    await env.R2.head("_meta/manifest.json");
    return { status: "pass", latency: Date.now() - start };
  } catch (e) {
    return { status: "fail", message: e.message };
  }
}

async function checkIndex(env: Env): Promise<CheckResult> {
  const start = Date.now();
  try {
    const index = await env.KV.get("index:v1", "json");
    if (!index) throw new Error("Index not found");
    return { status: "pass", latency: Date.now() - start };
  } catch (e) {
    return { status: "fail", message: e.message };
  }
}
```

### Alerting

Configure Cloudflare notifications for:

| Alert             | Condition               | Action             |
| ----------------- | ----------------------- | ------------------ |
| High Error Rate   | 5xx > 1% for 5 min      | Page on-call       |
| High Latency      | p95 > 200ms for 5 min   | Slack notification |
| Worker Exception  | Any unhandled exception | Email + Sentry     |
| Rate Limit Spike  | Rate limits > 1000/min  | Slack notification |
| Health Check Fail | /health returns non-200 | Page on-call       |

```yaml
# Example: Cloudflare notification policy (via API)
{
  "name": "High Error Rate",
  "alert_type": "workers_error_rate",
  "enabled": true,
  "mechanisms":
    {
      "email": [{ "id": "team@company.com" }],
      "pagerduty": [{ "id": "PD_SERVICE_ID" }],
    },
  "filters": { "error_rate": ">= 0.01", "duration": "5m" },
}
```

---

## Appendix A: Configuration

### wrangler.toml

```toml
name = "svg-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
VERSION = "1.0.0"
ENVIRONMENT = "production"

[[kv_namespaces]]
binding = "KV"
id = "xxx"

[[r2_buckets]]
binding = "R2"
bucket_name = "svg-api-icons"

[analytics_engine_datasets]
binding = "ANALYTICS"

[triggers]
crons = ["0 */6 * * *"]  # Refresh index every 6 hours
```

### Environment Variables

| Variable        | Description             | Required |
| --------------- | ----------------------- | -------- |
| `CF_API_TOKEN`  | Cloudflare API token    | Yes      |
| `CF_ACCOUNT_ID` | Cloudflare account ID   | Yes      |
| `CF_ZONE_ID`    | Zone ID for cache purge | Yes      |
| `SENTRY_DSN`    | Sentry error tracking   | No       |

---

## Appendix B: API Reference

### Search Icons

```http
GET /api/search?q=arrow&limit=20&source=lucide
```

**Response**:

```json
{
  "results": [
    {
      "id": "lucide:arrow-up",
      "name": "arrow-up",
      "source": "lucide",
      "path": "lucide/arrow-up.svg",
      "tags": ["arrow", "up", "direction"],
      "category": "arrows"
    }
  ],
  "total": 42,
  "took": 12
}
```

### Get Icon

```http
GET /api/icon/lucide/arrow-up
Accept: image/svg+xml
```

**Response**: Raw SVG content

### Get Icon with Metadata

```http
GET /api/icon/lucide/arrow-up?format=json
```

**Response**:

```json
{
  "icon": {
    "id": "lucide:arrow-up",
    "name": "arrow-up",
    "source": "lucide",
    "tags": ["arrow", "up"]
  },
  "svg": "<svg>...</svg>"
}
```

---

## Appendix C: Deployment Checklist

- [ ] Configure Cloudflare account and zone
- [ ] Create KV namespace
- [ ] Create R2 bucket
- [ ] Set up GitHub secrets
- [ ] Deploy Worker
- [ ] Run initial build pipeline
- [ ] Verify health check endpoint
- [ ] Configure custom domain
- [ ] Enable analytics
- [ ] Set up alerting
- [ ] Test rate limiting
- [ ] Verify CORS configuration
- [ ] Performance benchmark

---

_Document generated: 2026-01-07_
