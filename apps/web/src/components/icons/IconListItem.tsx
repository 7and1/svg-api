"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import Image from "next/image";
import { API_BASE } from "../../lib/constants";
import { IconResult } from "./types";

interface IconListItemProps {
  icon: IconResult;
  onClick: (icon: IconResult) => void;
  theme: string | undefined;
  isSelected?: boolean;
  onToggleSelection?: (e: React.MouseEvent) => void;
  selectionMode?: boolean;
}

const getIconColor = (theme: string | undefined): string => {
  if (theme === "dark") return "%23f7f2e9";
  return "%230b1020";
};

const CheckboxIcon = ({ checked }: { checked: boolean }) => (
  <div
    className={clsx(
      "flex h-4 w-4 items-center justify-center rounded border transition-colors",
      checked
        ? "border-teal bg-teal text-white"
        : "border-slate/30 bg-white/80 dark:border-slate/50 dark:bg-ink/80"
    )}
  >
    {checked && (
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    )}
  </div>
);

export const IconListItem = ({
  icon,
  onClick,
  theme,
  isSelected = false,
  onToggleSelection,
  selectionMode = false,
}: IconListItemProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const iconColor = getIconColor(theme);
  const iconUrl = `${API_BASE}/icons/${icon.name}?source=${icon.source}&size=32&color=${iconColor}`;

  const handleClick = (e: React.MouseEvent) => {
    if (selectionMode && onToggleSelection) {
      onToggleSelection(e);
    } else {
      onClick(icon);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 4 }}
      onClick={handleClick}
      className={clsx(
        "flex cursor-pointer items-center gap-4 rounded-xl border p-3 transition-colors",
        isSelected
          ? "border-teal bg-teal/5 dark:bg-teal/10"
          : "hover:border-teal hover:bg-black/5 dark:hover:border-teal dark:hover:bg-white/5",
        "border-black/10 bg-white/80 dark:border-white/10 dark:bg-white/5"
      )}
    >
      {(selectionMode || isSelected) && onToggleSelection && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={onToggleSelection}
          className="shrink-0 rounded p-1 transition hover:bg-black/5 dark:hover:bg-white/10"
          aria-label={isSelected ? "Deselect icon" : "Select icon"}
        >
          <CheckboxIcon checked={isSelected} />
        </motion.button>
      )}
      <div className="relative h-8 w-8 shrink-0">
        {!imageLoaded && (
          <div className="absolute inset-0 animate-pulse rounded bg-black/10 dark:bg-white/10" />
        )}
        <Image
          src={iconUrl}
          alt={`${icon.name} icon`}
          width={32}
          height={32}
          className={clsx(
            "h-full w-full transition-opacity duration-200",
            imageLoaded ? "opacity-100" : "opacity-0"
          )}
          loading="lazy"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          unoptimized
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink dark:text-sand">
          {icon.name}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-slate">
            {icon.source}
          </span>
          <span className="text-slate/50">•</span>
          <span className="text-xs capitalize text-slate">{icon.category}</span>
        </div>
      </div>
    </motion.div>
  );
};
