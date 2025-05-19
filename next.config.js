/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  poweredByHeader: false, // X-Powered-By 헤더 제거
  reactStrictMode: true,
  swcMinify: true, // SWC 미니파이어 사용 (성능 향상)
  compress: true, // 응답 압축
  // 이미지 최적화 설정
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },
  // 성능 최적화 설정
  experimental: {
    optimizeCss: true, // CSS 최적화
  },
};

module.exports = nextConfig; 