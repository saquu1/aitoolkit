'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useSchema, ActiveProject } from '@/hooks/useSchema'
import { useTheme } from '@/hooks/useTheme'
import {
  Play,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  FileCode,
  Database,
  Clock,
  Undo2,
  Trash2,
  Download,
  Copy,
  ChevronRight,
  ChevronDown,
  Table2,
  Key,
  Columns,
  GitBranch,
  History,
  Sparkles,
  Upload
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface ParsedColumn {
  name: string
  dataType: string
  isNullable: boolean
  isPrimaryKey: boolean
  isIdentity: boolean
  defaultValue?: string
}

interface ParsedForeignKey {
  columnName: string
  referencesTable: string
  referencesColumn: string
}

interface ParsedTable {
  name: string
  columns: ParsedColumn[]
  foreignKeys: ParsedForeignKey[]
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  tables: string[]
}

interface PreviewData {
  tables: ParsedTable[]
  totalTables: number
  totalColumns: number
  totalForeignKeys: number
  warnings: string[]
  errors: string[]
  validation: ValidationResult
  migrationPreview: string
  canApply: boolean
}

interface SchemaApplyRecord {
  id: string
  projectId: string
  name: string
  schemaType: string
  schemaContent: string
  status: string
  appliedAt: string | null
  rolledBackAt: string | null
  error: string | null
  createdAt: string
  updatedAt: string
}

interface SchemaApplyTabProps {
  projectId?: string
  onApplyComplete?: () => void
}

// ============================================================================
// Sample Schemas
// ============================================================================

const SAMPLE_SQL = `-- Sample SQL DDL Schema
CREATE TABLE Users (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Email NVARCHAR(255) NOT NULL UNIQUE,
    FirstName NVARCHAR(100),
    LastName NVARCHAR(100),
    CreatedAt DATETIME DEFAULT GETDATE(),
    IsActive BIT DEFAULT 1
);

CREATE TABLE Posts (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Title NVARCHAR(255) NOT NULL,
    Content NVARCHAR(MAX),
    AuthorId INT NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (AuthorId) REFERENCES Users(Id)
);`

const SAMPLE_PRISMA = `// Sample Prisma Schema
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  firstName String?
  lastName  String?
  createdAt DateTime @default(now())
  isActive  Boolean  @default(true)
  posts     Post[]
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  authorId  Int
  createdAt DateTime @default(now())
  author    User     @relation(fields: [authorId], references: [id])
}`

// ============================================================================
// Component
// ============================================================================

export function SchemaApplyTab({ projectId, onApplyComplete }: SchemaApplyTabProps) {
  const { activeProject, setActiveProject, availableProjects } = useSchema()
  const { colors } = useTheme()
  
  // State
  const [schemaContent, setSchemaContent] = useState('')
  const [schemaType, setSchemaType] = useState<'sql' | 'prisma'>('sql')
  const [schemaName, setSchemaName] = useState('')
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [history, setHistory] = useState<SchemaApplyRecord[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [expandedTable, setExpandedTable] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [activeTab, setActiveTab] = useState('editor')

  const effectiveProjectId = projectId || activeProject?.id

  // Load history on mount
  useEffect(() => {
    if (effectiveProjectId) {
      loadHistory()
    }
  }, [effectiveProjectId])

  // Load history from API
  const loadHistory = async () => {
    if (!effectiveProjectId) return
    
    setIsLoadingHistory(true)
    try {
      const response = await fetch(`/api/schema-apply?action=list&projectId=${effectiveProjectId}`)
      const data = await response.json()
      
      if (data.success) {
        setHistory(data.applies || [])
      }
    } catch (error) {
      console.error('Failed to load history:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // Preview schema
  const handlePreview = async () => {
    if (!schemaContent.trim()) {
      return
    }

    setIsValidating(true)
    setPreview(null)

    try {
      const response = await fetch('/api/schema-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          schemaContent,
          schemaType
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setPreview(data.preview)
        setActiveTab('preview')
      } else {
        setPreview({
          tables: [],
          totalTables: 0,
          totalColumns: 0,
          totalForeignKeys: 0,
          warnings: [],
          errors: [data.error || 'Preview failed'],
          validation: { isValid: false, errors: [data.error || 'Preview failed'], warnings: [], tables: [] },
          migrationPreview: '',
          canApply: false
        })
      }
    } catch (error) {
      console.error('Preview error:', error)
      setPreview({
        tables: [],
        totalTables: 0,
        totalColumns: 0,
        totalForeignKeys: 0,
        warnings: [],
        errors: ['Failed to preview schema'],
        validation: { isValid: false, errors: ['Failed to preview schema'], warnings: [], tables: [] },
        migrationPreview: '',
        canApply: false
      })
    } finally {
      setIsValidating(false)
    }
  }

  // Apply schema
  const handleApply = async () => {
    if (!effectiveProjectId || !schemaContent.trim() || !schemaName.trim()) {
      return
    }

    setIsApplying(true)
    setShowConfirmDialog(false)

    try {
      const response = await fetch('/api/schema-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply',
          projectId: effectiveProjectId,
          schemaContent,
          schemaType,
          name: schemaName
        })
      })

      const data = await response.json()
      
      if (data.success) {
        // Clear form
        setSchemaContent('')
        setSchemaName('')
        setPreview(null)
        
        // Refresh history
        await loadHistory()
        
        // Notify parent
        onApplyComplete?.()
      } else {
        console.error('Apply failed:', data.error)
      }
    } catch (error) {
      console.error('Apply error:', error)
    } finally {
      setIsApplying(false)
    }
  }

  // Rollback schema
  const handleRollback = async (id: string) => {
    try {
      const response = await fetch('/api/schema-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'rollback',
          id
        })
      })

      const data = await response.json()
      
      if (data.success) {
        await loadHistory()
        onApplyComplete?.()
      }
    } catch (error) {
      console.error('Rollback error:', error)
    }
  }

  // Delete schema apply
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch('/api/schema-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          id
        })
      })

      const data = await response.json()
      
      if (data.success) {
        await loadHistory()
      }
    } catch (error) {
      console.error('Delete error:', error)
    }
  }

  // Load sample schema
  const loadSample = () => {
    setSchemaContent(schemaType === 'sql' ? SAMPLE_SQL : SAMPLE_PRISMA)
    setSchemaName('Sample Schema')
  }

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Pending</Badge>
      case 'applied':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Applied</Badge>
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Failed</Badge>
      case 'rolled_back':
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">Rolled Back</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: colors.text }}>Schema Apply</h2>
          <p className="mt-1" style={{ color: colors.textMuted }}>
            Parse and apply SQL DDL or Prisma schemas to your project
          </p>
        </div>
        {history.length > 0 && (
          <Badge variant="outline" style={{ borderColor: colors.border, color: colors.textMuted }}>
            <History className="w-3 h-3 mr-1" />
            {history.length} Applied
          </Badge>
        )}
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="editor">
            <FileCode className="w-4 h-4 mr-2" />
            Editor
          </TabsTrigger>
          <TabsTrigger value="preview" disabled={!preview}>
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-4 h-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Editor Tab */}
        <TabsContent value="editor" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Editor */}
            <div className="lg:col-span-2 space-y-4">
              <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label style={{ color: colors.text }}>Schema Name</Label>
                      <Input
                        value={schemaName}
                        onChange={(e) => setSchemaName(e.target.value)}
                        placeholder="Enter schema name..."
                        style={{ 
                          backgroundColor: colors.inputBg, 
                          borderColor: colors.inputBorder,
                          color: colors.inputText 
                        }}
                        className="max-w-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={schemaType} onValueChange={(v) => setSchemaType(v as 'sql' | 'prisma')}>
                        <SelectTrigger className="w-32" style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sql">SQL DDL</SelectItem>
                          <SelectItem value="prisma">Prisma</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={loadSample}
                        style={{ borderColor: colors.border, color: colors.textMuted }}
                      >
                        <Sparkles className="w-4 h-4 mr-1" />
                        Sample
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={schemaContent}
                    onChange={(e) => setSchemaContent(e.target.value)}
                    placeholder={schemaType === 'sql' 
                      ? '-- Paste your SQL DDL here...\nCREATE TABLE Example (\n    Id INT PRIMARY KEY,\n    Name NVARCHAR(100)\n);'
                      : '// Paste your Prisma schema here...\nmodel Example {\n  id   Int    @id @default(autoincrement())\n  name String\n}'
                    }
                    className="min-h-[400px] font-mono text-sm"
                    style={{ 
                      backgroundColor: colors.inputBg, 
                      borderColor: colors.inputBorder,
                      color: colors.inputText 
                    }}
                  />
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={handlePreview}
                  disabled={!schemaContent.trim() || isValidating}
                  style={{ backgroundColor: colors.primary, color: '#fff' }}
                >
                  {isValidating ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="w-4 h-4 mr-2" />
                  )}
                  Preview
                </Button>
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(schemaContent)}
                  disabled={!schemaContent.trim()}
                  style={{ borderColor: colors.border, color: colors.textMuted }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSchemaContent('')}
                  disabled={!schemaContent.trim()}
                  style={{ borderColor: colors.border, color: colors.textMuted }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              </div>
            </div>

            {/* Right: Quick Stats */}
            <div className="space-y-4">
              <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <CardHeader>
                  <CardTitle className="text-lg" style={{ color: colors.text }}>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span style={{ color: colors.textMuted }}>Schema Type</span>
                    <Badge variant="outline" style={{ borderColor: colors.border, color: colors.text }}>
                      {schemaType.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: colors.textMuted }}>Lines</span>
                    <span style={{ color: colors.text }}>{schemaContent.split('\n').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: colors.textMuted }}>Characters</span>
                    <span style={{ color: colors.text }}>{schemaContent.length.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>

              <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <CardHeader>
                  <CardTitle className="text-lg" style={{ color: colors.text }}>How to Use</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm" style={{ color: colors.textMuted }}>
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" 
                         style={{ backgroundColor: colors.primary, color: '#fff' }}>1</div>
                    <span>Paste your schema or load a sample</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" 
                         style={{ backgroundColor: colors.primary, color: '#fff' }}>2</div>
                    <span>Click Preview to see parsed tables</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" 
                         style={{ backgroundColor: colors.primary, color: '#fff' }}>3</div>
                    <span>Review and apply changes</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          {preview && (
            <>
              {/* Validation Status */}
              <Card style={{ 
                backgroundColor: preview.canApply ? `${colors.success}10` : `${colors.error}10`,
                borderColor: preview.canApply ? `${colors.success}30` : `${colors.error}30`
              }}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {preview.canApply ? (
                      <CheckCircle2 className="w-6 h-6" style={{ color: colors.success }} />
                    ) : (
                      <XCircle className="w-6 h-6" style={{ color: colors.error }} />
                    )}
                    <div>
                      <div className="font-medium" style={{ color: preview.canApply ? colors.success : colors.error }}>
                        {preview.canApply ? 'Schema is valid and ready to apply' : 'Schema has validation errors'}
                      </div>
                      {preview.validation.errors.length > 0 && (
                        <div className="text-sm mt-1" style={{ color: colors.error }}>
                          {preview.validation.errors.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stats Cards */}
              <div className="grid grid-cols-4 gap-4">
                <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                  <CardContent className="p-4 text-center">
                    <Table2 className="w-6 h-6 mx-auto mb-2" style={{ color: colors.primary }} />
                    <div className="text-2xl font-bold" style={{ color: colors.text }}>{preview.totalTables}</div>
                    <div className="text-xs" style={{ color: colors.textMuted }}>Tables</div>
                  </CardContent>
                </Card>
                <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                  <CardContent className="p-4 text-center">
                    <Columns className="w-6 h-6 mx-auto mb-2" style={{ color: colors.accent }} />
                    <div className="text-2xl font-bold" style={{ color: colors.text }}>{preview.totalColumns}</div>
                    <div className="text-xs" style={{ color: colors.textMuted }}>Columns</div>
                  </CardContent>
                </Card>
                <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                  <CardContent className="p-4 text-center">
                    <GitBranch className="w-6 h-6 mx-auto mb-2" style={{ color: colors.warning }} />
                    <div className="text-2xl font-bold" style={{ color: colors.text }}>{preview.totalForeignKeys}</div>
                    <div className="text-xs" style={{ color: colors.textMuted }}>Foreign Keys</div>
                  </CardContent>
                </Card>
                <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                  <CardContent className="p-4 text-center">
                    {preview.warnings.length > 0 ? (
                      <AlertTriangle className="w-6 h-6 mx-auto mb-2" style={{ color: colors.warning }} />
                    ) : (
                      <CheckCircle2 className="w-6 h-6 mx-auto mb-2" style={{ color: colors.success }} />
                    )}
                    <div className="text-2xl font-bold" style={{ color: colors.text }}>{preview.warnings.length}</div>
                    <div className="text-xs" style={{ color: colors.textMuted }}>Warnings</div>
                  </CardContent>
                </Card>
              </div>

              {/* Warnings */}
              {preview.warnings.length > 0 && (
                <Card style={{ backgroundColor: `${colors.warning}10`, borderColor: `${colors.warning}30` }}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 mt-0.5" style={{ color: colors.warning }} />
                      <div>
                        <div className="font-medium" style={{ color: colors.warning }}>Warnings</div>
                        <ul className="text-sm mt-1 space-y-1" style={{ color: colors.textMuted }}>
                          {preview.warnings.map((w, i) => (
                            <li key={i}>• {w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tables Preview */}
              <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <CardHeader>
                  <CardTitle style={{ color: colors.text }}>Parsed Tables</CardTitle>
                  <CardDescription style={{ color: colors.textMuted }}>
                    Click on a table to see column details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {preview.tables.map((table) => (
                      <div key={table.name} className="rounded-lg overflow-hidden" style={{ backgroundColor: colors.bgSecondary }}>
                        <div
                          className="flex items-center justify-between p-3 cursor-pointer hover:opacity-80"
                          onClick={() => setExpandedTable(expandedTable === table.name ? null : table.name)}
                        >
                          <div className="flex items-center gap-2">
                            {expandedTable === table.name ? (
                              <ChevronDown className="w-4 h-4" style={{ color: colors.textMuted }} />
                            ) : (
                              <ChevronRight className="w-4 h-4" style={{ color: colors.textMuted }} />
                            )}
                            <Table2 className="w-4 h-4" style={{ color: colors.primary }} />
                            <span className="font-medium" style={{ color: colors.text }}>{table.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm" style={{ color: colors.textMuted }}>
                            <span>{table.columns.length} columns</span>
                            {table.foreignKeys.length > 0 && (
                              <Badge variant="outline" className="text-xs" style={{ borderColor: colors.border }}>
                                {table.foreignKeys.length} FKs
                              </Badge>
                            )}
                          </div>
                        </div>

                        {expandedTable === table.name && (
                          <div className="border-t p-3 space-y-3" style={{ borderColor: colors.border }}>
                            {/* Columns */}
                            <div>
                              <div className="text-xs font-medium mb-2" style={{ color: colors.textMuted }}>COLUMNS</div>
                              <div className="grid gap-1">
                                {table.columns.map((col) => (
                                  <div key={col.name} className="flex items-center justify-between text-sm p-2 rounded" style={{ backgroundColor: colors.bg }}>
                                    <div className="flex items-center gap-2">
                                      {col.isPrimaryKey && <Key className="w-3 h-3" style={{ color: colors.warning }} />}
                                      <span style={{ color: colors.text }}>{col.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs" style={{ borderColor: colors.border, color: colors.textMuted }}>
                                        {col.dataType}
                                      </Badge>
                                      <div className="flex gap-1">
                                        {col.isPrimaryKey && (
                                          <Badge className="text-xs bg-amber-500/20 text-amber-400">PK</Badge>
                                        )}
                                        {!col.isNullable && (
                                          <Badge className="text-xs bg-red-500/20 text-red-400">NOT NULL</Badge>
                                        )}
                                        {col.isIdentity && (
                                          <Badge className="text-xs bg-blue-500/20 text-blue-400">IDENTITY</Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Foreign Keys */}
                            {table.foreignKeys.length > 0 && (
                              <div>
                                <div className="text-xs font-medium mb-2" style={{ color: colors.textMuted }}>FOREIGN KEYS</div>
                                <div className="space-y-1">
                                  {table.foreignKeys.map((fk, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm p-2 rounded" style={{ backgroundColor: colors.bg }}>
                                      <GitBranch className="w-3 h-3" style={{ color: colors.warning }} />
                                      <span style={{ color: colors.text }}>{fk.columnName}</span>
                                      <span style={{ color: colors.textMuted }}>→</span>
                                      <span style={{ color: colors.primary }}>{fk.referencesTable}</span>
                                      <span style={{ color: colors.textMuted }}>({fk.referencesColumn})</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={!preview.canApply || !schemaName.trim() || !effectiveProjectId}
                  style={{ backgroundColor: colors.success, color: '#fff' }}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Apply Schema
                </Button>
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(preview.migrationPreview)}
                  style={{ borderColor: colors.border, color: colors.textMuted }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Preview
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('editor')}
                  style={{ borderColor: colors.border, color: colors.textMuted }}
                >
                  Back to Editor
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle style={{ color: colors.text }}>Applied Schemas</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadHistory}
                  disabled={isLoadingHistory}
                  style={{ borderColor: colors.border, color: colors.textMuted }}
                >
                  {isLoadingHistory ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin" style={{ color: colors.textMuted }} />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8">
                  <History className="w-12 h-12 mx-auto mb-3" style={{ color: colors.textMuted }} />
                  <p style={{ color: colors.textMuted }}>No schemas applied yet</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {history.map((apply) => (
                    <div key={apply.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: colors.bgSecondary }}>
                      <div className="flex items-center gap-3">
                        <Database className="w-5 h-5" style={{ color: colors.primary }} />
                        <div>
                          <div className="font-medium" style={{ color: colors.text }}>{apply.name}</div>
                          <div className="flex items-center gap-2 text-xs" style={{ color: colors.textMuted }}>
                            <Badge variant="outline" className="text-xs" style={{ borderColor: colors.border }}>
                              {apply.schemaType.toUpperCase()}
                            </Badge>
                            <span>•</span>
                            <span>{formatDate(apply.createdAt)}</span>
                            {apply.appliedAt && (
                              <>
                                <span>•</span>
                                <span>Applied: {formatDate(apply.appliedAt)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(apply.status)}
                        {apply.status === 'applied' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRollback(apply.id)}
                            style={{ borderColor: colors.border, color: colors.textMuted }}
                          >
                            <Undo2 className="w-3 h-3 mr-1" />
                            Rollback
                          </Button>
                        )}
                        {apply.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(apply.id)}
                            style={{ borderColor: colors.error, color: colors.error }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: colors.text }}>Apply Schema</AlertDialogTitle>
            <AlertDialogDescription style={{ color: colors.textMuted }}>
              Are you sure you want to apply this schema? This will create or update {preview?.totalTables || 0} tables 
              with {preview?.totalColumns || 0} columns.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ backgroundColor: colors.bgSecondary, borderColor: colors.border, color: colors.text }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApply}
              disabled={isApplying}
              style={{ backgroundColor: colors.success, color: '#fff' }}
            >
              {isApplying ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {isApplying ? 'Applying...' : 'Apply'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
