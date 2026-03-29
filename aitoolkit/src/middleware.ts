/**
 * MIDDLEWARE - Next.js Edge Middleware
 * =====================================
 * Runs at the edge before requests reach API routes/pages.
 * Currently login is DISABLED — all routes are public (no auth check).
 * 
 * When login is enabled via Settings page, API routes require
 * "Authorization: Bearer <token>" header.
 * 
 * NOTE: Edge runtime has no access to Node.js globals, filesystem, or
 * shared in-memory state. Auth state is managed via API routes.
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export default async function middleware(req: NextRequest) {
  const { nextUrl } = req

  // ── API routes: always pass through (no auth check for now) ──
  // Login is disabled by default. The auth-simple module manages
  // token validation in API routes themselves, not in middleware.
  if (nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  // ── Page routes: always pass through ──
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.svg|robots.txt).*)"
  ]
}
