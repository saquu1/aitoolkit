'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { api, type ApiResponse } from '@/lib/api-client'

// =============================================================================
// ANALYTICS DASHBOARD COMPONENT (Inline)
// =============================================================================

interface AnalyticsData {
  summary: {
    totalSessions: number
    totalTokens: number
    totalCost: number
    totalIssues: number
    resolvedIssues: number
    totalFeatures: number
    avgSessionDuration: number
  }
  distributions: {
    models: Record<string, number>
    issues: Record<string, number>
    categories: Record<string, number>
  }
  dailyStats: Record<string, { sessions: number; tokens: number; cost: number }>
  recentSessions: any[]
  recentIssues: any[]
  topPatterns: any[]
}

function AnalyticsDashboardComponent({ colors, alpha }: { colors: any; alpha: (c: string, o: number) => string }) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'issues' | 'cost'>('overview')

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const result = await api.get('/api/analytics?action=dashboard')
        if (result.success && result.data) {
          setData(result.data.dashboard || result.data)
        }
      } catch (error) {
        console.error('Failed to load analytics:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.primary }} />
        <span className="ml-3" style={{ color: colors.textMuted }}>Loading analytics...</span>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12 rounded-xl border" style={{ borderColor: colors.border }}>
        <div className="text-4xl mb-3">📊</div>
        <p style={{ color: colors.textMuted }}>No analytics data yet</p>
        <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
          Import chat logs using Auto Fetch or Batch Import to see analytics
        </p>
      </div>
    )
  }

  const { summary, distributions, dailyStats } = data

  // Format helpers
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  // Get chart data
  const chartData = Object.entries(dailyStats).slice(-14).map(([date, stats]) => ({
    label: date.slice(5),
    tokens: stats.tokens,
    cost: stats.cost
  }))

  const maxTokens = Math.max(...chartData.map(d => d.tokens), 1)

  return (
    <div className="space-y-6">
      {/* Mini Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Sessions', value: summary.totalSessions, icon: '📝', color: colors.primary },
          { label: 'Tokens', value: formatNumber(summary.totalTokens), icon: '🔢', color: colors.accent },
          { label: 'Cost', value: `$${summary.totalCost.toFixed(2)}`, icon: '💰', color: colors.success },
          { label: 'Features', value: summary.totalFeatures, icon: '✨', color: colors.warning },
        ].map((stat) => (
          <div key={stat.label} className="p-3 rounded-lg border" style={{ backgroundColor: alpha(colors.card, 50), borderColor: colors.border }}>
            <div className="flex items-center gap-2 mb-1">
              <span>{stat.icon}</span>
              <span className="text-xs" style={{ color: colors.textMuted }}>{stat.label}</span>
            </div>
            <div className="text-xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Tab Buttons */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { key: 'overview', label: '📈 Overview' },
          { key: 'issues', label: '🐛 Issues' },
          { key: 'cost', label: '💰 Cost' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all"
            style={{
              backgroundColor: activeTab === tab.key ? colors.primary : alpha(colors.card, 50),
              color: activeTab === tab.key ? 'white' : colors.textSecondary,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Token Usage Chart */}
          <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <h4 className="font-semibold mb-3" style={{ color: colors.text }}>📈 Token Usage (14 days)</h4>
            <div className="h-40 flex items-end gap-1">
              {chartData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t transition-all hover:opacity-80"
                    style={{
                      height: `${(d.tokens / maxTokens) * 100}%`,
                      backgroundColor: colors.primary,
                      minHeight: '4px'
                    }}
                    title={`${d.label}: ${formatNumber(d.tokens)} tokens`}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs" style={{ color: colors.textMuted }}>
              <span>{chartData[0]?.label}</span>
              <span>{chartData[chartData.length - 1]?.label}</span>
            </div>
          </div>

          {/* Model Distribution */}
          <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <h4 className="font-semibold mb-3" style={{ color: colors.text }}>🤖 Models Used</h4>
            <div className="space-y-2">
              {Object.entries(distributions.models).slice(0, 5).map(([model, count]) => {
                const total = Object.values(distributions.models).reduce((a, b) => a + b, 0)
                const pct = Math.round((count / total) * 100)
                return (
                  <div key={model} className="flex items-center gap-2">
                    <span className="text-sm flex-1 truncate" style={{ color: colors.textSecondary }}>{model}</span>
                    <div className="w-24 h-2 rounded-full overflow-hidden" style={{ backgroundColor: alpha(colors.border, 30) }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: colors.accent }} />
                    </div>
                    <span className="text-xs font-mono w-8 text-right" style={{ color: colors.text }}>{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Issue Types */}
          <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <h4 className="font-semibold mb-3" style={{ color: colors.text }}>🐛 Issue Types</h4>
            {Object.keys(distributions.issues).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {Object.entries(distributions.issues).map(([type, count]) => (
                  <div key={type} className="px-3 py-1.5 rounded-lg text-sm" style={{ backgroundColor: alpha(colors.warning, 15) }}>
                    <span style={{ color: colors.warning }}>{count}</span>
                    <span className="ml-1 capitalize" style={{ color: colors.textSecondary }}>{type}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: colors.textMuted }}>No issues tracked yet</p>
            )}
          </div>

          {/* Category Distribution */}
          <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <h4 className="font-semibold mb-3" style={{ color: colors.text }}>📂 Session Categories</h4>
            <div className="space-y-2">
              {Object.entries(distributions.categories).slice(0, 5).map(([cat, count]) => (
                <div key={cat} className="flex items-center justify-between">
                  <span className="text-sm capitalize" style={{ color: colors.textSecondary }}>{cat}</span>
                  <span className="font-mono" style={{ color: colors.text }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Issues Tab */}
      {activeTab === 'issues' && (
        <div className="space-y-4">
          {/* Issue Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border text-center" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
              <div className="text-2xl font-bold" style={{ color: colors.warning }}>{summary.totalIssues}</div>
              <div className="text-sm" style={{ color: colors.textMuted }}>Total Issues</div>
            </div>
            <div className="p-4 rounded-xl border text-center" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
              <div className="text-2xl font-bold" style={{ color: colors.success }}>{summary.resolvedIssues}</div>
              <div className="text-sm" style={{ color: colors.textMuted }}>Resolved</div>
            </div>
            <div className="p-4 rounded-xl border text-center" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
              <div className="text-2xl font-bold" style={{ color: colors.primary }}>
                {summary.totalIssues > 0 ? Math.round((summary.resolvedIssues / summary.totalIssues) * 100) : 0}%
              </div>
              <div className="text-sm" style={{ color: colors.textMuted }}>Resolution Rate</div>
            </div>
          </div>

          {/* Recurring Patterns */}
          <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <h4 className="font-semibold mb-3" style={{ color: colors.text }}>🔄 Recurring Patterns</h4>
            <p className="text-sm" style={{ color: colors.textMuted }}>
              {data.topPatterns.length > 0 
                ? `${data.topPatterns.length} recurring patterns detected. Import more sessions to identify patterns.`
                : 'Import more sessions to detect recurring issue patterns.'
              }
            </p>
          </div>
        </div>
      )}

      {/* Cost Tab */}
      {activeTab === 'cost' && (
        <div className="space-y-4">
          {/* Cost Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
              <div className="text-xs mb-1" style={{ color: colors.textMuted }}>Total Cost</div>
              <div className="text-xl font-bold" style={{ color: colors.success }}>${summary.totalCost.toFixed(2)}</div>
            </div>
            <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
              <div className="text-xs mb-1" style={{ color: colors.textMuted }}>Cost/Session</div>
              <div className="text-xl font-bold" style={{ color: colors.text }}>
                ${summary.totalSessions > 0 ? (summary.totalCost / summary.totalSessions).toFixed(3) : '0.00'}
              </div>
            </div>
            <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
              <div className="text-xs mb-1" style={{ color: colors.textMuted }}>Cost/Feature</div>
              <div className="text-xl font-bold" style={{ color: colors.text }}>
                ${summary.totalFeatures > 0 ? (summary.totalCost / summary.totalFeatures).toFixed(3) : '0.00'}
              </div>
            </div>
            <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
              <div className="text-xs mb-1" style={{ color: colors.textMuted }}>Cost/Issue Fixed</div>
              <div className="text-xl font-bold" style={{ color: colors.text }}>
                ${summary.resolvedIssues > 0 ? (summary.totalCost / summary.resolvedIssues).toFixed(3) : '0.00'}
              </div>
            </div>
          </div>

          {/* Cost Trend */}
          <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <h4 className="font-semibold mb-3" style={{ color: colors.text }}>💰 Daily Cost Trend</h4>
            <div className="h-32 flex items-end gap-1">
              {chartData.map((d, i) => {
                const maxCost = Math.max(...chartData.map(c => c.cost), 0.01)
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t transition-all hover:opacity-80"
                      style={{
                        height: `${(d.cost / maxCost) * 100}%`,
                        backgroundColor: colors.success,
                        minHeight: d.cost > 0 ? '4px' : '0'
                      }}
                      title={`${d.label}: $${d.cost.toFixed(3)}`}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Efficiency Tips */}
          <div className="p-4 rounded-xl border-l-4" style={{ backgroundColor: alpha(colors.accent, 5), borderColor: colors.accent }}>
            <h4 className="font-semibold mb-2" style={{ color: colors.text }}>💡 Cost Optimization Tips</h4>
            <ul className="text-sm space-y-1" style={{ color: colors.textSecondary }}>
              <li>• Use smaller models (like glm-4) for simple tasks</li>
              <li>• Batch similar operations together</li>
              <li>• Cache frequently used patterns</li>
              <li>• Review recurring issues to avoid repeated mistakes</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// ERROR PATTERNS VIEW COMPONENT
// =============================================================================

interface ErrorPattern {
  id: string
  patternKey: string
  patternName: string
  errorType: string
  endpoint: string
  httpStatus: number
  description: string
  occurrenceCount: number
  severity: 'critical' | 'error' | 'warning' | 'info'
  rootCause?: string
  preventionStrategy?: string
  autoFixSolution?: string
  firstOccurrence: string
  lastOccurrence: string
  patternStatus: 'ACTIVE' | 'MONITORING' | 'RESOLVED' | 'IGNORED'
}

function ErrorPatternsView({ colors, alpha }: { colors: any; alpha: (c: string, o: number) => string }) {
  const [patterns, setPatterns] = useState<ErrorPattern[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [selectedPattern, setSelectedPattern] = useState<ErrorPattern | null>(null)

  useEffect(() => {
    fetchPatterns()
  }, [])

  const fetchPatterns = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/error-patterns')
      const data = await response.json()
      if (data.success && data.patterns) {
        setPatterns(data.patterns)
      } else {
        // Use mock data if API not ready
        setPatterns(getMockPatterns())
      }
    } catch (error) {
      console.error('Failed to fetch patterns:', error)
      setPatterns(getMockPatterns())
    } finally {
      setLoading(false)
    }
  }

  const filteredPatterns = patterns.filter(p => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!p.patternName.toLowerCase().includes(q) && 
          !p.description.toLowerCase().includes(q) &&
          !p.endpoint.toLowerCase().includes(q)) {
        return false
      }
    }
    if (severityFilter !== 'all' && p.severity !== severityFilter) {
      return false
    }
    return true
  })

  const stats = {
    total: patterns.length,
    critical: patterns.filter(p => p.severity === 'critical').length,
    error: patterns.filter(p => p.severity === 'error').length,
    warning: patterns.filter(p => p.severity === 'warning').length,
    resolved: patterns.filter(p => p.patternStatus === 'RESOLVED').length,
    totalOccurrences: patterns.reduce((acc, p) => acc + p.occurrenceCount, 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.primary }} />
        <span className="ml-3" style={{ color: colors.textMuted }}>Loading error patterns...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="p-3 rounded-lg border" style={{ backgroundColor: alpha(colors.card, 50), borderColor: colors.border }}>
          <div className="text-xs" style={{ color: colors.textMuted }}>Total Patterns</div>
          <div className="text-xl font-bold" style={{ color: colors.text }}>{stats.total}</div>
        </div>
        <div className="p-3 rounded-lg border" style={{ backgroundColor: alpha(colors.card, 50), borderColor: colors.border }}>
          <div className="text-xs" style={{ color: colors.textMuted }}>Critical</div>
          <div className="text-xl font-bold text-red-500">{stats.critical}</div>
        </div>
        <div className="p-3 rounded-lg border" style={{ backgroundColor: alpha(colors.card, 50), borderColor: colors.border }}>
          <div className="text-xs" style={{ color: colors.textMuted }}>Errors</div>
          <div className="text-xl font-bold text-orange-500">{stats.error}</div>
        </div>
        <div className="p-3 rounded-lg border" style={{ backgroundColor: alpha(colors.card, 50), borderColor: colors.border }}>
          <div className="text-xs" style={{ color: colors.textMuted }}>Warnings</div>
          <div className="text-xl font-bold text-yellow-500">{stats.warning}</div>
        </div>
        <div className="p-3 rounded-lg border" style={{ backgroundColor: alpha(colors.card, 50), borderColor: colors.border }}>
          <div className="text-xs" style={{ color: colors.textMuted }}>Resolved</div>
          <div className="text-xl font-bold text-green-500">{stats.resolved}</div>
        </div>
        <div className="p-3 rounded-lg border" style={{ backgroundColor: alpha(colors.card, 50), borderColor: colors.border }}>
          <div className="text-xs" style={{ color: colors.textMuted }}>Occurrences</div>
          <div className="text-xl font-bold" style={{ color: colors.text }}>{stats.totalOccurrences}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search patterns..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-3 py-2 rounded-lg border flex-1 min-w-48"
          style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
        />
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border"
          style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="error">Error</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
        <button
          onClick={fetchPatterns}
          className="px-4 py-2 rounded-lg border flex items-center gap-2"
          style={{ borderColor: colors.border, color: colors.textSecondary }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Patterns List */}
      {filteredPatterns.length === 0 ? (
        <div className="text-center py-12 rounded-xl border" style={{ borderColor: colors.border }}>
          <div className="text-4xl mb-3">🛡️</div>
          <p style={{ color: colors.textMuted }}>No error patterns detected</p>
          <p className="text-sm mt-1" style={{ color: colors.textMuted }}>Patterns will appear here after errors are logged</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPatterns.map((pattern) => (
            <div
              key={pattern.id}
              onClick={() => setSelectedPattern(pattern)}
              className="p-4 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
              style={{ 
                backgroundColor: alpha(colors.card, 30), 
                borderColor: pattern.severity === 'critical' ? colors.error : colors.border 
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium" style={{ color: colors.text }}>{pattern.patternName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      pattern.severity === 'critical' ? 'bg-red-100 text-red-800' :
                      pattern.severity === 'error' ? 'bg-orange-100 text-orange-800' :
                      pattern.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {pattern.severity.toUpperCase()}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      pattern.patternStatus === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                      pattern.patternStatus === 'MONITORING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {pattern.patternStatus}
                    </span>
                  </div>
                  <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                    {pattern.endpoint} • HTTP {pattern.httpStatus}
                  </p>
                  <p className="text-sm mt-1" style={{ color: colors.textMuted }}>{pattern.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold" style={{ color: colors.warning }}>{pattern.occurrenceCount}</div>
                  <div className="text-xs" style={{ color: colors.textMuted }}>occurrences</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pattern Detail Modal */}
      {selectedPattern && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSelectedPattern(null)}
        >
          <div 
            className="w-full max-w-2xl rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: colors.bg }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b" style={{ borderColor: colors.border }}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold" style={{ color: colors.text }}>
                  🐛 {selectedPattern.patternName}
                </h3>
                <button onClick={() => setSelectedPattern(null)} className="p-1" style={{ color: colors.textMuted }}>
                  ✕
                </button>
              </div>
              <div className="flex gap-2 mt-2">
                <span className={`text-xs px-2 py-0.5 rounded ${
                  selectedPattern.severity === 'critical' ? 'bg-red-100 text-red-800' :
                  selectedPattern.severity === 'error' ? 'bg-orange-100 text-orange-800' :
                  selectedPattern.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {selectedPattern.severity.toUpperCase()}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-800">
                  {selectedPattern.errorType}
                </span>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded-lg" style={{ backgroundColor: alpha(colors.card, 30) }}>
                  <div className="text-2xl font-bold" style={{ color: colors.warning }}>{selectedPattern.occurrenceCount}</div>
                  <div className="text-xs" style={{ color: colors.textMuted }}>Occurrences</div>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: alpha(colors.card, 30) }}>
                  <div className="text-2xl font-bold" style={{ color: colors.text }}>{selectedPattern.httpStatus}</div>
                  <div className="text-xs" style={{ color: colors.textMuted }}>HTTP Status</div>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: alpha(colors.card, 30) }}>
                  <div className="text-sm font-bold truncate" style={{ color: colors.text }}>{selectedPattern.endpoint}</div>
                  <div className="text-xs" style={{ color: colors.textMuted }}>Endpoint</div>
                </div>
              </div>

              {selectedPattern.rootCause && (
                <div className="p-3 rounded-lg border-l-4" style={{ backgroundColor: alpha(colors.error, 5), borderColor: colors.error }}>
                  <div className="font-medium text-red-800">⚠️ Root Cause</div>
                  <p className="text-sm text-red-700 mt-1">{selectedPattern.rootCause}</p>
                </div>
              )}

              {selectedPattern.preventionStrategy && (
                <div className="p-3 rounded-lg border-l-4" style={{ backgroundColor: alpha(colors.success, 5), borderColor: colors.success }}>
                  <div className="font-medium text-green-800">🛡️ Prevention Strategy</div>
                  <p className="text-sm text-green-700 mt-1">{selectedPattern.preventionStrategy}</p>
                </div>
              )}

              {selectedPattern.autoFixSolution && (
                <div className="p-3 rounded-lg border-l-4" style={{ backgroundColor: alpha(colors.primary, 5), borderColor: colors.primary }}>
                  <div className="font-medium text-blue-800">🔧 Auto-Fix Solution</div>
                  <p className="text-sm text-blue-700 mt-1">{selectedPattern.autoFixSolution}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setSelectedPattern(null)}
                  className="px-4 py-2 rounded-lg"
                  style={{ backgroundColor: alpha(colors.card, 50), color: colors.text }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Mock patterns for development
function getMockPatterns(): ErrorPattern[] {
  return [
    {
      id: '1',
      patternKey: 'SERVER_FAILURE_/api/raw-data_502',
      patternName: 'Server Failure - Raw Data API',
      errorType: 'SERVER_FAILURE',
      endpoint: '/api/raw-data',
      httpStatus: 502,
      description: 'Database query timeout or connection pool exhaustion',
      occurrenceCount: 8,
      severity: 'critical',
      rootCause: 'Database query timeout or connection pool exhaustion',
      preventionStrategy: 'Add query timeouts, optimize slow queries, increase connection pool size',
      autoFixSolution: 'Check for long-running queries and add appropriate indexes',
      firstOccurrence: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      lastOccurrence: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      patternStatus: 'ACTIVE',
    },
    {
      id: '2',
      patternKey: 'AUTH_ERROR_/api/*_401',
      patternName: 'Authentication Token Expired',
      errorType: 'AUTH_ERROR',
      endpoint: '/api/*',
      httpStatus: 401,
      description: 'Session expired or invalid authentication token',
      occurrenceCount: 12,
      severity: 'error',
      rootCause: 'Session expired or invalid authentication token',
      preventionStrategy: 'Implement token refresh, redirect to login on 401',
      autoFixSolution: 'Clear local session and redirect to login page',
      firstOccurrence: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      lastOccurrence: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      patternStatus: 'ACTIVE',
    },
    {
      id: '3',
      patternKey: 'NETWORK_ERROR_*_0',
      patternName: 'Network Connectivity Issue',
      errorType: 'NETWORK_ERROR',
      endpoint: '/api/*',
      httpStatus: 0,
      description: 'Network connectivity issue or CORS error',
      occurrenceCount: 5,
      severity: 'warning',
      rootCause: 'Network connectivity issue or CORS error',
      preventionStrategy: 'Add retry logic with exponential backoff, check CORS configuration',
      autoFixSolution: 'Retry request up to 3 times with increasing delays',
      firstOccurrence: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      lastOccurrence: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      patternStatus: 'MONITORING',
    },
  ]
}

// =============================================================================
// MAIN CHAT LOG TAB COMPONENT
// =============================================================================

interface ChatLog {
  id: string
  sessionId?: string
  timestamp: string
  sessionDate: string
  title: string
  summary: string
  issuesSolved: string[]
  featuresAdded: string[]
  filesModified: string[]
  commits: string[]
  notes: string
  source?: string
  // Summary-only fields (for lazy loading)
  issuesCount?: number
  featuresCount?: number
  isSummary?: boolean  // Flag to indicate this is a summary, not full data
}

interface AvailableDate {
  date: string
  count: number
  titles: string[]
}

// Empty log template for new entries
const EMPTY_LOG = {
  sessionDate: new Date().toISOString().split('T')[0],
  title: '',
  summary: '',
  issuesSolved: '',
  featuresAdded: '',
  filesModified: '',
  commits: '',
  notes: ''
}

export function ChatLogTab() {
  const { colors } = useTheme()
  const [logs, setLogs] = useState<ChatLog[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  // Lazy loading state
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null) // ID of log being loaded
  const [loadedDetails, setLoadedDetails] = useState<Record<string, ChatLog>>({}) // Cache of loaded full details
  
  // Date range filter
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Import state
  const [showImport, setShowImport] = useState(false)
  const [importDate, setImportDate] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ message: string; results?: any } | null>(null)
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([])

  // Manual add log state
  const [showAddLog, setShowAddLog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newLog, setNewLog] = useState(EMPTY_LOG)

  // Fetch state
  const [fetching, setFetching] = useState(false)
  const [fetchResult, setFetchResult] = useState<{ message: string; results?: any } | null>(null)
  const [fetchStats, setFetchStats] = useState<{ totalTasks: number; availableToImport: number } | null>(null)

  // AI Extract state
  const [showExtract, setShowExtract] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [chatText, setChatText] = useState('')
  const [extractDate, setExtractDate] = useState(new Date().toISOString().split('T')[0])
  const [extractPreview, setExtractPreview] = useState<any>(null)

  // Batch Import state
  const [showBatchImport, setShowBatchImport] = useState(false)
  const [batchJson, setBatchJson] = useState('')
  const [batchParsing, setBatchParsing] = useState(false)
  const [parsingProgress, setParsingProgress] = useState(0) // 0-100
  const [parsingStage, setParsingStage] = useState<string>('') // Current stage text
  const [batchPreview, setBatchPreview] = useState<ChatLog[]>([])
  const [batchError, setBatchError] = useState<string | null>(null)
  
  // Enhanced Batch Import state
  const [batchStep, setBatchStep] = useState<'paste' | 'history' | 'parse'>('paste')
  const [savedRawData, setSavedRawData] = useState<any[]>([])
  const [selectedRawId, setSelectedRawId] = useState<string | null>(null)
  const [savingRaw, setSavingRaw] = useState(false)
  const [rawSaveResult, setRawSaveResult] = useState<{ success: boolean; message: string; rawDataId?: string } | null>(null)

  // Chat History Tab - Pagination & Filter state
  const [historyPage, setHistoryPage] = useState(1)
  const [historyPageSize, setHistoryPageSize] = useState(10)
  const [historyTotalItems, setHistoryTotalItems] = useState(0)
  const [historyTotalPages, setHistoryTotalPages] = useState(1)
  const [historyParseFilter, setHistoryParseFilter] = useState<'all' | 'parsed' | 'pending'>('all')
  const [historyLoading, setHistoryLoading] = useState(false)
  const [editingRawId, setEditingRawId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [deletingRawId, setDeletingRawId] = useState<string | null>(null)

  // Duplicate detection state
  const [duplicateWarning, setDuplicateWarning] = useState<{
    isDuplicate: boolean
    duplicateType: 'exact' | 'partial' | 'evolved' | 'none'
    existingRawDataId: string | null
    existingChatLogId: string | null
    existingTitle: string | null
    matchPercentage: number
    matchedMessages: number
    totalMessages: number
    newMessages?: number
    hint?: string
    allowForceSave?: boolean
  } | null>(null)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)

  // View Tab state
  const [activeView, setActiveView] = useState<'logs' | 'analytics' | 'patterns'>('logs')

  // Auto Fetch from chat.z.ai state
  const [showAutoFetch, setShowAutoFetch] = useState(false)
  const [authCookie, setAuthCookie] = useState('')
  const [chatId, setChatId] = useState('')
  const [autoFetching, setAutoFetching] = useState(false)
  const [autoFetchResult, setAutoFetchResult] = useState<{ success: boolean; message: string; logs?: any[] } | null>(null)
  const [connectionTested, setConnectionTested] = useState(false)
  const [messageCount, setMessageCount] = useState(0)
  const [availableChats, setAvailableChats] = useState<any[]>([])
  const [loadingChats, setLoadingChats] = useState(false)

  // Re-import raw data state
  const [showReImport, setShowReImport] = useState(false)
  const [logsWithoutRaw, setLogsWithoutRaw] = useState<any[]>([])
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null)
  const [reImportJson, setReImportJson] = useState('')
  const [reImporting, setReImporting] = useState(false)
  const [reImportResult, setReImportResult] = useState<{ success: boolean; message: string } | null>(null)

  // Analyze & Push to AI Dashboard state
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeResult, setAnalyzeResult] = useState<{ success: boolean; message: string; analyzed?: number } | null>(null)
  const [pendingCount, setPendingCount] = useState(0)

  const alpha = (color: string, opacity: number) =>
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  // Handle batch import - uses server-side parsing to prevent UI freeze
  // Note: repairJSON and parseBatchResponse are now handled server-side
  const handleBatchImport = async () => {
    if (!batchJson.trim()) return

    setBatchParsing(true)
    setBatchError(null)
    setParsingProgress(0)
    setParsingStage('Preparing to parse...')
    
    // Create AbortController for timeout (increased to 180 seconds for large datasets)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
      setBatchError('Request timed out after 3 minutes. The data may be too large.')
      setBatchParsing(false)
      setParsingProgress(0)
      setParsingStage('')
    }, 180000) // 3 minute timeout for large datasets

    try {
      // Progress: 10% - Starting
      setParsingProgress(10)
      setParsingStage('Sending data to server...')
      
      // Use server-side parsing API to prevent UI freezing
      const response = await fetch('/api/chat-logs/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'parse-only',
          rawJson: batchJson
        }),
        signal: controller.signal
      })

      // Clear timeout on successful response
      clearTimeout(timeoutId)

      // Progress: 50% - Server processing
      setParsingProgress(50)
      setParsingStage('Server processing...')

      const data = await response.json()

      // Progress: 80% - Receiving results
      setParsingProgress(80)
      setParsingStage('Receiving results...')

      if (!data.success) {
        setBatchError(data.error || 'Parse failed')
        setParsingProgress(0)
        setParsingStage('')
      } else if (data.logs.length === 0) {
        setBatchError('Parse successful, but no valid session data found.\n\nEnsure JSON contains a "data" field with message records.')
        setParsingProgress(0)
        setParsingStage('')
      } else {
        setBatchPreview(data.logs)
        // Progress: 100% - Complete
        setParsingProgress(100)
        setParsingStage(`Complete! Found ${data.logs.length} sessions (${data.stats?.parseTimeMs || 0}ms)`)
        // Show stats if available
        if (data.stats) {
          console.log('Parse stats:', data.stats)
        }
        // Reset progress after a delay
        setTimeout(() => {
          setParsingProgress(0)
          setParsingStage('')
        }, 3000)
      }
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        // Already handled by timeout
      } else {
        setBatchError(error instanceof Error ? error.message : 'Unknown error')
        setParsingProgress(0)
        setParsingStage('')
      }
    } finally {
      setBatchParsing(false)
    }
  }

  // NEW: Save raw data only (without parsing)
  const handleSaveRawData = async () => {
    if (!batchJson.trim()) return

    setSavingRaw(true)
    setRawSaveResult(null)

    try {
      const response = await fetch('/api/raw-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-raw',
          sourceType: 'batch_import',
          rawJson: batchJson
        })
      })

      const data = await response.json()

      if (data.success) {
        setRawSaveResult({
          success: true,
          message: `✅ Raw data saved! ID: ${data.rawDataId}`,
          rawDataId: data.rawDataId
        })
        // Add to chat history
        setSavedRawData(prev => [{
          id: data.rawDataId,
          size: batchJson.length,
          savedAt: new Date().toISOString(),
          preview: batchJson.substring(0, 100) + '...'
        }, ...prev])
        // Move to history step
        setBatchStep('history')
      } else {
        setRawSaveResult({
          success: false,
          message: data.error || 'Failed to save raw data'
        })
      }
    } catch (error) {
      setRawSaveResult({
        success: false,
        message: 'Error: ' + (error instanceof Error ? error.message : 'Unknown error')
      })
    } finally {
      setSavingRaw(false)
    }
  }

  // NEW: Load saved raw data for chat history with pagination and filter
  const loadSavedRawData = async (page: number = historyPage, filter: 'all' | 'parsed' | 'pending' = historyParseFilter) => {
    setHistoryLoading(true)
    try {
      const params = new URLSearchParams({
        action: 'list',
        limit: String(historyPageSize),
        page: String(page),
        parseStatus: filter === 'all' ? 'all' : filter
      })
      
      // Use new API wrapper with error handling
      const result = await api.get(`/api/raw-data?${params.toString()}`)
      
      if (result.success && result.data) {
        setSavedRawData(result.data.imports || [])
        if (result.data.pagination) {
          setHistoryTotalItems(result.data.pagination.totalItems)
          setHistoryTotalPages(result.data.pagination.totalPages)
          setHistoryPage(result.data.pagination.page)
        }
      } else if (result.error) {
        // Error is automatically logged and dispatched by api wrapper
        console.error('Failed to load raw data:', result.error.message)
        // Optionally show user notification
        if (result.error.severity === 'critical') {
          alert(`Server Error: ${result.error.message}`)
        }
      } else if (result.businessRule) {
        // Handle business rule response (409 conflicts, etc.)
        console.log('Business rule triggered:', result.businessRule)
      }
    } catch (error) {
      console.error('Failed to load saved raw data:', error)
    } finally {
      setHistoryLoading(false)
    }
  }

  // Delete raw data
  const handleDeleteRawData = async (rawDataId: string) => {
    if (!confirm('Are you sure you want to delete this raw data? This will also delete any linked chat logs.')) return
    
    setDeletingRawId(rawDataId)
    try {
      // Use new API wrapper with error handling
      const result = await api.delete(`/api/raw-data?rawDataId=${rawDataId}`)
      
      if (result.success) {
        await loadSavedRawData(historyPage, historyParseFilter)
      } else if (result.error) {
        // Error is automatically handled by api wrapper
        alert(`Failed to delete: ${result.error.message}`)
      }
    } catch (error) {
      alert('Failed to delete: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setDeletingRawId(null)
    }
  }

  // Update raw data title
  const handleUpdateTitle = async (rawDataId: string, newTitle: string) => {
    try {
      const response = await fetch('/api/raw-data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-title',
          rawDataId,
          title: newTitle
        })
      })
      const data = await response.json()
      if (data.success) {
        await loadSavedRawData(historyPage, historyParseFilter)
        setEditingRawId(null)
        setEditingTitle('')
      } else {
        alert('Failed to update title: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      alert('Failed to update title: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  // Save batch logs - includes RAW JSON for traceability
  const handleSaveBatch = async () => {
    if (batchPreview.length === 0) return
    
    setBatchParsing(true)
    try {
      // Save ALL logs with the ORIGINAL raw JSON for traceability
      const response = await fetch('/api/chat-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logs: batchPreview,
          source: 'batch_import',
          rawJson: batchJson  // <-- This saves the ORIGINAL raw JSON!
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setShowBatchImport(false)
        setBatchJson('')
        setBatchPreview([])
        setBatchError(null)
        await loadLogs()
      } else {
        alert('Failed to save: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      alert('Failed to save: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setBatchParsing(false)
    }
  }

  // ========================================
  // ENHANCED BATCH IMPORT FUNCTIONS
  // ========================================

  // Step 1: Save raw JSON only (no parsing) - with duplicate detection
  const handleSaveRawDataOnly = async (forceSave: boolean = false) => {
    if (!batchJson.trim()) return
    
    setSavingRaw(true)
    setRawSaveResult(null)
    setDuplicateWarning(null)
    
    try {
      // Use new API wrapper with automatic error handling
      const result = await api.post('/api/raw-data', {
        action: 'save-raw',
        rawJson: batchJson,
        sourceType: 'batch_import',
        forceSave: forceSave
      })
      
      // Handle business rule response (409 - duplicate detected)
      if (result.businessRule) {
        const data = result.error as any
        setDuplicateWarning({
          isDuplicate: true,
          duplicateType: result.businessRule.type.toLowerCase() as any,
          existingRawDataId: result.businessRule.existingData,
          existingChatLogId: data?.existingChatLogId,
          existingTitle: data?.existingTitle,
          matchPercentage: data?.matchPercentage,
          matchedMessages: data?.matchedMessages,
          totalMessages: data?.totalMessages,
          newMessages: data?.newMessages,
          hint: result.businessRule.hint,
          allowForceSave: result.businessRule.action === 'ALLOW_FORCE'
        })
        setShowDuplicateModal(true)
        setRawSaveResult({
          success: false,
          message: result.businessRule.hint
        })
        setSavingRaw(false)
        return
      }
      
      if (result.success && result.data) {
        setRawSaveResult({
          success: true,
          message: `✅ Raw data saved! ID: ${result.data.rawDataId}`,
          rawDataId: result.data.rawDataId
        })
        // Move to history step and load saved data
        await loadSavedRawData()
        setBatchStep('history')
      } else if (result.error) {
        setRawSaveResult({
          success: false,
          message: result.error.message
        })
      }
    } catch (error) {
      setRawSaveResult({
        success: false,
        message: 'Error: ' + (error instanceof Error ? error.message : 'Unknown error')
      })
    } finally {
      setSavingRaw(false)
    }
  }

  // Handle force save (for evolved conversations)
  const handleForceSave = () => {
    setShowDuplicateModal(false)
    handleSaveRawDataOnly(true)
  }

  // Handle view existing raw data
  const handleViewExistingRawData = (rawDataId: string) => {
    // Open in new tab or show modal
    window.open(`/raw-data/${rawDataId}`, '_blank')
  }

  // Step 2: Parse and save chat data from selected raw - uses server-side parsing
  const handleParseAndSaveFromRaw = async (rawId?: string) => {
    const idToUse = rawId || selectedRawId
    if (!idToUse) return
    
    setBatchParsing(true)
    setBatchError(null)
    setParsingProgress(0)
    setParsingStage('Loading raw data...')
    setSelectedRawId(idToUse)
    
    // Create AbortController for timeout (increased to 180 seconds for large datasets)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
      setBatchError('Request timed out after 3 minutes. The data may be too large.')
      setBatchParsing(false)
      setParsingProgress(0)
      setParsingStage('')
    }, 180000) // 3 minute timeout for large datasets
    
    try {
      // Get raw JSON
      setParsingProgress(10)
      setParsingStage('Fetching raw data...')
      const response = await fetch(`/api/raw-data?action=raw&rawDataId=${idToUse}`, {
        signal: controller.signal
      })
      const rawJson = await response.text()
      
      // Use server-side parsing API to prevent UI freezing
      setParsingProgress(30)
      setParsingStage('Parsing data on server...')
      const parseResponse = await fetch('/api/chat-logs/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'parse-only',
          rawJson: rawJson
        }),
        signal: controller.signal
      })
      
      const parseResult = await parseResponse.json()
      
      if (!parseResult.success) {
        clearTimeout(timeoutId)
        setBatchError(parseResult.error || 'Failed to parse raw data')
        setBatchParsing(false)
        setParsingProgress(0)
        setParsingStage('')
        return
      }
      
      if (parseResult.logs.length === 0) {
        clearTimeout(timeoutId)
        setBatchError('No valid session data found in raw data')
        setBatchParsing(false)
        setParsingProgress(0)
        setParsingStage('')
        return
      }
      
      // Save to chat logs (with raw data link)
      setParsingProgress(70)
      setParsingStage('Saving to database...')
      const saveResponse = await fetch('/api/chat-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logs: parseResult.logs,
          source: 'batch_import',
          rawJson: rawJson,
          linkToRawId: idToUse
        }),
        signal: controller.signal
      })
      
      const result = await saveResponse.json()
      
      clearTimeout(timeoutId)
      
      if (result.success) {
        // Update parse status to 'parsed'
        await fetch('/api/raw-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update-status',
            rawDataId: idToUse,
            parseStatus: 'parsed'
          })
        })
        
        setBatchPreview(parseResult.logs)
        setBatchStep('parse')
        setParsingProgress(100)
        setParsingStage(`Complete! Imported: ${result.results?.imported || 0}, Updated: ${result.results?.updated || 0}`)
        await loadSavedRawData(historyPage, historyParseFilter)
        await loadLogs()
        setTimeout(() => {
          setParsingProgress(0)
          setParsingStage('')
        }, 3000)
      } else {
        setBatchError(result.error || 'Failed to save chat logs')
        setParsingProgress(0)
        setParsingStage('')
      }
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        // Already handled by timeout
      } else {
        setBatchError(error instanceof Error ? error.message : 'Unknown error')
        setParsingProgress(0)
        setParsingStage('')
      }
    } finally {
      setBatchParsing(false)
    }
  }

  // Test connection to chat.z.ai API
  const testAutoFetchConnection = async () => {
    if (!authCookie.trim()) {
      alert('Please enter your auth cookie first')
      return
    }
    
    setAutoFetching(true)
    setAutoFetchResult(null)
    
    try {
      const response = await fetch(`/api/chat-logs/fetch?authCookie=${encodeURIComponent(authCookie)}&chatId=${chatId}`)
      const data = await response.json()
      
      if (data.success) {
        setConnectionTested(true)
        setMessageCount(data.messageCount || 0)
        setAutoFetchResult({
          success: true,
          message: `✅ Connected! Found ${data.messageCount} messages in chat "${data.title || 'Untitled'}"`
        })
      } else {
        setConnectionTested(false)
        setAutoFetchResult({
          success: false,
          message: data.error || 'Connection failed'
        })
      }
    } catch (error) {
      setConnectionTested(false)
      setAutoFetchResult({
        success: false,
        message: 'Connection test failed: ' + (error instanceof Error ? error.message : 'Unknown error')
      })
    } finally {
      setAutoFetching(false)
    }
  }

  // Discover available chats
  const discoverChats = async () => {
    if (!authCookie.trim()) {
      alert('Please enter your auth cookie first')
      return
    }
    
    setLoadingChats(true)
    setAvailableChats([])
    
    try {
      const response = await fetch(`/api/chat-logs/fetch?action=list-chats&authCookie=${encodeURIComponent(authCookie)}`)
      const data = await response.json()
      
      if (data.success) {
        setAvailableChats(data.chats || [])
        setAutoFetchResult({
          success: true,
          message: `Found ${data.chats?.length || 0} chats. Click on one to select it.`
        })
      } else {
        setAutoFetchResult({
          success: false,
          message: data.error || 'Failed to discover chats'
        })
      }
    } catch (error) {
      setAutoFetchResult({
        success: false,
        message: 'Failed to discover chats: ' + (error instanceof Error ? error.message : 'Unknown error')
      })
    } finally {
      setLoadingChats(false)
    }
  }

  // Auto fetch all logs from chat.z.ai
  const handleAutoFetch = async () => {
    if (!authCookie.trim()) {
      alert('Please enter your auth cookie')
      return
    }
    
    setAutoFetching(true)
    setAutoFetchResult(null)
    
    try {
      const response = await fetch('/api/chat-logs/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authCookie,
          chatId,
          autoDiscover: true,
          saveToDb: true
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setAutoFetchResult({
          success: true,
          message: `✅ Extracted ${data.logsExtracted} logs from ${data.messageCount} messages`,
          logs: data.logs
        })
        await loadLogs()
      } else {
        setAutoFetchResult({
          success: false,
          message: data.error || 'Fetch failed'
        })
      }
    } catch (error) {
      setAutoFetchResult({
        success: false,
        message: 'Fetch failed: ' + (error instanceof Error ? error.message : 'Unknown error')
      })
    } finally {
      setAutoFetching(false)
    }
  }

  // Save auto-fetched logs to database
  const handleSaveAutoFetch = async () => {
    if (!autoFetchResult?.logs?.length) return
    
    setAutoFetching(true)
    
    try {
      for (const log of autoFetchResult.logs) {
        await fetch('/api/chat-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionDate: log.sessionDate,
            title: log.title,
            summary: log.summary,
            issuesSolved: log.issuesSolved || [],
            featuresAdded: log.featuresAdded || [],
            filesModified: log.filesModified || [],
            commits: log.commits || [],
            notes: log.notes || log.technicalDetails || '',
            highlights: log.highlights || [],
            source: 'chat-api-auto'
          })
        })
      }
      
      setShowAutoFetch(false)
      setAutoFetchResult(null)
      await loadLogs()
    } catch (error) {
      alert('Failed to save logs: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setAutoFetching(false)
    }
  }

  // Load logs from database (summary only for fast loading)
  const loadLogs = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      params.set('summary', 'true') // Load summaries only for speed
      
      const response = await fetch(`/api/chat-logs?${params.toString()}`)
      const data = await response.json()
      
      if (data.success && data.logs) {
        // Mark as summaries
        setLogs(data.logs.map((log: ChatLog) => ({ ...log, isSummary: true })))
      }
    } catch (error) {
      console.error('Failed to load logs:', error)
    } finally {
      setIsLoading(false)
    }
  }, [dateFrom, dateTo])

  // Load full log details on demand (lazy loading)
  const loadLogDetails = useCallback(async (logId: string) => {
    // Check if already loaded
    if (loadedDetails[logId]) {
      return loadedDetails[logId]
    }
    
    setLoadingDetails(logId)
    try {
      const response = await fetch(`/api/chat-logs?id=${logId}`)
      const data = await response.json()
      
      if (data.success && data.log) {
        const fullLog = { ...data.log, isSummary: false }
        // Cache the loaded details
        setLoadedDetails(prev => ({ ...prev, [logId]: fullLog }))
        // Update the logs array with full data
        setLogs(prev => prev.map(log => log.id === logId ? fullLog : log))
        return fullLog
      }
    } catch (error) {
      console.error('Failed to load log details:', error)
    } finally {
      setLoadingDetails(null)
    }
    return null
  }, [loadedDetails])

  // Load available import dates
  const loadAvailableDates = useCallback(async () => {
    try {
      const response = await fetch('/api/chat-logs/import')
      const data = await response.json()
      if (data.success && data.availableDates) {
        setAvailableDates(data.availableDates)
      }
    } catch (error) {
      console.error('Failed to load available dates:', error)
    }
  }, [])

  // Load logs on mount
  useEffect(() => {
    setMounted(true)
    loadLogs()
    loadAvailableDates()
    loadAnalyzeStatus()
  }, [loadLogs, loadAvailableDates])

  // Reload logs when date filters change
  useEffect(() => {
    if (mounted) {
      loadLogs()
    }
  }, [dateFrom, dateTo, mounted, loadLogs])

  // Load analyze status (pending count)
  const loadAnalyzeStatus = async () => {
    try {
      const response = await fetch('/api/chat-logs/analyze?action=status')
      const data = await response.json()
      if (data.success) {
        setPendingCount(data.pendingCount)
      }
    } catch (error) {
      console.error('Failed to load analyze status:', error)
    }
  }

  // Analyze & Push to AI Dashboard
  const handleAnalyzeAll = async () => {
    setAnalyzing(true)
    setAnalyzeResult(null)

    try {
      const response = await fetch('/api/chat-logs/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze', all: true })
      })

      const data = await response.json()

      if (data.success) {
        setAnalyzeResult({
          success: true,
          message: data.message,
          analyzed: data.analyzed
        })
        await loadAnalyzeStatus()
      } else {
        setAnalyzeResult({
          success: false,
          message: data.error || 'Analysis failed'
        })
      }
    } catch (error) {
      setAnalyzeResult({
        success: false,
        message: 'Analysis failed: ' + (error instanceof Error ? error.message : 'Unknown error')
      })
    } finally {
      setAnalyzing(false)
    }
  }

  // Re-Analyze ALL sessions (including those already analyzed)
  const handleReanalyzeAll = async () => {
    setAnalyzing(true)
    setAnalyzeResult(null)

    try {
      const response = await fetch('/api/chat-logs/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reanalyze', all: true })
      })

      const data = await response.json()

      if (data.success) {
        setAnalyzeResult({
          success: true,
          message: `Re-analysis complete: ${data.issues} issues, ${data.features} features extracted from ${data.analyzed} sessions`,
          analyzed: data.analyzed
        })
        await loadAnalyzeStatus()
      } else {
        setAnalyzeResult({
          success: false,
          message: data.error || 'Re-analysis failed'
        })
      }
    } catch (error) {
      setAnalyzeResult({
        success: false,
        message: 'Re-analysis failed: ' + (error instanceof Error ? error.message : 'Unknown error')
      })
    } finally {
      setAnalyzing(false)
    }
  }

  // Analyze selected logs
  const handleAnalyzeSelected = async (logIds: string[]) => {
    if (logIds.length === 0) return

    setAnalyzing(true)
    setAnalyzeResult(null)

    try {
      const response = await fetch('/api/chat-logs/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze', logIds })
      })

      const data = await response.json()

      if (data.success) {
        setAnalyzeResult({
          success: true,
          message: data.message,
          analyzed: data.analyzed
        })
        await loadAnalyzeStatus()
      } else {
        setAnalyzeResult({
          success: false,
          message: data.error || 'Analysis failed'
        })
      }
    } catch (error) {
      setAnalyzeResult({
        success: false,
        message: 'Analysis failed: ' + (error instanceof Error ? error.message : 'Unknown error')
      })
    } finally {
      setAnalyzing(false)
    }
  }

  // Import logs for selected date
  const handleImport = async () => {
    if (!importDate) return
    
    setImporting(true)
    setImportResult(null)
    
    try {
      const response = await fetch('/api/chat-logs/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: importDate })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setImportResult({ 
          message: data.message,
          results: data.results
        })
        await loadLogs()
      } else {
        setImportResult({ message: data.error || 'Import failed' })
      }
    } catch (error) {
      setImportResult({ 
        message: 'Import failed: ' + (error instanceof Error ? error.message : 'Unknown error')
      })
    } finally {
      setImporting(false)
    }
  }

  // Import all available dates
  const handleImportAll = async () => {
    if (availableDates.length === 0) return
    
    setImporting(true)
    setImportResult(null)
    
    try {
      const allDates = availableDates.map(d => d.date)
      const response = await fetch('/api/chat-logs/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dates: allDates })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setImportResult({ 
          message: data.message,
          results: data.results
        })
        await loadLogs()
      } else {
        setImportResult({ message: data.error || 'Import failed' })
      }
    } catch (error) {
      setImportResult({ 
        message: 'Import failed: ' + (error instanceof Error ? error.message : 'Unknown error')
      })
    } finally {
      setImporting(false)
    }
  }

  // Save new log manually
  const handleSaveLog = async () => {
    if (!newLog.title.trim()) {
      alert('Please enter a title')
      return
    }
    
    setSaving(true)
    
    try {
      const response = await fetch('/api/chat-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionDate: newLog.sessionDate,
          title: newLog.title,
          summary: newLog.summary,
          issuesSolved: newLog.issuesSolved.split('\n').filter(s => s.trim()),
          featuresAdded: newLog.featuresAdded.split('\n').filter(s => s.trim()),
          filesModified: newLog.filesModified.split('\n').filter(s => s.trim()),
          commits: newLog.commits.split(',').map(s => s.trim()).filter(s => s),
          notes: newLog.notes,
          source: 'manual'
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Reset form and close
        setNewLog(EMPTY_LOG)
        setShowAddLog(false)
        await loadLogs()
      } else {
        alert('Failed to save: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      alert('Failed to save: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  // Delete a log
  const handleDeleteLog = async (logId: string) => {
    if (!confirm('Are you sure you want to delete this log?')) return
    
    try {
      const response = await fetch(`/api/chat-logs?id=${logId}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        await loadLogs()
      } else {
        alert('Failed to delete: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      alert('Failed to delete: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  // Fetch logs from worklog.md automatically
  const handleFetchFromWorklog = async () => {
    setFetching(true)
    setFetchResult(null)
    
    try {
      const response = await fetch('/api/chat-logs/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionDate: newLog.sessionDate || new Date().toISOString().split('T')[0],
          fetchAll: true 
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setFetchResult({ 
          message: data.message,
          results: data.results
        })
        await loadLogs()
      } else {
        setFetchResult({ message: data.error || 'Fetch failed' })
      }
    } catch (error) {
      setFetchResult({ 
        message: 'Fetch failed: ' + (error instanceof Error ? error.message : 'Unknown error')
      })
    } finally {
      setFetching(false)
    }
  }

  // Load fetch stats
  const loadFetchStats = async () => {
    try {
      const response = await fetch('/api/chat-logs/fetch')
      const data = await response.json()
      if (data.success) {
        setFetchStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to load fetch stats:', error)
    }
  }

  // Load fetch stats on mount
  useEffect(() => {
    loadFetchStats()
  }, [])

  // Extract logs from chat text using AI
  const handleExtractPreview = async () => {
    if (!chatText.trim()) {
      alert('Please paste your chat conversation text')
      return
    }
    
    setExtracting(true)
    setExtractPreview(null)
    
    try {
      const response = await fetch('/api/chat-logs/extract', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatText: chatText,
          sessionDate: extractDate
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setExtractPreview(data.data)
      } else {
        alert('Failed to extract: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      alert('Failed to extract: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setExtracting(false)
    }
  }

  // Save extracted log
  const handleSaveExtract = async () => {
    if (!extractPreview) return
    
    setExtracting(true)
    
    try {
      const response = await fetch('/api/chat-logs/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatText: chatText,
          sessionDate: extractDate
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setShowExtract(false)
        setChatText('')
        setExtractPreview(null)
        await loadLogs()
      } else {
        alert('Failed to save: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      alert('Failed to save: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setExtracting(false)
    }
  }

  const exportLogs = () => {
    const data = JSON.stringify(filteredLogs, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-logs-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Load logs without raw data for re-import
  const loadLogsWithoutRaw = async () => {
    try {
      const response = await fetch('/api/raw-data/re-import')
      const data = await response.json()
      if (data.success) {
        setLogsWithoutRaw(data.chatLogs)
      }
    } catch (error) {
      console.error('Failed to load logs without raw data:', error)
    }
  }

  // Handle re-import raw data
  const handleReImport = async () => {
    if (!selectedLogId || !reImportJson.trim()) {
      alert('Please select a log and paste the raw JSON')
      return
    }

    setReImporting(true)
    setReImportResult(null)

    try {
      const response = await fetch('/api/raw-data/re-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatLogId: selectedLogId,
          rawJson: reImportJson
        })
      })

      const data = await response.json()

      if (data.success) {
        setReImportResult({
          success: true,
          message: `✅ Raw data saved! ID: ${data.rawDataId}, Issues: ${data.issuesLinked}, Features: ${data.featuresLinked}`
        })
        setReImportJson('')
        setSelectedLogId(null)
        await loadLogsWithoutRaw()
        await loadLogs()
      } else {
        setReImportResult({
          success: false,
          message: data.error || 'Failed to save raw data'
        })
      }
    } catch (error) {
      setReImportResult({
        success: false,
        message: 'Error: ' + (error instanceof Error ? error.message : 'Unknown error')
      })
    } finally {
      setReImporting(false)
    }
  }

  // Filter logs by search query
  const filteredLogs = logs.filter(log => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch = (
        log.title.toLowerCase().includes(query) ||
        log.summary?.toLowerCase().includes(query) ||
        (log.issuesSolved?.some(i => i.toLowerCase().includes(query)) ?? false) ||
        (log.featuresAdded?.some(f => f.toLowerCase().includes(query)) ?? false) ||
        (log.filesModified?.some(f => f.toLowerCase().includes(query)) ?? false)
      )
      if (!matchesSearch) return false
    }
    return true
  })

  // Group logs by date
  const groupedLogs = filteredLogs.reduce((acc, log) => {
    const date = log.sessionDate
    if (!acc[date]) acc[date] = []
    acc[date].push(log)
    return acc
  }, {} as Record<string, ChatLog[]>)

  // Sort dates descending
  const sortedDates = Object.keys(groupedLogs).sort((a, b) => b.localeCompare(a))

  // Calculate stats (handle both summary mode and full mode)
  const stats = {
    total: logs.length,
    issues: logs.reduce((acc, l) => acc + (l.issuesCount ?? l.issuesSolved?.length ?? 0), 0),
    features: logs.reduce((acc, l) => acc + (l.featuresCount ?? l.featuresAdded?.length ?? 0), 0),
    files: logs.reduce((acc, l) => acc + (l.filesModified?.length ?? 0), 0)
  }

  // Clear date filters
  const clearFilters = () => {
    setDateFrom('')
    setDateTo('')
    setSearchQuery('')
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.primary }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: colors.text }}>Chat Session Logs</h2>
          <p className="mt-1" style={{ color: colors.textMuted }}>
            Track work done, issues solved, and features added
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* AI Extract from Chat Button - PRIMARY */}
          <button
            onClick={() => setShowExtract(true)}
            className="px-4 py-2 rounded-lg flex items-center gap-2"
            style={{ backgroundColor: colors.primary, color: 'white' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            🤖 AI Extract
          </button>
          
          {/* Batch Import Button */}
          <button
            onClick={() => setShowBatchImport(true)}
            className="px-4 py-2 rounded-lg flex items-center gap-2"
            style={{ backgroundColor: colors.accent, color: 'white' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            📥 Batch Import
          </button>
          
          {/* Auto Fetch from chat.z.ai - PRIMARY BUTTON */}
          <button
            onClick={() => setShowAutoFetch(true)}
            className="px-4 py-2 rounded-lg flex items-center gap-2 font-semibold"
            style={{ 
              background: `linear-gradient(135deg, ${colors.success}, ${colors.primary})`, 
              color: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            ⚡ Auto Fetch
          </button>
          
          {/* Re-Import Raw Data Button */}
          <button
            onClick={() => {
              setShowReImport(true)
              loadLogsWithoutRaw()
            }}
            className="px-4 py-2 rounded-lg border flex items-center gap-2"
            style={{ borderColor: colors.warning, color: colors.warning, backgroundColor: alpha(colors.warning, 10) }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            🔄 Re-Import Raw
          </button>
          
          {/* Fetch from Worklog Button */}
          <button
            onClick={handleFetchFromWorklog}
            disabled={fetching}
            className="px-4 py-2 rounded-lg border flex items-center gap-2 disabled:opacity-50"
            style={{ borderColor: colors.border, color: colors.text, backgroundColor: alpha(colors.card, 50) }}
          >
            {fetching ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: colors.primary }} />
                Fetching...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Fetch Worklog
              </>
            )}
          </button>
          
          <button
            onClick={() => setShowImport(!showImport)}
            className="px-4 py-2 rounded-lg border flex items-center gap-2"
            style={{ 
              borderColor: showImport ? colors.success : colors.border, 
              color: colors.text, 
              backgroundColor: showImport ? alpha(colors.success, 10) : alpha(colors.card, 50)
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import
          </button>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 rounded-lg border flex items-center gap-2"
            style={{ 
              borderColor: showFilters ? colors.primary : colors.border, 
              color: colors.text, 
              backgroundColor: showFilters ? alpha(colors.primary, 10) : alpha(colors.card, 50)
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
          </button>
          
          <button
            onClick={exportLogs}
            className="px-4 py-2 rounded-lg border flex items-center gap-2"
            style={{ borderColor: colors.border, color: colors.text, backgroundColor: alpha(colors.card, 50) }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
        </div>
      </div>

      {/* AI Extract Modal */}
      {showExtract && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowExtract(false)}
        >
          <div 
            className="w-full max-w-4xl rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: colors.bg }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div 
              className="p-4 border-b flex items-center justify-between"
              style={{ borderColor: colors.border }}
            >
              <div>
                <h3 className="text-lg font-semibold" style={{ color: colors.text }}>
                  🤖 AI Chat Log Extractor
                </h3>
                <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                  Paste your chat conversation and AI will extract comprehensive logs
                </p>
              </div>
              <button
                onClick={() => setShowExtract(false)}
                className="p-1 rounded-lg"
                style={{ color: colors.textMuted }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-4 space-y-4">
              {/* Date and Actions */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium" style={{ color: colors.textMuted }}>
                    Session Date
                  </label>
                  <input
                    type="date"
                    value={extractDate}
                    onChange={(e) => setExtractDate(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg border"
                    style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                  />
                </div>
                <div className="flex gap-2 pt-5">
                  <button
                    onClick={handleExtractPreview}
                    disabled={extracting || !chatText.trim()}
                    className="px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
                    style={{ backgroundColor: colors.accent, color: 'white' }}
                  >
                    {extracting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Preview
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Chat Text Input */}
              <div>
                <label className="text-sm font-medium" style={{ color: colors.textMuted }}>
                  Paste Chat Conversation Text
                </label>
                <textarea
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  placeholder="Paste your chat conversation here. AI will analyze and extract:
- Title and Summary
- Highlights and Key Achievements
- Issues Fixed
- Implementations/Features Added
- Future Plans/Next Steps
- Files Modified
- Technical Details"
                  rows={10}
                  className="w-full mt-1 px-3 py-2 rounded-lg border font-mono text-sm"
                  style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                />
              </div>
              
              {/* Preview Results */}
              {extractPreview && (
                <div 
                  className="p-4 rounded-xl border"
                  style={{ backgroundColor: alpha(colors.card, 30), borderColor: colors.success }}
                >
                  <h4 className="font-semibold mb-3 flex items-center gap-2" style={{ color: colors.success }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Extracted Preview
                  </h4>
                  
                  <div className="space-y-4">
                    {/* Title */}
                    <div>
                      <label className="text-xs font-medium uppercase" style={{ color: colors.textMuted }}>Title</label>
                      <p className="font-semibold" style={{ color: colors.text }}>{extractPreview.title}</p>
                    </div>
                    
                    {/* Summary */}
                    {extractPreview.summary && (
                      <div>
                        <label className="text-xs font-medium uppercase" style={{ color: colors.textMuted }}>Summary</label>
                        <p className="text-sm" style={{ color: colors.textSecondary }}>{extractPreview.summary}</p>
                      </div>
                    )}
                    
                    {/* Highlights */}
                    {extractPreview.highlights?.length > 0 && (
                      <div>
                        <label className="text-xs font-medium uppercase" style={{ color: colors.textMuted }}>⭐ Highlights</label>
                        <ul className="mt-1 space-y-1">
                          {extractPreview.highlights.map((h: string, i: number) => (
                            <li key={i} className="text-sm flex items-start gap-2" style={{ color: colors.textSecondary }}>
                              <span style={{ color: colors.warning }}>★</span> {h}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Issues Fixed */}
                    {extractPreview.issuesFixed?.length > 0 && (
                      <div>
                        <label className="text-xs font-medium uppercase" style={{ color: colors.textMuted }}>🔧 Issues Fixed</label>
                        <ul className="mt-1 space-y-1">
                          {extractPreview.issuesFixed.map((issue: string, i: number) => (
                            <li key={i} className="text-sm flex items-start gap-2" style={{ color: colors.textSecondary }}>
                              <span style={{ color: colors.success }}>✓</span> {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Implementations */}
                    {extractPreview.implementations?.length > 0 && (
                      <div>
                        <label className="text-xs font-medium uppercase" style={{ color: colors.textMuted }}>🚀 Implementations</label>
                        <ul className="mt-1 space-y-1">
                          {extractPreview.implementations.map((impl: string, i: number) => (
                            <li key={i} className="text-sm flex items-start gap-2" style={{ color: colors.textSecondary }}>
                              <span style={{ color: colors.primary }}>+</span> {impl}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Future Plans */}
                    {extractPreview.futurePlans?.length > 0 && (
                      <div>
                        <label className="text-xs font-medium uppercase" style={{ color: colors.textMuted }}>📋 Future Plans</label>
                        <ul className="mt-1 space-y-1">
                          {extractPreview.futurePlans.map((plan: string, i: number) => (
                            <li key={i} className="text-sm flex items-start gap-2" style={{ color: colors.textSecondary }}>
                              <span style={{ color: colors.accent }}>→</span> {plan}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Files Modified */}
                    {extractPreview.filesModified?.length > 0 && (
                      <div>
                        <label className="text-xs font-medium uppercase" style={{ color: colors.textMuted }}>📁 Files Modified</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {extractPreview.filesModified.map((file: string, i: number) => (
                            <span 
                              key={i}
                              className="px-2 py-1 rounded text-xs font-mono"
                              style={{ backgroundColor: alpha(colors.accent, 20), color: colors.accent }}
                            >
                              {file}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Technical Details */}
                    {extractPreview.technicalDetails && (
                      <div>
                        <label className="text-xs font-medium uppercase" style={{ color: colors.textMuted }}>⚙️ Technical Details</label>
                        <p className="text-sm mt-1 p-2 rounded" style={{ color: colors.textSecondary, backgroundColor: alpha(colors.bgSecondary, 30) }}>
                          {extractPreview.technicalDetails}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div 
              className="p-4 border-t flex justify-end gap-2"
              style={{ borderColor: colors.border }}
            >
              <button
                onClick={() => {
                  setShowExtract(false)
                  setChatText('')
                  setExtractPreview(null)
                }}
                className="px-4 py-2 rounded-lg border"
                style={{ borderColor: colors.border, color: colors.text }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveExtract}
                disabled={extracting || !extractPreview}
                className="px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: colors.success, color: 'white' }}
              >
                {extracting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save to Logs
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto Fetch Modal */}
      {showAutoFetch && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowAutoFetch(false)}
        >
          <div 
            className="w-full max-w-3xl rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: colors.bg }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div 
              className="p-4 border-b"
              style={{ 
                borderColor: colors.border,
                background: `linear-gradient(135deg, ${alpha(colors.success, 10)}, ${alpha(colors.primary, 10)})`
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: colors.text }}>
                    ⚡ Auto Fetch from chat.z.ai
                  </h3>
                  <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                    Automatically fetch and parse your chat history
                  </p>
                </div>
                <button
                  onClick={() => setShowAutoFetch(false)}
                  className="p-2 rounded-lg hover:bg-black/5"
                  style={{ color: colors.textMuted }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="p-4 space-y-4">
              {/* Instructions */}
              <div 
                className="p-3 rounded-lg border-l-4"
                style={{ 
                  backgroundColor: alpha(colors.accent, 10),
                  borderColor: colors.accent 
                }}
              >
                <h4 className="font-semibold text-sm mb-2" style={{ color: colors.text }}>
                  🔑 How to get your Auth Cookie:
                </h4>
                <ol className="text-sm space-y-1 list-decimal list-inside" style={{ color: colors.textSecondary }}>
                  <li>Open <a href="https://chat.z.ai" target="_blank" rel="noopener" className="underline" style={{ color: colors.primary }}>chat.z.ai</a> in your browser and login</li>
                  <li>Open DevTools (F12) → Network tab</li>
                  <li>Refresh the page and click on any API request</li>
                  <li>Find the <strong>Cookie</strong> header in Request Headers</li>
                  <li>Copy the entire cookie value and paste it below</li>
                </ol>
              </div>
              
              {/* Chat ID */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium" style={{ color: colors.textMuted }}>
                    Chat ID
                  </label>
                  <button
                    onClick={discoverChats}
                    disabled={loadingChats || !authCookie.trim()}
                    className="text-xs px-2 py-1 rounded border flex items-center gap-1 disabled:opacity-50"
                    style={{ borderColor: colors.accent, color: colors.accent }}
                  >
                    {loadingChats ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2" style={{ borderColor: colors.accent }} />
                        Loading...
                      </>
                    ) : (
                      <>
                        🔍 Discover Chats
                      </>
                    )}
                  </button>
                </div>
                <input
                  type="text"
                  value={chatId}
                  onChange={(e) => {
                    setChatId(e.target.value)
                    setConnectionTested(false)
                  }}
                  placeholder="Click 'Discover Chats' to find your chats"
                  className="w-full mt-1 px-3 py-2 rounded-lg border font-mono text-sm"
                  style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                />
              </div>
              
              {/* Available Chats List */}
              {availableChats.length > 0 && (
                <div 
                  className="p-3 rounded-lg border max-h-48 overflow-y-auto"
                  style={{ backgroundColor: colors.card, borderColor: colors.border }}
                >
                  <h4 className="text-sm font-medium mb-2" style={{ color: colors.text }}>
                    📋 Available Chats ({availableChats.length})
                  </h4>
                  <div className="space-y-1">
                    {availableChats.map((chat: any) => (
                      <button
                        key={chat.id}
                        onClick={() => {
                          setChatId(chat.id)
                          setConnectionTested(false)
                          setAutoFetchResult(null)
                        }}
                        className="w-full p-2 rounded-lg border text-left transition-colors hover:opacity-80"
                        style={{ 
                          backgroundColor: chatId === chat.id ? alpha(colors.primary, 15) : colors.bg,
                          borderColor: chatId === chat.id ? colors.primary : colors.border
                        }}
                      >
                        <div className="font-medium text-sm truncate" style={{ color: colors.text }}>
                          {chat.title || 'Untitled'}
                        </div>
                        <div className="text-xs mt-0.5 flex items-center gap-3" style={{ color: colors.textMuted }}>
                          <span>📝 {chat.messageCount || 0} messages</span>
                          {chat.createdAt && (
                            <span>📅 {new Date(chat.createdAt * 1000).toLocaleDateString()}</span>
                          )}
                        </div>
                        <div className="text-xs font-mono mt-0.5 opacity-50" style={{ color: colors.textMuted }}>
                          {chat.id}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Auth Cookie */}
              <div>
                <label className="text-sm font-medium" style={{ color: colors.textMuted }}>
                  Auth Cookie (from browser)
                </label>
                <textarea
                  value={authCookie}
                  onChange={(e) => {
                    setAuthCookie(e.target.value)
                    setConnectionTested(false)
                  }}
                  placeholder="Paste your entire Cookie header value here..."
                  rows={3}
                  className="w-full mt-1 px-3 py-2 rounded-lg border font-mono text-xs"
                  style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                />
                <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
                  The cookie is only used for this request and is not stored permanently.
                </p>
              </div>
              
              {/* Test Connection Button */}
              <div className="flex gap-2">
                <button
                  onClick={testAutoFetchConnection}
                  disabled={autoFetching || !authCookie.trim()}
                  className="px-4 py-2 rounded-lg border flex items-center gap-2 disabled:opacity-50"
                  style={{ borderColor: colors.primary, color: colors.primary, backgroundColor: alpha(colors.primary, 5) }}
                >
                  {autoFetching ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: colors.primary }} />
                      Testing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.398 8.266c5.289-5.29 13.915-5.29 19.204 0" />
                      </svg>
                      Test Connection
                    </>
                  )}
                </button>
                
                {connectionTested && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: alpha(colors.success, 10) }}>
                    <span style={{ color: colors.success }}>✓</span>
                    <span className="text-sm" style={{ color: colors.textSecondary }}>
                      {messageCount} messages available
                    </span>
                  </div>
                )}
              </div>
              
              {/* Result */}
              {autoFetchResult && (
                <div 
                  className="p-4 rounded-lg border"
                  style={{ 
                    backgroundColor: autoFetchResult.success ? alpha(colors.success, 10) : alpha(colors.error, 10),
                    borderColor: autoFetchResult.success ? colors.success : colors.error
                  }}
                >
                  <p className="font-medium" style={{ color: autoFetchResult.success ? colors.success : colors.error }}>
                    {autoFetchResult.message}
                  </p>
                  
                  {/* Preview logs */}
                  {autoFetchResult.logs && autoFetchResult.logs.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm font-medium" style={{ color: colors.text }}>
                        Extracted Logs Preview:
                      </p>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {autoFetchResult.logs.slice(0, 5).map((log: any, i: number) => (
                          <div 
                            key={i}
                            className="p-2 rounded border text-sm"
                            style={{ backgroundColor: colors.card, borderColor: colors.border }}
                          >
                            <div className="font-medium" style={{ color: colors.text }}>{log.title}</div>
                            <div className="text-xs mt-1" style={{ color: colors.textMuted }}>
                              {log.sessionDate} • {log.filesModified?.length || 0} files • {log.featuresAdded?.length || 0} features
                            </div>
                          </div>
                        ))}
                        {autoFetchResult.logs.length > 5 && (
                          <p className="text-xs text-center" style={{ color: colors.textMuted }}>
                            ... and {autoFetchResult.logs.length - 5} more
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div 
              className="p-4 border-t flex justify-end gap-2"
              style={{ borderColor: colors.border }}
            >
              <button
                onClick={() => setShowAutoFetch(false)}
                className="px-4 py-2 rounded-lg border"
                style={{ borderColor: colors.border, color: colors.text }}
              >
                Cancel
              </button>
              <button
                onClick={handleAutoFetch}
                disabled={autoFetching || !authCookie.trim()}
                className="px-6 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 font-semibold"
                style={{ 
                  background: `linear-gradient(135deg, ${colors.success}, ${colors.primary})`, 
                  color: 'white'
                }}
              >
                {autoFetching ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Fetching...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Fetch & Extract Logs
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Log Modal */}
      {showAddLog && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowAddLog(false)}
        >
          <div 
            className="w-full max-w-2xl rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: colors.bg }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div 
              className="p-4 border-b flex items-center justify-between"
              style={{ borderColor: colors.border }}
            >
              <h3 className="text-lg font-semibold" style={{ color: colors.text }}>
                Add New Chat Log
              </h3>
              <button
                onClick={() => setShowAddLog(false)}
                className="p-1 rounded-lg"
                style={{ color: colors.textMuted }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-4 space-y-4">
              {/* Date */}
              <div>
                <label className="text-sm font-medium" style={{ color: colors.textMuted }}>
                  Session Date *
                </label>
                <input
                  type="date"
                  value={newLog.sessionDate}
                  onChange={(e) => setNewLog({ ...newLog, sessionDate: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border"
                  style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                />
              </div>
              
              {/* Title */}
              <div>
                <label className="text-sm font-medium" style={{ color: colors.textMuted }}>
                  Title *
                </label>
                <input
                  type="text"
                  value={newLog.title}
                  onChange={(e) => setNewLog({ ...newLog, title: e.target.value })}
                  placeholder="e.g., Fixed modal positioning issue"
                  className="w-full mt-1 px-3 py-2 rounded-lg border"
                  style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                />
              </div>
              
              {/* Summary */}
              <div>
                <label className="text-sm font-medium" style={{ color: colors.textMuted }}>
                  Summary
                </label>
                <textarea
                  value={newLog.summary}
                  onChange={(e) => setNewLog({ ...newLog, summary: e.target.value })}
                  placeholder="Brief description of what was accomplished..."
                  rows={2}
                  className="w-full mt-1 px-3 py-2 rounded-lg border"
                  style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                />
              </div>
              
              {/* Issues Solved */}
              <div>
                <label className="text-sm font-medium" style={{ color: colors.textMuted }}>
                  Issues Solved (one per line)
                </label>
                <textarea
                  value={newLog.issuesSolved}
                  onChange={(e) => setNewLog({ ...newLog, issuesSolved: e.target.value })}
                  placeholder="Modal not centering properly&#10;Button click not working"
                  rows={3}
                  className="w-full mt-1 px-3 py-2 rounded-lg border font-mono text-sm"
                  style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                />
              </div>
              
              {/* Features Added */}
              <div>
                <label className="text-sm font-medium" style={{ color: colors.textMuted }}>
                  Features Added (one per line)
                </label>
                <textarea
                  value={newLog.featuresAdded}
                  onChange={(e) => setNewLog({ ...newLog, featuresAdded: e.target.value })}
                  placeholder="Added date picker component&#10;Implemented search filter"
                  rows={3}
                  className="w-full mt-1 px-3 py-2 rounded-lg border font-mono text-sm"
                  style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                />
              </div>
              
              {/* Files Modified */}
              <div>
                <label className="text-sm font-medium" style={{ color: colors.textMuted }}>
                  Files Modified (one per line)
                </label>
                <textarea
                  value={newLog.filesModified}
                  onChange={(e) => setNewLog({ ...newLog, filesModified: e.target.value })}
                  placeholder="src/components/Modal.tsx&#10;src/hooks/useModal.ts"
                  rows={3}
                  className="w-full mt-1 px-3 py-2 rounded-lg border font-mono text-sm"
                  style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                />
              </div>
              
              {/* Commits */}
              <div>
                <label className="text-sm font-medium" style={{ color: colors.textMuted }}>
                  Commit IDs (comma separated)
                </label>
                <input
                  type="text"
                  value={newLog.commits}
                  onChange={(e) => setNewLog({ ...newLog, commits: e.target.value })}
                  placeholder="abc123, def456"
                  className="w-full mt-1 px-3 py-2 rounded-lg border font-mono text-sm"
                  style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                />
              </div>
              
              {/* Notes */}
              <div>
                <label className="text-sm font-medium" style={{ color: colors.textMuted }}>
                  Notes
                </label>
                <textarea
                  value={newLog.notes}
                  onChange={(e) => setNewLog({ ...newLog, notes: e.target.value })}
                  placeholder="Additional context, decisions made, follow-ups..."
                  rows={2}
                  className="w-full mt-1 px-3 py-2 rounded-lg border"
                  style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                />
              </div>
            </div>
            
            {/* Modal Footer */}
            <div 
              className="p-4 border-t flex justify-end gap-2"
              style={{ borderColor: colors.border }}
            >
              <button
                onClick={() => {
                  setShowAddLog(false)
                  setNewLog(EMPTY_LOG)
                }}
                className="px-4 py-2 rounded-lg border"
                style={{ borderColor: colors.border, color: colors.text }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLog}
                disabled={saving || !newLog.title.trim()}
                className="px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: colors.primary, color: 'white' }}
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Log
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Panel */}
      {showImport && (
        <div 
          className="p-4 rounded-xl border"
          style={{ backgroundColor: alpha(colors.success, 5), borderColor: alpha(colors.success, 30) }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: colors.text }}>
            Import Chat Logs from History
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left side - Date selection */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium" style={{ color: colors.textMuted }}>
                  Select Date to Import
                </label>
                <input
                  type="date"
                  value={importDate}
                  onChange={(e) => setImportDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border"
                  style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleImport}
                  disabled={importing || !importDate}
                  className="flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: colors.success, color: 'white' }}
                >
                  {importing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Import Selected
                    </>
                  )}
                </button>
                
                <button
                  onClick={handleImportAll}
                  disabled={importing || availableDates.length === 0}
                  className="px-4 py-2 rounded-lg border disabled:opacity-50"
                  style={{ borderColor: colors.success, color: colors.success }}
                >
                  Import All
                </button>
              </div>
              
              {importResult && (
                <div 
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: alpha(colors.primary, 10) }}
                >
                  <p className="text-sm" style={{ color: colors.text }}>{importResult.message}</p>
                </div>
              )}
            </div>
            
            {/* Right side - Available dates */}
            <div>
              <label className="text-sm font-medium" style={{ color: colors.textMuted }}>
                Pre-defined Historical Dates
              </label>
              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                {availableDates.map((d) => (
                  <button
                    key={d.date}
                    onClick={() => setImportDate(d.date)}
                    className="w-full text-left p-2 rounded-lg border transition-colors"
                    style={{ 
                      backgroundColor: importDate === d.date ? alpha(colors.primary, 10) : alpha(colors.card, 30),
                      borderColor: importDate === d.date ? colors.primary : colors.border
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium" style={{ color: colors.text }}>{d.date}</span>
                      <span 
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ backgroundColor: alpha(colors.primary, 20), color: colors.primary }}
                      >
                        {d.count} sessions
                      </span>
                    </div>
                  </button>
                ))}
                {availableDates.length === 0 && (
                  <p className="text-sm text-center py-4" style={{ color: colors.textMuted }}>
                    All historical dates have been imported
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Re-Import Raw Data Modal */}
      {showReImport && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowReImport(false)}
        >
          <div 
            className="w-full max-w-3xl rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: colors.bg }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div 
              className="p-4 border-b"
              style={{ 
                borderColor: colors.border,
                background: `linear-gradient(135deg, ${alpha(colors.warning, 10)}, ${alpha(colors.accent, 10)})`
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: colors.text }}>
                    🔄 Re-Import Raw Data
                  </h3>
                  <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                    Add raw JSON for existing chat logs without raw data
                  </p>
                </div>
                <button
                  onClick={() => setShowReImport(false)}
                  className="p-2 rounded-lg hover:bg-black/5"
                  style={{ color: colors.textMuted }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="p-4 space-y-4">
              {/* Logs without raw data */}
              <div>
                <label className="text-sm font-medium" style={{ color: colors.textMuted }}>
                  Logs without raw data ({logsWithoutRaw.length})
                </label>
                <div className="mt-2 max-h-48 overflow-y-auto space-y-2">
                  {logsWithoutRaw.map((log) => (
                    <button
                      key={log.id}
                      onClick={() => setSelectedLogId(log.id)}
                      className="w-full text-left p-3 rounded-lg border transition-colors"
                      style={{ 
                        backgroundColor: selectedLogId === log.id ? alpha(colors.warning, 10) : alpha(colors.card, 30),
                        borderColor: selectedLogId === log.id ? colors.warning : colors.border
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium" style={{ color: colors.text }}>{log.title}</span>
                        <span className="text-xs" style={{ color: colors.textMuted }}>{log.sessionDate}</span>
                      </div>
                      <div className="flex gap-3 mt-1 text-xs" style={{ color: colors.textSecondary }}>
                        <span>🐛 {log.issuesCount} issues</span>
                        <span>✨ {log.featuresCount} features</span>
                      </div>
                    </button>
                  ))}
                  {logsWithoutRaw.length === 0 && (
                    <p className="text-sm text-center py-4" style={{ color: colors.textMuted }}>
                      All logs have raw data linked
                    </p>
                  )}
                </div>
              </div>

              {/* Raw JSON Input */}
              {selectedLogId && (
                <div>
                  <label className="text-sm font-medium" style={{ color: colors.textMuted }}>
                    Paste Raw JSON Response
                  </label>
                  <textarea
                    value={reImportJson}
                    onChange={(e) => setReImportJson(e.target.value)}
                    placeholder="Paste the complete JSON response from chat.z.ai API here..."
                    className="w-full mt-2 p-3 rounded-lg border font-mono text-sm h-64 resize-y"
                    style={{ 
                      backgroundColor: alpha(colors.card, 30), 
                      borderColor: colors.border, 
                      color: colors.text 
                    }}
                  />
                  <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
                    Get raw JSON from chat.z.ai API response. The raw data will be saved with full traceability chain.
                  </p>
                </div>
              )}

              {/* Result */}
              {reImportResult && (
                <div 
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: alpha(reImportResult.success ? colors.success : colors.warning, 10) }}
                >
                  <p className="text-sm" style={{ color: colors.text }}>{reImportResult.message}</p>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div 
              className="p-4 border-t flex justify-end gap-2"
              style={{ borderColor: colors.border }}
            >
              <button
                onClick={() => {
                  setShowReImport(false)
                  setReImportJson('')
                  setSelectedLogId(null)
                  setReImportResult(null)
                }}
                className="px-4 py-2 rounded-lg border"
                style={{ borderColor: colors.border, color: colors.text }}
              >
                Close
              </button>
              <button
                onClick={handleReImport}
                disabled={reImporting || !selectedLogId || !reImportJson.trim()}
                className="px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: colors.warning, color: 'white' }}
              >
                {reImporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Raw Data
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.textMuted }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search logs..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border"
            style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
          />
        </div>

        {/* Date Range Filter */}
        {showFilters && (
          <div 
            className="p-4 rounded-lg border"
            style={{ backgroundColor: alpha(colors.card, 30), borderColor: colors.border }}
          >
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[150px]">
                <label className="text-xs font-medium" style={{ color: colors.textMuted }}>From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                  style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                />
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="text-xs font-medium" style={{ color: colors.textMuted }}>To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                  style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                />
              </div>
              <button
                onClick={clearFilters}
                className="px-4 py-2 rounded-lg border"
                style={{ borderColor: colors.border, color: colors.textMuted }}
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Sessions', value: stats.total, color: colors.primary },
          { label: 'Issues Solved', value: stats.issues, color: colors.success },
          { label: 'Features Added', value: stats.features, color: colors.accent },
          { label: 'Files Modified', value: stats.files, color: colors.warning },
        ].map((stat) => (
          <div 
            key={stat.label}
            className="rounded-xl border p-4"
            style={{ 
              backgroundColor: alpha(colors.card, 50),
              borderColor: colors.border 
            }}
          >
            <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
            <p className="text-sm mt-1" style={{ color: colors.textMuted }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 p-1 rounded-xl border overflow-x-auto" style={{ backgroundColor: alpha(colors.card, 30), borderColor: colors.border }}>
        <button
          onClick={() => setActiveView('logs')}
          className="flex-1 px-4 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-all whitespace-nowrap"
          style={{ 
            backgroundColor: activeView === 'logs' ? colors.primary : 'transparent',
            color: activeView === 'logs' ? 'white' : colors.textSecondary,
            boxShadow: activeView === 'logs' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          📝 Session Logs
        </button>
        <button
          onClick={() => setActiveView('analytics')}
          className="flex-1 px-4 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-all whitespace-nowrap"
          style={{ 
            backgroundColor: activeView === 'analytics' ? colors.success : 'transparent',
            color: activeView === 'analytics' ? 'white' : colors.textSecondary,
            boxShadow: activeView === 'analytics' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          📊 Analytics
        </button>
        <button
          onClick={() => setActiveView('patterns')}
          className="flex-1 px-4 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-all whitespace-nowrap"
          style={{ 
            backgroundColor: activeView === 'patterns' ? colors.warning : 'transparent',
            color: activeView === 'patterns' ? 'white' : colors.textSecondary,
            boxShadow: activeView === 'patterns' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          🐛 Error Patterns
        </button>
      </div>

      {/* Analytics Dashboard View */}
      {activeView === 'analytics' && (
        <AnalyticsDashboardComponent colors={colors} alpha={alpha} />
      )}

      {/* Error Patterns View */}
      {activeView === 'patterns' && (
        <ErrorPatternsView colors={colors} alpha={alpha} />
      )}

      {/* Logs View */}
      {activeView === 'logs' && (
        <>
          {/* Analyze & Push to AI Dashboard Section - Always show for re-analysis */}
          {(pendingCount > 0 || logs.length > 0) && (
            <div 
              className="p-4 rounded-xl border"
              style={{ 
                backgroundColor: alpha(colors.success, 5), 
                borderColor: alpha(colors.success, 30) 
              }}
            >
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div 
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: alpha(colors.success, 15) }}
                  >
                    <svg className="w-5 h-5" style={{ color: colors.success }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: colors.text }}>
                      {pendingCount > 0 
                        ? `${pendingCount} session${pendingCount > 1 ? 's' : ''} pending analysis`
                        : 'Analytics Dashboard Ready'
                      }
                    </p>
                    <p className="text-sm" style={{ color: colors.textMuted }}>
                      {pendingCount > 0 
                        ? 'Analyze and push session data to AI Dashboard for insights'
                        : 'Re-analyze sessions to extract issues and features from raw data'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {pendingCount > 0 && (
                    <button
                      onClick={handleAnalyzeAll}
                      disabled={analyzing}
                      className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all"
                      style={{ 
                        backgroundColor: colors.success, 
                        color: 'white',
                        opacity: analyzing ? 0.7 : 1
                      }}
                    >
                      {analyzing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Analyze & Push
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={handleReanalyzeAll}
                    disabled={analyzing}
                    className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all border"
                    style={{ 
                      borderColor: colors.primary,
                      backgroundColor: alpha(colors.primary, 10),
                      color: colors.primary,
                      opacity: analyzing ? 0.7 : 1
                    }}
                  >
                    {analyzing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: colors.primary }} />
                        Re-Analyzing...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Re-Analyze All
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Analyze Result */}
              {analyzeResult && (
                <div 
                  className="mt-3 p-3 rounded-lg"
                  style={{ 
                    backgroundColor: analyzeResult.success ? alpha(colors.success, 10) : alpha(colors.error, 10),
                    border: `1px solid ${analyzeResult.success ? alpha(colors.success, 30) : alpha(colors.error, 30)}`
                  }}
                >
                  <p className="text-sm" style={{ color: analyzeResult.success ? colors.success : colors.error }}>
                    {analyzeResult.message}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: colors.primary }} />
              <span className="ml-2" style={{ color: colors.textMuted }}>Loading logs...</span>
            </div>
          )}

          {/* Log List - Grouped by Date */}
          {!isLoading && (
            <div className="space-y-6">
              {sortedDates.map((date) => (
            <div key={date}>
              {/* Date Header */}
              <div className="flex items-center gap-3 mb-3">
                <div 
                  className="px-3 py-1 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: alpha(colors.primary, 20), color: colors.primary }}
                >
                  {date}
                </div>
                <div className="flex-1 h-px" style={{ backgroundColor: alpha(colors.border, 30) }} />
                <span className="text-xs" style={{ color: colors.textMuted }}>
                  {groupedLogs[date].length} session{groupedLogs[date].length > 1 ? 's' : ''}
                </span>
              </div>

              {/* Logs for this date */}
              <div className="space-y-3">
                {groupedLogs[date].map((log) => (
                  <div 
                    key={log.id}
                    className="rounded-xl border overflow-hidden"
                    style={{ 
                      backgroundColor: alpha(colors.card, 50),
                      borderColor: colors.border 
                    }}
                  >
                    {/* Header */}
                    <div 
                      className="p-4 flex items-center justify-between cursor-pointer"
                      onClick={async () => {
                        if (expandedId !== log.id) {
                          setExpandedId(log.id)
                          // Load full details if this is a summary
                          if (log.isSummary) {
                            await loadLogDetails(log.id)
                          }
                        } else {
                          setExpandedId(null)
                        }
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div 
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: alpha(colors.primary, 10) }}
                        >
                          <svg className="w-5 h-5" style={{ color: colors.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold" style={{ color: colors.text }}>{log.title}</h3>
                          <div className="flex items-center gap-4 mt-1 text-xs" style={{ color: colors.textMuted }}>
                            <span>🕐 {new Date(log.timestamp).toLocaleTimeString()}</span>
                            {log.source && (
                              <span 
                                className="px-1.5 py-0.5 rounded"
                                style={{ backgroundColor: alpha(colors.accent, 20), color: colors.accent }}
                              >
                                {log.source}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span 
                          className="px-2 py-1 rounded text-xs hidden sm:inline"
                          style={{ backgroundColor: alpha(colors.warning, 20), color: colors.warning }}
                        >
                          {log.isSummary ? (log.issuesCount || 0) : log.issuesSolved.length} issues
                        </span>
                        <span 
                          className="px-2 py-1 rounded text-xs hidden sm:inline"
                          style={{ backgroundColor: alpha(colors.success, 20), color: colors.success }}
                        >
                          {log.isSummary ? (log.featuresCount || 0) : log.featuresAdded.length} features
                        </span>
                        <svg 
                          className="w-5 h-5" 
                          style={{ color: colors.textMuted }}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          {expandedId === log.id ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          )}
                        </svg>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {expandedId === log.id && (
                      <div 
                        className="border-t p-4"
                        style={{ borderColor: alpha(colors.border, 30) }}
                      >
                        {/* Loading state for details */}
                        {loadingDetails === log.id ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: colors.primary }} />
                            <span className="ml-2" style={{ color: colors.textMuted }}>Loading details...</span>
                          </div>
                        ) : log.isSummary ? (
                          <div className="text-center py-4" style={{ color: colors.textMuted }}>
                            Click to load details...
                          </div>
                        ) : (
                          <>
                        {log.summary && (
                          <p className="mb-4" style={{ color: colors.textMuted }}>{log.summary}</p>
                        )}

                        {log.issuesSolved.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium mb-2" style={{ color: colors.text }}>
                              ⚠️ Issues Solved
                            </h4>
                            <ul className="space-y-1">
                              {log.issuesSolved.map((issue, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: colors.textSecondary }}>
                                  <span style={{ color: colors.success }}>✓</span>
                                  {issue}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {log.featuresAdded.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium mb-2" style={{ color: colors.text }}>
                              ⚡ Features Added
                            </h4>
                            <ul className="space-y-1">
                              {log.featuresAdded.map((feature, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: colors.textSecondary }}>
                                  <span style={{ color: colors.primary }}>+</span>
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {log.filesModified.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium mb-2" style={{ color: colors.text }}>
                              📁 Files Modified
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {log.filesModified.map((file, i) => (
                                <span 
                                  key={i}
                                  className="px-2 py-1 rounded text-xs font-mono"
                                  style={{ backgroundColor: alpha(colors.accent, 20), color: colors.accent }}
                                >
                                  {file}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {log.commits.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium mb-2" style={{ color: colors.text }}>
                              🔗 Commits
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {log.commits.map((commit, i) => (
                                <span 
                                  key={i}
                                  className="px-2 py-1 rounded text-xs font-mono"
                                  style={{ backgroundColor: alpha(colors.primary, 20), color: colors.primary }}
                                >
                                  {commit}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Parse notes for highlights, future plans, and technical details */}
                        {(() => {
                          try {
                            const notesData = JSON.parse(log.notes);
                            return (
                              <>
                                {notesData.highlights?.length > 0 && (
                                  <div className="mb-4">
                                    <h4 className="text-sm font-medium mb-2" style={{ color: colors.text }}>
                                      ⭐ Highlights
                                    </h4>
                                    <ul className="space-y-1">
                                      {notesData.highlights.map((h: string, i: number) => (
                                        <li key={i} className="flex items-start gap-2 text-sm" style={{ color: colors.textSecondary }}>
                                          <span style={{ color: colors.warning }}>★</span>
                                          {h}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {notesData.technicalDetails && (
                                  <div className="mb-4">
                                    <h4 className="text-sm font-medium mb-2" style={{ color: colors.text }}>
                                      ⚙️ Technical Details
                                    </h4>
                                    <p className="text-sm p-2 rounded" style={{ color: colors.textSecondary, backgroundColor: alpha(colors.bgSecondary, 30) }}>
                                      {notesData.technicalDetails}
                                    </p>
                                  </div>
                                )}
                              </>
                            );
                          } catch {
                            // notes is plain text
                            return log.notes ? (
                              <div className="mb-4">
                                <h4 className="text-sm font-medium mb-2" style={{ color: colors.text }}>
                                  📝 Notes
                                </h4>
                                <div 
                                  className="p-3 rounded-lg"
                                  style={{ backgroundColor: alpha(colors.bgSecondary, 30) }}
                                >
                                  <p className="text-sm" style={{ color: colors.textMuted }}>{log.notes}</p>
                                </div>
                              </div>
                            ) : null;
                          }
                        })()}

                        {/* Future Plans (from commits field for AI-extracted logs) */}
                        {log.commits.length > 0 && log.source === 'ai-extract' && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium mb-2" style={{ color: colors.text }}>
                              📋 Future Plans
                            </h4>
                            <ul className="space-y-1">
                              {log.commits.map((plan, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: colors.textSecondary }}>
                                  <span style={{ color: colors.accent }}>→</span>
                                  {plan}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex justify-between pt-2 border-t" style={{ borderColor: alpha(colors.border, 30) }}>
                          <div className="flex gap-2">
                            {/* Analyse AI Data Button */}
                            <button
                              onClick={async (e) => {
                                e.stopPropagation()
                                // Shift to AI Dashboard view
                                setActiveView('analytics')
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs flex items-center gap-1"
                              style={{ backgroundColor: alpha(colors.success, 10), color: colors.success }}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                              Analyse AI Data
                            </button>
                            {/* View Raw Data Button */}
                            <button
                              onClick={async (e) => {
                                e.stopPropagation()
                                // Fetch and show raw data
                                try {
                                  const response = await fetch(`/api/raw-data?chatId=${log.sessionId}`)
                                  const data = await response.json()
                                  if (data.success && data.rawData) {
                                    alert(`Raw Data ID: ${data.rawData.id}\nSize: ${data.rawData.rawSizeBytes} bytes\nImported: ${data.rawData.importedAt}`)
                                  } else {
                                    alert('No raw data linked to this log. Use Re-Import to add raw data.')
                                  }
                                } catch (err) {
                                  alert('Error fetching raw data')
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 border"
                              style={{ borderColor: colors.border, color: colors.textSecondary }}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View Raw
                            </button>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteLog(log.id)
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs flex items-center gap-1"
                            style={{ color: colors.error || '#ef4444' }}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {filteredLogs.length === 0 && !isLoading && (
            <div 
              className="text-center py-12 rounded-xl border"
              style={{ borderColor: colors.border }}
            >
              <svg className="w-12 h-12 mx-auto mb-3" style={{ color: colors.textMuted }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p style={{ color: colors.textMuted }}>No logs found</p>
              <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                Click "Batch Import" to import from chat history
              </p>
            </div>
          )}
            </div>
          )}
        </>
      )}

      {/* Batch Import Modal - Enhanced */}
      {showBatchImport && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowBatchImport(false)}
        >
          <div 
            className="w-full max-w-5xl max-h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
            style={{
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div 
              className="p-4 border-b flex items-center justify-between"
              style={{ borderColor: colors.border }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: alpha(colors.accent, 20) }}
                >
                  <span className="text-xl">📥</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: colors.text }}>
                    Batch Import from Chat
                  </h2>
                  <p className="text-xs" style={{ color: colors.textMuted }}>
                    Save raw data → Parse → Send to AI Dashboard
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBatchImport(false)}
                className="p-2 rounded-lg"
                style={{ color: colors.textMuted }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Step Tabs */}
            <div className="flex border-b" style={{ borderColor: colors.border }}>
              <button
                onClick={() => setBatchStep('paste')}
                className="flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2"
                style={{
                  borderBottomWidth: 2,
                  borderBottomColor: batchStep === 'paste' ? colors.primary : 'transparent',
                  color: batchStep === 'paste' ? colors.primary : colors.textMuted,
                  backgroundColor: batchStep === 'paste' ? alpha(colors.primary, 5) : 'transparent'
                }}
              >
                📋 Paste Raw Data
              </button>
              <button
                onClick={() => { setBatchStep('history'); loadSavedRawData(1, historyParseFilter); }}
                className="flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2"
                style={{
                  borderBottomWidth: 2,
                  borderBottomColor: batchStep === 'history' ? colors.accent : 'transparent',
                  color: batchStep === 'history' ? colors.accent : colors.textMuted,
                  backgroundColor: batchStep === 'history' ? alpha(colors.accent, 5) : 'transparent'
                }}
              >
                📚 Chat History ({historyTotalItems})
              </button>
              <button
                onClick={() => setBatchStep('parse')}
                className="flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2"
                style={{
                  borderBottomWidth: 2,
                  borderBottomColor: batchStep === 'parse' ? colors.success : 'transparent',
                  color: batchStep === 'parse' ? colors.success : colors.textMuted,
                  backgroundColor: batchStep === 'parse' ? alpha(colors.success, 5) : 'transparent'
                }}
              >
                ⚡ Parse & Save
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              
              {/* STEP 1: Paste Raw Data */}
              {batchStep === 'paste' && (
                <>
                  {/* Instructions */}
                  <div 
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: alpha(colors.primary, 10) }}
                  >
                    <h3 className="font-semibold mb-2" style={{ color: colors.text }}>How to Import:</h3>
                    <ol className="text-sm space-y-1" style={{ color: colors.textSecondary }}>
                      <li>1. Open browser DevTools (F12) → Network tab</li>
                      <li>2. Go to your chat on chat.z.ai</li>
                      <li>3. Find the <code className="px-1 rounded" style={{ backgroundColor: alpha(colors.bgSecondary, 50) }}>messages/batch</code> request</li>
                      <li>4. Copy the Response and paste below</li>
                      <li>5. Click <strong>Save Raw Data</strong> to store the original JSON</li>
                    </ol>
                  </div>

                  {/* JSON Input */}
                  <div>
                    <label className="text-sm font-medium mb-2 block" style={{ color: colors.text }}>
                      Paste Batch API Response JSON:
                    </label>
                    <textarea
                      value={batchJson}
                      onChange={(e) => {
                        setBatchJson(e.target.value)
                        setBatchError(null)
                      }}
                      placeholder='{"data": {"msg-id": {...}, ...}}'
                      className="w-full h-48 p-3 rounded-lg border font-mono text-xs"
                      style={{ 
                        backgroundColor: colors.bg, 
                        borderColor: batchError ? colors.warning : colors.border, 
                        color: colors.text,
                        resize: 'vertical'
                      }}
                    />
                    <div className="flex justify-between mt-2">
                      <span className="text-xs" style={{ color: colors.textMuted }}>
                        Size: {batchJson.length.toLocaleString()} bytes
                      </span>
                    </div>
                  </div>

                  {/* Parsing Progress Bar */}
                  {(batchParsing || parsingProgress > 0) && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm" style={{ color: colors.textSecondary }}>
                          {parsingStage || 'Processing...'}
                        </span>
                        <span className="text-sm font-mono" style={{ color: colors.primary }}>
                          {parsingProgress}%
                        </span>
                      </div>
                      <div 
                        className="h-2 rounded-full overflow-hidden"
                        style={{ backgroundColor: alpha(colors.border, 30) }}
                      >
                        <div 
                          className="h-full rounded-full transition-all duration-300"
                          style={{ 
                            width: `${parsingProgress}%`,
                            backgroundColor: colors.primary
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Raw Save Result */}
                  {rawSaveResult && (
                    <div 
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: alpha(rawSaveResult.success ? colors.success : colors.warning, 10) }}
                    >
                      <p className="text-sm" style={{ color: colors.text }}>{rawSaveResult.message}</p>
                    </div>
                  )}

                  {/* Error Display */}
                  {batchError && (
                    <div 
                      className="p-4 rounded-lg border"
                      style={{ 
                        backgroundColor: alpha(colors.warning, 10),
                        borderColor: colors.warning
                      }}
                    >
                      <h3 className="font-semibold mb-2 flex items-center gap-2" style={{ color: colors.warning }}>
                        ⚠️ Error
                      </h3>
                      <pre className="text-sm whitespace-pre-wrap overflow-x-auto p-2 rounded" style={{ 
                        color: colors.textSecondary,
                        backgroundColor: alpha(colors.bg, 50)
                      }}>
                        {batchError}
                      </pre>
                    </div>
                  )}
                </>
              )}

              {/* STEP 2: Chat History */}
              {batchStep === 'history' && (
                <>
                  <div className="flex justify-between items-center flex-wrap gap-3">
                    <h3 className="font-semibold" style={{ color: colors.text }}>
                      Saved Raw Data ({historyTotalItems} total)
                    </h3>
                    <div className="flex gap-2 items-center flex-wrap">
                      {/* Filter Radio Buttons - Left of Export All */}
                      <div className="flex items-center gap-1 px-2 py-1 rounded-lg border" style={{ borderColor: colors.border }}>
                        {[
                          { value: 'all', label: 'All' },
                          { value: 'parsed', label: 'Parsed' },
                          { value: 'pending', label: 'Unparsed' }
                        ].map((opt) => (
                          <label 
                            key={opt.value}
                            className="flex items-center gap-1 cursor-pointer px-2 py-1 rounded text-sm"
                            style={{ 
                              backgroundColor: historyParseFilter === opt.value ? alpha(colors.primary, 15) : 'transparent',
                              color: historyParseFilter === opt.value ? colors.primary : colors.textSecondary
                            }}
                          >
                            <input
                              type="radio"
                              name="parseFilter"
                              value={opt.value}
                              checked={historyParseFilter === opt.value}
                              onChange={() => {
                                setHistoryParseFilter(opt.value as 'all' | 'parsed' | 'pending')
                                setHistoryPage(1)
                                loadSavedRawData(1, opt.value as 'all' | 'parsed' | 'pending')
                              }}
                              className="w-3 h-3"
                            />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                      
                      {/* Export All Button */}
                      {savedRawData.length > 0 && (
                        <button
                          onClick={async () => {
                            try {
                              // Fetch all raw data and combine
                              const allData = await Promise.all(
                                savedRawData.map(async (raw: any) => {
                                  const response = await fetch(`/api/raw-data?action=raw&rawDataId=${raw.id}`)
                                  const rawJson = await response.text()
                                  return { id: raw.id, importedAt: raw.importedAt, data: JSON.parse(rawJson) }
                                })
                              )
                              
                              // Create combined export
                              const exportData = {
                                exportedAt: new Date().toISOString(),
                                totalItems: allData.length,
                                items: allData
                              }
                              
                              const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
                              const url = URL.createObjectURL(blob)
                              const a = document.createElement('a')
                              a.href = url
                              a.download = `raw-data-export-all-${new Date().toISOString().split('T')[0]}.json`
                              document.body.appendChild(a)
                              a.click()
                              document.body.removeChild(a)
                              URL.revokeObjectURL(url)
                            } catch (err) {
                              alert('Failed to export all: ' + (err instanceof Error ? err.message : 'Unknown error'))
                            }
                          }}
                          className="px-3 py-1.5 rounded text-sm border flex items-center gap-1"
                          style={{ borderColor: colors.primary, color: colors.primary, backgroundColor: alpha(colors.primary, 10) }}
                        >
                          📦 Export All
                        </button>
                      )}
                      <button
                        onClick={() => loadSavedRawData(historyPage, historyParseFilter)}
                        disabled={historyLoading}
                        className="px-3 py-1.5 rounded text-sm border flex items-center gap-1"
                        style={{ borderColor: colors.border, color: colors.textSecondary }}
                      >
                        {historyLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2" style={{ borderColor: colors.primary }} />
                            Loading...
                          </>
                        ) : (
                          '🔄 Refresh'
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {historyLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.primary }} />
                      <span className="ml-3" style={{ color: colors.textMuted }}>Loading...</span>
                    </div>
                  ) : savedRawData.length === 0 ? (
                    <div className="text-center py-8">
                      <span className="text-4xl">📭</span>
                      <p className="mt-2" style={{ color: colors.textMuted }}>No saved raw data found</p>
                      <p className="text-sm" style={{ color: colors.textMuted }}>
                        {historyParseFilter !== 'all' 
                          ? `No ${historyParseFilter} items. Try changing the filter.`
                          : 'Paste raw JSON and save it first'}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {savedRawData.map((raw: any) => (
                          <div 
                            key={raw.id}
                            className="p-3 rounded-lg border flex items-center justify-between"
                            style={{ 
                              backgroundColor: alpha(colors.bgSecondary, 20),
                              borderColor: selectedRawId === raw.id ? colors.primary : colors.border
                            }}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ backgroundColor: alpha(colors.primary, 20), color: colors.primary }}>
                                  {raw.id?.slice(0, 8)}...
                                </span>
                                <span className="text-sm" style={{ color: colors.text }}>
                                  {raw.rawSizeBytes ? `${(raw.rawSizeBytes / 1024).toFixed(1)} KB` : `${raw.size?.toLocaleString()} bytes`}
                                </span>
                                {/* Parse Status Badge */}
                                <span 
                                  className="text-xs px-2 py-0.5 rounded"
                                  style={{ 
                                    backgroundColor: raw.parseStatus === 'parsed' 
                                      ? alpha(colors.success, 15)
                                      : raw.parseStatus === 'failed'
                                      ? alpha(colors.error || '#ef4444', 15)
                                      : alpha(colors.warning, 15),
                                    color: raw.parseStatus === 'parsed'
                                      ? colors.success
                                      : raw.parseStatus === 'failed'
                                      ? colors.error || '#ef4444'
                                      : colors.warning
                                  }}
                                >
                                  {raw.parseStatus || 'pending'}
                                </span>
                              </div>
                              <p className="text-xs mt-1 truncate" style={{ color: colors.textMuted }}>
                                {raw.chatLog?.title || 'Raw Import'} • {raw.importedAt ? new Date(raw.importedAt).toLocaleString() : raw.savedAt}
                              </p>
                              {raw.chatLog && (
                                <div className="flex gap-2 mt-1">
                                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: alpha(colors.warning, 15), color: colors.warning }}>
                                    {raw.chatLog.sessionDate}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              {/* Export Button */}
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  try {
                                    const response = await fetch(`/api/raw-data?action=raw&rawDataId=${raw.id}`)
                                    const rawJson = await response.text()
                                    
                                    const blob = new Blob([rawJson], { type: 'application/json' })
                                    const url = URL.createObjectURL(blob)
                                    const a = document.createElement('a')
                                    a.href = url
                                    a.download = `raw-data-${raw.id?.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.json`
                                    document.body.appendChild(a)
                                    a.click()
                                    document.body.removeChild(a)
                                    URL.revokeObjectURL(url)
                                  } catch (err) {
                                    alert('Failed to export: ' + (err instanceof Error ? err.message : 'Unknown error'))
                                  }
                                }}
                                className="px-2 py-1.5 rounded text-xs border"
                                style={{ borderColor: colors.border, color: colors.textSecondary }}
                                title="Export"
                              >
                                📤
                              </button>
                              {/* Parse Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleParseAndSaveFromRaw(raw.id)
                                }}
                                disabled={batchParsing && selectedRawId === raw.id}
                                className="px-2 py-1.5 rounded text-xs"
                                style={{ backgroundColor: colors.success, color: 'white' }}
                                title="Parse & Save"
                              >
                                {batchParsing && selectedRawId === raw.id ? '⏳' : '📋'}
                              </button>
                              {/* Delete Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteRawData(raw.id)
                                }}
                                disabled={deletingRawId === raw.id}
                                className="px-2 py-1.5 rounded text-xs border"
                                style={{ borderColor: colors.error || '#ef4444', color: colors.error || '#ef4444' }}
                                title="Delete"
                              >
                                {deletingRawId === raw.id ? '⏳' : '🗑️'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Pagination Controls */}
                      {historyTotalPages > 1 && (
                        <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: alpha(colors.border, 30) }}>
                          <span className="text-xs" style={{ color: colors.textMuted }}>
                            Page {historyPage} of {historyTotalPages} ({historyTotalItems} items)
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => loadSavedRawData(historyPage - 1, historyParseFilter)}
                              disabled={historyPage <= 1 || historyLoading}
                              className="px-3 py-1.5 rounded text-sm border disabled:opacity-50"
                              style={{ borderColor: colors.border, color: colors.textSecondary }}
                            >
                              ← Prev
                            </button>
                            {/* Page Numbers */}
                            {Array.from({ length: Math.min(5, historyTotalPages) }, (_, i) => {
                              let pageNum: number
                              if (historyTotalPages <= 5) {
                                pageNum = i + 1
                              } else if (historyPage <= 3) {
                                pageNum = i + 1
                              } else if (historyPage >= historyTotalPages - 2) {
                                pageNum = historyTotalPages - 4 + i
                              } else {
                                pageNum = historyPage - 2 + i
                              }
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => loadSavedRawData(pageNum, historyParseFilter)}
                                  disabled={historyLoading}
                                  className="px-3 py-1.5 rounded text-sm"
                                  style={{ 
                                    backgroundColor: historyPage === pageNum ? colors.primary : 'transparent',
                                    border: `1px solid ${historyPage === pageNum ? colors.primary : colors.border}`,
                                    color: historyPage === pageNum ? 'white' : colors.textSecondary
                                  }}
                                >
                                  {pageNum}
                                </button>
                              )
                            })}
                            <button
                              onClick={() => loadSavedRawData(historyPage + 1, historyParseFilter)}
                              disabled={historyPage >= historyTotalPages || historyLoading}
                              className="px-3 py-1.5 rounded text-sm border disabled:opacity-50"
                              style={{ borderColor: colors.border, color: colors.textSecondary }}
                            >
                              Next →
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  
                  {/* Error display */}
                  {batchError && (
                    <div className="p-3 rounded-lg border-l-4" style={{ backgroundColor: alpha(colors.warning, 10), borderColor: colors.warning }}>
                      <p className="text-sm" style={{ color: colors.text }}>{batchError}</p>
                    </div>
                  )}
                </>
              )}

              {/* STEP 3: Parse & Save */}
              {batchStep === 'parse' && (
                <>
                  <div 
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: alpha(colors.success, 10) }}
                  >
                    <h3 className="font-semibold mb-2" style={{ color: colors.text }}>Parse & Save to Chat Logs</h3>
                    <p className="text-sm" style={{ color: colors.textSecondary }}>
                      This will parse the raw JSON and save the extracted data to Session Chat Logs.
                      The data will also be available in AI Dashboard for analysis.
                    </p>
                  </div>

                  {/* Parse Preview */}
                  {batchPreview.length > 0 && (
                    <div className="p-4 rounded-lg border" style={{ backgroundColor: alpha(colors.bgSecondary, 20), borderColor: colors.border }}>
                      <h4 className="font-semibold mb-3" style={{ color: colors.text }}>
                        ✅ Extracted {batchPreview.length} Session(s)
                      </h4>
                      <div className="space-y-3">
                        {batchPreview.map((log, i) => (
                          <div 
                            key={log.id}
                            className="p-3 rounded-lg"
                            style={{ backgroundColor: alpha(colors.card, 50) }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium" style={{ color: colors.text }}>{log.title}</span>
                              <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: alpha(colors.primary, 20), color: colors.primary }}>
                                {log.sessionDate}
                              </span>
                            </div>
                            <p className="text-xs mt-1" style={{ color: colors.textMuted }}>{log.summary}</p>
                            <div className="flex gap-2 mt-2 flex-wrap">
                              <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: alpha(colors.warning, 20), color: colors.warning }}>
                                {log.issuesSolved?.length ?? 0} issues
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: alpha(colors.success, 20), color: colors.success }}>
                                {log.featuresAdded?.length ?? 0} features
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: alpha(colors.accent, 20), color: colors.accent }}>
                                {log.filesModified?.length ?? 0} files
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Raw JSON Preview for Parsing */}
                  {batchJson && batchPreview.length === 0 && (
                    <div>
                      <label className="text-sm font-medium mb-2 block" style={{ color: colors.text }}>
                        Raw JSON to Parse:
                      </label>
                      <textarea
                        value={batchJson}
                        onChange={(e) => setBatchJson(e.target.value)}
                        placeholder='Paste or use raw data from history...'
                        className="w-full h-32 p-3 rounded-lg border font-mono text-xs"
                        style={{ 
                          backgroundColor: colors.bg, 
                          borderColor: colors.border, 
                          color: colors.text 
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div 
              className="p-4 border-t flex justify-end gap-2 flex-wrap"
              style={{ borderColor: colors.border }}
            >
              <button
                onClick={() => {
                  setShowBatchImport(false)
                  setBatchJson('')
                  setBatchPreview([])
                  setBatchError(null)
                  setBatchStep('paste')
                }}
                className="px-4 py-2 rounded-lg border"
                style={{ borderColor: colors.border, color: colors.text }}
              >
                Close
              </button>

              {/* Step 1 Buttons */}
              {batchStep === 'paste' && (
                <>
                  <button
                    onClick={handleBatchImport}
                    disabled={batchParsing || !batchJson.trim()}
                    className="px-4 py-2 rounded-lg flex items-center gap-2"
                    style={{ backgroundColor: colors.primary, color: 'white' }}
                  >
                    {batchParsing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Parsing...
                      </>
                    ) : (
                      <>📋 Parse JSON</>
                    )}
                  </button>
                  <button
                    onClick={handleSaveRawData}
                    disabled={savingRaw || !batchJson.trim()}
                    className="px-4 py-2 rounded-lg flex items-center gap-2"
                    style={{ backgroundColor: colors.accent, color: 'white' }}
                  >
                    {savingRaw ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Saving...
                      </>
                    ) : (
                      <>💾 Save Raw Data</>
                    )}
                  </button>
                </>
              )}

              {/* Step 3 Buttons */}
              {batchStep === 'parse' && batchPreview.length > 0 && (
                <button
                  onClick={handleSaveBatch}
                  disabled={batchParsing}
                  className="px-4 py-2 rounded-lg flex items-center gap-2"
                  style={{ backgroundColor: colors.success, color: 'white' }}
                >
                  {batchParsing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Saving...
                    </>
                  ) : (
                    <>✅ Save {batchPreview.length} Logs to Session</>
                  )}
                </button>
              )}

              {batchStep === 'parse' && batchPreview.length === 0 && (
                <button
                  onClick={handleBatchImport}
                  disabled={batchParsing || !batchJson.trim()}
                  className="px-4 py-2 rounded-lg flex items-center gap-2"
                  style={{ backgroundColor: colors.success, color: 'white' }}
                >
                  {batchParsing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Parsing...
                    </>
                  ) : (
                    <>⚡ Parse & Preview</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Warning Modal */}
      {showDuplicateModal && duplicateWarning && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowDuplicateModal(false)}
        >
          <div 
            className="w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
            style={{
              backgroundColor: colors.card,
              border: `1px solid ${duplicateWarning.duplicateType === 'exact' ? colors.warning : colors.accent}`
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div 
              className="p-4 border-b flex items-center gap-3"
              style={{ 
                borderColor: colors.border,
                backgroundColor: duplicateWarning.duplicateType === 'exact' 
                  ? alpha(colors.warning, 15)
                  : alpha(colors.accent, 15)
              }}
            >
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: duplicateWarning.duplicateType === 'exact' ? alpha(colors.warning, 30) : alpha(colors.accent, 30) }}
              >
                {duplicateWarning.duplicateType === 'exact' ? '⚠️' : 'ℹ️'}
              </div>
              <div>
                <h3 className="text-lg font-bold" style={{ color: colors.text }}>
                  {duplicateWarning.duplicateType === 'exact' ? 'Exact Duplicate Detected' : 'Similar Data Found'}
                </h3>
                <p className="text-sm" style={{ color: colors.textMuted }}>
                  {duplicateWarning.duplicateType === 'exact' 
                    ? 'This data already exists in the database'
                    : 'This appears to be an evolved version of an existing conversation'}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg text-center" style={{ backgroundColor: alpha(colors.bgSecondary, 50) }}>
                  <div className="text-xl font-bold" style={{ color: colors.primary }}>
                    {duplicateWarning.matchPercentage}%
                  </div>
                  <div className="text-xs" style={{ color: colors.textMuted }}>Match</div>
                </div>
                <div className="p-3 rounded-lg text-center" style={{ backgroundColor: alpha(colors.bgSecondary, 50) }}>
                  <div className="text-xl font-bold" style={{ color: colors.text }}>
                    {duplicateWarning.matchedMessages}/{duplicateWarning.totalMessages}
                  </div>
                  <div className="text-xs" style={{ color: colors.textMuted }}>Messages</div>
                </div>
                {duplicateWarning.newMessages !== undefined && (
                  <div className="p-3 rounded-lg text-center" style={{ backgroundColor: alpha(colors.success, 15) }}>
                    <div className="text-xl font-bold" style={{ color: colors.success }}>
                      +{duplicateWarning.newMessages}
                    </div>
                    <div className="text-xs" style={{ color: colors.textMuted }}>New</div>
                  </div>
                )}
              </div>

              {/* Existing record info */}
              {duplicateWarning.existingTitle && (
                <div 
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: alpha(colors.bgSecondary, 30) }}
                >
                  <div className="text-xs font-medium mb-1" style={{ color: colors.textMuted }}>Existing Record:</div>
                  <div className="text-sm font-semibold" style={{ color: colors.text }}>
                    {duplicateWarning.existingTitle}
                  </div>
                  {duplicateWarning.existingRawDataId && (
                    <div className="text-xs mt-1 font-mono" style={{ color: colors.textMuted }}>
                      ID: {duplicateWarning.existingRawDataId.substring(0, 20)}...
                    </div>
                  )}
                </div>
              )}

              {/* Hint */}
              {duplicateWarning.hint && (
                <div 
                  className="p-3 rounded-lg text-sm"
                  style={{ 
                    backgroundColor: alpha(colors.accent, 10),
                    color: colors.textSecondary
                  }}
                >
                  💡 {duplicateWarning.hint}
                </div>
              )}

              {/* Message comparison for evolved */}
              {duplicateWarning.duplicateType === 'evolved' && (
                <div 
                  className="p-3 rounded-lg text-sm"
                  style={{ backgroundColor: alpha(colors.success, 10) }}
                >
                  <div className="font-medium mb-1" style={{ color: colors.success }}>
                    ✓ Conversation has evolved
                  </div>
                  <div style={{ color: colors.textSecondary }}>
                    Same message IDs but different connections - this represents conversation growth.
                    Saving will create a new snapshot with updated thread structure.
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div 
              className="p-4 border-t flex justify-end gap-2 flex-wrap"
              style={{ borderColor: colors.border }}
            >
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="px-4 py-2 rounded-lg border"
                style={{ borderColor: colors.border, color: colors.text }}
              >
                Cancel
              </button>

              {/* View Existing Button */}
              {duplicateWarning.existingRawDataId && (
                <button
                  onClick={() => {
                    handleViewExistingRawData(duplicateWarning.existingRawDataId!)
                  }}
                  className="px-4 py-2 rounded-lg flex items-center gap-2"
                  style={{ backgroundColor: colors.accent, color: 'white' }}
                >
                  👁️ View Raw Data
                </button>
              )}

              {/* Force Save Button (for evolved/partial) */}
              {duplicateWarning.allowForceSave && (
                <button
                  onClick={handleForceSave}
                  className="px-4 py-2 rounded-lg flex items-center gap-2"
                  style={{ backgroundColor: colors.success, color: 'white' }}
                >
                  💾 Save Anyway
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
