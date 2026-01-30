import { IconResult, SourceInfo, CategoryInfo } from "./types";
import { API_BASE } from "../../lib/constants";

export const fetchIcons = async (
  query: string,
  sources: string[],
  categories: string[],
  tags: string[],
  sortBy: string,
  signal: AbortSignal
): Promise<IconResult[]> => {
  const params = new URLSearchParams({ limit: "500" });
  if (query) params.set("q", query);
  sources.forEach((s) => params.append("source", s));
  categories.forEach((c) => params.append("category", c));
  tags.forEach((t) => params.append("tag", t));
  if (sortBy !== "popularity") params.set("sort", sortBy);

  try {
    const response = await fetch(`${API_BASE}/search?${params}`, { signal });
    if (!response.ok) return [];
    const data = await response.json();
    return (data.data as IconResult[]) ?? [];
  } catch {
    return [];
  }
};

export const fetchSources = async (): Promise<SourceInfo[]> => {
  try {
    const response = await fetch(`${API_BASE}/sources`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.data ?? [];
  } catch {
    return [];
  }
};

export const fetchCategories = async (): Promise<CategoryInfo[]> => {
  try {
    const response = await fetch(`${API_BASE}/categories`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.data ?? [];
  } catch {
    return [];
  }
};

export const fetchIconDetails = async (
  name: string,
  source: string
): Promise<IconResult | null> => {
  try {
    const response = await fetch(
      `${API_BASE}/icons/${name}?source=${source}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.data ?? null;
  } catch {
    return null;
  }
};
