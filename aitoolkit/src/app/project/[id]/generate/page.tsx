'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTheme } from '@/hooks/useTheme'
import {
  Code, FileCode, Download, Loader2, CheckCircle, AlertTriangle,
  Layers, Database, FileText, Zap, Copy, ChevronDown, ChevronRight
} from 'lucide-react'

interface GeneratedFile {
  path: string
  content: string
  type: string
  description: string
  viewName?: string
}

interface GenerationResult {
  success: boolean
  summary: {
    totalFiles: number
    components: number
    apis: number
    schemas: number
    hooks: number
    pages: number
    prismaSchema: boolean
  }
  files: GeneratedFile[]
  prismaSchema?: string
  dependencies: string[]
}

export default function CodeGeneratorPage() {
  const params = useParams()
  const router = useRouter()
  const { colors } = useTheme()
  const projectId = params.id as string

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [moduleName, setModuleName] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          moduleName: moduleName || undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate code')
      }

      setResult(data)
      setSelectedFiles(new Set(data.files.map((f: GeneratedFile) => f.path)))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!result) return

    // Create downloadable content
    const filesToDownload = result.files.filter(f => selectedFiles.has(f.path))
    
    let content = `# Generated Code for ${moduleName || 'Module'}\n\n`
    content += `Generated: ${new Date().toISOString()}\n\n`
    content += `## Dependencies\n\n\`\`\`bash\nnpm install ${result.dependencies.join(' ')}\n\`\`\`\n\n`

    if (result.prismaSchema) {
      content += `## Prisma Schema\n\n\`\`\`prisma\n${result.prismaSchema}\n\`\`\`\n\n`
    }

    for (const file of filesToDownload) {
      const ext = file.path.split('.').pop()
      const lang = ext === 'ts' || ext === 'tsx' ? 'typescript' : ext || 'text'
      content += `## ${file.path}\n\n*${file.description}*\n\n\`\`\`${lang}\n${file.content}\n\`\`\`\n\n---\n\n`
    }

    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `generated-code-${moduleName || 'module'}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const toggleFile = (path: string) => {
    const newSelected = new Set(selectedFiles)
    if (newSelected.has(path)) {
      newSelected.delete(path)
    } else {
      newSelected.add(path)
    }
    setSelectedFiles(newSelected)
  }

  const toggleExpand = (path: string) => {
    const newExpanded = new Set(expandedFiles)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedFiles(newExpanded)
  }

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  const typeIcons: Record<string, any> = {
    component: FileCode,
    api: Zap,
    schema: Database,
    hook: Code,
    type: FileText,
    page: Layers,
    config: FileText
  }

  const typeColors: Record<string, string> = {
    component: '#3b82f6',
    api: '#8b5cf6',
    schema: '#22c55e',
    hook: '#f97316',
    type: '#06b6d4',
    page: '#ec4899',
    config: '#6b7280'
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg }}>
      {/* Header */}
      <div className="sticky top-0 z-10 border-b" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Code className="w-6 h-6" style={{ color: colors.primary }} />
              <h1 className="text-xl font-bold" style={{ color: colors.text }}>Code Generator</h1>
            </div>
            {result && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 rounded-lg"
                style={{ backgroundColor: colors.primary, color: '#fff' }}
              >
                <Download className="w-4 h-4" />
                Download ({selectedFiles.size} files)
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Configuration */}
        <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <h3 className="font-semibold mb-4" style={{ color: colors.text }}>Generation Settings</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: colors.textMuted }}>Module Name (optional)</label>
              <input
                type="text"
                value={moduleName}
                onChange={(e) => setModuleName(e.target.value)}
                placeholder="e.g., organizations, patients, appointments"
                className="w-full px-3 py-2 rounded-lg border"
                style={{ 
                  backgroundColor: colors.bg, 
                  borderColor: colors.border, 
                  color: colors.text 
                }}
              />
              <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
                Leave empty to use view name from parsed files
              </p>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2"
              style={{ 
                backgroundColor: loading ? colors.border : colors.primary, 
                color: '#fff' 
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Code...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Generate Next.js Code
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-xl border border-red-500/50 bg-red-500/10">
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Error</span>
            </div>
            <p className="mt-2 text-sm" style={{ color: colors.text }}>{error}</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <div className="text-2xl font-bold" style={{ color: colors.text }}>{result.summary.totalFiles}</div>
                <div className="text-sm" style={{ color: colors.textMuted }}>Total Files</div>
              </div>
              <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <div className="text-2xl font-bold text-blue-500">{result.summary.components}</div>
                <div className="text-sm" style={{ color: colors.textMuted }}>Components</div>
              </div>
              <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <div className="text-2xl font-bold text-purple-500">{result.summary.apis}</div>
                <div className="text-sm" style={{ color: colors.textMuted }}>APIs</div>
              </div>
              <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <div className="text-2xl font-bold text-green-500">{result.summary.schemas}</div>
                <div className="text-sm" style={{ color: colors.textMuted }}>Schemas</div>
              </div>
              <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <div className="text-2xl font-bold text-orange-500">{result.summary.hooks}</div>
                <div className="text-sm" style={{ color: colors.textMuted }}>Hooks</div>
              </div>
              <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <div className="text-2xl font-bold text-pink-500">{result.summary.pages}</div>
                <div className="text-sm" style={{ color: colors.textMuted }}>Pages</div>
              </div>
              <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <div className="text-2xl font-bold" style={{ color: result.summary.prismaSchema ? '#22c55e' : '#6b7280' }}>
                  {result.summary.prismaSchema ? '✓' : '—'}
                </div>
                <div className="text-sm" style={{ color: colors.textMuted }}>Prisma</div>
              </div>
            </div>

            {/* Dependencies */}
            {result.dependencies.length > 0 && (
              <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <h4 className="font-medium mb-2" style={{ color: colors.text }}>Required Dependencies</h4>
                <code className="block p-3 rounded-lg text-sm" style={{ backgroundColor: colors.bg }}>
                  npm install {result.dependencies.join(' ')}
                </code>
              </div>
            )}

            {/* Files List */}
            <div className="rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
              <div className="p-4 border-b" style={{ borderColor: colors.border }}>
                <div className="flex items-center justify-between">
                  <h4 className="font-medium" style={{ color: colors.text }}>Generated Files</h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedFiles(new Set(result.files.map(f => f.path)))}
                      className="text-sm px-2 py-1 rounded"
                      style={{ color: colors.primary }}
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedFiles(new Set())}
                      className="text-sm px-2 py-1 rounded"
                      style={{ color: colors.textMuted }}
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
              </div>

              <div className="divide-y" style={{ borderColor: colors.border }}>
                {result.files.map((file, idx) => {
                  const TypeIcon = typeIcons[file.type] || FileCode
                  const typeColor = typeColors[file.type] || '#6b7280'
                  const isExpanded = expandedFiles.has(file.path)
                  const isSelected = selectedFiles.has(file.path)

                  return (
                    <div key={idx}>
                      <div 
                        className="flex items-center gap-3 p-3 cursor-pointer hover:opacity-80"
                        onClick={() => toggleExpand(file.path)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation()
                            toggleFile(file.path)
                          }}
                          className="w-4 h-4"
                        />
                        <TypeIcon className="w-4 h-4" style={{ color: typeColor }} />
                        <span className="font-mono text-sm flex-1" style={{ color: colors.text }}>
                          {file.path}
                        </span>
                        <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: colors.bg, color: colors.textMuted }}>
                          {file.type}
                        </span>
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>

                      {isExpanded && (
                        <div className="px-3 pb-3">
                          <p className="text-xs mb-2" style={{ color: colors.textMuted }}>{file.description}</p>
                          <div className="relative">
                            <button
                              onClick={() => copyToClipboard(file.content)}
                              className="absolute top-2 right-2 p-1.5 rounded"
                              style={{ backgroundColor: colors.card }}
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <pre className="p-4 rounded-lg text-xs overflow-x-auto max-h-96" style={{ backgroundColor: colors.bg }}>
                              <code>{file.content}</code>
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Prisma Schema */}
            {result.prismaSchema && (
              <div className="rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: colors.border }}>
                  <h4 className="font-medium" style={{ color: colors.text }}>Prisma Schema</h4>
                  <button
                    onClick={() => copyToClipboard(result.prismaSchema!)}
                    className="p-2 rounded"
                    style={{ backgroundColor: colors.bg }}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <pre className="p-4 text-xs overflow-x-auto max-h-96" style={{ backgroundColor: colors.bg }}>
                  <code>{result.prismaSchema}</code>
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
