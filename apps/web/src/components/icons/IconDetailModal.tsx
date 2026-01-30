"use client";

import { useEffect, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { API_BASE } from "../../lib/constants";

interface IconResult {
  name: string;
  source: string;
  category: string;
  tags: string[];
}

type CodeTab = "url" | "curl" | "html" | "react" | "svg";

const CloseIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

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

const DownloadIcon = () => (
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
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  </svg>
);

const getDefaultColor = (theme: string | undefined): string => {
  return theme === "dark" ? "#f7f2e9" : "#0b1020";
};

const generateCode = (
  icon: IconResult,
  size: number,
  color: string,
  strokeWidth: number,
  tab: CodeTab,
  svgContent?: string
): string => {
  const encodedColor = encodeURIComponent(color);
  const baseUrl = `${API_BASE}/icons/${icon.name}?source=${icon.source}&size=${size}&color=${encodedColor}&stroke-width=${strokeWidth}`;

  switch (tab) {
    case "url":
      return baseUrl;
    case "curl":
      return `curl "${baseUrl}" -o ${icon.name}.svg`;
    case "html":
      return `<img src="${baseUrl}" alt="${icon.name}" width="${size}" height="${size}" loading="lazy" />`;
    case "react":
      return `import { useState, useEffect } from 'react';

export const ${toPascalCase(icon.name)}Icon = ({
  size = ${size},
  color = "${color}",
  strokeWidth = ${strokeWidth}
}) => {
  const [svg, setSvg] = useState('');

  useEffect(() => {
    fetch(\`${API_BASE}/icons/${icon.name}?source=${icon.source}&size=\${size}&color=\${encodeURIComponent(color)}&stroke-width=\${strokeWidth}\`)
      .then(r => r.text())
      .then(setSvg);
  }, [size, color, strokeWidth]);

  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
};`;
    case "svg":
      return svgContent || "Loading SVG...";
    default:
      return baseUrl;
  }
};

const toPascalCase = (str: string): string => {
  return str
    .replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    .replace(/^([a-z])/, (_, c) => c.toUpperCase());
};

export const IconDetailModal = ({
  icon,
  onClose,
}: {
  icon: IconResult;
  onClose: () => void;
}) => {
  const { theme } = useTheme();
  const [size, setSize] = useState(48);
  const [color, setColor] = useState(() => getDefaultColor(undefined));
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [activeTab, setActiveTab] = useState<CodeTab>("url");
  const [copied, setCopied] = useState(false);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Update color when theme changes
  useEffect(() => {
    setColor(getDefaultColor(theme));
  }, [theme]);

  const iconUrl = `${API_BASE}/icons/${icon.name}?source=${icon.source}&size=${size}&color=${encodeURIComponent(color)}&stroke-width=${strokeWidth}`;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    fetch(iconUrl, { headers: { Accept: "image/svg+xml" } })
      .then((res) => res.text())
      .then(setSvgContent)
      .catch(() => setSvgContent(null));
  }, [iconUrl]);

  const handleCopy = useCallback(() => {
    const code = generateCode(icon, size, color, strokeWidth, activeTab, svgContent || undefined);
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [icon, size, color, strokeWidth, activeTab, svgContent]);

  const handleDownload = useCallback(async () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${icon.name}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [icon.name, svgContent]);

  const tabs: { id: CodeTab; label: string }[] = [
    { id: "url", label: "URL" },
    { id: "curl", label: "curl" },
    { id: "html", label: "HTML" },
    { id: "react", label: "React" },
    { id: "svg", label: "SVG" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm dark:bg-black/70"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={clsx(
          "relative w-full max-w-2xl rounded-3xl border shadow-2xl",
          "border-black/10 bg-sand dark:border-white/10 dark:bg-surface"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate transition hover:bg-white/80 hover:text-ink dark:hover:bg-white/10 dark:hover:text-sand"
          aria-label="Close modal"
        >
          <CloseIcon />
        </motion.button>

        <div className="p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className={clsx(
                "flex h-32 w-32 shrink-0 items-center justify-center rounded-2xl border",
                "border-black/10 bg-white/80 dark:border-white/10 dark:bg-white/5"
              )}
            >
              <div className="relative h-20 w-20">
                {!imageLoaded && (
                  <div className="absolute inset-0 animate-pulse rounded-lg bg-black/10 dark:bg-white/10" />
                )}
                <img
                  src={iconUrl}
                  alt={icon.name}
                  width={80}
                  height={80}
                  className={clsx(
                    "h-full w-full transition-opacity",
                    imageLoaded ? "opacity-100" : "opacity-0"
                  )}
                  onLoad={() => setImageLoaded(true)}
                />
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="flex-1"
            >
              <h2 className="font-display text-2xl font-semibold text-ink dark:text-sand">
                {icon.name}
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="rounded-full bg-teal/10 px-2.5 py-1 text-xs font-medium text-teal"
                >
                  {icon.source}
                </motion.span>
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25 }}
                  className="rounded-full bg-amber/10 px-2.5 py-1 text-xs font-medium text-amber"
                >
                  {icon.category}
                </motion.span>
              </div>
              {icon.tags.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-3 flex flex-wrap gap-1.5"
                >
                  {icon.tags.slice(0, 6).map((tag, index) => (
                    <motion.span
                      key={tag}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + index * 0.05 }}
                      className={clsx(
                        "rounded-full border px-2 py-0.5 text-[10px]",
                        "border-black/10 text-slate dark:border-white/10 dark:text-slate/70"
                      )}
                    >
                      {tag}
                    </motion.span>
                  ))}
                </motion.div>
              )}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-6 grid gap-4 sm:grid-cols-3"
          >
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-slate">
                Size
              </label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="range"
                  min={16}
                  max={128}
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                  className="flex-1 accent-teal"
                />
                <span className="w-10 text-right text-sm font-medium text-ink dark:text-sand">
                  {size}px
                </span>
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-slate">
                Stroke Width
              </label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="range"
                  min={0.5}
                  max={4}
                  step={0.5}
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  className="flex-1 accent-teal"
                />
                <span className="w-10 text-right text-sm font-medium text-ink dark:text-sand">
                  {strokeWidth}
                </span>
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-slate">
                Color
              </label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className={clsx(
                    "h-8 w-12 cursor-pointer rounded border",
                    "border-black/10 dark:border-white/20"
                  )}
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className={clsx(
                    "flex-1 rounded-lg border px-2 py-1.5 text-sm",
                    "border-black/20 bg-white/90 text-ink dark:border-white/20 dark:bg-ink/50 dark:text-sand"
                  )}
                />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6"
          >
            <div
              className={clsx(
                "flex items-center gap-1 border-b",
                "border-black/10 dark:border-white/10"
              )}
            >
              {tabs.map((tab, index) => (
                <motion.button
                  key={tab.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    "px-3 py-2 text-xs font-medium transition",
                    activeTab === tab.id
                      ? "border-b-2 border-teal text-teal"
                      : "text-slate hover:text-ink dark:hover:text-sand"
                  )}
                >
                  {tab.label}
                </motion.button>
              ))}
            </div>
            <div className="relative mt-3">
              <AnimatePresence mode="wait">
                <motion.pre
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="overflow-x-auto rounded-xl bg-ink p-4 text-xs text-sand"
                >
                  <code>
                    {generateCode(icon, size, color, strokeWidth, activeTab, svgContent || undefined)}
                  </code>
                </motion.pre>
              </AnimatePresence>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCopy}
                className={clsx(
                  "absolute right-2 top-2 rounded-lg px-2 py-1.5 text-xs font-medium transition",
                  copied
                    ? "bg-teal text-white"
                    : "bg-white/10 text-sand hover:bg-white/20"
                )}
              >
                <span className="flex items-center gap-1.5">
                  {copied ? <CheckIcon /> : <CopyIcon />}
                  {copied ? "Copied" : "Copy"}
                </span>
              </motion.button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="mt-6 flex gap-3"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDownload}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-sand transition hover:bg-ink/90 dark:bg-teal dark:text-white dark:hover:bg-teal/90"
            >
              <DownloadIcon />
              Download SVG
            </motion.button>
            <motion.a
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              href={`/icons/${icon.name}?source=${icon.source}`}
              className={clsx(
                "flex items-center justify-center rounded-full border px-4 py-2.5 text-sm font-semibold transition",
                "border-ink/20 text-ink hover:border-ink/40 dark:border-white/20 dark:text-sand dark:hover:border-white/40"
              )}
            >
              View Details
            </motion.a>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};
