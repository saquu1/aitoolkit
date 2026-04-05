import { NextResponse } from "next/server"
import { isLoginEnabled, getAuthStats } from "@/lib/auth-simple"

/**
 * GET /api/auth/status
 * Returns whether login is required and auth stats
 * Public endpoint — no token needed
 */
export async function GET() {
  return NextResponse.json({
    loginEnabled: isLoginEnabled(),
    ...getAuthStats(),
  })
}
