import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
