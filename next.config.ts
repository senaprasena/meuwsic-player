import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    turbo: {
      // Remove MP3 processing rules to allow direct serving
    },
  },
  // Remove webpack configuration that processes audio files
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