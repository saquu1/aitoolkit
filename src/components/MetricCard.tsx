'use client'

import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { AnimatedCounter, Sparkline } from '@/components/Sparkline'

interface MetricCardProps {
  title: string
  value: string | number
  icon?: LucideIcon
  iconColor?: string
  trend?: {
    value: number
    label?: string
  }
  sparklineData?: number[]
  subtitle?: string
  onClick?: () => void
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  iconColor,
  trend,
  sparklineData,
  subtitle,
  onClick,
}: MetricCardProps) {
  const { colors } = useTheme()
  const alpha = (color: string, opacity: number) =>
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  const resolvedIconColor = iconColor || colors.primary

  const isPositive = trend && trend.value > 0
  const isNegative = trend && trend.value < 0
  const isNumber = typeof value === 'number'

  return (
    <div
      className="relative rounded-xl p-4 transition-all duration-200 hover-lift cursor-pointer"
      style={{
        backgroundColor: colors.card,
        border: `1px solid ${colors.border}`,
        boxShadow: `0 1px 3px 0 ${alpha(colors.border, 40)}`,
      }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Header: Icon + Title */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: colors.textMuted }}
          >
            {title}
          </span>
          <div className="flex items-baseline gap-2">
            {isNumber ? (
              <span
                className="text-2xl font-bold tracking-tight"
                style={{ color: colors.text }}
              >
                <AnimatedCounter value={value} duration={800} />
              </span>
            ) : (
              <span
                className="text-2xl font-bold tracking-tight"
                style={{ color: colors.text }}
              >
                {value}
              </span>
            )}
          </div>
          {subtitle && (
            <span
              className="text-xs mt-0.5"
              style={{ color: colors.textMuted }}
            >
              {subtitle}
            </span>
          )}
        </div>

        {Icon && (
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{
              backgroundColor: alpha(resolvedIconColor, 12),
            }}
          >
            <Icon size={20} style={{ color: resolvedIconColor }} />
          </div>
        )}
      </div>

      {/* Trend Indicator */}
      {trend && (
        <div className="flex items-center gap-1.5 mt-3">
          {isPositive ? (
            <TrendingUp size={14} style={{ color: colors.success }} />
          ) : isNegative ? (
            <TrendingDown size={14} style={{ color: colors.error }} />
          ) : null}
          <span
            className="text-xs font-medium"
            style={{
              color: isPositive
                ? colors.success
                : isNegative
                  ? colors.error
                  : colors.textMuted,
            }}
          >
            {isPositive ? '+' : ''}{trend.value}%
          </span>
          {trend.label && (
            <span
              className="text-xs"
              style={{ color: colors.textMuted }}
            >
              {trend.label}
            </span>
          )}
        </div>
      )}

      {/* Sparkline */}
      {sparklineData && sparklineData.length >= 2 && (
        <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${alpha(colors.border, 60)}` }}>
          <Sparkline
            data={sparklineData}
            width={200}
            height={32}
            color={resolvedIconColor}
            showArea
            animate
            strokeWidth={1.5}
          />
        </div>
      )}
    </div>
  )
}
