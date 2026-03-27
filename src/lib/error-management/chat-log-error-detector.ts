/**
 * CHAT LOG ERROR DETECTOR
 * ========================
 * Phase 2: Enhanced Detection - Auto-detect errors from chat logs
 *
 * This service scans chat logs and extracts error patterns, then logs them
 * to the ErrorRegistry for tracking and prevention.
 *
 * Features:
 * - Detect Prisma errors from content blocks
 * - Detect API errors from tool calls
 * - Detect build/compile errors from command outputs
 * - Detect runtime errors from messages
 * - Track error recurrence patterns
 */

import { db } from '@/lib/db'
import { errorRegistry } from './error-registry'
import { ErrorCategory, ErrorSeverity, ErrorSource } from '@prisma/client'

// =============================================================================
// TYPES
// =============================================================================

export interface DetectedError {
  id: string
  errorType: string
  category: ErrorCategory
  severity: ErrorSeverity
  message: string
  pattern: string
  sessionId: string
  sessionTitle?: string
  file?: string
  line?: number
  codeSnippet?: string
  solution?: string
  preventionTips?: string[]
  firstSeen: Date
  lastSeen: Date
  occurrenceCount: number
}

export interface DetectionResult {
  totalScanned: number
  errorsDetected: number
  newErrors: number
  repeatedErrors: number
  errors: DetectedError[]
  byCategory: Record<string, number>
  bySeverity: Record<string, number>
}

export interface DetectionOptions {
  sessionId?: string
  dateFrom?: Date
  dateTo?: Date
  scanLimit?: number
  includeResolved?: boolean
}

// =============================================================================
// ERROR PATTERNS FOR CHAT LOGS
// =============================================================================

interface ErrorPatternConfig {
  pattern: RegExp
  category: ErrorCategory
  severity: ErrorSeverity
  errorType: string
  errorCode: string
  extractDetails?: (match: RegExpMatchArray) => {
    file?: string
    line?: number
    codeSnippet?: string
  }
  solution?: string
  preventionTips: string[]
}

