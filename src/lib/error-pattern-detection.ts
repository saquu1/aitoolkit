/**
 * ERROR PATTERN DETECTION SERVICE
 * ===============================
 * Analyzes error logs to detect patterns and suggest solutions
 *
 * Features:
 * - Automatic pattern detection from error logs
 * - Pattern matching for new errors
 * - Root cause analysis suggestions
 * - Prevention strategy recommendations
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// =============================================================================
// TYPES
// =============================================================================

export interface DetectedPattern {
  id: string
  patternKey: string
  patternName: string
  errorType: string
  endpoint: string
  httpStatus: number
  description: string
  occurrenceCount: number
  lastOccurrence: Date
  suggestedRootCause?: string
  suggestedPrevention?: string
  suggestedAutoFix?: string
}

export interface PatternMatch {
  matched: boolean
  pattern?: DetectedPattern
  confidence: number
}

export interface PatternAnalysisResult {
  patternsFound: number
  newPatterns: number
  updatedPatterns: number
  patterns: DetectedPattern[]
}

// =============================================================================
// PATTERN DETECTION RULES
// =============================================================================

const KNOWN_PATTERNS: Record<string, {
  rootCause: string
  prevention: string
  autoFix?: string
}> = {
  // Server errors
  'SERVER_FAILURE_/api/raw-data_502': {
    rootCause: 'Database query timeout or connection pool exhaustion',
    prevention: 'Add query timeouts, optimize slow queries, increase connection pool size',
    autoFix: 'Check for long-running queries and add appropriate indexes'
  },
  'SERVER_FAILURE_/api/chat-logs_500': {
    rootCause: 'Uncaught exception in chat log processing',
    prevention: 'Add try-catch blocks, validate input data before processing',
    autoFix: 'Check error logs for specific exception message'
  },

  // Business logic patterns
  'BUSINESS_LOGIC_/api/raw-data_409': {
    rootCause: 'Duplicate data submission - same content submitted multiple times',
    prevention: 'Implement idempotency keys or client-side deduplication',
    autoFix: 'Check if data already exists before saving, use forceSave flag if intentional'
  },

  // Auth errors
  'AUTH_ERROR_/api/*_401': {
    rootCause: 'Session expired or invalid authentication token',
    prevention: 'Implement token refresh, redirect to login on 401',
    autoFix: 'Clear local session and redirect to login page'
  },

  // Network errors
  'NETWORK_ERROR_*_0': {
    rootCause: 'Network connectivity issue or CORS error',
    prevention: 'Add retry logic with exponential backoff, check CORS configuration',
    autoFix: 'Retry request up to 3 times with increasing delays'
  },

  // Timeout patterns
  'NETWORK_ERROR_/api/*_0': {
    rootCause: 'Request timeout - server took too long to respond',
    prevention: 'Increase client timeout, implement streaming for long operations',
    autoFix: 'Split large operations into smaller chunks'
  }
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Analyze recent errors and detect patterns
 */
