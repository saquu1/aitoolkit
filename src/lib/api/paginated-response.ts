/**
 * UNIFIED PAGINATED API RESPONSE HELPER
 * ======================================
 * Standardizes all API responses with pagination support
 * 
 * Usage in API routes:
 * ```typescript
 * import { withPagination, createApiHandler } from '@/lib/api/paginated-response'
 * 
 * export const GET = createApiHandler(async (request, { params }) => {
 *   return withPagination(
 *     prisma.table.findMany({ where: { projectId: params.id } }),
 *     request
 *   )
 * })
 * ```
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  buildPaginationQuery,
  createPaginatedResponse,
  decodeCursor,
  PAGINATION_DEFAULTS,
  type PaginationMode,
  type PaginatedResult,
} from '@/lib/pagination'

// =============================================================================
// TYPES
// =============================================================================

export interface ApiHandlerContext {
  params: Record<string, string>
  searchParams: URLSearchParams
  userId?: string
}

export interface PaginationRequest {
  mode: PaginationMode
  page: number
  pageSize: number
  cursor: string | null
  limit: number
}

export interface ApiSuccessResponse<T> {
  success: true
  data: T
  pagination?: PaginatedResult<never>['pagination']
  meta?: Record<string, unknown>
}

export interface ApiErrorResponse {
  success: false
  error: string
  code?: string
  details?: unknown
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

// =============================================================================
// PAGINATION PARAMS EXTRACTOR
// =============================================================================

/**
 * Extract pagination params from request
 */
export function getPaginationParams(request: NextRequest): PaginationRequest {
  const searchParams = request.nextUrl.searchParams
  
  const cursor = searchParams.get('cursor')
  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || String(PAGINATION_DEFAULTS.DEFAULT_PAGE_SIZE), 10)
  const limit = parseInt(searchParams.get('limit') || String(PAGINATION_DEFAULTS.DEFAULT_CURSOR_LIMIT), 10)
  const mode: PaginationMode = searchParams.get('mode') === 'cursor' ? 'cursor' : 'offset'
  
  return {
    mode,
    page: Math.max(1, page),
    pageSize: Math.min(Math.max(5, pageSize), PAGINATION_DEFAULTS.MAX_PAGE_SIZE),
    cursor,
    limit: Math.min(Math.max(1, limit), PAGINATION_DEFAULTS.MAX_CURSOR_LIMIT),
  }
}

/**
 * Get Prisma pagination args from pagination request
 */
export function getPrismaPaginationArgs(params: PaginationRequest, sortField = 'createdAt', sortDirection: 'asc' | 'desc' = 'desc') {
  if (params.mode === 'cursor') {
    return {
      take: params.limit + 1, // Take one extra to detect hasMore
      skip: params.cursor ? 1 : 0,
      cursor: params.cursor ? { id: decodeCursor(params.cursor) } : undefined,
      orderBy: { [sortField]: sortDirection },
    }
  }
  
  return {
    skip: (params.page - 1) * params.pageSize,
    take: params.pageSize,
    orderBy: { [sortField]: sortDirection },
  }
}

// =============================================================================
// RESPONSE BUILDERS
// =============================================================================

/**
 * Create a successful API response
 */
export function apiSuccess<T>(
  data: T,
  options?: {
    pagination?: PaginatedResult<never>['pagination']
    meta?: Record<string, unknown>
    status?: number
  }
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(options?.pagination && { pagination: options.pagination }),
    ...(options?.meta && { meta: options.meta }),
  }
  
  return NextResponse.json(response, { status: options?.status || 200 })
}

/**
 * Create an error API response
 */
export function apiError(
  error: string,
  options?: {
    code?: string
    status?: number
    details?: unknown
  }
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error,
    ...(options?.code && { code: options.code }),
    ...(options?.details && { details: options.details }),
  }
  
  return NextResponse.json(response, { status: options?.status || 400 })
}

/**
 * Wrap a query with pagination
 */
export async function withPagination<T extends { id: string }>(
  queryPromise: Promise<T[]>,
  request: NextRequest,
  totalCountPromise?: Promise<number>,
  sortField = 'createdAt',
  sortDirection: 'asc' | 'desc' = 'desc'
): Promise<NextResponse<ApiResponse<T[]>>> {
  try {
    const params = getPaginationParams(request)
    const prismaArgs = getPrismaPaginationArgs(params, sortField, sortDirection)
    
    // Execute query with pagination args applied externally
    const results = await queryPromise
    const totalCount = totalCountPromise ? await totalCountPromise : undefined
    
    if (params.mode === 'cursor') {
      const hasMore = results.length > params.limit
      const data = hasMore ? results.slice(0, -1) : results
      const nextCursor = hasMore && data.length > 0
        ? Buffer.from(data[data.length - 1].id).toString('base64url')
        : null
      
      return apiSuccess(data, {
        pagination: {
          hasMore,
          hasPrevious: !!params.cursor,
          nextCursor,
          previousCursor: null,
          pageSize: params.limit,
        },
        meta: totalCount !== undefined ? { totalCount } : undefined,
      })
    }
    
    // Offset mode
    const total = totalCount ?? results.length
    const totalPages = Math.ceil(total / params.pageSize)
    
    return apiSuccess(results, {
      pagination: {
        hasMore: params.page < totalPages,
        hasPrevious: params.page > 1,
        nextCursor: null,
        previousCursor: null,
        totalCount: total,
        page: params.page,
        pageSize: params.pageSize,
        totalPages,
      },
    })
  } catch (error) {
    console.error('Pagination error:', error)
    return apiError(
      error instanceof Error ? error.message : 'Failed to fetch data',
      { status: 500 }
    )
  }
}

