"use client";

import {
  useCallback,
  useEffect,
  useState,
  useDeferredValue,
} from "react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { useIconBrowserStore } from "../../stores/icon-browser";
import { IconDetailModal } from "./IconDetailModal";
import { BatchActions } from "./BatchActions";
import { SortOptions, ViewToggle } from "../filters";
import { FilterPanel } from "../filters/FilterPanel";
import { SearchBar } from "./SearchBar";
import { IconGrid } from "./IconGrid";
import { useColumns } from "./useColumns";
import { useKeyboardShortcut } from "./useKeyboardShortcut";
import { fetchIcons, fetchSources, fetchCategories } from "./api";
import { IconResult, SourceInfo, CategoryInfo } from "./types";
import { API_BASE } from "../../lib/constants";
import { useRef } from "react";
import clsx from "clsx";

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
    selectedIcons,
    toggleIconSelection,
    selectAll,
    clearSelection,
  } = useIconBrowserStore();

  const [results, setResults] = useState<IconResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedIcon, setSelectedIcon] = useState<IconResult | null>(null);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [previewResults, setPreviewResults] = useState<IconResult[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);

  const columns = useColumns();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Use deferred value for non-urgent updates (INP optimization)
  const deferredQuery = useDeferredValue(query);

  // Sync from URL on mount
  useEffect(() => {
    syncFromUrl();
  }, [syncFromUrl]);

  // Load sources and categories
  useEffect(() => {
    fetchSources().then(setSources);
    fetchCategories().then(setCategories);
  }, []);

  // Debounced search effect
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    // Use requestIdleCallback for non-critical updates (INP optimization)
    const scheduleSearch = () => {
      fetchIcons(
        deferredQuery,
        selectedSources,
        selectedCategories,
        selectedTags,
        sortBy,
        controller.signal
      )
        .then((data) => {
          setResults(data);
          // Extract unique tags from results
          const tags = new Set<string>();
          data.forEach((item) => item.tags?.forEach((tag) => tags.add(tag)));
          setAvailableTags(Array.from(tags).sort());
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            setError(err);
          }
        })
        .finally(() => setLoading(false));
    };

    // Debounce search by 150ms for better INP
    const timeoutId = setTimeout(scheduleSearch, 150);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [deferredQuery, selectedSources, selectedCategories, selectedTags, sortBy]);

  // Instant preview for search input
  useEffect(() => {
    if (query.length < 2) {
      setPreviewResults([]);
      return;
    }

    setPreviewLoading(true);
    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      fetchIcons(query, selectedSources, [], [], "popularity", controller.signal)
        .then((data) => {
          setPreviewResults(data.slice(0, 5));
        })
        .finally(() => setPreviewLoading(false));
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query, selectedSources]);

  // Keyboard shortcut for search
  useKeyboardShortcut("/", searchInputRef);

  const handleCopyUrl = useCallback((icon: IconResult) => {
    const url = `${API_BASE}/icons/${icon.name}?source=${icon.source}`;
    navigator.clipboard.writeText(url);
  }, []);

  const handleSearchSubmit = (value: string) => {
    setQuery(value);
    setShowSearchHistory(false);
  };

  const handleRetry = () => {
    setError(null);
    setQuery(query); // Trigger re-fetch
  };

  const handleClearFilters = () => {
    setQuery("");
    // Reset other filters via store
  };

  const handleToggleSelection = useCallback((iconId: string) => {
    toggleIconSelection(iconId);
  }, [toggleIconSelection]);

  const handleSelectAll = useCallback(() => {
    const allIconIds = results.map((icon) => `${icon.source}:${icon.name}`);
    const allSelected = selectedIcons.size === allIconIds.length && allIconIds.length > 0;
    if (allSelected) {
      clearSelection();
    } else {
      selectAll(allIconIds);
    }
  }, [results, selectedIcons.size, selectAll, clearSelection]);

  const handleClearSelection = useCallback(() => {
    clearSelection();
    setSelectionMode(false);
  }, [clearSelection]);

  const handleSelectIcon = useCallback((icon: IconResult) => {
    setSelectedIcon(icon);
  }, []);

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => !prev);
    if (selectionMode) {
      clearSelection();
    }
  }, [selectionMode, clearSelection]);

  return (
    <div className="mt-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
      >
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink dark:text-sand">
            Icon Browser
          </h1>
          <p className="mt-2 text-sm text-slate">
            Search and preview icons instantly across all sources.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar
            query={query}
            onQueryChange={setQuery}
            onSearchSubmit={handleSearchSubmit}
            showSearchHistory={showSearchHistory}
            onShowSearchHistoryChange={setShowSearchHistory}
            previewResults={previewResults}
            previewLoading={previewLoading}
            onSelectIcon={handleSelectIcon}
            inputRef={searchInputRef}
          />
          <SortOptions />
          <ViewToggle />
          <button
            onClick={toggleSelectionMode}
            className={clsx(
              "rounded-lg px-3 py-2 text-sm font-medium transition",
              selectionMode
                ? "bg-teal text-white"
                : "bg-black/5 text-ink hover:bg-black/10 dark:bg-white/10 dark:text-sand dark:hover:bg-white/20"
            )}
            aria-pressed={selectionMode}
          >
            {selectionMode ? "Done" : "Select"}
          </button>
        </div>
      </motion.div>

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
          <IconGrid
            results={results}
            columns={columns}
            viewMode={viewMode}
            loading={loading}
            error={error}
            theme={theme}
            onCopyUrl={handleCopyUrl}
            onSelectIcon={handleSelectIcon}
            onRetry={handleRetry}
            onClearFilters={handleClearFilters}
            selectedIcons={selectedIcons}
            onToggleSelection={handleToggleSelection}
            selectionMode={selectionMode}
          />
        </div>
      </div>

      <AnimatePresence>
        {selectedIcon && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <IconDetailModal
              icon={selectedIcon}
              onClose={() => setSelectedIcon(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <BatchActions
        selectedIcons={selectedIcons}
        allIcons={results}
        onClearSelection={handleClearSelection}
        onSelectAll={handleSelectAll}
        theme={theme}
      />
    </div>
  );
};
