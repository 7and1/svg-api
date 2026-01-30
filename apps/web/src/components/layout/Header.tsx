"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import clsx from "clsx";
import { ThemeToggle } from "../theme/ThemeToggle";

const Logo = () => (
  <div className="flex items-center gap-3">
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink font-display text-lg text-sand">
      S
    </div>
    <span className="text-xl font-semibold tracking-tight">SVG API</span>
  </div>
);

const MenuIcon = () => (
  <svg
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 6h16M4 12h16M4 18h16"
    />
  </svg>
);

const CloseIcon = () => (
  <svg
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

const SearchIcon = () => (
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
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const GitHubIcon = () => (
  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
    <path
      fillRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      clipRule="evenodd"
    />
  </svg>
);

const TwitterIcon = () => (
  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const navLinks = [
  { href: "/docs", label: "Docs" },
  { href: "/icons", label: "Icons" },
  { href: "/favorites", label: "Favorites" },
  { href: "/playground", label: "Playground" },
];

export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { theme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-sand/90 backdrop-blur dark:border-white/10 dark:bg-surface/90">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:px-8">
        <Link
          href="/"
          aria-label="SVG API home"
          className="flex items-center gap-3"
        >
          <Logo />
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "transition",
                pathname === link.href
                  ? "text-teal"
                  : "text-ink hover:text-teal",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <Link
            href="/icons"
            className="flex items-center gap-2 rounded-full border border-black/20 px-3 py-1.5 text-sm text-slate transition hover:border-black/40 hover:text-ink dark:border-white/20"
          >
            <SearchIcon />
            <span>Search icons</span>
            <kbd className="ml-1 rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-medium dark:bg-white/10">
              /
            </kbd>
          </Link>
          <a
            href="https://github.com/nicepkg/svg-api"
            target="_blank"
            rel="noreferrer"
            className="text-slate transition hover:text-ink dark:hover:text-sand"
            aria-label="GitHub"
          >
            <GitHubIcon />
          </a>
          <a
            href="https://twitter.com/nicepkg"
            target="_blank"
            rel="noreferrer"
            className="text-slate transition hover:text-ink dark:hover:text-sand"
            aria-label="Twitter"
          >
            <TwitterIcon />
          </a>
          <ThemeToggle />
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="rounded-lg p-2 text-ink transition hover:bg-black/5 md:hidden"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-x-0 bottom-0 top-16 z-40 bg-sand/95 backdrop-blur dark:bg-surface/95 md:hidden">
          <nav className="flex flex-col p-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "rounded-xl px-4 py-3 text-lg font-medium transition",
                  pathname === link.href
                    ? "bg-teal/10 text-teal"
                    : "text-ink hover:bg-black/5 dark:text-sand dark:hover:bg-white/10",
                )}
              >
                {link.label}
              </Link>
            ))}
            <hr className="my-4 border-black/10 dark:border-white/10" />
            <Link
              href="/icons"
              className="flex items-center gap-2 rounded-xl bg-white/80 px-4 py-3 text-sm font-medium text-ink transition hover:bg-white dark:bg-white/10 dark:text-sand dark:hover:bg-white/20"
            >
              <SearchIcon />
              Search icons...
            </Link>
            <div className="mt-4 flex items-center justify-between px-4">
              <div className="flex items-center gap-4">
                <a
                  href="https://github.com/nicepkg/svg-api"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-slate transition hover:text-ink dark:hover:text-sand"
                >
                  <GitHubIcon />
                  GitHub
                </a>
                <a
                  href="https://twitter.com/nicepkg"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-slate transition hover:text-ink dark:hover:text-sand"
                >
                  <TwitterIcon />
                  Twitter
                </a>
              </div>
              <ThemeToggle />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