// =============================================================================
// API HANDLER WRAPPER
// =============================================================================

type ApiHandlerFn<T> = (
  request: NextRequest,
  context: ApiHandlerContext
) => Promise<NextResponse<ApiResponse<T>>>

/**
 * Create a standardized API handler with error handling
 */
export function createApiHandler<T>(handler: ApiHandlerFn<T>) {
  return async (
    request: NextRequest,
    { params }: { params: Promise<Record<string, string>> }
  ) => {
    try {
      const resolvedParams = await params
      const context: ApiHandlerContext = {
        params: resolvedParams,
        searchParams: request.nextUrl.searchParams,
      }
      
      return handler(request, context)
    } catch (error) {
      console.error('API handler error:', error)
      return apiError(
        error instanceof Error ? error.message : 'Internal server error',
        { status: 500, code: 'INTERNAL_ERROR' }
      )
    }
  }
}

/**
 * Create a paginated API handler
 */
export function createPaginatedApiHandler<T extends { id: string }>(
  queryFn: (context: ApiHandlerContext, prismaArgs: ReturnType<typeof getPrismaPaginationArgs>) => Promise<T[]>,
  countFn?: (context: ApiHandlerContext) => Promise<number>,
  options?: {
    sortField?: string
    sortDirection?: 'asc' | 'desc'
  }
) {
  return createApiHandler<T[]>(async (request, context) => {
    const params = getPaginationParams(request)
    const prismaArgs = getPrismaPaginationArgs(
      params,
      options?.sortField || 'createdAt',
      options?.sortDirection || 'desc'
    )
    
    const results = await queryFn(context, prismaArgs)
    const totalCount = countFn ? await countFn(context) : undefined
    
    if (params.mode === 'cursor') {
      const hasMore = results.length > params.limit
      const data = hasMore ? results.slice(0, -1) : results
      const nextCursor = hasMore && data.length > 0
        ? Buffer.from(data[data.length - 1].id).toString('base64url')
        : null
      
      return apiSuccess(data, {
        pagination: {
          hasMore,
          hasPrevious: !!params.cursor,
          nextCursor,
          previousCursor: null,
          pageSize: params.limit,
        },
        meta: totalCount !== undefined ? { totalCount } : undefined,
      })
    }
    
    // Offset mode
    const total = totalCount ?? results.length
    const totalPages = Math.ceil(total / params.pageSize)
    
    return apiSuccess(results, {
      pagination: {
        hasMore: params.page < totalPages,
        hasPrevious: params.page > 1,
        nextCursor: null,
        previousCursor: null,
        totalCount: total,
        page: params.page,
        pageSize: params.pageSize,
        totalPages,
      },
    })
  })
}

// =============================================================================
// STREAMING RESPONSE HELPER
// =============================================================================

/**
 * Create a streaming paginated response
 */
export function createStreamingPaginatedResponse<T>(
  fetchData: (offset: number, limit: number) => Promise<T[]>,
  getTotalCount: () => Promise<number>,
  options?: {
    pageSize?: number
    headers?: Record<string, string>
  }
): Response {
  const pageSize = options?.pageSize || 20
  
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      let offset = 0
      let hasMore = true
      const totalCount = await getTotalCount()
      
      // Send initial metadata
      controller.enqueue(encoder.encode(JSON.stringify({
        type: 'meta',
        totalCount,
        pageSize,
      }) + '\n'))
      
      while (hasMore) {
        try {
          const items = await fetchData(offset, pageSize)
          
          if (items.length === 0) {
            hasMore = false
            break
          }
          
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'data',
            items,
            offset,
          }) + '\n'))
          
          offset += items.length
          hasMore = items.length === pageSize && offset < totalCount
          
          // Allow event loop to process
          await new Promise(resolve => setTimeout(resolve, 0))
        } catch (error) {
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          }) + '\n'))
          break
        }
      }
      
      controller.enqueue(encoder.encode(JSON.stringify({ type: 'done' }) + '\n'))
      controller.close()
    },
  })
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      ...options?.headers,
    },
  })
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  buildPaginationQuery,
  createPaginatedResponse,
  PAGINATION_DEFAULTS,
}
