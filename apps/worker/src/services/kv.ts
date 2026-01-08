import type {
  IconIndex,
  InvertedIndex,
  SynonymMap,
} from "@svg-api/shared/types";
import {
  DEFAULT_INDEX_KEY,
  INVERTED_INDEX_KEY,
  SYNONYMS_KEY,
} from "@svg-api/shared/constants";
import { MemoryCache } from "./cache";
import type { Env } from "../env";

const indexCache = new MemoryCache<IconIndex>(10);
const invertedIndexCache = new MemoryCache<InvertedIndex>(10);
const synonymsCache = new MemoryCache<SynonymMap>(10);
const INDEX_TTL_MS = 60_000;

export const getIndex = async (env: Env): Promise<IconIndex> => {
  const cacheKey = env.INDEX_KEY ?? DEFAULT_INDEX_KEY;
  const cached = indexCache.get(cacheKey);
  if (cached) return cached;

  let raw: IconIndex | null = null;

  if (env.SVG_INDEX) {
    raw = (await env.SVG_INDEX.get(cacheKey, {
      type: "json",
    })) as IconIndex | null;
  }

  if (!raw && env.LOCAL_INDEX_JSON) {
    raw = JSON.parse(env.LOCAL_INDEX_JSON) as IconIndex;
  }

  if (!raw) {
    throw new Error(`Index not found for key ${cacheKey}`);
  }

  indexCache.set(cacheKey, raw, INDEX_TTL_MS);
  return raw;
};

export const getInvertedIndex = async (
  env: Env,
): Promise<InvertedIndex | null> => {
  const cacheKey = INVERTED_INDEX_KEY;
  const cached = invertedIndexCache.get(cacheKey);
  if (cached) return cached;

  let raw: InvertedIndex | null = null;

  if (env.SVG_INDEX) {
    raw = (await env.SVG_INDEX.get(cacheKey, {
      type: "json",
    })) as InvertedIndex | null;
  }

  if (!raw && env.LOCAL_INVERTED_INDEX_JSON) {
    raw = JSON.parse(env.LOCAL_INVERTED_INDEX_JSON) as InvertedIndex;
  }

  if (raw) {
    invertedIndexCache.set(cacheKey, raw, INDEX_TTL_MS);
  }

  return raw;
};

export const getSynonyms = async (env: Env): Promise<SynonymMap> => {
  const cacheKey = SYNONYMS_KEY;
  const cached = synonymsCache.get(cacheKey);
  if (cached) return cached;

  let raw: SynonymMap | null = null;

  if (env.SVG_INDEX) {
    raw = (await env.SVG_INDEX.get(cacheKey, {
      type: "json",
    })) as SynonymMap | null;
  }

  if (!raw && env.LOCAL_SYNONYMS_JSON) {
    raw = JSON.parse(env.LOCAL_SYNONYMS_JSON) as SynonymMap;
  }

  const synonyms = raw ?? {};
  synonymsCache.set(cacheKey, synonyms, INDEX_TTL_MS);
  return synonyms;
};
