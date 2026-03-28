/**
 * USE PAGINATION HOOK
 * ===================
 * Reusable pagination hook for list endpoints
 * Reduces memory by loading data in chunks
 */

import { useState, useCallback, useMemo } from 'react'

export interface PaginationState {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasMore: boolean
}

export interface UsePaginationOptions {
  initialPage?: number
  pageSize?: number
  total?: number
}

export interface UsePaginationReturn {
  // State
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasMore: boolean
  hasNext: boolean
  hasPrev: boolean
  
  // Navigation
  nextPage: () => void
  prevPage: () => void
  goToPage: (page: number) => void
  setPageSize: (size: number) => void
  setTotal: (total: number) => void
  
  // Helpers
  offset: number
  getPageParams: () => { page: number; pageSize: number; offset: number; limit: number }
  
  // UI helpers
  pageNumbers: number[]
  isFirstPage: boolean
  isLastPage: boolean
}

export function usePagination(options: UsePaginationOptions = {}): UsePaginationReturn {
  const {
    initialPage = 1,
    pageSize = 10,
    total: initialTotal = 0
  } = options

  const [page, setPage] = useState(initialPage)
  const [pageSizeState, setPageSizeState] = useState(pageSize)
  const [total, setTotalState] = useState(initialTotal)

  const totalPages = useMemo(() => 
    Math.ceil(total / pageSizeState), 
    [total, pageSizeState]
  )

  const hasMore = useMemo(() => 
    page < totalPages, 
    [page, totalPages]
  )

  const hasNext = page < totalPages
  const hasPrev = page > 1
  const isFirstPage = page === 1
  const isLastPage = page === totalPages || totalPages === 0

  const offset = useMemo(() => 
    (page - 1) * pageSizeState, 
    [page, pageSizeState]
  )

  const nextPage = useCallback(() => {
    if (hasNext) {
      setPage(p => p + 1)
    }
  }, [hasNext])

  const prevPage = useCallback(() => {
    if (hasPrev) {
      setPage(p => p - 1)
    }
  }, [hasPrev])

  const goToPage = useCallback((newPage: number) => {
    const clampedPage = Math.max(1, Math.min(newPage, totalPages || 1))
    setPage(clampedPage)
  }, [totalPages])

  const setPageSize = useCallback((newSize: number) => {
    setPageSizeState(newSize)
    setPage(1) // Reset to first page when changing page size
  }, [])

  const setTotal = useCallback((newTotal: number) => {
    setTotalState(newTotal)
  }, [])

  const getPageParams = useCallback(() => ({
    page,
    pageSize: pageSizeState,
    offset,
    limit: pageSizeState
  }), [page, pageSizeState, offset])

  // Generate page numbers for UI
  const pageNumbers = useMemo(() => {
    const pages: number[] = []
    const maxVisible = 5
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)
      
      // Calculate range around current page
      let start = Math.max(2, page - 1)
      let end = Math.min(totalPages - 1, page + 1)
      
      if (page <= 2) {
        end = Math.min(totalPages - 1, 4)
      }
      if (page >= totalPages - 1) {
        start = Math.max(2, totalPages - 3)
      }
      
      if (start > 2) {
        pages.push(-1) // Ellipsis
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      if (end < totalPages - 1) {
        pages.push(-1) // Ellipsis
      }
      
      // Always show last page
      pages.push(totalPages)
    }
    
    return pages
  }, [page, totalPages])

  return {
    page,
    pageSize: pageSizeState,
    total,
    totalPages,
    hasMore,
    hasNext,
    hasPrev,
    nextPage,
    prevPage,
    goToPage,
    setPageSize,
    setTotal,
    offset,
    getPageParams,
    pageNumbers,
    isFirstPage,
    isLastPage
  }
}

export default usePagination
