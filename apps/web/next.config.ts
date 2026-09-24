import type { NextConfig } from "next";

// The browser talks to the API through /api/* on the web origin, so the session cookie is
// first-party. Rewrites are resolved at build time: set API_INTERNAL_URL before `next build`.
const apiInternalUrl = process.env.API_INTERNAL_URL ?? "http://localhost:8787";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiInternalUrl}/:path*` }];
  },
};

export default nextConfig;
