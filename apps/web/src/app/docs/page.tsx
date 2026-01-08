import Link from "next/link";
import type { Metadata } from "next";
import { CodeBlock } from "../../components/docs";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Learn how to integrate SVG API into your projects. Quick start guide, API reference, and code examples.",
};

export default function DocsPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate">
          Documentation
        </p>
        <h1 className="font-display text-3xl font-semibold md:text-4xl">
          Getting started with SVG API
        </h1>
        <p className="mt-3 text-slate">
          SVG API delivers SVG icons from multiple libraries through one fast
          edge endpoint. Use these basics to integrate in minutes.
        </p>
      </div>

      <section className="rounded-3xl border border-black/10 bg-white/80 p-6">
        <h2 className="font-display text-xl font-semibold">What is SVG API?</h2>
        <p className="mt-3 text-sm text-slate">
          SVG API is a free, open-source API that provides access to 22,000+
          icons from popular libraries like Lucide, Tabler, Heroicons, and more.
          Instead of bundling icon packages or managing assets, you can fetch
          any icon on-demand via a simple URL.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-black/10 bg-white/70 p-4 text-center">
            <div className="text-2xl font-semibold text-ink">22k+</div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate">
              Icons
            </div>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white/70 p-4 text-center">
            <div className="text-2xl font-semibold text-ink">7</div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate">
              Sources
            </div>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white/70 p-4 text-center">
            <div className="text-2xl font-semibold text-ink">&lt;50ms</div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate">
              Latency
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-black/10 bg-white/80 p-6">
        <h2 className="font-display text-xl font-semibold">Quick example</h2>
        <p className="mt-3 text-sm text-slate">
          Fetch any icon by making a simple HTTP request:
        </p>
        <div className="mt-4">
          <CodeBlock
            code={`curl "https://svg-api.org/v1/icons/home?source=lucide"

# With custom size and color
curl "https://svg-api.org/v1/icons/heart?source=lucide&size=32&color=%23ef4444"`}
            language="bash"
          />
        </div>
        <p className="mt-4 text-sm text-slate">
          Or use it directly in your HTML:
        </p>
        <div className="mt-4">
          <CodeBlock
            code={`<img src="https://svg-api.org/v1/icons/home?source=lucide" alt="Home" />
<img src="https://svg-api.org/v1/icons/settings?source=lucide&size=24&color=%236366f1" alt="Settings" />`}
            language="html"
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link
          href="/docs/quickstart"
          className="group rounded-3xl border border-black/10 bg-white/80 p-6 transition hover:border-teal/30 hover:shadow-glow"
        >
          <h3 className="font-semibold group-hover:text-teal">Quick Start</h3>
          <p className="mt-2 text-sm text-slate">
            Get up and running in under 5 minutes with our step-by-step guide.
          </p>
        </Link>
        <Link
          href="/docs/api"
          className="group rounded-3xl border border-black/10 bg-white/80 p-6 transition hover:border-teal/30 hover:shadow-glow"
        >
          <h3 className="font-semibold group-hover:text-teal">API Reference</h3>
          <p className="mt-2 text-sm text-slate">
            Complete documentation for all endpoints, parameters, and response
            formats.
          </p>
        </Link>
        <Link
          href="/docs/examples"
          className="group rounded-3xl border border-black/10 bg-white/80 p-6 transition hover:border-teal/30 hover:shadow-glow"
        >
          <h3 className="font-semibold group-hover:text-teal">Code Examples</h3>
          <p className="mt-2 text-sm text-slate">
            Ready-to-use examples for HTML, React, Vue, and more.
          </p>
        </Link>
        <Link
          href="/docs/sources"
          className="group rounded-3xl border border-black/10 bg-white/80 p-6 transition hover:border-teal/30 hover:shadow-glow"
        >
          <h3 className="font-semibold group-hover:text-teal">Icon Sources</h3>
          <p className="mt-2 text-sm text-slate">
            Learn about the icon libraries available through SVG API.
          </p>
        </Link>
      </section>

      <section className="rounded-3xl border border-black/10 bg-white/80 p-6">
        <h2 className="font-display text-xl font-semibold">Key features</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          <li className="flex gap-3">
            <span className="text-teal">-</span>
            <div>
              <div className="font-medium">No dependencies</div>
              <div className="text-sm text-slate">
                Just a URL, no packages to install
              </div>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="text-teal">-</span>
            <div>
              <div className="font-medium">Edge-cached</div>
              <div className="text-sm text-slate">
                Cloudflare CDN for &lt;50ms responses
              </div>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="text-teal">-</span>
            <div>
              <div className="font-medium">Customizable</div>
              <div className="text-sm text-slate">
                Size, color, and stroke via query params
              </div>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="text-teal">-</span>
            <div>
              <div className="font-medium">Search API</div>
              <div className="text-sm text-slate">
                Full-text search across all icons
              </div>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="text-teal">-</span>
            <div>
              <div className="font-medium">Batch requests</div>
              <div className="text-sm text-slate">
                Fetch up to 50 icons in one request
              </div>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="text-teal">-</span>
            <div>
              <div className="font-medium">Free forever</div>
              <div className="text-sm text-slate">
                Open source, no API key required
              </div>
            </div>
          </li>
        </ul>
      </section>
    </div>
  );
}
