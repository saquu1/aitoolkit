'use client'

import { useState, useEffect } from 'react'
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
  X
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
  const [stats, setStats] = useState<MemoryStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clearing, setClearing] = useState(false)

  const fetchStats = async () => {
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
  }

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
        // Trigger a page reload after a short delay
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
  }, [isOpen])

  if (!isOpen) return null

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'clean': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'acceptable': return <Info className="w-4 h-4 text-blue-500" />
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
          <div className="flex items-center gap-3">
            <MemoryStick className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">
              Memory Breakdown
              {stats && <span className="text-sm font-normal text-slate-400 ml-2">
                (~{stats.totalNodeMemoryMB} MB Total)
              </span>}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {/* Close button - more prominent */}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white transition-all border border-slate-600 hover:border-red-500 flex items-center gap-2 font-medium"
              title="Close"
            >
              <X className="w-4 h-4" />
              <span className="text-sm">Close</span>
            </button>
            {/* Refresh button */}
            <button
              onClick={fetchStats}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          {loading && !stats && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
              <span className="ml-2 text-slate-400">Loading memory stats...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {stats && (
            <>
              {/* System Memory */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-slate-300 mb-2">System Memory</h3>
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-slate-800 rounded-lg p-3">
                    <div className="text-xs text-slate-400">Total</div>
                    <div className="text-xl font-bold text-white">{stats.system.total} MB</div>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3">
                    <div className="text-xs text-slate-400">Used</div>
                    <div className="text-xl font-bold text-orange-400">{stats.system.used} MB</div>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3">
                    <div className="text-xs text-slate-400">Free</div>
                    <div className="text-xl font-bold text-green-400">{stats.system.free} MB</div>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3">
                    <div className="text-xs text-slate-400">Usage</div>
                    <div className={`text-xl font-bold ${stats.system.usagePercent > 70 ? 'text-red-400' : 'text-blue-400'}`}>
                      {stats.system.usagePercent}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Memory Breakdown Visual */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-slate-300 mb-2">Module Breakdown</h3>
                <div className="bg-slate-800 rounded-lg p-4 font-mono text-sm">
                  <div className="border border-slate-600 rounded p-3 space-y-2">
                    {stats.modules.map((mod, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div 
                          className="h-3 rounded"
                          style={{ 
                            width: `${mod.percentage * 2.5}%`,
                            backgroundColor: mod.color,
                            minWidth: '10px'
                          }}
                        />
                        <span className="text-slate-400">
                          └── {mod.name} ({mod.size})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Leak Detection */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-slate-300 mb-2">Memory Leak Detection</h3>
                <div className="bg-slate-800 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left p-3 text-slate-400 font-medium">Pattern</th>
                        <th className="text-center p-3 text-slate-400 font-medium">Status</th>
                        <th className="text-left p-3 text-slate-400 font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.leakPatterns.map((pattern, i) => (
                        <tr key={i} className="border-b border-slate-700/50">
                          <td className="p-3 text-white">{pattern.pattern}</td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {getStatusIcon(pattern.status)}
                              <span className="capitalize text-xs text-slate-400">{pattern.status}</span>
                            </div>
                          </td>
                          <td className="p-3 text-slate-400 text-xs">{pattern.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recommendations */}
              {stats.recommendations.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-slate-300 mb-2">Recommendations</h3>
                  <ul className="space-y-1">
                    {stats.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                {stats.isHighMemory && (
                  <button
                    onClick={clearCache}
                    disabled={clearing}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    {clearing ? 'Clearing Cache...' : 'Clear Cache & Restart (~3 GB saved)'}
                  </button>
                )}
                <button
                  onClick={fetchStats}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh Stats
                </button>
              </div>

              {/* Cache Size Warning */}
              {stats.nextCacheSizeMB > 500 && (
                <div className="mt-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-yellow-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm">
                      .next cache is {stats.nextCacheSizeMB} MB - Consider clearing to save memory
                    </span>
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div className="mt-4 text-center text-xs text-slate-500">
                Last updated: {new Date(stats.timestamp).toLocaleTimeString()}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Toggle Button Component
export function MemoryToggleButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [memoryMB, setMemoryMB] = useState<number | null>(null)
  const [isHigh, setIsHigh] = useState(false)

  useEffect(() => {
    // Fetch memory on mount
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
