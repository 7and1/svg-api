import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";

interface FavoritesState {
  favorites: string[];
  addFavorite: (iconId: string) => void;
  removeFavorite: (iconId: string) => void;
  isFavorite: (iconId: string) => boolean;
}

const STORAGE_KEY = "svg-api-favorites";
const MAX_FAVORITES = 100;

export const useFavoritesStore = create<FavoritesState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        favorites: [],

        addFavorite: (iconId: string) => {
          const { favorites } = get();
          if (favorites.includes(iconId)) return;
          if (favorites.length >= MAX_FAVORITES) {
            // Remove oldest favorite (first in array) when limit reached
            set({
              favorites: [...favorites.slice(1), iconId],
            });
          } else {
            set({
              favorites: [...favorites, iconId],
            });
          }
        },

        removeFavorite: (iconId: string) => {
          const { favorites } = get();
          set({
            favorites: favorites.filter((id) => id !== iconId),
          });
        },

        isFavorite: (iconId: string) => {
          return get().favorites.includes(iconId);
        },
      }),
      {
        name: STORAGE_KEY,
      },
    ),
  ),
);

// Sync favorites across tabs using storage event
if (typeof window !== "undefined") {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue);
        if (parsed.state && Array.isArray(parsed.state.favorites)) {
          useFavoritesStore.setState({ favorites: parsed.state.favorites });
        }
      } catch {
        // Ignore invalid storage data
      }
    }
  };

  window.addEventListener("storage", handleStorage);
}
