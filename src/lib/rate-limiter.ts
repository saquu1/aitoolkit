/**
 * Rate Limiting Library
 * Provides Redis-backed rate limiting for API protection
 */

// Simple in-memory store for development when Redis is not available
class MemoryStore {
  private store: Map<string, { count: number; resetTime: number }> = new Map()
  
  async increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number }> {
    const now = Date.now()
    const record = this.store.get(key)
    
    if (!record || now > record.resetTime) {
      // Start new window
      const newRecord = { count: 1, resetTime: now + windowMs }
      this.store.set(key, newRecord)
      return newRecord
    }
    
    // Increment existing
    record.count++
    return record
  }
  
  async decrement(key: string): Promise<void> {
    const record = this.store.get(key)
    if (record && record.count > 0) {
      record.count--
    }
  }
  
  async reset(key: string): Promise<void> {
    this.store.delete(key)
  }
  
  // Cleanup old entries periodically
  cleanup() {
    const now = Date.now()
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key)
      }
    }
  }
}

// Global memory store instance
const memoryStore = new MemoryStore()

// Cleanup every minute
if (typeof setInterval !== 'undefined') {
  setInterval(() => memoryStore.cleanup(), 60000)
}

export interface RateLimitConfig {
  // Maximum requests allowed in the window
  maxRequests: number
  // Window duration in milliseconds
  windowMs: number
  // Key prefix for Redis
  keyPrefix?: string
  // Skip rate limiting for certain conditions
  skip?: (identifier: string) => boolean
  // Custom key generator
  keyGenerator?: (identifier: string, path: string) => string
  // Custom message when rate limit exceeded
  message?: string
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetTime: number
  retryAfter: number
}

// Redis client (will be initialized if available)
let redisClient: any = null

/**
 * Initialize Redis client for rate limiting
 */
export function initializeRateLimiter(redisUrl?: string) {
  if (!redisUrl && !process.env.REDIS_URL) {
    console.log('[RateLimit] Redis URL not configured, using in-memory store')
    return
  }
  
  try {
    // Try to use ioredis if available
    const Redis = require('ioredis')
    redisClient = new Redis(redisUrl || process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
    })
    
    redisClient.on('connect', () => {
      console.log('[RateLimit] Redis connected')
    })
    
    redisClient.on('error', (err: Error) => {
      console.error('[RateLimit] Redis error:', err.message)
    })
  } catch (error) {
    console.log('[RateLimit] Redis not available, falling back to in-memory store')
    redisClient = null
  }
}

/**
 * Check rate limit using Redis or memory store
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const {
    maxRequests,
    windowMs,
    keyPrefix = 'ratelimit',
    skip
  } = config

  // Check if should skip
  if (skip?.(identifier)) {
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests,
      resetTime: Date.now() + windowMs,
      retryAfter: 0
    }
  }

  const key = `${keyPrefix}:${identifier}`

  if (redisClient) {
    return checkRateLimitRedis(key, maxRequests, windowMs)
  }
  
  return checkRateLimitMemory(key, maxRequests, windowMs)
}

/**
 * Check rate limit using Redis
 */
