'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  TrendingUp, TrendingDown, Minus, Activity, Zap, Clock, 
  DollarSign, Target, AlertTriangle, CheckCircle2, RefreshCw,
  BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon
} from 'lucide-react'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ComposedChart, ReferenceLine
} from 'recharts'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

interface EfficiencyTrend {
  date: string
  efficiency: number
  productivity: number
  utilization: number
  rollingAvg7d: number
}

interface EfficiencyTrendsData {
  success: boolean
  trends: EfficiencyTrend[]
  summary: {
    avgEfficiency: number
    avgProductivity: number
    efficiencyTrend: 'up' | 'down' | 'stable'
  }
}

export function EfficiencyTrendsTab() {
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<EfficiencyTrendsData | null>(null)
  const [timeRange, setTimeRange] = useState('30')
  const [chartType, setChartType] = useState<'area' | 'line' | 'bar'>('area')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/analytics/timing?action=efficiency-trends&days=${timeRange}`)
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Failed to fetch efficiency trends:', error)
    } finally {
      setIsLoading(false)
      setLastRefresh(new Date())
    }
  }

  useEffect(() => {
    setMounted(true)
    fetchData()
  }, [timeRange])

  const refreshData = () => {
    fetchData()
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 h-full p-4">
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

  const trends = data?.trends || []
  const summary = data?.summary || { avgEfficiency: 0, avgProductivity: 0, efficiencyTrend: 'stable' }

  // Prepare chart data with formatted dates
  const chartData = trends.map(t => ({
    ...t,
    formattedDate: formatChartDate(t.date)
  }))

  // Calculate additional metrics
  const latestEfficiency = trends.length > 0 ? trends[trends.length - 1].efficiency : 0
  const previousEfficiency = trends.length > 7 ? trends[trends.length - 8].efficiency : 0
  const efficiencyChange = previousEfficiency > 0 
    ? ((latestEfficiency - previousEfficiency) / previousEfficiency * 100).toFixed(1)
    : 0

  // Efficiency distribution for pie chart
  const efficiencyDistribution = [
    { name: 'High (>80%)', value: trends.filter(t => t.efficiency > 80).length, color: '#10b981' },
    { name: 'Medium (50-80%)', value: trends.filter(t => t.efficiency >= 50 && t.efficiency <= 80).length, color: '#f59e0b' },
    { name: 'Low (<50%)', value: trends.filter(t => t.efficiency < 50).length, color: '#ef4444' }
  ].filter(d => d.value > 0)

  // Weekly comparison data
  const weeklyComparison = getWeeklyComparison(trends)

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Header Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="60">Last 60 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex items-center border rounded-lg p-1">
              <Button 
                variant={chartType === 'area' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setChartType('area')}
                className="h-8 px-2"
              >
                <AreaChart className="h-4 w-4" />
              </Button>
              <Button 
                variant={chartType === 'line' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setChartType('line')}
                className="h-8 px-2"
              >
                <LineChartIcon className="h-4 w-4" />
              </Button>
              <Button 
                variant={chartType === 'bar' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setChartType('bar')}
                className="h-8 px-2"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
            </div>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            title="Avg Efficiency"
            value={`${summary.avgEfficiency.toFixed(1)}%`}
            icon={<Zap className="h-4 w-4" />}
            trend={summary.efficiencyTrend}
            change={efficiencyChange}
          />
          <SummaryCard
            title="Avg Productivity"
            value={summary.avgProductivity.toFixed(1)}
            icon={<Target className="h-4 w-4" />}
            color="text-blue-500"
          />
          <SummaryCard
            title="Current Efficiency"
            value={`${latestEfficiency.toFixed(1)}%`}
            icon={<Activity className="h-4 w-4" />}
            color="text-green-500"
          />
          <SummaryCard
            title="Data Points"
            value={trends.length.toString()}
            icon={<BarChart3 className="h-4 w-4" />}
            color="text-purple-500"
          />
        </div>

        {/* Main Efficiency Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Efficiency Trend Over Time
            </CardTitle>
            <CardDescription>
              Daily efficiency scores with 7-day rolling average
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'area' ? (
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="formattedDate" className="text-xs" />
                      <YAxis domain={[0, 100]} className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number, name: string) => [
                          name === 'efficiency' ? `${value.toFixed(1)}%` : value.toFixed(1),
                          name === 'efficiency' ? 'Efficiency' : name === 'rollingAvg7d' ? '7-Day Avg' : name
                        ]}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="efficiency" 
                        stroke="#10b981" 
                        fill="#10b981" 
                        fillOpacity={0.3}
                        name="efficiency"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="rollingAvg7d" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={false}
                        name="rollingAvg7d"
                      />
                      <ReferenceLine y={80} stroke="#10b981" strokeDasharray="5 5" label="Target" />
                    </AreaChart>
                  ) : chartType === 'line' ? (
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="formattedDate" className="text-xs" />
                      <YAxis domain={[0, 100]} className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number, name: string) => [
                          name === 'efficiency' ? `${value.toFixed(1)}%` : value.toFixed(1),
                          name === 'efficiency' ? 'Efficiency' : name === 'rollingAvg7d' ? '7-Day Avg' : name
                        ]}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="efficiency" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="efficiency"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="rollingAvg7d" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={false}
                        name="rollingAvg7d"
                      />
                      <ReferenceLine y={80} stroke="#10b981" strokeDasharray="5 5" />
                    </LineChart>
                  ) : (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="formattedDate" className="text-xs" />
                      <YAxis domain={[0, 100]} className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => [`${value.toFixed(1)}%`, 'Efficiency']}
                      />
                      <Bar dataKey="efficiency" fill="#10b981" radius={[4, 4, 0, 0]} name="efficiency" />
                      <ReferenceLine y={80} stroke="#10b981" strokeDasharray="5 5" />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No efficiency data available for the selected period
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Secondary Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Productivity & Utilization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Productivity & Utilization
              </CardTitle>
              <CardDescription>
                Daily productivity score and session utilization rate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="formattedDate" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="productivity" fill="#3b82f6" fillOpacity={0.6} name="Productivity" />
                      <Line type="monotone" dataKey="utilization" stroke="#f59e0b" strokeWidth={2} name="Utilization" />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    No data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Efficiency Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                Efficiency Distribution
              </CardTitle>
              <CardDescription>
                Breakdown of days by efficiency level
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {efficiencyDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={efficiencyDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {efficiencyDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    No distribution data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Weekly Comparison
            </CardTitle>
            <CardDescription>
              Efficiency metrics broken down by week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {weeklyComparison.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyComparison}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="week" className="text-xs" />
                    <YAxis domain={[0, 100]} className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`${value.toFixed(1)}%`, 'Avg Efficiency']}
                    />
                    <Bar dataKey="avgEfficiency" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No weekly data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Detailed Stats Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Efficiency Details</CardTitle>
            <CardDescription>Recent daily efficiency breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              {chartData.length > 0 ? (
                <div className="space-y-2">
                  {[...chartData].reverse().slice(0, 14).map((day, index) => (
                    <div 
                      key={day.date}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${
                          day.efficiency > 80 ? 'bg-green-500' :
                          day.efficiency >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                        <div>
                          <p className="text-sm font-medium">{formatDisplayDate(day.date)}</p>
                          <p className="text-xs text-muted-foreground">
                            Productivity: {day.productivity.toFixed(1)} | Utilization: {day.utilization.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-semibold">{day.efficiency.toFixed(1)}%</p>
                          <p className="text-xs text-muted-foreground">
                            7d Avg: {day.rollingAvg7d.toFixed(1)}%
                          </p>
                        </div>
                        <Badge 
                          variant={
                            day.efficiency > 80 ? 'default' :
                            day.efficiency >= 50 ? 'secondary' : 'destructive'
                          }
                        >
                          {day.efficiency > 80 ? 'High' :
                           day.efficiency >= 50 ? 'Medium' : 'Low'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No daily data available
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  )
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function SummaryCard({ 
  title, 
  value, 
  icon, 
  trend, 
  change,
  color 
}: { 
  title: string
  value: string
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'stable'
  change?: string | number
  color?: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className={`p-2 rounded-lg bg-muted ${color || ''}`}>
            {icon}
          </div>
          {trend && (
            <Badge 
              variant={trend === 'up' ? 'default' : trend === 'down' ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> :
               trend === 'down' ? <TrendingDown className="h-3 w-3 mr-1" /> :
               <Minus className="h-3 w-3 mr-1" />}
              {trend}
            </Badge>
          )}
        </div>
        <div className="mt-2">
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{title}</p>
          {change !== undefined && (
            <p className={`text-xs mt-1 ${parseFloat(String(change)) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {parseFloat(String(change)) >= 0 ? '+' : ''}{change}% vs previous
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatChartDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  })
}

function getWeeklyComparison(trends: EfficiencyTrend[]): Array<{ week: string; avgEfficiency: number }> {
  if (trends.length === 0) return []

  const weeklyData = new Map<string, { total: number; count: number }>()

  for (const trend of trends) {
    const date = new Date(trend.date)
    const weekStart = getWeekStart(date)
    const weekKey = weekStart.toISOString().split('T')[0]
    
    const current = weeklyData.get(weekKey) || { total: 0, count: 0 }
    current.total += trend.efficiency
    current.count++
    weeklyData.set(weekKey, current)
  }

  return [...weeklyData.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-8) // Last 8 weeks
    .map(([week, data]) => ({
      week: `W${getWeekNumber(new Date(week))}`,
      avgEfficiency: data.total / data.count
    }))
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Monday start
  return new Date(d.setDate(diff))
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

export default EfficiencyTrendsTab
