/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  
  // TypeScript 오류를 무시하고 빌드합니다.
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // 특정 페이지를 정적 생성에서 제외합니다.
  experimental: {
    missingSuspenseWithCSRBailout: true
  }
};

export default nextConfig; 