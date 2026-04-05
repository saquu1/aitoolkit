'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AlertTriangle, AlertCircle, Info, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

interface Violation {
  severity: string
  ruleId: string
  title: string
  framework: string
}

interface ComplianceAlertBannerProps {
  /** Array of compliance violations */
  violations: Violation[]
  /** Additional CSS classes */
  className?: string
}

// Severity configuration mapping
const SEVERITY_CONFIG: Record<string, {
  label: string
  icon: typeof AlertTriangle
  colorKey: 'error' | 'warning' | 'primary'
}> = {
  critical: {
    label: 'Critical',
    icon: AlertTriangle,
    colorKey: 'error',
  },
  high: {
    label: 'High',
    icon: AlertCircle,
    colorKey: 'warning',
  },
  medium: {
    label: 'Medium',
    icon: Info,
    colorKey: 'primary',
  },
}

// Order of severity for summary display
const SEVERITY_ORDER = ['critical', 'high', 'medium']

export function ComplianceAlertBanner({
  violations,
  className = '',
}: ComplianceAlertBannerProps) {
  const { colors, mounted } = useTheme()
  const [expanded, setExpanded] = useState(false)
  const [visible, setVisible] = useState(true)
  const [animatingHeight, setAnimatingHeight] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState(0)

  const alpha = (color: string, opacity: number) =>
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  // Measure content height when expanded state changes
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [violations, expanded])

  // Group violations by severity
  const grouped = violations.reduce<Record<string, Violation[]>>((acc, v) => {
    const key = v.severity.toLowerCase()
    if (!acc[key]) acc[key] = []
    acc[key].push(v)
    return acc
  }, {})

  // Get color for a severity
  const getSeverityColor = useCallback(
    (severity: string) => {
      const config = SEVERITY_CONFIG[severity.toLowerCase()]
      if (!config) return colors.textMuted
      return colors[config.colorKey] || colors.textMuted
    },
    [colors]
  )

  // Get icon for a severity
  const getSeverityIcon = useCallback(
    (severity: string) => {
      const config = SEVERITY_CONFIG[severity.toLowerCase()]
      return config?.icon || Info
    },
    []
  )

  // Get framework badge color
  const getFrameworkColor = useCallback(
    (framework: string) => {
      const fw = framework.toUpperCase()
      if (fw === 'HIPAA') return colors.error
      if (fw === 'GDPR') return colors.warning
      if (fw === 'SOX') return colors.primary
      if (fw === 'PCI-DSS' || fw === 'PCI') return colors.success
      return colors.textMuted
    },
    [colors]
  )

  // Build summary string: "6 Critical • 5 High • 1 Medium violations detected"
  const summaryParts = SEVERITY_ORDER.filter((s) => grouped[s]?.length).map(
    (s) => `${grouped[s].length} ${SEVERITY_CONFIG[s]?.label || s}`
  )

  const summaryText =
    violations.length > 0
      ? `${summaryParts.join(' \u2022 ')} violations detected`
      : 'No compliance violations detected'

  // Determine the highest severity for the banner accent
  const highestSeverity = SEVERITY_ORDER.find((s) => grouped[s]?.length) || 'medium'
  const bannerAccentColor = getSeverityColor(highestSeverity)

  // Close handler with animation
  const handleClose = () => {
    setAnimatingHeight(true)
    setExpanded(false)
    // Let collapse animation finish before hiding
    setTimeout(() => {
      setVisible(false)
      setAnimatingHeight(false)
    }, 300)
  }

  // Toggle expand/collapse
  const handleToggle = () => {
    setExpanded((prev) => !prev)
  }

  // SSR skeleton fallback
  if (!mounted) {
    return (
      <div
        className={`rounded-xl border p-4 ${className}`}
        style={{
          backgroundColor: alpha(colors.card, 50),
          borderColor: colors.border,
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-5 h-5 rounded-full animate-pulse"
            style={{ backgroundColor: alpha(colors.border, 40) }}
          />
          <div
            className="h-4 w-64 rounded animate-pulse"
            style={{ backgroundColor: alpha(colors.border, 30) }}
          />
        </div>
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-3 rounded animate-pulse"
              style={{
                backgroundColor: alpha(colors.border, 25),
                width: `${70 - i * 15}%`,
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (!visible) return null

  return (
    <div
      className={`rounded-xl border overflow-hidden glass-card-enhanced content-fade-in ${className}`}
      style={{
        backgroundColor: alpha(colors.card, 50),
        borderColor: alpha(bannerAccentColor, 25),
        maxHeight: animatingHeight
          ? expanded
            ? `${contentHeight + 80}px`
            : '56px'
          : expanded
            ? `${contentHeight + 80}px`
            : undefined,
        transition: 'max-height 300ms ease-out, opacity 200ms ease-out',
      }}
    >
      {/* Summary bar - always visible */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
        onClick={handleToggle}
        role="button"
        aria-expanded={expanded}
        aria-label={`Compliance alerts: ${summaryText}. Click to ${expanded ? 'collapse' : 'expand'}.`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleToggle()
          }
        }}
        style={{
          borderBottom: expanded ? `1px solid ${alpha(colors.border, 40)}` : 'none',
        }}
      >
        {/* Left: severity icons + summary text */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Stacked severity icons */}
          <div className="flex items-center -space-x-1.5 flex-shrink-0">
            {SEVERITY_ORDER.filter((s) => grouped[s]?.length).map((s) => {
              const Icon = getSeverityIcon(s)
              const color = getSeverityColor(s)
              return (
                <div
                  key={s}
                  className="w-6 h-6 rounded-full flex items-center justify-center border-2"
                  style={{
                    backgroundColor: alpha(color, 15),
                    borderColor: alpha(colors.card, 80),
                  }}
                >
                  <Icon className="w-3 h-3" style={{ color }} />
                </div>
              )
            })}
          </div>

          {/* Summary text */}
          <span
            className="text-sm font-medium truncate"
            style={{ color: colors.text }}
          >
            {summaryText}
          </span>
        </div>

        {/* Right: expand/collapse toggle + close */}
        <div className="flex items-center gap-1 flex-shrink-0 ml-3">
          {expanded ? (
            <ChevronUp
              className="w-4 h-4"
              style={{ color: colors.textMuted }}
            />
          ) : (
            <ChevronDown
              className="w-4 h-4"
              style={{ color: colors.textMuted }}
            />
          )}

          {/* Close button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleClose()
            }}
            className="ml-1 w-6 h-6 rounded-md flex items-center justify-center transition-colors"
            style={{
              color: colors.textMuted,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = alpha(colors.border, 30)
              e.currentTarget.style.color = colors.text
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = colors.textMuted
            }}
            aria-label="Dismiss compliance alerts"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded violation details */}
      <div
        ref={contentRef}
        className="overflow-hidden"
        style={{
          maxHeight: expanded ? `${contentHeight}px` : '0px',
          opacity: expanded ? 1 : 0,
          transition: 'max-height 300ms ease-out, opacity 200ms ease-out',
        }}
      >
        <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
          {violations.map((violation, index) => {
            const Icon = getSeverityIcon(violation.severity)
            const sevColor = getSeverityColor(violation.severity)
            const fwColor = getFrameworkColor(violation.framework)

            return (
              <div
                key={`${violation.ruleId}-${index}`}
                className="flex items-start gap-3 p-3 rounded-lg transition-colors"
                style={{
                  backgroundColor: alpha(sevColor, 5),
                  border: `1px solid ${alpha(sevColor, 10)}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = alpha(sevColor, 8)
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = alpha(sevColor, 5)
                }}
              >
                {/* Severity icon */}
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: alpha(sevColor, 15) }}
                >
                  <Icon className="w-3 h-3" style={{ color: sevColor }} />
                </div>

                {/* Violation details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Severity badge */}
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
                      style={{
                        backgroundColor: alpha(sevColor, 15),
                        color: sevColor,
                      }}
                    >
                      {violation.severity}
                    </span>

                    {/* Rule ID (font-mono) */}
                    <span
                      className="font-mono text-[11px] px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: alpha(colors.border, 30),
                        color: colors.textMuted,
                      }}
                    >
                      {violation.ruleId}
                    </span>

                    {/* Framework badge */}
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold"
                      style={{
                        backgroundColor: alpha(fwColor, 12),
                        color: fwColor,
                        border: `1px solid ${alpha(fwColor, 20)}`,
                      }}
                    >
                      {violation.framework}
                    </span>
                  </div>

                  {/* Title */}
                  <p
                    className="text-sm mt-1 leading-snug"
                    style={{ color: colors.textSecondary }}
                  >
                    {violation.title}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
