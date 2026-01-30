import { z } from "zod";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import {
  DEFAULT_ICON_SIZE,
  DEFAULT_STROKE_WIDTH,
  MAX_ICON_SIZE,
  MAX_STROKE_WIDTH,
  MIN_ICON_SIZE,
  MIN_STROKE_WIDTH,
} from "@svg-api/shared/constants";

// ============================================================================
// Strict Mode Configuration
// ============================================================================

export interface ValidationOptions {
  strict?: boolean;
  maxPayloadSize?: number;
  allowHtml?: boolean;
  allowedTags?: string[];
}

const DEFAULT_VALIDATION_OPTIONS: ValidationOptions = {
  strict: false,
  maxPayloadSize: 1024 * 1024, // 1MB
  allowHtml: false,
  allowedTags: [],
};

// ============================================================================
// XSS Prevention - Parser-based SVG Validation
// ============================================================================

// Allowed SVG elements (whitelist approach)
const ALLOWED_SVG_ELEMENTS = new Set([
  "svg",
  "g",
  "path",
  "circle",
  "ellipse",
  "line",
  "polygon",
  "polyline",
  "rect",
  "text",
  "tspan",
  "defs",
  "use",
  "symbol",
  "linearGradient",
  "radialGradient",
  "stop",
  "clipPath",
  "mask",
  "pattern",
  "filter",
  "feGaussianBlur",
  "feOffset",
  "feBlend",
  "feColorMatrix",
  "title",
  "desc",
  "metadata",
]);

// Allowed SVG attributes (whitelist approach)
const ALLOWED_SVG_ATTRIBUTES = new Set([
  // Core attributes
  "id",
  "class",
  "style",
  "transform",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "stroke-dashoffset",
  "opacity",
  "fill-opacity",
  "stroke-opacity",
  // Geometry attributes
  "d",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "points",
  "width",
  "height",
  // Text attributes
  "font-family",
  "font-size",
  "font-weight",
  "text-anchor",
  "dominant-baseline",
  // SVG attributes
  "viewBox",
  "preserveAspectRatio",
  "xmlns",
  "xmlns:xlink",
  "version",
  // Gradient attributes
  "offset",
  "stop-color",
  "stop-opacity",
  "gradientUnits",
  "gradientTransform",
  "spreadMethod",
  "xlink:href",
  "href",
  // Clip and mask
  "clip-path",
  "mask",
  "clip-rule",
  // Filter attributes
  "filter",
  "stdDeviation",
  "in",
  "in2",
  "mode",
  "result",
  "type",
  "values",
  // Animation (limited)
  "dur",
  "repeatCount",
  // Other
  "role",
  "aria-label",
  "aria-hidden",
  "focusable",
]);

// Dangerous URL protocols
const DANGEROUS_PROTOCOLS = [
  /^javascript:/i,
  /^data:text\/html/i,
  /^vbscript:/i,
  /^file:/i,
  /^about:/i,
];

// Event handler attributes (on*)
const EVENT_HANDLER_PATTERN = /^on[a-z]+$/i;

// XML parser options for strict validation
const XML_PARSER_OPTIONS = {
  allowBooleanAttributes: false,
  attributeNamePrefix: "",
  ignoreAttributes: false,
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
  processEntities: false,
  htmlEntities: false,
  cdataPropName: false,
  preserveOrder: false,
};

// ============================================================================
// Base Schemas
// ============================================================================

export const sourceSchema = z.string()
  .regex(/^[a-z0-9-]+$/, "Source must be lowercase alphanumeric with hyphens only")
  .min(1, "Source is required")
  .max(50, "Source name too long");

export const nameSchema = z.string()
  .regex(/^[a-z0-9-]+$/, "Name must be lowercase alphanumeric with hyphens only")
  .min(1, "Name is required")
  .max(100, "Name too long");

