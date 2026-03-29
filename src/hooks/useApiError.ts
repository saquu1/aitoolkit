/**
 * USE API ERROR HOOK
 * ==================
 * React hook for handling API errors globally
 *
 * Features:
 * - Listens to api-error events
 * - Manages error state
 * - Provides toast/notification helpers
 * - Logs errors to backend
 * - Pattern detection integration
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { ApiError, ErrorSeverity, ErrorType } from '@/lib/api-client'

// =============================================================================
// TYPES
// =============================================================================

export interface ManagedError extends ApiError {
  acknowledged: boolean
  displayCount: number
  firstSeen: string
  lastSeen: string
}

export interface ErrorSummary {
  total: number
  critical: number
  errors: number
  warnings: number
  info: number
  unacknowledged: number
}

export interface UseApiErrorOptions {
  maxErrors?: number
  autoLog?: boolean
  logEndpoint?: string
  onCritical?: (error: ManagedError) => void
  onError?: (error: ManagedError) => void
  onWarning?: (error: ManagedError) => void
}

export interface UseApiErrorReturn {
  errors: ManagedError[]
  summary: ErrorSummary
  hasErrors: boolean
  hasCritical: boolean
  latestError: ManagedError | null
  acknowledgeError: (id: string) => void
  acknowledgeAll: () => void
  clearErrors: () => void
  removeError: (id: string) => void
  logError: (error: ManagedError) => Promise<void>
  getErrorsByType: (type: ErrorType) => ManagedError[]
  getErrorsBySeverity: (severity: ErrorSeverity) => ManagedError[]
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useApiError(options: UseApiErrorOptions = {}): UseApiErrorReturn {
  const {
    maxErrors = 50,
    autoLog = true,
    logEndpoint = '/api/error-log',
    onCritical,
    onError,
    onWarning,
  } = options

  const [errors, setErrors] = useState<ManagedError[]>([])
  const isProcessing = useRef(false)

  // Calculate summary
  const summary: ErrorSummary = {
    total: errors.length,
    critical: errors.filter(e => e.severity === 'critical').length,
    errors: errors.filter(e => e.severity === 'error').length,
    warnings: errors.filter(e => e.severity === 'warning').length,
    info: errors.filter(e => e.severity === 'info').length,
    unacknowledged: errors.filter(e => !e.acknowledged).length,
  }

  const hasErrors = errors.length > 0
  const hasCritical = summary.critical > 0
  const latestError = errors[0] || null

  // Log error to backend
  const logError = useCallback(async (error: ManagedError) => {
    if (!autoLog) return

    try {
      await fetch(logEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...error,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
        }),
      })
    } catch (err) {
      console.error('Failed to log error:', err)
    }
  }, [autoLog, logEndpoint])

  // Handle new error
  const handleError = useCallback((event: CustomEvent<ApiError>) => {
    if (isProcessing.current) return
    isProcessing.current = true

    const apiError = event.detail

    setErrors(prev => {
      // Check if similar error already exists (deduplication)
      const existingIndex = prev.findIndex(e =>
        e.endpoint === apiError.endpoint &&
        e.status === apiError.status &&
        e.message === apiError.message
      )

      if (existingIndex >= 0) {
        // Update existing error
        const updated = [...prev]
        const existing = updated[existingIndex]
        updated[existingIndex] = {
          ...existing,
          displayCount: existing.displayCount + 1,
          lastSeen: new Date().toISOString(),
          acknowledged: false,
        }
        return updated
      }

      // Add new error
      const newError: ManagedError = {
        ...apiError,
        acknowledged: false,
        displayCount: 1,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
      }

      // Log to backend
      logError(newError)

      // Call callbacks
      if (apiError.severity === 'critical' && onCritical) {
        onCritical(newError)
      } else if (apiError.severity === 'error' && onError) {
        onError(newError)
      } else if (apiError.severity === 'warning' && onWarning) {
        onWarning(newError)
      }

      // Limit max errors
      const result = [newError, ...prev].slice(0, maxErrors)
      return result
    })

    isProcessing.current = false
  }, [logError, maxErrors, onCritical, onError, onWarning])

  // Acknowledge error
  const acknowledgeError = useCallback((id: string) => {
    setErrors(prev => prev.map(e =>
      e.id === id ? { ...e, acknowledged: true } : e
    ))
  }, [])

  // Acknowledge all
  const acknowledgeAll = useCallback(() => {
    setErrors(prev => prev.map(e => ({ ...e, acknowledged: true })))
  }, [])

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors([])
  }, [])

  // Remove single error
  const removeError = useCallback((id: string) => {
    setErrors(prev => prev.filter(e => e.id !== id))
  }, [])

  // Get errors by type
  const getErrorsByType = useCallback((type: ErrorType) => {
    return errors.filter(e => e.type === type)
  }, [errors])

  // Get errors by severity
  const getErrorsBySeverity = useCallback((severity: ErrorSeverity) => {
    return errors.filter(e => e.severity === severity)
  }, [errors])

  // Subscribe to error events
  useEffect(() => {
    window.addEventListener('api-error', handleError as EventListener)

    return () => {
      window.removeEventListener('api-error', handleError as EventListener)
    }
  }, [handleError])

  return {
    errors,
    summary,
    hasErrors,
    hasCritical,
    latestError,
    acknowledgeError,
    acknowledgeAll,
    clearErrors,
    removeError,
    logError,
    getErrorsByType,
    getErrorsBySeverity,
  }
}

// =============================================================================
// ERROR TOAST HELPER
// =============================================================================

export function getErrorToastMessage(error: ManagedError): {
  title: string
  description: string
  variant: 'default' | 'destructive'
} {
  // Business logic (409)
  if (error.status === 409) {
    return {
      title: '⚠️ Duplicate Detected',
      description: error.hint || 'This data already exists in the system.',
      variant: 'default',
    }
  }

  // Server errors (5xx)
  if (error.status >= 500) {
    return {
      title: '🚨 Server Error',
      description: 'A server error occurred. The system will retry automatically.',
      variant: 'destructive',
    }
  }

  // Auth errors
  if (error.status === 401 || error.status === 403) {
    return {
      title: '🔐 Authentication Error',
      description: 'You may need to log in again.',
      variant: 'destructive',
    }
  }

  // Validation errors
  if (error.status === 400 || error.status === 422) {
    return {
      title: '📝 Validation Error',
      description: error.message || 'Please check your input.',
      variant: 'default',
    }
  }

  // Network errors
  if (error.status === 0) {
    return {
      title: '🌐 Network Error',
      description: 'Could not connect to the server. Please check your connection.',
      variant: 'destructive',
    }
  }

  // Generic error
  return {
    title: `❌ Error (${error.status})`,
    description: error.message,
    variant: 'destructive',
  }
}

// =============================================================================
// ERROR SOUND (Optional)
// =============================================================================

export function playErrorSound(severity: ErrorSeverity): void {
  if (typeof window === 'undefined' || severity === 'info') return

  // Simple beep using Web Audio API
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    // Different sounds for different severities
    oscillator.frequency.value = severity === 'critical' ? 200 : 400
    gainNode.gain.value = 0.1

    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.1)
  } catch {
    // Ignore audio errors
  }
}

export default useApiError
