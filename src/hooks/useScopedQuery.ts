/**
 * useScopedQuery Hook
 * 
 * A React hook for making scope-aware API queries.
 * Automatically includes project scope parameters in all requests.
 */

import { useState, useCallback, useEffect } from 'react'
import { useProjectScopeContext } from '@/contexts/ProjectScopeContext'

// Types
export interface ScopedQueryOptions {
  /** API endpoint path */
  endpoint: string
  /** Query action (for action-based APIs) */
  action?: string
  /** Additional query parameters */
  params?: Record<string, string | number | boolean>
  /** Auto-fetch on mount */
  autoFetch?: boolean
  /** Transform response data */
  transform?: (data: any) => any
  /** Error handler */
  onError?: (error: Error) => void
}

export interface ScopedQueryResult<T> {
  /** Response data */
  data: T | null
  /** Loading state */
  isLoading: boolean
  /** Error state */
  error: Error | null
  /** Refetch function */
  refetch: () => Promise<void>
  /** Last fetch timestamp */
  lastFetched: Date | null
}

/**
 * Hook for making scope-aware API queries
 */
export function useScopedQuery<T = any>(
  options: ScopedQueryOptions
): ScopedQueryResult<T> {
  const {
    endpoint,
    action,
    params = {},
    autoFetch = true,
    transform,
    onError
  } = options

  const { scope, projectIds, isGlobalScope } = useProjectScopeContext()
  
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastFetched, setLastFetched] = useState<Date | null>(null)

  // Build scope parameters
  const buildScopeParams = useCallback(() => {
    const scopeParams: Record<string, string> = {
      scopeType: scope.type
    }

    if (scope.type === 'project' && scope.activeProjectId) {
      scopeParams.projectId = scope.activeProjectId
    } else if (scope.type === 'multi' && scope.selectedProjectIds.length > 0) {
      scopeParams.selectedProjects = JSON.stringify(scope.selectedProjectIds)
    }

    if (action) {
      scopeParams.action = action
    }

    // Merge with additional params
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        scopeParams[key] = String(value)
      }
    })

    return scopeParams
  }, [scope, action, params])

  // Build URL with scope parameters
  const buildUrl = useCallback(() => {
    const scopeParams = buildScopeParams()
    const queryString = new URLSearchParams(scopeParams).toString()
    return `${endpoint}?${queryString}`
  }, [endpoint, buildScopeParams])

  // Fetch function
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const url = buildUrl()
      const response = await fetch(url, {
        headers: {
          'X-Project-Scope': scope.type,
          'X-Project-Id': scope.activeProjectId || ''
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      let result = await response.json()
      
      if (transform) {
        result = transform(result)
      }

      setData(result)
      setLastFetched(new Date())
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      onError?.(error)
    } finally {
      setIsLoading(false)
    }
  }, [buildUrl, scope, transform, onError])

  // Auto-fetch on mount and when scope changes
  useEffect(() => {
    if (autoFetch) {
      fetchData()
    }
  }, [autoFetch, fetchData])

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
    lastFetched
  }
}

/**
 * Hook for making scope-aware POST requests
 */
export interface ScopedMutationOptions {
  /** API endpoint path */
  endpoint: string
  /** Action type for the mutation */
  action?: string
  /** Success handler */
  onSuccess?: (data: any) => void
  /** Error handler */
  onError?: (error: Error) => void
}

export interface ScopedMutationResult {
  /** Mutate function */
  mutate: (data: any) => Promise<any>
  /** Loading state */
  isLoading: boolean
  /** Error state */
  error: Error | null
  /** Response data */
  data: any | null
  /** Reset state */
  reset: () => void
}

export function useScopedMutation(
  options: ScopedMutationOptions
): ScopedMutationResult {
  const { endpoint, action, onSuccess, onError } = options
  const { scope } = useProjectScopeContext()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<any>(null)

  const mutate = useCallback(async (mutationData: any) => {
    setIsLoading(true)
    setError(null)

    try {
      const url = action ? `${endpoint}?action=${action}` : endpoint
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-Scope': scope.type,
          'X-Project-Id': scope.activeProjectId || ''
        },
        body: JSON.stringify({
          ...mutationData,
          scopeType: scope.type,
          projectId: scope.activeProjectId,
          selectedProjects: scope.selectedProjectIds
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setData(result)
      onSuccess?.(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      onError?.(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [endpoint, action, scope, onSuccess, onError])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setIsLoading(false)
  }, [])

  return {
    mutate,
    isLoading,
    error,
    data,
    reset
  }
}

/**
 * Hook to get scope parameters for manual fetch calls
 */
export function useScopeParams() {
  const { scope, projectIds, isGlobalScope, isIsolated, includeGlobal } = useProjectScopeContext()

  const getParams = useCallback(() => {
    const params: Record<string, string> = {
      scopeType: scope.type
    }

    if (scope.type === 'project' && scope.activeProjectId) {
      params.projectId = scope.activeProjectId
    } else if (scope.type === 'multi' && scope.selectedProjectIds.length > 0) {
      params.selectedProjects = JSON.stringify(scope.selectedProjectIds)
    }

    return params
  }, [scope])

  const getHeaders = useCallback(() => ({
    'X-Project-Scope': scope.type,
    'X-Project-Id': scope.activeProjectId || ''
  }), [scope])

  return {
    scope,
    projectIds,
    isGlobalScope,
    isIsolated,
    includeGlobal,
    getParams,
    getHeaders
  }
}

/**
 * Pre-configured hooks for common API endpoints
 */

// Intelligence Bank
export function useIntelligenceBankEntities(entityType?: string) {
  return useScopedQuery({
    endpoint: '/api/intelligence-bank/scope',
    action: 'entities',
    params: entityType ? { entityType } : undefined
  })
}

export function useIntelligenceBankStats() {
  return useScopedQuery({
    endpoint: '/api/intelligence-bank/scope',
    action: 'stats'
  })
}

// Error Patterns
export function useErrorPatterns(status?: string) {
  return useScopedQuery({
    endpoint: '/api/error-patterns/scope',
    action: 'patterns',
    params: status ? { status } : undefined
  })
}

export function useErrorPatternStats() {
  return useScopedQuery({
    endpoint: '/api/error-patterns/scope',
    action: 'stats'
  })
}

// Contract Validator
export function useContractScans(status?: string) {
  return useScopedQuery({
    endpoint: '/api/contract-validator/scope',
    action: 'scans',
    params: status ? { status } : undefined
  })
}

export function useContractValidationStats() {
  return useScopedQuery({
    endpoint: '/api/contract-validator/scope',
    action: 'stats'
  })
}

// Chat Logs
export function useChatLogs(startDate?: string, endDate?: string) {
  return useScopedQuery({
    endpoint: '/api/chat-logs/scope',
    action: 'logs',
    params: {
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {})
    }
  })
}

export function useChatLogStats() {
  return useScopedQuery({
    endpoint: '/api/chat-logs/scope',
    action: 'stats'
  })
}

export default useScopedQuery
