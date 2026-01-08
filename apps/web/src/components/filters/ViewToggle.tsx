"use client";

import { useIconBrowserStore, ViewMode } from "../../stores/icon-browser";
import clsx from "clsx";

const GridIcon = () => (
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
      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
    />
  </svg>
);

const ListIcon = () => (
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
      d="M4 6h16M4 12h16M4 18h16"
    />
  </svg>
);

export const ViewToggle = () => {
  const { viewMode, setViewMode } = useIconBrowserStore();

  return (
    <div className="flex items-center rounded-lg border border-black/20 bg-white/80 dark:border-white/20 dark:bg-ink/80">
      <button
        onClick={() => setViewMode("grid")}
        className={clsx(
          "rounded-lg px-2.5 py-2 transition",
          viewMode === "grid"
            ? "bg-black/5 text-ink dark:bg-white/10 dark:text-sand"
            : "text-slate hover:text-ink",
        )}
        aria-label="Grid view"
        aria-pressed={viewMode === "grid"}
      >
        <GridIcon />
      </button>
      <button
        onClick={() => setViewMode("list")}
        className={clsx(
          "rounded-lg px-2.5 py-2 transition",
          viewMode === "list"
            ? "bg-black/5 text-ink dark:bg-white/10 dark:text-sand"
            : "text-slate hover:text-ink",
        )}
        aria-label="List view"
        aria-pressed={viewMode === "list"}
      >
        <ListIcon />
      </button>
    </div>
  );
};
