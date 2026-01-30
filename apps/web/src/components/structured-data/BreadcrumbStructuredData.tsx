"use client";

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbStructuredDataProps {
  items: BreadcrumbItem[];
}

export function BreadcrumbStructuredData({
  items,
}: BreadcrumbStructuredDataProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

interface SourcePageStructuredDataProps {
  source: string;
  iconCount: number;
  categoryCount: number;
  url: string;
}

export function SourcePageStructuredData({
  source,
  iconCount,
  categoryCount,
  url,
}: SourcePageStructuredDataProps) {
  const sourceTitle = source.charAt(0).toUpperCase() + source.slice(1);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": url,
        url,
        name: `${sourceTitle} Icons - SVG API`,
        description: `Browse and download ${iconCount.toLocaleString()} ${sourceTitle} icons across ${categoryCount} categories. Free API access with customizable options.`,
        inLanguage: "en",
        isPartOf: {
          "@type": "WebSite",
          "@id": "https://svg-api.org/#website",
        },
        about: {
          "@type": "Thing",
          name: `${sourceTitle} Icon Collection`,
          description: `${sourceTitle} icon library with ${iconCount} icons`,
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
              name: "Sources",
              item: "https://svg-api.org/sources",
            },
            {
              "@type": "ListItem",
              position: 3,
              name: sourceTitle,
              item: url,
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

interface CategoryPageStructuredDataProps {
  category: string;
  iconCount: number;
  sourceCount: number;
  url: string;
}

export function CategoryPageStructuredData({
  category,
  iconCount,
  sourceCount,
  url,
}: CategoryPageStructuredDataProps) {
  const categoryTitle = category
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": url,
        url,
        name: `${categoryTitle} Icons - SVG API`,
        description: `Browse and download ${iconCount.toLocaleString()} ${categoryTitle} icons from ${sourceCount} sources. Free API access with customizable options.`,
        inLanguage: "en",
        isPartOf: {
          "@type": "WebSite",
          "@id": "https://svg-api.org/#website",
        },
        about: {
          "@type": "Thing",
          name: `${categoryTitle} Icon Collection`,
          description: `${categoryTitle} icons collection with ${iconCount} icons`,
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
              name: "Categories",
              item: "https://svg-api.org/categories",
            },
            {
              "@type": "ListItem",
              position: 3,
              name: categoryTitle,
              item: url,
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

interface FAQStructuredDataProps {
  faqs: Array<{
    question: string;
    answer: string;
  }>;
}

export function FAQStructuredData({ faqs }: FAQStructuredDataProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
