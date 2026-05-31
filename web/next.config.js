/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      { source: '/api/:path*', destination: 'http://devbox-app:8080/api/:path*' },
    ]
  },
}

module.exports = nextConfig
