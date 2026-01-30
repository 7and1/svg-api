import Link from "next/link";
import { loadIndex } from "../../lib/index";
import { API_BASE } from "../../lib/constants";
import type { Metadata } from "next";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Icon Categories - Browse by Category | SVG API",
  description:
    "Browse icons by category including arrows, media, social, commerce, and more. Find the perfect icon for your project from 22,000+ free SVG icons.",
  keywords: [
    "icon categories",
    "arrow icons",
    "media icons",
    "social icons",
    "commerce icons",
    "UI icons",
    "free icons",
    "SVG icons",
  ],
  alternates: {
    canonical: "/categories",
  },
  openGraph: {
    title: "Icon Categories - Browse by Category | SVG API",
    description:
      "Browse icons by category. Find the perfect icon for your project from 22,000+ free SVG icons.",
    url: "https://svg-api.org/categories",
    siteName: "SVG API",
    type: "website",
  },
};

interface CategoryStats {
  name: string;
  count: number;
  sources: string[];
  sampleIcons: { name: string; source: string }[];
}

export default async function CategoriesPage() {
  const index = await loadIndex();

  const categoryMap = new Map<string, CategoryStats>();

  for (const icon of Object.values(index.icons)) {
    if (!categoryMap.has(icon.category)) {
      categoryMap.set(icon.category, {
        name: icon.category,
        count: 0,
        sources: [],
        sampleIcons: [],
      });
    }
    const stats = categoryMap.get(icon.category)!;
    stats.count++;
    if (!stats.sources.includes(icon.source)) {
      stats.sources.push(icon.source);
    }
    if (stats.sampleIcons.length < 6) {
      stats.sampleIcons.push({ name: icon.name, source: icon.source });
    }
  }

  const categories = Array.from(categoryMap.values()).sort(
    (a, b) => b.count - a.count,
  );

  // Create structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Icon Categories - SVG API",
    description: `Browse icons organized into ${categories.length} categories.`,
    url: "https://svg-api.org/categories",
    isPartOf: {
      "@type": "WebSite",
      "@id": "https://svg-api.org/#website",
    },
    about: {
      "@type": "ItemList",
      itemListElement: categories.map((category, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: category.name,
        description: `${category.count} icons from ${category.sources.length} sources`,
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
          name: "Categories",
          item: "https://svg-api.org/categories",
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
                Categories
              </span>
            </li>
          </ol>
        </nav>

        <header className="mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-slate">Browse</p>
          <h1 className="font-display text-3xl font-semibold md:text-4xl">
            Icon Categories
          </h1>
          <p className="mt-3 max-w-2xl text-slate">
            Explore {categories.length} icon categories. Find the perfect icons
            for your project organized by use case and style.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const categoryTitle = category.name
              .split("-")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ");

            return (
              <Link
                key={category.name}
                href={`/categories/${category.name}`}
                className="group rounded-2xl border border-black/10 bg-white/80 p-5 transition hover:border-teal/30 hover:shadow-glow"
              >
                <div className="flex items-start justify-between">
                  <h2 className="font-semibold group-hover:text-teal">
                    {categoryTitle}
                  </h2>
                  <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs font-medium text-slate">
                    {category.count.toLocaleString()}
                  </span>
                </div>

                <div className="mt-3 flex gap-1.5">
                  {category.sampleIcons.slice(0, 4).map((icon) => (
                    <div
                      key={`${icon.source}:${icon.name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-sand/60"
                    >
                      <img
                        src={`${API_BASE}/icons/${icon.name}?source=${icon.source}&size=20&color=%230b1020`}
                        alt=""
                        className="h-5 w-5"
                        loading="lazy"
                        width={20}
                        height={20}
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-3 text-xs text-slate">
                  From {category.sources.slice(0, 3).join(", ")}
                  {category.sources.length > 3 &&
                    ` +${category.sources.length - 3}`}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Popular Categories Section */}
        <section className="mt-16">
          <h2 className="font-display text-xl font-semibold">
            Popular Categories
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              "arrows",
              "media",
              "social",
              "commerce",
              "communication",
              "files",
              "maps",
              "editor",
              "devices",
              "weather",
            ].map((cat) => (
              <Link
                key={cat}
                href={`/categories/${cat}`}
                className="rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm capitalize transition hover:border-teal hover:text-teal"
              >
                {cat}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
