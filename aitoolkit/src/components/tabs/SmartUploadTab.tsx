'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { useSchema } from '@/hooks/useSchema'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
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
  ArrowRight,
  ChevronDown,
  ChevronRight,
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
  Wand2
} from 'lucide-react'
import {
  SmartWorkflowEngine,
  SmartUploadWorkflow,
  MissingDependency,
  DependencyMap,
  DatabaseDependency
} from '@/lib/dependency-intelligence'

interface SmartUploadTabProps {
  onNavigate?: (tab: string) => void
}

type UploadPhase = 'cshtml_upload' | 'dependency_analysis' | 'guided_upload' | 'validation' | 'complete'

export function SmartUploadTab({ onNavigate }: SmartUploadTabProps) {
  const { colors } = useTheme()
  const { setParsedSchema, setRawSQL } = useSchema()
  
  const [phase, setPhase] = useState<UploadPhase>('cshtml_upload')
  const [cshtmlFiles, setCSHTMLFiles] = useState<File[]>([])
  const [sqlFiles, setSQLFiles] = useState<File[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [dependencyMap, setDependencyMap] = useState<DependencyMap | null>(null)
  const [missingDeps, setMissingDeps] = useState<MissingDependency[]>([])
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    tables: true,
    columns: true,
    fkLookups: true,
    suggestions: true
  })
  const [dragOverCSHTML, setDragOverCSHTML] = useState(false)
  const [dragOverSQL, setDragOverSQL] = useState(false)

  // Handle CSHTML file upload
  const handleCSHTMLUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    
    const fileArray = Array.from(files).filter(f => 
      f.name.endsWith('.cshtml') || f.name.endsWith('.vbhtml')
    )
    
    if (fileArray.length === 0) {
      alert('Please upload CSHTML or VBHTML files')
      return
    }
    
    setCSHTMLFiles(prev => [...prev, ...fileArray])
    setIsAnalyzing(true)
    
    // Read and analyze files
    const fileContents = await Promise.all(
      fileArray.map(async (file) => ({
        name: file.name,
        content: await file.text()
      }))
    )
    
    // Use workflow engine
    const engine = new SmartWorkflowEngine()
    const workflow = engine.processCSHTMLUpload(fileContents)
    
    setDependencyMap(workflow.dependencyMap)
    setMissingDeps(workflow.missingDependencies)
    setPhase('guided_upload')
    setIsAnalyzing(false)
  }, [])

  // Handle SQL file upload
  const handleSQLUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    
    const fileArray = Array.from(files).filter(f => 
      f.name.endsWith('.sql') || f.name.endsWith('.txt')
    )
    
    if (fileArray.length === 0) {
      alert('Please upload SQL files')
      return
    }
    
    setSQLFiles(prev => [...prev, ...fileArray])
    
    // Read and process files
    const fileContents = await Promise.all(
      fileArray.map(async (file) => ({
        name: file.name,
        content: await file.text()
      }))
    )
    
    // Combine all SQL content
    const combinedSQL = fileContents.map(f => f.content).join('\n\n')
    setRawSQL(combinedSQL)
    
    // Parse SQL using existing parser
    const { parseSQL } = await import('@/lib/sql-parser')
    const result = parseSQL(combinedSQL)
    setParsedSchema(result.tables)
    
    // Re-analyze dependencies
    if (dependencyMap) {
      const { MissingDependencyAnalyzer } = await import('@/lib/dependency-intelligence')
      const analyzer = new MissingDependencyAnalyzer()
      const updated = analyzer.analyze(dependencyMap, result)
      setMissingDeps(updated)
      
      if (updated.length === 0) {
        setPhase('complete')
      }
    }
  }, [dependencyMap, setParsedSchema, setRawSQL])

  // Remove file
  const removeFile = (type: 'cshtml' | 'sql', index: number) => {
    if (type === 'cshtml') {
      setCSHTMLFiles(prev => prev.filter((_, i) => i !== index))
    } else {
      setSQLFiles(prev => prev.filter((_, i) => i !== index))
    }
  }

  // Toggle section
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return colors.error
      case 'high': return colors.warning
      case 'medium': return colors.primary
      case 'low': return colors.textMuted
      default: return colors.textMuted
    }
  }

  // Calculate progress
  const calculateProgress = () => {
    if (!dependencyMap) return 0
    const stats = dependencyMap.statistics
    return stats.completionPercentage
  }

  // Get phase info
  const getPhaseInfo = () => {
    switch (phase) {
      case 'cshtml_upload':
        return { step: 1, title: 'Upload CSHTML Files', description: 'Start by uploading your ASP.NET views' }
      case 'dependency_analysis':
        return { step: 2, title: 'Analyzing Dependencies', description: 'Extracting database requirements...' }
      case 'guided_upload':
        return { step: 3, title: 'Resolve Dependencies', description: 'Upload SQL for missing tables' }
      case 'validation':
        return { step: 4, title: 'Validating', description: 'Checking all dependencies are resolved' }
      case 'complete':
        return { step: 5, title: 'Complete!', description: 'All dependencies resolved successfully' }
    }
  }

  const phaseInfo = getPhaseInfo()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: colors.text }}>
            Smart Upload Workflow
          </h2>
          <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
            CSHTML-first approach: Upload views, get guided on required SQL
          </p>
        </div>
        <div 
          className="flex items-center gap-2 px-4 py-2 rounded-lg"
          style={{ 
            backgroundColor: `color-mix(in srgb, ${colors.primary} 10%, transparent)`,
          }}
        >
          <Brain className="w-5 h-5" style={{ color: colors.primary }} />
          <span className="text-sm font-medium" style={{ color: colors.primary }}>
            AI-Powered Analysis
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div 
        className="p-4 rounded-xl border"
        style={{ 
          backgroundColor: colors.card,
          borderColor: `color-mix(in srgb, ${colors.border} 50%, transparent)`
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ 
                backgroundColor: `color-mix(in srgb, ${colors.primary} 15%, transparent)`,
                color: colors.primary
              }}
            >
              {phaseInfo.step}
            </div>
            <div>
              <div className="font-medium" style={{ color: colors.text }}>{phaseInfo.title}</div>
              <div className="text-xs" style={{ color: colors.textMuted }}>{phaseInfo.description}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold" style={{ color: colors.primary }}>
              {calculateProgress()}%
            </div>
            <div className="text-xs" style={{ color: colors.textMuted }}>Complete</div>
          </div>
        </div>
        <Progress value={calculateProgress()} className="h-2" />
        
        {/* Phase indicators */}
        <div className="flex justify-between mt-4">
          {['Upload', 'Analyze', 'Resolve', 'Validate', 'Complete'].map((label, i) => (
            <div 
              key={label}
              className="flex flex-col items-center"
            >
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                style={{ 
                  backgroundColor: i + 1 <= phaseInfo.step 
                    ? `color-mix(in srgb, ${colors.primary} 20%, transparent)`
                    : `color-mix(in srgb, ${colors.border} 30%, transparent)`,
                  color: i + 1 <= phaseInfo.step ? colors.primary : colors.textMuted
                }}
              >
                {i + 1 < phaseInfo.step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className="text-xs mt-1" style={{ color: colors.textMuted }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: CSHTML Upload */}
        <div 
          className="rounded-xl border p-6"
          style={{ 
            backgroundColor: colors.card,
            borderColor: `color-mix(in srgb, ${colors.border} 50%, transparent)`
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <FileCode className="w-5 h-5" style={{ color: colors.accent }} />
            <h3 className="font-semibold" style={{ color: colors.text }}>1. CSHTML Views</h3>
            {cshtmlFiles.length > 0 && (
              <span 
                className="ml-auto text-xs px-2 py-1 rounded-full"
                style={{ 
                  backgroundColor: `color-mix(in srgb, ${colors.accent} 15%, transparent)`,
                  color: colors.accent
                }}
              >
                {cshtmlFiles.length} file(s)
              </span>
            )}
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOverCSHTML(true) }}
            onDragLeave={() => setDragOverCSHTML(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOverCSHTML(false)
              handleCSHTMLUpload(e.dataTransfer.files)
            }}
            onClick={() => document.getElementById('cshtml-input')?.click()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
              ${dragOverCSHTML ? 'scale-105' : ''}
            `}
            style={{ 
              borderColor: dragOverCSHTML ? colors.accent : `color-mix(in srgb, ${colors.border} 50%, transparent)`,
              backgroundColor: dragOverCSHTML 
                ? `color-mix(in srgb, ${colors.accent} 10%, transparent)`
                : 'transparent'
            }}
          >
            <input
              id="cshtml-input"
              type="file"
              multiple
              accept=".cshtml,.vbhtml"
              className="hidden"
              onChange={(e) => handleCSHTMLUpload(e.target.files)}
            />
            <Upload className="w-10 h-10 mx-auto mb-3" style={{ color: colors.textMuted }} />
            <p className="font-medium" style={{ color: colors.text }}>
              Drop CSHTML files here
            </p>
            <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
              or click to browse (.cshtml, .vbhtml)
            </p>
          </div>

          {/* Uploaded Files */}
          {cshtmlFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              {cshtmlFiles.map((file, i) => (
                <div 
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ backgroundColor: `color-mix(in srgb, ${colors.accent} 5%, transparent)` }}
                >
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4" style={{ color: colors.accent }} />
                    <span className="text-sm" style={{ color: colors.text }}>{file.name}</span>
                    <span className="text-xs" style={{ color: colors.textMuted }}>
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    onClick={() => removeFile('cshtml', i)}
                    className="p-1 rounded hover:bg-opacity-50"
                    style={{ color: colors.textMuted }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: SQL Upload */}
        <div 
          className="rounded-xl border p-6"
          style={{ 
            backgroundColor: colors.card,
            borderColor: `color-mix(in srgb, ${colors.border} 50%, transparent)`
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-5 h-5" style={{ color: colors.success }} />
            <h3 className="font-semibold" style={{ color: colors.text }}>2. SQL DDL Scripts</h3>
            {sqlFiles.length > 0 && (
              <span 
                className="ml-auto text-xs px-2 py-1 rounded-full"
                style={{ 
                  backgroundColor: `color-mix(in srgb, ${colors.success} 15%, transparent)`,
                  color: colors.success
                }}
              >
                {sqlFiles.length} file(s)
              </span>
            )}
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOverSQL(true) }}
            onDragLeave={() => setDragOverSQL(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOverSQL(false)
              handleSQLUpload(e.dataTransfer.files)
            }}
            onClick={() => document.getElementById('sql-input')?.click()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
              ${dragOverSQL ? 'scale-105' : ''}
            `}
            style={{ 
              borderColor: dragOverSQL ? colors.success : `color-mix(in srgb, ${colors.border} 50%, transparent)`,
              backgroundColor: dragOverSQL 
                ? `color-mix(in srgb, ${colors.success} 10%, transparent)`
                : 'transparent'
            }}
          >
            <input
              id="sql-input"
              type="file"
              multiple
              accept=".sql,.txt"
              className="hidden"
              onChange={(e) => handleSQLUpload(e.target.files)}
            />
            <Upload className="w-10 h-10 mx-auto mb-3" style={{ color: colors.textMuted }} />
            <p className="font-medium" style={{ color: colors.text }}>
              Drop SQL files here
            </p>
            <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
              or click to browse (.sql, .txt)
            </p>
          </div>

          {/* Uploaded Files */}
          {sqlFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              {sqlFiles.map((file, i) => (
                <div 
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ backgroundColor: `color-mix(in srgb, ${colors.success} 5%, transparent)` }}
                >
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4" style={{ color: colors.success }} />
                    <span className="text-sm" style={{ color: colors.text }}>{file.name}</span>
                    <span className="text-xs" style={{ color: colors.textMuted }}>
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    onClick={() => removeFile('sql', i)}
                    className="p-1 rounded hover:bg-opacity-50"
                    style={{ color: colors.textMuted }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dependency Analysis Results */}
      {dependencyMap && (
        <div 
          className="rounded-xl border p-6"
          style={{ 
            backgroundColor: colors.card,
            borderColor: `color-mix(in srgb, ${colors.border} 50%, transparent)`
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5" style={{ color: colors.primary }} />
              <h3 className="font-semibold" style={{ color: colors.text }}>Dependency Analysis</h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" style={{ color: colors.success }} />
                <span className="text-sm" style={{ color: colors.textMuted }}>
                  {dependencyMap.statistics.resolvedCount} resolved
                </span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" style={{ color: colors.warning }} />
                <span className="text-sm" style={{ color: colors.textMuted }}>
                  {dependencyMap.statistics.missingCount} missing
                </span>
              </div>
            </div>
          </div>

          {/* Detected Tables */}
          <div className="space-y-4">
            {/* Tables Section */}
            <div 
              className="rounded-lg border"
              style={{ borderColor: `color-mix(in srgb, ${colors.border} 30%, transparent)` }}
            >
              <button
                onClick={() => toggleSection('tables')}
                className="w-full flex items-center justify-between p-3"
                style={{ backgroundColor: `color-mix(in srgb, ${colors.accent} 5%, transparent)` }}
              >
                <div className="flex items-center gap-2">
                  {expandedSections.tables ? 
                    <ChevronDown className="w-4 h-4" /> : 
                    <ChevronRight className="w-4 h-4" />
                  }
                  <Table2 className="w-4 h-4" style={{ color: colors.accent }} />
                  <span className="font-medium text-sm" style={{ color: colors.text }}>
                    Tables ({dependencyMap.tables.length})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span 
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ 
                      backgroundColor: `color-mix(in srgb, ${colors.success} 15%, transparent)`,
                      color: colors.success
                    }}
                  >
                    {dependencyMap.tables.filter(t => t.status === 'resolved').length} resolved
                  </span>
                </div>
              </button>
              {expandedSections.tables && (
                <div className="p-3 border-t" style={{ borderColor: `color-mix(in srgb, ${colors.border} 30%, transparent)` }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {dependencyMap.tables.map((table, i) => (
                      <div 
                        key={i}
                        className="flex items-center justify-between p-2 rounded-lg"
                        style={{ backgroundColor: `color-mix(in srgb, ${colors.bgSecondary} 50%, transparent)` }}
                      >
                        <div className="flex items-center gap-2">
                          {table.status === 'resolved' ? 
                            <CheckCircle2 className="w-4 h-4" style={{ color: colors.success }} /> :
                            <AlertTriangle className="w-4 h-4" style={{ color: colors.warning }} />
                          }
                          <span className="text-sm" style={{ color: colors.text }}>{table.tableName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: colors.textMuted }}>
                            {table.columns.length} cols
                          </span>
                          <span 
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{ 
                              backgroundColor: `color-mix(in srgb, ${getPriorityColor(table.priority)} 15%, transparent)`,
                              color: getPriorityColor(table.priority)
                            }}
                          >
                            {table.priority}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Columns Section */}
            <div 
              className="rounded-lg border"
              style={{ borderColor: `color-mix(in srgb, ${colors.border} 30%, transparent)` }}
            >
              <button
                onClick={() => toggleSection('columns')}
                className="w-full flex items-center justify-between p-3"
                style={{ backgroundColor: `color-mix(in srgb, ${colors.primary} 5%, transparent)` }}
              >
                <div className="flex items-center gap-2">
                  {expandedSections.columns ? 
                    <ChevronDown className="w-4 h-4" /> : 
                    <ChevronRight className="w-4 h-4" />
                  }
                  <Columns3 className="w-4 h-4" style={{ color: colors.primary }} />
                  <span className="font-medium text-sm" style={{ color: colors.text }}>
                    Columns ({dependencyMap.columns.length})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span 
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ 
                      backgroundColor: `color-mix(in srgb, ${colors.success} 15%, transparent)`,
                      color: colors.success
                    }}
                  >
                    {dependencyMap.columns.filter(c => c.status === 'resolved').length} resolved
                  </span>
                </div>
              </button>
              {expandedSections.columns && (
                <div className="p-3 border-t max-h-48 overflow-y-auto" style={{ borderColor: `color-mix(in srgb, ${colors.border} 30%, transparent)` }}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
                    {dependencyMap.columns.slice(0, 30).map((col, i) => (
                      <div 
                        key={i}
                        className="flex items-center gap-2 p-1.5 rounded"
                        style={{ backgroundColor: `color-mix(in srgb, ${colors.bgSecondary} 30%, transparent)` }}
                      >
                        {col.status === 'resolved' ? 
                          <CheckCircle2 className="w-3 h-3" style={{ color: colors.success }} /> :
                          <AlertTriangle className="w-3 h-3" style={{ color: colors.warning }} />
                        }
                        <span className="text-xs" style={{ color: colors.textMuted }}>{col.tableName}.</span>
                        <span className="text-xs font-medium" style={{ color: colors.text }}>{col.columnName}</span>
                      </div>
                    ))}
                    {dependencyMap.columns.length > 30 && (
                      <div className="col-span-3 text-center py-2">
                        <span className="text-xs" style={{ color: colors.textMuted }}>
                          +{dependencyMap.columns.length - 30} more columns...
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* FK Lookups Section */}
            {dependencyMap.fkLookups.length > 0 && (
              <div 
                className="rounded-lg border"
                style={{ borderColor: `color-mix(in srgb, ${colors.border} 30%, transparent)` }}
              >
                <button
                  onClick={() => toggleSection('fkLookups')}
                  className="w-full flex items-center justify-between p-3"
                  style={{ backgroundColor: `color-mix(in srgb, ${colors.warning} 5%, transparent)` }}
                >
                  <div className="flex items-center gap-2">
                    {expandedSections.fkLookups ? 
                      <ChevronDown className="w-4 h-4" /> : 
                      <ChevronRight className="w-4 h-4" />
                    }
                    <Link2 className="w-4 h-4" style={{ color: colors.warning }} />
                    <span className="font-medium text-sm" style={{ color: colors.text }}>
                      FK Lookups ({dependencyMap.fkLookups.length})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span 
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ 
                        backgroundColor: `color-mix(in srgb, ${colors.success} 15%, transparent)`,
                        color: colors.success
                      }}
                    >
                      {dependencyMap.fkLookups.filter(f => f.status === 'resolved').length} resolved
                    </span>
                  </div>
                </button>
                {expandedSections.fkLookups && (
                  <div className="p-3 border-t" style={{ borderColor: `color-mix(in srgb, ${colors.border} 30%, transparent)` }}>
                    <div className="space-y-2">
                      {dependencyMap.fkLookups.map((fk, i) => (
                        <div 
                          key={i}
                          className="flex items-center justify-between p-2 rounded-lg"
                          style={{ backgroundColor: `color-mix(in srgb, ${colors.bgSecondary} 50%, transparent)` }}
                        >
                          <div className="flex items-center gap-2">
                            {fk.status === 'resolved' ? 
                              <CheckCircle2 className="w-4 h-4" style={{ color: colors.success }} /> :
                              <AlertTriangle className="w-4 h-4" style={{ color: colors.warning }} />
                            }
                            <span className="text-sm" style={{ color: colors.text }}>
                              {fk.sourceTable}.{fk.sourceColumn}
                            </span>
                            <ArrowRight className="w-3 h-3" style={{ color: colors.textMuted }} />
                            <span className="text-sm font-medium" style={{ color: colors.accent }}>
                              {fk.lookupTable}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Missing Dependencies - Action Required */}
      {missingDeps.length > 0 && (
        <div 
          className="rounded-xl border p-6"
          style={{ 
            backgroundColor: `color-mix(in srgb, ${colors.warning} 5%, transparent)`,
            borderColor: `color-mix(in srgb, ${colors.warning} 30%, transparent)`
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5" style={{ color: colors.warning }} />
            <h3 className="font-semibold" style={{ color: colors.text }}>
              Missing Dependencies ({missingDeps.length})
            </h3>
          </div>

          <div className="space-y-3">
            {missingDeps.slice(0, 10).map((dep, i) => (
              <div 
                key={i}
                className="flex items-center justify-between p-4 rounded-lg border"
                style={{ 
                  backgroundColor: colors.card,
                  borderColor: `color-mix(in srgb, ${colors.border} 30%, transparent)`
                }}
              >
                <div className="flex items-center gap-3">
                  {dep.type === 'table' ? (
                    <Table2 className="w-5 h-5" style={{ color: getPriorityColor(dep.priority) }} />
                  ) : dep.type === 'column' ? (
                    <Columns3 className="w-5 h-5" style={{ color: getPriorityColor(dep.priority) }} />
                  ) : (
                    <Link2 className="w-5 h-5" style={{ color: getPriorityColor(dep.priority) }} />
                  )}
                  <div>
                    <div className="font-medium" style={{ color: colors.text }}>
                      {dep.type === 'column' ? `${dep.tableName}.${dep.name}` : dep.name}
                    </div>
                    <div className="text-xs" style={{ color: colors.textMuted }}>
                      {dep.impact}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span 
                    className="text-xs px-2 py-1 rounded-full uppercase"
                    style={{ 
                      backgroundColor: `color-mix(in srgb, ${getPriorityColor(dep.priority)} 15%, transparent)`,
                      color: getPriorityColor(dep.priority)
                    }}
                  >
                    {dep.priority}
                  </span>
                  {dep.resolutionOptions.filter(o => o.recommended).map((opt, j) => (
                    <button
                      key={j}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ 
                        backgroundColor: `color-mix(in srgb, ${colors.primary} 15%, transparent)`,
                        color: colors.primary
                      }}
                    >
                      {opt.type === 'upload_sql' && <Upload className="w-3 h-3" />}
                      {opt.type === 'ai_generate' && <Wand2 className="w-3 h-3" />}
                      {opt.type === 'design_manual' && <Puzzle className="w-3 h-3" />}
                      {opt.description}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {missingDeps.length > 10 && (
              <div className="text-center py-2">
                <span className="text-sm" style={{ color: colors.textMuted }}>
                  +{missingDeps.length - 10} more missing dependencies...
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Suggestions */}
      {dependencyMap && missingDeps.length > 0 && (
        <div 
          className="rounded-xl border p-6"
          style={{ 
            backgroundColor: colors.card,
            borderColor: `color-mix(in srgb, ${colors.border} 50%, transparent)`
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Lightbulb className="w-5 h-5" style={{ color: colors.warning }} />
            <h3 className="font-semibold" style={{ color: colors.text }}>Smart Suggestions</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              className="p-4 rounded-lg border"
              style={{ borderColor: `color-mix(in srgb, ${colors.border} 30%, transparent)` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Upload className="w-4 h-4" style={{ color: colors.success }} />
                <span className="font-medium text-sm" style={{ color: colors.text }}>Batch Upload</span>
              </div>
              <p className="text-xs" style={{ color: colors.textMuted }}>
                Upload all SQL files at once. We'll automatically match tables to detected dependencies.
              </p>
            </div>

            <div 
              className="p-4 rounded-lg border"
              style={{ borderColor: `color-mix(in srgb, ${colors.border} 30%, transparent)` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Wand2 className="w-4 h-4" style={{ color: colors.primary }} />
                <span className="font-medium text-sm" style={{ color: colors.text }}>AI Generate</span>
              </div>
              <p className="text-xs" style={{ color: colors.textMuted }}>
                Let AI create missing tables based on detected column patterns and usage context.
              </p>
            </div>

            <div 
              className="p-4 rounded-lg border"
              style={{ borderColor: `color-mix(in srgb, ${colors.border} 30%, transparent)` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4" style={{ color: colors.accent }} />
                <span className="font-medium text-sm" style={{ color: colors.text }}>Auto-Suggest</span>
              </div>
              <p className="text-xs" style={{ color: colors.textMuted }}>
                Get intelligent suggestions for lookup tables, FK relationships, and common patterns.
              </p>
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
            All Dependencies Resolved!
          </h3>
          <p className="text-sm mb-6" style={{ color: colors.textMuted }}>
            Your CSHTML views are now fully linked to database tables. You can proceed to Intelligence analysis.
          </p>
          <button
            onClick={() => onNavigate?.('intelligence')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium"
            style={{ 
              backgroundColor: colors.primary,
              color: '#fff'
            }}
          >
            <Brain className="w-5 h-5" />
            Go to Intelligence
          </button>
        </div>
      )}
    </div>
  )
}
