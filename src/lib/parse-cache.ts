/**
 * Parse Cache System
 * 
 * Caches parsed results to enable incremental parsing and avoid
 * re-parsing unchanged files. Improves performance significantly.
 * 
 * Task: TASK-2.7 - Parse Cache Implementation
 * Gap ID: GAP-012 (Opus)
 */

import { prisma } from "./db"
import crypto from "crypto"

// ============================================================================
// Types
// ============================================================================

export interface CacheEntry {
  id: string
  projectId: string
  fileType: string
  filePath: string
  contentHash: string
  parseResult: ParseResult
  parseVersion: string
  parseDuration: number
  entityCount: number
  isValid: boolean
  errorMessage?: string
  parsedAt: Date
}

export interface ParseResult {
  entities: ParsedEntity[]
  metadata: ParseMetadata
  errors: ParseError[]
  warnings: ParseWarning[]
}

export interface ParsedEntity {
  type: string
  id: string
  name: string
  data: Record<string, any>
  lineStart: number
  lineEnd: number
  confidence: number
  source: string
}

export interface ParseMetadata {
  fileSize: number
  lineCount: number
  parseTime: number
  parserVersion: string
  language: string
  encoding: string
}

export interface ParseError {
  line: number
  column: number
  message: string
  severity: 'error' | 'fatal'
  code?: string
}

export interface ParseWarning {
  line: number
  column: number
  message: string
  code?: string
  suggestion?: string
}

export interface CacheStats {
  totalEntries: number
  validEntries: number
  invalidEntries: number
  totalSize: number
  avgParseTime: number
  totalEntities: number
  hitRate: number
  missRate: number
  byFileType: Record<string, FileTypeStats>
}

export interface FileTypeStats {
  count: number
  avgParseTime: number
  totalEntities: number
  avgEntities: number
}

export interface CacheInvalidationResult {
  invalidated: number
  preserved: number
  errors: string[]
}

// ============================================================================
// Constants
// ============================================================================

const CURRENT_PARSE_VERSION = "1.0.0"
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

// ============================================================================
// Core Cache Functions
// ============================================================================

/**
 * Get cached parse result for a file
 */
export async function getCachedParse(
  projectId: string,
  filePath: string,
  contentHash?: string
): Promise<CacheEntry | null> {
  try {
    const cache = await prisma.parseCache.findUnique({
      where: {
        projectId_filePath: {
          projectId,
          filePath
        }
      }
    })
    
    if (!cache) return null
    
    // Check if cache is still valid
    if (!cache.isValid) return null
    
    // Check content hash if provided
    if (contentHash && cache.contentHash !== contentHash) {
      // Content has changed, invalidate cache
      await invalidateCacheEntry(cache.id)
      return null
    }
    
    // Check TTL
    const parsedAt = new Date(cache.parsedAt)
    if (Date.now() - parsedAt.getTime() > CACHE_TTL_MS) {
      await invalidateCacheEntry(cache.id)
      return null
    }
    
    // Check parse version compatibility
    if (cache.parseVersion !== CURRENT_PARSE_VERSION) {
      // Parser version mismatch, need to re-parse
      await invalidateCacheEntry(cache.id)
      return null
    }
    
    return {
      id: cache.id,
      projectId: cache.projectId,
      fileType: cache.fileType,
      filePath: cache.filePath,
      contentHash: cache.contentHash,
      parseResult: JSON.parse(cache.parseResult),
      parseVersion: cache.parseVersion,
      parseDuration: cache.parseDuration,
      entityCount: cache.entityCount,
      isValid: cache.isValid,
      errorMessage: cache.errorMessage || undefined,
      parsedAt: new Date(cache.parsedAt)
    }
  } catch (error) {
    console.error('[ParseCache] Error getting cached parse:', error)
    return null
  }
}

/**
 * Store parse result in cache
 */
