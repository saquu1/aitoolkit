'use client'

/**
 * VIRTUAL LIST COMPONENT
 * ======================
 * High-performance list rendering for large datasets
 * 
 * Features:
 * - Only renders visible items (virtualization)
 * - Variable height support with measurements
 * - Smooth scrolling with overscan buffer
 * - Keyboard navigation support
 * - Accessibility compliant
 * - Memory efficient - handles 100k+ items
 */

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  memo,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { cn } from '@/lib/utils'

// =============================================================================
// TYPES
// =============================================================================

export interface VirtualListProps<T> {
  /** Data items to render */
  items: T[]
  /** Estimated item height for initial layout */
  estimatedItemHeight: number
  /** Render function for each item */
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode
  /** Key extractor for items */
  keyExtractor: (item: T, index: number) => string | number
  /** Container height in pixels */
  height: number | string
  /** Container width */
  width?: number | string
  /** Number of items to render outside viewport (buffer) */
  overscan?: number
  /** Gap between items */
  gap?: number
  /** Container class name */
  className?: string
  /** Inner container class name */
  innerClassName?: string
  /** Item class name */
  itemClassName?: string
  /** Callback when scroll position changes */
  onScroll?: (scrollTop: number) => void
  /** Callback when visible range changes */
  onVisibleRangeChange?: (startIndex: number, endIndex: number) => void
  /** Callback when user scrolls near the end (for infinite scroll) */
  onEndReached?: () => void
  /** Threshold for end reached callback (in pixels from bottom) */
  endReachedThreshold?: number
  /** Loading indicator for end of list */
  ListFooterComponent?: React.ReactNode
  /** Empty state component */
  ListEmptyComponent?: React.ReactNode
  /** Whether list is loading */
  isLoading?: boolean
  /** Custom scroll handler */
  onItemsRendered?: (info: { visibleStartIndex: number; visibleStopIndex: number }) => void
  /** Sticky header component */
  StickyHeaderComponent?: React.ReactNode
  /** Sticky header height */
  stickyHeaderHeight?: number
  /** Enable keyboard navigation */
  enableKeyboardNavigation?: boolean
  /** Currently focused index */
  focusedIndex?: number
  /** Callback when focused index changes */
  onFocusedIndexChange?: (index: number) => void
}

export interface VirtualListRef {
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void
  scrollTo: (scrollTop: number) => void
  getScrollTop: () => number
  getVisibleRange: () => { startIndex: number; endIndex: number }
  resetAfterIndex: (index: number) => void
}

interface ItemMeasurements {
  height: number
  offset: number
}

// =============================================================================
// VIRTUAL LIST COMPONENT
// =============================================================================

