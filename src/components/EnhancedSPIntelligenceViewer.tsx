'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useTheme } from '@/hooks/useTheme'
import { 
  Database,
  Code,
  Table2,
  ArrowRightLeft,
  Filter,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileJson,
  Zap,
  Shield,
  Search,
  Play,
  Download,
  Eye,
  GitBranch,
  AlertCircle,
  FileCode,
  Layers,
  Workflow,
  Lock,
  LayoutGrid,
  Server,
  Sparkles,
  FileText
} from 'lucide-react'
import type { EnhancedSPIntelligence } from '@/lib/sp-intelligence-enhanced'
import { createEnhancedSPIntelligenceEngine } from '@/lib/sp-intelligence-enhanced'
import type { StoredProcedureDef, TableDef } from '@/lib/types'

interface EnhancedSPIntelligenceViewerProps {
  storedProcedures: StoredProcedureDef[]
  tables: TableDef[]
}

export function EnhancedSPIntelligenceViewer({ storedProcedures, tables }: EnhancedSPIntelligenceViewerProps) {
  const { colors } = useTheme()
  const [selectedSP, setSelectedSP] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | string>('all')

  // Analyze stored procedures with enhanced engine
  const analysisResults = useMemo(() => {
    const engine = createEnhancedSPIntelligenceEngine(tables)
    return storedProcedures.map(sp => engine.analyzeProcedure(sp))
  }, [storedProcedures, tables])

  // Group by action type
  const groupedResults = useMemo(() => {
    const groups: Record<string, EnhancedSPIntelligence[]> = {}
    for (const result of analysisResults) {
      const type = result.actionType
      if (!groups[type]) groups[type] = []
      groups[type].push(result)
    }
    return groups
  }, [analysisResults])

  // Filtered results
  const filteredResults = useMemo(() => {
    if (filter === 'all') return analysisResults
    return analysisResults.filter(r => r.actionType === filter)
  }, [analysisResults, filter])

  // Statistics
  const stats = useMemo(() => {
    const total = analysisResults.length
    const byType: Record<string, number> = {}
    let totalComplexity = 0
    let highRisk = 0
    let totalValidationRules = 0
    let totalIndexRecommendations = 0
    let totalMissingConstraints = 0
    
    for (const result of analysisResults) {
      byType[result.actionType] = (byType[result.actionType] || 0) + 1
      totalComplexity += result.complexity
      if (result.riskLevel === 'high' || result.riskLevel === 'critical') highRisk++
      totalValidationRules += result.validationRules.length
      totalIndexRecommendations += result.indexRecommendations.length
      totalMissingConstraints += result.missingConstraints.length
    }
    
    return {
      total,
      byType,
      avgComplexity: total > 0 ? Math.round(totalComplexity / total) : 0,
      highRisk,
      totalValidationRules,
      totalIndexRecommendations,
      totalMissingConstraints,
    }
  }, [analysisResults])

  const selectedResult = selectedSP 
    ? analysisResults.find(r => r.procedureName === selectedSP) 
    : null

  const getActionTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      dropdown: colors.accent,
      read: colors.primary,
      create: colors.success,
      update: colors.warning,
      delete: colors.error,
      search: colors.primary,
      report: colors.success,
      validate: colors.warning,
      process: colors.accent,
      import: colors.textSecondary,
      export: colors.textSecondary,
      calculate: colors.warning,
      workflow: colors.accent,
      unknown: colors.textMuted,
    }
    return colorMap[type] || colors.textMuted
  }

  const getRiskBadge = (level: string) => {
    const styleMap: Record<string, { bg: string; color: string }> = {
      low: { bg: `color-mix(in srgb, ${colors.success} 20%, transparent)`, color: colors.success },
      medium: { bg: `color-mix(in srgb, ${colors.warning} 20%, transparent)`, color: colors.warning },
      high: { bg: `color-mix(in srgb, ${colors.error} 40%, transparent)`, color: colors.error },
      critical: { bg: colors.error, color: '#ffffff' },
    }
    const style = styleMap[level] || styleMap.low
    return (
      <Badge style={{ backgroundColor: style.bg, color: style.color }}>
        {level.toUpperCase()}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-7 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-4 h-4" style={{ color: colors.primary }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>Total SPs</span>
            </div>
            <div className="text-xl font-bold" style={{ color: colors.text }}>{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4" style={{ color: colors.warning }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>Validations</span>
            </div>
            <div className="text-xl font-bold" style={{ color: colors.text }}>{stats.totalValidationRules}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4" style={{ color: colors.accent }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>Index Recs</span>
            </div>
            <div className="text-xl font-bold" style={{ color: colors.text }}>{stats.totalIndexRecommendations}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4" style={{ color: colors.error }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>Constraints</span>
            </div>
            <div className="text-xl font-bold" style={{ color: colors.text }}>{stats.totalMissingConstraints}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <LayoutGrid className="w-4 h-4" style={{ color: colors.success }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>UI Components</span>
            </div>
            <div className="text-xl font-bold" style={{ color: colors.text }}>
              {analysisResults.reduce((sum, r) => sum + r.uiComponentSuggestions.length, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4" style={{ color: colors.accent }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>Avg Complexity</span>
            </div>
            <div className="text-xl font-bold" style={{ color: colors.text }}>{stats.avgComplexity}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4" style={{ color: colors.error }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>High Risk</span>
            </div>
            <div className="text-xl font-bold" style={{ color: stats.highRisk > 0 ? colors.error : colors.text }}>
              {stats.highRisk}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Type Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={filter === 'all' ? 'default' : 'outline'}
          style={filter === 'all' 
            ? { backgroundColor: colors.primary, color: '#ffffff' }
            : { borderColor: colors.border, color: colors.textSecondary }
          }
          onClick={() => setFilter('all')}
        >
          All ({stats.total})
        </Button>
        {Object.entries(stats.byType).map(([type, count]) => (
          <Button
            key={type}
            size="sm"
            variant={filter === type ? 'default' : 'outline'}
            style={filter === type 
              ? { backgroundColor: getActionTypeColor(type), color: '#ffffff' }
              : { borderColor: colors.border, color: colors.textSecondary }
            }
            onClick={() => setFilter(type)}
          >
            {type} ({count})
          </Button>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-4">
        {/* SP List */}
        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="w-4 h-4" style={{ color: colors.primary }} />
              Stored Procedures ({filteredResults.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div className="p-2 space-y-1">
                {filteredResults.map((result) => (
                  <div
                    key={result.procedureName}
                    className={`rounded-lg p-2 cursor-pointer transition-all ${
                      selectedSP === result.procedureName ? 'ring-2' : ''
                    }`}
                    style={{
                      backgroundColor: selectedSP === result.procedureName 
                        ? `color-mix(in srgb, ${colors.primary} 10%, transparent)`
                        : `color-mix(in srgb, ${colors.bg} 50%, transparent)`,
                      ringColor: selectedSP === result.procedureName ? colors.primary : undefined,
                    }}
                    onClick={() => setSelectedSP(result.procedureName)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs truncate" style={{ color: colors.text }}>
                        {result.procedureName}
                      </span>
                      {getRiskBadge(result.riskLevel)}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge 
                        variant="outline"
                        style={{ 
                          borderColor: getActionTypeColor(result.actionType),
                          color: getActionTypeColor(result.actionType),
                        }}
                      >
                        {result.actionType}
                      </Badge>
                      <Badge 
                        variant="outline"
                        style={{ 
                          borderColor: result.formMode.mode === 'create' ? colors.success : 
                                       result.formMode.mode === 'edit' ? colors.warning :
                                       result.formMode.mode === 'both' ? colors.accent : colors.border,
                          color: result.formMode.mode === 'create' ? colors.success : 
                                 result.formMode.mode === 'edit' ? colors.warning :
                                 result.formMode.mode === 'both' ? colors.accent : colors.textSecondary,
                        }}
                      >
                        {result.formMode.mode}
                      </Badge>
                      <span className="text-xs" style={{ color: colors.textMuted }}>
                        {result.validationRules.length} rules
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* SP Details */}
        <Card className="col-span-2">
          {selectedResult ? (
            <>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-mono flex items-center gap-2">
                      <Code className="w-5 h-5" style={{ color: colors.primary }} />
                      {selectedResult.procedureName}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge style={{ 
                        backgroundColor: `color-mix(in srgb, ${getActionTypeColor(selectedResult.actionType)} 20%, transparent)`,
                        color: getActionTypeColor(selectedResult.actionType),
                      }}>
                        {selectedResult.actionType}
                      </Badge>
                      {getRiskBadge(selectedResult.riskLevel)}
                      <span style={{ color: colors.textMuted }}>
                        Complexity: {selectedResult.complexity}
                      </span>
                      <Badge variant="outline" style={{ borderColor: colors.success, color: colors.success }}>
                        {selectedResult.moduleName}
                      </Badge>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" style={{ borderColor: colors.border, color: colors.textSecondary }}>
                      {selectedResult.apiEndpoint.method} {selectedResult.apiEndpoint.path}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="validations">
                  <TabsList className="mb-4 flex-wrap">
                    <TabsTrigger value="validations" className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Validations ({selectedResult.validationRules.length})
                    </TabsTrigger>
                    <TabsTrigger value="formMode" className="flex items-center gap-1">
                      <FileCode className="w-3 h-3" />
                      Form Mode
                    </TabsTrigger>
                    <TabsTrigger value="indexes" className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      Indexes ({selectedResult.indexRecommendations.length})
                    </TabsTrigger>
                    <TabsTrigger value="constraints" className="flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Constraints ({selectedResult.missingConstraints.length})
                    </TabsTrigger>
                    <TabsTrigger value="ui" className="flex items-center gap-1">
                      <LayoutGrid className="w-3 h-3" />
                      UI ({selectedResult.uiComponentSuggestions.length})
                    </TabsTrigger>
                    <TabsTrigger value="workflow" className="flex items-center gap-1">
                      <Workflow className="w-3 h-3" />
                      Workflow
                    </TabsTrigger>
                    <TabsTrigger value="transaction" className="flex items-center gap-1">
                      <GitBranch className="w-3 h-3" />
                      Transaction
                    </TabsTrigger>
                    <TabsTrigger value="api" className="flex items-center gap-1">
                      <Server className="w-3 h-3" />
                      API
                    </TabsTrigger>
                  </TabsList>

                  {/* Validations Tab */}
                  <TabsContent value="validations">
                    <ScrollArea className="h-[400px]">
                      {selectedResult.validationRules.length === 0 ? (
                        <div className="text-center py-8" style={{ color: colors.textMuted }}>
                          <Shield className="w-12 h-12 mx-auto mb-2" style={{ color: colors.success }} />
                          No validation rules detected
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {selectedResult.validationRules.map((rule, i) => (
                            <div 
                              key={i}
                              className="rounded-lg p-3"
                              style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {rule.type === 'required' && <AlertCircle className="w-4 h-4" style={{ color: colors.error }} />}
                                  {rule.type === 'unique' && <Sparkles className="w-4 h-4" style={{ color: colors.accent }} />}
                                  {rule.type === 'range' && <Filter className="w-4 h-4" style={{ color: colors.warning }} />}
                                  {rule.type === 'pattern' && <FileCode className="w-4 h-4" style={{ color: colors.primary }} />}
                                  {rule.type === 'exists' && <Database className="w-4 h-4" style={{ color: colors.success }} />}
                                  {rule.type === 'business' && <Workflow className="w-4 h-4" style={{ color: colors.warning }} />}
                                  <Badge variant="outline" style={{ 
                                    borderColor: rule.severity === 'error' ? colors.error : 
                                                rule.severity === 'warning' ? colors.warning : colors.textSecondary,
                                    color: rule.severity === 'error' ? colors.error : 
                                          rule.severity === 'warning' ? colors.warning : colors.textSecondary,
                                  }}>
                                    {rule.type.toUpperCase()}
                                  </Badge>
                                  <span className="font-medium" style={{ color: colors.text }}>
                                    @{rule.columnName}
                                  </span>
                                </div>
                                <Badge style={{
                                  backgroundColor: `color-mix(in srgb, ${colors.textMuted} 20%, transparent)`,
                                  color: colors.textMuted,
                                }}>
                                  {rule.severity}
                                </Badge>
                              </div>
                              <p className="text-sm" style={{ color: colors.textSecondary }}>{rule.description}</p>
                              {rule.codeSnippet && (
                                <pre className="mt-2 p-2 rounded text-xs overflow-x-auto" style={{ 
                                  backgroundColor: `color-mix(in srgb, ${colors.bg} 80%, transparent)`,
                                  color: colors.textMuted,
                                }}>
                                  {rule.codeSnippet}
                                </pre>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  {/* Form Mode Tab */}
                  <TabsContent value="formMode">
                    <div className="space-y-4">
                      <div 
                        className="rounded-lg p-4 flex items-center justify-between"
                        style={{ 
                          backgroundColor: `color-mix(in srgb, ${
                            selectedResult.formMode.mode === 'create' ? colors.success :
                            selectedResult.formMode.mode === 'edit' ? colors.warning :
                            selectedResult.formMode.mode === 'both' ? colors.accent : colors.textMuted
                          } 10%, transparent)` 
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <FileCode className="w-8 h-8" style={{ 
                            color: selectedResult.formMode.mode === 'create' ? colors.success :
                                   selectedResult.formMode.mode === 'edit' ? colors.warning :
                                   selectedResult.formMode.mode === 'both' ? colors.accent : colors.textMuted
                          }} />
                          <div>
                            <h3 className="text-lg font-bold" style={{ color: colors.text }}>
                              {selectedResult.formMode.mode.toUpperCase()} MODE
                            </h3>
                            <p style={{ color: colors.textSecondary }}>
                              Confidence: {selectedResult.formMode.confidence}%
                            </p>
                          </div>
                        </div>
                        {selectedResult.formMode.primaryKeyParameter && (
                          <Badge variant="outline" style={{ borderColor: colors.primary, color: colors.primary }}>
                            PK: {selectedResult.formMode.primaryKeyParameter}
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {selectedResult.formMode.insertTables.length > 0 && (
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Play className="w-4 h-4" style={{ color: colors.success }} />
                                INSERT Tables
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-1">
                                {selectedResult.formMode.insertTables.map((t, i) => (
                                  <Badge key={i} style={{ backgroundColor: `color-mix(in srgb, ${colors.success} 20%, transparent)`, color: colors.success }}>
                                    {t}
                                  </Badge>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                        {selectedResult.formMode.updateTables.length > 0 && (
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Zap className="w-4 h-4" style={{ color: colors.warning }} />
                                UPDATE Tables
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-1">
                                {selectedResult.formMode.updateTables.map((t, i) => (
                                  <Badge key={i} style={{ backgroundColor: `color-mix(in srgb, ${colors.warning} 20%, transparent)`, color: colors.warning }}>
                                    {t}
                                  </Badge>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>

                      {selectedResult.formMode.indicators.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Detection Indicators</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-1">
                              {selectedResult.formMode.indicators.map((ind, i) => (
                                <li key={i} className="flex items-center gap-2" style={{ color: colors.textSecondary }}>
                                  <CheckCircle2 className="w-3 h-3" style={{ color: colors.success }} />
                                  {ind}
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>

                  {/* Index Recommendations Tab */}
                  <TabsContent value="indexes">
                    <ScrollArea className="h-[400px]">
                      {selectedResult.indexRecommendations.length === 0 ? (
                        <div className="text-center py-8" style={{ color: colors.textMuted }}>
                          <Zap className="w-12 h-12 mx-auto mb-2" style={{ color: colors.success }} />
                          No index recommendations
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {selectedResult.indexRecommendations.map((idx, i) => (
                            <div 
                              key={i}
                              className="rounded-lg p-3"
                              style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Zap className="w-4 h-4" style={{ color: colors.accent }} />
                                  <span className="font-medium" style={{ color: colors.text }}>
                                    {idx.tableName}.{idx.columns.join(', ')}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge style={{
                                    backgroundColor: idx.priority === 'high' ? `color-mix(in srgb, ${colors.error} 20%, transparent)` :
                                                    idx.priority === 'medium' ? `color-mix(in srgb, ${colors.warning} 20%, transparent)` :
                                                    `color-mix(in srgb, ${colors.textMuted} 20%, transparent)`,
                                    color: idx.priority === 'high' ? colors.error :
                                          idx.priority === 'medium' ? colors.warning : colors.textMuted,
                                  }}>
                                    {idx.priority}
                                  </Badge>
                                  <Badge variant="outline" style={{ borderColor: colors.accent, color: colors.accent }}>
                                    {idx.indexType}
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-sm mb-2" style={{ color: colors.textSecondary }}>
                                Reason: {idx.reason.replace('_', ' ')} • {idx.estimatedImpact}
                              </p>
                              {idx.supportingCode && (
                                <pre className="p-2 rounded text-xs" style={{ 
                                  backgroundColor: `color-mix(in srgb, ${colors.bg} 80%, transparent)`,
                                  color: colors.textMuted,
                                }}>
                                  {idx.supportingCode}
                                </pre>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  {/* Missing Constraints Tab */}
                  <TabsContent value="constraints">
                    <ScrollArea className="h-[400px]">
                      {selectedResult.missingConstraints.length === 0 ? (
                        <div className="text-center py-8" style={{ color: colors.textMuted }}>
                          <Lock className="w-12 h-12 mx-auto mb-2" style={{ color: colors.success }} />
                          All constraints detected in schema
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {selectedResult.missingConstraints.map((constraint, i) => (
                            <div 
                              key={i}
                              className="rounded-lg p-3"
                              style={{ backgroundColor: `color-mix(in srgb, ${colors.warning} 5%, transparent)` }}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4" style={{ color: colors.warning }} />
                                  <span className="font-medium" style={{ color: colors.text }}>
                                    {constraint.tableName}.{constraint.columnName}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge style={{
                                    backgroundColor: constraint.priority === 'high' ? `color-mix(in srgb, ${colors.error} 20%, transparent)` :
                                                    `color-mix(in srgb, ${colors.warning} 20%, transparent)`,
                                    color: constraint.priority === 'high' ? colors.error : colors.warning,
                                  }}>
                                    {constraint.priority}
                                  </Badge>
                                  <Badge variant="outline" style={{ borderColor: colors.error, color: colors.error }}>
                                    {constraint.constraintType}
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-sm mb-2" style={{ color: colors.textSecondary }}>
                                {constraint.description}
                              </p>
                              <p className="text-xs mb-2" style={{ color: colors.textMuted }}>
                                {constraint.rationale}
                              </p>
                              <pre className="p-2 rounded text-xs" style={{ 
                                backgroundColor: `color-mix(in srgb, ${colors.bg} 80%, transparent)`,
                                color: colors.success,
                              }}>
                                {constraint.suggestedSQL}
                              </pre>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  {/* UI Components Tab */}
                  <TabsContent value="ui">
                    <ScrollArea className="h-[400px]">
                      {selectedResult.uiComponentSuggestions.length === 0 ? (
                        <div className="text-center py-8" style={{ color: colors.textMuted }}>
                          <LayoutGrid className="w-12 h-12 mx-auto mb-2" />
                          No UI component suggestions
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {selectedResult.uiComponentSuggestions.map((ui, i) => (
                            <div 
                              key={i}
                              className="rounded-lg p-3 flex items-center justify-between"
                              style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-sm" style={{ color: colors.text }}>
                                  {ui.parameterName}
                                </span>
                                <Badge variant="outline" style={{ borderColor: colors.border }}>
                                  {ui.dataType}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                {ui.isRequired && (
                                  <Badge style={{ backgroundColor: `color-mix(in srgb, ${colors.error} 20%, transparent)`, color: colors.error }}>
                                    Required
                                  </Badge>
                                )}
                                <Badge style={{ 
                                  backgroundColor: `color-mix(in srgb, ${colors.primary} 20%, transparent)`,
                                  color: colors.primary,
                                }}>
                                  {ui.suggestedComponent}
                                </Badge>
                                <span className="text-xs" style={{ color: colors.textMuted }}>
                                  {ui.label}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  {/* Workflow Tab */}
                  <TabsContent value="workflow">
                    <ScrollArea className="h-[400px]">
                      {selectedResult.workflowSteps.length === 0 ? (
                        <div className="text-center py-8" style={{ color: colors.textMuted }}>
                          <Workflow className="w-12 h-12 mx-auto mb-2" />
                          No workflow steps detected
                        </div>
                      ) : (
                        <div className="relative">
                          <div 
                            className="absolute left-4 top-0 bottom-0 w-0.5"
                            style={{ backgroundColor: colors.border }}
                          />
                          <div className="space-y-4">
                            {selectedResult.workflowSteps.map((step, i) => (
                              <div key={i} className="relative pl-10">
                                <div 
                                  className="absolute left-2 w-5 h-5 rounded-full flex items-center justify-center"
                                  style={{ backgroundColor: colors.primary, color: '#fff' }}
                                >
                                  <span className="text-xs">{step.stepNumber}</span>
                                </div>
                                <div 
                                  className="rounded-lg p-3"
                                  style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" style={{ borderColor: colors.accent, color: colors.accent }}>
                                      {step.operation}
                                    </Badge>
                                    {step.tableName && (
                                      <span className="font-medium" style={{ color: colors.text }}>
                                        {step.tableName}
                                      </span>
                                    )}
                                    {step.isConditional && (
                                      <Badge style={{ backgroundColor: `color-mix(in srgb, ${colors.warning} 20%, transparent)`, color: colors.warning }}>
                                        Conditional
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm" style={{ color: colors.textSecondary }}>
                                    {step.description}
                                  </p>
                                  {step.condition && (
                                    <pre className="mt-2 p-2 rounded text-xs" style={{ 
                                      backgroundColor: `color-mix(in srgb, ${colors.bg} 80%, transparent)`,
                                      color: colors.textMuted,
                                    }}>
                                      IF {step.condition}
                                    </pre>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  {/* Transaction Tab */}
                  <TabsContent value="transaction">
                    <div className="space-y-4">
                      <div 
                        className="rounded-lg p-4"
                        style={{ 
                          backgroundColor: selectedResult.transactionPattern.hasTransaction 
                            ? `color-mix(in srgb, ${colors.success} 10%, transparent)`
                            : `color-mix(in srgb, ${colors.textMuted} 10%, transparent)`
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <GitBranch className="w-6 h-6" style={{ 
                              color: selectedResult.transactionPattern.hasTransaction ? colors.success : colors.textMuted 
                            }} />
                            <div>
                              <h3 className="font-bold" style={{ color: colors.text }}>
                                {selectedResult.transactionPattern.hasTransaction ? 'Transaction Detected' : 'No Transaction'}
                              </h3>
                              <p style={{ color: colors.textSecondary }}>
                                Type: {selectedResult.transactionPattern.transactionType}
                              </p>
                            </div>
                          </div>
                          <Badge style={{
                            backgroundColor: selectedResult.transactionPattern.riskLevel === 'low' 
                              ? `color-mix(in srgb, ${colors.success} 20%, transparent)`
                              : selectedResult.transactionPattern.riskLevel === 'medium'
                              ? `color-mix(in srgb, ${colors.warning} 20%, transparent)`
                              : `color-mix(in srgb, ${colors.error} 20%, transparent)`,
                            color: selectedResult.transactionPattern.riskLevel === 'low' 
                              ? colors.success
                              : selectedResult.transactionPattern.riskLevel === 'medium'
                              ? colors.warning
                              : colors.error,
                          }}>
                            Risk: {selectedResult.transactionPattern.riskLevel}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Error Handling</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Badge style={{
                              backgroundColor: selectedResult.transactionPattern.errorHandling === 'try_catch' 
                                ? `color-mix(in srgb, ${colors.success} 20%, transparent)`
                                : selectedResult.transactionPattern.errorHandling === 'error_check'
                                ? `color-mix(in srgb, ${colors.warning} 20%, transparent)`
                                : `color-mix(in srgb, ${colors.error} 20%, transparent)`,
                              color: selectedResult.transactionPattern.errorHandling === 'try_catch' 
                                ? colors.success
                                : selectedResult.transactionPattern.errorHandling === 'error_check'
                                ? colors.warning
                                : colors.error,
                            }}>
                              {selectedResult.transactionPattern.errorHandling}
                            </Badge>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Affected Tables</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-wrap gap-1">
                              {selectedResult.transactionPattern.affectedTables.map((t, i) => (
                                <Badge key={i} variant="outline" style={{ borderColor: colors.border }}>
                                  {t}
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {selectedResult.transactionPattern.rollbackConditions.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Rollback Conditions</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-1">
                              {selectedResult.transactionPattern.rollbackConditions.map((cond, i) => (
                                <li key={i} className="text-sm" style={{ color: colors.textSecondary }}>
                                  • {cond}
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>

                  {/* API Tab */}
                  <TabsContent value="api">
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-4">
                        <div 
                          className="rounded-lg p-4"
                          style={{ backgroundColor: `color-mix(in srgb, ${colors.success} 10%, transparent)` }}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <Badge style={{ 
                              backgroundColor: selectedResult.apiEndpoint.method === 'GET' ? colors.primary :
                                             selectedResult.apiEndpoint.method === 'POST' ? colors.success :
                                             selectedResult.apiEndpoint.method === 'PUT' ? colors.warning :
                                             selectedResult.apiEndpoint.method === 'DELETE' ? colors.error : colors.accent,
                              color: '#fff',
                            }}>
                              {selectedResult.apiEndpoint.method}
                            </Badge>
                            <span className="font-mono text-lg" style={{ color: colors.text }}>
                              {selectedResult.apiEndpoint.path}
                            </span>
                          </div>
                          <p style={{ color: colors.textSecondary }}>{selectedResult.apiEndpoint.description}</p>
                        </div>

                        {selectedResult.apiEndpoint.parameters.length > 0 && (
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm">Parameters</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                {selectedResult.apiEndpoint.parameters.map((param, i) => (
                                  <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-sm" style={{ color: colors.text }}>
                                        {param.name}
                                      </span>
                                      <Badge variant="outline" style={{ borderColor: colors.border }}>
                                        {param.type}
                                      </Badge>
                                    </div>
                                    <Badge style={{
                                      backgroundColor: param.required 
                                        ? `color-mix(in srgb, ${colors.error} 20%, transparent)`
                                        : `color-mix(in srgb, ${colors.textMuted} 20%, transparent)`,
                                      color: param.required ? colors.error : colors.textMuted,
                                    }}>
                                      {param.required ? 'Required' : 'Optional'}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {selectedResult.apiEndpoint.requestBody && (
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm">Request Body Schema</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <pre className="p-3 rounded text-xs overflow-auto" style={{ 
                                backgroundColor: `color-mix(in srgb, ${colors.bg} 80%, transparent)`,
                                color: colors.textSecondary,
                              }}>
                                {JSON.stringify(selectedResult.apiEndpoint.requestBody, null, 2)}
                              </pre>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center h-[500px]">
              <Database className="w-16 h-16 mb-4" style={{ color: colors.textMuted }} />
              <h3 className="text-lg font-semibold mb-2" style={{ color: colors.text }}>Select a Stored Procedure</h3>
              <p style={{ color: colors.textMuted }}>
                Click on a stored procedure to view its enhanced intelligence analysis
              </p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
