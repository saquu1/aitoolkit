'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSchema } from '@/hooks/useSchema'
import { 
  AlertTriangle,
  CheckCircle2,
  Upload,
  Pencil,
  Brain,
  ChevronDown,
  ChevronRight,
  Database,
  GitBranch,
  RefreshCw,
  XCircle,
  Clock,
  Layers,
  ArrowRight,
  Zap,
  FileCode,
  Sparkles
} from 'lucide-react'

interface MissingTableItem {
  tableName: string
  status: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  blocksCount: number
  referencedBy: Array<{ tableName: string; columnName: string }>
  resolutionPath?: string
  resolutionStatus: string
  suggestedColumns?: any[]
  aiSuggestion?: {
    columns: any[]
    primaryKeys: string[]
    foreignKeys: any[]
    confidence: number
    reasoning: string
  }
}

interface ResolutionQueue {
  items: MissingTableItem[]
  totalMissing: number
  totalResolved: number
  totalBlocked: number
  circularDependencies: any[]
  buildOrder: string[]
}

interface FKResolutionTabProps {
  projectId?: string
  sqlContent?: string
  tables?: any[]
  onResolutionComplete?: () => void
}

export function FKResolutionTab({ projectId, sqlContent, tables, onResolutionComplete }: FKResolutionTabProps) {
  // Connect to shared schema state
  const { 
    parseResult, 
    missingTables: sharedMissingTables, 
    fkResolvedPercent: sharedFkPercent,
    totalTables: sharedTotalTables,
    fkRelationships: sharedFkCount
  } = useSchema()
  
  const [isLoading, setIsLoading] = useState(false)
  const [queue, setQueue] = useState<ResolutionQueue | null>(null)
  const [statistics, setStatistics] = useState<any>(null)
  const [expandedTable, setExpandedTable] = useState<string | null>(null)
  const [resolutionMode, setResolutionMode] = useState<'upload' | 'manual' | 'ai' | null>(null)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [uploadContent, setUploadContent] = useState('')
  const [manualDesign, setManualDesign] = useState<any>(null)
  const [isResolving, setIsResolving] = useState(false)
  const [resolutionResult, setResolutionResult] = useState<any>(null)

  // Analyze on mount if SQL content provided
  useEffect(() => {
    if (sqlContent && projectId) {
      analyzeSchema()
    }
  }, [sqlContent, projectId])

  const analyzeSchema = async () => {
    if (!projectId || !sqlContent) return
    
    setIsLoading(true)
    try {
      const response = await fetch('/api/fk-resolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze',
          projectId,
          sql: sqlContent
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setQueue(data.queue)
        setStatistics(data.statistics)
      }
    } catch (error) {
      console.error('Analysis failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const resolveViaUpload = async (tableName: string) => {
    if (!projectId || !uploadContent.trim()) return
    
    setIsResolving(true)
    try {
      const response = await fetch('/api/fk-resolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve-upload',
          projectId,
          tableName,
          sqlContent: uploadContent
        })
      })
      
      const data = await response.json()
      setResolutionResult(data)
      
      if (data.success) {
        // Refresh queue
        await loadQueue()
        onResolutionComplete?.()
      }
    } catch (error) {
      console.error('Resolution failed:', error)
    } finally {
      setIsResolving(false)
    }
  }

  const resolveViaAI = async (tableName: string) => {
    if (!projectId) return
    
    setIsResolving(true)
    try {
      const response = await fetch('/api/fk-resolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve-ai',
          projectId,
          tableName
        })
      })
      
      const data = await response.json()
      setResolutionResult(data)
      
      if (data.success) {
        await loadQueue()
        onResolutionComplete?.()
      }
    } catch (error) {
      console.error('AI resolution failed:', error)
    } finally {
      setIsResolving(false)
    }
  }

  const loadQueue = async () => {
    if (!projectId) return
    
    try {
      const response = await fetch(`/api/fk-resolution?action=get-queue&projectId=${projectId}`)
      const data = await response.json()
      if (data.success) {
        setQueue(data.queue)
      }
    } catch (error) {
      console.error('Failed to load queue:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'medium': return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />
      case 'partial': return <AlertTriangle className="w-4 h-4 text-amber-400" />
      case 'missing': return <XCircle className="w-4 h-4 text-red-400" />
      default: return <Database className="w-4 h-4 text-blue-400" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
        <span className="ml-3 text-slate-400">Analyzing FK dependencies...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">FK Dependency Resolution</h2>
          <p className="text-slate-400 mt-1">
            Resolve missing table dependencies before generating schemas
          </p>
        </div>
        {queue && (
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {queue.totalMissing} Missing
            </Badge>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">
              <GitBranch className="w-3 h-3 mr-1" />
              {queue.totalBlocked} Blocked
            </Badge>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-5 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <Database className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{statistics.totalTables}</div>
              <div className="text-xs text-slate-400">Total Tables</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{statistics.complete}</div>
              <div className="text-xs text-slate-400">Complete</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{statistics.partial}</div>
              <div className="text-xs text-slate-400">Partial</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <XCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{statistics.missing}</div>
              <div className="text-xs text-slate-400">Missing</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <GitBranch className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{statistics.fkCompletion}%</div>
              <div className="text-xs text-slate-400">FK Complete</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Resolution Progress */}
      {queue && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">Resolution Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Overall Completion</span>
                <span className="text-white font-medium">
                  {queue.totalMissing > 0 
                    ? Math.round((queue.totalResolved / (queue.totalResolved + queue.totalMissing)) * 100)
                    : 100}%
                </span>
              </div>
              <Progress 
                value={queue.totalMissing > 0 
                  ? (queue.totalResolved / (queue.totalResolved + queue.totalMissing)) * 100
                  : 100
                }
                className="h-2"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>{queue.totalResolved} resolved</span>
                <span>{queue.totalMissing} remaining</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resolution Queue */}
      {queue && queue.items.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-400" />
              Resolution Queue
            </CardTitle>
            <CardDescription className="text-slate-400">
              Missing tables sorted by priority - resolve from top to bottom
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-auto">
              {queue.items.map((item) => (
                <div key={item.tableName} className="bg-slate-700/30 rounded-lg overflow-hidden">
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-700/50"
                    onClick={() => setExpandedTable(expandedTable === item.tableName ? null : item.tableName)}
                  >
                    <div className="flex items-center gap-3">
                      {expandedTable === item.tableName ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                      {getStatusIcon(item.status)}
                      <span className="font-medium text-white">{item.tableName}</span>
                      <Badge className={getPriorityColor(item.priority)}>
                        {item.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <Database className="w-3 h-3" />
                        Blocks {item.blocksCount} table{item.blocksCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {expandedTable === item.tableName && (
                    <div className="border-t border-slate-600 p-4">
                      {/* Referenced By */}
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-slate-300 mb-2">
                          Referenced By ({item.referencedBy.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {item.referencedBy.map((ref, i) => (
                            <Badge key={i} variant="outline" className="border-slate-600 text-slate-400">
                              {ref.tableName}.{ref.columnName}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* AI Suggestion */}
                      {item.aiSuggestion && (
                        <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-purple-300 flex items-center gap-2">
                              <Sparkles className="w-4 h-4" />
                              AI Suggestion
                            </span>
                            <span className="text-xs text-purple-400">
                              {item.aiSuggestion.confidence}% confidence
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mb-2">{item.aiSuggestion.reasoning}</p>
                          <div className="text-xs text-slate-500">
                            {item.aiSuggestion.columns.length} columns suggested
                          </div>
                        </div>
                      )}

                      {/* Resolution Actions */}
                      <div className="flex gap-2">
                        <Button 
                          size="sm"
                          variant="outline"
                          className="border-slate-600 text-slate-300"
                          onClick={() => {
                            setSelectedTable(item.tableName)
                            setResolutionMode('upload')
                          }}
                        >
                          <Upload className="w-4 h-4 mr-1" />
                          Upload SQL
                        </Button>
                        <Button 
                          size="sm"
                          variant="outline"
                          className="border-slate-600 text-slate-300"
                          onClick={() => {
                            setSelectedTable(item.tableName)
                            setResolutionMode('manual')
                            setManualDesign({ tableName: item.tableName, columns: item.aiSuggestion?.columns || [] })
                          }}
                        >
                          <Pencil className="w-4 h-4 mr-1" />
                          Manual Design
                        </Button>
                        <Button 
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700"
                          onClick={() => resolveViaAI(item.tableName)}
                          disabled={isResolving}
                        >
                          {isResolving ? (
                            <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Brain className="w-4 h-4 mr-1" />
                          )}
                          AI Design
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resolution Modal */}
      {resolutionMode && selectedTable && (
        <Card className="bg-slate-800/50 border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              {resolutionMode === 'upload' ? <Upload className="w-5 h-5 text-blue-400" /> : <Pencil className="w-5 h-5 text-emerald-400" />}
              Resolve: {selectedTable}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {resolutionMode === 'upload' && (
              <>
                <div className="space-y-2">
                  <Label className="text-slate-300">Upload SQL DDL for {selectedTable}</Label>
                  <Textarea
                    value={uploadContent}
                    onChange={(e) => setUploadContent(e.target.value)}
                    placeholder={`-- Paste CREATE TABLE statement for ${selectedTable}`}
                    className="min-h-[200px] bg-slate-900 border-slate-600 text-white font-mono text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => resolveViaUpload(selectedTable)}
                    disabled={!uploadContent.trim() || isResolving}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isResolving ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {isResolving ? 'Resolving...' : 'Resolve via Upload'}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setResolutionMode(null)
                      setSelectedTable(null)
                      setUploadContent('')
                    }}
                    className="border-slate-600 text-slate-300"
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}

            {resolutionMode === 'manual' && (
              <>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <p className="text-sm text-slate-300">
                    Manual designer coming soon. For now, use the AI Design option or upload SQL.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setResolutionMode(null)
                      setSelectedTable(null)
                    }}
                    className="border-slate-600 text-slate-300"
                  >
                    Close
                  </Button>
                </div>
              </>
            )}

            {/* Resolution Result */}
            {resolutionResult && (
              <div className={`p-4 rounded-lg ${resolutionResult.success ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                {resolutionResult.success ? (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span className="font-medium text-emerald-300">Table Resolved Successfully</span>
                    </div>
                    {resolutionResult.unlockedTables && resolutionResult.unlockedTables.length > 0 && (
                      <div className="text-sm text-slate-400">
                        <span className="text-emerald-400 font-medium">{resolutionResult.unlockedTables.length}</span> table(s) unlocked
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-400" />
                    <span className="text-red-300">{resolutionResult.error}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Build Order */}
      {queue && queue.buildOrder && queue.buildOrder.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-blue-400" />
              Recommended Build Order
            </CardTitle>
            <CardDescription className="text-slate-400">
              Create tables in this order to avoid FK constraint failures
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {queue.buildOrder.slice(0, 20).map((table, i) => {
                const isMissing = queue.items.some(item => item.tableName === table)
                return (
                  <div key={table} className="flex items-center gap-1">
                    <Badge 
                      variant={isMissing ? 'destructive' : 'outline'}
                      className={isMissing 
                        ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                        : 'border-slate-600 text-slate-300'
                      }
                    >
                      {i + 1}. {table}
                    </Badge>
                    {i < queue.buildOrder.length - 1 && i < 19 && (
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                    )}
                  </div>
                )
              })}
              {queue.buildOrder.length > 20 && (
                <span className="text-slate-500 text-sm">+{queue.buildOrder.length - 20} more...</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {queue && queue.items.length === 0 && (
        <Card className="bg-emerald-500/10 border-emerald-500/30">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">All Dependencies Resolved!</h3>
            <p className="text-slate-400">
              All foreign key dependencies are resolved. You can now generate schemas safely.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Circular Dependencies Warning */}
      {queue && queue.circularDependencies && queue.circularDependencies.length > 0 && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Circular Dependencies Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {queue.circularDependencies.map((dep, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-amber-400">{dep.type}:</span>
                  <span className="text-slate-300">{(dep as any).tables?.join(' → ')}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3">
              These tables reference each other. Consider making one FK nullable or using deferred constraints.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
