'use client'

import { useMemo } from 'react'
import { useTheme } from '@/hooks/useTheme'

interface AreaChartProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  fillOpacity?: number
  showDots?: boolean
  showGrid?: boolean
  showLabels?: boolean
  animate?: boolean
  className?: string
}

export function AreaChart({
  data,
  width = 300,
  height = 120,
  color,
  fillOpacity = 0.15,
  showDots = false,
  showGrid = true,
  showLabels = false,
  animate = true,
  className = '',
}: AreaChartProps) {
  const { colors } = useTheme()

  const chartColor = color ?? colors.primary

  const padding = useMemo(() => ({
    top: 8,
    right: showLabels ? 36 : 8,
    bottom: 8,
    left: showLabels ? 36 : 8,
  }), [showLabels])

  const chartWidth = width
  const chartHeight = height
  const plotWidth = chartWidth - padding.left - padding.right
  const plotHeight = chartHeight - padding.top - padding.bottom

  const minVal = useMemo(() => Math.min(...data), [data])
  const maxVal = useMemo(() => Math.max(...data), [data])
  const range = maxVal - minVal || 1

  // Build points for the curve
  const points = useMemo(() => {
    if (data.length === 0) return []
    return data.map((val, i) => ({
      x: padding.left + (data.length > 1 ? (i / (data.length - 1)) * plotWidth : plotWidth / 2),
      y: padding.top + plotHeight - ((val - minVal) / range) * plotHeight,
    }))
  }, [data, padding.left, padding.top, plotWidth, plotHeight, minVal, range])

  // Smooth cubic bezier path
  const linePath = useMemo(() => {
    if (points.length === 0) return ''
    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y}`
    }

    let d = `M ${points[0].x} ${points[0].y}`

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[Math.min(points.length - 1, i + 2)]

      // Catmull-Rom to cubic bezier control points
      const tension = 0.3
      const cp1x = p1.x + (p2.x - p0.x) * tension
      const cp1y = p1.y + (p2.y - p0.y) * tension
      const cp2x = p2.x - (p3.x - p1.x) * tension
      const cp2y = p2.y - (p3.y - p1.y) * tension

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
    }

    return d
  }, [points])

  // Area path (same curve but closed at the bottom)
  const areaPath = useMemo(() => {
    if (points.length === 0) return ''
    const baseline = padding.top + plotHeight
    return `${linePath} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`
  }, [linePath, points, padding.top, plotHeight])

  // Estimate total path length for animation
  const estimatedPathLength = useMemo(() => {
    if (points.length < 2) return 100
    let len = 0
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x
      const dy = points[i].y - points[i - 1].y
      len += Math.sqrt(dx * dx + dy * dy)
    }
    return len * 1.3 // Approximate for curves
  }, [points])

  // Grid lines Y positions
  const gridLines = useMemo(() => {
    const lines: { y: number; label: string }[] = []
    for (let i = 0; i <= 3; i++) {
      const y = padding.top + (plotHeight / 3) * i
      const val = maxVal - (range / 3) * i
      lines.push({
        y,
        label: Math.round(val).toString(),
      })
    }
    return lines
  }, [padding.top, plotHeight, maxVal, range])

  const gradientId = useMemo(
    () => `area-gradient-${Math.random().toString(36).slice(2, 9)}`,
    [chartColor, fillOpacity]
  )

  if (data.length === 0) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={className}
      />
    )
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={chartColor} stopOpacity={fillOpacity} />
          <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
        </linearGradient>
        {animate && (
          <style>{`
            @keyframes area-draw-${gradientId} {
              from { stroke-dashoffset: ${estimatedPathLength}; }
              to { stroke-dashoffset: 0; }
            }
            @keyframes area-fade-${gradientId} {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            .area-line-${gradientId} {
              stroke-dasharray: ${estimatedPathLength};
              stroke-dashoffset: ${estimatedPathLength};
              animation: area-draw-${gradientId} 1.2s ease-out forwards;
            }
            .area-fill-${gradientId} {
              opacity: 0;
              animation: area-fade-${gradientId} 0.8s ease-out 0.6s forwards;
            }
            .area-dot-${gradientId} {
              opacity: 0;
              animation: area-fade-${gradientId} 0.4s ease-out forwards;
            }
          `}</style>
        )}
      </defs>

      {/* Grid lines */}
      {showGrid && gridLines.map((line, i) => (
        <line
          key={`grid-${i}`}
          x1={padding.left}
          y1={line.y}
          x2={chartWidth - padding.right}
          y2={line.y}
          stroke={colors.border}
          strokeWidth={1}
          strokeOpacity={0.4}
          strokeDasharray="3 3"
        />
      ))}

      {/* Y-axis labels */}
      {showLabels && gridLines.map((line, i) => (
        <text
          key={`label-${i}`}
          x={padding.left - 6}
          y={line.y + 3}
          textAnchor="end"
          fontSize="9"
          fontFamily="ui-monospace, monospace"
          fill={colors.textMuted}
        >
          {line.label}
        </text>
      ))}

      {/* Area fill */}
      <path
        d={areaPath}
        fill={`url(#${gradientId})`}
        className={animate ? `area-fill-${gradientId}` : undefined}
      />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={chartColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={animate ? `area-line-${gradientId}` : undefined}
      />

      {/* Dots */}
      {showDots && points.map((p, i) => (
        <circle
          key={`dot-${i}`}
          cx={p.x}
          cy={p.y}
          r={3}
          fill={chartColor}
          stroke={colors.card}
          strokeWidth={1.5}
          className={animate ? `area-dot-${gradientId}` : undefined}
          style={animate ? { animationDelay: `${0.6 + i * 0.05}s` } : undefined}
        />
      ))}
    </svg>
  )
}
