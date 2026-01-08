import { describe, expect, it, vi, beforeEach } from "vitest";

// We need to mock the cache module to prevent caching between tests
vi.mock("./cache", () => ({
  MemoryCache: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
  })),
}));

// Import after mock
const { getIndex } = await import("./kv");

import type { IconIndex } from "@svg-api/shared/types";

const mockIndex: IconIndex = {
  version: "1.0.0",
  generated: "2024-01-01T00:00:00.000Z",
  stats: {
    totalIcons: 100,
    sources: ["lucide"],
    lastUpdated: "2024-01-01T00:00:00.000Z",
  },
  icons: {},
};

describe("getIndex", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches index from KV", async () => {
    const mockKV = {
      get: vi.fn().mockResolvedValue(mockIndex),
    };

    const env = {
      SVG_INDEX: mockKV as unknown as KVNamespace,
      SVG_BUCKET: {} as R2Bucket,
      ENVIRONMENT: "test",
    };

    const index = await getIndex(env);

    expect(mockKV.get).toHaveBeenCalledWith("index:v1", { type: "json" });
    expect(index.version).toBe("1.0.0");
    expect(index.stats.totalIcons).toBe(100);
  });

  it("uses custom INDEX_KEY when provided", async () => {
    const mockKV = {
      get: vi.fn().mockResolvedValue(mockIndex),
    };

    const env = {
      SVG_INDEX: mockKV as unknown as KVNamespace,
      SVG_BUCKET: {} as R2Bucket,
      ENVIRONMENT: "test",
      INDEX_KEY: "custom-index-key",
    };

    await getIndex(env);

    expect(mockKV.get).toHaveBeenCalledWith("custom-index-key", {
      type: "json",
    });
  });

  it("falls back to LOCAL_INDEX_JSON when KV returns null", async () => {
    const mockKV = {
      get: vi.fn().mockResolvedValue(null),
    };

    const env = {
      SVG_INDEX: mockKV as unknown as KVNamespace,
      SVG_BUCKET: {} as R2Bucket,
      ENVIRONMENT: "test",
      LOCAL_INDEX_JSON: JSON.stringify(mockIndex),
    };

    const index = await getIndex(env);

    expect(index.version).toBe("1.0.0");
  });

  it("throws error when index not found", async () => {
    const mockKV = {
      get: vi.fn().mockResolvedValue(null),
    };

    const env = {
      SVG_INDEX: mockKV as unknown as KVNamespace,
      SVG_BUCKET: {} as R2Bucket,
      ENVIRONMENT: "test",
    };

    await expect(getIndex(env)).rejects.toThrow("Index not found");
  });
});
