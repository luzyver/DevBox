/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      { source: '/api/inbox/:address/stream', destination: 'http://devbox-app:8081/api/inbox/:address/stream' },
      { source: '/api/:path*', destination: 'http://devbox-app:8080/api/:path*' },
    ]
  },
}

module.exports = nextConfig
