import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";

export type SortOption = "name" | "popularity" | "category";
export type ViewMode = "grid" | "list";

interface FilterState {
  query: string;
  sources: string[];
  categories: string[];
  tags: string[];
  sortBy: SortOption;
  viewMode: ViewMode;
  selectedIcons: Set<string>;
  setQuery: (query: string) => void;
  setSources: (sources: string[]) => void;
  toggleSource: (source: string) => void;
  setCategories: (categories: string[]) => void;
  toggleCategory: (category: string) => void;
  setTags: (tags: string[]) => void;
  toggleTag: (tag: string) => void;
  setSortBy: (sortBy: SortOption) => void;
  setViewMode: (viewMode: ViewMode) => void;
  resetFilters: () => void;
  syncFromUrl: () => void;
  syncToUrl: () => void;
  toggleIconSelection: (iconId: string) => void;
  selectIcon: (iconId: string) => void;
  deselectIcon: (iconId: string) => void;
  selectAll: (iconIds: string[]) => void;
  clearSelection: () => void;
  isSelected: (iconId: string) => boolean;
}

const STORAGE_KEY = "icon-browser-filters";

export const useIconBrowserStore = create<FilterState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        query: "",
        sources: [],
        categories: [],
        tags: [],
        sortBy: "popularity",
        viewMode: "grid",
        selectedIcons: new Set<string>(),

        setQuery: (query) => set({ query }),

        setSources: (sources) => set({ sources }),

        toggleSource: (source) => {
          const sources = get().sources;
          set({
            sources: sources.includes(source)
              ? sources.filter((s) => s !== source)
              : [...sources, source],
          });
        },

        setCategories: (categories) => set({ categories }),

        toggleCategory: (category) => {
          const categories = get().categories;
          set({
            categories: categories.includes(category)
              ? categories.filter((c) => c !== category)
              : [...categories, category],
          });
        },

        setTags: (tags) => set({ tags }),

        toggleTag: (tag) => {
          const tags = get().tags;
          set({
            tags: tags.includes(tag)
              ? tags.filter((t) => t !== tag)
              : [...tags, tag],
          });
        },

        setSortBy: (sortBy) => set({ sortBy }),

        setViewMode: (viewMode) => set({ viewMode }),

        resetFilters: () =>
          set({
            query: "",
            sources: [],
            categories: [],
            tags: [],
            sortBy: "popularity",
          }),

        toggleIconSelection: (iconId: string) => {
          const selectedIcons = new Set(get().selectedIcons);
          if (selectedIcons.has(iconId)) {
            selectedIcons.delete(iconId);
          } else {
            selectedIcons.add(iconId);
          }
          set({ selectedIcons });
        },

        selectIcon: (iconId: string) => {
          const selectedIcons = new Set(get().selectedIcons);
          selectedIcons.add(iconId);
          set({ selectedIcons });
        },

        deselectIcon: (iconId: string) => {
          const selectedIcons = new Set(get().selectedIcons);
          selectedIcons.delete(iconId);
          set({ selectedIcons });
        },

        selectAll: (iconIds: string[]) => {
          set({ selectedIcons: new Set(iconIds) });
        },

        clearSelection: () => set({ selectedIcons: new Set<string>() }),

        isSelected: (iconId: string) => get().selectedIcons.has(iconId),

        syncFromUrl: () => {
          if (typeof window === "undefined") return;

          const params = new URLSearchParams(window.location.search);
          const state: Partial<FilterState> = {};

          const query = params.get("q");
          if (query) state.query = query;

          const sources = params.get("sources");
          if (sources) state.sources = sources.split(",");

          const categories = params.get("categories");
          if (categories) state.categories = categories.split(",");

          const tags = params.get("tags");
          if (tags) state.tags = tags.split(",");

          const sortBy = params.get("sort");
          if (sortBy && ["name", "popularity", "category"].includes(sortBy)) {
            state.sortBy = sortBy as SortOption;
          }

          if (Object.keys(state).length > 0) {
            set(state as Partial<FilterState>);
          }
        },

        syncToUrl: () => {
          if (typeof window === "undefined") return;

          const state = get();
          const params = new URLSearchParams();

          if (state.query) params.set("q", state.query);
          if (state.sources.length > 0)
            params.set("sources", state.sources.join(","));
          if (state.categories.length > 0)
            params.set("categories", state.categories.join(","));
          if (state.tags.length > 0) params.set("tags", state.tags.join(","));
          if (state.sortBy !== "popularity") params.set("sort", state.sortBy);

          const queryString = params.toString();
          const newUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ""}`;

          if (window.location.href !== newUrl) {
            window.history.replaceState({}, "", newUrl);
          }
        },
      }),
      {
        name: STORAGE_KEY,
        partialize: (state) => ({
          sources: state.sources,
          categories: state.categories,
          tags: state.tags,
          sortBy: state.sortBy,
          viewMode: state.viewMode,
        }),
        onRehydrateStorage: () => (state) => {
          if (state) {
            state.selectedIcons = new Set<string>();
          }
        },
      },
    ),
  ),
);

// Subscribe to state changes to sync with URL
if (typeof window !== "undefined") {
  useIconBrowserStore.subscribe(
    (state) => ({
      query: state.query,
      sources: state.sources,
      categories: state.categories,
      tags: state.tags,
      sortBy: state.sortBy,
    }),
    () => {
      useIconBrowserStore.getState().syncToUrl();
    },
    {
      equalityFn: (a, b) =>
        a.query === b.query &&
        a.sources.join(",") === b.sources.join(",") &&
        a.categories.join(",") === b.categories.join(",") &&
        a.tags.join(",") === b.tags.join(",") &&
        a.sortBy === b.sortBy,
    },
  );
}
