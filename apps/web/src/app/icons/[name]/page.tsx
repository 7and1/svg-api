import { notFound } from "next/navigation";
import Link from "next/link";
import { loadIndex } from "../../../lib/index";
import { API_BASE } from "../../../lib/constants";
import { IconDetailClient } from "./IconDetailClient";
import { Suspense } from "react";

interface PageProps {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ source?: string }>;
}

// Skip static generation for icon detail pages - they will be rendered on-demand
export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateMetadata({ params }: PageProps) {
  const index = await loadIndex();
  const { name } = await params;

  // Find the icon - default to first match by name
  const icon = Object.values(index.icons).find((i: any) => i.name === name);

  if (!icon) {
    return {
      title: "Icon Not Found",
    };
  }

  const iconData = icon as any;
  const sourceTitle =
    iconData.source.charAt(0).toUpperCase() + iconData.source.slice(1);
  const categoryTitle = iconData.category
    .split("-")
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const title = `${name} SVG Icon | ${sourceTitle} | Free Download & API`;
  const description = `Download ${name} SVG icon from ${sourceTitle} ${categoryTitle} icons. Free API access, customizable size, color, and stroke width. Available in ${iconData.variants?.join(", ") || "default"} variant${iconData.variants && iconData.variants.length > 1 ? "s" : ""}.`;

  const canonicalUrl = `https://svg-api.org/icons/${name}`;
  const imageUrl = `https://svg-api.org/icons/${name}/opengraph-image`;

  return {
    title,
    description,
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
          alt: `${name} SVG Icon`,
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

function createJsonLd(icon: any, source: string, name: string) {
  const canonicalUrl = `https://svg-api.org/icons/${name}${source !== "lucide" ? `?source=${source}` : ""}`;
  const sourceTitle = source.charAt(0).toUpperCase() + source.slice(1);
  const categoryTitle = icon.category
    .split("-")
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ImageObject",
        "@id": `${canonicalUrl}#image`,
        url: `${API_BASE}/icons/${name}?source=${source}&size=512&color=%230b1020`,
        contentUrl: `${API_BASE}/icons/${name}?source=${source}`,
        name: `${name} SVG Icon`,
        description: `${name} icon from ${sourceTitle}. Part of the ${categoryTitle} icons collection. ${icon.tags?.slice(0, 5).join(", ") || ""}.`,
        inLanguage: "en",
        encodingFormat: "image/svg+xml",
        width: icon.width || 24,
        height: icon.height || 24,
        thumbnail: `${API_BASE}/icons/${name}?source=${source}&size=128&color=%230b1020`,
        thumbnailUrl: `${API_BASE}/icons/${name}?source=${source}&size=128&color=%230b1020`,
        author: {
          "@type": "Organization",
          name: "SVG API",
          url: "https://svg-api.org",
        },
        provider: {
          "@type": "Organization",
          name: sourceTitle,
        },
        license: "https://creativecommons.org/licenses/by/4.0/",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
        },
      },
      {
        "@type": "WebPage",
        "@id": canonicalUrl,
        url: canonicalUrl,
        name: `${name} SVG Icon | ${sourceTitle} | Free Download & API`,
        description: `Download ${name} SVG icon from ${sourceTitle}. Free API access with customizable options.`,
        inLanguage: "en",
        isPartOf: {
          "@type": "WebSite",
          "@id": "https://svg-api.org/#website",
          url: "https://svg-api.org",
          name: "SVG API",
        },
        primaryImageOfPage: {
          "@type": "ImageObject",
          "@id": `${canonicalUrl}#image`,
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
              name: "Icons",
              item: "https://svg-api.org/icons",
            },
            {
              "@type": "ListItem",
              position: 3,
              name: sourceTitle,
              item: `https://svg-api.org/icons?source=${source}`,
            },
            {
              "@type": "ListItem",
              position: 4,
              name: name,
              item: canonicalUrl,
            },
          ],
        },
      },
    ],
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
    icon = Object.values(index.icons).find((i: any) => i.name === name);
  }

  if (!icon) return notFound();

  const fallback = icon;
  const relatedIcons = Object.values(index.icons)
    .filter(
      (iconF: any) =>
        iconF.category === fallback.category &&
        iconF.name !== fallback.name &&
        iconF.source === fallback.source,
    )
    .slice(0, 8);

  const otherSources = Object.values(index.icons)
    .filter(
      (iconF: any) =>
        iconF.name === fallback.name && iconF.source !== fallback.source,
    )
    .slice(0, 5);

  const sourceTitle =
    fallback.source.charAt(0).toUpperCase() + fallback.source.slice(1);
  const categoryTitle = fallback.category
    .split("-")
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const jsonLd = createJsonLd(fallback, fallback.source, fallback.name);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto w-full max-w-5xl px-4 py-12 md:px-8">
        <nav
          className="mb-6 flex items-center gap-2 text-sm text-slate"
          aria-label="Breadcrumb"
        >
          <Link href="/" className="transition hover:text-teal">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <Link href="/icons" className="transition hover:text-teal">
            Icons
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            href={`/icons?source=${fallback.source}`}
            className="transition hover:text-teal"
          >
            {fallback.source}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-ink" aria-current="page">
            {fallback.name}
          </span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <article className="rounded-3xl border border-black/10 bg-white/80 p-8 shadow-sm">
              <div className="flex flex-col gap-6 md:flex-row md:items-start">
                <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-sand/60">
                  <img
                    src={`${API_BASE}/icons/${fallback.name}?source=${fallback.source}&size=80&color=%230b1020`}
                    alt={`${fallback.name} icon from ${sourceTitle}`}
                    className="h-20 w-20"
                  />
                </div>
                <div className="flex-1">
                  <h1 className="font-display text-3xl font-semibold">
                    {fallback.name}
                  </h1>
                  <p className="mt-2 text-sm text-slate">
                    {categoryTitle} icon from the {sourceTitle} collection
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/icons?source=${fallback.source}`}
                      className="rounded-full bg-teal/10 px-3 py-1 text-xs font-medium text-teal transition hover:bg-teal/20"
                    >
                      {sourceTitle}
                    </Link>
                    <Link
                      href={`/icons?category=${fallback.category}`}
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
                          className="rounded-full border border-black/10 px-2 py-0.5 text-[11px] text-slate transition hover:border-teal hover:text-teal"
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

            <IconDetailClient
              icon={{
                name: fallback.name,
                source: fallback.source,
                category: fallback.category,
                tags: fallback.tags || [],
              }}
            />
          </div>

          <div className="space-y-6">
            {otherSources.length > 0 && (
              <div className="rounded-2xl border border-black/10 bg-white/80 p-5">
                <h3 className="text-sm font-semibold">Also available in</h3>
                <div className="mt-3 space-y-2">
                  {otherSources.map((icon: any) => {
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

            {relatedIcons.length > 0 && (
              <div className="rounded-2xl border border-black/10 bg-white/80 p-5">
                <h3 className="text-sm font-semibold">Related icons</h3>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {relatedIcons.map((icon: any) => (
                    <Link
                      key={`${icon.source}:${icon.name}`}
                      href={`/icons/${icon.name}?source=${icon.source}`}
                      className="flex flex-col items-center gap-1 rounded-lg border border-black/10 p-2 text-center transition hover:border-teal"
                    >
                      <img
                        src={`${API_BASE}/icons/${icon.name}?source=${icon.source}&size=24&color=%230b1020`}
                        alt={icon.name}
                        className="h-6 w-6"
                      />
                      <span className="truncate text-[10px] text-slate">
                        {icon.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
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
