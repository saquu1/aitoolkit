'use client'

import { BarChart3 } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

interface ComplianceHistoryEntry {
  scanTimestamp: string
  hipaaScore: number
  gdprScore: number
  soxScore: number
  pciScore: number
}

interface ComplianceHistoryChartProps {
  history: ComplianceHistoryEntry[]
  className?: string
}

interface FrameworkConfig {
  key: keyof Pick<ComplianceHistoryEntry, 'hipaaScore' | 'gdprScore' | 'soxScore' | 'pciScore'>
  label: string
  color: string
}

export function ComplianceHistoryChart({
  history,
  className = '',
}: ComplianceHistoryChartProps) {
  const { colors, mounted } = useTheme()

  const alpha = (color: string, opacity: number) =>
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  const frameworks: FrameworkConfig[] = [
    { key: 'hipaaScore', label: 'HIPAA', color: colors.success },
    { key: 'gdprScore', label: 'GDPR', color: colors.primary },
    { key: 'soxScore', label: 'SOX', color: colors.warning },
    { key: 'pciScore', label: 'PCI-DSS', color: colors.textMuted },
  ]

  // Chart dimensions (viewBox-based for responsiveness)
  const chartWidth = 600
  const chartHeight = 260
  const padding = { top: 20, right: 20, bottom: 40, left: 44 }
  const plotWidth = chartWidth - padding.left - padding.right
  const plotHeight = chartHeight - padding.top - padding.bottom

  const yMin = 0
  const yMax = 100
  const yRange = yMax - yMin

  // Build SVG path for each framework line
  const buildLinePath = (key: FrameworkConfig['key']): string => {
    return history
      .map((entry, index) => {
        const x = padding.left + (history.length === 1
          ? plotWidth / 2
          : (index / (history.length - 1)) * plotWidth)
        const y = padding.top + plotHeight - ((entry[key] - yMin) / yRange) * plotHeight
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
      })
      .join(' ')
  }

  // Build area path (line + bottom fill)
  const buildAreaPath = (key: FrameworkConfig['key']): string => {
    const linePath = history.map((entry, index) => {
      const x = padding.left + (history.length === 1
        ? plotWidth / 2
        : (index / (history.length - 1)) * plotWidth)
      const y = padding.top + plotHeight - ((entry[key] - yMin) / yRange) * plotHeight
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    }).join(' ')

    const lastX = padding.left + (history.length === 1
      ? plotWidth / 2
      : ((history.length - 1) / (history.length - 1)) * plotWidth)
    const firstX = padding.left
    const bottomY = padding.top + plotHeight

    return `${linePath} L ${lastX.toFixed(1)} ${bottomY} L ${firstX} ${bottomY} Z`
  }

  // Format timestamp for x-axis labels
  const formatTimestamp = (ts: string): string => {
    try {
      const date = new Date(ts)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }

  // Generate Y-axis labels
  const yLabels = [0, 25, 50, 75, 100]

  // Pick at most 6 x-axis labels evenly spaced
  const getXLabels = () => {
    if (history.length <= 6) return history.map((e) => e.scanTimestamp)
    const step = Math.ceil(history.length / 6)
    return history.filter((_, i) => i % step === 0 || i === history.length - 1)
      .map((e) => e.scanTimestamp)
  }

  // SSR skeleton
  if (!mounted) {
    return (
      <div
        className={`rounded-xl border p-4 glass-card-enhanced ${className}`}
        style={{
          backgroundColor: alpha(colors.card, 50),
          borderColor: colors.border,
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-5 h-5 rounded animate-pulse"
            style={{ backgroundColor: alpha(colors.border, 40) }}
          />
          <div
            className="h-4 w-36 rounded animate-pulse"
            style={{ backgroundColor: alpha(colors.border, 40) }}
          />
        </div>
        <div
          className="h-48 rounded animate-pulse"
          style={{ backgroundColor: alpha(colors.border, 20) }}
        />
      </div>
    )
  }

  // Empty state
  if (!history || history.length === 0) {
    return (
      <div
        className={`rounded-xl border p-4 glass-card-enhanced ${className}`}
        style={{
          backgroundColor: alpha(colors.card, 50),
          borderColor: alpha(colors.border, 80),
        }}
      >
        <h3
          className="text-sm font-semibold mb-4 flex items-center gap-2"
          style={{ color: colors.text }}
        >
          <BarChart3 className="w-4 h-4" style={{ color: colors.primary }} />
          Compliance History
        </h3>
        <div className="history-empty">
          <BarChart3
            className="w-10 h-10 mb-3"
            style={{ color: alpha(colors.textMuted, 40) }}
          />
          <p className="text-sm font-medium" style={{ color: colors.textMuted }}>
            No history data yet
          </p>
          <p className="text-xs mt-1" style={{ color: alpha(colors.textMuted, 60) }}>
            Run a compliance scan to start tracking scores over time.
          </p>
        </div>
      </div>
    )
  }

  const xLabelTimestamps = getXLabels()

  return (
    <div
      className={`rounded-xl border p-4 glass-card-enhanced ${className}`}
      style={{
        backgroundColor: alpha(colors.card, 50),
        borderColor: alpha(colors.border, 80),
      }}
    >
      {/* Title */}
      <h3
        className="text-sm font-semibold mb-4 flex items-center gap-2"
        style={{ color: colors.text }}
      >
        <BarChart3 className="w-4 h-4" style={{ color: colors.primary }} />
        Compliance History
      </h3>

      {/* Chart SVG */}
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {frameworks.map((fw) => (
            <linearGradient
              key={fw.key}
              id={`history-gradient-${fw.key}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={fw.color} stopOpacity="0.15" />
              <stop offset="100%" stopColor={fw.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {/* Y-axis grid lines */}
        {yLabels.map((val) => {
          const y = padding.top + plotHeight - ((val - yMin) / yRange) * plotHeight
          return (
            <g key={`y-grid-${val}`}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + plotWidth}
                y2={y}
                stroke={alpha(colors.border, 40)}
                strokeWidth={0.5}
                strokeDasharray={val === 0 ? 'none' : '4 4'}
              />
              <text
                x={padding.left - 8}
                y={y + 3}
                textAnchor="end"
                fill={colors.textMuted}
                fontSize="9"
                fontFamily="ui-monospace, monospace"
              >
                {val}
              </text>
            </g>
          )
        })}

        {/* X-axis labels */}
        {xLabelTimestamps.map((ts) => {
          const entryIndex = history.findIndex((e) => e.scanTimestamp === ts)
          if (entryIndex < 0) return null
          const x = padding.left + (history.length === 1
            ? plotWidth / 2
            : (entryIndex / (history.length - 1)) * plotWidth)
          const y = padding.top + plotHeight + 18
          return (
            <text
              key={`x-label-${ts}`}
              x={x}
              y={y}
              textAnchor="middle"
              fill={colors.textMuted}
              fontSize="8"
              fontFamily="ui-monospace, monospace"
            >
              {formatTimestamp(ts)}
            </text>
          )
        })}

        {/* Area fills + Lines for each framework */}
        {frameworks.map((fw) => (
          <g key={fw.key}>
            <path
              d={buildAreaPath(fw.key)}
              fill={`url(#history-gradient-${fw.key})`}
            />
            <path
              d={buildLinePath(fw.key)}
              fill="none"
              stroke={fw.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="chart-line-animate"
            />
            {/* End dots */}
            {history.length > 0 && (
              <circle
                cx={
                  padding.left + (history.length === 1
                    ? plotWidth / 2
                    : ((history.length - 1) / (history.length - 1)) * plotWidth)
                }
                cy={
                  padding.top +
                  plotHeight -
                  ((history[history.length - 1][fw.key] - yMin) / yRange) * plotHeight
                }
                r={3}
                fill={fw.color}
                stroke={alpha(colors.card, 80)}
                strokeWidth={1.5}
              />
            )}
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 mt-3 flex-wrap">
        {frameworks.map((fw) => (
          <div key={fw.key} className="flex items-center gap-1.5">
            <span
              className="framework-legend-dot"
              style={{ backgroundColor: fw.color }}
            />
            <span
              className="text-[11px] font-medium"
              style={{ color: colors.textSecondary }}
            >
              {fw.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
