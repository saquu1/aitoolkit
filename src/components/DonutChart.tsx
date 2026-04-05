'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTheme } from '@/hooks/useTheme'

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface DonutSegment {
  value: number
  color: string
  label: string
}

interface DonutChartProps {
  segments: DonutSegment[]
  size?: number
  strokeWidth?: number
  showLabels?: boolean
  centerLabel?: string
  centerValue?: string | number
  animate?: boolean
}

interface ArcData {
  color: string
  label: string
  value: number
  percentage: number
  strokeDasharray: string
  strokeDashoffset: number
  rotation: number
}

// ═══════════════════════════════════════════════════════════════════════════
// DonutChart Component
// ═══════════════════════════════════════════════════════════════════════════

export default function DonutChart({
  segments,
  size = 120,
  strokeWidth = 14,
  showLabels = true,
  centerLabel,
  centerValue,
  animate = true,
}: DonutChartProps) {
  const { colors, mounted } = useTheme()
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [animationProgress, setAnimationProgress] = useState(animate ? 0 : 1)

  // Animation on mount
  useEffect(() => {
    if (!animate) return
    setAnimationProgress(0)
    const timer = setTimeout(() => setAnimationProgress(1), 50)
    return () => clearTimeout(timer)
  }, [animate])

  // Computed values
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const gapSize = 2 // 2px gap between segments
  const totalValue = useMemo(
    () => segments.reduce((sum, s) => sum + s.value, 0),
    [segments],
  )

  // Build arc data for each segment
  const arcs: ArcData[] = useMemo(() => {
    if (totalValue === 0) return []

    const segmentGap = segments.length > 1 ? gapSize : 0
    const totalGap = segmentGap * segments.length
    const availableCircumference = circumference - totalGap

    let currentOffset = 0

    return segments
      .filter((s) => s.value > 0)
      .map((segment) => {
        const percentage = segment.value / totalValue
        const arcLength = availableCircumference * percentage
        const dashArray = `${arcLength} ${circumference - arcLength}`
        const dashOffset = -currentOffset

        const arc: ArcData = {
          color: segment.color,
          label: segment.label,
          value: segment.value,
          percentage,
          strokeDasharray: dashArray,
          strokeDashoffset: dashOffset,
          rotation: 0,
        }

        currentOffset += arcLength + segmentGap

        return arc
      })
  }, [segments, totalValue, circumference])

  // Center position
  const center = size / 2

  // Format percentage for display
  const formatPercent = useCallback((pct: number) => {
    return `${Math.round(pct * 100)}%`
  }, [])

  // Empty state
  if (totalValue === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="opacity-30"
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={mounted ? colors.border : '#334155'}
            strokeWidth={strokeWidth}
            strokeDasharray={`4 ${circumference - 4}`}
          />
        </svg>
        <span
          className="text-xs font-medium absolute"
          style={{ color: mounted ? colors.textMuted : '#94a3b8' }}
        >
          No data
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* SVG Donut */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
          style={
            animate
              ? { transition: 'opacity 0.3s ease-in' }
              : undefined
          }
        >
          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={mounted ? colors.border : '#334155'}
            strokeWidth={strokeWidth}
            opacity={0.3}
          />

          {/* Segments */}
          {arcs.map((arc, i) => {
            const isHovered = hoveredIndex === i
            const currentDasharray = arc.strokeDasharray.split(' ')[0]
            const animatedLength =
              parseFloat(currentDasharray) * animationProgress

            return (
              <circle
                key={`${arc.label}-${i}`}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={arc.color}
                strokeWidth={isHovered ? strokeWidth + 3 : strokeWidth}
                strokeDasharray={`${animatedLength} ${circumference}`}
                strokeDashoffset={arc.strokeDashoffset}
                strokeLinecap="round"
                style={{
                  transition: animate
                    ? 'stroke-dasharray 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke-width 0.2s ease, opacity 0.2s ease'
                    : 'stroke-width 0.2s ease, opacity 0.2s ease',
                  cursor: 'pointer',
                  opacity: hoveredIndex !== null && !isHovered ? 0.6 : 1,
                }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            )
          })}
        </svg>

        {/* Center text */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          style={{ transform: 'rotate(0deg)' }}
        >
          {centerLabel && (
            <span
              className="text-[10px] font-medium uppercase tracking-wider leading-none"
              style={{ color: mounted ? colors.textMuted : '#94a3b8' }}
            >
              {centerLabel}
            </span>
          )}
          {centerValue !== undefined && (
            <span
              className="text-lg font-bold leading-tight mt-0.5"
              style={{ color: mounted ? colors.text : '#f8fafc' }}
            >
              {centerValue}
            </span>
          )}
        </div>

        {/* Tooltip */}
        {hoveredIndex !== null && arcs[hoveredIndex] && (
          <div
            className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap z-50 pointer-events-none"
            style={{
              backgroundColor: mounted ? colors.card : '#1e293b',
              color: mounted ? colors.text : '#f8fafc',
              border: `1px solid ${mounted ? colors.border : '#334155'}`,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              animation: 'fade-scale-in 0.15s ease-out',
            }}
          >
            <span className="font-bold">{arcs[hoveredIndex].label}</span>
            <span className="mx-1.5 opacity-50">|</span>
            <span>{arcs[hoveredIndex].value}</span>
            <span className="mx-1.5 opacity-50">|</span>
            <span style={{ color: arcs[hoveredIndex].color }}>
              {formatPercent(arcs[hoveredIndex].percentage)}
            </span>
          </div>
        )}
      </div>

      {/* Legend */}
      {showLabels && arcs.length > 0 && (
        <div
          className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1"
          style={{ maxWidth: size + 60 }}
        >
          {arcs.map((arc, i) => (
            <button
              key={`${arc.label}-legend-${i}`}
              className="flex items-center gap-1.5 text-xs transition-opacity duration-150 cursor-default"
              style={{
                opacity: hoveredIndex !== null && hoveredIndex !== i ? 0.5 : 1,
                color: mounted ? colors.textSecondary : '#cbd5e1',
              }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              type="button"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: arc.color }}
              />
              <span className="truncate max-w-[100px]">{arc.label}</span>
              <span
                className="font-medium tabular-nums"
                style={{ color: mounted ? colors.textMuted : '#94a3b8' }}
              >
                {formatPercent(arc.percentage)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
