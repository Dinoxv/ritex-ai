import type { NextConfig } from "next";

const deploymentId = process.env.NEXT_DEPLOYMENT_ID?.trim() || undefined;
const distDir = process.env.NEXT_DIST_DIR?.trim() || '.next';

const nextConfig: NextConfig = {
  deploymentId,
  distDir,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ritexai.com',
      },
    ],
  },
  trailingSlash: true,
  allowedDevOrigins: ['ritexai.com'],
};

export default nextConfig;
