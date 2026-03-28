/**
 * LOADING SKELETONS
 * =================
 * Comprehensive loading skeleton components for all pages
 * 
 * Features:
 * - Page-level skeletons
 * - Card skeletons
 * - Table skeletons
 * - Form skeletons
 * - Dashboard skeletons
 * - Consistent animation timing
 */

import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// =============================================================================
// BASE SKELETON VARIANTS
// =============================================================================

export function SkeletonText({ 
  className, 
  lines = 1,
  lineHeight = '1rem',
  lastLineWidth = '100%'
}: { 
  className?: string
  lines?: number
  lineHeight?: string
  lastLineWidth?: string
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className="h-4 rounded"
          style={{ 
            height: lineHeight,
            width: i === lines - 1 ? lastLineWidth : '100%'
          }}
        />
      ))}
    </div>
  )
}

export function SkeletonCircle({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <Skeleton 
      className={cn('rounded-full', className)}
      style={{ width: size, height: size }}
    />
  )
}

export function SkeletonAvatar({ size = 40, className }: { size?: number; className?: string }) {
  return <SkeletonCircle size={size} className={className} />
}

export function SkeletonImage({ 
  width = '100%', 
  height = 200, 
  className 
}: { 
  width?: number | string
  height?: number | string
  className?: string 
}) {
  return (
    <Skeleton 
      className={className}
      style={{ width, height }}
    />
  )
}

// =============================================================================
// CARD SKELETONS
// =============================================================================

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border p-4 space-y-4', className)}>
      <div className="flex items-center space-x-4">
        <SkeletonAvatar size={48} />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonText lines={3} lastLineWidth="60%" />
    </div>
  )
}

export function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border p-6', className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-8 w-16 mt-4" />
      <Skeleton className="h-3 w-32 mt-2" />
    </div>
  )
}

export function SkeletonCardGrid({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

// =============================================================================
// TABLE SKELETONS
// =============================================================================

export function SkeletonTableHeader({ columns = 5 }: { columns?: number }) {
  return (
    <div className="flex items-center space-x-4 p-4 border-b bg-muted/50">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
  )
}

export function SkeletonTableRow({ columns = 5 }: { columns?: number }) {
  return (
    <div className="flex items-center space-x-4 p-4 border-b">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
  )
}

export function SkeletonTable({ 
  rows = 5, 
  columns = 5,
  className
}: { 
  rows?: number
  columns?: number
  className?: string
}) {
  return (
    <div className={cn('rounded-lg border', className)}>
      <SkeletonTableHeader columns={columns} />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonTableRow key={i} columns={columns} />
      ))}
    </div>
  )
}

// =============================================================================
// FORM SKELETONS
// =============================================================================

export function SkeletonFormField({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  )
}

export function SkeletonForm({ fields = 4, className }: { fields?: number; className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <SkeletonFormField key={i} />
      ))}
      <div className="flex justify-end gap-2">
        <Skeleton className="h-10 w-24 rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>
    </div>
  )
}

// =============================================================================
// LIST SKELETONS
// =============================================================================

export function SkeletonListItem({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center space-x-4 p-4 border-b', className)}>
      <SkeletonAvatar size={40} />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-8 w-20 rounded" />
    </div>
  )
}

export function SkeletonList({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('rounded-lg border', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListItem key={i} />
      ))}
    </div>
  )
}

// =============================================================================
// SIDEBAR SKELETON
// =============================================================================

export function SkeletonSidebar({ className }: { className?: string }) {
  return (
    <div className={cn('w-64 border-r p-4 space-y-4', className)}>
      <div className="flex items-center space-x-3 mb-6">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3 rounded-lg">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}

// =============================================================================
// PAGE SKELETONS
// =============================================================================

export function SkeletonPageHeader({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-between mb-6', className)}>
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-24 rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>
    </div>
  )
}

export function SkeletonDashboard({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      <SkeletonPageHeader />
      
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-72 rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
      
      {/* Table */}
      <SkeletonTable rows={5} columns={4} />
    </div>
  )
}

export function SkeletonProjectPage({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      <SkeletonPageHeader />
      
      {/* Project Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <SkeletonCard className="h-48" />
          <SkeletonTable rows={6} columns={5} />
        </div>
        <div className="space-y-4">
          <SkeletonCard className="h-32" />
          <SkeletonCard className="h-48" />
          <SkeletonCard className="h-32" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonChatLogPage({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      <SkeletonPageHeader />
      
      {/* Filter bar */}
      <div className="flex items-center gap-4 p-4 rounded-lg border">
        <Skeleton className="h-10 flex-1 rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>
      
      {/* Chat logs list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} className="h-48" />
        ))}
      </div>
    </div>
  )
}

export function SkeletonFileManager({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      <SkeletonPageHeader />
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <SkeletonCard className="h-96" />
        </div>
        
        {/* Main content */}
        <div className="lg:col-span-3">
          <SkeletonCard className="h-16 mb-4" />
          <SkeletonTable rows={8} columns={4} />
        </div>
      </div>
    </div>
  )
}

export function SkeletonIntelligenceBank({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      <SkeletonPageHeader />
      
      {/* Tabs */}
      <div className="flex space-x-2 border-b pb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-24 rounded-md" />
        ))}
      </div>
      
      {/* Content grid */}
      <SkeletonCardGrid count={9} />
    </div>
  )
}

export function SkeletonSchemaDesigner({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      <SkeletonPageHeader />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tables list */}
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
        
        {/* Canvas */}
        <div className="lg:col-span-2">
          <Skeleton className="h-[600px] rounded-lg" />
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// SKELETON WRAPPER
// =============================================================================

export interface SkeletonWrapperProps {
  isLoading: boolean
  children: React.ReactNode
  skeleton: React.ReactNode
  className?: string
}

/**
 * Wrapper that shows skeleton while loading
 */
export function SkeletonWrapper({ 
  isLoading, 
  children, 
  skeleton,
  className 
}: SkeletonWrapperProps) {
  if (isLoading) {
    return <div className={className}>{skeleton}</div>
  }
  return <>{children}</>
}

// =============================================================================
// PULSE LOADER
// =============================================================================

export interface PulseLoaderProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function PulseLoader({ size = 'md', className }: PulseLoaderProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }
  
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div 
        className={cn(
          'rounded-full bg-primary animate-pulse',
          sizeClasses[size]
        )}
      />
    </div>
  )
}

// =============================================================================
// PAGE LOADER
// =============================================================================

export interface PageLoaderProps {
  message?: string
  className?: string
}

export function PageLoader({ message = 'Loading...', className }: PageLoaderProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center min-h-96', className)}>
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-4 border-muted" />
        <div className="absolute top-0 left-0 h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
      <p className="mt-4 text-muted-foreground animate-pulse">{message}</p>
    </div>
  )
}

// =============================================================================
// SKELETON PRESETS
// =============================================================================

export const SkeletonPresets = {
  card: SkeletonCard,
  table: SkeletonTable,
  list: SkeletonList,
  form: SkeletonForm,
  dashboard: SkeletonDashboard,
  projectPage: SkeletonProjectPage,
  chatLogPage: SkeletonChatLogPage,
  fileManager: SkeletonFileManager,
  intelligenceBank: SkeletonIntelligenceBank,
  schemaDesigner: SkeletonSchemaDesigner,
} as const

export default SkeletonPresets
