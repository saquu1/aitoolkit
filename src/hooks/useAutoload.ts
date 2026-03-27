/**
 * useAutoload Hook
 * ================
 * Check and control autoload status for pages.
 * Prevents data fetching when autoload is disabled.
 */

import { useState, useEffect, useCallback } from 'react'

interface AutoloadConfig {
  id: string
  pageKey: string
  pageName: string
  category: string
  enabled: boolean
  description: string | null
  fetchEndpoint: string | null
  lastToggledAt: string | null
  toggledBy: string | null
  reason: string | null
  priority: number
}

interface AutoloadStats {
  total: number
  enabled: number
  disabled: number
  byCategory: Record<string, number>
}

interface UseAutoloadReturn {
  // Status
  enabled: boolean
  loading: boolean
  config: AutoloadConfig | null
  error: string | null
  
  // Actions
  toggle: () => Promise<void>
  enable: () => Promise<void>
  disable: (reason?: string) => Promise<void>
  refresh: () => Promise<void>
}

// Cache for autoload states (shared across all hook instances)
const autoloadCache: Record<string, { enabled: boolean; timestamp: number }> = {}
const CACHE_TTL = 30000 // 30 seconds

/**
 * Check if autoload is enabled for a specific page
 */
export function useAutoload(pageKey: string): UseAutoloadReturn {
  const [config, setConfig] = useState<AutoloadConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check cache first
  const cached = autoloadCache[pageKey]
  const initialEnabled = cached && (Date.now() - cached.timestamp) < CACHE_TTL 
    ? cached.enabled 
    : true

  const [enabled, setEnabled] = useState(initialEnabled)

  // Fetch config from API
  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const res = await fetch(`/api/autoload?pageKey=${pageKey}`)
      if (!res.ok) throw new Error('Failed to fetch autoload config')
      
      const data = await res.json()
      if (data.config) {
        setConfig(data.config)
        setEnabled(data.config.enabled)
        // Update cache
        autoloadCache[pageKey] = { enabled: data.config.enabled, timestamp: Date.now() }
      }
    } catch (err) {
      console.error('[useAutoload] Error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      // Default to enabled on error
      setEnabled(true)
    } finally {
      setLoading(false)
    }
  }, [pageKey])

  // Toggle autoload
  const toggle = useCallback(async () => {
    try {
      const res = await fetch('/api/autoload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageKey })
      })
      if (!res.ok) throw new Error('Failed to toggle autoload')
      
      const data = await res.json()
      if (data.config) {
        setConfig(data.config)
        setEnabled(data.config.enabled)
        autoloadCache[pageKey] = { enabled: data.config.enabled, timestamp: Date.now() }
      }
    } catch (err) {
      console.error('[useAutoload] Toggle error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [pageKey])

  // Enable autoload
  const enable = useCallback(async () => {
    try {
      const res = await fetch('/api/autoload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageKey, enabled: true })
      })
      if (!res.ok) throw new Error('Failed to enable autoload')
      
      const data = await res.json()
      if (data.config) {
        setConfig(data.config)
        setEnabled(true)
        autoloadCache[pageKey] = { enabled: true, timestamp: Date.now() }
      }
    } catch (err) {
      console.error('[useAutoload] Enable error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [pageKey])

  // Disable autoload
  const disable = useCallback(async (reason?: string) => {
    try {
      const res = await fetch('/api/autoload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageKey, enabled: false, reason })
      })
      if (!res.ok) throw new Error('Failed to disable autoload')
      
      const data = await res.json()
      if (data.config) {
        setConfig(data.config)
        setEnabled(false)
        autoloadCache[pageKey] = { enabled: false, timestamp: Date.now() }
      }
    } catch (err) {
      console.error('[useAutoload] Disable error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [pageKey])

  // Initial fetch
  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  return {
    enabled,
    loading,
    config,
    error,
    toggle,
    enable,
    disable,
    refresh: fetchConfig
  }
}

/**
 * Get all autoload configurations (for admin/settings page)
 */
export function useAutoloadAll() {
  const [configs, setConfigs] = useState<AutoloadConfig[]>([])
  const [stats, setStats] = useState<AutoloadStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async (category?: string) => {
    try {
      setLoading(true)
      const url = category ? `/api/autoload?category=${category}` : '/api/autoload'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch autoload configs')
      
      const data = await res.json()
      setConfigs(data.configs || [])
      setStats(data.stats || null)
    } catch (err) {
      console.error('[useAutoloadAll] Error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  // Bulk actions
  const enableAll = useCallback(async () => {
    try {
      const res = await fetch('/api/autoload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enable-all' })
      })
      if (!res.ok) throw new Error('Failed to enable all')
      
      const data = await res.json()
      setConfigs(data.configs || [])
      setStats(data.stats || null)
      
      // Clear cache
      Object.keys(autoloadCache).forEach(key => delete autoloadCache[key])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [])

  const disableAll = useCallback(async () => {
    try {
      const res = await fetch('/api/autoload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disable-all' })
      })
      if (!res.ok) throw new Error('Failed to disable all')
      
      const data = await res.json()
      setConfigs(data.configs || [])
      setStats(data.stats || null)
      
      // Clear cache
      Object.keys(autoloadCache).forEach(key => delete autoloadCache[key])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [])

  const enableCategory = useCallback(async (category: string) => {
    try {
      const res = await fetch('/api/autoload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enable-category', category })
      })
      if (!res.ok) throw new Error('Failed to enable category')
      
      const data = await res.json()
      setConfigs(data.configs || [])
      setStats(data.stats || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [])

  const disableCategory = useCallback(async (category: string) => {
    try {
      const res = await fetch('/api/autoload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disable-category', category })
      })
      if (!res.ok) throw new Error('Failed to disable category')
      
      const data = await res.json()
      setConfigs(data.configs || [])
      setStats(data.stats || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [])

  const togglePage = useCallback(async (pageKey: string) => {
    try {
      const res = await fetch('/api/autoload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageKey })
      })
      if (!res.ok) throw new Error('Failed to toggle page autoload')
      
      const data = await res.json()
      setConfigs(prev => 
        prev.map(c => c.pageKey === pageKey ? { ...c, enabled: data.config.enabled } : c)
      )
      // Update stats
      if (data.stats) setStats(data.stats)
      // Clear cache
      delete autoloadCache[pageKey]
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [])

  const resetToDefaults = useCallback(async () => {
    try {
      const res = await fetch('/api/autoload', { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to reset autoload configs')
      
      const data = await res.json()
      setConfigs(data.configs || [])
      setStats(data.stats || null)
      // Clear all cache
      Object.keys(autoloadCache).forEach(key => delete autoloadCache[key])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  return {
    configs,
    stats,
    loading,
    error,
    refresh: fetchAll,
    enableAll,
    disableAll,
    enableCategory,
    disableCategory,
    togglePage,
    resetToDefaults
  }
}

export default useAutoload
