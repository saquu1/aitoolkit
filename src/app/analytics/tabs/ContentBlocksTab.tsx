'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  Code, Brain, Wrench, FileText, AlertCircle, GitBranch, 
  Clock, Zap, Hash, TrendingUp, TrendingDown, Minus,
  RefreshCw, ChevronRight, Search, Filter
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

// Types
interface ContentBlock {
  id: string
  sessionId: string
  blockType: 'reasoning' | 'text' | 'tool_calls'
  content: string
  startTime: string
  endTime?: string
  duration?: number
  timingMetrics: {
    processingTime: number
    idleTime: number
    gapFromPrevious: number
  }
  flags: {
    hasError: boolean
    hasBacktrack: boolean
    backtrackedFrom?: string
    errorType?: string
    retryCount: number
  }
  keywords: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
  toolCalls?: ToolCallRecord[]
  createdAt: string
}

interface ToolCallRecord {
  id: string
  toolName: string
  input: Record<string, any>
  success: boolean
  fileOperations?: FileOperation[]
}

interface FileOperation {
  filePath: string
  operation: string
  category: string
}

interface BlockMetrics {
  totalBlocks: number
  avgDuration: number
  errorRate: number
  backtrackRate: number
  toolCallCount: number
}

interface SessionInfo {
  id: string
  title: string
  sessionDate: string
  model: string
}

