import { describe, it, expect } from "vitest";
import {
  sourceSchema,
  nameSchema,
  parseSize,
  parseStrokeWidth,
  parseColor,
  parseLimit,
  parseOffset,
  parseRotate,
  parseMirror,
} from "../../../src/utils/validation";
import {
  DEFAULT_ICON_SIZE,
  DEFAULT_STROKE_WIDTH,
  MIN_ICON_SIZE,
  MAX_ICON_SIZE,
  MIN_STROKE_WIDTH,
  MAX_STROKE_WIDTH,
} from "@svg-api/shared/constants";

describe("sourceSchema", () => {
  it("should validate valid source names", () => {
    expect(sourceSchema.safeParse("lucide").success).toBe(true);
    expect(sourceSchema.safeParse("material").success).toBe(true);
    expect(sourceSchema.safeParse("heroicons").success).toBe(true);
    expect(sourceSchema.safeParse("simple-icons").success).toBe(true);
    expect(sourceSchema.safeParse("icon24").success).toBe(true);
  });

  it("should reject invalid source names", () => {
    expect(sourceSchema.safeParse("").success).toBe(false);
    expect(sourceSchema.safeParse("Invalid Source").success).toBe(false);
    expect(sourceSchema.safeParse("source@name").success).toBe(false);
    expect(sourceSchema.safeParse("source_name").success).toBe(false);
    expect(sourceSchema.safeParse("UPPERCASE").success).toBe(false);
  });
});

describe("nameSchema", () => {
  it("should validate valid icon names", () => {
    expect(nameSchema.safeParse("home").success).toBe(true);
    expect(nameSchema.safeParse("user-profile").success).toBe(true);
    expect(nameSchema.safeParse("icon123").success).toBe(true);
    expect(nameSchema.safeParse("arrow-up").success).toBe(true);
  });

  it("should reject invalid icon names", () => {
    expect(nameSchema.safeParse("").success).toBe(false);
    expect(nameSchema.safeParse("Icon Name").success).toBe(false);
    expect(nameSchema.safeParse("icon@name").success).toBe(false);
    expect(nameSchema.safeParse("icon_name").success).toBe(false);
    expect(nameSchema.safeParse("CamelCase").success).toBe(false);
  });
});

describe("parseSize", () => {
  it("should return default size when undefined", () => {
    expect(parseSize(undefined)).toBe(DEFAULT_ICON_SIZE);
  });

  it("should parse valid sizes", () => {
    expect(parseSize("24")).toBe(24);
    expect(parseSize("48")).toBe(48);
    expect(parseSize("512")).toBe(512);
    expect(parseSize("8")).toBe(8);
  });

  it("should return null for sizes below minimum", () => {
    expect(parseSize("7")).toBeNull();
    expect(parseSize("0")).toBeNull();
    expect(parseSize("-1")).toBeNull();
  });

  it("should return null for sizes above maximum", () => {
    expect(parseSize("513")).toBeNull();
    expect(parseSize("1000")).toBeNull();
  });

  it("should return null for invalid inputs", () => {
    expect(parseSize("invalid")).toBeNull();
    expect(parseSize("")).toBe(DEFAULT_ICON_SIZE);
    expect(parseSize("24.5")).toBe(24.5);
    expect(parseSize("NaN")).toBeNull();
    expect(parseSize("Infinity")).toBeNull();
  });

  it("should handle boundary values", () => {
    expect(parseSize(String(MIN_ICON_SIZE))).toBe(MIN_ICON_SIZE);
    expect(parseSize(String(MAX_ICON_SIZE))).toBe(MAX_ICON_SIZE);
  });
});

describe("parseStrokeWidth", () => {
  it("should return default stroke width when undefined", () => {
    expect(parseStrokeWidth(undefined)).toBe(DEFAULT_STROKE_WIDTH);
  });

  it("should parse valid stroke widths", () => {
    expect(parseStrokeWidth("0.5")).toBe(0.5);
    expect(parseStrokeWidth("1")).toBe(1);
    expect(parseStrokeWidth("1.5")).toBe(1.5);
    expect(parseStrokeWidth("2")).toBe(2);
    expect(parseStrokeWidth("3")).toBe(3);
  });

  it("should return null for stroke widths below minimum", () => {
    expect(parseStrokeWidth("0.4")).toBeNull();
    expect(parseStrokeWidth("0")).toBeNull();
    expect(parseStrokeWidth("-1")).toBeNull();
  });

  it("should return null for stroke widths above maximum", () => {
    expect(parseStrokeWidth("3.1")).toBeNull();
    expect(parseStrokeWidth("5")).toBeNull();
  });

  it("should return null for invalid inputs", () => {
    expect(parseStrokeWidth("invalid")).toBeNull();
    expect(parseStrokeWidth("")).toBe(DEFAULT_STROKE_WIDTH);
    expect(parseStrokeWidth("NaN")).toBeNull();
  });

  it("should handle boundary values", () => {
    expect(parseStrokeWidth(String(MIN_STROKE_WIDTH))).toBe(MIN_STROKE_WIDTH);
    expect(parseStrokeWidth(String(MAX_STROKE_WIDTH))).toBe(MAX_STROKE_WIDTH);
  });
});

