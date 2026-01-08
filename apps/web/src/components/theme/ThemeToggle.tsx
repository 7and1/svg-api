"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import clsx from "clsx";

const SunIcon = () => (
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
      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);

const MoonIcon = () => (
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
      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
    />
  </svg>
);

const SystemIcon = () => (
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
      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-9 w-9 rounded-lg bg-black/5" aria-hidden="true" />;
  }

  const themes = [
    { id: "light", label: "Light", icon: SunIcon },
    { id: "dark", label: "Dark", icon: MoonIcon },
    { id: "system", label: "System", icon: SystemIcon },
  ] as const;

  const activeTheme = themes.find((t) => t.id === theme) || themes[2];
  const ActiveIcon = activeTheme.icon;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-lg p-2 text-ink transition hover:bg-black/5 dark:text-sand dark:hover:bg-white/10"
        aria-label="Toggle theme"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <ActiveIcon />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            className="absolute right-0 top-full z-20 mt-2 w-36 rounded-xl border border-black/10 bg-white/95 p-1.5 shadow-lg backdrop-blur dark:border-white/10 dark:bg-ink/95"
            role="menu"
            aria-label="Theme options"
          >
            {themes.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  setTheme(id);
                  setIsOpen(false);
                }}
                className={clsx(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
                  theme === id
                    ? "bg-teal/10 text-teal dark:bg-teal/20"
                    : "text-slate hover:bg-black/5 dark:hover:bg-white/10",
                )}
                role="menuitem"
              >
                <Icon />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
