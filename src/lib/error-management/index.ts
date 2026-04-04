/**
 * ERROR MANAGEMENT MODULE
 * =======================
 * Centralized error handling, validation, and registry
 * 
 * Exports:
 * - errorRegistry: Persistent error storage and retrieval
 * - chatLogErrorDetector: Auto-detect errors from chat logs
 * - enum-validator: Pre-query enum validation
 * - api-error-handler: API error handling with registry connection
 */

// Core services
export { errorRegistry } from './error-registry'
export type { 
  CreateErrorInput, 
  ErrorQuery, 
  ErrorStats 
} from './error-registry'

// Chat log error detection
export { 
  chatLogErrorDetector,
  scanChatLogs,
  logDetectedErrors,
  getSessionErrorPatterns,
  getCommonErrorPatterns
} from './chat-log-error-detector'
export type {
  DetectedError,
  DetectionResult,
  DetectionOptions
} from './chat-log-error-detector'

// Enum validation
export {
  PRISMA_ENUMS,
  isValidEnum,
  validateEnum,
  safeEnum,
  strictEnum,
  coerceEnum,
  validateEnums,
  validateApiEnums,
  getEnumValues,
  isPrismaEnum,
  EnumValidationError
} from './enum-validator'
export type {
  PrismaEnumName,
  EnumValue
} from './enum-validator'

// API error handling
export {
  handleApiError,
  withErrorHandler,
  safeQuery,
  API_ERROR_CODES
} from './api-error-handler'
export type {
  ApiErrorContext,
  ApiErrorResponse,
  WrappedHandler
} from './api-error-handler'
