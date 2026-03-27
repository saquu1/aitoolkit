'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  GitBranch, MessageSquare, Brain, Lightbulb, Clock,
  FileCode, RefreshCw, ChevronRight, ChevronDown,
  User, Bot, Wrench, AlertCircle, ArrowRight,
  Layers, TrendingUp, Target, Zap
} from 'lucide-react'

// Types
interface ThreadNode {
  id: string
  type: 'user' | 'assistant' | 'tool' | 'reasoning' | 'error'
  content: string
  timestamp: string
  children: ThreadNode[]
  metadata?: Record<string, any>
}

interface TopicEvolution {
  topic: string
  startMessageIndex: number
  endMessageIndex?: number
  keywords: string[]
  relatedFiles: string[]
  outcomes: string[]
}

interface MessageFlowNode {
  id: string
  messageIndex: number
  type: string
  summary: string
  duration: number
  transitions: string[]
}

interface DecisionPoint {
  id: string
  messageIndex: number
  decision: string
  alternatives: string[]
  outcome: string
  impact: 'high' | 'medium' | 'low'
}

interface ThreadReconstruction {
  id: string
  sessionId: string
  tree: ThreadNode
  topics: TopicEvolution[]
  messageFlow: MessageFlowNode[]
  keyDecisions: DecisionPoint[]
}

interface Session {
  id: string
  chatId: string
  title: string
  sessionDate: string
  messageCount: number
}

interface ThreadData {
  success: boolean
  sessions: Session[]
  reconstruction?: ThreadReconstruction
  stats?: {
    totalNodes: number
    totalTopics: number
    totalDecisions: number
    topicDistribution: Record<string, number>
    avgDecisionsPerSession: number
  }
}

const NODE_COLORS: Record<string, string> = {
  user: 'bg-blue-500/10 border-blue-500/30 text-blue-500',
  assistant: 'bg-green-500/10 border-green-500/30 text-green-500',
  tool: 'bg-purple-500/10 border-purple-500/30 text-purple-500',
  reasoning: 'bg-amber-500/10 border-amber-500/30 text-amber-500',
  error: 'bg-red-500/10 border-red-500/30 text-red-500'
}

const NODE_ICONS: Record<string, React.ReactNode> = {
  user: <User className="h-4 w-4" />,
  assistant: <Bot className="h-4 w-4" />,
  tool: <Wrench className="h-4 w-4" />,
  reasoning: <Brain className="h-4 w-4" />,
  error: <AlertCircle className="h-4 w-4" />
}

const IMPACT_COLORS: Record<string, string> = {
  high: 'bg-red-500/10 text-red-500 border-red-500/30',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
  low: 'bg-green-500/10 text-green-500 border-green-500/30'
}

const TOPIC_COLORS: Record<string, string> = {
  'Bug Fixing': 'bg-red-500/10 text-red-500',
  'Feature Development': 'bg-green-500/10 text-green-500',
  'Refactoring': 'bg-blue-500/10 text-blue-500',
  'Testing': 'bg-purple-500/10 text-purple-500',
  'Deployment': 'bg-orange-500/10 text-orange-500',
  'Documentation': 'bg-cyan-500/10 text-cyan-500',
  'API Development': 'bg-pink-500/10 text-pink-500',
  'Database Work': 'bg-indigo-500/10 text-indigo-500',
  'UI Development': 'bg-teal-500/10 text-teal-500'
}

