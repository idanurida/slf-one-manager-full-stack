/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    largePageDataBytes: 512 * 1000,
  },
  productionBrowserSourceMaps: false,
  webpack: (config) => {
    config.optimization.splitChunks = {
      chunks: 'all',
      maxSize: 256000,
    };
    config.devtool = false;
    return config;
  }
}

module.exports = nextConfig
