import { notFound } from "next/navigation";
import Link from "next/link";
import { loadIndex } from "../../../lib/index";
import { API_BASE } from "../../../lib/constants";
import type { Metadata } from "next";
import { CategoryPageStructuredData } from "../../../components/structured-data";

interface PageProps {
  params: Promise<{ category: string }>;
}

export const runtime = "edge";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const index = await loadIndex();
  const { category } = await params;
  const categoryName = category.toLowerCase();

  const icons = Object.values(index.icons).filter(
    (icon) => icon.category.toLowerCase() === categoryName
  );

  if (icons.length === 0) {
    return {
      title: "Category Not Found - SVG API",
    };
  }

  const sources = [...new Set(icons.map((icon) => icon.source))];
  const categoryTitle = categoryName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const title = `${categoryTitle} Icons - Free SVG Download & API | SVG API`;
  const description = `Download ${icons.length.toLocaleString()} free ${categoryTitle.toLowerCase()} icons from ${sources.length} sources including ${sources.slice(0, 3).join(", ")}. Customize size, color, and download SVG instantly via our free API.`;

  const canonicalUrl = `https://svg-api.org/categories/${categoryName}`;
  const firstIcon = icons[0]!;

  return {
    title,
    description,
    keywords: [
      `${categoryTitle} icons`,
      "free icons",
      "SVG icons",
      "icon API",
      "download icons",
      ...sources.slice(0, 5).map((s) => `${s} icons`),
    ],
    alternates: {
      canonical: `/categories/${categoryName}`,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "SVG API",
      type: "website",
      images: [
        {
          url: `${API_BASE}/icons/${firstIcon.name}?source=${firstIcon.source}&size=512&color=%230b1020`,
          width: 512,
          height: 512,
          alt: `${categoryTitle} Icons`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${API_BASE}/icons/${firstIcon.name}?source=${firstIcon.source}&size=512&color=%230b1020`],
    },
  };
}

export default async function CategoryDetailPage({ params }: PageProps) {
  const index = await loadIndex();
  const { category } = await params;
  const categoryName = category.toLowerCase();

  const icons = Object.values(index.icons).filter(
    (icon) => icon.category.toLowerCase() === categoryName
  );

  if (icons.length === 0) return notFound();

  const sources = [...new Set(icons.map((icon) => icon.source))].sort();
  const iconsBySource = new Map<
    string,
    { name: string; source: string; category: string }[]
  >();

  for (const source of sources) {
    iconsBySource.set(
      source,
      icons
        .filter((icon) => icon.source === source)
        .slice(0, 16)
        .map((icon) => ({
          name: icon.name,
          source: icon.source,
          category: icon.category,
        }))
    );
  }

  const categoryTitle = categoryName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  const canonicalUrl = `https://svg-api.org/categories/${categoryName}`;

  // Get popular icons (first 6 from any source)
  const popularIcons = icons.slice(0, 6);

  return (
    <>
      <CategoryPageStructuredData
        category={categoryName}
        iconCount={icons.length}
        sourceCount={sources.length}
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
              <Link href="/categories" className="transition hover:text-teal">
                Categories
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <span className="text-ink" aria-current="page">
                {categoryTitle}
              </span>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <header className="mb-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <h1 className="font-display text-3xl font-semibold md:text-4xl lg:text-5xl">
                {categoryTitle} Icons
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-slate">
                Free {categoryTitle.toLowerCase()} icons from {sources.length} different icon libraries.
                Download SVG or use our API to customize size, color, and style.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate">
                <span className="inline-flex items-center gap-1.5">
                  <span className="font-semibold text-ink">{icons.length.toLocaleString()}</span>
                  icons
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="font-semibold text-ink">{sources.length}</span>
                  sources
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/icons?category=${categoryName}`}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-sand transition hover:bg-ink/90"
              >
                Browse all icons
              </Link>
            </div>
          </div>
        </header>

        {/* Source Tags */}
        <div className="mb-10 flex flex-wrap gap-2">
          {sources.map((source) => (
            <Link
              key={source}
              href={`/icons?source=${source}&category=${categoryName}`}
              className="rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm capitalize transition hover:border-teal hover:text-teal"
            >
              {source}
            </Link>
          ))}
        </div>

        {/* Popular Icons Preview */}
        <section aria-labelledby="popular-heading" className="mb-12">
          <h2 id="popular-heading" className="mb-4 font-display text-xl font-semibold">
            Popular {categoryTitle} Icons
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

        {/* Sources */}
        <div className="space-y-12">
          {sources.map((source) => {
            const sourceIcons = iconsBySource.get(source) || [];
            const sourceTitle = source.charAt(0).toUpperCase() + source.slice(1);

            return (
              <section key={source} aria-labelledby={`source-${source}-heading`}>
                <div className="mb-4 flex items-center justify-between">
                  <h2
                    id={`source-${source}-heading`}
                    className="font-display text-lg font-semibold capitalize"
                  >
                    {sourceTitle}
                  </h2>
                  <Link
                    href={`/icons?source=${source}&category=${categoryName}`}
                    className="text-sm text-teal transition hover:underline"
                  >
                    View all
                  </Link>
                </div>
                <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12">
                  {sourceIcons.map((icon) => (
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

        {/* Related Categories */}
        <section className="mt-16">
          <h2 className="mb-4 font-display text-xl font-semibold">Explore Related Categories</h2>
          <div className="flex flex-wrap gap-2">
            {["arrows", "media", "social", "commerce", "communication", "files", "maps", "editor"]
              .filter((cat) => cat !== categoryName)
              .slice(0, 6)
              .map((cat) => (
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

        {/* API Usage Section */}
        <section className="mt-16 rounded-3xl border border-black/10 bg-white/80 p-8">
          <h2 className="font-display text-xl font-semibold">API Usage</h2>
          <p className="mt-2 text-slate">
            Access {categoryTitle.toLowerCase()} icons programmatically via our REST API.
          </p>
          <div className="mt-4 overflow-hidden rounded-2xl bg-ink px-4 py-4">
            <code className="block text-xs text-sand">
              {`curl "https://api.svg-api.org/v1/icons/{icon-name}?category=${categoryName}&size=32&color=%23000000"`}
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
