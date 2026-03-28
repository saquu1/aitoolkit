/**
 * OPTIMIZED PRISMA CLIENT
 * ========================
 * - Auto-detect environment (local vs serverless)
 * - Set default DATABASE_URL for serverless if not set
 * - Auto-create SQLite database if missing
 * - Graceful degradation when database unavailable
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

// =============================================================================
// SET DEFAULT DATABASE_URL FOR SERVERLESS
// This MUST run before PrismaClient is imported elsewhere
// =============================================================================

if (!process.env.DATABASE_URL) {
  // Detect serverless environment
  const isServerless = 
    process.env.FUNCTION_NAME ||           // Google Cloud Functions
    process.env.AWS_LAMBDA_FUNCTION_NAME || // AWS Lambda
    process.env.FC_FUNCTION_NAME ||         // Alibaba Cloud FC
    process.env.K_SERVICE ||                // Google Cloud Run
    process.env.VERCEL ||                   // Vercel
    process.env.RENDER ||                   // Render
    !fs.existsSync('/home/z/my-project')    // Local path doesn't exist
  
  if (isServerless) {
    // Use /tmp for serverless (writable but ephemeral)
    process.env.DATABASE_URL = 'file:/tmp/schema-architect.db'
    console.log('[Prisma] Serverless detected, DATABASE_URL set to: file:/tmp/schema-architect.db')
  } else {
    // Use local path
    process.env.DATABASE_URL = 'file:/home/z/my-project/db/custom.db'
    console.log('[Prisma] Local environment, DATABASE_URL set to: file:/home/z/my-project/db/custom.db')
  }
}

// =============================================================================
// GLOBAL TYPE DEFINITIONS
// =============================================================================

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaError: Error | undefined
}

// =============================================================================
// SQLITE AUTO-INITIALIZATION
// =============================================================================

/**
 * Ensures SQLite database file and directory exist
 */
function ensureSQLiteDatabase(): boolean {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl || !databaseUrl.startsWith('file:')) {
    return true // Not a file-based database
  }

  const filePath = databaseUrl.replace('file:', '')
  const dir = path.dirname(filePath)

  try {
    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      console.log(`[Prisma] Creating database directory: ${dir}`)
      fs.mkdirSync(dir, { recursive: true })
    }

    // Create empty database file if it doesn't exist
    if (!fs.existsSync(filePath)) {
      console.log(`[Prisma] Creating new SQLite database: ${filePath}`)
      // Write minimal SQLite header
      fs.writeFileSync(filePath, Buffer.from([
        0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66,
        0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x00
      ]))
    }

    console.log(`[Prisma] Database ready at: ${filePath}`)
    return true
  } catch (error) {
    console.error(`[Prisma] Failed to ensure database: ${error}`)
    return false
  }
}

// =============================================================================
// PRISMA CLIENT INITIALIZATION
// =============================================================================

let _prismaInstance: PrismaClient | null = null

function getPrismaClient(): PrismaClient | null {
  if (_prismaInstance) {
    return _prismaInstance
  }

  const databaseUrl = process.env.DATABASE_URL
  console.log(`[Prisma] Connecting to: ${databaseUrl}`)

  // Ensure SQLite database exists
  if (databaseUrl?.startsWith('file:')) {
    ensureSQLiteDatabase()
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

    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = _prismaInstance
    }

    console.log('[Prisma] Client initialized successfully')
    return _prismaInstance
  } catch (error) {
    console.error('[Prisma] Failed to initialize client:', error)
    globalForPrisma.prismaError = error as Error
    return null
  }
}

// Export a proxy that lazily initializes the client
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    const client = getPrismaClient()
    if (!client) {
      if (typeof prop === 'string') {
        if (prop === '$queryRaw' || prop === '$executeRaw') {
          return () => { throw new Error('Database not available') }
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

let _dbAvailable: boolean | null = null
let _lastCheckTime: number = 0
const CHECK_INTERVAL = 30000

export async function isDatabaseAvailable(): Promise<boolean> {
  const now = Date.now()
  
  if (_dbAvailable !== null && (now - _lastCheckTime) < CHECK_INTERVAL) {
    return _dbAvailable
  }

  const client = getPrismaClient()
  if (!client) {
    _dbAvailable = false
    _lastCheckTime = now
    return false
  }

  try {
    await client.$queryRaw`SELECT 1`
    _dbAvailable = true
    _lastCheckTime = now
    return true
  } catch (error) {
    console.error('[Prisma] Database check failed:', error)
    _dbAvailable = false
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
// EXPORTS
// =============================================================================

export async function checkDatabaseConnection(): Promise<boolean> {
  return isDatabaseAvailable()
}

export const db = prisma
export default prisma