export async function cacheParseResult(
  projectId: string,
  filePath: string,
  fileType: string,
  contentHash: string,
  parseResult: ParseResult,
  parseDuration: number
): Promise<CacheEntry> {
  const entityCount = parseResult.entities.length
  
  const cache = await prisma.parseCache.upsert({
    where: {
      projectId_filePath: {
        projectId,
        filePath
      }
    },
    create: {
      projectId,
      fileType,
      filePath,
      contentHash,
      parseResult: JSON.stringify(parseResult),
      parseVersion: CURRENT_PARSE_VERSION,
      parseDuration,
      entityCount,
      isValid: true
    },
    update: {
      fileType,
      contentHash,
      parseResult: JSON.stringify(parseResult),
      parseVersion: CURRENT_PARSE_VERSION,
      parseDuration,
      entityCount,
      isValid: true,
      errorMessage: null,
      parsedAt: new Date()
    }
  })
  
  return {
    id: cache.id,
    projectId: cache.projectId,
    fileType: cache.fileType,
    filePath: cache.filePath,
    contentHash: cache.contentHash,
    parseResult: parseResult,
    parseVersion: cache.parseVersion,
    parseDuration: cache.parseDuration,
    entityCount: cache.entityCount,
    isValid: cache.isValid,
    parsedAt: new Date(cache.parsedAt)
  }
}

/**
 * Store parse error in cache
 */
export async function cacheParseError(
  projectId: string,
  filePath: string,
  fileType: string,
  contentHash: string,
  errorMessage: string,
  parseDuration: number = 0
): Promise<void> {
  await prisma.parseCache.upsert({
    where: {
      projectId_filePath: {
        projectId,
        filePath
      }
    },
    create: {
      projectId,
      fileType,
      filePath,
      contentHash,
      parseResult: JSON.stringify({ entities: [], metadata: {}, errors: [], warnings: [] }),
      parseVersion: CURRENT_PARSE_VERSION,
      parseDuration,
      entityCount: 0,
      isValid: false,
      errorMessage
    },
    update: {
      fileType,
      contentHash,
      parseResult: JSON.stringify({ entities: [], metadata: {}, errors: [], warnings: [] }),
      parseVersion: CURRENT_PARSE_VERSION,
      parseDuration,
      entityCount: 0,
      isValid: false,
      errorMessage
    }
  })
}

/**
 * Invalidate a specific cache entry
 */
export async function invalidateCacheEntry(cacheId: string): Promise<void> {
  await prisma.parseCache.update({
    where: { id: cacheId },
    data: { isValid: false }
  })
}

/**
 * Invalidate all cache entries for a project
 */
export async function invalidateProjectCache(
  projectId: string
): Promise<{ invalidated: number }> {
  const result = await prisma.parseCache.updateMany({
    where: { projectId },
    data: { isValid: false }
  })
  
  return { invalidated: result.count }
}

/**
 * Invalidate cache entries by file type
 */
export async function invalidateCacheByFileType(
  projectId: string,
  fileType: string
): Promise<{ invalidated: number }> {
  const result = await prisma.parseCache.updateMany({
    where: {
      projectId,
      fileType
    },
    data: { isValid: false }
  })
  
  return { invalidated: result.count }
}

/**
 * Invalidate cache entries by content hash pattern
 * Useful when a source dependency changes
 */
export async function invalidateCacheByDependency(
  projectId: string,
  dependencyPattern: string
): Promise<CacheInvalidationResult> {
  // Get all cache entries
  const caches = await prisma.parseCache.findMany({
    where: {
      projectId,
      isValid: true
    }
  })
  
  const errors: string[] = []
  let invalidated = 0
  let preserved = 0
  
  for (const cache of caches) {
    try {
      const parseResult = JSON.parse(cache.parseResult) as ParseResult
      
      // Check if any entity references the dependency
      const hasDependency = parseResult.entities.some(entity => 
        JSON.stringify(entity.data).includes(dependencyPattern)
      )
      
      if (hasDependency) {
        await prisma.parseCache.update({
          where: { id: cache.id },
          data: { isValid: false }
        })
        invalidated++
      } else {
        preserved++
      }
    } catch (error) {
      errors.push(`Failed to process cache ${cache.id}: ${error}`)
    }
  }
  
  return { invalidated, preserved, errors }
}

