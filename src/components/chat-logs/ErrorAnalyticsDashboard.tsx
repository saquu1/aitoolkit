'use client'

/**
 * ERROR ANALYTICS DASHBOARD
 * ==========================
 * Comprehensive error analytics and insights
 *
 * Features:
 * - Error statistics overview
 * - Error trends over time
 * - Error distribution by category/severity
 * - Top recurring errors
 * - Resolution progress
 * - Error prevention insights
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertCircle,
  AlertTriangle,
  Bug,
  CheckCircle2,
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  XCircle,
  BarChart3,
  PieChart,
  Activity,
  Database,
  Globe,
  Code,
  Terminal,
  Zap,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Calendar,
  Filter
} from 'lucide-react'
import { cn } from '@/lib/utils'

// =============================================================================
// TYPES
// =============================================================================

interface ErrorStats {
  total: number
  unresolved: number
  byCategory: Record<string, number>
  bySeverity: Record<string, number>
  bySource: Record<string, number>
  topErrors: Array<{
    errorCode: string
    message: string
    count: number
  }>
  recentCount: number
  trend: Array<{
    date: string
    count: number
  }>
}

interface ErrorItem {
  id: string
  errorCode: string
  errorCategory: string
  severity: string
  message: string
  source: string
  occurrenceCount: number
  firstSeen: string
  lastSeen: string
  resolved: boolean
  solution?: string
  preventionTips?: string[]
}

interface ErrorAnalyticsDashboardProps {
  className?: string
}

// =============================================================================
// CONFIG
// =============================================================================

const severityConfig = {
  LOW: { color: 'bg-blue-500/10 text-blue-600 border-blue-200', icon: AlertCircle, trend: 'neutral' },
  MEDIUM: { color: 'bg-yellow-500/10 text-yellow-600 border-yellow-200', icon: AlertTriangle, trend: 'up' },
  HIGH: { color: 'bg-orange-500/10 text-orange-600 border-orange-200', icon: AlertTriangle, trend: 'up' },
  CRITICAL: { color: 'bg-red-500/10 text-red-600 border-red-200', icon: XCircle, trend: 'up' },
  FATAL: { color: 'bg-red-700/10 text-red-700 border-red-700', icon: XCircle, trend: 'up' }
}

const categoryIcons: Record<string, any> = {
  PRISMA_CONNECTION: Database,
  PRISMA_QUERY: Database,
  PRISMA_VALIDATION: Database,
  PRISMA_CONSTRAINT: Database,
  PRISMA_ENUM: Database,
  API_NOT_FOUND: Globe,
  API_UNAUTHORIZED: Globe,
  API_FORBIDDEN: Globe,
  API_RATE_LIMIT: Globe,
  API_TIMEOUT: Globe,
  TYPE_MISMATCH: Code,
  ENUM_MISMATCH: Code,
  INPUT_VALIDATION: Code,
  RUNTIME_ERROR: Terminal,
  NULL_REFERENCE: Bug,
  EXTERNAL_API: Globe,
  AI_SERVICE: Zap,
  UNKNOWN: AlertCircle
}

const sourceLabels: Record<string, string> = {
  CHAT_LOGS: 'Chat Logs',
  ANALYTICS: 'Analytics',
  API_MANAGEMENT: 'API Management',
  MIDDLEWARE: 'Middleware',
  EXTERNAL: 'External',
  MANUAL: 'Manual'
}

const categoryLabels: Record<string, string> = {
  PRISMA_CONNECTION: 'DB Connection',
  PRISMA_QUERY: 'DB Query',
  PRISMA_VALIDATION: 'DB Validation',
  PRISMA_CONSTRAINT: 'DB Constraint',
  PRISMA_ENUM: 'Enum Error',
  API_NOT_FOUND: 'API Not Found',
  API_UNAUTHORIZED: 'Auth Error',
  API_FORBIDDEN: 'Forbidden',
  API_RATE_LIMIT: 'Rate Limited',
  API_TIMEOUT: 'Timeout',
  TYPE_MISMATCH: 'Type Error',
  ENUM_MISMATCH: 'Enum Mismatch',
  INPUT_VALIDATION: 'Input Error',
  RUNTIME_ERROR: 'Runtime',
  NULL_REFERENCE: 'Null Reference',
  EXTERNAL_API: 'External API',
  AI_SERVICE: 'AI Service',
  UNKNOWN: 'Unknown'
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ErrorAnalyticsDashboard({ className }: ErrorAnalyticsDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState<ErrorStats | null>(null)
  const [errors, setErrors] = useState<ErrorItem[]>([])
  const [activeTab, setActiveTab] = useState('overview')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch stats
      const statsResponse = await fetch('/api/error-registry?action=stats')
      const statsData = await statsResponse.json()
      if (statsData.success) {
        setStats(statsData.data)
      }

      // Fetch errors list
      const queryParams = new URLSearchParams()
      if (severityFilter !== 'all') queryParams.append('severity', severityFilter)
      if (categoryFilter !== 'all') queryParams.append('category', categoryFilter)
      queryParams.append('limit', '50')
      queryParams.append('sortBy', 'occurrenceCount')
      queryParams.append('sortOrder', 'desc')

      const errorsResponse = await fetch(`/api/error-registry?action=list&${queryParams.toString()}`)
      const errorsData = await errorsResponse.json()
      if (errorsData.success) {
        setErrors(errorsData.data.errors || [])
      }
    } catch (error) {
      console.error('Failed to fetch error analytics:', error)
    } finally {
      setLoading(false)
    }
  }, [severityFilter, categoryFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  const handleResolve = async (errorId: string) => {
    try {
      await fetch('/api/error-registry?action=resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: errorId })
      })
      await fetchData()
    } catch (error) {
      console.error('Failed to resolve error:', error)
    }
  }

  const handleBulkResolve = async () => {
    const unresolvedIds = errors.filter(e => !e.resolved).map(e => e.id)
    if (unresolvedIds.length === 0) return

    try {
      await fetch('/api/error-registry?action=bulk-resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: unresolvedIds })
      })
      await fetchData()
    } catch (error) {
      console.error('Failed to bulk resolve:', error)
    }
  }

  // Calculate derived stats
  const resolutionRate = stats ? 
    ((stats.total - stats.unresolved) / Math.max(stats.total, 1) * 100).toFixed(1) : '0'
  
  const avgPerDay = stats?.trend.length ? 
    (stats.trend.reduce((sum, t) => sum + t.count, 0) / stats.trend.length).toFixed(1) : '0'

  const trendDirection = stats?.trend && stats.trend.length >= 2 ? 
    stats.trend[stats.trend.length - 1].count > stats.trend[0].count ? 'up' : 
    stats.trend[stats.trend.length - 1].count < stats.trend[0].count ? 'down' : 'neutral' 
    : 'neutral'

  // Loading state
  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading Error Analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('w-full space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-red-500" />
            Error Analytics Dashboard
          </h2>
          <p className="text-muted-foreground">
            Track, analyze, and resolve errors across your system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatCard
            title="Total Errors"
            value={stats.total}
            icon={<AlertCircle className="h-4 w-4" />}
            color="text-red-500"
            trend={trendDirection}
          />
          <StatCard
            title="Unresolved"
            value={stats.unresolved}
            icon={<XCircle className="h-4 w-4" />}
            color="text-orange-500"
            trend={stats.unresolved > 0 ? 'up' : 'neutral'}
          />
          <StatCard
            title="Resolution Rate"
            value={`${resolutionRate}%`}
            icon={<CheckCircle2 className="h-4 w-4" />}
            color="text-green-500"
            trend={parseFloat(resolutionRate) > 80 ? 'up' : parseFloat(resolutionRate) < 50 ? 'down' : 'neutral'}
          />
          <StatCard
            title="Recent (24h)"
            value={stats.recentCount}
            icon={<Clock className="h-4 w-4" />}
            color="text-purple-500"
          />
          <StatCard
            title="Avg/Day"
            value={avgPerDay}
            icon={<TrendingUp className="h-4 w-4" />}
            color="text-cyan-500"
          />
          <StatCard
            title="Categories"
            value={Object.keys(stats.byCategory).length}
            icon={<PieChart className="h-4 w-4" />}
            color="text-indigo-500"
          />
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="errors">Error List</TabsTrigger>
          <TabsTrigger value="prevention">Prevention</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* By Category */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <PieChart className="h-4 w-4" />
                  By Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats && Object.entries(stats.byCategory)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 8)
                    .map(([cat, count]) => {
                      const Icon = categoryIcons[cat] || AlertCircle
                      const percentage = (count / stats.total * 100).toFixed(1)
                      return (
                        <div key={cat} className="flex items-center gap-3">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground">
                                {categoryLabels[cat] || cat.replace(/_/g, ' ')}
                              </span>
                              <span className="font-medium">{count}</span>
                            </div>
                            <Progress value={parseFloat(percentage)} className="h-1.5" />
                          </div>
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>

            {/* By Severity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  By Severity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats && Object.entries(stats.bySeverity)
                    .sort((a, b) => {
                      const order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
                      return order.indexOf(a[0]) - order.indexOf(b[0])
                    })
                    .map(([sev, count]) => {
                      const config = severityConfig[sev as keyof typeof severityConfig] || severityConfig.MEDIUM
                      const percentage = (count / stats.total * 100).toFixed(1)
                      return (
                        <div key={sev} className="flex items-center gap-3">
                          <Badge className={cn('text-xs', config.color)}>
                            {sev}
                          </Badge>
                          <div className="flex-1">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground">{count} errors</span>
                              <span className="font-medium">{percentage}%</span>
                            </div>
                            <Progress 
                              value={parseFloat(percentage)} 
                              className={cn('h-1.5', {
                                'bg-red-200': sev === 'CRITICAL' || sev === 'FATAL',
                                'bg-orange-200': sev === 'HIGH',
                                'bg-yellow-200': sev === 'MEDIUM',
                                'bg-blue-200': sev === 'LOW'
                              })}
                            />
                          </div>
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>

            {/* By Source */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  By Source
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats && Object.entries(stats.bySource)
                    .sort((a, b) => b[1] - a[1])
                    .map(([source, count]) => (
                      <div key={source} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {sourceLabels[source] || source}
                        </span>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={(count / stats.total * 100)} 
                            className="h-2 w-20"
                          />
                          <span className="font-medium w-8 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Errors */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Top Recurring Errors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {stats?.topErrors.map((error, i) => (
                      <div 
                        key={i} 
                        className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                      >
                        <Badge variant="outline" className="text-xs mt-0.5">
                          #{i + 1}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-1 rounded">
                              {error.errorCode}
                            </code>
                            <Badge variant="secondary" className="text-xs">
                              {error.count}x
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {error.message}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Error Trend (Last {stats?.trend.length || 0} Days)
              </CardTitle>
              <CardDescription>
                Track error occurrence patterns over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.trend && stats.trend.length > 0 ? (
                <div className="space-y-4">
                  {/* Simple Bar Chart */}
                  <div className="h-48 flex items-end gap-1">
                    {stats.trend.map((day, i) => {
                      const maxCount = Math.max(...stats.trend.map(t => t.count), 1)
                      const height = (day.count / maxCount * 100)
                      return (
                        <div
                          key={i}
                          className="flex-1 flex flex-col items-center gap-1"
                          title={`${day.date}: ${day.count} errors`}
                        >
                          <div
                            className={cn(
                              'w-full rounded-t transition-all hover:opacity-80 cursor-pointer',
                              day.count > 5 ? 'bg-red-500' : 
                              day.count > 2 ? 'bg-orange-500' : 
                              day.count > 0 ? 'bg-yellow-500' : 'bg-green-500'
                            )}
                            style={{ height: `${Math.max(height, 5)}%` }}
                          />
                          {i % 7 === 0 && (
                            <span className="text-[10px] text-muted-foreground -rotate-45 origin-left">
                              {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-500">
                        {Math.max(...(stats.trend.map(t => t.count) || [0]))}
                      </div>
                      <div className="text-xs text-muted-foreground">Peak Errors</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-500">
                        {Math.min(...(stats.trend.map(t => t.count) || [0]))}
                      </div>
                      <div className="text-xs text-muted-foreground">Lowest Errors</div>
                    </div>
                    <div className="text-center">
                      <div className={cn(
                        'text-2xl font-bold flex items-center justify-center gap-1',
                        trendDirection === 'up' ? 'text-red-500' : 
                        trendDirection === 'down' ? 'text-green-500' : 'text-gray-500'
                      )}>
                        {trendDirection === 'up' && <ArrowUpRight className="h-5 w-5" />}
                        {trendDirection === 'down' && <ArrowDownRight className="h-5 w-5" />}
                        {trendDirection === 'neutral' && <Minus className="h-5 w-5" />}
                        {trendDirection === 'up' ? 'Rising' : trendDirection === 'down' ? 'Falling' : 'Stable'}
                      </div>
                      <div className="text-xs text-muted-foreground">Trend</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No trend data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Error List Tab */}
        <TabsContent value="errors" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Severities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {stats && Object.keys(stats.byCategory).map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {categoryLabels[cat] || cat.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleBulkResolve}
                  disabled={errors.filter(e => !e.resolved).length === 0}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Resolve All ({errors.filter(e => !e.resolved).length})
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Error List */}
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {errors.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>No errors found matching your filters</p>
                  </CardContent>
                </Card>
              ) : (
                errors.map((error) => {
                  const Icon = categoryIcons[error.errorCategory] || AlertCircle
                  const sevConfig = severityConfig[error.severity as keyof typeof severityConfig] || severityConfig.MEDIUM

                  return (
                    <Card key={error.id} className={cn(
                      'transition-colors',
                      error.resolved && 'opacity-60 bg-muted/30'
                    )}>
                      <CardContent className="py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">
                                  {error.errorCode}
                                </code>
                                <Badge className={cn('text-xs', sevConfig.color)}>
                                  {error.severity}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {categoryLabels[error.errorCategory] || error.errorCategory}
                                </Badge>
                                {error.resolved && (
                                  <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                                    Resolved
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm mt-1 line-clamp-2">{error.message}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span>Source: {sourceLabels[error.source] || error.source}</span>
                                <span>Occurrences: {error.occurrenceCount}</span>
                                <span>Last seen: {new Date(error.lastSeen).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          {!error.resolved && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResolve(error.id)}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Resolve
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Prevention Tab */}
        <TabsContent value="prevention" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Common Patterns */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Common Error Patterns
                </CardTitle>
                <CardDescription>
                  Most frequent error types that need prevention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {errors.slice(0, 5).map((error, i) => (
                    <div key={i} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">
                          {error.errorCode}
                        </code>
                        <Badge variant="outline">{error.occurrenceCount}x</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{error.message}</p>
                      {error.solution && (
                        <div className="bg-green-500/5 border border-green-200 rounded p-2 mt-2">
                          <div className="text-xs font-medium text-green-700 mb-1">Solution</div>
                          <p className="text-xs text-green-600">{error.solution}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Prevention Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Prevention Strategies
                </CardTitle>
                <CardDescription>
                  Based on your error patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Prisma Errors */}
                  {stats?.byCategory.PRISMA_ENUM && stats.byCategory.PRISMA_ENUM > 0 && (
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="h-4 w-4 text-blue-500" />
                        <span className="font-medium text-sm">Prisma Enum Errors</span>
                      </div>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        <li>• Always import enums from @prisma/client</li>
                        <li>• Use z.nativeEnum() in Zod schemas</li>
                        <li>• Enable TypeScript strict mode</li>
                        <li>• Run prisma generate after schema changes</li>
                      </ul>
                    </div>
                  )}

                  {/* API Errors */}
                  {(stats?.byCategory.API_NOT_FOUND || stats?.byCategory.API_UNAUTHORIZED) && (
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Globe className="h-4 w-4 text-purple-500" />
                        <span className="font-medium text-sm">API Errors</span>
                      </div>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        <li>• Validate API endpoints before deployment</li>
                        <li>• Implement proper authentication middleware</li>
                        <li>• Add request/response validation</li>
                        <li>• Use circuit breaker for external APIs</li>
                      </ul>
                    </div>
                  )}

                  {/* Runtime Errors */}
                  {(stats?.byCategory.RUNTIME_ERROR || stats?.byCategory.NULL_REFERENCE) && (
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Terminal className="h-4 w-4 text-orange-500" />
                        <span className="font-medium text-sm">Runtime Errors</span>
                      </div>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        <li>• Use optional chaining (?.) for uncertain values</li>
                        <li>• Add null checks before property access</li>
                        <li>• Implement proper error boundaries</li>
                        <li>• Use TypeScript strict null checks</li>
                      </ul>
                    </div>
                  )}

                  {/* Type Errors */}
                  {stats?.byCategory.TYPE_MISMATCH && stats.byCategory.TYPE_MISMATCH > 0 && (
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Code className="h-4 w-4 text-cyan-500" />
                        <span className="font-medium text-sm">Type Errors</span>
                      </div>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        <li>• Run tsc --noEmit before committing</li>
                        <li>• Enable strict mode in tsconfig.json</li>
                        <li>• Use proper type annotations</li>
                        <li>• Avoid any type when possible</li>
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function StatCard({ 
  title, 
  value, 
  icon, 
  color,
  trend 
}: { 
  title: string
  value: string | number
  icon: React.ReactNode
  color: string
  trend?: 'up' | 'down' | 'neutral'
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className={cn('text-lg font-bold', color)}>{value}</p>
          </div>
          <div className={cn('opacity-50', color)}>
            {icon}
          </div>
        </div>
        {trend && (
          <div className="mt-1 flex items-center gap-1 text-xs">
            {trend === 'up' && <ArrowUpRight className="h-3 w-3 text-red-500" />}
            {trend === 'down' && <ArrowDownRight className="h-3 w-3 text-green-500" />}
            {trend === 'neutral' && <Minus className="h-3 w-3 text-gray-500" />}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ErrorAnalyticsDashboard
