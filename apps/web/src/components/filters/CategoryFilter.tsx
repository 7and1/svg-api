"use client";

import { useIconBrowserStore } from "../../stores/icon-browser";
import { useState, useMemo } from "react";
import clsx from "clsx";

interface CategoryFilterProps {
  categories: { name: string; count: number }[];
}

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    className={clsx("h-4 w-4 transition-transform", open && "rotate-180")}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const SearchIcon = () => (
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
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

export const CategoryFilter = ({ categories }: CategoryFilterProps) => {
  const { categories: selectedCategories, toggleCategory } =
    useIconBrowserStore();
  const [isOpen, setIsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories;
    const query = searchQuery.toLowerCase();
    return categories.filter((cat) => cat.name.toLowerCase().includes(query));
  }, [categories, searchQuery]);

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between"
        aria-expanded={isOpen}
        aria-controls="category-list"
      >
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate">
          Category
        </h3>
        <ChevronIcon open={isOpen} />
      </button>

      {selectedCategories.length > 0 && (
        <span className="mt-1 block text-xs text-amber">
          {selectedCategories.length} selected
        </span>
      )}

      {isOpen && (
        <div id="category-list" className="mt-3">
          {/* Search */}
          {categories.length > 10 && (
            <div className="relative mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search categories..."
                className="w-full rounded-lg border border-black/20 bg-white/90 px-3 py-2 pl-9 text-sm placeholder:text-slate focus:border-teal focus:outline-none dark:border-white/20 dark:bg-ink/50 dark:placeholder:text-slate/50"
                aria-label="Search categories"
              />
              <SearchIcon />
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate">
                <SearchIcon />
              </div>
            </div>
          )}

          {/* Category List */}
          <div className="max-h-48 space-y-1 overflow-auto">
            {filteredCategories.map((category) => {
              const isSelected = selectedCategories.includes(category.name);
              const id = `category-${category.name}`;

              return (
                <label
                  key={category.name}
                  htmlFor={id}
                  className={clsx(
                    "flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 transition",
                    isSelected
                      ? "bg-amber/10"
                      : "hover:bg-black/5 dark:hover:bg-white/5",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <input
                      id={id}
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleCategory(category.name)}
                      className="h-4 w-4 rounded border-black/20 text-amber focus:ring-amber focus:ring-offset-0 dark:border-white/20"
                      aria-label={`Filter by ${category.name}`}
                    />
                    <span
                      className={clsx(
                        "text-sm capitalize",
                        isSelected ? "font-medium text-ink" : "text-slate",
                      )}
                    >
                      {category.name}
                    </span>
                  </div>
                  <span className="text-xs text-slate">{category.count}</span>
                </label>
              );
            })}

            {filteredCategories.length === 0 && (
              <p className="px-3 py-4 text-center text-sm text-slate">
                No categories found
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
