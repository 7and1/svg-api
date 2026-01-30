import Link from "next/link";
import { loadIndex } from "../../lib/index";
import { API_BASE } from "../../lib/constants";
import type { Metadata } from "next";
import { SOURCE_CONFIG } from "../../lib/sources";
import { LicenseLink } from "../../components/sources/LicenseLink";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Icon Sources - Browse 7 Icon Libraries | SVG API",
  description:
    "Browse all icon libraries available through SVG API including Lucide, Heroicons, Tabler, Bootstrap, Remix, Ionicons, and Material Design Icons. 22,000+ free SVG icons.",
  keywords: [
    "icon libraries",
    "Lucide icons",
    "Heroicons",
    "Tabler icons",
    "Bootstrap icons",
    "Remix icons",
    "Ionicons",
    "Material Design Icons",
    "free icons",
    "SVG icons",
  ],
  alternates: {
    canonical: "/sources",
  },
  openGraph: {
    title: "Icon Sources - Browse 7 Icon Libraries | SVG API",
    description:
      "Browse all icon libraries available through SVG API. 22,000+ free SVG icons from Lucide, Heroicons, Tabler, and more.",
    url: "https://svg-api.org/sources",
    siteName: "SVG API",
    type: "website",
  },
};

interface SourceStats {
  name: string;
  count: number;
  categories: string[];
  sampleIcons: { name: string; source: string }[];
}

export default async function SourcesPage() {
  const index = await loadIndex();

  const sourceMap = new Map<string, SourceStats>();

  for (const icon of Object.values(index.icons)) {
    if (!sourceMap.has(icon.source)) {
      sourceMap.set(icon.source, {
        name: icon.source,
        count: 0,
        categories: [],
        sampleIcons: [],
      });
    }
    const stats = sourceMap.get(icon.source)!;
    stats.count++;
    if (!stats.categories.includes(icon.category)) {
      stats.categories.push(icon.category);
    }
    if (stats.sampleIcons.length < 6) {
      stats.sampleIcons.push({ name: icon.name, source: icon.source });
    }
  }

  const sources = Array.from(sourceMap.values()).sort(
    (a, b) => b.count - a.count,
  );

  // Create structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Icon Sources - SVG API",
    description: `Browse all ${sources.length} icon libraries available through SVG API.`,
    url: "https://svg-api.org/sources",
    isPartOf: {
      "@type": "WebSite",
      "@id": "https://svg-api.org/#website",
    },
    about: {
      "@type": "ItemList",
      itemListElement: sources.map((source, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: source.name,
        description: `${source.count} icons in ${source.categories.length} categories`,
      })),
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://svg-api.org",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Sources",
          item: "https://svg-api.org/sources",
        },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto w-full max-w-5xl px-4 py-12 md:px-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-2 text-sm text-slate">
            <li>
              <Link href="/" className="transition hover:text-teal">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <span className="text-ink" aria-current="page">
                Sources
              </span>
            </li>
          </ol>
        </nav>

        <header className="mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-slate">Browse</p>
          <h1 className="font-display text-3xl font-semibold md:text-4xl">
            Icon Sources
          </h1>
          <p className="mt-3 max-w-2xl text-slate">
            Explore all {sources.length} icon libraries available through SVG API.
            Each library offers unique styles and thousands of free SVG icons.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {sources.map((source) => {
            const sourceConfig = SOURCE_CONFIG[source.name];
            const sourceTitle =
              source.name.charAt(0).toUpperCase() + source.name.slice(1);

            return (
              <Link
                key={source.name}
                href={`/sources/${source.name}`}
                className="group rounded-3xl border border-black/10 bg-white/80 p-6 transition hover:border-teal/30 hover:shadow-glow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-display text-xl font-semibold capitalize group-hover:text-teal">
                      {sourceConfig?.name || sourceTitle}
                    </h2>
                    <p className="mt-1 text-sm text-slate">
                      {source.count.toLocaleString()} icons in{" "}
                      {source.categories.length} categories
                    </p>
                  </div>
                  <div className="rounded-full bg-teal/10 px-3 py-1 text-xs font-medium text-teal">
                    {source.count.toLocaleString()}
                  </div>
                </div>

                {sourceConfig?.description && (
                  <p className="mt-3 text-sm text-slate line-clamp-2">
                    {sourceConfig.description}
                  </p>
                )}

                <div className="mt-4 flex gap-2">
                  {source.sampleIcons.map((icon) => (
                    <div
                      key={icon.name}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-black/10 bg-sand/60"
                    >
                      <img
                        src={`${API_BASE}/icons/${icon.name}?source=${icon.source}&size=24&color=%230b1020`}
                        alt=""
                        className="h-6 w-6"
                        loading="lazy"
                        width={24}
                        height={24}
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {source.categories.slice(0, 5).map((cat) => (
                    <span
                      key={cat}
                      className="rounded-full border border-black/10 px-2 py-0.5 text-[10px] text-slate"
                    >
                      {cat}
                    </span>
                  ))}
                  {source.categories.length > 5 && (
                    <span className="rounded-full border border-black/10 px-2 py-0.5 text-[10px] text-slate">
                      +{source.categories.length - 5} more
                    </span>
                  )}
                </div>

                {sourceConfig?.license && (
                  <div className="mt-3 text-xs text-slate">
                    License:{" "}
                    <LicenseLink url={sourceConfig.license.url} type={sourceConfig.license.type} />
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* FAQ Section */}
        <section className="mt-16 rounded-3xl border border-black/10 bg-white/80 p-8">
          <h2 className="font-display text-xl font-semibold">
            Frequently Asked Questions
          </h2>
          <div className="mt-6 space-y-4">
            <div>
              <h3 className="font-medium">What icon sources are available?</h3>
              <p className="mt-1 text-sm text-slate">
                SVG API includes icons from Lucide, Tabler, Heroicons, Bootstrap,
                Remix, Ionicons, and Material Design Icons.
              </p>
            </div>
            <div>
              <h3 className="font-medium">Are these icons free to use?</h3>
              <p className="mt-1 text-sm text-slate">
                Yes, all icons are open source and free to use. Each source has
                its own license (MIT, Apache-2.0, ISC).
              </p>
            </div>
            <div>
              <h3 className="font-medium">Can I use these icons commercially?</h3>
              <p className="mt-1 text-sm text-slate">
                Most icon libraries allow commercial use. Check the specific
                license for each source to confirm.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