export function ThreadReconstructorTab() {
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<ThreadData | null>(null)
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [reconstruction, setReconstruction] = useState<ThreadReconstruction | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)
  const [viewMode, setViewMode] = useState<'tree' | 'timeline' | 'flow'>('tree')

  const fetchSessions = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/analytics?action=sessions&limit=50')
      const result = await res.json()
      setData(result)
      if (result.sessions?.length > 0 && !selectedSessionId) {
        setSelectedSessionId(result.sessions[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    } finally {
      setIsLoading(false)
      setLastRefresh(new Date())
    }
  }

  const fetchReconstruction = async (sessionId: string) => {
    if (!sessionId) return
    try {
      const res = await fetch(`/api/analytics/blocks?action=thread-reconstruction&sessionId=${sessionId}`)
      const result = await res.json()
      setReconstruction(result.reconstruction || null)
    } catch (error) {
      console.error('Failed to fetch reconstruction:', error)
      setReconstruction(null)
    }
  }

  useEffect(() => {
    setMounted(true)
    fetchSessions()
  }, [])

  useEffect(() => {
    if (selectedSessionId) {
      fetchReconstruction(selectedSessionId)
    }
  }, [selectedSessionId])

  // Flatten tree for visualization
  const flatNodes = useMemo(() => {
    if (!reconstruction?.tree) return []
    const nodes: Array<ThreadNode & { depth: number }> = []
    const traverse = (node: ThreadNode, depth: number) => {
      nodes.push({ ...node, depth })
      for (const child of node.children) {
        traverse(child, depth + 1)
      }
    }
    traverse(reconstruction.tree, 0)
    return nodes.slice(1) // Skip root
  }, [reconstruction?.tree])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const stats = data?.stats || {
    totalNodes: 0,
    totalTopics: 0,
    totalDecisions: 0,
    topicDistribution: {},
    avgDecisionsPerSession: 0
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header Controls */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-4">
          <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select session" />
            </SelectTrigger>
            <SelectContent>
              {(data?.sessions || []).map(session => (
                <SelectItem key={session.id} value={session.id}>
                  {session.title || `Session ${session.chatId?.slice(0, 8) || session.id.slice(0, 8)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center border rounded-lg p-1">
            <Button 
              variant={viewMode === 'tree' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('tree')}
              className="h-8 px-3"
            >
              <GitBranch className="h-4 w-4 mr-1" />
              Tree
            </Button>
            <Button 
              variant={viewMode === 'timeline' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('timeline')}
              className="h-8 px-3"
            >
              <Clock className="h-4 w-4 mr-1" />
              Timeline
            </Button>
            <Button 
              variant={viewMode === 'flow' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('flow')}
              className="h-8 px-3"
            >
              <Layers className="h-4 w-4 mr-1" />
              Flow
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground">
            {mounted && lastRefresh ? `Last updated: ${lastRefresh.toLocaleTimeString()}` : 'Loading...'}
          </span>
          <Button variant="outline" size="sm" onClick={fetchSessions} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 p-4 border-b bg-muted/10">
        <StatCard
          label="Nodes"
          value={flatNodes.length}
          icon={<GitBranch className="h-4 w-4" />}
        />
        <StatCard
          label="Topics"
          value={reconstruction?.topics?.length || 0}
          icon={<Target className="h-4 w-4 text-blue-500" />}
        />
        <StatCard
          label="Decisions"
          value={reconstruction?.keyDecisions?.length || 0}
          icon={<Lightbulb className="h-4 w-4 text-amber-500" />}
        />
        <StatCard
          label="Files"
          value={[...new Set(reconstruction?.topics?.flatMap(t => t.relatedFiles) || [])].length}
          icon={<FileCode className="h-4 w-4 text-purple-500" />}
        />
        <StatCard
          label="Flow Length"
          value={reconstruction?.messageFlow?.length || 0}
          icon={<Layers className="h-4 w-4 text-green-500" />}
        />
      </div>

      {/* Main Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {!reconstruction ? (
            <Card>
              <CardContent className="py-12 text-center">
                <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {!selectedSessionId 
                    ? 'Select a session to view thread reconstruction'
                    : 'No thread reconstruction available for this session'
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Import chat logs to enable thread analysis
                </p>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="tree" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="tree" className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  Thread Tree
                </TabsTrigger>
                <TabsTrigger value="topics" className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Topic Evolution
                </TabsTrigger>
                <TabsTrigger value="decisions" className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Key Decisions
                </TabsTrigger>
                <TabsTrigger value="flow" className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Message Flow
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tree">
                <ThreadTreeView nodes={flatNodes} />
              </TabsContent>

              <TabsContent value="topics">
                <TopicEvolutionView topics={reconstruction.topics} />
              </TabsContent>

              <TabsContent value="decisions">
                <DecisionsView decisions={reconstruction.keyDecisions} />
              </TabsContent>

              <TabsContent value="flow">
                <MessageFlowView flow={reconstruction.messageFlow} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function StatCard({ 
  label, 
  value, 
  icon 
}: { 
  label: string
  value: string | number
  icon: React.ReactNode
}) {
  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        {icon}
      </div>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  )
}

function ThreadTreeView({ nodes }: { nodes: Array<ThreadNode & { depth: number }> }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggleNode = (id: string) => {
    const newExpanded = new Set(expanded)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpanded(newExpanded)
  }

  // Group by depth for visual hierarchy
  const visibleNodes = nodes.slice(0, 50) // Limit for performance

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Thread Tree Visualization
        </CardTitle>
        <CardDescription>
          Hierarchical view of conversation flow ({nodes.length} total nodes)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <div className="space-y-1 pr-4">
            {visibleNodes.map((node, index) => (
              <div
                key={node.id}
                className={`p-2 rounded-lg border ${NODE_COLORS[node.type]} transition-all`}
                style={{ marginLeft: `${node.depth * 16}px` }}
              >
                <div 
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => toggleNode(node.id)}
                >
                  {node.children.length > 0 ? (
                    expanded.has(node.id) ? 
                      <ChevronDown className="h-4 w-4" /> : 
                      <ChevronRight className="h-4 w-4" />
                  ) : (
                    <div className="w-4" />
                  )}
                  {NODE_ICONS[node.type]}
                  <span className="font-medium text-sm">Node {index + 1}</span>
                  <Badge variant="outline" className="text-xs">{node.type}</Badge>
                  {node.metadata?.length && (
                    <span className="text-xs text-muted-foreground">
                      {node.metadata.length} chars
                    </span>
                  )}
                </div>
                
                {expanded.has(node.id) && (
                  <div className="mt-2 ml-6 p-2 bg-muted/30 rounded text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {node.content?.slice(0, 300)}
                    {node.content?.length > 300 && '...'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

function TopicEvolutionView({ topics }: { topics: TopicEvolution[] }) {
  return (
    <div className="space-y-4">
      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Topic Evolution Timeline
          </CardTitle>
          <CardDescription>
            Track how conversation topics change throughout the session
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
            
            <div className="space-y-4">
              {topics.map((topic, index) => (
                <div key={index} className="relative pl-10">
                  {/* Timeline dot */}
                  <div className={`absolute left-2 w-4 h-4 rounded-full border-2 border-background ${
                    TOPIC_COLORS[topic.topic] || 'bg-muted'
                  }`} />
                  
                  <Card className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge className={TOPIC_COLORS[topic.topic] || ''}>
                          {topic.topic}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          Messages {topic.startMessageIndex}
                          {topic.endMessageIndex ? ` - ${topic.endMessageIndex}` : '+'}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {topic.keywords.length} keywords
                      </span>
                    </div>

                    {/* Keywords */}
                    {topic.keywords.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-3">
                        {topic.keywords.slice(0, 8).map((kw, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>
                        ))}
                      </div>
                    )}

                    {/* Related Files */}
                    {topic.relatedFiles.length > 0 && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <FileCode className="h-3 w-3" />
                        {topic.relatedFiles.slice(0, 3).join(', ')}
                        {topic.relatedFiles.length > 3 && ` +${topic.relatedFiles.length - 3} more`}
                      </div>
                    )}
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function DecisionsView({ decisions }: { decisions: DecisionPoint[] }) {
  if (decisions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No key decisions detected</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Key Decision Points
        </CardTitle>
        <CardDescription>
          Critical decisions that shaped the conversation direction
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-3 pr-4">
            {decisions.map((decision, index) => (
              <div
                key={decision.id}
                className={`p-4 rounded-lg border ${IMPACT_COLORS[decision.impact]}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Msg #{decision.messageIndex}
                      </Badge>
                      <Badge className={`text-xs ${IMPACT_COLORS[decision.impact]}`}>
                        {decision.impact} impact
                      </Badge>
                    </div>
                    <p className="font-medium mt-2">{decision.decision}</p>
                    
                    {decision.alternatives.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground">Alternatives:</p>
                        <ul className="text-xs mt-1 space-y-1">
                          {decision.alternatives.slice(0, 3).map((alt, i) => (
                            <li key={i} className="flex items-center gap-1">
                              <ArrowRight className="h-3 w-3" />
                              {alt}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {decision.outcome && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Outcome: {decision.outcome}
                      </p>
                    )}
                  </div>
                  <div className="text-lg font-bold opacity-50">#{index + 1}</div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

function MessageFlowView({ flow }: { flow: MessageFlowNode[] }) {
  if (flow.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No message flow data</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Message Flow
        </CardTitle>
        <CardDescription>
          Linear view of message progression through the session
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-1 pr-4">
            {flow.slice(0, 100).map((node, index) => (
              <div
                key={node.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </div>
                <Badge variant={node.type === 'user' ? 'default' : 'secondary'} className="text-xs">
                  {node.type}
                </Badge>
                <p className="text-sm flex-1 truncate">{node.summary}</p>
                {node.duration > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {Math.round(node.duration / 1000)}s
                  </span>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

export default ThreadReconstructorTab
