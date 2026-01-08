import type { Context } from "hono";
import type { Env } from "../env";
import { getIndex, getInvertedIndex, getSynonyms } from "../services/kv";
import { MemoryCache } from "../services/cache";
import { errorResponse, jsonResponse } from "../utils/response";
import { parseLimit, parseOffset, sourceSchema } from "../utils/validation";
import type {
  IconIndex,
  InvertedIndex,
  SearchResult,
  SynonymMap,
} from "@svg-api/shared/types";

// Cache for search results (query -> results)
const searchCache = new MemoryCache<SearchResult[]>(200);
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const tokenize = (value: string): string[] =>
  value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1);

// Expand query with synonyms
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

// Score types for ranking
const SCORE_EXACT_NAME = 2.0;
const SCORE_NAME_CONTAINS = 0.8;
const SCORE_EXACT_TAG = 0.5;
const SCORE_TOKEN_IN_NAME = 0.15;
const SCORE_TOKEN_IN_TAG = 0.2;
const SCORE_PREFIX_MATCH = 0.3;
const SCORE_SYNONYM_MATCH = 0.1;

// Optimized search using inverted index
const searchWithInvertedIndex = (
  query: string,
  tokens: string[],
  expandedTokens: Set<string>,
  invertedIndex: InvertedIndex,
  index: IconIndex,
  source?: string,
  category?: string,
): SearchResult[] => {
  const candidateScores = new Map<string, number>();
  const totalDocs = invertedIndex.totalDocs;

  // Get candidate icons from inverted index
  const getCandidatesForTerm = (term: string): string[] => {
    // Exact term match
    const exactMatch = invertedIndex.terms[term];
    if (exactMatch) {
      return exactMatch.iconIds;
    }

    // Prefix match using prefix index
    const prefixKey = term.slice(0, Math.min(term.length, 4));
    const matchingTerms = invertedIndex.prefixes[prefixKey];
    if (matchingTerms) {
      const candidates = new Set<string>();
      for (const matchedTerm of matchingTerms) {
        if (matchedTerm.startsWith(term) || term.startsWith(matchedTerm)) {
          const entry = invertedIndex.terms[matchedTerm];
          if (entry) {
            entry.iconIds.forEach((id) => candidates.add(id));
          }
        }
      }
      return Array.from(candidates);
    }

    return [];
  };

  // Collect all candidate icon IDs
  const allCandidates = new Set<string>();

  // Add candidates from exact query match
  const queryMatch = invertedIndex.terms[query];
  if (queryMatch) {
    queryMatch.iconIds.forEach((id) => allCandidates.add(id));
  }

  // Add candidates from each token
  for (const token of expandedTokens) {
    const candidates = getCandidatesForTerm(token);
    candidates.forEach((id) => allCandidates.add(id));
  }

  // If source filter is specified, intersect with source index
  let filteredCandidates: Set<string>;
  if (source) {
    const sourceIcons = invertedIndex.sources[source];
    if (!sourceIcons) {
      return [];
    }
    const sourceSet = new Set(sourceIcons);
    filteredCandidates = new Set(
      [...allCandidates].filter((id) => sourceSet.has(id)),
    );
  } else {
    filteredCandidates = allCandidates;
  }

  // If category filter is specified, intersect with category index
  if (category) {
    const categoryIcons = invertedIndex.categories[category];
    if (!categoryIcons) {
      return [];
    }
    const categorySet = new Set(categoryIcons);
    filteredCandidates = new Set(
      [...filteredCandidates].filter((id) => categorySet.has(id)),
    );
  }

  // Score each candidate
  for (const iconId of filteredCandidates) {
    const icon = index.icons[iconId];
    if (!icon) continue;

    let score = 0;
    const nameLower = icon.name.toLowerCase();
    const tagSet = new Set(icon.tags.map((t) => t.toLowerCase()));

    // Exact name match (highest priority)
    if (nameLower === query) {
      score += SCORE_EXACT_NAME;
    } else if (nameLower.includes(query)) {
      score += SCORE_NAME_CONTAINS;
    }

    // Exact tag match
    if (tagSet.has(query)) {
      score += SCORE_EXACT_TAG;
    }

    // Token matches
    for (const token of tokens) {
      if (nameLower.includes(token)) {
        score += SCORE_TOKEN_IN_NAME;
      }
      if (tagSet.has(token)) {
        score += SCORE_TOKEN_IN_TAG;
      }
    }

    // Prefix matches
    for (const token of tokens) {
      if (nameLower.startsWith(token)) {
        score += SCORE_PREFIX_MATCH;
      }
    }

    // Synonym matches (lower weight than direct matches)
    const originalTokens = new Set(tokens);
    for (const token of expandedTokens) {
      if (!originalTokens.has(token)) {
        if (nameLower.includes(token) || tagSet.has(token)) {
          score += SCORE_SYNONYM_MATCH;
        }
      }
    }

    // Apply TF-IDF boost for rare terms
    for (const token of tokens) {
      const entry = invertedIndex.terms[token];
      if (entry && entry.df > 0) {
        // IDF = log(N / df) - boost rare terms
        const idf = Math.log(totalDocs / entry.df);
        score += idf * 0.05; // Small IDF bonus
      }
    }

    if (score > 0) {
      candidateScores.set(iconId, score);
    }
  }

  // Convert to results
  const results: SearchResult[] = [];
  for (const [iconId, score] of candidateScores) {
    const icon = index.icons[iconId];
    if (icon) {
      results.push({
        id: icon.id,
        name: icon.name,
        source: icon.source,
        category: icon.category,
        tags: icon.tags,
        score: Number(score.toFixed(3)),
      });
    }
  }

  return results;
};

