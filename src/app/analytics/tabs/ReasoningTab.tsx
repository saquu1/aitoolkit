'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Brain, AlertCircle, CheckCircle, GitBranch, TrendingUp, 
  Clock, Zap, AlertTriangle, ChevronRight, RefreshCw
} from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'

// Types
interface ErrorRecord {
  type: string
  message: string
  detectedAt: string
  resolvedAt?: string
  resolutionStrategy?: string
}

interface StrategyDecision {
  id: string
  type: 'approach' | 'tool_selection' | 'file_selection' | 'solution_design'
  description: string
  reasoning: string
  outcome: 'success' | 'partial' | 'failed'
  confidence: number
}

interface BacktrackRecord {
  id: string
  fromPath: string
  toPath: string
  reason: string
  stepsLost: number
  timestamp: string
}

interface ReasoningAnalysis {
  id: string
  blockId: string
  sessionId: string
  errors: ErrorRecord[]
  errorPatterns: string[]
  strategies: StrategyDecision[]
  backtracks: BacktrackRecord[]
  qualityMetrics: {
    coherenceScore: number
    decisionClarity: number
    errorRecoveryRate: number
    strategyEffectiveness: number
  }
  createdAt: string
}

interface SessionInfo {
  id: string
  title: string
  sessionDate: string
  model: string
}

