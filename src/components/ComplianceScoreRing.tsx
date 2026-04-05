'use client'

import { useState, useEffect, useRef } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { AnimatedCounter } from '@/components/Sparkline'

interface ComplianceScoreRingProps {
  /** Score value from 0 to 100 */
  score: number
  /** Label displayed below the score */
  label: string
  /** Diameter of the ring in pixels */
  size?: number
  /** Stroke width of the ring arc */
  strokeWidth?: number
  /** Compliance status determining color */
  status?: 'active' | 'partial' | 'inactive'
  /** Additional CSS classes */
  className?: string
}

export function ComplianceScoreRing({
  score,
  label,
  size = 120,
  strokeWidth = 8,
  status = 'active',
  className = '',
}: ComplianceScoreRingProps) {
  const { colors, mounted } = useTheme()
  const [animated, setAnimated] = useState(false)
  const ringRef = useRef<HTMLDivElement>(null)

  const alpha = (color: string, opacity: number) =>
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  // Trigger drawing animation after mount
  useEffect(() => {
    if (mounted) {
      const timer = setTimeout(() => setAnimated(true), 100)
      return () => clearTimeout(timer)
    }
  }, [mounted])

  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return colors.success
      case 'partial':
        return colors.warning
      case 'inactive':
        return colors.textMuted
      default:
        return colors.success
    }
  }

  const statusColor = getStatusColor()

  // SVG ring calculations
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clampedScore = Math.min(100, Math.max(0, score))
  const dashOffset = animated ? circumference * (1 - clampedScore / 100) : circumference
  const center = size / 2

  // Determine status text
  const statusLabel = status === 'active' ? 'Compliant' : status === 'partial' ? 'Partial' : 'Inactive'

  // SSR skeleton fallback
  if (!mounted) {
    return (
      <div
        className={`flex flex-col items-center justify-center ${className}`}
        style={{ width: size, height: size }}
        role="status"
        aria-label={`Loading ${label} compliance score`}
      >
        <div
          className="w-full h-full rounded-full animate-pulse"
          style={{
            backgroundColor: alpha(colors.border, 30),
            border: `${strokeWidth}px solid ${alpha(colors.border, 50)}`,
          }}
        />
      </div>
    )
  }

  return (
    <div
      ref={ringRef}
      className={`relative flex flex-col items-center justify-center group ${className}`}
      style={{ width: size }}
      role="meter"
      aria-valuenow={clampedScore}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${label}: ${clampedScore}% compliance score - ${statusLabel}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        <defs>
          {/* Glow filter for hover effect */}
          <filter id={`glow-${label.replace(/\s+/g, '-').toLowerCase()}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Gradient for the progress arc */}
          <linearGradient
            id={`ring-gradient-${label.replace(/\s+/g, '-').toLowerCase()}`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor={statusColor} />
            <stop offset="100%" stopColor={alpha(statusColor, 70)} />
          </linearGradient>
        </defs>

        {/* Background track circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={alpha(colors.border, 40)}
          strokeWidth={strokeWidth}
        />

        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#ring-gradient-${label.replace(/\s+/g, '-').toLowerCase()})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />

        {/* Glow pulse overlay on hover (via CSS animation) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={statusColor}
          strokeWidth={strokeWidth + 2}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset] duration-1000 ease-out opacity-0 group-hover:opacity-100"
          style={{
            animation: 'ring-pulse 2s ease-in-out infinite',
            filter: `blur(4px)`,
          }}
        />
      </svg>

      {/* Center content: score number + label */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ transform: 'none' }}
      >
        {/* Score number */}
        <div className="flex items-baseline gap-0.5">
          <AnimatedCounter
            value={clampedScore}
            className="font-bold tabular-nums leading-none"
            style={{
              color: statusColor,
              fontSize: `${Math.round(size * 0.24)}px`,
            }}
          />
          <span
            className="font-medium leading-none"
            style={{
              color: alpha(colors.textMuted, 70),
              fontSize: `${Math.round(size * 0.1)}px`,
            }}
          >
            %
          </span>
        </div>

        {/* Label */}
        <span
          className="font-medium text-center leading-tight mt-1"
          style={{
            color: colors.textMuted,
            fontSize: `${Math.max(10, Math.round(size * 0.1))}px`,
          }}
        >
          {label}
        </span>

        {/* Status indicator dot */}
        <div className="flex items-center gap-1 mt-1">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: statusColor,
              boxShadow: status !== 'inactive'
                ? `0 0 6px ${alpha(statusColor, 60)}`
                : 'none',
            }}
          />
          <span
            className="font-medium"
            style={{
              color: alpha(colors.textMuted, 70),
              fontSize: `${Math.max(8, Math.round(size * 0.07))}px`,
            }}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Inline keyframe for pulse animation */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ring-pulse {
          0%, 100% { opacity: 0; }
          50% { opacity: 0.4; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes ring-pulse {
            0%, 100% { opacity: 0; }
          }
        }
      `}} />
    </div>
  )
}
