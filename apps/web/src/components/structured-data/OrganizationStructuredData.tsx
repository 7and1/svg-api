"use client";

interface OrganizationStructuredDataProps {
  name?: string;
  url?: string;
  logoUrl?: string;
  description?: string;
  sameAs?: string[];
}

export function OrganizationStructuredData({
  name = "SVG API",
  url = "https://svg-api.org",
  logoUrl = "https://svg-api.org/logo.png",
  description = "Free SVG icon API with 22k+ icons for developers",
  sameAs = [],
}: OrganizationStructuredDataProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${url}/#organization`,
    name,
    url,
    logo: {
      "@type": "ImageObject",
      url: logoUrl,
      width: 512,
      height: 512,
    },
    description,
    sameAs,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

interface WebSiteStructuredDataProps {
  name?: string;
  url?: string;
  description?: string;
  searchUrl?: string;
}

export function WebSiteStructuredData({
  name = "SVG API",
  url = "https://svg-api.org",
  description = "Free SVG icon API with 22k+ icons for developers",
  searchUrl = "https://svg-api.org/icons?q={search_term_string}",
}: WebSiteStructuredDataProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${url}/#website`,
    url,
    name,
    description,
    publisher: {
      "@id": `${url}/#organization`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: searchUrl,
      },
      "query-input": {
        "@type": "PropertyValueSpecification",
        valueRequired: true,
        valueName: "search_term_string",
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

interface WebApplicationStructuredDataProps {
  name?: string;
  url?: string;
  description?: string;
  features?: string[];
}

export function WebApplicationStructuredData({
  name = "SVG API",
  url = "https://svg-api.org",
  description = "Free SVG icon API with 22k+ icons from Lucide, Tabler, Heroicons. No dependencies, CDN-delivered.",
  features = [
    "22,000+ SVG icons",
    "Multiple icon sources (Lucide, Tabler, Heroicons, Bootstrap, Remix, Ionicons, MDI)",
    "Full-text search API",
    "Customizable size, color, and stroke width",
    "CDN-delivered with edge caching",
    "REST API",
  ],
}: WebApplicationStructuredDataProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${url}/#webapp`,
    name,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description,
    url,
    author: {
      "@type": "Organization",
      "@id": `${url}/#organization`,
    },
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    softwareVersion: "1.0.0",
    featureList: features,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
