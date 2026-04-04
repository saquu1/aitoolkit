'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  Clock, Activity, Zap, ChevronRight, FileCode, AlertTriangle,
  CheckCircle, XCircle, RefreshCw, MessageSquare, Brain,
  Wrench, TrendingUp, TrendingDown, Minus, Calendar, Hash
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

// Types
interface ContentBlock {
  id: string
  blockType: 'reasoning' | 'text' | 'tool_calls'
  content: string
  keywords: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
  flags: {
    hasError: boolean
    hasBacktrack: boolean
    retryCount: number
  }
  toolCalls?: ToolCall[]
  duration?: number
}

interface ToolCall {
  toolName: string
  input: Record<string, any>
  success: boolean
  fileOperations?: FileOperation[]
}

interface FileOperation {
  filePath: string
  operation: string
}

interface Session {
  id: string
  chatId: string
  title: string
  sessionDate: string
  model: string
  category: string
  totalTokens: number
  estimatedCost: number
  duration: number
  efficiencyScore: number
  qualityScore: number
  messageCount: number
  featuresImplemented: number
  issuesCreated: number
  issuesResolved: number
  contentBlocks?: ContentBlock[]
}

interface SessionsData {
  success: boolean
  sessions: Session[]
  stats: {
    totalSessions: number
    avgEfficiency: number
    avgDuration: number
    totalCost: number
    totalTokens: number
    sessionsTrend: number
  }
  timeline: Array<{ date: string; count: number }>
}

