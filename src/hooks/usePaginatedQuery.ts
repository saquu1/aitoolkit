'use client'

/**
 * PAGINATION HOOKS
 * ================
 * React hooks for paginated data fetching
 * 
 * Features:
 * - Cursor-based pagination hook
 * - Offset-based pagination hook
 * - Infinite scroll integration
 * - Optimistic updates
 * - Cache management
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query'

// =============================================================================
// TYPES
// =============================================================================

export interface CursorPaginationResult<T> {
  data: T[]
  nextCursor: string | null
  hasMore: boolean
  total?: number
}

export interface OffsetPaginationResult<T> {
  data: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface PaginationFetchParams {
  cursor?: string | null
  limit?: number
  page?: number
  pageSize?: number
}

export type PaginationFetcher<T> = (params: PaginationFetchParams) => Promise<CursorPaginationResult<T> | OffsetPaginationResult<T>>

export interface UseCursorPaginationOptions<T> {
  /** Unique key for the query */
  queryKey: unknown[]
  /** Fetch function */
  fetcher: (cursor: string | null, limit: number) => Promise<CursorPaginationResult<T>>
  /** Page size */
  pageSize?: number
  /** Enable the query */
  enabled?: boolean
  /** Stale time in ms */
  staleTime?: number
  /** Cache time in ms */
  gcTime?: number
  /** Initial data */
  initialData?: T[]
}

export interface UseOffsetPaginationOptions<T> {
  /** Unique key for the query */
  queryKey: unknown[]
  /** Fetch function */
  fetcher: (page: number, pageSize: number) => Promise<OffsetPaginationResult<T>>
  /** Page size */
  pageSize?: number
  /** Initial page */
  initialPage?: number
  /** Enable the query */
  enabled?: boolean
  /** Stale time in ms */
  staleTime?: number
}

// =============================================================================
// CURSOR PAGINATION HOOK
// =============================================================================

export interface UseCursorPaginationReturn<T> {
  /** All loaded items */
  items: T[]
  /** Currently loading */
  isLoading: boolean
  /** Is fetching more items */
  isFetchingMore: boolean
  /** Error if any */
  error: Error | null
  /** Whether there are more items */
  hasMore: boolean
  /** Current cursor */
  cursor: string | null
  /** Total count if available */
  total: number | undefined
  /** Load more items */
  loadMore: () => Promise<void>
  /** Refresh and reset pagination */
  refresh: () => Promise<void>
  /** Reset to initial state */
  reset: () => void
  /** Prefetch next page */
  prefetchNext: () => Promise<void>
}

/**
 * Hook for cursor-based pagination (infinite scroll)
 */
export function useCursorPagination<T>(
  options: UseCursorPaginationOptions<T>
): UseCursorPaginationReturn<T> {
  const {
    queryKey,
    fetcher,
    pageSize = 20,
    enabled = true,
    staleTime = 60000, // 1 minute
    gcTime = 300000, // 5 minutes
    initialData = [],
  } = options

  const queryClient = useQueryClient()
  const [items, setItems] = useState<T[]>(initialData)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [total, setTotal] = useState<number | undefined>(undefined)

  // Initial fetch
  const { isLoading, error, refetch } = useQuery({
    queryKey: [...queryKey, 'initial'],
    queryFn: () => fetcher(null, pageSize),
    enabled: enabled && items.length === 0,
    staleTime,
    gcTime,
  })

  // Load initial data
  useEffect(() => {
    if (items.length === 0 && !isLoading) {
      refetch().then((result) => {
        if (result.data) {
          setItems(result.data.data)
          setCursor(result.data.nextCursor)
          setHasMore(result.data.hasMore)
          if (result.data.total !== undefined) {
            setTotal(result.data.total)
          }
        }
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load more function
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)
    try {
      const result = await fetcher(cursor, pageSize)
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
  }, [cursor, hasMore, isLoadingMore, fetcher, pageSize])

  // Refresh function
  const refresh = useCallback(async () => {
    setItems([])
    setCursor(null)
    setHasMore(true)
    setIsLoadingMore(false)
    
    try {
      const result = await fetcher(null, pageSize)
      setItems(result.data)
      setCursor(result.nextCursor)
      setHasMore(result.hasMore)
      if (result.total !== undefined) {
        setTotal(result.total)
      }
    } catch (err) {
      console.error('Error refreshing:', err)
    }
  }, [fetcher, pageSize])

  // Reset function
  const reset = useCallback(() => {
    setItems(initialData)
    setCursor(null)
    setHasMore(true)
    setTotal(undefined)
  }, [initialData])

  // Prefetch next page
  const prefetchNext = useCallback(async () => {
    if (!cursor || !hasMore) return
    
    queryClient.prefetchQuery({
      queryKey: [...queryKey, 'cursor', cursor],
      queryFn: () => fetcher(cursor, pageSize),
      staleTime,
    })
  }, [queryClient, queryKey, cursor, hasMore, fetcher, pageSize, staleTime])

  return {
    items,
    isLoading,
    isFetchingMore: isLoadingMore,
    error: error as Error | null,
    hasMore,
    cursor,
    total,
    loadMore,
    refresh,
    reset,
    prefetchNext,
  }
}

// =============================================================================
// OFFSET PAGINATION HOOK
// =============================================================================

export interface UseOffsetPaginationReturn<T> {
  /** Current page items */
  items: T[]
  /** Current page number */
  page: number
  /** Page size */
  pageSize: number
  /** Total items */
  total: number
  /** Total pages */
  totalPages: number
  /** Is loading */
  isLoading: boolean
  /** Error if any */
  error: Error | null
  /** Go to next page */
  nextPage: () => void
  /** Go to previous page */
  prevPage: () => void
  /** Go to specific page */
  goToPage: (page: number) => void
  /** Change page size */
  setPageSize: (size: number) => void
  /** Refresh current page */
  refresh: () => void
  /** Whether has next page */
  hasNext: boolean
  /** Whether has previous page */
  hasPrev: boolean
  /** Page numbers for UI */
  pageNumbers: number[]
}

/**
 * Hook for offset-based pagination (traditional page navigation)
 */
export function useOffsetPagination<T>(
  options: UseOffsetPaginationOptions<T>
): UseOffsetPaginationReturn<T> {
  const {
    queryKey,
    fetcher,
    pageSize: initialPageSize = 20,
    initialPage = 1,
    enabled = true,
    staleTime = 60000,
  } = options

  const [page, setPage] = useState(initialPage)
  const [pageSize, setPageSize] = useState(initialPageSize)

  // Fetch data for current page
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...queryKey, 'page', page, pageSize],
    queryFn: () => fetcher(page, pageSize),
    enabled,
    staleTime,
  })

  // Derived state
  const items = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 0
  const hasNext = page < totalPages
  const hasPrev = page > 1

  // Navigation functions
  const nextPage = useCallback(() => {
    if (hasNext) setPage(p => p + 1)
  }, [hasNext])

  const prevPage = useCallback(() => {
    if (hasPrev) setPage(p => p - 1)
  }, [hasPrev])

  const goToPage = useCallback((newPage: number) => {
    const clamped = Math.max(1, Math.min(newPage, totalPages || 1))
    setPage(clamped)
  }, [totalPages])

  const setPageSizeHandler = useCallback((newSize: number) => {
    setPageSize(newSize)
    setPage(1) // Reset to first page
  }, [])

  // Generate page numbers for UI
  const pageNumbers = useMemo(() => {
    const pages: number[] = []
    const maxVisible = 5
    let start = Math.max(1, page - Math.floor(maxVisible / 2))
    let end = Math.min(totalPages, start + maxVisible - 1)
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1)
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    
    return pages
  }, [page, totalPages])

  return {
    items,
    page,
    pageSize,
    total,
    totalPages,
    isLoading,
    error: error as Error | null,
    nextPage,
    prevPage,
    goToPage,
    setPageSize: setPageSizeHandler,
    refresh: refetch,
    hasNext,
    hasPrev,
    pageNumbers,
  }
}

