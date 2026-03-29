import { NextRequest, NextResponse } from "next/server"
import { validateToken } from "@/lib/auth-simple"

/**
 * GET /api/auth/check
 * Validates a bearer token and returns user info
 * Used by the client to check if a stored token is still valid
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ valid: false, reason: "No token provided" })
    }

    const token = authHeader.slice(7).trim()
    const user = validateToken(token)

    if (!user) {
      return NextResponse.json({ valid: false, reason: "Token invalid or expired" })
    }

    return NextResponse.json({
      valid: true,
      user,
    })
  } catch (error: any) {
    return NextResponse.json({ valid: false, reason: "Server error" }, { status: 500 })
  }
}
