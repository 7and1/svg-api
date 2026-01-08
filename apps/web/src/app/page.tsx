import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SVG API - Free Icon API for Developers | 22k+ Icons",
  description:
    "Free SVG icon API with 22k+ icons from Lucide, Tabler, Heroicons, Remix, Ionicons, Bootstrap, and MDI. No dependencies, CDN-delivered, sub-50ms latency. Get started in 30 seconds.",
  keywords: [
    "SVG API",
    "free icons",
    "icon API",
    "Lucide icons",
    "Tabler icons",
    "Heroicons",
    "Remix Icon",
    "Ionicons",
    "Bootstrap icons",
    "Material Design Icons",
    "CDN icons",
    "REST API icons",
    "developer tools",
    "open source icons",
  ].join(", "),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "SVG API - Free Icon API for Developers | 22k+ Icons",
    description:
      "22k+ SVG icons via a single URL. No dependencies, CDN-delivered, sub-50ms responses worldwide.",
    url: "https://svg-api.org",
    siteName: "SVG API",
    type: "website",
    images: [
      {
        url: "https://svg-api.org/og-image.png",
        width: 1200,
        height: 630,
        alt: "SVG API - Free Icon API for Developers",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SVG API - Free Icon API for Developers | 22k+ Icons",
    description:
      "22k+ SVG icons via a single URL. No dependencies, CDN-delivered.",
    site: "@svgapi",
    images: ["https://svg-api.org/og-image.png"],
  },
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-black/10 bg-white/70 px-5 py-4 shadow-glow">
    <div className="text-2xl font-semibold text-ink">{value}</div>
    <div className="text-xs uppercase tracking-[0.2em] text-slate">{label}</div>
  </div>
);

const Feature = ({ title, copy }: { title: string; copy: string }) => (
  <div className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-sm">
    <h3 className="font-display text-lg font-semibold">{title}</h3>
    <p className="mt-3 text-sm text-slate">{copy}</p>
  </div>
);

function HomePageJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "https://svg-api.org/#webpage",
        url: "https://svg-api.org",
        name: "SVG API - Free Icon API for Developers",
        description:
          "Free SVG icon API with 22k+ icons from Lucide, Tabler, Heroicons, Remix, Ionicons, Bootstrap, and MDI. No dependencies, CDN-delivered.",
        inLanguage: "en",
        isPartOf: {
          "@id": "https://svg-api.org/#website",
        },
        about: {
          "@type": "Thing",
          name: "SVG Icons API",
          description: "A REST API for serving SVG icons",
        },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: "https://svg-api.org/og-image.png",
          width: 1200,
          height: 630,
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "How do I use the SVG API?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Simply use the endpoint https://api.svg-api.org/v1/icons/{icon-name} with optional parameters like source, color, and size. Example: https://api.svg-api.org/v1/icons/home?source=lucide&size=32&color=%23000000",
            },
          },
          {
            "@type": "Question",
            name: "What icon sources are available?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "SVG API includes icons from Lucide, Tabler, Heroicons, Remix Icon, Ionicons, Bootstrap Icons, and Material Design Icons - over 22,000 icons total.",
            },
          },
          {
            "@type": "Question",
            name: "Is the SVG API free to use?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes, SVG API is completely free and open source. Icons are served from a global CDN with edge caching for fast response times.",
            },
          },
          {
            "@type": "Question",
            name: "Can I customize icon size and color?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes, you can customize size (16-256px), stroke width, and color via URL parameters. No need to preprocess or modify SVG files manually.",
            },
          },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default function HomePage() {
  return (
    <>
      <HomePageJsonLd />
      <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-12 md:px-8">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate">
              Edge-native icon API
            </span>
            <h1 className="font-display text-4xl font-semibold leading-tight md:text-6xl">
              SVG API: the zero-dependency icon engine for modern teams.
            </h1>
            <p className="text-lg text-slate">
              Deliver 22k+ SVG icons from Lucide, Tabler, Heroicons, and more
              with a single URL. Built on Cloudflare Workers for sub-50ms
              responses worldwide.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/playground"
                className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-sand hover:bg-black/80 transition"
              >
                Open Playground
              </Link>
              <Link
                href="/docs"
                className="rounded-full border border-ink/20 px-6 py-3 text-sm font-semibold text-ink hover:border-ink/50 transition"
              >
                Read Documentation
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat label="Icons" value="22k+" />
              <Stat label="p95 Latency" value="&lt; 50ms" />
              <Stat label="Cache Hit" value="95%" />
            </div>
          </div>
          <div className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-glow">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate">
              <span>Example Request</span>
              <span className="rounded-full bg-ink/5 px-2 py-1">curl</span>
            </div>
            <pre className="mt-4 overflow-auto rounded-2xl bg-ink px-4 py-5 text-xs text-sand">
              {`curl "https://svg-api.org/v1/icons/home?source=lucide&color=%23f59e0b&size=32"\n\n# Returns raw SVG\n# <svg width="32" height="32" ...>`}
            </pre>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs text-slate">
              <div className="rounded-2xl border border-black/10 bg-white/70 px-3 py-4">
                No SDKs
              </div>
              <div className="rounded-2xl border border-black/10 bg-white/70 px-3 py-4">
                Edge cached
              </div>
              <div className="rounded-2xl border border-black/10 bg-white/70 px-3 py-4">
                Open source
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16 grid gap-6 md:grid-cols-3">
          <Feature
            title="One URL, every icon"
            copy="Use a single endpoint across Lucide, Tabler, Heroicons, Remix, Ionicons, Bootstrap, and MDI."
          />
          <Feature
            title="Search at the edge"
            copy="Fast full-text search with relevance scoring and filters for sources and categories."
          />
          <Feature
            title="Customizable output"
            copy="Adjust size, color, and stroke width on the fly without rebuilding your app."
          />
        </section>

        <section className="mt-20 rounded-[32px] border border-black/10 bg-white/80 p-8 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold">
                Ready to ship?
              </h2>
              <p className="mt-2 text-sm text-slate">
                Start with the docs or explore the interactive playground.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/docs"
                className="rounded-full border border-ink/20 px-5 py-2 text-sm font-semibold"
              >
                Documentation
              </Link>
              <Link
                href="/playground"
                className="rounded-full bg-teal px-5 py-2 text-sm font-semibold text-white"
              >
                Try API
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
