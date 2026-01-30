"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

const STORAGE_KEY = "svg-api-search-history";
const MAX_HISTORY = 10;

interface SearchHistoryProps {
  onSelect: (query: string) => void;
  currentQuery?: string;
  className?: string;
}

export const useSearchHistory = () => {
  const [history, setHistory] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage errors
    }
    setIsLoaded(true);
  }, []);

  const addToHistory = useCallback((query: string) => {
    if (!query.trim()) return;

    setHistory((prev) => {
      const newHistory = [
        query,
        ...prev.filter((item) => item !== query),
      ].slice(0, MAX_HISTORY);

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      } catch {
        // Ignore localStorage errors
      }

      return newHistory;
    });
  }, []);

  const removeFromHistory = useCallback((query: string) => {
    setHistory((prev) => {
      const newHistory = prev.filter((item) => item !== query);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      } catch {
        // Ignore localStorage errors
      }
      return newHistory;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  return { history, isLoaded, addToHistory, removeFromHistory, clearHistory };
};

// Popular searches (static data)
const POPULAR_SEARCHES = [
  "home",
  "user",
  "settings",
  "search",
  "heart",
  "star",
  "menu",
  "close",
  "arrow",
  "check",
];

export const SearchHistory = ({
  onSelect,
  currentQuery,
  className,
}: SearchHistoryProps) => {
  const { history, isLoaded, removeFromHistory, clearHistory } =
    useSearchHistory();
  const [showHistory, setShowHistory] = useState(true);

  if (!isLoaded) return null;

  const hasHistory = history.length > 0;
  const displayItems = showHistory && hasHistory ? history : [];

  return (
    <div className={clsx("space-y-4", className)}>
      {/* Search History */}
      {hasHistory && (
        <div>
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate">
              Recent Searches
            </h4>
            <div className="flex gap-2">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-xs text-slate transition hover:text-teal"
              >
                {showHistory ? "Hide" : "Show"}
              </button>
              <button
                onClick={clearHistory}
                className="text-xs text-slate transition hover:text-red-500"
              >
                Clear
              </button>
            </div>
          </div>
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 flex flex-wrap gap-2"
              >
                {history.map((query, index) => (
                  <motion.button
                    key={query}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => onSelect(query)}
                    className={clsx(
                      "group flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition",
                      currentQuery === query
                        ? "border-teal bg-teal/10 text-teal"
                        : "border-black/10 bg-white/50 text-ink hover:border-teal/50 hover:bg-teal/5 dark:border-white/10 dark:bg-white/5 dark:text-sand dark:hover:border-teal/50"
                    )}
                  >
                    <ClockIcon className="h-3.5 w-3.5 text-slate/50" />
                    <span>{query}</span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromHistory(query);
                      }}
                      className="ml-1 rounded-full p-0.5 opacity-0 transition hover:bg-black/10 group-hover:opacity-100 dark:hover:bg-white/10"
                    >
                      <CloseIcon className="h-3 w-3" />
                    </span>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Popular Searches */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate">
          Popular Searches
        </h4>
        <div className="mt-2 flex flex-wrap gap-2">
          {POPULAR_SEARCHES.map((query, index) => (
            <motion.button
              key={query}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => onSelect(query)}
              className={clsx(
                "rounded-full border px-3 py-1.5 text-sm transition",
                currentQuery === query
                  ? "border-teal bg-teal/10 text-teal"
                  : "border-black/10 bg-white/50 text-ink hover:border-teal/50 hover:bg-teal/5 dark:border-white/10 dark:bg-white/5 dark:text-sand dark:hover:border-teal/50"
              )}
            >
              {query}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

const ClockIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const CloseIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

// Instant preview component
export const InstantPreview = ({
  query,
  results,
  onSelect,
  isLoading,
}: {
  query: string;
  results: Array<{ name: string; source: string }>;
  onSelect: (item: { name: string; source: string }) => void;
  isLoading: boolean;
}) => {
  if (!query || query.length < 2) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute top-full z-50 mt-2 w-full rounded-2xl border border-black/10 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-white/10 dark:bg-surface/95"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal border-t-transparent" />
        </div>
      ) : results.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate">
          No results found for &quot;{query}&quot;
        </div>
      ) : (
        <div className="space-y-1">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate">
            Top Results
          </p>
          {results.slice(0, 5).map((item, index) => (
            <motion.button
              key={`${item.source}-${item.name}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSelect(item)}
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-black/5 dark:hover:bg-white/5"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/5 dark:bg-white/5">
                <SearchIcon className="h-4 w-4 text-slate" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink dark:text-sand">
                  {item.name}
                </p>
                <p className="text-xs text-slate">{item.source}</p>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </motion.div>
  );
};

const SearchIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);
