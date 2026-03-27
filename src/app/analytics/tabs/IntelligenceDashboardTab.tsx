'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertTriangle, TrendingUp, TrendingDown, Minus, DollarSign, 
  RefreshCw, AlertCircle, CheckCircle, Lightbulb, Zap,
  Activity, Target, BarChart3, PieChart as PieChartIcon, Shield,
  GitBranch, Clock, FileCode, Layers, ArrowRight, ChevronRight,
  Wallet, Repeat, Brain, Gauge
} from 'lucide-react'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

// Types
interface IssueRecurrence {
  id: string
  patternId: string
  issueType: string
  title: string
  signature: string
  linkedIssues: string[]
  linkedSessions: string[]
  totalOccurrences: number
  totalTokens: number
  totalCost: number
  totalDuration: number
  trend: 'increasing' | 'stable' | 'decreasing'
  lastOccurrence: string
}

interface CostAnalysis {
  cacheStats: {
    totalRequests: number
    cacheHits: number
    cacheMisses: number
    hitRate: number
    estimatedSavings: number
  }
  wasteAnalysis: {
    duplicateCalls: number
    unnecessaryRedos: number
    inefficientPatterns: string[]
    wastedTokens: number
    wastedCost: number
  }
  savingsProjection: {
    potentialSavings: number
    recommendations: CostRecommendation[]
    projectedMonthly: number
    projectedYearly: number
  }
  modelEfficiency: ModelEfficiencyRecord[]
}

interface CostRecommendation {
  id: string
  type: string
  description: string
  potentialSavings: number
  effort: 'low' | 'medium' | 'high'
  priority: number
}

interface ModelEfficiencyRecord {
  model: string
  sessions: number
  avgCostPerFeature: number
  avgTokensPerFeature: number
  efficiency: number
  recommendation: string
}

interface PatternRiskEntry {
  id: string
  name: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  occurrences: number
  riskScore: number
  impact: string
  recommendation: string
  fixTemplate?: string
}

interface WorkflowIntelligence {
  optimalTimes: Array<{ hour: number; efficiency: number; sessions: number }>
  sequencePatterns: Array<{ pattern: string; frequency: number; successRate: number }>
  bottlenecks: Array<{ stage: string; avgDelay: number; occurrences: number }>
  recommendations: Array<{ area: string; improvement: string; potentialGain: number }>
}

interface IntelligenceData {
  success: boolean
  recurrences: IssueRecurrence[]
  costAnalysis: CostAnalysis
  patternRisks: PatternRiskEntry[]
  workflowIntelligence: WorkflowIntelligence
  summary: {
    overallRiskScore: number
    totalRecurrences: number
    potentialSavings: number
    criticalPatterns: number
    efficiencyGain: number
  }
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-500 border-red-500/30',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
  low: 'bg-green-500/10 text-green-500 border-green-500/30'
}

