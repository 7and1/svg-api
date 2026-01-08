import type { IconVariant, SourceMeta } from "@svg-api/shared/types";
import { SOURCE_VARIANT_SUPPORT, SOURCE_CONFIG } from "../data/sources";

/**
 * Map display names to internal variant values
 */
const VARIANT_ALIASES: Record<string, string> = {
  filled: "solid",
  regular: "outline",
  stroked: "outline",
};

export interface VariantResolution {
  source: string;
  requestedVariant: string;
  resolvedVariant: string;
  availableVariants: IconVariant[];
  fallbackToDefault: boolean;
}

/**
 * Normalize variant name using aliases
 */
export function normalizeVariant(variant: string): string {
  const normalized = variant.toLowerCase().trim();
  return VARIANT_ALIASES[normalized] ?? normalized;
}

/**
 * Check if a source supports a specific variant
 */
export function isVariantAvailable(source: string, variant: string): boolean {
  const supportedVariants = SOURCE_VARIANT_SUPPORT[source]?.variants ?? [
    "default",
  ];
  const normalized = normalizeVariant(variant);
  return supportedVariants.includes(normalized as IconVariant);
}

/**
 * Get all available variants for a source
 */
export function getAvailableVariants(source: string): IconVariant[] {
  return SOURCE_VARIANT_SUPPORT[source]?.variants ?? ["default"];
}

/**
 * Get variant path suffix for R2 lookups
 * Different sources organize variants differently in storage
 */
export function getVariantPathSuffix(
  source: string,
  variant: string,
): string | null {
  const normalized = normalizeVariant(variant);
  if (normalized === "default") return null;

  switch (source) {
    case "heroicons":
      return `/${normalized}`;
    case "ionicons":
      return `/${normalized}`;
    default:
      return null;
  }
}

/**
 * Resolve variant for an icon request
 * Returns the resolved variant or indicates if fallback is needed
 */
export function resolveVariant(
  source: string,
  variant?: string,
  allowFallback = true,
): VariantResolution {
  const availableVariants = getAvailableVariants(source);
  const requestedVariant = variant ? normalizeVariant(variant) : "default";

  if (!variant || requestedVariant === "default") {
    return {
      source,
      requestedVariant: "default",
      resolvedVariant: "default",
      availableVariants,
      fallbackToDefault: false,
    };
  }

  if (isVariantAvailable(source, requestedVariant)) {
    return {
      source,
      requestedVariant,
      resolvedVariant: requestedVariant,
      availableVariants,
      fallbackToDefault: false,
    };
  }

  if (allowFallback) {
    return {
      source,
      requestedVariant,
      resolvedVariant: "default",
      availableVariants,
      fallbackToDefault: true,
    };
  }

  return {
    source,
    requestedVariant,
    resolvedVariant: requestedVariant,
    availableVariants,
    fallbackToDefault: false,
  };
}

/**
 * Get icon record key for a specific variant
 * Adjusts the key format based on source variant organization
 */
export function getVariantIconKey(
  source: string,
  name: string,
  variant: string,
): string {
  const resolution = resolveVariant(source, variant, false);

  if (
    resolution.fallbackToDefault ||
    resolution.resolvedVariant === "default"
  ) {
    return `${source}:${name}`;
  }

  // Some sources use different key formats for variants
  switch (source) {
    case "heroicons":
      return `${source}:${resolution.resolvedVariant}:${name}`;
    case "ionicons":
      return `${source}:${resolution.resolvedVariant}:${name}`;
    default:
      return `${source}:${name}`;
  }
}

/**
 * Get variant info for API responses
 */
export function getVariantInfo(source: string): {
  available: IconVariant[];
  default: IconVariant;
  description: string;
} {
  const available = getAvailableVariants(source);

  let defaultVariant: IconVariant = "default";
  if (available.includes("outline")) {
    defaultVariant = "outline";
  } else if (available.includes("solid")) {
    defaultVariant = "solid";
  }

  const descriptions: Record<string, string> = {
    solid: "Filled icons with solid shapes",
    outline: "Stroked icons with outlines only",
    mini: "Smaller, simplified icons at 20x20",
    default: "Standard icon style",
    filled: "Filled variant (same as solid)",
  };

  return {
    available,
    default: defaultVariant,
    description: available
      .map((v) => `${v}: ${descriptions[v] ?? "Custom variant"}`)
      .join("; "),
  };
}

/**
 * Validate variant parameter for request
 */
export function validateVariant(variant: unknown): string | null {
  if (typeof variant !== "string") return null;
  const normalized = normalizeVariant(variant);

  const validVariants: IconVariant[] = [
    "solid",
    "outline",
    "duotone",
    "mini",
    "default",
  ];
  if (!validVariants.includes(normalized as IconVariant)) {
    return null;
  }

  return normalized;
}

/**
 * Document which sources support which variants
 * Returns a summary for API documentation
 */
export function getVariantSupportSummary(): Record<
  string,
  { variants: IconVariant[]; default: IconVariant }
> {
  const summary: Record<
    string,
    { variants: IconVariant[]; default: IconVariant }
  > = {};

  for (const [source, config] of Object.entries(SOURCE_CONFIG)) {
    const info = getVariantInfo(source);
    summary[source] = {
      variants: info.available,
      default: info.default,
    };
  }

  return summary;
}