const colorRegex = /^(#([0-9a-fA-F]{3}){1,2}|[a-zA-Z]+|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\))$/;

// ============================================================================
// Parameter Parsers with Strict Validation
// ============================================================================

export const parseSize = (value: string | undefined, options: ValidationOptions = {}): number | null => {
  if (!value) return DEFAULT_ICON_SIZE;

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return null;
  if (parsed < MIN_ICON_SIZE || parsed > MAX_ICON_SIZE) return null;

  // Strict mode: only allow integer sizes
  if (options.strict && !Number.isInteger(parsed)) {
    return null;
  }

  return parsed;
};

export const parseStrokeWidth = (value: string | undefined, options: ValidationOptions = {}): number | null => {
  if (!value) return DEFAULT_STROKE_WIDTH;

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return null;
  if (parsed < MIN_STROKE_WIDTH || parsed > MAX_STROKE_WIDTH) return null;

  // Strict mode: limit precision
  if (options.strict) {
    const rounded = Math.round(parsed * 10) / 10;
    if (rounded !== parsed) return null;
  }

  return parsed;
};

export const parseColor = (value: string | undefined, options: ValidationOptions = {}): string | null => {
  if (!value) return "currentColor";

  // Normalize the color value
  const normalized = value.trim();

  // Check against regex
  if (!colorRegex.test(normalized)) return null;

  // Strict mode: additional validation
  if (options.strict) {
    // Only allow hex colors and specific named colors
    const allowedNamedColors = [
      "currentColor", "transparent", "black", "white", "red", "green", "blue",
      "yellow", "cyan", "magenta", "gray", "grey", "orange", "purple", "pink",
    ];

    if (!normalized.startsWith("#") &&
        !normalized.startsWith("rgb") &&
        !allowedNamedColors.includes(normalized.toLowerCase())) {
      return null;
    }
  }

  return normalized;
};

export const parseLimit = (
  value: string | undefined,
  fallback: number,
  max: number,
  options: ValidationOptions = {},
): number => {
  if (!value) return fallback;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;

  // Strict mode: validate against whitelist
  if (options.strict) {
    const allowedLimits = [10, 20, 50, 100, 200, 500];
    if (!allowedLimits.includes(parsed)) {
      return fallback;
    }
  }

  return Math.max(1, Math.min(max, Math.floor(parsed)));
};

export const parseOffset = (value: string | undefined, options: ValidationOptions = {}): number => {
  if (!value) return 0;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;

  // Strict mode: limit maximum offset
  if (options.strict && parsed > 10000) {
    return 0;
  }

  return Math.floor(parsed);
};

export const parseRotate = (value: string | undefined, options: ValidationOptions = {}): number | undefined => {
  if (!value) return undefined;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;

  // Strict mode: normalize to 0-360
  if (options.strict) {
    return ((parsed % 360) + 360) % 360;
  }

  return parsed;
};

export const parseMirror = (value: string | undefined): boolean => {
  if (!value) return false;
  const normalized = value.toLowerCase().trim();
  return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
};

// ============================================================================
// XSS Filtering Functions - Parser-based Implementation
// ============================================================================

/**
 * Check if a URL value contains dangerous protocols
 */
function hasDangerousProtocol(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  return DANGEROUS_PROTOCOLS.some((pattern) => pattern.test(trimmed));
}

/**
 * Validate and sanitize an attribute value
 */
function sanitizeAttributeValue(
  attrName: string,
  attrValue: string
): { safe: boolean; value?: string; reason?: string } {
  // Check for event handlers
  if (EVENT_HANDLER_PATTERN.test(attrName)) {
    return { safe: false, reason: `EVENT_HANDLER:${attrName}` };
  }

  // Check URL-based attributes for dangerous protocols
  const urlAttributes = ["href", "xlink:href", "src", "poster", "data"];
  if (urlAttributes.includes(attrName.toLowerCase())) {
    if (hasDangerousProtocol(attrValue)) {
      return { safe: false, reason: `DANGEROUS_PROTOCOL:${attrName}` };
    }
  }

  // Check for script in attribute values
  const lowerValue = attrValue.toLowerCase();
  if (lowerValue.includes("javascript:") || lowerValue.includes("script")) {
    return { safe: false, reason: `SCRIPT_IN_ATTRIBUTE:${attrName}` };
  }

  return { safe: true, value: attrValue };
}

/**
 * Recursively validate SVG element structure
 */
function validateElement(
  element: unknown,
  path: string,
  strict: boolean
): { valid: boolean; threats: string[] } {
  const threats: string[] = [];

  if (typeof element !== "object" || element === null) {
    return { valid: true, threats };
  }

  const elem = element as Record<string, unknown>;

  // Check element name
  const tagName = Object.keys(elem).find(
    (k) => !k.startsWith("@") && k !== "#text"
  );

  if (!tagName) {
    // Text node or empty
    return { valid: true, threats };
  }

  const lowerTagName = tagName.toLowerCase();

  // Validate element is in whitelist
  if (!ALLOWED_SVG_ELEMENTS.has(lowerTagName)) {
    if (strict) {
      return { valid: false, threats: [`DISALLOWED_ELEMENT:${tagName}`] };
    }
    threats.push(`DISALLOWED_ELEMENT:${tagName}`);
  }

  // Validate attributes
  const attrs = elem["@_"] as Record<string, string> | undefined;
  if (attrs && typeof attrs === "object") {
    for (const [attrName, attrValue] of Object.entries(attrs)) {
      const lowerAttrName = attrName.toLowerCase();

      // Check if attribute is allowed
      if (!ALLOWED_SVG_ATTRIBUTES.has(lowerAttrName)) {
        if (strict) {
          threats.push(`DISALLOWED_ATTRIBUTE:${attrName}`);
          continue;
        }
      }

      // Validate attribute value
      const attrResult = sanitizeAttributeValue(attrName, String(attrValue));
      if (!attrResult.safe) {
        threats.push(attrResult.reason || `INVALID_ATTRIBUTE:${attrName}`);
      }
    }
  }

  // Recursively validate children
  const children = elem[tagName];
  if (Array.isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      const childResult = validateElement(
        children[i],
        `${path}.${tagName}[${i}]`,
        strict
      );
      threats.push(...childResult.threats);
      if (strict && !childResult.valid) {
        return { valid: false, threats };
      }
    }
  } else if (children !== undefined) {
    const childResult = validateElement(children, `${path}.${tagName}`, strict);
    threats.push(...childResult.threats);
    if (strict && !childResult.valid) {
      return { valid: false, threats };
    }
  }

  return { valid: threats.length === 0, threats };
}

