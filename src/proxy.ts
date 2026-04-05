/**
 * PROXY - Route Handler (Next.js 16)
 * ===================================
 * Simple token-based auth: when login is ENABLED, checks for
 * "Authorization: Bearer <token>" header. When DISABLED, everything passes through.
 *
 * Toggle login ON/OFF from Settings page.
 * Auth state is managed server-side via /api/auth/ and /api/settings/auth.
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Static file patterns to skip
const staticPatterns = [
  "/_next/static",
  "/_next/image",
  "/favicon.ico",
  "/logo.svg",
  "/robots.txt",
]

export default async function proxy(req: NextRequest) {
  const { nextUrl } = req

  // ── Skip static files ──
  for (const pattern of staticPatterns) {
    if (nextUrl.pathname.startsWith(pattern)) {
      return NextResponse.next()
    }
  }

  // ── Always public routes (auth endpoints, login page) ──
  const alwaysPublic = [
    "/api/auth/",          // login, logout, status, check
    "/api/settings/auth",  // enable/disable login (emergency override)
    "/login",
    "/register",
    "/auth/error",
  ]
  for (const route of alwaysPublic) {
    if (nextUrl.pathname.startsWith(route)) {
      return NextResponse.next()
    }
  }

  // ── All other routes: pass through ──
  // Login is disabled by default. Auth checking is handled by
  // individual API routes via auth-simple module when login is enabled.
  // This avoids importing Node.js-specific modules into the Edge Runtime proxy.
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.svg|robots.txt).*)"
  ]
}
