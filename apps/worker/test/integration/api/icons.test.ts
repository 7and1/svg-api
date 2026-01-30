import { describe, it, expect, beforeAll } from "vitest";
import { createApp } from "../../../src/router";
import type { Env } from "../../../src/env";

// Integration tests for icon API endpoints
// These tests use the actual Hono app with mocked Cloudflare bindings

describe("Icon API Integration", () => {
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
                  tags: ["house", "building"],
                  path: "lucide/home.svg",
                  variants: ["default", "filled"],
                },
                "lucide:user": {
                  id: "lucide:user",
                  name: "user",
                  source: "lucide",
                  category: "people",
                  tags: ["person", "account"],
                  path: "lucide/user.svg",
                },
              },
            };
          }
          return null;
        },
      } as unknown as KVNamespace,
      SVG_BUCKET: {
        get: async () => ({
          text: async () =>
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
        }),
      } as unknown as R2Bucket,
      ENVIRONMENT: "test",
    };
  });

  describe("GET /icons/:name", () => {
    it("should return icon JSON by default", async () => {
      const req = new Request("http://localhost/icons/home?source=lucide");
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("name", "home");
      expect(data).toHaveProperty("source", "lucide");
      expect(data).toHaveProperty("svg");
      expect(data.svg).toContain("<svg");
    });

    it("should return SVG when Accept header is image/svg+xml", async () => {
      const req = new Request("http://localhost/icons/home?source=lucide", {
        headers: { Accept: "image/svg+xml" },
      });
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("image/svg+xml");
      const body = await res.text();
      expect(body).toContain("<svg");
    });

    it("should return 404 for non-existent icon", async () => {
      const req = new Request("http://localhost/icons/nonexistent?source=lucide");
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error.code).toBe("ICON_NOT_FOUND");
    });

    it("should apply size transformation", async () => {
      const req = new Request("http://localhost/icons/home?source=lucide&size=48");
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.svg).toContain('width="48"');
      expect(data.svg).toContain('height="48"');
    });

    it("should apply color transformation", async () => {
      const req = new Request("http://localhost/icons/home?source=lucide&color=red");
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.svg).toContain("red");
    });

    it("should apply stroke width transformation", async () => {
      const req = new Request("http://localhost/icons/home?source=lucide&stroke=1.5");
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.svg).toContain('stroke-width="1.5"');
    });

    it("should return 400 for invalid size", async () => {
      const req = new Request("http://localhost/icons/home?source=lucide&size=999");
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe("INVALID_SIZE");
    });

    it("should return 400 for invalid color", async () => {
      const req = new Request("http://localhost/icons/home?source=lucide&color=invalid");
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe("INVALID_COLOR");
    });

    it("should include ETag header", async () => {
      const req = new Request("http://localhost/icons/home?source=lucide");
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
      expect(res.headers.get("ETag")).toBeDefined();
    });

    it("should include Cache-Control header", async () => {
      const req = new Request("http://localhost/icons/home?source=lucide");
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
      const cacheControl = res.headers.get("Cache-Control");
      expect(cacheControl).toContain("public");
      expect(cacheControl).toContain("immutable");
    });

    it("should handle CORS headers", async () => {
      const req = new Request("http://localhost/icons/home?source=lucide", {
        method: "OPTIONS",
      });
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.headers.get("Access-Control-Allow-Origin")).toBeDefined();
    });
  });

  describe("GET /icons/:source/:name", () => {
    it("should return icon with source in path", async () => {
      const req = new Request("http://localhost/icons/lucide/home");
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("name", "home");
      expect(data).toHaveProperty("source", "lucide");
    });

    it("should override source from query param", async () => {
      const req = new Request("http://localhost/icons/lucide/home?source=material");
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      // Should use source from path (lucide) not query param
      expect(res.status).toBe(404);
    });
  });

  describe("GET /v1/icons/:name", () => {
    it("should support v1 prefix", async () => {
      const req = new Request("http://localhost/v1/icons/home?source=lucide");
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("name", "home");
    });
  });

  describe("Advanced transformations", () => {
    it("should apply rotation", async () => {
      const req = new Request("http://localhost/icons/home?source=lucide&rotate=90");
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.svg).toContain("rotate");
    });

    it("should apply mirror", async () => {
      const req = new Request("http://localhost/icons/home?source=lucide&mirror=true");
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.svg).toContain("scale(-1");
    });

    it("should apply className", async () => {
      const req = new Request("http://localhost/icons/home?source=lucide&class=my-icon");
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.svg).toContain('class="my-icon"');
    });
  });

  describe("Variant handling", () => {
    it("should handle valid variant", async () => {
      const req = new Request("http://localhost/icons/home?source=lucide&variant=filled");
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
    });

    it("should return 400 for invalid variant", async () => {
      const req = new Request("http://localhost/icons/home?source=lucide&variant=nonexistent");
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe("VARIANT_NOT_AVAILABLE");
    });
  });

  describe("Security headers", () => {
    it("should include security headers", async () => {
      const req = new Request("http://localhost/icons/home?source=lucide");
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });
  });
});
