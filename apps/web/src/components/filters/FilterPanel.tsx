"use client";

import { useIconBrowserStore } from "../../stores/icon-browser";
import { SourceFilter } from "./SourceFilter";
import { CategoryFilter } from "./CategoryFilter";
import { TagFilter } from "./TagFilter";
import { SortOptions } from "./SortOptions";
import { ViewToggle } from "./ViewToggle";
import clsx from "clsx";

const XIcon = () => (
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
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

const SlidersIcon = () => (
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
      d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
    />
  </svg>
);

interface FilterPanelProps {
  sources: { name: string; count: number }[];
  categories: { name: string; count: number }[];
  availableTags: string[];
  resultCount: number;
  isOpen: boolean;
  onToggle: () => void;
}

export const FilterPanel = ({
  sources,
  categories,
  availableTags,
  resultCount,
  isOpen,
  onToggle,
}: FilterPanelProps) => {
  const {
    sources: selectedSources,
    categories: selectedCategories,
    tags: selectedTags,
    resetFilters,
  } = useIconBrowserStore();

  const hasActiveFilters =
    selectedSources.length > 0 ||
    selectedCategories.length > 0 ||
    selectedTags.length > 0;

  const activeFilterCount =
    selectedSources.length + selectedCategories.length + selectedTags.length;

  return (
    <>
      {/* Mobile Filter Toggle */}
      <div className="mb-4 flex items-center justify-between lg:hidden">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 rounded-full border border-black/20 bg-white/80 px-4 py-2 text-sm font-medium transition hover:border-black/40 dark:border-white/20 dark:bg-ink/80"
          aria-expanded={isOpen}
          aria-label="Toggle filters"
        >
          <SlidersIcon />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal text-[10px] font-semibold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 text-sm text-slate transition hover:text-ink"
          >
            <XIcon />
            Clear all
          </button>
        )}
      </div>

      <div
        className={clsx(
          "transition-all duration-300",
          "lg:static lg:block lg:w-64 lg:flex-shrink-0",
          isOpen ? "mb-6 block" : "hidden lg:block",
        )}
      >
        <aside className="rounded-2xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-surface">
          {/* Header - Desktop */}
          <div className="hidden items-center justify-between lg:flex">
            <h2 className="font-display text-sm font-semibold">Filters</h2>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-xs text-slate transition hover:text-ink"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="mt-4 flex flex-wrap gap-2 lg:mt-0">
              {selectedSources.map((source) => (
                <span
                  key={`source-${source}`}
                  className="flex items-center gap-1 rounded-full bg-teal/10 px-2.5 py-1 text-xs font-medium text-teal"
                >
                  {source}
                  <button
                    onClick={() =>
                      useIconBrowserStore.getState().toggleSource(source)
                    }
                    className="hover:text-teal/80"
                    aria-label={`Remove ${source} filter`}
                  >
                    <XIcon />
                  </button>
                </span>
              ))}
              {selectedCategories.map((category) => (
                <span
                  key={`category-${category}`}
                  className="flex items-center gap-1 rounded-full bg-amber/10 px-2.5 py-1 text-xs font-medium text-amber"
                >
                  {category}
                  <button
                    onClick={() =>
                      useIconBrowserStore.getState().toggleCategory(category)
                    }
                    className="hover:text-amber/80"
                    aria-label={`Remove ${category} filter`}
                  >
                    <XIcon />
                  </button>
                </span>
              ))}
              {selectedTags.slice(0, 3).map((tag) => (
                <span
                  key={`tag-${tag}`}
                  className="flex items-center gap-1 rounded-full border border-black/10 px-2.5 py-1 text-xs text-slate dark:border-white/10"
                >
                  {tag}
                  <button
                    onClick={() =>
                      useIconBrowserStore.getState().toggleTag(tag)
                    }
                    className="hover:text-ink"
                    aria-label={`Remove ${tag} filter`}
                  >
                    <XIcon />
                  </button>
                </span>
              ))}
              {selectedTags.length > 3 && (
                <span className="rounded-full border border-black/10 px-2.5 py-1 text-xs text-slate dark:border-white/10">
                  +{selectedTags.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Filter Sections */}
          <div className="mt-6 space-y-6">
            <SourceFilter sources={sources} />
            <CategoryFilter categories={categories} />
            <TagFilter tags={availableTags} />
          </div>

          {/* Results Count - Desktop */}
          <div className="mt-6 hidden lg:block">
            <p className="text-xs text-slate">
              <span className="font-medium text-ink">{resultCount}</span> icons
              found
            </p>
          </div>
        </aside>
      </div>
    </>
  );
};
