'use client'

import { type ComponentType } from 'react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { AnimatedCounter } from '@/components/Sparkline'

interface EnhancedStatCardProps {
  title: string
  value: string | number
  icon: ComponentType<{ className?: string; style?: React.CSSProperties }>
  trend?: {
    value: number
    label: string
  }
  progress?: number
  status?: 'active' | 'warning' | 'error' | 'success' | 'idle'
  sparkData?: number[]
  className?: string
}

export function EnhancedStatCard({
  title,
  value,
  icon: Icon,
  trend,
  progress,
  status = 'active',
  sparkData,
  className = '',
}: EnhancedStatCardProps) {
  const { colors, mounted } = useTheme()

  const alpha = (color: string, opacity: number) =>
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  const getStatusColor = () => {
    switch (status) {
      case 'success': return colors.success
      case 'warning': return colors.warning
      case 'error': return colors.error
      case 'idle': return colors.textMuted
      default: return colors.primary
    }
  }

  const statusColor = getStatusColor()
  const trendUp = trend ? trend.value >= 0 : null

  // Build sparkline SVG points
  const renderMiniSparkline = () => {
    if (!sparkData || sparkData.length < 2) return null

    const width = 120
    const height = 32
    const padding = 2
    const chartWidth = width - padding * 2
    const chartHeight = height - padding * 2

    const min = Math.min(...sparkData)
    const max = Math.max(...sparkData)
    const range = max - min || 1

    const points = sparkData.map((val, index) => {
      const x = padding + (index / (sparkData.length - 1)) * chartWidth
      const y = padding + chartHeight - ((val - min) / range) * chartHeight
      return `${x},${y}`
    })

    const polylinePoints = points.join(' ')

    // Area fill
    const areaPoints = `${polylinePoints} ${chartWidth + padding},${height} ${padding},${height}`

    const gradientId = `enhanced-stat-sparkline-${title.replace(/\s+/g, '-').toLowerCase()}`

    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="animate-in fade-in duration-500"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={statusColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={statusColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={areaPoints}
          fill={`url(#${gradientId})`}
        />
        <polyline
          points={polylinePoints}
          fill="none"
          stroke={statusColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={padding + ((sparkData.length - 1) / (sparkData.length - 1)) * chartWidth}
          cy={padding + chartHeight - ((sparkData[sparkData.length - 1] - min) / range) * chartHeight}
          r={2.5}
          fill={statusColor}
          className="animate-in fade-in duration-700 delay-200"
        />
      </svg>
    )
  }

  // Skeleton placeholder for SSR
  if (!mounted) {
    return (
      <div
        className={`rounded-xl border p-5 glass-card-enhanced ${className}`}
        style={{
          backgroundColor: alpha(colors.card, 50),
          borderColor: colors.border,
        }}
      >
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-12 h-12 rounded-xl animate-pulse"
            style={{ backgroundColor: alpha(colors.border, 40) }}
          />
          <div className="flex-1 space-y-2">
            <div
              className="h-3 w-20 rounded animate-pulse"
              style={{ backgroundColor: alpha(colors.border, 40) }}
            />
            <div
              className="h-7 w-28 rounded animate-pulse"
              style={{ backgroundColor: alpha(colors.border, 30) }}
            />
          </div>
        </div>
        <div
          className="h-2 w-full rounded-full animate-pulse"
          style={{ backgroundColor: alpha(colors.border, 30) }}
        />
      </div>
    )
  }

  return (
    <div
      className={`rounded-xl border p-5 glass-card-enhanced card-interactive transition-all duration-300 group ${className}`}
      style={{
        backgroundColor: alpha(colors.card, 50),
        borderColor: alpha(colors.border, 80),
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = alpha(statusColor, 40)
        e.currentTarget.style.boxShadow = `0 0 20px ${alpha(statusColor, 10)}`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = alpha(colors.border, 80)
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Icon + Title + Trend row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Colored icon circle */}
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
            style={{ backgroundColor: alpha(statusColor, 14) }}
          >
            <Icon className="w-5 h-5" style={{ color: statusColor }} />
          </div>

          {/* Title + Value */}
          <div className="flex-1 min-w-0">
            <p
              className="text-xs font-medium truncate"
              style={{ color: colors.textMuted }}
            >
              {title}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {typeof value === 'number' ? (
                <AnimatedCounter
                  value={value}
                  className="text-2xl font-bold tabular-nums"
                  style={{ color: colors.text }}
                />
              ) : (
                <span
                  className="text-2xl font-bold tabular-nums"
                  style={{ color: colors.text }}
                >
                  {value}
                </span>
              )}

              {/* Trend indicator */}
              {trend && (
                <div className="flex items-center gap-0.5">
                  {trendUp !== null && (
                    trendUp ? (
                      <ArrowUpRight className="w-3.5 h-3.5" style={{ color: colors.success }} />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5" style={{ color: colors.error }} />
                    )
                  )}
                  <span
                    className="text-[11px] font-semibold font-mono"
                    style={{
                      color: trendUp ? colors.success : colors.error,
                    }}
                  >
                    {trendUp ? '+' : ''}{trend.value}%
                  </span>
                </div>
              )}
            </div>

            {/* Trend label */}
            {trend && (
              <p className="text-[10px] mt-0.5" style={{ color: colors.textMuted }}>
                {trend.label}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Mini Sparkline */}
      {sparkData && sparkData.length >= 2 && (
        <div className="mb-3 flex justify-end opacity-70 group-hover:opacity-100 transition-opacity">
          {renderMiniSparkline()}
        </div>
      )}

      {/* Progress Bar */}
      {progress !== undefined && (
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium" style={{ color: colors.textMuted }}>
              Progress
            </span>
            <span className="text-[10px] font-bold font-mono" style={{ color: statusColor }}>
              {Math.round(progress)}%
            </span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: alpha(colors.border, 50) }}
          >
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${Math.min(100, Math.max(0, progress))}%`,
                backgroundColor: statusColor,
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
