/**
 * ERROR REGISTRY SERVICE
 * ======================
 * Centralized error management with persistent storage
 * 
 * Features:
 * - Log errors to database with categorization
 * - Track error occurrences and patterns
 * - Link errors to solutions
 * - Provide auto-fix suggestions
 */

import { db } from '@/lib/db'
import { ErrorCategory, ErrorSeverity, ErrorSource } from '@prisma/client'

// =============================================================================
// TYPES
// =============================================================================

export interface CreateErrorInput {
  // Required
  message: string
  category: ErrorCategory | string
  severity: ErrorSeverity | string
  source: ErrorSource | string

  // Optional - Context
  errorCode?: string
  details?: string
  stackTrace?: string
  pattern?: string
  route?: string
  method?: string
  sessionId?: string
  userId?: string
  requestPayload?: string
  environment?: string

  // Optional - Resolution
  solution?: string
  autoFixAction?: string
  preventionTips?: string[]
  documentationUrl?: string
  relatedErrors?: string[]

  // Optional - Metadata
  tags?: string[]
  customData?: Record<string, any>
}

export interface ErrorQuery {
  category?: ErrorCategory | string
  severity?: ErrorSeverity | string
  source?: ErrorSource | string
  resolved?: boolean
  errorCode?: string
  search?: string
  limit?: number
  offset?: number
  sortBy?: 'lastSeen' | 'occurrenceCount' | 'severity' | 'firstSeen'
  sortOrder?: 'asc' | 'desc'
}

export interface ErrorStats {
  total: number
  unresolved: number
  byCategory: Record<string, number>
  bySeverity: Record<string, number>
  bySource: Record<string, number>
  topErrors: Array<{
    errorCode: string
    message: string
    count: number
  }>
  recentCount: number
  trend: Array<{
    date: string
    count: number
  }>
}

// =============================================================================
// KNOWN ERROR PATTERNS
// =============================================================================

const KNOWN_PATTERNS: Array<{
  pattern: RegExp
  category: ErrorCategory
  severity: ErrorSeverity
  errorCode: string
  solution: string
  autoFixAction?: string
  preventionTips: string[]
}> = [
  {
    pattern: /Invalid value for argument `(\w+)`. Expected (\w+)\.?/i,
    category: 'PRISMA_ENUM' as ErrorCategory,
    severity: 'MEDIUM' as ErrorSeverity,
    errorCode: 'P2005',
    solution: 'Import the enum from @prisma/client and use the correct enum value instead of a string literal.',
    autoFixAction: 'validate-enum',
    preventionTips: [
      'Always import enums from @prisma/client',
      'Use z.nativeEnum() in Zod schemas for validation',
      'Enable TypeScript strict mode to catch string literal issues',
      'Run `prisma generate` after schema changes'
    ]
  },
  {
    pattern: /Unique constraint failed on the fields: \(`?(\w+)`?\)/i,
    category: 'PRISMA_CONSTRAINT' as ErrorCategory,
    severity: 'MEDIUM' as ErrorSeverity,
    errorCode: 'P2002',
    solution: 'Use upsert() instead of create(), or check for existence before inserting.',
    autoFixAction: 'suggest-upsert',
    preventionTips: [
      'Use upsert() for operations that might create duplicates',
      'Add existence checks before create operations',
      'Consider using findUnique() + conditional create/update pattern'
    ]
  },
  {
    pattern: /Foreign key constraint failed on the field: `?(\w+)`?/i,
    category: 'PRISMA_CONSTRAINT' as ErrorCategory,
    severity: 'HIGH' as ErrorSeverity,
    errorCode: 'P2003',
    solution: 'Ensure the referenced record exists before creating the relationship.',
    autoFixAction: 'check-foreign-key',
    preventionTips: [
      'Create parent records before child records',
      'Use transactions for related operations',
      'Validate foreign key references before insert'
    ]
  },
  {
    pattern: /Record to (update|delete) not found/i,
    category: 'PRISMA_QUERY' as ErrorCategory,
    severity: 'LOW' as ErrorSeverity,
    errorCode: 'P2025',
    solution: 'Check if the record exists before updating or deleting.',
    preventionTips: [
      'Use findFirst() to check existence',
      'Handle null case gracefully in your code',
      'Consider using upsert() for idempotent operations'
    ]
  },
  {
    pattern: /Can't reach database server/i,
    category: 'PRISMA_CONNECTION' as ErrorCategory,
    severity: 'CRITICAL' as ErrorSeverity,
    errorCode: 'P1001',
    solution: 'Check your DATABASE_URL and ensure the database server is running.',
    autoFixAction: 'check-database',
    preventionTips: [
      'Use connection pooling',
      'Implement retry logic with exponential backoff',
      'Monitor database health'
    ]
  },
  {
    pattern: /Connection to database timed out/i,
    category: 'PRISMA_CONNECTION' as ErrorCategory,
    severity: 'HIGH' as ErrorSeverity,
    errorCode: 'P1002',
    solution: 'Increase connection timeout or check database load.',
    autoFixAction: 'check-database',
    preventionTips: [
      'Optimize slow queries',
      'Use connection pooling',
      'Set appropriate timeout values'
    ]
  }
]

