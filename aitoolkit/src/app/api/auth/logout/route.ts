import { NextRequest, NextResponse } from "next/server"
import { removeToken } from "@/lib/auth-simple"

/**
 * POST /api/auth/logout
 * Invalidates the bearer token
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim()
      removeToken(token)
    }

    return NextResponse.json({ success: true, message: "Logged out" })
  } catch (error: any) {
    return NextResponse.json({ error: "Logout failed" }, { status: 500 })
  }
}
