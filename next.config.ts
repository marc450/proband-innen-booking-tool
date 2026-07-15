import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Next only optimizes for qualities listed here; anything else logs a
    // dev warning. We use 75 (default), 85 (course images) and 95 (logo).
    qualities: [75, 85, 95],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/kurse/cme-onlinekurse-botulinum",
        destination: "/kurse/cme-onlinekurse-botox",
        permanent: true,
      },
    ];
  },
  async headers() {
    const baseSecurityHeaders = [
      // Stop MIME-sniffing (e.g. a text/plain upload executed as script).
      { key: "X-Content-Type-Options", value: "nosniff" },
      // Don't leak full URLs (which can carry tokens) to other origins.
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // Force HTTPS for two years, including subdomains.
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
    ];
    return [
      {
        // Baseline hardening on every response.
        source: "/:path*",
        headers: baseSecurityHeaders,
      },
      {
        // The authenticated staff surfaces must never be framed
        // (clickjacking). These are not embedded anywhere, so DENY.
        source: "/dashboard/:path*",
        headers: [{ key: "X-Frame-Options", value: "DENY" }],
      },
      {
        source: "/m/:path*",
        headers: [{ key: "X-Frame-Options", value: "DENY" }],
      },
      {
        // Login / credential entry surface.
        source: "/login",
        headers: [{ key: "X-Frame-Options", value: "DENY" }],
      },
      {
        // Allow /courses/* pages to be embedded in iframes (LearnWorlds).
        // No X-Frame-Options here so it stays embeddable; the baseline
        // headers above still apply.
        source: "/courses/:path*",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
        ],
      },
    ];
  },
};

export default nextConfig;
