/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [
        { source: '/api/:path*', destination: 'http://devbox-app:8080/api/:path*' },
      ],
      fallback: [],
    }
  },
}

module.exports = nextConfig
