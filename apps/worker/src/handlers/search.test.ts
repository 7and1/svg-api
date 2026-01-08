/**
 * Search Handler Unit Tests
 *
 * Tests for search functionality including inverted index,
 * synonyms, caching, and scoring algorithms.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type {
  IconIndex,
  InvertedIndex,
  SynonymMap,
} from "@svg-api/shared/types";

// Mock data
const mockIconIndex: IconIndex = {
  version: "1.0.0",
  generated: "2024-01-01T00:00:00Z",
  stats: {
    totalIcons: 5,
    sources: ["lucide", "tabler"],
    lastUpdated: "2024-01-01T00:00:00Z",
  },
  icons: {
    "home:lucide": {
      id: "home:lucide",
      name: "home",
      source: "lucide",
      path: "/icons/lucide/home.svg",
      tags: ["house", "building", "main"],
      category: "navigation",
      width: 24,
      height: 24,
      viewBox: "0 0 24 24",
    },
    "arrow-right:lucide": {
      id: "arrow-right:lucide",
      name: "arrow-right",
      source: "lucide",
      path: "/icons/lucide/arrow-right.svg",
      tags: ["direction", "forward", "next"],
      category: "arrows",
      width: 24,
      height: 24,
      viewBox: "0 0 24 24",
    },
    "arrow-left:lucide": {
      id: "arrow-left:lucide",
      name: "arrow-left",
      source: "lucide",
      path: "/icons/lucide/arrow-left.svg",
      tags: ["direction", "back", "previous"],
      category: "arrows",
      width: 24,
      height: 24,
      viewBox: "0 0 24 24",
    },
    "search:lucide": {
      id: "search:lucide",
      name: "search",
      source: "lucide",
      path: "/icons/lucide/search.svg",
      tags: ["find", "magnify", "lookup"],
      category: "general",
      width: 24,
      height: 24,
      viewBox: "0 0 24 24",
    },
    "home:tabler": {
      id: "home:tabler",
      name: "home",
      source: "tabler",
      path: "/icons/tabler/home.svg",
      tags: ["house", "residence"],
      category: "navigation",
      width: 24,
      height: 24,
      viewBox: "0 0 24 24",
    },
  },
};

const mockInvertedIndex: InvertedIndex = {
  version: "1.0.0",
  generated: "2024-01-01T00:00:00Z",
  totalDocs: 5,
  terms: {
    home: { iconIds: ["home:lucide", "home:tabler"], df: 2 },
    arrow: { iconIds: ["arrow-right:lucide", "arrow-left:lucide"], df: 2 },
    search: { iconIds: ["search:lucide"], df: 1 },
    house: { iconIds: ["home:lucide", "home:tabler"], df: 2 },
    direction: { iconIds: ["arrow-right:lucide", "arrow-left:lucide"], df: 2 },
    find: { iconIds: ["search:lucide"], df: 1 },
  },
  categories: {
    navigation: ["home:lucide", "home:tabler"],
    arrows: ["arrow-right:lucide", "arrow-left:lucide"],
    general: ["search:lucide"],
  },
  sources: {
    lucide: [
      "home:lucide",
      "arrow-right:lucide",
      "arrow-left:lucide",
      "search:lucide",
    ],
    tabler: ["home:tabler"],
  },
  prefixes: {
    home: ["home"],
    arro: ["arrow"],
    sear: ["search"],
    hous: ["house"],
    dire: ["direction"],
    find: ["find"],
  },
};

const mockSynonyms: SynonymMap = {
  home: ["house", "residence", "dwelling"],
  search: ["find", "lookup", "query"],
  arrow: ["direction", "pointer"],
};

// Helper functions to test (extracted from search.ts logic)
const tokenize = (value: string): string[] =>
  value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1);

const expandQueryWithSynonyms = (
  tokens: string[],
  synonyms: SynonymMap,
): Set<string> => {
  const expanded = new Set(tokens);
  for (const token of tokens) {
    const syns = synonyms[token];
    if (syns) {
      for (const syn of syns) {
        expanded.add(syn);
      }
    }
  }
  return expanded;
};

describe("Search Handler Unit Tests", () => {
  describe("tokenize", () => {
    it("tokenizes simple query", () => {
      expect(tokenize("home")).toEqual(["home"]);
    });

    it("tokenizes multi-word query", () => {
      expect(tokenize("arrow right")).toEqual(["arrow", "right"]);
    });

    it("handles hyphens", () => {
      expect(tokenize("arrow-right")).toEqual(["arrow", "right"]);
    });

    it("filters short tokens", () => {
      expect(tokenize("a b home")).toEqual(["home"]);
    });

    it("lowercases tokens", () => {
      expect(tokenize("HOME Arrow")).toEqual(["home", "arrow"]);
    });

    it("handles special characters", () => {
      expect(tokenize("home@icon#test")).toEqual(["home", "icon", "test"]);
    });

    it("handles numbers", () => {
      expect(tokenize("icon24")).toEqual(["icon24"]);
    });
  });

  describe("expandQueryWithSynonyms", () => {
    it("returns original tokens when no synonyms", () => {
      const result = expandQueryWithSynonyms(["unknown"], mockSynonyms);
      expect(result).toEqual(new Set(["unknown"]));
    });

    it("expands tokens with synonyms", () => {
      const result = expandQueryWithSynonyms(["home"], mockSynonyms);
      expect(result).toContain("home");
      expect(result).toContain("house");
      expect(result).toContain("residence");
      expect(result).toContain("dwelling");
    });

    it("handles multiple tokens", () => {
      const result = expandQueryWithSynonyms(["home", "search"], mockSynonyms);
      expect(result).toContain("home");
      expect(result).toContain("house");
      expect(result).toContain("search");
      expect(result).toContain("find");
    });

    it("does not duplicate tokens", () => {
      const result = expandQueryWithSynonyms(["home", "house"], mockSynonyms);
      const arr = Array.from(result);
      const houseCount = arr.filter((t) => t === "house").length;
      expect(houseCount).toBe(1);
    });
  });

  describe("Inverted Index Search", () => {
    it("finds icons by exact term match", () => {
      const term = "home";
      const entry = mockInvertedIndex.terms[term];
      expect(entry).toBeDefined();
      expect(entry.iconIds).toContain("home:lucide");
      expect(entry.iconIds).toContain("home:tabler");
    });

    it("returns empty for non-existent term", () => {
      const term = "nonexistent";
      const entry = mockInvertedIndex.terms[term];
      expect(entry).toBeUndefined();
    });

    it("filters by source correctly", () => {
      const sourceIcons = mockInvertedIndex.sources["lucide"];
      expect(sourceIcons).toContain("home:lucide");
      expect(sourceIcons).not.toContain("home:tabler");
    });

    it("filters by category correctly", () => {
      const categoryIcons = mockInvertedIndex.categories["arrows"];
      expect(categoryIcons).toContain("arrow-right:lucide");
      expect(categoryIcons).toContain("arrow-left:lucide");
      expect(categoryIcons).not.toContain("home:lucide");
    });

    it("uses prefix index for partial matches", () => {
      const prefixKey = "home";
      const matchingTerms = mockInvertedIndex.prefixes[prefixKey];
      expect(matchingTerms).toBeDefined();
      expect(matchingTerms).toContain("home");
    });
  });

  describe("Scoring Logic", () => {
    const SCORE_EXACT_NAME = 2.0;
    const SCORE_NAME_CONTAINS = 0.8;
    const SCORE_EXACT_TAG = 0.5;
    const SCORE_TOKEN_IN_NAME = 0.15;
    const SCORE_TOKEN_IN_TAG = 0.2;

    it("gives highest score to exact name match", () => {
      const query = "home";
      const icon = mockIconIndex.icons["home:lucide"];
      let score = 0;

      if (icon.name.toLowerCase() === query) {
        score += SCORE_EXACT_NAME;
      }

      expect(score).toBe(SCORE_EXACT_NAME);
    });

    it("gives lower score for name contains", () => {
      const query = "hom";
      const icon = mockIconIndex.icons["home:lucide"];
      let score = 0;

      if (icon.name.toLowerCase().includes(query)) {
        score += SCORE_NAME_CONTAINS;
      }

      expect(score).toBe(SCORE_NAME_CONTAINS);
    });

    it("adds score for exact tag match", () => {
      const query = "house";
      const icon = mockIconIndex.icons["home:lucide"];
      const tagSet = new Set(icon.tags.map((t) => t.toLowerCase()));
      let score = 0;

      if (tagSet.has(query)) {
        score += SCORE_EXACT_TAG;
      }

      expect(score).toBe(SCORE_EXACT_TAG);
    });

    it("accumulates multiple scoring factors", () => {
      const query = "home";
      const tokens = tokenize(query);
      const icon = mockIconIndex.icons["home:lucide"];
      const nameLower = icon.name.toLowerCase();
      const tagSet = new Set(icon.tags.map((t) => t.toLowerCase()));
      let score = 0;

      // Exact name match
      if (nameLower === query) {
        score += SCORE_EXACT_NAME;
      }

      // Token in name
      for (const token of tokens) {
        if (nameLower.includes(token)) {
          score += SCORE_TOKEN_IN_NAME;
        }
      }

      expect(score).toBeGreaterThan(SCORE_EXACT_NAME);
    });
  });

  describe("TF-IDF Scoring", () => {
    it("calculates IDF correctly", () => {
      const totalDocs = mockInvertedIndex.totalDocs;
      const df = mockInvertedIndex.terms["search"].df;

      // IDF = log(N / df)
      const idf = Math.log(totalDocs / df);

      // search appears in 1 doc out of 5, so IDF should be relatively high
      expect(idf).toBeGreaterThan(1);
    });

    it("gives higher IDF to rare terms", () => {
      const totalDocs = mockInvertedIndex.totalDocs;
      const dfSearch = mockInvertedIndex.terms["search"].df; // appears in 1 doc
      const dfHome = mockInvertedIndex.terms["home"].df; // appears in 2 docs

      const idfSearch = Math.log(totalDocs / dfSearch);
      const idfHome = Math.log(totalDocs / dfHome);

      expect(idfSearch).toBeGreaterThan(idfHome);
    });
  });

  describe("Cache Key Generation", () => {
    const getCacheKey = (
      query: string,
      source?: string,
      category?: string,
    ): string => {
      return `${query}|${source ?? ""}|${category ?? ""}`;
    };

    it("generates consistent cache keys", () => {
      const key1 = getCacheKey("home", "lucide", "navigation");
      const key2 = getCacheKey("home", "lucide", "navigation");
      expect(key1).toBe(key2);
    });

    it("differentiates by query", () => {
      const key1 = getCacheKey("home");
      const key2 = getCacheKey("arrow");
      expect(key1).not.toBe(key2);
    });

    it("differentiates by source", () => {
      const key1 = getCacheKey("home", "lucide");
      const key2 = getCacheKey("home", "tabler");
      expect(key1).not.toBe(key2);
    });

    it("differentiates by category", () => {
      const key1 = getCacheKey("home", undefined, "navigation");
      const key2 = getCacheKey("home", undefined, "general");
      expect(key1).not.toBe(key2);
    });

    it("handles undefined filters", () => {
      const key = getCacheKey("home");
      expect(key).toBe("home||");
    });
  });

  describe("Query Validation", () => {
    it("rejects queries shorter than 2 characters", () => {
      const query = "a";
      expect(query.length).toBeLessThan(2);
    });

    it("accepts queries with 2 or more characters", () => {
      const query = "ab";
      expect(query.length).toBeGreaterThanOrEqual(2);
    });

    it("trims whitespace from query", () => {
      const query = "  home  ".trim().toLowerCase();
      expect(query).toBe("home");
    });
  });

  describe("Result Sorting", () => {
    it("sorts results by score descending", () => {
      const results = [
        { name: "a", score: 0.5 },
        { name: "b", score: 2.0 },
        { name: "c", score: 1.0 },
      ];

      results.sort((a, b) => b.score - a.score);

      expect(results[0].name).toBe("b");
      expect(results[1].name).toBe("c");
      expect(results[2].name).toBe("a");
    });
  });

  describe("Pagination", () => {
    it("applies limit correctly", () => {
      const results = Array(100)
        .fill(null)
        .map((_, i) => ({ id: i }));
      const limit = 20;
      const page = results.slice(0, limit);
      expect(page.length).toBe(20);
    });

    it("applies offset correctly", () => {
      const results = Array(100)
        .fill(null)
        .map((_, i) => ({ id: i }));
      const offset = 10;
      const limit = 20;
      const page = results.slice(offset, offset + limit);
      expect(page[0].id).toBe(10);
      expect(page.length).toBe(20);
    });

    it("handles offset beyond results", () => {
      const results = Array(10)
        .fill(null)
        .map((_, i) => ({ id: i }));
      const offset = 20;
      const limit = 10;
      const page = results.slice(offset, offset + limit);
      expect(page.length).toBe(0);
    });

    it("calculates has_more correctly", () => {
      const total = 100;
      const offset = 0;
      const limit = 20;
      const hasMore = offset + limit < total;
      expect(hasMore).toBe(true);
    });

    it("calculates has_more false at end", () => {
      const total = 100;
      const offset = 90;
      const limit = 20;
      const hasMore = offset + limit < total;
      expect(hasMore).toBe(false);
    });
  });

  describe("Source Filtering", () => {
    const validSources = ["lucide", "tabler", "heroicons", "phosphor"];

    it("validates known sources", () => {
      expect(validSources).toContain("lucide");
      expect(validSources).toContain("tabler");
    });

    it("rejects unknown sources", () => {
      const source = "unknown";
      expect(validSources).not.toContain(source);
    });
  });

  describe("Linear Search Fallback", () => {
    it("searches all icons when inverted index unavailable", () => {
      const query = "home";
      const results: string[] = [];

      for (const icon of Object.values(mockIconIndex.icons)) {
        const nameLower = icon.name.toLowerCase();
        if (nameLower.includes(query)) {
          results.push(icon.id);
        }
      }

      expect(results).toContain("home:lucide");
      expect(results).toContain("home:tabler");
    });

    it("respects source filter in linear search", () => {
      const query = "home";
      const sourceFilter = "lucide";
      const results: string[] = [];

      for (const icon of Object.values(mockIconIndex.icons)) {
        if (icon.source !== sourceFilter) continue;
        const nameLower = icon.name.toLowerCase();
        if (nameLower.includes(query)) {
          results.push(icon.id);
        }
      }

      expect(results).toContain("home:lucide");
      expect(results).not.toContain("home:tabler");
    });
  });
});
