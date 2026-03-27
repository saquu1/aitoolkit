'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { Activity, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

interface ThreadStats {
  totalTasks: number
  maxThreads: number
  utilization: number
  bashProcesses: number
  suProcesses: number
  orphanedCount: number
}

interface ThreadStatusBadgeProps {
  onClick?: () => void
}

export function ThreadStatusBadge({ onClick }: ThreadStatusBadgeProps) {
  const { colors } = useTheme()
  const [stats, setStats] = useState<ThreadStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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
    // Fetch once on mount - no interval
    fetchStats()
  }, [fetchStats])

  if (isLoading || !stats) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
        style={{
          backgroundColor: `color-mix(in srgb, ${colors.textMuted} 10%, transparent)`,
          borderColor: `color-mix(in srgb, ${colors.border} 50%, transparent)`
        }}
      >
        <Activity className="w-4 h-4 animate-pulse" style={{ color: colors.textMuted }} />
        <span className="text-xs" style={{ color: colors.textMuted }}>Loading...</span>
      </button>
    )
  }

  // Determine status color
  const getStatusColor = () => {
    if (stats.utilization >= 90) return colors.error
    if (stats.utilization >= 70) return colors.warning
    return colors.success
  }

  const statusColor = getStatusColor()
  const StatusIcon = stats.utilization >= 90 ? XCircle : stats.utilization >= 70 ? AlertTriangle : CheckCircle

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all hover:scale-105"
      style={{
        backgroundColor: `color-mix(in srgb, ${statusColor} 10%, transparent)`,
        borderColor: `color-mix(in srgb, ${statusColor} 30%, transparent)`
      }}
      title={`Threads: ${stats.totalTasks}/${stats.maxThreads} (${stats.utilization}%)\nClick for details`}
    >
      <StatusIcon className="w-4 h-4" style={{ color: statusColor }} />
      <span className="text-xs font-medium" style={{ color: statusColor }}>
        {stats.totalTasks}/{stats.maxThreads}
      </span>
      <span 
        className="text-xs px-1.5 py-0.5 rounded-full"
        style={{ 
          backgroundColor: `color-mix(in srgb, ${statusColor} 20%, transparent)`,
          color: statusColor
        }}
      >
        {stats.utilization}%
      </span>
      {stats.orphanedCount > 0 && (
        <span 
          className="text-xs px-1.5 py-0.5 rounded-full animate-pulse"
          style={{ 
            backgroundColor: `color-mix(in srgb, ${colors.warning} 20%, transparent)`,
            color: colors.warning
          }}
        >
          {stats.orphanedCount} orphaned
        </span>
      )}
    </button>
  )
}
