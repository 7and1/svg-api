import { describe, expect, it } from "vitest";
import {
  parseSize,
  parseStrokeWidth,
  parseColor,
  parseLimit,
  parseOffset,
  sourceSchema,
  nameSchema,
} from "./validation";

describe("sourceSchema", () => {
  it("accepts valid source names", () => {
    expect(sourceSchema.safeParse("lucide").success).toBe(true);
    expect(sourceSchema.safeParse("heroicons").success).toBe(true);
    expect(sourceSchema.safeParse("my-icons").success).toBe(true);
    expect(sourceSchema.safeParse("icons123").success).toBe(true);
  });

  it("rejects invalid source names", () => {
    expect(sourceSchema.safeParse("My Icons").success).toBe(false);
    expect(sourceSchema.safeParse("icons_set").success).toBe(false);
    expect(sourceSchema.safeParse("icons.svg").success).toBe(false);
    expect(sourceSchema.safeParse("").success).toBe(false);
  });
});

describe("nameSchema", () => {
  it("accepts valid icon names", () => {
    expect(nameSchema.safeParse("arrow-right").success).toBe(true);
    expect(nameSchema.safeParse("home").success).toBe(true);
    expect(nameSchema.safeParse("check-circle-2").success).toBe(true);
  });

  it("rejects invalid icon names", () => {
    expect(nameSchema.safeParse("Arrow Right").success).toBe(false);
    expect(nameSchema.safeParse("icon.svg").success).toBe(false);
    expect(nameSchema.safeParse("../path").success).toBe(false);
  });
});

describe("parseSize", () => {
  it("returns default for undefined", () => {
    expect(parseSize(undefined)).toBe(24);
  });

  it("parses valid size values", () => {
    expect(parseSize("32")).toBe(32);
    expect(parseSize("128")).toBe(128);
    expect(parseSize("8")).toBe(8);
    expect(parseSize("512")).toBe(512);
  });

  it("returns null for invalid sizes", () => {
    expect(parseSize("abc")).toBe(null);
    expect(parseSize("7")).toBe(null);
    expect(parseSize("513")).toBe(null);
    expect(parseSize("-10")).toBe(null);
    expect(parseSize("NaN")).toBe(null);
    expect(parseSize("Infinity")).toBe(null);
  });
});

describe("parseStrokeWidth", () => {
  it("returns default for undefined", () => {
    expect(parseStrokeWidth(undefined)).toBe(2);
  });

  it("parses valid stroke width values", () => {
    expect(parseStrokeWidth("1.5")).toBe(1.5);
    expect(parseStrokeWidth("0.5")).toBe(0.5);
    expect(parseStrokeWidth("3")).toBe(3);
  });

  it("returns null for invalid stroke widths", () => {
    expect(parseStrokeWidth("abc")).toBe(null);
    expect(parseStrokeWidth("0.4")).toBe(null);
    expect(parseStrokeWidth("3.1")).toBe(null);
    expect(parseStrokeWidth("-1")).toBe(null);
  });
});

describe("parseColor", () => {
  it("returns currentColor for undefined", () => {
    expect(parseColor(undefined)).toBe("currentColor");
  });

  it("parses valid hex colors", () => {
    expect(parseColor("#ff0000")).toBe("#ff0000");
    expect(parseColor("#FFF")).toBe("#FFF");
    expect(parseColor("#000000")).toBe("#000000");
  });

  it("parses named colors", () => {
    expect(parseColor("red")).toBe("red");
    expect(parseColor("blue")).toBe("blue");
    expect(parseColor("currentColor")).toBe("currentColor");
  });

  it("returns null for invalid colors", () => {
    expect(parseColor("#12345")).toBe(null);
    expect(parseColor("rgb(0,0,0)")).toBe(null);
    expect(parseColor("123")).toBe(null);
  });
});

describe("parseLimit", () => {
  it("returns fallback for undefined", () => {
    expect(parseLimit(undefined, 20, 100)).toBe(20);
  });

  it("parses and clamps valid limits", () => {
    expect(parseLimit("50", 20, 100)).toBe(50);
    expect(parseLimit("200", 20, 100)).toBe(100);
    expect(parseLimit("0", 20, 100)).toBe(1);
    expect(parseLimit("-5", 20, 100)).toBe(1);
  });

  it("returns fallback for invalid values", () => {
    expect(parseLimit("abc", 20, 100)).toBe(20);
  });

  it("floors decimal values", () => {
    expect(parseLimit("25.7", 20, 100)).toBe(25);
  });
});

describe("parseOffset", () => {
  it("returns 0 for undefined", () => {
    expect(parseOffset(undefined)).toBe(0);
  });

  it("parses valid offsets", () => {
    expect(parseOffset("10")).toBe(10);
    expect(parseOffset("0")).toBe(0);
    expect(parseOffset("100")).toBe(100);
  });

  it("returns 0 for invalid offsets", () => {
    expect(parseOffset("abc")).toBe(0);
    expect(parseOffset("-5")).toBe(0);
  });

  it("floors decimal values", () => {
    expect(parseOffset("15.9")).toBe(15);
  });
});
