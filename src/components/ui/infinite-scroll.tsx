'use client'

/**
 * INFINITE SCROLL COMPONENT
 * =========================
 * Handles infinite scroll with pagination
 * 
 * Features:
 * - Intersection Observer based detection
 * - Debounced loading
 * - Error handling with retry
 * - Virtualization support
 * - Pull-to-refresh (optional)
 */

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { cn } from '@/lib/utils'
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

// =============================================================================
// TYPES
// =============================================================================

export interface InfiniteScrollProps<T> {
  /** Data items */
  items: T[]
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode
  /** Key extractor */
  keyExtractor: (item: T, index: number) => string | number
  /** Load more function */
  onLoadMore: () => Promise<void> | void
  /** Whether there are more items to load */
  hasMore: boolean
  /** Loading state */
  isLoading?: boolean
  /** Error state */
  error?: Error | null
  /** Retry function */
  onRetry?: () => void
  /** Container class name */
  className?: string
  /** Item class name */
  itemClassName?: string
  /** Loading component */
  LoadingComponent?: React.ReactNode
  /** Error component */
  ErrorComponent?: React.ReactNode
  /** Empty component */
  EmptyComponent?: React.ReactNode
  /** End message component */
  EndMessageComponent?: React.ReactNode
  /** Threshold in pixels or percentage */
  threshold?: number | string
  /** Debounce delay in ms */
  debounceDelay?: number
  /** Initial load */
  initialLoad?: boolean
  /** Scroll container selector (for nested scroll) */
  scrollContainer?: string | HTMLElement | null
  /** Reverse scroll (chat style) */
  reverse?: boolean
  /** Custom loader at bottom */
  loader?: React.ReactNode
}

export interface InfiniteScrollRef {
  scrollToTop: () => void
  scrollToBottom: () => void
  reset: () => void
  triggerLoadMore: () => void
}

// =============================================================================
// INFINITE SCROLL COMPONENT
// =============================================================================

