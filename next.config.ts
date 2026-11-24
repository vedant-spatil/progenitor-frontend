import type { NextConfig } from "next";

// Where the Next.js server reaches Django. Read at build time for rewrites,
// so Docker builds pass it as a build arg (see frontend/Dockerfile).
const backendUrl = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000";

// NEXT_OUTPUT=export builds static files into out/ for S3 + CloudFront (ADR 0008). Static export has no
// rewrites: CloudFront routes /api/* to the backend, and its viewer-request function
// (scripts/cloudfront-spa.js) maps /app/(runs|patients|trials)/<id> to the "_" placeholder page and other
// paths to <path>.html. The standalone server does the placeholder mapping with the rewrites below.
// No trailingSlash, so URLs are the same in both modes.
const isExport = process.env.NEXT_OUTPUT === "export";

// Dynamic app pages are built once as "_" and read the id from the URL (components/app/usePathId.ts).
const placeholders = ["runs", "patients", "trials"].map((section) => ({
  source: `/app/${section}/:id((?!new$|_$)[^/]+)`,
  destination: `/app/${section}/_`,
}));

const nextConfig: NextConfig = {
  // Export mode rejects PPR ("Invariant: PPR cannot be enabled in export mode"), which Cache Components
  // turns on. The app pages are client-rendered either way, so export builds plain static pages.
  ...(isExport
    ? { output: "export" }
    : { output: "standalone", cacheComponents: true, partialPrefetching: true }),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  ...(isExport
    ? {}
    : {
        async rewrites() {
          return {
            beforeFiles: placeholders,
            afterFiles: [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }],
            fallback: [],
          };
        },
      }),
};

export default nextConfig;
