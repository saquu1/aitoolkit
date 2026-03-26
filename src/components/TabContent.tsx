/**
 * TAB CONTENT WRAPPER
 * ===================
 * Wraps tab content with Suspense for progressive loading
 * Shows skeleton while component is loading
 */

import { Suspense, ReactNode } from 'react'

interface TabContentProps {
  children: ReactNode
  isActive: boolean
}

// Skeleton components for different content types
function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array(count).fill(0).map((_, i) => (
        <div
          key={i}
          className="h-24 bg-muted/30 rounded-lg animate-pulse"
          style={{ animationDelay: `${i * 50}ms` }}
        />
      ))}
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-10 bg-muted/30 rounded animate-pulse" />
      {Array(5).fill(0).map((_, i) => (
        <div
          key={i}
          className="h-12 bg-muted/20 rounded animate-pulse"
          style={{ animationDelay: `${i * 30}ms` }}
        />
      ))}
    </div>
  )
}

function FormSkeleton() {
  return (
    <div className="space-y-4">
      {Array(6).fill(0).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-24 bg-muted/40 rounded animate-pulse" />
          <div className="h-10 bg-muted/30 rounded animate-pulse" />
        </div>
      ))}
    </div>
  )
}

// Default loading fallback
function DefaultLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <CardSkeleton count={4} />
      <div className="h-64 bg-muted/30 rounded-lg" />
    </div>
  )
}

// Main wrapper component
export function TabContent({ children, isActive }: TabContentProps) {
  // Don't render content at all if tab is not active
  // This saves memory by not mounting inactive components
  if (!isActive) {
    return null
  }

  return (
    <Suspense fallback={<DefaultLoading />}>
      {children}
    </Suspense>
  )
}

// Named exports for specific skeletons
export { CardSkeleton, TableSkeleton, FormSkeleton }
