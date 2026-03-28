import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./db"

// Extend the session and user types
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      role: string
      companyId?: string
    }
  }
  
  interface User {
    id: string
    email: string
    name?: string | null
    role: string
    companyId?: string
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string
    email: string
    name?: string | null
    role: string
    companyId?: string
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "email@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email as string
        const password = credentials.password as string

        // Find user with passwordHash
        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            userCompanies: {
              where: { status: 'active' },
              include: { company: true },
              take: 1
            }
          }
        })

        if (!user || !user.passwordHash) {
          return null
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.passwordHash)

        if (!passwordMatch) {
          return null
        }

        // Check if user is active
        if (!user.isActive) {
          throw new Error("Account is deactivated")
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        })

        // Get primary company
        const primaryCompany = user.userCompanies[0]

        return {
          id: user.id,
          email: user.email,
          name: user.displayName || user.name,
          role: primaryCompany?.role || 'member',
          companyId: primaryCompany?.companyId
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in - add user data to token
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.role = user.role
        token.companyId = user.companyId
      }
      
      // Update session if triggered
      if (trigger === "update" && session) {
        token.name = session.user.name
        token.role = session.user.role
        token.companyId = session.user.companyId
      }
      
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.email = token.email
        session.user.name = token.name
        session.user.role = token.role
        session.user.companyId = token.companyId
      }
      return session
    }
  },
  pages: {
    signIn: "/login",
    error: "/auth/error",
    newUser: "/register"
  },
  events: {
    async signIn({ user }) {
      // Log successful sign in
      console.log(`[Auth] User signed in: ${user.email}`)
    },
    async signOut({ token }) {
      // Log sign out
      console.log(`[Auth] User signed out: ${token?.email}`)
    }
  },
  debug: process.env.NODE_ENV === 'development'
})

// Helper function to get current user
export async function getCurrentUser() {
  const session = await auth()
  return session?.user
}

// Helper function to require authentication
export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Unauthorized")
  }
  return user
}

// Helper function to check if user is admin
export async function requireAdmin() {
  const user = await requireAuth()
  if (user.role !== 'admin' && user.role !== 'owner') {
    throw new Error("Admin access required")
  }
  return user
}

// Helper function to get user's company context
export async function getCompanyContext() {
  const user = await requireAuth()
  if (!user.companyId) {
    throw new Error("No company associated with user")
  }
  
  const company = await prisma.company.findUnique({
    where: { id: user.companyId },
    select: {
      id: true,
      name: true,
      slug: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      isActive: true,
      limits: true,
      usage: true
    }
  })
  
  if (!company || !company.isActive) {
    throw new Error("Company not found or inactive")
  }
  
  return {
    user,
    company,
    companyId: user.companyId
  }
}
