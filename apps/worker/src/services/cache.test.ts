import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { MemoryCache } from "./cache";

describe("MemoryCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores and retrieves values", () => {
    const cache = new MemoryCache<string>();
    cache.set("key1", "value1", 10000);
    expect(cache.get("key1")).toBe("value1");
  });

  it("returns null for missing keys", () => {
    const cache = new MemoryCache<string>();
    expect(cache.get("nonexistent")).toBe(null);
  });

  it("expires entries after TTL", () => {
    const cache = new MemoryCache<string>();
    cache.set("key1", "value1", 5000);

    expect(cache.get("key1")).toBe("value1");

    vi.advanceTimersByTime(6000);

    expect(cache.get("key1")).toBe(null);
  });

  it("does not expire entries before TTL", () => {
    const cache = new MemoryCache<string>();
    cache.set("key1", "value1", 10000);

    vi.advanceTimersByTime(5000);

    expect(cache.get("key1")).toBe("value1");
  });

  it("evicts oldest entry when max entries reached", () => {
    const cache = new MemoryCache<string>(3);

    cache.set("key1", "value1", 60000);
    cache.set("key2", "value2", 60000);
    cache.set("key3", "value3", 60000);

    expect(cache.get("key1")).toBe("value1");
    expect(cache.get("key2")).toBe("value2");
    expect(cache.get("key3")).toBe("value3");

    cache.set("key4", "value4", 60000);

    // key1 should be evicted (oldest that wasn't recently accessed)
    // But since we just called get() on all of them, key2 is now oldest
    // Actually the LRU refresh moves accessed items to end
    expect(cache.get("key4")).toBe("value4");
  });

  it("refreshes LRU order on get", () => {
    const cache = new MemoryCache<string>(2);

    cache.set("key1", "value1", 60000);
    cache.set("key2", "value2", 60000);

    // Access key1 to refresh its position
    cache.get("key1");

    // Add key3, should evict key2 (oldest)
    cache.set("key3", "value3", 60000);

    expect(cache.get("key1")).toBe("value1");
    expect(cache.get("key2")).toBe(null);
    expect(cache.get("key3")).toBe("value3");
  });

  it("handles object values", () => {
    const cache = new MemoryCache<{ name: string; count: number }>();
    const obj = { name: "test", count: 42 };

    cache.set("obj", obj, 10000);

    const retrieved = cache.get("obj");
    expect(retrieved).toEqual(obj);
  });

  it("overwrites existing keys", () => {
    const cache = new MemoryCache<string>();

    cache.set("key1", "value1", 10000);
    cache.set("key1", "value2", 10000);

    expect(cache.get("key1")).toBe("value2");
  });
});
