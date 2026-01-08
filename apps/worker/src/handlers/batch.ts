import type { Context } from "hono";
import type { Env } from "../env";
import { getIndex } from "../services/kv";
import { getIconFromR2 } from "../services/r2";
import { transformSvg, transformSvgAdvanced } from "../utils/transform";
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
  generateBulkResponse,
  type BulkFormat,
  type BulkOptions,
} from "../services/zip-generator";

const DEFAULT_SOURCE = "lucide";
const MAX_BATCH = 50;
const MAX_BULK = 100;
const BULK_RATE_LIMIT_MULTIPLIER = 10;

interface BatchIconInput {
  name: string;
  source?: string;
  size?: number;
  color?: string;
  stroke?: number;
  variant?: string;
  rotate?: number;
  mirror?: boolean;
  class?: string;
  attributes?: Record<string, string>;
}

interface BulkRequest {
  icons: Array<{ name: string; source?: string }>;
  format?: BulkFormat;
  defaults?: Partial<Omit<BulkOptions, "format">>;
}

export const batchHandler = async (c: Context<{ Bindings: Env }>) => {
  const contentType = c.req.header("Content-Type") ?? "";

  // Handle bulk download with format parameter
  const format = c.req.query("format") as BulkFormat | null;
  if (format) {
    return handleBulkDownload(c, format);
  }

  let payload: { icons: BatchIconInput[]; defaults?: Partial<BatchIconInput> };
  try {
    payload = await c.req.json();
  } catch {
    return errorResponse(c, "INVALID_PARAMETER", "Invalid JSON body", 400);
  }

  if (!payload?.icons || !Array.isArray(payload.icons)) {
    return errorResponse(
      c,
      "INVALID_PARAMETER",
      "Body must include icons array",
      400,
    );
  }

  if (payload.icons.length > MAX_BATCH) {
    return errorResponse(
      c,
      "BATCH_LIMIT_EXCEEDED",
      `Exceeded ${MAX_BATCH} icons per batch`,
      400,
    );
  }

  const defaults = payload.defaults ?? {};
  const index = await getIndex(c.env);

  const results = [] as Array<Record<string, unknown>>;
  for (const iconRequest of payload.icons) {
    const result = await processBatchIcon(c.env, index, iconRequest, defaults);
    results.push(result);
  }

  const successful = results.filter((item) => !item.error).length;
  const failed = results.length - successful;

  return jsonResponse(c, results, {
    requested: results.length,
    successful,
    failed,
  });
};

async function handleBulkDownload(
  c: Context<{ Bindings: Env }>,
  format: BulkFormat,
): Promise<Response> {
  let payload: BulkRequest;
  try {
    payload = await c.req.json();
  } catch {
    return errorResponse(c, "INVALID_PARAMETER", "Invalid JSON body", 400);
  }

  if (!payload?.icons || !Array.isArray(payload.icons)) {
    return errorResponse(
      c,
      "INVALID_PARAMETER",
      "Body must include icons array",
      400,
    );
  }

  if (payload.icons.length > MAX_BULK) {
    return errorResponse(
      c,
      "BULK_LIMIT_EXCEEDED",
      `Exceeded ${MAX_BULK} icons per bulk request`,
      400,
    );
  }

  const validFormats: BulkFormat[] = ["zip", "svg-bundle", "json-sprite"];
  if (!validFormats.includes(format)) {
    return errorResponse(
      c,
      "INVALID_FORMAT",
      `Format must be one of: ${validFormats.join(", ")}`,
      400,
      { format },
    );
  }

  const index = await getIndex(c.env);
  const defaults = payload.defaults ?? {};
  const entries: Array<{ name: string; source: string; svg: string }> = [];

  for (const iconRequest of payload.icons) {
    const name = iconRequest.name?.toLowerCase();
    const source = (iconRequest.source ?? DEFAULT_SOURCE).toLowerCase();

    if (!name || !nameSchema.safeParse(name).success) {
      continue;
    }

    if (!sourceSchema.safeParse(source).success) {
      continue;
    }

    const record = index.icons[`${source}:${name}`];
    if (!record) {
      continue;
    }

    const iconObject = await getIconFromR2(c.env, record.path);
    if (!iconObject) {
      continue;
    }

    const size = parseSize(String(defaults.size ?? undefined));
    const strokeWidth = parseStrokeWidth(String(defaults.stroke ?? undefined));
    const color = parseColor(defaults.color ?? undefined);
    const rotate = parseRotate(String(defaults.rotate ?? undefined));
    const mirror = parseMirror(String(defaults.mirror ?? undefined));
    const className = defaults.class;
    const attributes = defaults.attributes;

    let svg = iconObject.body;

    // Apply advanced transforms if needed
    if (
      rotate !== undefined ||
      mirror ||
      className ||
      (attributes && Object.keys(attributes).length > 0)
    ) {
      svg = transformSvgAdvanced(svg, {
        size: size ?? undefined,
        strokeWidth: strokeWidth ?? undefined,
        color: color ?? undefined,
        rotate,
        mirror,
        className,
        customAttributes: attributes,
      });
    } else {
      svg = transformSvg(svg, {
        size: size ?? undefined,
        strokeWidth: strokeWidth ?? undefined,
        color: color ?? undefined,
      });
    }

    entries.push({ name: record.name, source: record.source, svg });
  }

  if (entries.length === 0) {
    return errorResponse(
      c,
      "NO_VALID_ICONS",
      "No valid icons found in request",
      400,
    );
  }

  const bulkOptions: BulkOptions = {
    format,
    size: defaults.size,
    color: defaults.color,
    stroke: defaults.stroke,
    rotate: defaults.rotate,
    mirror: defaults.mirror,
  };

  return generateBulkResponse(c.env, entries, bulkOptions);
}

