"use client";

import { useEffect } from "react";

export default function IconsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service
    console.error("Icons page error:", error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/20">
          <svg
            className="h-8 w-8 text-red-600 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h1 className="mt-6 font-display text-2xl font-semibold">
          Failed to load icons
        </h1>

        <p className="mt-2 max-w-md text-slate">
          We encountered an error while loading the icon browser. This might be
          a temporary issue with our servers or your connection.
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
