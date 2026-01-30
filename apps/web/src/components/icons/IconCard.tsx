"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import Image from "next/image";
import { API_BASE } from "../../lib/constants";
import { IconResult } from "./types";
import { FavoriteButton } from "./FavoriteButton";

interface IconCardProps {
  icon: IconResult;
  onCopyUrl: (icon: IconResult) => void;
  onClick: (icon: IconResult) => void;
  theme: string | undefined;
  isSelected?: boolean;
  onToggleSelection?: (e: React.MouseEvent) => void;
  selectionMode?: boolean;
}

const CopyIcon = () => (
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
      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
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

export const IconCard = ({
  icon,
  onCopyUrl,
  onClick,
  theme,
  isSelected = false,
  onToggleSelection,
  selectionMode = false,
}: IconCardProps) => {
  const [copied, setCopied] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopyUrl(icon);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (selectionMode && onToggleSelection) {
      onToggleSelection(e);
    } else {
      onClick(icon);
    }
  };

  const iconColor = getIconColor(theme);
  const iconUrl = `${API_BASE}/icons/${icon.name}?source=${icon.source}&size=48&color=${iconColor}`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={clsx(
        "group relative cursor-pointer rounded-2xl border p-4 text-center",
        "transition-colors hover:border-teal hover:shadow-glow dark:hover:shadow-glow-dark",
        isSelected
          ? "border-teal bg-teal/5 shadow-glow dark:bg-teal/10 dark:shadow-glow-dark"
          : "border-black/10 bg-sand/60 dark:border-white/10 dark:bg-white/5"
      )}
    >
      <div className="absolute left-2 top-2">
        {(selectionMode || isSelected) && onToggleSelection && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={onToggleSelection}
            className="rounded p-1 transition hover:bg-black/5 dark:hover:bg-white/10"
            aria-label={isSelected ? "Deselect icon" : "Select icon"}
          >
            <CheckboxIcon checked={isSelected} />
          </motion.button>
        )}
      </div>
      <div className="absolute right-2 top-2 flex gap-1">
        <FavoriteButton iconId={`${icon.source}:${icon.name}`} />
        <motion.button
          onClick={handleCopy}
          initial={{ opacity: 0 }}
          animate={{ opacity: copied ? 1 : 0 }}
          whileHover={{ opacity: 1 }}
          className={clsx(
            "rounded-lg p-1.5 transition",
            copied
              ? "bg-teal text-white"
              : "bg-white/80 text-slate opacity-0 hover:bg-white hover:text-ink dark:bg-ink/80 dark:text-slate/70 dark:hover:bg-ink dark:hover:text-sand group-hover:opacity-100"
          )}
          title="Copy icon URL"
          aria-label={`Copy ${icon.name} URL`}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </motion.button>
      </div>
      {/* Image container with fixed dimensions to prevent CLS */}
      <div className="relative mx-auto h-12 w-12">
        {!imageLoaded && (
          <div className="absolute inset-0 animate-pulse rounded-lg bg-black/10 dark:bg-white/10" />
        )}
        <Image
          src={iconUrl}
          alt={`${icon.name} icon`}
          width={48}
          height={48}
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
      <p className="mt-3 truncate text-xs font-semibold text-ink dark:text-sand">
        {icon.name}
      </p>
      <p className="text-[10px] uppercase tracking-[0.2em] text-slate">
        {icon.source}
      </p>
    </motion.div>
  );
};
