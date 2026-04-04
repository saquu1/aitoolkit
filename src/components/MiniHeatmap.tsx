'use client'

import { useMemo } from 'react'
import { useTheme } from '@/hooks/useTheme'

interface MiniHeatmapProps {
  /** 2D array of values (rows x columns), e.g. 7 rows (days) x 24 columns (hours) */
  data: number[][]
  /** Size of each cell in pixels */
  cellSize?: number
  /** Gap between cells in pixels */
  gap?: number
  /** Color scale array from 0 (empty) to max */
  colorScale?: string[]
  /** Show day/hour labels */
  showLabels?: boolean
  /** Maximum value for color scaling (auto-detected if not provided) */
  maxValue?: number
  /** Show value on hover via CSS tooltip */
  tooltip?: boolean
  /** Optional title */
  title?: string
  /** Additional CSS class */
  className?: string
}

export default function MiniHeatmap({
  data,
  cellSize = 12,
  gap = 2,
  colorScale,
  showLabels = false,
  maxValue: maxValueProp,
  tooltip = true,
  title,
  className = '',
}: MiniHeatmapProps) {
  const { colors, mounted } = useTheme()

  const maxValue = useMemo(() => {
    if (maxValueProp !== undefined) return maxValueProp
    let max = 0
    for (const row of data) {
      for (const val of row) {
        if (val > max) max = val
      }
    }
    return max || 1
  }, [data, maxValueProp])

  const scale = useMemo(() => {
    if (colorScale) return colorScale
    const s = colors.success
    return [
      'transparent',
      s + '33', // 20% opacity
      s + '66', // 40% opacity
      s + '99', // 60% opacity
      s + 'cc', // 80% opacity
      s,        // full
    ]
  }, [colorScale, colors.success])

  const getColor = (value: number): string => {
    if (value === 0) return scale[0] // transparent
    const ratio = Math.min(value / maxValue, 1)
    const idx = ratio * (scale.length - 1)
    const lower = Math.floor(idx)
    const upper = Math.min(lower + 1, scale.length - 1)
    if (lower === upper) return scale[lower]
    return scale[upper]
  }

  const labelSize = cellSize
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const hourLabels = (() => {
    const cols = data[0]?.length ?? 0
    const labels: string[] = []
    for (let i = 0; i < cols; i++) {
      labels.push(i.toString())
    }
    return labels
  })()

  const gridCols = data[0]?.length ?? 0
  const gridRows = data.length

  if (!mounted) {
    return (
      <div
        className={`inline-flex flex-col gap-1 ${className}`}
        style={{ opacity: 0 }}
        aria-hidden
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${gridCols}, ${cellSize}px)`,
            gap: `${gap}px`,
          }}
        >
          {Array.from({ length: gridRows * gridCols }).map((_, i) => (
            <div
              key={i}
              style={{
                width: cellSize,
                height: cellSize,
                borderRadius: 2,
                backgroundColor: 'var(--color-border)',
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`inline-flex flex-col gap-1 ${className}`}
      role="img"
      aria-label={title ?? 'Activity heatmap'}
    >
      {title && (
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {title}
        </span>
      )}

      {/* Hour labels row (when showLabels is true) */}
      {showLabels && (
        <div style={{ display: 'flex', gap: `${gap}px`, paddingLeft: showLabels ? 28 : 0 }}>
          {hourLabels.map((label, i) => {
            // Show a subset of labels to avoid crowding
            const step = gridCols > 12 ? Math.ceil(gridCols / 12) : 1
            if (i % step !== 0) return <div key={i} style={{ width: cellSize }} />
            return (
              <div
                key={i}
                style={{
                  width: cellSize * step - (step - 1) * gap,
                  fontSize: 9,
                  color: 'var(--color-text-muted)',
                  textAlign: 'center',
                  lineHeight: `${cellSize}px`,
                }}
              >
                {label}
              </div>
            )
          })}
        </div>
      )}

      {/* Grid rows */}
      <div style={{ display: 'flex', gap: 0 }}>
        {/* Day labels column */}
        {showLabels && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: `${gap}px`, marginRight: 6 }}>
            {dayLabels.map((label, i) => (
              <div
                key={i}
                style={{
                  width: 22,
                  height: cellSize,
                  fontSize: 9,
                  color: 'var(--color-text-muted)',
                  textAlign: 'right',
                  lineHeight: `${cellSize}px`,
                  paddingRight: 2,
                }}
              >
                {i < gridRows ? label : ''}
              </div>
            ))}
          </div>
        )}

        {/* Heatmap cells */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${gridCols}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${gridRows}, ${cellSize}px)`,
            gap: `${gap}px`,
          }}
        >
          {data.map((row, rowIdx) =>
            row.map((value, colIdx) => {
              const color = getColor(value)

              return (
                <div
                  key={`${rowIdx}-${colIdx}`}
                  className="mini-heatmap-cell"
                  style={{
                    width: cellSize,
                    height: cellSize,
                    borderRadius: 2,
                    backgroundColor: color,
                    transition: 'background-color 0.2s ease',
                    position: 'relative',
                  }}
                  aria-label={`Day ${rowIdx}, Hour ${colIdx}: ${value}`}
                >
                  {tooltip && value > 0 && (
                    <span
                      className="mini-heatmap-tooltip"
                      data-tooltip={value.toString()}
                    />
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Legend (optional compact) */}
      {tooltip && (
        <div
          className="mini-heatmap-legend"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            marginTop: 4,
          }}
        >
          <span style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>Less</span>
          {scale.map((c, i) => (
            <div
              key={i}
              style={{
                width: cellSize * 0.75,
                height: cellSize * 0.75,
                borderRadius: 1.5,
                backgroundColor: c,
              }}
            />
          ))}
          <span style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>More</span>
        </div>
      )}
    </div>
  )
}
