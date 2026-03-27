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
  GitBranch
} from 'lucide-react'
import type { SPIntelligenceResult, SPActionType, TableDependency, SPJoinRelationship, BusinessFilterRule, DiscoveredTable } from '@/lib/sp-parser'
import { SPParserEngine } from '@/lib/sp-parser'
import type { StoredProcedureDef, TableDef } from '@/lib/types'

interface SPIntelligenceViewerProps {
  storedProcedures: StoredProcedureDef[]
  tables: TableDef[]
}

export function SPIntelligenceViewer({ storedProcedures, tables }: SPIntelligenceViewerProps) {
  const { colors } = useTheme()
  const [selectedSP, setSelectedSP] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | SPActionType>('all')
  const [expandedSection, setExpandedSection] = useState<string | null>('tables')

  // Analyze stored procedures
  const analysisResults = useMemo(() => {
    const parser = new SPParserEngine(tables)
    return storedProcedures.map(sp => parser.analyzeProcedure(sp))
  }, [storedProcedures, tables])

  // Group by action type
  const groupedResults = useMemo(() => {
    const groups: Record<string, SPIntelligenceResult[]> = {}
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

  // All discovered tables
  const discoveredTables = useMemo(() => {
    const allDiscovered: DiscoveredTable[] = []
    for (const result of analysisResults) {
      for (const dt of result.discoveredTables) {
        allDiscovered.push({
          ...dt,
          discoveredInSP: result.procedureName
        })
      }
    }
    return allDiscovered
  }, [analysisResults])

  // Statistics
  const stats = useMemo(() => {
    const total = analysisResults.length
    const byType: Record<string, number> = {}
    let totalComplexity = 0
    let highRisk = 0
    let totalTablesReferenced = new Set<string>()
    
    for (const result of analysisResults) {
      byType[result.actionType] = (byType[result.actionType] || 0) + 1
      totalComplexity += result.complexity
      if (result.riskLevel === 'high' || result.riskLevel === 'critical') highRisk++
      result.tablesReferenced.forEach(t => totalTablesReferenced.add(t.tableName.toLowerCase()))
    }
    
    return {
      total,
      byType,
      avgComplexity: total > 0 ? Math.round(totalComplexity / total) : 0,
      highRisk,
      uniqueTablesReferenced: totalTablesReferenced.size,
      discoveredTablesCount: discoveredTables.length,
    }
  }, [analysisResults, discoveredTables])

  const selectedResult = selectedSP 
    ? analysisResults.find(r => r.procedureName === selectedSP) 
    : null

  const getActionTypeColor = (type: SPActionType) => {
    const colorMap: Record<SPActionType, string> = {
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
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-4 h-4" style={{ color: colors.primary }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>Total SPs</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: colors.text }}>{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Table2 className="w-4 h-4" style={{ color: colors.accent }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>Tables Referenced</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: colors.text }}>{stats.uniqueTablesReferenced}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Search className="w-4 h-4" style={{ color: colors.warning }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>Discovered Tables</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: stats.discoveredTablesCount > 0 ? colors.warning : colors.text }}>
              {stats.discoveredTablesCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4" style={{ color: colors.accent }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>Avg Complexity</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: colors.text }}>{stats.avgComplexity}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4" style={{ color: colors.error }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>High Risk</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: stats.highRisk > 0 ? colors.error : colors.text }}>
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
              ? { backgroundColor: getActionTypeColor(type as SPActionType), color: '#ffffff' }
              : { borderColor: colors.border, color: colors.textSecondary }
            }
            onClick={() => setFilter(type as SPActionType)}
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
            <ScrollArea className="h-[500px]">
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
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant="outline"
                        style={{ 
                          borderColor: getActionTypeColor(result.actionType),
                          color: getActionTypeColor(result.actionType),
                        }}
                      >
                        {result.actionType}
                      </Badge>
                      <span className="text-xs" style={{ color: colors.textMuted }}>
                        {result.tablesReferenced.length} tables
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
                    <CardDescription className="flex items-center gap-2 mt-1">
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
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" style={{ borderColor: colors.success, color: colors.success }}>
                      {selectedResult.moduleIdentification.moduleName}
                      <span className="ml-1 text-xs">({selectedResult.moduleIdentification.confidence}%)</span>
                    </Badge>
                    <Badge variant="outline" style={{ borderColor: colors.border, color: colors.textSecondary }}>
                      {selectedResult.suggestedEndpoint}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="tables">
                  <TabsList className="mb-4">
                    <TabsTrigger value="tables" className="flex items-center gap-1">
                      <Table2 className="w-3 h-3" />
                      Tables ({selectedResult.tablesReferenced.length})
                    </TabsTrigger>
                    <TabsTrigger value="joins" className="flex items-center gap-1">
                      <ArrowRightLeft className="w-3 h-3" />
                      JOINs ({selectedResult.implicitJoins.length})
                    </TabsTrigger>
                    <TabsTrigger value="rules" className="flex items-center gap-1">
                      <Filter className="w-3 h-3" />
                      Business Rules ({selectedResult.businessRules.length})
                    </TabsTrigger>
                    <TabsTrigger value="api" className="flex items-center gap-1">
                      <FileJson className="w-3 h-3" />
                      API Schema
                    </TabsTrigger>
                    <TabsTrigger value="discovered" className="flex items-center gap-1">
                      <Search className="w-3 h-3" />
                      Discovered ({selectedResult.discoveredTables.length})
                    </TabsTrigger>
                  </TabsList>

                  {/* Tables Tab */}
                  <TabsContent value="tables">
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2">
                        {selectedResult.tablesReferenced.map((dep, i) => (
                          <div 
                            key={i}
                            className="rounded-lg p-3 flex items-center justify-between"
                            style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}
                          >
                            <div className="flex items-center gap-3">
                              <Table2 className="w-4 h-4" style={{ color: colors.accent }} />
                              <span className="font-medium" style={{ color: colors.text }}>{dep.tableName}</span>
                              {dep.isViaJoin && (
                                <Badge variant="outline" style={{ borderColor: colors.border, color: colors.textMuted }}>
                                  {dep.joinType} JOIN
                                </Badge>
                              )}
                            </div>
                            <Badge style={{
                              backgroundColor: dep.accessType === 'write' 
                                ? `color-mix(in srgb, ${colors.error} 20%, transparent)`
                                : dep.accessType === 'both'
                                ? `color-mix(in srgb, ${colors.warning} 20%, transparent)`
                                : `color-mix(in srgb, ${colors.success} 20%, transparent)`,
                              color: dep.accessType === 'write' 
                                ? colors.error
                                : dep.accessType === 'both'
                                ? colors.warning
                                : colors.success,
                            }}>
                              {dep.accessType.toUpperCase()}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  {/* JOINs Tab */}
                  <TabsContent value="joins">
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2">
                        {selectedResult.implicitJoins.length === 0 ? (
                          <div className="text-center py-8" style={{ color: colors.textMuted }}>
                            No JOIN relationships found
                          </div>
                        ) : (
                          selectedResult.implicitJoins.map((join, i) => (
                            <div 
                              key={i}
                              className="rounded-lg p-3"
                              style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium" style={{ color: colors.text }}>{join.fromTable}</span>
                                {join.fromColumn && (
                                  <span className="text-xs" style={{ color: colors.textMuted }}>.{join.fromColumn}</span>
                                )}
                                <ArrowRightLeft className="w-4 h-4" style={{ color: colors.primary }} />
                                <span className="font-medium" style={{ color: colors.text }}>{join.toTable}</span>
                                {join.toColumn && (
                                  <span className="text-xs" style={{ color: colors.textMuted }}>.{join.toColumn}</span>
                                )}
                                <Badge variant="outline" style={{ borderColor: colors.accent, color: colors.accent }}>
                                  {join.joinType}
                                </Badge>
                              </div>
                              <div className="mt-1 text-xs" style={{ color: colors.textMuted }}>
                                Discovered via {join.discoveredInSP} • Confidence: {join.confidence}%
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  {/* Business Rules Tab */}
                  <TabsContent value="rules">
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2">
                        {selectedResult.businessRules.length === 0 ? (
                          <div className="text-center py-8" style={{ color: colors.textMuted }}>
                            No business filter rules found
                          </div>
                        ) : (
                          selectedResult.businessRules.map((rule, i) => (
                            <div 
                              key={i}
                              className="rounded-lg p-3"
                              style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <Filter className="w-4 h-4" style={{ color: colors.warning }} />
                                <span className="font-medium" style={{ color: colors.text }}>
                                  {rule.tableName}.{rule.column}
                                </span>
                                <Badge variant="outline" style={{ borderColor: colors.border }}>
                                  {rule.operator}
                                </Badge>
                                {rule.isParameterized && (
                                  <Badge style={{ 
                                    backgroundColor: `color-mix(in srgb, ${colors.primary} 20%, transparent)`,
                                    color: colors.primary,
                                  }}>
                                    {rule.parameterName}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs" style={{ color: colors.textMuted }}>{rule.description}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  {/* API Schema Tab */}
                  <TabsContent value="api">
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2" style={{ color: colors.text }}>
                            <FileJson className="w-4 h-4" style={{ color: colors.primary }} />
                            Parameters
                          </h4>
                          <div className="space-y-2">
                            {selectedResult.parameters.map((param, i) => (
                              <div 
                                key={i}
                                className="rounded-lg p-2 flex items-center justify-between"
                                style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm" style={{ color: colors.text }}>{param.name}</span>
                                  <span className="text-xs" style={{ color: colors.textMuted }}>{param.dataType}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {param.defaultValue && (
                                    <span className="text-xs" style={{ color: colors.textSecondary }}>
                                      = {param.defaultValue}
                                    </span>
                                  )}
                                  {param.isOutput && (
                                    <Badge variant="outline" style={{ borderColor: colors.accent, color: colors.accent }}>
                                      OUTPUT
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2" style={{ color: colors.text }}>
                            <Play className="w-4 h-4" style={{ color: colors.success }} />
                            Suggested API Endpoint
                          </h4>
                          <div 
                            className="rounded-lg p-3 font-mono text-sm"
                            style={{ 
                              backgroundColor: `color-mix(in srgb, ${colors.success} 10%, transparent)`,
                              color: colors.text,
                            }}
                          >
                            {selectedResult.suggestedEndpoint}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2" style={{ color: colors.text }}>
                            <FileJson className="w-4 h-4" style={{ color: colors.accent }} />
                            Request Body Schema
                          </h4>
                          <pre 
                            className="rounded-lg p-3 text-xs overflow-auto"
                            style={{ 
                              backgroundColor: `color-mix(in srgb, ${colors.bg} 80%, transparent)`,
                              color: colors.textSecondary,
                            }}
                          >
                            {JSON.stringify(selectedResult.apiInputSchema, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  {/* Discovered Tables Tab */}
                  <TabsContent value="discovered">
                    <ScrollArea className="h-[300px]">
                      {selectedResult.discoveredTables.length === 0 ? (
                        <div className="text-center py-8" style={{ color: colors.textMuted }}>
                          <CheckCircle2 className="w-12 h-12 mx-auto mb-2" style={{ color: colors.success }} />
                          All referenced tables exist in schema
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {selectedResult.discoveredTables.map((dt, i) => (
                            <div 
                              key={i}
                              className="rounded-lg p-3"
                              style={{ backgroundColor: `color-mix(in srgb, ${colors.warning} 10%, transparent)` }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4" style={{ color: colors.warning }} />
                                  <span className="font-medium" style={{ color: colors.text }}>{dt.tableName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge style={{
                                    backgroundColor: dt.priority === 'high' 
                                      ? `color-mix(in srgb, ${colors.error} 20%, transparent)`
                                      : `color-mix(in srgb, ${colors.warning} 20%, transparent)`,
                                    color: dt.priority === 'high' ? colors.error : colors.warning,
                                  }}>
                                    {dt.priority}
                                  </Badge>
                                  <Badge variant="outline" style={{ borderColor: colors.border }}>
                                    {dt.accessType}
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
                                Suggested module: {dt.suggestedModule} • Columns: {dt.columns.length > 0 ? dt.columns.join(', ') : 'unknown'}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center h-[400px]">
              <Database className="w-16 h-16 mb-4" style={{ color: colors.textMuted }} />
              <h3 className="text-lg font-semibold mb-2" style={{ color: colors.text }}>Select a Stored Procedure</h3>
              <p style={{ color: colors.textMuted }}>
                Click on a stored procedure to view its intelligence analysis
              </p>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Discovered Tables Alert */}
      {discoveredTables.length > 0 && (
        <Card style={{ borderColor: colors.warning }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" style={{ color: colors.warning }} />
              Discovered Tables ({discoveredTables.length})
            </CardTitle>
            <CardDescription>
              Tables referenced in SPs but not found in uploaded DDL
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {discoveredTables.slice(0, 6).map((dt, i) => (
                <div 
                  key={i}
                  className="rounded-lg p-2 flex items-center justify-between"
                  style={{ backgroundColor: `color-mix(in srgb, ${colors.warning} 10%, transparent)` }}
                >
                  <span className="font-mono text-sm" style={{ color: colors.text }}>{dt.tableName}</span>
                  <Badge variant="outline" style={{ borderColor: colors.warning, color: colors.warning }}>
                    {dt.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
