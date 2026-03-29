/**
 * USE MEMORY MONITOR HOOK
 * =======================
 * Monitors memory usage in real-time for optimization visibility
 * 
 * Usage:
 *   const { used, total, percent, warning } = useMemoryMonitor()
 */

import { useState, useEffect, useCallback } from 'react'

export interface MemoryStats {
  used: number      // MB
  total: number     // MB
  percent: number   // 0-100
  warning: 'none' | 'low' | 'medium' | 'high' | 'critical'
  trend: 'stable' | 'increasing' | 'decreasing'
  peak: number      // MB - highest seen
}

export function useMemoryMonitor(intervalMs: number = 5000): MemoryStats {
  const [stats, setStats] = useState<MemoryStats>({
    used: 0,
    total: 0,
    percent: 0,
    warning: 'none',
    trend: 'stable',
    peak: 0,
  })

  const [history, setHistory] = useState<number[]>([])

  const checkMemory = useCallback(() => {
    // Check if performance.memory is available (Chrome/Edge only)
    const memory = (performance as any).memory
    
    if (memory) {
      const used = Math.round(memory.usedJSHeapSize / 1024 / 1024)
      const total = Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
      const percent = Math.round((used / total) * 100)

      // Update history for trend detection
      setHistory(prev => {
        const newHistory = [...prev, used].slice(-10)
        return newHistory
      })

      // Detect trend
      let trend: 'stable' | 'increasing' | 'decreasing' = 'stable'
      if (history.length >= 5) {
        const recent = history.slice(-5)
        const older = history.slice(-10, -5)
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length
        
        if (recentAvg > olderAvg * 1.1) {
          trend = 'increasing'
        } else if (recentAvg < olderAvg * 0.9) {
          trend = 'decreasing'
        }
      }

      // Determine warning level
      let warning: MemoryStats['warning'] = 'none'
      if (percent > 90) {
        warning = 'critical'
      } else if (percent > 75) {
        warning = 'high'
      } else if (percent > 50) {
        warning = 'medium'
      } else if (percent > 30) {
        warning = 'low'
      }

      setStats(prev => ({
        used,
        total,
        percent,
        warning,
        trend,
        peak: Math.max(prev.peak, used),
      }))
    }
  }, [history])

  useEffect(() => {
    // Initial check
    checkMemory()

    // Set up interval
    const interval = setInterval(checkMemory, intervalMs)

    return () => clearInterval(interval)
  }, [checkMemory, intervalMs])

  return stats
}

/**
 * Memory Monitor Component
 * Displays memory usage in a compact badge
 */
export function MemoryMonitorBadge() {
  const { used, percent, warning, trend } = useMemoryMonitor()

  const colors = {
    none: 'bg-gray-100 text-gray-800',
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800 animate-pulse',
  }

  const trendIcons = {
    stable: '→',
    increasing: '↑',
    decreasing: '↓',
  }

  if (used === 0) return null

  return (
    <div className={`px-2 py-1 rounded text-xs font-medium ${colors[warning]}`}>
      {used}MB ({percent}%) {trendIcons[trend]}
    </div>
  )
}

export default useMemoryMonitor
