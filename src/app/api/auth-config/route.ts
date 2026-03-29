/**
 * AUTH CONFIGURATION DEBUG & FIX ENDPOINT
 * ========================================
 * Helps debug and fix AUTH_URL issues behind reverse proxies
 * 
 * GET: Returns current auth configuration
 * POST: Sets AUTH_URL to correct value
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Collect all possible host information
  const headers = request.headers
  
  const hostInfo = {
    // Standard headers
    host: headers.get('host'),
    'x-forwarded-host': headers.get('x-forwarded-host'),
    'x-forwarded-proto': headers.get('x-forwarded-proto'),
    'x-forwarded-for': headers.get('x-forwarded-for'),
    
    // Alternative headers that might contain the real host
    'x-original-host': headers.get('x-original-host'),
    'x-real-host': headers.get('x-real-host'),
    'x-original-url': headers.get('x-original-url'),
    'x-forwarded-server': headers.get('x-forwarded-server'),
    
    // Environment variables
    AUTH_URL: process.env.AUTH_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    VERCEL_URL: process.env.VERCEL_URL,
    NODE_ENV: process.env.NODE_ENV,
    
    // Request URL info
    requestUrl: request.url,
    requestHost: request.nextUrl.host,
    requestProtocol: request.nextUrl.protocol,
    requestHostname: request.nextUrl.hostname,
  }
  
  // Determine the correct public URL
  let detectedUrl: string | null = null
  let detectedFrom: string | null = null
  
  // Try to detect from the request URL (most reliable if behind a proper proxy)
  const requestUrl = new URL(request.url)
  if (requestUrl.hostname && !requestUrl.hostname.includes('.fcapp.run') && !requestUrl.hostname.includes('localhost')) {
    detectedUrl = `${requestUrl.protocol}//${requestUrl.host}`
    detectedFrom = 'request.url'
  }
  
  // Check environment variables
  if (!detectedUrl && process.env.AUTH_URL && !process.env.AUTH_URL.includes('.fcapp.run')) {
    detectedUrl = process.env.AUTH_URL
    detectedFrom = 'AUTH_URL env'
  }
  
  if (!detectedUrl && process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes('.fcapp.run')) {
    detectedUrl = process.env.NEXTAUTH_URL
    detectedFrom = 'NEXTAUTH_URL env'
  }
  
  // Check alternative headers
  const originalHost = headers.get('x-original-host') || headers.get('x-real-host')
  if (!detectedUrl && originalHost && !originalHost.includes('.fcapp.run')) {
    const proto = headers.get('x-forwarded-proto') || 'https'
    detectedUrl = `${proto}://${originalHost}`
    detectedFrom = 'x-original-host/x-real-host header'
  }
  
  return NextResponse.json({
    success: true,
    current: {
      authUrl: process.env.AUTH_URL || 'not set',
      nextAuthUrl: process.env.NEXTAUTH_URL || 'not set',
    },
    detected: {
      url: detectedUrl,
      from: detectedFrom,
    },
    headers: hostInfo,
    recommendation: detectedUrl ? 
      `Set AUTH_URL=${detectedUrl}` : 
      'Could not detect correct URL. Please set AUTH_URL environment variable manually.',
    action: detectedUrl ? 
      `POST to this endpoint with {"action":"set","url":"${detectedUrl}"}` : 
      'Set AUTH_URL in your deployment environment variables.'
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (body.action === 'set' && body.url) {
      // Validate URL
      try {
        new URL(body.url)
      } catch {
        return NextResponse.json({
          success: false,
          error: 'Invalid URL format'
        }, { status: 400 })
      }
      
      // Set environment variables at runtime
      process.env.AUTH_URL = body.url
      process.env.NEXTAUTH_URL = body.url
      
      return NextResponse.json({
        success: true,
        message: 'AUTH_URL set successfully',
        authUrl: body.url,
        note: 'This change is temporary and will reset on server restart. Set AUTH_URL in your deployment environment variables for permanent fix.'
      })
    }
    
    if (body.action === 'detect') {
      // Auto-detect and set
      const headers = request.headers
      const requestUrl = new URL(request.url)
      
      let detectedUrl: string | null = null
      
      if (requestUrl.hostname && !requestUrl.hostname.includes('.fcapp.run') && !requestUrl.hostname.includes('localhost')) {
        detectedUrl = `${requestUrl.protocol}//${requestUrl.host}`
      }
      
      if (detectedUrl) {
        process.env.AUTH_URL = detectedUrl
        process.env.NEXTAUTH_URL = detectedUrl
        
        return NextResponse.json({
          success: true,
          message: 'AUTH_URL auto-detected and set',
          authUrl: detectedUrl
        })
      }
      
      return NextResponse.json({
        success: false,
        message: 'Could not auto-detect correct URL',
        headers: {
          host: headers.get('host'),
          'x-forwarded-host': headers.get('x-forwarded-host'),
        }
      })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use {"action":"set","url":"https://..."} or {"action":"detect"}'
    }, { status: 400 })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
