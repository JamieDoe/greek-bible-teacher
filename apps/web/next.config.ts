import type { NextConfig } from "next";

// The browser talks to the API through /api/* on the web origin, so the session cookie is
// first-party. Rewrites are resolved at build time: set API_INTERNAL_URL before `next build`.
const apiInternalUrl = process.env.API_INTERNAL_URL ?? "http://localhost:8787";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.0.56"],
  async headers() {
    return [
      {
        // Always revalidate the service worker so updates reach users promptly.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiInternalUrl}/:path*` }];
  },
};

export default nextConfig;
