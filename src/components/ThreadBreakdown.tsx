'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/hooks/useTheme'
import {
  X,
  Activity,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Terminal,
  Server,
  Cpu,
  ChevronDown,
  ChevronUp,
  Zap
} from 'lucide-react'

interface ProcessInfo {
  pid: number
  ppid: number
  user: string
  command: string
  args: string
  threads: number
  memory: number
  cpu: number
}

interface ThreadStats {
  totalTasks: number
  maxThreads: number
  utilization: number
  bashProcesses: number
  suProcesses: number
  orphanedCount: number
  topConsumers: { name: string; count: number; threads: number }[]
  processes: ProcessInfo[]
}

interface ThreadBreakdownProps {
  isOpen: boolean
  onClose: () => void
}

export function ThreadBreakdown({ isOpen, onClose }: ThreadBreakdownProps) {
  const { colors } = useTheme()
  const [stats, setStats] = useState<ThreadStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCleaning, setIsCleaning] = useState(false)
  const [lastCleanup, setLastCleanup] = useState<{ killedCount: number; message: string } | null>(null)
  const [expandedSection, setExpandedSection] = useState<string>('overview')
  const [sortField, setSortField] = useState<'threads' | 'memory' | 'cpu'>('threads')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/system/threads')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch thread stats:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchStats()
    }
  }, [isOpen, fetchStats])

  const handleCleanup = async () => {
    setIsCleaning(true)
    setLastCleanup(null)
    try {
      const response = await fetch('/api/system/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cleanup' })
      })
      const data = await response.json()
      if (data.success) {
        setLastCleanup({ killedCount: data.killedCount, message: data.message })
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Cleanup failed:', error)
    } finally {
      setIsCleaning(false)
    }
  }

  const handleKillProcess = async (pid: number) => {
    try {
      const response = await fetch('/api/system/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'kill-process', pid })
      })
      const data = await response.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Kill process failed:', error)
    }
  }

  if (!isOpen) return null

  const getStatusInfo = () => {
    if (!stats) return { color: colors.textMuted, icon: Activity, label: 'Unknown' }
    if (stats.utilization >= 90) return { color: colors.error, icon: XCircle, label: 'Critical' }
    if (stats.utilization >= 70) return { color: colors.warning, icon: AlertTriangle, label: 'Warning' }
    return { color: colors.success, icon: CheckCircle, label: 'Healthy' }
  }

  const statusInfo = getStatusInfo()
  const StatusIcon = statusInfo.icon

  const alpha = (color: string, opacity: number) =>
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  const sortedProcesses = stats?.processes
    ? [...stats.processes].sort((a, b) => {
        const cmp = a[sortField] - b[sortField]
        return sortDir === 'desc' ? -cmp : cmp
      })
    : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: alpha(colors.bg, 80) }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl overflow-hidden"
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
                Thread Breakdown
              </h2>
              <p className="text-xs" style={{ color: colors.textMuted }}>
                System thread monitoring and cleanup
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchStats}
              className="p-2 rounded-lg transition-colors"
              style={{ color: colors.textMuted }}
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
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
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
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
                    Overview
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
                        <Activity className="w-4 h-4" style={{ color: colors.primary }} />
                        <span className="text-xs" style={{ color: colors.textMuted }}>Total Tasks</span>
                      </div>
                      <div className="text-2xl font-bold" style={{ color: colors.primary }}>
                        {stats.totalTasks}
                      </div>
                      <div className="text-xs" style={{ color: colors.textMuted }}>
                        of {stats.maxThreads} max
                      </div>
                    </div>

                    <div className="p-3 rounded-lg" style={{ backgroundColor: alpha(statusInfo.color, 10) }}>
                      <div className="flex items-center gap-2 mb-1">
                        <Cpu className="w-4 h-4" style={{ color: statusInfo.color }} />
                        <span className="text-xs" style={{ color: colors.textMuted }}>Utilization</span>
                      </div>
                      <div className="text-2xl font-bold" style={{ color: statusInfo.color }}>
                        {stats.utilization}%
                      </div>
                      <div className="text-xs" style={{ color: colors.textMuted }}>
                        {statusInfo.label}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg" style={{ backgroundColor: alpha(colors.warning, 10) }}>
                      <div className="flex items-center gap-2 mb-1">
                        <Terminal className="w-4 h-4" style={{ color: colors.warning }} />
                        <span className="text-xs" style={{ color: colors.textMuted }}>Shell Sessions</span>
                      </div>
                      <div className="text-2xl font-bold" style={{ color: colors.warning }}>
                        {stats.bashProcesses + stats.suProcesses}
                      </div>
                      <div className="text-xs" style={{ color: colors.textMuted }}>
                        bash: {stats.bashProcesses}, su: {stats.suProcesses}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg" style={{ backgroundColor: alpha(colors.error, 10) }}>
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4" style={{ color: colors.error }} />
                        <span className="text-xs" style={{ color: colors.textMuted }}>Orphaned</span>
                      </div>
                      <div className="text-2xl font-bold" style={{ color: stats.orphanedCount > 0 ? colors.error : colors.success }}>
                        {stats.orphanedCount}
                      </div>
                      <div className="text-xs" style={{ color: colors.textMuted }}>
                        {stats.orphanedCount > 0 ? 'Needs cleanup' : 'All good'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Cleanup Section */}
              {stats.orphanedCount > 0 && (
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
                          Orphaned Shell Sessions Detected
                        </p>
                        <p className="text-xs" style={{ color: colors.textMuted }}>
                          {stats.orphanedCount} shell sessions are consuming resources unnecessarily
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleCleanup}
                      disabled={isCleaning}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium"
                      style={{ backgroundColor: colors.warning, color: '#fff' }}
                    >
                      {isCleaning ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      Cleanup
                    </button>
                  </div>

                  {lastCleanup && (
                    <div
                      className="mt-3 p-3 rounded-lg flex items-center gap-2"
                      style={{ backgroundColor: alpha(colors.success, 10) }}
                    >
                      <CheckCircle className="w-4 h-4" style={{ color: colors.success }} />
                      <span style={{ color: colors.success }}>{lastCleanup.message}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Top Consumers */}
              <div
                className="p-4 rounded-lg"
                style={{ backgroundColor: alpha(colors.bgSecondary, 30) }}
              >
                <button
                  className="w-full flex items-center justify-between"
                  onClick={() => setExpandedSection(expandedSection === 'consumers' ? '' : 'consumers')}
                >
                  <span className="font-semibold" style={{ color: colors.text }}>
                    Top Thread Consumers
                  </span>
                  {expandedSection === 'consumers' ? (
                    <ChevronUp className="w-4 h-4" style={{ color: colors.textMuted }} />
                  ) : (
                    <ChevronDown className="w-4 h-4" style={{ color: colors.textMuted }} />
                  )}
                </button>

                {expandedSection === 'consumers' && (
                  <div className="mt-4 space-y-2">
                    {stats.topConsumers.map((consumer, idx) => (
                      <div
                        key={consumer.name}
                        className="flex items-center justify-between p-2 rounded"
                        style={{ backgroundColor: alpha(colors.card, 50) }}
                      >
                        <div className="flex items-center gap-2">
                          <Server className="w-4 h-4" style={{ color: colors.textMuted }} />
                          <span style={{ color: colors.text }}>{consumer.name}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: alpha(colors.primary, 10), color: colors.primary }}>
                            {consumer.count} instances
                          </span>
                        </div>
                        <span className="font-mono font-bold" style={{ color: colors.primary }}>
                          {consumer.threads} threads
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Process List */}
              <div
                className="p-4 rounded-lg"
                style={{ backgroundColor: alpha(colors.bgSecondary, 30) }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="font-semibold" style={{ color: colors.text }}>
                    Running Processes
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSortField('threads')
                        setSortDir(sortField === 'threads' && sortDir === 'desc' ? 'asc' : 'desc')
                      }}
                      className={`px-2 py-1 rounded text-xs ${sortField === 'threads' ? 'font-bold' : ''}`}
                      style={{
                        backgroundColor: sortField === 'threads' ? alpha(colors.primary, 20) : alpha(colors.card, 50),
                        color: sortField === 'threads' ? colors.primary : colors.textMuted
                      }}
                    >
                      Threads {sortField === 'threads' && (sortDir === 'desc' ? '↓' : '↑')}
                    </button>
                    <button
                      onClick={() => {
                        setSortField('memory')
                        setSortDir(sortField === 'memory' && sortDir === 'desc' ? 'asc' : 'desc')
                      }}
                      className={`px-2 py-1 rounded text-xs ${sortField === 'memory' ? 'font-bold' : ''}`}
                      style={{
                        backgroundColor: sortField === 'memory' ? alpha(colors.primary, 20) : alpha(colors.card, 50),
                        color: sortField === 'memory' ? colors.primary : colors.textMuted
                      }}
                    >
                      Memory {sortField === 'memory' && (sortDir === 'desc' ? '↓' : '↑')}
                    </button>
                    <button
                      onClick={() => {
                        setSortField('cpu')
                        setSortDir(sortField === 'cpu' && sortDir === 'desc' ? 'asc' : 'desc')
                      }}
                      className={`px-2 py-1 rounded text-xs ${sortField === 'cpu' ? 'font-bold' : ''}`}
                      style={{
                        backgroundColor: sortField === 'cpu' ? alpha(colors.primary, 20) : alpha(colors.card, 50),
                        color: sortField === 'cpu' ? colors.primary : colors.textMuted
                      }}
                    >
                      CPU {sortField === 'cpu' && (sortDir === 'desc' ? '↓' : '↑')}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ color: colors.textMuted }}>
                        <th className="text-left p-2">PID</th>
                        <th className="text-left p-2">User</th>
                        <th className="text-left p-2">Command</th>
                        <th className="text-center p-2">Threads</th>
                        <th className="text-center p-2">MEM%</th>
                        <th className="text-center p-2">CPU%</th>
                        <th className="text-center p-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedProcesses.slice(0, 20).map((proc) => (
                        <tr
                          key={proc.pid}
                          className="border-t"
                          style={{ borderColor: alpha(colors.border, 30) }}
                        >
                          <td className="p-2 font-mono" style={{ color: colors.textMuted }}>
                            {proc.pid}
                          </td>
                          <td className="p-2" style={{ color: colors.textMuted }}>
                            {proc.user}
                          </td>
                          <td className="p-2" style={{ color: colors.text }}>
                            <span className="font-medium">{proc.command}</span>
                            {proc.args && (
                              <span className="text-xs ml-1" style={{ color: colors.textMuted }}>
                                {proc.args.substring(0, 30)}...
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-center font-mono" style={{ color: colors.primary }}>
                            {proc.threads}
                          </td>
                          <td className="p-2 text-center" style={{ color: colors.textMuted }}>
                            {proc.memory.toFixed(1)}%
                          </td>
                          <td className="p-2 text-center" style={{ color: colors.textMuted }}>
                            {proc.cpu.toFixed(1)}%
                          </td>
                          <td className="p-2 text-center">
                            {(proc.command === 'bash' || proc.command === 'su') && proc.ppid === 1 ? (
                              <button
                                onClick={() => handleKillProcess(proc.pid)}
                                className="p-1 rounded hover:bg-red-100"
                                title="Kill orphaned process"
                              >
                                <Trash2 className="w-4 h-4" style={{ color: colors.error }} />
                              </button>
                            ) : (
                              <span style={{ color: colors.textMuted }}>-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12" style={{ color: colors.textMuted }}>
              Failed to load thread stats
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
