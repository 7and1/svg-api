"use client";

import { useEffect, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import clsx from "clsx";
import { API_BASE } from "../../lib/constants";

interface IconResult {
  name: string;
  source: string;
  category: string;
  tags: string[];
}

type CodeTab = "url" | "curl" | "html" | "react";

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
): string => {
  const encodedColor = encodeURIComponent(color);
  const baseUrl = `${API_BASE}/icons/${icon.name}?source=${icon.source}&size=${size}&color=${encodedColor}&stroke-width=${strokeWidth}`;

  switch (tab) {
    case "url":
      return baseUrl;
    case "curl":
      return `curl "${baseUrl}" -o ${icon.name}.svg`;
    case "html":
      return `<img src="${baseUrl}" alt="${icon.name}" width="${size}" height="${size}" />`;
    case "react":
      return `export const ${icon.name.charAt(0).toUpperCase() + icon.name.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase())}Icon = () => (
  <img
    src="${baseUrl}"
    alt="${icon.name}"
    width={${size}}
    height={${size}}
  />
);`;
    default:
      return baseUrl;
  }
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
    const code = generateCode(icon, size, color, strokeWidth, activeTab);
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [icon, size, color, strokeWidth, activeTab]);

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
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm dark:bg-black/70">
      <div
        className={clsx(
          "relative w-full max-w-2xl rounded-3xl border shadow-2xl",
          "border-black/10 bg-sand dark:border-white/10 dark:bg-surface",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate transition hover:bg-white/80 hover:text-ink dark:hover:bg-white/10 dark:hover:text-sand"
          aria-label="Close modal"
        >
          <CloseIcon />
        </button>

        <div className="p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <div
              className={clsx(
                "flex h-32 w-32 shrink-0 items-center justify-center rounded-2xl border",
                "border-black/10 bg-white/80 dark:border-white/10 dark:bg-white/5",
              )}
            >
              <img src={iconUrl} alt={icon.name} className="h-20 w-20" />
            </div>
            <div className="flex-1">
              <h2 className="font-display text-2xl font-semibold text-ink dark:text-sand">
                {icon.name}
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-teal/10 px-2.5 py-1 text-xs font-medium text-teal">
                  {icon.source}
                </span>
                <span className="rounded-full bg-amber/10 px-2.5 py-1 text-xs font-medium text-amber">
                  {icon.category}
                </span>
              </div>
              {icon.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {icon.tags.slice(0, 6).map((tag) => (
                    <span
                      key={tag}
                      className={clsx(
                        "rounded-full border px-2 py-0.5 text-[10px]",
                        "border-black/10 text-slate dark:border-white/10 dark:text-slate/70",
                      )}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
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
                    "border-black/10 dark:border-white/20",
                  )}
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className={clsx(
                    "flex-1 rounded-lg border px-2 py-1.5 text-sm",
                    "border-black/20 bg-white/90 text-ink dark:border-white/20 dark:bg-ink/50 dark:text-sand",
                  )}
                />
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div
              className={clsx(
                "flex items-center gap-1 border-b",
                "border-black/10 dark:border-white/10",
              )}
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    "px-3 py-2 text-xs font-medium transition",
                    activeTab === tab.id
                      ? "border-b-2 border-teal text-teal"
                      : "text-slate hover:text-ink dark:hover:text-sand",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="relative mt-3">
              <pre className="overflow-x-auto rounded-xl bg-ink p-4 text-xs text-sand">
                <code>
                  {generateCode(icon, size, color, strokeWidth, activeTab)}
                </code>
              </pre>
              <button
                onClick={handleCopy}
                className={clsx(
                  "absolute right-2 top-2 rounded-lg px-2 py-1.5 text-xs font-medium transition",
                  copied
                    ? "bg-teal text-white"
                    : "bg-white/10 text-sand hover:bg-white/20",
                )}
              >
                <span className="flex items-center gap-1.5">
                  {copied ? <CheckIcon /> : <CopyIcon />}
                  {copied ? "Copied" : "Copy"}
                </span>
              </button>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleDownload}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-sand transition hover:bg-ink/90 dark:bg-teal dark:text-white dark:hover:bg-teal/90"
            >
              <DownloadIcon />
              Download SVG
            </button>
            <a
              href={`/icons/${icon.name}?source=${icon.source}`}
              className={clsx(
                "flex items-center justify-center rounded-full border px-4 py-2.5 text-sm font-semibold transition",
                "border-ink/20 text-ink hover:border-ink/40 dark:border-white/20 dark:text-sand dark:hover:border-white/40",
              )}
            >
              View Details
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