/**
 * Sanitize SVG content using XML parser-based validation
 * This is more secure than pattern-based sanitization as it properly
 * parses the XML structure and cannot be bypassed with encoding tricks.
 */
export function sanitizeSvgStrict(
  svgContent: string,
  options: ValidationOptions = {}
): {
  sanitized: string;
  threats: string[];
  isSafe: boolean;
} {
  const threats: string[] = [];
  const opts = { ...DEFAULT_VALIDATION_OPTIONS, ...options };

  // Check payload size
  if (svgContent.length > (opts.maxPayloadSize || 1024 * 1024)) {
    return {
      sanitized: "",
      threats: ["PAYLOAD_TOO_LARGE"],
      isSafe: false,
    };
  }

  // Validate XML structure first
  const validationResult = XMLValidator.validate(svgContent, {
    allowBooleanAttributes: false,
  });

  if (validationResult !== true) {
    return {
      sanitized: "",
      threats: [`INVALID_XML:${validationResult.err.msg}`],
      isSafe: false,
    };
  }

  // Parse XML
  const parser = new XMLParser(XML_PARSER_OPTIONS);
  let parsed: unknown;

  try {
    parsed = parser.parse(svgContent);
  } catch (error) {
    return {
      sanitized: "",
      threats: [`PARSE_ERROR:${error instanceof Error ? error.message : "Unknown"}`],
      isSafe: false,
    };
  }

  // Validate structure
  const validation = validateElement(parsed, "root", opts.strict);
  threats.push(...validation.threats);

  // In strict mode, return empty if any threats found
  if (opts.strict && threats.length > 0) {
    return {
      sanitized: "",
      threats,
      isSafe: false,
    };
  }

  // Return original if safe, or empty if threats detected
  return {
    sanitized: threats.length === 0 ? svgContent : "",
    threats,
    isSafe: threats.length === 0,
  };
}

/**
 * Legacy sanitizeSvg function - now delegates to parser-based implementation
 * @deprecated Use sanitizeSvgStrict for new code
 */
export function sanitizeSvg(
  svgContent: string,
  options: ValidationOptions = {}
): {
  sanitized: string;
  threats: string[];
  isSafe: boolean;
} {
  // Always use strict parser-based validation
  return sanitizeSvgStrict(svgContent, { ...options, strict: true });
}

/**
 * Validate and sanitize user input strings
 */
