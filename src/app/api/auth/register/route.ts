import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"

// Validation schema
const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validationResult = registerSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      )
    }
    
    const { name, email, password } = validationResult.data
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })
    
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      )
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)
    
    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        displayName: name,
        isActive: true,
        emailVerified: false,
      }
    })
    
    // Create a default company for the user
    const companySlug = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-").substring(0, 30)
    
    const company = await prisma.company.create({
      data: {
        name: `${name}'s Workspace`,
        slug: `${companySlug}-${Date.now().toString(36)}`,
        subscriptionTier: "free",
        subscriptionStatus: "trialing",
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
        isActive: true,
      }
    })
    
    // Link user to company as owner
    await prisma.userCompany.create({
      data: {
        userId: user.id,
        companyId: company.id,
        role: "owner",
        status: "active",
        joinedAt: new Date(),
      }
    })
    
    // Create a default project
    await prisma.project.create({
      data: {
        companyId: company.id,
        name: "My First Project",
        slug: "my-first-project",
        description: "A starter project for exploring the platform",
        softwareType: "Custom",
        status: "planning",
        createdBy: user.id,
      }
    })
    
    // Return success (don't include sensitive data)
    return NextResponse.json({
      success: true,
      message: "Account created successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    }, { status: 201 })
    
  } catch (error: any) {
    console.error("[Register] Error:", error)
    
    // Handle Prisma unique constraint errors
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
      { status: 500 }
    )
  }
}
