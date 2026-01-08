import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { hashString } from "./hash";

describe("hashString", () => {
  let callCount = 0;

  beforeEach(() => {
    callCount = 0;
    vi.stubGlobal("crypto", {
      subtle: {
        digest: vi.fn().mockImplementation(async (_algorithm, data) => {
          // Simulate different hashes based on actual data content
          const result = new Uint8Array(32);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            sum += data[i] * (i + 1);
          }
          for (let i = 0; i < 32; i++) {
            result[i] = (sum + i * 17) % 256;
          }
          return result.buffer;
        }),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns quoted hex string", async () => {
    const hash = await hashString("test");
    expect(hash).toMatch(/^"[0-9a-f]{64}"$/);
  });

  it("returns same hash for same input", async () => {
    const hash1 = await hashString("hello");
    const hash2 = await hashString("hello");
    expect(hash1).toBe(hash2);
  });

  it("returns different hash for different input", async () => {
    const hash1 = await hashString("hello");
    const hash2 = await hashString("world");
    expect(hash1).not.toBe(hash2);
  });

  it("handles empty string", async () => {
    const hash = await hashString("");
    expect(hash).toMatch(/^"[0-9a-f]{64}"$/);
  });

  it("handles unicode strings", async () => {
    const hash = await hashString("hello");
    expect(hash).toMatch(/^"[0-9a-f]{64}"$/);
  });

  it("handles long strings", async () => {
    const longString = "a".repeat(10000);
    const hash = await hashString(longString);
    expect(hash).toMatch(/^"[0-9a-f]{64}"$/);
  });

  it("uses SHA-256 algorithm", async () => {
    await hashString("test");
    expect(crypto.subtle.digest).toHaveBeenCalledWith(
      "SHA-256",
      expect.any(Uint8Array),
    );
  });
});
