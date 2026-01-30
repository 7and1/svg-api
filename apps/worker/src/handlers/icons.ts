import type { Context } from "hono";
import type { Env } from "../env";
import type { IconVariant } from "@svg-api/shared/types";
import { DEFAULT_CACHE_TTL_ICON } from "@svg-api/shared/constants";
import { getIndex, getIndexWithETag } from "../services/kv";
import { getIconFromR2 } from "../services/r2";
import { transformSvg, transformSvgAdvanced, generateETag } from "../utils/transform";
import { errorResponse, jsonResponse } from "../utils/response";
import {
  parseColor,
  parseSize,
  parseStrokeWidth,
  parseRotate,
  parseMirror,
  nameSchema,
  sourceSchema,
} from "../utils/validation";
import { SOURCE_CONFIG } from "../data/sources";
import {
  resolveVariant,
  getAvailableVariants,
  normalizeVariant,
} from "../services/variants";
import { MemoryCache } from "../services/cache";
import { metrics } from "../utils/metrics";

const DEFAULT_SOURCE = "lucide";

// Memory cache for transformed SVGs (Worker instance level)
const transformedSvgCache = new MemoryCache<string>(500);
const TRANSFORM_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Cache control constants with stale-while-revalidate
const CACHE_MAX_AGE = DEFAULT_CACHE_TTL_ICON;
const CACHE_STALE_WHILE_REVALIDATE = 86400; // 24 hours
const CACHE_IMMUTABLE = true;

/**
 * Generate Cache-Tag headers for cache invalidation
 * - icon:{source}:{name} - specific icon
 * - source:{source} - all icons from source
 * - variant:{variant} - all icons with variant
 */
const generateCacheTags = (
  source: string,
  name: string,
  variant: string
): string[] => {
  return [
    `icon:${source}:${name}`,
    `source:${source}`,
    `variant:${variant}`,
  ];
};

/**
 * Build Cache-Control header with stale-while-revalidate
 */
const buildCacheControl = (
  maxAge: number,
  staleWhileRevalidate: number,
  immutable: boolean
): string => {
  let value = `public, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`;
  if (immutable) {
    value += ", immutable";
  }
  return value;
};

// In-flight request deduplication for icon generation
interface PendingIconRequest {
  promise: Promise<Response>;
  timestamp: number;
}

const pendingIconRequests = new Map<string, PendingIconRequest>();
const PENDING_REQUEST_TIMEOUT_MS = 30_000;

// Cleanup stale pending requests
const cleanupStalePendingRequests = (): void => {
  const now = Date.now();
  for (const [key, request] of pendingIconRequests.entries()) {
    if (now - request.timestamp > PENDING_REQUEST_TIMEOUT_MS) {
      pendingIconRequests.delete(key);
    }
  }
};

// Note: setInterval not allowed in Workers global scope
// Cleanup happens lazily on each request instead

/**
 * Generate cache key for edge cache
 */
const getEdgeCacheKey = (
  url: string,
  source: string,
  name: string,
  variant: string,
  size: number,
  strokeWidth: number,
  color: string,
  rotate: number | undefined,
  mirror: boolean | undefined,
  className: string | undefined,
) => {
  const params = new URLSearchParams({
    s: source,
    n: name,
    v: variant,
    sz: String(size),
    sw: String(strokeWidth),
    c: color,
  });
  if (rotate !== undefined) params.set("r", String(rotate));
  if (mirror) params.set("m", "1");
  if (className) params.set("cls", className);
  return new Request(`${url}?${params.toString()}`);
};

/**
 * Generate deduplication key for icon requests
 */
const getDedupKey = (
  source: string,
  name: string,
  variant: string,
  size: number,
  strokeWidth: number,
  color: string,
  rotate: number | undefined,
  mirror: boolean | undefined,
  className: string | undefined,
  format: string | undefined,
): string => {
  return `${source}:${name}:${variant}:${size}:${strokeWidth}:${color}:${rotate ?? ''}:${mirror ?? ''}:${className ?? ''}:${format ?? 'svg'}`;
};

/**
 * Generate memory cache key for transformed SVGs
 */
const getTransformCacheKey = (
  source: string,
  name: string,
  variant: string,
  size: number,
  strokeWidth: number,
  color: string,
  rotate: number | undefined,
  mirror: boolean | undefined,
  className: string | undefined,
): string => {
  return `${source}:${name}:${variant}:${size}:${strokeWidth}:${color}:${rotate ?? ''}:${mirror ?? ''}:${className ?? ''}`;
};

