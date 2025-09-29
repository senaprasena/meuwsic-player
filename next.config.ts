import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable webpack caching completely for Cloudflare Pages
  webpack: (config, { dev, isServer }) => {
    // Disable webpack caching in production builds
    if (!dev) {
      config.cache = false
    }
    return config
  },
  // Disable build cache for Cloudflare Pages deployment
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  // Optimize for Cloudflare Pages - use export for static files
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  async headers() {
    return [
      {
        source: '/musicol/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'audio/mpeg',
          },
          {
            key: 'Accept-Ranges',
            value: 'bytes',
          },
          {
            key: 'Content-Disposition',
            value: 'inline',
          },
        ],
      },
    ]
  },
}

export default nextConfig