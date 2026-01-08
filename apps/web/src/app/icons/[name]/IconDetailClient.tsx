"use client";

import { useState, useCallback } from "react";
import clsx from "clsx";
import { API_BASE } from "../../../lib/constants";

interface IconData {
  name: string;
  source: string;
  category: string;
  tags: string[];
}

type CodeTab = "url" | "curl" | "html" | "react";

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

const DownloadIcon = () => (
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
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  </svg>
);

const generateCode = (
  icon: IconData,
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

export function IconDetailClient({ icon }: { icon: IconData }) {
  const [size, setSize] = useState(48);
  const [color, setColor] = useState("#0b1020");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [activeTab, setActiveTab] = useState<CodeTab>("url");
  const [copied, setCopied] = useState(false);

  const iconUrl = `${API_BASE}/icons/${icon.name}?source=${icon.source}&size=${size}&color=${encodeURIComponent(color)}&stroke-width=${strokeWidth}`;

  const handleCopy = useCallback(() => {
    const code = generateCode(icon, size, color, strokeWidth, activeTab);
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [icon, size, color, strokeWidth, activeTab]);

  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(iconUrl, {
        headers: { Accept: "image/svg+xml" },
      });
      const svg = await response.text();
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${icon.name}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  }, [icon.name, iconUrl]);

  const tabs: { id: CodeTab; label: string }[] = [
    { id: "url", label: "URL" },
    { id: "curl", label: "curl" },
    { id: "html", label: "HTML" },
    { id: "react", label: "React" },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-black/10 bg-white/80 p-6">
        <h2 className="text-lg font-semibold">Customize</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
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
              <span className="w-14 text-right text-sm font-medium">
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
              <span className="w-14 text-right text-sm font-medium">
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
                className="h-8 w-12 cursor-pointer rounded border border-black/10"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 rounded-lg border border-black/20 bg-white/90 px-2 py-1.5 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center rounded-2xl border border-dashed border-black/20 bg-sand/40 p-8">
          <img
            src={iconUrl}
            alt={icon.name}
            style={{ width: size, height: size }}
          />
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleDownload}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-sand transition hover:bg-ink/90"
          >
            <DownloadIcon />
            Download SVG
          </button>
          <button
            onClick={handleCopy}
            className={clsx(
              "flex items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition",
              copied
                ? "border-teal bg-teal/10 text-teal"
                : "border-ink/20 text-ink hover:border-ink/40",
            )}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? "Copied" : "Copy URL"}
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-black/10 bg-white/80 p-6">
        <h2 className="text-lg font-semibold">Use this icon</h2>
        <div className="mt-4 flex items-center gap-1 border-b border-black/10">
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
        <div className="relative mt-4">
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
    </div>
  );
}