export function SessionsTab() {
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<SessionsData | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [modelFilter, setModelFilter] = useState('all')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/analytics?action=sessions&limit=100')
      const result = await res.json()
      setData(result)
      if (result.sessions) {
        setSessions(result.sessions)
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    } finally {
      setIsLoading(false)
      setLastRefresh(new Date())
    }
  }

  useEffect(() => {
    setMounted(true)
    fetchData()
  }, [])

  // Filter sessions
  const filteredSessions = sessions.filter(s => {
    if (categoryFilter !== 'all' && s.category !== categoryFilter) return false
    if (modelFilter !== 'all' && s.model !== modelFilter) return false
    return true
  })

  // Get unique categories and models
  const categories = [...new Set(sessions.map(s => s.category))]
  const models = [...new Set(sessions.map(s => s.model))]

  // Prepare timeline data
  const timelineData = data?.timeline?.map(t => ({
    date: formatDateShort(t.date),
    count: t.count
  })) || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const stats = data?.stats || {
    totalSessions: 0,
    avgEfficiency: 0,
    avgDuration: 0,
    totalCost: 0,
    totalTokens: 0,
    sessionsTrend: 0
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Header Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={modelFilter} onValueChange={setModelFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Models</SelectItem>
                {models.map(model => (
                  <SelectItem key={model} value={model}>{model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatCard
            title="Total Sessions"
            value={stats.totalSessions}
            icon={<Activity className="h-4 w-4" />}
            trend={stats.sessionsTrend}
          />
          <StatCard
            title="Avg Efficiency"
            value={`${stats.avgEfficiency?.toFixed(0) || 0}%`}
            icon={<Zap className="h-4 w-4 text-amber-500" />}
          />
          <StatCard
            title="Avg Duration"
            value={formatDuration(stats.avgDuration)}
            icon={<Clock className="h-4 w-4 text-blue-500" />}
          />
          <StatCard
            title="Total Cost"
            value={`$${stats.totalCost?.toFixed(2) || 0}`}
            icon={<TrendingUp className="h-4 w-4 text-green-500" />}
          />
          <StatCard
            title="Total Tokens"
            value={formatNumber(stats.totalTokens)}
            icon={<Hash className="h-4 w-4 text-purple-500" />}
          />
          <StatCard
            title="Showing"
            value={filteredSessions.length}
            icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
          />
        </div>

        {/* Timeline Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Session Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-32">
              {timelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No timeline data
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sessions List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Session History
            </CardTitle>
            <CardDescription>
              Click on a session to view detailed content block analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredSessions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No sessions found</p>
            ) : (
              <div className="space-y-2">
                {filteredSessions.map((session) => (
                  <SessionRow 
                    key={session.id} 
                    session={session} 
                    onClick={() => setSelectedSession(session)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Session Detail Dialog */}
      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Session Analysis
            </DialogTitle>
            <DialogDescription>
              {selectedSession?.title || 'Session content block breakdown'}
            </DialogDescription>
          </DialogHeader>
          {selectedSession && (
            <SessionDetail session={selectedSession} />
          )}
        </DialogContent>
      </Dialog>
    </ScrollArea>
  )
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function StatCard({ 
  title, 
  value, 
  icon, 
  trend 
}: { 
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: number
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="p-2 rounded-lg bg-muted">
            {icon}
          </div>
          {trend !== undefined && trend !== 0 && (
            <Badge variant={trend > 0 ? 'default' : 'destructive'} className="text-xs">
              {trend > 0 ? '+' : ''}{trend}%
            </Badge>
          )}
        </div>
        <div className="mt-2">
          <p className="text-xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function SessionRow({ session, onClick }: { session: Session; onClick: () => void }) {
  const efficiencyColor = session.efficiencyScore >= 80 ? 'text-green-500' :
                          session.efficiencyScore >= 50 ? 'text-yellow-500' : 'text-red-500'

  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Activity className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">
            {session.title || `Session ${session.chatId?.slice(0, 8) || session.id.slice(0, 8)}`}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">{session.category}</Badge>
            <span className="text-xs text-muted-foreground">{session.model}</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">{session.messageCount || 0} messages</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <div className="flex items-center gap-1">
            <Zap className={`h-3 w-3 ${efficiencyColor}`} />
            <span className="text-sm font-medium">{session.efficiencyScore?.toFixed(0) || 0}%</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatNumber(session.totalTokens)} tokens
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          ${session.estimatedCost?.toFixed(4) || '0.0000'}
        </Badge>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  )
}

function SessionDetail({ session }: { session: Session }) {
  const [blocks, setBlocks] = useState<ContentBlock[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchBlocks = async () => {
      try {
        const res = await fetch(`/api/analytics/blocks?action=session-blocks&sessionId=${session.id}`)
        const data = await res.json()
        if (data.success && data.blocks) {
          setBlocks(data.blocks)
        }
      } catch (error) {
        console.error('Failed to fetch blocks:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchBlocks()
  }, [session.id])

  // Calculate block stats
  const blockStats = {
    total: blocks.length,
    reasoning: blocks.filter(b => b.blockType === 'reasoning').length,
    toolCalls: blocks.filter(b => b.blockType === 'tool_calls').length,
    text: blocks.filter(b => b.blockType === 'text').length,
    errors: blocks.filter(b => b.flags?.hasError).length,
    backtracks: blocks.filter(b => b.flags?.hasBacktrack).length
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col gap-4">
      {/* Session Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-2 rounded-lg bg-muted/50 text-center">
          <p className="text-lg font-semibold">{session.messageCount || 0}</p>
          <p className="text-xs text-muted-foreground">Messages</p>
        </div>
        <div className="p-2 rounded-lg bg-muted/50 text-center">
          <p className="text-lg font-semibold">{session.featuresImplemented || 0}</p>
          <p className="text-xs text-muted-foreground">Features</p>
        </div>
        <div className="p-2 rounded-lg bg-muted/50 text-center">
          <p className="text-lg font-semibold">{session.issuesCreated || 0}</p>
          <p className="text-xs text-muted-foreground">Issues</p>
        </div>
        <div className="p-2 rounded-lg bg-muted/50 text-center">
          <p className="text-lg font-semibold">{session.issuesResolved || 0}</p>
          <p className="text-xs text-muted-foreground">Resolved</p>
        </div>
      </div>

      {/* Block Summary */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant="outline">Total: {blockStats.total}</Badge>
        <Badge className="bg-purple-500/10 text-purple-500">
          <Brain className="h-3 w-3 mr-1" />
          Reasoning: {blockStats.reasoning}
        </Badge>
        <Badge className="bg-blue-500/10 text-blue-500">
          <Wrench className="h-3 w-3 mr-1" />
          Tool Calls: {blockStats.toolCalls}
        </Badge>
        <Badge className="bg-gray-500/10 text-gray-500">
          Text: {blockStats.text}
        </Badge>
        {blockStats.errors > 0 && (
          <Badge className="bg-red-500/10 text-red-500">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Errors: {blockStats.errors}
          </Badge>
        )}
        {blockStats.backtracks > 0 && (
          <Badge className="bg-orange-500/10 text-orange-500">
            Backtracks: {blockStats.backtracks}
          </Badge>
        )}
      </div>

      {/* Content Blocks */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : blocks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No content blocks available. Import a chat session to see block analysis.
          </div>
        ) : (
          <div className="space-y-2 pr-4">
            {blocks.map((block, index) => (
              <ContentBlockCard key={block.id} block={block} index={index} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

function ContentBlockCard({ block, index }: { block: ContentBlock; index: number }) {
  const [expanded, setExpanded] = useState(false)

  const typeConfig = {
    reasoning: { color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', icon: Brain },
    tool_calls: { color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: Wrench },
    text: { color: 'bg-gray-500/10 text-gray-500 border-gray-500/20', icon: MessageSquare }
  }

  const config = typeConfig[block.blockType] || typeConfig.text
  const Icon = config.icon
  const sentimentColor = block.sentiment === 'positive' ? 'text-green-500' :
                         block.sentiment === 'negative' ? 'text-red-500' : 'text-muted-foreground'

  return (
    <div className={`p-3 rounded-lg border ${config.color} cursor-pointer`} onClick={() => setExpanded(!expanded)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span className="font-medium text-sm">Block {index + 1}</span>
          <Badge variant="outline" className="text-xs">{block.blockType}</Badge>
          {block.flags?.hasError && <AlertTriangle className="h-3 w-3 text-red-500" />}
          {block.flags?.hasBacktrack && <RefreshCw className="h-3 w-3 text-orange-500" />}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${sentimentColor}`}>{block.sentiment}</span>
          {expanded ? <ChevronRight className="h-4 w-4 rotate-90" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </div>

      {/* Keywords */}
      {block.keywords && block.keywords.length > 0 && (
        <div className="flex gap-1 flex-wrap mt-2">
          {block.keywords.slice(0, 5).map((kw, i) => (
            <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>
          ))}
          {block.keywords.length > 5 && (
            <Badge variant="secondary" className="text-xs">+{block.keywords.length - 5}</Badge>
          )}
        </div>
      )}

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-current/20 space-y-2">
          <p className="text-sm font-mono whitespace-pre-wrap bg-muted/50 p-2 rounded text-xs max-h-40 overflow-y-auto">
            {block.content?.slice(0, 500)}
            {block.content?.length > 500 && '...'}
          </p>

          {/* Tool Calls */}
          {block.toolCalls && block.toolCalls.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium">Tool Calls:</p>
              {block.toolCalls.map((tc, i) => (
                <div key={i} className="flex items-center gap-2 text-xs bg-muted/30 p-2 rounded">
                  {tc.success ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500" />
                  )}
                  <span className="font-mono">{tc.toolName}</span>
                  {tc.input?.path && (
                    <span className="text-muted-foreground truncate">{tc.input.path}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Flags */}
          {block.flags && (block.flags.retryCount > 0 || block.flags.hasBacktrack) && (
            <div className="flex gap-2">
              {block.flags.retryCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {block.flags.retryCount} retries
                </Badge>
              )}
            </div>
          )}
        </div>
      )}
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

function formatDuration(ms: number): string {
  if (!ms) return '0m'
  const mins = Math.floor(ms / 60000)
  const hours = Math.floor(mins / 60)
  if (hours > 0) return `${hours}h ${mins % 60}m`
  return `${mins}m`
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default SessionsTab
