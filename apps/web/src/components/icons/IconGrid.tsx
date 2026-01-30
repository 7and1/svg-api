"use client";

import { useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { motion, AnimatePresence } from "framer-motion";
import { IconCard } from "./IconCard";
import { IconListItem } from "./IconListItem";
import { IconResult } from "./types";
import { IconGridSkeleton, IconListSkeleton } from "../ui/Skeleton";
import { EmptyState, ErrorState } from "../ui/ErrorBoundary";

interface IconGridProps {
  results: IconResult[];
  columns: number;
  viewMode: "grid" | "list";
  loading: boolean;
  error: Error | null;
  theme: string | undefined;
  onCopyUrl: (icon: IconResult) => void;
  onSelectIcon: (icon: IconResult) => void;
  onRetry: () => void;
  onClearFilters: () => void;
  selectedIcons: Set<string>;
  onToggleSelection: (iconId: string) => void;
  selectionMode: boolean;
}

export const IconGrid = ({
  results,
  columns,
  viewMode,
  loading,
  error,
  theme,
  onCopyUrl,
  onSelectIcon,
  onRetry,
  onClearFilters,
  selectedIcons,
  onToggleSelection,
  selectionMode,
}: IconGridProps) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowCount = Math.ceil(results.length / columns);

  // Optimized virtualizer configuration
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (viewMode === "list" ? 60 : 140),
    overscan: 5,
    // Optimize for smooth scrolling
    scrollPaddingEnd: 100,
    getItemKey: (index) => `${viewMode}-${index}`,
  });

  const rows = rowVirtualizer.getVirtualItems();

  const gridTemplate = useMemo(
    () => `repeat(${columns}, minmax(0, 1fr))`,
    [columns]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-3xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5"
    >
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate">
        <span>{results.length.toLocaleString()} results</span>
        <span>{loading ? "Searching..." : "Ready"}</span>
      </div>

      {/* Error State */}
      {error && (
        <ErrorState
          error={error}
          onRetry={onRetry}
        />
      )}

      {/* Empty State */}
      {!error && results.length === 0 && !loading && (
        <EmptyState
          title="No icons found"
          description="Try adjusting your search or filters to find what you are looking for."
          action={{
            label: "Clear Filters",
            onClick: onClearFilters,
          }}
        />
      )}

      {/* Loading Skeleton */}
      {loading && results.length === 0 && (
        <div className="mt-4">
          {viewMode === "list" ? (
            <IconListSkeleton />
          ) : (
            <IconGridSkeleton columns={columns} />
          )}
        </div>
      )}

      {/* Results Grid/List */}
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
            <AnimatePresence mode="popLayout">
              {rows.map((row) => {
                if (viewMode === "list") {
                  const icon = results[row.index];
                  if (!icon) return null;
                  return (
                    <motion.div
                      key={row.key}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute left-0 right-0"
                      style={{ transform: `translateY(${row.start}px)` }}
                    >
                      <IconListItem
                        icon={icon}
                        onClick={onSelectIcon}
                        theme={theme}
                        isSelected={selectedIcons.has(`${icon.source}:${icon.name}`)}
                        onToggleSelection={(e) => {
                          e.stopPropagation();
                          onToggleSelection(`${icon.source}:${icon.name}`);
                        }}
                        selectionMode={selectionMode}
                      />
                    </motion.div>
                  );
                }

                const startIndex = row.index * columns;
                const rowItems = results.slice(
                  startIndex,
                  startIndex + columns
                );
                return (
                  <motion.div
                    key={row.key}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
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
                        onCopyUrl={onCopyUrl}
                        onClick={onSelectIcon}
                        theme={theme}
                        isSelected={selectedIcons.has(`${icon.source}:${icon.name}`)}
                        onToggleSelection={(e) => {
                          e.stopPropagation();
                          onToggleSelection(`${icon.source}:${icon.name}`);
                        }}
                        selectionMode={selectionMode}
                      />
                    ))}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}
    </motion.div>
  );
};
