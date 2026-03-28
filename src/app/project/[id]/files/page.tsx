'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileCode, CheckCircle, AlertTriangle, Clock, Loader2, Trash2, Download, Eye,
  ArrowLeft, Upload, Database, Code, FileText, Key, Brain, GitBranch, Layers,
  Table2, Settings, RefreshCw, Search, Filter, FileArchive, Edit3, X, ChevronRight,
  MoreVertical, Zap, FolderSync, FormInput, List, File, Layout
} from 'lucide-react'

interface ProjectFile {
  id: string
  fileName: string
  filePath: string | null
  fileType: string
  fileSize: number
  lineCount: number
  parseStatus: 'pending' | 'parsed' | 'error'
  parseError: string | null
  tablesFound: number | null
  proceduresFound: number | null
  complexity: number | null
  createdAt: string
  updatedAt: string
  parsedAt: string | null
}

interface CSHTMLView {
  id: string
  viewName: string
  viewType: string
  modelName?: string
  linkedTable?: string
  fields?: any[]
  title?: string
}

interface ProjectStats {
  project: {
    id: string
    name: string
    softwareType: string
    status: string
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
  fileStatus: {
    total: number
    parsed: number
    pending: number
    error: number
  }
  cshtmlViews: CSHTMLView[]
}

export default function ProjectFilesPage() {
  const params = useParams()
  const router = useRouter()
  const { colors } = useTheme()
  const projectId = params.id as string

  const [files, setFiles] = useState<ProjectFile[]>([])
  const [stats, setStats] = useState<ProjectStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null)
  const [selectedView, setSelectedView] = useState<CSHTMLView | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [projectId])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch files
      const filesRes = await fetch(`/api/projects/files?projectId=${projectId}`)
      if (filesRes.ok) {
        const data = await filesRes.json()
        setFiles(data.files || [])
      }
      
      // Fetch project stats
      const statsRes = await fetch(`/api/project-status?projectId=${projectId}`)
      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return
    try {
      const response = await fetch(`/api/projects/files?fileId=${fileId}`, { method: 'DELETE' })
      if (response.ok) {
        setFiles(files.filter(f => f.id !== fileId))
        setSelectedItems(new Set([...selectedItems].filter(id => id !== fileId)))
      }
    } catch (error) {
      console.error('Error deleting file:', error)
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedItems.size === 0) return
    if (!confirm(`Delete ${selectedItems.size} selected files?`)) return
    
    try {
      await Promise.all([...selectedItems].map(fileId =>
        fetch(`/api/projects/files?fileId=${fileId}`, { method: 'DELETE' })
      ))
      setFiles(files.filter(f => !selectedItems.has(f.id)))
      setSelectedItems(new Set())
    } catch (error) {
      console.error('Error deleting files:', error)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return
    
    setIsUploading(true)
    const formData = new FormData()
    formData.append('projectId', projectId)
    
    for (let i = 0; i < fileList.length; i++) {
      formData.append('files', fileList[i])
    }
    
    try {
      const response = await fetch('/api/projects/files', {
        method: 'POST',
        body: formData
      })
      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Error uploading files:', error)
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  const handleReparse = async (fileId?: string) => {
    try {
      // Reset parse status for file(s)
      if (fileId) {
        await fetch('/api/projects/files', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: fileId, parseStatus: 'pending' })
        })
      } else {
        // Reparse all selected
        await Promise.all([...selectedItems].map(id =>
          fetch('/api/projects/files', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, parseStatus: 'pending' })
          })
        ))
      }
      
      // Trigger reparse
      await fetch('/api/parsers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reparse-project', projectId })
      })
      
      fetchData()
    } catch (error) {
      console.error('Error reparsing:', error)
    }
  }

  // Filter and sort files
  const filteredFiles = files.filter(file => {
    if (searchQuery && !file.fileName.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (filterType !== 'all' && file.fileType !== filterType) return false
    if (filterStatus !== 'all' && file.parseStatus !== filterStatus) return false
    return true
  })

  const toggleSelect = (fileId: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(fileId)) newSelected.delete(fileId)
    else newSelected.add(fileId)
    setSelectedItems(newSelected)
  }

  const selectAll = () => {
    if (selectedItems.size === filteredFiles.length) setSelectedItems(new Set())
    else setSelectedItems(new Set(filteredFiles.map(f => f.id)))
  }

  // Helper functions
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'parsed': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />
      default: return <Clock className="w-4 h-4 text-yellow-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'parsed': return colors.success
      case 'error': return colors.error
      default: return '#f59e0b'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'sql': case 'sql_ddl': return '#3b82f6'
      case 'sql_sp': return '#8b5cf6'
      case 'sql_view': return '#06b6d4'
      case 'cshtml': return '#f97316'
      case 'aspx': return '#ec4899'
      case 'cs': return '#512bd4'
      default: return '#6b7280'
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const alpha = (color: string, opacity: number) =>
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  // Calculate counts based on file types
  const fileCounts = {
    sqlFiles: files.filter(f => f.fileType?.includes('sql')).length,
    cshtmlFiles: files.filter(f => f.fileType === 'cshtml').length,
    totalFields: stats?.cshtmlViews?.reduce((sum, v) => sum + (v.fields?.length || 0), 0) || 0,
    totalModels: [...new Set(stats?.cshtmlViews?.map(v => v.modelName).filter(Boolean))].length,
  }

  // Stat cards
  const statCards = [
    { label: 'Files', value: stats?.counts.files || files.length, icon: FileCode, color: '#3b82f6' },
    { label: 'SQL Tables', value: stats?.counts.tables || 0, icon: Table2, color: '#22c55e', route: 'tables' },
    { label: 'Procedures', value: stats?.counts.procedures || 0, icon: Code, color: '#8b5cf6', route: 'procedures' },
    { label: 'CSHTML Views', value: stats?.counts.cshtmlViews || 0, icon: FileText, color: '#f97316', route: 'views' },
    { label: 'Form Fields', value: fileCounts.totalFields, icon: FormInput, color: '#ec4899' },
    { label: 'Models', value: fileCounts.totalModels, icon: Database, color: '#06b6d4' },
    { label: 'Discovered', value: stats?.counts.discoveredTables || 0, icon: GitBranch, color: '#14b8a6', route: 'fk-resolution' },
    { label: 'Settings', value: 0, icon: Settings, color: '#6b7280', route: 'settings' },
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: colors.bg }}>
      {/* Header */}
      <div className="sticky top-0 z-10 border-b" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/project/${projectId}`)}
              style={{ color: colors.textMuted }}
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <FolderSync className="w-6 h-6" style={{ color: colors.primary }} />
            <div>
              <h1 className="text-xl font-bold" style={{ color: colors.text }}>
                {stats?.project?.name || 'Project'} - Files
              </h1>
              <p className="text-sm" style={{ color: colors.textMuted }}>
                Manage files and view parsed intelligence
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {statCards.map((stat) => {
            const Icon = stat.icon
            return (
              <button
                key={stat.label}
                onClick={() => stat.route && router.push(`/project/${projectId}/${stat.route}`)}
                className="p-3 rounded-xl border text-left transition-colors hover:opacity-80"
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
                disabled={!stat.route || stat.value === 0}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4" style={{ color: stat.color }} />
                  <span className="text-xs" style={{ color: colors.textMuted }}>{stat.label}</span>
                </div>
                <div className="text-xl font-bold" style={{ color: colors.text }}>{stat.value}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Parsing Status Summary */}
      {stats?.fileStatus && (
        <div className="px-6 mb-4">
          <div className="flex items-center gap-4 p-3 rounded-lg" style={{ backgroundColor: alpha(colors.bgSecondary, 30) }}>
            <span className="text-sm" style={{ color: colors.textMuted }}>Status:</span>
            <div className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-green-500">{stats.fileStatus.parsed} parsed</span>
            </div>
            {stats.fileStatus.pending > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium text-yellow-500">{stats.fileStatus.pending} pending</span>
              </div>
            )}
            {stats.fileStatus.error > 0 && (
              <div className="flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-red-500">{stats.fileStatus.error} errors</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Parsed Views Section */}
      {stats?.cshtmlViews && stats.cshtmlViews.length > 0 && (
        <div className="px-6 mb-4">
          <h3 className="font-semibold mb-3" style={{ color: colors.text }}>Parsed CSHTML Views</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.cshtmlViews.map((view) => (
              <div
                key={view.id}
                className="p-4 rounded-xl border cursor-pointer hover:opacity-80 transition-opacity"
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
                onClick={() => setSelectedView(view)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Layout className="w-4 h-4" style={{ color: '#f97316' }} />
                    <span className="font-medium" style={{ color: colors.text }}>{view.viewName}</span>
                  </div>
                  <Badge className="text-xs" style={{ backgroundColor: alpha('#f97316', 15), color: '#f97316' }}>
                    {view.viewType}
                  </Badge>
                </div>
                {view.modelName && (
                  <div className="text-sm mb-2" style={{ color: colors.textMuted }}>
                    Model: <span style={{ color: colors.primary }}>{view.modelName}</span>
                  </div>
                )}
                {view.fields && (Array.isArray(view.fields) ? view.fields : JSON.parse(view.fields)).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {(Array.isArray(view.fields) ? view.fields : JSON.parse(view.fields)).slice(0, 5).map((field: any, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {field.name}
                      </Badge>
                    ))}
                    {(Array.isArray(view.fields) ? view.fields : JSON.parse(view.fields)).length > 5 && (
                      <Badge variant="outline" className="text-xs">+{(Array.isArray(view.fields) ? view.fields : JSON.parse(view.fields)).length - 5} more</Badge>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="px-6 mb-4">
        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: alpha(colors.card, 50), border: `1px solid ${colors.border}` }}>
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.textMuted }} />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 rounded-lg text-sm w-full"
              style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, color: colors.text }}
            />
          </div>

          {/* Filters */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm"
            style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, color: colors.text }}
          >
            <option value="all">All Types</option>
            <option value="sql">SQL</option>
            <option value="sql_ddl">SQL DDL</option>
            <option value="sql_sp">Stored Procs</option>
            <option value="sql_view">Views</option>
            <option value="cshtml">CSHTML</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm"
            style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, color: colors.text }}
          >
            <option value="all">All Status</option>
            <option value="parsed">Parsed</option>
            <option value="pending">Pending</option>
            <option value="error">Error</option>
          </select>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-auto">
            <input type="file" multiple id="file-upload" onChange={handleUpload} style={{ display: 'none' }} accept=".sql,.cshtml,.vbhtml,.cs,.js,.ts,.json,.xml,.aspx" />
            <Button
              size="sm"
              onClick={() => document.getElementById('file-upload')?.click()}
              disabled={isUploading}
              style={{ backgroundColor: colors.primary, color: '#fff' }}
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
              Upload
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchData}
              style={{ borderColor: colors.border, color: colors.textMuted }}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Selection Actions */}
      {selectedItems.size > 0 && (
        <div className="px-6 mb-4">
          <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: alpha(colors.primary, 10), border: `1px solid ${alpha(colors.primary, 30)}` }}>
            <span style={{ color: colors.text }}><strong>{selectedItems.size}</strong> files selected</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => handleReparse()} style={{ borderColor: colors.border, color: colors.textMuted }}>
                <Zap className="w-4 h-4 mr-1" /> Reparse
              </Button>
              <Button size="sm" onClick={handleDeleteSelected} style={{ backgroundColor: colors.error, color: '#fff' }}>
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* File List */}
      <div className="flex-1 px-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-12">
            <FileCode className="w-12 h-12 mx-auto mb-4" style={{ color: colors.textMuted }} />
            <p style={{ color: colors.textMuted }}>
              {searchQuery || filterType !== 'all' || filterStatus !== 'all'
                ? 'No matching files'
                : 'No files uploaded yet'}
            </p>
            <Button
              className="mt-4"
              onClick={() => document.getElementById('file-upload')?.click()}
              style={{ backgroundColor: colors.primary, color: '#fff' }}
            >
              <Upload className="w-4 h-4 mr-2" /> Upload Files
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 p-3 text-xs font-semibold uppercase border-b" style={{ backgroundColor: alpha(colors.bgSecondary, 50), color: colors.textMuted, borderColor: colors.border }}>
              <div className="col-span-1 flex items-center">
                <button onClick={selectAll} className="p-1 rounded hover:bg-white/10">
                  {selectedItems.size === filteredFiles.length && filteredFiles.length > 0 ? (
                    <CheckCircle className="w-4 h-4" style={{ color: colors.primary }} />
                  ) : (
                    <div className="w-4 h-4 border rounded" style={{ borderColor: colors.border }} />
                  )}
                </button>
              </div>
              <div className="col-span-4">Name</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-1 text-center">Status</div>
              <div className="col-span-1 text-center">Fields</div>
              <div className="col-span-1 text-center">Lines</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* Rows */}
            <div className="max-h-[500px] overflow-auto">
              {filteredFiles.map((file) => {
                const view = stats?.cshtmlViews?.find(v => 
                  v.viewName?.toLowerCase().includes(file.fileName.toLowerCase().replace('.cshtml', ''))
                )
                
                return (
                  <div
                    key={file.id}
                    className="grid grid-cols-12 gap-2 p-3 items-center border-b hover:bg-white/5 cursor-pointer transition-colors"
                    style={{
                      borderColor: colors.border,
                      backgroundColor: selectedItems.has(file.id) ? alpha(colors.primary, 5) : 'transparent'
                    }}
                    onClick={() => setSelectedFile(file)}
                  >
                    <div className="col-span-1 flex items-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSelect(file.id) }}
                        className="p-1 rounded hover:bg-white/10"
                      >
                        {selectedItems.has(file.id) ? (
                          <CheckCircle className="w-4 h-4" style={{ color: colors.primary }} />
                        ) : (
                          <div className="w-4 h-4 border rounded" style={{ borderColor: colors.border }} />
                        )}
                      </button>
                    </div>
                    <div className="col-span-4 flex items-center gap-2">
                      {getStatusIcon(file.parseStatus)}
                      <span className="truncate font-medium" style={{ color: colors.text }}>{file.fileName}</span>
                    </div>
                    <div className="col-span-2">
                      <Badge className="text-xs" style={{ backgroundColor: alpha(getTypeColor(file.fileType), 15), color: getTypeColor(file.fileType) }}>
                        {file.fileType.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="col-span-1 text-center">
                      <Badge
                        className="text-xs"
                        style={{ backgroundColor: alpha(getStatusColor(file.parseStatus), 15), color: getStatusColor(file.parseStatus) }}
                      >
                        {file.parseStatus}
                      </Badge>
                    </div>
                    <div className="col-span-1 text-center text-sm" style={{ color: colors.textMuted }}>
                      {view?.fields?.length || file.tablesFound || '-'}
                    </div>
                    <div className="col-span-1 text-center text-sm" style={{ color: colors.textMuted }}>
                      {file.lineCount || '-'}
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleReparse(file.id) }}
                        className="p-1.5 rounded hover:bg-white/10"
                        title="Reparse"
                      >
                        <Zap className="w-4 h-4" style={{ color: '#f59e0b' }} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(file.id) }}
                        className="p-1.5 rounded hover:bg-white/10"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" style={{ color: colors.error }} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* File Detail Modal */}
      {selectedFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setSelectedFile(null)}
        >
          <div
            className="w-full max-w-4xl max-h-[85vh] rounded-xl overflow-hidden flex flex-col"
            style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: colors.border }}>
              <div className="flex items-center gap-3">
                {getStatusIcon(selectedFile.parseStatus)}
                <div>
                  <h3 className="font-semibold" style={{ color: colors.text }}>{selectedFile.fileName}</h3>
                  <div className="flex items-center gap-3 text-sm" style={{ color: colors.textMuted }}>
                    <span>{selectedFile.fileType.toUpperCase()}</span>
                    <span>{formatSize(selectedFile.fileSize)}</span>
                    <span>{selectedFile.lineCount} lines</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge style={{ backgroundColor: alpha(getStatusColor(selectedFile.parseStatus), 15), color: getStatusColor(selectedFile.parseStatus) }}>
                  {selectedFile.parseStatus}
                </Badge>
                <button onClick={() => setSelectedFile(null)} className="p-1 hover:bg-white/10 rounded">
                  <X className="w-5 h-5" style={{ color: colors.textMuted }} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="p-3 rounded-lg" style={{ backgroundColor: alpha(colors.bgSecondary, 30) }}>
                  <div className="text-sm" style={{ color: colors.textMuted }}>Tables Found</div>
                  <div className="text-xl font-bold" style={{ color: colors.text }}>{selectedFile.tablesFound || 0}</div>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: alpha(colors.bgSecondary, 30) }}>
                  <div className="text-sm" style={{ color: colors.textMuted }}>Procedures</div>
                  <div className="text-xl font-bold" style={{ color: colors.text }}>{selectedFile.proceduresFound || 0}</div>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: alpha(colors.bgSecondary, 30) }}>
                  <div className="text-sm" style={{ color: colors.textMuted }}>Complexity</div>
                  <div className="text-xl font-bold" style={{ color: colors.text }}>{selectedFile.complexity || '-'}</div>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: alpha(colors.bgSecondary, 30) }}>
                  <div className="text-sm" style={{ color: colors.textMuted }}>Parsed</div>
                  <div className="text-xl font-bold" style={{ color: colors.text }}>
                    {selectedFile.parsedAt ? new Date(selectedFile.parsedAt).toLocaleDateString() : '-'}
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div className="text-sm space-y-1" style={{ color: colors.textMuted }}>
                <p><strong>Path:</strong> {selectedFile.filePath || 'N/A'}</p>
                <p><strong>Created:</strong> {new Date(selectedFile.createdAt).toLocaleString()}</p>
                <p><strong>Updated:</strong> {new Date(selectedFile.updatedAt).toLocaleString()}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 p-4 border-t" style={{ borderColor: colors.border }}>
              <Button variant="outline" onClick={() => handleReparse(selectedFile.id)} style={{ borderColor: colors.border, color: colors.textMuted }}>
                <Zap className="w-4 h-4 mr-1" /> Reparse
              </Button>
              <Button onClick={() => router.push(`/project/${projectId}/intelligence`)} style={{ backgroundColor: colors.primary, color: '#fff' }}>
                <Brain className="w-4 h-4 mr-1" /> View Intelligence
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CSHTML View Detail Modal */}
      {selectedView && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setSelectedView(null)}
        >
          <div
            className="w-full max-w-4xl max-h-[85vh] rounded-xl overflow-hidden flex flex-col"
            style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: colors.border }}>
              <div className="flex items-center gap-3">
                <Layout className="w-5 h-5" style={{ color: '#f97316' }} />
                <div>
                  <h3 className="font-semibold" style={{ color: colors.text }}>{selectedView.viewName}</h3>
                  <div className="flex items-center gap-3 text-sm" style={{ color: colors.textMuted }}>
                    <span>{selectedView.viewType}</span>
                    {selectedView.modelName && <span>Model: {selectedView.modelName}</span>}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedView(null)} className="p-1 hover:bg-white/10 rounded">
                <X className="w-5 h-5" style={{ color: colors.textMuted }} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
              {/* Fields */}
              {selectedView.fields && selectedView.fields.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium mb-3" style={{ color: colors.text }}>Form Fields ({selectedView.fields.length})</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {selectedView.fields.map((field: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border"
                        style={{ backgroundColor: alpha(colors.bgSecondary, 30), borderColor: colors.border }}
                      >
                        <div className="font-medium" style={{ color: colors.text }}>{field.name}</div>
                        <div className="text-xs" style={{ color: colors.textMuted }}>
                          {field.type || field.inputType || 'text'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Linked Table */}
              {selectedView.linkedTable && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2" style={{ color: colors.text }}>Linked Table</h4>
                  <Badge style={{ backgroundColor: alpha(colors.success, 15), color: colors.success }}>
                    {selectedView.linkedTable}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
