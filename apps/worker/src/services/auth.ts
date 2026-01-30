import type { Context } from "hono";
import type { Env } from "../env";

// ============================================================================
// Types and Interfaces
// ============================================================================

export type ApiTier = "free" | "pro" | "enterprise" | "internal";

export interface ApiKeyMetadata {
  keyId: string;
  tier: ApiTier;
  owner: string;
  createdAt: string;
  expiresAt?: string;
  permissions: Permission[];
  rateLimitMultiplier: number;
  features: Feature[];
}

export type Permission =
  | "read:icons"
  | "read:search"
  | "write:batch"
  | "admin:stats"
  | "admin:keys";

export type Feature =
  | "basic_icons"
  | "all_icons"
  | "batch_requests"
  | "priority_cdn"
  | "custom_formats"
  | "analytics"
  | "webhooks"
  | "dedicated_support";

export interface UsageStats {
  requests: number;
  bandwidth: number;
  lastResetAt: string;
}

export interface AuthResult {
  success: boolean;
  keyId?: string;
  tier?: ApiTier;
  permissions?: Permission[];
  features?: Feature[];
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// Tier Configuration
// ============================================================================

interface TierConfig {
  name: string;
  rateLimitMultiplier: number;
  monthlyQuota: number;
  permissions: Permission[];
  features: Feature[];
  maxBatchSize: number;
  supportLevel: string;
}

export const TIER_CONFIG: Record<ApiTier, TierConfig> = {
  free: {
    name: "Free",
    rateLimitMultiplier: 1,
    monthlyQuota: 10_000,
    permissions: ["read:icons", "read:search"],
    features: ["basic_icons"],
    maxBatchSize: 10,
    supportLevel: "community",
  },
  pro: {
    name: "Pro",
    rateLimitMultiplier: 10,
    monthlyQuota: 100_000,
    permissions: ["read:icons", "read:search", "write:batch"],
    features: ["all_icons", "batch_requests", "priority_cdn", "analytics"],
    maxBatchSize: 50,
    supportLevel: "email",
  },
  enterprise: {
    name: "Enterprise",
    rateLimitMultiplier: 100,
    monthlyQuota: 1_000_000,
    permissions: ["read:icons", "read:search", "write:batch", "admin:stats"],
    features: [
      "all_icons",
      "batch_requests",
      "priority_cdn",
      "custom_formats",
      "analytics",
      "webhooks",
      "dedicated_support",
    ],
    maxBatchSize: 100,
    supportLevel: "dedicated",
  },
  internal: {
    name: "Internal",
    rateLimitMultiplier: 1000,
    monthlyQuota: Number.POSITIVE_INFINITY,
    permissions: ["read:icons", "read:search", "write:batch", "admin:stats", "admin:keys"],
    features: [
      "all_icons",
      "batch_requests",
      "priority_cdn",
      "custom_formats",
      "analytics",
      "webhooks",
      "dedicated_support",
    ],
    maxBatchSize: 500,
    supportLevel: "internal",
  },
};

// ============================================================================
// API Key Service
// ============================================================================

export class ApiKeyService {
  private env: Env;
  private kvPrefix = "apikey:";
  private usagePrefix = "usage:";

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Extract API key from request
   */
  static extractKey(c: Context<{ Bindings: Env }>): string | null {
    // Check Authorization header (Bearer token)
    const authHeader = c.req.header("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      return authHeader.slice(7).trim();
    }

    // Check X-API-Key header
    const apiKeyHeader = c.req.header("X-API-Key");
    if (apiKeyHeader) {
      return apiKeyHeader.trim();
    }

    // Check query parameter (only for GET requests)
    if (c.req.method === "GET") {
      const queryKey = c.req.query("api_key");
      if (queryKey) {
        return queryKey.trim();
      }
    }

    return null;
  }

  /**
   * Parse API key to extract metadata
   * Format: sk_{tier}_{hash}
   */
  static parseKey(key: string): {
    valid: boolean;
    tier?: ApiTier;
    keyId?: string;
  } {
    // Validate format
    const keyRegex = /^sk_(free|pro|ent|internal)_[a-zA-Z0-9]{32,64}$/;
    if (!keyRegex.test(key)) {
      return { valid: false };
    }

    // Extract tier
    const parts = key.split("_");
    if (parts.length < 3) {
      return { valid: false };
    }

    const tierCode = parts[1];
    const tierMap: Record<string, ApiTier> = {
      free: "free",
      pro: "pro",
      ent: "enterprise",
      internal: "internal",
    };

    const tier = tierMap[tierCode];
    if (!tier) {
      return { valid: false };
    }

    // Generate key ID from hash (first 16 chars of key)
    const keyId = key.slice(-16);

    return { valid: true, tier, keyId };
  }

