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

// Pre-compiled regex patterns for performance
const ATTRIBUTE_REGEX_CACHE = new Map<string, RegExp>();
const STROKE_WIDTH_KEBAB_REGEX = /stroke-width="[^"]*"/gi;
const STROKE_WIDTH_CAMEL_REGEX = /strokeWidth="[^"]*"/gi;
const CURRENT_COLOR_REGEX = /currentColor/g;
const VIEWBOX_REGEX = /viewBox="([^"]*)"/i;
const SVG_TAG_REGEX = /<svg\b[^>]*>/i;
const TRANSFORM_REGEX = /transform="([^"]*)"/i;
const CLASS_REGEX = /class="([^"]*)"/i;
const VALID_ATTR_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9-_:.]*$/;

/**
 * Get or compile attribute regex (with caching)
 */
const getAttributeRegex = (attr: string): RegExp => {
  let regex = ATTRIBUTE_REGEX_CACHE.get(attr);
  if (!regex) {
    regex = new RegExp(`\\s${attr}="[^"]*"`, "i");
    ATTRIBUTE_REGEX_CACHE.set(attr, regex);
  }
  return regex;
};

/**
 * Upsert an attribute in an SVG tag
 */
const upsertAttribute = (tag: string, attr: string, value: string): string => {
  const regex = getAttributeRegex(attr);
  if (regex.test(tag)) {
    return tag.replace(regex, ` ${attr}="${value}"`);
  }
  return tag.replace(/>$/, ` ${attr}="${value}">`);
};

/**
 * Remove an attribute from an SVG tag
 */
const removeAttribute = (tag: string, attr: string): string => {
  const regex = getAttributeRegex(attr);
  return tag.replace(regex, "");
};

/**
 * Replace stroke-width attributes
 */
const replaceStrokeWidth = (svg: string, strokeWidth: number): string => {
  const withKebab = svg.replace(
    STROKE_WIDTH_KEBAB_REGEX,
    `stroke-width="${strokeWidth}"`,
  );
  return withKebab.replace(
    STROKE_WIDTH_CAMEL_REGEX,
    `strokeWidth="${strokeWidth}"`,
  );
};

/**
 * Extract viewBox from SVG tag
 */
const getViewBox = (svg: string): string | null => {
  const match = svg.match(VIEWBOX_REGEX);
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
  const match = svg.match(TRANSFORM_REGEX);

  if (match) {
    const existingTransform = match[1];
    return svg.replace(
      TRANSFORM_REGEX,
      `transform="${newTransform} ${existingTransform}"`,
    );
  }

  // Add transform attribute to SVG tag
  const tagMatch = svg.match(SVG_TAG_REGEX);
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
  const tagMatch = result.match(SVG_TAG_REGEX);
  if (!tagMatch) return result;

  let tag = tagMatch[0];

  for (const [key, value] of Object.entries(attributes)) {
    // Validate attribute name (security)
    if (!VALID_ATTR_NAME_REGEX.test(key)) continue;
    tag = upsertAttribute(tag, key, value);
  }

  return result.replace(tagMatch[0], tag);
};

// Transform cache for memoization
interface TransformCacheKey {
  svgHash: string;
  options: string;
}

const transformCache = new Map<string, string>();
const MAX_TRANSFORM_CACHE_SIZE = 1000;

/**
 * Generate cache key for transform
 */
const generateTransformCacheKey = (
  svg: string,
  options: TransformOptions | AdvancedTransformOptions
): string => {
  // Simple hash for SVG content
  let hash = 0;
  for (let i = 0; i < svg.length; i++) {
    const char = svg.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `${hash}:${JSON.stringify(options)}`;
};

/**
 * Clear transform cache (useful for memory management)
 */
export const clearTransformCache = (): void => {
  transformCache.clear();
};

/**
 * Get transform cache stats
 */
export const getTransformCacheStats = (): { size: number; maxSize: number } => {
  return {
    size: transformCache.size,
    maxSize: MAX_TRANSFORM_CACHE_SIZE,
  };
};

/**
 * Basic SVG transformation with caching
 */
export const transformSvg = (svg: string, options: TransformOptions): string => {
  // Check cache first
  const cacheKey = generateTransformCacheKey(svg, options);
  const cached = transformCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  let output = svg;
  const tagMatch = output.match(SVG_TAG_REGEX);
  if (!tagMatch) return output;

  let tag = tagMatch[0];

  if (options.size) {
    tag = upsertAttribute(tag, "width", String(options.size));
    tag = upsertAttribute(tag, "height", String(options.size));
  }

  if (options.color && options.color !== "currentColor") {
    output = output.replace(CURRENT_COLOR_REGEX, options.color);
  }

  if (options.strokeWidth) {
    output = replaceStrokeWidth(output, options.strokeWidth);
  }

  output = output.replace(tagMatch[0], tag);

  // Cache result
  if (transformCache.size >= MAX_TRANSFORM_CACHE_SIZE) {
    // Evict oldest entry (simple FIFO)
    const firstKey = transformCache.keys().next().value;
    if (firstKey) {
      transformCache.delete(firstKey);
    }
  }
  transformCache.set(cacheKey, output);

  return output;
};

/**
 * Advanced SVG transformations including rotation, mirror, and custom attributes
 */
export const transformSvgAdvanced = (
  svg: string,
  options: AdvancedTransformOptions,
): string => {
  // Check cache first
  const cacheKey = generateTransformCacheKey(svg, options);
  const cached = transformCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  let output = svg;
  const tagMatch = output.match(SVG_TAG_REGEX);
  if (!tagMatch) return output;

  let tag = tagMatch[0];

  // Apply basic size transformation
  if (options.size) {
    tag = upsertAttribute(tag, "width", String(options.size));
    tag = upsertAttribute(tag, "height", String(options.size));
  }

  // Apply color transformation
  if (options.color && options.color !== "currentColor") {
    output = output.replace(CURRENT_COLOR_REGEX, options.color);
  }

  // Apply stroke width transformation
  if (options.strokeWidth) {
    output = replaceStrokeWidth(output, options.strokeWidth);
  }

  // Apply class attribute
  if (options.className) {
    const existingClass = tag.match(CLASS_REGEX);
    if (existingClass && existingClass[1]) {
      const classes = existingClass[1].split(/\s+/).filter(Boolean);
      if (!classes.includes(options.className)) {
        classes.push(options.className);
      }
      tag = tag.replace(CLASS_REGEX, `class="${classes.join(" ")}"`);
    } else {
      tag = tag.replace(/>$/, ` class="${options.className}">`);
    }
  }

  // Apply custom attributes
  if (options.customAttributes) {
    output = addCustomAttributes(output, options.customAttributes);
    // Re-fetch tag as it may have changed
    const newTagMatch = output.match(SVG_TAG_REGEX);
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
  const currentTagMatch = output.match(SVG_TAG_REGEX);
  if (currentTagMatch) {
    output = output.replace(currentTagMatch[0], tag);
  }

  // Cache result
  if (transformCache.size >= MAX_TRANSFORM_CACHE_SIZE) {
    const firstKey = transformCache.keys().next().value;
    if (firstKey) {
      transformCache.delete(firstKey);
    }
  }
  transformCache.set(cacheKey, output);

  return output;
};

/**
 * Generate ETag for transformed SVG content
 * Uses fast hash for content-based ETag generation
 */
export const generateETag = (content: string): string => {
  // Simple but fast hash for ETag generation
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `"${Math.abs(hash).toString(16)}"`;
};
