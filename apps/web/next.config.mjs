/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Removed static export for dynamic route support (icon detail pages with source query param)
  // Use @cloudflare/next-on-pages for Cloudflare Pages deployment instead
  output: undefined,
  experimental: {
    typedRoutes: false,
    // Optimize package imports for faster builds
    optimizePackageImports: ["framer-motion", "@tanstack/react-virtual"],
  },
  // Image optimization settings
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.svg-api.org",
      },
      {
        protocol: "https",
        hostname: "svg-api.org",
      },
      {
        protocol: "https",
        hostname: "api.svgapi.com",
      },
    ],
  },
  // Compression for better performance
  compress: true,
  // Trailing slash for SEO consistency
  trailingSlash: false,
  // Security headers for development (production headers configured in Cloudflare Pages)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Cache static assets
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/api/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
      // SEO: Cache sitemap and robots for 1 hour
      {
        source: "/sitemap.xml",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600" },
          { key: "Content-Type", value: "application/xml" },
        ],
      },
      {
        source: "/sitemap/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600" },
          { key: "Content-Type", value: "application/xml" },
        ],
      },
      {
        source: "/robots.txt",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600" },
          { key: "Content-Type", value: "text/plain" },
        ],
      },
    ];
  },
  // Webpack optimization for bundle size
  webpack(config, { isServer }) {
    // Split chunks for better caching
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: "all",
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            chunks: "all",
          },
          common: {
            minChunks: 2,
            chunks: "all",
            enforce: true,
          },
        },
      };
    }
    return config;
  },
  // Redirects for SEO
  async redirects() {
    return [
      // Redirect old paths to new canonical paths
      {
        source: "/icon/:name",
        destination: "/icons/:name",
        permanent: true,
      },
      {
        source: "/source/:slug",
        destination: "/sources/:slug",
        permanent: true,
      },
      {
        source: "/category/:slug",
        destination: "/categories/:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
