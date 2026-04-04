'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  FileCode, Activity, RefreshCw, Filter, Grid3X3, List, 
  TrendingUp, Clock, AlertCircle, FileText, FolderOpen,
  Zap, Layers, GitBranch, Settings
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'

const CATEGORY_COLORS: Record<string, string> = {
  api_route: '#ef4444',
  page: '#3b82f6',
  component: '#10b981',
  service: '#f59e0b',
  hook: '#8b5cf6',
  utility: '#ec4899',
  type_definition: '#06b6d4',
  config: '#64748b',
  test: '#84cc16',
  schema: '#f97316',
  style: '#a855f7',
  other: '#94a3b8'
}

const CATEGORY_LABELS: Record<string, string> = {
  api_route: 'API Routes',
  page: 'Pages',
  component: 'Components',
  service: 'Services',
  hook: 'Hooks',
  utility: 'Utilities',
  type_definition: 'Type Definitions',
  config: 'Config Files',
  test: 'Tests',
  schema: 'Database Schema',
  style: 'Styles',
  other: 'Other'
}

interface FileHeatmapData {
  filePath: string
  category: string
  changeCount: number
  linesChanged: number
  sessionsInvolved: string[]
  issuesCount: number
  lastModified: string
  dailyChanges: Record<string, number>
}

interface CalendarHeatmapCell {
  date: string
  count: number
  level: 0 | 1 | 2 | 3 | 4
}

interface HeatmapData {
  success: boolean
  files: FileHeatmapData[]
  calendar: CalendarHeatmapCell[]
  summary: {
    totalFiles: number
    totalChanges: number
    totalLinesChanged: number
    topCategories: Array<{ category: string; count: number }>
    mostChangedFiles: Array<{ path: string; count: number }>
  }
}

