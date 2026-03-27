'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Shield,
  TrendingUp,
  BarChart3,
  Bug,
  Database,
  Server,
  Code
} from 'lucide-react'

interface ErrorLog {
  id: string
  message: string
  errorCode: string
  errorCategory: string
  severity: string
  source: string
  route?: string
  method?: string
  solution?: string
  preventionTips?: string
  occurrenceCount: number
  firstSeen: string
  lastSeen: string
  resolved: boolean
  stackTrace?: string
  details?: string
}

interface ErrorStats {
  total: number
  unresolved: number
  byCategory: Record<string, number>
  bySeverity: Record<string, number>
  bySource: Record<string, number>
  topErrors: Array<{ errorCode: string; message: string; count: number }>
  recentCount: number
}

interface ApiErrorRegistryResponse {
  success: boolean
  data: {
    errors: ErrorLog[]
    total: number
    stats: ErrorStats
    filters: {
      categories: string[]
      severities: string[]
      sources: string[]
    }
  }
}

const SEVERITY_COLORS: Record<string, { bg: string; text: string }> = {
  LOW: { bg: 'bg-blue-500/20', text: 'text-blue-500' },
  MEDIUM: { bg: 'bg-yellow-500/20', text: 'text-yellow-500' },
  HIGH: { bg: 'bg-orange-500/20', text: 'text-orange-500' },
  CRITICAL: { bg: 'bg-red-500/20', text: 'text-red-500' },
  FATAL: { bg: 'bg-red-700/20', text: 'text-red-700' }
}

const CATEGORY_ICONS: Record<string, any> = {
  PRISMA_ENUM: Code,
  PRISMA_CONSTRAINT: Database,
  PRISMA_QUERY: Database,
  PRISMA_CONNECTION: Server,
  API_ERROR: Server,
  RUNTIME_ERROR: Bug,
  UNKNOWN: AlertCircle
}

