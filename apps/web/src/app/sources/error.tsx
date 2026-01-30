"use client";

import { useEffect } from "react";

export default function SourcesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Sources page error:", error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 md:px-8">
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="rounded-full bg-teal-100 p-4 dark:bg-teal-900/20">
          <svg
            className="h-8 w-8 text-teal-600 dark:text-teal-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>

        <h1 className="mt-6 font-display text-2xl font-semibold">
          Could not load sources
        </h1>

        <p className="mt-2 max-w-md text-slate">
          We were unable to retrieve the icon library information. Please check
          your connection and try again.
        </p>

        {error.digest && (
          <p className="mt-4 text-xs text-slate/60">
            Error ID: {error.digest}
          </p>
        )}

        <div className="mt-8 flex gap-3">
          <button
            onClick={reset}
            className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-sand transition hover:bg-black/80 hover:scale-105 active:scale-95"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-full border border-ink/20 px-6 py-3 text-sm font-semibold text-ink transition hover:border-ink/50 hover:bg-white/50"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
