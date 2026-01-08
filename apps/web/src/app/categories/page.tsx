import Link from "next/link";
import { loadIndex } from "../../lib/index";
import { API_BASE } from "../../lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Icon Categories - SVG API",
  description:
    "Browse icons by category including arrows, media, social, commerce, and more.",
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

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 md:px-8">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-slate">Browse</p>
        <h1 className="font-display text-3xl font-semibold md:text-4xl">
          Icon Categories
        </h1>
        <p className="mt-3 text-slate">
          Explore icons organized into {categories.length} categories.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Link
            key={category.name}
            href={`/categories/${category.name}`}
            className="group rounded-2xl border border-black/10 bg-white/80 p-5 transition hover:border-teal/30 hover:shadow-glow"
          >
            <div className="flex items-start justify-between">
              <h2 className="font-semibold capitalize group-hover:text-teal">
                {category.name}
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
        ))}
      </div>
    </div>
  );
}
