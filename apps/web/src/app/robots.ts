import { MetadataRoute } from "next";

const BASE_URL = "https://svg-api.org";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/icons",
          "/icons/*",
          "/sources",
          "/sources/*",
          "/categories",
          "/categories/*",
          "/docs",
          "/docs/*",
          "/playground",
          "/licenses",
          "/privacy",
          "/terms",
        ],
        disallow: [
          "/api/*",
          "/_next/*",
          "/static/*",
          "/*.json",
          "/*.xml",
          "/admin",
          "/admin/*",
          "/internal",
          "/internal/*",
          "/preview",
          "/preview/*",
        ],
      },
      {
        userAgent: "GPTBot",
        allow: ["/", "/icons/*", "/docs/*"],
        disallow: ["/api/*", "/internal/*"],
      },
      {
        userAgent: "ClaudeBot",
        allow: ["/", "/icons/*", "/docs/*"],
        disallow: ["/api/*", "/internal/*"],
      },
      {
        userAgent: "Googlebot-Image",
        allow: ["/icons/*", "/sources/*", "/categories/*"],
      },
    ],
    sitemap: [
      `${BASE_URL}/sitemap/static.xml`,
      `${BASE_URL}/sitemap/sources.xml`,
      `${BASE_URL}/sitemap/categories.xml`,
      `${BASE_URL}/sitemap/icons-0.xml`,
      `${BASE_URL}/sitemap/icons-1.xml`,
    ],
    host: BASE_URL,
  };
}
