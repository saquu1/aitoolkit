'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Activity, AlertTriangle, BarChart3, Clock, DollarSign, 
  FileCode, GitBranch, Lightbulb, ListTodo, Package, 
  TrendingUp, Users, Zap, ArrowRight, RefreshCw, Brain,
  Settings
} from 'lucide-react'
import {
  LineChart as RechartsLineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

// Tab Components
import { OverviewTab } from './tabs/OverviewTab'
import { SessionsTab } from './tabs/SessionsTab'
import { ThreadReconstructorTab } from './tabs/ThreadReconstructorTab'
import { FileHeatmapTab } from './tabs/FileHeatmapTab'
import { KanbanBoardTab } from './tabs/KanbanBoardTab'
import { PatternsTab } from './tabs/PatternsTab'
import { ReportsTab } from './tabs/ReportsTab'
import { ReasoningTab } from './tabs/ReasoningTab'
import { EfficiencyTrendsTab } from './tabs/EfficiencyTrendsTab'
import { IntelligenceDashboardTab } from './tabs/IntelligenceDashboardTab'
import { AutomationTab } from './tabs/AutomationTab'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

// Inner component that uses useSearchParams
function AnalyticsDashboardContent() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') || 'overview'
  
  const [activeTab, setActiveTab] = useState(initialTab)
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)
  
  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [overviewRes, intelligenceRes, dashboardRes] = await Promise.all([
        fetch('/api/analytics?action=dashboard'),
        fetch('/api/analytics/intelligence?action=intelligence-overview'),
        fetch('/api/analytics/blocks?action=overview')
      ])
      
      const overview = await overviewRes.json()
      const intelligence = await intelligenceRes.json()
      const blocks = await dashboardRes.json()
      
      setData({
        dashboard: overview.success ? overview.dashboard : null,
        intelligence: intelligence.success ? intelligence.overview : null,
        blocks: blocks.success ? blocks.overview : null
      })
    } catch (error) {
      console.error('Failed to fetch analytics data:', error)
    } finally {
      setIsLoading(false)
      setLastRefresh(new Date())
    }
  }
  
  useEffect(() => {
    setMounted(true)
    fetchData()
  }, [])
  
  const refreshData = () => {
    fetchData()
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h1 className="text-2xl font-bold">AI Chat Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Comprehensive analysis of AI coding sessions
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground">
            {mounted && lastRefresh ? `Last updated: ${lastRefresh.toLocaleTimeString()}` : 'Loading...'}
          </span>
          <Button variant="outline" size="sm" onClick={refreshData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4">
        <SummaryCard
          title="Sessions"
          value={data?.dashboard?.summary?.totalSessions || 0}
          icon={<Activity className="h-4 w-4" />}
          trend={data?.dashboard?.distributions?.sessionsTrend || 0}
        />
        <SummaryCard
          title="Total Cost"
          value={`$${(data?.dashboard?.summary?.totalCost || 0).toFixed(2)}`}
          icon={<DollarSign className="h-4 w-4" />}
          trend={data?.dashboard?.trends?.costTrend || 0}
        />
        <SummaryCard
          title="Issues"
          value={data?.dashboard?.summary?.totalIssues || 0}
          icon={<AlertTriangle className="h-4 w-4" />}
          trend={data?.dashboard?.trends?.issuesTrend || 0}
          negative
        />
        <SummaryCard
          title="Resolved"
          value={data?.dashboard?.summary?.resolvedIssues || 0}
          icon={<ListTodo className="h-4 w-4" />}
          color="text-green-500"
        />
        <SummaryCard
          title="Features"
          value={data?.dashboard?.summary?.totalFeatures || 0}
          icon={<Package className="h-4 w-4" />}
          trend={data?.dashboard?.trends?.featuresTrend || 0}
        />
        <SummaryCard
          title="Efficiency"
          value={`${data?.dashboard?.summary?.avgEfficiency || 0}%`}
          icon={<Zap className="h-4 w-4" />}
          color="text-amber-500"
        />
      </div>
      
      {/* Risk Score Banner */}
      {data?.intelligence?.riskScore !== undefined && (
        <div className="mx-4 mb-4">
          <RiskBanner 
            riskScore={data.intelligence.riskScore}
            patternCount={data.intelligence.patternCount}
            warningCount={data.intelligence.warningCount}
          />
        </div>
      )}
      
      {/* Main Content Tabs */}
      <div className="flex-1 px-4 pb-4 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-11">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="sessions" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Sessions</span>
            </TabsTrigger>
            <TabsTrigger value="thread" className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              <span className="hidden sm:inline">Thread</span>
            </TabsTrigger>
            <TabsTrigger value="reasoning" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">Reasoning</span>
            </TabsTrigger>
            <TabsTrigger value="files" className="flex items-center gap-2">
              <FileCode className="h-4 w-4" />
              <span className="hidden sm:inline">File Heatmap</span>
            </TabsTrigger>
            <TabsTrigger value="issues" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Kanban</span>
            </TabsTrigger>
            <TabsTrigger value="patterns" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              <span className="hidden sm:inline">Patterns</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="efficiency" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Efficiency</span>
            </TabsTrigger>
            <TabsTrigger value="intelligence" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">Intelligence</span>
            </TabsTrigger>
            <TabsTrigger value="automation" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Automation</span>
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-1 mt-4 overflow-hidden">
            <TabsContent value="overview" className="h-full m-0">
              <OverviewTab data={data} isLoading={isLoading} />
            </TabsContent>
            <TabsContent value="sessions" className="h-full m-0">
              <SessionsTab />
            </TabsContent>
            <TabsContent value="thread" className="h-full m-0">
              <ThreadReconstructorTab />
            </TabsContent>
            <TabsContent value="reasoning" className="h-full m-0">
              <ReasoningTab />
            </TabsContent>
            <TabsContent value="files" className="h-full m-0">
              <FileHeatmapTab />
            </TabsContent>
            <TabsContent value="issues" className="h-full m-0">
              <KanbanBoardTab />
            </TabsContent>
            <TabsContent value="patterns" className="h-full m-0">
              <PatternsTab />
            </TabsContent>
            <TabsContent value="reports" className="h-full m-0">
              <ReportsTab />
            </TabsContent>
            <TabsContent value="efficiency" className="h-full m-0">
              <EfficiencyTrendsTab />
            </TabsContent>
            <TabsContent value="intelligence" className="h-full m-0">
              <IntelligenceDashboardTab />
            </TabsContent>
            <TabsContent value="automation" className="h-full m-0">
              <AutomationTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}

// Summary Card Component
function SummaryCard({ 
  title, 
  value, 
  icon, 
  trend, 
  color,
  negative 
}: { 
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: number
  color?: string
  negative?: boolean
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className={`p-2 rounded-lg bg-muted ${color || ''}`}>
            {icon}
          </div>
          {trend !== undefined && trend !== 0 && (
            <Badge 
              variant={negative ? (trend > 0 ? 'destructive' : 'default') : (trend > 0 ? 'default' : 'destructive')}
              className="text-xs"
            >
              {trend > 0 ? '+' : ''}{trend}%
            </Badge>
          )}
        </div>
        <div className="mt-2">
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// Risk Banner Component
function RiskBanner({ 
  riskScore, 
  patternCount, 
  warningCount 
}: { 
  riskScore: number
  patternCount: number
  warningCount: number 
}) {
  const getRiskColor = (score: number) => {
    if (score >= 80) return 'bg-green-500/10 border-green-500/20 text-green-600'
    if (score >= 60) return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600'
    if (score >= 40) return 'bg-orange-500/10 border-orange-500/20 text-orange-600'
    return 'bg-red-500/10 border-red-500/20 text-red-600'
  }
  
  return (
    <Card className={`${getRiskColor(riskScore)} border`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold">{riskScore}</p>
              <p className="text-xs">Risk Score</p>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-lg font-semibold">{patternCount}</p>
                <p className="text-xs">Active Patterns</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">{warningCount}</p>
                <p className="text-xs">Warnings</p>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="gap-2">
            View Details
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}

// Main export with Suspense wrapper
export default function AnalyticsDashboard() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AnalyticsDashboardContent />
    </Suspense>
  )
}
