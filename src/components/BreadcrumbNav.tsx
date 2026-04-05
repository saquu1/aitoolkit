'use client'

import { useState, useEffect } from 'react'
import { ChevronRight, MoreHorizontal } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

interface BreadcrumbItem {
  label: string
  onClick?: () => void
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[]
  className?: string
}

export function BreadcrumbNav({ items, className = '' }: BreadcrumbNavProps) {
  const { colors, mounted } = useTheme()
  const [isMobile, setIsMobile] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (!isClient || !items.length) return null

  const alpha = (color: string, opacity: number) =>
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  // On mobile, show only last 2 items with "..." prefix if there are more than 2
  const displayItems = isMobile && items.length > 2
    ? items.slice(-2)
    : items
  const showEllipsis = isMobile && items.length > 2

  return (
    <nav
      className={`content-fade-in flex items-center gap-1 text-xs ${className}`}
      aria-label="Breadcrumb"
      style={{ color: colors.textMuted }}
    >
      {/* Ellipsis prefix on mobile */}
      {showEllipsis && (
        <>
          <span
            className="flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium"
            style={{
              color: colors.textMuted,
              backgroundColor: alpha(colors.bgTertiary, 30),
            }}
          >
            <MoreHorizontal className="w-3 h-3 mr-0.5" />
            {items.length} items
          </span>
          <ChevronRight
            className="w-3 h-3 flex-shrink-0"
            style={{ color: alpha(colors.textMuted, 50) }}
          />
        </>
      )}

      {displayItems.map((item, index) => {
        const isLast = index === displayItems.length - 1 && !showEllipsis

        return (
          <span key={index} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight
                className="w-3 h-3 flex-shrink-0 mx-0.5"
                style={{ color: alpha(colors.textMuted, 50) }}
              />
            )}
            {isLast ? (
              // Current location — non-clickable, uses colors.text
              <span
                className="font-semibold text-xs px-1.5 py-0.5 rounded-md"
                style={{
                  color: colors.text,
                  backgroundColor: alpha(colors.primary, 8),
                  border: `1px solid ${alpha(colors.primary, 15)}`,
                }}
                aria-current="page"
              >
                {item.label}
              </span>
            ) : item.onClick ? (
              // Clickable breadcrumb item
              <button
                onClick={item.onClick}
                className="text-xs font-medium px-1.5 py-0.5 rounded-md transition-all duration-200 cursor-pointer"
                style={{
                  color: colors.textMuted,
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = colors.primaryLight
                  e.currentTarget.style.backgroundColor = alpha(colors.primary, 8)
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = colors.textMuted
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                {item.label}
              </button>
            ) : (
              // Non-clickable but not last (e.g., group label)
              <span
                className="text-[10px] font-semibold uppercase tracking-wider px-1"
                style={{
                  color: alpha(colors.textMuted, 70),
                }}
              >
                {item.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