export async function analyzeErrorPatterns(
  lookbackHours: number = 24
): Promise<PatternAnalysisResult> {
  const startTime = new Date(Date.now() - lookbackHours * 60 * 60 * 1000)

  // Get all errors in the time window
  const errors = await prisma.errorLog.findMany({
    where: { timestamp: { gte: startTime } },
    orderBy: { timestamp: 'asc' }
  })

  // Group by endpoint + status
  const groups = new Map<string, typeof errors>()

  for (const error of errors) {
    const key = `${error.endpoint}_${error.status}`
    const existing = groups.get(key) || []
    existing.push(error)
    groups.set(key, existing)
  }

  const patterns: DetectedPattern[] = []
  let newPatterns = 0
  let updatedPatterns = 0

  // Process each group
  for (const [key, groupErrors] of groups) {
    if (groupErrors.length < 3) continue // Skip if not enough occurrences

    const first = groupErrors[0]
    const last = groupErrors[groupErrors.length - 1]
    const endpoint = first.endpoint.split('?')[0]

    // Create pattern key
    const patternKey = `${first.type}_${endpoint}_${first.status}`.replace(/[^a-zA-Z0-9_]/g, '_')

    // Check for known patterns
    const knownPattern = findKnownPattern(first.type, endpoint, first.status)

    // Create or update pattern
    const existingPattern = await prisma.errorPattern.findUnique({
      where: { patternKey }
    })

    if (existingPattern) {
      // Update existing pattern
      await prisma.errorPattern.update({
        where: { patternKey },
        data: {
          occurrenceCount: groupErrors.length,
          lastOccurrence: last.timestamp,
          rootCause: knownPattern?.rootCause || existingPattern.rootCause,
          preventionStrategy: knownPattern?.prevention || existingPattern.preventionStrategy,
          autoFixSolution: knownPattern?.autoFix || existingPattern.autoFixSolution,
        }
      })
      updatedPatterns++
    } else {
      // Create new pattern
      await prisma.errorPattern.create({
        data: {
          patternKey,
          patternName: `${first.type} - ${endpoint}`,
          errorType: first.type,
          endpoint,
          httpStatus: first.status,
          description: first.message,
          rootCause: knownPattern?.rootCause,
          preventionStrategy: knownPattern?.prevention,
          autoFixSolution: knownPattern?.autoFix,
          occurrenceCount: groupErrors.length,
          severity: determinePatternSeverity(first.type, first.status, groupErrors.length),
          firstOccurrence: first.timestamp,
          lastOccurrence: last.timestamp,
        }
      })
      newPatterns++
    }

    // Link errors to pattern
    const pattern = await prisma.errorPattern.findUnique({ where: { patternKey } })
    if (pattern) {
      await prisma.errorLog.updateMany({
        where: { id: { in: groupErrors.map(e => e.id) } },
        data: { patternId: pattern.id }
      })

      patterns.push({
        id: pattern.id,
        patternKey,
        patternName: pattern.patternName,
        errorType: pattern.errorType,
        endpoint: pattern.endpoint || '',
        httpStatus: pattern.httpStatus || 0,
        description: pattern.description,
        occurrenceCount: pattern.occurrenceCount,
        lastOccurrence: pattern.lastOccurrence,
        suggestedRootCause: pattern.rootCause || undefined,
        suggestedPrevention: pattern.preventionStrategy || undefined,
        suggestedAutoFix: pattern.autoFixSolution || undefined,
      })
    }
  }

  return {
    patternsFound: patterns.length,
    newPatterns,
    updatedPatterns,
    patterns,
  }
}

/**
 * Match a new error against known patterns
 */
export async function matchErrorPattern(error: {
  type: string
  endpoint: string
  status: number
  message: string
}): Promise<PatternMatch> {
  const endpoint = error.endpoint.split('?')[0]

  // Try exact match first
  let pattern = await prisma.errorPattern.findFirst({
    where: {
      endpoint: error.endpoint,
      httpStatus: error.status,
      patternStatus: { in: ['ACTIVE', 'MONITORING'] }
    }
  })

  if (pattern) {
    return {
      matched: true,
      pattern: {
        id: pattern.id,
        patternKey: pattern.patternKey,
        patternName: pattern.patternName,
        errorType: pattern.errorType,
        endpoint: pattern.endpoint || '',
        httpStatus: pattern.httpStatus || 0,
        description: pattern.description,
        occurrenceCount: pattern.occurrenceCount,
        lastOccurrence: pattern.lastOccurrence,
        suggestedRootCause: pattern.rootCause || undefined,
        suggestedPrevention: pattern.preventionStrategy || undefined,
        suggestedAutoFix: pattern.autoFixSolution || undefined,
      },
      confidence: 0.95
    }
  }

  // Try endpoint pattern match (without query params)
  pattern = await prisma.errorPattern.findFirst({
    where: {
      endpoint: { contains: endpoint },
      httpStatus: error.status,
      patternStatus: { in: ['ACTIVE', 'MONITORING'] }
    }
  })

  if (pattern) {
    return {
      matched: true,
      pattern: {
        id: pattern.id,
        patternKey: pattern.patternKey,
        patternName: pattern.patternName,
        errorType: pattern.errorType,
        endpoint: pattern.endpoint || '',
        httpStatus: pattern.httpStatus || 0,
        description: pattern.description,
        occurrenceCount: pattern.occurrenceCount,
        lastOccurrence: pattern.lastOccurrence,
        suggestedRootCause: pattern.rootCause || undefined,
        suggestedPrevention: pattern.preventionStrategy || undefined,
        suggestedAutoFix: pattern.autoFixSolution || undefined,
      },
      confidence: 0.8
    }
  }

  // Try type match
  pattern = await prisma.errorPattern.findFirst({
    where: {
      errorType: error.type,
      httpStatus: error.status,
      patternStatus: { in: ['ACTIVE', 'MONITORING'] }
    }
  })

  if (pattern) {
    return {
      matched: true,
      pattern: {
        id: pattern.id,
        patternKey: pattern.patternKey,
        patternName: pattern.patternName,
        errorType: pattern.errorType,
        endpoint: pattern.endpoint || '',
        httpStatus: pattern.httpStatus || 0,
        description: pattern.description,
        occurrenceCount: pattern.occurrenceCount,
        lastOccurrence: pattern.lastOccurrence,
        suggestedRootCause: pattern.rootCause || undefined,
        suggestedPrevention: pattern.preventionStrategy || undefined,
        suggestedAutoFix: pattern.autoFixSolution || undefined,
      },
      confidence: 0.6
    }
  }

  return { matched: false, confidence: 0 }
}

