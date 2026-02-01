import { promises as fs } from "fs";
import path from "path";
import fg from "fast-glob";
import { optimize } from "svgo";
import { parseSvgMeta } from "../src/parse";
import type {
  IconIndex,
  IconRecord,
  InvertedIndex,
  InvertedIndexEntry,
  SynonymMap,
} from "@svg-api/shared/types";
import { MAX_PREFIX_LENGTH } from "@svg-api/shared/constants";

const ROOT = path.resolve(process.cwd(), "..", "..");
const RAW_DIR = path.join(ROOT, "icons-raw");
const DIST_DIR = path.join(ROOT, "packages", "icons", "dist");
const ICONS_DIR = path.join(DIST_DIR, "icons");
const SYNONYMS_PATH = path.join(
  ROOT,
  "packages",
  "icons",
  "src",
  "synonyms.json",
);

interface SourceDefinition {
  id: string;
  pattern: string;
  baseDir: string;
  appendVariant?: boolean;
  categoryFromPath?: (relative: string) => string;
  variantFromPath?: (relative: string) => string | null;
  tagsFromJson?: boolean;
}

const sources: SourceDefinition[] = [
  // Original 7 sources
  {
    id: "lucide",
    pattern: "lucide/*.svg",
    baseDir: "lucide",
    tagsFromJson: true,
  },
  {
    id: "tabler",
    pattern: "tabler/{outline,filled}/*.svg",
    baseDir: "tabler",
    appendVariant: true,
    variantFromPath: (relative) => relative.split(path.sep)[0] ?? null,
  },
  {
    id: "heroicons",
    pattern: "heroicons/{20,24}/{outline,solid}/*.svg",
    baseDir: "heroicons",
    appendVariant: true,
    variantFromPath: (relative) => {
      const parts = relative.split(path.sep);
      const size = parts[0];
      const variant = parts[1];
      if (size === "20" && variant === "solid") return "mini";
      return variant ?? null;
    },
  },
  {
    id: "bootstrap",
    pattern: "bootstrap/icons/*.svg",
    baseDir: "bootstrap/icons",
  },
  {
    id: "remix",
    pattern: "remix/*/*.svg",
    baseDir: "remix",
    categoryFromPath: (relative) => relative.split(path.sep)[0] ?? "general",
  },
  {
    id: "ionicons",
    pattern: "ionicons/*.svg",
    baseDir: "ionicons",
    variantFromPath: (relative) => {
      const base = path.basename(relative, ".svg");
      if (base.endsWith("-outline")) return "outline";
      if (base.endsWith("-sharp")) return "sharp";
      return "default";
    },
  },
  {
    id: "mdi",
    pattern: "mdi/*.svg",
    baseDir: "mdi",
  },
  // New sources (Batch 1 - Major libraries)
  {
    id: "fontawesome",
    pattern: "fontawesome/*.svg",
    baseDir: "fontawesome",
  },
  {
    id: "fluent",
    pattern: "fluent/*.svg",
    baseDir: "fluent",
    variantFromPath: (relative) => {
      const base = path.basename(relative, ".svg");
      // ic_fluent_<name>_<size>_<style>.svg
      const match = base.match(/_\d+_(filled|regular|light)$/);
      return match?.[1] ?? "regular";
    },
  },
  {
    id: "phosphor",
    pattern: "phosphor/*.svg",
    baseDir: "phosphor",
    variantFromPath: (relative) => {
      const base = path.basename(relative, ".svg");
      // Format: name-weight.svg (e.g., acorn-bold.svg, acorn-light.svg)
      const match = base.match(/-(bold|duotone|fill|light|regular|thin)$/);
      return match?.[1] ?? "regular";
    },
  },
  {
    id: "simple",
    pattern: "simple/*.svg",
    baseDir: "simple",
  },
  {
    id: "octicons",
    pattern: "octicons/*.svg",
    baseDir: "octicons",
    variantFromPath: (relative) => {
      const base = path.basename(relative, ".svg");
      const match = base.match(/-(\d+)$/);
      return match ? `${match[1]}px` : "default";
    },
  },
  // New sources (Batch 2 - Additional libraries)
  {
    id: "radix",
    pattern: "radix/*.svg",
    baseDir: "radix",
  },
  {
    id: "antd",
    pattern: "antd/{filled,outlined,twotone}/*.svg",
    baseDir: "antd",
    appendVariant: true,
    variantFromPath: (relative) => relative.split(path.sep)[0] ?? null,
  },
  {
    id: "carbon",
    pattern: "carbon/*.svg",
    baseDir: "carbon",
  },
  {
    id: "flags",
    pattern: "flags/*.svg",
    baseDir: "flags",
  },
  {
    id: "weather",
    pattern: "weather/*.svg",
    baseDir: "weather",
  },
  {
    id: "iconoir",
    pattern: "iconoir/*.svg",
    baseDir: "iconoir",
  },
  {
    id: "eva",
    pattern: "eva/*.svg",
    baseDir: "eva",
    variantFromPath: (relative) => {
      const base = path.basename(relative, ".svg");
      if (base.endsWith("-outline")) return "outline";
      return "fill";
    },
  },
  {
    id: "circum",
    pattern: "circum/*.svg",
    baseDir: "circum",
  },
  {
    id: "cssgg",
    pattern: "cssgg/*.svg",
    baseDir: "cssgg",
  },
  {
    id: "zondicons",
    pattern: "zondicons/*.svg",
    baseDir: "zondicons",
  },
  // New sources (Batch 3 - Extended libraries)
  {
    id: "feather",
    pattern: "feather/*.svg",
    baseDir: "feather",
  },
  {
    id: "akar",
    pattern: "akar/*.svg",
    baseDir: "akar",
  },
  {
    id: "lineawesome",
    pattern: "lineawesome/*.svg",
    baseDir: "lineawesome",
  },
  {
    id: "cryptocurrency",
    pattern: "cryptocurrency/*.svg",
    baseDir: "cryptocurrency",
  },
  {
    id: "teenyicons",
    pattern: "teenyicons/{outline,solid}/*.svg",
    baseDir: "teenyicons",
    appendVariant: true,
    variantFromPath: (relative) => relative.split(path.sep)[0] ?? null,
  },
  {
    id: "game-icons",
    pattern: "game-icons/*.svg",
    baseDir: "game-icons",
  },
  {
    id: "unicons",
    pattern: "unicons/*.svg",
    baseDir: "unicons",
    variantFromPath: (relative) => {
      const base = path.basename(relative, ".svg");
      // Format: uil-name.svg (line), uis-name.svg (solid), uit-name.svg (thinline)
      if (base.startsWith("uil-")) return "line";
      if (base.startsWith("uis-")) return "solid";
      if (base.startsWith("uit-")) return "thinline";
      return "line";
    },
  },
  {
    id: "jam",
    pattern: "jam/*.svg",
    baseDir: "jam",
    variantFromPath: (relative) => {
      const base = path.basename(relative, ".svg");
      if (base.endsWith("-f")) return "filled";
      return "outline";
    },
  },
  {
    id: "boxicons",
    pattern: "boxicons/*.svg",
    baseDir: "boxicons",
    variantFromPath: (relative) => {
      const base = path.basename(relative, ".svg");
      // Format: bx-name.svg (regular), bxs-name.svg (solid), bxl-name.svg (logos)
      if (base.startsWith("bxs-")) return "solid";
      if (base.startsWith("bxl-")) return "logos";
      return "regular";
    },
  },
  {
    id: "devicons",
    pattern: "devicons/*.svg",
    baseDir: "devicons",
  },
  // New sources (Batch 4 - High-value libraries)
  {
    id: "material-symbols",
    pattern: "material-symbols/**/materialicons/24px.svg",
    baseDir: "material-symbols",
    categoryFromPath: (relative) => relative.split(path.sep)[0] ?? "general",
  },
  {
    id: "majesticons",
    pattern: "majesticons/{line,solid}/*.svg",
    baseDir: "majesticons",
    appendVariant: true,
    variantFromPath: (relative) => relative.split(path.sep)[0] ?? null,
  },
  {
    id: "coreui",
    pattern: "coreui/{brand,flag,free}/*.svg",
    baseDir: "coreui",
    categoryFromPath: (relative) => relative.split(path.sep)[0] ?? "general",
  },
  {
    id: "typicons",
    pattern: "typicons/*.svg",
    baseDir: "typicons",
  },
  {
    id: "entypo",
    pattern: "entypo/*.svg",
    baseDir: "entypo",
  },
  {
    id: "foundation",
    pattern: "foundation/*.svg",
    baseDir: "foundation",
  },
  {
    id: "ikonate",
    pattern: "ikonate/*.svg",
    baseDir: "ikonate",
  },
  {
    id: "bytesize",
    pattern: "bytesize/*.svg",
    baseDir: "bytesize",
  },
  // Specialized libraries (Batch 5 - Professional domains)
  {
    id: "healthicons",
    pattern: "healthicons/public/icons/svg/{outline,filled}/**/*.svg",
    baseDir: "healthicons/public/icons/svg",
    appendVariant: true,
    variantFromPath: (relative) => relative.split(path.sep)[0] ?? null,
    categoryFromPath: (relative) => relative.split(path.sep)[1] ?? "general",
  },
  {
    id: "file-icons",
    pattern: "file-icons/{classic,vivid,high-contrast}/*.svg",
    baseDir: "file-icons",
    appendVariant: true,
    variantFromPath: (relative) => relative.split(path.sep)[0] ?? null,
  },
  {
    id: "primeicons",
    pattern: "primeicons/*.svg",
    baseDir: "primeicons",
  },
  {
    id: "academicons",
    pattern: "academicons/*.svg",
    baseDir: "academicons",
  },
];

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
};