// Fallback linear search (when inverted index not available)
const linearSearch = (
  query: string,
  tokens: string[],
  index: IconIndex,
  source?: string,
  category?: string,
): SearchResult[] => {
  const results: SearchResult[] = [];

  for (const icon of Object.values(index.icons)) {
    if (source && icon.source !== source) continue;
    if (category && icon.category !== category) continue;

    let score = 0;
    const nameLower = icon.name.toLowerCase();
    const tagSet = new Set(icon.tags.map((tag) => tag.toLowerCase()));

    if (nameLower === query) score += SCORE_EXACT_NAME;
    if (nameLower.includes(query)) score += SCORE_NAME_CONTAINS;
    for (const token of tokens) {
      if (nameLower.includes(token)) score += SCORE_TOKEN_IN_NAME;
      if (tagSet.has(token)) score += SCORE_TOKEN_IN_TAG;
    }
    if (tagSet.has(query)) score += SCORE_EXACT_TAG;

    if (score <= 0) continue;

    results.push({
      id: icon.id,
      name: icon.name,
      source: icon.source,
      category: icon.category,
      tags: icon.tags,
      score: Number(score.toFixed(3)),
    });
  }

  return results;
};

const getPrefix = (path: string) => (path.startsWith("/v1/") ? "/v1" : "");

// Generate cache key for search
const getCacheKey = (
  query: string,
  source?: string,
  category?: string,
): string => {
  return `${query}|${source ?? ""}|${category ?? ""}`;
};

export const searchHandler = async (c: Context<{ Bindings: Env }>) => {
  const query = c.req.query("q")?.trim().toLowerCase();
  if (!query || query.length < 2) {
    return errorResponse(
      c,
      "INVALID_PARAMETER",
      "Query must be at least 2 characters",
      400,
      { q: query },
    );
  }

  const source = c.req.query("source")?.toLowerCase();
  if (source && !sourceSchema.safeParse(source).success) {
    return errorResponse(c, "INVALID_PARAMETER", "Invalid source name", 400, {
      source,
    });
  }

  const category = c.req.query("category")?.toLowerCase();
  const limit = parseLimit(c.req.query("limit"), 20, 100);
  const offset = parseOffset(c.req.query("offset"));

  const start = Date.now();

  // Check cache first
  const cacheKey = getCacheKey(query, source, category);
  let results = searchCache.get(cacheKey);
  let searchMethod: string;
  let cacheHit = false;

  if (results) {
    searchMethod = "cached";
    cacheHit = true;
  } else {
    // Load data in parallel
    const [index, invertedIndex, synonyms] = await Promise.all([
      getIndex(c.env),
      getInvertedIndex(c.env),
      getSynonyms(c.env),
    ]);

    const tokens = tokenize(query);
    const expandedTokens = expandQueryWithSynonyms(tokens, synonyms);

    if (invertedIndex) {
      // Use optimized inverted index search
      results = searchWithInvertedIndex(
        query,
        tokens,
        expandedTokens,
        invertedIndex,
        index,
        source,
        category,
      );
      searchMethod = "inverted_index";
    } else {
      // Fallback to linear search
      results = linearSearch(query, tokens, index, source, category);
      searchMethod = "linear";
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Cache the results
    searchCache.set(cacheKey, results, SEARCH_CACHE_TTL_MS);
  }

  const total = results.length;
  const page = results.slice(offset, offset + limit);

  const origin = new URL(c.req.url).origin;
  const prefix = getPrefix(c.req.path);

  const payload = page.map((result) => ({
    name: result.name,
    source: result.source,
    category: result.category,
    score: result.score,
    preview_url: `${origin}${prefix}/icons/${result.name}?source=${result.source}`,
    matches: {
      name: result.name.includes(query),
      tags: result.tags.filter((tag) => tag.includes(query)),
    },
  }));

  return jsonResponse(c, payload, {
    query,
    total,
    limit,
    offset,
    has_more: offset + limit < total,
    search_time_ms: Date.now() - start,
    search_method: searchMethod,
    cache_hit: cacheHit,
  });
};
