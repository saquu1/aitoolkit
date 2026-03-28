'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from '@/hooks/useTheme'
import { 
  MemoryStick, 
  RefreshCw, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Info,
  X,
  Activity,
  Database,
  HardDrive,
  Cpu,
  Zap
} from 'lucide-react'

interface MemoryModule {
  name: string
  size: string
  sizeMB: number
  percentage: number
  color: string
}

interface LeakPattern {
  pattern: string
  status: 'clean' | 'warning' | 'acceptable' | 'unknown'
  notes: string
}

interface MemoryStats {
  success: boolean
  timestamp: string
  system: {
    total: number
    used: number
    free: number
    usagePercent: number
  }
  nextServer: {
    memoryMB: number
  }
  modules: MemoryModule[]
  totalNodeMemoryMB: number
  isHighMemory: boolean
  nextCacheSizeMB: number
  leakPatterns: LeakPattern[]
  recommendations: string[]
}

interface MemoryBreakdownProps {
  isOpen: boolean
  onClose: () => void
}

export function MemoryBreakdown({ isOpen, onClose }: MemoryBreakdownProps) {
  const { colors } = useTheme()
  const [stats, setStats] = useState<MemoryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clearing, setClearing] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string>('overview')
  const [mounted, setMounted] = useState(false)

  // Ensure we're mounted before rendering portal
  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/memory-stats?action=stats')
      const data = await res.json()
      if (data.success) {
        setStats(data)
      } else {
        setError(data.error || 'Failed to fetch memory stats')
      }
    } catch (err) {
      setError('Failed to connect to memory API')
    } finally {
      setLoading(false)
    }
  }, [])

  const clearCache = async () => {
    if (!confirm('This will clear the .next cache and restart the server. Continue?')) return
    
    setClearing(true)
    try {
      const res = await fetch('/api/memory-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear-cache' })
      })
      const data = await res.json()
      if (data.success) {
        alert('Cache cleared! Server will restart...')
        setTimeout(() => window.location.reload(), 2000)
      } else {
        alert('Failed to clear cache: ' + data.error)
      }
    } catch (err) {
      alert('Failed to clear cache')
    } finally {
      setClearing(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchStats()
    }
  }, [isOpen, fetchStats])

  if (!isOpen || !mounted) return null

  const getStatusInfo = () => {
    if (!stats) return { color: colors.textMuted, icon: Activity, label: 'Unknown' }
    if (stats.isHighMemory) return { color: colors.error, icon: AlertTriangle, label: 'High Usage' }
    if (stats.system.usagePercent > 70) return { color: colors.warning, icon: AlertCircle, label: 'Warning' }
    return { color: colors.success, icon: CheckCircle, label: 'Healthy' }
  }

  const statusInfo = getStatusInfo()
  const StatusIcon = statusInfo.icon

  const alpha = (color: string, opacity: number) =>
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'clean': return <CheckCircle className="w-4 h-4" style={{ color: colors.success }} />
      case 'warning': return <AlertTriangle className="w-4 h-4" style={{ color: colors.warning }} />
      case 'acceptable': return <Info className="w-4 h-4" style={{ color: colors.primary }} />
      default: return <AlertCircle className="w-4 h-4" style={{ color: colors.textMuted }} />
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 backdrop-blur-sm"
        style={{ backgroundColor: alpha(colors.bg, 80) }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: colors.card,
          border: `1px solid ${colors.border}`
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: alpha(colors.border, 50) }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: alpha(statusInfo.color, 20) }}
            >
              <StatusIcon className="w-5 h-5" style={{ color: statusInfo.color }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: colors.text }}>
                Memory Breakdown
              </h2>
              <p className="text-xs" style={{ color: colors.textMuted }}>
                {stats ? `~${stats.totalNodeMemoryMB} MB Total` : 'System memory monitoring'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchStats}
              disabled={loading}
              className="p-2 rounded-lg transition-colors"
              style={{ color: colors.textMuted }}
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors"
              style={{ color: colors.textMuted }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {loading && !stats ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
            </div>
          ) : error ? (
            <div
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: alpha(colors.error, 10),
                borderColor: alpha(colors.error, 30)
              }}
            >
              <p style={{ color: colors.error }}>{error}</p>
            </div>
          ) : stats ? (
            <div className="space-y-4">
              {/* Overview Stats */}
              <div
                className="p-4 rounded-lg"
                style={{ backgroundColor: alpha(colors.bgSecondary, 30) }}
              >
                <button
                  className="w-full flex items-center justify-between"
                  onClick={() => setExpandedSection(expandedSection === 'overview' ? '' : 'overview')}
                >
                  <span className="font-semibold" style={{ color: colors.text }}>
                    System Memory Overview
                  </span>
                  {expandedSection === 'overview' ? (
                    <ChevronUp className="w-4 h-4" style={{ color: colors.textMuted }} />
                  ) : (
                    <ChevronDown className="w-4 h-4" style={{ color: colors.textMuted }} />
                  )}
                </button>

                {expandedSection === 'overview' && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 rounded-lg" style={{ backgroundColor: alpha(colors.primary, 10) }}>
                      <div className="flex items-center gap-2 mb-1">
                        <HardDrive className="w-4 h-4" style={{ color: colors.primary }} />
                        <span className="text-xs" style={{ color: colors.textMuted }}>Total</span>
                      </div>
                      <div className="text-2xl font-bold" style={{ color: colors.primary }}>
                        {stats.system.total} MB
                      </div>
                    </div>

                    <div className="p-3 rounded-lg" style={{ backgroundColor: alpha(colors.warning, 10) }}>
                      <div className="flex items-center gap-2 mb-1">
                        <Database className="w-4 h-4" style={{ color: colors.warning }} />
                        <span className="text-xs" style={{ color: colors.textMuted }}>Used</span>
                      </div>
                      <div className="text-2xl font-bold" style={{ color: colors.warning }}>
                        {stats.system.used} MB
                      </div>
                    </div>

                    <div className="p-3 rounded-lg" style={{ backgroundColor: alpha(colors.success, 10) }}>
                      <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4" style={{ color: colors.success }} />
                        <span className="text-xs" style={{ color: colors.textMuted }}>Free</span>
                      </div>
                      <div className="text-2xl font-bold" style={{ color: colors.success }}>
                        {stats.system.free} MB
                      </div>
                    </div>

                    <div className="p-3 rounded-lg" style={{ backgroundColor: alpha(statusInfo.color, 10) }}>
                      <div className="flex items-center gap-2 mb-1">
                        <Cpu className="w-4 h-4" style={{ color: statusInfo.color }} />
                        <span className="text-xs" style={{ color: colors.textMuted }}>Usage</span>
                      </div>
                      <div className="text-2xl font-bold" style={{ color: statusInfo.color }}>
                        {stats.system.usagePercent}%
                      </div>
                      <div className="text-xs" style={{ color: colors.textMuted }}>
                        {statusInfo.label}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Module Breakdown */}
              <div
                className="p-4 rounded-lg"
                style={{ backgroundColor: alpha(colors.bgSecondary, 30) }}
              >
                <button
                  className="w-full flex items-center justify-between"
                  onClick={() => setExpandedSection(expandedSection === 'modules' ? '' : 'modules')}
                >
                  <span className="font-semibold" style={{ color: colors.text }}>
                    Module Breakdown
                  </span>
                  {expandedSection === 'modules' ? (
                    <ChevronUp className="w-4 h-4" style={{ color: colors.textMuted }} />
                  ) : (
                    <ChevronDown className="w-4 h-4" style={{ color: colors.textMuted }} />
                  )}
                </button>

                {expandedSection === 'modules' && (
                  <div className="mt-4 font-mono text-sm">
                    <div
                      className="border rounded-lg p-3 space-y-2"
                      style={{ borderColor: alpha(colors.border, 50) }}
                    >
                      {stats.modules.map((mod, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div 
                            className="h-3 rounded"
                            style={{ 
                              width: `${Math.min(mod.percentage * 2.5, 100)}%`,
                              backgroundColor: mod.color,
                              minWidth: '10px'
                            }}
                          />
                          <span style={{ color: colors.textMuted }}>
                            └── {mod.name} ({mod.size})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Leak Detection */}
              <div
                className="p-4 rounded-lg"
                style={{ backgroundColor: alpha(colors.bgSecondary, 30) }}
              >
                <button
                  className="w-full flex items-center justify-between"
                  onClick={() => setExpandedSection(expandedSection === 'leaks' ? '' : 'leaks')}
                >
                  <span className="font-semibold" style={{ color: colors.text }}>
                    Memory Leak Detection
                  </span>
                  {expandedSection === 'leaks' ? (
                    <ChevronUp className="w-4 h-4" style={{ color: colors.textMuted }} />
                  ) : (
                    <ChevronDown className="w-4 h-4" style={{ color: colors.textMuted }} />
                  )}
                </button>

                {expandedSection === 'leaks' && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ color: colors.textMuted }}>
                          <th className="text-left p-2">Pattern</th>
                          <th className="text-center p-2">Status</th>
                          <th className="text-left p-2">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.leakPatterns.map((pattern, i) => (
                          <tr
                            key={i}
                            className="border-t"
                            style={{ borderColor: alpha(colors.border, 30) }}
                          >
                            <td className="p-2" style={{ color: colors.text }}>{pattern.pattern}</td>
                            <td className="p-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {getStatusIcon(pattern.status)}
                                <span className="capitalize text-xs" style={{ color: colors.textMuted }}>
                                  {pattern.status}
                                </span>
                              </div>
                            </td>
                            <td className="p-2 text-xs" style={{ color: colors.textMuted }}>{pattern.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Recommendations */}
              {stats.recommendations.length > 0 && (
                <div
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: alpha(colors.bgSecondary, 30) }}
                >
                  <button
                    className="w-full flex items-center justify-between"
                    onClick={() => setExpandedSection(expandedSection === 'recommendations' ? '' : 'recommendations')}
                  >
                    <span className="font-semibold" style={{ color: colors.text }}>
                      Recommendations
                    </span>
                    {expandedSection === 'recommendations' ? (
                      <ChevronUp className="w-4 h-4" style={{ color: colors.textMuted }} />
                    ) : (
                      <ChevronDown className="w-4 h-4" style={{ color: colors.textMuted }} />
                    )}
                  </button>

                  {expandedSection === 'recommendations' && (
                    <ul className="mt-4 space-y-2">
                      {stats.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm" style={{ color: colors.textMuted }}>
                          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: colors.primary }} />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* High Memory Warning & Actions */}
              {stats.isHighMemory && (
                <div
                  className="p-4 rounded-lg border"
                  style={{
                    backgroundColor: alpha(colors.warning, 5),
                    borderColor: alpha(colors.warning, 30)
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Zap className="w-5 h-5" style={{ color: colors.warning }} />
                      <div>
                        <p className="font-medium" style={{ color: colors.text }}>
                          High Memory Usage Detected
                        </p>
                        <p className="text-xs" style={{ color: colors.textMuted }}>
                          .next cache is {stats.nextCacheSizeMB} MB - Clearing can save ~3 GB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={clearCache}
                      disabled={clearing}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium"
                      style={{ backgroundColor: colors.warning, color: '#fff' }}
                    >
                      {clearing ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      Clear Cache
                    </button>
                  </div>
                </div>
              )}

              {/* Cache Warning */}
              {stats.nextCacheSizeMB > 500 && !stats.isHighMemory && (
                <div
                  className="p-3 rounded-lg flex items-center gap-2"
                  style={{ backgroundColor: alpha(colors.warning, 10) }}
                >
                  <AlertTriangle className="w-4 h-4" style={{ color: colors.warning }} />
                  <span className="text-sm" style={{ color: colors.warning }}>
                    .next cache is {stats.nextCacheSizeMB} MB - Consider clearing to save memory
                  </span>
                </div>
              )}

              {/* Timestamp */}
              <div className="text-center text-xs" style={{ color: colors.textMuted }}>
                Last updated: {new Date(stats.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  )
}

// Toggle Button Component
export function MemoryToggleButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [memoryMB, setMemoryMB] = useState<number | null>(null)
  const [isHigh, setIsHigh] = useState(false)

  useEffect(() => {
    // Fetch memory once on mount - no interval
    const fetchMemory = async () => {
      try {
        const res = await fetch('/api/memory-stats?action=stats')
        const data = await res.json()
        if (data.success) {
          setMemoryMB(data.totalNodeMemoryMB)
          setIsHigh(data.isHighMemory)
        }
      } catch {
        // Ignore errors
      }
    }
    fetchMemory()
  }, [])

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          isHigh 
            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50' 
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'
        }`}
        title="View memory breakdown"
      >
        <MemoryStick className="w-4 h-4" />
        {memoryMB !== null ? (
          <span className={isHigh ? 'text-red-400' : ''}>
            {memoryMB} MB
          </span>
        ) : (
          <span>Memory</span>
        )}
        {isHigh && (
          <AlertTriangle className="w-3 h-3 text-red-400" />
        )}
      </button>
      
      <MemoryBreakdown isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