  /**
   * Validate API key and return authentication result
   */
  async validateKey(key: string): Promise<AuthResult> {
    // Parse key format
    const parsed = ApiKeyService.parseKey(key);
    if (!parsed.valid || !parsed.tier || !parsed.keyId) {
      return {
        success: false,
        error: { code: "INVALID_KEY_FORMAT", message: "Invalid API key format" },
      };
    }

    // Check if key is revoked (in KV)
    const keyData = await this.getKeyMetadata(parsed.keyId);
    if (keyData && keyData.revoked) {
      return {
        success: false,
        error: { code: "KEY_REVOKED", message: "API key has been revoked" },
      };
    }

    // Check expiration
    if (keyData?.expiresAt) {
      const expiresAt = new Date(keyData.expiresAt);
      if (expiresAt < new Date()) {
        return {
          success: false,
          error: { code: "KEY_EXPIRED", message: "API key has expired" },
        };
      }
    }

    // Validate against internal key
    if (parsed.tier === "internal") {
      const isValidInternal = await this.validateInternalKey(key);
      if (!isValidInternal) {
        return {
          success: false,
          error: { code: "INVALID_KEY", message: "Invalid internal API key" },
        };
      }
    }

    const config = TIER_CONFIG[parsed.tier];

    return {
      success: true,
      keyId: parsed.keyId,
      tier: parsed.tier,
      permissions: keyData?.permissions || config.permissions,
      features: keyData?.features || config.features,
    };
  }

  /**
   * Check if key has required permission
   */
  hasPermission(authResult: AuthResult, permission: Permission): boolean {
    if (!authResult.success || !authResult.permissions) {
      return false;
    }
    return authResult.permissions.includes(permission);
  }

  /**
   * Check if key has required feature
   */
  hasFeature(authResult: AuthResult, feature: Feature): boolean {
    if (!authResult.success || !authResult.features) {
      return false;
    }
    return authResult.features.includes(feature);
  }

  /**
   * Get tier configuration
   */
  getTierConfig(tier: ApiTier): TierConfig {
    return TIER_CONFIG[tier];
  }

  /**
   * Record API usage for a key
   */
  async recordUsage(keyId: string, bytes: number): Promise<void> {
    const now = new Date();
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const usageKey = `${this.usagePrefix}${keyId}:${monthKey}`;

    // Get current usage
    const current = await this.env.SVG_INDEX.get(usageKey);
    let stats: UsageStats;

    if (current) {
      stats = JSON.parse(current);
    } else {
      stats = {
        requests: 0,
        bandwidth: 0,
        lastResetAt: new Date(now.getUTCFullYear(), now.getUTCMonth(), 1).toISOString(),
      };
    }

    // Update stats
    stats.requests++;
    stats.bandwidth += bytes;

    // Store updated stats (expire after 90 days)
    await this.env.SVG_INDEX.put(usageKey, JSON.stringify(stats), {
      expirationTtl: 90 * 24 * 60 * 60,
    });

    // Also log to analytics if available
    if (this.env.ANALYTICS) {
      this.env.ANALYTICS.writeDataPoint({
        blobs: [keyId, monthKey],
        doubles: [1, bytes],
        indexes: [keyId],
      });
    }
  }

  /**
   * Get usage statistics for a key
   */
  async getUsageStats(keyId: string): Promise<UsageStats | null> {
    const now = new Date();
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const usageKey = `${this.usagePrefix}${keyId}:${monthKey}`;

    const data = await this.env.SVG_INDEX.get(usageKey);
    if (!data) {
      return null;
    }

    return JSON.parse(data);
  }

  /**
   * Check if key has exceeded monthly quota
   */
  async checkQuota(keyId: string, tier: ApiTier): Promise<{
    allowed: boolean;
    remaining: number;
    limit: number;
    usage: number;
  }> {
    const config = TIER_CONFIG[tier];
    const stats = await this.getUsageStats(keyId);

    const usage = stats?.requests || 0;
    const limit = config.monthlyQuota;
    const remaining = Math.max(0, limit - usage);

    return {
      allowed: tier === "internal" || usage < limit,
      remaining,
      limit,
      usage,
    };
  }

  /**
   * Get key metadata from KV
   */
  private async getKeyMetadata(keyId: string): Promise<{
    revoked?: boolean;
    expiresAt?: string;
    permissions?: Permission[];
    features?: Feature[];
    owner?: string;
  } | null> {
    const data = await this.env.SVG_INDEX.get(`${this.kvPrefix}${keyId}`);
    if (!data) {
      return null;
    }
    return JSON.parse(data);
  }

