"use client";

import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-6xl flex-col items-center justify-center px-4 py-20 text-center md:px-8">
      <div className="rounded-3xl border border-black/10 bg-white/80 p-12 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber/10">
          <svg
            className="h-10 w-10 text-amber"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="mt-6 font-display text-3xl font-semibold text-ink dark:text-sand">
          You are offline
        </h1>
        <p className="mt-4 max-w-md text-slate">
          It looks like you have lost your internet connection. Some features
          may be unavailable until you reconnect.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <ReloadButton />
          <Link
            href="/"
            className="rounded-full border border-ink/20 px-6 py-3 text-sm font-semibold text-ink transition hover:border-ink/40 dark:border-white/20 dark:text-sand dark:hover:border-white/40"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ReloadButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-sand transition hover:bg-ink/90 dark:bg-teal dark:text-white dark:hover:bg-teal/90"
    >
      Try Again
    </button>
  );
}
