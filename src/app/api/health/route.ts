/**
 * Health Check API Endpoint
 * TASK-5.1: Docker Deployment Configuration
 * Provides health status for container orchestration
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  version: string
  uptime: number
  checks: {
    database: {
      status: 'up' | 'down'
      latency?: number
      error?: string
    }
    redis: {
      status: 'up' | 'down' | 'unknown'
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
    redis: { status: 'unknown' },
    memory: getMemoryUsage()
  }

  // Check database
  try {
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const dbLatency = Date.now() - dbStart
    checks.database = {
      status: 'up',
      latency: dbLatency
    }
  } catch (error: any) {
    checks.database = {
      status: 'down',
      error: error.message
    }
  }

  // Check Redis (optional)
  try {
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
    }
  } catch (error: any) {
    checks.redis = {
      status: 'down',
      error: error.message
    }
  }

  // Determine overall status
  let status: HealthStatus['status'] = 'healthy'
  if (checks.database.status === 'down') {
    status = 'unhealthy'
  } else if (checks.redis.status === 'down') {
    status = 'degraded'
  }

  const health: HealthStatus = {
    status,
    timestamp: new Date().toISOString(),
    version: VERSION,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks
  }

  // Return appropriate HTTP status
  const httpStatus = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503

  return NextResponse.json(health, { status: httpStatus })
}

/**
 * HEAD /api/health
 * Simple health check for load balancers
 */
export async function HEAD(request: NextRequest) {
  try {
    await prisma.$queryRaw`SELECT 1`
    return new NextResponse(null, { status: 200 })
  } catch {
    return new NextResponse(null, { status: 503 })
  }
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
 */
async function getRedisClient(): Promise<{
  ping: () => Promise<string>
  disconnect: () => void
} | null> {
  try {
    // Only try Redis if URL is configured
    const redisUrl = process.env.REDIS_URL
    if (!redisUrl) return null
    
    // Check if ioredis is available
    let Redis: any
    try {
      Redis = require('ioredis')
    } catch {
      // ioredis not installed, skip Redis check
      return null
    }
    
    return new Redis(redisUrl, {
      connectTimeout: 5000,
      maxRetriesPerRequest: 1
    })
  } catch {
    return null
  }
}
