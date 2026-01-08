import type { Context } from "hono";
import type { Env } from "../env";
import { getIndex } from "../services/kv";
import { getIconFromR2 } from "../services/r2";
import { transformSvg } from "../utils/transform";
import { errorResponse, jsonResponse } from "../utils/response";
import {
  parseColor,
  parseSize,
  parseStrokeWidth,
  sourceSchema,
} from "../utils/validation";

const getPrefix = (path: string) => (path.startsWith("/v1/") ? "/v1" : "");

export const randomHandler = async (c: Context<{ Bindings: Env }>) => {
  const index = await getIndex(c.env);
  const source = c.req.query("source")?.toLowerCase();
  const category = c.req.query("category")?.toLowerCase();

  if (source && !sourceSchema.safeParse(source).success) {
    return errorResponse(c, "INVALID_PARAMETER", "Invalid source name", 400, {
      source,
    });
  }

  const candidates = Object.values(index.icons).filter((icon) => {
    if (source && icon.source !== source) return false;
    if (category && icon.category !== category) return false;
    return true;
  });

  if (!candidates.length) {
    return errorResponse(
      c,
      "CATEGORY_NOT_FOUND",
      "No icons found for selection",
      404,
      {
        source,
        category,
      },
    );
  }

  const random = candidates[Math.floor(Math.random() * candidates.length)];
  const iconObject = await getIconFromR2(c.env, random.path);
  if (!iconObject) {
    return errorResponse(c, "ICON_NOT_FOUND", "Icon missing in storage", 404, {
      icon: random.name,
      source: random.source,
    });
  }

  const sizeParam = c.req.query("size");
  const strokeParam = c.req.query("stroke") ?? c.req.query("stroke-width");
  const colorParam = c.req.query("color");

  const size = parseSize(sizeParam);
  if (sizeParam && !size) {
    return errorResponse(
      c,
      "INVALID_SIZE",
      "Size must be between 8 and 512",
      400,
    );
  }

  const strokeWidth = parseStrokeWidth(strokeParam);
  if (strokeParam && !strokeWidth) {
    return errorResponse(
      c,
      "INVALID_PARAMETER",
      "Stroke width must be between 0.5 and 3",
      400,
    );
  }

  const color = parseColor(colorParam);
  if (colorParam && !color) {
    return errorResponse(c, "INVALID_COLOR", "Invalid color format", 400);
  }

  const svg = transformSvg(iconObject.body, {
    size: size ?? undefined,
    strokeWidth: strokeWidth ?? undefined,
    color: color ?? undefined,
  });

  const origin = new URL(c.req.url).origin;
  const prefix = getPrefix(c.req.path);

  return jsonResponse(c, {
    name: random.name,
    source: random.source,
    category: random.category,
    tags: random.tags,
    svg,
    preview_url: `${origin}${prefix}/icons/${random.name}?source=${random.source}`,
  });
};
