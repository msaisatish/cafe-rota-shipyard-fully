/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Shipyard's test copy of the app (the one the browser checks use, with its
  // own database) builds into its own folder, so it never fights the preview
  // over `.next` (AGENTS.md R8.1a).
  distDir: process.env.SHIPYARD_DIST_DIR || '.next',
  // The test copy keeps every page it has compiled for the length of a check
  // run. By default a page unused for a minute is dropped and compiled again on
  // the next visit, and the browser checks timed out waiting for it: 7 of 9
  // failures passed when run alone (Time Tracker, 28 Oct 2026). The preview
  // keeps Next's default.
  ...(process.env.SHIPYARD_DIST_DIR === '.next-checks'
    ? { onDemandEntries: { maxInactiveAge: 60 * 60 * 1000, pagesBufferLength: 200 } }
    : {}),
  // Fail the build on a type error rather than shipping one. This is the
  // default, and it is written down because turning it off is the first thing
  // people reach for when a build goes red — and it is how a broken app reaches
  // real users while every check still reports green.
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
  // Say nothing about what the app is built with, and send the headers that
  // cost nothing to send (test-app grades, November 2026). A content security
  // policy is the app's own: it has to list what its pages really load.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