function VirtualListInner<T>(
  props: VirtualListProps<T>,
  ref: React.ForwardedRef<VirtualListRef>
) {
  const {
    items,
    estimatedItemHeight,
    renderItem,
    keyExtractor,
    height,
    width = '100%',
    overscan = 3,
    gap = 0,
    className,
    innerClassName,
    itemClassName,
    onScroll,
    onVisibleRangeChange,
    onEndReached,
    endReachedThreshold = 100,
    ListFooterComponent,
    ListEmptyComponent,
    isLoading,
    onItemsRendered,
    StickyHeaderComponent,
    stickyHeaderHeight = 0,
    enableKeyboardNavigation = false,
    focusedIndex: controlledFocusedIndex,
    onFocusedIndexChange,
  } = props

  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const measurementsRef = useRef<Map<number, ItemMeasurements>>(new Map())
  const resizeObserverRef = useRef<ResizeObserver | null>(null)

  // State
  const [scrollTop, setScrollTop] = useState(0)
  const [internalFocusedIndex, setInternalFocusedIndex] = useState(0)
  
  // Use controlled or internal focused index
  const focusedIndex = controlledFocusedIndex ?? internalFocusedIndex

  // =============================================================================
  // MEASUREMENTS
  // =============================================================================

  /**
   * Get or estimate item height
   */
  const getItemHeight = useCallback((index: number): number => {
    const measured = measurementsRef.current.get(index)
    if (measured) return measured.height
    return estimatedItemHeight
  }, [estimatedItemHeight])

  /**
   * Calculate item offset from top
   */
  const getItemOffset = useCallback((index: number): number => {
    let offset = stickyHeaderHeight
    for (let i = 0; i < index; i++) {
      offset += getItemHeight(i) + gap
    }
    return offset
  }, [getItemHeight, gap, stickyHeaderHeight])

  /**
   * Calculate total content height
   */
  const totalHeight = useMemo(() => {
    let total = stickyHeaderHeight
    for (let i = 0; i < items.length; i++) {
      total += getItemHeight(i) + gap
    }
    return total
  }, [items.length, getItemHeight, gap, stickyHeaderHeight])

  // =============================================================================
  // VISIBLE RANGE CALCULATION
  // =============================================================================

  const visibleRange = useMemo(() => {
    if (!containerRef.current) {
      return { startIndex: 0, endIndex: Math.min(overscan * 2, items.length - 1) }
    }

    const containerHeight = typeof height === 'number' 
      ? height 
      : containerRef.current.clientHeight || 500

    // Find start index
    let startIndex = 0
    let currentOffset = stickyHeaderHeight
    
    while (startIndex < items.length && currentOffset < scrollTop - overscan * (estimatedItemHeight + gap)) {
      currentOffset += getItemHeight(startIndex) + gap
      startIndex++
    }
    
    startIndex = Math.max(0, startIndex - overscan)

    // Find end index
    let endIndex = startIndex
    currentOffset = getItemOffset(startIndex)
    
    while (endIndex < items.length && currentOffset < scrollTop + containerHeight + overscan * (estimatedItemHeight + gap)) {
      currentOffset += getItemHeight(endIndex) + gap
      endIndex++
    }
    
    endIndex = Math.min(items.length - 1, endIndex + overscan)

    return { startIndex, endIndex }
  }, [scrollTop, items.length, height, overscan, estimatedItemHeight, gap, getItemHeight, getItemOffset, stickyHeaderHeight])

  // =============================================================================
  // SCROLL HANDLING
  // =============================================================================

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop
    setScrollTop(newScrollTop)
    onScroll?.(newScrollTop)

    // Check for end reached
    const containerHeight = e.currentTarget.clientHeight
    const scrollBottom = newScrollTop + containerHeight
    
    if (onEndReached && totalHeight - scrollBottom < endReachedThreshold) {
      onEndReached()
    }
  }, [onScroll, onEndReached, totalHeight, endReachedThreshold])

  // =============================================================================
  // ITEM MEASUREMENT
  // =============================================================================

  useEffect(() => {
    if (!innerRef.current) return

    resizeObserverRef.current = new ResizeObserver((entries) => {
      let needsRecalculation = false

      for (const entry of entries) {
        const index = parseInt(entry.target.getAttribute('data-index') || '-1', 10)
        if (index >= 0) {
          const currentHeight = getItemHeight(index)
          if (Math.abs(entry.contentRect.height - currentHeight) > 1) {
            measurementsRef.current.set(index, {
              height: entry.contentRect.height,
              offset: getItemOffset(index),
            })
            needsRecalculation = true
          }
        }
      }

      if (needsRecalculation) {
        // Force re-render to update positions
        setScrollTop(prev => prev)
      }
    })

    return () => {
      resizeObserverRef.current?.disconnect()
    }
  }, [getItemHeight, getItemOffset])

  // =============================================================================
  // VISIBLE RANGE CHANGE CALLBACK
  // =============================================================================

  useEffect(() => {
    onVisibleRangeChange?.(visibleRange.startIndex, visibleRange.endIndex)
    onItemsRendered?.({
      visibleStartIndex: visibleRange.startIndex,
      visibleStopIndex: visibleRange.endIndex,
    })
  }, [visibleRange, onVisibleRangeChange, onItemsRendered])

  // =============================================================================
  // KEYBOARD NAVIGATION
  // =============================================================================

  useEffect(() => {
    if (!enableKeyboardNavigation) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          const nextIndex = Math.min(focusedIndex + 1, items.length - 1)
          setInternalFocusedIndex(nextIndex)
          onFocusedIndexChange?.(nextIndex)
          break
        case 'ArrowUp':
          e.preventDefault()
          const prevIndex = Math.max(focusedIndex - 1, 0)
          setInternalFocusedIndex(prevIndex)
          onFocusedIndexChange?.(prevIndex)
          break
        case 'PageDown':
          e.preventDefault()
          const pageDownIndex = Math.min(focusedIndex + 10, items.length - 1)
          setInternalFocusedIndex(pageDownIndex)
          onFocusedIndexChange?.(pageDownIndex)
          break
        case 'PageUp':
          e.preventDefault()
          const pageUpIndex = Math.max(focusedIndex - 10, 0)
          setInternalFocusedIndex(pageUpIndex)
          onFocusedIndexChange?.(pageUpIndex)
          break
        case 'Home':
          e.preventDefault()
          setInternalFocusedIndex(0)
          onFocusedIndexChange?.(0)
          break
        case 'End':
          e.preventDefault()
          setInternalFocusedIndex(items.length - 1)
          onFocusedIndexChange?.(items.length - 1)
          break
      }
    }

    const container = containerRef.current
    container?.addEventListener('keydown', handleKeyDown)
    return () => container?.removeEventListener('keydown', handleKeyDown)
  }, [enableKeyboardNavigation, focusedIndex, items.length, onFocusedIndexChange])

  // =============================================================================
  // IMPERATIVE HANDLE
  // =============================================================================

  useImperativeHandle(ref, () => ({
    scrollToIndex: (index: number, align: 'start' | 'center' | 'end' = 'start') => {
      if (!containerRef.current) return
      
      const containerHeight = containerRef.current.clientHeight
      const itemOffset = getItemOffset(index)
      const itemHeight = getItemHeight(index)
      
      let scrollTop: number
      
      switch (align) {
        case 'center':
          scrollTop = itemOffset - (containerHeight - itemHeight) / 2
          break
        case 'end':
          scrollTop = itemOffset - containerHeight + itemHeight
          break
        case 'start':
        default:
          scrollTop = itemOffset
      }
      
      containerRef.current.scrollTop = Math.max(0, scrollTop)
    },
    scrollTo: (scrollValue: number) => {
      if (containerRef.current) {
        containerRef.current.scrollTop = scrollValue
      }
    },
    getScrollTop: () => scrollTop,
    getVisibleRange: () => ({ startIndex: visibleRange.startIndex, endIndex: visibleRange.endIndex }),
    resetAfterIndex: (index: number) => {
      // Clear measurements from index onwards
      const keys = Array.from(measurementsRef.current.keys())
      for (const key of keys) {
        if (key >= index) {
          measurementsRef.current.delete(key)
        }
      }
      setScrollTop(prev => prev) // Trigger re-render
    },
  }), [scrollTop, visibleRange, getItemOffset, getItemHeight])

  // =============================================================================
  // RENDER
  // =============================================================================

  if (items.length === 0 && !isLoading) {
    return (
      <div 
        className={cn('relative overflow-auto', className)}
        style={{ height, width }}
      >
        {ListEmptyComponent}
      </div>
    )
  }

  const visibleItems = []
  for (let i = visibleRange.startIndex; i <= visibleRange.endIndex && i < items.length; i++) {
    const item = items[i]
    const style: React.CSSProperties = {
      position: 'absolute',
      top: getItemOffset(i),
      left: 0,
      right: 0,
      height: getItemHeight(i),
    }
    
    visibleItems.push(
      <div
        key={keyExtractor(item, i)}
        data-index={i}
        className={cn(
          itemClassName,
          enableKeyboardNavigation && focusedIndex === i && 'ring-2 ring-primary ring-offset-2'
        )}
        style={style}
        tabIndex={enableKeyboardNavigation ? (focusedIndex === i ? 0 : -1) : undefined}
      >
        {renderItem(item, i, style)}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      style={{ height, width }}
      onScroll={handleScroll}
      tabIndex={enableKeyboardNavigation ? 0 : undefined}
      role={enableKeyboardNavigation ? 'listbox' : undefined}
      aria-label={enableKeyboardNavigation ? 'Virtual list' : undefined}
    >
      {/* Sticky Header */}
      {StickyHeaderComponent && (
        <div 
          className="sticky top-0 z-10"
          style={{ height: stickyHeaderHeight || 'auto' }}
        >
          {StickyHeaderComponent}
        </div>
      )}
      
      {/* Inner container with total height */}
      <div
        ref={innerRef}
        className={cn('relative', innerClassName)}
        style={{ height: totalHeight }}
        role={enableKeyboardNavigation ? 'listbox' : undefined}
      >
        {visibleItems}
      </div>
      
      {/* Loading Footer */}
      {isLoading && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      )}
      
      {/* Custom Footer */}
      {ListFooterComponent && (
        <div className="mt-auto">
          {ListFooterComponent}
        </div>
      )}
    </div>
  )
}