describe("parseColor", () => {
  it("should return currentColor when undefined", () => {
    expect(parseColor(undefined)).toBe("currentColor");
  });

  it("should parse valid hex colors", () => {
    expect(parseColor("#ff0000")).toBe("#ff0000");
    expect(parseColor("#FF0000")).toBe("#FF0000");
    expect(parseColor("#f00")).toBe("#f00");
    expect(parseColor("#abc")).toBe("#abc");
    expect(parseColor("#aabbcc")).toBe("#aabbcc");
  });

  it("should parse valid named colors", () => {
    expect(parseColor("red")).toBe("red");
    expect(parseColor("blue")).toBe("blue");
    expect(parseColor("currentColor")).toBe("currentColor");
    expect(parseColor("transparent")).toBe("transparent");
    expect(parseColor("AliceBlue")).toBe("AliceBlue");
  });

  it("should return null for invalid colors", () => {
    expect(parseColor("#gg0000")).toBeNull();
    expect(parseColor("#ff000")).toBeNull();
    expect(parseColor("#ff00000")).toBeNull();
    expect(parseColor("rgb(255,0,0)")).toBeNull();
    expect(parseColor("hsl(0,100%,50%)")).toBeNull();
    expect(parseColor("")).toBeNull();
    expect(parseColor(" ")).toBeNull();
  });

  it("should handle special characters", () => {
    expect(parseColor("#123abc")).toBe("#123abc");
    expect(parseColor("#ABCDEF")).toBe("#ABCDEF");
  });
});

describe("parseLimit", () => {
  it("should return fallback when undefined", () => {
    expect(parseLimit(undefined, 20, 100)).toBe(20);
    expect(parseLimit(undefined, 50, 200)).toBe(50);
  });

  it("should parse valid limits", () => {
    expect(parseLimit("10", 20, 100)).toBe(10);
    expect(parseLimit("50", 20, 100)).toBe(50);
    expect(parseLimit("100", 20, 100)).toBe(100);
  });

  it("should cap at maximum", () => {
    expect(parseLimit("150", 20, 100)).toBe(100);
    expect(parseLimit("1000", 20, 100)).toBe(100);
  });

  it("should floor decimal values", () => {
    expect(parseLimit("10.9", 20, 100)).toBe(10);
    expect(parseLimit("25.1", 20, 100)).toBe(25);
  });

  it("should return fallback for invalid inputs", () => {
    expect(parseLimit("invalid", 20, 100)).toBe(20);
    expect(parseLimit("NaN", 20, 100)).toBe(20);
    expect(parseLimit("", 20, 100)).toBe(20);
  });

  it("should ensure minimum of 1", () => {
    expect(parseLimit("0", 20, 100)).toBe(1);
    expect(parseLimit("-5", 20, 100)).toBe(1);
  });
});

describe("parseOffset", () => {
  it("should return 0 when undefined", () => {
    expect(parseOffset(undefined)).toBe(0);
  });

  it("should parse valid offsets", () => {
    expect(parseOffset("0")).toBe(0);
    expect(parseOffset("10")).toBe(10);
    expect(parseOffset("100")).toBe(100);
  });

  it("should floor decimal values", () => {
    expect(parseOffset("10.9")).toBe(10);
    expect(parseOffset("25.1")).toBe(25);
  });

  it("should return 0 for negative values", () => {
    expect(parseOffset("-1")).toBe(0);
    expect(parseOffset("-100")).toBe(0);
  });

  it("should return 0 for invalid inputs", () => {
    expect(parseOffset("invalid")).toBe(0);
    expect(parseOffset("NaN")).toBe(0);
    expect(parseOffset("")).toBe(0);
  });
});

describe("parseRotate", () => {
  it("should return undefined when undefined", () => {
    expect(parseRotate(undefined)).toBeUndefined();
  });

  it("should parse valid rotation values", () => {
    expect(parseRotate("0")).toBe(0);
    expect(parseRotate("90")).toBe(90);
    expect(parseRotate("180")).toBe(180);
    expect(parseRotate("360")).toBe(360);
    expect(parseRotate("-90")).toBe(-90);
    expect(parseRotate("45.5")).toBe(45.5);
  });

  it("should return undefined for invalid inputs", () => {
    expect(parseRotate("invalid")).toBeUndefined();
    expect(parseRotate("NaN")).toBeUndefined();
    expect(parseRotate("")).toBeUndefined();
  });

  it("should handle large rotation values", () => {
    expect(parseRotate("720")).toBe(720);
    expect(parseRotate("-360")).toBe(-360);
  });
});

describe("parseMirror", () => {
  it("should return false when undefined", () => {
    expect(parseMirror(undefined)).toBe(false);
  });

  it("should return true for 'true'", () => {
    expect(parseMirror("true")).toBe(true);
    expect(parseMirror("TRUE")).toBe(true);
    expect(parseMirror("True")).toBe(true);
  });

  it("should return true for '1'", () => {
    expect(parseMirror("1")).toBe(true);
  });

  it("should return true for 'yes'", () => {
    expect(parseMirror("yes")).toBe(true);
    expect(parseMirror("YES")).toBe(true);
    expect(parseMirror("Yes")).toBe(true);
  });

  it("should return false for other values", () => {
    expect(parseMirror("false")).toBe(false);
    expect(parseMirror("0")).toBe(false);
    expect(parseMirror("no")).toBe(false);
    expect(parseMirror("")).toBe(false);
    expect(parseMirror("invalid")).toBe(false);
  });

  it("should handle whitespace", () => {
    expect(parseMirror(" true ")).toBe(true);
    expect(parseMirror("  1  ")).toBe(true);
  });
});
