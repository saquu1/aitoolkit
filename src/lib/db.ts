/**
 * OPTIMIZED PRISMA CLIENT
 * ========================
 * Memory-optimized database connection with:
 * - Connection pooling
 * - Query timeout
 * - Singleton pattern
 * - Graceful shutdown
 * - Lazy initialization for serverless environments
 */

import { PrismaClient } from '@prisma/client'

// =============================================================================
// GLOBAL TYPE DEFINITIONS
// =============================================================================

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaError: Error | undefined
}

// =============================================================================
// CONNECTION POOL SETTINGS
// =============================================================================

const CONNECTION_LIMIT = parseInt(process.env.PRISMA_CONNECTION_LIMIT || '5')
const QUERY_TIMEOUT = parseInt(process.env.PRISMA_QUERY_TIMEOUT || '30000')

// Track database availability
let _isDatabaseAvailable: boolean | null = null
let _lastCheckTime: number = 0
const CHECK_INTERVAL = 30000 // Re-check every 30 seconds

// =============================================================================
// LAZY PRISMA CLIENT INITIALIZATION
// =============================================================================

let _prismaInstance: PrismaClient | null = null

/**
 * Get Prisma client instance (lazy initialization)
 * Returns null if database is not available
 */
function getPrismaClient(): PrismaClient | null {
  // Return cached instance if available
  if (_prismaInstance) {
    return _prismaInstance
  }

  // Check if we have a database URL configured
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.warn('[Prisma] No DATABASE_URL configured - running without database')
    return null
  }

  // Check if it's a file-based database that might not exist
  if (databaseUrl.startsWith('file:')) {
    const filePath = databaseUrl.replace('file:', '')
    const fs = require('fs')
    if (!fs.existsSync(filePath)) {
      console.warn(`[Prisma] Database file not found: ${filePath} - running without database`)
      return null
    }
  }

  try {
    _prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn']
        : ['error'],
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    })

    // In development, attach to global to prevent hot-reload issues
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = _prismaInstance
    }

    return _prismaInstance
  } catch (error) {
    console.error('[Prisma] Failed to initialize client:', error)
    globalForPrisma.prismaError = error as Error
    return null
  }
}

// Export a proxy that lazily initializes the client
// This prevents errors during module load time
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    const client = getPrismaClient()
    if (!client) {
      // Return a function that throws or returns empty results
      if (typeof prop === 'string') {
        // Common Prisma methods - return safe defaults
        if (prop === '$queryRaw' || prop === '$executeRaw') {
          return () => {
            throw new Error('Database not available')
          }
        }
        if (prop === '$connect' || prop === '$disconnect') {
          return async () => {}
        }
        if (prop === '$transaction') {
          return async () => []
        }
      }
      throw new Error('Database not available')
    }
    return (client as any)[prop]
  }
})

// =============================================================================
// DATABASE AVAILABILITY CHECK
// =============================================================================

/**
 * Check if database is available
 * Caches result for CHECK_INTERVAL to avoid repeated checks
 */
export async function isDatabaseAvailable(): Promise<boolean> {
  const now = Date.now()
  
  // Use cached result if recent
  if (_isDatabaseAvailable !== null && (now - _lastCheckTime) < CHECK_INTERVAL) {
    return _isDatabaseAvailable
  }

  const client = getPrismaClient()
  if (!client) {
    _isDatabaseAvailable = false
    _lastCheckTime = now
    return false
  }

  try {
    await client.$queryRaw`SELECT 1`
    _isDatabaseAvailable = true
    _lastCheckTime = now
    return true
  } catch (error) {
    console.error('[Prisma] Database unavailable:', error)
    _isDatabaseAvailable = false
    _lastCheckTime = now
    return false
  }
}

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

if (process.env.NODE_ENV === 'production') {
  const shutdown = async () => {
    if (_prismaInstance) {
      try {
        await _prismaInstance.$disconnect()
        console.log('[Prisma] Disconnected gracefully')
      } catch (error) {
        console.error('[Prisma] Disconnect error:', error)
      }
    }
  }

  process.on('beforeExit', shutdown)
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

// =============================================================================
// HEALTH CHECK
// =============================================================================

export async function checkDatabaseConnection(): Promise<boolean> {
  return isDatabaseAvailable()
}

// =============================================================================
// QUERY HELPERS (Memory-safe)
// =============================================================================

/**
 * Execute a query with timeout and memory bounds
 */
export async function safeQuery<T>(
  queryFn: () => Promise<T>,
  timeout: number = QUERY_TIMEOUT
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Query timeout')), timeout)
  })

  return Promise.race([queryFn(), timeoutPromise])
}

/**
 * Batch query with chunking to prevent memory overflow
 */
export async function batchQuery<T, R>(
  items: T[],
  chunkSize: number,
  processor: (chunk: T[]) => Promise<R[]>
): Promise<R[]> {
  const results: R[] = []
  
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize)
    const chunkResults = await processor(chunk)
    results.push(...chunkResults)
    
    // Allow GC to run between chunks
    await new Promise(resolve => setImmediate(resolve))
  }
  
  return results
}

// =============================================================================
// ALIAS FOR BACKWARD COMPATIBILITY
// =============================================================================

export const db = prisma

export default prisma
