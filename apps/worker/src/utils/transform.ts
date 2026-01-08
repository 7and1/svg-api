export interface TransformOptions {
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export interface AdvancedTransformOptions extends TransformOptions {
  rotate?: number;
  mirror?: boolean;
  className?: string;
  customAttributes?: Record<string, string>;
}

const upsertAttribute = (tag: string, attr: string, value: string) => {
  const regex = new RegExp(`\\s${attr}="[^"]*"`, "i");
  if (regex.test(tag)) {
    return tag.replace(regex, ` ${attr}="${value}"`);
  }
  return tag.replace(/>$/, ` ${attr}="${value}">`);
};

const removeAttribute = (tag: string, attr: string) => {
  const regex = new RegExp(`\\s${attr}="[^"]*"`, "i");
  return tag.replace(regex, "");
};

const replaceStrokeWidth = (svg: string, strokeWidth: number) => {
  const withKebab = svg.replace(
    /stroke-width="[^"]*"/gi,
    `stroke-width="${strokeWidth}"`,
  );
  return withKebab.replace(
    /strokeWidth="[^"]*"/gi,
    `strokeWidth="${strokeWidth}"`,
  );
};

/**
 * Extract viewBox from SVG tag
 */
const getViewBox = (svg: string): string | null => {
  const match = svg.match(/viewBox="([^"]*)"/i);
  return match ? (match[1] ?? null) : null;
};

/**
 * Parse viewBox to get width, height, x, y
 */
const parseViewBox = (
  viewBox: string,
): { x: number; y: number; w: number; h: number } | null => {
  const parts = viewBox.trim().split(/\s+/);
  if (parts.length !== 4) return null;
  const [x, y, w, h] = parts.map(Number);
  if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(w) || Number.isNaN(h))
    return null;
  return { x: x ?? 0, y: y ?? 0, w: w ?? 0, h: h ?? 0 };
};

/**
 * Generate transform string for rotation
 */
const getRotateTransform = (
  degrees: number,
  viewBox: { x: number; y: number; w: number; h: number },
): string => {
  const cx = viewBox.x + viewBox.w / 2;
  const cy = viewBox.y + viewBox.h / 2;
  return `rotate(${degrees} ${cx} ${cy})`;
};

/**
 * Generate transform string for mirroring (horizontal flip)
 */
const getMirrorTransform = (viewBox: {
  x: number;
  y: number;
  w: number;
  h: number;
}): string => {
  const cx = viewBox.x + viewBox.w / 2;
  return `scale(-1, 1) translate(${-cx * 2}, 0)`;
};

/**
 * Combine existing transform with new transform
 */
const combineTransforms = (svg: string, newTransform: string): string => {
  const transformRegex = /transform="([^"]*)"/i;
  const match = svg.match(transformRegex);

  if (match) {
    const existingTransform = match[1];
    return svg.replace(
      transformRegex,
      `transform="${newTransform} ${existingTransform}"`,
    );
  }

  // Add transform attribute to SVG tag
  const tagMatch = svg.match(/<svg\b[^>]*>/i);
  if (tagMatch) {
    const tag = tagMatch[0];
    const newTag = tag.replace(/>$/, ` transform="${newTransform}">`);
    return svg.replace(tag, newTag);
  }

  return svg;
};

/**
 * Add custom attributes to SVG tag
 */
const addCustomAttributes = (
  svg: string,
  attributes: Record<string, string>,
): string => {
  let result = svg;
  const tagMatch = result.match(/<svg\b[^>]*>/i);
  if (!tagMatch) return result;

  let tag = tagMatch[0];

  for (const [key, value] of Object.entries(attributes)) {
    // Validate attribute name (security)
    if (!/^[a-zA-Z][a-zA-Z0-9-_:.]*$/.test(key)) continue;
    tag = upsertAttribute(tag, key, value);
  }

  return result.replace(tagMatch[0], tag);
};

export const transformSvg = (svg: string, options: TransformOptions) => {
  let output = svg;
  const tagMatch = output.match(/<svg\b[^>]*>/i);
  if (!tagMatch) return output;

  let tag = tagMatch[0];

  if (options.size) {
    tag = upsertAttribute(tag, "width", String(options.size));
    tag = upsertAttribute(tag, "height", String(options.size));
  }

  if (options.color && options.color !== "currentColor") {
    output = output.replace(/currentColor/g, options.color);
  }

  if (options.strokeWidth) {
    output = replaceStrokeWidth(output, options.strokeWidth);
  }

  output = output.replace(tagMatch[0], tag);
  return output;
};

/**
 * Advanced SVG transformations including rotation, mirror, and custom attributes
 */
export const transformSvgAdvanced = (
  svg: string,
  options: AdvancedTransformOptions,
): string => {
  let output = svg;
  const tagMatch = output.match(/<svg\b[^>]*>/i);
  if (!tagMatch) return output;

  let tag = tagMatch[0];

  // Apply basic size transformation
  if (options.size) {
    tag = upsertAttribute(tag, "width", String(options.size));
    tag = upsertAttribute(tag, "height", String(options.size));
  }

  // Apply color transformation
  if (options.color && options.color !== "currentColor") {
    output = output.replace(/currentColor/g, options.color);
  }

  // Apply stroke width transformation
  if (options.strokeWidth) {
    output = replaceStrokeWidth(output, options.strokeWidth);
  }

  // Apply class attribute
  if (options.className) {
    const classRegex = /class="([^"]*)"/i;
    const existingClass = tag.match(classRegex);
    if (existingClass && existingClass[1]) {
      const classes = existingClass[1].split(/\s+/).filter(Boolean);
      if (!classes.includes(options.className)) {
        classes.push(options.className);
      }
      tag = tag.replace(classRegex, `class="${classes.join(" ")}"`);
    } else {
      tag = tag.replace(/>$/, ` class="${options.className}">`);
    }
  }

  // Apply custom attributes
  if (options.customAttributes) {
    output = addCustomAttributes(output, options.customAttributes);
    // Re-fetch tag as it may have changed
    const newTagMatch = output.match(/<svg\b[^>]*>/i);
    if (newTagMatch) tag = newTagMatch[0];
  }

  // Apply geometric transforms (rotation, mirror)
  const viewBox = getViewBox(output);
  const parsedViewBox = viewBox ? parseViewBox(viewBox) : null;

  if (options.mirror && parsedViewBox) {
    const mirrorTransform = getMirrorTransform(parsedViewBox);
    output = combineTransforms(output, mirrorTransform);
  }

  if (options.rotate !== undefined && parsedViewBox) {
    // Normalize rotation to 0-360 range
    let normalizedRotation = options.rotate % 360;
    if (normalizedRotation < 0) normalizedRotation += 360;

    if (normalizedRotation !== 0) {
      const rotateTransform = getRotateTransform(
        normalizedRotation,
        parsedViewBox,
      );
      output = combineTransforms(output, rotateTransform);
    }
  }

  // Replace the modified tag
  const currentTagMatch = output.match(/<svg\b[^>]*>/i);
  if (currentTagMatch) {
    output = output.replace(currentTagMatch[0], tag);
  }

  return output;
};