// =============================================================================
// INFINITE QUERY HOOK (TanStack Query wrapper)
// =============================================================================

export interface UseInfiniteQueryOptions<T> {
  queryKey: unknown[]
  fetcher: (cursor: string | null, limit: number) => Promise<CursorPaginationResult<T>>
  pageSize?: number
  enabled?: boolean
  staleTime?: number
}

/**
 * Simplified infinite query hook
 */
export function useInfiniteQuery<T>(
  options: UseInfiniteQueryOptions<T>
): UseCursorPaginationReturn<T> {
  return useCursorPagination({
    queryKey: options.queryKey,
    fetcher: options.fetcher,
    pageSize: options.pageSize,
    enabled: options.enabled,
    staleTime: options.staleTime,
  })
}

// =============================================================================
// PAGINATION STATE HOOK
// =============================================================================

export interface UsePaginationStateOptions {
  initialPage?: number
  initialPageSize?: number
  total?: number
}

export interface UsePaginationStateReturn {
  page: number
  pageSize: number
  total: number
  totalPages: number
  offset: number
  hasMore: boolean
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  setTotal: (total: number) => void
  nextPage: () => void
  prevPage: () => void
  goToPage: (page: number) => void
  reset: () => void
}

/**
 * Simple pagination state management
 */
export function usePaginationState(
  options: UsePaginationStateOptions = {}
): UsePaginationStateReturn {
  const {
    initialPage = 1,
    initialPageSize = 20,
    total: initialTotal = 0,
  } = options

  const [page, setPage] = useState(initialPage)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [total, setTotal] = useState(initialTotal)

  const totalPages = Math.ceil(total / pageSize)
  const offset = (page - 1) * pageSize
  const hasMore = page < totalPages

  const nextPage = useCallback(() => {
    if (page < totalPages) setPage(p => p + 1)
  }, [page, totalPages])

  const prevPage = useCallback(() => {
    if (page > 1) setPage(p => p - 1)
  }, [page])

  const goToPage = useCallback((newPage: number) => {
    setPage(Math.max(1, Math.min(newPage, totalPages || 1)))
  }, [totalPages])

  const handleSetPageSize = useCallback((newSize: number) => {
    setPageSize(newSize)
    setPage(1)
  }, [])

  const reset = useCallback(() => {
    setPage(initialPage)
    setPageSize(initialPageSize)
    setTotal(initialTotal)
  }, [initialPage, initialPageSize, initialTotal])

  return {
    page,
    pageSize,
    total,
    totalPages,
    offset,
    hasMore,
    setPage,
    setPageSize: handleSetPageSize,
    setTotal,
    nextPage,
    prevPage,
    goToPage,
    reset,
  }
}

// =============================================================================
// DEBOUNCED SEARCH HOOK
// =============================================================================

/**
 * Hook for debounced search with pagination
 */
export function useDebouncedSearch(
  initialValue: string = '',
  debounceMs: number = 300
) {
  const [search, setSearch] = useState(initialValue)
  const [debouncedSearch, setDebouncedSearch] = useState(initialValue)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search)
    }, debounceMs)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [search, debounceMs])

  return {
    search,
    setSearch,
    debouncedSearch,
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  useCursorPagination,
  useOffsetPagination,
  usePaginationState,
  useDebouncedSearch,
}
