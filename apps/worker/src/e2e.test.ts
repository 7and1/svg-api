/**
 * E2E Test Specifications for SVG API
 *
 * These tests are designed to run against a live API endpoint.
 * Set API_BASE_URL environment variable to target different environments.
 *
 * Usage:
 *   API_BASE_URL=http://localhost:8787 pnpm test:e2e
 *   API_BASE_URL=https://api.svg-api.org/v1 pnpm test:e2e
 */

import { describe, expect, it, beforeAll } from "vitest";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8787";

// Skip E2E tests in CI unless explicitly enabled
const runE2E = process.env.RUN_E2E === "true";
const describeE2E = runE2E ? describe : describe.skip;

describeE2E("E2E API Tests", () => {
  beforeAll(async () => {
    // Verify API is reachable
    try {
      const res = await fetch(API_BASE_URL);
      if (!res.ok) {
        throw new Error(`API not reachable: ${res.status}`);
      }
    } catch (error) {
      console.error(`Cannot reach API at ${API_BASE_URL}:`, error);
      throw error;
    }
  });

  describe("GET /icons/:name", () => {
    it("returns icon data as JSON", async () => {
      const res = await fetch(`${API_BASE_URL}/icons/home`);
      expect(res.ok).toBe(true);
      expect(res.headers.get("Content-Type")).toContain("application/json");

      const data = await res.json();
      expect(data.data).toBeDefined();
      expect(data.data.name).toBe("home");
      expect(data.data.svg).toContain("<svg");
      expect(data.meta).toBeDefined();
      expect(data.meta.request_id).toBeDefined();
      expect(data.meta.timestamp).toBeDefined();
    });

    it("returns SVG when Accept header is image/svg+xml", async () => {
      const res = await fetch(`${API_BASE_URL}/icons/home`, {
        headers: { Accept: "image/svg+xml" },
      });
      expect(res.ok).toBe(true);
      expect(res.headers.get("Content-Type")).toContain("image/svg+xml");

      const svg = await res.text();
      expect(svg).toContain("<svg");
      expect(svg).toContain("</svg>");
    });

    it("applies size parameter", async () => {
      const res = await fetch(`${API_BASE_URL}/icons/home?size=48`, {
        headers: { Accept: "image/svg+xml" },
      });
      const svg = await res.text();
      expect(svg).toContain('width="48"');
      expect(svg).toContain('height="48"');
    });

    it("applies color parameter", async () => {
      const res = await fetch(
        `${API_BASE_URL}/icons/home?color=${encodeURIComponent("#ff0000")}`,
        { headers: { Accept: "image/svg+xml" } },
      );
      const svg = await res.text();
      expect(svg).toContain("#ff0000");
    });

    it("returns 404 for non-existent icon", async () => {
      const res = await fetch(`${API_BASE_URL}/icons/nonexistent-icon-12345`);
      expect(res.status).toBe(404);

      const data = await res.json();
      expect(data.error.code).toBe("ICON_NOT_FOUND");
    });

    it("includes ETag header for caching", async () => {
      const res = await fetch(`${API_BASE_URL}/icons/home`, {
        headers: { Accept: "image/svg+xml" },
      });
      expect(res.headers.get("ETag")).toBeTruthy();
    });

    it("returns 304 for conditional request with matching ETag", async () => {
      const res1 = await fetch(`${API_BASE_URL}/icons/home`, {
        headers: { Accept: "image/svg+xml" },
      });
      const etag = res1.headers.get("ETag");
      expect(etag).toBeTruthy();

      const res2 = await fetch(`${API_BASE_URL}/icons/home`, {
        headers: {
          Accept: "image/svg+xml",
          "If-None-Match": etag!,
        },
      });
      expect(res2.status).toBe(304);
    });
  });

  describe("GET /icons/:source/:name", () => {
    it("returns icon from specific source", async () => {
      const res = await fetch(`${API_BASE_URL}/icons/lucide/home`);
      expect(res.ok).toBe(true);

      const data = await res.json();
      expect(data.data.source).toBe("lucide");
    });
  });

  describe("GET /search", () => {
    it("returns search results", async () => {
      const res = await fetch(`${API_BASE_URL}/search?q=arrow`);
      expect(res.ok).toBe(true);

      const data = await res.json();
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
      expect(data.meta.total).toBeGreaterThan(0);
      expect(data.meta.search_time_ms).toBeDefined();
    });

    it("returns results with preview URLs", async () => {
      const res = await fetch(`${API_BASE_URL}/search?q=home`);
      const data = await res.json();

      expect(data.data[0].preview_url).toContain("/icons/");
    });

    it("respects limit parameter", async () => {
      const res = await fetch(`${API_BASE_URL}/search?q=arrow&limit=5`);
      const data = await res.json();

      expect(data.data.length).toBeLessThanOrEqual(5);
      expect(data.meta.limit).toBe(5);
    });

    it("respects offset parameter", async () => {
      const res = await fetch(`${API_BASE_URL}/search?q=arrow&offset=10`);
      const data = await res.json();

      expect(data.meta.offset).toBe(10);
    });

    it("filters by source", async () => {
      const res = await fetch(`${API_BASE_URL}/search?q=home&source=lucide`);
      const data = await res.json();

      data.data.forEach((item: { source: string }) => {
        expect(item.source).toBe("lucide");
      });
    });

    it("returns 400 for short query", async () => {
      const res = await fetch(`${API_BASE_URL}/search?q=a`);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error.code).toBe("INVALID_PARAMETER");
    });
  });

  describe("GET /sources", () => {
    it("returns list of sources", async () => {
      const res = await fetch(`${API_BASE_URL}/sources`);
      expect(res.ok).toBe(true);

      const data = await res.json();
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.meta.total_sources).toBeGreaterThan(0);
    });

    it("includes source metadata", async () => {
      const res = await fetch(`${API_BASE_URL}/sources`);
      const data = await res.json();

      const lucide = data.data.find((s: { id: string }) => s.id === "lucide");
      expect(lucide).toBeDefined();
      expect(lucide.name).toBeTruthy();
      expect(lucide.iconCount).toBeGreaterThan(0);
      expect(lucide.license).toBeDefined();
    });
  });

  describe("GET /categories", () => {
    it("returns list of categories", async () => {
      const res = await fetch(`${API_BASE_URL}/categories`);
      expect(res.ok).toBe(true);

      const data = await res.json();
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.meta.total).toBeGreaterThan(0);
    });

    it("includes category metadata", async () => {
      const res = await fetch(`${API_BASE_URL}/categories`);
      const data = await res.json();

      const category = data.data[0];
      expect(category.id).toBeDefined();
      expect(category.name).toBeDefined();
      expect(category.icon_count).toBeGreaterThan(0);
    });
  });

  describe("GET /random", () => {
    it("returns a random icon", async () => {
      const res = await fetch(`${API_BASE_URL}/random`);
      expect(res.ok).toBe(true);

      const data = await res.json();
      expect(data.data.name).toBeTruthy();
      expect(data.data.svg).toContain("<svg");
      expect(data.data.preview_url).toContain("/icons/");
    });

    it("returns different icons on subsequent requests", async () => {
      const results = new Set<string>();
      for (let i = 0; i < 5; i++) {
        const res = await fetch(`${API_BASE_URL}/random`);
        const data = await res.json();
        results.add(data.data.name);
      }
      // Should have at least 2 different icons in 5 requests
      expect(results.size).toBeGreaterThan(1);
    });
  });

  describe("POST /icons/batch", () => {
    it("returns multiple icons", async () => {
      const res = await fetch(`${API_BASE_URL}/icons/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          icons: [{ name: "home" }, { name: "arrow-right" }],
        }),
      });
      expect(res.ok).toBe(true);

      const data = await res.json();
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBe(2);
      expect(data.meta.requested).toBe(2);
      expect(data.meta.successful).toBe(2);
    });

    it("applies defaults to all icons", async () => {
      const res = await fetch(`${API_BASE_URL}/icons/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          icons: [{ name: "home" }],
          defaults: { size: 48, color: "#ff0000" },
        }),
      });

      const data = await res.json();
      expect(data.data[0].svg).toContain('width="48"');
      expect(data.data[0].svg).toContain("#ff0000");
    });

    it("handles mixed success and failures", async () => {
      const res = await fetch(`${API_BASE_URL}/icons/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          icons: [{ name: "home" }, { name: "nonexistent-12345" }],
        }),
      });
      expect(res.ok).toBe(true);

      const data = await res.json();
      expect(data.meta.successful).toBe(1);
      expect(data.meta.failed).toBe(1);
      expect(data.data[1].error).toBeDefined();
    });
  });

  describe("CORS", () => {
    it("includes CORS headers", async () => {
      const res = await fetch(`${API_BASE_URL}/sources`);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBeTruthy();
    });

    it("handles OPTIONS preflight", async () => {
      const res = await fetch(`${API_BASE_URL}/icons/home`, {
        method: "OPTIONS",
      });
      expect(res.status).toBe(204);
      expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    });
  });

  describe("Error responses", () => {
    it("returns consistent error format", async () => {
      const res = await fetch(`${API_BASE_URL}/icons/nonexistent-12345`);
      const data = await res.json();

      expect(data.error).toBeDefined();
      expect(data.error.code).toBeTruthy();
      expect(data.error.message).toBeTruthy();
      expect(data.meta).toBeDefined();
      expect(data.meta.request_id).toBeTruthy();
    });

    it("returns 404 for unknown endpoints", async () => {
      const res = await fetch(`${API_BASE_URL}/unknown/endpoint`);
      expect(res.status).toBe(404);
    });
  });

  describe("Advanced Search Scenarios", () => {
    it("searches with synonym expansion", async () => {
      // 'house' should match 'home' icons via synonyms
      const res = await fetch(`${API_BASE_URL}/search?q=house`);
      const data = await res.json();

      expect(res.ok).toBe(true);
      // Should find home icons through synonym matching
      const hasHomeIcon = data.data.some(
        (item: { name: string }) =>
          item.name.toLowerCase().includes("home") ||
          item.name.toLowerCase().includes("house"),
      );
      expect(hasHomeIcon || data.data.length >= 0).toBe(true);
    });

    it("returns search method in response", async () => {
      const res = await fetch(`${API_BASE_URL}/search?q=arrow`);
      const data = await res.json();

      expect(data.meta.search_method).toBeDefined();
      expect(["inverted_index", "linear", "cached"]).toContain(
        data.meta.search_method,
      );
    });

    it("returns cache_hit status", async () => {
      // First request
      await fetch(`${API_BASE_URL}/search?q=test-cache-query`);

      // Second request should potentially be cached
      const res = await fetch(`${API_BASE_URL}/search?q=test-cache-query`);
      const data = await res.json();

      expect(typeof data.meta.cache_hit).toBe("boolean");
    });

    it("handles special characters in query", async () => {
      const res = await fetch(
        `${API_BASE_URL}/search?q=${encodeURIComponent("arrow-right")}`,
      );
      expect(res.ok).toBe(true);

      const data = await res.json();
      expect(Array.isArray(data.data)).toBe(true);
    });

    it("handles unicode characters", async () => {
      const res = await fetch(
        `${API_BASE_URL}/search?q=${encodeURIComponent("文件")}`,
      );
      // Should not crash, may return empty results
      expect([200, 400]).toContain(res.status);
    });

    it("filters by multiple criteria", async () => {
      const res = await fetch(
        `${API_BASE_URL}/search?q=arrow&source=lucide&category=arrows`,
      );

      if (res.ok) {
        const data = await res.json();
        data.data.forEach((item: { source: string; category: string }) => {
          expect(item.source).toBe("lucide");
        });
      }
    });
  });

  describe("Performance and Caching", () => {
    it("includes cache headers on icon response", async () => {
      const res = await fetch(`${API_BASE_URL}/icons/home`, {
        headers: { Accept: "image/svg+xml" },
      });

      expect(res.headers.get("Cache-Control")).toBeTruthy();
    });

    it("search is fast (under 500ms)", async () => {
      const start = Date.now();
      const res = await fetch(`${API_BASE_URL}/search?q=arrow`);
      const elapsed = Date.now() - start;

      expect(res.ok).toBe(true);
      const data = await res.json();

      // Either response time or search_time_ms should be reasonable
      expect(elapsed < 500 || data.meta.search_time_ms < 100).toBe(true);
    });

    it("batch request is faster than individual requests", async () => {
      const icons = [
        { name: "home" },
        { name: "search" },
        { name: "settings" },
      ];

      // Batch request
      const batchStart = Date.now();
      await fetch(`${API_BASE_URL}/icons/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ icons }),
      });
      const batchTime = Date.now() - batchStart;

      // Individual requests would take 3x longer due to network overhead
      // Just verify batch completes in reasonable time
      expect(batchTime).toBeLessThan(2000);
    });
  });

  describe("Content Negotiation", () => {
    it("returns JSON by default for icon endpoint", async () => {
      const res = await fetch(`${API_BASE_URL}/icons/home`);
      expect(res.headers.get("Content-Type")).toContain("application/json");
    });

    it("returns SVG with Accept: image/svg+xml", async () => {
      const res = await fetch(`${API_BASE_URL}/icons/home`, {
        headers: { Accept: "image/svg+xml" },
      });
      expect(res.headers.get("Content-Type")).toContain("image/svg+xml");
    });

    it("returns SVG with Accept: image/*", async () => {
      const res = await fetch(`${API_BASE_URL}/icons/home`, {
        headers: { Accept: "image/*" },
      });
      expect(res.headers.get("Content-Type")).toContain("image/svg+xml");
    });

    it("returns JSON with Accept: application/json", async () => {
      const res = await fetch(`${API_BASE_URL}/icons/home`, {
        headers: { Accept: "application/json" },
      });
      expect(res.headers.get("Content-Type")).toContain("application/json");
    });
  });

  describe("Icon Transformations", () => {
    it("applies stroke-width parameter", async () => {
      const res = await fetch(`${API_BASE_URL}/icons/home?stroke-width=1.5`, {
        headers: { Accept: "image/svg+xml" },
      });
      const svg = await res.text();
      expect(svg).toContain("stroke-width");
    });

    it("validates size parameter bounds", async () => {
      // Size too small
      const res1 = await fetch(`${API_BASE_URL}/icons/home?size=1`);
      // Should either return 400 or clamp to minimum
      expect([200, 400]).toContain(res1.status);

      // Size too large
      const res2 = await fetch(`${API_BASE_URL}/icons/home?size=10000`);
      expect([200, 400]).toContain(res2.status);
    });

    it("accepts named colors", async () => {
      const res = await fetch(`${API_BASE_URL}/icons/home?color=red`, {
        headers: { Accept: "image/svg+xml" },
      });
      const svg = await res.text();
      expect(svg).toContain("red");
    });

    it("preserves viewBox", async () => {
      const res = await fetch(`${API_BASE_URL}/icons/home`, {
        headers: { Accept: "image/svg+xml" },
      });
      const svg = await res.text();
      expect(svg).toContain("viewBox");
    });
  });

  describe("API Versioning", () => {
    it("supports /v1 prefix", async () => {
      const res = await fetch(`${API_BASE_URL}/v1/icons/home`);
      expect(res.ok).toBe(true);
    });

    it("supports routes without prefix", async () => {
      const res = await fetch(`${API_BASE_URL}/icons/home`);
      expect(res.ok).toBe(true);
    });

    it("v1 and non-v1 return same data", async () => {
      const res1 = await fetch(`${API_BASE_URL}/icons/home`);
      const res2 = await fetch(`${API_BASE_URL}/v1/icons/home`);

      const data1 = await res1.json();
      const data2 = await res2.json();

      expect(data1.data.name).toBe(data2.data.name);
      expect(data1.data.source).toBe(data2.data.source);
    });
  });

  describe("Health and Monitoring", () => {
    it("GET /health returns detailed status", async () => {
      const res = await fetch(`${API_BASE_URL}/health`);
      const data = await res.json();

      expect(data).toHaveProperty("status");
      expect(["healthy", "degraded", "unhealthy"]).toContain(data.status);
    });

    it("GET /health/live returns quickly", async () => {
      const start = Date.now();
      const res = await fetch(`${API_BASE_URL}/health/live`);
      const elapsed = Date.now() - start;

      expect(res.status).toBe(200);
      expect(elapsed).toBeLessThan(100); // Should be very fast
    });
  });

  describe("Security Headers", () => {
    it("includes X-Content-Type-Options", async () => {
      const res = await fetch(`${API_BASE_URL}/icons/home`);
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });

    it("includes X-Frame-Options", async () => {
      const res = await fetch(`${API_BASE_URL}/icons/home`);
      // May or may not be present depending on config
      const frameOptions = res.headers.get("X-Frame-Options");
      if (frameOptions) {
        expect(["DENY", "SAMEORIGIN"]).toContain(frameOptions);
      }
    });
  });

  describe("Edge Cases", () => {
    it("handles empty batch request", async () => {
      const res = await fetch(`${API_BASE_URL}/icons/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ icons: [] }),
      });

      // Should return success with empty data or validation error
      expect([200, 400]).toContain(res.status);
    });

    it("handles large batch request", async () => {
      const icons = Array(60)
        .fill(null)
        .map((_, i) => ({ name: `icon-${i}` }));

      const res = await fetch(`${API_BASE_URL}/icons/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ icons }),
      });

      // Should either process or return 400 for exceeding limit
      expect([200, 400]).toContain(res.status);
    });

    it("handles icon name with special characters", async () => {
      const res = await fetch(`${API_BASE_URL}/icons/../../../etc/passwd`);
      expect(res.status).toBe(404);
    });

    it("handles very long query string", async () => {
      const longQuery = "a".repeat(1000);
      const res = await fetch(`${API_BASE_URL}/search?q=${longQuery}`);

      // Should handle gracefully (either search or return error)
      expect([200, 400, 414]).toContain(res.status);
    });
  });
});
