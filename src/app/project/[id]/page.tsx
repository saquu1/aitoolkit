'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTheme } from '@/hooks/useTheme'
import {
  Database, FileCode, Table2, Code, FileText, Key, Layers,
  BarChart3, CheckCircle, AlertTriangle, Clock, Loader2, ExternalLink,
  Brain, GitBranch
} from 'lucide-react'
import SessionStatusIndicator from '@/components/SessionStatusIndicator'

interface ProjectStatus {
  project: {
    id: string
    name: string
    softwareType: string
    status: string
    createdAt: string
    updatedAt: string
  }
  counts: {
    files: number
    tables: number
    procedures: number
    cshtmlViews: number
    storedProcCache: number
    viewCache: number
    discoveredTables: number
  }
  files: {
    total: number
    parsed: number
    pending: number
    error: number
  }
  tables: any[]
  procedures: any[]
  recentFiles: any[]
}

export default function ProjectStatusPage() {
  const params = useParams()
  const router = useRouter()
  const { colors } = useTheme()
  const projectId = params.id as string

  const [status, setStatus] = useState<ProjectStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStatus()
  }, [projectId])

  const fetchStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/project-status?projectId=${projectId}`)
      if (!response.ok) throw new Error('Failed to fetch status')
      const data = await response.json()
      setStatus(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.bg }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
      </div>
    )
  }

  if (error || !status) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.bg }}>
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4" style={{ color: colors.error }} />
          <p style={{ color: colors.text }}>{error || 'Failed to load project status'}</p>
          <button
            onClick={fetchStatus}
            className="mt-4 px-4 py-2 rounded-lg"
            style={{ backgroundColor: colors.primary, color: '#fff' }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const statCards = [
    { label: 'Files', value: status.counts.files, icon: FileCode, color: '#3b82f6' },
    { label: 'Tables', value: status.counts.tables, icon: Table2, color: '#22c55e' },
    { label: 'Procedures', value: status.counts.procedures, icon: Code, color: '#8b5cf6' },
    { label: 'CSHTML Views', value: status.counts.cshtmlViews, icon: FileText, color: '#f97316' },
    { label: 'FK Analysis', value: status.counts.storedProcCache, icon: Key, color: '#ef4444' },
    { label: 'Intelligence', value: status.counts.viewCache, icon: Layers, color: '#06b6d4' },
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg }}>
      {/* Header */}
      <div className="sticky top-0 z-10 border-b" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6" style={{ color: colors.primary }} />
            <h1 className="text-xl font-bold" style={{ color: colors.text }}>Project Status</h1>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Session Status Indicator */}
        <SessionStatusIndicator />

        {/* Project Info */}
        <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: colors.text }}>{status.project.name}</h2>
              <p className="text-sm" style={{ color: colors.textMuted }}>
                {status.project.softwareType} • Created {new Date(status.project.createdAt).toLocaleDateString()}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-sm font-medium"
              style={{ backgroundColor: status.project.status === 'active' ? '#22c55e20' : '#f59e0b20', color: status.project.status === 'active' ? '#22c55e' : '#f59e0b' }}>
              {status.project.status}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-5 h-5" style={{ color: stat.color }} />
                  <span className="text-sm" style={{ color: colors.textMuted }}>{stat.label}</span>
                </div>
                <div className="text-2xl font-bold" style={{ color: colors.text }}>{stat.value}</div>
              </div>
            )
          })}
        </div>

        {/* File Parsing Status */}
        <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <h3 className="font-semibold mb-4" style={{ color: colors.text }}>File Parsing Status</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: colors.text }}>{status.files.total}</div>
              <div className="text-sm" style={{ color: colors.textMuted }}>Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{status.files.parsed}</div>
              <div className="text-sm" style={{ color: colors.textMuted }}>Parsed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">{status.files.pending}</div>
              <div className="text-sm" style={{ color: colors.textMuted }}>Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{status.files.error}</div>
              <div className="text-sm" style={{ color: colors.textMuted }}>Errors</div>
            </div>
          </div>
        </div>

        {/* Recent Files */}
        {status.recentFiles.length > 0 && (
          <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: colors.text }}>Recent Files</h3>
              <button
                onClick={() => router.push(`/project/${projectId}/files`)}
                className="text-sm flex items-center gap-1"
                style={{ color: colors.primary }}
              >
                View All <ExternalLink className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {status.recentFiles.slice(0, 5).map((file: any) => (
                <div key={file.id} className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: colors.bg }}>
                  <div className="flex items-center gap-2">
                    {file.parseStatus === 'parsed' ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : file.parseStatus === 'error' ? (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-gray-400" />
                    )}
                    <span style={{ color: colors.text }}>{file.fileName}</span>
                  </div>
                  <span className="text-xs" style={{ color: colors.textMuted }}>{file.fileType}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => router.push(`/project/${projectId}/upload`)}
            className="p-4 rounded-xl border text-left transition-colors hover:opacity-80"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <Upload className="w-6 h-6 mb-2" style={{ color: colors.primary }} />
            <div className="font-medium" style={{ color: colors.text }}>Upload Files</div>
            <div className="text-sm" style={{ color: colors.textMuted }}>Add SQL or CSHTML</div>
          </button>
          <button
            onClick={() => router.push(`/project/${projectId}/intelligence`)}
            className="p-4 rounded-xl border text-left transition-colors hover:opacity-80"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <Brain className="w-6 h-6 mb-2" style={{ color: '#06b6d4' }} />
            <div className="font-medium" style={{ color: colors.text }}>Intelligence</div>
            <div className="text-sm" style={{ color: colors.textMuted }}>View project insights</div>
          </button>
          <button
            onClick={() => router.push(`/project/${projectId}/modules`)}
            className="p-4 rounded-xl border text-left transition-colors hover:opacity-80"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <GitBranch className="w-6 h-6 mb-2" style={{ color: '#8b5cf6' }} />
            <div className="font-medium" style={{ color: colors.text }}>Modules</div>
            <div className="text-sm" style={{ color: colors.textMuted }}>HIS module mapping</div>
          </button>
          <button
            onClick={() => router.push(`/project/${projectId}/tables`)}
            className="p-4 rounded-xl border text-left transition-colors hover:opacity-80"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <Table2 className="w-6 h-6 mb-2" style={{ color: '#22c55e' }} />
            <div className="font-medium" style={{ color: colors.text }}>View Tables</div>
            <div className="text-sm" style={{ color: colors.textMuted }}>{status.counts.tables} tables</div>
          </button>
        </div>

        {/* Secondary Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => router.push(`/project/${projectId}/procedures`)}
            className="p-4 rounded-xl border text-left transition-colors hover:opacity-80"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <Code className="w-6 h-6 mb-2" style={{ color: '#f97316' }} />
            <div className="font-medium" style={{ color: colors.text }}>Procedures</div>
            <div className="text-sm" style={{ color: colors.textMuted }}>{status.counts.procedures} stored procs</div>
          </button>
          <button
            onClick={() => router.push(`/project/${projectId}/views`)}
            className="p-4 rounded-xl border text-left transition-colors hover:opacity-80"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <FileText className="w-6 h-6 mb-2" style={{ color: '#ec4899' }} />
            <div className="font-medium" style={{ color: colors.text }}>CSHTML Views</div>
            <div className="text-sm" style={{ color: colors.textMuted }}>{status.counts.cshtmlViews} views</div>
          </button>
          <button
            onClick={() => router.push(`/project/${projectId}/prisma`)}
            className="p-4 rounded-xl border text-left transition-colors hover:opacity-80"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <Layers className="w-6 h-6 mb-2" style={{ color: '#14b8a6' }} />
            <div className="font-medium" style={{ color: colors.text }}>Prisma Schema</div>
            <div className="text-sm" style={{ color: colors.textMuted }}>Generate schema</div>
          </button>
          <button
            onClick={() => router.push(`/project/${projectId}/settings`)}
            className="p-4 rounded-xl border text-left transition-colors hover:opacity-80"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <Database className="w-6 h-6 mb-2" style={{ color: colors.primary }} />
            <div className="font-medium" style={{ color: colors.text }}>Settings</div>
            <div className="text-sm" style={{ color: colors.textMuted }}>Project config</div>
          </button>
        </div>
      </div>
    </div>
  )
}

function Upload({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}
