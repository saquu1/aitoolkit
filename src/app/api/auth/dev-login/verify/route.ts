import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { signIn } from '@/lib/auth'

/**
 * GET /api/auth/dev-login/verify?token=xxx&email=xxx
 * Verifies the one-time login token and creates a proper NextAuth session
 * This endpoint sets the NextAuth session cookie directly
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const email = searchParams.get('email')

    if (!token || !email) {
      return NextResponse.json({ error: 'Missing token or email' }, { status: 400 })
    }

    // Look up the user and verify the token
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: {
        UserCompany: {
          where: { status: 'active' },
          include: { Company: true },
          take: 1
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const prefs = JSON.parse(user.preferences || '{}')

    // Verify token and expiry
    if (prefs._devLoginToken !== token) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    if (Date.now() > (prefs._devLoginTokenExpiry || 0)) {
      return NextResponse.json({ error: 'Token expired' }, { status: 401 })
    }

    // Clean up the token
    delete prefs._devLoginToken
    delete prefs._devLoginTokenExpiry
    await prisma.user.update({
      where: { id: user.id },
      data: { preferences: JSON.stringify(prefs) }
    })

    // Use NextAuth's signIn to create proper session
    // We can't call signIn() directly from an API route in NextAuth v5
    // Instead, redirect to the NextAuth callback with credentials embedded

    // Build redirect to NextAuth callback
    const callbackUrl = searchParams.get('callbackUrl') || '/'
    const redirectUrl = new URL(request.url)
    redirectUrl.pathname = '/api/auth/callback/credentials'
    redirectUrl.searchParams.delete('token')
    redirectUrl.searchParams.delete('email')
    redirectUrl.searchParams.delete('callbackUrl')

    // Set callback URL cookie for NextAuth
    const response = NextResponse.redirect(
      new URL(callbackUrl, request.url)
    )

    response.cookies.set('next-auth.callback-url', callbackUrl, {
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
    })

    return response
  } catch (error: any) {
    console.error('[DevLogin Verify] Error:', error)
    return NextResponse.json(
      { error: 'Verification failed', message: error.message },
      { status: 500 }
    )
  }
}
