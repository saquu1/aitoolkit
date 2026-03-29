/**
 * ENUM VALIDATION UTILITY
 * ========================
 * Pre-query validation for Prisma enums
 * Prevents runtime errors from invalid enum values
 * 
 * Usage:
 *   import { validateEnum, safeEnum } from '@/lib/error-management/enum-validator'
 *   
 *   // Validate before query
 *   const status = validateEnum('PatternStatus', userInput, 'ACTIVE')
 *   
 *   // Or use safe wrapper
 *   const result = await db.aIPattern.findMany({
 *     where: { status: safeEnum('PatternStatus', statusInput) }
 *   })
 */

import { errorRegistry } from './error-registry'

// =============================================================================
// MANUAL ENUM DEFINITIONS
// =============================================================================
// Since Prisma uses strings instead of enum types for some fields,
// we define the valid values here

export const ErrorCategory = {
  UNKNOWN: 'UNKNOWN',
  AUTHENTICATION: 'AUTHENTICATION',
  AUTHORIZATION: 'AUTHORIZATION',
  VALIDATION: 'VALIDATION',
  DATABASE: 'DATABASE',
  API: 'API',
  SYSTEM: 'SYSTEM',
  EXTERNAL_SERVICE: 'EXTERNAL_SERVICE',
  ENUM_MISMATCH: 'ENUM_MISMATCH'
} as const

export const ErrorSeverity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
} as const

export const ErrorSource = {
  API_MANAGEMENT: 'API_MANAGEMENT',
  CHAT_LOG: 'CHAT_LOG',
  ANALYTICS: 'ANALYTICS',
  SYSTEM: 'SYSTEM',
  USER_INPUT: 'USER_INPUT'
} as const

export const BlockType = {
  TEXT: 'TEXT',
  CODE: 'CODE',
  THINKING: 'THINKING',
  TOOL_USE: 'TOOL_USE'
} as const

export const ToolName = {
  BASH: 'BASH',
  FILE_READ: 'FILE_READ',
  FILE_WRITE: 'FILE_WRITE',
  SEARCH: 'SEARCH'
} as const

export const FileOpType = {
  CREATE: 'CREATE',
  READ: 'READ',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE'
} as const

export const FileCategory = {
  SOURCE: 'SOURCE',
  CONFIG: 'CONFIG',
  DATA: 'DATA',
  ASSET: 'ASSET'
} as const

export const GitOpType = {
  COMMIT: 'COMMIT',
  PUSH: 'PUSH',
  PULL: 'PULL',
  BRANCH: 'BRANCH',
  MERGE: 'MERGE'
} as const

export const SessionType = {
  DEVELOPMENT: 'DEVELOPMENT',
  DEBUGGING: 'DEBUGGING',
  REFACTORING: 'REFACTORING',
  REVIEW: 'REVIEW'
} as const

export const IssueStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED'
} as const

export const PatternStatus = {
  ACTIVE: 'ACTIVE',
  DEPRECATED: 'DEPRECATED',
  ARCHIVED: 'ARCHIVED'
} as const

export const AnomalyType = {
  PERFORMANCE: 'PERFORMANCE',
  ERROR_RATE: 'ERROR_RATE',
  USAGE: 'USAGE',
  SECURITY: 'SECURITY'
} as const

export const AlertSeverity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL'
} as const

export const AlertStatus = {
  ACTIVE: 'ACTIVE',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  RESOLVED: 'RESOLVED'
} as const

export const TrendPeriod = {
  HOURLY: 'HOURLY',
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY'
} as const

export const ConfidenceLevel = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  VERY_HIGH: 'VERY_HIGH'
} as const

// =============================================================================
// ENUM REGISTRY
// =============================================================================

/**
 * All Prisma enums with their valid values
 * This is the single source of truth for enum validation
 */
