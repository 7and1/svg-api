/**
 * API Versioning Service
 *
 * Manages API versions, deprecation, and version headers.
 */

export interface ApiVersion {
  version: string;
  stable: boolean;
  deprecated: boolean;
  sunsetDate?: string;
  introducedDate: string;
  description: string;
}

// API version registry
const API_VERSIONS: Record<string, ApiVersion> = {
  "1.0": {
    version: "1.0",
    stable: true,
    deprecated: false,
    introducedDate: "2024-01-01",
    description: "Initial API release with icon fetching and search",
  },
  "1.1": {
    version: "1.1",
    stable: true,
    deprecated: false,
    introducedDate: "2024-06-01",
    description: "Added batch operations and category filtering",
  },
  "2.0": {
    version: "2.0",
    stable: false,
    deprecated: false,
    introducedDate: "2025-01-01",
    description: "Coming soon: Advanced search and caching improvements",
  },
};

// Current API version
export const CURRENT_API_VERSION = "1.1";
export const LATEST_STABLE_VERSION = "1.1";

// Map path prefixes to versions
const PATH_VERSION_MAP: Record<string, string> = {
  "/v1/": "1.1",
  "/": "1.1",
};

/**
 * Get API version info for a specific version string
 */
export const getApiVersion = (version: string): ApiVersion | undefined => {
  return API_VERSIONS[version];
};

/**
 * Get current API version info
 */
export const getCurrentApiVersion = (): ApiVersion => {
  return API_VERSIONS[CURRENT_API_VERSION];
};

/**
 * Get all API versions
 */
export const getAllApiVersions = (): ApiVersion[] => {
  return Object.values(API_VERSIONS);
};

/**
 * Parse version from request path
 */
export const parseVersionFromPath = (path: string): string => {
  for (const [prefix, version] of Object.entries(PATH_VERSION_MAP)) {
    if (path.startsWith(prefix)) {
      return version;
    }
  }

  // Extract version from /vN/ pattern
  const match = path.match(/^\/v(\d+(?:\.\d+)?)\//);
  if (match) {
    return match[1] + ".0";
  }

  return CURRENT_API_VERSION;
};

/**
 * Generate version headers for a response
 */
export const generateVersionHeaders = (
  requestedVersion: string,
  path: string,
): Record<string, string> => {
  const version = parseVersionFromPath(path);
  const versionInfo = API_VERSIONS[version] ?? getCurrentApiVersion();
  const headers: Record<string, string> = {
    "API-Version": version,
    "X-API-Stable": versionInfo.stable ? "true" : "false",
  };

  // Add deprecation headers if applicable
  if (versionInfo.deprecated) {
    headers["Deprecation"] = `true`;
    if (versionInfo.sunsetDate) {
      headers["Sunset"] = versionInfo.sunsetDate;
    }
    headers["Link"] =
      `</${version === CURRENT_API_VERSION ? "" : "v1/"}>; rel="successor-version"; title="${
        CURRENT_API_VERSION
      }"`;
  }

  // Add latest version header for outdated clients
  if (version !== CURRENT_API_VERSION) {
    headers["X-API-Latest"] = CURRENT_API_VERSION;
  }

  return headers;
};

/**
 * Check if a version is supported
 */
export const isVersionSupported = (version: string): boolean => {
  return version in API_VERSIONS;
};

/**
 * Validate API version from header
 */
export const validateApiVersionHeader = (
  headerValue: string | undefined,
): { valid: boolean; version?: string; error?: string } => {
  if (!headerValue) {
    return { valid: true }; // Version header is optional
  }

  // Remove any 'v' prefix
  const normalized = headerValue.replace(/^v/i, "");

  if (!isVersionSupported(normalized)) {
    return {
      valid: false,
      error: `Unsupported API version: ${headerValue}. Supported versions: ${Object.keys(
        API_VERSIONS,
      ).join(", ")}`,
    };
  }

  return { valid: true, version: normalized };
};
