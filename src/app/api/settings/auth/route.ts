import { NextRequest, NextResponse } from "next/server"
import { setLoginEnabled, isLoginEnabled, getAuthStats } from "@/lib/auth-simple"
import { checkRequestAuth } from "@/lib/auth-simple"

/**
 * GET /api/settings/auth
 * Get current auth settings (login enabled/disabled, token count)
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    loginEnabled: isLoginEnabled(),
    ...getAuthStats(),
  })
}

/**
 * PUT /api/settings/auth
 * Toggle login on/off. Only works when login is currently disabled
 * OR when a valid token is provided.
 */
export async function PUT(request: NextRequest) {
  try {
    const { loginEnabled } = await request.json()

    if (typeof loginEnabled !== "boolean") {
      return NextResponse.json({ error: "loginEnabled must be true or false" }, { status: 400 })
    }

    const authHeader = request.headers.get("authorization")
    const currentAuth = checkRequestAuth(authHeader)

    if (loginEnabled && !currentAuth.authenticated) {
      // Enabling login — must already be authenticated OR have login currently disabled
      if (isLoginEnabled()) {
        // Login is already ON and user is not authenticated — reject
        return NextResponse.json(
          { error: "Must be logged in to enable login requirement" },
          { status: 403 }
        )
      }
    }

    // Disabling login — always allowed (emergency override)
    const result = setLoginEnabled(loginEnabled)

    return NextResponse.json({
      success: true,
      loginEnabled: result.enabled,
      message: result.enabled
        ? "Login is now required. All API routes need a valid token."
        : "Login is now disabled. All routes are open.",
    })
  } catch (error: any) {
    console.error("[AuthSettings] Error:", error)
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}
