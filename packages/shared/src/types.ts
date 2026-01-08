export type IconVariant =
  | "default"
  | "outline"
  | "solid"
  | "duotone"
  | "mini"
  | string;

export interface IconLicense {
  type: string;
  url: string;
}

export interface IconRecord {
  id: string;
  name: string;
  source: string;
  path: string;
  tags: string[];
  category: string;
  width: number;
  height: number;
  viewBox: string;
  variants?: IconVariant[];
}

export interface IndexStats {
  totalIcons: number;
  sources: string[];
  lastUpdated: string;
}

export interface IconIndex {
  version: string;
  generated: string;
  stats: IndexStats;
  icons: Record<string, IconRecord>;
}

export interface SourceMeta {
  id: string;
  name: string;
  description: string;
  version: string;
  iconCount: number;
  website: string;
  repository: string;
  license: IconLicense;
  variants: IconVariant[];
  defaultVariant: IconVariant;
  categories: string[];
}

export interface CategoryMeta {
  id: string;
  name: string;
  description: string;
  iconCount: number;
  sources: string[];
}

export interface SearchResult {
  id: string;
  name: string;
  source: string;
  category: string;
  tags: string[];
  score: number;
}

// Inverted Index types for optimized search
export interface InvertedIndexEntry {
  iconIds: string[];
  // Precomputed frequency for TF-IDF scoring
  df: number;
}

export interface InvertedIndex {
  version: string;
  generated: string;
  totalDocs: number;
  // term -> { iconIds, df }
  terms: Record<string, InvertedIndexEntry>;
  // category -> iconIds
  categories: Record<string, string[]>;
  // source -> iconIds
  sources: Record<string, string[]>;
  // Precomputed prefix index for fast prefix matching
  prefixes: Record<string, string[]>;
}

export interface SearchIndexShard {
  shardId: number;
  totalShards: number;
  terms: Record<string, InvertedIndexEntry>;
}

export type SynonymMap = Record<string, string[]>;
