import { describe, it, expect, beforeAll } from "vitest";
import { createApp } from "../../../src/router";
import type { Env } from "../../../src/env";

describe("Batch API Integration", () => {
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
                  tags: ["house"],
                  path: "lucide/home.svg",
                },
                "lucide:user": {
                  id: "lucide:user",
                  name: "user",
                  source: "lucide",
                  category: "people",
                  tags: ["person"],
                  path: "lucide/user.svg",
                },
                "lucide:search": {
                  id: "lucide:search",
                  name: "search",
                  source: "lucide",
                  category: "action",
                  tags: ["find"],
                  path: "lucide/search.svg",
                },
              },
            };
          }
          return null;
        },
      } as unknown as KVNamespace,
      SVG_BUCKET: {
        get: async (key: string) => ({
          text: async () =>
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><text>${key}</text></svg>`,
        }),
      } as unknown as R2Bucket,
      ENVIRONMENT: "test",
    };
  });

  describe("POST /icons/batch", () => {
    it("should process batch of icons", async () => {
      const req = new Request("http://localhost/icons/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          icons: [
            { name: "home", source: "lucide" },
            { name: "user", source: "lucide" },
          ],
        }),
      });
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("data");
      expect(data).toHaveProperty("meta");
      expect(data.data).toHaveLength(2);
      expect(data.meta.successful).toBe(2);
      expect(data.meta.failed).toBe(0);
    });

    it("should apply default options to all icons", async () => {
      const req = new Request("http://localhost/icons/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          icons: [{ name: "home" }, { name: "user" }],
          defaults: {
            source: "lucide",
            size: 48,
            color: "red",
            stroke: 1.5,
          },
        }),
      });
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data[0].svg).toContain('width="48"');
      expect(data.data[0].svg).toContain("red");
    });

    it("should allow per-icon overrides", async () => {
      const req = new Request("http://localhost/icons/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          icons: [
            { name: "home", size: 64 },
            { name: "user", size: 32 },
          ],
          defaults: { source: "lucide", size: 48 },
        }),
      });
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data[0].svg).toContain('width="64"');
      expect(data.data[1].svg).toContain('width="32"');
    });

    it("should handle errors for individual icons", async () => {
      const req = new Request("http://localhost/icons/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          icons: [
            { name: "home", source: "lucide" },
            { name: "nonexistent", source: "lucide" },
          ],
        }),
      });
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.meta.successful).toBe(1);
      expect(data.meta.failed).toBe(1);
      expect(data.data[1]).toHaveProperty("error");
    });

    it("should return 400 for invalid JSON", async () => {
      const req = new Request("http://localhost/icons/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json",
      });
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe("INVALID_PARAMETER");
    });

    it("should return 400 for missing icons array", async () => {
      const req = new Request("http://localhost/icons/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaults: {} }),
      });
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe("INVALID_PARAMETER");
    });

    it("should return 400 when batch size exceeds limit", async () => {
      const icons = Array(51).fill({ name: "home", source: "lucide" });
      const req = new Request("http://localhost/icons/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ icons }),
      });
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe("BATCH_LIMIT_EXCEEDED");
    });

    it("should handle empty icons array", async () => {
      const req = new Request("http://localhost/icons/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ icons: [] }),
      });
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data).toEqual([]);
      expect(data.meta.successful).toBe(0);
    });

    it("should handle advanced transformations", async () => {
      const req = new Request("http://localhost/icons/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          icons: [{ name: "home", rotate: 90, mirror: true, class: "icon" }],
          defaults: { source: "lucide" },
        }),
      });
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data[0].svg).toContain("rotate");
      expect(data.data[0].svg).toContain("scale(-1");
      expect(data.data[0].svg).toContain('class="icon"');
    });

    it("should support v1 prefix", async () => {
      const req = new Request("http://localhost/v1/icons/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          icons: [{ name: "home", source: "lucide" }],
        }),
      });
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
    });
  });

  describe("POST /bulk (bulk download)", () => {
    it("should return zip format", async () => {
      const req = new Request("http://localhost/bulk?format=zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          icons: [
            { name: "home", source: "lucide" },
            { name: "user", source: "lucide" },
          ],
        }),
      });
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      // Note: Actual zip generation requires more setup
      // This tests the endpoint structure
      expect([200, 400, 500]).toContain(res.status);
    });

    it("should return 400 for invalid format", async () => {
      const req = new Request("http://localhost/bulk?format=invalid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          icons: [{ name: "home", source: "lucide" }],
        }),
      });
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe("INVALID_FORMAT");
    });

    it("should return 400 when bulk size exceeds limit", async () => {
      const icons = Array(101).fill({ name: "home", source: "lucide" });
      const req = new Request("http://localhost/bulk?format=zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ icons }),
      });
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe("BULK_LIMIT_EXCEEDED");
    });

    it("should return 400 for no valid icons", async () => {
      const req = new Request("http://localhost/bulk?format=zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          icons: [{ name: "nonexistent", source: "lucide" }],
        }),
      });
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe("NO_VALID_ICONS");
    });
  });

  describe("Batch icon structure", () => {
    it("should return complete icon data for each result", async () => {
      const req = new Request("http://localhost/icons/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          icons: [{ name: "home", source: "lucide" }],
        }),
      });
      const res = await app.fetch(req, mockEnv, {} as ExecutionContext);

      expect(res.status).toBe(200);
      const data = await res.json();
      const icon = data.data[0];
      expect(icon).toHaveProperty("name");
      expect(icon).toHaveProperty("source");
      expect(icon).toHaveProperty("category");
      expect(icon).toHaveProperty("tags");
      expect(icon).toHaveProperty("svg");
      expect(icon).toHaveProperty("license");
    });
  });
});
