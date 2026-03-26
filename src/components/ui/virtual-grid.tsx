'use client'

/**
 * VIRTUAL GRID COMPONENT
 * ======================
 * High-performance grid rendering for card-based layouts
 * 
 * Features:
 * - Virtualized rendering (only visible cards in DOM)
 * - Responsive column count
 * - Variable card heights (masonry-style)
 * - Gap support
 * - Infinite scroll support
 * - Loading placeholders
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

export interface VirtualGridProps<T> {
  /** Data items to render */
  items: T[]
  /** Render function for each card */
  renderCard: (item: T, index: number) => React.ReactNode
  /** Key extractor for items */
  keyExtractor: (item: T, index: number) => string | number
  /** Container height */
  height: number | string
  /** Container width */
  width?: number | string
  /** Estimated card height */
  estimatedCardHeight?: number
  /** Card width (fixed) or min width for responsive */
  cardWidth?: number
  /** Minimum card width for responsive grid */
  minCardWidth?: number
  /** Gap between cards */
  gap?: number
  /** Number of columns (overrides responsive) */
  columns?: number
  /** Container class name */
  className?: string
  /** Inner container class name */
  innerClassName?: string
  /** Card wrapper class name */
  cardClassName?: string
  /** Scroll handler */
  onScroll?: (scrollTop: number) => void
  /** Callback when near end (for infinite scroll) */
  onEndReached?: () => void
  /** Threshold for end reached */
  endReachedThreshold?: number
  /** Loading state */
  isLoading?: boolean
  /** Loading skeleton component */
  LoadingComponent?: React.ReactNode
  /** Empty state */
  EmptyComponent?: React.ReactNode
  /** Number of placeholder cards to show while loading */
  placeholderCount?: number
}

export interface VirtualGridRef {
  scrollToRow: (rowIndex: number) => void
  scrollTo: (scrollTop: number) => void
  getScrollTop: () => number
  getColumnCount: () => number
  reset: () => void
}

interface GridLayout {
  columns: number
  cardWidth: number
  totalHeight: number
  rows: Array<{
    startIndex: number
    endIndex: number
    top: number
    height: number
  }>
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate grid layout based on container width
 */
function calculateGridLayout<T>(
  items: T[],
  containerWidth: number,
  cardWidth: number,
  gap: number,
  estimatedCardHeight: number
): GridLayout {
  const columns = Math.max(1, Math.floor((containerWidth + gap) / (cardWidth + gap)))
  const actualCardWidth = (containerWidth - (columns - 1) * gap) / columns
  
  const totalRows = Math.ceil(items.length / columns)
  const rows: GridLayout['rows'] = []
  
  let currentTop = 0
  for (let row = 0; row < totalRows; row++) {
    const startIndex = row * columns
    const endIndex = Math.min(startIndex + columns - 1, items.length - 1)
    
    rows.push({
      startIndex,
      endIndex,
      top: currentTop,
      height: estimatedCardHeight,
    })
    
    currentTop += estimatedCardHeight + gap
  }
  
  return {
    columns,
    cardWidth: actualCardWidth,
    totalHeight: currentTop - gap,
    rows,
  }
}

/**
 * Calculate responsive card width
 */
function calculateCardWidth(
  containerWidth: number,
  minCardWidth: number,
  gap: number
): number {
  const possibleColumns = Math.floor((containerWidth + gap) / (minCardWidth + gap))
  const columns = Math.max(1, possibleColumns)
  return (containerWidth - (columns - 1) * gap) / columns
}

// =============================================================================
// VIRTUAL GRID COMPONENT
// =============================================================================

function VirtualGridInner<T>(
  props: VirtualGridProps<T>,
  ref: React.ForwardedRef<VirtualGridRef>
) {
  const {
    items,
    renderCard,
    keyExtractor,
    height,
    width = '100%',
    estimatedCardHeight = 200,
    cardWidth: fixedCardWidth,
    minCardWidth = 280,
    gap = 16,
    columns: fixedColumns,
    className,
    innerClassName,
    cardClassName,
    onScroll,
    onEndReached,
    endReachedThreshold = 200,
    isLoading,
    LoadingComponent,
    EmptyComponent,
    placeholderCount = 6,
  } = props

  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const cardHeightsRef = useRef<Map<number, number>>(new Map())

  // State
  const [scrollTop, setScrollTop] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)
  const [measuredCardHeights, setMeasuredCardHeights] = useState<Map<number, number>>(new Map())

