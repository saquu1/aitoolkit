"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSchema } from "@/hooks/useSchema"
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  PieChart,
  LineChart,
  Filter,
  RefreshCw
} from "lucide-react"
import { ConfidenceIndicator, ConfidenceBadge } from "@/components/ConfidenceIndicator"

interface QualityMetrics {
  avgConfidence: number
  highConfidence: number
  mediumConfidence: number
  lowConfidence: number
  unverified: number
  totalConflicts: number
  resolvedConflicts: number
  pendingConflicts: number
  criticalConflicts: number
  pendingVerifications: number
  qualityScore: number
}

interface LowConfidenceItem {
  id: string
  entityType: string
  entityId: string
  score: number
  confidence: string
  factors: string
}

interface ConflictItem {
  id: string
  entityType: string
  entityId: string
  conflictType: string
  severity: string
  status: string
  source1Agent: string
  source2Agent: string
}

export function QualityDashboardTab() {
  // Connect to shared schema state
  const { 
    parseResult, 
    totalTables, 
    totalColumns, 
    fkResolvedPercent, 
    modulesLinked, 
    missingTables 
  } = useSchema()
  
  const [metrics, setMetrics] = useState<QualityMetrics | null>(null)
  const [lowConfidenceItems, setLowConfidenceItems] = useState<LowConfidenceItem[]>([])
  const [conflicts, setConflicts] = useState<ConflictItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadQualityData()
  }, [])

  async function loadQualityData() {
    setLoading(true)
    try {
      // In production, these would be API calls
      // For now, use mock data
      setMetrics({
        avgConfidence: 0.78,
        highConfidence: 234,
        mediumConfidence: 156,
        lowConfidence: 45,
        unverified: 12,
        totalConflicts: 28,
        resolvedConflicts: 16,
        pendingConflicts: 12,
        criticalConflicts: 3,
        pendingVerifications: 45,
        qualityScore: 78
      })
      
      setLowConfidenceItems([
        { id: '1', entityType: 'column', entityId: 'col_1', score: 0.45, confidence: 'low', factors: '[]' },
        { id: '2', entityType: 'fk', entityId: 'fk_1', score: 0.38, confidence: 'low', factors: '[]' },
        { id: '3', entityType: 'column', entityId: 'col_2', score: 0.52, confidence: 'low', factors: '[]' },
      ])
      
      setConflicts([
        { id: '1', entityType: 'column', entityId: 'col_1', conflictType: 'type_mismatch', severity: 'high', status: 'pending', source1Agent: 'sql_parser', source2Agent: 'cshtml_parser' },
        { id: '2', entityType: 'fk', entityId: 'fk_1', conflictType: 'constraint_conflict', severity: 'medium', status: 'pending', source1Agent: 'ddl_parser', source2Agent: 'sp_parser' },
        { id: '3', entityType: 'column', entityId: 'col_3', conflictType: 'naming_conflict', severity: 'low', status: 'pending', source1Agent: 'ai_analyzer', source2Agent: 'sql_parser' },
      ])
    } catch (error) {
      console.error('Failed to load quality data:', error)
    }
    setLoading(false)
  }

  const confidenceChartData = useMemo(() => {
    if (!metrics) return []
    return [
      { label: 'High', value: metrics.highConfidence, color: '#22c55e' },
      { label: 'Medium', value: metrics.mediumConfidence, color: '#eab308' },
      { label: 'Low', value: metrics.lowConfidence, color: '#f97316' },
      { label: 'Unverified', value: metrics.unverified, color: '#ef4444' }
    ]
  }, [metrics])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Quality Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor confidence scores, conflicts, and verification status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            Last updated: {new Date().toLocaleTimeString()}
          </Badge>
          <Button variant="outline" size="sm" onClick={loadQualityData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-500" />
              Quality Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics?.qualityScore || 0}%</div>
            <Progress value={metrics?.qualityScore || 0} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Overall data quality
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Avg Confidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {Math.round((metrics?.avgConfidence || 0) * 100)}%
            </div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3 text-green-500" />
              <span className="text-xs text-green-500">+5% from last week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Pending Conflicts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">
              {metrics?.pendingConflicts || 0}
            </div>
            {metrics?.criticalConflicts ? (
              <Badge variant="destructive" className="mt-1">
                {metrics.criticalConflicts} critical
              </Badge>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              Need Verification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">
              {metrics?.pendingVerifications || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Items requiring review
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="confidence">Confidence Analysis</TabsTrigger>
          <TabsTrigger value="conflicts">Conflicts ({metrics?.pendingConflicts || 0})</TabsTrigger>
          <TabsTrigger value="verification">Verification Queue</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Confidence Distribution */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Confidence Distribution</CardTitle>
                <CardDescription>
                  Breakdown by confidence level
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {confidenceChartData.map(item => (
                    <div key={item.label} className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }} 
                      />
                      <span className="flex-1">{item.label}</span>
                      <span className="font-medium">{item.value}</span>
                      <Progress 
                        value={(item.value / (metrics?.highConfidence + metrics?.mediumConfidence + metrics?.lowConfidence + metrics?.unverified || 1)) * 100} 
                        className="w-24 h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Conflict Resolution</CardTitle>
                <CardDescription>
                  Resolution progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Resolved</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      {metrics?.resolvedConflicts || 0}
                    </Badge>
                  </div>
                  <Progress 
                    value={((metrics?.resolvedConflicts || 0) / (metrics?.totalConflicts || 1)) * 100} 
                    className="h-2"
                  />
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Pending</span>
                    <span>{metrics?.pendingConflicts || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Total</span>
                    <span>{metrics?.totalConflicts || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Issues */}
          <Card>
            <CardHeader>
              <CardTitle>Items Requiring Attention</CardTitle>
              <CardDescription>
                Low confidence and unverified entities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lowConfidenceItems.slice(0, 5).map(item => (
                  <div 
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                      <div>
                        <p className="font-medium text-sm">{item.entityType}: {item.entityId}</p>
                        <p className="text-xs text-muted-foreground">
                          Score: {Math.round(item.score * 100)}%
                        </p>
                      </div>
                    </div>
                    <ConfidenceBadge 
                      score={item.score} 
                      confidence={item.confidence as any} 
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="confidence" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Confidence Score Analysis</CardTitle>
              <CardDescription>
                Detailed breakdown of confidence scores by entity type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <PieChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Confidence analysis charts will appear here</p>
                <p className="text-sm">Powered by your data extraction pipeline</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conflicts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pending Conflicts</CardTitle>
                  <CardDescription>
                    Resolution required for these conflicts
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  Auto-Resolve
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {conflicts.map(conflict => (
                  <div 
                    key={conflict.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${
                        conflict.severity === 'critical' ? 'bg-red-100' :
                        conflict.severity === 'high' ? 'bg-orange-100' :
                        conflict.severity === 'medium' ? 'bg-yellow-100' : 'bg-gray-100'
                      }`}>
                        <AlertTriangle className={`w-4 h-4 ${
                          conflict.severity === 'critical' ? 'text-red-600' :
                          conflict.severity === 'high' ? 'text-orange-600' :
                          conflict.severity === 'medium' ? 'text-yellow-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium">
                          {conflict.entityType}: {conflict.entityId}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {conflict.conflictType.replace('_', ' ')} between {conflict.source1Agent} and {conflict.source2Agent}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        conflict.severity === 'critical' ? 'destructive' :
                        conflict.severity === 'high' ? 'default' : 'secondary'
                      }>
                        {conflict.severity}
                      </Badge>
                      <Button size="sm">Resolve</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verification" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Verification Queue</CardTitle>
              <CardDescription>
                Items that need manual verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{metrics?.pendingVerifications || 0} items pending verification</p>
                <Button variant="outline" className="mt-4">
                  Start Verification
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
