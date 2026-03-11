/** @type {import('next').NextConfig} */

// Content Security Policy
// Next.js App Router는 hydration을 위해 unsafe-inline이 필요함
const cspDirectives = [
  "default-src 'self'",
  // Next.js hydration + 인라인 스크립트 허용
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  // Tailwind CSS 인라인 스타일 허용
  "style-src 'self' 'unsafe-inline'",
  // 이미지: self + data URI(아이콘) + blob(미리보기)
  "img-src 'self' data: blob:",
  // 폰트
  "font-src 'self'",
  // API 연결: self + 외부 AI/법률 API
  [
    "connect-src 'self'",
    "https://api.openai.com",
    "https://www.law.go.kr",        // 국가법령정보센터
    "https://www.lawnb.com",        // 법령 DB
    "https://casenote.kr",          // 판례 노트
    "https://glaw.scourt.go.kr",    // 대법원 판례
  ].join(' '),
  // 미디어 (음성 입력)
  "media-src 'self'",
  // 플러그인 비허용
  "object-src 'none'",
  // iframe 삽입 방지
  "frame-ancestors 'none'",
  // base URI 제한
  "base-uri 'self'",
  // 폼 액션 제한
  "form-action 'self'",
  // 업그레이드 (HTTP → HTTPS)
  "upgrade-insecure-requests",
].join('; ');

const securityHeaders = [
  // Content Security Policy
  {
    key: 'Content-Security-Policy',
    value: cspDirectives,
  },
  // HTTPS 강제
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Clickjacking 방어
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  // MIME sniffing 방어
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // Referrer 정책
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // XSS 방어 (구형 브라우저)
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  // Permissions 정책
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(self), geolocation=(), payment=()',
  },
  // DNS prefetch 제어
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  // CORP (Cross-Origin Resource Policy)
  {
    key: 'Cross-Origin-Resource-Policy',
    value: 'same-origin',
  },
  // COEP (Cross-Origin Embedder Policy) - SharedArrayBuffer 필요 시 활성화
  // { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
];

const nextConfig = {
  output: 'standalone',
  experimental: {
    typedRoutes: false,
    // 패키지 최적화: 서버/클라이언트 번들 분리
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@langchain/core',
      '@langchain/openai',
    ],
  },
  images: {
    remotePatterns: [],
    // WebP/AVIF 자동 변환으로 이미지 크기 최적화
    formats: ['image/avif', 'image/webp'],
  },
  // 컴파일러 최적화
  compiler: {
    // 프로덕션 빌드에서 console.log 제거
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },
  async headers() {
    return [
      {
        // 모든 경로에 보안 헤더 적용
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // 정적 자산 장기 캐싱 (Next.js _next/static은 content-hash 포함)
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // API 응답 캐시 비허용 (항상 최신 데이터)
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
        ],
      },
    ];
  },
  // 프로덕션에서 소스맵 비활성화 (코드 노출 방지)
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;