// =============================================================================
// ERROR REGISTRY CLASS
// =============================================================================

class ErrorRegistry {
  /**
   * Log an error to the database
   * Alias for record() method for backward compatibility
   */
  async log(input: CreateErrorInput) {
    return this.record(input)
  }

  /**
   * Record an error to the database
   */
  private async record(input: CreateErrorInput) {
    // Try to match against known patterns
    const matchedPattern = this.matchPattern(input.message)
    
    // Check if this error already exists (same errorCode + message pattern)
    const existingError = await this.findSimilar(
      input.errorCode || matchedPattern?.errorCode || 'UNKNOWN',
      input.message
    )

    if (existingError) {
      // Update occurrence count and lastSeen
      return db.errorLog.update({
        where: { id: existingError.id },
        data: {
          occurrenceCount: { increment: 1 },
          lastSeen: new Date(),
          resolved: false,
          updatedAt: new Date()
        }
      })
    }

    // Create new error entry
    return db.errorLog.create({
      data: {
        message: input.message,
        errorCode: input.errorCode || matchedPattern?.errorCode || 'UNKNOWN',
        errorCategory: (input.category || matchedPattern?.category || 'UNKNOWN') as ErrorCategory,
        severity: (input.severity || matchedPattern?.severity || 'MEDIUM') as ErrorSeverity,
        source: input.source as ErrorSource,
        
        details: input.details,
        stackTrace: input.stackTrace,
        pattern: input.pattern || matchedPattern?.pattern.source,
        
        route: input.route,
        method: input.method,
        sessionId: input.sessionId,
        userId: input.userId,
        requestPayload: this.sanitizePayload(input.requestPayload),
        environment: input.environment || process.env.NODE_ENV || 'development',
        
        solution: input.solution || matchedPattern?.solution,
        autoFixAction: input.autoFixAction || matchedPattern?.autoFixAction,
        preventionTips: JSON.stringify(input.preventionTips || matchedPattern?.preventionTips || []),
        documentationUrl: input.documentationUrl,
        relatedErrors: JSON.stringify(input.relatedErrors || []),
        
        tags: JSON.stringify(input.tags || []),
        customData: input.customData ? JSON.stringify(input.customData) : null
      }
    })
  }

  /**
   * Find similar error by code and message similarity
   */
  private async findSimilar(errorCode: string, message: string) {
    const errors = await db.errorLog.findMany({
      where: { errorCode },
      orderBy: { lastSeen: 'desc' },
      take: 10
    })

    const messageStart = message.slice(0, 100).toLowerCase()
    return errors.find(e => 
      e.message.toLowerCase().startsWith(messageStart) ||
      message.toLowerCase().includes(e.message.toLowerCase().slice(0, 50))
    )
  }

  /**
   * Match error message against known patterns
   */
  private matchPattern(message: string) {
    for (const pattern of KNOWN_PATTERNS) {
      if (pattern.pattern.test(message)) {
        return pattern
      }
    }
    return null
  }

  /**
   * Sanitize sensitive data from payload
   */
  private sanitizePayload(payload: string | undefined): string | undefined {
    if (!payload) return undefined
    
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization']
    let sanitized = payload
    
    for (const field of sensitiveFields) {
      const regex = new RegExp(`"${field}"\\s*:\\s*"[^"]*"`, 'gi')
      sanitized = sanitized.replace(regex, `"${field}":"[REDACTED]"`)
    }
    
    return sanitized
  }

  /**
   * Get errors with filtering and pagination
   */
  async getErrors(query: ErrorQuery) {
    const where: any = {}

    if (query.category) where.errorCategory = query.category
    if (query.severity) where.severity = query.severity
    if (query.source) where.source = query.source
    if (query.resolved !== undefined) where.resolved = query.resolved
    if (query.errorCode) where.errorCode = query.errorCode

    if (query.search) {
      where.OR = [
        { message: { contains: query.search } },
        { details: { contains: query.search } },
        { errorCode: { contains: query.search } }
      ]
    }

    const [errors, total] = await Promise.all([
      db.errorLog.findMany({
        where,
        orderBy: { [query.sortBy || 'lastSeen']: query.sortOrder || 'desc' },
        take: query.limit || 50,
        skip: query.offset || 0
      }),
      db.errorLog.count({ where })
    ])

    return { errors, total }
  }

