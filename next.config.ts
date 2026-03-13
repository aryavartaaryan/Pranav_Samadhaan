import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',

  // firebase-admin uses native Node modules (@opentelemetry, gRPC, etc.)
  // that must NOT be bundled by Turbopack — require them at runtime instead.
  serverExternalPackages: [
    'firebase-admin',
    '@google-cloud/firestore',
    '@google-cloud/storage',
    '@opentelemetry/api',
    'google-gax',
  ],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },

  // ── Turbopack: Alias Node-only modules to empty stubs ──────────────────
  // The 'telegram' (GramJS) package internally requires Node.js modules
  // (fs, net, tls) that don't exist in the browser.
  // Use conditional { browser } aliases so server-side Node.js modules
  // remain intact (Firebase, @google/genai, etc. still work on the server).
  turbopack: {
    resolveAlias: {
      fs: { browser: './src/lib/empty-module.js' },
      net: { browser: './src/lib/empty-module.js' },
      tls: { browser: './src/lib/empty-module.js' },
    },
  },

  // ── Webpack fallback (used when building without Turbopack) ────────────
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },

  experimental: {
    // optimizePackageImports: ['lucide-react', 'framer-motion'],
  }
};

export default nextConfig;

