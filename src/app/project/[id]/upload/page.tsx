'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Upload, FileCode, FileText, File, AlertTriangle, CheckCircle2,
  Loader2, Trash2, Play, RefreshCw, Database, Code, Eye,
  Table2, XCircle, Clock, Sparkles, FolderOpen, FileJson,
  Zap, ChevronRight
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

interface ParseResult {
  success: boolean
  message: string
  results: {
    filesProcessed: number
    tables: number
    procedures: number
    views: number
    modulesLinked: number
    totalTables: number
    totalProcedures: number
    totalViews: number
    totalModules: number
    errors?: string[]
  }
}

const ACCEPTED_EXTENSIONS = [
  '.sql', '.cshtml', '.vbhtml', '.aspx', '.asmx',
  '.cs', '.js', '.ts', '.json', '.xml', '.txt', '.md'
]

const FILE_TYPE_ICONS: Record<string, any> = {
  sql: FileCode,
  cshtml: FileText,
  vbhtml: FileText,
  aspx: FileText,
  cs: Code,
  js: FileJson,
  ts: Code,
  json: FileJson,
  xml: File,
  txt: File,
  md: FileText,
}

const FILE_TYPE_COLORS: Record<string, string> = {
  sql: '#3b82f6',
  cshtml: '#8b5cf6',
  vbhtml: '#8b5cf6',
  aspx: '#22c55e',
  cs: '#f97316',
  js: '#eab308',
  ts: '#3b82f6',
  json: '#6b7280',
  xml: '#ef4444',
  txt: '#6b7280',
  md: '#6b7280',
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ProjectUploadPage() {
  const params = useParams()
  const router = useRouter()
  const { colors } = useTheme()
  const projectId = params.id as string

  const [files, setFiles] = useState<ProjectFile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const alpha = (color: string, opacity: number) =>
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  useEffect(() => {
    fetchFiles()
  }, [projectId])

  const fetchFiles = async () => {
    try {
      const response = await fetch(`/api/projects/files?projectId=${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setFiles(data.files || [])
      }
    } catch (err) {
      console.error('Error fetching files:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const uploadFiles = async (fileList: File[]) => {
    if (fileList.length === 0) return

    setIsUploading(true)
    setUploadProgress(0)
    setError(null)
    setUploadMessage(`Uploading ${fileList.length} file${fileList.length > 1 ? 's' : ''}...`)

    try {
      const formData = new FormData()
      formData.append('projectId', projectId)

      for (const file of fileList) {
        formData.append('files', file)
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const response = await fetch('/api/projects/files', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (response.ok) {
        const data = await response.json()
        const uploadedCount = data.files?.length || fileList.length
        setUploadMessage(`Successfully uploaded ${uploadedCount} file${uploadedCount > 1 ? 's' : ''}`)
        await fetchFiles()
      } else {
        const errData = await response.json()
        setError(errData.error || 'Upload failed')
        setUploadMessage(null)
      }
    } catch (err: any) {
      setError(err.message || 'Upload failed')
      setUploadMessage(null)
    } finally {
      setTimeout(() => {
        setIsUploading(false)
        setUploadProgress(0)
        setUploadMessage(null)
      }, 2000)
    }
  }

  const parseFiles = async () => {
    setIsParsing(true)
    setError(null)
    setParseResult(null)

    try {
      const response = await fetch('/api/projects/parse-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, autoLink: true }),
      })

      if (response.ok) {
        const data = await response.json()
        setParseResult(data)
        await fetchFiles()
      } else {
        const errData = await response.json()
        setError(errData.error || 'Parsing failed')
      }
    } catch (err: any) {
      setError(err.message || 'Parsing failed')
    } finally {
      setIsParsing(false)
    }
  }

  const viewFileContent = async (file: ProjectFile) => {
    try {
      const response = await fetch(`/api/projects/files?projectId=${projectId}&fileId=${file.id}`)
      if (response.ok) {
        const data = await response.json()
        setFileContent(data.file?.content || 'No content available')
        setSelectedFile(file)
      }
    } catch (err) {
      console.error('Error loading file content:', err)
    }
  }

  const deleteFile = async (fileId: string) => {
    try {
      const response = await fetch('/api/projects/files', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }),
      })
      if (response.ok) {
        await fetchFiles()
      }
    } catch (err) {
      console.error('Error deleting file:', err)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(e.target.files || [])
    uploadFiles(fileList)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const fileList = Array.from(e.dataTransfer.files)
    uploadFiles(fileList)
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'parsed':
        return (
          <Badge style={{ backgroundColor: alpha(colors.success, 15), color: colors.success, border: `1px solid ${alpha(colors.success, 25)}` }}>
            <CheckCircle2 className="w-3 h-3 mr-1" /> Parsed
          </Badge>
        )
      case 'error':
        return (
          <Badge style={{ backgroundColor: alpha(colors.error, 15), color: colors.error, border: `1px solid ${alpha(colors.error, 25)}` }}>
            <AlertTriangle className="w-3 h-3 mr-1" /> Error
          </Badge>
        )
      default:
        return (
          <Badge style={{ backgroundColor: alpha(colors.warning, 15), color: colors.warning, border: `1px solid ${alpha(colors.warning, 25)}` }}>
            <Clock className="w-3 h-3 mr-1" /> Pending
          </Badge>
        )
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.bg }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: colors.text }}>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: alpha(colors.primary, 15) }}
            >
              <Upload className="w-5 h-5" style={{ color: colors.primary }} />
            </div>
            Upload Files
          </h1>
          <p className="mt-2 text-sm" style={{ color: colors.textMuted }}>
            Upload SQL DDL, CSHTML views, and source files to parse and analyze your database schema
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            style={{ borderColor: colors.border, color: colors.text }}
            onClick={fetchFiles}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          {files.length > 0 && (
            <Button
              style={{ backgroundColor: colors.primary, color: '#fff' }}
              onClick={parseFiles}
              disabled={isParsing}
            >
              {isParsing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {isParsing ? 'Parsing...' : 'Parse All Files'}
            </Button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl border"
          style={{
            backgroundColor: alpha(colors.error, 8),
            borderColor: alpha(colors.error, 20),
            color: colors.error,
          }}
        >
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm flex-1">{error}</p>
          <button onClick={() => setError(null)}>
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload Progress */}
      {(isUploading || uploadMessage) && (
        <div
          className="p-4 rounded-xl border"
          style={{
            backgroundColor: alpha(colors.primary, 8),
            borderColor: alpha(colors.primary, 20),
          }}
        >
          <div className="flex items-center gap-3 mb-2">
            {isUploading && <Loader2 className="w-4 h-4 animate-spin" style={{ color: colors.primary }} />}
            <span className="text-sm font-medium" style={{ color: colors.primary }}>
              {uploadMessage || 'Processing...'}
            </span>
          </div>
          {isUploading && (
            <Progress value={uploadProgress} className="h-2" />
          )}
        </div>
      )}

      {/* Parse Result */}
      {parseResult && (
        <div
          className="p-5 rounded-xl border"
          style={{
            backgroundColor: alpha(colors.success, 8),
            borderColor: alpha(colors.success, 20),
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="w-5 h-5" style={{ color: colors.success }} />
            <span className="font-semibold" style={{ color: colors.success }}>{parseResult.message}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Tables', value: parseResult.results.tables, icon: Table2, color: '#3b82f6' },
              { label: 'Procedures', value: parseResult.results.procedures, icon: Code, color: '#8b5cf6' },
              { label: 'Views', value: parseResult.results.views, icon: FileText, color: '#22c55e' },
              { label: 'Modules', value: parseResult.results.modulesLinked, icon: Database, color: '#f97316' },
            ].map(stat => (
              <div
                key={stat.label}
                className="p-3 rounded-lg text-center"
                style={{ backgroundColor: alpha(stat.color, 10) }}
              >
                <stat.icon className="w-5 h-5 mx-auto mb-1" style={{ color: stat.color }} />
                <div className="text-xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-xs" style={{ color: colors.textMuted }}>{stat.label}</div>
              </div>
            ))}
          </div>
          {parseResult.results.errors && parseResult.results.errors.length > 0 && (
            <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: alpha(colors.error, 8) }}>
              <p className="text-xs font-medium mb-1" style={{ color: colors.error }}>
                {parseResult.results.errors.length} warning(s):
              </p>
              {parseResult.results.errors.slice(0, 3).map((err, i) => (
                <p key={i} className="text-xs" style={{ color: colors.textMuted }}>{err}</p>
              ))}
              {parseResult.results.errors.length > 3 && (
                <p className="text-xs" style={{ color: colors.textMuted }}>
                  ...and {parseResult.results.errors.length - 3} more
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 cursor-pointer ${
          isDragOver ? 'scale-[1.01]' : ''
        }`}
        style={{
          backgroundColor: isDragOver ? alpha(colors.primary, 8) : alpha(colors.border, 5),
          borderColor: isDragOver ? colors.primary : alpha(colors.border, 30),
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{
            backgroundColor: isDragOver ? alpha(colors.primary, 15) : alpha(colors.primary, 8),
          }}
        >
          <Upload
            className="w-8 h-8 transition-transform duration-200"
            style={{
              color: colors.primary,
              transform: isDragOver ? 'translateY(-4px)' : 'none',
            }}
          />
        </div>

        <p className="text-lg font-semibold mb-1" style={{ color: colors.text }}>
          {isDragOver ? 'Drop files here' : 'Drag & drop files here'}
        </p>
        <p className="text-sm mb-4" style={{ color: colors.textMuted }}>
          or click to browse files
        </p>

        <div className="flex flex-wrap justify-center gap-2">
          {['.sql', '.cshtml', '.aspx', '.cs', '.js', '.ts', '.json', '.xml'].map(ext => (
            <span
              key={ext}
              className="px-2 py-1 rounded-md text-xs font-mono"
              style={{
                backgroundColor: alpha(colors.textMuted, 10),
                color: colors.textMuted,
              }}
            >
              {ext}
            </span>
          ))}
        </div>
      </div>

      {/* Uploaded Files List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: colors.text }}>
            <FolderOpen className="w-5 h-5" style={{ color: colors.primary }} />
            Uploaded Files
            {files.length > 0 && (
              <Badge
                className="ml-2"
                style={{ backgroundColor: alpha(colors.primary, 15), color: colors.primary }}
              >
                {files.length}
              </Badge>
            )}
          </h2>
          {files.length > 0 && (
            <div className="flex gap-3 text-xs" style={{ color: colors.textMuted }}>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" style={{ color: colors.success }} />
                {files.filter(f => f.parseStatus === 'parsed').length} parsed
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" style={{ color: colors.warning }} />
                {files.filter(f => f.parseStatus === 'pending').length} pending
              </span>
              {files.filter(f => f.parseStatus === 'error').length > 0 && (
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" style={{ color: colors.error }} />
                  {files.filter(f => f.parseStatus === 'error').length} errors
                </span>
              )}
            </div>
          )}
        </div>

        {files.length === 0 ? (
          <div
            className="text-center py-16 rounded-xl border"
            style={{
              backgroundColor: alpha(colors.border, 3),
              borderColor: alpha(colors.border, 10),
            }}
          >
            <FolderOpen className="w-12 h-12 mx-auto mb-3" style={{ color: colors.textMuted }} />
            <p className="font-medium mb-1" style={{ color: colors.textMuted }}>No files uploaded yet</p>
            <p className="text-sm" style={{ color: alpha(colors.textMuted, 70) }}>
              Upload SQL, CSHTML, or other source files to get started
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => {
              const ext = file.fileName.split('.').pop()?.toLowerCase() || ''
              const Icon = FILE_TYPE_ICONS[ext] || File
              const iconColor = FILE_TYPE_COLORS[ext] || '#6b7280'

              return (
                <div
                  key={file.id}
                  className="flex items-center gap-4 p-4 rounded-xl border transition-all duration-150 hover:shadow-sm"
                  style={{
                    backgroundColor: colors.card,
                    borderColor: alpha(colors.border, 15),
                  }}
                >
                  {/* File Icon */}
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: alpha(iconColor, 12) }}
                  >
                    <Icon className="w-5 h-5" style={{ color: iconColor }} />
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate text-sm" style={{ color: colors.text }}>
                        {file.fileName}
                      </span>
                      {getStatusBadge(file.parseStatus)}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: colors.textMuted }}>
                      <span>{formatFileSize(file.fileSize)}</span>
                      <span>{file.lineCount} lines</span>
                      {file.tablesFound !== null && file.tablesFound > 0 && (
                        <span className="flex items-center gap-1">
                          <Table2 className="w-3 h-3" />
                          {file.tablesFound} tables
                        </span>
                      )}
                      {file.proceduresFound !== null && file.proceduresFound > 0 && (
                        <span className="flex items-center gap-1">
                          <Code className="w-3 h-3" />
                          {file.proceduresFound} procs
                        </span>
                      )}
                      {file.parseError && (
                        <span style={{ color: colors.error }} className="truncate">
                          {file.parseError}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => viewFileContent(file)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: colors.textMuted }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = alpha(colors.primary, 10))}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      title="View content"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteFile(file.id)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: colors.textMuted }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = alpha(colors.error, 10))}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      title="Delete file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* File Content Modal */}
      {selectedFile && fileContent !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => { setSelectedFile(null); setFileContent(null) }}
        >
          <div
            className="w-full max-w-4xl max-h-[80vh] rounded-2xl border overflow-hidden flex flex-col"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className="flex items-center justify-between p-4 border-b"
              style={{ borderColor: colors.border }}
            >
              <div className="flex items-center gap-3">
                <FileCode className="w-5 h-5" style={{ color: colors.primary }} />
                <span className="font-semibold" style={{ color: colors.text }}>{selectedFile.fileName}</span>
              </div>
              <button
                onClick={() => { setSelectedFile(null); setFileContent(null) }}
                className="p-2 rounded-lg transition-colors"
                style={{ color: colors.textMuted }}
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-4">
              <pre
                className="text-xs font-mono whitespace-pre-wrap break-words p-4 rounded-xl"
                style={{
                  backgroundColor: alpha(colors.textMuted, 5),
                  color: colors.text,
                  lineHeight: '1.6',
                }}
              >
                {fileContent.length > 50000
                  ? fileContent.substring(0, 50000) + '\n\n... (truncated, showing first 50,000 characters)'
                  : fileContent
                }
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
