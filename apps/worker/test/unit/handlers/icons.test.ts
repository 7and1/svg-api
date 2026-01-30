import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Context } from "hono";
import { iconHandler } from "../../../src/handlers/icons";
import type { Env } from "../../../src/env";
import type { IconIndex } from "@svg-api/shared/types";

// Mock services
vi.mock("../../../src/services/kv", () => ({
  getIndex: vi.fn(),
}));

vi.mock("../../../src/services/r2", () => ({
  getIconFromR2: vi.fn(),
}));

vi.mock("../../../src/services/variants", () => ({
  resolveVariant: vi.fn((_, variant) => variant ?? "default"),
  getAvailableVariants: vi.fn(() => ["default", "filled", "outlined"]),
  normalizeVariant: vi.fn((v) => v ?? "default"),
}));

vi.mock("../../../src/utils/hash", () => ({
  hashString: vi.fn(() => Promise.resolve("mock-etag")),
}));

import { getIndex } from "../../../src/services/kv";
import { getIconFromR2 } from "../../../src/services/r2";

const createMockContext = (
  params: Record<string, string>,
  query: Record<string, string> = {},
  headers: Record<string, string> = {},
): Context<{ Bindings: Env }> => {
  const url = new URL("https://api.svg-api.com/icons/" + params.name);
  Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));

  return {
    req: {
      param: (name?: string) => (name ? params[name] : params),
      query: (name?: string) =>
        name ? query[name] : query as Record<string, string>,
      url: url.toString(),
      header: (name: string) => headers[name],
      path: "/icons/" + params.name,
      method: "GET",
    },
    env: {
      SVG_INDEX: {} as KVNamespace,
      SVG_BUCKET: {} as R2Bucket,
      ENVIRONMENT: "test",
    },
    executionCtx: {
      waitUntil: vi.fn(),
    },
    header: vi.fn(),
    body: vi.fn(),
    json: vi.fn(),
    text: vi.fn(),
  } as unknown as Context<{ Bindings: Env }>;
};

describe("iconHandler", () => {
  const mockIconIndex = {
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
    },
  };

  const mockIconObject = {
    body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getIndex).mockResolvedValue(mockIconIndex as IconIndex);
    vi.mocked(getIconFromR2).mockResolvedValue(mockIconObject);
  });

  it("should return icon successfully with default parameters", async () => {
    const c = createMockContext({ name: "home" });

    const response = await iconHandler(c);

    expect(response).toBeDefined();
    expect(getIndex).toHaveBeenCalledWith(c.env);
    expect(getIconFromR2).toHaveBeenCalledWith(c.env, "lucide/home.svg");
  });

  it("should return 400 for invalid icon name", async () => {
    const c = createMockContext({ name: "invalid@name" });
    const jsonSpy = vi.spyOn(c, "json");

    await iconHandler(c);

    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "INVALID_PARAMETER",
        }),
      }),
      400,
    );
  });

  it("should return 404 for non-existent icon", async () => {
    const c = createMockContext({ name: "nonexistent" });
    const jsonSpy = vi.spyOn(c, "json");

    await iconHandler(c);

    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "ICON_NOT_FOUND",
        }),
      }),
      404,
    );
  });

  it("should handle custom source parameter", async () => {
    const c = createMockContext(
      { name: "home", source: "lucide" },
      { source: "lucide" },
    );

    await iconHandler(c);

    expect(getIconFromR2).toHaveBeenCalledWith(c.env, "lucide/home.svg");
  });

  it("should validate and apply size parameter", async () => {
    const c = createMockContext({ name: "home" }, { size: "48" });

    const response = await iconHandler(c);
    expect(response).toBeDefined();
  });

  it("should return 400 for invalid size", async () => {
    const c = createMockContext({ name: "home" }, { size: "999" });
    const jsonSpy = vi.spyOn(c, "json");

    await iconHandler(c);

    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "INVALID_SIZE",
        }),
      }),
      400,
    );
  });

  it("should validate and apply color parameter", async () => {
    const c = createMockContext({ name: "home" }, { color: "#ff0000" });

    const response = await iconHandler(c);
    expect(response).toBeDefined();
  });

  it("should return 400 for invalid color", async () => {
    const c = createMockContext({ name: "home" }, { color: "invalid-color" });
    const jsonSpy = vi.spyOn(c, "json");

    await iconHandler(c);

    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "INVALID_COLOR",
        }),
      }),
      400,
    );
  });

  it("should handle stroke width parameter", async () => {
    const c = createMockContext({ name: "home" }, { stroke: "1.5" });

    const response = await iconHandler(c);
    expect(response).toBeDefined();
  });

  it("should handle rotate parameter", async () => {
    const c = createMockContext({ name: "home" }, { rotate: "90" });

    const response = await iconHandler(c);
    expect(response).toBeDefined();
  });

  it("should handle mirror parameter", async () => {
    const c = createMockContext({ name: "home" }, { mirror: "true" });

    const response = await iconHandler(c);
    expect(response).toBeDefined();
  });

  it("should handle class parameter", async () => {
    const c = createMockContext({ name: "home" }, { class: "my-icon" });

    const response = await iconHandler(c);
    expect(response).toBeDefined();
  });

  it("should handle variant parameter", async () => {
    const c = createMockContext({ name: "home" }, { variant: "filled" });

    const response = await iconHandler(c);
    expect(response).toBeDefined();
  });

  it("should return 400 for invalid variant", async () => {
    const c = createMockContext({ name: "home" }, { variant: "nonexistent" });
    const jsonSpy = vi.spyOn(c, "json");

    await iconHandler(c);

    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "VARIANT_NOT_AVAILABLE",
        }),
      }),
      400,
    );
  });

  it("should return 304 for matching ETag", async () => {
    const c = createMockContext(
      { name: "home" },
      {},
      { "If-None-Match": "mock-etag" },
    );

    const response = await iconHandler(c);
    expect(response).toBeDefined();
  });

  it("should handle SVG format request", async () => {
    const c = createMockContext(
      { name: "home" },
      { format: "svg" },
      { Accept: "image/svg+xml" },
    );

    const response = await iconHandler(c);
    expect(response).toBeDefined();
  });

  it("should provide suggestions for similar icon names", async () => {
    const c = createMockContext({ name: "hom" });
    const jsonSpy = vi.spyOn(c, "json");

    await iconHandler(c);

    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          suggestions: expect.any(Array),
        }),
      }),
      404,
    );
  });
});
