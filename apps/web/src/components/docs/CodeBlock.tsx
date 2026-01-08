"use client";

import { useState } from "react";
import clsx from "clsx";

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
}

const languageLabels: Record<string, string> = {
  bash: "Terminal",
  curl: "cURL",
  html: "HTML",
  jsx: "React",
  tsx: "React",
  vue: "Vue",
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  json: "JSON",
};

export function CodeBlock({
  code,
  language = "bash",
  filename,
  showLineNumbers = false,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split("\n");

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-ink">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500/60" />
            <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
            <div className="h-3 w-3 rounded-full bg-green-500/60" />
          </div>
          {filename && (
            <span className="ml-2 text-xs text-white/50">{filename}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-wider text-white/40">
            {languageLabels[language] || language}
          </span>
          <button
            onClick={handleCopy}
            className={clsx(
              "rounded-lg px-2.5 py-1 text-xs font-medium transition",
              copied
                ? "bg-teal/20 text-teal"
                : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white",
            )}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed text-sand">
        <code>
          {lines.map((line, i) => (
            <div key={i} className="table-row">
              {showLineNumbers && (
                <span className="table-cell select-none pr-4 text-right text-white/30">
                  {i + 1}
                </span>
              )}
              <span className="table-cell">{line}</span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}
