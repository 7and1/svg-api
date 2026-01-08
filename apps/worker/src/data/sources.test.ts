import { describe, expect, it } from "vitest";
import { SOURCE_CONFIG } from "./sources";

describe("SOURCE_CONFIG", () => {
  it("contains expected sources", () => {
    const sourceIds = Object.keys(SOURCE_CONFIG);
    expect(sourceIds).toContain("lucide");
    expect(sourceIds).toContain("heroicons");
    expect(sourceIds).toContain("tabler");
    expect(sourceIds).toContain("bootstrap");
    expect(sourceIds).toContain("remix");
    expect(sourceIds).toContain("ionicons");
    expect(sourceIds).toContain("mdi");
  });

  describe("source metadata", () => {
    it("lucide has required fields", () => {
      const lucide = SOURCE_CONFIG.lucide;
      expect(lucide.id).toBe("lucide");
      expect(lucide.name).toBe("Lucide");
      expect(lucide.description).toBeTruthy();
      expect(lucide.website).toContain("lucide.dev");
      expect(lucide.repository).toContain("github.com");
      expect(lucide.license.type).toBe("ISC");
      expect(lucide.license.url).toBeTruthy();
    });

    it("heroicons has required fields", () => {
      const heroicons = SOURCE_CONFIG.heroicons;
      expect(heroicons.id).toBe("heroicons");
      expect(heroicons.name).toBe("Heroicons");
      expect(heroicons.license.type).toBe("MIT");
    });

    it("all sources have valid license types", () => {
      const validLicenses = ["MIT", "ISC", "Apache-2.0", "unknown"];
      for (const [id, config] of Object.entries(SOURCE_CONFIG)) {
        expect(
          validLicenses.includes(config.license.type),
          `${id} has invalid license type: ${config.license.type}`,
        ).toBe(true);
      }
    });

    it("all sources have valid URLs", () => {
      for (const [id, config] of Object.entries(SOURCE_CONFIG)) {
        expect(
          config.website.startsWith("http"),
          `${id} has invalid website URL`,
        ).toBe(true);
        expect(
          config.repository.startsWith("http"),
          `${id} has invalid repository URL`,
        ).toBe(true);
        expect(
          config.license.url.startsWith("http"),
          `${id} has invalid license URL`,
        ).toBe(true);
      }
    });

    it("all sources have non-empty descriptions", () => {
      for (const [id, config] of Object.entries(SOURCE_CONFIG)) {
        expect(
          config.description.length > 0,
          `${id} has empty description`,
        ).toBe(true);
      }
    });
  });
});
