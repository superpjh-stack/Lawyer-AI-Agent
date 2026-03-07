import { auth } from "@/lib/auth/config"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl

  const isProtected = pathname.startsWith('/dashboard') ||
    pathname.startsWith('/cases') ||
    pathname.startsWith('/chat') ||
    pathname.startsWith('/documents') ||
    pathname.startsWith('/research') ||
    pathname.startsWith('/deadlines') ||
    pathname.startsWith('/clients') ||
    pathname.startsWith('/billing') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/drafting')

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register')

  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