// Export with memo and forwardRef
export const VirtualList = memo(
  forwardRef(VirtualListInner)
) as <T>(
  props: VirtualListProps<T> & { ref?: React.ForwardedRef<VirtualListRef> }
) => React.ReactElement

// =============================================================================
// SIMPLIFIED VIRTUAL LIST (Fixed Height Items)
// =============================================================================

export interface SimpleVirtualListProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  keyExtractor: (item: T, index: number) => string | number
  className?: string
  overscan?: number
  onEndReached?: () => void
  endReachedThreshold?: number
}

/**
 * Simplified virtual list for fixed-height items
 * More performant when all items have the same height
 */
export function SimpleVirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  keyExtractor,
  className,
  overscan = 3,
  onEndReached,
  endReachedThreshold = 100,
}: SimpleVirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  )

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
    
    if (onEndReached) {
      const scrollBottom = e.currentTarget.scrollTop + containerHeight
      const totalHeight = items.length * itemHeight
      if (totalHeight - scrollBottom < endReachedThreshold) {
        onEndReached()
      }
    }
  }, [containerHeight, items.length, itemHeight, onEndReached, endReachedThreshold])

  const visibleItems = useMemo(() => {
    const result = []
    for (let i = startIndex; i <= endIndex && i < items.length; i++) {
      result.push(
        <div
          key={keyExtractor(items[i], i)}
          style={{
            position: 'absolute',
            top: i * itemHeight,
            height: itemHeight,
            left: 0,
            right: 0,
          }}
        >
          {renderItem(items[i], i)}
        </div>
      )
    }
    return result
  }, [items, startIndex, endIndex, itemHeight, keyExtractor, renderItem])

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div
        className="relative"
        style={{ height: items.length * itemHeight }}
      >
        {visibleItems}
      </div>
    </div>
  )
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to manage virtual list state
 */
export function useVirtualList<T>(options: {
  items: T[]
  itemHeight: number
  containerHeight: number
  overscan?: number
}) {
  const { items, itemHeight, containerHeight, overscan = 3 } = options
  const [scrollTop, setScrollTop] = useState(0)

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  )

  const totalHeight = items.length * itemHeight

  const scrollToIndex = useCallback((index: number) => {
    setScrollTop(index * itemHeight)
  }, [itemHeight])

  const scrollTo = useCallback((offset: number) => {
    setScrollTop(Math.max(0, Math.min(offset, totalHeight - containerHeight)))
  }, [totalHeight, containerHeight])

  return {
    scrollTop,
    setScrollTop,
    startIndex,
    endIndex,
    totalHeight,
    scrollToIndex,
    scrollTo,
    visibleItems: items.slice(startIndex, endIndex + 1),
  }
}

export default VirtualList
