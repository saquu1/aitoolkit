/**
 * PROGRESSIVE LOADING - PAGINATION INFRASTRUCTURE
 * ===============================================
 * Core pagination utilities for memory-efficient data loading
 * 
 * Features:
 * - Cursor-based pagination (optimal for large datasets)
 * - Offset-based pagination (traditional)
 * - Page-based navigation helpers
 * - Memory-safe query builders
 */

import type { Prisma } from '@prisma/client'

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

/**
 * Cursor-based pagination parameters
 * Used for infinite scroll and large datasets
 */
export interface CursorPaginationParams {
  cursor?: string | null
  limit: number
  direction?: 'forward' | 'backward'
}

/**
 * Offset-based pagination parameters
 * Used for traditional page navigation
 */
export interface OffsetPaginationParams {
  page: number
  pageSize: number
}

/**
 * Generic paginated result
 */
export interface PaginatedResult<T> {
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
}

/**
 * Cursor-based result (lighter weight)
 */
export interface CursorResult<T> {
  data: T[]
  nextCursor: string | null
  hasMore: boolean
}

/**
 * Pagination metadata for UI
 */
export interface PaginationMeta {
  currentPage: number
  totalPages: number
  pageSize: number
  totalCount: number
  hasPrevious: boolean
  hasNext: boolean
  startItem: number
  endItem: number
}

/**
 * Sorting options
 */
export interface SortOptions {
  field: string
  direction: 'asc' | 'desc'
}

/**
 * Filter options for queries
 */
export interface FilterOptions {
  field: string
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'in'
  value: unknown
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

export const PAGINATION_DEFAULTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_CURSOR_LIMIT: 20,
  MAX_CURSOR_LIMIT: 100,
  MIN_PAGE_SIZE: 5,
} as const

// =============================================================================
// CURSOR PAGINATION HELPERS
// =============================================================================

/**
 * Create cursor from record ID
 */
export function createCursor(id: string): string {
  return Buffer.from(id).toString('base64url')
}

/**
 * Decode cursor to record ID
 */
export function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, 'base64url').toString('utf-8')
}

/**
 * Build cursor-based pagination query for Prisma
 */
export function buildCursorQuery<T extends { id: string }>(
  params: CursorPaginationParams,
  sortField: string = 'createdAt',
  sortDirection: 'asc' | 'desc' = 'desc'
): {
  query: Prisma.Args<T, 'findMany'>['where'] & {
    take: number
    skip: number
    cursor?: { id: string }
    orderBy: Record<string, 'asc' | 'desc'>
  }
  hasPrevious: boolean
} {
  const { cursor, limit, direction = 'forward' } = params
  const safeLimit = Math.min(Math.max(1, limit), PAGINATION_DEFAULTS.MAX_CURSOR_LIMIT)
  
  const query: any = {
    take: direction === 'forward' ? safeLimit : -safeLimit,
    skip: cursor ? 1 : 0,
    orderBy: { [sortField]: sortDirection },
  }
  
  if (cursor) {
    query.cursor = { id: decodeCursor(cursor) }
  }
  
  return {
    query,
    hasPrevious: !!cursor,
  }
}

/**
 * Process results from cursor-based query
 */
export function processCursorResults<T extends { id: string }>(
  results: T[],
  limit: number,
  direction: 'forward' | 'backward' = 'forward'
): CursorResult<T> {
  const hasMore = results.length > limit
  
  // Remove extra item used for hasMore detection
  const data = hasMore ? results.slice(0, -1) : results
  
  // Reverse if paginating backward
  const finalData = direction === 'backward' ? data.reverse() : data
  
  const nextCursor = hasMore && finalData.length > 0
    ? createCursor(finalData[finalData.length - 1].id)
    : null
  
  return {
    data: finalData,
    nextCursor,
    hasMore,
  }
}

// =============================================================================
// OFFSET PAGINATION HELPERS
// =============================================================================

/**
 * Calculate offset from page number
 */
export function calculateOffset(page: number, pageSize: number): number {
  return Math.max(0, (page - 1) * pageSize)
}