export const PRISMA_ENUMS = {
  ErrorCategory: Object.values(ErrorCategory) as string[],
  ErrorSeverity: Object.values(ErrorSeverity) as string[],
  ErrorSource: Object.values(ErrorSource) as string[],
  BlockType: Object.values(BlockType) as string[],
  ToolName: Object.values(ToolName) as string[],
  FileOpType: Object.values(FileOpType) as string[],
  FileCategory: Object.values(FileCategory) as string[],
  GitOpType: Object.values(GitOpType) as string[],
  SessionType: Object.values(SessionType) as string[],
  IssueStatus: Object.values(IssueStatus) as string[],
  PatternStatus: Object.values(PatternStatus) as string[],
  AnomalyType: Object.values(AnomalyType) as string[],
  AlertSeverity: Object.values(AlertSeverity) as string[],
  AlertStatus: Object.values(AlertStatus) as string[],
  TrendPeriod: Object.values(TrendPeriod) as string[],
  ConfidenceLevel: Object.values(ConfidenceLevel) as string[],
} as const

export type PrismaEnumName = keyof typeof PRISMA_ENUMS

// =============================================================================
// VALIDATION ERROR
// =============================================================================

export class EnumValidationError extends Error {
  constructor(
    public enumName: PrismaEnumName,
    public invalidValue: string,
    public validValues: string[]
  ) {
    super(
      `Invalid value "${invalidValue}" for enum ${enumName}. ` +
      `Valid values: ${validValues.join(', ')}`
    )
    this.name = 'EnumValidationError'
  }
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate if a value is a valid enum value
 * @param enumName - Name of the Prisma enum
 * @param value - Value to validate
 * @returns true if valid, false otherwise
 */
export function isValidEnum(enumName: PrismaEnumName, value: string): boolean {
  const validValues = PRISMA_ENUMS[enumName]
  if (!validValues) {
    console.warn(`Unknown enum: ${enumName}`)
    return false
  }
  return validValues.includes(value)
}

/**
 * Validate and return a safe enum value
 * @param enumName - Name of the Prisma enum
 * @param value - Value to validate
 * @param fallback - Default value if invalid (optional)
 * @param context - Additional context for error logging
 * @returns Valid enum value or fallback
 * @throws EnumValidationError if no fallback and value is invalid
 */
export function validateEnum<T extends PrismaEnumName>(
  enumName: T,
  value: string,
  fallback?: string,
  context?: {
    route?: string
    method?: string
    sessionId?: string
    userId?: string
  }
): string {
  const validValues = PRISMA_ENUMS[enumName]
  
  if (!validValues) {
    console.warn(`Unknown enum: ${enumName}`)
    return value
  }

  // Check if value is valid
  if (validValues.includes(value)) {
    return value
  }

  // Log error to registry
  const error = new EnumValidationError(enumName, value, validValues)
  
  // Log to error registry asynchronously (don't wait)
  errorRegistry.log({
    message: error.message,
    category: 'ENUM_MISMATCH',
    severity: 'MEDIUM',
    source: 'API_MANAGEMENT',
    errorCode: 'INVALID_ENUM',
    details: JSON.stringify({
      enumName,
      invalidValue: value,
      validValues,
      fallback
    }),
    route: context?.route,
    method: context?.method,
    sessionId: context?.sessionId,
    userId: context?.userId,
    solution: `Use one of the valid values: ${validValues.join(', ')}`,
    preventionTips: [
      'Always import enums from @prisma/client',
      'Use validateEnum() before database queries',
      'Add TypeScript type checking for enum values',
      'Use z.nativeEnum() in Zod schemas for validation'
    ]
  }).catch(err => console.error('Failed to log enum error:', err))

  // Return fallback or throw
  if (fallback !== undefined) {
    console.warn(`Invalid enum value "${value}" for ${enumName}, using fallback: ${fallback}`)
    return fallback
  }

  throw error
}

/**
 * Safe enum wrapper that returns undefined for invalid values
 * Use this when you want to silently ignore invalid values
 * 
 * @param enumName - Name of the Prisma enum
 * @param value - Value to validate
 * @returns Valid enum value or undefined
 */
export function safeEnum<T extends PrismaEnumName>(
  enumName: T,
  value: string | undefined | null
): string | undefined {
  if (!value) return undefined
  
  const validValues = PRISMA_ENUMS[enumName]
  if (!validValues) return undefined
  
  return validValues.includes(value) ? value : undefined
}

/**
 * Strict enum validation - throws on invalid values
 * Use this when you want to enforce valid enum values
 * 
 * @param enumName - Name of the Prisma enum
 * @param value - Value to validate
 * @returns Valid enum value
 * @throws EnumValidationError if value is invalid
 */
export function strictEnum<T extends PrismaEnumName>(
  enumName: T,
  value: string
): string {
  return validateEnum(enumName, value)
}

// =============================================================================
// ENUM COERCION
// =============================================================================

/**
 * Try to coerce a value to a valid enum value
 * Handles common mistakes like lowercase, uppercase, snake_case vs camelCase
 * 
 * @param enumName - Name of the Prisma enum
 * @param value - Value to coerce
 * @returns Coerced valid enum value or undefined
 */
export function coerceEnum<T extends PrismaEnumName>(
  enumName: T,
  value: string
): string | undefined {
  const validValues = PRISMA_ENUMS[enumName]
  if (!validValues) return undefined

  // Direct match
  if (validValues.includes(value)) {
    return value
  }

  // Try uppercase
  const upper = value.toUpperCase()
  if (validValues.includes(upper)) {
    return upper
  }

  // Try lowercase converted to uppercase
  const lowerToUpper = value.toLowerCase().toUpperCase()
  if (validValues.includes(lowerToUpper)) {
    return lowerToUpper
  }

  // Try replacing spaces/hyphens with underscores
  const normalized = value.replace(/[\s-]/g, '_').toUpperCase()
  if (validValues.includes(normalized)) {
    return normalized
  }

  // Try snake_case from camelCase
  const camelToSnake = value
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toUpperCase()
  if (validValues.includes(camelToSnake)) {
    return camelToSnake
  }

  return undefined
}

// =============================================================================
// BULK VALIDATION
// =============================================================================

/**
 * Validate multiple enum values at once
 * 
 * @param validations - Array of [enumName, value] tuples
 * @returns Object with valid values and any errors
 */
export function validateEnums(
  validations: Array<[PrismaEnumName, string, string?]>
): {
  valid: Record<string, string>
  errors: Array<{ enumName: PrismaEnumName; value: string; error: string }>
} {
  const valid: Record<string, string> = {}
  const errors: Array<{ enumName: PrismaEnumName; value: string; error: string }> = []

  for (const [enumName, value, fallback] of validations) {
    try {
      const result = validateEnum(enumName, value, fallback)
      valid[enumName] = result
    } catch (e) {
      if (e instanceof EnumValidationError) {
        errors.push({
          enumName: e.enumName,
          value: e.invalidValue,
          error: e.message
        })
      }
    }
  }

  return { valid, errors }
}

// =============================================================================
// TYPE HELPERS
// =============================================================================

/**
 * Get TypeScript type for an enum
 */
export type EnumValue<T extends PrismaEnumName> = typeof PRISMA_ENUMS[T][number]

/**
 * Get valid values for an enum (runtime)
 */
export function getEnumValues<T extends PrismaEnumName>(enumName: T): string[] {
  return [...PRISMA_ENUMS[enumName]]
}

/**
 * Check if a string is a valid Prisma enum name
 */
export function isPrismaEnum(name: string): name is PrismaEnumName {
  return name in PRISMA_ENUMS
}

// =============================================================================
// API MIDDLEWARE HELPER
// =============================================================================

/**
 * Validate enum parameters in API requests
 * Returns validated params or throws error
 * 
 * @example
 * const params = validateApiEnums(req.body, {
 *   status: { enum: 'PatternStatus', required: true },
 *   severity: { enum: 'ErrorSeverity', required: false, fallback: 'MEDIUM' }
 * })
 */
export function validateApiEnums<T extends Record<string, { 
  enum: PrismaEnumName
  required?: boolean
  fallback?: string 
}>>(
  input: Record<string, any>,
  schema: T
): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {}
  const errors: string[] = []

  for (const [key, config] of Object.entries(schema)) {
    const value = input[key]
    
    if (value === undefined || value === null) {
      if (config.required) {
        errors.push(`Missing required parameter: ${key}`)
      } else if (config.fallback) {
        result[key] = validateEnum(config.enum, config.fallback)
      }
      continue
    }

    if (typeof value !== 'string') {
      errors.push(`Parameter ${key} must be a string, got ${typeof value}`)
      continue
    }

    try {
      result[key] = validateEnum(config.enum, value, config.fallback)
    } catch (e) {
      if (e instanceof EnumValidationError) {
        errors.push(e.message)
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Enum validation failed:\n${errors.join('\n')}`)
  }

  return result
}
