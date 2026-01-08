import type { Context } from "hono";
import type { Env } from "../env";
import { getIndex } from "../services/kv";
import { errorResponse, jsonResponse } from "../utils/response";
import { sourceSchema } from "../utils/validation";

const titleCase = (value: string) =>
  value
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export const categoriesHandler = async (c: Context<{ Bindings: Env }>) => {
  const source = c.req.query("source")?.toLowerCase();
  if (source && !sourceSchema.safeParse(source).success) {
    return errorResponse(c, "INVALID_PARAMETER", "Invalid source name", 400, {
      source,
    });
  }

  const index = await getIndex(c.env);
  const categories = new Map<
    string,
    { iconCount: number; sources: Set<string> }
  >();

  for (const icon of Object.values(index.icons)) {
    if (source && icon.source !== source) continue;
    const id = icon.category || "general";
    if (!categories.has(id)) {
      categories.set(id, { iconCount: 0, sources: new Set() });
    }
    const entry = categories.get(id)!;
    entry.iconCount += 1;
    entry.sources.add(icon.source);
  }

  const data = Array.from(categories.entries()).map(([id, entry]) => ({
    id,
    name: titleCase(id),
    description: `${titleCase(id)} icons`,
    icon_count: entry.iconCount,
    sources: Array.from(entry.sources),
  }));

  data.sort((a, b) => b.icon_count - a.icon_count);

  return jsonResponse(c, data, { total: data.length });
};