// ============================================================================
// Cache Utilities
// ============================================================================

/**
 * Calculate content hash for a file
 */
export function calculateHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex')
}

/**
 * Check if cached result is still valid by comparing content
 */
export async function isCacheValid(
  projectId: string,
  filePath: string,
  currentContentHash: string
): Promise<boolean> {
  const cache = await prisma.parseCache.findUnique({
    where: {
      projectId_filePath: {
        projectId,
        filePath
      }
    }
  })
  
  if (!cache) return false
  
  return cache.isValid && cache.contentHash === currentContentHash
}

/**
 * Get cache statistics for a project
 */
export async function getCacheStats(projectId: string): Promise<CacheStats> {
  const caches = await prisma.parseCache.findMany({
    where: { projectId }
  })
  
  const validCaches = caches.filter(c => c.isValid)
  const invalidCaches = caches.filter(c => !c.isValid)
  
  // Calculate file type statistics
  const byFileType: Record<string, FileTypeStats> = {}
  
  for (const cache of caches) {
    if (!byFileType[cache.fileType]) {
      byFileType[cache.fileType] = {
        count: 0,
        avgParseTime: 0,
        totalEntities: 0,
        avgEntities: 0
      }
    }
    
    byFileType[cache.fileType].count++
    byFileType[cache.fileType].totalEntities += cache.entityCount
  }
  
  // Calculate averages
  for (const fileType of Object.keys(byFileType)) {
    const typeCaches = caches.filter(c => c.fileType === fileType)
    byFileType[fileType].avgParseTime = typeCaches.length > 0
      ? Math.round(typeCaches.reduce((sum, c) => sum + c.parseDuration, 0) / typeCaches.length)
      : 0
    byFileType[fileType].avgEntities = typeCaches.length > 0
      ? Math.round(byFileType[fileType].totalEntities / typeCaches.length)
      : 0
  }
  
  // Estimate hit rate (simplified - based on valid cache ratio)
  const totalRequests = caches.length + invalidCaches.length
  const hitRate = totalRequests > 0 
    ? (validCaches.length / totalRequests) * 100 
    : 0
  
  return {
    totalEntries: caches.length,
    validEntries: validCaches.length,
    invalidEntries: invalidCaches.length,
    totalSize: caches.reduce((sum, c) => sum + c.parseResult.length, 0),
    avgParseTime: caches.length > 0
      ? Math.round(caches.reduce((sum, c) => sum + c.parseDuration, 0) / caches.length)
      : 0,
    totalEntities: caches.reduce((sum, c) => sum + c.entityCount, 0),
    hitRate: Math.round(hitRate * 10) / 10,
    missRate: Math.round((100 - hitRate) * 10) / 10,
    byFileType
  }
}

/**
 * Get list of cached files for a project
 */
