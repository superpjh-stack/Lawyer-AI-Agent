import type { NextAuthConfig } from "next-auth"

const protectedPaths = [
  '/dashboard', '/cases', '/chat', '/documents',
  '/research', '/deadlines', '/clients', '/billing',
  '/settings', '/drafting', '/advisory',
]

// JWT 세션 최대 유지 시간: 8시간 (법률 업무 특성 반영 — 업무 시간 기준)
const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours in seconds

export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE,
    updateAge: 60 * 60, // 1시간마다 토큰 갱신
  },
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,   // JS 접근 차단 (XSS 방어)
        sameSite: 'lax',  // CSRF 방어
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: SESSION_MAX_AGE,
      },
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isProtected = protectedPaths.some(p => nextUrl.pathname.startsWith(p))
      const isAuthPage = nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/register')

      if (isProtected && !isLoggedIn) return false
      if (isAuthPage && isLoggedIn) return Response.redirect(new URL('/dashboard', nextUrl))
      return true
    },
  },
  providers: [],
}
