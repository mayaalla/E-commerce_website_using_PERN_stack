import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: "standalone",
  reactCompiler: true,
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  /**
   * Proxy all /api/* requests from the browser to the Express backend.
   *
   * In development  → rewrites to http://localhost:5000/api/*
   * In production   → set NEXT_PUBLIC_API_URL in your hosting env instead.
   *
   * With this proxy you can also call `/api/...` directly from Server
   * Components without CORS concerns.
   */
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
