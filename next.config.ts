import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable build cache for Cloudflare Pages deployment
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  // Optimize for Cloudflare Pages
  output: 'standalone',
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