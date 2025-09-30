/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.vercel-storage.com' },
      { protocol: 'https', hostname: 'blob.vercel-storage.com' },
    ],
    deviceSizes: [360, 640, 828, 1080],  // menej variant = lacnejšia prvá transformácia
    imageSizes: [16, 32, 64, 96, 128],
    formats: ['image/avif', 'image/webp']
  },
  productionBrowserSourceMaps: false,
  reactStrictMode: true
};

module.exports = nextConfig;