/**
 * Get pattern suggestions for an error
 */
export async function getPatternSuggestions(error: {
  type: string
  endpoint: string
  status: number
  message: string
}): Promise<{
  rootCause?: string
  prevention?: string
  autoFix?: string
}> {
  const endpoint = error.endpoint.split('?')[0]

  // Check known patterns first
  const knownPattern = findKnownPattern(error.type, endpoint, error.status)
  if (knownPattern) {
    return knownPattern
  }

  // Check database patterns
  const match = await matchErrorPattern(error)
  if (match.matched && match.pattern) {
    return {
      rootCause: match.pattern.suggestedRootCause,
      prevention: match.pattern.suggestedPrevention,
      autoFix: match.pattern.suggestedAutoFix,
    }
  }

  // Return generic suggestions based on error type
  return getGenericSuggestions(error.type, error.status)
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function findKnownPattern(type: string, endpoint: string, status: number): {
  rootCause: string
  prevention: string
  autoFix?: string
} | null {
  // Try exact match
  const exactKey = `${type}_${endpoint}_${status}`
  if (KNOWN_PATTERNS[exactKey]) {
    return KNOWN_PATTERNS[exactKey]
  }

  // Try wildcard match
  for (const [pattern, suggestion] of Object.entries(KNOWN_PATTERNS)) {
    const parts = pattern.split('_')
    if (parts.length >= 2) {
      const patternType = parts[0]
      const patternEndpoint = parts[1]
      const patternStatus = parts[2] ? parseInt(parts[2]) : null

      const typeMatch = patternType === type || patternType === '*'
      const endpointMatch = patternEndpoint === endpoint || patternEndpoint === '*' || endpoint.includes(patternEndpoint)
      const statusMatch = !patternStatus || patternStatus === status

      if (typeMatch && endpointMatch && statusMatch) {
        return suggestion
      }
    }
  }

  return null
}

function determinePatternSeverity(type: string, status: number, count: number): string {
  // Critical: Server failures or high occurrence
  if (type === 'SERVER_FAILURE' || status >= 500 || count >= 10) {
    return 'critical'
  }

  // Error: Auth errors or moderate occurrence
  if (type === 'AUTH_ERROR' || count >= 5) {
    return 'error'
  }

  // Warning: Network errors
  if (type === 'NETWORK_ERROR') {
    return 'warning'
  }

  // Info: Business logic
  return 'info'
}

function getGenericSuggestions(type: string, status: number): {
  rootCause?: string
  prevention?: string
  autoFix?: string
} {
  switch (type) {
    case 'SERVER_FAILURE':
      return {
        rootCause: 'Server-side error occurred',
        prevention: 'Implement proper error handling and logging',
        autoFix: 'Check server logs for details'
      }
    case 'NETWORK_ERROR':
      return {
        rootCause: 'Network connectivity issue',
        prevention: 'Implement retry logic with exponential backoff',
        autoFix: 'Retry the request'
      }
    case 'AUTH_ERROR':
      return {
        rootCause: 'Authentication failed',
        prevention: 'Ensure valid credentials and handle token refresh',
        autoFix: 'Redirect to login'
      }
    case 'VALIDATION_ERROR':
      return {
        rootCause: 'Invalid input data',
        prevention: 'Add client-side validation',
        autoFix: 'Fix validation errors and retry'
      }
    case 'BUSINESS_LOGIC':
      return {
        rootCause: 'Business rule violated',
        prevention: 'Implement proper business rule checks',
        autoFix: 'Review business logic constraints'
      }
    default:
      return {
        rootCause: 'Unknown error occurred',
        prevention: 'Add error handling',
        autoFix: 'Retry or contact support'
      }
  }
}

export default {
  analyzeErrorPatterns,
  matchErrorPattern,
  getPatternSuggestions,
}