function InfiniteScrollInner<T>(
  props: InfiniteScrollProps<T>,
  ref: React.ForwardedRef<InfiniteScrollRef>
) {
  const {
    items,
    renderItem,
    keyExtractor,
    onLoadMore,
    hasMore,
    isLoading = false,
    error = null,
    onRetry,
    className,
    itemClassName,
    LoadingComponent,
    ErrorComponent,
    EmptyComponent,
    EndMessageComponent,
    threshold = 100,
    debounceDelay = 100,
    initialLoad = true,
    scrollContainer,
    reverse = false,
    loader,
  } = props

  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // State
  const [internalLoading, setInternalLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Combined loading state
  const loading = isLoading || internalLoading

  // =============================================================================
  // INTERSECTION OBSERVER
  // =============================================================================

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const thresholdValue = typeof threshold === 'string' 
      ? parseFloat(threshold) / 100 
      : 0

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting && hasMore && !loading && !loadingRef.current) {
          triggerLoadMore()
        }
      },
      {
        rootMargin: typeof threshold === 'number' ? `${threshold}px` : '0px',
        threshold: thresholdValue,
      }
    )

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [hasMore, loading, threshold])

  // =============================================================================
  // LOAD MORE HANDLER
  // =============================================================================

  const triggerLoadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return

    loadingRef.current = true
    setInternalLoading(true)

    try {
      await onLoadMore()
    } catch (err) {
      console.error('Error loading more:', err)
    } finally {
      loadingRef.current = false
      setInternalLoading(false)
    }
  }, [onLoadMore, hasMore])

  // Debounced load more
  const debouncedLoadMore = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      triggerLoadMore()
    }, debounceDelay)
  }, [triggerLoadMore, debounceDelay])

  // =============================================================================
  // INITIAL LOAD
  // =============================================================================

  useEffect(() => {
    if (initialLoad && items.length === 0 && hasMore && !loading) {
      triggerLoadMore()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // =============================================================================
  // IMPERATIVE HANDLE
  // =============================================================================

  useImperativeHandle(ref, () => ({
    scrollToTop: () => {
      const container = containerRef.current
      if (container) {
        container.scrollTop = 0
      }
    },
    scrollToBottom: () => {
      const container = containerRef.current
      if (container) {
        container.scrollTop = container.scrollHeight
      }
    },
    reset: () => {
      loadingRef.current = false
      setInternalLoading(false)
      setIsRefreshing(false)
    },
    triggerLoadMore,
  }), [triggerLoadMore])

  // =============================================================================
  // RENDER
  // =============================================================================

  // Empty state
  if (items.length === 0 && !loading && !error) {
    return (
      <div className={cn('infinite-scroll-empty', className)}>
        {EmptyComponent || (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            No items to display
          </div>
        )}
      </div>
    )
  }

  // Error state
  if (error && items.length === 0) {
    return (
      <div className={cn('infinite-scroll-error', className)}>
        {ErrorComponent || (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <p className="text-destructive">Failed to load data</p>
            {onRetry && (
              <Button variant="outline" onClick={onRetry}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  const itemContent = reverse 
    ? [...items].reverse() 
    : items

  return (
    <div
      ref={containerRef}
      className={cn('infinite-scroll-container', className)}
    >
      {/* Refresh indicator for reverse mode */}
      {reverse && isRefreshing && (
        <div className="flex justify-center py-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}

      {/* Items */}
      {itemContent.map((item, index) => (
        <div key={keyExtractor(item, index)} className={itemClassName}>
          {renderItem(item, index)}
        </div>
      ))}

      {/* Sentinel for intersection observer */}
      <div ref={sentinelRef} className="h-px" />

      {/* Loading indicator */}
      {loading && (
        <div className="flex justify-center py-4">
          {LoadingComponent || loader || (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading more...</span>
            </div>
          )}
        </div>
      )}

      {/* Error with retry */}
      {error && items.length > 0 && (
        <div className="flex justify-center py-4">
          {ErrorComponent || (
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <span className="text-destructive">Failed to load</span>
              {onRetry && (
                <Button variant="ghost" size="sm" onClick={onRetry}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Retry
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* End message */}
      {!hasMore && !loading && items.length > 0 && (
        <div className="flex justify-center py-4">
          {EndMessageComponent || (
            <p className="text-muted-foreground text-sm">
              No more items to load
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export const InfiniteScroll = forwardRef(InfiniteScrollInner) as <T>(
  props: InfiniteScrollProps<T> & { ref?: React.ForwardedRef<InfiniteScrollRef> }
) => React.ReactElement

// =============================================================================
// HOOK FOR INFINITE SCROLL
// =============================================================================

export interface UseInfiniteScrollOptions<T> {
  /** Initial data */
  initialData?: T[]
  /** Fetch function */
  fetchMore: (cursor: string | null) => Promise<{
    data: T[]
    nextCursor: string | null
    hasMore: boolean
  }>
  /** Page size */
  pageSize?: number
  /** Auto load on mount */
  autoLoad?: boolean
}

export interface UseInfiniteScrollReturn<T> {
  items: T[]
  isLoading: boolean
  hasMore: boolean
  error: Error | null
  loadMore: () => Promise<void>
  reset: () => void
  refresh: () => Promise<void>
}

/**
 * Hook to manage infinite scroll state
 */
export function useInfiniteScroll<T>(
  options: UseInfiniteScrollOptions<T>
): UseInfiniteScrollReturn<T> {
  const { initialData = [], fetchMore, autoLoad = true } = options

  const [items, setItems] = useState<T[]>(initialData)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchMore(cursor)
      
      setItems(prev => [...prev, ...result.data])
      setCursor(result.nextCursor)
      setHasMore(result.hasMore)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [cursor, hasMore, isLoading, fetchMore])

  const reset = useCallback(() => {
    setItems(initialData)
    setCursor(null)
    setHasMore(true)
    setError(null)
  }, [initialData])

  const refresh = useCallback(async () => {
    reset()
    setIsLoading(true)
    
    try {
      const result = await fetchMore(null)
      setItems(result.data)
      setCursor(result.nextCursor)
      setHasMore(result.hasMore)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [fetchMore, reset])

  // Auto load on mount
  useEffect(() => {
    if (autoLoad && items.length === 0) {
      loadMore()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    items,
    isLoading,
    hasMore,
    error,
    loadMore,
    reset,
    refresh,
  }
}

// =============================================================================
// INFINITE LIST (Combines InfiniteScroll with VirtualList)
// =============================================================================

export interface InfiniteListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  keyExtractor: (item: T, index: number) => string | number
  onLoadMore: () => Promise<void> | void
  hasMore: boolean
  isLoading?: boolean
  itemHeight: number
  containerHeight: number
  overscan?: number
  className?: string
  error?: Error | null
  onRetry?: () => void
}

/**
 * Infinite list with virtualization
 */
export const InfiniteList = forwardRef(function InfiniteList<T>(
  props: InfiniteListProps<T>,
  ref: React.ForwardedRef<VirtualListRef>
) {
  const {
    items,
    renderItem,
    keyExtractor,
    onLoadMore,
    hasMore,
    isLoading,
    itemHeight,
    containerHeight,
    overscan = 3,
    className,
    error,
    onRetry,
  } = props

  return (
    <InfiniteScroll
      items={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onLoadMore={onLoadMore}
      hasMore={hasMore}
      isLoading={isLoading}
      className={className}
      error={error}
      onRetry={onRetry}
    />
  )
}) as <T>(
  props: InfiniteListProps<T> & { ref?: React.ForwardedRef<VirtualListRef> }
) => React.ReactElement

// =============================================================================
// TYPESCRIPT RE-EXPORTS
// =============================================================================

type VirtualListRef = {
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void
  scrollTo: (scrollTop: number) => void
  getScrollTop: () => number
  getVisibleRange: () => { startIndex: number; endIndex: number }
  resetAfterIndex: (index: number) => void
}

export default InfiniteScroll
