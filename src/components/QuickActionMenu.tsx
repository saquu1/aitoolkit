'use client'

import { useState, useEffect, useRef, useCallback, type ComponentType } from 'react'
import { Sparkles } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

export interface QuickAction {
  icon: ComponentType<{ className?: string; style?: React.CSSProperties }>
  label: string
  onClick: () => void
  variant?: 'primary' | 'success' | 'warning' | 'error'
}

interface QuickActionMenuProps {
  actions: QuickAction[]
}

export function QuickActionMenu({ actions }: QuickActionMenuProps) {
  const { colors, mounted } = useTheme()
  const [expanded, setExpanded] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const fabRef = useRef<HTMLButtonElement>(null)

  const alpha = (color: string, opacity: number) =>
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  const getVariantColor = (variant?: QuickAction['variant']) => {
    switch (variant) {
      case 'success': return colors.success
      case 'warning': return colors.warning
      case 'error': return colors.error
      default: return colors.primary
    }
  }

  const toggle = useCallback(() => {
    setExpanded(prev => !prev)
  }, [])

  const collapse = useCallback(() => {
    setExpanded(false)
  }, [])

  // Click outside to collapse
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        fabRef.current &&
        !fabRef.current.contains(e.target as Node)
      ) {
        collapse()
      }
    }
    if (expanded) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [expanded, collapse])

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expanded) {
        collapse()
        fabRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [expanded, collapse])

  if (!mounted) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Tooltip when collapsed and not expanded */}
      {expanded && (
        <div
          ref={menuRef}
          className="flex flex-col gap-2 origin-bottom-right animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          {actions.map((action, index) => {
            const ActionIcon = action.icon
            const variantColor = getVariantColor(action.variant)

            return (
              <button
                key={action.label}
                onClick={() => {
                  action.onClick()
                  collapse()
                }}
                className="group flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl
                  transition-all duration-200 hover:scale-[1.04] active:scale-[0.97] min-w-[180px]
                  shadow-lg hover:shadow-xl"
                style={{
                  backgroundColor: alpha(variantColor, 12),
                  borderColor: alpha(variantColor, 25),
                  animationDelay: `${index * 40}ms`,
                  animationFillMode: 'both',
                }}
                aria-label={action.label}
              >
                <div
                  className="p-2 rounded-lg transition-transform group-hover:scale-110 flex-shrink-0"
                  style={{ backgroundColor: alpha(variantColor, 18) }}
                >
                  <ActionIcon
                    className="w-4 h-4"
                    style={{ color: variantColor }}
                  />
                </div>
                <span
                  className="text-sm font-medium whitespace-nowrap"
                  style={{ color: colors.text }}
                >
                  {action.label}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Main FAB button */}
      <button
        ref={fabRef}
        onClick={toggle}
        className="relative w-14 h-14 rounded-full flex items-center justify-center
          backdrop-blur-xl border-2 shadow-xl transition-all duration-300
          hover:scale-110 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          backgroundColor: expanded ? alpha(colors.error, 80) : alpha(colors.primary, 80),
          borderColor: expanded ? alpha(colors.error, 60) : alpha(colors.primary, 60),
          boxShadow: expanded
            ? `0 8px 32px ${alpha(colors.error, 30)}`
            : `0 8px 32px ${alpha(colors.primary, 30)}`,
          color: colors.text,
        }}
        aria-label={expanded ? 'Close quick actions' : 'Open quick actions'}
        aria-expanded={expanded}
        aria-haspopup="true"
      >
        {/* Rotating icon */}
        <Sparkles
          className="w-6 h-6 transition-transform duration-300"
          style={{
            transform: expanded ? 'rotate(90deg) scale(0.9)' : 'rotate(0deg) scale(1)',
            color: expanded ? colors.error : colors.primary,
          }}
        />

        {/* Pulsing ring when collapsed */}
        {!expanded && (
          <span
            className="absolute inset-0 rounded-full animate-ping opacity-20"
            style={{ backgroundColor: colors.primary }}
          />
        )}
      </button>
    </div>
  )
}