const EFFORT_COLORS: Record<string, string> = {
  low: 'bg-green-500/10 text-green-500',
  medium: 'bg-yellow-500/10 text-yellow-500',
  high: 'bg-red-500/10 text-red-500'
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export function IntelligenceDashboardTab() {
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<IntelligenceData | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      // Fetch all intelligence data in parallel
      const [recurrenceRes, costRes, patternsRes, workflowRes, overviewRes] = await Promise.all([
        fetch('/api/analytics/intelligence?action=recurrences'),
        fetch('/api/analytics/intelligence?action=cost-analysis'),
        fetch('/api/analytics/intelligence?action=pattern-risks'),
        fetch('/api/analytics/intelligence?action=workflow-intelligence'),
        fetch('/api/analytics/intelligence?action=intelligence-overview')
      ])

      const recurrences = await recurrenceRes.json()
      const costAnalysis = await costRes.json()
      const patternRisks = await patternsRes.json()
      const workflowIntelligence = await workflowRes.json()
      const overview = await overviewRes.json()

      setData({
        success: true,
        recurrences: recurrences.recurrences || [],
        costAnalysis: costAnalysis.analysis || getDefaultCostAnalysis(),
        patternRisks: patternRisks.risks || [],
        workflowIntelligence: workflowIntelligence.workflow || getDefaultWorkflow(),
        summary: {
          overallRiskScore: overview.overview?.riskScore || 75,
          totalRecurrences: recurrences.recurrences?.length || 0,
          potentialSavings: costAnalysis.analysis?.savingsProjection?.potentialSavings || 0,
          criticalPatterns: patternRisks.risks?.filter((p: PatternRiskEntry) => p.severity === 'critical' || p.severity === 'high').length || 0,
          efficiencyGain: workflowIntelligence.workflow?.recommendations?.reduce((sum: number, r: any) => sum + r.potentialGain, 0) || 0
        }
      })
    } catch (error) {
      console.error('Failed to fetch intelligence data:', error)
      // Set default data on error
      setData({
        success: true,
        recurrences: [],
        costAnalysis: getDefaultCostAnalysis(),
        patternRisks: [],
        workflowIntelligence: getDefaultWorkflow(),
        summary: {
          overallRiskScore: 75,
          totalRecurrences: 0,
          potentialSavings: 0,
          criticalPatterns: 0,
          efficiencyGain: 0
        }
      })
    } finally {
      setIsLoading(false)
      setLastRefresh(new Date())
    }
  }

  useEffect(() => {
    setMounted(true)
    fetchData()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const summary = data?.summary || {
    overallRiskScore: 75,
    totalRecurrences: 0,
    potentialSavings: 0,
    criticalPatterns: 0,
    efficiencyGain: 0
  }

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    if (score >= 40) return 'text-orange-500'
    return 'text-red-500'
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6" />
              Intelligence Dashboard
            </h2>
            <p className="text-sm text-muted-foreground">
              Issue recurrence, cost anomalies, pattern risks, and workflow intelligence
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">
              {mounted && lastRefresh ? `Last updated: ${lastRefresh.toLocaleTimeString()}` : 'Loading...'}
            </span>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Risk Score Banner */}
        <Alert className={`${summary.overallRiskScore >= 70 ? 'border-green-500/50 bg-green-500/10' : 
                          summary.overallRiskScore >= 50 ? 'border-yellow-500/50 bg-yellow-500/10' : 
                          'border-red-500/50 bg-red-500/10'}`}>
          <Shield className={`h-5 w-5 ${getRiskColor(summary.overallRiskScore)}`} />
          <AlertTitle className="flex items-center justify-between">
            <span>Overall Health Score</span>
            <span className={`text-2xl font-bold ${getRiskColor(summary.overallRiskScore)}`}>
              {summary.overallRiskScore}/100
            </span>
          </AlertTitle>
          <AlertDescription>
            <div className="grid grid-cols-4 gap-4 mt-2">
              <div>
                <p className="text-xs text-muted-foreground">Recurrences</p>
                <p className="font-semibold">{summary.totalRecurrences}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Potential Savings</p>
                <p className="font-semibold">${summary.potentialSavings.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Critical Patterns</p>
                <p className="font-semibold">{summary.criticalPatterns}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Efficiency Gain</p>
                <p className="font-semibold">{summary.efficiencyGain.toFixed(0)}%</p>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Main Tabs */}
        <Tabs defaultValue="recurrence" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="recurrence" className="flex items-center gap-2">
              <Repeat className="h-4 w-4" />
              F6: Recurrence
            </TabsTrigger>
            <TabsTrigger value="cost" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              F7: Cost
            </TabsTrigger>
            <TabsTrigger value="patterns" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              F9: Patterns
            </TabsTrigger>
            <TabsTrigger value="workflow" className="flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              F10: Workflow
            </TabsTrigger>
          </TabsList>

          {/* F6: Issue Recurrence Tracker */}
          <TabsContent value="recurrence">
            <IssueRecurrencePanel recurrences={data?.recurrences || []} />
          </TabsContent>

          {/* F7: Cost Anomaly Detector */}
          <TabsContent value="cost">
            <CostAnalysisPanel analysis={data?.costAnalysis || getDefaultCostAnalysis()} />
          </TabsContent>

          {/* F9: Pattern Risk Scorer */}
          <TabsContent value="patterns">
            <PatternRiskPanel patterns={data?.patternRisks || []} />
          </TabsContent>

          {/* F10: Workflow Intelligence */}
          <TabsContent value="workflow">
            <WorkflowIntelligencePanel workflow={data?.workflowIntelligence || getDefaultWorkflow()} />
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  )
}

// =============================================================================
// SUB-PANELS
// =============================================================================

