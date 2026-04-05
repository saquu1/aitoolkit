'use client'

import { useTheme } from '@/hooks/useTheme'

type StatusType = 'success' | 'warning' | 'error' | 'info' | 'running' | 'pending' | 'idle'

interface StatusBadgeProps {
  status: StatusType
  label?: string
  size?: 'sm' | 'md'
  pulse?: boolean
  dotOnly?: boolean
}

const STATUS_COLORS: Record<StatusType, { dot: string; label: string }> = {
  success: { dot: 'success', label: 'success' },
  warning: { dot: 'warning', label: 'warning' },
  error: { dot: 'error', label: 'error' },
  info: { dot: 'primary', label: 'primary' },
  running: { dot: 'primary', label: 'primary' },
  pending: { dot: 'textMuted', label: 'textMuted' },
  idle: { dot: 'textMuted', label: 'textMuted' },
}

const DEFAULT_LABELS: Record<StatusType, string> = {
  success: 'Success',
  warning: 'Warning',
  error: 'Error',
  info: 'Info',
  running: 'Running',
  pending: 'Pending',
  idle: 'Idle',
}

export function StatusBadge({
  status,
  label,
  size = 'md',
  pulse = false,
  dotOnly = false,
}: StatusBadgeProps) {
  const { colors } = useTheme()
  const alpha = (color: string, opacity: number) =>
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  const config = STATUS_COLORS[status]
  const dotColor = colors[config.dot as keyof typeof colors] || colors.textMuted
  const displayLabel = label || DEFAULT_LABELS[status]

  const isRunning = status === 'running'
  const shouldPulse = pulse || isRunning

  const sizeClasses = size === 'sm'
    ? 'text-[10px]'
    : 'text-xs'

  const dotSize = size === 'sm'
    ? 'w-1.5 h-1.5'
    : 'w-2 h-2'

  if (dotOnly) {
    return (
      <span className="relative inline-flex items-center justify-center">
        <span
          className={`${dotSize} rounded-full inline-block ${shouldPulse ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: dotColor }}
        />
        {shouldPulse && (
          <span
            className="absolute inline-flex rounded-full opacity-40 animate-ping"
            style={{
              backgroundColor: dotColor,
              width: size === 'sm' ? 6 : 8,
              height: size === 'sm' ? 6 : 8,
            }}
          />
        )}
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium ${sizeClasses}`}
      style={{
        backgroundColor: alpha(dotColor, 12),
        color: dotColor,
        border: `1px solid ${alpha(dotColor, 20)}`,
      }}
    >
      <span className="relative inline-flex items-center justify-center">
        <span
          className={`${dotSize} rounded-full inline-block ${shouldPulse ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: dotColor }}
        />
        {shouldPulse && (
          <span
            className="absolute inline-flex rounded-full opacity-40 animate-ping"
            style={{
              backgroundColor: dotColor,
              width: size === 'sm' ? 6 : 8,
              height: size === 'sm' ? 6 : 8,
            }}
          />
        )}
      </span>
      {displayLabel}
    </span>
  )
}
