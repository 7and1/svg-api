import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Header } from "../components/layout/Header";
import { Footer } from "../components/layout/Footer";
import { ThemeProvider } from "../components/theme/ThemeProvider";
import { ServiceWorkerRegistration } from "../components/pwa/ServiceWorkerRegistration";

// Font optimization with display swap for Core Web Vitals
const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  preload: true,
  weight: ["400", "500", "600", "700"],
});
const body = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  preload: false, // Mono font is less critical
});

// Separate viewport export for Next.js 15
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f2e9" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1419" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "SVG API - Free Icon API for Developers | 22k+ Icons",
    template: "%s | SVG API",
  },
  description:
    "Free SVG icon API with 22k+ icons from Lucide, Tabler, Heroicons. No dependencies, CDN-delivered. Get started in 30 seconds with a single URL.",
  metadataBase: new URL("https://svg-api.org"),
  alternates: {
    canonical: "/",
  },
  // PWA manifest
  manifest: "/manifest.json",
  // Apple touch icon
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    url: "https://svg-api.org",
    title: "SVG API - Free Icon API for Developers",
    description:
      "22k+ SVG icons via a single URL. No dependencies, CDN-delivered.",
    siteName: "SVG API",
  },
  twitter: {
    card: "summary_large_image",
    title: "SVG API - Free Icon API for Developers",
    description:
      "22k+ SVG icons via a single URL. No dependencies, CDN-delivered.",
    site: "@svgapi",
  },
  // Additional SEO metadata
  applicationName: "SVG API",
  authors: [{ name: "SVG API Team", url: "https://svg-api.org" }],
  creator: "SVG API Team",
  publisher: "SVG API",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-site-verification",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": "https://svg-api.org/#webapp",
      name: "SVG API",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      description:
        "Free SVG icon API with 22k+ icons from Lucide, Tabler, Heroicons. No dependencies, CDN-delivered. Get started in 30 seconds with a single URL.",
      url: "https://svg-api.org",
      author: {
        "@type": "Organization",
        "@id": "https://svg-api.org/#organization",
      },
      browserRequirements: "Requires JavaScript. Requires HTML5.",
      softwareVersion: "1.0.0",
      featureList: [
        "22,000+ SVG icons",
        "Multiple icon sources (Lucide, Tabler, Heroicons, Bootstrap, Remix, Ionicons, MDI)",
        "Full-text search API",
        "Customizable size, color, and stroke width",
        "CDN-delivered with edge caching",
        "REST API",
      ],
    },
    {
      "@type": "Organization",
      "@id": "https://svg-api.org/#organization",
      name: "SVG API",
      url: "https://svg-api.org",
      logo: {
        "@type": "ImageObject",
        url: "https://svg-api.org/logo.png",
        width: 512,
        height: 512,
      },
      description: "Free SVG icon API for developers",
      sameAs: [],
    },
    {
      "@type": "WebSite",
      "@id": "https://svg-api.org/#website",
      url: "https://svg-api.org",
      name: "SVG API",
      description: "Free SVG icon API with 22k+ icons for developers",
      publisher: {
        "@id": "https://svg-api.org/#organization",
      },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://svg-api.org/icons?q={search_term_string}",
        },
        "query-input": {
          "@type": "PropertyValueSpecification",
          valueRequired: true,
          valueName: "search_term_string",
        },
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Preconnect to API domains for faster requests */}
        <link rel="preconnect" href="https://api.svg-api.org" />
        <link rel="dns-prefetch" href="https://api.svg-api.org" />
        <link rel="preconnect" href="https://svg-api.org" />
        <link rel="dns-prefetch" href="https://svg-api.org" />
        {/* Preload critical assets for LCP optimization */}
        <link
          rel="preload"
          href="/icon-192x192.png"
          as="image"
          type="image/png"
        />
        {/* PWA support */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-screen bg-hero-gradient text-ink">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Header />
          <main>{children}</main>
          <Footer />
        </ThemeProvider>
        <ServiceWorkerRegistration />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
