import { notFound } from "next/navigation";
import Link from "next/link";
import { loadIndex } from "../../../lib/index";
import { API_BASE } from "../../../lib/constants";
import type { Metadata } from "next";
import { SourcePageStructuredData } from "../../../components/structured-data";
import { SOURCE_CONFIG } from "../../../lib/sources";

interface PageProps {
  params: Promise<{ source: string }>;
}

export const runtime = "edge";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const index = await loadIndex();
  const { source } = await params;
  const sourceName = source.toLowerCase();

  const icons = Object.values(index.icons).filter(
    (icon) => icon.source.toLowerCase() === sourceName
  );

  if (icons.length === 0) {
    return {
      title: "Source Not Found - SVG API",
    };
  }

  const sourceConfig = SOURCE_CONFIG[sourceName];
  const categories = [...new Set(icons.map((icon) => icon.category))];
  const sourceTitle = sourceName.charAt(0).toUpperCase() + sourceName.slice(1);

  const title = `${sourceTitle} Icons - Free SVG Download & API | SVG API`;
  const description = sourceConfig?.description
    ? `${sourceConfig.description} Access ${icons.length.toLocaleString()} icons via our free API. Customize size, color, and stroke width. Download SVG instantly.`
    : `Download ${icons.length.toLocaleString()} free ${sourceTitle} icons. Browse ${categories.length} categories including ${categories.slice(0, 3).join(", ")}. Free API with customizable options.`;

  const canonicalUrl = `https://svg-api.org/sources/${sourceName}`;
  const firstIcon = icons[0]!;

  return {
    title,
    description,
    keywords: [
      `${sourceTitle} icons`,
      "free icons",
      "SVG icons",
      "icon API",
      "download icons",
      ...categories.slice(0, 5),
    ],
    alternates: {
      canonical: `/sources/${sourceName}`,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "SVG API",
      type: "website",
      images: [
        {
          url: `${API_BASE}/icons/${firstIcon.name}?source=${sourceName}&size=512&color=%230b1020`,
          width: 512,
          height: 512,
          alt: `${sourceTitle} Icons`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${API_BASE}/icons/${firstIcon.name}?source=${sourceName}&size=512&color=%230b1020`],
    },
  };
}

export default async function SourceDetailPage({ params }: PageProps) {
  const index = await loadIndex();
  const { source } = await params;
  const sourceName = source.toLowerCase();

  const icons = Object.values(index.icons).filter(
    (icon) => icon.source.toLowerCase() === sourceName
  );

  if (icons.length === 0) return notFound();

  const sourceConfig = SOURCE_CONFIG[sourceName];
  const categories = [...new Set(icons.map((icon) => icon.category))].sort();
  const iconsByCategory = new Map<
    string,
    { name: string; source: string; category: string }[]
  >();

  for (const cat of categories) {
    iconsByCategory.set(
      cat,
      icons
        .filter((icon) => icon.category === cat)
        .slice(0, 16)
        .map((icon) => ({
          name: icon.name,
          source: icon.source,
          category: icon.category,
        }))
    );
  }

  const sourceTitle = sourceName.charAt(0).toUpperCase() + sourceName.slice(1);
  const canonicalUrl = `https://svg-api.org/sources/${sourceName}`;

  // Get popular icons (first 6)
  const popularIcons = icons.slice(0, 6);

  return (
    <>
      <SourcePageStructuredData
        source={sourceName}
        iconCount={icons.length}
        categoryCount={categories.length}
        url={canonicalUrl}
      />

      <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-8">
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
              <Link href="/sources" className="transition hover:text-teal">
                Sources
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <span className="text-ink" aria-current="page">
                {sourceTitle}
              </span>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <header className="mb-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <h1 className="font-display text-3xl font-semibold capitalize md:text-4xl lg:text-5xl">
                {sourceTitle} Icons
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-slate">
                {sourceConfig?.description ||
                  `Free ${sourceTitle} icons available via API. Customize size, color, and download SVG instantly.`}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate">
                <span className="inline-flex items-center gap-1.5">
                  <span className="font-semibold text-ink">{icons.length.toLocaleString()}</span>
                  icons
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="font-semibold text-ink">{categories.length}</span>
                  categories
                </span>
                {sourceConfig?.license && (
                  <span className="inline-flex items-center gap-1.5">
                    License:
                    <a
                      href={sourceConfig.license.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal hover:underline"
                    >
                      {sourceConfig.license.type}
                    </a>
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/icons?source=${sourceName}`}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-sand transition hover:bg-ink/90"
              >
                Browse all icons
              </Link>
              {sourceConfig?.website && (
                <a
                  href={sourceConfig.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-ink/20 px-6 py-3 text-sm font-semibold text-ink transition hover:border-ink/50"
                >
                  Official Website
                </a>
              )}
            </div>
          </div>
        </header>

        {/* Popular Icons Preview */}
        <section aria-labelledby="popular-heading" className="mb-12">
          <h2 id="popular-heading" className="mb-4 font-display text-xl font-semibold">
            Popular {sourceTitle} Icons
          </h2>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12">
            {popularIcons.map((icon) => (
              <Link
                key={`${icon.source}:${icon.name}`}
                href={`/icons/${icon.name}?source=${icon.source}`}
                className="group flex flex-col items-center gap-2 rounded-xl border border-black/10 bg-white/80 p-3 text-center transition hover:border-teal hover:shadow-glow"
              >
                <img
                  src={`${API_BASE}/icons/${icon.name}?source=${icon.source}&size=32&color=%230b1020`}
                  alt={`${icon.name} icon`}
                  className="h-8 w-8"
                  loading="lazy"
                />
                <span className="w-full truncate text-[10px] text-slate group-hover:text-ink">
                  {icon.name}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Categories */}
        <div className="space-y-12">
          {categories.map((category) => {
            const categoryIcons = iconsByCategory.get(category) || [];
            const categoryTitle = category
              .split("-")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ");

            return (
              <section key={category} aria-labelledby={`category-${category}-heading`}>
                <div className="mb-4 flex items-center justify-between">
                  <h2
                    id={`category-${category}-heading`}
                    className="font-display text-lg font-semibold capitalize"
                  >
                    {categoryTitle}
                  </h2>
                  <Link
                    href={`/icons?source=${sourceName}&category=${category}`}
                    className="text-sm text-teal transition hover:underline"
                  >
                    View all
                  </Link>
                </div>
                <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12">
                  {categoryIcons.map((icon) => (
                    <Link
                      key={`${icon.source}:${icon.name}`}
                      href={`/icons/${icon.name}?source=${icon.source}`}
                      className="group flex flex-col items-center gap-2 rounded-xl border border-black/10 bg-white/80 p-3 text-center transition hover:border-teal hover:shadow-glow"
                    >
                      <img
                        src={`${API_BASE}/icons/${icon.name}?source=${icon.source}&size=32&color=%230b1020`}
                        alt={`${icon.name} icon`}
                        className="h-8 w-8"
                        loading="lazy"
                      />
                      <span className="w-full truncate text-[10px] text-slate group-hover:text-ink">
                        {icon.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* API Usage Section */}
        <section className="mt-16 rounded-3xl border border-black/10 bg-white/80 p-8">
          <h2 className="font-display text-xl font-semibold">API Usage</h2>
          <p className="mt-2 text-slate">
            Access {sourceTitle} icons programmatically via our REST API.
          </p>
          <div className="mt-4 overflow-hidden rounded-2xl bg-ink px-4 py-4">
            <code className="block text-xs text-sand">
              {`curl "https://api.svg-api.org/v1/icons/{icon-name}?source=${sourceName}&size=32&color=%23000000"`}
            </code>
          </div>
          <div className="mt-4 flex gap-3">
            <Link
              href="/docs/api"
              className="text-sm font-medium text-teal hover:underline"
            >
              View API Documentation →
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
