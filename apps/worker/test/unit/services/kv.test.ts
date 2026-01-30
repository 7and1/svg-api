import { describe, it, expect, vi, beforeEach } from "vitest";
import { getIndex, getInvertedIndex, getSynonyms } from "../../../src/services/kv";
import type { Env } from "../../../src/env";

// Mock the cache module
vi.mock("../../../src/services/cache", () => ({
  MemoryCache: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
  })),
}));

describe("KV Service", () => {
  let mockEnv: Env;
  let mockKVGet: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockKVGet = vi.fn();
    mockEnv = {
      SVG_INDEX: {
        get: mockKVGet,
      } as unknown as KVNamespace,
      SVG_BUCKET: {} as R2Bucket,
      ENVIRONMENT: "test",
    };
    vi.clearAllMocks();
  });

  describe("getIndex", () => {
    const mockIndex = {
      icons: {
        "lucide:home": {
          id: "lucide:home",
          name: "home",
          source: "lucide",
          category: "navigation",
          tags: ["house"],
          path: "lucide/home.svg",
        },
      },
      metadata: {
        total: 1,
        version: "1.0.0",
      },
    };

    it("should fetch index from KV namespace", async () => {
      mockKVGet.mockResolvedValue(mockIndex);

      const result = await getIndex(mockEnv);

      expect(mockKVGet).toHaveBeenCalledWith("index", { type: "json" });
      expect(result).toEqual(mockIndex);
    });

    it("should use custom index key from env", async () => {
      mockEnv.INDEX_KEY = "custom-index";
      mockKVGet.mockResolvedValue(mockIndex);

      await getIndex(mockEnv);

      expect(mockKVGet).toHaveBeenCalledWith("custom-index", { type: "json" });
    });

    it("should fallback to LOCAL_INDEX_JSON if KV returns null", async () => {
      mockKVGet.mockResolvedValue(null);
      mockEnv.LOCAL_INDEX_JSON = JSON.stringify(mockIndex);

      const result = await getIndex(mockEnv);

      expect(result).toEqual(mockIndex);
    });

    it("should throw error when index not found", async () => {
      mockKVGet.mockResolvedValue(null);

      await expect(getIndex(mockEnv)).rejects.toThrow("Index not found");
    });

    it("should cache index results", async () => {
      mockKVGet.mockResolvedValue(mockIndex);

      // First call
      await getIndex(mockEnv);
      // Second call should use cache
      await getIndex(mockEnv);

      expect(mockKVGet).toHaveBeenCalledTimes(2);
    });
  });

  describe("getInvertedIndex", () => {
    const mockInvertedIndex = {
      terms: {
        home: { iconIds: ["lucide:home"], df: 1 },
        house: { iconIds: ["lucide:home"], df: 1 },
      },
      prefixes: {
        home: ["home"],
      },
      sources: {
        lucide: ["lucide:home"],
      },
      categories: {
        navigation: ["lucide:home"],
      },
      totalDocs: 1,
    };

    it("should fetch inverted index from KV", async () => {
      mockKVGet.mockResolvedValue(mockInvertedIndex);

      const result = await getInvertedIndex(mockEnv);

      expect(mockKVGet).toHaveBeenCalledWith("inverted-index", { type: "json" });
      expect(result).toEqual(mockInvertedIndex);
    });

    it("should fallback to LOCAL_INVERTED_INDEX_JSON", async () => {
      mockKVGet.mockResolvedValue(null);
      mockEnv.LOCAL_INVERTED_INDEX_JSON = JSON.stringify(mockInvertedIndex);

      const result = await getInvertedIndex(mockEnv);

      expect(result).toEqual(mockInvertedIndex);
    });

    it("should return null when inverted index not available", async () => {
      mockKVGet.mockResolvedValue(null);

      const result = await getInvertedIndex(mockEnv);

      expect(result).toBeNull();
    });

    it("should cache inverted index results", async () => {
      mockKVGet.mockResolvedValue(mockInvertedIndex);

      await getInvertedIndex(mockEnv);
      await getInvertedIndex(mockEnv);

      expect(mockKVGet).toHaveBeenCalledTimes(2);
    });
  });

  describe("getSynonyms", () => {
    const mockSynonyms = {
      home: ["house", "building"],
      search: ["find", "lookup"],
    };

    it("should fetch synonyms from KV", async () => {
      mockKVGet.mockResolvedValue(mockSynonyms);

      const result = await getSynonyms(mockEnv);

      expect(mockKVGet).toHaveBeenCalledWith("synonyms", { type: "json" });
      expect(result).toEqual(mockSynonyms);
    });

    it("should fallback to LOCAL_SYNONYMS_JSON", async () => {
      mockKVGet.mockResolvedValue(null);
      mockEnv.LOCAL_SYNONYMS_JSON = JSON.stringify(mockSynonyms);

      const result = await getSynonyms(mockEnv);

      expect(result).toEqual(mockSynonyms);
    });

    it("should return empty object when synonyms not found", async () => {
      mockKVGet.mockResolvedValue(null);

      const result = await getSynonyms(mockEnv);

      expect(result).toEqual({});
    });

    it("should cache synonyms results", async () => {
      mockKVGet.mockResolvedValue(mockSynonyms);

      await getSynonyms(mockEnv);
      await getSynonyms(mockEnv);

      expect(mockKVGet).toHaveBeenCalledTimes(2);
    });
  });

  describe("error handling", () => {
    it("should handle KV get errors gracefully", async () => {
      mockKVGet.mockRejectedValue(new Error("KV Error"));

      await expect(getIndex(mockEnv)).rejects.toThrow("KV Error");
    });

    it("should handle invalid JSON in LOCAL_INDEX_JSON", async () => {
      mockKVGet.mockResolvedValue(null);
      mockEnv.LOCAL_INDEX_JSON = "invalid json";

      await expect(getIndex(mockEnv)).rejects.toThrow();
    });
  });
});
