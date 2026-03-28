'use client'

/**
 * PROGRESSIVE DATA HOOKS
 * ======================
 * Unified hooks for progressive data loading across the application
 * 
 * Features:
 * - Automatic pagination
 * - Virtual scrolling support
 * - Infinite scroll integration
 * - Loading states
 * - Error handling
 * - Cache management
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'

// =============================================================================
// TYPES
// =============================================================================

export interface PaginationState {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasMore: boolean
}

export interface PaginatedApiResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    hasMore: boolean
    hasPrevious: boolean
    nextCursor: string | null
    previousCursor: string | null
    totalCount?: number
    page?: number
    pageSize: number
    totalPages?: number
  }
  meta?: Record<string, unknown>
  error?: string
}

export interface UseProgressiveListOptions<T> {
  /** API endpoint URL */
  url: string
  /** Query key for caching */
  queryKey: unknown[]
  /** Page size for pagination */
  pageSize?: number
  /** Use cursor-based pagination */
  useCursor?: boolean
  /** Transform response data */
  transform?: (data: T[]) => T[]
  /** Filter params */
  filters?: Record<string, string | number | boolean>
  /** Enable automatic loading */
  enabled?: boolean
  /** Stale time in ms */
  staleTime?: number
}

export interface UseProgressiveListReturn<T> {
  /** All loaded items */
  items: T[]
  /** Loading states */
  isLoading: boolean
  isFetchingMore: boolean
  /** Error state */
  error: Error | null
  /** Pagination state */
  hasMore: boolean
  total: number | undefined
  /** Actions */
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
  reset: () => void
  /** Virtual scrolling helpers */
  visibleItems: (startIndex: number, endIndex: number) => T[]
  getItem: (index: number) => T | undefined
}

// =============================================================================
// PROGRESSIVE LIST HOOK
// =============================================================================

/**
 * Hook for progressive list loading with virtual scrolling support
 */
