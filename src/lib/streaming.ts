/**
 * STREAMING SSR UTILITIES
 * ========================
 * Utilities for streaming server-side rendering and API responses
 * 
 * Features:
 * - Streaming response helpers for API routes
 * - Suspense-compatible data fetching
 * - Progressive data loading
 * - Error boundaries for streaming
 */

import { NextRequest, NextResponse } from 'next/server'

// =============================================================================
// TYPES
// =============================================================================

/**
 * Stream chunk for JSON streaming
 */
export interface StreamChunk<T = unknown> {
  type: 'data' | 'error' | 'done' | 'meta'
  payload?: T
  error?: string
  meta?: {
    total?: number
    hasMore?: boolean
    cursor?: string | null
  }
}

/**
 * Options for streaming responses
 */
export interface StreamingOptions {
  /** Content type header */
  contentType?: string
  /** Chunk separator for JSON streaming */
  separator?: string
  /** Enable CORS headers */
  cors?: boolean
  /** Custom headers */
  headers?: Record<string, string>
}

/**
 * Data loader for streaming
 */
export type DataLoader<T> = (
  cursor?: string | null,
  limit?: number
) => Promise<{
  data: T[]
  nextCursor?: string | null
  hasMore: boolean
  total?: number
}>

/**
 * Batch loader for bulk streaming
 */
export type BatchLoader<T> = (batchSize: number) => AsyncGenerator<T[], void, unknown>

// =============================================================================
// STREAMING RESPONSE BUILDER
// =============================================================================

/**
 * Create a streaming JSON response
 */
export function createStreamingResponse(
  stream: ReadableStream<Uint8Array>,
  options: StreamingOptions = {}
): Response {
  const {
    contentType = 'application/x-ndjson',
    cors = true,
    headers: customHeaders = {},
  } = options

  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Transfer-Encoding': 'chunked',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    ...customHeaders,
  }

  if (cors) {
    headers['Access-Control-Allow-Origin'] = '*'
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    headers['Access-Control-Allow-Headers'] = 'Content-Type'
  }

  return new Response(stream, { headers })
}

/**
 * Create a JSON encoder for streaming
 */
export function createJsonEncoder(): TransformStream<StreamChunk, Uint8Array> {
  return new TransformStream({
    transform(chunk, controller) {
      const json = JSON.stringify(chunk) + '\n'
      controller.enqueue(new TextEncoder().encode(json))
    },
  })
}

/**
 * Stream data from a loader function
 */
export async function* streamData<T>(
  loader: DataLoader<T>,
  options: {
    initialCursor?: string | null
    pageSize?: number
    maxItems?: number
  } = {}
): AsyncGenerator<StreamChunk<T[]>, void, unknown> {
  const { initialCursor = null, pageSize = 20, maxItems = Infinity } = options
  
  let cursor = initialCursor
  let totalLoaded = 0
  let hasMore = true
  
  while (hasMore && totalLoaded < maxItems) {
    try {
      const limit = Math.min(pageSize, maxItems - totalLoaded)
      const result = await loader(cursor, limit)
      
      // Yield data chunk
      yield {
        type: 'data',
        payload: result.data,
      }
      
      // Update state
      totalLoaded += result.data.length
      cursor = result.nextCursor ?? null
      hasMore = result.hasMore
      
      // Yield meta information
      if (result.total !== undefined) {
        yield {
          type: 'meta',
          meta: {
            total: result.total,
            hasMore,
            cursor,
          },
        }
      }
      
      // Allow other tasks to run
      await new Promise(resolve => setTimeout(resolve, 0))
    } catch (error) {
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
      break
    }
  }
  
  yield { type: 'done' }
}

// =============================================================================
// API ROUTE HELPERS
// =============================================================================

/**
 * Create a streaming API response from a data loader
 */
export function streamApiResponse<T>(
  loader: DataLoader<T>,
  options: {
    cursor?: string | null
    pageSize?: number
    streamingOptions?: StreamingOptions
  } = {}
): Response {
  const { cursor, pageSize = 20, streamingOptions } = options
  
  const { readable, writable } = new TransformStream<StreamChunk, Uint8Array>()
  const encoder = createJsonEncoder()
  
  // Start streaming in background
  ;(async () => {
    const writer = encoder.writable.getWriter()
    
    try {
      for await (const chunk of streamData(loader, { initialCursor: cursor, pageSize })) {
        await writer.write(chunk)
      }
    } finally {
      await writer.close()
    }
  })()
  
  // Pipe through encoder
  encoder.readable.pipeTo(writable)
  
  return createStreamingResponse(readable, streamingOptions)
}

/**
 * Create a batch streaming response
 */
export async function streamBatchResponse<T>(
  loader: BatchLoader<T>,
  options: StreamingOptions = {}
): Promise<Response> {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder()
      
      try {
        for await (const batch of loader(20)) {
          const chunk: StreamChunk<T[]> = {
            type: 'data',
            payload: batch,
          }
          controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'))
        }
        
        // Send done signal
        controller.enqueue(encoder.encode(JSON.stringify({ type: 'done' }) + '\n'))
      } catch (error) {
        const errorChunk: StreamChunk = {
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        }
        controller.enqueue(encoder.encode(JSON.stringify(errorChunk) + '\n'))
      } finally {
        controller.close()
      }
    },
  })
  
  return createStreamingResponse(stream, options)
}

// =============================================================================
// PAGINATED STREAMING
// =============================================================================

/**
 * Create a paginated streaming response
 * Combines immediate response with streaming for additional pages
 */
