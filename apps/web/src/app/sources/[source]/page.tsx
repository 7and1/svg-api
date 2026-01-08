import { notFound } from "next/navigation";
import Link from "next/link";
import { loadIndex } from "../../../lib/index";
import { API_BASE } from "../../../lib/constants";

interface PageProps {
  params: Promise<{ source: string }>;
}

export const dynamicParams = false;

export async function generateStaticParams() {
  const index = await loadIndex();
  const sources = new Set<string>();
  for (const icon of Object.values(index.icons)) {
    sources.add(icon.source);
  }
  return Array.from(sources).map((source) => ({ source }));
}

export async function generateMetadata({ params }: PageProps) {
  const { source } = await params;
  return {
    title: `${source} Icons - SVG API`,
    description: `Browse and download ${source} icons. Use via API with SVG API.`,
    alternates: {
      canonical: `/sources/${source}`,
    },
  };
}

export default async function SourceDetailPage({ params }: PageProps) {
  const index = await loadIndex();
  const { source } = await params;
  const sourceName = source.toLowerCase();

  const icons = Object.values(index.icons).filter(
    (icon) => icon.source.toLowerCase() === sourceName,
  );

  if (icons.length === 0) return notFound();

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
        .slice(0, 12)
        .map((icon) => ({
          name: icon.name,
          source: icon.source,
          category: icon.category,
        })),
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-8">
      <nav className="mb-6 flex items-center gap-2 text-sm text-slate">
        <Link href="/sources" className="transition hover:text-teal">
          Sources
        </Link>
        <span>/</span>
        <span className="capitalize text-ink">{sourceName}</span>
      </nav>

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold capitalize md:text-4xl">
            {sourceName} Icons
          </h1>
          <p className="mt-2 text-slate">
            {icons.length.toLocaleString()} icons across {categories.length}{" "}
            categories
          </p>
        </div>
        <Link
          href={`/icons?source=${sourceName}`}
          className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-sand transition hover:bg-ink/90"
        >
          Browse all icons
        </Link>
      </div>

      <div className="space-y-10">
        {categories.map((category) => {
          const categoryIcons = iconsByCategory.get(category) || [];
          return (
            <section key={category}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold capitalize">{category}</h2>
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
                      alt={icon.name}
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
    </div>
  );
}
