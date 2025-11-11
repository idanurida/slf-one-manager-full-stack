/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    largePageDataBytes: 512 * 1000,
    missingSuspenseWithCSRBailout: false,
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