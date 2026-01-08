"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useTheme } from "next-themes";
import clsx from "clsx";
import { API_BASE } from "../../lib/constants";
import { useIconBrowserStore } from "../../stores/icon-browser";
import { IconDetailModal } from "./IconDetailModal";
import { FilterPanel, SortOptions, ViewToggle } from "../filters";

interface IconResult {
  name: string;
  source: string;
  category: string;
  tags: string[];
  score: number;
}

interface SourceInfo {
  name: string;
  count: number;
}

interface CategoryInfo {
  name: string;
  count: number;
}

const fetchIcons = async (
  query: string,
  sources: string[],
  categories: string[],
  tags: string[],
  sortBy: string,
  signal: AbortSignal,
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

const fetchSources = async (): Promise<SourceInfo[]> => {
  try {
    const response = await fetch(`${API_BASE}/sources`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.data ?? [];
  } catch {
    return [];
  }
};

const fetchCategories = async (): Promise<CategoryInfo[]> => {
  try {
    const response = await fetch(`${API_BASE}/categories`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.data ?? [];
  } catch {
    return [];
  }
};

const useColumns = () => {
  const [columns, setColumns] = useState(4);

  useEffect(() => {
    const update = () => {
      const width = window.innerWidth;
      if (width < 640) setColumns(2);
      else if (width < 1024) setColumns(4);
      else setColumns(6);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return columns;
};

const CopyIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
    />
  </svg>
);

const CheckIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const getIconColor = (theme: string | undefined): string => {
  if (theme === "dark") return "%23f7f2e9";
  return "%230b1020";
};

const IconCard = ({
  icon,
  onCopyUrl,
  onClick,
  theme,
}: {
  icon: IconResult;
  onCopyUrl: (icon: IconResult) => void;
  onClick: (icon: IconResult) => void;
  theme: string | undefined;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopyUrl(icon);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const iconColor = getIconColor(theme);

  return (
    <div
      onClick={() => onClick(icon)}
      className={clsx(
        "group relative cursor-pointer rounded-2xl border p-4 text-center",
        "transition hover:border-teal hover:shadow-glow dark:hover:shadow-glow-dark",
        "border-black/10 bg-sand/60 dark:border-white/10 dark:bg-white/5",
      )}
    >
      <button
        onClick={handleCopy}
        className={clsx(
          "absolute right-2 top-2 rounded-lg p-1.5 transition",
          copied
            ? "bg-teal text-white"
            : "bg-white/80 text-slate opacity-0 hover:bg-white hover:text-ink dark:bg-ink/80 dark:text-slate/70 dark:hover:bg-ink dark:hover:text-sand group-hover:opacity-100",
        )}
        title="Copy icon URL"
        aria-label={`Copy ${icon.name} URL`}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
      <img
        src={`${API_BASE}/icons/${icon.name}?source=${icon.source}&size=48&color=${iconColor}`}
        alt={`${icon.name} icon`}
        className="mx-auto h-12 w-12"
        loading="lazy"
      />
      <p className="mt-3 truncate text-xs font-semibold text-ink dark:text-sand">
        {icon.name}
      </p>
      <p className="text-[10px] uppercase tracking-[0.2em] text-slate">
        {icon.source}
      </p>
    </div>
  );
};

const IconListItem = ({
  icon,
  onClick,
  theme,
}: {
  icon: IconResult;
  onClick: (icon: IconResult) => void;
  theme: string | undefined;
}) => {
  const iconColor = getIconColor(theme);

  return (
    <div
      onClick={() => onClick(icon)}
      className={clsx(
        "flex cursor-pointer items-center gap-4 rounded-xl border p-3 transition",
        "hover:border-teal hover:bg-black/5 dark:hover:border-teal dark:hover:bg-white/5",
        "border-black/10 bg-white/80 dark:border-white/10 dark:bg-white/5",
      )}
    >
      <img
        src={`${API_BASE}/icons/${icon.name}?source=${icon.source}&size=32&color=${iconColor}`}
        alt={`${icon.name} icon`}
        className="h-8 w-8 shrink-0"
        loading="lazy"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink dark:text-sand">
          {icon.name}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-slate">
            {icon.source}
          </span>
          <span className="text-slate/50">•</span>
          <span className="text-xs capitalize text-slate">{icon.category}</span>
        </div>
      </div>
    </div>
  );
};

export const IconBrowser = () => {
  const { theme } = useTheme();
  const {
    query,
    sources: selectedSources,
    categories: selectedCategories,
    tags: selectedTags,
    sortBy,
    viewMode,
    setQuery,
    syncFromUrl,
  } = useIconBrowserStore();

  const [results, setResults] = useState<IconResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedIcon, setSelectedIcon] = useState<IconResult | null>(null);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const columns = useColumns();

  // Sync from URL on mount
  useEffect(() => {
    syncFromUrl();
  }, [syncFromUrl]);

  useEffect(() => {
    fetchSources().then(setSources);
    fetchCategories().then(setCategories);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchIcons(
      query,
      selectedSources,
      selectedCategories,
      selectedTags,
      sortBy,
      controller.signal,
    )
      .then((data) => {
        setResults(data);
        // Extract unique tags from results
        const tags = new Set<string>();
        data.forEach((item) => item.tags?.forEach((tag) => tags.add(tag)));
        setAvailableTags(Array.from(tags).sort());
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [query, selectedSources, selectedCategories, selectedTags, sortBy]);

  const handleCopyUrl = useCallback((icon: IconResult) => {
    const url = `${API_BASE}/icons/${icon.name}?source=${icon.source}`;
    navigator.clipboard.writeText(url);
  }, []);

  const parentRef = useRef<HTMLDivElement>(null);
  const rowCount = Math.ceil(results.length / columns);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (viewMode === "list" ? 60 : 140),
    overscan: 5,
  });

  const rows = rowVirtualizer.getVirtualItems();

  const gridTemplate = useMemo(
    () => `repeat(${columns}, minmax(0, 1fr))`,
    [columns],
  );

  return (
    <div className="mt-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink dark:text-sand">
            Icon Browser
          </h1>
          <p className="mt-2 text-sm text-slate">
            Search and preview icons instantly across all sources.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-full lg:w-64">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search icons..."
              className="w-full rounded-full border border-black/20 bg-white/80 px-4 py-2 text-sm focus:border-teal focus:outline-none dark:border-white/20 dark:bg-ink/50 dark:text-sand"
            />
          </div>
          <SortOptions />
          <ViewToggle />
        </div>
      </div>

      {/* Main Content */}
      <div className="mt-6 flex gap-6">
        <FilterPanel
          sources={sources}
          categories={categories}
          availableTags={availableTags}
          resultCount={results.length}
          isOpen={filterPanelOpen}
          onToggle={() => setFilterPanelOpen(!filterPanelOpen)}
        />

        {/* Results */}
        <div className="min-w-0 flex-1">
          <div className="rounded-3xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate">
              <span>{results.length} results</span>
              <span>{loading ? "Searching..." : "Ready"}</span>
            </div>

            {results.length === 0 && !loading && (
              <div className="py-16 text-center">
                <svg
                  className="mx-auto h-16 w-16 text-slate/30"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-ink dark:text-sand">
                  No icons found
                </h3>
                <p className="mt-2 text-sm text-slate">
                  Try adjusting your search or filters
                </p>
              </div>
            )}

            {results.length > 0 && (
              <div
                ref={parentRef}
                className="relative mt-4 h-[600px] overflow-auto"
              >
                <div
                  style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    position: "relative",
                  }}
                >
                  {rows.map((row) => {
                    if (viewMode === "list") {
                      const icon = results[row.index];
                      if (!icon) return null;
                      return (
                        <div
                          key={row.key}
                          className="absolute left-0 right-0"
                          style={{ transform: `translateY(${row.start}px)` }}
                        >
                          <IconListItem
                            icon={icon}
                            onClick={setSelectedIcon}
                            theme={theme}
                          />
                        </div>
                      );
                    }

                    const startIndex = row.index * columns;
                    const rowItems = results.slice(
                      startIndex,
                      startIndex + columns,
                    );
                    return (
                      <div
                        key={row.key}
                        className="absolute left-0 right-0 grid gap-4"
                        style={{
                          transform: `translateY(${row.start}px)`,
                          gridTemplateColumns: gridTemplate,
                        }}
                      >
                        {rowItems.map((icon) => (
                          <IconCard
                            key={`${icon.source}-${icon.name}`}
                            icon={icon}
                            onCopyUrl={handleCopyUrl}
                            onClick={setSelectedIcon}
                            theme={theme}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedIcon && (
        <IconDetailModal
          icon={selectedIcon}
          onClose={() => setSelectedIcon(null)}
        />
      )}
    </div>
  );
};
