'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/hooks/useTheme'
import {
  Clock, AlertTriangle, CheckCircle, AlertCircle,
  RefreshCw, GitBranch, HardDrive, Cloud, Save, ChevronDown, ChevronUp,
  Power, Terminal, Copy, Check
} from 'lucide-react'

interface SessionStatus {
  container: {
    uptime: number
    uptimeFormatted: string
    startTime: string
    estimatedEndTime: string | null
    estimatedRemainingMinutes: number | null
  }
  session: {
    status: 'healthy' | 'warning' | 'critical' | 'unknown'
    message: string
    progressPercent: number
  }
  persistence: {
    gitCommits: number
    lastCommitTime: string | null
    hasUncommittedChanges: boolean
  }
  storage: {
    persistent: string[]
    ephemeral: string[]
  }
  recommendations: string[]
}

interface SessionStatusIndicatorProps {
  compact?: boolean
  showDetails?: boolean
}

export function SessionStatusIndicator({ compact = false, showDetails = true }: SessionStatusIndicatorProps) {
  const { colors } = useTheme()
  const [status, setStatus] = useState<SessionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(!compact)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [committing, setCommitting] = useState(false)
  const [restarting, setRestarting] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/session-status')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (error) {
      console.error('Failed to fetch session status:', error)
    } finally {
      setLoading(false)
      setLastUpdate(new Date())
    }
  }

  const handleGitCommit = async () => {
    setCommitting(true)
    try {
      const response = await fetch('/api/session-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'git-commit',
          message: `Save progress - ${new Date().toLocaleTimeString()}`
        })
      })
      const data = await response.json()
      if (data.success) {
        fetchStatus()
        alert(data.message)
      } else {
        alert('Failed to commit: ' + data.error)
      }
    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      setCommitting(false)
    }
  }

  const handleRestartServer = async () => {
    if (!confirm('This will restart the server. Continue?\n\nYour changes will be saved to Git first.')) {
      return
    }
    
    setRestarting(true)
    try {
      const response = await fetch('/api/session-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restart-server' })
      })
      const data = await response.json()
      if (data.success) {
        alert('Server restarting...\n\nAfter restart, run:\nnpm install && npm run dev')
      }
    } catch (error: any) {
      alert('Error: ' + error.message)
    }
  }

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading || !status) {
    return null
  }

  const getStatusColor = () => {
    switch (status.session.status) {
      case 'critical': return '#ef4444'
      case 'warning': return '#f59e0b'
      case 'healthy': return '#22c55e'
      default: return '#6b7280'
    }
  }

  const getStatusIcon = () => {
    switch (status.session.status) {
      case 'critical':
        return <AlertCircle className="w-5 h-5" style={{ color: getStatusColor() }} />
      case 'warning':
        return <AlertTriangle className="w-5 h-5" style={{ color: getStatusColor() }} />
      case 'healthy':
        return <CheckCircle className="w-5 h-5" style={{ color: getStatusColor() }} />
      default:
        return <Clock className="w-5 h-5" style={{ color: getStatusColor() }} />
    }
  }

  if (compact && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
        style={{
          backgroundColor: status.session.status === 'critical' ? '#ef444420' : 
                          status.session.status === 'warning' ? '#f59e0b20' : '#22c55e20',
          color: getStatusColor()
        }}
      >
        {getStatusIcon()}
        <span>{status.container.uptimeFormatted}</span>
        {status.persistence.hasUncommittedChanges && (
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Uncommitted changes" />
        )}
      </button>
    )
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <div className="font-medium" style={{ color: colors.text }}>
              Session Status
            </div>
            <div className="text-sm" style={{ color: colors.textMuted }}>
              {status.session.message}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-mono" style={{ color: colors.text }}>
              {status.container.uptimeFormatted}
            </div>
            <div className="text-xs" style={{ color: colors.textMuted }}>
              uptime
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="w-5 h-5" style={{ color: colors.textMuted }} />
          ) : (
            <ChevronDown className="w-5 h-5" style={{ color: colors.textMuted }} />
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1" style={{ backgroundColor: colors.border }}>
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${status.session.progressPercent}%`,
            backgroundColor: getStatusColor()
          }}
        />
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="p-4 space-y-4 border-t" style={{ borderColor: colors.border }}>
          {/* Time Info */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: colors.bg }}>
              <Clock className="w-5 h-5 mx-auto mb-1" style={{ color: colors.primary }} />
              <div className="text-sm font-medium" style={{ color: colors.text }}>Started</div>
              <div className="text-xs" style={{ color: colors.textMuted }}>
                {new Date(status.container.startTime).toLocaleTimeString()}
              </div>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: colors.bg }}>
              <div className="w-5 h-5 mx-auto mb-1 rounded-full" 
                style={{ backgroundColor: `${getStatusColor()}20`, border: `2px solid ${getStatusColor()}` }} />
              <div className="text-sm font-medium" style={{ color: colors.text }}>Remaining</div>
              <div className="text-xs" style={{ color: colors.textMuted }}>
                ~{status.container.estimatedRemainingMinutes} min
              </div>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: colors.bg }}>
              <AlertTriangle className="w-5 h-5 mx-auto mb-1" 
                style={{ color: status.persistence.hasUncommittedChanges ? '#f59e0b' : '#22c55e' }} />
              <div className="text-sm font-medium" style={{ color: colors.text }}>Git Commits</div>
              <div className="text-xs" style={{ color: colors.textMuted }}>
                {status.persistence.gitCommits} commits
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="grid grid-cols-2 gap-3">
            {/* Git Commit Button */}
            <button
              onClick={handleGitCommit}
              disabled={committing}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all disabled:opacity-50"
              style={{
                backgroundColor: status.persistence.hasUncommittedChanges ? '#f59e0b' : '#22c55e',
                color: '#fff'
              }}
            >
              {committing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Committing...</span>
                </>
              ) : (
                <>
                  <GitBranch className="w-4 h-4" />
                  <span>Git Commit</span>
                  {status.persistence.hasUncommittedChanges && (
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  )}
                </>
              )}
            </button>

            {/* Restart Server Button */}
            <button
              onClick={handleRestartServer}
              disabled={restarting}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all disabled:opacity-50"
              style={{
                backgroundColor: '#3b82f6',
                color: '#fff'
              }}
            >
              {restarting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Restarting...</span>
                </>
              ) : (
                <>
                  <Power className="w-4 h-4" />
                  <span>Restart Server</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Commands */}
          <div className="p-3 rounded-lg" style={{ backgroundColor: colors.bg }}>
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="w-4 h-4" style={{ color: colors.primary }} />
              <span className="text-sm font-medium" style={{ color: colors.text }}>Quick Commands</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 rounded text-sm font-mono" 
                  style={{ backgroundColor: colors.card, color: colors.text }}>
                  git add -A && git commit -m "Save progress"
                </code>
                <button
                  onClick={() => copyCommand('git add -A && git commit -m "Save progress"')}
                  className="p-2 rounded hover:opacity-80"
                  style={{ backgroundColor: colors.primary, color: '#fff' }}
                  title="Copy command"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 rounded text-sm font-mono" 
                  style={{ backgroundColor: colors.card, color: colors.text }}>
                  npm install && npm run dev
                </code>
                <button
                  onClick={() => copyCommand('npm install && npm run dev')}
                  className="p-2 rounded hover:opacity-80"
                  style={{ backgroundColor: colors.primary, color: '#fff' }}
                  title="Copy command"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Persistence Warning */}
          {status.persistence.hasUncommittedChanges && (
            <div className="flex items-start gap-3 p-3 rounded-lg" 
              style={{ backgroundColor: '#f59e0b10', border: '1px solid #f59e0b30' }}>
              <Save className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
              <div>
                <div className="font-medium text-amber-600">Uncommitted Changes Detected!</div>
                <div className="text-sm text-amber-700 mt-1">
                  Click the <strong>Git Commit</strong> button above to save your work.
                </div>
              </div>
            </div>
          )}

          {/* Storage Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg" style={{ backgroundColor: colors.bg }}>
              <div className="flex items-center gap-2 mb-2">
                <Cloud className="w-4 h-4" style={{ color: '#22c55e' }} />
                <span className="text-sm font-medium" style={{ color: colors.text }}>Persistent</span>
              </div>
              <ul className="text-xs space-y-1" style={{ color: colors.textMuted }}>
                {status.storage.persistent.slice(0, 3).map((item, i) => (
                  <li key={i}>✓ {item}</li>
                ))}
              </ul>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: colors.bg }}>
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="w-4 h-4" style={{ color: '#ef4444' }} />
                <span className="text-sm font-medium" style={{ color: colors.text }}>Ephemeral</span>
              </div>
              <ul className="text-xs space-y-1" style={{ color: colors.textMuted }}>
                {status.storage.ephemeral.slice(0, 3).map((item, i) => (
                  <li key={i}>⚠ {item}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs" style={{ color: colors.textMuted }}>
            <div className="flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              <span>Updated {lastUpdate.toLocaleTimeString()}</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); fetchStatus(); }}
              className="hover:underline"
              style={{ color: colors.primary }}
            >
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Minimal inline version for headers/navbars
export function SessionStatusBadge() {
  const { colors } = useTheme()
  const [status, setStatus] = useState<SessionStatus | null>(null)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/session-status')
        if (response.ok) {
          const data = await response.json()
          setStatus(data)
        }
      } catch (error) {
        console.error('Failed to fetch session status:', error)
      }
    }
    fetchStatus()
    const interval = setInterval(fetchStatus, 60000)
    return () => clearInterval(interval)
  }, [])

  if (!status) return null

  const getStatusColor = () => {
    switch (status.session.status) {
      case 'critical': return '#ef4444'
      case 'warning': return '#f59e0b'
      case 'healthy': return '#22c55e'
      default: return '#6b7280'
    }
  }

  return (
    <div 
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
      style={{ 
        backgroundColor: `${getStatusColor()}20`,
        color: getStatusColor()
      }}
      title={`Session uptime: ${status.container.uptimeFormatted}\nRemaining: ~${status.container.estimatedRemainingMinutes} min`}
    >
      <Clock className="w-3.5 h-3.5" />
      <span>{status.container.uptimeFormatted}</span>
      {status.persistence.hasUncommittedChanges && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
      )}
    </div>
  )
}

export default SessionStatusIndicator
