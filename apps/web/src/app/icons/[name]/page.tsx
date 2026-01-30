import { notFound } from "next/navigation";
import Link from "next/link";
import { loadIndex } from "../../../lib/index";
import { API_BASE } from "../../../lib/constants";
import { IconDetailClient } from "./IconDetailClient";
import { Suspense } from "react";
import { IconStructuredData, BreadcrumbStructuredData } from "../../../components/structured-data";
import type { Metadata } from "next";
import type { IconRecord } from "@svg-api/shared/types";
import type { IconResult } from "../../../types/icon";

interface PageProps {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ source?: string }>;
}

// Edge runtime for Cloudflare Pages
export const runtime = "edge";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const index = await loadIndex();
  const { name } = await params;

  // Find the icon - default to first match by name
  const icon = Object.values(index.icons).find((i: IconRecord) => i.name === name);

  if (!icon) {
    return {
      title: "Icon Not Found - SVG API",
    };
  }

  const iconData = icon;
  const sourceTitle =
    iconData.source.charAt(0).toUpperCase() + iconData.source.slice(1);
  const categoryTitle = iconData.category
    .split("-")
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const title = `${name} SVG Icon | ${sourceTitle} ${categoryTitle} | Free Download & API`;
  const description = `Download ${name} SVG icon from ${sourceTitle} ${categoryTitle} collection. Free API access, customizable size, color, and stroke width. Available in ${iconData.variants?.join(", ") || "default"} variant${iconData.variants && iconData.variants.length > 1 ? "s" : ""}.`;

  const canonicalUrl = `https://svg-api.org/icons/${name}`;
  const imageUrl = `https://svg-api.org/icons/${name}/opengraph-image`;

  return {
    title,
    description,
    keywords: [
      `${name} icon`,
      `${sourceTitle} icons`,
      `${categoryTitle} icons`,
      "free SVG icons",
      "icon download",
      "icon API",
      ...(iconData.tags || []).slice(0, 5),
    ],
    alternates: {
      canonical: `/icons/${name}`,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "SVG API",
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${name} SVG Icon from ${sourceTitle}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
    other: {
      thumbnail: `${API_BASE}/icons/${name}?source=${iconData.source}&size=512&color=%230b1020`,
    },
  };
}

function IconDetailContent({
  name,
  searchParams,
}: {
  name: string;
  searchParams: Promise<{ source?: string }>;
}) {
  return (
    <Suspense fallback={<IconDetailFallback name={name} />}>
      <IconDetailLoader name={name} searchParams={searchParams} />
    </Suspense>
  );
}

