'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  GitCompare, ArrowRight, ArrowUp, ArrowDown, Minus, Clock, DollarSign,
  AlertTriangle, CheckCircle, Package, Zap, FileCode, TrendingUp,
  TrendingDown, Activity, Brain, Target, Sparkles
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  LineChart, Line
} from 'recharts'

// =============================================================================
// TYPES
// =============================================================================

interface SessionSummary {
  id: string
  chatId: string
  title: string
  sessionDate: Date
  model: string
  category: string
  totalTokens: number
  estimatedCost: number
  duration: number
  issuesCreated: number
  issuesResolved: number
  featuresImplemented: number
  qualityScore?: number
}

interface SessionDetails {
  id: string
  summary: SessionSummary
  metrics: {
    firstAttemptRate: number
    errorRate: number
    backtrackRate: number
    linesPerMinute: number
    commandSuccessRate: number
    reasoningEfficiency: number
  }
  files: {
    created: string[]
    modified: string[]
    deleted: string[]
  }
  issues: {
    type: string
    title: string
    severity: string
    resolved: boolean
  }[]
  toolCalls: {
    tool: string
    count: number
    successRate: number
  }[]
  timeline: {
    stage: string
    duration: number
    percentage: number
  }[]
}

interface ComparisonResult {
  sessionA: SessionDetails
  sessionB: SessionDetails
  diff: {
    tokens: { value: number; percent: number; direction: 'up' | 'down' | 'same' }
    cost: { value: number; percent: number; direction: 'up' | 'down' | 'same' }
    duration: { value: number; percent: number; direction: 'up' | 'down' | 'same' }
    issues: { value: number; percent: number; direction: 'up' | 'down' | 'same' }
    quality: { value: number; percent: number; direction: 'up' | 'down' | 'same' }
    efficiency: { value: number; percent: number; direction: 'up' | 'down' | 'same' }
  }
  whatChanged: {
    category: string
    improvements: string[]
    regressions: string[]
    neutral: string[]
  }[]
  recommendations: string[]
}

