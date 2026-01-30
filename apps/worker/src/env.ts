export interface Env {
  SVG_INDEX: KVNamespace;
  SVG_BUCKET: R2Bucket;
  // Analytics Engine for metrics collection
  ANALYTICS?: AnalyticsEngineDataset;
  // D1 Database for aggregated metrics
  METRICS_DB?: D1Database;
  // Rate limiter Durable Object
  RATE_LIMITER: DurableObjectNamespace;
  // Sentry DSN for error tracking
  SENTRY_DSN?: string;
  ENVIRONMENT: string;
  INDEX_KEY?: string;
  ALLOWED_ORIGINS?: string;
  LOCAL_INDEX_JSON?: string;
  LOCAL_ICONS_BASE_URL?: string;
  LOCAL_INVERTED_INDEX_JSON?: string;
  LOCAL_SYNONYMS_JSON?: string;
  // Performance tuning
  RATE_LIMIT_RPS?: string;
  CACHE_TTL_ICONS?: string;
  CACHE_TTL_SEARCH?: string;
  // API key for protected endpoints
  API_KEY?: string;
  // Internal/master API key
  INTERNAL_API_KEY?: string;
  // Secret for request signature verification
  API_SECRET?: string;
  WEBHOOK_SECRET?: string;
  // External logging endpoint
  LOG_ENDPOINT?: string;
  LOG_API_KEY?: string;
}
