'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { Badge } from '@/components/ui/badge'
import {
  X,
  FileCode,
  Table2,
  Layers,
  Database,
  Key,
  Link2,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Code,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2
} from 'lucide-react'

interface ProjectStatusModalProps {
  projectId: string
  projectName: string
  onClose: () => void
  onNavigate?: (tab: string) => void
}

interface FileDetail {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  lineCount: number
  parseStatus: string
  parseError?: string
  parsedAt?: string
  tablesFound: number
  proceduresFound: number
  complexity: number
}

interface TableDetail {
  id: string
  tableName: string
  schemaName: string
  columns: any[]
  foreignKeys: any[]
  indexes: any[]
  constraints: any[]
  status: string
  sourceDDL?: string
}

interface ProcedureDetail {
  id: string
  procedureName: string
  schemaName: string
  parameters: any[]
  returnType?: string
  tablesAccessed: string[]
  tablesModified: string[]
  complexity: number
}

interface CSHTMLViewDetail {
  id: string
  viewName: string
  viewType: string
  tablesUsed: string[]
  formFields: number
  gridColumns: number
  moduleName?: string
}

interface ProjectStatus {
  project: {
    id: string
    name: string
    description?: string
    softwareType: string
    targetTemplate: string
    status: string
    lastExportAt?: string
    exportCount: number
    createdAt: string
    updatedAt: string
  }
  summary: {
    totalFiles: number
    parsedFiles: number
    pendingFiles: number
    errorFiles: number
    totalTables: number
    totalColumns: number
    totalFKs: number
    totalProcedures: number
    totalCSHTMLViews: number
    discoveredTables: number
  }
  files: FileDetail[]
  tables: TableDetail[]
  procedures: ProcedureDetail[]
  cshtmlViews: CSHTMLViewDetail[]
  prismaSchema?: string
  fkAnalysis: {
    resolved: number
    missing: number
    circular: string[]
    buildOrder: string[]
  }
}

