/** @type {import('next').NextConfig} */

const securityHeaders = [
  // HTTPS 강제
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Clickjacking 방어
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  // MIME sniffing 방어
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // Referrer 정책
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin',
  },
  // XSS 방어 (구형 브라우저)
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  // Permissions 정책
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(self), geolocation=()',
  },
  // DNS prefetch 제어
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
];

const nextConfig = {
  output: 'standalone',
  experimental: {
    typedRoutes: false,
  },
  images: {
    remotePatterns: [],
  },
  async headers() {
    return [
      {
        // 모든 경로에 보안 헤더 적용
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  // 프로덕션에서 소스맵 비활성화 (코드 노출 방지)
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;
