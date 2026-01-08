"use client";

import { useIconBrowserStore } from "../../stores/icon-browser";
import { useState, useMemo } from "react";
import clsx from "clsx";

interface TagFilterProps {
  tags: string[];
}

const MAX_VISIBLE = 12;

export const TagFilter = ({ tags }: TagFilterProps) => {
  const { tags: selectedTags, toggleTag } = useIconBrowserStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTags = useMemo(() => {
    if (!searchQuery) return tags;
    const query = searchQuery.toLowerCase();
    return tags.filter((tag) => tag.toLowerCase().includes(query));
  }, [tags, searchQuery]);

  const visibleTags = isExpanded
    ? filteredTags
    : filteredTags.slice(0, MAX_VISIBLE);
  const showExpandButton = filteredTags.length > MAX_VISIBLE;
  const hasSelections = selectedTags.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate">
          Tags
        </h3>
        {hasSelections && (
          <span className="text-xs text-teal">
            {selectedTags.length} selected
          </span>
        )}
      </div>

      {hasSelections && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-full border border-teal/30 bg-teal/10 px-2 py-0.5 text-xs font-medium text-teal"
            >
              {tag}
              <button
                onClick={() => toggleTag(tag)}
                className="hover:text-teal/80"
                aria-label={`Remove ${tag} tag`}
              >
                <svg
                  className="h-3 w-3"
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
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search for tags */}
      <div className="mt-3 relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tags..."
          className="w-full rounded-lg border border-black/20 bg-white/90 px-3 py-2 pl-9 text-sm placeholder:text-slate focus:border-teal focus:outline-none dark:border-white/20 dark:bg-ink/50 dark:placeholder:text-slate/50"
          aria-label="Search tags"
        />
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate">
          <svg
            className="h-4 w-4"
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
        </div>
      </div>

      {/* Tag Cloud */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {visibleTags.map((tag) => {
          const isSelected = selectedTags.includes(tag);

          return (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={clsx(
                "rounded-full px-2.5 py-1 text-xs font-medium transition",
                isSelected
                  ? "border-teal bg-teal/10 text-teal"
                  : "border border-black/10 text-slate hover:border-black/20 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5",
              )}
              aria-pressed={isSelected}
              aria-label={`Toggle ${tag} tag`}
            >
              {tag}
            </button>
          );
        })}

        {filteredTags.length === 0 && (
          <p className="w-full px-3 py-4 text-center text-sm text-slate">
            No tags found
          </p>
        )}
      </div>

      {showExpandButton && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-3 text-xs font-medium text-teal transition hover:text-teal/80"
          aria-expanded={isExpanded}
        >
          {isExpanded
            ? "Show less"
            : `Show ${filteredTags.length - MAX_VISIBLE} more tags`}
        </button>
      )}
    </div>
  );
};