export function useProgressiveList<T extends { id: string }>(
  options: UseProgressiveListOptions<T>
): UseProgressiveListReturn<T> {
  const {
    url,
    queryKey,
    pageSize = 20,
    useCursor = true,
    transform,
    filters = {},
    enabled = true,
    staleTime = 60000,
  } = options

  const queryClient = useQueryClient()
  const [items, setItems] = useState<T[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [total, setTotal] = useState<number | undefined>(undefined)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Build URL with filters
  const buildUrl = useCallback((cursorValue: string | null, page?: number) => {
    const params = new URLSearchParams()
    
    if (useCursor && cursorValue) {
      params.set('cursor', cursorValue)
      params.set('limit', String(pageSize))
      params.set('mode', 'cursor')
    } else if (!useCursor && page) {
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))
      params.set('mode', 'offset')
    }
    
    // Add filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value))
      }
    })
    
    return `${url}?${params.toString()}`
  }, [url, useCursor, pageSize, filters])

  // Fetch function
  const fetchPage = useCallback(async (cursorValue: string | null) => {
    const response = await fetch(buildUrl(cursorValue))
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    
    const json: PaginatedApiResponse<T> = await response.json()
    
    if (!json.success) {
      throw new Error(json.error || 'API request failed')
    }
    
    return {
      data: transform ? transform(json.data) : json.data,
      nextCursor: json.pagination.nextCursor,
      hasMore: json.pagination.hasMore,
      total: json.pagination.totalCount,
    }
  }, [buildUrl, transform])

  // Initial query
  const { isLoading, error, refetch } = useQuery({
    queryKey: [...queryKey, 'initial', filters],
    queryFn: () => fetchPage(null),
    enabled: enabled && items.length === 0,
    staleTime,
  })

  // Load initial data
  useEffect(() => {
    if (items.length === 0 && !isLoading) {
      refetch().then((result) => {
        if (result.data) {
          setItems(result.data.data)
          setCursor(result.data.nextCursor)
          setHasMore(result.data.hasMore)
          setTotal(result.data.total)
        }
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load more function
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)
    try {
      const result = await fetchPage(cursor)
      setItems(prev => [...prev, ...result.data])
      setCursor(result.nextCursor)
      setHasMore(result.hasMore)
      if (result.total !== undefined) {
        setTotal(result.total)
      }
    } catch (err) {
      console.error('Error loading more:', err)
    } finally {
      setIsLoadingMore(false)
    }
  }, [cursor, hasMore, isLoadingMore, fetchPage])

  // Refresh function
  const refresh = useCallback(async () => {
    setItems([])
    setCursor(null)
    setHasMore(true)
    setIsLoadingMore(false)
    
    try {
      const result = await fetchPage(null)
      setItems(result.data)
      setCursor(result.nextCursor)
      setHasMore(result.hasMore)
      if (result.total !== undefined) {
        setTotal(result.total)
      }
    } catch (err) {
      console.error('Error refreshing:', err)
    }
  }, [fetchPage])

  // Reset function
  const reset = useCallback(() => {
    setItems([])
    setCursor(null)
    setHasMore(true)
    setTotal(undefined)
    queryClient.invalidateQueries({ queryKey })
  }, [queryClient, queryKey])

  // Virtual scrolling helpers
  const visibleItems = useCallback((startIndex: number, endIndex: number) => {
    return items.slice(startIndex, endIndex + 1)
  }, [items])

  const getItem = useCallback((index: number) => {
    return items[index]
  }, [items])

  return {
    items,
    isLoading,
    isFetchingMore: isLoadingMore,
    error: error as Error | null,
    hasMore,
    total,
    loadMore,
    refresh,
    reset,
    visibleItems,
    getItem,
  }
}

// =============================================================================
// INFINITE SCROLL HOOK (Enhanced)
// =============================================================================

export interface UseInfiniteScrollListOptions<T> {
  url: string
  queryKey: unknown[]
  pageSize?: number
  threshold?: number
  enabled?: boolean
  filters?: Record<string, string | number | boolean>
}

export interface UseInfiniteScrollListReturn<T> {
  items: T[]
  isLoading: boolean
  hasMore: boolean
  error: Error | null
  loadMore: () => void
  refresh: () => void
  sentinelRef: (node: HTMLElement | null) => void
}

/**
 * Hook for infinite scroll with automatic loading
 */
export function useInfiniteScrollList<T extends { id: string }>(
  options: UseInfiniteScrollListOptions<T>
): UseInfiniteScrollListReturn<T> {
  const { url, queryKey, pageSize = 20, threshold = 100, enabled = true, filters = {} } = options

  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadingRef = useRef(false)

  const {
    items,
    isLoading,
    hasMore,
    error,
    loadMore,
    refresh,
  } = useProgressiveList<T>({
    url,
    queryKey,
    pageSize,
    enabled,
    filters,
  })

  // Sentinel ref for intersection observer
  const sentinelRef = useCallback((node: HTMLElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    if (!node || !enabled) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
          loadingRef.current = true
          loadMore().finally(() => {
            loadingRef.current = false
          })
        }
      },
      { rootMargin: `${threshold}px` }
    )

    observerRef.current.observe(node)
  }, [hasMore, loadMore, threshold, enabled])

  return {
    items,
    isLoading,
    hasMore,
    error,
    loadMore,
    refresh,
    sentinelRef,
  }
}

// =============================================================================
// VIRTUALIZED LIST HOOK
// =============================================================================

export interface UseVirtualizedListOptions {
  itemCount: number
  itemHeight: number
  containerHeight: number
  overscan?: number
}

export interface UseVirtualizedListReturn {
  startIndex: number
  endIndex: number
  totalHeight: number
  offsetY: number
  onScroll: (scrollTop: number) => void
  getItemStyle: (index: number) => { position: 'absolute'; top: number; height: number }
}

/**
 * Hook for virtualized list calculations
 */
