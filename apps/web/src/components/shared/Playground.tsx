"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { API_BASE } from "../../lib/constants";

type CodeTab = "curl" | "html" | "react" | "fetch";

interface HistoryItem {
  id: string;
  name: string;
  source: string;
  size: number;
  color: string;
  strokeWidth: number;
  timestamp: number;
}

/**
 * Basic SVG sanitizer - removes script tags and event handlers
 * For production, consider using DOMPurify
 */
const sanitizeSvg = (svg: string): string => {
  // Remove script tags
  let clean = svg.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    "",
  );
  // Remove event handlers (onclick, onload, onerror, etc.)
  clean = clean.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "");
  // Remove javascript: URLs
  clean = clean.replace(/javascript:/gi, "");
  // Remove data: URLs in href/xlink:href (can contain JS)
  clean = clean.replace(/href\s*=\s*["']data:[^"']*["']/gi, 'href=""');
  return clean;
};

const CopyIcon = () => (
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
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const ClockIcon = () => (
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
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const TrashIcon = () => (
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
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

const generateCode = (
  name: string,
  source: string,
  size: number,
  color: string,
  strokeWidth: number,
  tab: CodeTab,
): string => {
  const encodedColor = encodeURIComponent(color);
  const baseUrl = `${API_BASE}/icons/${name}?source=${source}&size=${size}&color=${encodedColor}&stroke-width=${strokeWidth}`;

  switch (tab) {
    case "curl":
      return `curl "${baseUrl}" -o ${name}.svg`;
    case "html":
      return `<img src="${baseUrl}" alt="${name}" width="${size}" height="${size}" />`;
    case "react":
      return `export const ${name.charAt(0).toUpperCase() + name.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase())}Icon = () => (
  <img
    src="${baseUrl}"
    alt="${name}"
    width={${size}}
    height={${size}}
  />
);`;
    case "fetch":
      return `const response = await fetch("${baseUrl}", {
  headers: { Accept: "image/svg+xml" }
});
const svg = await response.text();`;
    default:
      return baseUrl;
  }
};

const STORAGE_KEY = "svg-api-playground-history";

const loadHistory = (): HistoryItem[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveHistory = (history: HistoryItem[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 20)));
  } catch {
    // Ignore storage errors
  }
};

export const Playground = () => {
  const [name, setName] = useState("home");
  const [source, setSource] = useState("lucide");
  const [size, setSize] = useState(48);
  const [color, setColor] = useState("#0b1020");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<CodeTab>("curl");
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const url = `${API_BASE}/icons/${name}?source=${source}&size=${size}&color=${encodeURIComponent(color)}&stroke-width=${strokeWidth}`;

  const run = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(url, {
        headers: { Accept: "image/svg+xml" },
      });
      if (!response.ok) {
        setError(`Request failed (${response.status})`);
        setLoading(false);
        return;
      }
      const text = await response.text();
      setSvg(sanitizeSvg(text));

      const newItem: HistoryItem = {
        id: `${Date.now()}`,
        name,
        source,
        size,
        color,
        strokeWidth,
        timestamp: Date.now(),
      };
      const newHistory = [
        newItem,
        ...history.filter(
          (h) =>
            !(
              h.name === name &&
              h.source === source &&
              h.size === size &&
              h.color === color
            ),
        ),
      ].slice(0, 20);
      setHistory(newHistory);
      saveHistory(newHistory);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = useCallback(() => {
    const code = generateCode(
      name,
      source,
      size,
      color,
      strokeWidth,
      activeTab,
    );
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [name, source, size, color, strokeWidth, activeTab]);

  const handleCopyUrl = useCallback(() => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [url]);

  const loadFromHistory = (item: HistoryItem) => {
    setName(item.name);
    setSource(item.source);
    setSize(item.size);
    setColor(item.color);
    setStrokeWidth(item.strokeWidth);
    setShowHistory(false);
  };

  const clearHistory = () => {
    setHistory([]);
    saveHistory([]);
  };

  const tabs: { id: CodeTab; label: string }[] = [
    { id: "curl", label: "curl" },
    { id: "html", label: "HTML" },
    { id: "react", label: "React" },
    { id: "fetch", label: "fetch" },
  ];

  return (
    <div className="rounded-3xl border border-black/10 bg-white/80 p-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">API Playground</h2>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={clsx(
            "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
            showHistory
              ? "border-teal bg-teal/10 text-teal"
              : "border-black/20 text-slate hover:border-black/40",
          )}
        >
          <ClockIcon />
          History ({history.length})
        </button>
      </div>

      {showHistory && history.length > 0 && (
        <div className="mb-6 rounded-xl border border-black/10 bg-sand/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate">
              Recent Requests
            </span>
            <button
              onClick={clearHistory}
              className="flex items-center gap-1 text-xs text-slate transition hover:text-ink"
            >
              <TrashIcon />
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.slice(0, 10).map((item) => (
              <button
                key={item.id}
                onClick={() => loadFromHistory(item)}
                className="rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs transition hover:border-teal"
              >
                <span className="font-medium">{item.name}</span>
                <span className="ml-1 text-slate">({item.source})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate">
              Icon name
            </label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-black/20 bg-white/90 px-4 py-2 text-sm focus:border-teal focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate">
              Source
            </label>
            <select
              value={source}
              onChange={(event) => setSource(event.target.value)}
              className="mt-2 w-full rounded-xl border border-black/20 bg-white/90 px-4 py-2 text-sm focus:border-teal focus:outline-none"
            >
              <option value="lucide">Lucide</option>
              <option value="heroicons">Heroicons</option>
              <option value="tabler">Tabler</option>
              <option value="feather">Feather</option>
              <option value="phosphor">Phosphor</option>
              <option value="radix">Radix</option>
              <option value="bootstrap">Bootstrap</option>
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
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
                  onChange={(event) => setSize(Number(event.target.value))}
                  className="flex-1 accent-teal"
                />
                <span className="w-12 text-right text-sm">{size}px</span>
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
                  onChange={(event) =>
                    setStrokeWidth(Number(event.target.value))
                  }
                  className="flex-1 accent-teal"
                />
                <span className="w-12 text-right text-sm">{strokeWidth}</span>
              </div>
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
                onChange={(event) => setColor(event.target.value)}
                className="h-10 w-14 cursor-pointer rounded border border-black/10"
              />
              <input
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="flex-1 rounded-xl border border-black/20 bg-white/90 px-4 py-2 text-sm focus:border-teal focus:outline-none"
              />
            </div>
          </div>
          <button
            onClick={run}
            disabled={loading}
            className={clsx(
              "w-full rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-sand transition",
              loading ? "opacity-70" : "hover:bg-ink/90",
            )}
          >
            {loading ? "Loading..." : "Run Request"}
          </button>
          {error && <p className="text-xs text-amber">{error}</p>}
        </div>

        <div className="flex flex-col">
          <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-black/20 bg-sand/60 p-6">
            {svg ? (
              <div
                className="flex items-center justify-center"
                style={{ width: size, height: size }}
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            ) : (
              <p className="text-sm text-slate">
                Run a request to preview the SVG
              </p>
            )}
          </div>
          {svg && (
            <button
              onClick={handleCopyUrl}
              className="mt-3 flex items-center justify-center gap-2 rounded-full border border-black/20 px-4 py-2 text-xs font-medium text-slate transition hover:border-black/40 hover:text-ink"
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
              {copied ? "Copied URL" : "Copy URL"}
            </button>
          )}
        </div>
      </div>

      {svg && (
        <div className="mt-6">
          <div className="flex items-center justify-between border-b border-black/10">
            <div className="flex items-center gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    "px-3 py-2 text-xs font-medium transition",
                    activeTab === tab.id
                      ? "border-b-2 border-teal text-teal"
                      : "text-slate hover:text-ink",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              onClick={handleCopy}
              className={clsx(
                "flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition",
                copied
                  ? "bg-teal text-white"
                  : "bg-ink/10 text-ink hover:bg-ink/20",
              )}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-ink p-4 text-xs text-sand">
            <code>
              {generateCode(name, source, size, color, strokeWidth, activeTab)}
            </code>
          </pre>
        </div>
      )}
    </div>
  );
};
