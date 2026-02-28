import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },

  experimental: {
    // optimizePackageImports: ['lucide-react', 'framer-motion'],
  }
};

export default nextConfig;
