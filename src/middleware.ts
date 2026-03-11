import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth/auth.config"
import { NextRequest, NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

const allowedOrigins = [
  process.env.NEXT_PUBLIC_APP_URL ?? 'https://lexagent.kr',
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean);

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && allowedOrigins.includes(origin);
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

export default auth(async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin');

  // API 라우트: CORS 처리
  if (pathname.startsWith('/api/')) {
    // Preflight OPTIONS 요청 처리
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: getCorsHeaders(origin),
      });
    }

    // 외부 origin의 API 접근 차단 (same-origin 강제)
    if (origin && !allowedOrigins.includes(origin)) {
      return NextResponse.json(
        { error: 'CORS: 허용되지 않은 출처입니다.' },
        { status: 403 }
      );
    }

    const response = NextResponse.next();
    const corsHeaders = getCorsHeaders(origin);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  return NextResponse.next();
})

export const config = {
  matcher: [
    // API 라우트 포함 (CORS 처리 위해)
    '/api/:path*',
    // 페이지 라우트 (인증 처리)
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)).*)',
  ],
}
