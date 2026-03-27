'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle2,
  Clock, Zap, DollarSign, Activity
} from 'lucide-react'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

interface OverviewTabProps {
  data: any
  isLoading: boolean
}

export function OverviewTab({ data, isLoading }: OverviewTabProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 h-full">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-1/3" />
            </CardHeader>
            <CardContent>
              <div className="h-48 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const dashboard = data?.dashboard || {}
  const recentSessions = dashboard.recentSessions || []
  const recentIssues = dashboard.recentIssues || []
  const recentFeatures = dashboard.recentFeatures || []
  const topPatterns = dashboard.topPatterns || []
  const dailyStats = dashboard.dailyStats || {}
  
  // Transform daily stats for chart
  const dailyChartData = Object.entries(dailyStats).map(([date, stats]: [string, any]) => ({
    date: date.slice(5), // MM-DD format
    sessions: stats.sessions,
    tokens: stats.tokens / 1000, // Convert to K
    cost: stats.cost * 100 // Convert to cents for visibility
  })).slice(-14) // Last 14 days

  // Model distribution
  const modelDistribution = Object.entries(dashboard.distributions?.models || {}).map(
    ([name, value]) => ({ name, value })
  )

  // Issue distribution
  const issueDistribution = Object.entries(dashboard.distributions?.issues || {}).map(
    ([type, count]) => ({ type, count })
  ).sort((a, b) => b.count - a.count).slice(0, 5)

  // Category distribution
  const categoryDistribution = Object.entries(dashboard.distributions?.categories || {}).map(
    ([name, value]) => ({ name, value })
  )

  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 pr-4">
        {/* Activity Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Trend
            </CardTitle>
            <CardDescription>Daily sessions and token usage over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {dailyChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="sessions" 
                      stackId="1"
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.3}
                      name="Sessions"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="tokens" 
                      stackId="2"
                      stroke="#10b981" 
                      fill="#10b981" 
                      fillOpacity={0.3}
                      name="Tokens (K)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No activity data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Model Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Model Usage</CardTitle>
            <CardDescription>Sessions by AI model</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              {modelDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={modelDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {modelDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No model data
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Issue Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Issue Distribution
            </CardTitle>
            <CardDescription>Top issue types encountered</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              {issueDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={issueDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis dataKey="type" type="category" className="text-xs" width={80} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No issues recorded
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Session Categories</CardTitle>
            <CardDescription>Work type distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              {categoryDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend 
                      layout="vertical" 
                      align="right"
                      formatter={(value) => <span className="text-xs">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No category data
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Sessions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Sessions
            </CardTitle>
            <CardDescription>Latest AI coding sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              {recentSessions.length > 0 ? (
                <div className="space-y-2">
                  {recentSessions.slice(0, 5).map((session: any, index: number) => (
                    <div 
                      key={session.id || index}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <div>
                          <p className="text-sm font-medium truncate max-w-48">
                            {session.title || 'Untitled Session'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {session.model} • {new Date(session.sessionDate || session.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{session.totalTokens?.toLocaleString() || session.tokens?.toLocaleString() || 0} tokens</span>
                        <span>${((session.estimatedCost || session.cost || 0)).toFixed(3)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No recent sessions
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Recent Issues */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Recent Issues
            </CardTitle>
            <CardDescription>Latest problems detected</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              {recentIssues.length > 0 ? (
                <div className="space-y-2">
                  {recentIssues.slice(0, 5).map((issue: any, index: number) => (
                    <div 
                      key={issue.id || index}
                      className="flex items-start gap-2 p-2 rounded-lg bg-muted/50"
                    >
                      <Badge 
                        variant={issue.severity === 'critical' ? 'destructive' : 
                                issue.severity === 'high' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {issue.severity || 'medium'}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{issue.title}</p>
                        <p className="text-xs text-muted-foreground">{issue.issueType}</p>
                      </div>
                      {issue.status === 'resolved' && (
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No recent issues
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Top Patterns */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Active Patterns
            </CardTitle>
            <CardDescription>Recurring patterns detected</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              {topPatterns.length > 0 ? (
                <div className="space-y-2">
                  {topPatterns.slice(0, 5).map((pattern: any, index: number) => (
                    <div 
                      key={pattern.id || index}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{pattern.patternName}</p>
                        <p className="text-xs text-muted-foreground">
                          {pattern.occurrenceCount} occurrences
                        </p>
                      </div>
                      <Badge 
                        variant={pattern.severity === 'critical' ? 'destructive' : 
                                pattern.severity === 'high' ? 'default' : 'secondary'}
                      >
                        {pattern.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No active patterns
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Quick Metrics Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricBox
                title="Avg Session Duration"
                value={`${Math.round(dashboard.summary?.avgSessionDuration || 0)} min`}
                icon={<Clock className="h-4 w-4" />}
              />
              <MetricBox
                title="Resolution Rate"
                value={`${Math.round(
                  dashboard.summary?.totalIssues > 0 
                    ? (dashboard.summary.resolvedIssues / dashboard.summary.totalIssues) * 100 
                    : 100
                )}%`}
                icon={<CheckCircle2 className="h-4 w-4" />}
                positive
              />
              <MetricBox
                title="Features per Session"
                value={(dashboard.summary?.totalFeatures && dashboard.summary?.totalSessions
                  ? (dashboard.summary.totalFeatures / dashboard.summary.totalSessions).toFixed(1)
                  : '0')}
                icon={<TrendingUp className="h-4 w-4" />}
              />
              <MetricBox
                title="Cost per Feature"
                value={`$${dashboard.summary?.totalFeatures > 0 
                  ? (dashboard.summary.totalCost / dashboard.summary.totalFeatures).toFixed(3) 
                  : '0.00'}`}
                icon={<DollarSign className="h-4 w-4" />}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  )
}

function MetricBox({ title, value, icon, positive }: {
  title: string
  value: string
  icon: React.ReactNode
  positive?: boolean
}) {
  return (
    <div className="p-3 rounded-lg bg-muted/50">
      <div className="flex items-center gap-2 mb-1">
        <div className={positive ? 'text-green-500' : 'text-muted-foreground'}>
          {icon}
        </div>
        <span className="text-xs text-muted-foreground">{title}</span>
      </div>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  )
}
