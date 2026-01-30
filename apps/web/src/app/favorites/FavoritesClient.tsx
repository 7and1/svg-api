"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { useFavoritesStore } from "../../stores/favorites";
import { IconResult } from "../../components/icons/types";
import { IconCard } from "../../components/icons/IconCard";
import { IconDetailModal } from "../../components/icons/IconDetailModal";
import { AutoBreadcrumb } from "../../components/ui/Breadcrumb";
import { fetchIconDetails } from "../../components/icons/api";

const HeartIcon = () => (
  <svg
    className="h-12 w-12"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
    />
  </svg>
);

const ArrowRightIcon = () => (
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
      d="M17 8l4 4m0 0l-4 4m4-4H3"
    />
  </svg>
);

export function FavoritesClient() {
  const { favorites } = useFavoritesStore();
  const { theme } = useTheme();
  const [icons, setIcons] = useState<IconResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIcon, setSelectedIcon] = useState<IconResult | null>(null);
  const [copiedIcon, setCopiedIcon] = useState<IconResult | null>(null);

  useEffect(() => {
    const loadFavorites = async () => {
      if (favorites.length === 0) {
        setIcons([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Parse icon IDs (format: "source:name")
        const iconPromises = favorites.map(async (iconId) => {
          const [source, name] = iconId.split(":");
          if (!source || !name) return null;
          return fetchIconDetails(name, source);
        });

        const results = await Promise.all(iconPromises);
        setIcons(results.filter((icon): icon is IconResult => icon !== null));
      } catch (error) {
        console.error("Failed to load favorites:", error);
      } finally {
        setLoading(false);
      }
    };

    loadFavorites();
  }, [favorites]);

  const handleCopyUrl = (icon: IconResult) => {
    const url = `${window.location.origin}/icons/${icon.name}?source=${icon.source}`;
    navigator.clipboard.writeText(url);
    setCopiedIcon(icon);
    setTimeout(() => setCopiedIcon(null), 2000);
  };

  const handleIconClick = (icon: IconResult) => {
    setSelectedIcon(icon);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
      <AutoBreadcrumb className="mb-6" />

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-ink dark:text-sand">
          Favorites
        </h1>
        <p className="mt-2 text-slate">
          Your saved icons ({favorites.length}/100)
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl bg-black/10 dark:bg-white/10"
            />
          ))}
        </div>
      ) : icons.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-2xl border border-black/10 bg-sand/60 py-16 text-center dark:border-white/10 dark:bg-white/5"
        >
          <div className="mb-4 text-slate">
            <HeartIcon />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-ink dark:text-sand">
            No favorites yet
          </h2>
          <p className="mb-6 max-w-sm text-slate">
            Start building your collection by clicking the heart icon on any icon you love.
          </p>
          <Link
            href="/icons"
            className="inline-flex items-center gap-2 rounded-xl bg-teal px-4 py-2 font-medium text-white transition hover:bg-teal/90"
          >
            Browse icons
            <ArrowRightIcon />
          </Link>
        </motion.div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {icons.map((icon) => (
              <IconCard
                key={`${icon.source}:${icon.name}`}
                icon={icon}
                onCopyUrl={handleCopyUrl}
                onClick={handleIconClick}
                theme={theme}
              />
            ))}
          </div>

          {favorites.length >= 90 && (
            <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400">
              <p>
                <strong>Storage almost full:</strong> You have {favorites.length} favorites.
                When you reach 100, the oldest favorites will be automatically removed.
              </p>
            </div>
          )}
        </>
      )}

      {selectedIcon && (
        <IconDetailModal
          icon={selectedIcon}
          onClose={() => setSelectedIcon(null)}
        />
      )}

      {copiedIcon && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-ink px-4 py-2 text-sm text-white shadow-lg dark:bg-white dark:text-ink">
          Copied {copiedIcon.name} URL to clipboard
        </div>
      )}
    </div>
  );
}