function IssueRecurrencePanel({ recurrences }: { recurrences: IssueRecurrence[] }) {
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-orange-500" />
              <span className="text-sm text-muted-foreground">Total Patterns</span>
            </div>
            <p className="text-2xl font-bold mt-2">{recurrences.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-red-500" />
              <span className="text-sm text-muted-foreground">Increasing</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {recurrences.filter(r => r.trend === 'increasing').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Total Cost</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              ${recurrences.reduce((sum, r) => sum + r.totalCost, 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recurrence List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Issue Recurrence Tracker
          </CardTitle>
          <CardDescription>
            Issues that have occurred multiple times across sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recurrences.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>No recurring issues detected</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3 pr-4">
                {recurrences.map((recurrence) => (
                  <div
                    key={recurrence.id}
                    className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{recurrence.issueType}</Badge>
                          <Badge className={
                            recurrence.trend === 'increasing' ? 'bg-red-500/10 text-red-500' :
                            recurrence.trend === 'decreasing' ? 'bg-green-500/10 text-green-500' :
                            'bg-yellow-500/10 text-yellow-500'
                          }>
                            {recurrence.trend === 'increasing' ? <TrendingUp className="h-3 w-3 mr-1" /> :
                             recurrence.trend === 'decreasing' ? <TrendingDown className="h-3 w-3 mr-1" /> :
                             <Minus className="h-3 w-3 mr-1" />}
                            {recurrence.trend}
                          </Badge>
                        </div>
                        <p className="font-medium mt-2">{recurrence.title}</p>
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{recurrence.totalOccurrences} occurrences</span>
                          <span>{recurrence.linkedSessions.length} sessions</span>
                          <span>{formatNumber(recurrence.totalTokens)} tokens</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${recurrence.totalCost.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(recurrence.lastOccurrence)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function CostAnalysisPanel({ analysis }: { analysis: CostAnalysis }) {
  const { cacheStats, wasteAnalysis, savingsProjection, modelEfficiency } = analysis

  // Prepare chart data for model efficiency
  const modelChartData = modelEfficiency.map(m => ({
    name: m.model.split('-').pop() || m.model,
    efficiency: m.efficiency,
    cost: m.avgCostPerFeature * 100 // Scale for visibility
  }))

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Cache Hit Rate</span>
            </div>
            <p className="text-2xl font-bold mt-2">{cacheStats.hitRate.toFixed(0)}%</p>
            <Progress value={cacheStats.hitRate} className="h-2 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span className="text-sm text-muted-foreground">Wasted Cost</span>
            </div>
            <p className="text-2xl font-bold mt-2">${wasteAnalysis.wastedCost.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatNumber(wasteAnalysis.wastedTokens)} tokens
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Potential Savings</span>
            </div>
            <p className="text-2xl font-bold mt-2">${savingsProjection.potentialSavings.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              ${savingsProjection.projectedMonthly.toFixed(2)}/mo
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              <span className="text-sm text-muted-foreground">Inefficiencies</span>
            </div>
            <p className="text-2xl font-bold mt-2">{wasteAnalysis.duplicateCalls + wasteAnalysis.unnecessaryRedos}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {wasteAnalysis.duplicateCalls} dupes, {wasteAnalysis.unnecessaryRedos} redos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Model Efficiency Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Model Efficiency Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {modelChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modelChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="efficiency" fill="#10b981" name="Efficiency %" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No model data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Cost Optimization Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {savingsProjection.recommendations.map((rec, index) => (
              <div key={rec.id} className="p-3 rounded-lg border">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <div className={`p-2 rounded ${EFFORT_COLORS[rec.effort]}`}>
                      {rec.type === 'cache' ? <Activity className="h-4 w-4" /> :
                       rec.type === 'model_switch' ? <Zap className="h-4 w-4" /> :
                       rec.type === 'pattern_optimization' ? <Target className="h-4 w-4" /> :
                       <Layers className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-medium">{rec.description}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{rec.type}</Badge>
                        <Badge className={`text-xs ${EFFORT_COLORS[rec.effort]}`}>
                          {rec.effort} effort
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-500">
                      ${rec.potentialSavings.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">saved</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PatternRiskPanel({ patterns }: { patterns: PatternRiskEntry[] }) {
  // Group by severity
  const severityGroups = {
    critical: patterns.filter(p => p.severity === 'critical'),
    high: patterns.filter(p => p.severity === 'high'),
    medium: patterns.filter(p => p.severity === 'medium'),
    low: patterns.filter(p => p.severity === 'low')
  }

  // Chart data for risk distribution
  const riskDistribution = [
    { name: 'Critical', value: severityGroups.critical.length, color: '#ef4444' },
    { name: 'High', value: severityGroups.high.length, color: '#f97316' },
    { name: 'Medium', value: severityGroups.medium.length, color: '#eab308' },
    { name: 'Low', value: severityGroups.low.length, color: '#22c55e' }
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <CardTitle className="text-sm flex items-center gap-2 mb-4">
              <PieChartIcon className="h-4 w-4" />
              Risk Distribution
            </CardTitle>
            <div className="h-40">
              {riskDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {riskDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No pattern risks
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <CardTitle className="text-sm mb-4">Risk Summary</CardTitle>
            <div className="space-y-3">
              {Object.entries(severityGroups).map(([severity, items]) => (
                <div key={severity} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      severity === 'critical' ? 'bg-red-500' :
                      severity === 'high' ? 'bg-orange-500' :
                      severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />
                    <span className="text-sm capitalize">{severity}</span>
                  </div>
                  <Badge className={SEVERITY_COLORS[severity]}>{items.length}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pattern List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Pattern Risk Assessment
          </CardTitle>
          <CardDescription>
            Identified patterns ranked by risk score and severity
          </CardDescription>
        </CardHeader>
        <CardContent>
          {patterns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>No risk patterns detected</p>
            </div>
          ) : (
            <ScrollArea className="h-[350px]">
              <div className="space-y-2 pr-4">
                {patterns.map((pattern) => (
                  <div
                    key={pattern.id}
                    className={`p-3 rounded-lg border ${SEVERITY_COLORS[pattern.severity]}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge className={SEVERITY_COLORS[pattern.severity]}>
                            {pattern.severity}
                          </Badge>
                          <span className="text-xs">Risk: {pattern.riskScore}</span>
                        </div>
                        <p className="font-medium mt-1">{pattern.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {pattern.occurrences} occurrences • {pattern.impact}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 mt-2" />
                    </div>
                    {pattern.recommendation && (
                      <div className="mt-2 p-2 bg-background/50 rounded text-xs">
                        <Lightbulb className="h-3 w-3 inline mr-1" />
                        {pattern.recommendation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function WorkflowIntelligencePanel({ workflow }: { workflow: WorkflowIntelligence }) {
  const { optimalTimes, sequencePatterns, bottlenecks, recommendations } = workflow

  // Prepare chart data for optimal times
  const timeChartData = optimalTimes.map(t => ({
    hour: `${t.hour}:00`,
    efficiency: t.efficiency,
    sessions: t.sessions
  }))

  return (
    <div className="space-y-4">
      {/* Optimal Times Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Productivity by Hour
          </CardTitle>
          <CardDescription>
            Best times for AI coding sessions based on historical efficiency
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            {timeChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="hour" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Area type="monotone" dataKey="efficiency" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No timing data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {/* Sequence Patterns */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Common Sequences
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sequencePatterns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No sequence data</p>
            ) : (
              <div className="space-y-2">
                {sequencePatterns.slice(0, 5).map((seq, i) => (
                  <div key={i} className="p-2 rounded bg-muted/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm truncate">{seq.pattern}</span>
                      <Badge variant="outline" className="text-xs">{seq.frequency}x</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {seq.successRate}% success rate
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottlenecks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Workflow Bottlenecks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bottlenecks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No bottlenecks detected</p>
            ) : (
              <div className="space-y-2">
                {bottlenecks.slice(0, 5).map((bn, i) => (
                  <div key={i} className="p-2 rounded bg-muted/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{bn.stage}</span>
                      <Badge variant="destructive" className="text-xs">
                        {bn.avgDelay.toFixed(0)}s delay
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {bn.occurrences} occurrences
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Workflow Optimization Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recommendations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>Workflow is optimized</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recommendations.map((rec, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="p-2 rounded bg-green-500/10">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{rec.area}</p>
                    <p className="text-sm text-muted-foreground">{rec.improvement}</p>
                  </div>
                  <Badge className="bg-green-500/10 text-green-500">
                    +{rec.potentialGain}% efficiency
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getDefaultCostAnalysis(): CostAnalysis {
  return {
    cacheStats: { totalRequests: 0, cacheHits: 0, cacheMisses: 0, hitRate: 0, estimatedSavings: 0 },
    wasteAnalysis: { duplicateCalls: 0, unnecessaryRedos: 0, inefficientPatterns: [], wastedTokens: 0, wastedCost: 0 },
    savingsProjection: { potentialSavings: 0, recommendations: [], projectedMonthly: 0, projectedYearly: 0 },
    modelEfficiency: []
  }
}

function getDefaultWorkflow(): WorkflowIntelligence {
  return {
    optimalTimes: [],
    sequencePatterns: [],
    bottlenecks: [],
    recommendations: []
  }
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export default IntelligenceDashboardTab