/**
 * Build offset-based pagination query for Prisma
 */
export function buildOffsetQuery(
  params: OffsetPaginationParams,
  sortOptions?: SortOptions
): {
  skip: number
  take: number
  orderBy?: Record<string, 'asc' | 'desc'>
} {
  const { page, pageSize } = params
  const safePageSize = Math.min(
    Math.max(PAGINATION_DEFAULTS.MIN_PAGE_SIZE, pageSize),
    PAGINATION_DEFAULTS.MAX_PAGE_SIZE
  )
  const safePage = Math.max(1, page)
  
  return {
    skip: calculateOffset(safePage, safePageSize),
    take: safePageSize,
    orderBy: sortOptions ? { [sortOptions.field]: sortOptions.direction } : undefined,
  }
}

/**
 * Build pagination metadata from results
 */
export function buildPaginationMeta(
  totalCount: number,
  page: number,
  pageSize: number
): PaginationMeta {
  const totalPages = Math.ceil(totalCount / pageSize)
  const safePage = Math.min(Math.max(1, page), totalPages || 1)
  const safePageSize = Math.max(1, pageSize)
  
  return {
    currentPage: safePage,
    totalPages,
    pageSize: safePageSize,
    totalCount,
    hasPrevious: safePage > 1,
    hasNext: safePage < totalPages,
    startItem: totalCount === 0 ? 0 : (safePage - 1) * safePageSize + 1,
    endItem: Math.min(safePage * safePageSize, totalCount),
  }
}

// =============================================================================
// UNIFIED PAGINATION BUILDER
// =============================================================================

export type PaginationMode = 'cursor' | 'offset'

export interface PaginationConfig {
  mode: PaginationMode
  cursor?: string | null
  page?: number
  pageSize?: number
  limit?: number
  sortField?: string
  sortDirection?: 'asc' | 'desc'
}

/**
 * Build pagination query based on mode
 */
export function buildPaginationQuery(config: PaginationConfig): {
  query: {
    skip?: number
    take: number
    cursor?: { id: string }
    orderBy?: Record<string, 'asc' | 'desc'>
  }
  meta: {
    mode: PaginationMode
    pageSize: number
    page?: number
    cursor?: string | null
  }
} {
  const {
    mode,
    cursor,
    page = 1,
    pageSize = PAGINATION_DEFAULTS.DEFAULT_PAGE_SIZE,
    limit = PAGINATION_DEFAULTS.DEFAULT_CURSOR_LIMIT,
    sortField = 'createdAt',
    sortDirection = 'desc',
  } = config
  
  if (mode === 'cursor') {
    const { query } = buildCursorQuery(
      { cursor, limit, direction: 'forward' },
      sortField,
      sortDirection
    )
    
    return {
      query,
      meta: {
        mode: 'cursor',
        pageSize: limit,
        cursor,
      },
    }
  }
  
  // Offset mode
  const offsetQuery = buildOffsetQuery(
    { page, pageSize },
    { field: sortField, direction: sortDirection }
  )
  
  return {
    query: offsetQuery,
    meta: {
      mode: 'offset',
      pageSize,
      page,
    },
  }
}

// =============================================================================
// FILTER BUILDERS
// =============================================================================

/**
 * Convert filter options to Prisma where clause
 */
export function buildWhereClause(filters: FilterOptions[]): Record<string, unknown> {
  const where: Record<string, unknown> = {}
  
  for (const filter of filters) {
    const { field, operator, value } = filter
    
    switch (operator) {
      case 'eq':
        where[field] = value
        break
      case 'neq':
        where[field] = { not: value }
        break
      case 'gt':
        where[field] = { gt: value }
        break
      case 'gte':
        where[field] = { gte: value }
        break
      case 'lt':
        where[field] = { lt: value }
        break
      case 'lte':
        where[field] = { lte: value }
        break
      case 'contains':
        where[field] = { contains: value as string, mode: 'insensitive' }
        break
      case 'startsWith':
        where[field] = { startsWith: value as string, mode: 'insensitive' }
        break
      case 'endsWith':
        where[field] = { endsWith: value as string, mode: 'insensitive' }
        break
      case 'in':
        where[field] = { in: value as unknown[] }
        break
    }
  }
  
  return where
}

