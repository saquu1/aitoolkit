/**
 * CUSTOM AUTH PROVIDERS ENDPOINT
 * ===============================
 * Overrides NextAuth's default providers endpoint to return correct URLs
 * This fixes the issue where reverse proxy returns internal URLs
 */

import { NextRequest, NextResponse } from 'next/server'

// Helper to check if URL is internal (function compute, internal services, etc.)
function isInternalUrl(url: string): boolean {
  const internalPatterns = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '.fcapp.run',
    '.internal.',
    '.cn-hongkong',
    '.cn-shanghai',
    '.cn-beijing',
    '.cn-shenzhen',
    '.cn-hangzhou',
    'ws-cdd-'
  ]
  
  const lowerUrl = url.toLowerCase()
  return internalPatterns.some(pattern => lowerUrl.includes(pattern.toLowerCase()))
}

export async function GET(request: NextRequest) {
  const headers = request.headers
  const requestUrl = new URL(request.url)
  
  console.log('[Auth Providers] === URL Detection Debug ===')
  console.log('[Auth Providers] request.url:', request.url)
  console.log('[Auth Providers] requestUrl.host:', requestUrl.host)
  console.log('[Auth Providers] requestUrl.hostname:', requestUrl.hostname)
  console.log('[Auth Providers] host header:', headers.get('host'))
  console.log('[Auth Providers] x-forwarded-host:', headers.get('x-forwarded-host'))
  console.log('[Auth Providers] x-forwarded-proto:', headers.get('x-forwarded-proto'))
  console.log('[Auth Providers] x-original-host:', headers.get('x-original-host'))
  console.log('[Auth Providers] AUTH_URL env:', process.env.AUTH_URL)
  
  // Determine the correct base URL
  let baseUrl: string = ''
  let detectionMethod: string = ''
  
  // Priority 1: AUTH_URL environment variable (if not internal)
  if (process.env.AUTH_URL && !isInternalUrl(process.env.AUTH_URL)) {
    baseUrl = process.env.AUTH_URL.replace(/\/$/, '')
    detectionMethod = 'AUTH_URL env'
  }
  
  // Priority 2: NEXTAUTH_URL environment variable (if not internal)
  if (!baseUrl && process.env.NEXTAUTH_URL && !isInternalUrl(process.env.NEXTAUTH_URL)) {
    baseUrl = process.env.NEXTAUTH_URL.replace(/\/$/, '')
    detectionMethod = 'NEXTAUTH_URL env'
  }
  
  // Priority 3: NEXT_PUBLIC_APP_URL environment variable (if not internal)
  if (!baseUrl && process.env.NEXT_PUBLIC_APP_URL && !isInternalUrl(process.env.NEXT_PUBLIC_APP_URL)) {
    baseUrl = process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
    detectionMethod = 'NEXT_PUBLIC_APP_URL env'
  }
  
  // Priority 4: x-original-host or x-real-host header (if not internal)
  if (!baseUrl) {
    const originalHost = headers.get('x-original-host') || headers.get('x-real-host')
    if (originalHost && !isInternalUrl(originalHost)) {
      const proto = headers.get('x-forwarded-proto') || 'https'
      baseUrl = `${proto}://${originalHost}`
      detectionMethod = 'x-original-host header'
    }
  }
  
  // Priority 5: Request URL host (if not internal)
  if (!baseUrl && requestUrl.host && !isInternalUrl(requestUrl.host)) {
    baseUrl = `${requestUrl.protocol}//${requestUrl.host}`
    detectionMethod = 'request.url host'
  }
  
  // Priority 6: Host header (if not internal)
  if (!baseUrl) {
    const hostHeader = headers.get('host')
    if (hostHeader && !isInternalUrl(hostHeader)) {
      const proto = headers.get('x-forwarded-proto') || requestUrl.protocol || 'https'
      baseUrl = `${proto}://${hostHeader}`
      detectionMethod = 'host header'
    }
  }
  
  // Final fallback: Use the request URL anyway (even if internal)
  if (!baseUrl) {
    baseUrl = `${requestUrl.protocol}//${requestUrl.host}`
    detectionMethod = 'fallback (internal URL)'
    console.warn('[Auth Providers] WARNING: Could not detect public URL, using request URL:', baseUrl)
  }
  
  console.log(`[Auth Providers] Using baseUrl: ${baseUrl} (detected via: ${detectionMethod})`)
  
  // Update environment variables for other auth operations
  if (!isInternalUrl(baseUrl)) {
    process.env.AUTH_URL = baseUrl
    process.env.NEXTAUTH_URL = baseUrl
    console.log(`[Auth Providers] Updated AUTH_URL to: ${baseUrl}`)
  }
  
  // Return providers with correct URLs
  const providers = {
    credentials: {
      id: "credentials",
      name: "credentials",
      type: "credentials",
      signinUrl: `${baseUrl}/api/auth/signin/credentials`,
      callbackUrl: `${baseUrl}/api/auth/callback/credentials`
    }
  }
  
  return NextResponse.json(providers, {
    headers: {
      'x-auth-base-url': baseUrl,
      'x-auth-detection-method': detectionMethod
    }
  })
}
