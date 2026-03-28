/**
 * USE ANALYTICS DATA HOOK
 * =======================
 * Simple hook that fetches analytics data from ONE endpoint
 * Handles caching, loading, and error states
 */

import { useState, useEffect, useCallback } from 'react'

// Analytics mode type
export type AnalyticsMode = 'fast' | 'heavy' | 'mixed'

interface AnalyticsData {
  fetchedAt: string
  approach?: string
  _meta?: { fastFetch: boolean; heavyCalculations: boolean }
  summary: {
    totalSessions: number
    totalTokens: number
    totalCost: number
    totalIssues: number
    resolvedIssues: number
    totalFeatures: number
    avgDuration: number
    avgEfficiency: number
  }
  distributions: {
    models: Record<string, number>
    categories: Record<string, number>
    issueTypes: Record<string, number>
    featureTypes: Record<string, number>
  }
  sessions?: any[]
  issues?: any[]
  features?: any[]
  toolCalls?: any[]
  fileOperations?: any[]
  fileHeatmap?: any[]
  calendar?: Array<{ date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }>
  trends?: any[]
  intelligence?: {
    riskScore: number
    warningCount: number
    unresolvedIssues: number
    recommendations: string[]
  }
  kanban?: {
    backlog: any[]
    detected: any[]
    in_progress: any[]
    testing: any[]
    resolved: any[]
  }
  overview?: any
  sessionDetails?: any
}

interface UseAnalyticsOptions {
  tab?: 'all' | 'overview' | 'sessions' | 'issues' | 'features' | 'tools' | 'files' | 'trends' | 'intelligence' | 'kanban'
  sessionId?: string
  days?: number
  limit?: number
  autoRefresh?: boolean
  refreshInterval?: number
  mode?: AnalyticsMode
}

// Endpoint mapping
const ENDPOINTS: Record<AnalyticsMode, string> = {
  fast: '/api/analytics/fast',
  heavy: '/api/analytics/sync',
  mixed: '/api/analytics/mixed'
}

// Get mode from localStorage
function getStoredMode(): AnalyticsMode {
  if (typeof window === 'undefined') return 'mixed'
  const stored = localStorage.getItem('analytics-mode')
  if (stored && ['fast', 'heavy', 'mixed'].includes(stored)) {
    return stored as AnalyticsMode
  }
  return 'mixed'
}

/**
 * Simple hook to fetch analytics data
 * 
 * @example
 * // Basic usage - get all data
 * const { data, isLoading, error, refetch } = useAnalyticsData()
 * 
 * @example
 * // Get specific tab data
 * const { data } = useAnalyticsData({ tab: 'sessions' })
 * 
 * @example
 * // Auto-refresh every minute
 * const { data } = useAnalyticsData({ autoRefresh: true, refreshInterval: 60000 })
 * 
 * @example
 * // Use specific mode
 * const { data } = useAnalyticsData({ mode: 'fast' })
 */
export function useAnalyticsData(options: UseAnalyticsOptions = {}) {
  const {
    tab = 'all',
    sessionId,
    days = 30,
    limit = 100,
    autoRefresh = false,
    refreshInterval = 60000,
    mode
  } = options

  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastFetched, setLastFetched] = useState<Date | null>(null)
  const [currentMode, setCurrentMode] = useState<AnalyticsMode>(mode || 'mixed')

  // Sync with localStorage mode changes
  useEffect(() => {
    if (!mode) {
      const stored = getStoredMode()
      setCurrentMode(stored)
    }
  }, [mode])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Use provided mode or get from localStorage
      const activeMode = mode || getStoredMode()
      const endpoint = ENDPOINTS[activeMode]

      // Build URL with parameters
      const params = new URLSearchParams()
      params.set('tab', tab)
      params.set('days', days.toString())
      params.set('limit', limit.toString())
      if (sessionId) params.set('sessionId', sessionId)

      const response = await fetch(`${endpoint}?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
        setLastFetched(new Date())
        setCurrentMode(activeMode)
      } else {
        setError(result.error || 'Failed to fetch data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [tab, sessionId, days, limit, mode])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchData, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchData])

  return {
    data,
    isLoading,
    error,
    lastFetched,
    refetch: fetchData,
    mode: currentMode
  }
}

/**
 * Hook for specific session details
 */
export function useSessionDetails(sessionId: string | null) {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) {
      setData(null)
      return
    }

    const fetchDetails = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/analytics/sync?sessionId=${sessionId}`)
        const result = await response.json()

        if (result.success) {
          setData(result.data.sessionDetails)
        } else {
          setError(result.error || 'Failed to fetch session details')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDetails()
  }, [sessionId])

  return { data, isLoading, error }
}

/**
 * Hook for tab-specific data with built-in caching
 */
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 30000 // 30 seconds

export function useAnalyticsTab(tab: string, options: { days?: number; limit?: number; mode?: AnalyticsMode } = {}) {
  const { days = 30, limit = 100, mode } = options
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Use provided mode or get from localStorage
    const activeMode = mode || getStoredMode()
    const cacheKey = `${tab}-${days}-${limit}-${activeMode}`
    const cached = cache.get(cacheKey)
    const now = Date.now()

    // Use cached data if fresh
    if (cached && now - cached.timestamp < CACHE_TTL) {
      setData(cached.data)
      setIsLoading(false)
      return
    }

    const fetchData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const endpoint = ENDPOINTS[activeMode]
        const response = await fetch(`${endpoint}?tab=${tab}&days=${days}&limit=${limit}`)
        const result = await response.json()

        if (result.success) {
          setData(result.data)
          cache.set(cacheKey, { data: result.data, timestamp: now })
        } else {
          setError(result.error || 'Failed to fetch data')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [tab, days, limit, mode])

  return { data, isLoading, error }
}

/**
 * Clear the analytics cache
 */
export function clearAnalyticsCache() {
  cache.clear()
}

export default useAnalyticsData