async function processBatchIcon(
  env: Env,
  index: { icons: Record<string, any> },
  iconRequest: BatchIconInput,
  defaults: Partial<BatchIconInput>,
): Promise<Record<string, unknown>> {
  const name = iconRequest.name?.toLowerCase();
  const source = (
    iconRequest.source ??
    defaults.source ??
    DEFAULT_SOURCE
  ).toLowerCase();

  if (!name || !nameSchema.safeParse(name).success) {
    return {
      name,
      source,
      error: { code: "INVALID_PARAMETER", message: "Invalid icon name" },
    };
  }

  if (!sourceSchema.safeParse(source).success) {
    return {
      name,
      source,
      error: { code: "INVALID_PARAMETER", message: "Invalid source" },
    };
  }

  const sizeInput = iconRequest.size ?? defaults.size;
  const size =
    sizeInput === undefined
      ? parseSize(undefined)
      : parseSize(String(sizeInput));
  if (!size) {
    return {
      name,
      source,
      error: {
        code: "INVALID_SIZE",
        message: "Size must be between 8 and 512",
      },
    };
  }

  const strokeInput = iconRequest.stroke ?? defaults.stroke;
  const strokeWidth =
    strokeInput === undefined
      ? parseStrokeWidth(undefined)
      : parseStrokeWidth(String(strokeInput));
  if (!strokeWidth) {
    return {
      name,
      source,
      error: {
        code: "INVALID_PARAMETER",
        message: "Stroke width must be between 0.5 and 3",
      },
    };
  }

  const color = parseColor(iconRequest.color ?? defaults.color);
  if (!color) {
    return {
      name,
      source,
      error: { code: "INVALID_COLOR", message: "Invalid color format" },
    };
  }

  const record = index.icons[`${source}:${name}`];
  if (!record) {
    return {
      name,
      source,
      error: { code: "ICON_NOT_FOUND", message: "Icon not found" },
    };
  }

  const iconObject = await getIconFromR2(env, record.path);
  if (!iconObject) {
    return {
      name,
      source,
      error: { code: "ICON_NOT_FOUND", message: "Icon missing in storage" },
    };
  }

  // Check variant support
  const variant = iconRequest.variant ?? defaults.variant;
  if (variant && variant !== "default") {
    const availableVariants = record.variants ?? ["default"];
    if (!availableVariants.includes(variant)) {
      return {
        name,
        source,
        requestedVariant: variant,
        availableVariants,
        error: {
          code: "VARIANT_NOT_AVAILABLE",
          message: `Variant '${variant}' not available for this icon`,
        },
      };
    }
  }

  const rotate = parseRotate(String(iconRequest.rotate ?? defaults.rotate));
  const mirror = parseMirror(String(iconRequest.mirror ?? defaults.mirror));
  const className = iconRequest.class ?? defaults.class;
  const attributes = iconRequest.attributes ?? defaults.attributes;

  let svg: string;

  // Use advanced transforms if needed
  if (
    rotate !== undefined ||
    mirror ||
    className ||
    (attributes && Object.keys(attributes).length > 0)
  ) {
    svg = transformSvgAdvanced(iconObject.body, {
      size,
      strokeWidth,
      color,
      rotate,
      mirror,
      className,
      customAttributes: attributes,
    });
  } else {
    svg = transformSvg(iconObject.body, { size, strokeWidth, color });
  }

  const sourceMeta = SOURCE_CONFIG[source];

  return {
    name: record.name,
    source: record.source,
    category: record.category,
    tags: record.tags,
    variant: variant ?? "default",
    svg,
    variants: record.variants ?? ["default"],
    license: sourceMeta?.license,
  };
}