async function IconDetailLoader({
  name,
  searchParams,
}: {
  name: string;
  searchParams: Promise<{ source?: string }>;
}) {
  const index = await loadIndex();
  const resolvedParams = await searchParams;
  const source = resolvedParams?.source?.toLowerCase();

  // Find icon - prefer source match, otherwise use first match
  let icon = source ? index.icons[`${source}:${name}`] : null;

  if (!icon) {
    icon = Object.values(index.icons).find((i: IconRecord) => i.name === name);
  }

  if (!icon) return notFound();

  const fallback = icon;
  const sourceTitle =
    fallback.source.charAt(0).toUpperCase() + fallback.source.slice(1);
  const categoryTitle = fallback.category
    .split("-")
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  // Related icons from same category and source
  const relatedIcons = Object.values(index.icons)
    .filter(
      (iconF: IconRecord) =>
        iconF.category === fallback.category &&
        iconF.name !== fallback.name &&
        iconF.source === fallback.source,
    )
    .slice(0, 8);

  // Same icon from other sources
  const otherSources = Object.values(index.icons)
    .filter(
      (iconF: IconRecord) =>
        iconF.name === fallback.name && iconF.source !== fallback.source,
    )
    .slice(0, 5);

  // Related tags (icons sharing tags)
  const tagMatches = fallback.tags?.length
    ? Object.values(index.icons)
        .filter(
          (iconF: IconRecord) =>
            iconF.name !== fallback.name &&
            iconF.tags?.some((tag: string) => fallback.tags.includes(tag)),
        )
        .slice(0, 6)
    : [];

  const canonicalUrl = `https://svg-api.org/icons/${name}`;

  return (
    <>
      {/* Structured Data */}
      <IconStructuredData
        name={fallback.name}
        source={fallback.source}
        category={fallback.category}
        tags={fallback.tags}
        width={fallback.width || 24}
        height={fallback.height || 24}
      />
      <BreadcrumbStructuredData
        items={[
          { name: "Home", url: "https://svg-api.org" },
          { name: "Icons", url: "https://svg-api.org/icons" },
          { name: sourceTitle, url: `https://svg-api.org/sources/${fallback.source}` },
          { name: fallback.name, url: canonicalUrl },
        ]}
      />

      <div className="mx-auto w-full max-w-5xl px-4 py-12 md:px-8">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb">
          <ol className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate">
            <li>
              <Link href="/" className="transition hover:text-teal">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/icons" className="transition hover:text-teal">
                Icons
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href={`/sources/${fallback.source}`}
                className="transition hover:text-teal"
              >
                {sourceTitle}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href={`/categories/${fallback.category}`}
                className="transition hover:text-teal"
              >
                {categoryTitle}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <span className="text-ink" aria-current="page">
                {fallback.name}
              </span>
            </li>
          </ol>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            {/* Main Icon Card */}
            <article className="rounded-3xl border border-black/10 bg-white/80 p-8 shadow-sm">
              <div className="flex flex-col gap-6 md:flex-row md:items-start">
                <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-sand/60">
                  <img
                    src={`${API_BASE}/icons/${fallback.name}?source=${fallback.source}&size=80&color=%230b1020`}
                    alt={`${fallback.name} icon from ${sourceTitle}`}
                    className="h-20 w-20"
                    width={80}
                    height={80}
                  />
                </div>
                <div className="flex-1">
                  <h1 className="font-display text-3xl font-semibold">
                    {fallback.name}
                  </h1>
                  <p className="mt-2 text-slate">
                    {categoryTitle} icon from the {sourceTitle} collection
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/sources/${fallback.source}`}
                      className="rounded-full bg-teal/10 px-3 py-1 text-xs font-medium text-teal transition hover:bg-teal/20"
                    >
                      {sourceTitle}
                    </Link>
                    <Link
                      href={`/categories/${fallback.category}`}
                      className="rounded-full bg-amber/10 px-3 py-1 text-xs font-medium text-amber transition hover:bg-amber/20"
                    >
                      {categoryTitle}
                    </Link>
                  </div>
                  {fallback.tags && fallback.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {fallback.tags.map((tag: string) => (
                        <Link
                          key={tag}
                          href={`/icons?q=${encodeURIComponent(tag)}`}
                          className="rounded-full border border-black/10 px-2.5 py-1 text-xs text-slate transition hover:border-teal hover:text-teal"
                        >
                          {tag}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </article>

            {/* Download Options */}
            <section
              aria-labelledby="download-heading"
              className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-sm"
            >
              <h2
                id="download-heading"
                className="font-display text-lg font-semibold"
              >
                Download Options
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <a
                  href={`${API_BASE}/icons/${fallback.name}?source=${fallback.source}&size=24&color=%23000000`}
                  download={`${fallback.name}.svg`}
                  className="flex items-center justify-center gap-2 rounded-full border border-ink/20 px-4 py-3 text-sm font-medium text-ink transition hover:border-teal hover:text-teal"
                >
                  Download SVG (24px)
                </a>
                <a
                  href={`${API_BASE}/icons/${fallback.name}?source=${fallback.source}&size=48&color=%23000000`}
                  download={`${fallback.name}-48px.svg`}
                  className="flex items-center justify-center gap-2 rounded-full border border-ink/20 px-4 py-3 text-sm font-medium text-ink transition hover:border-teal hover:text-teal"
                >
                  Download SVG (48px)
                </a>
                <a
                  href={`${API_BASE}/icons/${fallback.name}?source=${fallback.source}&size=128&color=%23000000`}
                  download={`${fallback.name}-128px.svg`}
                  className="flex items-center justify-center gap-2 rounded-full border border-ink/20 px-4 py-3 text-sm font-medium text-ink transition hover:border-teal hover:text-teal"
                >
                  Download SVG (128px)
                </a>
                <Link
                  href={`/playground?icon=${encodeURIComponent(fallback.name)}&source=${encodeURIComponent(fallback.source)}`}
                  className="flex items-center justify-center gap-2 rounded-full bg-teal px-4 py-3 text-sm font-medium text-white transition hover:bg-teal/90"
                >
                  Customize in Playground
                </Link>
              </div>
            </section>

            {/* Variants Section */}
            {fallback.variants && fallback.variants.length > 1 && (
              <section
                aria-labelledby="variants-heading"
                className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-sm"
              >
                <h2
                  id="variants-heading"
                  className="font-display text-lg font-semibold"
                >
                  Available Variants
                </h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {fallback.variants.map((variant: string) => (
                    <span
                      key={variant}
                      className="rounded-full border border-black/10 bg-sand/60 px-3 py-1.5 text-sm capitalize text-slate"
                    >
                      {variant}
                    </span>
                  ))}
                </div>
              </section>
            )}

            <IconDetailClient
              icon={{
                name: fallback.name,
                source: fallback.source,
                category: fallback.category,
                tags: fallback.tags || [],
              }}
            />
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Other Sources */}
            {otherSources.length > 0 && (
              <div className="rounded-2xl border border-black/10 bg-white/80 p-5">
                <h3 className="text-sm font-semibold">Also available in</h3>
                <div className="mt-3 space-y-2">
                  {otherSources.map((icon: IconRecord) => {
                    const otherSourceTitle =
                      icon.source.charAt(0).toUpperCase() +
                      icon.source.slice(1);
                    return (
                      <Link
                        key={icon.source}
                        href={`/icons/${icon.name}?source=${icon.source}`}
                        className="flex items-center gap-3 rounded-lg border border-black/10 p-2 transition hover:border-teal"
                      >
                        <img
                          src={`${API_BASE}/icons/${icon.name}?source=${icon.source}&size=24&color=%230b1020`}
                          alt=""
                          className="h-6 w-6"
                          width={24}
                          height={24}
                        />
                        <span className="text-sm font-medium">
                          {otherSourceTitle}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Related Icons */}
            {relatedIcons.length > 0 && (
              <div className="rounded-2xl border border-black/10 bg-white/80 p-5">
                <h3 className="text-sm font-semibold">Related {categoryTitle} Icons</h3>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {relatedIcons.map((icon: IconRecord) => (
                    <Link
                      key={`${icon.source}:${icon.name}`}
                      href={`/icons/${icon.name}?source=${icon.source}`}
                      className="flex flex-col items-center gap-1 rounded-lg border border-black/10 p-2 text-center transition hover:border-teal"
                      title={icon.name}
                    >
                      <img
                        src={`${API_BASE}/icons/${icon.name}?source=${icon.source}&size=24&color=%230b1020`}
                        alt={`${icon.name} icon`}
                        className="h-6 w-6"
                        width={24}
                        height={24}
                        loading="lazy"
                      />
                      <span className="w-full truncate text-[10px] text-slate">
                        {icon.name}
                      </span>
                    </Link>
                  ))}
                </div>
                <Link
                  href={`/categories/${fallback.category}`}
                  className="mt-3 block text-center text-sm text-teal hover:underline"
                >
                  View all {categoryTitle} icons →
                </Link>
              </div>
            )}

            {/* Tag Matches */}
            {tagMatches.length > 0 && (
              <div className="rounded-2xl border border-black/10 bg-white/80 p-5">
                <h3 className="text-sm font-semibold">Similar Icons</h3>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {tagMatches.map((icon: IconRecord) => (
                    <Link
                      key={`${icon.source}:${icon.name}`}
                      href={`/icons/${icon.name}?source=${icon.source}`}
                      className="flex flex-col items-center gap-1 rounded-lg border border-black/10 p-2 text-center transition hover:border-teal"
                      title={icon.name}
                    >
                      <img
                        src={`${API_BASE}/icons/${icon.name}?source=${icon.source}&size=24&color=%230b1020`}
                        alt={`${icon.name} icon`}
                        className="h-6 w-6"
                        width={24}
                        height={24}
                        loading="lazy"
                      />
                      <span className="w-full truncate text-[10px] text-slate">
                        {icon.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* API Quick Reference */}
            <div className="rounded-2xl border border-black/10 bg-white/80 p-5">
              <h3 className="text-sm font-semibold">API Quick Reference</h3>
              <div className="mt-3 space-y-2 text-xs">
                <code className="block overflow-hidden rounded-lg bg-ink px-3 py-2 text-sand">
                  GET /v1/icons/{fallback.name}
                </code>
                <div className="text-slate">
                  <span className="font-medium text-ink">Parameters:</span>
                  <ul className="mt-1 space-y-1 pl-4">
                    <li>• source: {fallback.source}</li>
                    <li>• size: 16-512</li>
                    <li>• color: hex color</li>
                    <li>• strokeWidth: 0.5-3</li>
                  </ul>
                </div>
              </div>
              <Link
                href="/docs/api"
                className="mt-3 block text-sm text-teal hover:underline"
              >
                Full API docs →
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

function IconDetailFallback({ name }: { name: string }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 md:px-8">
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-teal border-r-transparent" />
          <p className="mt-4 text-slate">Loading {name} icon...</p>
        </div>
      </div>
    </div>
  );
}

export default async function IconDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { name } = await params;
  return <IconDetailContent name={name} searchParams={searchParams} />;
}
