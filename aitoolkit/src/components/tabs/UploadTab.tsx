'use client'

import { useState, useCallback, useRef } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { useSchema, ParsedTable, ParsedFK, ParseResult, ParseStats } from '@/hooks/useSchema'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { MermaidRenderer } from '@/components/MermaidRenderer'
import { 
  Upload as UploadIcon, 
  FileCode, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Database,
  GitBranch,
  FileText,
  Clipboard,
  RefreshCw,
  Download,
  Trash2,
  ChevronDown,
  ChevronRight,
  Code,
  FileChartColumn,
  TestTube,
  FileSpreadsheet,
  Copy,
  Check
} from 'lucide-react'

interface GeneratedOutput {
  type: 'prisma' | 'erd' | 'docs' | 'uat' | 'flow'
  title: string
  content: string
  copied: boolean
}

interface UploadTabProps {
  onNavigate?: (tab: string) => void
}

export function UploadTab({ onNavigate }: UploadTabProps) {
  const { colors } = useTheme()
  const { 
    parseResult, 
    setParseResult, 
    sqlInput, 
    setSqlInput, 
    uploadedFiles, 
    setUploadedFiles,
    totalTables,
    totalColumns,
    fkRelationships,
    fkResolved,
    fkResolvedPercent,
    missingTables,
    clearAll
  } = useSchema()
  
  const [isDragOver, setIsDragOver] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [expandedTable, setExpandedTable] = useState<string | null>(null)
  const [generatedOutputs, setGeneratedOutputs] = useState<GeneratedOutput[]>([])
  const [isGenerating, setIsGenerating] = useState<string | null>(null)
  const [activeOutput, setActiveOutput] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Helper function to create semi-transparent colors
  const alpha = (color: string, opacity: number) => 
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  // Parse SQL via API
  const parseSQL = async (sql: string) => {
    setIsParsing(true)
    try {
      const response = await fetch('/api/toolkit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'parse', sql })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setParseResult(data.parseResult)
      } else {
        console.error('Parse error:', data.error)
      }
    } catch (error) {
      console.error('Parse failed:', error)
    } finally {
      setIsParsing(false)
    }
  }

  const handleFiles = async (files: File[]) => {
    const sqlFiles = files.filter(f => f.name.endsWith('.sql'))
    
    for (const file of sqlFiles) {
      const content = await file.text()
      setUploadedFiles(prev => [...prev, file.name])
      setSqlInput(prev => prev + '\n' + content)
    }
    
    if (sqlFiles.length > 0) {
      const allSql = await Promise.all(sqlFiles.map(f => f.text())).then(texts => texts.join('\n'))
      if (allSql) {
        await parseSQL(allSql)
      }
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    handleFiles(files)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const openFileBrowser = () => {
    fileInputRef.current?.click()
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
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }, [])

  const handleParseSQL = async () => {
    if (!sqlInput.trim()) return
    await parseSQL(sqlInput)
  }

  const generateOutput = async (type: 'prisma' | 'erd' | 'docs' | 'uat' | 'flow') => {
    if (!sqlInput.trim()) return
    
    setIsGenerating(type)
    try {
      const actionMap = {
        prisma: 'generate-prisma',
        erd: 'generate-erd',
        docs: 'generate-documentation',
        uat: 'generate-uat',
        flow: 'generate-flow'
      }
      
      const response = await fetch('/api/toolkit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: actionMap[type], 
          sql: sqlInput,
          projectName: 'Database Schema',
          options: type === 'uat' ? { format: 'markdown' } : {}
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        let content = ''
        let title = ''
        
        switch (type) {
          case 'prisma':
            content = data.schema
            title = 'Prisma Schema'
            break
          case 'erd':
            content = data.erd
            title = 'ERD Diagram (Mermaid)'
            break
          case 'docs':
            content = data.documentation
            title = 'Documentation'
            break
          case 'uat':
            content = data.markdown || JSON.stringify(data.cases, null, 2)
            title = `UAT Cases (${data.count} tests)`
            break
          case 'flow':
            content = data.flow
            title = 'Data Flow Diagram'
            break
        }
        
        const newOutput: GeneratedOutput = { type, title, content, copied: false }
        setGeneratedOutputs(prev => [...prev.filter(o => o.type !== type), newOutput])
        setActiveOutput(type)
      }
    } catch (error) {
      console.error('Generation failed:', error)
    } finally {
      setIsGenerating(null)
    }
  }

  const copyToClipboard = async (type: string) => {
    const output = generatedOutputs.find(o => o.type === type)
    if (!output) return
    
    try {
      await navigator.clipboard.writeText(output.content)
      setGeneratedOutputs(prev => 
        prev.map(o => o.type === type ? { ...o, copied: true } : o)
      )
      setTimeout(() => {
        setGeneratedOutputs(prev => 
          prev.map(o => o.type === type ? { ...o, copied: false } : o)
        )
      }, 2000)
    } catch (error) {
      console.error('Copy failed:', error)
    }
  }

  const downloadOutput = (type: string) => {
    const output = generatedOutputs.find(o => o.type === type)
    if (!output) return
    
    const extensions: Record<string, string> = {
      prisma: 'prisma',
      erd: 'mmd',
      docs: 'md',
      uat: 'md',
      flow: 'mmd'
    }
    
    const blob = new Blob([output.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `schema.${extensions[type] || 'txt'}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getTableStatus = (table: ParsedTable): 'complete' | 'partial' | 'standalone' => {
    if (table.foreignKeys.length === 0) return 'standalone'
    const tableNames = new Set(parseResult?.tables.map(t => t.tableName) || [])
    const allResolved = table.foreignKeys.every(fk => tableNames.has(fk.referencesTable))
    return allResolved ? 'complete' : 'partial'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return <Badge style={{ backgroundColor: alpha(colors.success, 20), color: colors.success, border: `1px solid ${alpha(colors.success, 30)}` }}>Complete</Badge>
      case 'partial':
        return <Badge style={{ backgroundColor: alpha(colors.warning, 20), color: colors.warning, border: `1px solid ${alpha(colors.warning, 30)}` }}>Partial</Badge>
      default:
        return <Badge style={{ backgroundColor: alpha(colors.textMuted, 20), color: colors.textMuted, border: `1px solid ${alpha(colors.textMuted, 30)}` }}>Standalone</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: colors.text }}>Schema Toolkit</h2>
          <p className="mt-1" style={{ color: colors.textMuted }}>Upload SQL DDL to parse, generate Prisma, ERD, docs, and UAT cases</p>
        </div>
        {parseResult && (
          <Button 
            variant="outline"
            style={{ borderColor: colors.border, color: colors.text }}
            onClick={() => {
              clearAll()
              setGeneratedOutputs([])
            }}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      {/* Upload Section */}
      <div className="grid grid-cols-2 gap-6">
        {/* File Upload */}
        <div 
          className="rounded-xl border p-6"
          style={{ backgroundColor: alpha(colors.card, 50), borderColor: colors.border }}
        >
          <div className="mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: colors.text }}>
              <FileCode className="w-5 h-5" style={{ color: colors.accent }} />
              Upload SQL Files
            </h3>
            <p className="text-sm mt-1" style={{ color: colors.textMuted }}>Drag & drop SQL DDL files</p>
          </div>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={openFileBrowser}
            className="border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer"
            style={{ 
              borderColor: isDragOver ? colors.primary : colors.border,
              backgroundColor: isDragOver ? alpha(colors.primary, 10) : 'transparent'
            }}
          >
            <UploadIcon className="w-12 h-12 mx-auto mb-4" style={{ color: isDragOver ? colors.primary : colors.textMuted }} />
            <p className="font-medium" style={{ color: colors.text }}>Drop files here</p>
            <p className="text-sm mt-1" style={{ color: colors.textMuted }}>or click to browse</p>
            <input 
              ref={fileInputRef}
              type="file" 
              className="hidden" 
              multiple 
              accept=".sql" 
              onChange={handleFileInputChange}
            />
            <Button 
              className="mt-4"
              style={{ backgroundColor: colors.bgTertiary }}
              onClick={(e) => {
                e.stopPropagation()
                openFileBrowser()
              }}
            >
              Choose Files
            </Button>
          </div>

          {uploadedFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              {uploadedFiles.map((file, i) => (
                <div 
                  key={i} 
                  className="flex items-center justify-between p-2 rounded"
                  style={{ backgroundColor: alpha(colors.bgTertiary, 30) }}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" style={{ color: colors.accent }} />
                    <span className="text-sm" style={{ color: colors.text }}>{file}</span>
                  </div>
                  <CheckCircle2 className="w-4 h-4" style={{ color: colors.success }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Paste SQL */}
        <div 
          className="rounded-xl border p-6"
          style={{ backgroundColor: alpha(colors.card, 50), borderColor: colors.border }}
        >
          <div className="mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: colors.text }}>
              <Clipboard className="w-5 h-5" style={{ color: colors.success }} />
              Paste SQL DDL
            </h3>
            <p className="text-sm mt-1" style={{ color: colors.textMuted }}>Paste CREATE TABLE statements directly</p>
          </div>
          <Textarea
            value={sqlInput}
            onChange={(e) => setSqlInput(e.target.value)}
            placeholder={`-- Paste your SQL DDL here
CREATE TABLE Patients (
    Id UNIQUEIDENTIFIER PRIMARY KEY,
    MRN NVARCHAR(50) NOT NULL,
    FirstName NVARCHAR(100) NOT NULL
);`}
            rows={10}
            className="font-mono text-sm resize-none overflow-y-auto"
            style={{ 
              backgroundColor: colors.bg,
              borderColor: colors.border,
              color: colors.text,
              minHeight: '10rem',
              maxHeight: '10rem',
            }}
          />
          <Button 
            onClick={handleParseSQL}
            disabled={!sqlInput.trim() || isParsing}
            className="mt-4 w-full"
            style={{ backgroundColor: colors.primary }}
          >
            {isParsing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Parsing...
              </>
            ) : (
              <>
                <Database className="w-4 h-4 mr-2" />
                Parse SQL
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Parse Results */}
      {parseResult && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-5 gap-4">
            {[
              { icon: Database, value: totalTables, label: 'Tables', color: colors.accent },
              { icon: FileCode, value: totalColumns, label: 'Columns', color: colors.primary },
              { icon: GitBranch, value: fkRelationships, label: 'Foreign Keys', color: colors.success },
              { icon: CheckCircle2, value: `${fkResolvedPercent}%`, label: 'FK Resolved', color: colors.success },
              { icon: AlertTriangle, value: missingTables.length, label: 'Missing Tables', color: colors.warning },
            ].map((stat) => (
              <div 
                key={stat.label}
                className="rounded-xl border p-4 text-center"
                style={{ backgroundColor: alpha(colors.card, 50), borderColor: colors.border }}
              >
                <stat.icon className="w-6 h-6 mx-auto mb-2" style={{ color: stat.color }} />
                <div className="text-2xl font-bold" style={{ color: colors.text }}>{stat.value}</div>
                <div className="text-xs" style={{ color: colors.textMuted }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Generator Buttons */}
          <div 
            className="rounded-xl border p-6"
            style={{ backgroundColor: alpha(colors.card, 50), borderColor: colors.border }}
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold" style={{ color: colors.text }}>Generate Outputs</h3>
              <p className="text-sm" style={{ color: colors.textMuted }}>Click to generate schema artifacts</p>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {[
                { type: 'prisma', icon: Code, label: 'Prisma' },
                { type: 'erd', icon: GitBranch, label: 'ERD' },
                { type: 'docs', icon: FileChartColumn, label: 'Docs' },
                { type: 'uat', icon: TestTube, label: 'UAT' },
                { type: 'flow', icon: FileSpreadsheet, label: 'Flow' },
              ].map((gen) => (
                <Button 
                  key={gen.type}
                  onClick={() => generateOutput(gen.type as any)}
                  disabled={isGenerating !== null}
                  className="h-auto py-3 flex-col"
                  style={{ 
                    backgroundColor: activeOutput === gen.type ? colors.primary : alpha(colors.bgTertiary, 80)
                  }}
                >
                  <gen.icon className="w-5 h-5 mb-1" />
                  <span className="text-sm">{gen.label}</span>
                  {isGenerating === gen.type && <RefreshCw className="w-3 h-3 mt-1 animate-spin" />}
                </Button>
              ))}
            </div>
          </div>

          {/* Generated Output */}
          {generatedOutputs.length > 0 && (
            <div 
              className="rounded-xl border p-6"
              style={{ backgroundColor: alpha(colors.card, 50), borderColor: colors.border }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: colors.text }}>
                    {generatedOutputs.find(o => o.type === activeOutput)?.title || 'Output'}
                  </h3>
                  <p className="text-sm" style={{ color: colors.textMuted }}>
                    Generated {activeOutput?.toUpperCase()} output
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => copyToClipboard(activeOutput!)}
                    style={{ borderColor: colors.border, color: colors.text }}
                  >
                    {generatedOutputs.find(o => o.type === activeOutput)?.copied ? (
                      <>
                        <Check className="w-4 h-4 mr-1" style={{ color: colors.success }} />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => downloadOutput(activeOutput!)}
                    style={{ borderColor: colors.border, color: colors.text }}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
              {/* Render output based on type */}
              {(activeOutput === 'erd' || activeOutput === 'flow') ? (
                <div className="rounded-lg overflow-auto max-h-[500px]" style={{ backgroundColor: colors.bg }}>
                  <MermaidRenderer 
                    chart={generatedOutputs.find(o => o.type === activeOutput)?.content || ''} 
                    className="p-4"
                  />
                </div>
              ) : (
                <pre 
                  className="rounded-lg p-4 overflow-auto max-h-[400px] text-sm font-mono"
                  style={{ 
                    backgroundColor: colors.bg,
                    color: colors.textSecondary 
                  }}
                >
                  {generatedOutputs.find(o => o.type === activeOutput)?.content}
                </pre>
              )}
            </div>
          )}

          {/* Missing Tables */}
          {missingTables.length > 0 && (
            <div 
              className="rounded-xl border p-6"
              style={{ 
                backgroundColor: alpha(colors.card, 50),
                borderColor: alpha(colors.warning, 30)
              }}
            >
              <div className="mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: colors.text }}>
                  <AlertTriangle className="w-5 h-5" style={{ color: colors.warning }} />
                  Missing Tables ({missingTables.length})
                </h3>
                <p className="text-sm" style={{ color: colors.textMuted }}>
                  Tables referenced by foreign keys but not defined in schema
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {missingTables.map((table) => (
                  <div 
                    key={table}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ 
                      backgroundColor: alpha(colors.bgTertiary, 30),
                      border: `1px solid ${alpha(colors.warning, 20)}`
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4" style={{ color: colors.warning }} />
                      <span className="font-medium" style={{ color: colors.text }}>{table}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Parsed Tables */}
          <div 
            className="rounded-xl border p-6"
            style={{ backgroundColor: alpha(colors.card, 50), borderColor: colors.border }}
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: colors.text }}>
                <Database className="w-5 h-5" style={{ color: colors.accent }} />
                Parsed Tables ({parseResult.tables.length})
              </h3>
            </div>
            <div className="space-y-3">
              {parseResult.tables.map((table, index) => {
                const status = getTableStatus(table)
                // Use schemaName + tableName for unique key, fallback to index
                const uniqueKey = table.schemaName 
                  ? `${table.schemaName}.${table.tableName}` 
                  : `${table.tableName}_${index}`
                return (
                  <div 
                    key={uniqueKey} 
                    className="rounded-lg overflow-hidden"
                    style={{ backgroundColor: alpha(colors.bgTertiary, 20) }}
                  >
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer"
                      style={{ backgroundColor: alpha(colors.bgTertiary, 10) }}
                      onClick={() => setExpandedTable(expandedTable === table.tableName ? null : table.tableName)}
                    >
                      <div className="flex items-center gap-3">
                        {expandedTable === table.tableName ? (
                          <ChevronDown className="w-4 h-4" style={{ color: colors.textMuted }} />
                        ) : (
                          <ChevronRight className="w-4 h-4" style={{ color: colors.textMuted }} />
                        )}
                        <Database className="w-4 h-4" style={{ color: colors.accent }} />
                        <span className="font-medium" style={{ color: colors.text }}>{table.tableName}</span>
                        {getStatusBadge(status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm" style={{ color: colors.textMuted }}>
                        <span>{table.columns.length} cols</span>
                        <span>{table.foreignKeys.length} FKs</span>
                      </div>
                    </div>
                    
                    {expandedTable === table.tableName && (
                      <div className="border-t p-4" style={{ borderColor: colors.border }}>
                        <div className="grid grid-cols-2 gap-6">
                          {/* Columns */}
                          <div>
                            <h4 className="text-sm font-medium mb-3" style={{ color: colors.textSecondary }}>Columns</h4>
                            <div className="space-y-1 max-h-[200px] overflow-auto">
                              {table.columns.map((col) => (
                                <div 
                                  key={col.name}
                                  className="flex items-center justify-between py-1.5 px-2 rounded text-sm"
                                  style={{ backgroundColor: alpha(colors.bg, 50) }}
                                >
                                  <div className="flex items-center gap-2">
                                    {col.isPrimaryKey && <span style={{ color: colors.warning }}>🔑</span>}
                                    {table.foreignKeys.some(fk => fk.columnName === col.name) && (
                                      <span style={{ color: colors.accent }}>🔗</span>
                                    )}
                                    <span style={{ color: colors.text }}>{col.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs" style={{ color: colors.primary }}>
                                      {col.dataType}{col.maxLength ? `(${col.maxLength})` : ''}
                                    </span>
                                    {!col.nullable && <span className="text-xs" style={{ color: colors.error }}>NOT NULL</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Foreign Keys */}
                          <div>
                            <h4 className="text-sm font-medium mb-3" style={{ color: colors.textSecondary }}>Foreign Keys</h4>
                            {table.foreignKeys.length > 0 ? (
                              <div className="space-y-1">
                                {table.foreignKeys.map((fk) => {
                                  const isResolved = parseResult.tables.some(t => t.tableName === fk.referencesTable)
                                  return (
                                    <div 
                                      key={fk.columnName}
                                      className="flex items-center justify-between py-1.5 px-2 rounded text-sm"
                                      style={{ backgroundColor: alpha(colors.bg, 50) }}
                                    >
                                      <span style={{ color: colors.text }}>{fk.columnName}</span>
                                      <div className="flex items-center gap-2">
                                        <span style={{ color: colors.textMuted }}>→</span>
                                        <span style={{ color: isResolved ? colors.success : colors.warning }}>
                                          {fk.referencesTable}.{fk.referencesColumn}
                                        </span>
                                        {isResolved ? (
                                          <CheckCircle2 className="w-4 h-4" style={{ color: colors.success }} />
                                        ) : (
                                          <AlertTriangle className="w-4 h-4" style={{ color: colors.warning }} />
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <p className="text-sm" style={{ color: colors.textMuted }}>No foreign keys</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Errors and Warnings */}
          {(parseResult.errors.length > 0 || parseResult.warnings.length > 0) && (
            <div 
              className="rounded-xl border p-6"
              style={{ 
                backgroundColor: alpha(colors.card, 50),
                borderColor: alpha(colors.error, 30)
              }}
            >
              <div className="mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: colors.text }}>
                  <AlertTriangle className="w-5 h-5" style={{ color: colors.error }} />
                  Issues ({parseResult.errors.length + parseResult.warnings.length})
                </h3>
              </div>
              <div className="space-y-2">
                {parseResult.errors.map((error, i) => (
                  <div 
                    key={`error-${i}`} 
                    className="flex items-center gap-2 text-sm p-2 rounded"
                    style={{ 
                      backgroundColor: alpha(colors.error, 10),
                      color: colors.error 
                    }}
                  >
                    <XCircle className="w-4 h-4" />
                    {error}
                  </div>
                ))}
                {parseResult.warnings.map((warning, i) => (
                  <div 
                    key={`warning-${i}`} 
                    className="flex items-center gap-2 text-sm p-2 rounded"
                    style={{ 
                      backgroundColor: alpha(colors.warning, 10),
                      color: colors.warning 
                    }}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    {warning}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
