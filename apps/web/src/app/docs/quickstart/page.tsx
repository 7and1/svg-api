import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "../../../components/docs";

export const metadata: Metadata = {
  title: "Quick Start",
  description:
    "Get started with SVG API in under 5 minutes. Learn how to fetch icons and customize them.",
};

export default function QuickstartPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate">
          Getting Started
        </p>
        <h1 className="font-display text-3xl font-semibold md:text-4xl">
          Quick Start
        </h1>
        <p className="mt-3 text-slate">
          Get up and running with SVG API in under 5 minutes. No signup, no API
          key, no dependencies.
        </p>
      </div>

      <section className="rounded-3xl border border-black/10 bg-white/80 p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal text-sm font-bold text-white">
            1
          </span>
          <h2 className="font-display text-xl font-semibold">
            Fetch your first icon
          </h2>
        </div>
        <p className="mt-4 text-sm text-slate">
          The simplest way to use SVG API is with a direct URL. Every icon is
          available at:
        </p>
        <div className="mt-4">
          <CodeBlock
            code="https://svg-api.org/v1/icons/{name}?source={source}"
            language="bash"
          />
        </div>
        <p className="mt-4 text-sm text-slate">Try it in your browser:</p>
        <div className="mt-4">
          <CodeBlock
            code="https://svg-api.org/v1/icons/home?source=lucide"
            language="bash"
          />
        </div>
        <div className="mt-4 flex items-center gap-4 rounded-2xl border border-black/10 bg-white/70 p-4">
          <img
            src="https://svg-api.org/v1/icons/home?source=lucide&size=48"
            alt="Home icon"
            className="h-12 w-12"
          />
          <div className="text-sm text-slate">
            This is the Lucide home icon rendered at 48px
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-black/10 bg-white/80 p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal text-sm font-bold text-white">
            2
          </span>
          <h2 className="font-display text-xl font-semibold">
            Use in your HTML
          </h2>
        </div>
        <p className="mt-4 text-sm text-slate">
          Add icons directly to any HTML page using an img tag:
        </p>
        <div className="mt-4">
          <CodeBlock
            code={`<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
</head>
<body>
  <nav>
    <a href="/">
      <img src="https://svg-api.org/v1/icons/home?source=lucide" alt="Home" />
      Home
    </a>
    <a href="/settings">
      <img src="https://svg-api.org/v1/icons/settings?source=lucide" alt="Settings" />
      Settings
    </a>
  </nav>
</body>
</html>`}
            language="html"
          />
        </div>
      </section>

      <section className="rounded-3xl border border-black/10 bg-white/80 p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal text-sm font-bold text-white">
            3
          </span>
          <h2 className="font-display text-xl font-semibold">
            Customize your icons
          </h2>
        </div>
        <p className="mt-4 text-sm text-slate">
          Use query parameters to customize size, color, and stroke width:
        </p>
        <div className="mt-4">
          <CodeBlock
            code={`# Change size (8-512px)
https://svg-api.org/v1/icons/heart?source=lucide&size=32

# Change color (hex, URL-encoded)
https://svg-api.org/v1/icons/heart?source=lucide&color=%23ef4444

# Change stroke width (0.5-3)
https://svg-api.org/v1/icons/heart?source=lucide&stroke=1.5

# Combine all options
https://svg-api.org/v1/icons/heart?source=lucide&size=48&color=%23ef4444&stroke=2`}
            language="bash"
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-6 rounded-2xl border border-black/10 bg-white/70 p-4">
          <div className="text-center">
            <img
              src="https://svg-api.org/v1/icons/heart?source=lucide&size=24"
              alt="Heart"
              className="mx-auto h-6 w-6"
            />
            <div className="mt-1 text-xs text-slate">24px</div>
          </div>
          <div className="text-center">
            <img
              src="https://svg-api.org/v1/icons/heart?source=lucide&size=32"
              alt="Heart"
              className="mx-auto h-8 w-8"
            />
            <div className="mt-1 text-xs text-slate">32px</div>
          </div>
          <div className="text-center">
            <img
              src="https://svg-api.org/v1/icons/heart?source=lucide&size=48"
              alt="Heart"
              className="mx-auto h-12 w-12"
            />
            <div className="mt-1 text-xs text-slate">48px</div>
          </div>
          <div className="text-center">
            <img
              src="https://svg-api.org/v1/icons/heart?source=lucide&size=48&color=%23ef4444"
              alt="Heart"
              className="mx-auto h-12 w-12"
            />
            <div className="mt-1 text-xs text-slate">Red</div>
          </div>
          <div className="text-center">
            <img
              src="https://svg-api.org/v1/icons/heart?source=lucide&size=48&color=%233b82f6"
              alt="Heart"
              className="mx-auto h-12 w-12"
            />
            <div className="mt-1 text-xs text-slate">Blue</div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-black/10 bg-white/80 p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal text-sm font-bold text-white">
            4
          </span>
          <h2 className="font-display text-xl font-semibold">
            Search for icons
          </h2>
        </div>
        <p className="mt-4 text-sm text-slate">
          Use the search endpoint to find icons by name, tag, or keyword:
        </p>
        <div className="mt-4">
          <CodeBlock
            code={`curl "https://svg-api.org/v1/search?q=arrow"

# Filter by source
curl "https://svg-api.org/v1/search?q=arrow&source=lucide"

# Limit results
curl "https://svg-api.org/v1/search?q=arrow&limit=10"`}
            language="bash"
          />
        </div>
        <p className="mt-4 text-sm text-slate">
          The response includes icon names, sources, and relevance scores:
        </p>
        <div className="mt-4">
          <CodeBlock
            code={`{
  "data": [
    {
      "name": "arrow-right",
      "source": "lucide",
      "category": "arrows",
      "score": 0.95
    },
    {
      "name": "arrow-left",
      "source": "lucide",
      "category": "arrows",
      "score": 0.93
    }
  ],
  "meta": {
    "total": 156,
    "limit": 20,
    "offset": 0
  }
}`}
            language="json"
          />
        </div>
      </section>

      <section className="rounded-3xl border border-black/10 bg-white/80 p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal text-sm font-bold text-white">
            5
          </span>
          <h2 className="font-display text-xl font-semibold">
            Choose your icon source
          </h2>
        </div>
        <p className="mt-4 text-sm text-slate">
          SVG API supports multiple icon libraries. Use the{" "}
          <code className="rounded bg-ink/10 px-1">source</code> parameter to
          pick your favorite:
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-black/10 bg-white/70 p-4">
            <div className="font-medium">lucide</div>
            <div className="text-sm text-slate">
              Beautiful & consistent icons
            </div>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white/70 p-4">
            <div className="font-medium">tabler</div>
            <div className="text-sm text-slate">5,000+ free icons</div>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white/70 p-4">
            <div className="font-medium">heroicons</div>
            <div className="text-sm text-slate">By the Tailwind team</div>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white/70 p-4">
            <div className="font-medium">phosphor</div>
            <div className="text-sm text-slate">Flexible icon family</div>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate">
          <Link href="/docs/sources" className="text-teal hover:underline">
            See all available sources
          </Link>
        </p>
      </section>

      <section className="rounded-3xl border border-teal/20 bg-teal/5 p-6">
        <h2 className="font-display text-xl font-semibold">Next steps</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Link
            href="/docs/api"
            className="rounded-2xl border border-black/10 bg-white/80 p-4 transition hover:border-teal/30"
          >
            <div className="font-medium">API Reference</div>
            <div className="text-sm text-slate">
              Full documentation for all endpoints
            </div>
          </Link>
          <Link
            href="/docs/examples"
            className="rounded-2xl border border-black/10 bg-white/80 p-4 transition hover:border-teal/30"
          >
            <div className="font-medium">Code Examples</div>
            <div className="text-sm text-slate">
              React, Vue, and framework integrations
            </div>
          </Link>
          <Link
            href="/playground"
            className="rounded-2xl border border-black/10 bg-white/80 p-4 transition hover:border-teal/30"
          >
            <div className="font-medium">Playground</div>
            <div className="text-sm text-slate">Interactive icon explorer</div>
          </Link>
          <Link
            href="/icons"
            className="rounded-2xl border border-black/10 bg-white/80 p-4 transition hover:border-teal/30"
          >
            <div className="font-medium">Browse Icons</div>
            <div className="text-sm text-slate">Explore all 22,000+ icons</div>
          </Link>
        </div>
      </section>
    </div>
  );
}
