'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/hooks/useTheme'
import {
  Brain, RefreshCw, Database, Table2, FileText, Code, GitBranch,
  CheckCircle, AlertTriangle, XCircle, Loader2, ChevronDown, ChevronRight,
  Play, Link, Layers, Shield, FileCode, Users, BarChart3, Zap, ArrowLeft
} from 'lucide-react'

interface IntelligenceHubProps {
  projectId: string
}

export default function IntelligenceHub({ projectId }: IntelligenceHubProps) {
  const { colors } = useTheme()
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'tables' | 'views' | 'procedures' | 'modules' | 'files'>('overview')
  const [isLinking, setIsLinking] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    tables: true,
    views: false,
    procedures: false
  })

  // Fetch real data from API
  const fetchData = useCallback(async () => {
    if (!projectId) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/project-intelligence?projectId=${projectId}&action=all`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch project data')
      }

      const result = await response.json()
      setData(result)
    } catch (err: any) {
      console.error('Failed to fetch data:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  // Link modules
  const handleLinkModules = async () => {
    setIsLinking(true)
    try {
      const response = await fetch('/api/project-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'link-modules', projectId })
      })

      if (!response.ok) throw new Error('Failed to link modules')

      // Refresh data after linking
      await fetchData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLinking(false)
    }
  }

  // Auto-fetch on mount
  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const stats = data?.statistics || {
    totalTables: 0,
    totalViews: 0,
    totalProcedures: 0,
    totalFiles: 0,
    totalColumns: 0,
    totalForeignKeys: 0
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6" style={{ color: '#06b6d4' }} />
          <h2 className="text-xl font-bold" style={{ color: colors.text }}>Project Intelligence</h2>
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" style={{ color: colors.primary }} />}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleLinkModules}
            disabled={isLinking || isLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white"
            style={{ backgroundColor: '#8b5cf6' }}
          >
            {isLinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
            Link Modules
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg border" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 rounded-lg overflow-x-auto" style={{ backgroundColor: colors.bg }}>
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'tables', label: 'Tables', icon: Table2 },
          { id: 'views', label: 'Views', icon: FileCode },
          { id: 'procedures', label: 'Procedures', icon: Code },
          { id: 'modules', label: 'Modules', icon: GitBranch },
          { id: 'files', label: 'Files', icon: FileText }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id ? 'bg-white shadow-sm' : ''
            }`}
            style={{
              backgroundColor: activeTab === tab.id ? colors.card : 'transparent',
              color: activeTab === tab.id ? colors.text : colors.textMuted
            }}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading && !data ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
        </div>
      ) : (
        <>
          {activeTab === 'overview' && <OverviewTab colors={colors} stats={stats} data={data} />}
          {activeTab === 'tables' && <TablesTab colors={colors} tables={data?.tables || []} expandedSections={expandedSections} toggleSection={toggleSection} />}
          {activeTab === 'views' && <ViewsTab colors={colors} views={data?.views || []} />}
          {activeTab === 'procedures' && <ProceduresTab colors={colors} procedures={data?.procedures || []} />}
          {activeTab === 'modules' && <ModulesTab colors={colors} data={data} onLinkModules={handleLinkModules} isLinking={isLinking} />}
          {activeTab === 'files' && <FilesTab colors={colors} files={data?.files || []} />}
        </>
      )}
    </div>
  )
}

// =============================================================================
// TAB COMPONENTS - REAL DATA ONLY
// =============================================================================