const BLOCK_TYPE_CONFIG = {
  reasoning: { icon: Brain, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/30', label: 'Reasoning' },
  text: { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30', label: 'Text' },
  tool_calls: { icon: Wrench, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30', label: 'Tool Calls' }
}

const SENTIMENT_CONFIG = {
  positive: { color: 'text-green-500', icon: TrendingUp, label: 'Positive' },
  neutral: { color: 'text-gray-500', icon: Minus, label: 'Neutral' },
  negative: { color: 'text-red-500', icon: TrendingDown, label: 'Negative' }
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981']

export function ContentBlocksTab() {
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [blocks, setBlocks] = useState<ContentBlock[]>([])
  const [metrics, setMetrics] = useState<BlockMetrics | null>(null)
  const [overview, setOverview] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isParsing, setIsParsing] = useState(false)
  const [filterType, setFilterType] = useState<string>('all')
  const [selectedBlock, setSelectedBlock] = useState<ContentBlock | null>(null)

  // Fetch sessions and overview
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sessionsRes, overviewRes] = await Promise.all([
          fetch('/api/analytics?action=sessions'),
          fetch('/api/analytics/blocks?action=overview')
        ])
        
        const sessionsData = await sessionsRes.json()
        const overviewData = await overviewRes.json()
        
        if (sessionsData.success) {
          setSessions(sessionsData.sessions || [])
        }
        if (overviewData.success) {
          setOverview(overviewData.overview)
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  // Parse session blocks
  const parseSession = useCallback(async (sessionId: string) => {
    setIsParsing(true)
    try {
      const res = await fetch(`/api/analytics/blocks?action=session-blocks&sessionId=${sessionId}`)
      const data = await res.json()
      if (data.success) {
        setBlocks(data.blocks || [])
        setMetrics(data.metrics)
        setSelectedSession(sessionId)
      }
    } catch (error) {
      console.error('Failed to parse blocks:', error)
    } finally {
      setIsParsing(false)
    }
  }, [])

  // Filter blocks
  const filteredBlocks = filterType === 'all' 
    ? blocks 
    : blocks.filter(b => b.blockType === filterType)

  // Aggregate by type for charts
  const blocksByType = blocks.reduce((acc, block) => {
    acc[block.blockType] = (acc[block.blockType] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const pieData = Object.entries(blocksByType).map(([type, count], i) => ({
    name: BLOCK_TYPE_CONFIG[type as keyof typeof BLOCK_TYPE_CONFIG]?.label || type,
    value: count,
    color: COLORS[i]
  }))

  // Duration distribution
  const durationDistribution = [
    { range: '< 1s', count: blocks.filter(b => (b.duration || 0) < 1000).length },
    { range: '1-5s', count: blocks.filter(b => (b.duration || 0) >= 1000 && (b.duration || 0) < 5000).length },
    { range: '5-10s', count: blocks.filter(b => (b.duration || 0) >= 5000 && (b.duration || 0) < 10000).length },
    { range: '10-30s', count: blocks.filter(b => (b.duration || 0) >= 10000 && (b.duration || 0) < 30000).length },
    { range: '> 30s', count: blocks.filter(b => (b.duration || 0) >= 30000).length }
  ].filter(d => d.count > 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4 pr-4">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Deep Content Block Parser
            </CardTitle>
            <CardDescription>
              Parse and analyze content blocks from AI sessions - detect types, errors, backtracks, and timing
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Overview Stats */}
        {overview && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <OverviewCard
              label="Total Blocks"
              value={overview.totalBlocks}
              icon={<Code className="h-4 w-4" />}
              color="text-blue-500"
            />
            <OverviewCard
              label="Tool Calls"
              value={overview.totalToolCalls}
              icon={<Wrench className="h-4 w-4" />}
              color="text-green-500"
            />
            <OverviewCard
              label="Errors"
              value={overview.totalErrors}
              icon={<AlertCircle className="h-4 w-4" />}
              color="text-red-500"
            />
            <OverviewCard
              label="Backtracks"
              value={overview.totalBacktracks}
              icon={<GitBranch className="h-4 w-4" />}
              color="text-amber-500"
            />
            <OverviewCard
              label="Error Rate"
              value={`${overview.errorRate.toFixed(1)}%`}
              icon={<TrendingDown className="h-4 w-4" />}
              color="text-purple-500"
            />
          </div>
        )}

        {/* Session Selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select Session to Parse</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {sessions.slice(0, 15).map((session) => (
                <Button
                  key={session.id}
                  variant={selectedSession === session.id ? 'default' : 'outline'}
                  size="sm"
                  className="justify-start text-left h-auto py-2"
                  onClick={() => parseSession(session.id)}
                  disabled={isParsing}
                >
                  <div className="truncate">
                    <div className="font-medium truncate">
                      {session.title || `Session ${session.id.slice(0, 8)}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(session.sessionDate).toLocaleDateString()} • {session.model || 'unknown'}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Parsing Indicator */}
        {isParsing && (
          <Card className="border-blue-500/50">
            <CardContent className="p-6 flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin mr-3" />
              <span>Parsing content blocks...</span>
            </CardContent>
          </Card>
        )}

        {/* Session Analysis Results */}
        {metrics && !isParsing && (
          <>
            {/* Metrics Summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <Code className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="mt-2">
                    <p className="text-2xl font-bold">{metrics.totalBlocks}</p>
                    <p className="text-xs text-muted-foreground">Total Blocks</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <Clock className="h-4 w-4 text-purple-500" />
                  </div>
                  <div className="mt-2">
                    <p className="text-2xl font-bold">{(metrics.avgDuration / 1000).toFixed(1)}s</p>
                    <p className="text-xs text-muted-foreground">Avg Duration</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <Wrench className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="mt-2">
                    <p className="text-2xl font-bold">{metrics.toolCallCount}</p>
                    <p className="text-xs text-muted-foreground">Tool Calls</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Block Types Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Block Types Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        No data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Duration Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Duration Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    {durationDistribution.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={durationDistribution}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="range" className="text-xs" />
                          <YAxis className="text-xs" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        No duration data
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filter and Blocks List */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Parsed Blocks</CardTitle>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="reasoning">Reasoning</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="tool_calls">Tool Calls</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-72">
                  {filteredBlocks.length > 0 ? (
                    <div className="space-y-2">
                      {filteredBlocks.map((block, index) => (
                        <BlockCard
                          key={block.id}
                          block={block}
                          index={index}
                          onClick={() => setSelectedBlock(block)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No blocks match the filter
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </>
        )}

        {/* Empty State */}
        {!selectedSession && !isParsing && (
          <Card>
            <CardContent className="p-8 text-center">
              <Code className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Select a session to parse content blocks</p>
              <p className="text-xs text-muted-foreground mt-2">
                The parser will detect block types, keywords, errors, and timing metrics
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Block Detail Dialog */}
      <Dialog open={!!selectedBlock} onOpenChange={() => setSelectedBlock(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Block Details
            </DialogTitle>
            <DialogDescription>
              Detailed view of content block
            </DialogDescription>
          </DialogHeader>
          {selectedBlock && <BlockDetail block={selectedBlock} />}
        </DialogContent>
      </Dialog>
    </ScrollArea>
  )
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function OverviewCard({ 
  label, 
  value, 
  icon, 
  color 
}: { 
  label: string
  value: string | number
  icon: React.ReactNode
  color?: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`p-2 rounded-lg bg-muted ${color || ''}`}>
          {icon}
        </div>
        <div className="mt-2">
          <p className="text-xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function BlockCard({ 
  block, 
  index,
  onClick 
}: { 
  block: ContentBlock
  index: number
  onClick: () => void
}) {
  const typeConfig = BLOCK_TYPE_CONFIG[block.blockType]
  const sentimentConfig = SENTIMENT_CONFIG[block.sentiment]
  const TypeIcon = typeConfig.icon
  const SentimentIcon = sentimentConfig.icon

  return (
    <div 
      className={`p-3 rounded-lg border ${typeConfig.border} ${typeConfig.bg} cursor-pointer hover:shadow-md transition-all`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <TypeIcon className={`h-4 w-4 ${typeConfig.color}`} />
          <span className="font-medium text-sm">Block {index + 1}</span>
          <Badge variant="outline" className="text-xs">{typeConfig.label}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <SentimentIcon className={`h-4 w-4 ${sentimentConfig.color}`} />
          <span className="text-xs text-muted-foreground">
            {((block.duration || 0) / 1000).toFixed(1)}s
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {block.keywords.slice(0, 5).map((keyword, i) => (
          <Badge key={i} variant="secondary" className="text-xs">
            {keyword}
          </Badge>
        ))}
        {block.keywords.length > 5 && (
          <Badge variant="outline" className="text-xs">
            +{block.keywords.length - 5}
          </Badge>
        )}
      </div>

      <div className="mt-2 flex items-center gap-4">
        {block.flags.hasError && (
          <div className="flex items-center gap-1 text-red-500">
            <AlertCircle className="h-3 w-3" />
            <span className="text-xs">Error: {block.flags.errorType}</span>
          </div>
        )}
        {block.flags.hasBacktrack && (
          <div className="flex items-center gap-1 text-amber-500">
            <GitBranch className="h-3 w-3" />
            <span className="text-xs">Backtrack</span>
          </div>
        )}
        {block.toolCalls && block.toolCalls.length > 0 && (
          <div className="flex items-center gap-1 text-green-500">
            <Wrench className="h-3 w-3" />
            <span className="text-xs">{block.toolCalls.length} tool calls</span>
          </div>
        )}
      </div>
    </div>
  )
}

function BlockDetail({ block }: { block: ContentBlock }) {
  const typeConfig = BLOCK_TYPE_CONFIG[block.blockType]
  const TypeIcon = typeConfig.icon

  return (
    <div className="space-y-4">
      {/* Type and Timing */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Block Type</p>
          <div className="flex items-center gap-2 mt-1">
            <TypeIcon className={`h-5 w-5 ${typeConfig.color}`} />
            <span className="font-medium">{typeConfig.label}</span>
          </div>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Duration</p>
          <p className="font-medium">{((block.duration || 0) / 1000).toFixed(2)}s</p>
        </div>
      </div>

      {/* Timing Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Processing Time</p>
          <p className="text-sm font-medium">{(block.timingMetrics.processingTime / 1000).toFixed(2)}s</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Idle Time</p>
          <p className="text-sm font-medium">{(block.timingMetrics.idleTime / 1000).toFixed(2)}s</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Gap from Previous</p>
          <p className="text-sm font-medium">{(block.timingMetrics.gapFromPrevious / 1000).toFixed(2)}s</p>
        </div>
      </div>

      {/* Flags */}
      <div>
        <p className="text-sm font-medium mb-2">Flags</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant={block.flags.hasError ? 'destructive' : 'outline'}>
            {block.flags.hasError ? `Error: ${block.flags.errorType}` : 'No Errors'}
          </Badge>
          <Badge variant={block.flags.hasBacktrack ? 'default' : 'outline'}>
            {block.flags.hasBacktrack ? 'Backtracked' : 'No Backtrack'}
          </Badge>
          {block.flags.retryCount > 0 && (
            <Badge variant="secondary">{block.flags.retryCount} retries</Badge>
          )}
        </div>
      </div>

      {/* Keywords */}
      <div>
        <p className="text-sm font-medium mb-2">Keywords</p>
        <div className="flex flex-wrap gap-2">
          {block.keywords.map((keyword, i) => (
            <Badge key={i} variant="secondary">{keyword}</Badge>
          ))}
        </div>
      </div>

      {/* Content Preview */}
      <div>
        <p className="text-sm font-medium mb-2">Content Preview</p>
        <div className="p-3 bg-muted rounded-lg max-h-48 overflow-y-auto">
          <pre className="text-xs whitespace-pre-wrap font-mono">
            {block.content.slice(0, 2000)}{block.content.length > 2000 ? '...' : ''}
          </pre>
        </div>
      </div>

      {/* Tool Calls */}
      {block.toolCalls && block.toolCalls.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Tool Calls ({block.toolCalls.length})</p>
          <div className="space-y-2">
            {block.toolCalls.map((tc) => (
              <div key={tc.id} className="p-2 bg-muted rounded border">
                <div className="flex items-center justify-between">
                  <Badge variant="default" className="text-xs capitalize">{tc.toolName}</Badge>
                  <Badge variant={tc.success ? 'default' : 'destructive'} className="text-xs">
                    {tc.success ? 'Success' : 'Failed'}
                  </Badge>
                </div>
                {tc.fileOperations && tc.fileOperations.length > 0 && (
                  <div className="mt-2 text-xs">
                    <span className="text-muted-foreground">Files: </span>
                    {tc.fileOperations.map((fo, i) => (
                      <code key={i} className="ml-1">{fo.filePath}</code>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ContentBlocksTab