/**
 * Get suggestions for similar icons
 */
const getSuggestions = (
  icons: Record<string, { name: string; source: string }>,
  name: string,
  source?: string,
) => {
  const suggestions: string[] = [];
  const lower = name.toLowerCase();
  for (const icon of Object.values(icons)) {
    if (source && icon.source !== source) continue;
    if (icon.name.includes(lower)) {
      suggestions.push(icon.name);
      if (suggestions.length >= 5) break;
    }
  }
  return suggestions;
};

/**
 * Main icon handler with multi-tier caching
 */
export const iconHandler = async (c: Context<{ Bindings: Env }>) => {
  const requestStartTime = performance.now();

  const params = c.req.param();
  const name = params.name?.toLowerCase();
  const source = (
    params.source ??
    c.req.query("source") ??
    DEFAULT_SOURCE
  ).toLowerCase();

  // Validate inputs
  const nameParsed = nameSchema.safeParse(name);
  if (!nameParsed.success || !name) {
    return errorResponse(c, "INVALID_PARAMETER", "Invalid icon name", 400, {
      name,
    });
  }

  const sourceParsed = sourceSchema.safeParse(source);
  if (!sourceParsed.success) {
    return errorResponse(c, "INVALID_PARAMETER", "Invalid source name", 400, {
      source,
    });
  }

  // Parse variant parameter
  const variantParam = c.req.query("variant");
  const variant = variantParam ? normalizeVariant(variantParam) : "default";
  const availableVariants = getAvailableVariants(source);

  if (variant !== "default" && !availableVariants.includes(variant as IconVariant)) {
    return errorResponse(
      c,
      "VARIANT_NOT_AVAILABLE",
      `Variant '${variant}' not available for source '${source}'. Available variants: ${availableVariants.join(", ")}`,
      400,
      {
        source,
        requestedVariant: variant,
        availableVariants,
      },
    );
  }

  // Parse and validate parameters
  const size = parseSize(c.req.query("size"));
  if (!size) {
    return errorResponse(
      c,
      "INVALID_SIZE",
      "Size must be between 8 and 512",
      400,
    );
  }

  const strokeWidth = parseStrokeWidth(
    c.req.query("stroke") ?? c.req.query("stroke-width"),
  );
  if (!strokeWidth) {
    return errorResponse(
      c,
      "INVALID_PARAMETER",
      "Stroke width must be between 0.5 and 3",
      400,
    );
  }

  const color = parseColor(c.req.query("color"));
  if (!color) {
    return errorResponse(c, "INVALID_COLOR", "Invalid color format", 400);
  }

  // Parse advanced transform parameters
  const rotate = parseRotate(c.req.query("rotate"));
  const mirror = parseMirror(c.req.query("mirror"));
  const className = c.req.query("class") ?? undefined;

  // Collect custom attributes from query params (format: data-attr=value)
  const customAttributes: Record<string, string> = {};
  for (const [key, value] of Object.entries(c.req.query())) {
    if (key.startsWith("data-") && value) {
      customAttributes[key] = value;
    }
  }

  const format = c.req.query("format");
  if (format && format !== "svg") {
    return errorResponse(
      c,
      "INVALID_PARAMETER",
      "Only svg format is supported",
      400,
      { format },
    );
  }

  // Determine response type
  const accept = c.req.header("Accept") ?? "";
  const wantsSvg = accept.includes("image/svg+xml") || format === "svg";

  // Generate deduplication key
  const dedupKey = getDedupKey(
    source, name, variant, size, strokeWidth, color,
    rotate, mirror, className, format
  );

  // Check for in-flight request (request deduplication)
  const pendingRequest = pendingIconRequests.get(dedupKey);
  if (pendingRequest) {
    metrics.recordDedupHit('icon_handler', dedupKey);
    const response = await pendingRequest.promise;
    // Clone response to avoid shared body issues
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }

  // Create the request promise for deduplication
  const requestPromise = handleIconRequest(c, {
    source, name, variant, size, strokeWidth, color,
    rotate, mirror, className, customAttributes, wantsSvg,
    requestStartTime
  });

  pendingIconRequests.set(dedupKey, {
    promise: requestPromise,
    timestamp: Date.now(),
  });

  try {
    const response = await requestPromise;
    return response;
  } finally {
    pendingIconRequests.delete(dedupKey);
  }
};

