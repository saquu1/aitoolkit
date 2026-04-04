'use client'

import { useTheme } from '@/hooks/useTheme'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circle' | 'rect' | 'card'
}

export function Skeleton({ className = '', variant = 'rect' }: SkeletonProps) {
  const { colors } = useTheme()

  const variants: Record<string, string> = {
    text: 'h-4 rounded-md',
    circle: 'rounded-full',
    rect: 'rounded-lg',
    card: 'rounded-xl',
  }

  return (
    <div
      className={`animate-pulse ${variants[variant]} ${className}`}
      style={{
        backgroundColor: `color-mix(in srgb, ${colors.border} 40%, transparent)`,
      }}
    />
  )
}

interface SkeletonGridProps {
  rows?: number
  columns?: number
  className?: string
}

export function SkeletonGrid({ rows = 3, columns = 4, className = '' }: SkeletonGridProps) {
  return (
    <div
      className={`grid gap-4 ${className}`}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: rows * columns }).map((_, i) => (
        <Skeleton key={i} variant="card" className="h-28" />
      ))}
    </div>
  )
}

interface SkeletonListProps {
  count?: number
  className?: string
  showAvatar?: boolean
}

export function SkeletonList({ count = 5, className = '', showAvatar = false }: SkeletonListProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          {showAvatar && <Skeleton variant="circle" className="w-8 h-8 flex-shrink-0" />}
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="w-3/4" />
            <Skeleton variant="text" className="w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}
