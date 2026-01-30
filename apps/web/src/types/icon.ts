import type { IconRecord } from "@svg-api/shared/types";

export interface Icon extends IconRecord {}

export interface IconResult extends IconRecord {
  score: number;
}

export interface SearchFilters {
  sources: string[];
  categories: string[];
  variant?: string;
}
