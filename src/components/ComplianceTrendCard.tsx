'use client'

import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

type ComplianceStatus = 'active' | 'partial' | 'inactive'

interface ComplianceTrendCardProps {
  title: string
  currentScore: number
  previousScore: number
  history: number[]
  status: ComplianceStatus
  className?: string
}

export function ComplianceTrendCard({
  title,
  currentScore,
  previousScore,
  history,
  status,
  className = '',
}: ComplianceTrendCardProps) {
  const { colors, mounted } = useTheme()

  const alpha = (color: string, opacity: number) =>
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  const getStatusColor = (): string => {
    switch (status) {
      case 'active':
        return colors.success
      case 'partial':
        return colors.warning
      case 'inactive':
        return colors.textMuted
      default:
        return colors.textMuted
    }
  }

  const statusColor = getStatusColor()
  const change = currentScore - previousScore
  const changePercent = previousScore !== 0
    ? Math.round((change / previousScore) * 100)
    : 0

  const trendDirection = change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
  const trendColor = trendDirection === 'up'
    ? colors.success
    : trendDirection === 'down'
      ? colors.error
      : colors.textMuted

  // Build mini sparkline SVG
  const renderSparkline = () => {
    if (!history || history.length < 2) return null

    const width = 140
    const height = 36
    const padding = 3
    const chartWidth = width - padding * 2
    const chartHeight = height - padding * 2

    const min = Math.min(...history)
    const max = Math.max(...history)
    const range = max - min || 1

    const points = history.map((val, index) => {
      const x = padding + (index / (history.length - 1)) * chartWidth
      const y = padding + chartHeight - ((val - min) / range) * chartHeight
      return `${x},${y}`
    })

    const polylinePoints = points.join(' ')

    // Area fill beneath the sparkline
    const areaPoints = `${polylinePoints} ${padding + chartWidth},${height} ${padding},${height}`

    const gradientId = `compliance-trend-${title.replace(/\s+/g, '-').toLowerCase()}`

    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={statusColor} stopOpacity="0.2" />
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
          className="chart-line-animate"
        />
        <circle
          cx={padding + ((history.length - 1) / (history.length - 1)) * chartWidth}
          cy={padding + chartHeight - ((history[history.length - 1] - min) / range) * chartHeight}
          r={2.5}
          fill={statusColor}
        />
      </svg>
    )
  }

  // SSR skeleton placeholder
  if (!mounted) {
    return (
      <div
        className={`compliance-trend-card glass-card-enhanced ${className}`}
        style={{
          backgroundColor: alpha(colors.card, 50),
          borderColor: colors.border,
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div
            className="h-3 w-24 rounded animate-pulse"
            style={{ backgroundColor: alpha(colors.border, 40) }}
          />
          <div
            className="h-5 w-12 rounded-full animate-pulse"
            style={{ backgroundColor: alpha(colors.border, 30) }}
          />
        </div>
        <div className="flex items-end gap-2 mb-3">
          <div
            className="h-8 w-16 rounded animate-pulse"
            style={{ backgroundColor: alpha(colors.border, 30) }}
          />
          <div
            className="h-4 w-20 rounded animate-pulse mb-1"
            style={{ backgroundColor: alpha(colors.border, 25) }}
          />
        </div>
        <div
          className="h-8 rounded animate-pulse"
          style={{ backgroundColor: alpha(colors.border, 20) }}
        />
      </div>
    )
  }

  return (
    <div
      className={`compliance-trend-card glass-card-enhanced ${className}`}
      style={{
        backgroundColor: alpha(colors.card, 50),
        borderColor: alpha(colors.border, 80),
      }}
    >
      {/* Header: Title + Status Badge */}
      <div className="flex items-center justify-between mb-2">
        <h4
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: colors.textMuted }}
        >
          {title}
        </h4>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: alpha(statusColor, 14),
            color: statusColor,
          }}
        >
          {status}
        </span>
      </div>

      {/* Score + Trend */}
      <div className="flex items-end gap-3 mb-2">
        <span
          className="text-3xl font-bold tabular-nums score-animate"
          style={{ color: colors.text }}
        >
          {currentScore}
        </span>
        <div className="flex items-center gap-1 pb-0.5">
          {trendDirection === 'up' && (
            <ArrowUpRight className="w-3.5 h-3.5" style={{ color: trendColor }} />
          )}
          {trendDirection === 'down' && (
            <ArrowDownRight className="w-3.5 h-3.5" style={{ color: trendColor }} />
          )}
          {trendDirection === 'stable' && (
            <Minus className="w-3.5 h-3.5" style={{ color: trendColor }} />
          )}
          <span
            className="text-xs font-semibold font-mono"
            style={{ color: trendColor }}
          >
            {trendDirection === 'up' ? '+' : ''}{changePercent}%
          </span>
          <span
            className="text-[10px]"
            style={{ color: colors.textMuted }}
          >
            vs prev
          </span>
        </div>
      </div>

      {/* Mini Sparkline */}
      <div className="mt-auto pt-1">
        {renderSparkline()}
      </div>
    </div>
  )
}