export function ApiErrorRegistryPanel() {
  const { colors } = useTheme()
  const [data, setData] = useState<ApiErrorRegistryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({
    category: '',
    severity: '',
    source: '',
    resolved: ''
  })
  const [showFilters, setShowFilters] = useState(false)
  const [expandedError, setExpandedError] = useState<string | null>(null)
  const [selectedErrors, setSelectedErrors] = useState<string[]>([])
  const [resolving, setResolving] = useState(false)

  const alpha = (color: string, opacity: number) =>
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (filters.category) params.append('category', filters.category)
      if (filters.severity) params.append('severity', filters.severity)
      if (filters.source) params.append('source', filters.source)
      if (filters.resolved) params.append('resolved', filters.resolved)
      
      const res = await fetch(`/api/api-errors?${params.toString()}`)
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error('Failed to fetch error registry:', e)
    } finally {
      setLoading(false)
    }
  }, [search, filters])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const resolveError = async (id: string) => {
    setResolving(true)
    try {
      await fetch('/api/api-errors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve', id })
      })
      fetchData()
    } catch (e) {
      console.error('Failed to resolve error:', e)
    } finally {
      setResolving(false)
    }
  }

  const bulkResolve = async () => {
    if (selectedErrors.length === 0) return
    setResolving(true)
    try {
      await fetch('/api/api-errors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve', ids: selectedErrors })
      })
      setSelectedErrors([])
      fetchData()
    } catch (e) {
      console.error('Failed to bulk resolve:', e)
    } finally {
      setResolving(false)
    }
  }

  const cleanupResolved = async () => {
    if (!confirm('Delete all resolved errors older than 30 days?')) return
    try {
      await fetch('/api/api-errors?daysToKeep=30', { method: 'DELETE' })
      fetchData()
    } catch (e) {
      console.error('Failed to cleanup:', e)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedErrors(prev => 
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    )
  }

  const stats = data?.data?.stats

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-5 gap-4">
        <div 
          className="rounded-xl border p-4"
          style={{ 
            backgroundColor: alpha(colors.card, 50),
            borderColor: colors.border 
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-5 h-5" style={{ color: colors.warning }} />
            <Badge style={{ backgroundColor: alpha(colors.warning, 20), color: colors.warning }}>
              {stats?.total || 0}
            </Badge>
          </div>
          <p className="text-sm font-medium" style={{ color: colors.text }}>Total Errors</p>
        </div>

        <div 
          className="rounded-xl border p-4"
          style={{ 
            backgroundColor: alpha(colors.card, 50),
            borderColor: colors.border 
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <XCircle className="w-5 h-5" style={{ color: colors.error }} />
            <Badge style={{ backgroundColor: alpha(colors.error, 20), color: colors.error }}>
              {stats?.unresolved || 0}
            </Badge>
          </div>
          <p className="text-sm font-medium" style={{ color: colors.text }}>Unresolved</p>
        </div>

        <div 
          className="rounded-xl border p-4"
          style={{ 
            backgroundColor: alpha(colors.card, 50),
            borderColor: colors.border 
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5" style={{ color: colors.primary }} />
            <Badge style={{ backgroundColor: alpha(colors.primary, 20), color: colors.primary }}>
              {stats?.recentCount || 0}
            </Badge>
          </div>
          <p className="text-sm font-medium" style={{ color: colors.text }}>Last 24h</p>
        </div>

        <div 
          className="rounded-xl border p-4"
          style={{ 
            backgroundColor: alpha(colors.card, 50),
            borderColor: colors.border 
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5" style={{ color: colors.accent }} />
            <Badge style={{ backgroundColor: alpha(colors.accent, 20), color: colors.accent }}>
              {stats?.topErrors?.length || 0}
            </Badge>
          </div>
          <p className="text-sm font-medium" style={{ color: colors.text }}>Top Patterns</p>
        </div>

        <div 
          className="rounded-xl border p-4"
          style={{ 
            backgroundColor: alpha(colors.card, 50),
            borderColor: colors.border 
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <CheckCircle2 className="w-5 h-5" style={{ color: colors.success }} />
            <Badge style={{ backgroundColor: alpha(colors.success, 20), color: colors.success }}>
              {(stats?.total || 0) - (stats?.unresolved || 0)}
            </Badge>
          </div>
          <p className="text-sm font-medium" style={{ color: colors.text }}>Resolved</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div 
        className="rounded-xl border p-4"
        style={{ 
          backgroundColor: alpha(colors.card, 50),
          borderColor: colors.border 
        }}
      >
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.textMuted }} />
            <Input
              placeholder="Search errors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            style={{ borderColor: colors.border, color: colors.text }}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {showFilters ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
          </Button>
          <Button onClick={fetchData} style={{ backgroundColor: colors.primary }}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t" style={{ borderColor: colors.border }}>
            <div>
              <label className="text-xs mb-1 block" style={{ color: colors.textMuted }}>Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="w-full p-2 rounded-lg border"
                style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
              >
                <option value="">All Categories</option>
                {data?.data?.filters?.categories?.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: colors.textMuted }}>Severity</label>
              <select
                value={filters.severity}
                onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                className="w-full p-2 rounded-lg border"
                style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
              >
                <option value="">All Severities</option>
                {data?.data?.filters?.severities?.map(sev => (
                  <option key={sev} value={sev}>{sev}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: colors.textMuted }}>Source</label>
              <select
                value={filters.source}
                onChange={(e) => setFilters({ ...filters, source: e.target.value })}
                className="w-full p-2 rounded-lg border"
                style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
              >
                <option value="">All Sources</option>
                {data?.data?.filters?.sources?.map(src => (
                  <option key={src} value={src}>{src}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: colors.textMuted }}>Status</label>
              <select
                value={filters.resolved}
                onChange={(e) => setFilters({ ...filters, resolved: e.target.value })}
                className="w-full p-2 rounded-lg border"
                style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
              >
                <option value="">All</option>
                <option value="false">Unresolved</option>
                <option value="true">Resolved</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedErrors.length > 0 && (
        <div 
          className="rounded-xl border p-4 flex items-center justify-between"
          style={{ 
            backgroundColor: alpha(colors.primary, 10),
            borderColor: alpha(colors.primary, 30)
          }}
        >
          <span style={{ color: colors.text }}>
            {selectedErrors.length} error(s) selected
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedErrors([])}
              style={{ borderColor: colors.border, color: colors.text }}
            >
              Clear Selection
            </Button>
            <Button
              onClick={bulkResolve}
              disabled={resolving}
              style={{ backgroundColor: colors.success }}
            >
              {resolving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Mark Resolved
            </Button>
          </div>
        </div>
      )}

      {/* Error List */}
      <div 
        className="rounded-xl border"
        style={{ 
          backgroundColor: alpha(colors.card, 50),
          borderColor: colors.border 
        }}
      >
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: colors.border }}>
          <h3 className="text-lg font-semibold" style={{ color: colors.text }}>
            Error Registry ({data?.data?.total || 0})
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={cleanupResolved}
            style={{ borderColor: colors.border, color: colors.textMuted }}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Cleanup Resolved
          </Button>
        </div>

        <div className="divide-y" style={{ borderColor: colors.border }}>
          {data?.data?.errors?.length === 0 ? (
            <div className="p-8 text-center" style={{ color: colors.textMuted }}>
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4" style={{ color: colors.success }} />
              <p>No errors found</p>
            </div>
          ) : (
            data?.data?.errors?.map(error => {
              const CategoryIcon = CATEGORY_ICONS[error.errorCategory] || AlertCircle
              const severityStyle = SEVERITY_COLORS[error.severity] || SEVERITY_COLORS.MEDIUM
              
              return (
                <div key={error.id} className="p-4">
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selectedErrors.includes(error.id)}
                      onChange={() => toggleSelect(error.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CategoryIcon className="w-4 h-4" style={{ color: colors.textMuted }} />
                        <Badge 
                          className={`text-xs ${severityStyle.bg} ${severityStyle.text}`}
                        >
                          {error.severity}
                        </Badge>
                        <Badge 
                          variant="outline"
                          className="text-xs font-mono"
                          style={{ borderColor: colors.border, color: colors.textMuted }}
                        >
                          {error.errorCode}
                        </Badge>
                        {error.resolved && (
                          <Badge 
                            className="text-xs"
                            style={{ backgroundColor: alpha(colors.success, 20), color: colors.success }}
                          >
                            Resolved
                          </Badge>
                        )}
                        <Badge 
                          variant="outline"
                          className="text-xs"
                          style={{ borderColor: colors.border, color: colors.textMuted }}
                        >
                          {error.errorCategory}
                        </Badge>
                        {error.occurrenceCount > 1 && (
                          <Badge 
                            className="text-xs"
                            style={{ backgroundColor: alpha(colors.warning, 20), color: colors.warning }}
                          >
                            x{error.occurrenceCount}
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm mb-2" style={{ color: colors.text }}>
                        {error.message}
                      </p>

                      <div className="flex items-center gap-4 text-xs" style={{ color: colors.textMuted }}>
                        {error.route && (
                          <span className="font-mono">{error.method} {error.route}</span>
                        )}
                        <span>First: {new Date(error.firstSeen).toLocaleString()}</span>
                        <span>Last: {new Date(error.lastSeen).toLocaleString()}</span>
                      </div>

                      {/* Expandable details */}
                      {expandedError === error.id && (
                        <div className="mt-4 space-y-4">
                          {error.stackTrace && (
                            <div 
                              className="p-3 rounded-lg font-mono text-xs overflow-x-auto"
                              style={{ backgroundColor: colors.bg, color: colors.textMuted }}
                            >
                              <pre>{error.stackTrace}</pre>
                            </div>
                          )}

                          {error.solution && (
                            <div 
                              className="p-3 rounded-lg"
                              style={{ backgroundColor: alpha(colors.success, 10), border: `1px solid ${alpha(colors.success, 30)}` }}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <Lightbulb className="w-4 h-4" style={{ color: colors.success }} />
                                <span className="font-medium" style={{ color: colors.text }}>Solution</span>
                              </div>
                              <p className="text-sm" style={{ color: colors.text }}>{error.solution}</p>
                            </div>
                          )}

                          {error.preventionTips && (
                            <div 
                              className="p-3 rounded-lg"
                              style={{ backgroundColor: alpha(colors.primary, 10), border: `1px solid ${alpha(colors.primary, 30)}` }}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <Shield className="w-4 h-4" style={{ color: colors.primary }} />
                                <span className="font-medium" style={{ color: colors.text }}>Prevention Tips</span>
                              </div>
                              <ul className="text-sm list-disc list-inside" style={{ color: colors.text }}>
                                {(() => {
                                  try {
                                    const tips = JSON.parse(error.preventionTips)
                                    return tips.map((tip: string, i: number) => (
                                      <li key={i}>{tip}</li>
                                    ))
                                  } catch {
                                    return <li>{error.preventionTips}</li>
                                  }
                                })()}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedError(expandedError === error.id ? null : error.id)}
                        style={{ color: colors.textMuted }}
                      >
                        {expandedError === error.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                      {!error.resolved && (
                        <Button
                          size="sm"
                          onClick={() => resolveError(error.id)}
                          disabled={resolving}
                          style={{ backgroundColor: colors.success }}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Top Errors Chart */}
      {stats?.topErrors && stats.topErrors.length > 0 && (
        <div 
          className="rounded-xl border p-6"
          style={{ 
            backgroundColor: alpha(colors.card, 50),
            borderColor: colors.border 
          }}
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: colors.text }}>
            <BarChart3 className="w-5 h-5" style={{ color: colors.primary }} />
            Top Error Patterns
          </h3>
          <div className="space-y-3">
            {stats.topErrors.slice(0, 5).map((err, i) => (
              <div key={i} className="flex items-center gap-4">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: alpha(colors.primary, 20), color: colors.primary }}
                >
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-mono" style={{ color: colors.text }}>
                      {err.errorCode}
                    </span>
                    <span className="text-sm" style={{ color: colors.textMuted }}>
                      {err.count} occurrences
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: colors.textMuted }}>
                    {err.message.slice(0, 80)}...
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
