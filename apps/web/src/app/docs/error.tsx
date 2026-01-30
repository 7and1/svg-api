"use client";

import { useEffect } from "react";

export default function DocsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Docs page error:", error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-14 md:px-8">
      <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
        {/* Sidebar placeholder */}
        <aside className="hidden lg:block" />

        {/* Error content */}
        <div className="min-w-0">
          <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-3xl border border-black/10 bg-white/80 p-8 text-center">
            <div className="rounded-full bg-amber-100 p-4 dark:bg-amber-900/20">
              <svg
                className="h-8 w-8 text-amber-600 dark:text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>

            <h1 className="mt-6 font-display text-2xl font-semibold">
              Documentation unavailable
            </h1>

            <p className="mt-2 max-w-md text-slate">
              We could not load the documentation. This might be due to a
              network issue or temporary server problem.
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
      </div>
    </div>
  );
}