  // =============================================================================
  // CONTAINER WIDTH OBSERVATION
  // =============================================================================

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })

    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [])

  // =============================================================================
  // GRID LAYOUT CALCULATION
  // =============================================================================

  const gridLayout = useMemo(() => {
    if (containerWidth === 0) {
      return {
        columns: fixedColumns || 3,
        cardWidth: fixedCardWidth || minCardWidth,
        totalHeight: 0,
        rows: [],
      }
    }

    const actualCardWidth = fixedCardWidth 
      ? calculateCardWidth(containerWidth, fixedCardWidth, gap)
      : calculateCardWidth(containerWidth, minCardWidth, gap)

    const columns = fixedColumns || Math.max(1, Math.floor((containerWidth + gap) / (actualCardWidth + gap)))
    
    return calculateGridLayout(
      items,
      containerWidth,
      actualCardWidth,
      gap,
      estimatedCardHeight
    )
  }, [items, containerWidth, fixedCardWidth, minCardWidth, gap, fixedColumns, estimatedCardHeight])

  // =============================================================================
  // VISIBLE ROWS CALCULATION
  // =============================================================================

  const visibleRows = useMemo(() => {
    const containerHeight = typeof height === 'number' ? height : 600
    const buffer = estimatedCardHeight + gap // One row buffer
    
    return gridLayout.rows.filter(row => {
      const rowBottom = row.top + row.height
      return rowBottom >= scrollTop - buffer && row.top <= scrollTop + containerHeight + buffer
    })
  }, [gridLayout.rows, scrollTop, height, estimatedCardHeight, gap])

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
    
    if (onEndReached && gridLayout.totalHeight - scrollBottom < endReachedThreshold) {
      onEndReached()
    }
  }, [onScroll, onEndReached, gridLayout.totalHeight, endReachedThreshold])

  // =============================================================================
  // CARD HEIGHT MEASUREMENT
  // =============================================================================

  const handleCardMeasure = useCallback((index: number, height: number) => {
    cardHeightsRef.current.set(index, height)
  }, [])

  // =============================================================================
  // IMPERATIVE HANDLE
  // =============================================================================

  useImperativeHandle(ref, () => ({
    scrollToRow: (rowIndex: number) => {
      if (!containerRef.current) return
      const row = gridLayout.rows[rowIndex]
      if (row) {
        containerRef.current.scrollTop = row.top
      }
    },
    scrollTo: (scrollValue: number) => {
      if (containerRef.current) {
        containerRef.current.scrollTop = scrollValue
      }
    },
    getScrollTop: () => scrollTop,
    getColumnCount: () => gridLayout.columns,
    reset: () => {
      cardHeightsRef.current.clear()
      setScrollTop(0)
    },
  }), [scrollTop, gridLayout])

  // =============================================================================
  // RENDER
  // =============================================================================

  // Empty state
  if (items.length === 0 && !isLoading) {
    return (
      <div 
        className={cn('relative overflow-auto', className)}
        style={{ height, width }}
      >
        {EmptyComponent || (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No items to display
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      style={{ height, width }}
      onScroll={handleScroll}
    >
      <div
        className={cn('relative', innerClassName)}
        style={{ 
          height: gridLayout.totalHeight + gap,
          minHeight: '100%',
        }}
      >
        {/* Render visible rows */}
        {visibleRows.map((row) => {
          const rowItems = []
          for (let i = row.startIndex; i <= row.endIndex; i++) {
            const item = items[i]
            if (!item) continue
            
            const column = i % gridLayout.columns
            const left = column * (gridLayout.cardWidth + gap)
            
            rowItems.push(
              <div
                key={keyExtractor(item, i)}
                className={cn('absolute', cardClassName)}
                style={{
                  left,
                  top: row.top,
                  width: gridLayout.cardWidth,
                }}
              >
                {renderCard(item, i)}
              </div>
            )
          }
          return rowItems
        })}
        
        {/* Loading placeholders */}
        {isLoading && LoadingComponent && (
          <div 
            className="absolute left-0 right-0 flex justify-center gap-4 py-4"
            style={{ top: gridLayout.totalHeight + gap }}
          >
            {LoadingComponent}
          </div>
        )}
      </div>
    </div>
  )
}

export const VirtualGrid = memo(
  forwardRef(VirtualGridInner)
) as <T>(
  props: VirtualGridProps<T> & { ref?: React.ForwardedRef<VirtualGridRef> }
) => React.ReactElement

// =============================================================================
// SIMPLIFIED VIRTUAL GRID (Fixed Height Cards)
// =============================================================================

export interface SimpleVirtualGridProps<T> {
  items: T[]
  renderCard: (item: T, index: number) => React.ReactNode
  keyExtractor: (item: T, index: number) => string | number
  containerHeight: number
  cardHeight: number
  cardWidth?: number
  minCardWidth?: number
  gap?: number
  columns?: number
  className?: string
  onEndReached?: () => void
  endReachedThreshold?: number
}

/**
 * Simplified virtual grid for fixed-height cards
 */
export function SimpleVirtualGrid<T>({
  items,
  renderCard,
  keyExtractor,
  containerHeight,
  cardHeight,
  cardWidth = 280,
  gap = 16,
  columns: fixedColumns,
  className,
  onEndReached,
  endReachedThreshold = 200,
}: SimpleVirtualGridProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Observe container width
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })

    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [])

  // Calculate columns
  const columns = useMemo(() => {
    if (fixedColumns) return fixedColumns
    return Math.max(1, Math.floor((containerWidth + gap) / (cardWidth + gap)))
  }, [fixedColumns, containerWidth, cardWidth, gap])

  // Calculate actual card width
  const actualCardWidth = useMemo(() => {
    return (containerWidth - (columns - 1) * gap) / columns
  }, [containerWidth, columns, gap])

  // Calculate rows
  const totalRows = Math.ceil(items.length / columns)
  const rowHeight = cardHeight + gap
  const totalHeight = totalRows * rowHeight - gap

  // Calculate visible rows
  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - 1)
  const endRow = Math.min(totalRows - 1, Math.ceil((scrollTop + containerHeight) / rowHeight) + 1)

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
    
    if (onEndReached) {
      const scrollBottom = e.currentTarget.scrollTop + containerHeight
      if (totalHeight - scrollBottom < endReachedThreshold) {
        onEndReached()
      }
    }
  }, [containerHeight, totalHeight, onEndReached, endReachedThreshold])

  // Render visible cards
  const visibleCards = useMemo(() => {
    const cards = []
    
    for (let row = startRow; row <= endRow; row++) {
      for (let col = 0; col < columns; col++) {
        const index = row * columns + col
        if (index >= items.length) break
        
        const item = items[index]
        cards.push(
          <div
            key={keyExtractor(item, index)}
            className="absolute"
            style={{
              left: col * (actualCardWidth + gap),
              top: row * rowHeight,
              width: actualCardWidth,
              height: cardHeight,
            }}
          >
            {renderCard(item, index)}
          </div>
        )
      }
    }
    
    return cards
  }, [items, columns, startRow, endRow, actualCardWidth, cardHeight, rowHeight, gap, keyExtractor, renderCard])

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div
        className="relative"
        style={{ height: totalHeight }}
      >
        {visibleCards}
      </div>
    </div>
  )
}

