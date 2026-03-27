'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { useSchema } from '@/hooks/useSchema'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Upload,
  FileCode,
  Database,
  Brain,
  Target,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  Sparkles,
  Layers,
  Table2,
  Columns3,
  Link2,
  Play,
  RefreshCw,
  X,
  Lightbulb,
  FileText,
  Puzzle,
  Wand2,
  FileJson,
  Code2,
  FileType,
  FolderOpen,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Cpu,
  Search,
  Shield,
  Activity,
  FolderKanban
} from 'lucide-react'

interface UniversalUploadTabProps {
  onNavigate?: (tab: string) => void
}

type ProcessingPhase = 'upload' | 'classifying' | 'parsing' | 'complete'

// File classification result from API
interface FileClassification {
  fileName: string
  fileType: string
  language: string
  framework: string
  confidence: number
  indicators: string[]
  suggestedParser: string
  metadata: {
    size: number
    lineCount: number
    estimatedComplexity: 'low' | 'medium' | 'high'
  }
}

// Parsed intelligence result
interface ParsedIntelligence {
  fileName: string
  fileType: string
  intelligence: Record<string, unknown>
}

// Statistics
interface ProcessStats {
  totalFiles: number
  ajaxCalls: number
  eventHandlers: number
  storedProcedures: number
  tables: number
  endpoints: number
}

// File type icons and colors
const FILE_TYPE_CONFIG: Record<string, { color: string; label: string }> = {
  'razor_view': { color: '#9333ea', label: 'Razor View' },
  'sql_ddl': { color: '#059669', label: 'SQL DDL' },
  'sql_sp': { color: '#0891b2', label: 'Stored Procedure' },
  'sql_view': { color: '#0d9488', label: 'SQL View' },
  'sql_function': { color: '#14b8a6', label: 'SQL Function' },
  'sql_mixed': { color: '#06b6d4', label: 'SQL Mixed' },
  'javascript': { color: '#eab308', label: 'JavaScript' },
  'typescript': { color: '#3b82f6', label: 'TypeScript' },
  'controller': { color: '#dc2626', label: 'Controller' },
  'service': { color: '#7c3aed', label: 'Service' },
  'model': { color: '#2563eb', label: 'Model' },
  'html': { color: '#f97316', label: 'HTML' },
  'json': { color: '#64748b', label: 'JSON' },
  'config': { color: '#6b7280', label: 'Config' },
  'unknown': { color: '#94a3b8', label: 'Unknown' }
}

const getFileTypeIcon = (type: string): typeof FileCode => {
  const icons: Record<string, typeof FileCode> = {
    'razor_view': FileCode,
    'sql_ddl': Database,
    'sql_sp': Database,
    'sql_view': Database,
    'sql_function': Database,
    'sql_mixed': Database,
    'javascript': Code2,
    'typescript': Code2,
    'controller': Cpu,
    'service': Puzzle,
    'model': FileJson,
    'html': FileType,
    'json': FileJson,
    'config': FileJson,
    'unknown': FileText
  }
  return icons[type] || FileText
}

