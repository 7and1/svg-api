import type { MetadataRoute } from "next";
import { loadIndex } from "../lib/index";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://svg-api.org";
  const index = await loadIndex();

  // Core pages
  const core: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/docs`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/docs/quickstart`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/docs/api`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/docs/sources`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/docs/examples`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/icons`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/playground`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/sources`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/categories`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/licenses`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // Source pages
  const sourcePages: MetadataRoute.Sitemap = index.stats.sources.map(
    (source: string) => ({
      url: `${baseUrl}/sources/${source}`,
      lastModified: new Date(index.generated),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }),
  );

  // Collect all unique categories
  const categories = new Set<string>();
  for (const icon of Object.values(index.icons)) {
    categories.add((icon as any).category);
  }

  const categoryPages: MetadataRoute.Sitemap = Array.from(categories).map(
    (category) => ({
      url: `${baseUrl}/categories/${category}`,
      lastModified: new Date(index.generated),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }),
  );

  // Icon detail pages - limit to first 5000 for static export compatibility
  const iconPages: MetadataRoute.Sitemap = Object.values(index.icons)
    .slice(0, 5000)
    .map((icon) => ({
      url: `${baseUrl}/icons/${(icon as any).name}`,
      lastModified: new Date(index.generated),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  return [...core, ...sourcePages, ...categoryPages, ...iconPages];
}