  /**
   * Get error by ID
   */
  async getError(id: string) {
    return db.errorLog.findUnique({
      where: { id }
    })
  }

  /**
   * Get error statistics
   */
  async getStats(): Promise<ErrorStats> {
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [
      total,
      unresolved,
      byCategoryRaw,
      bySeverityRaw,
      bySourceRaw,
      topErrorsRaw,
      recentCount,
      weeklyErrors
    ] = await Promise.all([
      db.errorLog.count(),
      db.errorLog.count({ where: { resolved: false } }),
      db.errorLog.groupBy({
        by: ['errorCategory'],
        _count: { id: true }
      }),
      db.errorLog.groupBy({
        by: ['severity'],
        _count: { id: true }
      }),
      db.errorLog.groupBy({
        by: ['source'],
        _count: { id: true }
      }),
      db.errorLog.groupBy({
        by: ['errorCode', 'message'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      }),
      db.errorLog.count({ where: { lastSeen: { gte: yesterday } } }),
      db.errorLog.findMany({
        where: { firstSeen: { gte: weekAgo } },
        select: { firstSeen: true }
      })
    ])

    const byCategory: Record<string, number> = {}
    for (const item of byCategoryRaw) {
      byCategory[item.errorCategory] = item._count.id
    }

    const bySeverity: Record<string, number> = {}
    for (const item of bySeverityRaw) {
      bySeverity[item.severity] = item._count.id
    }

    const bySource: Record<string, number> = {}
    for (const item of bySourceRaw) {
      bySource[item.source] = item._count.id
    }

    const topErrors = topErrorsRaw.map(item => ({
      errorCode: item.errorCode,
      message: item.message.slice(0, 100),
      count: item._count.id
    }))

    const trendMap: Record<string, number> = {}
    for (const error of weeklyErrors) {
      const date = error.firstSeen.toISOString().split('T')[0]
      trendMap[date] = (trendMap[date] || 0) + 1
    }

    const trend = Object.entries(trendMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return {
      total,
      unresolved,
      byCategory,
      bySeverity,
      bySource,
      topErrors,
      recentCount,
      trend
    }
  }

  /**
   * Resolve an error
   */
  async resolve(id: string, userId?: string, resolution?: string) {
    return db.errorLog.update({
      where: { id },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: userId,
        customData: resolution ? JSON.stringify({ resolution }) : undefined
      }
    })
  }

  /**
   * Bulk resolve errors
   */
  async bulkResolve(ids: string[], userId?: string) {
    return db.errorLog.updateMany({
      where: { id: { in: ids } },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: userId
      }
    })
  }

  /**
   * Get suggested fixes for an error
   */
  async getSuggestions(message: string) {
    const suggestions: Array<{
      pattern: string
      solution: string
      autoFixAction?: string
      preventionTips: string[]
    }> = []

    for (const pattern of KNOWN_PATTERNS) {
      if (pattern.pattern.test(message)) {
        suggestions.push({
          pattern: pattern.pattern.source,
          solution: pattern.solution,
          autoFixAction: pattern.autoFixAction,
          preventionTips: pattern.preventionTips
        })
      }
    }

    const similarResolved = await db.errorLog.findMany({
      where: {
        resolved: true,
        solution: { not: null },
        message: { contains: message.slice(0, 50) }
      },
      take: 3
    })

    for (const error of similarResolved) {
      if (error.solution) {
        suggestions.push({
          pattern: 'Previously resolved',
          solution: error.solution,
          preventionTips: error.preventionTips ? JSON.parse(error.preventionTips) : []
        })
      }
    }

    return suggestions
  }

  /**
   * Clean up old resolved errors
   */
  async cleanup(daysToKeep: number = 30) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - daysToKeep)

    return db.errorLog.deleteMany({
      where: {
        resolved: true,
        resolvedAt: { lt: cutoff }
      }
    })
  }
}

// =============================================================================
// EXPORT
// =============================================================================

export const errorRegistry = new ErrorRegistry()

export const logError = (input: CreateErrorInput) => errorRegistry.log(input)
export const getErrors = (query: ErrorQuery) => errorRegistry.getErrors(query)
export const getErrorStats = () => errorRegistry.getStats()
export const resolveError = (id: string, userId?: string, resolution?: string) => 
  errorRegistry.resolve(id, userId, resolution)
export const getErrorSuggestions = (message: string) => 
  errorRegistry.getSuggestions(message)
