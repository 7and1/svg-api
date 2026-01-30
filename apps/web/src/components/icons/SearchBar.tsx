"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  SearchHistory,
  useSearchHistory,
  InstantPreview,
} from "../search/SearchHistory";
import { IconResult } from "./types";

interface SearchBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  onSearchSubmit: (value: string) => void;
  showSearchHistory: boolean;
  onShowSearchHistoryChange: (show: boolean) => void;
  previewResults: IconResult[];
  previewLoading: boolean;
  onSelectIcon: (icon: IconResult) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

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

export const SearchBar = ({
  query,
  onQueryChange,
  onSearchSubmit,
  showSearchHistory,
  onShowSearchHistoryChange,
  previewResults,
  previewLoading,
  onSelectIcon,
  inputRef,
}: SearchBarProps) => {
  const { addToHistory } = useSearchHistory();

  const handleSearchSubmit = (value: string) => {
    onSearchSubmit(value);
    addToHistory(value);
    onShowSearchHistoryChange(false);
  };

  return (
    <div className="relative w-full lg:w-72">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => onShowSearchHistoryChange(true)}
          onBlur={() => {
            // Delay to allow clicking on history items
            setTimeout(() => onShowSearchHistoryChange(false), 200);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearchSubmit(query);
            }
          }}
          placeholder="Search icons..."
          className="w-full rounded-full border border-black/20 bg-white/80 py-2 pl-10 pr-12 text-sm focus:border-teal focus:outline-none dark:border-white/20 dark:bg-ink/50 dark:text-sand"
        />
        <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-medium text-slate dark:bg-white/10 lg:block">
          /
        </kbd>
      </div>

      {/* Instant Preview */}
      <AnimatePresence>
        {showSearchHistory && (query.length >= 2 || query === "") && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full z-50 mt-2 w-full rounded-2xl border border-black/10 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-white/10 dark:bg-surface/95"
          >
            {query.length < 2 ? (
              <SearchHistory
                currentQuery={query}
                onSelect={(value) => handleSearchSubmit(value)}
              />
            ) : (
              <InstantPreview
                query={query}
                results={previewResults}
                isLoading={previewLoading}
                onSelect={(item) => {
                  onSelectIcon(item as IconResult);
                  addToHistory(query);
                }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
