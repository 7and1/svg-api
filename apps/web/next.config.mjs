/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Removed static export for dynamic route support (icon detail pages with source query param)
  // Use @cloudflare/next-on-pages for Cloudflare Pages deployment instead
  output: undefined,
  experimental: {
    typedRoutes: false,
  },
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
        ],
      },
    ];
  },
};

export default nextConfig;