export async function createPaginatedStreamResponse<T>(
  initialData: T[],
  options: {
    totalCount: number
    pageSize: number
    currentPage: number
    loadMore?: DataLoader<T>
    streamingOptions?: StreamingOptions
  }
): Promise<Response> {
  const { totalCount, pageSize, currentPage, loadMore, streamingOptions } = options
  
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder()
      
      // Send initial data
      const initialChunk: StreamChunk<T[]> = {
        type: 'data',
        payload: initialData,
        meta: {
          total: totalCount,
          hasMore: currentPage * pageSize < totalCount,
          cursor: null,
        },
      }
      controller.enqueue(encoder.encode(JSON.stringify(initialChunk) + '\n'))
      
      // If there's more data and a loader, stream additional pages
      if (loadMore && currentPage * pageSize < totalCount) {
        let cursor: string | null = null
        
        try {
          for await (const chunk of streamData(loadMore, { pageSize })) {
            controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'))
          }
        } catch (error) {
          const errorChunk: StreamChunk = {
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          }
          controller.enqueue(encoder.encode(JSON.stringify(errorChunk) + '\n'))
        }
      }
      
      // Send done signal
      controller.enqueue(encoder.encode(JSON.stringify({ type: 'done' }) + '\n'))
      controller.close()
    },
  })
  
  return createStreamingResponse(stream, streamingOptions)
}

// =============================================================================
// CLIENT-SIDE STREAM READER
// =============================================================================

/**
 * Options for stream reader
 */
export interface StreamReaderOptions<T> {
  /** Callback for each data chunk */
  onData: (data: T[]) => void
  /** Callback for errors */
  onError?: (error: string) => void
  /** Callback when stream completes */
  onDone?: () => void
  /** Callback for metadata */
  onMeta?: (meta: StreamChunk['meta']) => void
}

/**
 * Read a streaming response
 */
export async function readStreamResponse<T>(
  response: Response,
  options: StreamReaderOptions<T>
): Promise<void> {
  const { onData, onError, onDone, onMeta } = options
  const reader = response.body?.getReader()
  
  if (!reader) {
    onError?.('No response body')
    return
  }
  
  const decoder = new TextDecoder()
  let buffer = ''
  
  try {
    while (true) {
      const { done, value } = await reader.read()
      
      if (done) break
      
      buffer += decoder.decode(value, { stream: true })
      
      // Process complete lines
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      
      for (const line of lines) {
        if (!line.trim()) continue
        
        try {
          const chunk: StreamChunk<T[]> = JSON.parse(line)
          
          switch (chunk.type) {
            case 'data':
              if (chunk.payload) {
                onData(chunk.payload)
              }
              break
            case 'meta':
              if (chunk.meta) {
                onMeta?.(chunk.meta)
              }
              break
            case 'error':
              onError?.(chunk.error || 'Unknown error')
              break
            case 'done':
              onDone?.()
              break
          }
        } catch (parseError) {
          // Skip invalid JSON lines
          console.warn('Failed to parse stream chunk:', line)
        }
      }
    }
    
    // Process remaining buffer
    if (buffer.trim()) {
      try {
        const chunk: StreamChunk<T[]> = JSON.parse(buffer)
        if (chunk.type === 'data' && chunk.payload) {
          onData(chunk.payload)
        }
      } catch {
        // Ignore parse errors for remaining buffer
      }
    }
    
    onDone?.()
  } catch (error) {
    onError?.(error instanceof Error ? error.message : 'Stream read error')
  } finally {
    reader.releaseLock()
  }
}

// =============================================================================
// SUSPENSE DATA FETCHING
// =============================================================================

/**
 * Suspense-compatible data fetcher
 */
export interface SuspenseDataFetcher<T> {
  read: () => T
  preload: () => Promise<T>
}

/**
 * Create a suspense-compatible data resource
 */
export function createSuspenseResource<T>(
  fetcher: () => Promise<T>
): SuspenseDataFetcher<T> {
  let status: 'pending' | 'success' | 'error' = 'pending'
  let result: T
  let error: Error
  let suspender: Promise<T> | null = null
  
  const preload = (): Promise<T> => {
    if (!suspender) {
      suspender = fetcher()
        .then((data) => {
          status = 'success'
          result = data
        })
        .catch((e) => {
          status = 'error'
          error = e
        })
    }
    return suspender
  }
  
  const read = (): T => {
    switch (status) {
      case 'pending':
        throw preload()
      case 'error':
        throw error
      case 'success':
        return result
    }
  }
  
  return { read, preload }
}

// =============================================================================
// STREAMING API ROUTE WRAPPER
// =============================================================================

/**
 * Wrap an API route with streaming support
 */
export function withStreaming<T>(
  handler: (
    request: NextRequest,
    stream: {
      send: (data: T) => void
      sendError: (error: string) => void
      sendMeta: (meta: StreamChunk['meta']) => void
      done: () => void
    }
  ) => Promise<void> | void
): (request: NextRequest) => Promise<Response> {
  return async (request: NextRequest) => {
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder()
        
        const api = {
          send: (data: T) => {
            const chunk: StreamChunk<T> = { type: 'data', payload: data }
            controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'))
          },
          sendError: (error: string) => {
            const chunk: StreamChunk = { type: 'error', error }
            controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'))
          },
          sendMeta: (meta: StreamChunk['meta']) => {
            const chunk: StreamChunk = { type: 'meta', meta }
            controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'))
          },
          done: () => {
            const chunk: StreamChunk = { type: 'done' }
            controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'))
            controller.close()
          },
        }
        
        try {
          await handler(request, api)
        } catch (error) {
          api.sendError(error instanceof Error ? error.message : 'Unknown error')
        } finally {
          api.done()
        }
      },
    })
    
    return createStreamingResponse(stream)
  }
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

export { createStreamingResponse as createStreamResponse }