export function ReasoningTab() {
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [analyses, setAnalyses] = useState<ReasoningAnalysis[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [summary, setSummary] = useState<any>(null)

  // Fetch sessions
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch('/api/analytics?action=sessions')
        const data = await res.json()
        if (data.success) {
          setSessions(data.sessions || [])
        }
      } catch (error) {
        console.error('Failed to fetch sessions:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSessions()
  }, [])

  // Analyze session
  const analyzeSession = useCallback(async (sessionId: string) => {
    setIsAnalyzing(true)
    try {
      const res = await fetch(`/api/analytics/blocks?action=reasoning-analysis&sessionId=${sessionId}`)
      const data = await res.json()
      if (data.success) {
        setAnalyses(data.analyses || [])
        setSummary(data.summary)
        setSelectedSession(sessionId)
      }
    } catch (error) {
      console.error('Failed to analyze session:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

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
              <Brain className="h-5 w-5" />
              Reasoning Block Analyzer
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Analyze AI reasoning patterns, detect errors, strategies, and backtracking
            </p>
          </CardHeader>
        </Card>

        {/* Session Selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select Session to Analyze</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {sessions.slice(0, 15).map((session) => (
                <Button
                  key={session.id}
                  variant={selectedSession === session.id ? 'default' : 'outline'}
                  size="sm"
                  className="justify-start text-left h-auto py-2"
                  onClick={() => analyzeSession(session.id)}
                  disabled={isAnalyzing}
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

        {/* Analysis Results */}
        {isAnalyzing && (
          <Card className="border-blue-500/50">
            <CardContent className="p-6 flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin mr-3" />
              <span>Analyzing reasoning blocks...</span>
            </CardContent>
          </Card>
        )}

        {summary && !isAnalyzing && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <Brain className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="mt-2">
                    <p className="text-2xl font-bold">{summary.totalAnalyses}</p>
                    <p className="text-xs text-muted-foreground">Reasoning Blocks</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  </div>
                  <div className="mt-2">
                    <p className="text-2xl font-bold">{summary.totalErrors}</p>
                    <p className="text-xs text-muted-foreground">Errors Detected</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <GitBranch className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="mt-2">
                    <p className="text-2xl font-bold">{summary.totalBacktracks}</p>
                    <p className="text-xs text-muted-foreground">Backtracks</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="mt-2">
                    <p className="text-2xl font-bold">{Math.round(summary.avgCoherence)}%</p>
                    <p className="text-xs text-muted-foreground">Avg Coherence</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quality Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Reasoning Quality Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <QualityMetric 
                  label="Coherence Score" 
                  value={summary.avgCoherence} 
                  description="How logically connected the reasoning is"
                />
                <QualityMetric 
                  label="Decision Clarity" 
                  value={summary.avgDecisionClarity} 
                  description="How clear and decisive the strategy choices are"
                />
                <QualityMetric 
                  label="Error Recovery Rate" 
                  value={summary.avgCoherence} 
                  description="How effectively errors are recovered from"
                  inverse
                />
                <QualityMetric 
                  label="Strategy Effectiveness" 
                  value={summary.avgDecisionClarity} 
                  description="Success rate of chosen strategies"
                />
              </CardContent>
            </Card>

            {/* Detailed Analysis */}
            {analyses.map((analysis, index) => (
              <Card key={analysis.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Block {index + 1}
                    </CardTitle>
                    <Badge variant="outline">
                      Quality: {analysis.qualityMetrics.coherenceScore}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Errors */}
                  {analysis.errors.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        Errors Detected ({analysis.errors.length})
                      </h4>
                      <div className="space-y-2">
                        {analysis.errors.map((error, i) => (
                          <div key={i} className="p-2 bg-red-500/10 rounded border border-red-500/20">
                            <div className="flex items-center justify-between">
                              <Badge variant="destructive" className="text-xs">
                                {error.type}
                              </Badge>
                              {error.resolvedAt && (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                            </div>
                            <p className="text-sm mt-1">{error.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Strategies */}
                  {analysis.strategies.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        Strategy Decisions ({analysis.strategies.length})
                      </h4>
                      <div className="space-y-2">
                        {analysis.strategies.map((strategy) => (
                          <div key={strategy.id} className="p-2 bg-blue-500/10 rounded border border-blue-500/20">
                            <div className="flex items-center justify-between">
                              <Badge variant="default" className="text-xs capitalize">
                                {strategy.type.replace('_', ' ')}
                              </Badge>
                              <div className="flex items-center gap-2">
                                <span className="text-xs">{Math.round(strategy.confidence * 100)}%</span>
                                {strategy.outcome === 'success' ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : strategy.outcome === 'partial' ? (
                                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-red-500" />
                                )}
                              </div>
                            </div>
                            <p className="text-sm mt-1">{strategy.description}</p>
                            {strategy.reasoning && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {strategy.reasoning}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Backtracks */}
                  {analysis.backtracks.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <GitBranch className="h-4 w-4 text-amber-500" />
                        Backtracking ({analysis.backtracks.length})
                      </h4>
                      <div className="space-y-2">
                        {analysis.backtracks.map((backtrack) => (
                          <div key={backtrack.id} className="p-2 bg-amber-500/10 rounded border border-amber-500/20">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">From:</span>
                              <span className="font-mono text-xs truncate flex-1">
                                {backtrack.fromPath || 'Previous approach'}
                              </span>
                              <ChevronRight className="h-4 w-4" />
                              <span className="font-mono text-xs truncate flex-1">
                                {backtrack.toPath}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <Badge variant="outline" className="text-xs">
                                {backtrack.reason}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {backtrack.stepsLost} step(s) lost
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Error Patterns */}
                  {analysis.errorPatterns.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Detected Patterns</h4>
                      <div className="flex flex-wrap gap-2">
                        {analysis.errorPatterns.map((pattern, i) => (
                          <Badge key={i} variant="secondary">
                            {pattern}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </>
        )}

        {/* Empty State */}
        {!selectedSession && !isAnalyzing && (
          <Card>
            <CardContent className="p-8 text-center">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Select a session to analyze reasoning blocks</p>
              <p className="text-xs text-muted-foreground mt-2">
                The analyzer will detect errors, strategies, and backtracking patterns
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  )
}

// Quality Metric Component
function QualityMetric({ 
  label, 
  value, 
  description,
  inverse = false 
}: { 
  label: string
  value: number
  description: string
  inverse?: boolean
}) {
  const getColor = (val: number) => {
    if (inverse) {
      return val >= 80 ? 'text-green-500' : val >= 50 ? 'text-amber-500' : 'text-red-500'
    }
    return val >= 80 ? 'text-green-500' : val >= 50 ? 'text-amber-500' : 'text-red-500'
  }

  const getProgressColor = (val: number) => {
    if (inverse) {
      return val >= 80 ? 'bg-green-500' : val >= 50 ? 'bg-amber-500' : 'bg-red-500'
    }
    return val >= 80 ? 'bg-green-500' : val >= 50 ? 'bg-amber-500' : 'bg-red-500'
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <span className={`text-lg font-bold ${getColor(value)}`}>
          {Math.round(value)}%
        </span>
      </div>
      <Progress value={value} className="h-2" />
    </div>
  )
}