const CHAT_LOG_ERROR_PATTERNS: ErrorPatternConfig[] = [
  // Prisma Errors
  {
    pattern: /Invalid value for argument[`']?\s*`?(\w+)`?\.?\s*Expected\s+(\w+)/gi,
    category: 'PRISMA_ENUM' as ErrorCategory,
    severity: 'MEDIUM' as ErrorSeverity,
    errorType: 'PRISMA_ENUM_MISMATCH',
    errorCode: 'P2005',
    solution: 'Import the enum from @prisma/client and use the correct enum value.',
    preventionTips: [
      'Always import enums from @prisma/client',
      'Use z.nativeEnum() in Zod schemas',
      'Enable TypeScript strict mode',
      'Run prisma generate after schema changes'
    ]
  },
  {
    pattern: /Unique constraint failed on the fields:? \(`?(\w+)`?\)/gi,
    category: 'PRISMA_CONSTRAINT' as ErrorCategory,
    severity: 'MEDIUM' as ErrorSeverity,
    errorType: 'PRISMA_UNIQUE_VIOLATION',
    errorCode: 'P2002',
    solution: 'Use upsert() instead of create(), or check for existence before inserting.',
    preventionTips: [
      'Use upsert() for operations that might create duplicates',
      'Add existence checks before create operations',
      'Consider using findUnique() + conditional create/update'
    ]
  },
  {
    pattern: /Foreign key constraint failed on the field:? `?(\w+)`?/gi,
    category: 'PRISMA_CONSTRAINT' as ErrorCategory,
    severity: 'HIGH' as ErrorSeverity,
    errorType: 'PRISMA_FK_VIOLATION',
    errorCode: 'P2003',
    solution: 'Ensure the referenced record exists before creating the relationship.',
    preventionTips: [
      'Create parent records before child records',
      'Use transactions for related operations',
      'Validate foreign key references before insert'
    ]
  },
  {
    pattern: /Record to (update|delete) not found/gi,
    category: 'PRISMA_QUERY' as ErrorCategory,
    severity: 'LOW' as ErrorSeverity,
    errorType: 'PRISMA_RECORD_NOT_FOUND',
    errorCode: 'P2025',
    solution: 'Check if the record exists before updating or deleting.',
    preventionTips: [
      'Use findFirst() to check existence',
      'Handle null case gracefully',
      'Consider using upsert() for idempotent operations'
    ]
  },
  {
    pattern: /Can't reach database server/gi,
    category: 'PRISMA_CONNECTION' as ErrorCategory,
    severity: 'CRITICAL' as ErrorSeverity,
    errorType: 'PRISMA_CONNECTION_FAILED',
    errorCode: 'P1001',
    solution: 'Check DATABASE_URL and ensure database server is running.',
    preventionTips: [
      'Use connection pooling',
      'Implement retry logic with exponential backoff',
      'Monitor database health'
    ]
  },
  {
    pattern: /PrismaClient(?:Known|Unknown|Validation)Error/gi,
    category: 'PRISMA_QUERY' as ErrorCategory,
    severity: 'MEDIUM' as ErrorSeverity,
    errorType: 'PRISMA_CLIENT_ERROR',
    errorCode: 'P0000',
    solution: 'Check the Prisma query syntax and data types.',
    preventionTips: [
      'Validate input data types',
      'Check Prisma schema matches database',
      'Use TypeScript for type safety'
    ]
  },

  // TypeScript/Build Errors
  {
    pattern: /error TS(\d+):\s*(.+)/gi,
    category: 'TYPE_MISMATCH' as ErrorCategory,
    severity: 'MEDIUM' as ErrorSeverity,
    errorType: 'TYPESCRIPT_ERROR',
    errorCode: 'TS_ERROR',
    extractDetails: (match) => ({
      codeSnippet: match[2]
    }),
    solution: 'Fix TypeScript error by addressing type mismatches.',
    preventionTips: [
      'Run tsc --noEmit before committing',
      'Enable strict mode in tsconfig.json',
      'Use proper type annotations'
    ]
  },
  {
    pattern: /Cannot find (?:name|module) ['`]([^'`]+)['`]/gi,
    category: 'TYPE_MISMATCH' as ErrorCategory,
    severity: 'MEDIUM' as ErrorSeverity,
    errorType: 'IMPORT_ERROR',
    errorCode: 'TS_IMPORT',
    solution: 'Install missing dependency or fix import path.',
    preventionTips: [
      'Check package.json for missing dependencies',
      'Verify import paths are correct',
      'Run npm install to install missing packages'
    ]
  },
  {
    pattern: /Property ['`]([^'`]+)['`] does not exist on type/gi,
    category: 'TYPE_MISMATCH' as ErrorCategory,
    severity: 'MEDIUM' as ErrorSeverity,
    errorType: 'PROPERTY_ERROR',
    errorCode: 'TS_PROPERTY',
    solution: 'Check the type definition or add missing property.',
    preventionTips: [
      'Verify object structure matches type',
      'Use optional chaining (?.) for uncertain properties',
      'Update type definitions as needed'
    ]
  },

  // API Errors
  {
    pattern: /(?:API|api|fetch)\s*(?:error|failed|timeout)/gi,
    category: 'EXTERNAL_API' as ErrorCategory,
    severity: 'MEDIUM' as ErrorSeverity,
    errorType: 'API_REQUEST_FAILED',
    errorCode: 'API001',
    solution: 'Check API endpoint availability and request format.',
    preventionTips: [
      'Implement retry logic',
      'Add timeout handling',
      'Validate API responses'
    ]
  },
  {
    pattern: /(?:401|Unauthorized)/gi,
    category: 'API_UNAUTHORIZED' as ErrorCategory,
    severity: 'HIGH' as ErrorSeverity,
    errorType: 'API_AUTH_ERROR',
    errorCode: 'API401',
    solution: 'Check authentication credentials and token validity.',
    preventionTips: [
      'Refresh tokens before expiry',
      'Store credentials securely',
      'Implement proper auth flow'
    ]
  },
  {
    pattern: /(?:404|Not Found)/gi,
    category: 'API_NOT_FOUND' as ErrorCategory,
    severity: 'LOW' as ErrorSeverity,
    errorType: 'API_NOT_FOUND_ERROR',
    errorCode: 'API404',
    solution: 'Verify the API endpoint path is correct.',
    preventionTips: [
      'Check API documentation',
      'Verify resource IDs',
      'Handle 404 gracefully'
    ]
  },
  {
    pattern: /(?:500|Internal Server Error)/gi,
    category: 'EXTERNAL_API' as ErrorCategory,
    severity: 'HIGH' as ErrorSeverity,
    errorType: 'API_SERVER_ERROR',
    errorCode: 'API500',
    solution: 'Check server logs and API health.',
    preventionTips: [
      'Implement circuit breaker pattern',
      'Add fallback mechanisms',
      'Monitor API health status'
    ]
  },

  // Runtime Errors
  {
    pattern: /TypeError:\s*(.+)/gi,
    category: 'RUNTIME_ERROR' as ErrorCategory,
    severity: 'MEDIUM' as ErrorSeverity,
    errorType: 'TYPE_ERROR',
    errorCode: 'RUN001',
    solution: 'Check variable types and null values.',
    preventionTips: [
      'Add null checks',
      'Use TypeScript strict mode',
      'Validate runtime data'
    ]
  },
  {
    pattern: /ReferenceError:\s*(.+)/gi,
    category: 'RUNTIME_ERROR' as ErrorCategory,
    severity: 'HIGH' as ErrorSeverity,
    errorType: 'REFERENCE_ERROR',
    errorCode: 'RUN002',
    solution: 'Check variable scope and initialization.',
    preventionTips: [
      'Initialize variables before use',
      'Check variable scope',
      'Use let/const properly'
    ]
  },
  {
    pattern: /SyntaxError:\s*(.+)/gi,
    category: 'RUNTIME_ERROR' as ErrorCategory,
    severity: 'HIGH' as ErrorSeverity,
    errorType: 'SYNTAX_ERROR',
    errorCode: 'RUN003',
    solution: 'Fix syntax error in the code.',
    preventionTips: [
      'Use a linter (ESLint)',
      'Check for missing brackets/parentheses',
      'Use proper indentation'
    ]
  },
  {
    pattern: /Cannot read properties of (?:undefined|null)/gi,
    category: 'NULL_REFERENCE' as ErrorCategory,
    severity: 'MEDIUM' as ErrorSeverity,
    errorType: 'NULL_POINTER',
    errorCode: 'RUN004',
    solution: 'Add null/undefined checks before accessing properties.',
    preventionTips: [
      'Use optional chaining (?.)',
      'Add null checks',
      'Use default values'
    ]
  },

  // Build Errors
  {
    pattern: /Build failed/gi,
    category: 'INPUT_VALIDATION' as ErrorCategory,
    severity: 'HIGH' as ErrorSeverity,
    errorType: 'BUILD_FAILED',
    errorCode: 'BLD001',
    solution: 'Fix build errors before deployment.',
    preventionTips: [
      'Run build locally before pushing',
      'Check all dependencies',
      'Fix TypeScript errors'
    ]
  },
  {
    pattern: /Module not found:\s*(?:Error:)?\s*Can't resolve ['`]([^'`]+)['`]/gi,
    category: 'INPUT_VALIDATION' as ErrorCategory,
    severity: 'HIGH' as ErrorSeverity,
    errorType: 'MODULE_NOT_FOUND',
    errorCode: 'BLD002',
    solution: 'Install missing module or check import path.',
    preventionTips: [
      'Run npm install',
      'Check node_modules',
      'Verify package.json'
    ]
  },

  // Command Errors
  {
    pattern: /Command failed:\s*(.+)/gi,
    category: 'RUNTIME_ERROR' as ErrorCategory,
    severity: 'MEDIUM' as ErrorSeverity,
    errorType: 'COMMAND_FAILED',
    errorCode: 'CMD001',
    solution: 'Check command syntax and permissions.',
    preventionTips: [
      'Validate command before execution',
      'Check permissions',
      'Handle command errors gracefully'
    ]
  },
  {
    pattern: /npm ERR!|yarn error|pnpm ERR/gi,
    category: 'RUNTIME_ERROR' as ErrorCategory,
    severity: 'MEDIUM' as ErrorSeverity,
    errorType: 'PACKAGE_MANAGER_ERROR',
    errorCode: 'CMD002',
    solution: 'Fix package manager issues.',
    preventionTips: [
      'Clear package cache',
      'Delete node_modules and reinstall',
      'Check package.json for issues'
    ]
  },

  // Git Errors
  {
    pattern: /fatal:|error: could not|git error/gi,
    category: 'RUNTIME_ERROR' as ErrorCategory,
    severity: 'MEDIUM' as ErrorSeverity,
    errorType: 'GIT_ERROR',
    errorCode: 'GIT001',
    solution: 'Fix git operation issue.',
    preventionTips: [
      'Check git status',
      'Resolve conflicts',
      'Verify branch name'
    ]
  }
]

// =============================================================================
// CHAT LOG ERROR DETECTOR CLASS
// =============================================================================

class ChatLogErrorDetector {
  /**
   * Scan chat logs and detect errors
   */
  async scanChatLogs(options: DetectionOptions = {}): Promise<DetectionResult> {
    const {
      sessionId,
      dateFrom,
      dateTo,
      scanLimit = 100,
      includeResolved = false
    } = options

    // Build query
    const where: any = {}
    if (sessionId) {
      where.sessionId = sessionId
    }
    if (dateFrom || dateTo) {
      where.sessionDate = {}
      if (dateFrom) where.sessionDate.gte = dateFrom.toISOString().split('T')[0]
      if (dateTo) where.sessionDate.lte = dateTo.toISOString().split('T')[0]
    }

    // Fetch chat logs with content blocks and tool calls
    const chatLogs = await db.chatLog.findMany({
      where,
      orderBy: { sessionDate: 'desc' },
      take: scanLimit,
      include: {
        contentBlocks: {
          where: {
            OR: [
              { blockType: 'error' },
              { blockType: 'tool_call' },
              { blockType: 'reasoning' }
            ]
          }
        },
        toolCalls: true,
        issues: !includeResolved ? { where: { status: 'resolved' } } : true
      }
    })

    const detectedErrors: DetectedError[] = []
    const errorMap = new Map<string, DetectedError>()
    const byCategory: Record<string, number> = {}
    const bySeverity: Record<string, number> = {}

    // Scan each chat log
    for (const log of chatLogs) {
      // Scan content blocks
      if (log.contentBlocks) {
        for (const block of log.contentBlocks) {
          const content = block.content || ''
          const detected = this.detectErrorsInText(content, log.sessionId, log.title)

          for (const error of detected) {
            const key = `${error.errorType}:${error.message.slice(0, 50)}`
            if (errorMap.has(key)) {
              const existing = errorMap.get(key)!
              existing.occurrenceCount++
              existing.lastSeen = new Date()
            } else {
              errorMap.set(key, error)
            }
          }
        }
      }

      // Scan tool calls for errors
      if (log.toolCalls) {
        for (const toolCall of log.toolCalls) {
          const output = toolCall.output || ''
          const detected = this.detectErrorsInText(output, log.sessionId, log.title)

          for (const error of detected) {
            const key = `${error.errorType}:${error.message.slice(0, 50)}`
            if (errorMap.has(key)) {
              const existing = errorMap.get(key)!
              existing.occurrenceCount++
              existing.lastSeen = new Date()
            } else {
              errorMap.set(key, error)
            }
          }
        }
      }

      // Scan issues
      if (log.issues) {
        for (const issue of log.issues) {
          const errorMessage = issue.errorMessage || issue.description || ''
          if (errorMessage) {
            const detected = this.detectErrorsInText(errorMessage, log.sessionId, log.title)

            for (const error of detected) {
              const key = `${error.errorType}:${error.message.slice(0, 50)}`
              if (errorMap.has(key)) {
                const existing = errorMap.get(key)!
                existing.occurrenceCount++
                existing.lastSeen = new Date()
              } else {
                errorMap.set(key, error)
              }
            }
          }
        }
      }

      // Scan notes and summary for error mentions
      const textFields = [log.notes, log.summary]
      for (const text of textFields) {
        if (text) {
          const detected = this.detectErrorsInText(text, log.sessionId, log.title)

          for (const error of detected) {
            const key = `${error.errorType}:${error.message.slice(0, 50)}`
            if (errorMap.has(key)) {
              const existing = errorMap.get(key)!
              existing.occurrenceCount++
              existing.lastSeen = new Date()
            } else {
              errorMap.set(key, error)
            }
          }
        }
      }
    }

    // Convert map to array
    for (const error of errorMap.values()) {
      detectedErrors.push(error)

      // Aggregate stats
      byCategory[error.category] = (byCategory[error.category] || 0) + 1
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1
    }

    // Sort by occurrence count
    detectedErrors.sort((a, b) => b.occurrenceCount - a.occurrenceCount)

    return {
      totalScanned: chatLogs.length,
      errorsDetected: detectedErrors.length,
      newErrors: detectedErrors.filter(e => e.occurrenceCount === 1).length,
      repeatedErrors: detectedErrors.filter(e => e.occurrenceCount > 1).length,
      errors: detectedErrors,
      byCategory,
      bySeverity
    }
  }

  /**
   * Detect errors in a text string
   */
  private detectErrorsInText(
    text: string,
    sessionId: string,
    sessionTitle?: string
  ): DetectedError[] {
    const detected: DetectedError[] = []

    for (const patternConfig of CHAT_LOG_ERROR_PATTERNS) {
      const matches = text.matchAll(patternConfig.pattern)

      for (const match of matches) {
        const details = patternConfig.extractDetails?.(match)

        detected.push({
          id: `${patternConfig.errorCode}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          errorType: patternConfig.errorType,
          category: patternConfig.category,
          severity: patternConfig.severity,
          message: match[0],
          pattern: patternConfig.pattern.source,
          sessionId,
          sessionTitle,
          file: details?.file,
          line: details?.line,
          codeSnippet: details?.codeSnippet,
          solution: patternConfig.solution,
          preventionTips: patternConfig.preventionTips,
          firstSeen: new Date(),
          lastSeen: new Date(),
          occurrenceCount: 1
        })
      }
    }

    return detected
  }

  /**
   * Log detected errors to the error registry
   */
  async logDetectedErrors(detectedErrors: DetectedError[]): Promise<{
    logged: number
    skipped: number
    errors: string[]
  }> {
    const result = {
      logged: 0,
      skipped: 0,
      errors: [] as string[]
    }

    for (const error of detectedErrors) {
      try {
        await errorRegistry.log({
          message: error.message,
          category: error.category,
          severity: error.severity,
          source: 'CHAT_LOGS' as ErrorSource,
          errorCode: error.errorType,
          pattern: error.pattern,
          sessionId: error.sessionId,
          solution: error.solution,
          preventionTips: error.preventionTips,
          stackTrace: error.codeSnippet,
          tags: ['auto-detected', 'chat-logs']
        })
        result.logged++
      } catch (e) {
        result.skipped++
        result.errors.push(`Failed to log error: ${error.message.slice(0, 50)}`)
      }
    }

    return result
  }

  /**
   * Get error patterns for a specific session
   */
  async getSessionErrorPatterns(sessionId: string): Promise<{
    patterns: Array<{
      pattern: string
      count: number
      category: string
      severity: string
    }>
    totalErrors: number
  }> {
    const chatLog = await db.chatLog.findFirst({
      where: { sessionId },
      include: {
        contentBlocks: true,
        toolCalls: true,
        issues: true
      }
    })

    if (!chatLog) {
      return { patterns: [], totalErrors: 0 }
    }

    const allText = [
      chatLog.summary,
      chatLog.notes,
      ...(chatLog.contentBlocks?.map(b => b.content || '') || []),
      ...(chatLog.toolCalls?.map(t => t.output || '') || []),
      ...(chatLog.issues?.map(i => i.errorMessage || i.description || '') || [])
    ].join('\n')

    const patternCounts: Record<string, { count: number; category: string; severity: string }> = {}

    for (const patternConfig of CHAT_LOG_ERROR_PATTERNS) {
      const matches = allText.match(patternConfig.pattern)
      if (matches) {
        const patternSource = patternConfig.pattern.source
        if (!patternCounts[patternSource]) {
          patternCounts[patternSource] = {
            count: 0,
            category: patternConfig.category,
            severity: patternConfig.severity
          }
        }
        patternCounts[patternSource].count += matches.length
      }
    }

    const patterns = Object.entries(patternCounts)
      .map(([pattern, data]) => ({
        pattern,
        count: data.count,
        category: data.category,
        severity: data.severity
      }))
      .sort((a, b) => b.count - a.count)

    return {
      patterns,
      totalErrors: patterns.reduce((sum, p) => sum + p.count, 0)
    }
  }

  /**
   * Get common error patterns across all chat logs
   */
  async getCommonErrorPatterns(): Promise<Array<{
    pattern: string
    category: ErrorCategory
    severity: ErrorSeverity
    errorType: string
    solution: string
    preventionTips: string[]
    occurrenceCount: number
  }>> {
    // Get all errors from the error registry that were auto-detected
    const errors = await db.errorLog.findMany({
      where: {
        source: 'CHAT_LOGS',
        resolved: false
      },
      orderBy: { occurrenceCount: 'desc' },
      take: 20
    })

    return errors.map(error => ({
      pattern: error.pattern || '',
      category: error.errorCategory,
      severity: error.severity,
      errorType: error.errorCode,
      solution: error.solution || '',
      preventionTips: error.preventionTips ? JSON.parse(error.preventionTips) : [],
      occurrenceCount: error.occurrenceCount
    }))
  }
}

// =============================================================================
// EXPORT
// =============================================================================

export const chatLogErrorDetector = new ChatLogErrorDetector()

export const scanChatLogs = (options?: DetectionOptions) => chatLogErrorDetector.scanChatLogs(options)
export const logDetectedErrors = (errors: DetectedError[]) => chatLogErrorDetector.logDetectedErrors(errors)
export const getSessionErrorPatterns = (sessionId: string) => chatLogErrorDetector.getSessionErrorPatterns(sessionId)
export const getCommonErrorPatterns = () => chatLogErrorDetector.getCommonErrorPatterns()
