import { MetadataRoute } from "next";

export const runtime = "edge";

const BASE_URL = "https://svg-api.org";

// Static routes that don't change
const staticRoutes = [
  { url: "/", priority: 1.0, changeFrequency: "daily" as const },
  { url: "/icons", priority: 0.9, changeFrequency: "daily" as const },
  { url: "/sources", priority: 0.8, changeFrequency: "weekly" as const },
  { url: "/categories", priority: 0.8, changeFrequency: "weekly" as const },
  { url: "/playground", priority: 0.7, changeFrequency: "monthly" as const },
  { url: "/docs", priority: 0.7, changeFrequency: "weekly" as const },
  { url: "/docs/quickstart", priority: 0.6, changeFrequency: "monthly" as const },
  { url: "/docs/api", priority: 0.6, changeFrequency: "monthly" as const },
  { url: "/docs/sources", priority: 0.6, changeFrequency: "monthly" as const },
  { url: "/docs/examples", priority: 0.6, changeFrequency: "monthly" as const },
  { url: "/licenses", priority: 0.4, changeFrequency: "monthly" as const },
  { url: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
  { url: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return staticRoutes.map((route) => ({
    url: `${BASE_URL}${route.url}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
