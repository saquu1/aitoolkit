'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
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
  FolderKanban,
  Eye,
  Copy,
  AlertCircle,
  History,
  FileWarning
} from 'lucide-react'

interface UniversalUploadTabProps {
  onNavigate?: (tab: string) => void
}

type ProcessingPhase = 'upload' | 'preview' | 'classifying' | 'parsing' | 'complete'

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

// File preview interface
interface FilePreview {
  name: string
  content: string
  size: number
  lineCount: number
  fileType: string
  preview: string
  insights: Record<string, unknown>
  isDuplicate: boolean
  duplicateOf?: string
}

// Duplicate info
interface DuplicateInfo {
  fileName: string
  duplicates: { id: string; fileName: string }[]
}

// Version history
interface VersionInfo {
  id: string
  version: number
  lineCount: number
  changeSummary: string
  createdAt: string
}

export function UniversalUploadTab({ onNavigate }: UniversalUploadTabProps) {
  const { colors } = useTheme()
  const { setParseResult, setSqlInput, activeProject } = useSchema()

  // State
  const [phase, setPhase] = useState<ProcessingPhase>('upload')
  const [files, setFiles] = useState<File[]>([])
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([])
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [processProgress, setProcessProgress] = useState(0)
  const [processStatus, setProcessStatus] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [versionHistory, setVersionHistory] = useState<VersionInfo[]>([])
  const [showVersionHistory, setShowVersionHistory] = useState(false)

  // Stats
  const [stats, setStats] = useState({
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
    setFilePreviews(prev => prev.filter((_, i) => i !== index))
    setDuplicates(prev => prev.filter((_, i) => i !== index))
  }

  // Clear all
  const clearAll = () => {
    setFiles([])
    setFilePreviews([])
    setDuplicates([])
    setPhase('upload')
    setProcessProgress(0)
    setProcessStatus('')
    setUploadProgress(0)
    setSelectedFileIndex(null)
    setShowPreview(false)
    setStats({
      totalFiles: 0,
      ajaxCalls: 0,
      eventHandlers: 0,
      storedProcedures: 0,
      tables: 0,
      endpoints: 0
    })
  }

  // Preview files before processing
  const previewFiles = useCallback(async () => {
    if (files.length === 0) return

    setIsProcessing(true)
    setPhase('preview')
    setProcessStatus('Generating previews...')
    setUploadProgress(0)

    const previews: FilePreview[] = []
    const duplicateList: DuplicateInfo[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setProcessStatus(`Previewing ${file.name}...`)
      setUploadProgress(Math.round(((i + 1) / files.length) * 100))

      try {
        const content = await file.text()
        
        // Call preview API
        const response = await fetch('/api/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'preview-file',
            file: { name: file.name, content }
          })
        })

        const data = await response.json()
        
        if (data.success) {
          previews.push({
            name: file.name,
            content,
            size: data.preview.fileSize,
            lineCount: data.preview.lineCount,
            fileType: data.preview.fileType,
            preview: data.preview.preview,
            insights: data.preview.insights,
            isDuplicate: false,
          })
        }
      } catch (error) {
        console.error('Preview error:', error)
      }
    }

    // Check for duplicates
    if (activeProject && previews.length > 0) {
      try {
        const dupResponse = await fetch('/api/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'check-duplicates',
            projectId: activeProject.id,
            files: previews.map(p => ({ name: p.name, content: p.content }))
          })
        })

        const dupData = await dupResponse.json()
        
        if (dupData.success && dupData.duplicates.length > 0) {
          setDuplicates(dupData.duplicates)
          
          // Mark duplicates in previews
          dupData.duplicates.forEach((dup: DuplicateInfo) => {
            const idx = previews.findIndex(p => p.name === dup.fileName)
            if (idx !== -1) {
              previews[idx].isDuplicate = true
              previews[idx].duplicateOf = dup.duplicates[0]?.fileName
            }
          })
        }
      } catch (error) {
        console.error('Duplicate check error:', error)
      }
    }

    setFilePreviews(previews)
    setIsProcessing(false)
    setPhase('classifying')
  }, [files, activeProject])

  // Process all files
  const processFiles = useCallback(async () => {
    if (files.length === 0) return

    setIsProcessing(true)
    setPhase('parsing')
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
          files: fileContents,
          projectId: activeProject?.id
        })
      })

      const classifyData = await classifyResponse.json()

      if (!classifyData.success) {
        throw new Error('Classification failed')
      }

      setProcessProgress(40)
      setProcessStatus('Parsing files with specialized parsers...')

      // Step 3: Parse all files
      const parseResponse = await fetch('/api/parsers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'parse-all',
          files: fileContents,
          projectId: activeProject?.id,
          autoSave: true
        })
      })

      const parseData = await parseResponse.json()

      if (!parseData.success) {
        throw new Error('Parsing failed')
      }

      setProcessProgress(80)
      setProcessStatus('Processing results...')

      // Step 4: Update stats
      const jsAjaxCalls = parseData.javascript?.summary?.totalAjaxCalls || 0
      const cshtmlAjaxCalls = parseData.cshtml?.summary?.totalAjaxCalls || 0
      const jsEventHandlers = parseData.javascript?.summary?.totalEventHandlers || 0
      const cshtmlEventHandlers = parseData.cshtml?.summary?.totalEventHandlers || 0

      setStats({
        totalFiles: files.length,
        ajaxCalls: jsAjaxCalls + cshtmlAjaxCalls,
        eventHandlers: jsEventHandlers + cshtmlEventHandlers,
        storedProcedures: parseData.sql?.summary?.totalProcedures || 0,
        tables: parseData.sql?.summary?.totalTables || parseData.cshtml?.summary?.totalTables || 0,
        endpoints: parseData.javascript?.summary?.totalEndpoints || parseData.cshtml?.summary?.ajaxEndpoints?.length || 0
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
  }, [files, activeProject, setSqlInput, setParseResult])

  // Get file type icon
  const getFileTypeIcon = (type: string) => {
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

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

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
        </div>
      </div>

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
            <span className="text-sm" style={{ color: colors.textMuted }}>
              {phase === 'preview' ? uploadProgress : processProgress}%
            </span>
          </div>
          <Progress value={phase === 'preview' ? uploadProgress : processProgress} className="h-2" />
        </div>
      )}

      {/* Duplicate Warning */}
      {duplicates.length > 0 && phase === 'classifying' && (
        <div
          className="p-4 rounded-xl border"
          style={{
            backgroundColor: `color-mix(in srgb, ${colors.warning} 10%, transparent)`,
            borderColor: `color-mix(in srgb, ${colors.warning} 30%, transparent)`
          }}
        >
          <div className="flex items-start gap-3">
            <FileWarning className="w-5 h-5 mt-0.5" style={{ color: colors.warning }} />
            <div className="flex-1">
              <p className="font-medium" style={{ color: colors.text }}>
                Duplicate Files Detected
              </p>
              <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                {duplicates.length} file(s) have identical content to existing files:
              </p>
              <div className="mt-2 space-y-1">
                {duplicates.map((dup, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span style={{ color: colors.text }}>{dup.fileName}</span>
                    <ArrowRight className="w-3 h-3" style={{ color: colors.textMuted }} />
                    <span style={{ color: colors.warning }}>
                      {dup.duplicates[0]?.fileName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => setDuplicates([])}
              className="px-3 py-1.5 rounded-lg text-sm"
              style={{ backgroundColor: colors.warning, color: '#fff' }}
            >
              Continue Anyway
            </button>
          </div>
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

      {/* Files List with Preview */}
      {(files.length > 0 || filePreviews.length > 0) && phase !== 'complete' && (
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
              {phase === 'upload' && (
                <button
                  onClick={previewFiles}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${colors.primary} 20%, transparent)`,
                    color: colors.primary
                  }}
                >
                  <Eye className="w-4 h-4" />
                  Preview Files
                </button>
              )}
              {phase === 'classifying' && (
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
              )}
            </div>
          </div>

          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
            {(filePreviews.length > 0 ? filePreviews : files.map((f, i) => ({
              name: f.name,
              content: '',
              size: f.size,
              lineCount: 0,
              fileType: 'unknown',
              preview: '',
              insights: {},
              isDuplicate: false
            }))).map((file, i) => {
              const config = FILE_TYPE_CONFIG[file.fileType] || FILE_TYPE_CONFIG.unknown
              const Icon = getFileTypeIcon(file.fileType)
              
              return (
                <div
                  key={i}
                  className={`
                    p-3 rounded-lg border cursor-pointer transition-all
                    ${selectedFileIndex === i ? 'ring-2' : ''}
                  `}
                  style={{
                    backgroundColor: `color-mix(in srgb, ${config.color} 5%, transparent)`,
                    borderColor: file.isDuplicate 
                      ? colors.warning 
                      : `color-mix(in srgb, ${config.color} 20%, transparent)`,
                    ringColor: selectedFileIndex === i ? colors.primary : 'transparent'
                  }}
                  onClick={() => {
                    setSelectedFileIndex(i)
                    setShowPreview(true)
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5" style={{ color: config.color }} />
                      <span className="text-sm font-medium truncate max-w-[150px]" style={{ color: colors.text }}>
                        {file.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {file.isDuplicate && (
                        <Copy className="w-3.5 h-3.5" style={{ color: colors.warning }} title="Duplicate" />
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                        className="p-1 rounded hover:bg-opacity-50"
                        style={{ color: colors.textMuted }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs" style={{ color: colors.textMuted }}>
                    <Badge 
                      variant="outline" 
                      className="text-xs"
                      style={{ 
                        borderColor: config.color,
                        color: config.color
                      }}
                    >
                      {config.label}
                    </Badge>
                    <span>{formatSize(file.size)}</span>
                    {file.lineCount > 0 && (
                      <>
                        <span>•</span>
                        <span>{file.lineCount} lines</span>
                      </>
                    )}
                  </div>

                  {Object.keys(file.insights).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Object.entries(file.insights).slice(0, 3).map(([key, value]) => (
                        <span
                          key={key}
                          className="px-1.5 py-0.5 rounded text-xs"
                          style={{
                            backgroundColor: `color-mix(in srgb, ${colors.border} 30%, transparent)`,
                            color: colors.textMuted
                          }}
                        >
                          {key}: {String(value)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {showPreview && selectedFileIndex !== null && filePreviews[selectedFileIndex] && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowPreview(false)}
        >
          <div 
            className="rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
            style={{ backgroundColor: colors.card }}
            onClick={(e) => e.stopPropagation()}
          >
            <div 
              className="p-4 border-b flex items-center justify-between"
              style={{ borderColor: `color-mix(in srgb, ${colors.border} 30%, transparent)` }}
            >
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5" style={{ color: colors.primary }} />
                <span className="font-medium" style={{ color: colors.text }}>
                  {filePreviews[selectedFileIndex].name}
                </span>
                <Badge variant="outline">
                  {FILE_TYPE_CONFIG[filePreviews[selectedFileIndex].fileType]?.label || 'Unknown'}
                </Badge>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 rounded-lg"
                style={{ backgroundColor: `color-mix(in srgb, ${colors.border} 30%, transparent)` }}
              >
                <X className="w-4 h-4" style={{ color: colors.textMuted }} />
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[60vh]">
              <pre 
                className="text-sm font-mono whitespace-pre-wrap"
                style={{ color: colors.textMuted }}
              >
                {filePreviews[selectedFileIndex].preview || filePreviews[selectedFileIndex].content.substring(0, 5000)}
              </pre>
            </div>
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
            {stats.totalFiles} files processed • {stats.ajaxCalls + stats.eventHandlers + stats.storedProcedures + stats.tables} intelligence items extracted
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
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