  /**
   * Validate internal/master key
   */
  private async validateInternalKey(key: string): Promise<boolean> {
    // Compare against configured internal key
    const internalKey = this.env.INTERNAL_API_KEY;
    if (!internalKey) {
      return false;
    }

    // Constant-time comparison
    if (key.length !== internalKey.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < key.length; i++) {
      result |= key.charCodeAt(i) ^ internalKey.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Create a new API key (admin only)
   */
  async createKey(options: {
    tier: ApiTier;
    owner: string;
    expiresInDays?: number;
    customPermissions?: Permission[];
    customFeatures?: Feature[];
  }): Promise<{ key: string; keyId: string }> {
    const { tier, owner, expiresInDays, customPermissions, customFeatures } = options;

    // Generate random key
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    const randomHex = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    const tierCode = tier === "enterprise" ? "ent" : tier;
    const key = `sk_${tierCode}_${randomHex}`;
    const keyId = key.slice(-16);

    // Store metadata
    const metadata: {
      tier: ApiTier;
      owner: string;
      createdAt: string;
      expiresAt?: string;
      permissions?: Permission[];
      features?: Feature[];
    } = {
      tier,
      owner,
      createdAt: new Date().toISOString(),
    };

    if (expiresInDays) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
      metadata.expiresAt = expiresAt.toISOString();
    }

    if (customPermissions) {
      metadata.permissions = customPermissions;
    }

    if (customFeatures) {
      metadata.features = customFeatures;
    }

    await this.env.SVG_INDEX.put(
      `${this.kvPrefix}${keyId}`,
      JSON.stringify(metadata),
      expiresInDays ? { expirationTtl: expiresInDays * 24 * 60 * 60 } : undefined
    );

    return { key, keyId };
  }

  /**
   * Revoke an API key
   */
  async revokeKey(keyId: string): Promise<boolean> {
    const keyData = await this.getKeyMetadata(keyId);
    if (!keyData) {
      return false;
    }

    await this.env.SVG_INDEX.put(
      `${this.kvPrefix}${keyId}`,
      JSON.stringify({ ...keyData, revoked: true })
    );

    return true;
  }
}

// ============================================================================
// Middleware Factory
// ============================================================================

/**
 * Create authentication middleware
 */
export function requireAuth(options: {
  permissions?: Permission[];
  features?: Feature[];
  optional?: boolean;
} = {}) {
  const { permissions = [], features = [], optional = false } = options;

  return async (c: Context<{ Bindings: Env }>, next: () => Promise<void>) => {
    const key = ApiKeyService.extractKey(c);

    if (!key) {
      if (optional) {
        c.set("auth", { success: false, tier: "free" } as AuthResult);
        await next();
        return;
      }

      return c.json(
        {
          error: {
            code: "MISSING_API_KEY",
            message: "API key is required. Provide it via Authorization header or X-API-Key header.",
          },
        },
        401
      );
    }

    const authService = new ApiKeyService(c.env);
    const result = await authService.validateKey(key);

    if (!result.success) {
      return c.json(
        {
          error: {
            code: result.error?.code || "INVALID_KEY",
            message: result.error?.message || "Invalid API key",
          },
        },
        401
      );
    }

    // Check permissions
    for (const permission of permissions) {
      if (!authService.hasPermission(result, permission)) {
        return c.json(
          {
            error: {
              code: "INSUFFICIENT_PERMISSIONS",
              message: `This endpoint requires '${permission}' permission. Upgrade your plan to access this feature.`,
            },
          },
          403
        );
      }
    }

    // Check features
    for (const feature of features) {
      if (!authService.hasFeature(result, feature)) {
        return c.json(
          {
            error: {
              code: "FEATURE_NOT_AVAILABLE",
              message: `This endpoint requires '${feature}' feature. Upgrade your plan to access this feature.`,
            },
          },
          403
        );
      }
    }

    // Check quota
    if (result.keyId && result.tier) {
      const quotaCheck = await authService.checkQuota(result.keyId, result.tier);
      if (!quotaCheck.allowed) {
        return c.json(
          {
            error: {
              code: "QUOTA_EXCEEDED",
              message: "Monthly API quota exceeded. Please upgrade your plan or wait until next billing cycle.",
              details: {
                usage: quotaCheck.usage,
                limit: quotaCheck.limit,
                resetDate: new Date(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1).toISOString(),
              },
            },
          },
          429
        );
      }

      // Store quota info
      c.set("quota", quotaCheck);
    }

    // Store auth result
    c.set("auth", result);
    c.set("apiKeyService", authService);

    await next();
  };
}

/**
 * Create tier-aware rate limit configuration
 */
export function getRateLimitForTier(tier: ApiTier): {
  requestsPerMinute: number;
  burst: number;
  batchSize: number;
} {
  const config = TIER_CONFIG[tier];
  return {
    requestsPerMinute: 60 * config.rateLimitMultiplier,
    burst: 10 * config.rateLimitMultiplier,
    batchSize: config.maxBatchSize,
  };
}