function OverviewTab({ colors, stats, data }: any) {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard colors={colors} icon={Table2} label="Tables" value={stats.totalTables} color="#22c55e" />
        <StatCard colors={colors} icon={FileCode} label="CSHTML Views" value={stats.totalViews} color="#f97316" />
        <StatCard colors={colors} icon={Code} label="Procedures" value={stats.totalProcedures} color="#8b5cf6" />
        <StatCard colors={colors} icon={GitBranch} label="Modules" value={data?.modules?.length || 0} color="#06b6d4" />
        <StatCard colors={colors} icon={Database} label="Columns" value={stats.totalColumns} color="#ec4899" />
        <StatCard colors={colors} icon={FileText} label="Files" value={stats.totalFiles} color="#14b8a6" />
      </div>

      {/* Module Coverage */}
      <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold" style={{ color: colors.text }}>Module Coverage</h3>
          <span className="text-2xl font-bold" style={{ color: colors.primary }}>
            {data?.moduleCoverage?.percentage || 0}%
          </span>
        </div>
        <div className="w-full h-3 rounded-full" style={{ backgroundColor: colors.bg }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${data?.moduleCoverage?.percentage || 0}%`,
              backgroundColor: (data?.moduleCoverage?.percentage || 0) > 80 ? '#22c55e' : (data?.moduleCoverage?.percentage || 0) > 50 ? '#f97316' : '#ef4444'
            }}
          />
        </div>
        <p className="text-sm mt-2" style={{ color: colors.textMuted }}>
          {data?.moduleCoverage?.matched || 0} of {data?.moduleCoverage?.total || 0} tables matched to modules
        </p>
      </div>

      {/* Unmatched Tables */}
      {data?.unmatchedTables?.length > 0 && (
        <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5" style={{ color: '#f97316' }} />
            <h3 className="font-semibold" style={{ color: colors.text }}>Unmatched Tables ({data.unmatchedTables.length})</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.unmatchedTables.slice(0, 20).map((name: string, i: number) => (
              <span key={i} className="px-2 py-1 rounded text-sm" style={{ backgroundColor: colors.bg, color: colors.textMuted }}>
                {name}
              </span>
            ))}
            {data.unmatchedTables.length > 20 && (
              <span className="px-2 py-1 rounded text-sm" style={{ color: colors.textMuted }}>
                +{data.unmatchedTables.length - 20} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function TablesTab({ colors, tables, expandedSections, toggleSection }: any) {
  if (tables.length === 0) {
    return (
      <div className="text-center py-12">
        <Table2 className="w-12 h-12 mx-auto mb-4" style={{ color: colors.textMuted }} />
        <p style={{ color: colors.textMuted }}>No tables found. Upload SQL files to parse tables.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold" style={{ color: colors.text }}>{tables.length} Tables</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tables.map((table: any, idx: number) => (
          <div key={idx} className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold" style={{ color: colors.text }}>{table.tableName}</h4>
              <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: colors.bg, color: colors.textMuted }}>
                {table.columns?.length || 0} columns
              </span>
            </div>

            {table.foreignKeys?.length > 0 && (
              <div className="text-xs" style={{ color: colors.textMuted }}>
                FKs: {table.foreignKeys.map((fk: any) => fk.referencedTable || fk.references).filter(Boolean).join(', ')}
              </div>
            )}

            {table.columns?.slice(0, 5).map((col: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm py-1" style={{ color: colors.textMuted }}>
                <span>{col.name || col.columnName}</span>
                <span className="text-xs" style={{ color: colors.textMuted }}>({col.type || col.dataType})</span>
              </div>
            ))}
            {table.columns?.length > 5 && (
              <div className="text-xs mt-1" style={{ color: colors.textMuted }}>
                +{table.columns.length - 5} more columns
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ViewsTab({ colors, views }: any) {
  if (views.length === 0) {
    return (
      <div className="text-center py-12">
        <FileCode className="w-12 h-12 mx-auto mb-4" style={{ color: colors.textMuted }} />
        <p style={{ color: colors.textMuted }}>No CSHTML views found. Upload CSHTML files to parse views.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold" style={{ color: colors.text }}>{views.length} CSHTML Views</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {views.map((view: any, idx: number) => (
          <div key={idx} className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold" style={{ color: colors.text }}>{view.viewName}</h4>
              <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: colors.bg, color: colors.textMuted }}>
                {view.viewType || 'unknown'}
              </span>
            </div>

            {view.fields?.length > 0 && (
              <>
                <div className="text-xs mb-2" style={{ color: colors.textMuted }}>
                  {view.fields.length} fields detected
                </div>
                <div className="flex flex-wrap gap-1">
                  {view.fields.slice(0, 6).map((f: any, i: number) => (
                    <span key={i} className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: colors.bg, color: colors.textMuted }}>
                      {f.name}
                    </span>
                  ))}
                  {view.fields.length > 6 && (
                    <span className="text-xs" style={{ color: colors.textMuted }}>+{view.fields.length - 6}</span>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ProceduresTab({ colors, procedures }: any) {
  if (procedures.length === 0) {
    return (
      <div className="text-center py-12">
        <Code className="w-12 h-12 mx-auto mb-4" style={{ color: colors.textMuted }} />
        <p style={{ color: colors.textMuted }}>No stored procedures found. Upload SQL files with procedures.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold" style={{ color: colors.text }}>{procedures.length} Stored Procedures</h3>

      <div className="space-y-3">
        {procedures.map((sp: any, idx: number) => (
          <div key={idx} className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold font-mono" style={{ color: colors.text }}>{sp.procedureName}</h4>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: colors.bg, color: colors.textMuted }}>
                  {sp.actionType || sp.schemaName || 'dbo'}
                </span>
                <span className="text-xs px-2 py-1 rounded" style={{ 
                  backgroundColor: sp.riskLevel === 'high' ? '#fef2f2' : sp.riskLevel === 'medium' ? '#fffbeb' : colors.bg,
                  color: sp.riskLevel === 'high' ? '#dc2626' : sp.riskLevel === 'medium' ? '#d97706' : colors.textMuted
                }}>
                  {sp.riskLevel || 'low'} risk
                </span>
              </div>
            </div>

            {sp.tablesReferenced?.length > 0 && (
              <div className="text-xs" style={{ color: colors.textMuted }}>
                Tables: {sp.tablesReferenced.join(', ')}
              </div>
            )}

            {sp.parameters?.length > 0 && (
              <div className="text-xs mt-1" style={{ color: colors.textMuted }}>
                Parameters: {sp.parameters.length}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ModulesTab({ colors, data, onLinkModules, isLinking }: any) {
  const modules = data?.modules || []
  const coverage = data?.moduleCoverage || { percentage: 0, matched: 0, total: 0 }

  if (modules.length === 0) {
    return (
      <div className="text-center py-12">
        <GitBranch className="w-12 h-12 mx-auto mb-4" style={{ color: colors.textMuted }} />
        <h3 className="font-semibold mb-2" style={{ color: colors.text }}>No Modules Linked</h3>
        <p className="mb-4" style={{ color: colors.textMuted }}>
          {data?.tables?.length || 0} tables detected but not linked to any modules
        </p>
        <button
          onClick={onLinkModules}
          disabled={isLinking}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white"
          style={{ backgroundColor: '#8b5cf6' }}
        >
          {isLinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
          Link Tables to Modules
        </button>
      </div>
    )
  }

  // Group by layer
  const byLayer = modules.reduce((acc: any, m: any) => {
    const layer = m.layerNumber || 1
    if (!acc[layer]) acc[layer] = []
    acc[layer].push(m)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Coverage Summary */}
      <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold" style={{ color: colors.text }}>Module Coverage</h3>
            <p className="text-sm" style={{ color: colors.textMuted }}>
              {modules.length} modules linked
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold" style={{ color: colors.primary }}>{coverage.percentage}%</div>
            <div className="text-sm" style={{ color: colors.textMuted }}>coverage</div>
          </div>
        </div>
        <div className="w-full h-3 rounded-full" style={{ backgroundColor: colors.bg }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${coverage.percentage}%`,
              backgroundColor: coverage.percentage > 80 ? '#22c55e' : coverage.percentage > 50 ? '#f97316' : '#ef4444'
            }}
          />
        </div>
      </div>

      {/* Modules by Layer */}
      {Object.entries(byLayer).sort(([a], [b]) => Number(a) - Number(b)).map(([layer, layerModules]: [string, any]) => (
        <div key={layer}>
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4" style={{ color: colors.primary }} />
            <h3 className="font-semibold" style={{ color: colors.text }}>Layer {layer}</h3>
            <span className="text-sm" style={{ color: colors.textMuted }}>({layerModules.length} modules)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {layerModules.map((module: any, idx: number) => {
              // Handle both cases: already parsed array or JSON string
              const matchedTables = Array.isArray(module.matchedTables)
                ? module.matchedTables
                : (typeof module.matchedTables === 'string' && module.matchedTables
                    ? (() => { try { return JSON.parse(module.matchedTables) } catch { return [] } })()
                    : [])
              return (
                <div key={idx} className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold" style={{ color: colors.text }}>{module.moduleName}</h4>
                    <span className={`text-xs px-2 py-1 rounded ${
                      module.status === 'complete' ? 'bg-green-100 text-green-700' :
                      module.status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {module.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span style={{ color: colors.textMuted }}>{matchedTables.length} tables</span>
                    <span style={{ color: colors.primary }}>{module.coverage}%</span>
                  </div>
                  {matchedTables.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {matchedTables.slice(0, 3).map((t: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: colors.bg, color: colors.textMuted }}>
                          {t}
                        </span>
                      ))}
                      {matchedTables.length > 3 && (
                        <span className="text-xs" style={{ color: colors.textMuted }}>+{matchedTables.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function FilesTab({ colors, files }: any) {
  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 mx-auto mb-4" style={{ color: colors.textMuted }} />
        <p style={{ color: colors.textMuted }}>No files uploaded yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold" style={{ color: colors.text }}>{files.length} Files Uploaded</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: colors.bg }}>
              <th className="px-4 py-2 text-left" style={{ color: colors.textMuted }}>File Name</th>
              <th className="px-4 py-2 text-left" style={{ color: colors.textMuted }}>Type</th>
              <th className="px-4 py-2 text-left" style={{ color: colors.textMuted }}>Status</th>
              <th className="px-4 py-2 text-left" style={{ color: colors.textMuted }}>Found</th>
              <th className="px-4 py-2 text-left" style={{ color: colors.textMuted }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file: any, idx: number) => (
              <tr key={idx} className="border-t" style={{ borderColor: colors.border }}>
                <td className="px-4 py-2" style={{ color: colors.text }}>{file.fileName || file.filename}</td>
                <td className="px-4 py-2" style={{ color: colors.textMuted }}>{file.fileType}</td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    file.parseStatus === 'parsed' ? 'bg-green-100 text-green-700' :
                    file.parseStatus === 'error' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {file.parseStatus || 'pending'}
                  </span>
                </td>
                <td className="px-4 py-2" style={{ color: colors.textMuted }}>
                  {file.tablesFound || 0} tables, {file.proceduresFound || 0} procs
                </td>
                <td className="px-4 py-2" style={{ color: colors.textMuted }}>
                  {new Date(file.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function StatCard({ colors, icon: Icon, label, value, color }: any) {
  return (
    <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-5 h-5" style={{ color }} />
        <span className="text-sm" style={{ color: colors.textMuted }}>{label}</span>
      </div>
      <div className="text-2xl font-bold" style={{ color: colors.text }}>{value}</div>
    </div>
  )
}
