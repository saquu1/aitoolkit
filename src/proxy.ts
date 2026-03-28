/**
 * PROXY - Route Protection (Next.js 16)
 * ======================================
 * Replaces deprecated middleware.ts
 * Uses Route Registry for protected routes (Principle 1)
 * Single source of truth in src/config/routes.ts
 */

import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { 
  getPublicRoutes, 
  getPublicApiPrefixes, 
  getProtectedPrefixes 
} from "@/config/routes"

// Static file patterns to skip
const staticPatterns = [
  "/_next/static",
  "/_next/image",
  "/favicon.ico",
  "/logo.svg",
  "/robots.txt",
]

// Next.js 16 proxy export
export default auth(async (req: NextRequest) => {
  const { nextUrl } = req
  const session = (req as any).auth
  const isLoggedIn = !!session?.user
  
  // =========================================================================
  // Skip static files
  // =========================================================================
  for (const pattern of staticPatterns) {
    if (nextUrl.pathname.startsWith(pattern)) {
      return NextResponse.next()
    }
  }

  // =========================================================================
  // Public API routes - use Route Registry
  // =========================================================================
  const publicApiPrefixes = getPublicApiPrefixes()
  for (const route of publicApiPrefixes) {
    if (nextUrl.pathname.startsWith(route)) {
      return NextResponse.next()
    }
  }

  // =========================================================================
  // Public page routes - use Route Registry
  // =========================================================================
  const publicRoutes = getPublicRoutes()
  const isPublicPage = publicRoutes.some(route => 
    nextUrl.pathname === route || nextUrl.pathname.startsWith(route + "/")
  )

  // =========================================================================
  // API routes require authentication (except public ones above)
  // =========================================================================
  if (nextUrl.pathname.startsWith("/api/")) {
    if (!isLoggedIn) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      )
    }
    return NextResponse.next()
  }

  // =========================================================================
  // Redirect logged-in users away from auth pages
  // =========================================================================
  if (isPublicPage && isLoggedIn && (nextUrl.pathname === "/login" || nextUrl.pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // =========================================================================
  // Protected routes - use Route Registry
  // =========================================================================
  const protectedPrefixes = getProtectedPrefixes()
  const isProtectedRoute = protectedPrefixes.some(prefix => 
    nextUrl.pathname.startsWith(prefix)
  )

  if (isProtectedRoute && !isLoggedIn) {
    // Store the attempted URL for redirect after login
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // =========================================================================
  // Admin routes require admin role
  // =========================================================================
  if (nextUrl.pathname.startsWith("/admin") && session?.user?.role !== "admin" && session?.user?.role !== "owner") {
    return NextResponse.redirect(new URL("/dashboard?error=forbidden", req.url))
  }

  // =========================================================================
  // Security headers
  // =========================================================================
  const response = NextResponse.next()
  
  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY")
  
  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff")
  
  // XSS protection
  response.headers.set("X-XSS-Protection", "1; mode=block")
  
  // Referrer policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  
  // Content Security Policy
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.openai.com",
      "frame-ancestors 'none'",
    ].join("; ")
  )

  return response
})

export const config = {
  matcher: [
    // Match all routes except static files
    "/((?!_next/static|_next/image|favicon.ico|logo.svg|robots.txt).*)"
  ]
}
