'use client'

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react'
import { useTheme } from '@/hooks/useTheme'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react'

// ── Color helper consistent with codebase ──
function alpha(color: string, opacity: number): string {
  return `color-mix(in srgb, ${color} ${opacity}%, transparent)`
}

// ── Types ──
export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  type: ToastType
  title: string
  message?: string
  action?: {
    label: string
    onClick: () => void
  }
  duration?: number // ms, default 5000
}

interface ToastContextType {
  toasts: ToastItem[]
  addToast: (toast: Omit<ToastItem, 'id'>) => string
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

// ── Hook ──
export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    return {
      toasts: [],
      addToast: () => '',
      removeToast: () => {},
    }
  }
  return ctx
}

// ── Icon map ──
const ICON_MAP: Record<ToastType, React.FC<{ size?: number; className?: string }>> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

// ── Color map function ──
function getColor(type: ToastType, colors: ReturnType<typeof useTheme>['colors']) {
  switch (type) {
    case 'success': return colors.success
    case 'error': return colors.error
    case 'warning': return colors.warning
    case 'info': return colors.primary
  }
}

// ── Single Toast ──
function ToastCard({
  toast,
  onDismiss,
  colors,
}: {
  toast: ToastItem
  onDismiss: () => void
  colors: ReturnType<typeof useTheme>['colors']
}) {
  const [progress, setProgress] = useState(100)
  const [isExiting, setIsExiting] = useState(false)
  const duration = toast.duration ?? 5000
  const color = getColor(toast.type, colors)
  const Icon = ICON_MAP[toast.type]

  // Auto-dismiss with progress bar
  useEffect(() => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)

      if (remaining <= 0) {
        clearInterval(interval)
        handleExit()
      }
    }, 50)

    return () => clearInterval(interval)
  }, [duration])

  // Pause on hover
  const [paused, setPaused] = useState(false)
  const [pausedAt, setPausedAt] = useState(0)

  function handleMouseEnter() {
    setPaused(true)
    setPausedAt(Date.now())
  }

  function handleMouseLeave() {
    // Adjust startTime so progress continues from where it was paused
    setPaused(false)
  }

  function handleExit() {
    setIsExiting(true)
    setTimeout(() => {
      onDismiss()
    }, 300)
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="glass-card-elevated"
      style={{
        padding: 0,
        minWidth: '320px',
        maxWidth: '420px',
        animation: isExiting
          ? 'toast-slide-out 0.3s ease forwards'
          : 'toast-slide-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        borderLeft: `3px solid ${color}`,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Content */}
      <div style={{ padding: '12px 14px 10px 14px' }}>
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className="flex-shrink-0 mt-0.5"
            style={{ color }}
          >
            <Icon size={18} />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-semibold leading-tight"
              style={{ color: colors.text }}
            >
              {toast.title}
            </p>
            {toast.message && (
              <p
                className="text-xs mt-1 leading-relaxed"
                style={{ color: colors.textMuted }}
              >
                {toast.message}
              </p>
            )}

            {/* Action button */}
            {toast.action && (
              <button
                onClick={toast.action.onClick}
                className="text-xs font-medium mt-2 px-3 py-1 rounded-md transition-colors cursor-pointer"
                style={{
                  color,
                  backgroundColor: alpha(color, 10),
                  border: `1px solid ${alpha(color, 20)}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = alpha(color, 18)
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = alpha(color, 10)
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={handleExit}
            className="flex-shrink-0 p-0.5 rounded-md transition-colors cursor-pointer"
            style={{ color: alpha(colors.textMuted, 60) }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = alpha(colors.border, 30)
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {!paused && (
        <div
          className="h-0.5 w-full overflow-hidden"
          style={{ backgroundColor: alpha(colors.border, 20) }}
        >
          <div
            className="h-full transition-all ease-linear"
            style={{
              width: `${progress}%`,
              backgroundColor: color,
              transitionDuration: '50ms',
            }}
          />
        </div>
      )}
    </div>
  )
}

// ── Provider ──
export function ToastProvider({ children }: { children: ReactNode }) {
  const { colors, mounted } = useTheme()
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback((toast: Omit<ToastItem, 'id'>): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setToasts((prev) => [...prev, { ...toast, id }])
    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}

      {/* Toast Container - fixed bottom-right */}
      {toasts.length > 0 && (
        <div
          className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2"
          aria-label="Notifications"
        >
          {toasts.map((toast) => (
            <ToastCard
              key={toast.id}
              toast={toast}
              onDismiss={() => removeToast(toast.id)}
              colors={colors}
            />
          ))}
        </div>
      )}

      {/* Toast animation keyframes (injected once) */}
      <style>{`
        @keyframes toast-slide-in {
          from {
            opacity: 0;
            transform: translateX(100%) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        @keyframes toast-slide-out {
          from {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateX(100%) scale(0.95);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes toast-slide-in {
            from { opacity: 1; transform: none; }
            to { opacity: 1; transform: none; }
          }
          @keyframes toast-slide-out {
            from { opacity: 1; transform: none; }
            to { opacity: 1; transform: none; }
          }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

// ── Convenience exports ──
export { ToastContext }
export default ToastProvider