// =============================================================================
// SEARCH HELPERS
// =============================================================================

/**
 * Build search query for text fields
 */
export function buildSearchQuery(
  searchFields: string[],
  searchTerm: string
): Record<string, unknown> {
  if (!searchTerm || searchFields.length === 0) return {}
  
  const term = searchTerm.trim()
  
  if (searchFields.length === 1) {
    return {
      [searchFields[0]]: { contains: term, mode: 'insensitive' },
    }
  }
  
  return {
    OR: searchFields.map(field => ({
      [field]: { contains: term, mode: 'insensitive' },
    })),
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(params: {
  page?: number
  pageSize?: number
  cursor?: string
  limit?: number
}): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (params.page !== undefined && params.page < 1) {
    errors.push('Page must be greater than 0')
  }
  
  if (params.pageSize !== undefined) {
    if (params.pageSize < PAGINATION_DEFAULTS.MIN_PAGE_SIZE) {
      errors.push(`Page size must be at least ${PAGINATION_DEFAULTS.MIN_PAGE_SIZE}`)
    }
    if (params.pageSize > PAGINATION_DEFAULTS.MAX_PAGE_SIZE) {
      errors.push(`Page size cannot exceed ${PAGINATION_DEFAULTS.MAX_PAGE_SIZE}`)
    }
  }
  
  if (params.limit !== undefined) {
    if (params.limit < 1) {
      errors.push('Limit must be at least 1')
    }
    if (params.limit > PAGINATION_DEFAULTS.MAX_CURSOR_LIMIT) {
      errors.push(`Limit cannot exceed ${PAGINATION_DEFAULTS.MAX_CURSOR_LIMIT}`)
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Generate page window for pagination UI
 */
export function generatePageWindow(
  currentPage: number,
  totalPages: number,
  windowSize: number = 5
): (number | 'ellipsis')[] {
  if (totalPages <= windowSize + 2) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  
  const pages: (number | 'ellipsis')[] = [1]
  const halfWindow = Math.floor(windowSize / 2)
  let start = Math.max(2, currentPage - halfWindow)
  let end = Math.min(totalPages - 1, currentPage + halfWindow)
  
  if (currentPage <= halfWindow + 1) {
    end = windowSize
  }
  
  if (currentPage >= totalPages - halfWindow) {
    start = totalPages - windowSize + 1
  }
  
  if (start > 2) {
    pages.push('ellipsis')
  }
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  
  if (end < totalPages - 1) {
    pages.push('ellipsis')
  }
  
  pages.push(totalPages)
  
  return pages
}

/**
 * Calculate optimal page size based on viewport
 */
export function calculateOptimalPageSize(
  itemHeight: number,
  viewportHeight: number,
  buffer: number = 2
): number {
  const visibleItems = Math.floor(viewportHeight / itemHeight)
  return Math.min(visibleItems + buffer, PAGINATION_DEFAULTS.MAX_PAGE_SIZE)
}

// =============================================================================
// RESPONSE HELPERS
// =============================================================================

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  config: {
    mode: PaginationMode
    totalCount?: number
    page?: number
    pageSize: number
    cursor?: string | null
    hasMore?: boolean
    nextCursor?: string | null
  }
): PaginatedResult<T> {
  const { mode, totalCount = 0, page = 1, pageSize, cursor, hasMore, nextCursor } = config
  
  if (mode === 'cursor') {
    return {
      data,
      pagination: {
        hasMore: hasMore ?? false,
        hasPrevious: !!cursor,
        nextCursor: nextCursor ?? null,
        previousCursor: null,
        pageSize,
      },
    }
  }
  
  const meta = buildPaginationMeta(totalCount, page, pageSize)
  
  return {
    data,
    pagination: {
      hasMore: meta.hasNext,
      hasPrevious: meta.hasPrevious,
      nextCursor: null,
      previousCursor: null,
      totalCount,
      page,
      pageSize,
      totalPages: meta.totalPages,
    },
  }
}