export function FileHeatmapTab() {
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<HeatmapData | null>(null)
  const [timeRange, setTimeRange] = useState('30')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/analytics?action=file-heatmap&days=${timeRange}`)
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Failed to fetch file heatmap:', error)
    } finally {
      setIsLoading(false)
      setLastRefresh(new Date())
    }
  }

  useEffect(() => {
    setMounted(true)
    fetchData()
  }, [timeRange])

  // Filter files by category
  const filteredFiles = useMemo(() => {
    if (!data?.files) return []
    if (categoryFilter === 'all') return data.files
    return data.files.filter(f => f.category === categoryFilter)
  }, [data?.files, categoryFilter])

  // Get unique categories from data
  const categories = useMemo(() => {
    if (!data?.files) return []
    const cats = new Set(data.files.map(f => f.category))
    return Array.from(cats)
  }, [data?.files])

  // Prepare category distribution for pie chart
  const categoryDistribution = useMemo(() => {
    if (!data?.files) return []
    const dist: Record<string, number> = {}
    for (const file of data.files) {
      dist[file.category] = (dist[file.category] || 0) + file.changeCount
    }
    return Object.entries(dist)
      .map(([category, count]) => ({
        name: CATEGORY_LABELS[category] || category,
        value: count,
        color: CATEGORY_COLORS[category] || '#94a3b8'
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [data?.files])

  // Prepare daily changes for bar chart
  const dailyChangesData = useMemo(() => {
    if (!data?.calendar) return []
    return data.calendar
      .filter(c => c.count > 0)
      .slice(-30) // Last 30 days with activity
      .map(c => ({
        date: formatDateShort(c.date),
        count: c.count,
        level: c.level
      }))
  }, [data?.calendar])

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

  const summary = data?.summary || {
    totalFiles: 0,
    totalChanges: 0,
    totalLinesChanged: 0,
    topCategories: [],
    mostChangedFiles: []
  }

  return (
    <ScrollArea className="h-full">
      <TooltipProvider>
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

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_LABELS[cat] || cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center border rounded-lg p-1">
                <Button 
                  variant={viewMode === 'calendar' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => setViewMode('calendar')}
                  className="h-8 px-2"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button 
                  variant={viewMode === 'list' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="h-8 px-2"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
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

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard
              title="Files Changed"
              value={summary.totalFiles.toString()}
              icon={<FileCode className="h-4 w-4" />}
              color="text-blue-500"
            />
            <SummaryCard
              title="Total Changes"
              value={summary.totalChanges.toString()}
              icon={<Activity className="h-4 w-4" />}
              color="text-green-500"
            />
            <SummaryCard
              title="Lines Changed"
              value={formatNumber(summary.totalLinesChanged)}
              icon={<GitBranch className="h-4 w-4" />}
              color="text-purple-500"
            />
            <SummaryCard
              title="Categories"
              value={categories.length.toString()}
              icon={<Layers className="h-4 w-4" />}
              color="text-amber-500"
            />
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Calendar Heatmap */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Grid3X3 className="h-5 w-5" />
                  File Change Activity
                </CardTitle>
                <CardDescription>
                  GitHub-style contribution graph showing file change frequency
                </CardDescription>
              </CardHeader>
              <CardContent>
                {viewMode === 'calendar' ? (
                  <CalendarHeatmap data={data?.calendar || []} />
                ) : (
                  <div className="h-64">
                    {dailyChangesData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dailyChangesData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="date" className="text-xs" />
                          <YAxis className="text-xs" />
                          <RechartsTooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                            formatter={(value: number) => [value, 'Changes']}
                          />
                          <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        No activity data available
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Change Distribution
                </CardTitle>
                <CardDescription>
                  Changes by file category
                </CardDescription>
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
                          {categoryDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                      No category data
                    </div>
                  )}
                </div>
                <div className="mt-4 space-y-2">
                  {categoryDistribution.slice(0, 5).map((cat, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: cat.color }}
                        />
                        <span>{cat.name}</span>
                      </div>
                      <Badge variant="outline">{cat.value}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* File List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Most Changed Files
              </CardTitle>
              <CardDescription>
                Top files by change frequency {categoryFilter !== 'all' ? `(${CATEGORY_LABELS[categoryFilter] || categoryFilter})` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-72">
                {filteredFiles.length > 0 ? (
                  <div className="space-y-2">
                    {filteredFiles.slice(0, 20).map((file, index) => (
                      <FileRow 
                        key={file.filePath} 
                        file={file} 
                        rank={index + 1}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No files match the current filter
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    </ScrollArea>
  )
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function SummaryCard({ 
  title, 
  value, 
  icon, 
  color 
}: { 
  title: string
  value: string
  icon: React.ReactNode
  color?: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className={`p-2 rounded-lg bg-muted ${color || ''}`}>
            {icon}
          </div>
        </div>
        <div className="mt-2">
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function CalendarHeatmap({ data }: { data: CalendarHeatmapCell[] }) {
  // Group by weeks for calendar view
  const weeks: CalendarHeatmapCell[][] = []
  let currentWeek: CalendarHeatmapCell[] = []

  // Fill in missing days to align weeks
  const firstDate = data.length > 0 ? new Date(data[0].date) : new Date()
  const startDay = firstDate.getDay()

  // Add empty cells for days before the first date
  for (let i = 0; i < startDay; i++) {
    currentWeek.push({ date: '', count: 0, level: 0 })
  }

  for (const cell of data) {
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
    currentWeek.push(cell)
  }

  if (currentWeek.length > 0) {
    weeks.push(currentWeek)
  }

  const getLevelColor = (level: number) => {
    switch (level) {
      case 0: return 'bg-muted/30'
      case 1: return 'bg-green-200 dark:bg-green-900/40'
      case 2: return 'bg-green-300 dark:bg-green-800/50'
      case 3: return 'bg-green-400 dark:bg-green-700/60'
      case 4: return 'bg-green-500 dark:bg-green-600/70'
      default: return 'bg-muted/30'
    }
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Get month labels
  const getMonthLabels = () => {
    const labels: { month: string; weekIndex: number }[] = []
    let lastMonth = -1

    weeks.forEach((week, weekIndex) => {
      const firstDayOfWeek = week.find(d => d.date)
      if (firstDayOfWeek) {
        const month = new Date(firstDayOfWeek.date).getMonth()
        if (month !== lastMonth) {
          labels.push({ month: months[month], weekIndex })
          lastMonth = month
        }
      }
    })

    return labels
  }

  const monthLabels = getMonthLabels()

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1 mb-2 pl-8">
        {monthLabels.map((label, i) => (
          <span 
            key={i} 
            className="text-xs text-muted-foreground"
            style={{ 
              position: 'relative',
              left: `${label.weekIndex * 16}px`
            }}
          >
            {label.month}
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        {/* Day labels */}
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          {days.map((day, i) => (
            <div key={day} className="h-3 flex items-center">
              {i % 2 === 1 ? day.slice(0, 3) : ''}
            </div>
          ))}
        </div>
        {/* Calendar grid */}
        <div className="flex gap-[2px]">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-[2px]">
              {week.map((cell, dayIndex) => (
                <Tooltip key={`${weekIndex}-${dayIndex}`}>
                  <TooltipTrigger asChild>
                    <div
                      className={`w-3 h-3 rounded-sm ${getLevelColor(cell.level)} cursor-pointer hover:ring-1 hover:ring-foreground/30 transition-all`}
                    />
                  </TooltipTrigger>
                  {cell.date && (
                    <TooltipContent side="top" className="text-xs">
                      <div className="text-center">
                        <p className="font-medium">{formatDisplayDate(cell.date)}</p>
                        <p className="text-muted-foreground">{cell.count} changes</p>
                      </div>
                    </TooltipContent>
                  )}
                </Tooltip>
              ))}
            </div>
          ))}
        </div>
      </div>
      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-4">
        <span className="text-xs text-muted-foreground">Less</span>
        {[0, 1, 2, 3, 4].map(level => (
          <div
            key={level}
            className={`w-3 h-3 rounded-sm ${getLevelColor(level)}`}
          />
        ))}
        <span className="text-xs text-muted-foreground">More</span>
      </div>
    </div>
  )
}

function FileRow({ file, rank }: { file: FileHeatmapData; rank: number }) {
  const categoryColor = CATEGORY_COLORS[file.category] || '#94a3b8'
  
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="text-sm font-medium text-muted-foreground w-6">#{rank}</span>
        <div 
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: categoryColor }}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate font-mono">
            {file.filePath}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {CATEGORY_LABELS[file.category] || file.category}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {file.sessionsInvolved.length} sessions
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-semibold">{file.changeCount} changes</p>
          <p className="text-xs text-muted-foreground">
            {formatNumber(file.linesChanged)} lines
          </p>
        </div>
        {file.issuesCount > 0 && (
          <Badge variant="destructive" className="text-xs gap-1">
            <AlertCircle className="h-3 w-3" />
            {file.issuesCount}
          </Badge>
        )}
        <div className="text-right text-xs text-muted-foreground w-20">
          {formatRelativeTime(file.lastModified)}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

function formatDateShort(dateStr: string): string {
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

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

export default FileHeatmapTab
