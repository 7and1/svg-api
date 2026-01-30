"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { IconResult } from "./types";
import { API_BASE } from "../../lib/constants";

interface BatchActionsProps {
  selectedIcons: Set<string>;
  allIcons: IconResult[];
  onClearSelection: () => void;
  onSelectAll: () => void;
  theme: string | undefined;
}

const DownloadIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const CopyIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const CloseIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const getIconColor = (theme: string | undefined): string => {
  if (theme === "dark") return "%23f7f2e9";
  return "%230b1020";
};

export const BatchActions = ({
  selectedIcons,
  allIcons,
  onClearSelection,
  onSelectAll,
  theme,
}: BatchActionsProps) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const selectedCount = selectedIcons.size;
  const allSelected = selectedCount === allIcons.length && allIcons.length > 0;

  const handleDownloadZip = useCallback(async () => {
    if (selectedCount === 0) return;
    setIsDownloading(true);

    try {
      const iconColor = getIconColor(theme);
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const iconsFolder = zip.folder("icons");

      if (!iconsFolder) throw new Error("Failed to create icons folder");

      const selectedIconData = allIcons.filter((icon) =>
        selectedIcons.has(`${icon.source}:${icon.name}`)
      );

      // Fetch all icons in parallel
      const fetchPromises = selectedIconData.map(async (icon) => {
        const url = `${API_BASE}/icons/${icon.name}?source=${icon.source}&color=${iconColor}`;
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Failed to fetch ${icon.name}`);
          const svg = await response.text();
          const filename = `${icon.source}-${icon.name}.svg`;
          iconsFolder.file(filename, svg);
        } catch (err) {
          console.error(`Failed to download ${icon.name}:`, err);
        }
      });

      await Promise.all(fetchPromises);

      const content = await zip.generateAsync({ type: "blob" });
      const downloadUrl = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `icons-${selectedCount}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("Failed to create ZIP:", err);
    } finally {
      setIsDownloading(false);
    }
  }, [selectedIcons, allIcons, theme, selectedCount]);

  const handleCopyUrls = useCallback(async () => {
    if (selectedCount === 0) return;

    const urls = Array.from(selectedIcons).map((iconId) => {
      const [source, name] = iconId.split(":");
      return `${API_BASE}/icons/${name}?source=${source}`;
    });

    await navigator.clipboard.writeText(urls.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [selectedIcons, selectedCount]);

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={clsx(
            "fixed bottom-6 left-1/2 z-50 -translate-x-1/2",
            "flex items-center gap-4 rounded-2xl border px-6 py-4 shadow-xl",
            "bg-white/95 backdrop-blur-sm dark:bg-ink/95",
            "border-black/10 dark:border-white/10"
          )}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal text-xs font-semibold text-white">
              {selectedCount}
            </span>
            <span className="text-sm font-medium text-ink dark:text-sand">
              {selectedCount === 1 ? "icon selected" : "icons selected"}
            </span>
          </div>

          <div className="h-6 w-px bg-black/10 dark:bg-white/10" />

          <div className="flex items-center gap-2">
            <button
              onClick={onSelectAll}
              className={clsx(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                "text-slate hover:bg-black/5 hover:text-ink dark:hover:bg-white/10 dark:hover:text-sand"
              )}
            >
              {allSelected ? "Deselect All" : "Select All"}
            </button>

            <button
              onClick={handleCopyUrls}
              disabled={copied}
              className={clsx(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition",
                copied
                  ? "bg-teal/10 text-teal"
                  : "text-slate hover:bg-black/5 hover:text-ink dark:hover:bg-white/10 dark:hover:text-sand"
              )}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
              {copied ? "Copied!" : "Copy URLs"}
            </button>

            <button
              onClick={handleDownloadZip}
              disabled={isDownloading}
              className={clsx(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition",
                "bg-teal text-white hover:bg-teal/90",
                isDownloading && "cursor-not-allowed opacity-70"
              )}
            >
              {isDownloading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Downloading...
                </>
              ) : (
                <>
                  <DownloadIcon />
                  Download ZIP
                </>
              )}
            </button>
          </div>

          <div className="h-6 w-px bg-black/10 dark:bg-white/10" />

          <button
            onClick={onClearSelection}
            className="rounded-lg p-1.5 text-slate transition hover:bg-black/5 hover:text-ink dark:hover:bg-white/10 dark:hover:text-sand"
            aria-label="Clear selection"
          >
            <CloseIcon />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
