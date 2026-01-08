"use client";

import { useIconBrowserStore } from "../../stores/icon-browser";
import { useState } from "react";
import clsx from "clsx";

interface SourceFilterProps {
  sources: { name: string; count: number }[];
}

const MAX_VISIBLE = 6;

export const SourceFilter = ({ sources }: SourceFilterProps) => {
  const { sources: selectedSources, toggleSource } = useIconBrowserStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const visibleSources = isExpanded ? sources : sources.slice(0, MAX_VISIBLE);
  const showExpandButton = sources.length > MAX_VISIBLE;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate">
          Source
        </h3>
        {selectedSources.length > 0 && (
          <span className="text-xs text-teal">
            {selectedSources.length} selected
          </span>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {visibleSources.map((source) => {
          const isSelected = selectedSources.includes(source.name);
          const id = `source-${source.name}`;

          return (
            <label
              key={source.name}
              htmlFor={id}
              className={clsx(
                "flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 transition",
                isSelected
                  ? "bg-teal/10"
                  : "hover:bg-black/5 dark:hover:bg-white/5",
              )}
            >
              <div className="flex items-center gap-2">
                <input
                  id={id}
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSource(source.name)}
                  className="h-4 w-4 rounded border-black/20 text-teal focus:ring-teal focus:ring-offset-0 dark:border-white/20"
                  aria-label={`Filter by ${source.name}`}
                />
                <span
                  className={clsx(
                    "text-sm",
                    isSelected ? "font-medium text-ink" : "text-slate",
                  )}
                >
                  {source.name}
                </span>
              </div>
              <span className="text-xs text-slate">{source.count}</span>
            </label>
          );
        })}
      </div>

      {showExpandButton && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-xs font-medium text-teal transition hover:text-teal/80"
          aria-expanded={isExpanded}
        >
          {isExpanded
            ? "Show less"
            : `Show ${sources.length - MAX_VISIBLE} more`}
        </button>
      )}
    </div>
  );
};
