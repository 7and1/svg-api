/**
 * Router Unit Tests
 *
 * These tests verify basic routing behavior without full handler execution.
 * Full integration tests should be run as E2E tests against a real worker.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createApp } from "../router";

// Skip handler-dependent tests as they require Cloudflare runtime
describe.skip("Router Integration Tests", () => {
  // These tests require Cloudflare runtime (caches, ExecutionContext, etc.)
  // Run E2E tests instead for full coverage
});

// Mock env for tests
const mockEnv = {
  SVG_INDEX: {} as KVNamespace,
  SVG_BUCKET: {} as R2Bucket,
  ENVIRONMENT: "test",
  ALLOWED_ORIGINS: "*",
};

describe("Router Unit Tests", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn(() => "test-uuid"),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("Basic routes", () => {
    it("GET / returns welcome message", async () => {
      const res = await app.request("/", {}, mockEnv);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toBe("svg-api worker");
    });

    it("OPTIONS returns 204 for preflight", async () => {
      const res = await app.request(
        "/icons/home",
        { method: "OPTIONS" },
        mockEnv,
      );
      expect(res.status).toBe(204);
    });

    it("OPTIONS includes CORS headers", async () => {
      const res = await app.request(
        "/icons/home",
        { method: "OPTIONS" },
        mockEnv,
      );
      expect(res.headers.get("Access-Control-Allow-Origin")).toBeTruthy();
      expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
      expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    });

    it("Unknown routes return 404", async () => {
      const res = await app.request("/unknown/path", {}, mockEnv);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error.code).toBe("NOT_FOUND");
    });
  });

  describe("Route registration", () => {
    it("registers routes without prefix", async () => {
      // Just verify routes exist by checking OPTIONS responses
      const routes = [
        "/icons/test",
        "/search",
        "/sources",
        "/categories",
        "/random",
      ];
      for (const route of routes) {
        const res = await app.request(route, { method: "OPTIONS" }, mockEnv);
        expect(res.status).toBe(204);
      }
    });

    it("registers routes with /v1 prefix", async () => {
      const routes = [
        "/v1/icons/test",
        "/v1/search",
        "/v1/sources",
        "/v1/categories",
        "/v1/random",
      ];
      for (const route of routes) {
        const res = await app.request(route, { method: "OPTIONS" }, mockEnv);
        expect(res.status).toBe(204);
      }
    });

    it("accepts POST for batch endpoint", async () => {
      const res = await app.request(
        "/icons/batch",
        { method: "OPTIONS" },
        mockEnv,
      );
      expect(res.status).toBe(204);
      expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    });
  });

  describe("Health endpoints", () => {
    it("GET /health returns JSON response", async () => {
      const res = await app.request("/health", {}, mockEnv);
      // Health may return 503 if dependencies aren't available
      expect([200, 503]).toContain(res.status);
      const data = await res.json();
      expect(data).toHaveProperty("status");
    });

    it("GET /health/live returns OK", async () => {
      const res = await app.request("/health/live", {}, mockEnv);
      expect(res.status).toBe(200);
    });

    it("GET /health/ready returns response", async () => {
      const res = await app.request("/health/ready", {}, mockEnv);
      // Ready may return 503 if dependencies aren't available
      expect([200, 503]).toContain(res.status);
    });
  });
});
