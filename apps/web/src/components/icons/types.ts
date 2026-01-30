import type { IconRecord } from "@svg-api/shared/types";

export interface IconResult extends IconRecord {
  score: number;
}

export interface SourceInfo {
  name: string;
  count: number;
}

export interface CategoryInfo {
  name: string;
  count: number;
}
