/**
 * PROGRESSIVE LOADING EXPORTS
 * ============================
 * Unified exports for all progressive loading utilities
 */

// Pagination
export {
  // Types
  type CursorPaginationParams,
  type OffsetPaginationParams,
  type PaginatedResult,
  type CursorResult,
  type PaginationMeta,
  type SortOptions,
  type FilterOptions,
  type PaginationMode,
  type PaginationConfig,
  
  // Constants
  PAGINATION_DEFAULTS,
  
  // Cursor pagination
  createCursor,
  decodeCursor,
  buildCursorQuery,
  processCursorResults,
  
  // Offset pagination
  calculateOffset,
  buildOffsetQuery,
  buildPaginationMeta,
  
  // Unified
  buildPaginationQuery,
  buildWhereClause,
  buildSearchQuery,
  validatePaginationParams,
  generatePageWindow,
  calculateOptimalPageSize,
  createPaginatedResponse,
} from '@/lib/pagination'

// Streaming
export {
  // Types
  type StreamChunk,
  type StreamingOptions,
  type DataLoader,
  type BatchLoader,
  type StreamReaderOptions,
  type SuspenseDataFetcher,
  
  // Streaming
  createStreamingResponse,
  createJsonEncoder,
  streamData,
  streamApiResponse,
  streamBatchResponse,
  createPaginatedStreamResponse,
  readStreamResponse,
  createSuspenseResource,
  withStreaming,
} from '@/lib/streaming'

// Virtual List
export {
  type VirtualListProps,
  type VirtualListRef,
  type SimpleVirtualListProps,
  VirtualList,
  SimpleVirtualList,
  useVirtualList,
} from '@/components/ui/virtual-list'

// Virtual Grid
export {
  type VirtualGridProps,
  type VirtualGridRef,
  type SimpleVirtualGridProps,
  type MasonryGridProps,
  type CardPlaceholderProps,
  VirtualGrid,
  SimpleVirtualGrid,
  MasonryGrid,
  CardPlaceholder,
  CardPlaceholders,
} from '@/components/ui/virtual-grid'

// Infinite Scroll
export {
  type InfiniteScrollProps,
  type InfiniteScrollRef,
  type UseInfiniteScrollOptions,
  type UseInfiniteScrollReturn,
  InfiniteScroll,
  useInfiniteScroll,
} from '@/components/ui/infinite-scroll'

// Loading Skeletons
export {
  SkeletonText,
  SkeletonCircle,
  SkeletonAvatar,
  SkeletonImage,
  SkeletonCard,
  SkeletonStatCard,
  SkeletonCardGrid,
  SkeletonTableHeader,
  SkeletonTableRow,
  SkeletonTable,
  SkeletonFormField,
  SkeletonForm,
  SkeletonListItem,
  SkeletonList,
  SkeletonSidebar,
  SkeletonPageHeader,
  SkeletonDashboard,
  SkeletonProjectPage,
  SkeletonChatLogPage,
  SkeletonFileManager,
  SkeletonIntelligenceBank,
  SkeletonSchemaDesigner,
  SkeletonWrapper,
  PulseLoader,
  PageLoader,
  SkeletonPresets,
} from '@/components/ui/loading-skeletons'

// Pagination Hooks
export {
  type UseCursorPaginationOptions,
  type UseCursorPaginationReturn,
  type UseOffsetPaginationOptions,
  type UseOffsetPaginationReturn,
  type UsePaginationStateOptions,
  type UsePaginationStateReturn,
  useCursorPagination,
  useOffsetPagination,
  useInfiniteQuery,
  usePaginationState,
  useDebouncedSearch,
} from '@/hooks/usePaginatedQuery'

// Web Workers
export {
  type WorkerTaskType,
  type WorkerTask,
  type WorkerResult,
  type WorkerMessage,
  useWorker,
  useWorkerSqlParser,
  useWorkerDiff,
  useWorkerSchemaAnalysis,
  useWorkerValidation,
  executeWorkerTask,
  isWorkerSupported,
} from '@/workers/computation.worker'
