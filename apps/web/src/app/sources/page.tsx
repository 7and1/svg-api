import Link from "next/link";
import { loadIndex } from "../../lib/index";
import { API_BASE } from "../../lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Icon Sources - SVG API",
  description:
    "Browse all icon libraries available through SVG API including Lucide, Heroicons, Tabler, Feather, and more.",
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

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 md:px-8">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-slate">Browse</p>
        <h1 className="font-display text-3xl font-semibold md:text-4xl">
          Icon Sources
        </h1>
        <p className="mt-3 text-slate">
          Explore all {sources.length} icon libraries available through SVG API.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {sources.map((source) => (
          <Link
            key={source.name}
            href={`/sources/${source.name}`}
            className="group rounded-3xl border border-black/10 bg-white/80 p-6 transition hover:border-teal/30 hover:shadow-glow"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold capitalize group-hover:text-teal">
                  {source.name}
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
          </Link>
        ))}
      </div>
    </div>
  );
}
