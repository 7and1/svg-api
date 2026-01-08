import { describe, expect, it, vi } from "vitest";
import { getIconFromR2 } from "./r2";

const mockSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path d="M0 0"/></svg>`;

describe("getIconFromR2", () => {
  describe("R2 Bucket", () => {
    it("fetches icon from R2 bucket", async () => {
      const mockR2Object = {
        text: vi.fn().mockResolvedValue(mockSvg),
        httpEtag: '"test-etag"',
        etag: "test-etag",
        size: mockSvg.length,
        uploaded: new Date("2024-01-01"),
      };

      const mockBucket = {
        get: vi.fn().mockResolvedValue(mockR2Object),
      };

      const env = {
        SVG_BUCKET: mockBucket as unknown as R2Bucket,
        SVG_INDEX: {} as KVNamespace,
        ENVIRONMENT: "test",
      };

      const result = await getIconFromR2(env, "lucide/home.svg");

      expect(mockBucket.get).toHaveBeenCalledWith("lucide/home.svg");
      expect(result).not.toBeNull();
      expect(result?.body).toBe(mockSvg);
      expect(result?.etag).toBe('"test-etag"');
      expect(result?.size).toBe(mockSvg.length);
    });

    it("returns null when icon not found in R2", async () => {
      const mockBucket = {
        get: vi.fn().mockResolvedValue(null),
      };

      const env = {
        SVG_BUCKET: mockBucket as unknown as R2Bucket,
        SVG_INDEX: {} as KVNamespace,
        ENVIRONMENT: "test",
      };

      const result = await getIconFromR2(env, "nonexistent.svg");

      expect(result).toBeNull();
    });

    it("handles missing httpEtag by using etag", async () => {
      const mockR2Object = {
        text: vi.fn().mockResolvedValue(mockSvg),
        etag: "fallback-etag",
        size: mockSvg.length,
        uploaded: new Date(),
      };

      const mockBucket = {
        get: vi.fn().mockResolvedValue(mockR2Object),
      };

      const env = {
        SVG_BUCKET: mockBucket as unknown as R2Bucket,
        SVG_INDEX: {} as KVNamespace,
        ENVIRONMENT: "test",
      };

      const result = await getIconFromR2(env, "test.svg");

      expect(result?.etag).toBe("fallback-etag");
    });
  });

  describe("Local file server fallback", () => {
    it("fetches from local URL when LOCAL_ICONS_BASE_URL is set", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockSvg),
        headers: new Headers({
          etag: '"local-etag"',
          "content-length": String(mockSvg.length),
        }),
      });

      vi.stubGlobal("fetch", mockFetch);

      const env = {
        SVG_BUCKET: {} as R2Bucket,
        SVG_INDEX: {} as KVNamespace,
        ENVIRONMENT: "test",
        LOCAL_ICONS_BASE_URL: "http://localhost:3000/icons",
      };

      const result = await getIconFromR2(env, "lucide/home.svg");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3000/icons/lucide/home.svg",
      );
      expect(result?.body).toBe(mockSvg);
      expect(result?.etag).toBe('"local-etag"');

      vi.unstubAllGlobals();
    });

    it("returns null when local fetch fails", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      vi.stubGlobal("fetch", mockFetch);

      const env = {
        SVG_BUCKET: {} as R2Bucket,
        SVG_INDEX: {} as KVNamespace,
        ENVIRONMENT: "test",
        LOCAL_ICONS_BASE_URL: "http://localhost:3000/icons",
      };

      const result = await getIconFromR2(env, "nonexistent.svg");

      expect(result).toBeNull();

      vi.unstubAllGlobals();
    });

    it("handles trailing slash in LOCAL_ICONS_BASE_URL", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockSvg),
        headers: new Headers(),
      });

      vi.stubGlobal("fetch", mockFetch);

      const env = {
        SVG_BUCKET: {} as R2Bucket,
        SVG_INDEX: {} as KVNamespace,
        ENVIRONMENT: "test",
        LOCAL_ICONS_BASE_URL: "http://localhost:3000/icons/",
      };

      await getIconFromR2(env, "test.svg");

      // The trailing slash should be removed to avoid double slashes
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3000/icons/test.svg",
      );

      vi.unstubAllGlobals();
    });
  });
});
