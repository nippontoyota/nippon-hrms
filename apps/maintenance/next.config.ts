import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel manages Next.js output tracing itself. Keep standalone output for
  // the Docker image, which copies the standalone server during its build.
  ...(process.env.VERCEL ? {} : { output: 'standalone' as const }),
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
