import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { createToken } from "@/lib/auth-simple"

/**
 * POST /api/auth/simple-login
 * Validates credentials and returns a bearer token (no cookies!)
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: {
        UserCompany: {
          where: { status: "active" },
          include: { Company: true },
          take: 1,
        },
      },
    })

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const match = await bcrypt.compare(password, user.passwordHash)
    if (!match) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    if (!user.isActive) {
      return NextResponse.json({ error: "Account is deactivated" }, { status: 403 })
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    const primaryCompany = user.UserCompany[0]

    // Create bearer token
    const token = createToken({
      id: user.id,
      email: user.email,
      name: user.displayName || user.name || "",
      role: primaryCompany?.role || "member",
    })

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.displayName || user.name,
        role: primaryCompany?.role || "member",
      },
    })
  } catch (error: any) {
    console.error("[SimpleLogin] Error:", error)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
