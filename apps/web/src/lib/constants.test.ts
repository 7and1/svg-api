import { describe, expect, it } from "vitest";
import { API_BASE } from "./constants";

describe("API_BASE", () => {
  it("defaults to production API", () => {
    expect(API_BASE).toContain("api.svg-api.org");
  });
});
