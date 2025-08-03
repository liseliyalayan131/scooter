/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
  },
  // output: 'export', // API routes ile uyumsuz - kaldırıldı
};

module.exports = nextConfig;