interface SessionComparisonToolProps {
  sessionIdA?: string
  sessionIdB?: string
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function SessionComparisonTool({ sessionIdA, sessionIdB }: SessionComparisonToolProps) {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [selectedA, setSelectedA] = useState<string>(sessionIdA || '')
  const [selectedB, setSelectedB] = useState<string>(sessionIdB || '')
  const [comparison, setComparison] = useState<ComparisonResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchSessions()
  }, [])

  useEffect(() => {
    if (selectedA && selectedB && selectedA !== selectedB) {
      fetchComparison()
    }
  }, [selectedA, selectedB])

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/analytics?action=sessions&limit=50')
      const data = await res.json()
      if (data.success) {
        setSessions(data.sessions || [])
        if (data.sessions?.length >= 2) {
          setSelectedA(data.sessions[0].id)
          setSelectedB(data.sessions[1].id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    } finally {
      setIsLoadingSessions(false)
    }
  }

  const fetchComparison = async () => {
    if (!selectedA || !selectedB || selectedA === selectedB) {
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/analytics/automation?action=compare-sessions&sessionA=${selectedA}&sessionB=${selectedB}`)
      const data = await res.json()
      if (data.success) {
        setComparison(data.comparison)
      }
    } catch (error) {
      console.error('Failed to fetch comparison:', error)
      toast({ title: 'Failed to compare sessions', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const getSessionLabel = (session: SessionSummary) => {
    const date = new Date(session.sessionDate).toLocaleDateString()
    const title = session.title?.slice(0, 30) || 'Untitled'
    return `${date} - ${title}${session.title?.length > 30 ? '...' : ''}`
  }

  return (
    <div className="space-y-4">
      {/* Session Selectors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Session Comparison Tool
          </CardTitle>
          <CardDescription>
            Compare two AI coding sessions side-by-side
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground mb-2 block">Session A (Earlier)</label>
              <Select value={selectedA} onValueChange={setSelectedA}>
                <SelectTrigger>
                  <SelectValue placeholder="Select first session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map(s => (
                    <SelectItem key={s.id} value={s.id} disabled={s.id === selectedB}>
                      {getSessionLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-center pt-6">
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
            </div>
            
            <div className="flex-1">
              <label className="text-sm text-muted-foreground mb-2 block">Session B (Later)</label>
              <Select value={selectedB} onValueChange={setSelectedB}>
                <SelectTrigger>
                  <SelectValue placeholder="Select second session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map(s => (
                    <SelectItem key={s.id} value={s.id} disabled={s.id === selectedA}>
                      {getSessionLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={fetchComparison} 
              disabled={!selectedA || !selectedB || selectedA === selectedB || isLoading}
              className="mt-6"
            >
              {isLoading ? (
                <>
                  <Activity className="h-4 w-4 mr-2 animate-spin" />
                  Comparing...
                </>
              ) : (
                <>
                  <GitCompare className="h-4 w-4 mr-2" />
                  Compare
                </>
              )}
            </Button>
          </div>
          
          {selectedA && selectedB && selectedA === selectedB && (
            <p className="text-sm text-destructive mt-2">
              Please select two different sessions to compare
            </p>
          )}
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {comparison && (
        <>
          {/* Side-by-Side Metrics */}
          <div className="grid grid-cols-2 gap-4">
            {/* Session A */}
            <SessionCard 
              session={comparison.sessionA} 
              label="Session A"
              isEarlier
            />
            
            {/* Session B */}
            <SessionCard 
              session={comparison.sessionB} 
              label="Session B"
              isEarlier={false}
            />
          </div>

          {/* Metrics Diff */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Metrics Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <MetricDiffRow 
                  label="Tokens" 
                  diff={comparison.diff.tokens}
                  format="number"
                  sessionAValue={comparison.sessionA.summary.totalTokens}
                  sessionBValue={comparison.sessionB.summary.totalTokens}
                />
                <MetricDiffRow 
                  label="Cost" 
                  diff={comparison.diff.cost}
                  format="currency"
                  sessionAValue={comparison.sessionA.summary.estimatedCost}
                  sessionBValue={comparison.sessionB.summary.estimatedCost}
                />
                <MetricDiffRow 
                  label="Duration" 
                  diff={comparison.diff.duration}
                  format="duration"
                  sessionAValue={comparison.sessionA.summary.duration}
                  sessionBValue={comparison.sessionB.summary.duration}
                />
                <MetricDiffRow 
                  label="Issues" 
                  diff={comparison.diff.issues}
                  format="number"
                  sessionAValue={comparison.sessionA.summary.issuesCreated}
                  sessionBValue={comparison.sessionB.summary.issuesCreated}
                  inverseGood
                />
                <MetricDiffRow 
                  label="Quality Score" 
                  diff={comparison.diff.quality}
                  format="score"
                  sessionAValue={comparison.sessionA.metrics?.firstAttemptRate || 0}
                  sessionBValue={comparison.sessionB.metrics?.firstAttemptRate || 0}
                />
                <MetricDiffRow 
                  label="Efficiency" 
                  diff={comparison.diff.efficiency}
                  format="percent"
                  sessionAValue={comparison.sessionA.metrics?.linesPerMinute || 0}
                  sessionBValue={comparison.sessionB.metrics?.linesPerMinute || 0}
                />
              </div>
            </CardContent>
          </Card>

          {/* Visual Charts */}
          <div className="grid grid-cols-2 gap-4">
            {/* Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance Radar</CardTitle>
              </CardHeader>
              <CardContent>
                <ComparisonRadarChart 
                  sessionA={comparison.sessionA}
                  sessionB={comparison.sessionB}
                />
              </CardContent>
            </Card>

            {/* Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Metrics Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ComparisonBarChart 
                  sessionA={comparison.sessionA}
                  sessionB={comparison.sessionB}
                />
              </CardContent>
            </Card>
          </div>

          {/* What Changed Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                What Changed Analysis
              </CardTitle>
              <CardDescription>
                Detailed breakdown of improvements, regressions, and changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {comparison.whatChanged.map((category, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      {category.category}
                    </h4>
                    
                    <div className="grid grid-cols-3 gap-4">
                      {/* Improvements */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-green-600">
                          <TrendingUp className="h-4 w-4" />
                          <span className="text-sm font-medium">Improvements</span>
                        </div>
                        {category.improvements.length > 0 ? (
                          <ul className="space-y-1">
                            {category.improvements.map((item, i) => (
                              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                <CheckCircle className="h-3 w-3 text-green-500 mt-1 shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">None</p>
                        )}
                      </div>
                      
                      {/* Regressions */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-red-600">
                          <TrendingDown className="h-4 w-4" />
                          <span className="text-sm font-medium">Regressions</span>
                        </div>
                        {category.regressions.length > 0 ? (
                          <ul className="space-y-1">
                            {category.regressions.map((item, i) => (
                              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                <AlertTriangle className="h-3 w-3 text-red-500 mt-1 shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">None</p>
                        )}
                      </div>
                      
                      {/* Neutral */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Minus className="h-4 w-4" />
                          <span className="text-sm font-medium">Neutral</span>
                        </div>
                        {category.neutral.length > 0 ? (
                          <ul className="space-y-1">
                            {category.neutral.map((item, i) => (
                              <li key={i} className="text-sm text-muted-foreground">
                                {item}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">None</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* File Changes Diff */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCode className="h-5 w-5" />
                File Changes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FileChangesDiff 
                filesA={comparison.sessionA.files}
                filesB={comparison.sessionB.files}
              />
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold flex items-center gap-2">
                    Recommendations
                    <Badge variant="default" className="text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI Generated
                    </Badge>
                  </h4>
                  <ul className="mt-3 space-y-2">
                    {comparison.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!comparison && !isLoading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <GitCompare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Select two sessions to compare
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function SessionCard({ 
  session, 
  label,
  isEarlier 
}: { 
  session: SessionDetails
  label: string
  isEarlier: boolean
}) {
  const s = session.summary
  const m = session.metrics

  return (
    <Card className={isEarlier ? 'border-blue-500/30' : 'border-green-500/30'}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{label}</CardTitle>
          <Badge variant={isEarlier ? 'outline' : 'default'}>
            {isEarlier ? 'Earlier' : 'Later'}
          </Badge>
        </div>
        <CardDescription className="truncate">
          {s.title || 'Untitled Session'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Date:</span>
            <p className="font-medium">{new Date(s.sessionDate).toLocaleDateString()}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Model:</span>
            <p className="font-medium">{s.model}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Tokens:</span>
            <p className="font-medium">{s.totalTokens.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Cost:</span>
            <p className="font-medium">${s.estimatedCost.toFixed(2)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Duration:</span>
            <p className="font-medium">{Math.round(s.duration / 60)} min</p>
          </div>
          <div>
            <span className="text-muted-foreground">Quality:</span>
            <p className="font-medium">{m?.firstAttemptRate || 0}%</p>
          </div>
        </div>
        
        {/* Mini Progress Bars */}
        <div className="mt-4 space-y-2">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>First Attempt Rate</span>
              <span>{m?.firstAttemptRate || 0}%</span>
            </div>
            <Progress value={m?.firstAttemptRate || 0} className="h-1.5" />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Command Success</span>
              <span>{m?.commandSuccessRate || 0}%</span>
            </div>
            <Progress value={m?.commandSuccessRate || 0} className="h-1.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function MetricDiffRow({
  label,
  diff,
  format,
  sessionAValue,
  sessionBValue,
  inverseGood = false
}: {
  label: string
  diff: { value: number; percent: number; direction: 'up' | 'down' | 'same' }
  format: 'number' | 'currency' | 'duration' | 'score' | 'percent'
  sessionAValue: number
  sessionBValue: number
  inverseGood?: boolean
}) {
  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return `$${val.toFixed(2)}`
      case 'duration':
        return `${Math.round(val / 60)} min`
      case 'percent':
        return `${val.toFixed(1)}%`
      case 'score':
        return `${val.toFixed(0)}`
      default:
        return val.toLocaleString()
    }
  }

  const isPositive = inverseGood ? diff.direction === 'down' : diff.direction === 'up'
  const isNeutral = diff.direction === 'same'

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border">
      <div className="w-24 text-sm font-medium">{label}</div>
      
      <div className="flex-1 flex items-center gap-2">
        <span className="text-sm text-muted-foreground w-20">{formatValue(sessionAValue)}</span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium w-20">{formatValue(sessionBValue)}</span>
      </div>
      
      <div className="w-32 flex items-center gap-2 justify-end">
        {isNeutral ? (
          <Badge variant="secondary">
            <Minus className="h-3 w-3 mr-1" />
            No change
          </Badge>
        ) : (
          <Badge variant={isPositive ? 'default' : 'destructive'} className="gap-1">
            {diff.direction === 'up' ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )}
            {Math.abs(diff.percent).toFixed(1)}%
          </Badge>
        )}
      </div>
    </div>
  )
}

function ComparisonRadarChart({ sessionA, sessionB }: { sessionA: SessionDetails; sessionB: SessionDetails }) {
  const data = [
    { metric: 'Quality', A: sessionA.metrics?.firstAttemptRate || 0, B: sessionB.metrics?.firstAttemptRate || 0 },
    { metric: 'Speed', A: Math.min(100, (sessionA.metrics?.linesPerMinute || 0) * 2), B: Math.min(100, (sessionB.metrics?.linesPerMinute || 0) * 2) },
    { metric: 'Stability', A: 100 - (sessionA.metrics?.errorRate || 0), B: 100 - (sessionB.metrics?.errorRate || 0) },
    { metric: 'Focus', A: 100 - (sessionA.metrics?.backtrackRate || 0), B: 100 - (sessionB.metrics?.backtrackRate || 0) },
    { metric: 'Success', A: sessionA.metrics?.commandSuccessRate || 0, B: sessionB.metrics?.commandSuccessRate || 0 },
  ]

  return (
    <ResponsiveContainer width="100%" height={250}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} />
        <Radar name="Session A" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
        <Radar name="Session B" dataKey="B" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
        <Legend />
      </RadarChart>
    </ResponsiveContainer>
  )
}

function ComparisonBarChart({ sessionA, sessionB }: { sessionA: SessionDetails; sessionB: SessionDetails }) {
  const data = [
    { name: 'Tokens', A: sessionA.summary.totalTokens / 1000, B: sessionB.summary.totalTokens / 1000 },
    { name: 'Issues', A: sessionA.summary.issuesCreated, B: sessionB.summary.issuesCreated },
    { name: 'Features', A: sessionA.summary.featuresImplemented, B: sessionB.summary.featuresImplemented },
    { name: 'Duration', A: sessionA.summary.duration / 60, B: sessionB.summary.duration / 60 },
  ]

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="A" fill="#3b82f6" name="Session A" />
        <Bar dataKey="B" fill="#10b981" name="Session B" />
      </BarChart>
    </ResponsiveContainer>
  )
}

function FileChangesDiff({ 
  filesA, 
  filesB 
}: { 
  filesA: { created: string[]; modified: string[]; deleted: string[] }
  filesB: { created: string[]; modified: string[]; deleted: string[] }
}) {
  // Ensure arrays exist with defaults
  const createdA = Array.isArray(filesA?.created) ? filesA.created : []
  const modifiedA = Array.isArray(filesA?.modified) ? filesA.modified : []
  const deletedA = Array.isArray(filesA?.deleted) ? filesA.deleted : []
  const createdB = Array.isArray(filesB?.created) ? filesB.created : []
  const modifiedB = Array.isArray(filesB?.modified) ? filesB.modified : []
  const deletedB = Array.isArray(filesB?.deleted) ? filesB.deleted : []

  const allFilesA = [...createdA, ...modifiedA, ...deletedA]
  const allFilesB = [...createdB, ...modifiedB, ...deletedB]
  
  const onlyInA = allFilesA.filter(f => !allFilesB.includes(f))
  const onlyInB = allFilesB.filter(f => !allFilesA.includes(f))
  const inBoth = allFilesA.filter(f => allFilesB.includes(f))

  return (
    <div className="grid grid-cols-3 gap-4">
      <div>
        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
          <Badge variant="outline">Session A only</Badge>
        </h4>
        <ScrollArea className="h-40">
          {onlyInA.length > 0 ? (
            <ul className="space-y-1">
              {onlyInA.map((file, i) => (
                <li key={i} className="text-xs p-2 rounded bg-muted truncate">
                  {file}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No unique files</p>
          )}
        </ScrollArea>
      </div>
      
      <div>
        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
          <Badge variant="secondary">In Both</Badge>
        </h4>
        <ScrollArea className="h-40">
          {inBoth.length > 0 ? (
            <ul className="space-y-1">
              {inBoth.map((file, i) => (
                <li key={i} className="text-xs p-2 rounded bg-muted/50 truncate">
                  {file}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No common files</p>
          )}
        </ScrollArea>
      </div>
      
      <div>
        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
          <Badge variant="default">Session B only</Badge>
        </h4>
        <ScrollArea className="h-40">
          {onlyInB.length > 0 ? (
            <ul className="space-y-1">
              {onlyInB.map((file, i) => (
                <li key={i} className="text-xs p-2 rounded bg-muted truncate">
                  {file}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No unique files</p>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}