export function useVirtualizedList(options: UseVirtualizedListOptions): UseVirtualizedListReturn {
  const { itemCount, itemHeight, containerHeight, overscan = 3 } = options
  const [scrollTop, setScrollTop] = useState(0)

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    itemCount - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  )

  const totalHeight = itemCount * itemHeight
  const offsetY = startIndex * itemHeight

  const onScroll = useCallback((newScrollTop: number) => {
    setScrollTop(newScrollTop)
  }, [])

  const getItemStyle = useCallback((index: number) => ({
    position: 'absolute' as const,
    top: index * itemHeight,
    height: itemHeight,
  }), [itemHeight])

  return {
    startIndex,
    endIndex,
    totalHeight,
    offsetY,
    onScroll,
    getItemStyle,
  }
}

// =============================================================================
// OPTIMISTIC UPDATE HOOK
// =============================================================================

export interface UseOptimisticUpdateOptions<T> {
  queryKey: unknown[]
  mutationFn: (item: T) => Promise<T>
  onOptimisticUpdate?: (old: T[], newItem: T) => T[]
  onRollback?: (old: T[]) => T[]
}

/**
 * Hook for optimistic updates with rollback
 */
export function useOptimisticUpdate<T extends { id: string }>(
  options: UseOptimisticUpdateOptions<T>
) {
  const { queryKey, mutationFn, onOptimisticUpdate, onRollback } = options
  const queryClient = useQueryClient()
  const [isPending, setIsPending] = useState(false)

  const mutate = useCallback(async (item: T) => {
    setIsPending(true)
    
    // Cancel any ongoing refetches
    await queryClient.cancelQueries({ queryKey })
    
    // Snapshot previous value
    const previousData = queryClient.getQueryData<T[]>(queryKey)
    
    try {
      // Optimistically update
      if (previousData && onOptimisticUpdate) {
        queryClient.setQueryData<T[]>(queryKey, onOptimisticUpdate(previousData, item))
      }
      
      // Perform mutation
      const result = await mutationFn(item)
      
      // Update with real data
      queryClient.setQueryData<T[]>(queryKey, (old) => {
        if (!old) return [result]
        return old.map(i => i.id === result.id ? result : i)
      })
      
      return result
    } catch (error) {
      // Rollback on error
      if (previousData) {
        queryClient.setQueryData<T[]>(queryKey, onRollback ? onRollback(previousData) : previousData)
      }
      throw error
    } finally {
      setIsPending(false)
    }
  }, [queryClient, queryKey, mutationFn, onOptimisticUpdate, onRollback])

  return {
    mutate,
    isPending,
  }
}

// =============================================================================
// DEBOUNCED FILTER HOOK
// =============================================================================

export interface UseDebouncedFilterOptions {
  initialFilters?: Record<string, unknown>
  debounceMs?: number
}

/**
 * Hook for debounced filter updates
 */
export function useDebouncedFilter(options: UseDebouncedFilterOptions = {}) {
  const { initialFilters = {}, debounceMs = 300 } = options
  
  const [filters, setFilters] = useState(initialFilters)
  const [debouncedFilters, setDebouncedFilters] = useState(initialFilters)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const updateFilter = useCallback((key: string, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(() => {
      setDebouncedFilters(prev => ({ ...prev, [key]: value }))
    }, debounceMs)
  }, [debounceMs])

  const updateFilters = useCallback((newFilters: Record<string, unknown>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(() => {
      setDebouncedFilters(prev => ({ ...prev, ...newFilters }))
    }, debounceMs)
  }, [debounceMs])

  const resetFilters = useCallback(() => {
    setFilters(initialFilters)
    setDebouncedFilters(initialFilters)
  }, [initialFilters])

  return {
    filters,
    debouncedFilters,
    updateFilter,
    updateFilters,
    resetFilters,
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  useProgressiveList,
  useInfiniteScrollList,
  useVirtualizedList,
  useOptimisticUpdate,
  useDebouncedFilter,
}
