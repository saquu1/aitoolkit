'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/hooks/useTheme'

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  showArea?: boolean
  animate?: boolean
  strokeWidth?: number
}

export function Sparkline({ 
  data, 
  width = 120, 
  height = 32, 
  color,
  showArea = true,
  animate = true,
  strokeWidth = 2
}: SparklineProps) {
  const { colors } = useTheme()
  const strokeColor = color || colors.primary

  if (!data || data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const padding = 2
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth
    const y = padding + chartHeight - ((value - min) / range) * chartHeight
    return { x, y }
  })

  const pathData = points.map((point, index) => 
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ')

  const areaPathData = `
    ${pathData}
    L ${points[points.length - 1].x} ${height}
    L ${points[0].x} ${height}
    Z
  `

  // Compute gradient IDs uniquely per color
  const gradientId = `sparkline-gradient-${strokeColor.replace('#', '')}`

  return (
    <svg 
      width={width} 
      height={height} 
      viewBox={`0 0 ${width} ${height}`}
      className={animate ? 'animate-in fade-in duration-500' : ''}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {showArea && (
        <path 
          d={areaPathData} 
          fill={`url(#${gradientId})`}
        />
      )}
      
      <path 
        d={pathData} 
        fill="none" 
        stroke={strokeColor} 
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* End dot */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={2.5}
        fill={strokeColor}
        className={animate ? 'animate-in fade-in duration-700 delay-300' : ''}
      />
    </svg>
  )
}

// Mini bar chart for small data display
interface MiniBarChartProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  maxValue?: number
}

export function MiniBarChart({ 
  data, 
  width = 120, 
  height = 32, 
  color,
  maxValue 
}: MiniBarChartProps) {
  const { colors } = useTheme()
  const barColor = color || colors.primary

  if (!data || data.length === 0) return null

  const max = maxValue || Math.max(...data)
  const range = max || 1
  const barWidth = Math.max(3, (width / data.length) - 2)
  const gap = 2

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="animate-in fade-in duration-500">
      {data.map((value, index) => {
        const barHeight = (value / range) * (height - 4)
        const x = index * (barWidth + gap)
        const y = height - barHeight - 2
        return (
          <rect
            key={index}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            rx={1.5}
            fill={barColor}
            opacity={0.5 + (value / range) * 0.5}
            className="animate-in fade-in slide-in-from-bottom"
            style={{ animationDelay: `${index * 50}ms`, animationDuration: '300ms' }}
          />
        )
      })}
    </svg>
  )
}

// Animated counter component
interface AnimatedCounterProps {
  value: number
  duration?: number
  className?: string
  style?: React.CSSProperties
}

export function AnimatedCounter({ value, duration = 1000, className, style }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let start = 0
    const end = value
    const startTime = Date.now()
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(start + (end - start) * eased)
      setDisplayValue(current)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
  }, [value, duration])

  return (
    <span className={className} style={style}>
      {displayValue.toLocaleString()}
    </span>
  )
}


