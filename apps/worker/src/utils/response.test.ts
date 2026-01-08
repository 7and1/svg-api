import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { corsHeaders, requestId } from "./response";

describe("corsHeaders", () => {
  it("returns default * origin", () => {
    const headers = corsHeaders();
    expect(headers["Access-Control-Allow-Origin"]).toBe("*");
  });

  it("returns specified origin", () => {
    const headers = corsHeaders("https://example.com");
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://example.com");
  });

  it("returns * for null origin", () => {
    const headers = corsHeaders(null);
    expect(headers["Access-Control-Allow-Origin"]).toBe("*");
  });

  it("includes required CORS headers", () => {
    const headers = corsHeaders();
    expect(headers["Access-Control-Allow-Methods"]).toContain("GET");
    expect(headers["Access-Control-Allow-Methods"]).toContain("POST");
    expect(headers["Access-Control-Allow-Methods"]).toContain("OPTIONS");
    expect(headers["Access-Control-Allow-Headers"]).toContain("Content-Type");
    expect(headers["Access-Control-Max-Age"]).toBe("86400");
  });
});

describe("requestId", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn(() => "test-uuid-1234"),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("generates prefixed request ID", () => {
    const id = requestId();
    expect(id).toBe("req_test-uuid-1234");
  });

  it("uses crypto.randomUUID", () => {
    requestId();
    expect(crypto.randomUUID).toHaveBeenCalled();
  });
});
