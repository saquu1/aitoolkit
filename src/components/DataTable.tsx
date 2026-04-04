'use client'

import { useState, useMemo } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { ArrowUpDown, ArrowUp, ArrowDown, Inbox, ChevronLeft, ChevronRight } from 'lucide-react'

export interface ColumnDef<T> {
  key: string
  label: string
  sortable?: boolean
  width?: string
  render?: (value: any, row: T, index: number) => React.ReactNode
  align?: 'left' | 'center' | 'right'
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (row: T) => void
  maxHeight?: string
  pageSize?: number
  title?: string
  subtitle?: string
  headerExtra?: React.ReactNode
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  maxHeight = 'max-h-96',
  pageSize = 10,
  title,
  subtitle,
  headerExtra,
}: DataTableProps<T>) {
  const { colors } = useTheme()
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(0)

  const alpha = (color: string, opacity: number) =>
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  const sortedData = useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (aVal == null) return 1
      if (bVal == null) return -1
      const cmp = typeof aVal === 'number' && typeof bVal === 'number'
        ? aVal - bVal
        : String(aVal).localeCompare(String(bVal))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDir])

  const totalPages = Math.ceil(sortedData.length / pageSize)
  const pagedData = sortedData.slice(page * pageSize, (page + 1) * pageSize)

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: colors.border, backgroundColor: alpha(colors.card, 50) }}>
      {/* Header */}
      {(title || headerExtra) && (
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: colors.border }}>
          <div>
            {title && <h3 className="text-sm font-semibold" style={{ color: colors.text }}>{title}</h3>}
            {subtitle && <p className="text-xs mt-0.5" style={{ color: colors.textMuted }}>{subtitle}</p>}
          </div>
          {headerExtra}
        </div>
      )}

      {/* Table */}
      <div className={`overflow-x-auto ${maxHeight} overflow-y-auto`}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr style={{ backgroundColor: alpha(colors.bgTertiary, 60) }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-2.5 text-xs font-semibold whitespace-nowrap"
                  style={{
                    color: colors.textMuted,
                    width: col.width,
                    textAlign: col.align || 'left',
                  }}
                >
                  {col.sortable ? (
                    <button
                      className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                      {sortKey === col.key ? (
                        sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // Skeleton rows
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b" style={{ borderColor: alpha(colors.border, 40) }}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="h-4 rounded animate-pulse" style={{ backgroundColor: alpha(colors.border, 40), width: `${60 + Math.random() * 40}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : pagedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <Inbox className="w-8 h-8 mx-auto mb-2" style={{ color: colors.textMuted }} />
                  <p className="text-sm" style={{ color: colors.textMuted }}>{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              pagedData.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b transition-colors cursor-default"
                  style={{
                    borderColor: alpha(colors.border, 30),
                    backgroundColor: idx % 2 === 0 ? 'transparent' : alpha(colors.bgTertiary, 10),
                  }}
                  onClick={() => onRowClick?.(row)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = alpha(colors.primary, 6)
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'transparent' : alpha(colors.bgTertiary, 10)
                  }}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-4 py-2.5 whitespace-nowrap"
                      style={{
                        color: colors.textSecondary,
                        textAlign: col.align || 'left',
                      }}
                    >
                      {col.render ? col.render(row[col.key], row, idx) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && data.length > pageSize && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t" style={{ borderColor: colors.border }}>
          <span className="text-xs" style={{ color: colors.textMuted }}>
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, data.length)} of {data.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              className="p-1.5 rounded-md transition-colors disabled:opacity-30"
              style={{ color: colors.textMuted }}
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs px-2" style={{ color: colors.textSecondary }}>
              Page {page + 1} of {totalPages}
            </span>
            <button
              className="p-1.5 rounded-md transition-colors disabled:opacity-30"
              style={{ color: colors.textMuted }}
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
