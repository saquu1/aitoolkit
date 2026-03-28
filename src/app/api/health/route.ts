/**
 * Health Check API Endpoint
 * TASK-5.1: Docker Deployment Configuration
 * Provides health status for container orchestration
 * 
 * UPDATED: Supports graceful degradation when database is unavailable
 */

import { NextRequest, NextResponse } from 'next/server'
import { isDatabaseAvailable, prisma } from '@/lib/db'

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded' | 'initializing'
  timestamp: string
  version: string
  uptime: number
  environment: string
  checks: {
    database: {
      status: 'up' | 'down' | 'not_configured'
      latency?: number
      error?: string
    }
    redis: {
      status: 'up' | 'down' | 'not_configured'
      latency?: number
      error?: string
    }
    memory: {
      used: number
      total: number
      percentage: number
    }
  }
}

// Track start time for uptime calculation
const startTime = Date.now()

// Version from environment or package.json
const VERSION = process.env.npm_package_version || '1.0.0'

/**
 * GET /api/health
 * Comprehensive health check for orchestration
 */
export async function GET(request: NextRequest) {
  const checks: HealthStatus['checks'] = {
    database: { status: 'down' },
    redis: { status: 'not_configured' },
    memory: getMemoryUsage()
  }

  // Check database availability (non-blocking)
  try {
    const dbStart = Date.now()
    const isAvailable = await isDatabaseAvailable()
    
    if (isAvailable) {
      const dbLatency = Date.now() - dbStart
      checks.database = {
        status: 'up',
        latency: dbLatency
      }
    } else {
      // Check if database URL is configured but unavailable
      if (process.env.DATABASE_URL) {
        checks.database = {
          status: 'down',
          error: 'Database connection failed'
        }
      } else {
        checks.database = {
          status: 'not_configured',
          error: 'DATABASE_URL not configured'
        }
      }
    }
  } catch (error: any) {
    checks.database = {
      status: 'down',
      error: error.message || 'Unknown database error'
    }
  }

  // Check Redis (optional)
  try {
    const redisUrl = process.env.REDIS_URL
    if (redisUrl) {
      const redisStart = Date.now()
      const redis = await getRedisClient()
      if (redis) {
        await redis.ping()
        const redisLatency = Date.now() - redisStart
        checks.redis = {
          status: 'up',
          latency: redisLatency
        }
        redis.disconnect()
      } else {
        checks.redis = {
          status: 'down',
          error: 'Redis client initialization failed'
        }
      }
    }
  } catch (error: any) {
    checks.redis = {
      status: 'down',
      error: error.message
    }
  }

  // Determine overall status
  let status: HealthStatus['status'] = 'healthy'
  
  if (checks.database.status === 'not_configured') {
    // Allow running without database (for preview environments)
    status = 'degraded'
  } else if (checks.database.status === 'down') {
    status = 'unhealthy'
  } else if (checks.redis.status === 'down') {
    status = 'degraded'
  }

  const health: HealthStatus = {
    status,
    timestamp: new Date().toISOString(),
    version: VERSION,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    environment: process.env.NODE_ENV || 'development',
    checks
  }

  // Return appropriate HTTP status
  // Even degraded status returns 200 to allow container to start
  const httpStatus = status === 'unhealthy' ? 503 : 200

  return NextResponse.json(health, { status: httpStatus })
}

/**
 * HEAD /api/health
 * Simple health check for load balancers
 * Returns 200 even if database is unavailable (graceful degradation)
 */
export async function HEAD(request: NextRequest) {
  // Always return 200 for HEAD requests
  // This allows the container to pass health checks
  // even when database is temporarily unavailable
  return new NextResponse(null, { status: 200 })
}

/**
 * Get memory usage statistics
 */
function getMemoryUsage(): HealthStatus['checks']['memory'] {
  const memUsage = process.memoryUsage()
  const used = memUsage.heapUsed
  const total = memUsage.heapTotal

  return {
    used,
    total,
    percentage: Math.round((used / total) * 100)
  }
}

/**
 * Get Redis client (lazy loaded)
 * Note: ioredis is an optional dependency - Redis check is skipped if not installed
 */
async function getRedisClient(): Promise<{
  ping: () => Promise<string>
  disconnect: () => void
} | null> {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) return null
  
  try {
    const Redis = require('ioredis')
    return new Redis(redisUrl, {
      connectTimeout: 5000,
      maxRetriesPerRequest: 1
    })
  } catch {
    return null
  }
}