const readJsonIfExists = async (filePath: string) => {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as { tags?: string[]; categories?: string[] };
  } catch {
    return null;
  }
};

const getTagsFromName = (name: string) =>
  name
    .split(/[-_]/)
    .map((part) => part.trim())
    .filter(Boolean);

const normalizeCategory = (category?: string) =>
  category?.toLowerCase().replace(/\s+/g, "-") ?? "general";

const optimizeSvg = (svg: string) =>
  optimize(svg, {
    multipass: true,
    plugins: [
      {
        name: "preset-default",
        params: {
          overrides: {
            removeViewBox: false,
            cleanupIds: false,
          },
        },
      },
      "removeDimensions",
    ],
  }).data;

// Tokenize a string into searchable terms
const tokenize = (value: string): string[] =>
  value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1);

// Generate all prefixes for a term (up to MAX_PREFIX_LENGTH)
const generatePrefixes = (term: string): string[] => {
  const prefixes: string[] = [];
  const maxLen = Math.min(term.length, MAX_PREFIX_LENGTH);
  for (let i = 2; i <= maxLen; i++) {
    prefixes.push(term.slice(0, i));
  }
  return prefixes;
};

// Build inverted index from icons
const buildInvertedIndex = (
  icons: Record<string, IconRecord>,
): InvertedIndex => {
  const termToIconIds = new Map<string, Set<string>>();
  const categoryToIconIds = new Map<string, Set<string>>();
  const sourceToIconIds = new Map<string, Set<string>>();
  const prefixToTerms = new Map<string, Set<string>>();

  for (const icon of Object.values(icons)) {
    const iconId = icon.id;

    // Index by source
    if (!sourceToIconIds.has(icon.source)) {
      sourceToIconIds.set(icon.source, new Set());
    }
    sourceToIconIds.get(icon.source)!.add(iconId);

    // Index by category
    if (!categoryToIconIds.has(icon.category)) {
      categoryToIconIds.set(icon.category, new Set());
    }
    categoryToIconIds.get(icon.category)!.add(iconId);

    // Collect all terms for this icon
    const allTerms = new Set<string>();

    // From name (highest weight - added multiple times conceptually via scoring)
    const nameTerms = tokenize(icon.name);
    nameTerms.forEach((t) => allTerms.add(t));

    // Add full name as a term for exact matching
    const fullName = icon.name.toLowerCase();
    if (fullName.length > 1) {
      allTerms.add(fullName);
    }

    // From tags
    for (const tag of icon.tags) {
      const tagTerms = tokenize(tag);
      tagTerms.forEach((t) => allTerms.add(t));
      // Add full tag for exact matching
      const fullTag = tag.toLowerCase();
      if (fullTag.length > 1) {
        allTerms.add(fullTag);
      }
    }

    // Add category as term
    const categoryTerms = tokenize(icon.category);
    categoryTerms.forEach((t) => allTerms.add(t));

    // Add each term to the inverted index
    for (const term of allTerms) {
      if (!termToIconIds.has(term)) {
        termToIconIds.set(term, new Set());
      }
      termToIconIds.get(term)!.add(iconId);

      // Build prefix index
      const prefixes = generatePrefixes(term);
      for (const prefix of prefixes) {
        if (!prefixToTerms.has(prefix)) {
          prefixToTerms.set(prefix, new Set());
        }
        prefixToTerms.get(prefix)!.add(term);
      }
    }
  }

  // Convert to final format
  const terms: Record<string, InvertedIndexEntry> = {};
  for (const [term, iconIds] of termToIconIds) {
    terms[term] = {
      iconIds: Array.from(iconIds),
      df: iconIds.size,
    };
  }

  const categories: Record<string, string[]> = {};
  for (const [category, iconIds] of categoryToIconIds) {
    categories[category] = Array.from(iconIds);
  }

  const sources: Record<string, string[]> = {};
  for (const [source, iconIds] of sourceToIconIds) {
    sources[source] = Array.from(iconIds);
  }

  // Convert prefix index - store terms that match each prefix
  const prefixes: Record<string, string[]> = {};
  for (const [prefix, matchingTerms] of prefixToTerms) {
    prefixes[prefix] = Array.from(matchingTerms);
  }

  return {
    version: "1.0.0",
    generated: new Date().toISOString(),
    totalDocs: Object.keys(icons).length,
    terms,
    categories,
    sources,
    prefixes,
  };
};

