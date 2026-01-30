import { describe, it, expect } from "vitest";
import {
  transformSvg,
  transformSvgAdvanced,
  type TransformOptions,
  type AdvancedTransformOptions,
} from "../../../src/utils/transform";

const sampleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`;

const sampleSvgWithClass = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="original-class"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`;

describe("transformSvg", () => {
  it("should return original SVG when no options provided", () => {
    const result = transformSvg(sampleSvg, {});
    expect(result).toBe(sampleSvg);
  });

  it("should apply size transformation", () => {
    const options: TransformOptions = { size: 48 };
    const result = transformSvg(sampleSvg, options);

    expect(result).toContain('width="48"');
    expect(result).toContain('height="48"');
  });

  it("should apply color transformation", () => {
    const options: TransformOptions = { color: "#ff0000" };
    const result = transformSvg(sampleSvg, options);

    expect(result).toContain("#ff0000");
    expect(result).not.toContain('stroke="currentColor"');
  });

  it("should not replace color when currentColor is specified", () => {
    const options: TransformOptions = { color: "currentColor" };
    const result = transformSvg(sampleSvg, options);

    expect(result).toContain('stroke="currentColor"');
  });

  it("should apply stroke width transformation", () => {
    const options: TransformOptions = { strokeWidth: 1.5 };
    const result = transformSvg(sampleSvg, options);

    expect(result).toContain('stroke-width="1.5"');
  });

  it("should handle all transformations together", () => {
    const options: TransformOptions = {
      size: 64,
      color: "#00ff00",
      strokeWidth: 3,
    };
    const result = transformSvg(sampleSvg, options);

    expect(result).toContain('width="64"');
    expect(result).toContain('height="64"');
    expect(result).toContain("#00ff00");
    expect(result).toContain('stroke-width="3"');
  });

  it("should handle SVG without viewBox", () => {
    const svgNoViewBox = `<svg xmlns="http://www.w3.org/2000/svg" fill="none"><path d="M3 9l9-7"/></svg>`;
    const options: TransformOptions = { size: 32 };
    const result = transformSvg(svgNoViewBox, options);

    expect(result).toContain('width="32"');
    expect(result).toContain('height="32"');
  });

  it("should handle empty SVG gracefully", () => {
    const result = transformSvg("", { size: 24 });
    expect(result).toBe("");
  });

  it("should handle SVG without closing tag", () => {
    const invalidSvg = `<svg xmlns="http://www.w3.org/2000/svg">`;
    const result = transformSvg(invalidSvg, { size: 24 });
    expect(result).toBe(invalidSvg);
  });
});

describe("transformSvgAdvanced", () => {
  it("should apply basic transformations", () => {
    const options: AdvancedTransformOptions = {
      size: 48,
      color: "#ff0000",
      strokeWidth: 1.5,
    };
    const result = transformSvgAdvanced(sampleSvg, options);

    expect(result).toContain('width="48"');
    expect(result).toContain('height="48"');
    expect(result).toContain("#ff0000");
  });

  it("should apply rotation transformation", () => {
    const options: AdvancedTransformOptions = {
      size: 24,
      rotate: 90,
    };
    const result = transformSvgAdvanced(sampleSvg, options);

    expect(result).toContain("rotate(90 12 12)");
  });

  it("should apply mirror transformation", () => {
    const options: AdvancedTransformOptions = {
      size: 24,
      mirror: true,
    };
    const result = transformSvgAdvanced(sampleSvg, options);

    expect(result).toContain("scale(-1, 1)");
  });

  it("should apply className transformation", () => {
    const options: AdvancedTransformOptions = {
      size: 24,
      className: "my-custom-class",
    };
    const result = transformSvgAdvanced(sampleSvg, options);

    expect(result).toContain('class="my-custom-class"');
  });

  it("should append class to existing class", () => {
    const options: AdvancedTransformOptions = {
      className: "new-class",
    };
    const result = transformSvgAdvanced(sampleSvgWithClass, options);

    expect(result).toContain("original-class");
    expect(result).toContain("new-class");
  });

  it("should apply custom attributes", () => {
    const options: AdvancedTransformOptions = {
      size: 24,
      customAttributes: {
        "data-icon": "home",
        "aria-label": "Home icon",
      },
    };
    const result = transformSvgAdvanced(sampleSvg, options);

    expect(result).toContain('data-icon="home"');
    expect(result).toContain('aria-label="Home icon"');
  });

  it("should ignore invalid custom attribute names", () => {
    const options: AdvancedTransformOptions = {
      customAttributes: {
        "123invalid": "value",
        "data-valid": "value",
      },
    };
    const result = transformSvgAdvanced(sampleSvg, options);

    expect(result).not.toContain("123invalid");
    expect(result).toContain('data-valid="value"');
  });

  it("should combine rotation and mirror transformations", () => {
    const options: AdvancedTransformOptions = {
      size: 24,
      rotate: 45,
      mirror: true,
    };
    const result = transformSvgAdvanced(sampleSvg, options);

    expect(result).toContain("rotate(45 12 12)");
    expect(result).toContain("scale(-1, 1)");
  });

  it("should normalize rotation to 0-360 range", () => {
    const options: AdvancedTransformOptions = {
      rotate: 450, // Should become 90
    };
    const result = transformSvgAdvanced(sampleSvg, options);

    expect(result).toContain("rotate(90 12 12)");
  });

  it("should handle negative rotation", () => {
    const options: AdvancedTransformOptions = {
      rotate: -90, // Should become 270
    };
    const result = transformSvgAdvanced(sampleSvg, options);

    expect(result).toContain("rotate(270 12 12)");
  });

  it("should not add rotation when normalized to 0", () => {
    const options: AdvancedTransformOptions = {
      rotate: 360,
    };
    const result = transformSvgAdvanced(sampleSvg, options);

    expect(result).not.toContain("rotate(360");
  });

  it("should handle all advanced options together", () => {
    const options: AdvancedTransformOptions = {
      size: 64,
      color: "#0000ff",
      strokeWidth: 2,
      rotate: 180,
      mirror: true,
      className: "icon-large",
      customAttributes: {
        "data-testid": "home-icon",
      },
    };
    const result = transformSvgAdvanced(sampleSvg, options);

    expect(result).toContain('width="64"');
    expect(result).toContain('height="64"');
    expect(result).toContain("#0000ff");
    expect(result).toContain('stroke-width="2"');
    expect(result).toContain("rotate(180 12 12)");
    expect(result).toContain("scale(-1, 1)");
    expect(result).toContain('class="icon-large"');
    expect(result).toContain('data-testid="home-icon"');
  });

  it("should handle SVG with existing transform attribute", () => {
    const svgWithTransform = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" transform="translate(10, 10)"><path d="M3 9l9-7"/></svg>`;
    const options: AdvancedTransformOptions = {
      rotate: 45,
    };
    const result = transformSvgAdvanced(svgWithTransform, options);

    expect(result).toContain("rotate(45 12 12)");
    expect(result).toContain("translate(10, 10)");
  });

  it("should handle empty SVG", () => {
    const result = transformSvgAdvanced("", { size: 24 });
    expect(result).toBe("");
  });
});
