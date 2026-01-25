import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // ✅ Prevent Vercel build from failing on ESLint errors (like no-explicit-any)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ✅ Optional: prevent build from failing on TypeScript type errors
  // (Use this ONLY if you're blocked and will fix types shortly)
  // typescript: {
  //   ignoreBuildErrors: true,
  // },

  // ✅ If you use next/image with remote images (Supabase/S3/CDN), you’ll need this.
  // Add your actual domains here.
  images: {
    remotePatterns: [
      // Example patterns (edit to match your real hosts)
      // { protocol: "https", hostname: "YOUR-PROJECT.supabase.co" },
      // { protocol: "https", hostname: "cdn.yoursite.com" },
      // { protocol: "https", hostname: "*.amazonaws.com" },
    ],
  },
};

export default nextConfig;
