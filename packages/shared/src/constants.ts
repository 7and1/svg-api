export const DEFAULT_ICON_SIZE = 24;
export const MIN_ICON_SIZE = 8;
export const MAX_ICON_SIZE = 512;
export const DEFAULT_STROKE_WIDTH = 2;
export const MIN_STROKE_WIDTH = 0.5;
export const MAX_STROKE_WIDTH = 3;

export const SUPPORTED_FORMATS = ["svg"] as const;

export const DEFAULT_CACHE_TTL_ICON = 60 * 60 * 24 * 365; // 1 year
export const DEFAULT_CACHE_TTL_SEARCH = 60 * 5; // 5 minutes

export const DEFAULT_INDEX_KEY = "index:v1";
export const INVERTED_INDEX_KEY = "inverted-index:v1";
export const SYNONYMS_KEY = "synonyms:v1";

// Search index sharding config
export const INDEX_SHARD_SIZE = 5000; // terms per shard
export const MAX_PREFIX_LENGTH = 4; // max prefix length for prefix index

// Bulk operations
export const MAX_BATCH_SIZE = 50;
export const MAX_BULK_SIZE = 100;
export const MAX_ZIP_SIZE = 25 * 1024 * 1024; // 25MB
export const BULK_RATE_LIMIT_MULTIPLIER = 10;
export const BULK_FORMATS = ["zip", "svg-bundle", "json-sprite"] as const;