async function checkRateLimitRedis(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowStart = now - windowMs
  
  try {
    // Use Redis pipeline for atomic operations
    const pipeline = redisClient.pipeline()
    
    // Remove old entries outside the window
    pipeline.zremrangebyscore(key, 0, windowStart)
    
    // Count current entries
    pipeline.zcard(key)
    
    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random().toString(36).slice(2)}`)
    
    // Set expiry on the key
    pipeline.pexpire(key, windowMs)
    
    const results = await pipeline.exec()
    
    const count = results[1][1] // Result of zcard
    
    const remaining = Math.max(0, maxRequests - count - 1)
    const resetTime = now + windowMs
    
    return {
      success: count < maxRequests,
      limit: maxRequests,
      remaining,
      resetTime,
      retryAfter: count >= maxRequests ? windowMs : 0
    }
  } catch (error) {
    console.error('[RateLimit] Redis error, falling back to memory:', error)
    return checkRateLimitMemory(key, maxRequests, windowMs)
  }
}

/**
 * Check rate limit using in-memory store
 */
async function checkRateLimitMemory(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  const { count, resetTime } = await memoryStore.increment(key, windowMs)
  
  const remaining = Math.max(0, maxRequests - count)
  const retryAfter = count > maxRequests ? resetTime - Date.now() : 0
  
  return {
    success: count <= maxRequests,
    limit: maxRequests,
    remaining,
    resetTime,
    retryAfter: Math.max(0, retryAfter)
  }
}

/**
 * Reset rate limit for an identifier
 */
export async function resetRateLimit(
  identifier: string,
  keyPrefix: string = 'ratelimit'
): Promise<void> {
  const key = `${keyPrefix}:${identifier}`
  
  if (redisClient) {
    await redisClient.del(key)
  } else {
    await memoryStore.reset(key)
  }
}

/**
 * Decrement rate limit count (for rollback scenarios)
 */
export async function decrementRateLimit(
  identifier: string,
  keyPrefix: string = 'ratelimit'
): Promise<void> {
  const key = `${keyPrefix}:${identifier}`
  
  if (redisClient) {
    // Remove the most recent entry
    await redisClient.zpopmax(key)
  } else {
    await memoryStore.decrement(key)
  }
}

/**
 * Get current rate limit status without incrementing
 */
export async function getRateLimitStatus(
  identifier: string,
  config: RateLimitConfig
): Promise<{ count: number; remaining: number; resetTime: number }> {
  const { maxRequests, windowMs, keyPrefix = 'ratelimit' } = config
  const key = `${keyPrefix}:${identifier}`
  
  if (redisClient) {
    const now = Date.now()
    const windowStart = now - windowMs
    
    // Remove old entries and count
    await redisClient.zremrangebyscore(key, 0, windowStart)
    const count = await redisClient.zcard(key)
    
    return {
      count,
      remaining: Math.max(0, maxRequests - count),
      resetTime: now + windowMs
    }
  }
  
  // For memory store, we need to check without incrementing
  const record = (memoryStore as any).store.get(key)
  
  if (!record || Date.now() > record.resetTime) {
    return {
      count: 0,
      remaining: maxRequests,
      resetTime: Date.now() + windowMs
    }
  }
  
  return {
    count: record.count,
    remaining: Math.max(0, maxRequests - record.count),
    resetTime: record.resetTime
  }
}

// ============================================================================
// PRECONFIGURED RATE LIMITERS
// ============================================================================

/**
 * General API rate limiter (100 requests per minute)
 */
export const apiRateLimit: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60 * 1000,
  keyPrefix: 'api',
  message: 'Too many requests, please try again later'
}

/**
 * Authentication rate limiter (5 attempts per minute)
 */
export const authRateLimit: RateLimitConfig = {
  maxRequests: 5,
  windowMs: 60 * 1000,
  keyPrefix: 'auth',
  message: 'Too many authentication attempts, please try again later'
}

/**
 * File upload rate limiter (10 uploads per minute)
 */
export const uploadRateLimit: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 60 * 1000,
  keyPrefix: 'upload',
  message: 'Too many file uploads, please slow down'
}

/**
 * Search rate limiter (30 searches per minute)
 */
export const searchRateLimit: RateLimitConfig = {
  maxRequests: 30,
  windowMs: 60 * 1000,
  keyPrefix: 'search',
  message: 'Too many search requests, please slow down'
}

/**
 * Strict rate limiter for sensitive operations (3 per minute)
 */
export const strictRateLimit: RateLimitConfig = {
  maxRequests: 3,
  windowMs: 60 * 1000,
  keyPrefix: 'strict',
  message: 'Too many attempts, please wait before trying again'
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a rate limit middleware function for API routes
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return async (
    identifier: string,
    onSuccess: () => Promise<Response>,
    onLimited?: (result: RateLimitResult) => Promise<Response>
  ): Promise<Response> => {
    const result = await checkRateLimit(identifier, config)
    
    if (!result.success) {
      if (onLimited) {
        return onLimited(result)
      }
      
      return new Response(
        JSON.stringify({
          error: 'Too Many Requests',
          message: config.message || 'Rate limit exceeded',
          retryAfter: result.retryAfter
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(result.limit),
            'X-RateLimit-Remaining': String(result.remaining),
            'X-RateLimit-Reset': String(result.resetTime),
            'Retry-After': String(Math.ceil(result.retryAfter / 1000))
          }
        }
      )
    }
    
    const response = await onSuccess()
    
    // Add rate limit headers to successful response
    response.headers.set('X-RateLimit-Limit', String(result.limit))
    response.headers.set('X-RateLimit-Remaining', String(result.remaining))
    response.headers.set('X-RateLimit-Reset', String(result.resetTime))
    
    return response
  }
}

/**
 * Get client identifier from request
 */
export function getClientIdentifier(request: Request): string {
  // Try to get from authenticated user
  // This would need to be integrated with your auth system
  
  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIp) {
    return realIp
  }
  
  // Last resort - use a hash of available headers
  const userAgent = request.headers.get('user-agent') || ''
  const acceptLanguage = request.headers.get('accept-language') || ''
  
  return `unknown-${hashString(userAgent + acceptLanguage)}`
}

/**
 * Simple string hash for generating identifiers
 */
function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

// Initialize on module load
if (typeof window === 'undefined') {
  initializeRateLimiter()
}
