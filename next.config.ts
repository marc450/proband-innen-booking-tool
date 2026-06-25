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
    return [
      {
        // Allow /courses/* pages to be embedded in iframes (LearnWorlds)
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
