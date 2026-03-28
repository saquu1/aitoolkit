/**
 * GLOBAL API CLIENT
 * ==================
 * Centralized fetch wrapper with error handling, logging, and traceability
 *
 * Features:
 * - Automatic error capture and dispatch
 * - Request ID for traceability
 * - Retry mechanism for transient failures
 * - Business logic handling (409 conflicts)
 * - Performance timing
 */

// =============================================================================
// TYPES
// =============================================================================

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical'
export type ErrorType = 'BUSINESS_LOGIC' | 'VALIDATION_ERROR' | 'AUTH_ERROR' | 'SERVER_FAILURE' | 'NETWORK_ERROR' | 'UNKNOWN'

export interface ApiError {
  id: string
  timestamp: string
  status: number
  statusText: string
  type: ErrorType
  severity: ErrorSeverity
  message: string
  hint?: string
  endpoint: string
  method: string
  requestId: string
  duration?: number
  context?: Record<string, any>
  retryable: boolean
  retryCount?: number

  // Business logic specific (409)
  isDuplicate?: boolean
  duplicateType?: 'exact' | 'partial' | 'evolved'
  existingData?: any
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: ApiError
  requestId: string
  duration: number
  fromCache?: boolean

  // Business logic response
  businessRule?: {
    type: 'DUPLICATE' | 'EVOLVED' | 'PARTIAL_MATCH'
    action: 'REJECT' | 'WARN' | 'ALLOW_FORCE'
    hint: string
    existingData?: any
  }
}

export interface ApiOptions extends RequestInit {
  timeout?: number
  retries?: number
  retryDelay?: number[]
  skipErrorHandler?: boolean
  requestId?: string
  context?: Record<string, any>
}

// =============================================================================
// ERROR CLASSIFICATION
// =============================================================================

function classifyError(status: number, data?: any): { type: ErrorType; severity: ErrorSeverity; retryable: boolean } {
  // Business Logic (Not really an error)
  if (status === 409) {
    return { type: 'BUSINESS_LOGIC', severity: 'info', retryable: false }
  }

  // Validation Errors
  if (status === 400 || status === 422) {
    return { type: 'VALIDATION_ERROR', severity: 'warning', retryable: false }
  }

  // Auth Errors
  if (status === 401 || status === 403) {
    return { type: 'AUTH_ERROR', severity: 'error', retryable: false }
  }

  // Not Found
  if (status === 404) {
    return { type: 'VALIDATION_ERROR', severity: 'warning', retryable: false }
  }

  // Server Errors (Retryable)
  if (status >= 500) {
    return { type: 'SERVER_FAILURE', severity: 'critical', retryable: true }
  }

  // Network Errors
  return { type: 'NETWORK_ERROR', severity: 'error', retryable: true }
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// =============================================================================
// ERROR EVENT DISPATCHER
// =============================================================================

function dispatchApiError(error: ApiError): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('api-error', {
      detail: error
    }))
  }
}

function dispatchApiSuccess(response: ApiResponse): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('api-success', {
      detail: response
    }))
  }
}

// =============================================================================
// MAIN API CLIENT
// =============================================================================

/**
 * Global API fetch wrapper with error handling and traceability
 */
