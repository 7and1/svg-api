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
