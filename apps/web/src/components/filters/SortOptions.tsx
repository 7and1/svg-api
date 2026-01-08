"use client";

import { useIconBrowserStore, SortOption } from "../../stores/icon-browser";
import { useState, useEffect, useRef } from "react";
import clsx from "clsx";

const sortOptions: { id: SortOption; label: string; description: string }[] = [
  { id: "popularity", label: "Popularity", description: "Most relevant first" },
  { id: "name", label: "Name", description: "Alphabetical order" },
  { id: "category", label: "Category", description: "Grouped by category" },
];

const ArrowUpDownIcon = () => (
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
      d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
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

export const SortOptions = () => {
  const { sortBy, setSortBy } = useIconBrowserStore();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedOption = sortOptions.find((opt) => opt.id === sortBy);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-black/20 bg-white/80 px-3 py-2 text-sm transition hover:border-black/40 dark:border-white/20 dark:bg-ink/80"
        aria-label="Sort by"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <ArrowUpDownIcon />
        <span className="hidden sm:inline">{selectedOption?.label}</span>
        <span className="sm:hidden">Sort</span>
        <svg
          className={clsx(
            "h-4 w-4 transition-transform",
            isOpen && "rotate-180",
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            className="absolute right-0 top-full z-20 w-48 rounded-xl border border-black/10 bg-white shadow-lg dark:border-white/10 dark:bg-surface"
            role="menu"
            aria-label="Sort options"
          >
            <div className="p-1">
              {sortOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    setSortBy(option.id);
                    setIsOpen(false);
                  }}
                  className={clsx(
                    "flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left text-sm transition",
                    sortBy === option.id
                      ? "bg-teal/10 text-teal"
                      : "text-slate hover:bg-black/5 dark:hover:bg-white/5",
                  )}
                  role="menuitem"
                >
                  <span className="flex-1">
                    <span className="block font-medium">{option.label}</span>
                    <span className="block text-xs opacity-75">
                      {option.description}
                    </span>
                  </span>
                  {sortBy === option.id && <CheckIcon />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
