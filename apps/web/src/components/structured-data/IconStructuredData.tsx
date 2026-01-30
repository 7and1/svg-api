"use client";

import { API_BASE } from "../../lib/constants";

interface IconStructuredDataProps {
  name: string;
  source: string;
  category: string;
  tags?: string[];
  width?: number;
  height?: number;
  description?: string;
}

export function IconStructuredData({
  name,
  source,
  category,
  tags = [],
  width = 24,
  height = 24,
  description,
}: IconStructuredDataProps) {
  const canonicalUrl = `https://svg-api.org/icons/${name}`;
  const sourceTitle = source.charAt(0).toUpperCase() + source.slice(1);
  const categoryTitle = category
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const iconDescription =
    description ||
    `${name} icon from ${sourceTitle}. Part of the ${categoryTitle} icons collection.`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ImageObject",
        "@id": `${canonicalUrl}#image`,
        url: `${API_BASE}/icons/${name}?source=${source}&size=512&color=%230b1020`,
        contentUrl: `${API_BASE}/icons/${name}?source=${source}`,
        name: `${name} SVG Icon`,
        description: iconDescription,
        inLanguage: "en",
        encodingFormat: "image/svg+xml",
        width,
        height,
        thumbnail: {
          "@type": "ImageObject",
          url: `${API_BASE}/icons/${name}?source=${source}&size=128&color=%230b1020`,
          width: 128,
          height: 128,
        },
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
        keywords: tags.slice(0, 10).join(", ") || category,
      },
      {
        "@type": "WebPage",
        "@id": canonicalUrl,
        url: canonicalUrl,
        name: `${name} SVG Icon | ${sourceTitle} | Free Download & API`,
        description: iconDescription,
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
        about: {
          "@type": "Thing",
          name: `${name} Icon`,
          description: iconDescription,
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
              item: `https://svg-api.org/sources/${source}`,
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

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
