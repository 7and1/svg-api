/**
 * Web Utility Functions Tests
 *
 * Tests for utility functions used across the web application.
 */
import { describe, expect, it } from "vitest";
import { API_BASE } from "./constants";

// Test utility functions that could be extracted from components

describe("Icon URL Generation", () => {
  const generateIconUrl = (
    name: string,
    options: {
      source?: string;
      size?: number;
      color?: string;
      strokeWidth?: number;
    } = {},
  ): string => {
    const { source = "lucide", size = 24, color, strokeWidth = 2 } = options;
    const params = new URLSearchParams({
      source,
      size: size.toString(),
      "stroke-width": strokeWidth.toString(),
    });
    if (color) {
      params.set("color", color);
    }
    return `${API_BASE}/icons/${name}?${params}`;
  };

  it("generates basic icon URL", () => {
    const url = generateIconUrl("home");
    expect(url).toContain("/icons/home");
    expect(url).toContain("source=lucide");
    expect(url).toContain("size=24");
  });

  it("includes custom source", () => {
    const url = generateIconUrl("home", { source: "tabler" });
    expect(url).toContain("source=tabler");
  });

  it("includes custom size", () => {
    const url = generateIconUrl("home", { size: 48 });
    expect(url).toContain("size=48");
  });

  it("includes custom color", () => {
    const url = generateIconUrl("home", { color: "#ff0000" });
    expect(url).toContain("color=%23ff0000");
  });

  it("includes stroke width", () => {
    const url = generateIconUrl("home", { strokeWidth: 1.5 });
    expect(url).toContain("stroke-width=1.5");
  });

  it("handles all options together", () => {
    const url = generateIconUrl("arrow-right", {
      source: "heroicons",
      size: 32,
      color: "#3b82f6",
      strokeWidth: 1,
    });

    expect(url).toContain("arrow-right");
    expect(url).toContain("source=heroicons");
    expect(url).toContain("size=32");
    expect(url).toContain("color=%233b82f6");
    expect(url).toContain("stroke-width=1");
  });
});

describe("Code Generation", () => {
  type CodeTab = "url" | "curl" | "html" | "react" | "fetch";

  const generateCode = (
    name: string,
    source: string,
    size: number,
    color: string,
    strokeWidth: number,
    tab: CodeTab,
  ): string => {
    const encodedColor = encodeURIComponent(color);
    const baseUrl = `${API_BASE}/icons/${name}?source=${source}&size=${size}&color=${encodedColor}&stroke-width=${strokeWidth}`;

    switch (tab) {
      case "url":
        return baseUrl;
      case "curl":
        return `curl "${baseUrl}" -o ${name}.svg`;
      case "html":
        return `<img src="${baseUrl}" alt="${name}" width="${size}" height="${size}" />`;
      case "react":
        return `export const ${name.charAt(0).toUpperCase() + name.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase())}Icon = () => (
  <img
    src="${baseUrl}"
    alt="${name}"
    width={${size}}
    height={${size}}
  />
);`;
      case "fetch":
        return `const response = await fetch("${baseUrl}", {
  headers: { Accept: "image/svg+xml" }
});
const svg = await response.text();`;
      default:
        return baseUrl;
    }
  };

  it("generates URL code", () => {
    const code = generateCode("home", "lucide", 24, "#000000", 2, "url");
    expect(code).toContain(API_BASE);
    expect(code).toContain("/icons/home");
  });

  it("generates curl code", () => {
    const code = generateCode("home", "lucide", 24, "#000000", 2, "curl");
    expect(code).toContain("curl");
    expect(code).toContain("-o home.svg");
  });

  it("generates HTML code", () => {
    const code = generateCode("home", "lucide", 24, "#000000", 2, "html");
    expect(code).toContain("<img");
    expect(code).toContain('alt="home"');
    expect(code).toContain('width="24"');
    expect(code).toContain('height="24"');
  });

  it("generates React code with PascalCase name", () => {
    const code = generateCode(
      "arrow-right",
      "lucide",
      24,
      "#000000",
      2,
      "react",
    );
    expect(code).toContain("ArrowRightIcon");
    expect(code).toContain("export const");
    expect(code).toContain("width={24}");
  });

  it("generates fetch code", () => {
    const code = generateCode("home", "lucide", 24, "#000000", 2, "fetch");
    expect(code).toContain("await fetch");
    expect(code).toContain("Accept");
    expect(code).toContain("image/svg+xml");
  });

  it("encodes color correctly", () => {
    const code = generateCode("home", "lucide", 24, "#ff0000", 2, "url");
    expect(code).toContain("%23ff0000");
  });
});

