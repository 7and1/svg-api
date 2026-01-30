import { describe, it, expect, beforeAll } from "vitest";
import { createApp } from "../../../src/router";
import type { Env } from "../../../src/env";
import type { SearchResult } from "@svg-api/shared/types";

describe("Search API Integration", () => {
  let app: ReturnType<typeof createApp>;
  let mockEnv: Env;

  beforeAll(() => {
    app = createApp();
    mockEnv = {
      SVG_INDEX: {
        get: async (key: string) => {
          if (key === "index") {
            return {
              icons: {
                "lucide:home": {
                  id: "lucide:home",
                  name: "home",
                  source: "lucide",
                  category: "navigation",
                  tags: ["house", "building", "main"],
                },
                "lucide:house": {
                  id: "lucide:house",
                  name: "house",
                  source: "lucide",
                  category: "navigation",
                  tags: ["home", "building"],
                },
                "lucide:user": {
                  id: "lucide:user",
                  name: "user",
                  source: "lucide",
                  category: "people",
                  tags: ["person", "account", "profile"],
                },
                "lucide:search": {
                  id: "lucide:search",
                  name: "search",
                  source: "lucide",
                  category: "action",
                  tags: ["find", "lookup", "magnifier"],
                },
                "material:home": {
                  id: "material:home",
                  name: "home",
                  source: "material",
                  category: "navigation",
                  tags: ["house"],
                },
              },
            };
          }
          if (key === "inverted-index") {
            return {
              terms: {
                home: { iconIds: ["lucide:home", "material:home", "lucide:house"], df: 3 },
                house: { iconIds: ["lucide:home", "lucide:house"], df: 2 },
                user: { iconIds: ["lucide:user"], df: 1 },
                search: { iconIds: ["lucide:search"], df: 1 },
              },
              prefixes: {
                home: ["home"],
                hous: ["house"],
                user: ["user"],
                sear: ["search"],
              },
              sources: {
                lucide: ["lucide:home", "lucide:house", "lucide:user", "lucide:search"],
                material: ["material:home"],
              },
              categories: {
                navigation: ["lucide:home", "lucide:house", "material:home"],
                people: ["lucide:user"],
                action: ["lucide:search"],
              },
              totalDocs: 5,
            };
          }
          if (key === "synonyms") {
            return {
              home: ["house", "building"],
              house: ["home", "building"],
              search: ["find", "lookup"],
            };
          }
          return null;
        },
      } as unknown as KVNamespace,
      SVG_BUCKET: {} as R2Bucket,
      ENVIRONMENT: "test",
    };
  });

  describe("GET /search", () => {
    it("should search icons by name", async () => {
      const req = new Request("http://localhost/search?q=home");
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("data");
      expect(data).toHaveProperty("meta");
      expect(data.meta.query).toBe("home");
      expect(data.data.length).toBeGreaterThan(0);
    });

    it("should require at least 2 characters for search", async () => {
      const req = new Request("http://localhost/search?q=h");
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe("INVALID_PARAMETER");
    });

    it("should filter by source", async () => {
      const req = new Request("http://localhost/search?q=home&source=lucide");
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.every((item: SearchResult) => item.source === "lucide")).toBe(true);
    });

    it("should filter by category", async () => {
      const req = new Request("http://localhost/search?q=user&category=people");
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.every((item: SearchResult) => item.category === "people")).toBe(true);
    });

    it("should respect limit parameter", async () => {
      const req = new Request("http://localhost/search?q=home&limit=2");
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.length).toBeLessThanOrEqual(2);
      expect(data.meta.limit).toBe(2);
    });

    it("should respect offset parameter", async () => {
      const req = new Request("http://localhost/search?q=home&offset=1");
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.meta.offset).toBe(1);
    });

    it("should return has_more in meta", async () => {
      const req = new Request("http://localhost/search?q=home&limit=1");
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.meta).toHaveProperty("has_more");
      expect(typeof data.meta.has_more).toBe("boolean");
    });

    it("should include search_time_ms in meta", async () => {
      const req = new Request("http://localhost/search?q=home");
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.meta).toHaveProperty("search_time_ms");
      expect(typeof data.meta.search_time_ms).toBe("number");
    });

    it("should include search_method in meta", async () => {
      const req = new Request("http://localhost/search?q=home");
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.meta).toHaveProperty("search_method");
      expect(["inverted_index", "linear", "cached"]).toContain(data.meta.search_method);
    });

    it("should include total count in meta", async () => {
      const req = new Request("http://localhost/search?q=home");
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.meta).toHaveProperty("total");
      expect(typeof data.meta.total).toBe("number");
    });

    it("should include preview_url in results", async () => {
      const req = new Request("http://localhost/search?q=home");
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data[0]).toHaveProperty("preview_url");
      expect(data.data[0].preview_url).toContain("/icons/");
    });

    it("should include matches info in results", async () => {
      const req = new Request("http://localhost/search?q=home");
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data[0]).toHaveProperty("matches");
      expect(data.data[0].matches).toHaveProperty("name");
      expect(data.data[0].matches).toHaveProperty("tags");
    });

    it("should return empty results for no matches", async () => {
      const req = new Request("http://localhost/search?q=xyznonexistent");
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data).toEqual([]);
      expect(data.meta.total).toBe(0);
    });

    it("should handle special characters in query", async () => {
      const req = new Request("http://localhost/search?q=home%20icon");
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
    });

    it("should support v1 prefix", async () => {
      const req = new Request("http://localhost/v1/search?q=home");
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("data");
    });
  });

  describe("Search ranking", () => {
    it("should rank exact name matches higher", async () => {
      const req = new Request("http://localhost/search?q=user");
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
      const data = await res.json();
      // Exact match should be first
      expect(data.data[0].name).toBe("user");
    });

    it("should include score in results", async () => {
      const req = new Request("http://localhost/search?q=home");
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data[0]).toHaveProperty("score");
      expect(typeof data.data[0].score).toBe("number");
    });
  });

  describe("Caching", () => {
    it("should indicate cache hit in meta", async () => {
      // First request
      const req1 = new Request("http://localhost/search?q=home");
      await app.fetch(req1, mockEnv, {} as ExecutionContext);

      // Second request (should be cached)
      const req2 = new Request("http://localhost/search?q=home");
      const res2 = await app.fetch(req2, mockEnv, {} as ExecutionContext);

      expect(res2.status).toBe(200);
      const data = await res2.json();
      expect(data.meta).toHaveProperty("cache_hit");
      expect(typeof data.meta.cache_hit).toBe("boolean");
    });
  });
});
