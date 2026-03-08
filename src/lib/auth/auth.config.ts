import type { NextAuthConfig } from "next-auth"

const protectedPaths = [
  '/dashboard', '/cases', '/chat', '/documents',
  '/research', '/deadlines', '/clients', '/billing',
  '/settings', '/drafting',
]

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
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