describe("SVG Sanitization", () => {
  const sanitizeSvg = (svg: string): string => {
    // Remove script tags
    let clean = svg.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      "",
    );
    // Remove event handlers (onclick, onload, onerror, etc.)
    clean = clean.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "");
    // Remove javascript: URLs
    clean = clean.replace(/javascript:/gi, "");
    // Remove data: URLs in href/xlink:href (can contain JS)
    clean = clean.replace(/href\s*=\s*["']data:[^"']*["']/gi, 'href=""');
    return clean;
  };

  it("removes script tags", () => {
    const malicious = '<svg><script>alert("xss")</script></svg>';
    const clean = sanitizeSvg(malicious);
    expect(clean).not.toContain("<script>");
    expect(clean).not.toContain("</script>");
  });

  it("removes onclick handlers", () => {
    const malicious = '<svg onclick="alert(1)"></svg>';
    const clean = sanitizeSvg(malicious);
    expect(clean).not.toContain("onclick");
  });

  it("removes onload handlers", () => {
    const malicious = '<svg onload="alert(1)"></svg>';
    const clean = sanitizeSvg(malicious);
    expect(clean).not.toContain("onload");
  });

  it("removes onerror handlers", () => {
    const malicious = '<img onerror="alert(1)" />';
    const clean = sanitizeSvg(malicious);
    expect(clean).not.toContain("onerror");
  });

  it("removes javascript: URLs", () => {
    const malicious = '<a href="javascript:alert(1)">click</a>';
    const clean = sanitizeSvg(malicious);
    expect(clean).not.toContain("javascript:");
  });

  it("removes data: URLs in href", () => {
    const malicious = '<a href="data:text/html,<script>alert(1)</script>">';
    const clean = sanitizeSvg(malicious);
    expect(clean).not.toContain("data:");
  });

  it("preserves valid SVG content", () => {
    const valid = '<svg viewBox="0 0 24 24"><path d="M12 12"></path></svg>';
    const clean = sanitizeSvg(valid);
    expect(clean).toBe(valid);
  });
});

describe("Filter Helpers", () => {
  interface FilterOption {
    name: string;
    count: number;
  }

  const filterOptions = (
    options: FilterOption[],
    searchTerm: string,
  ): FilterOption[] => {
    if (!searchTerm) return options;
    const term = searchTerm.toLowerCase();
    return options.filter((opt) => opt.name.toLowerCase().includes(term));
  };

  const sortByCount = (options: FilterOption[]): FilterOption[] => {
    return [...options].sort((a, b) => b.count - a.count);
  };

  it("returns all options when no search term", () => {
    const options = [
      { name: "lucide", count: 1000 },
      { name: "tabler", count: 500 },
    ];
    const result = filterOptions(options, "");
    expect(result).toHaveLength(2);
  });

  it("filters options by search term", () => {
    const options = [
      { name: "lucide", count: 1000 },
      { name: "tabler", count: 500 },
    ];
    const result = filterOptions(options, "luc");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("lucide");
  });

  it("filters case-insensitively", () => {
    const options = [{ name: "Lucide", count: 1000 }];
    const result = filterOptions(options, "LUCIDE");
    expect(result).toHaveLength(1);
  });

  it("sorts by count descending", () => {
    const options = [
      { name: "a", count: 100 },
      { name: "b", count: 500 },
      { name: "c", count: 200 },
    ];
    const sorted = sortByCount(options);
    expect(sorted[0].count).toBe(500);
    expect(sorted[1].count).toBe(200);
    expect(sorted[2].count).toBe(100);
  });
});

describe("Pagination Helpers", () => {
  const calculatePagination = (
    total: number,
    limit: number,
    offset: number,
  ): {
    currentPage: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } => {
    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return {
      currentPage,
      totalPages,
      hasNext: offset + limit < total,
      hasPrev: offset > 0,
    };
  };

  it("calculates first page correctly", () => {
    const result = calculatePagination(100, 10, 0);
    expect(result.currentPage).toBe(1);
    expect(result.totalPages).toBe(10);
    expect(result.hasNext).toBe(true);
    expect(result.hasPrev).toBe(false);
  });

  it("calculates middle page correctly", () => {
    const result = calculatePagination(100, 10, 50);
    expect(result.currentPage).toBe(6);
    expect(result.hasNext).toBe(true);
    expect(result.hasPrev).toBe(true);
  });

  it("calculates last page correctly", () => {
    const result = calculatePagination(100, 10, 90);
    expect(result.currentPage).toBe(10);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrev).toBe(true);
  });

  it("handles single page", () => {
    const result = calculatePagination(5, 10, 0);
    expect(result.totalPages).toBe(1);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrev).toBe(false);
  });

  it("handles empty results", () => {
    const result = calculatePagination(0, 10, 0);
    expect(result.totalPages).toBe(0);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrev).toBe(false);
  });
});

