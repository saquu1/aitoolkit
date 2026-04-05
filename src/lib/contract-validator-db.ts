/**
 * Contract Validator Database Module
 * 
 * This module provides a fresh Prisma client specifically for the contract validator.
 * Uses dynamic require to bypass module caching.
 */

// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:/home/z/my-project/db/custom.db'
}

// Cache invalidation counter - changes force re-import
let cacheInvalidator = Date.now()
let _client: any = null
let _clientTime = 0

/**
 * Get a fresh Prisma client
 * In development, this creates a new client on every call
 */
export function getFreshPrismaClient(): any {
  const now = Date.now()
  const isDev = process.env.NODE_ENV !== 'production'
  
  // In development, always create fresh client after 5 seconds
  if (isDev && _client && (now - _clientTime) > 5000) {
    console.log('[CV-DB] Development mode - creating fresh client')
    _client = null
  }
  
  if (_client) {
    return _client
  }
  
  try {
    // Clear require cache for Prisma
    if (isDev) {
      Object.keys(require.cache).forEach(key => {
        if (key.includes('@prisma/client') || key.includes('.prisma')) {
          delete require.cache[key]
        }
      })
    }
    
    // Dynamic require
    const { PrismaClient } = require('@prisma/client')
    
    _client = new PrismaClient({
      log: ['error', 'warn'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    })
    _clientTime = now
    
    console.log('[CV-DB] Created fresh Prisma client')
    return _client
  } catch (error) {
    console.error('[CV-DB] Failed to create Prisma client:', error)
    throw error
  }
}

/**
 * Force cache invalidation
 */
export function invalidateCache() {
  cacheInvalidator = Date.now()
  _client = null
  _clientTime = 0
  console.log('[CV-DB] Cache invalidated')
}

// Create a proxy that always gets a fresh client
export const cvDb = new Proxy({} as any, {
  get(target, prop) {
    const client = getFreshPrismaClient()
    if (!client) {
      throw new Error('Database not available')
    }
    return client[prop]
  }
})

export default cvDb
