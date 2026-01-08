import { describe, expect, it } from "vitest";
import { parseSvgMeta } from "./parse";

describe("parseSvgMeta", () => {
  describe("basic extraction", () => {
    it("extracts width, height, viewBox from standard SVG", () => {
      const svg = `<svg width="32" height="24" viewBox="0 0 32 24"></svg>`;
      const meta = parseSvgMeta(svg);
      expect(meta.width).toBe(32);
      expect(meta.height).toBe(24);
      expect(meta.viewBox).toBe("0 0 32 24");
    });

    it("extracts from SVG with namespace", () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"></svg>`;
      const meta = parseSvgMeta(svg);
      expect(meta.width).toBe(48);
      expect(meta.height).toBe(48);
      expect(meta.viewBox).toBe("0 0 48 48");
    });

    it("handles attributes in any order", () => {
      const svg = `<svg viewBox="0 0 100 100" height="100" width="100"></svg>`;
      const meta = parseSvgMeta(svg);
      expect(meta.width).toBe(100);
      expect(meta.height).toBe(100);
      expect(meta.viewBox).toBe("0 0 100 100");
    });
  });

  describe("fallback values", () => {
    it("falls back to defaults for empty SVG tag", () => {
      const meta = parseSvgMeta("<svg></svg>");
      expect(meta.width).toBe(24);
      expect(meta.height).toBe(24);
      expect(meta.viewBox).toBe("0 0 24 24");
    });

    it("falls back to defaults when no SVG tag found", () => {
      const meta = parseSvgMeta("<div>not an svg</div>");
      expect(meta.width).toBe(24);
      expect(meta.height).toBe(24);
      expect(meta.viewBox).toBe("0 0 24 24");
    });

    it("uses width/height for viewBox when viewBox missing", () => {
      const svg = `<svg width="64" height="64"></svg>`;
      const meta = parseSvgMeta(svg);
      expect(meta.viewBox).toBe("0 0 64 64");
    });

    it("uses default width/height when missing", () => {
      const svg = `<svg viewBox="0 0 100 100"></svg>`;
      const meta = parseSvgMeta(svg);
      expect(meta.width).toBe(24);
      expect(meta.height).toBe(24);
      expect(meta.viewBox).toBe("0 0 100 100");
    });
  });

  describe("dimension parsing", () => {
    it("parses dimensions with units", () => {
      const svg = `<svg width="24px" height="24px" viewBox="0 0 24 24"></svg>`;
      const meta = parseSvgMeta(svg);
      expect(meta.width).toBe(24);
      expect(meta.height).toBe(24);
    });

    it("parses decimal dimensions", () => {
      const svg = `<svg width="24.5" height="24.5" viewBox="0 0 24.5 24.5"></svg>`;
      const meta = parseSvgMeta(svg);
      expect(meta.width).toBe(24.5);
      expect(meta.height).toBe(24.5);
    });

    it("handles em units", () => {
      const svg = `<svg width="1.5em" height="1.5em" viewBox="0 0 24 24"></svg>`;
      const meta = parseSvgMeta(svg);
      expect(meta.width).toBe(1.5);
      expect(meta.height).toBe(1.5);
    });
  });

  describe("case handling", () => {
    it("handles case-insensitive attribute matching", () => {
      const svg = `<svg Width="32" HEIGHT="32" ViewBox="0 0 32 32"></svg>`;
      const meta = parseSvgMeta(svg);
      expect(meta.width).toBe(32);
      expect(meta.height).toBe(32);
      expect(meta.viewBox).toBe("0 0 32 32");
    });

    it("handles uppercase SVG tag", () => {
      const svg = `<SVG width="24" height="24" viewBox="0 0 24 24"></SVG>`;
      const meta = parseSvgMeta(svg);
      expect(meta.width).toBe(24);
      expect(meta.height).toBe(24);
    });
  });

  describe("complex SVG content", () => {
    it("extracts meta from SVG with content", () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`;
      const meta = parseSvgMeta(svg);
      expect(meta.width).toBe(24);
      expect(meta.height).toBe(24);
      expect(meta.viewBox).toBe("0 0 24 24");
    });

    it("handles multi-line SVG", () => {
      const svg = `<svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24">
        <path d="M0 0"/>
      </svg>`;
      const meta = parseSvgMeta(svg);
      expect(meta.width).toBe(24);
      expect(meta.height).toBe(24);
    });

    it("handles self-closing SVG", () => {
      const svg = `<svg width="16" height="16" viewBox="0 0 16 16"/>`;
      const meta = parseSvgMeta(svg);
      expect(meta.width).toBe(16);
      expect(meta.height).toBe(16);
      expect(meta.viewBox).toBe("0 0 16 16");
    });
  });

  describe("edge cases", () => {
    it("handles empty string", () => {
      const meta = parseSvgMeta("");
      expect(meta.width).toBe(24);
      expect(meta.height).toBe(24);
      expect(meta.viewBox).toBe("0 0 24 24");
    });

    it("handles SVG with extra whitespace", () => {
      const svg = `<svg   width="24"    height="24"   viewBox="0 0 24 24"  ></svg>`;
      const meta = parseSvgMeta(svg);
      expect(meta.width).toBe(24);
      expect(meta.height).toBe(24);
    });

    it("handles percentage dimensions", () => {
      const svg = `<svg width="100%" height="100%" viewBox="0 0 24 24"></svg>`;
      const meta = parseSvgMeta(svg);
      expect(meta.width).toBe(100);
      expect(meta.height).toBe(100);
    });
  });
});