export async function apiFetch<T = any>(
  url: string,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const {
    timeout = 30000,
    retries = 3,
    retryDelay = [1000, 3000, 5000],
    skipErrorHandler = false,
    context = {},
    ...fetchOptions
  } = options

  const requestId = options.requestId || generateRequestId()
  const method = fetchOptions.method || 'GET'
  const startTime = Date.now()

  let lastError: ApiError | null = null
  let retryCount = 0

  // Retry loop
  while (retryCount <= retries) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      // Log request
      console.log(`[${requestId}] → ${method} ${url}${retryCount > 0 ? ` (retry ${retryCount})` : ''}`)

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': requestId,
          ...fetchOptions.headers,
        },
      })

      clearTimeout(timeoutId)
      const duration = Date.now() - startTime

      // Clone response for potential re-reads
      const clonedResponse = response.clone()

      // Try to parse JSON
      let data: any = {}
      try {
        data = await response.json()
      } catch {
        // Non-JSON response (e.g., file download)
        data = { raw: true, status: response.status }
      }

      // Success case
      if (response.ok) {
        const result: ApiResponse<T> = {
          success: true,
          data,
          requestId,
          duration,
        }

        dispatchApiSuccess(result)
        console.log(`[${requestId}] ✓ ${method} ${url} (${duration}ms)`)

        return result
      }

      // Error case - classify and create error object
      const classification = classifyError(response.status, data)

      lastError = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        status: response.status,
        statusText: response.statusText,
        type: classification.type,
        severity: classification.severity,
        message: data.error || data.message || response.statusText,
        hint: data.hint,
        endpoint: url,
        method,
        requestId,
        duration,
        context: { ...context, response: data },
        retryable: classification.retryable,
        retryCount,

        // Business logic specific (409)
        isDuplicate: data.isDuplicate || response.status === 409,
        duplicateType: data.duplicateType,
        existingData: data.existingRawDataId ? { id: data.existingRawDataId } : data.existingData,
      }

      // Handle 409 Conflict (Business Logic) - Return as success with business rule
      if (response.status === 409) {
        console.log(`[${requestId}] ℹ️ Business Rule: ${data.message || 'Duplicate detected'}`)

        return {
          success: false,
          error: lastError,
          requestId,
          duration,
          businessRule: {
            type: data.duplicateType === 'evolved' ? 'EVOLVED' :
                  data.duplicateType === 'partial' ? 'PARTIAL_MATCH' : 'DUPLICATE',
            action: data.allowForceSave ? 'ALLOW_FORCE' : 'REJECT',
            hint: data.hint || data.message,
            existingData: data.existingRawDataId || data.existingChatLogId,
          },
        }
      }

      // Non-retryable error - dispatch and return
      if (!classification.retryable || retryCount >= retries) {
        if (!skipErrorHandler) {
          dispatchApiError(lastError)
        }
        console.error(`[${requestId}] ✗ ${method} ${url} (${response.status}):`, lastError.message)

        return {
          success: false,
          error: lastError,
          requestId,
          duration,
        }
      }

      // Retryable error - wait and retry
      const delay = retryDelay[retryCount] || retryDelay[retryDelay.length - 1]
      console.warn(`[${requestId}] ⚠️ Retrying in ${delay}ms... (${retryCount + 1}/${retries})`)
      await new Promise(resolve => setTimeout(resolve, delay))
      retryCount++

    } catch (err: any) {
      const duration = Date.now() - startTime

      // Handle abort (timeout)
      if (err.name === 'AbortError') {
        lastError = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          status: 0,
          statusText: 'Timeout',
          type: 'NETWORK_ERROR',
          severity: 'critical',
          message: `Request timed out after ${timeout}ms`,
          endpoint: url,
          method,
          requestId,
          duration,
          context,
          retryable: true,
          retryCount,
        }
      } else {
        // Network error or other exception
        lastError = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          status: 0,
          statusText: 'Network Error',
          type: 'NETWORK_ERROR',
          severity: 'error',
          message: err.message || 'Network request failed',
          endpoint: url,
          method,
          requestId,
          duration,
          context: { ...context, error: err.toString() },
          retryable: true,
          retryCount,
        }
      }

      // Retry if we have retries left
      if (retryCount < retries) {
        const delay = retryDelay[retryCount] || retryDelay[retryDelay.length - 1]
        console.warn(`[${requestId}] ⚠️ Network error, retrying in ${delay}ms... (${retryCount + 1}/${retries})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        retryCount++
        continue
      }

      // No more retries - dispatch error
      if (!skipErrorHandler) {
        dispatchApiError(lastError)
      }
      console.error(`[${requestId}] ✗ ${method} ${url} (Network Error):`, lastError.message)

      return {
        success: false,
        error: lastError,
        requestId,
        duration,
      }
    }
  }

  // Should not reach here, but return last error if it does
  return {
    success: false,
    error: lastError!,
    requestId,
    duration: Date.now() - startTime,
  }
}

// =============================================================================
// CONVENIENCE METHODS
// =============================================================================

export const api = {
  get: <T = any>(url: string, options?: ApiOptions) =>
    apiFetch<T>(url, { ...options, method: 'GET' }),

  post: <T = any>(url: string, body?: any, options?: ApiOptions) =>
    apiFetch<T>(url, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T = any>(url: string, body?: any, options?: ApiOptions) =>
    apiFetch<T>(url, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T = any>(url: string, body?: any, options?: ApiOptions) =>
    apiFetch<T>(url, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = any>(url: string, options?: ApiOptions) =>
    apiFetch<T>(url, { ...options, method: 'DELETE' }),
}

// =============================================================================
// GLOBAL FETCH OVERRIDE (Optional - captures ALL fetch calls)
// =============================================================================

let globalFetchOverridden = false

export function enableGlobalErrorCapture(): void {
  if (typeof window === 'undefined' || globalFetchOverridden) return

  const originalFetch = window.fetch

  window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
    const response = await originalFetch(...args)

    // Only capture errors, not successful responses
    if (!response.ok) {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url
      const options = args[1] || {}

      // Clone and try to read error
      const clone = response.clone()
      let data: any = {}
      try {
        data = await clone.json()
      } catch {
        // Non-JSON response
      }

      const classification = classifyError(response.status, data)
      const requestId = response.headers.get('X-Request-Id') || generateRequestId()

      const error: ApiError = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        status: response.status,
        statusText: response.statusText,
        type: classification.type,
        severity: classification.severity,
        message: data.error || data.message || response.statusText,
        hint: data.hint,
        endpoint: url,
        method: options.method || 'GET',
        requestId,
        retryable: classification.retryable,
        retryCount: 0,
      }

      // Dispatch error event
      dispatchApiError(error)
    }

    return response
  }

  globalFetchOverridden = true
  console.log('🔧 Global fetch error capture enabled')
}

export default api
