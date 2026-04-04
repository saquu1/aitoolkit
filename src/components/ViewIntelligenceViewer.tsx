'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useTheme } from '@/hooks/useTheme'
import { 
  Eye,
  Table2,
  ArrowRightLeft,
  Calculator,
  GitBranch,
  Layout,
  FileJson,
  Shield,
  Search,
  Code,
  BarChart3,
  PieChart,
  Hash,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Layers
} from 'lucide-react'
import { ViewAnalyzerEngine, type ViewAnalysisResult, type ViewDef, type CaseStatementMapping, type CalculatedField, type EnumSuggestion } from '@/lib/view-analyzer'
import type { TableDef } from '@/lib/types'

interface ViewIntelligenceViewerProps {
  viewSql?: string // Raw SQL containing CREATE VIEW statements
  tables: TableDef[]
}

export function ViewIntelligenceViewer({ viewSql, tables }: ViewIntelligenceViewerProps) {
  const { colors } = useTheme()
  const [selectedView, setSelectedView] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'report' | 'dashboard' | 'lookup' | 'api'>('all')

  // Analyze views
  const analysisResults = useMemo(() => {
    if (!viewSql) return []
    const analyzer = new ViewAnalyzerEngine(tables)
    return analyzer.parseAndAnalyzeViews(viewSql)
  }, [viewSql, tables])

  // Filtered results
  const filteredResults = useMemo(() => {
    if (filter === 'all') return analysisResults
    return analysisResults.filter(r => r.view.purpose === filter)
  }, [analysisResults, filter])

  // All enum suggestions across views
  const allEnumSuggestions = useMemo(() => {
    return analysisResults.flatMap(r => r.enumSuggestions)
  }, [analysisResults])

  // All hidden relationships
  const allHiddenRelationships = useMemo(() => {
    return analysisResults.flatMap(r => r.hiddenRelationships)
  }, [analysisResults])

  // Statistics
  const stats = useMemo(() => {
    const total = analysisResults.length
    const byPurpose: Record<string, number> = {}
    let totalComplexity = 0
    let totalSourceTables = new Set<string>()
    
    for (const result of analysisResults) {
      byPurpose[result.view.purpose] = (byPurpose[result.view.purpose] || 0) + 1
      totalComplexity += result.view.complexity
      result.view.sourceTables.forEach(t => totalSourceTables.add(t.toLowerCase()))
    }
    
    return {
      total,
      byPurpose,
      avgComplexity: total > 0 ? Math.round(totalComplexity / total) : 0,
      uniqueSourceTables: totalSourceTables.size,
      enumCount: allEnumSuggestions.length,
      hiddenRelationshipsCount: allHiddenRelationships.length,
    }
  }, [analysisResults, allEnumSuggestions, allHiddenRelationships])

  const selectedResult = selectedView 
    ? analysisResults.find(r => r.view.viewName === selectedView) 
    : null

  const getPurposeColor = (purpose: ViewDef['purpose']) => {
    const colorMap: Record<ViewDef['purpose'], string> = {
      report: colors.primary,
      dashboard: colors.success,
      lookup: colors.accent,
      api: colors.warning,
      unknown: colors.textMuted,
    }
    return colorMap[purpose] || colors.textMuted
  }

  const getPurposeIcon = (purpose: ViewDef['purpose']) => {
    const iconMap: Record<ViewDef['purpose'], React.ReactNode> = {
      report: <FileJson className="w-4 h-4" />,
      dashboard: <PieChart className="w-4 h-4" />,
      lookup: <Search className="w-4 h-4" />,
      api: <Code className="w-4 h-4" />,
      unknown: <Eye className="w-4 h-4" />,
    }
    return iconMap[purpose] || <Eye className="w-4 h-4" />
  }

  if (!viewSql || analysisResults.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Eye className="h-12 w-12 mb-4" style={{ color: colors.textMuted }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: colors.text }}>No Views Detected</h3>
          <p className="text-sm text-center max-w-md" style={{ color: colors.textMuted }}>
            Upload SQL containing CREATE VIEW statements to analyze views for reports, dashboards, and hidden relationships
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="w-4 h-4" style={{ color: colors.primary }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>Total Views</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: colors.text }}>{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Table2 className="w-4 h-4" style={{ color: colors.accent }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>Source Tables</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: colors.text }}>{stats.uniqueSourceTables}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <GitBranch className="w-4 h-4" style={{ color: colors.warning }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>Hidden Relations</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: stats.hiddenRelationshipsCount > 0 ? colors.warning : colors.text }}>
              {stats.hiddenRelationshipsCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Hash className="w-4 h-4" style={{ color: colors.success }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>Enums Suggested</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: colors.text }}>{stats.enumCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-4 h-4" style={{ color: colors.accent }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>Avg Complexity</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: colors.text }}>{stats.avgComplexity}</div>
          </CardContent>
        </Card>
      </div>

      {/* Purpose Filter */}
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
        {Object.entries(stats.byPurpose).map(([purpose, count]) => (
          <Button
            key={purpose}
            size="sm"
            variant={filter === purpose ? 'default' : 'outline'}
            style={filter === purpose 
              ? { backgroundColor: getPurposeColor(purpose as ViewDef['purpose']), color: '#ffffff' }
              : { borderColor: colors.border, color: colors.textSecondary }
            }
            onClick={() => setFilter(purpose as typeof filter)}
          >
            {getPurposeIcon(purpose as ViewDef['purpose'])}
            <span className="ml-1">{purpose} ({count})</span>
          </Button>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-4">
        {/* View List */}
        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="w-4 h-4" style={{ color: colors.primary }} />
              Views ({filteredResults.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <div className="p-2 space-y-1">
                {filteredResults.map((result) => (
                  <div
                    key={result.view.viewName}
                    className={`rounded-lg p-2 cursor-pointer transition-all ${
                      selectedView === result.view.viewName ? 'ring-2' : ''
                    }`}
                    style={{
                      backgroundColor: selectedView === result.view.viewName 
                        ? `color-mix(in srgb, ${colors.primary} 10%, transparent)`
                        : `color-mix(in srgb, ${colors.bg} 50%, transparent)`,
                      ringColor: selectedView === result.view.viewName ? colors.primary : undefined,
                    }}
                    onClick={() => setSelectedView(result.view.viewName)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs truncate" style={{ color: colors.text }}>
                        {result.view.viewName}
                      </span>
                      <Badge 
                        style={{ 
                          backgroundColor: `color-mix(in srgb, ${getPurposeColor(result.view.purpose)} 20%, transparent)`,
                          color: getPurposeColor(result.view.purpose),
                        }}
                      >
                        {result.view.purpose}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs" style={{ color: colors.textMuted }}>
                        {result.view.sourceTables.length} tables
                      </span>
                      <span className="text-xs" style={{ color: colors.textMuted }}>
                        • {result.view.columns.length} cols
                      </span>
                      {result.view.caseStatements.length > 0 && (
                        <Badge variant="outline" style={{ borderColor: colors.accent, color: colors.accent }}>
                          {result.view.caseStatements.length} CASE
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                      {result.view.businessContext}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* View Details */}
        <Card className="col-span-2">
          {selectedResult ? (
            <>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-mono flex items-center gap-2">
                      <Eye className="w-5 h-5" style={{ color: colors.primary }} />
                      {selectedResult.view.viewName}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Badge style={{ 
                        backgroundColor: `color-mix(in srgb, ${getPurposeColor(selectedResult.view.purpose)} 20%, transparent)`,
                        color: getPurposeColor(selectedResult.view.purpose),
                      }}>
                        {getPurposeIcon(selectedResult.view.purpose)}
                        <span className="ml-1">{selectedResult.view.purpose}</span>
                      </Badge>
                      <span style={{ color: colors.textMuted }}>
                        Complexity: {selectedResult.view.complexity}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" style={{ borderColor: colors.success, color: colors.success }}>
                      {selectedResult.suggestedReportType}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="structure">
                  <TabsList className="mb-4">
                    <TabsTrigger value="structure" className="flex items-center gap-1">
                      <Table2 className="w-3 h-3" />
                      Structure ({selectedResult.view.columns.length})
                    </TabsTrigger>
                    <TabsTrigger value="calculated" className="flex items-center gap-1">
                      <Calculator className="w-3 h-3" />
                      Calculated ({selectedResult.view.calculatedFields.length})
                    </TabsTrigger>
                    <TabsTrigger value="enums" className="flex items-center gap-1">
                      <Hash className="w-3 h-3" />
                      CASE/Enums ({selectedResult.view.caseStatements.length})
                    </TabsTrigger>
                    <TabsTrigger value="widgets" className="flex items-center gap-1">
                      <Layout className="w-3 h-3" />
                      Widgets ({selectedResult.suggestedDashboardWidgets.length})
                    </TabsTrigger>
                    <TabsTrigger value="hidden" className="flex items-center gap-1">
                      <GitBranch className="w-3 h-3" />
                      Hidden FKs ({selectedResult.hiddenRelationships.length})
                    </TabsTrigger>
                  </TabsList>

                  {/* Structure Tab */}
                  <TabsContent value="structure">
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-4">
                        {/* Source Tables */}
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2" style={{ color: colors.text }}>
                            <Table2 className="w-4 h-4" style={{ color: colors.accent }} />
                            Source Tables ({selectedResult.view.sourceTables.length})
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedResult.view.sourceTables.map((table, i) => (
                              <Badge 
                                key={i}
                                style={{ 
                                  backgroundColor: `color-mix(in srgb, ${colors.accent} 20%, transparent)`,
                                  color: colors.accent,
                                }}
                              >
                                {table}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* JOIN Relationships */}
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2" style={{ color: colors.text }}>
                            <ArrowRightLeft className="w-4 h-4" style={{ color: colors.primary }} />
                            JOIN Relationships ({selectedResult.view.joinRelationships.length})
                          </h4>
                          <div className="space-y-2">
                            {selectedResult.view.joinRelationships.map((join, i) => (
                              <div 
                                key={i}
                                className="rounded-lg p-2 flex items-center gap-2"
                                style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}
                              >
                                <span className="font-mono text-sm" style={{ color: colors.text }}>{join.fromTable}</span>
                                <ArrowRightLeft className="w-4 h-4" style={{ color: colors.primary }} />
                                <span className="font-mono text-sm" style={{ color: colors.text }}>{join.toTable}</span>
                                <Badge variant="outline" style={{ borderColor: colors.accent, color: colors.accent }}>
                                  {join.joinType}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Columns */}
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2" style={{ color: colors.text }}>
                            <Layers className="w-4 h-4" style={{ color: colors.warning }} />
                            Columns ({selectedResult.view.columns.length})
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            {selectedResult.view.columns.slice(0, 20).map((col, i) => (
                              <div 
                                key={i}
                                className="rounded-lg p-2 flex items-center justify-between"
                                style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs" style={{ color: colors.text }}>{col.name}</span>
                                  {col.sourceTable && (
                                    <span className="text-xs" style={{ color: colors.textMuted }}>
                                      ({col.sourceTable}.{col.sourceColumn})
                                    </span>
                                  )}
                                </div>
                                <div className="flex gap-1">
                                  {col.isCalculated && (
                                    <Badge variant="outline" style={{ borderColor: colors.warning, color: colors.warning }}>
                                      CALC
                                    </Badge>
                                  )}
                                  {col.isAggregated && (
                                    <Badge variant="outline" style={{ borderColor: colors.success, color: colors.success }}>
                                      {col.aggregationFunction}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  {/* Calculated Fields Tab */}
                  <TabsContent value="calculated">
                    <ScrollArea className="h-[300px]">
                      {selectedResult.view.calculatedFields.length === 0 ? (
                        <div className="text-center py-8" style={{ color: colors.textMuted }}>
                          No calculated fields detected
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {selectedResult.view.calculatedFields.map((field, i) => (
                            <div 
                              key={i}
                              className="rounded-lg p-3"
                              style={{ backgroundColor: `color-mix(in srgb, ${colors.warning} 10%, transparent)` }}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Calculator className="w-4 h-4" style={{ color: colors.warning }} />
                                  <span className="font-medium" style={{ color: colors.text }}>{field.columnName}</span>
                                  <Badge variant="outline" style={{ borderColor: colors.border }}>
                                    {field.dataType}
                                  </Badge>
                                </div>
                              </div>
                              <pre 
                                className="text-xs p-2 rounded mb-2 overflow-auto"
                                style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 80%, transparent)` }}
                              >
                                {field.expression}
                              </pre>
                              <div className="flex items-center gap-2 text-xs">
                                <Lightbulb className="w-3 h-3" style={{ color: colors.accent }} />
                                <span style={{ color: colors.textSecondary }}>{field.businessMeaning}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  {/* CASE/Enums Tab */}
                  <TabsContent value="enums">
                    <ScrollArea className="h-[300px]">
                      {selectedResult.view.caseStatements.length === 0 ? (
                        <div className="text-center py-8" style={{ color: colors.textMuted }}>
                          No CASE statements found
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {selectedResult.view.caseStatements.map((cs, i) => (
                            <div 
                              key={i}
                              className="rounded-lg p-3"
                              style={{ backgroundColor: `color-mix(in srgb, ${colors.accent} 10%, transparent)` }}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Hash className="w-4 h-4" style={{ color: colors.accent }} />
                                  <span className="font-medium" style={{ color: colors.text }}>{cs.columnName}</span>
                                </div>
                                <div className="flex gap-2">
                                  <Badge variant="outline" style={{ borderColor: colors.accent, color: colors.accent }}>
                                    {cs.mappingType}
                                  </Badge>
                                  <Badge style={{ 
                                    backgroundColor: `color-mix(in srgb, ${colors.success} 20%, transparent)`,
                                    color: colors.success,
                                  }}>
                                    {cs.suggestedEnum}
                                  </Badge>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2 mb-2">
                                {cs.mappings.map((m, j) => (
                                  <div 
                                    key={j}
                                    className="flex items-center justify-between text-xs p-2 rounded"
                                    style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}
                                  >
                                    <span className="font-mono" style={{ color: colors.textSecondary }}>{m.when}</span>
                                    <span style={{ color: colors.text }}>→ {m.then}</span>
                                  </div>
                                ))}
                              </div>
                              
                              <p className="text-xs" style={{ color: colors.textMuted }}>{cs.businessRule}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  {/* Dashboard Widgets Tab */}
                  <TabsContent value="widgets">
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2" style={{ color: colors.text }}>
                            <Layout className="w-4 h-4" style={{ color: colors.primary }} />
                            Suggested Report Type
                          </h4>
                          <Badge 
                            className="text-sm"
                            style={{ 
                              backgroundColor: `color-mix(in srgb, ${colors.primary} 20%, transparent)`,
                              color: colors.primary,
                            }}
                          >
                            {selectedResult.suggestedReportType}
                          </Badge>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2" style={{ color: colors.text }}>
                            <BarChart3 className="w-4 h-4" style={{ color: colors.success }} />
                            Dashboard Widgets
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            {selectedResult.suggestedDashboardWidgets.map((widget, i) => (
                              <div 
                                key={i}
                                className="rounded-lg p-3 flex items-center gap-2"
                                style={{ backgroundColor: `color-mix(in srgb, ${colors.success} 10%, transparent)` }}
                              >
                                <PieChart className="w-4 h-4" style={{ color: colors.success }} />
                                <span style={{ color: colors.text }}>{widget}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2" style={{ color: colors.text }}>
                            <Code className="w-4 h-4" style={{ color: colors.accent }} />
                            API Endpoints
                          </h4>
                          <div className="space-y-2">
                            {selectedResult.apiEndpointSuggestions.map((endpoint, i) => (
                              <div 
                                key={i}
                                className="rounded-lg p-2 font-mono text-sm"
                                style={{ 
                                  backgroundColor: `color-mix(in srgb, ${colors.accent} 10%, transparent)`,
                                  color: colors.text,
                                }}
                              >
                                {endpoint}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  {/* Hidden FKs Tab */}
                  <TabsContent value="hidden">
                    <ScrollArea className="h-[300px]">
                      {selectedResult.hiddenRelationships.length === 0 ? (
                        <div className="text-center py-8">
                          <CheckCircle2 className="w-12 h-12 mx-auto mb-2" style={{ color: colors.success }} />
                          <p style={{ color: colors.textMuted }}>All relationships are defined in FKs</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {selectedResult.hiddenRelationships.map((rel, i) => (
                            <div 
                              key={i}
                              className="rounded-lg p-3"
                              style={{ backgroundColor: `color-mix(in srgb, ${colors.warning} 10%, transparent)` }}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle className="w-4 h-4" style={{ color: colors.warning }} />
                                <span className="font-medium" style={{ color: colors.text }}>
                                  {rel.fromTable} → {rel.toTable}
                                </span>
                                <Badge variant="outline" style={{ borderColor: colors.border }}>
                                  {rel.relationshipType}
                                </Badge>
                              </div>
                              <p className="text-xs" style={{ color: colors.textMuted }}>
                                Discovered via: {rel.discoveredVia} • Confidence: {rel.confidence}%
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
              <Eye className="w-16 h-16 mb-4" style={{ color: colors.textMuted }} />
              <h3 className="text-lg font-semibold mb-2" style={{ color: colors.text }}>Select a View</h3>
              <p style={{ color: colors.textMuted }}>
                Click on a view to view its intelligence analysis
              </p>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Enum Suggestions Summary */}
      {allEnumSuggestions.length > 0 && (
        <Card style={{ borderColor: colors.accent }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Hash className="w-4 h-4" style={{ color: colors.accent }} />
              Discovered Enums ({allEnumSuggestions.length})
            </CardTitle>
            <CardDescription>
              Suggested enums from CASE statements across all views
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {allEnumSuggestions.slice(0, 6).map((en, i) => (
                <div 
                  key={i}
                  className="rounded-lg p-2"
                  style={{ backgroundColor: `color-mix(in srgb, ${colors.accent} 10%, transparent)` }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-sm" style={{ color: colors.text }}>{en.enumName}</span>
                    <Badge variant="outline" style={{ borderColor: colors.border }}>
                      {en.values.length} values
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {en.values.slice(0, 4).map((v, j) => (
                      <Badge 
                        key={j}
                        variant="outline" 
                        className="text-xs"
                        style={{ borderColor: colors.border, color: colors.textSecondary }}
                      >
                        {v.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
