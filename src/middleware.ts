import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Routes that don't require authentication
const publicRoutes = [
  "/",
  "/login",
  "/register",
  "/auth/error",
  "/forgot-password",
  "/reset-password",
]

// API routes that don't require authentication
const publicApiRoutes = [
  "/api/health",
  "/api/auth",
  "/api/public",
  "/api/parsers",
  "/api/toolkit",
  "/api/ai",
  "/api/generate",
  "/api/migrate",
  "/api/schema",
  "/api/intelligence",
  "/api/export",
  "/api/projects",
  "/api/project-status",
  "/api/project-intelligence",
  "/api/project-export",
  "/api/download",
  "/api/file-system",
  "/api/file-manager",
  "/api/file-manager-v2",
  "/api/sp-generate",
  "/api/fk-resolution",
  "/api/backup",
  "/api/billing",
  "/api/collaboration",
  "/api/formatting",
  "/api/monitoring",
  "/api/multi-db",
  "/api/multi-tenant",
  "/api/notifications",
  "/api/pipeline",
  "/api/quality",
  "/api/validation",
  "/api/agents",
  "/api/phase2",
  "/api/phase3",
  "/api/session-status",
  "/api/session-actions",
  "/api/organization-building",
  "/api/schema-apply",
  "/api/prompts",
  "/api/memory-stats",
]

// Static file patterns to skip
const staticPatterns = [
  "/_next/static",
  "/_next/image",
  "/favicon.ico",
  "/logo.svg",
  "/robots.txt",
]

export default auth(async (req) => {
  const { nextUrl } = req
  const session = req.auth
  const isLoggedIn = !!session?.user
  
  // Check if it's a static file
  for (const pattern of staticPatterns) {
    if (nextUrl.pathname.startsWith(pattern)) {
      return NextResponse.next()
    }
  }

  // Check if it's a public API route
  for (const route of publicApiRoutes) {
    if (nextUrl.pathname.startsWith(route)) {
      return NextResponse.next()
    }
  }

  // Check if it's a public page route
  const isPublicPage = publicRoutes.some(route => 
    nextUrl.pathname === route || nextUrl.pathname.startsWith(route + "/")
  )

  // API routes require authentication (except public ones)
  if (nextUrl.pathname.startsWith("/api/")) {
    if (!isLoggedIn) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      )
    }
    return NextResponse.next()
  }

  // Redirect logged-in users away from auth pages
  if (isPublicPage && isLoggedIn && (nextUrl.pathname === "/login" || nextUrl.pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // Protected routes require authentication
  const protectedPrefixes = ["/dashboard", "/settings", "/projects", "/admin"]
  const isProtectedRoute = protectedPrefixes.some(prefix => 
    nextUrl.pathname.startsWith(prefix)
  )

  if (isProtectedRoute && !isLoggedIn) {
    // Store the attempted URL for redirect after login
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Admin routes require admin role
  if (nextUrl.pathname.startsWith("/admin") && session?.user?.role !== "admin" && session?.user?.role !== "owner") {
    return NextResponse.redirect(new URL("/dashboard?error=forbidden", req.url))
  }

  // Add security headers to all responses
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
