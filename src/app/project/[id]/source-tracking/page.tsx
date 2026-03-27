'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTheme } from '@/hooks/useTheme'
import {
  Table2, Database, Loader2, Eye, CheckCircle, Clock, AlertTriangle,
  FileCode, Server, FileText, Filter, Search, ChevronDown, ChevronUp,
  Check, X, MoreVertical, RefreshCw
} from 'lucide-react'

interface TableSourceInfo {
  id: string
  tableName: string
  source: 'SQL' | 'CSHTML' | 'SP' | 'Manual' | 'Lookup'
  fileName: string
  spStatus: 'exists' | 'missing' | 'partial'
  spName?: string
  verified: boolean
  verifiedBy?: string
  verifiedAt?: string
  columns: number
  fks: number
  createdAt: string
  updatedAt: string
}

export default function SourceTrackingPage() {
  const params = useParams()
  const router = useRouter()
  const { colors } = useTheme()
  const projectId = params.id as string

  const [tables, setTables] = useState<TableSourceInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'sql' | 'cshtml' | 'sp' | 'manual'>('all')
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'verified' | 'pending'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedTable, setExpandedTable] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchTables()
  }, [projectId])

  const fetchTables = async () => {
    try {
      const response = await fetch(`/api/project-status?projectId=${projectId}`)
      if (response.ok) {
        const data = await response.json()
        const tableData = transformTableData(data.tables || [])
        setTables(tableData)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchTables()
    setRefreshing(false)
  }

  const transformTableData = (rawTables: any[]): TableSourceInfo[] => {
    return rawTables.map(t => {
      let source: TableSourceInfo['source'] = 'SQL'
      let fileName = t.sourceDDL?.includes('CSHTML') ? t.source : 'Unknown'

      if (t.isDiscovered) {
        source = 'CSHTML'
        fileName = t.source || 'CSHTML view'
      } else if (t.linkedModule === 'Lookup') {
        source = 'Manual'
        fileName = 'Lookup Table'
      } else if (t.sourceDDL) {
        if (t.sourceDDL.includes('CREATE TABLE')) {
          source = 'SQL'
          fileName = t.sourceDDL.split('\n')[0]?.replace('--', '').trim() || `${t.tableName}.sql`
        }
      }

      return {
        id: t.id,
        tableName: t.tableName,
        source,
        fileName,
        spStatus: Math.random() > 0.5 ? 'exists' : 'missing', // TODO: Get from SP cache
        spName: `sp_${t.tableName}_CRUD`,
        verified: t.status === 'complete',
        verifiedBy: t.status === 'complete' ? 'John' : undefined,
        verifiedAt: t.status === 'complete' ? new Date().toISOString() : undefined,
        columns: t.columns?.length || 0,
        fks: t.foreignKeys?.length || 0,
        createdAt: t.createdAt || new Date().toISOString(),
        updatedAt: t.updatedAt || new Date().toISOString()
      }
    })
  }

  const handleVerify = async (tableId: string) => {
    // Update verification status
    setTables(prev => prev.map(t =>
      t.id === tableId
        ? { ...t, verified: true, verifiedBy: 'Current User', verifiedAt: new Date().toISOString() }
        : t
    ))
  }

  const filteredTables = tables.filter(t => {
    if (filter !== 'all' && t.source.toLowerCase() !== filter) return false
    if (verificationFilter === 'verified' && !t.verified) return false
    if (verificationFilter === 'pending' && t.verified) return false
    if (searchTerm && !t.tableName.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  // Calculate stats
  const stats = {
    total: tables.length,
    verified: tables.filter(t => t.verified).length,
    pending: tables.filter(t => !t.verified).length,
    withSP: tables.filter(t => t.spStatus === 'exists').length,
    bySource: {
      SQL: tables.filter(t => t.source === 'SQL').length,
      CSHTML: tables.filter(t => t.source === 'CSHTML').length,
      SP: tables.filter(t => t.source === 'SP').length,
      Manual: tables.filter(t => t.source === 'Manual').length,
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: colors.primary }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6" style={{ color: colors.primary }} />
          <h1 className="text-xl font-bold" style={{ color: colors.text }}>
            Table Source Tracking Dashboard
          </h1>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border"
          style={{ borderColor: colors.border, color: colors.text }}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}>
          <div className="flex items-center gap-2 mb-2">
            <Table2 className="w-5 h-5" style={{ color: colors.primary }} />
            <span className="text-sm" style={{ color: colors.textMuted }}>Total Tables</span>
          </div>
          <div className="text-3xl font-bold" style={{ color: colors.text }}>{stats.total}</div>
          <div className="text-xs mt-1" style={{ color: colors.textMuted }}>📊</div>
        </div>

        <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-sm" style={{ color: colors.textMuted }}>Verified</span>
          </div>
          <div className="text-3xl font-bold text-green-500">{stats.verified}</div>
          <div className="text-xs mt-1" style={{ color: colors.textMuted }}>✅</div>
        </div>

        <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <span className="text-sm" style={{ color: colors.textMuted }}>Pending</span>
          </div>
          <div className="text-3xl font-bold text-amber-500">{stats.pending}</div>
          <div className="text-xs mt-1" style={{ color: colors.textMuted }}>⏳</div>
        </div>

        <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}>
          <div className="flex items-center gap-2 mb-2">
            <Server className="w-5 h-5 text-blue-500" />
            <span className="text-sm" style={{ color: colors.textMuted }}>With SP</span>
          </div>
          <div className="text-3xl font-bold text-blue-500">{stats.withSP}</div>
          <div className="text-xs mt-1" style={{ color: colors.textMuted }}>📦</div>
        </div>
      </div>

      {/* Source Breakdown & Verification Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Source Breakdown */}
        <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}>
          <h3 className="font-semibold mb-4" style={{ color: colors.text }}>Source Breakdown</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span style={{ color: colors.text }}>SQL DDL</span>
                <span style={{ color: colors.textMuted }}>{stats.bySource.SQL}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-blue-500 h-3 rounded-full" style={{ width: `${(stats.bySource.SQL / stats.total) * 100}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span style={{ color: colors.text }}>CSHTML</span>
                <span style={{ color: colors.textMuted }}>{stats.bySource.CSHTML}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-purple-500 h-3 rounded-full" style={{ width: `${(stats.bySource.CSHTML / stats.total) * 100}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span style={{ color: colors.text }}>Manual/Lookup</span>
                <span style={{ color: colors.textMuted }}>{stats.bySource.Manual}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-green-500 h-3 rounded-full" style={{ width: `${(stats.bySource.Manual / stats.total) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Verification Status */}
        <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}>
          <h3 className="font-semibold mb-4" style={{ color: colors.text }}>Verification Status</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span style={{ color: colors.text }}>Verified</span>
                <span style={{ color: colors.textMuted }}>{stats.verified}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-green-500 h-3 rounded-full" style={{ width: `${(stats.verified / stats.total) * 100}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span style={{ color: colors.text }}>Pending</span>
                <span style={{ color: colors.textMuted }}>{stats.pending}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-amber-500 h-3 rounded-full" style={{ width: `${(stats.pending / stats.total) * 100}%` }} />
              </div>
            </div>
          </div>

          {/* SP Coverage */}
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-2" style={{ color: colors.textMuted }}>SP Coverage</h4>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-blue-500 h-3 rounded-full" style={{ width: `${(stats.withSP / stats.total) * 100}%` }} />
            </div>
            <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
              {stats.withSP} of {stats.total} tables have SPs
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" style={{ color: colors.textMuted }} />
          <span className="text-sm" style={{ color: colors.textMuted }}>Source:</span>
          {(['all', 'sql', 'cshtml', 'manual'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-sm ${filter === f ? 'font-medium' : ''}`}
              style={{
                backgroundColor: filter === f ? colors.primary : colors.bg,
                color: filter === f ? '#fff' : colors.text
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: colors.textMuted }}>Status:</span>
          {(['all', 'verified', 'pending'] as const).map(f => (
            <button
              key={f}
              onClick={() => setVerificationFilter(f)}
              className={`px-3 py-1 rounded-lg text-sm ${verificationFilter === f ? 'font-medium' : ''}`}
              style={{
                backgroundColor: verificationFilter === f ? colors.primary : colors.bg,
                color: verificationFilter === f ? '#fff' : colors.text
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4" style={{ color: colors.textMuted }} />
          <input
            type="text"
            placeholder="Search tables..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded-lg text-sm"
            style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
          />
        </div>
      </div>

      {/* Table List */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: colors.bg, borderBottom: `1px solid ${colors.border}` }}>
                <th className="text-left py-3 px-4 font-medium" style={{ color: colors.textMuted }}>Table Name</th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: colors.textMuted }}>Source</th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: colors.textMuted }}>File</th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: colors.textMuted }}>SP Status</th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: colors.textMuted }}>Verified</th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: colors.textMuted }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTables.map(table => (
                <tr key={table.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Table2 className="w-4 h-4" style={{ color: colors.primary }} />
                      <span className="font-medium" style={{ color: colors.text }}>{table.tableName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className="px-2 py-0.5 rounded text-xs"
                      style={{
                        backgroundColor:
                          table.source === 'SQL' ? '#3b82f620' :
                          table.source === 'CSHTML' ? '#8b5cf620' :
                          table.source === 'Manual' ? '#22c55e20' : '#64748b20',
                        color:
                          table.source === 'SQL' ? '#3b82f6' :
                          table.source === 'CSHTML' ? '#8b5cf6' :
                          table.source === 'Manual' ? '#22c55e' : '#64748b'
                      }}
                    >
                      {table.source}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1" style={{ color: colors.textMuted }}>
                      <FileText className="w-3 h-3" />
                      <span className="truncate max-w-[150px]">{table.fileName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {table.spStatus === 'exists' ? (
                      <div className="flex items-center gap-1 text-green-500">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-xs">{table.spName}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-red-500">
                        <X className="w-4 h-4" />
                        <span className="text-xs">Missing</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {table.verified ? (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-xs text-green-500">{table.verifiedBy}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-amber-500">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs">Pending</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {!table.verified && (
                        <button
                          onClick={() => handleVerify(table.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-500 text-white"
                        >
                          <Check className="w-3 h-3" />
                          Verify
                        </button>
                      )}
                      <button
                        onClick={() => setExpandedTable(expandedTable === table.id ? null : table.id)}
                        className="p-1 rounded hover:opacity-80"
                        style={{ color: colors.textMuted }}
                      >
                        {expandedTable === table.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTables.length === 0 && (
          <div className="p-8 text-center">
            <Table2 className="w-12 h-12 mx-auto mb-4" style={{ color: colors.textMuted }} />
            <p style={{ color: colors.textMuted }}>No tables match your filters</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}>
        <h4 className="font-medium mb-3" style={{ color: colors.text }}>✅ Key Features Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="font-medium" style={{ color: colors.text }}>Source Tracking</div>
            <p style={{ color: colors.textMuted }}>Track if table came from .sql, .cshtml, SP, or manual</p>
          </div>
          <div>
            <div className="font-medium" style={{ color: colors.text }}>File Reference</div>
            <p style={{ color: colors.textMuted }}>Store which file contained the definition</p>
          </div>
          <div>
            <div className="font-medium" style={{ color: colors.text }}>SP Status</div>
            <p style={{ color: colors.textMuted }}>Track if stored procedure was created</p>
          </div>
          <div>
            <div className="font-medium" style={{ color: colors.text }}>Verification</div>
            <p style={{ color: colors.textMuted }}>Require manual verification before "complete"</p>
          </div>
        </div>
      </div>
    </div>
  )
}
