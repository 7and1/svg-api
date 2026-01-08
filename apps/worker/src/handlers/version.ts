/**
 * Version endpoint handler
 *
 * Returns API version information.
 */

import type { Context } from "hono";
import type { Env } from "../env";
import { jsonResponse } from "../utils/response";
import {
  getCurrentApiVersion,
  getAllApiVersions,
  CURRENT_API_VERSION,
  LATEST_STABLE_VERSION,
} from "../services/version";

export interface VersionResponse {
  version: string;
  stable_version: string;
  latest_version: string;
  environment: string;
  versions: Array<{
    version: string;
    stable: boolean;
    deprecated: boolean;
    sunset_date?: string;
    introduced_date: string;
    description: string;
  }>;
  documentation_url: string;
}

export const versionHandler = async (c: Context<{ Bindings: Env }>) => {
  const currentVersion = getCurrentApiVersion();
  const allVersions = getAllApiVersions();

  const response: VersionResponse = {
    version: CURRENT_API_VERSION,
    stable_version: LATEST_STABLE_VERSION,
    latest_version: CURRENT_API_VERSION,
    environment: c.env.ENVIRONMENT || "unknown",
    versions: allVersions.map((v) => ({
      version: v.version,
      stable: v.stable,
      deprecated: v.deprecated,
      sunset_date: v.sunsetDate,
      introduced_date: v.introducedDate,
      description: v.description,
    })),
    documentation_url: "https://svg-api.example.com/docs",
  };

  return jsonResponse(c, response);
};

/**
 * Check handler for deprecated version warnings
 */
export const deprecatedHandler = async (c: Context<{ Bindings: Env }>) => {
  return jsonResponse(c, {
    message:
      "This API version is deprecated. Please update to the latest version.",
    latest_version: CURRENT_API_VERSION,
    migration_guide: "https://svg-api.example.com/docs/migration",
  });
};
