import Link from "next/link";

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

const HeartIcon = () => (
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
      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
    />
  </svg>
);

export const Footer = () => (
  <footer className="border-t border-black/10 bg-mist/60">
    <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-8">
      <div className="grid gap-8 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink font-display text-lg text-sand">
              S
            </div>
            <span className="text-xl font-semibold tracking-tight">
              SVG API
            </span>
          </div>
          <p className="mt-4 max-w-md text-sm text-slate">
            Universal SVG icon API. Access 22k+ icons from one endpoint. Zero
            dependencies. Built for speed on Cloudflare Workers.
          </p>
          <div className="mt-6 flex items-center gap-4">
            <a
              href="https://github.com/nicepkg/svg-api"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-full border border-black/20 px-3 py-1.5 text-sm font-medium text-ink transition hover:border-black/40"
            >
              <GitHubIcon />
              Star on GitHub
            </a>
            <a
              href="https://twitter.com/nicepkg"
              target="_blank"
              rel="noreferrer"
              className="text-slate transition hover:text-ink"
              aria-label="Twitter"
            >
              <TwitterIcon />
            </a>
          </div>
        </div>
        <div className="space-y-3 text-sm">
          <h4 className="font-semibold">Product</h4>
          <Link
            href="/docs"
            className="block text-slate transition hover:text-teal"
          >
            Documentation
          </Link>
          <Link
            href="/icons"
            className="block text-slate transition hover:text-teal"
          >
            Icon Browser
          </Link>
          <Link
            href="/playground"
            className="block text-slate transition hover:text-teal"
          >
            Playground
          </Link>
          <a
            href="https://github.com/nicepkg/svg-api/releases"
            target="_blank"
            rel="noreferrer"
            className="block text-slate transition hover:text-teal"
          >
            Changelog
          </a>
        </div>
        <div className="space-y-3 text-sm">
          <h4 className="font-semibold">Legal</h4>
          <Link
            href="/terms"
            className="block text-slate transition hover:text-teal"
          >
            Terms of Service
          </Link>
          <Link
            href="/privacy"
            className="block text-slate transition hover:text-teal"
          >
            Privacy Policy
          </Link>
          <Link
            href="/licenses"
            className="block text-slate transition hover:text-teal"
          >
            Icon Licenses
          </Link>
        </div>
      </div>
      <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-black/10 pt-6 text-xs text-slate md:flex-row md:items-center">
        <div className="flex items-center gap-1">
          <span>Built with</span>
          <HeartIcon />
          <span>by</span>
          <a
            href="https://github.com/nicepkg"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-ink transition hover:text-teal"
          >
            nicepkg
          </a>
          <span>. MIT licensed.</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-teal/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.15em] text-teal">
            Status: Operational
          </span>
          <span>v1.0.0</span>
        </div>
      </div>
    </div>
  </footer>
);