export function sanitizeString(input: string, options: ValidationOptions = {}): {
  sanitized: string;
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const opts = { ...DEFAULT_VALIDATION_OPTIONS, ...options };

  // Check length
  if (input.length > (opts.maxPayloadSize || 10000)) {
    errors.push("INPUT_TOO_LONG");
    return { sanitized: "", isValid: false, errors };
  }

  let sanitized = input;

  // Remove null bytes
  if (sanitized.includes("\0")) {
    errors.push("NULL_BYTES_DETECTED");
    sanitized = sanitized.replace(/\0/g, "");
  }

  // Check for control characters (except common whitespace)
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/.test(sanitized)) {
    errors.push("CONTROL_CHARACTERS_DETECTED");
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");
  }

  // HTML sanitization
  if (!opts.allowHtml) {
    // Remove HTML tags
    const hasHtml = /<[^>]+>/.test(sanitized);
    if (hasHtml) {
      errors.push("HTML_TAGS_DETECTED");
      sanitized = sanitized.replace(/<[^>]+>/g, "");
    }
  }

  // Normalize Unicode
  try {
    sanitized = sanitized.normalize("NFC");
  } catch {
    errors.push("INVALID_UNICODE");
  }

  return {
    sanitized: sanitized.trim(),
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Parameter Whitelist Validation
// ============================================================================

/**
 * Allowed query parameters for each endpoint
 */
export const ALLOWED_PARAMS: Record<string, string[]> = {
  "/api/v1/icon": ["source", "name", "size", "color", "strokeWidth", "rotate", "mirror", "api_key"],
  "/api/v1/icons": ["source", "limit", "offset", "api_key"],
  "/api/v1/search": ["q", "limit", "offset", "source", "api_key"],
  "/api/v1/batch": ["api_key"],
  "/health": ["detailed"],
};

/**
 * Validate query parameters against whitelist
 */
export function validateQueryParams(
  path: string,
  params: Record<string, string>,
  options: ValidationOptions = {}
): {
  valid: boolean;
  allowed: Record<string, string>;
  rejected: string[];
} {
  const opts = { ...DEFAULT_VALIDATION_OPTIONS, ...options };
  const normalizedPath = path.split("?")[0];

  // Find matching endpoint pattern
  const endpointPattern = Object.keys(ALLOWED_PARAMS).find(pattern =>
    normalizedPath.startsWith(pattern)
  );

  if (!endpointPattern) {
    // Unknown endpoint - reject all params in strict mode
    if (opts.strict) {
      return { valid: false, allowed: {}, rejected: Object.keys(params) };
    }
    return { valid: true, allowed: params, rejected: [] };
  }

  const allowed = ALLOWED_PARAMS[endpointPattern];
  const allowedParams: Record<string, string> = {};
  const rejected: string[] = [];

  for (const [key, value] of Object.entries(params)) {
    if (allowed.includes(key)) {
      // Sanitize the value
      const sanitized = sanitizeString(value, opts);
      if (sanitized.isValid || !opts.strict) {
        allowedParams[key] = sanitized.sanitized;
      } else {
        rejected.push(key);
      }
    } else {
      rejected.push(key);
    }
  }

  return {
    valid: rejected.length === 0,
    allowed: allowedParams,
    rejected,
  };
}

// ============================================================================
// Request Body Validation
// ============================================================================

/**
 * Batch request schema with strict validation
 */
export const batchRequestSchema = z.object({
  icons: z.array(z.object({
    source: sourceSchema,
    name: nameSchema,
    size: z.number().int().min(MIN_ICON_SIZE).max(MAX_ICON_SIZE).optional(),
    color: z.string().regex(colorRegex).optional(),
    strokeWidth: z.number().min(MIN_STROKE_WIDTH).max(MAX_STROKE_WIDTH).optional(),
    rotate: z.number().optional(),
    mirror: z.boolean().optional(),
  })).min(1).max(100), // Max 100 icons per batch
});

export type BatchRequest = z.infer<typeof batchRequestSchema>;

/**
 * Search request schema
 */
export const searchRequestSchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.number().int().min(1).max(500).optional(),
  offset: z.number().int().min(0).optional(),
  source: z.string().optional(),
});

export type SearchRequest = z.infer<typeof searchRequestSchema>;

/**
 * Validate JSON request body
 */
export async function validateJsonBody<T>(
  body: unknown,
  schema: z.ZodSchema<T>,
  options: ValidationOptions = {}
): Promise<{
  success: boolean;
  data?: T;
  errors?: z.ZodError;
}> {
  const opts = { ...DEFAULT_VALIDATION_OPTIONS, ...options };

  // Check body size if it's a string
  if (typeof body === "string" && body.length > (opts.maxPayloadSize || 1024 * 1024)) {
    return {
      success: false,
      errors: new z.ZodError([{
        code: "custom",
        message: "Request body too large",
        path: [],
      }]),
    };
  }

  const result = schema.safeParse(body);

  if (!result.success && opts.strict) {
    return { success: false, errors: result.error };
  }

  return result.success
    ? { success: true, data: result.data }
    : { success: false, errors: result.error };
}

// ============================================================================
// Content Type Validation
// ============================================================================

/**
 * Validate content type header
 */
export function validateContentType(
  contentType: string | undefined,
  allowedTypes: string[]
): boolean {
  if (!contentType) return allowedTypes.includes("*/*");

  const normalized = contentType.split(";")[0].trim().toLowerCase();
  return allowedTypes.some(type => {
    if (type === "*/*") return true;
    if (type.endsWith("/*")) {
      return normalized.startsWith(type.slice(0, -1));
    }
    return normalized === type;
  });
}

/**
 * Validate accept header
 */
export function validateAcceptHeader(
  accept: string | undefined,
  availableTypes: string[]
): string | null {
  if (!accept || accept === "*/*") {
    return availableTypes[0];
  }

  const accepted = accept.split(",").map(t => t.split(";")[0].trim());

  for (const type of availableTypes) {
    if (accepted.includes(type) || accepted.includes(type.split("/")[0] + "/*")) {
      return type;
    }
  }

  return null;
}
