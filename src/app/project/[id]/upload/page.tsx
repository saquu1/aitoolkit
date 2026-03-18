'use client'

import { useParams, useRouter } from 'next/navigation'
import { useTheme } from '@/hooks/useTheme'
import { ArrowLeft, Upload, FileCode, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'
import { useState, useCallback } from 'react'

export default function UploadPage() {
  const params = useParams()
  const router = useRouter()
  const { colors } = useTheme()
  const projectId = params.id as string

  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const droppedFiles = Array.from(e.dataTransfer.files)
    setFiles(prev => [...prev, ...droppedFiles])
  }, [])

  const handleUpload = async () => {
    if (files.length === 0) return
    setUploading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('projectId', projectId)
      files.forEach(file => formData.append('files', file))

      const response = await fetch('/api/projects/files', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      setResult(data)

      if (data.success) {
        setFiles([])
      }
    } catch (error) {
      setResult({ error: 'Upload failed' })
    } finally {
      setUploading(false)
    }
  }

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg }}>
      <div className="sticky top-0 z-10 border-b" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push(`/project/${projectId}`)} className="p-2 rounded-lg hover:opacity-80" style={{ color: colors.textMuted }}>
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <Upload className="w-6 h-6" style={{ color: colors.primary }} />
              <h1 className="text-xl font-bold" style={{ color: colors.text }}>Upload Files</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer hover:border-opacity-60 transition-colors"
          style={{ borderColor: colors.primary, backgroundColor: `color-mix(in srgb, ${colors.primary} 5%, transparent)` }}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <Upload className="w-12 h-12 mx-auto mb-4" style={{ color: colors.primary }} />
          <p className="text-lg font-medium" style={{ color: colors.text }}>Drop SQL or CSHTML files here</p>
          <p className="text-sm mt-2" style={{ color: colors.textMuted }}>or click to browse</p>
          <input
            id="file-input"
            type="file"
            multiple
            accept=".sql,.cshtml,.vbhtml,.aspx,.cs,.js,.ts,.json,.xml"
            className="hidden"
            onChange={(e) => setFiles(prev => [...prev, ...Array.from(e.target.files || [])])}
          />
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-6 space-y-2">
            <h3 className="font-medium" style={{ color: colors.text }}>Selected Files ({files.length})</h3>
            {files.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: colors.card }}>
                <div className="flex items-center gap-2">
                  <FileCode className="w-5 h-5" style={{ color: colors.primary }} />
                  <span style={{ color: colors.text }}>{file.name}</span>
                  <span className="text-xs" style={{ color: colors.textMuted }}>
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button onClick={() => removeFile(idx)} className="text-red-500 text-sm hover:underline">Remove</button>
              </div>
            ))}
          </div>
        )}

        {/* Upload Button */}
        {files.length > 0 && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: colors.primary, color: '#fff' }}
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Upload {files.length} File(s)
              </>
            )}
          </button>
        )}

        {/* Result */}
        {result && (
          <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: result.error ? `${colors.error}10` : `${colors.success}10` }}>
            {result.success ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-medium text-green-500">{result.message}</span>
                </div>
                {result.results && (
                  <div className="mt-3 space-y-1">
                    {result.results.map((r: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        {r.status === 'success' ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                        <span style={{ color: colors.text }}>{r.fileName}</span>
                        {r.error && <span className="text-red-500">- {r.error}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="text-red-500">{result.error || 'Upload failed'}</span>
              </div>
            )}
          </div>
        )}

        {/* Help Text */}
        <div className="mt-8 p-4 rounded-lg" style={{ backgroundColor: colors.card }}>
          <h4 className="font-medium mb-2" style={{ color: colors.text }}>Supported File Types</h4>
          <ul className="text-sm space-y-1" style={{ color: colors.textMuted }}>
            <li><strong>.sql</strong> - SQL DDL scripts, stored procedures, views</li>
            <li><strong>.cshtml</strong> - ASP.NET Razor views</li>
            <li><strong>.vbhtml</strong> - VB.NET Razor views</li>
            <li><strong>.aspx</strong> - ASP.NET Web Forms</li>
            <li><strong>.cs</strong> - C# code files</li>
            <li><strong>.js/.ts</strong> - JavaScript/TypeScript files</li>
            <li><strong>.json/.xml</strong> - Configuration files</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