export async function getCachedFiles(
  projectId: string,
  fileType?: string
): Promise<Array<{
  filePath: string
  fileType: string
  entityCount: number
  isValid: boolean
  parsedAt: Date
}>> {
  const where: any = { projectId }
  if (fileType) where.fileType = fileType
  
  const caches = await prisma.parseCache.findMany({
    where,
    select: {
      filePath: true,
      fileType: true,
      entityCount: true,
      isValid: true,
      parsedAt: true
    },
    orderBy: { filePath: 'asc' }
  })
  
  return caches.map(c => ({
    filePath: c.filePath,
    fileType: c.fileType,
    entityCount: c.entityCount,
    isValid: c.isValid,
    parsedAt: new Date(c.parsedAt)
  }))
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Batch cache multiple parse results
 */
export async function batchCacheResults(
  results: Array<{
    projectId: string
    filePath: string
    fileType: string
    contentHash: string
    parseResult: ParseResult
    parseDuration: number
  }>
): Promise<{ cached: number; errors: string[] }> {
  const errors: string[] = []
  let cached = 0
  
  for (const result of results) {
    try {
      await cacheParseResult(
        result.projectId,
        result.filePath,
        result.fileType,
        result.contentHash,
        result.parseResult,
        result.parseDuration
      )
      cached++
    } catch (error) {
      errors.push(`Failed to cache ${result.filePath}: ${error}`)
    }
  }
  
  return { cached, errors }
}

/**
 * Batch check cache validity
 */
export async function batchCheckCacheValidity(
  projectId: string,
  files: Array<{ filePath: string; contentHash: string }>
): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>()
  
  const caches = await prisma.parseCache.findMany({
    where: {
      projectId,
      filePath: { in: files.map(f => f.filePath) }
    }
  })
  
  const cacheMap = new Map(caches.map(c => [c.filePath, c]))
  
  for (const file of files) {
    const cache = cacheMap.get(file.filePath)
    results.set(
      file.filePath,
      cache?.isValid && cache.contentHash === file.contentHash
    )
  }
  
  return results
}

/**
 * Get cached entities by type from a project
 */
export async function getCachedEntitiesByType(
  projectId: string,
  entityType: string
): Promise<ParsedEntity[]> {
  const caches = await prisma.parseCache.findMany({
    where: {
      projectId,
      isValid: true
    }
  })
  
  const entities: ParsedEntity[] = []
  
  for (const cache of caches) {
    try {
      const parseResult = JSON.parse(cache.parseResult) as ParseResult
      const matchingEntities = parseResult.entities.filter(e => e.type === entityType)
      entities.push(...matchingEntities)
    } catch (error) {
      console.warn(`[ParseCache] Failed to parse cache for ${cache.filePath}`)
    }
  }
  
  return entities
}

// ============================================================================
// Cache Cleanup
// ============================================================================

/**
 * Clean up old/invalid cache entries
 */
export async function cleanupCache(
  projectId?: string,
  maxAge: number = CACHE_TTL_MS
): Promise<{ removed: number }> {
  const cutoffDate = new Date(Date.now() - maxAge)
  
  const where: any = {
    OR: [
      { isValid: false },
      { parsedAt: { lt: cutoffDate } }
    ]
  }
  
  if (projectId) {
    where.projectId = projectId
  }
  
  const result = await prisma.parseCache.deleteMany({ where })
  
  return { removed: result.count }
}

/**
 * Remove all cache entries for a project
 */
export async function clearProjectCache(projectId: string): Promise<{ removed: number }> {
  const result = await prisma.parseCache.deleteMany({
    where: { projectId }
  })
  
  return { removed: result.count }
}

// ============================================================================
// Cache Warming
// ============================================================================

/**
 * Pre-populate cache with expected files
 */
export async function warmCache(
  projectId: string,
  files: Array<{
    path: string
    content: string
    type: string
  }>,
  parseFunction: (content: string, type: string) => Promise<ParseResult>
): Promise<{ cached: number; errors: string[] }> {
  const errors: string[] = []
  let cached = 0
  
  for (const file of files) {
    try {
      const contentHash = calculateHash(file.content)
      
      // Check if already cached
      const existing = await getCachedParse(projectId, file.path, contentHash)
      if (existing) {
        continue
      }
      
      // Parse and cache
      const startTime = Date.now()
      const parseResult = await parseFunction(file.content, file.type)
      const parseDuration = Date.now() - startTime
      
      await cacheParseResult(
        projectId,
        file.path,
        file.type,
        contentHash,
        parseResult,
        parseDuration
      )
      
      cached++
    } catch (error) {
      errors.push(`Failed to cache ${file.path}: ${error}`)
    }
  }
  
  return { cached, errors }
}

// ============================================================================
// Export Types
// ============================================================================

export type { 
  CacheEntry as CacheEntryType, 
  ParseResult as ParseResultType, 
  CacheStats as CacheStatsType 
}