export function UniversalUploadTab({ onNavigate }: UniversalUploadTabProps) {
  const { colors } = useTheme()
  const { setParseResult, setSqlInput, activeProject } = useSchema()

  // State
  const [phase, setPhase] = useState<ProcessingPhase>('upload')
  const [files, setFiles] = useState<File[]>([])
  const [classifications, setClassifications] = useState<FileClassification[]>([])
  const [parsedResults, setParsedResults] = useState<ParsedIntelligence[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    classification: true,
    sql: true,
    js: true,
    sp: true,
    cshtml: true
  })
  const [processProgress, setProcessProgress] = useState(0)
  const [processStatus, setProcessStatus] = useState('')
  const [stats, setStats] = useState<ProcessStats>({
    totalFiles: 0,
    ajaxCalls: 0,
    eventHandlers: 0,
    storedProcedures: 0,
    tables: 0,
    endpoints: 0
  })

  // Handle file upload
  const handleFileUpload = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    const fileArray = Array.from(fileList)
    setFiles(prev => [...prev, ...fileArray])
  }, [])

  // Remove file
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Clear all
  const clearAll = () => {
    setFiles([])
    setClassifications([])
    setParsedResults([])
    setPhase('upload')
    setProcessProgress(0)
    setProcessStatus('')
    setStats({
      totalFiles: 0,
      ajaxCalls: 0,
      eventHandlers: 0,
      storedProcedures: 0,
      tables: 0,
      endpoints: 0
    })
  }

  // Toggle section
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Process all files
  const processFiles = useCallback(async () => {
    if (files.length === 0) return

    setIsProcessing(true)
    setPhase('classifying')
    setProcessProgress(10)
    setProcessStatus('Reading files...')

    try {
      // Step 1: Read all files
      const fileContents = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          content: await file.text(),
          path: file.webkitRelativePath || file.name
        }))
      )

      setProcessProgress(20)
      setProcessStatus('Classifying files...')

      // Step 2: Classify files via API
      const classifyResponse = await fetch('/api/parsers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'classify-files',
          files: fileContents
        })
      })

      const classifyData = await classifyResponse.json()

      if (!classifyData.success) {
        throw new Error('Classification failed')
      }

      setClassifications(classifyData.classifications)
      setProcessProgress(40)
      setPhase('parsing')
      setProcessStatus('Parsing files with specialized parsers...')

      // Step 3: Parse all files
      const parseResponse = await fetch('/api/parsers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'parse-all',
          files: fileContents
        })
      })

      const parseData = await parseResponse.json()

      if (!parseData.success) {
        throw new Error('Parsing failed')
      }

      setProcessProgress(80)
      setProcessStatus('Processing results...')

      // Step 4: Process results
      const results: ParsedIntelligence[] = []

      // Process SQL results
      if (parseData.sql?.results) {
        for (const sp of parseData.sql.results) {
          results.push({
            fileName: sp.procedureName || 'SQL',
            fileType: 'sql_sp',
            intelligence: sp
          })
        }
      }

      // Process JS results
      if (parseData.javascript?.results) {
        for (const js of parseData.javascript.results) {
          results.push({
            fileName: js.fileName,
            fileType: 'javascript',
            intelligence: js.analysis
          })
        }
      }

      // Process CSHTML results
      if (parseData.cshtml?.results) {
        for (const cs of parseData.cshtml.results) {
          results.push({
            fileName: cs.viewName || cs.rawContent?.split('\n')[0]?.substring(0, 50) || 'Unknown',
            fileType: 'razor_view',
            intelligence: cs  // The parsed CSHTML object is the intelligence
          })
        }
      }

      setParsedResults(results)

      // Update global parse result for SQL tables
      const parsedTables: any[] = []
      const parsedStoredProcedures: any[] = []
      
      // Extract tables from SQL results
      if (parseData.sql?.results) {
        for (const sqlResult of parseData.sql.results) {
          if (sqlResult.tables) {
            for (const table of sqlResult.tables) {
              parsedTables.push({
                schemaName: table.schema || 'dbo',
                tableName: table.name,
                columns: (table.columns || []).map((col: any) => ({
                  name: col.name,
                  dataType: col.dataType || 'NVARCHAR',
                  maxLength: col.maxLength,
                  nullable: col.nullable !== false,
                  isPrimaryKey: col.isPrimaryKey || false,
                  isIdentity: col.isIdentity || false,
                  defaultValue: col.defaultValue
                })),
                foreignKeys: (table.foreignKeys || []).map((fk: any) => ({
                  constraintName: fk.name,
                  columnName: fk.column,
                  referencesTable: fk.referencedTable,
                  referencesColumn: fk.referencedColumn
                })),
                sourceDDL: table.ddl || ''
              })
            }
          }
          if (sqlResult.procedureName) {
            parsedStoredProcedures.push(sqlResult)
          }
        }
      }

      // Also extract tables from CSHTML linked models
      if (parseData.cshtml?.results) {
        for (const cs of parseData.cshtml.results) {
          if (cs.model?.linkedTable && cs.fields) {
            // Create a table from CSHTML fields if not already present
            const tableName = cs.model.linkedTable
            if (!parsedTables.some(t => t.tableName.toLowerCase() === tableName.toLowerCase())) {
              parsedTables.push({
                schemaName: 'dbo',
                tableName: tableName,
                columns: cs.fields.map((field: any) => ({
                  name: field.name,
                  dataType: 'NVARCHAR', // Default type, would need SQL for actual type
                  maxLength: field.validation?.find((v: any) => v.type === 'max_length')?.value?.toString(),
                  nullable: !field.isRequired,
                  isPrimaryKey: field.name.toLowerCase() === 'id',
                  isIdentity: field.name.toLowerCase() === 'id',
                  defaultValue: field.defaultValue
                })),
                foreignKeys: [],
                sourceDDL: `-- Inferred from CSHTML view: ${cs.viewName}`
              })
            }
          }
        }
      }

      // Update global state with parsed tables
      if (parsedTables.length > 0 || parsedStoredProcedures.length > 0) {
        setParseResult({
          tables: parsedTables,
          storedProcedures: parsedStoredProcedures,
          errors: [],
          warnings: [],
          stats: {
            totalTables: parsedTables.length,
            totalColumns: parsedTables.reduce((sum, t) => sum + t.columns.length, 0),
            totalForeignKeys: parsedTables.reduce((sum, t) => sum + t.foreignKeys.length, 0),
            totalStoredProcedures: parsedStoredProcedures.length,
            parseTimeMs: 0
          }
        })
      }

      // Update SQL schema if tables were found
      if (parseData.sql?.summary?.totalTables > 0) {
        const sqlContent = fileContents
          .filter((_, i) => classifications[i]?.fileType?.startsWith('sql'))
          .map(f => f.content)
          .join('\n\n')
        
        if (sqlContent) {
          setSqlInput(sqlContent)
        }
      }

      setStats({
        totalFiles: files.length,
        ajaxCalls: parseData.javascript?.summary?.totalAjaxCalls || 0,
        eventHandlers: parseData.javascript?.summary?.totalEventHandlers || 0,
        storedProcedures: parseData.sql?.summary?.totalProcedures || 0,
        tables: parseData.sql?.summary?.totalTables || 0,
        endpoints: parseData.javascript?.summary?.totalEndpoints || 0
      })

      setProcessProgress(100)
      setProcessStatus('Complete!')
      setPhase('complete')
    } catch (error) {
      console.error('Processing error:', error)
      setProcessStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsProcessing(false)
    }
  }, [files, classifications, setSqlInput, setParseResult])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: colors.text }}>
            Universal Upload & Intelligence
          </h2>
          <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
            Upload any file - SQL, CSHTML, JavaScript, TypeScript, C# - and extract intelligence automatically
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Active Project Indicator */}
          {activeProject ? (
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer"
              style={{
                backgroundColor: `color-mix(in srgb, ${activeProject.color} 10%, transparent)`,
                borderColor: `color-mix(in srgb, ${activeProject.color} 30%, transparent)`
              }}
              onClick={() => onNavigate?.('projects')}
            >
              <FolderKanban className="w-4 h-4" style={{ color: activeProject.color }} />
              <span className="text-sm font-medium" style={{ color: activeProject.color }}>
                {activeProject.name}
              </span>
            </div>
          ) : (
            <button
              onClick={() => onNavigate?.('projects')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
              style={{
                borderColor: colors.warning,
                color: colors.warning
              }}
            >
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">Select Project</span>
            </button>
          )}
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-lg"
            style={{
              backgroundColor: `color-mix(in srgb, ${colors.primary} 10%, transparent)`,
            }}
          >
            <Brain className="w-5 h-5" style={{ color: colors.primary }} />
            <span className="text-sm font-medium" style={{ color: colors.primary }}>
              Multi-Parser Intelligence
            </span>
          </div>
        </div>
      </div>

      {/* No Project Warning */}
      {!activeProject && (
        <div
          className="p-4 rounded-xl border"
          style={{
            backgroundColor: `color-mix(in srgb, ${colors.warning} 10%, transparent)`,
            borderColor: `color-mix(in srgb, ${colors.warning} 30%, transparent)`
          }}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" style={{ color: colors.warning }} />
            <div>
              <p className="font-medium" style={{ color: colors.text }}>
                No Project Selected
              </p>
              <p className="text-sm" style={{ color: colors.textMuted }}>
                Select a project to save your uploads, or files will be stored in temporary session memory.
              </p>
            </div>
            <button
              onClick={() => onNavigate?.('projects')}
              className="ml-auto px-4 py-2 rounded-lg font-medium"
              style={{ backgroundColor: colors.warning, color: '#fff' }}
            >
              Select Project
            </button>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {isProcessing && (
        <div
          className="p-4 rounded-xl border"
          style={{
            backgroundColor: colors.card,
            borderColor: `color-mix(in srgb, ${colors.border} 50%, transparent)`
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 animate-spin" style={{ color: colors.primary }} />
              <span className="font-medium" style={{ color: colors.text }}>{processStatus}</span>
            </div>
            <span className="text-sm" style={{ color: colors.textMuted }}>{processProgress}%</span>
          </div>
          <Progress value={processProgress} className="h-2" />
        </div>
      )}

      {/* Main Upload Area */}
      {phase === 'upload' && (
        <div
          className={`
            border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all
            ${dragOver ? 'scale-[1.02]' : ''}
          `}
          style={{
            borderColor: dragOver ? colors.primary : `color-mix(in srgb, ${colors.border} 50%, transparent)`,
            backgroundColor: dragOver
              ? `color-mix(in srgb, ${colors.primary} 5%, transparent)`
              : colors.card
          }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            handleFileUpload(e.dataTransfer.files)
          }}
          onClick={() => document.getElementById('universal-file-input')?.click()}
        >
          <input
            id="universal-file-input"
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />

          <div className="flex flex-col items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: `color-mix(in srgb, ${colors.primary} 15%, transparent)` }}
            >
              <Upload className="w-8 h-8" style={{ color: colors.primary }} />
            </div>
            <div>
              <h3 className="text-lg font-semibold" style={{ color: colors.text }}>
                Drop Files Here
              </h3>
              <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                or click to browse • Supports SQL, CSHTML, JS, TS, C# files
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {Object.entries(FILE_TYPE_CONFIG).slice(0, 8).map(([type, config]) => (
                <span
                  key={type}
                  className="px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${config.color} 15%, transparent)`,
                    color: config.color
                  }}
                >
                  {config.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Files List */}
      {files.length > 0 && phase === 'upload' && (
        <div
          className="rounded-xl border"
          style={{
            backgroundColor: colors.card,
            borderColor: `color-mix(in srgb, ${colors.border} 50%, transparent)`
          }}
        >
          <div
            className="flex items-center justify-between p-4 border-b"
            style={{ borderColor: `color-mix(in srgb, ${colors.border} 30%, transparent)` }}
          >
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5" style={{ color: colors.primary }} />
              <span className="font-medium" style={{ color: colors.text }}>
                {files.length} file(s) selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearAll}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm"
                style={{ color: colors.textMuted }}
              >
                <X className="w-4 h-4" />
                Clear All
              </button>
              <button
                onClick={processFiles}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: colors.primary,
                  color: '#fff'
                }}
              >
                <Play className="w-4 h-4" />
                Process Files
              </button>
            </div>
          </div>

          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
            {files.map((file, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded-lg"
                style={{ backgroundColor: `color-mix(in srgb, ${colors.border} 10%, transparent)` }}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText className="w-4 h-4 shrink-0" style={{ color: colors.textMuted }} />
                  <span className="text-sm truncate" style={{ color: colors.text }}>{file.name}</span>
                  <span className="text-xs shrink-0" style={{ color: colors.textMuted }}>
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  onClick={() => removeFile(i)}
                  className="p-1 rounded hover:bg-opacity-50 shrink-0"
                  style={{ color: colors.textMuted }}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Classification Results */}
      {classifications.length > 0 && (
        <div
          className="rounded-xl border"
          style={{
            backgroundColor: colors.card,
            borderColor: `color-mix(in srgb, ${colors.border} 50%, transparent)`
          }}
        >
          <button
            onClick={() => toggleSection('classification')}
            className="w-full flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-2">
              {expandedSections.classification ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <Target className="w-5 h-5" style={{ color: colors.accent }} />
              <span className="font-medium" style={{ color: colors.text }}>File Classification</span>
            </div>
            <Badge variant="outline">{classifications.length} files</Badge>
          </button>

          {expandedSections.classification && (
            <div
              className="p-4 border-t grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2"
              style={{ borderColor: `color-mix(in srgb, ${colors.border} 30%, transparent)` }}
            >
              {classifications.map((c, i) => {
                const config = FILE_TYPE_CONFIG[c.fileType] || FILE_TYPE_CONFIG.unknown
                const Icon = getFileTypeIcon(c.fileType)
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{ backgroundColor: `color-mix(in srgb, ${config.color} 10%, transparent)` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: config.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate" style={{ color: colors.text }}>
                          {c.fileName}
                        </span>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded shrink-0"
                          style={{
                            backgroundColor: `color-mix(in srgb, ${config.color} 20%, transparent)`,
                            color: config.color
                          }}
                        >
                          {config.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs" style={{ color: colors.textMuted }}>
                          {c.metadata.lineCount} lines
                        </span>
                        <span className="text-xs" style={{ color: colors.textMuted }}>•</span>
                        <span className="text-xs" style={{ color: colors.textMuted }}>
                          {c.confidence}% confidence
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Intelligence Results */}
      {parsedResults.length > 0 && (
        <div
          className="rounded-xl border"
          style={{
            backgroundColor: colors.card,
            borderColor: `color-mix(in srgb, ${colors.border} 50%, transparent)`
          }}
        >
          <div
            className="flex items-center justify-between p-4 border-b"
            style={{ borderColor: `color-mix(in srgb, ${colors.border} 30%, transparent)` }}
          >
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5" style={{ color: colors.primary }} />
              <span className="font-medium" style={{ color: colors.text }}>Extracted Intelligence</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge style={{ backgroundColor: `color-mix(in srgb, ${colors.success} 15%, transparent)`, color: colors.success }}>
                {parsedResults.length} items
              </Badge>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="p-3 rounded-lg text-center" style={{ backgroundColor: `color-mix(in srgb, ${colors.primary} 10%, transparent)` }}>
                <div className="text-xl font-bold" style={{ color: colors.primary }}>{stats.totalFiles}</div>
                <div className="text-xs" style={{ color: colors.textMuted }}>Files</div>
              </div>
              <div className="p-3 rounded-lg text-center" style={{ backgroundColor: `color-mix(in srgb, #eab308 10%, transparent)` }}>
                <div className="text-xl font-bold" style={{ color: '#eab308' }}>{stats.ajaxCalls}</div>
                <div className="text-xs" style={{ color: colors.textMuted }}>AJAX Calls</div>
              </div>
              <div className="p-3 rounded-lg text-center" style={{ backgroundColor: `color-mix(in srgb, #f97316 10%, transparent)` }}>
                <div className="text-xl font-bold" style={{ color: '#f97316' }}>{stats.eventHandlers}</div>
                <div className="text-xs" style={{ color: colors.textMuted }}>Event Handlers</div>
              </div>
              <div className="p-3 rounded-lg text-center" style={{ backgroundColor: `color-mix(in srgb, #0891b2 10%, transparent)` }}>
                <div className="text-xl font-bold" style={{ color: '#0891b2' }}>{stats.storedProcedures}</div>
                <div className="text-xs" style={{ color: colors.textMuted }}>Procedures</div>
              </div>
              <div className="p-3 rounded-lg text-center" style={{ backgroundColor: `color-mix(in srgb, #059669 10%, transparent)` }}>
                <div className="text-xl font-bold" style={{ color: '#059669' }}>{stats.tables}</div>
                <div className="text-xs" style={{ color: colors.textMuted }}>Tables</div>
              </div>
              <div className="p-3 rounded-lg text-center" style={{ backgroundColor: `color-mix(in srgb, #7c3aed 10%, transparent)` }}>
                <div className="text-xl font-bold" style={{ color: '#7c3aed' }}>{stats.endpoints}</div>
                <div className="text-xs" style={{ color: colors.textMuted }}>Endpoints</div>
              </div>
            </div>

            {/* SQL Intelligence */}
            {parsedResults.filter(r => r.fileType === 'sql_sp').length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4" style={{ color: '#0891b2' }} />
                  <span className="font-medium text-sm" style={{ color: colors.text }}>
                    Stored Procedures ({parsedResults.filter(r => r.fileType === 'sql_sp').length})
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {parsedResults.filter(r => r.fileType === 'sql_sp').slice(0, 6).map((result, i) => {
                    const intel = (result.intelligence as any) || {}
                    return (
                      <div
                        key={i}
                        className="p-3 rounded-lg"
                        style={{ backgroundColor: `color-mix(in srgb, #0891b2 5%, transparent)` }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-mono" style={{ color: colors.text }}>
                            {intel.procedureName || result.fileName}
                          </span>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">{intel.actionType || 'unknown'}</Badge>
                            <span
                              className="text-xs px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor: intel.riskLevel === 'high' ? `color-mix(in srgb, ${colors.error} 20%, transparent)` :
                                        intel.riskLevel === 'medium' ? `color-mix(in srgb, ${colors.warning} 20%, transparent)` :
                                        `color-mix(in srgb, ${colors.success} 20%, transparent)`,
                                color: intel.riskLevel === 'high' ? colors.error :
                                      intel.riskLevel === 'medium' ? colors.warning : colors.success
                              }}
                            >
                              {intel.riskLevel || 'low'} risk
                            </span>
                          </div>
                        </div>
                        <div className="text-xs" style={{ color: colors.textMuted }}>
                          Complexity: {intel.complexity || 0} • Tables: {intel.tablesReferenced?.length || 0}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* JavaScript Intelligence */}
            {parsedResults.filter(r => r.fileType === 'javascript').length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4" style={{ color: '#eab308' }} />
                  <span className="font-medium text-sm" style={{ color: colors.text }}>
                    JavaScript Analysis ({parsedResults.filter(r => r.fileType === 'javascript').length})
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {parsedResults.filter(r => r.fileType === 'javascript').slice(0, 6).map((result, i) => {
                    const intel = (result.intelligence as any) || {}
                    return (
                      <div
                        key={i}
                        className="p-3 rounded-lg"
                        style={{ backgroundColor: `color-mix(in srgb, #eab308 5%, transparent)` }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-mono" style={{ color: colors.text }}>
                            {result.fileName}
                          </span>
                          <span className="text-xs" style={{ color: colors.textMuted }}>
                            {intel.complexity || 0} complexity
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {intel.ajaxCalls?.length > 0 && (
                            <Badge variant="outline" className="text-xs">{intel.ajaxCalls.length} AJAX</Badge>
                          )}
                          {intel.eventHandlers?.length > 0 && (
                            <Badge variant="outline" className="text-xs">{intel.eventHandlers.length} handlers</Badge>
                          )}
                          {intel.jqueryPlugins?.length > 0 && (
                            <Badge variant="outline" className="text-xs">jQuery</Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* CSHTML Intelligence */}
            {parsedResults.filter(r => r.fileType === 'razor_view').length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4" style={{ color: '#9333ea' }} />
                  <span className="font-medium text-sm" style={{ color: colors.text }}>
                    CSHTML Views ({parsedResults.filter(r => r.fileType === 'razor_view').length})
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {parsedResults.filter(r => r.fileType === 'razor_view').slice(0, 9).map((result, i) => {
                    const intel = result.intelligence as any || {}
                    const viewName = intel.viewName || result.fileName || 'Unknown View'
                    const viewType = intel.viewType || 'unknown'
                    const linkedTable = intel.model?.linkedTable || 'No linked table'
                    const title = intel.title || viewName
                    return (
                      <div
                        key={i}
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `color-mix(in srgb, #9333ea 5%, transparent)` }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-mono" style={{ color: colors.text }}>
                            {viewName}
                          </span>
                          <Badge variant="outline" className="text-xs capitalize">{viewType}</Badge>
                        </div>
                        <div className="text-xs" style={{ color: colors.textMuted }}>
                          {linkedTable}
                        </div>
                        {intel.fields?.length > 0 && (
                          <div className="text-xs mt-1" style={{ color: colors.textMuted }}>
                            {intel.fields.length} fields
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Complete State */}
      {phase === 'complete' && (
        <div
          className="rounded-xl border p-8 text-center"
          style={{
            backgroundColor: `color-mix(in srgb, ${colors.success} 10%, transparent)`,
            borderColor: `color-mix(in srgb, ${colors.success} 30%, transparent)`
          }}
        >
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4" style={{ color: colors.success }} />
          <h3 className="text-xl font-bold mb-2" style={{ color: colors.text }}>
            Intelligence Extraction Complete!
          </h3>
          <p className="text-sm mb-6" style={{ color: colors.textMuted }}>
            {stats.totalFiles} files processed • {parsedResults.length} intelligence items extracted
          </p>

          <div className="flex justify-center gap-3">
            <button
              onClick={() => onNavigate?.('intelligence')}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium"
              style={{
                backgroundColor: colors.primary,
                color: '#fff'
              }}
            >
              <Brain className="w-5 h-5" />
              View Intelligence
            </button>
            <button
              onClick={clearAll}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium"
              style={{
                backgroundColor: `color-mix(in srgb, ${colors.border} 30%, transparent)`,
                color: colors.text
              }}
            >
              <RefreshCw className="w-5 h-5" />
              Process More Files
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