export function ProjectStatusModal({ projectId, projectName, onClose, onNavigate }: ProjectStatusModalProps) {
  const { colors } = useTheme()
  const [status, setStatus] = useState<ProjectStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    files: true,
    tables: false,
    procedures: false,
    cshtmlViews: false,
    prisma: false,
    fkAnalysis: false
  })

  useEffect(() => {
    fetchProjectStatus()
  }, [projectId])

  const fetchProjectStatus = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/project-status?projectId=${projectId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch project status')
      }
      const data = await response.json()
      setStatus(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const getParseStatusIcon = (status: string) => {
    switch (status) {
      case 'parsed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'parsing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getFileTypeColor = (type: string) => {
    switch (type) {
      case 'sql_ddl':
        return '#3b82f6'
      case 'sql_sp':
        return '#8b5cf6'
      case 'sql_view':
        return '#06b6d4'
      case 'cshtml':
        return '#f97316'
      default:
        return '#6b7280'
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="p-8 rounded-xl" style={{ backgroundColor: colors.card }}>
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
          <p className="mt-2" style={{ color: colors.textMuted }}>Loading project status...</p>
        </div>
      </div>
    )
  }

  if (error || !status) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="p-8 rounded-xl" style={{ backgroundColor: colors.card }}>
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
          <p className="mt-2 text-red-500">{error || 'Failed to load status'}</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 rounded-lg"
            style={{ backgroundColor: colors.primary, color: '#fff' }}
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-xl border shadow-2xl flex flex-col"
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: colors.border }}
        >
          <div>
            <h2 className="text-xl font-bold" style={{ color: colors.text }}>
              {projectName} - Project Status
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{status.project.softwareType}</Badge>
              <Badge variant="secondary">{status.project.targetTemplate}</Badge>
              <span className="text-xs" style={{ color: colors.textMuted }}>
                Created {new Date(status.project.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:opacity-70"
            style={{ color: colors.textMuted }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 border-b" style={{ borderColor: colors.border }}>
          <div className="p-3 rounded-lg" style={{ backgroundColor: colors.bg }}>
            <div className="flex items-center gap-2">
              <FileCode className="w-5 h-5" style={{ color: colors.primary }} />
              <span className="text-sm" style={{ color: colors.textMuted }}>Files</span>
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: colors.text }}>
              {status.summary.totalFiles}
            </div>
            <div className="text-xs" style={{ color: colors.textMuted }}>
              {status.summary.parsedFiles} parsed • {status.summary.errorFiles} errors
            </div>
          </div>

          <div className="p-3 rounded-lg" style={{ backgroundColor: colors.bg }}>
            <div className="flex items-center gap-2">
              <Table2 className="w-5 h-5" style={{ color: '#22c55e' }} />
              <span className="text-sm" style={{ color: colors.textMuted }}>Tables</span>
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: colors.text }}>
              {status.summary.totalTables}
            </div>
            <div className="text-xs" style={{ color: colors.textMuted }}>
              {status.summary.totalColumns} columns
            </div>
          </div>

          <div className="p-3 rounded-lg" style={{ backgroundColor: colors.bg }}>
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5" style={{ color: '#f97316' }} />
              <span className="text-sm" style={{ color: colors.textMuted }}>Foreign Keys</span>
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: colors.text }}>
              {status.summary.totalFKs}
            </div>
            <div className="text-xs" style={{ color: colors.textMuted }}>
              {status.fkAnalysis.resolved} resolved • {status.fkAnalysis.missing} missing
            </div>
          </div>

          <div className="p-3 rounded-lg" style={{ backgroundColor: colors.bg }}>
            <div className="flex items-center gap-2">
              <Code className="w-5 h-5" style={{ color: '#8b5cf6' }} />
              <span className="text-sm" style={{ color: colors.textMuted }}>Procedures</span>
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: colors.text }}>
              {status.summary.totalProcedures}
            </div>
          </div>

          <div className="p-3 rounded-lg" style={{ backgroundColor: colors.bg }}>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" style={{ color: '#06b6d4' }} />
              <span className="text-sm" style={{ color: colors.textMuted }}>CSHTML Views</span>
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: colors.text }}>
              {status.summary.totalCSHTMLViews}
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Files Section */}
          <div
            className="rounded-lg border overflow-hidden"
            style={{ borderColor: colors.border }}
          >
            <button
              onClick={() => toggleSection('files')}
              className="w-full flex items-center justify-between p-3 hover:opacity-80"
              style={{ backgroundColor: colors.bg }}
            >
              <div className="flex items-center gap-2">
                {expandedSections.files ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <FileCode className="w-5 h-5" style={{ color: colors.primary }} />
                <span className="font-medium" style={{ color: colors.text }}>
                  Files ({status.files.length})
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-green-500">{status.summary.parsedFiles} parsed</span>
                {status.summary.errorFiles > 0 && (
                  <span className="text-red-500">{status.summary.errorFiles} errors</span>
                )}
              </div>
            </button>
            {expandedSections.files && (
              <div className="p-3 space-y-2">
                {status.files.length === 0 ? (
                  <p className="text-sm text-center py-4" style={{ color: colors.textMuted }}>
                    No files uploaded yet
                  </p>
                ) : (
                  status.files.map(file => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-2 rounded-lg"
                      style={{ backgroundColor: colors.bg }}
                    >
                      <div className="flex items-center gap-3">
                        {getParseStatusIcon(file.parseStatus)}
                        <div>
                          <div className="font-medium text-sm" style={{ color: colors.text }}>
                            {file.fileName}
                          </div>
                          <div className="text-xs" style={{ color: colors.textMuted }}>
                            {file.lineCount} lines • {(file.fileSize / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          style={{
                            backgroundColor: `${getFileTypeColor(file.fileType)}20`,
                            color: getFileTypeColor(file.fileType)
                          }}
                        >
                          {file.fileType.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <div className="text-xs text-right" style={{ color: colors.textMuted }}>
                          {file.tablesFound > 0 && <div>{file.tablesFound} tables</div>}
                          {file.proceduresFound > 0 && <div>{file.proceduresFound} procs</div>}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Tables Section */}
          <div
            className="rounded-lg border overflow-hidden"
            style={{ borderColor: colors.border }}
          >
            <button
              onClick={() => toggleSection('tables')}
              className="w-full flex items-center justify-between p-3 hover:opacity-80"
              style={{ backgroundColor: colors.bg }}
            >
              <div className="flex items-center gap-2">
                {expandedSections.tables ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <Table2 className="w-5 h-5 text-green-500" />
                <span className="font-medium" style={{ color: colors.text }}>
                  Tables ({status.tables.length})
                </span>
              </div>
              <span className="text-xs" style={{ color: colors.textMuted }}>
                {status.summary.totalColumns} columns • {status.summary.totalFKs} FKs
              </span>
            </button>
            {expandedSections.tables && (
              <div className="p-3 space-y-2">
                {status.tables.length === 0 ? (
                  <p className="text-sm text-center py-4" style={{ color: colors.textMuted }}>
                    No tables parsed yet
                  </p>
                ) : (
                  status.tables.map(table => (
                    <div
                      key={table.id}
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: colors.bg }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4" style={{ color: colors.primary }} />
                          <span className="font-medium text-sm" style={{ color: colors.text }}>
                            {table.tableName}
                          </span>
                          <Badge variant="outline" className="text-xs">{table.schemaName}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span style={{ color: colors.textMuted }}>{table.columns.length} cols</span>
                          {table.foreignKeys.length > 0 && (
                            <span className="text-orange-500">{table.foreignKeys.length} FKs</span>
                          )}
                          {table.indexes.length > 0 && (
                            <span style={{ color: colors.textMuted }}>{table.indexes.length} indexes</span>
                          )}
                        </div>
                      </div>
                      {/* Column Preview */}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {table.columns.slice(0, 8).map((col: any, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded text-xs"
                            style={{ backgroundColor: colors.card, color: colors.textMuted }}
                          >
                            {col.name}
                          </span>
                        ))}
                        {table.columns.length > 8 && (
                          <span className="px-2 py-0.5 rounded text-xs" style={{ color: colors.textMuted }}>
                            +{table.columns.length - 8} more
                          </span>
                        )}
                      </div>
                      {/* Foreign Keys */}
                      {table.foreignKeys.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {table.foreignKeys.slice(0, 3).map((fk: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-1 text-xs">
                              <Link2 className="w-3 h-3 text-orange-500" />
                              <span style={{ color: colors.text }}>{fk.column}</span>
                              <ArrowRight className="w-3 h-3" style={{ color: colors.textMuted }} />
                              <span className="text-green-500">{fk.references}</span>
                            </div>
                          ))}
                          {table.foreignKeys.length > 3 && (
                            <span className="text-xs" style={{ color: colors.textMuted }}>
                              +{table.foreignKeys.length - 3} more FKs
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* FK Analysis Section */}
          <div
            className="rounded-lg border overflow-hidden"
            style={{ borderColor: colors.border }}
          >
            <button
              onClick={() => toggleSection('fkAnalysis')}
              className="w-full flex items-center justify-between p-3 hover:opacity-80"
              style={{ backgroundColor: colors.bg }}
            >
              <div className="flex items-center gap-2">
                {expandedSections.fkAnalysis ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <Key className="w-5 h-5 text-orange-500" />
                <span className="font-medium" style={{ color: colors.text }}>
                  FK Analysis
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-green-500">{status.fkAnalysis.resolved} resolved</span>
                {status.fkAnalysis.missing > 0 && (
                  <span className="text-red-500">{status.fkAnalysis.missing} missing</span>
                )}
              </div>
            </button>
            {expandedSections.fkAnalysis && (
              <div className="p-3 space-y-3">
                {/* Build Order */}
                <div>
                  <h4 className="text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Table Build Order
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {status.fkAnalysis.buildOrder.slice(0, 10).map((table, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">{idx + 1}</Badge>
                        <span className="text-xs" style={{ color: colors.text }}>{table}</span>
                        {idx < status.fkAnalysis.buildOrder.length - 1 && idx < 9 && (
                          <ArrowRight className="w-3 h-3" style={{ color: colors.textMuted }} />
                        )}
                      </div>
                    ))}
                    {status.fkAnalysis.buildOrder.length > 10 && (
                      <span className="text-xs" style={{ color: colors.textMuted }}>
                        +{status.fkAnalysis.buildOrder.length - 10} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Circular Dependencies */}
                {status.fkAnalysis.circular.length > 0 && (
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${colors.error}10` }}>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-medium text-red-500">Circular Dependencies Detected</span>
                    </div>
                    <div className="mt-2 text-xs" style={{ color: colors.textMuted }}>
                      {status.fkAnalysis.circular.join(' → ')}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Procedures Section */}
          <div
            className="rounded-lg border overflow-hidden"
            style={{ borderColor: colors.border }}
          >
            <button
              onClick={() => toggleSection('procedures')}
              className="w-full flex items-center justify-between p-3 hover:opacity-80"
              style={{ backgroundColor: colors.bg }}
            >
              <div className="flex items-center gap-2">
                {expandedSections.procedures ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <Code className="w-5 h-5 text-purple-500" />
                <span className="font-medium" style={{ color: colors.text }}>
                  Stored Procedures ({status.procedures.length})
                </span>
              </div>
            </button>
            {expandedSections.procedures && (
              <div className="p-3 space-y-2">
                {status.procedures.length === 0 ? (
                  <p className="text-sm text-center py-4" style={{ color: colors.textMuted }}>
                    No stored procedures parsed yet
                  </p>
                ) : (
                  status.procedures.map(proc => (
                    <div
                      key={proc.id}
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: colors.bg }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm" style={{ color: colors.text }}>
                          {proc.procedureName}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          Complexity: {proc.complexity}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-xs">
                        {proc.tablesAccessed.length > 0 && (
                          <span style={{ color: colors.textMuted }}>
                            Reads: {proc.tablesAccessed.join(', ')}
                          </span>
                        )}
                        {proc.tablesModified.length > 0 && (
                          <span className="text-orange-500">
                            Writes: {proc.tablesModified.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* CSHTML Views Section */}
          <div
            className="rounded-lg border overflow-hidden"
            style={{ borderColor: colors.border }}
          >
            <button
              onClick={() => toggleSection('cshtmlViews')}
              className="w-full flex items-center justify-between p-3 hover:opacity-80"
              style={{ backgroundColor: colors.bg }}
            >
              <div className="flex items-center gap-2">
                {expandedSections.cshtmlViews ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <FileText className="w-5 h-5 text-cyan-500" />
                <span className="font-medium" style={{ color: colors.text }}>
                  CSHTML Views ({status.cshtmlViews.length})
                </span>
              </div>
            </button>
            {expandedSections.cshtmlViews && (
              <div className="p-3 space-y-2">
                {status.cshtmlViews.length === 0 ? (
                  <p className="text-sm text-center py-4" style={{ color: colors.textMuted }}>
                    No CSHTML views parsed yet
                  </p>
                ) : (
                  status.cshtmlViews.map(view => (
                    <div
                      key={view.id}
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: colors.bg }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm" style={{ color: colors.text }}>
                          {view.viewName}
                        </span>
                        <Badge style={{ backgroundColor: '#06b6d420', color: '#06b6d4' }}>
                          {view.viewType}
                        </Badge>
                      </div>
                      <div className="mt-1 text-xs" style={{ color: colors.textMuted }}>
                        {view.formFields} form fields • {view.gridColumns} grid columns
                      </div>
                      {view.tablesUsed.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {view.tablesUsed.map(table => (
                            <span
                              key={table}
                              className="px-2 py-0.5 rounded text-xs"
                              style={{ backgroundColor: colors.card, color: colors.textMuted }}
                            >
                              {table}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Prisma Schema Section */}
          {status.prismaSchema && (
            <div
              className="rounded-lg border overflow-hidden"
              style={{ borderColor: colors.border }}
            >
              <button
                onClick={() => toggleSection('prisma')}
                className="w-full flex items-center justify-between p-3 hover:opacity-80"
                style={{ backgroundColor: colors.bg }}
              >
                <div className="flex items-center gap-2">
                  {expandedSections.prisma ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <Layers className="w-5 h-5 text-indigo-500" />
                  <span className="font-medium" style={{ color: colors.text }}>
                    Generated Prisma Schema
                  </span>
                </div>
              </button>
              {expandedSections.prisma && (
                <div className="p-3">
                  <pre
                    className="p-3 rounded-lg text-xs overflow-x-auto"
                    style={{ backgroundColor: colors.bg, color: colors.textMuted }}
                  >
                    {status.prismaSchema.slice(0, 2000)}
                    {status.prismaSchema.length > 2000 && '\n... (truncated)'}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between p-4 border-t"
          style={{ borderColor: colors.border }}
        >
          <div className="text-xs" style={{ color: colors.textMuted }}>
            {status.project.exportCount > 0 ? (
              <>Last exported: {status.project.lastExportAt ? new Date(status.project.lastExportAt).toLocaleString() : 'Never'}</>
            ) : (
              'Not exported yet'
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate?.('smart-upload')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
              style={{ border: `1px solid ${colors.border}`, color: colors.text }}
            >
              <ExternalLink className="w-4 h-4" />
              Upload More Files
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-sm font-medium"
              style={{ backgroundColor: colors.primary, color: '#fff' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
