/**
 * VERSION TRACKER COMPONENT
 * ==========================
 * Tracks development versions to monitor server rollbacks
 * 
 * Features:
 * - Display current version in header
 * - Popup for manual version setting
 * - Version history with notes
 * - Auto-version on git commits/backups
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Tag, History, GitBranch, Plus, Clock, Check, AlertCircle, Copy, Trash2 } from 'lucide-react'

// =============================================================================
// TYPES
// =============================================================================

interface Version {
  id: string
  version: string           // Format: DD-MM-YY-HHMM (e.g., "26-03-26-2030")
  timestamp: string
  note?: string
  source: 'manual' | 'git_commit' | 'git_push' | 'backup' | 'auto'
  gitCommit?: string
  gitBranch?: string
}

interface VersionTrackerProps {
  compact?: boolean
}

// =============================================================================
// VERSION TRACKER COMPONENT
// =============================================================================

export function VersionTracker({ compact = true }: VersionTrackerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentVersion, setCurrentVersion] = useState<Version | null>(null)
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [copied, setCopied] = useState(false)

  // Load versions on mount
  useEffect(() => {
    loadVersions()
  }, [])

  const loadVersions = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/version')
      const data = await response.json()
      
      if (data.success) {
        setVersions(data.versions || [])
        setCurrentVersion(data.versions?.[0] || null)
      } else {
        // Initialize with default version
        const defaultVersion = createDefaultVersion()
        setCurrentVersion(defaultVersion)
        setVersions([defaultVersion])
      }
    } catch (error) {
      console.error('Failed to load versions:', error)
      // Use localStorage as fallback
      const stored = localStorage.getItem('app_versions')
      if (stored) {
        const parsed = JSON.parse(stored)
        setVersions(parsed)
        setCurrentVersion(parsed[0])
      } else {
        const defaultVersion = createDefaultVersion()
        setCurrentVersion(defaultVersion)
        setVersions([defaultVersion])
        localStorage.setItem('app_versions', JSON.stringify([defaultVersion]))
      }
    } finally {
      setLoading(false)
    }
  }

  const createDefaultVersion = (): Version => ({
    id: `ver_${Date.now()}`,
    version: generateVersionString(),
    timestamp: new Date().toISOString(),
    source: 'auto',
    gitBranch: 'unknown'
  })

  const generateVersionString = (): string => {
    const now = new Date()
    const day = now.getDate().toString().padStart(2, '0')
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const year = now.getFullYear().toString().slice(-2)
    const hours = now.getHours().toString().padStart(2, '0')
    const minutes = now.getMinutes().toString().padStart(2, '0')
    return `${day}-${month}-${year}-${hours}${minutes}`
  }

  const setNewVersion = async (source: 'manual' | 'git_commit' | 'git_push' | 'backup' = 'manual', note?: string) => {
    const newVersion: Version = {
      id: `ver_${Date.now()}`,
      version: generateVersionString(),
      timestamp: new Date().toISOString(),
      note: note || newNote,
      source,
      gitBranch: typeof window !== 'undefined' ? 
        document.querySelector('[data-git-branch]')?.getAttribute('data-git-branch') || 'unknown' : 
        'unknown'
    }

    try {
      const response = await fetch('/api/version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', version: newVersion })
      })
      
      const data = await response.json()
      if (data.success) {
        await loadVersions()
      }
    } catch (error) {
      // Fallback to localStorage
      const updated = [newVersion, ...versions]
      setVersions(updated)
      setCurrentVersion(newVersion)
      localStorage.setItem('app_versions', JSON.stringify(updated))
    }

    setNewNote('')
  }

  const deleteVersion = async (id: string) => {
    try {
      await fetch(`/api/version?id=${id}`, { method: 'DELETE' })
      await loadVersions()
    } catch (error) {
      const updated = versions.filter(v => v.id !== id)
      setVersions(updated)
      localStorage.setItem('app_versions', JSON.stringify(updated))
    }
  }

  const copyVersion = () => {
    if (currentVersion) {
      navigator.clipboard.writeText(`v${currentVersion.version}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'git_commit': return <GitBranch className="w-3 h-3" />
      case 'git_push': return <GitBranch className="w-3 h-3" />
      case 'backup': return <History className="w-3 h-3" />
      case 'auto': return <Clock className="w-3 h-3" />
      default: return <Plus className="w-3 h-3" />
    }
  }

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'git_commit': return 'text-green-400'
      case 'git_push': return 'text-blue-400'
      case 'backup': return 'text-yellow-400'
      case 'auto': return 'text-gray-400'
      default: return 'text-purple-400'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 border rounded-lg" 
        style={{ borderColor: 'rgba(139, 92, 246, 0.3)', backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
        <div className="animate-spin rounded-full h-3 w-3 border border-purple-400 border-t-transparent" />
      </div>
    )
  }

  return (
    <>
      {/* Version Badge Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 border rounded-lg hover:opacity-80 transition-opacity"
        style={{ 
          borderColor: 'rgba(139, 92, 246, 0.3)', 
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
        }}
        title={`Version: ${currentVersion?.version}\nClick to manage versions`}
      >
        <Tag className="w-4 h-4 text-purple-400" />
        <span className="text-xs font-mono font-medium text-purple-300">
          v{currentVersion?.version || '---'}
        </span>
        {versions.length > 1 && (
          <span className="text-xs text-purple-400/60">
            ({versions.length})
          </span>
        )}
      </button>

      {/* Version Popup Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: '#1e1e2e', border: '1px solid rgba(139, 92, 246, 0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b" style={{ borderColor: 'rgba(139, 92, 246, 0.2)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <Tag className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Version Tracker</h3>
                    <p className="text-xs text-gray-400">Track development progress & server rollbacks</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <span className="text-gray-400 text-xl">&times;</span>
                </button>
              </div>
            </div>

            {/* Current Version */}
            <div className="p-4 bg-purple-500/5 border-b" style={{ borderColor: 'rgba(139, 92, 246, 0.2)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Current Version</p>
                  <p className="text-2xl font-mono font-bold text-purple-300">v{currentVersion?.version}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {currentVersion?.timestamp ? new Date(currentVersion.timestamp).toLocaleString() : 'Unknown'}
                    {currentVersion?.note && ` • ${currentVersion.note}`}
                  </p>
                </div>
                <button
                  onClick={copyVersion}
                  className="p-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 transition-colors"
                  title="Copy version"
                >
                  {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-purple-400" />}
                </button>
              </div>
            </div>

            {/* New Version Form */}
            <div className="p-4 border-b" style={{ borderColor: 'rgba(139, 92, 246, 0.2)' }}>
              <p className="text-sm font-medium text-gray-300 mb-2">Create New Version</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Note (optional): e.g., 'Fixed auth bug'"
                  className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                />
                <button
                  onClick={() => setNewVersion('manual')}
                  className="px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Set
                </button>
              </div>
            </div>

            {/* Version History */}
            <div className="p-4 max-h-60 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-300">Version History</p>
                <p className="text-xs text-gray-500">{versions.length} versions</p>
              </div>
              
              {versions.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No versions recorded yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {versions.map((ver, index) => (
                    <div 
                      key={ver.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        index === 0 ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1 ${getSourceColor(ver.source)}`}>
                          {getSourceIcon(ver.source)}
                        </div>
                        <div>
                          <p className="text-sm font-mono text-white">v{ver.version}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(ver.timestamp).toLocaleString()}
                            {ver.note && ` • ${ver.note}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${getSourceColor(ver.source)} bg-white/5`}>
                          {ver.source}
                        </span>
                        {index > 0 && (
                          <button
                            onClick={() => deleteVersion(ver.id)}
                            className="p-1 hover:bg-red-500/20 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-white/5 border-t" style={{ borderColor: 'rgba(139, 92, 246, 0.2)' }}>
              <p className="text-xs text-gray-500 text-center">
                💡 Tip: Version is auto-generated as DD-MM-YY-HHMM format. Use this to track rollbacks.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// =============================================================================
// HELPER: Get current version (for other components)
// =============================================================================

export function getCurrentVersion(): string {
  if (typeof window === 'undefined') return '---'
  
  try {
    const stored = localStorage.getItem('app_versions')
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed[0]?.version || '---'
    }
  } catch {}
  
  return '---'
}

// =============================================================================
// HELPER: Auto-set version on git events (for use in other parts of app)
// =============================================================================

export async function autoSetVersion(source: 'git_commit' | 'git_push' | 'backup', note?: string) {
  const now = new Date()
  const day = now.getDate().toString().padStart(2, '0')
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const year = now.getFullYear().toString().slice(-2)
  const hours = now.getHours().toString().padStart(2, '0')
  const minutes = now.getMinutes().toString().padStart(2, '0')
  
  const newVersion = {
    id: `ver_${Date.now()}`,
    version: `${day}-${month}-${year}-${hours}${minutes}`,
    timestamp: now.toISOString(),
    note,
    source
  }

  try {
    await fetch('/api/version', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', version: newVersion })
    })
  } catch (error) {
    console.error('Failed to auto-set version:', error)
  }
}

export default VersionTracker
