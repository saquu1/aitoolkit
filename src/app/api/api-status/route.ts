/**
 * API STATUS ROUTE
 * ================
 * Returns API health, auth status, and recent errors
 * 
 * Uses Route Registry for dynamic endpoint discovery
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { PUBLIC_API_ROUTES, PROTECTED_API_ROUTES } from '@/config/routes'
import * as fs from 'fs'
import * as path from 'path'

// Store recent errors in memory (simple approach)
const recentErrors: Array<{
  timestamp: string
  endpoint: string
  method: string
  status: number
  error: string
}> = []

// Track errors
export function trackApiError(endpoint: string, method: string, status: number, error: string) {
  recentErrors.unshift({
    timestamp: new Date().toISOString(),
    endpoint,
    method,
    status,
    error
  })
  // Keep only last 50 errors
  if (recentErrors.length > 50) {
    recentErrors.pop()
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  // Diagnostics action
  if (action === 'diagnostics') {
    return await handleDiagnostics()
  }

  // Check database connection
  let dbStatus = 'connected'
  let dbLatency = 0
  try {
    const start = Date.now()
    await prisma.$queryRaw`SELECT 1`
    dbLatency = Date.now() - start
  } catch (e) {
    dbStatus = 'disconnected'
  }

  // Check if auth is required
  const authRequired = process.env.AUTH_REQUIRED !== 'false'
  
  // Check for dev user
  let devUser = null
  try {
    devUser = await prisma.user.findFirst({
      where: { email: 'dev@localhost' },
      select: { id: true, email: true, name: true, isActive: true }
    })
  } catch (e) {
    // Ignore
  }

  // List API endpoints dynamically from Route Registry
  const methodMap: Record<string, string[]> = {
    '/api/health': ['GET'],
    '/api/auth': ['GET', 'POST'],
    '/api/public': ['GET'],
    '/api/session-status': ['GET'],
    '/api/memory-stats': ['GET'],
    '/api/system/threads': ['GET'],
    '/api/chat-logs': ['GET', 'POST'],
    '/api/raw-data': ['GET', 'POST', 'DELETE'],
    '/api/raw-data/re-import': ['POST'],
    '/api/schema/stats': ['GET'],
    '/api/analytics': ['GET'],
    '/api/api-status': ['GET', 'POST'],
    '/api/projects': ['GET', 'POST', 'PUT', 'DELETE'],
    '/api/project-status': ['GET'],
    '/api/project-intelligence': ['GET', 'POST'],
    '/api/project-export': ['GET'],
    '/api/parsers': ['GET', 'POST'],
    '/api/toolkit': ['GET'],
    '/api/ai': ['POST'],
    '/api/generate': ['POST'],
    '/api/migrate': ['POST'],
    '/api/schema': ['GET', 'POST'],
    '/api/intelligence': ['GET', 'POST'],
    '/api/export': ['GET'],
    '/api/download': ['GET'],
    '/api/file-system': ['GET'],
    '/api/file-manager': ['GET', 'POST'],
    '/api/file-manager-v2': ['GET', 'POST'],
  }

  // Build endpoints list from PUBLIC_API_ROUTES and PROTECTED_API_ROUTES
  // Deduplicate: if a route is in PUBLIC, don't show it as PROTECTED
  const publicEndpoints = PUBLIC_API_ROUTES.map(path => ({
    path,
    methods: methodMap[path] || ['GET'],
    auth: false
  }))

  const protectedEndpoints = PROTECTED_API_ROUTES
    .filter(path => !PUBLIC_API_ROUTES.includes(path as any)) // Remove duplicates
    .map(path => ({
      path,
      methods: methodMap[path] || ['GET', 'POST'],
      auth: true
    }))

  const endpoints = [...publicEndpoints, ...protectedEndpoints]

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    auth: {
      required: authRequired,
      hasDevUser: !!devUser,
      devUser
    },
    database: {
      status: dbStatus,
      latency: dbLatency
    },
    endpoints,
    recentErrors: recentErrors.slice(0, 20)
  })
}

// Create dev user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, routePath } = body

    if (action === 'create-dev-user') {
      // Check if dev user exists
      const existing = await prisma.user.findUnique({
        where: { email: 'dev@localhost' }
      })

      if (existing) {
        return NextResponse.json({
          success: true,
          message: 'Dev user already exists',
          user: { id: existing.id, email: existing.email, name: existing.name }
        })
      }

      // Create dev user
      const bcrypt = await import('bcryptjs')
      const { randomUUID } = await import('crypto')
      const passwordHash = await bcrypt.hash('dev123', 10)
      const now = new Date()

      const user = await prisma.user.create({
        data: {
          id: randomUUID(),
          email: 'dev@localhost',
          name: 'Developer',
          displayName: 'Developer',
          passwordHash,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Dev user created',
        user: { id: user.id, email: user.email, name: user.name },
        credentials: { email: 'dev@localhost', password: 'dev123' }
      })
    }

    if (action === 'disable-auth') {
      // This only works in development and requires server restart
      return NextResponse.json({
        success: false,
        message: 'Set AUTH_REQUIRED=false in .env and restart server to disable auth'
      })
    }

    // Check database connection and provide fix suggestions
    if (action === 'check-database') {
      try {
        const start = Date.now()
        await prisma.$queryRaw`SELECT 1`
        const latency = Date.now() - start
        
        return NextResponse.json({
          success: true,
          message: `Database connection OK (${latency}ms latency)`,
          details: { latency, status: 'connected' }
        })
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Unknown error'
        let fixSuggestion = 'Check DATABASE_URL environment variable'
        
        if (errorMsg.includes('ECONNREFUSED')) {
          fixSuggestion = 'Database server is not running. Start it with: docker-compose up -d or ensure PostgreSQL is running'
        } else if (errorMsg.includes('authentication')) {
          fixSuggestion = 'Database authentication failed. Check username/password in DATABASE_URL'
        } else if (errorMsg.includes('does not exist')) {
          fixSuggestion = 'Database does not exist. Create it or check database name in DATABASE_URL'
        }
        
        return NextResponse.json({
          success: false,
          message: `Database connection failed: ${errorMsg}`,
          fixSuggestion,
          error: errorMsg
        })
      }
    }

    // Check environment variables
    if (action === 'check-env') {
      const requiredEnvVars = [
        'DATABASE_URL',
        'AUTH_SECRET',
        'NEXTAUTH_URL'
      ]
      
      const missing: string[] = []
      const present: string[] = []
      
      for (const envVar of requiredEnvVars) {
        if (process.env[envVar]) {
          present.push(envVar)
        } else {
          missing.push(envVar)
        }
      }
      
      if (missing.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'All required environment variables are set',
          present
        })
      } else {
        return NextResponse.json({
          success: false,
          message: `Missing environment variables: ${missing.join(', ')}`,
          missing,
          present,
          fixSuggestion: 'Add missing variables to your .env file and restart the server'
        })
      }
    }

    // Run database migrations
    if (action === 'run-migrations') {
      try {
        const { execSync } = await import('child_process')
        
        execSync('npx prisma generate', { stdio: 'pipe', cwd: process.cwd() })
        execSync('npx prisma db push --skip-generate', { stdio: 'pipe', cwd: process.cwd() })
        
        return NextResponse.json({
          success: true,
          message: 'Database schema synchronized successfully'
        })
      } catch (e) {
        return NextResponse.json({
          success: false,
          message: `Migration failed: ${e instanceof Error ? e.message : 'Unknown error'}`,
          fixSuggestion: 'Run "npx prisma migrate dev" manually in the terminal'
        })
      }
    }

    // Regenerate Prisma client
    if (action === 'regenerate-prisma') {
      try {
        const { execSync } = await import('child_process')
        execSync('npx prisma generate', { stdio: 'pipe', cwd: process.cwd() })
        
        return NextResponse.json({
          success: true,
          message: 'Prisma client regenerated successfully. Restart the server to apply changes.'
        })
      } catch (e) {
        return NextResponse.json({
          success: false,
          message: `Prisma generate failed: ${e instanceof Error ? e.message : 'Unknown error'}`
        })
      }
    }

    // Add a public API route
    if (action === 'add-public-route') {
      if (!routePath || !routePath.startsWith('/api/')) {
        return NextResponse.json({
          success: false,
          error: 'Invalid route path. Must start with /api/'
        }, { status: 400 })
      }

      // Check if already public
      if (PUBLIC_API_ROUTES.includes(routePath as any)) {
        return NextResponse.json({
          success: true,
          message: 'Route is already public',
          routePath
        })
      }

      // Update routes.ts file
      try {
        const routesPath = path.join(process.cwd(), 'src/config/routes.ts')
        let routesContent = fs.readFileSync(routesPath, 'utf-8')

        // Find PUBLIC_API_ROUTES array and add the new route
        const publicRoutesMatch = routesContent.match(/export const PUBLIC_API_ROUTES = \[([\s\S]*?)\] as const/)
        
        if (publicRoutesMatch) {
          const existingRoutes = publicRoutesMatch[1]
          const newRouteEntry = `  '${routePath}',`
          const updatedRoutes = existingRoutes.trimEnd() + '\n' + newRouteEntry + '\n'
          routesContent = routesContent.replace(
            /export const PUBLIC_API_ROUTES = \[([\s\S]*?)\] as const/,
            `export const PUBLIC_API_ROUTES = [${updatedRoutes}] as const`
          )
          
          fs.writeFileSync(routesPath, routesContent, 'utf-8')
          
          return NextResponse.json({
            success: true,
            message: `Route ${routePath} added to public routes. Restart server to apply.`,
            routePath,
            requiresRestart: true
          })
        } else {
          return NextResponse.json({
            success: false,
            error: 'Could not find PUBLIC_API_ROUTES in routes.ts'
          }, { status: 500 })
        }
      } catch (fsError) {
        console.error('Failed to update routes.ts:', fsError)
        return NextResponse.json({
          success: false,
          error: 'Failed to update routes.ts: ' + (fsError instanceof Error ? fsError.message : 'Unknown error')
        }, { status: 500 })
      }
    }

    // Remove a public API route
    if (action === 'remove-public-route') {
      if (!routePath) {
        return NextResponse.json({
          success: false,
          error: 'routePath is required'
        }, { status: 400 })
      }

      try {
        const routesPath = path.join(process.cwd(), 'src/config/routes.ts')
        let routesContent = fs.readFileSync(routesPath, 'utf-8')

        // Remove the route line
        const routeLinePattern = new RegExp(`\\s*'${routePath}',?\\n?`, 'g')
        const newContent = routesContent.replace(routeLinePattern, '')
        
        if (newContent !== routesContent) {
          fs.writeFileSync(routesPath, newContent, 'utf-8')
          return NextResponse.json({
            success: true,
            message: `Route ${routePath} removed from public routes. Restart server to apply.`,
            routePath,
            requiresRestart: true
          })
        } else {
          return NextResponse.json({
            success: false,
            error: 'Route not found in PUBLIC_API_ROUTES'
          }, { status: 404 })
        }
      } catch (fsError) {
        console.error('Failed to update routes.ts:', fsError)
        return NextResponse.json({
          success: false,
          error: 'Failed to update routes.ts: ' + (fsError instanceof Error ? fsError.message : 'Unknown error')
        }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// =============================================================================
// DIAGNOSTICS HANDLER
// =============================================================================

async function handleDiagnostics() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    database: { connected: false, latency: 0, error: null },
    env: {
      databaseUrl: !!process.env.DATABASE_URL,
      authSecret: !!process.env.AUTH_SECRET,
      nextauthUrl: !!process.env.NEXTAUTH_URL,
      nodeEnv: process.env.NODE_ENV
    },
    prisma: { clientReady: false },
    auth: {
      required: process.env.AUTH_REQUIRED !== 'false',
      hasDevUser: false
    }
  }
  
  // Check database
  try {
    const start = Date.now()
    await prisma.$queryRaw`SELECT 1`
    diagnostics.database.connected = true
    diagnostics.database.latency = Date.now() - start
  } catch (e) {
    diagnostics.database.error = e instanceof Error ? e.message : 'Unknown error'
  }
  
  // Check Prisma client
  try {
    await prisma.$connect()
    diagnostics.prisma.clientReady = true
  } catch (e) {
    diagnostics.prisma.error = e instanceof Error ? e.message : 'Unknown error'
  }
  
  // Check dev user
  try {
    const devUser = await prisma.user.findFirst({
      where: { email: 'dev@localhost' }
    })
    diagnostics.auth.hasDevUser = !!devUser
  } catch (e) {
    // Ignore
  }
  
  return NextResponse.json(diagnostics)
}
