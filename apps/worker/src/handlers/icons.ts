import type { Context } from "hono";
import type { Env } from "../env";
import { DEFAULT_CACHE_TTL_ICON } from "@svg-api/shared/constants";
import { getIndex } from "../services/kv";
import { getIconFromR2 } from "../services/r2";
import { transformSvg, transformSvgAdvanced } from "../utils/transform";
import { errorResponse, jsonResponse } from "../utils/response";
import { hashString } from "../utils/hash";
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

const DEFAULT_SOURCE = "lucide";

// Cache for transformed SVGs at the edge
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

export const iconHandler = async (c: Context<{ Bindings: Env }>) => {
  const params = c.req.param();
  const name = params.name?.toLowerCase();
  const source = (
    params.source ??
    c.req.query("source") ??
    DEFAULT_SOURCE
  ).toLowerCase();

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

  if (variant !== "default" && !availableVariants.includes(variant as any)) {
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

  // Check edge cache first for SVG requests
  const accept = c.req.header("Accept") ?? "";
  const wantsSvg = accept.includes("image/svg+xml") || format === "svg";

  // Edge cache using Cloudflare Cache API
  const cache = (caches as unknown as { default: Cache }).default;
  const baseUrl = c.req.url.split("?")[0] || c.req.url;
  const cacheKey = getEdgeCacheKey(
    baseUrl,
    source,
    name,
    variant,
    size,
    strokeWidth,
    color,
    rotate,
    mirror,
    className,
  );

  if (wantsSvg) {
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      const response = new Response(cachedResponse.body, cachedResponse);
      response.headers.set("X-Cache", "HIT");
      return response;
    }
  }

  const index = await getIndex(c.env);
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
    );
  }

  // Check if requested variant is available for this specific icon
  if (variant !== "default" && record.variants) {
    if (!record.variants.includes(variant as any)) {
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
      );
    }
  }

  const iconObject = await getIconFromR2(c.env, record.path);
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
    );
  }

  // Use advanced transforms if needed
  let transformed: string;
  if (
    rotate !== undefined ||
    mirror ||
    className ||
    Object.keys(customAttributes).length > 0
  ) {
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

  const etag = await hashString(transformed);
  const ifNoneMatch = c.req.header("If-None-Match");
  if (ifNoneMatch && ifNoneMatch === etag) {
    c.header("ETag", etag);
    c.header(
      "Cache-Control",
      `public, max-age=${DEFAULT_CACHE_TTL_ICON}, immutable`,
    );
    return c.body(null, 304);
  }

  c.header(
    "Cache-Control",
    `public, max-age=${DEFAULT_CACHE_TTL_ICON}, immutable`,
  );
  c.header("ETag", etag);
  c.header("Vary", "Accept");
  c.header("X-Cache", "MISS");

  if (wantsSvg) {
    const response = new Response(transformed, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": `public, max-age=${DEFAULT_CACHE_TTL_ICON}, immutable`,
        ETag: etag,
        Vary: "Accept",
        "X-Cache": "MISS",
      },
    });

    // Store in edge cache asynchronously
    c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));

    return response;
  }

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
  });
};