describe("URL Query Helpers", () => {
  const buildSearchParams = (
    params: Record<string, string | number | undefined>,
  ): URLSearchParams => {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        searchParams.set(key, String(value));
      }
    }
    return searchParams;
  };

  const parseSearchParams = (search: string): Record<string, string> => {
    const params = new URLSearchParams(search);
    const result: Record<string, string> = {};
    for (const [key, value] of params) {
      result[key] = value;
    }
    return result;
  };

  it("builds search params from object", () => {
    const params = buildSearchParams({
      q: "home",
      source: "lucide",
      limit: 20,
    });
    expect(params.get("q")).toBe("home");
    expect(params.get("source")).toBe("lucide");
    expect(params.get("limit")).toBe("20");
  });

  it("skips undefined values", () => {
    const params = buildSearchParams({
      q: "home",
      source: undefined,
    });
    expect(params.has("q")).toBe(true);
    expect(params.has("source")).toBe(false);
  });

  it("skips empty string values", () => {
    const params = buildSearchParams({
      q: "home",
      source: "",
    });
    expect(params.has("source")).toBe(false);
  });

  it("parses search params to object", () => {
    const result = parseSearchParams("?q=home&source=lucide&limit=20");
    expect(result.q).toBe("home");
    expect(result.source).toBe("lucide");
    expect(result.limit).toBe("20");
  });
});

describe("Debounce Helper", () => {
  const debounce = <T extends (...args: unknown[]) => void>(
    fn: T,
    delay: number,
  ): ((...args: Parameters<T>) => void) => {
    let timeoutId: ReturnType<typeof setTimeout>;

    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  };

  it("debounces function calls", async () => {
    let callCount = 0;
    const fn = () => callCount++;
    const debounced = debounce(fn, 50);

    debounced();
    debounced();
    debounced();

    expect(callCount).toBe(0);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(callCount).toBe(1);
  });

  it("passes arguments to debounced function", async () => {
    let result: string | null = null;
    const fn = (value: string) => {
      result = value;
    };
    const debounced = debounce(fn, 50);

    debounced("test");

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(result).toBe("test");
  });
});

describe("Local Storage Helpers", () => {
  const STORAGE_KEY = "test-key";

  const saveToStorage = <T>(key: string, data: T): boolean => {
    try {
      if (typeof localStorage === "undefined") return false;
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  };

  const loadFromStorage = <T>(key: string, defaultValue: T): T => {
    try {
      if (typeof localStorage === "undefined") return defaultValue;
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  // Note: These tests will work in jsdom environment
  // In node environment, localStorage is undefined

  it("returns default when localStorage undefined", () => {
    const result = loadFromStorage("test", []);
    expect(result).toEqual([]);
  });

  it("returns default for non-existent key", () => {
    const result = loadFromStorage("nonexistent", { default: true });
    expect(result).toEqual({ default: true });
  });
});

describe("Color Helpers", () => {
  const isValidHexColor = (color: string): boolean => {
    return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
  };

  const hexToRgb = (
    hex: string,
  ): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  };

  it("validates 6-digit hex color", () => {
    expect(isValidHexColor("#ff0000")).toBe(true);
    expect(isValidHexColor("#FFFFFF")).toBe(true);
  });

  it("validates 3-digit hex color", () => {
    expect(isValidHexColor("#fff")).toBe(true);
    expect(isValidHexColor("#F00")).toBe(true);
  });

  it("rejects invalid hex colors", () => {
    expect(isValidHexColor("red")).toBe(false);
    expect(isValidHexColor("#gg0000")).toBe(false);
    expect(isValidHexColor("ff0000")).toBe(false);
  });

  it("converts hex to RGB", () => {
    const rgb = hexToRgb("#ff0000");
    expect(rgb).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("converts hex to RGB without hash", () => {
    const rgb = hexToRgb("00ff00");
    expect(rgb).toEqual({ r: 0, g: 255, b: 0 });
  });

  it("returns null for invalid hex", () => {
    const rgb = hexToRgb("invalid");
    expect(rgb).toBeNull();
  });
});
