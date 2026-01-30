import type { MiniflareOptions } from "miniflare";

/**
 * Miniflare configuration for local development and testing
 * Simulates Cloudflare Workers runtime environment
 */
const config: MiniflareOptions = {
  // Worker script entry point
  scriptPath: "./src/index.ts",

  // Modules format for ES modules support
  modules: true,

  // Compatibility flags
  compatibilityDate: "2024-01-01",
  compatibilityFlags: ["nodejs_compat"],

  // KV Namespaces
  kvNamespaces: {
    SVG_INDEX: "svg-index-local",
  },

  // R2 Buckets
  r2Buckets: {
    SVG_BUCKET: "svg-bucket-local",
  },

  // D1 Databases (for metrics)
  d1Databases: {
    METRICS_DB: "metrics-db-local",
  },

  // Analytics Engine (optional, for local dev)
  analyticsEngineDatasets: {
    ANALYTICS: "analytics-local",
  },

  // Environment variables
  bindings: {
    ENVIRONMENT: "development",
    INDEX_KEY: "index",
    ALLOWED_ORIGINS: "http://localhost:3000,http://localhost:5173",
    RATE_LIMIT_RPS: "100",
    CACHE_TTL_ICONS: "86400",
    CACHE_TTL_SEARCH: "300",
  },

  // Development server settings
  port: 8787,
  host: "0.0.0.0",

  // Live reload for development
  liveReload: true,

  // Source maps
  sourceMap: true,

  // Log level
  logLevel: "info",

  // Cache settings
  cache: true,

  // Global timers (for cron simulation)
  globalTimers: true,
};

export default config;