/**
 * Internal handler for icon requests (separated for deduplication)
 */
interface IconRequestParams {
  source: string;
  name: string;
  variant: string;
  size: number;
  strokeWidth: number;
  color: string;
  rotate: number | undefined;
  mirror: boolean | undefined;
  className: string | undefined;
  customAttributes: Record<string, string>;
  wantsSvg: boolean;
  requestStartTime: number;
}

async function handleIconRequest(
  c: Context<{ Bindings: Env }>,
  params: IconRequestParams
): Promise<Response> {
  const {
    source, name, variant, size, strokeWidth, color,
    rotate, mirror, className, customAttributes, wantsSvg, requestStartTime
  } = params;

  // Tier 1: Edge Cache (Cloudflare Cache API) - Global
  const cache = (caches as unknown as { default: Cache }).default;
  const baseUrl = c.req.url.split("?")[0] || c.req.url;
  const cacheKey = getEdgeCacheKey(
    baseUrl, source, name, variant, size, strokeWidth, color,
    rotate, mirror, className
  );

  if (wantsSvg) {
    const edgeStartTime = performance.now();
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      metrics.recordCacheHit('edge', 'icon');
      metrics.recordLatency('edge', 'get', performance.now() - edgeStartTime);

      const response = new Response(cachedResponse.body, cachedResponse);
      response.headers.set("X-Cache", "HIT");
      response.headers.set("X-Cache-Layer", "edge");
      // Add cache tags to edge cache hit responses
      addCacheHeaders(response, source, name, variant, cachedResponse.headers.get("ETag") || "");
      addTimingHeaders(response, requestStartTime);
      return response;
    }
    metrics.recordCacheMiss('edge', 'icon');
  }

  // Tier 2: Memory Cache (LRU) - Worker instance level
  const memCacheKey = getTransformCacheKey(
    source, name, variant, size, strokeWidth, color,
    rotate, mirror, className
  );

  if (wantsSvg) {
    const memStartTime = performance.now();
    const memCached = transformedSvgCache.get(memCacheKey);
    if (memCached) {
      metrics.recordCacheHit('memory', 'icon');
      metrics.recordLatency('memory', 'get', performance.now() - memStartTime);

      const etag = generateETag(memCached);
      const ifNoneMatch = c.req.header("If-None-Match");

      if (ifNoneMatch && ifNoneMatch === etag) {
        const response = new Response(null, {
          status: 304,
          headers: {
            "ETag": etag,
            "X-Cache": "HIT",
            "X-Cache-Layer": "memory",
            "X-Response-Time": `${Math.round(performance.now() - requestStartTime)}ms`,
          },
        });
        addCacheHeaders(response, source, name, variant, etag);
        return response;
      }

      const response = new Response(memCached, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "X-Cache": "HIT",
          "X-Cache-Layer": "memory",
          "X-Response-Time": `${Math.round(performance.now() - requestStartTime)}ms`,
        },
      });
      addCacheHeaders(response, source, name, variant, etag);

      // Update edge cache asynchronously
      c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));

      return response;
    }
    metrics.recordCacheMiss('memory', 'icon');
  }

  // Fetch icon index from KV (Tier 3)
  const indexStartTime = performance.now();
  const index = await getIndex(c.env);
  metrics.recordLatency('kv', 'getIndex', performance.now() - indexStartTime);

  const id = `${source}:${name}`;
  const record = index.icons[id];

  if (!record) {
    const suggestions = getSuggestions(index.icons, name, source);
    return errorResponse(
      c,
      "ICON_NOT_FOUND",
      `Icon '${name}' not found in source '${source}'`,
      404,
      {
        icon: name,
        source,
        variant,
        suggestions,
      },
    ) as unknown as Response;
  }

  // Check if requested variant is available for this specific icon
  if (variant !== "default" && record.variants) {
    if (!record.variants.includes(variant as IconVariant)) {
      return errorResponse(
        c,
        "VARIANT_NOT_AVAILABLE",
        `Variant '${variant}' not available for icon '${name}'. Available: ${record.variants.join(", ")}`,
        404,
        {
          icon: name,
          source,
          requestedVariant: variant,
          availableVariants: record.variants,
        },
      ) as unknown as Response;
    }
  }

  // Fetch icon from R2 (Origin) with conditional request support
  const r2StartTime = performance.now();
  const r2IfNoneMatch = c.req.header("If-None-Match");
  const r2Result = await getIconFromR2(c.env, record.path, r2IfNoneMatch);
  metrics.recordLatency('r2', 'get', performance.now() - r2StartTime);

  // Handle 304 Not Modified from R2
  if (r2Result.notModified) {
    const response = new Response(null, {
      status: 304,
      headers: {
        "ETag": r2Result.etag || "",
        "X-Cache": "MISS",
        "X-Cache-Layer": "origin",
        "X-Response-Time": `${Math.round(performance.now() - requestStartTime)}ms`,
      },
    });
    addCacheHeaders(response, source, name, variant, r2Result.etag || "");
    return response;
  }

  const iconObject = r2Result.object;

  if (!iconObject) {
    return errorResponse(
      c,
      "ICON_NOT_FOUND",
      `Icon '${name}' not found in storage`,
      404,
      {
        icon: name,
        source,
        variant,
      },
    ) as unknown as Response;
  }

  // Transform SVG
  const transformStartTime = performance.now();
  let transformed: string;
  const hasAdvancedTransforms = rotate !== undefined || mirror || className || Object.keys(customAttributes).length > 0;

  if (hasAdvancedTransforms) {
    transformed = transformSvgAdvanced(iconObject.body, {
      size,
      strokeWidth,
      color,
      rotate,
      mirror,
      className,
      customAttributes,
    });
  } else {
    transformed = transformSvg(iconObject.body, {
      size,
      strokeWidth,
      color,
    });
  }
  metrics.recordLatency('transform', 'svg', performance.now() - transformStartTime);

  // Generate ETag
  const etag = generateETag(transformed);
  const ifNoneMatch = c.req.header("If-None-Match");
  if (ifNoneMatch && ifNoneMatch === etag) {
    const response = new Response(null, {
      status: 304,
      headers: {
        "ETag": etag,
        "X-Cache": "MISS",
        "X-Cache-Layer": "origin",
        "X-Response-Time": `${Math.round(performance.now() - requestStartTime)}ms`,
      },
    });
    addCacheHeaders(response, source, name, variant, etag);
    return response;
  }

  // Cache transformed SVG in memory for future requests
  if (wantsSvg) {
    transformedSvgCache.set(memCacheKey, transformed, TRANSFORM_CACHE_TTL_MS);
  }

  // Build response
  const responseTime = Math.round(performance.now() - requestStartTime);

  if (wantsSvg) {
    const response = new Response(transformed, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "X-Cache": "MISS",
        "X-Cache-Layer": "origin",
        "X-Response-Time": `${responseTime}ms`,
      },
    });
    addCacheHeaders(response, source, name, variant, etag);

    // Store in edge cache asynchronously
    c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));

    return response;
  }

  // JSON response for API clients
  const sourceMeta = SOURCE_CONFIG[source];

  return jsonResponse(c, {
    name: record.name,
    source: record.source,
    variant,
    category: record.category,
    tags: record.tags,
    svg: transformed,
    variants: record.variants ?? ["default"],
    license: sourceMeta?.license,
    _meta: {
      responseTimeMs: responseTime,
      cache: "MISS",
      cacheLayer: "origin",
    },
  }) as unknown as Response;
}

/**
 * Add timing headers to response
 */
function addTimingHeaders(response: Response, startTime: number): void {
  const totalTime = Math.round(performance.now() - startTime);
  response.headers.set("X-Response-Time", `${totalTime}ms`);
}

/**
 * Add cache headers including Cache-Tags
 */
function addCacheHeaders(
  response: Response,
  source: string,
  name: string,
  variant: string,
  etag: string
): void {
  const cacheTags = generateCacheTags(source, name, variant);
  const cacheControl = buildCacheControl(
    CACHE_MAX_AGE,
    CACHE_STALE_WHILE_REVALIDATE,
    CACHE_IMMUTABLE
  );

  response.headers.set("Cache-Control", cacheControl);
  response.headers.set("ETag", etag);
  response.headers.set("Cache-Tag", cacheTags.join(","));
  response.headers.set("Vary", "Accept");
}
