"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import { useFavoritesStore } from "../../stores/favorites";

interface FavoriteButtonProps {
  iconId: string;
  className?: string;
}

const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg
    className="h-5 w-5"
    fill={filled ? "currentColor" : "none"}
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
    />
  </svg>
);

export const FavoriteButton = ({ iconId, className }: FavoriteButtonProps) => {
  const { isFavorite, addFavorite, removeFavorite } = useFavoritesStore();
  const isFav = isFavorite(iconId);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFav) {
      removeFavorite(iconId);
    } else {
      addFavorite(iconId);
    }
  };

  return (
    <motion.button
      onClick={handleToggle}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className={clsx(
        "rounded-lg p-1.5 transition",
        isFav
          ? "text-red-500 hover:text-red-600"
          : "text-slate opacity-0 hover:text-red-500 group-hover:opacity-100",
        className,
      )}
      title={isFav ? "Remove from favorites" : "Add to favorites"}
      aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={isFav}
    >
      <motion.div
        initial={false}
        animate={isFav ? { scale: [1, 1.2, 1] } : { scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <HeartIcon filled={isFav} />
      </motion.div>
    </motion.button>
  );
};