// =============================================================================
// MASONRY GRID (Variable Height Cards)
// =============================================================================

export interface MasonryGridProps<T> {
  items: T[]
  renderCard: (item: T, index: number) => React.ReactNode
  keyExtractor: (item: T, index: number) => string | number
  containerHeight: number | string
  columns?: number
  gap?: number
  className?: string
  onEndReached?: () => void
}

/**
 * Masonry-style grid with variable height cards
 * Distributes cards to minimize column height differences
 */
export function MasonryGrid<T>({
  items,
  renderCard,
  keyExtractor,
  containerHeight,
  columns = 3,
  gap = 16,
  className,
  onEndReached,
}: MasonryGridProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)
  const [columnHeights, setColumnHeights] = useState<number[]>(Array(columns).fill(0))
  const containerRef = useRef<HTMLDivElement>(null)
  const columnRefs = useRef<Array<HTMLDivElement | null>>([])

  // Observe container width
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })

    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [])

  // Calculate column width
  const columnWidth = useMemo(() => {
    return (containerWidth - (columns - 1) * gap) / columns
  }, [containerWidth, columns, gap])

  // Distribute items to columns
  const columnItems = useMemo(() => {
    const cols: Array<Array<{ item: T; index: number }>> = Array.from(
      { length: columns }, 
      () => []
    )
    const heights = Array(columns).fill(0)
    
    items.forEach((item, index) => {
      // Find shortest column
      const minHeightIndex = heights.indexOf(Math.min(...heights))
      cols[minHeightIndex].push({ item, index })
      // Estimate height (will be adjusted after render)
      heights[minHeightIndex] += 200 // Estimated height
    })
    
    setColumnHeights([...heights])
    return cols
  }, [items, columns])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
    
    if (onEndReached) {
      const maxColumnHeight = Math.max(...columnHeights)
      const containerH = typeof containerHeight === 'number' 
        ? containerHeight 
        : e.currentTarget.clientHeight
      const scrollBottom = e.currentTarget.scrollTop + containerH
      
      if (maxColumnHeight - scrollBottom < 200) {
        onEndReached()
      }
    }
  }, [containerHeight, columnHeights, onEndReached])

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div
        className="flex"
        style={{ gap }}
      >
        {columnItems.map((col, colIndex) => (
          <div
            key={colIndex}
            ref={el => { columnRefs.current[colIndex] = el }}
            className="flex flex-col"
            style={{ 
              width: columnWidth,
              gap,
            }}
          >
            {col.map(({ item, index }) => (
              <div key={keyExtractor(item, index)}>
                {renderCard(item, index)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// CARD PLACEHOLDER SKELETON
// =============================================================================

export interface CardPlaceholderProps {
  width?: number | string
  height?: number | string
  className?: string
}

export function CardPlaceholder({ 
  width = '100%', 
  height = 200,
  className 
}: CardPlaceholderProps) {
  return (
    <div 
      className={cn(
        'rounded-lg border bg-muted animate-pulse',
        className
      )}
      style={{ width, height }}
    >
      <div className="p-4 space-y-3">
        <div className="h-4 bg-muted-foreground/20 rounded w-3/4" />
        <div className="h-3 bg-muted-foreground/20 rounded w-1/2" />
        <div className="space-y-2 mt-4">
          <div className="h-3 bg-muted-foreground/20 rounded" />
          <div className="h-3 bg-muted-foreground/20 rounded w-5/6" />
          <div className="h-3 bg-muted-foreground/20 rounded w-4/6" />
        </div>
      </div>
    </div>
  )
}

/**
 * Generate multiple card placeholders
 */
export function CardPlaceholders({ 
  count, 
  width, 
  height,
  className 
}: { count: number } & CardPlaceholderProps) {
  return (
    <div className="flex flex-wrap gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardPlaceholder key={i} width={width} height={height} className={className} />
      ))}
    </div>
  )
}

export default VirtualGrid