const buildIcons = async () => {
  await fs.rm(DIST_DIR, { recursive: true, force: true });
  await ensureDir(ICONS_DIR);

  const icons: Record<string, IconRecord> = {};

  for (const source of sources) {
    const absolutePattern = path.join(RAW_DIR, source.pattern);
    const files = await fg(absolutePattern, { dot: false });

    for (const file of files) {
      const relativeToSource = path.relative(
        path.join(RAW_DIR, source.baseDir),
        file,
      );
      const baseName = path.basename(file, ".svg").toLowerCase();

      const variant = source.variantFromPath?.(relativeToSource) ?? null;
      const shouldAppendVariant =
        source.appendVariant && variant && variant !== "default";
      const name =
        shouldAppendVariant && !baseName.endsWith(`-${variant}`)
          ? `${baseName}-${variant}`
          : baseName;

      const svgRaw = await fs.readFile(file, "utf-8");
      const optimized = optimizeSvg(svgRaw);
      const meta = parseSvgMeta(optimized);

      let tags = new Set(getTagsFromName(name));
      let category = normalizeCategory(
        source.categoryFromPath?.(relativeToSource),
      );
      let variants = variant ? [variant] : ["default"];

      if (source.tagsFromJson) {
        const jsonPath = file.replace(/\.svg$/i, ".json");
        const metaJson = await readJsonIfExists(jsonPath);
        metaJson?.tags?.forEach((tag) =>
          tags.add(tag.toLowerCase().replace(/\s+/g, "-")),
        );
        if (metaJson?.categories?.length) {
          category = normalizeCategory(metaJson.categories[0]);
        }
      }

      if (variant && variant !== "default") {
        tags.add(variant);
      }

      const iconId = `${source.id}:${name}`;
      const outputRelative = path
        .join(source.id, relativeToSource)
        .replace(/\\/g, "/");
      const outputPath = path.join(ICONS_DIR, outputRelative);

      await ensureDir(path.dirname(outputPath));
      await fs.writeFile(outputPath, optimized, "utf-8");

      icons[iconId] = {
        id: iconId,
        name,
        source: source.id,
        path: outputRelative,
        tags: Array.from(tags),
        category,
        width: meta.width,
        height: meta.height,
        viewBox: meta.viewBox,
        variants,
      };
    }
  }

  const index: IconIndex = {
    version: "1.0.0",
    generated: new Date().toISOString(),
    stats: {
      totalIcons: Object.keys(icons).length,
      sources: Array.from(
        new Set(Object.values(icons).map((icon) => icon.source)),
      ),
      lastUpdated: new Date().toISOString(),
    },
    icons,
  };

  await ensureDir(DIST_DIR);
  await fs.writeFile(
    path.join(DIST_DIR, "index.json"),
    JSON.stringify(index, null, 2),
  );
  await fs.writeFile(
    path.join(DIST_DIR, "manifest.json"),
    JSON.stringify(
      {
        generated: index.generated,
        totalIcons: index.stats.totalIcons,
        sources: index.stats.sources,
      },
      null,
      2,
    ),
  );

  // Build and write inverted index for optimized search
  console.log("Building inverted index...");
  const invertedIndex = buildInvertedIndex(icons);
  await fs.writeFile(
    path.join(DIST_DIR, "inverted-index.json"),
    JSON.stringify(invertedIndex),
  );
  console.log(
    `Inverted index: ${Object.keys(invertedIndex.terms).length} terms, ${Object.keys(invertedIndex.prefixes).length} prefixes`,
  );

  // Copy synonyms to dist
  try {
    const synonymsContent = await fs.readFile(SYNONYMS_PATH, "utf-8");
    await fs.writeFile(path.join(DIST_DIR, "synonyms.json"), synonymsContent);
    console.log("Copied synonyms.json");
  } catch {
    console.log("No synonyms.json found, skipping");
  }

  console.log(`Built ${index.stats.totalIcons} icons.`);
};

buildIcons().catch((error) => {
  console.error(error);
  process.exit(1);
});
