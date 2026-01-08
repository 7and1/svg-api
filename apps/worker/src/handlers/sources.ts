import type { Context } from "hono";
import type { Env } from "../env";
import { getIndex } from "../services/kv";
import { jsonResponse } from "../utils/response";
import { SOURCE_CONFIG } from "../data/sources";
import type { SourceMeta } from "@svg-api/shared/types";

export const sourcesHandler = async (c: Context<{ Bindings: Env }>) => {
  const index = await getIndex(c.env);
  const stats: Record<
    string,
    { iconCount: number; categories: Set<string>; variants: Set<string> }
  > = {};

  for (const icon of Object.values(index.icons)) {
    if (!stats[icon.source]) {
      stats[icon.source] = {
        iconCount: 0,
        categories: new Set(),
        variants: new Set(),
      };
    }
    const entry = stats[icon.source];
    entry.iconCount += 1;
    entry.categories.add(icon.category);
    if (icon.variants?.length) {
      icon.variants.forEach((variant) => entry.variants.add(variant));
    } else {
      entry.variants.add("default");
    }
  }

  const sources: SourceMeta[] = Object.keys(stats).map((id) => {
    const config = SOURCE_CONFIG[id] ?? {
      id,
      name: id,
      description: "",
      version: "unknown",
      website: "",
      repository: "",
      license: { type: "unknown", url: "" },
    };
    const entry = stats[id];
    const variants = Array.from(entry.variants);
    const defaultVariant = config.defaultVariant ?? variants[0] ?? "default";

    return {
      ...config,
      iconCount: entry.iconCount,
      variants,
      defaultVariant,
      categories: Array.from(entry.categories),
    };
  });

  sources.sort((a, b) => a.name.localeCompare(b.name));

  return jsonResponse(c, sources, {
    total_sources: sources.length,
    total_icons: index.stats.totalIcons,
  });
};
