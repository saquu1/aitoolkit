'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  AlertTriangle, FileCode, Lightbulb, DollarSign, CheckCircle2,
  XCircle, Clock, TrendingUp, AlertCircle, ChevronRight,
  RefreshCw, Sparkles, Target, Zap
} from 'lucide-react'

// =============================================================================
// TYPES
// =============================================================================

interface UnresolvedIssue {
  id: string
  title: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  issueType: string
  detectedAt: Date
  sessionTitle?: string
  affectedFiles: string[]
}

interface HighRiskFile {
  filePath: string
  riskScore: number
  editCount: number
  issueCount: number
  lastModified: Date
  reason: string
}

interface ActivePattern {
  id: string
  name: string
  description: string
  occurrences: number
  totalCost: number
  preventionTip: string
  severity: 'low' | 'medium' | 'high'
}

interface BudgetStatus {
  dailyBudget: number
  spentToday: number
  remaining: number
  weeklyBudget: number
  spentWeek: number
  projectedMonthly: number
  monthlyBudget: number
  percentUsed: number
}

interface ChecklistData {
  unresolvedIssues: UnresolvedIssue[]
  highRiskFiles: HighRiskFile[]
  activePatterns: ActivePattern[]
  budgetStatus: BudgetStatus
  recommendedFocus: string
  generatedAt: Date
  lastSessionDate?: Date
}

interface PreSessionChecklistProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm?: () => void
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PreSessionChecklist({ open, onOpenChange, onConfirm }: PreSessionChecklistProps) {
  const [data, setData] = useState<ChecklistData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showOnStart, setShowOnStart] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      fetchChecklist()
    }
  }, [open])

  const fetchChecklist = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/analytics/automation?action=pre-session-checklist')
      const result = await res.json()
      if (result.success) {
        setData(result.checklist)
      }
    } catch (error) {
      console.error('Failed to fetch checklist:', error)
      // Use demo data if API fails
      setData(getDemoData())
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirm = () => {
    // Save preference
    localStorage.setItem('showPreSessionChecklist', showOnStart.toString())
    onOpenChange(false)
    if (onConfirm) {
      onConfirm()
    }
    toast({
      title: 'Checklist acknowledged',
      description: 'You\'re ready to start your session!'
    })
  }

  const handleDismiss = () => {
    localStorage.setItem('showPreSessionChecklist', 'false')
    onOpenChange(false)
  }

  const getDemoData = (): ChecklistData => ({
    unresolvedIssues: [
      {
        id: 'issue-1',
        title: 'TypeScript error in types.ts',
        severity: 'high',
        issueType: 'typescript',
        detectedAt: new Date(Date.now() - 86400000),
        sessionTitle: 'API Route Refactoring',
        affectedFiles: ['/src/types/api.ts']
      },
      {
        id: 'issue-2',
        title: 'Missing page for /analytics',
        severity: 'medium',
        issueType: 'missing_route',
        detectedAt: new Date(Date.now() - 172800000),
        affectedFiles: ['/src/app/analytics/page.tsx']
      },
      {
        id: 'issue-3',
        title: 'Prisma relation mismatch in queries',
        severity: 'critical',
        issueType: 'prisma',
        detectedAt: new Date(Date.now() - 43200000),
        sessionTitle: 'Database Schema Update',
        affectedFiles: ['/src/lib/db/queries/tables.ts', '/src/lib/db/queries/procedures.ts']
      }
    ],
    highRiskFiles: [
      {
        filePath: 'src/app/api/schema/sync/route.ts',
        riskScore: 92,
        editCount: 15,
        issueCount: 3,
        lastModified: new Date(Date.now() - 3600000),
        reason: 'Most edited file this week, complex Prisma logic'
      },
      {
        filePath: 'src/middleware.ts',
        riskScore: 78,
        editCount: 12,
        issueCount: 2,
        lastModified: new Date(Date.now() - 7200000),
        reason: 'Auth logic is complex, affects all routes'
      },
      {
        filePath: 'prisma/schema.prisma',
        riskScore: 65,
        editCount: 8,
        issueCount: 1,
        lastModified: new Date(Date.now() - 86400000),
        reason: '3600+ lines, changes cascade to all models'
      },
      {
        filePath: 'src/app/api/projects/route.ts',
        riskScore: 58,
        editCount: 6,
        issueCount: 2,
        lastModified: new Date(Date.now() - 172800000),
        reason: 'Multiple nested queries, performance sensitive'
      }
    ],
    activePatterns: [
      {
        id: 'pat-001',
        name: 'Prisma Relation Name Mismatch',
        description: 'Using informal names instead of Prisma model names',
        occurrences: 5,
        totalCost: 8.50,
        preventionTip: 'Always use `satisfies Prisma.*Include` after include blocks',
        severity: 'high'
      },
      {
        id: 'pat-002',
        name: 'Route Not Found (404)',
        description: 'Creating pages before registering routes',
        occurrences: 3,
        totalCost: 4.20,
        preventionTip: 'Add route to registry before creating page',
        severity: 'medium'
      },
      {
        id: 'pat-003',
        name: 'Missing Error Handler',
        description: 'API routes without try-catch blocks',
        occurrences: 4,
        totalCost: 3.80,
        preventionTip: 'Use handleApiError wrapper for all API routes',
        severity: 'low'
      }
    ],
    budgetStatus: {
      dailyBudget: 5.00,
      spentToday: 0.00,
      remaining: 5.00,
      weeklyBudget: 25.00,
      spentWeek: 12.50,
      projectedMonthly: 52.00,
      monthlyBudget: 100.00,
      percentUsed: 52
    },
    recommendedFocus: 'Fix the critical Prisma relation issue before adding new features. This has caused 5 repeat issues costing $8.50.',
    generatedAt: new Date(),
    lastSessionDate: new Date(Date.now() - 86400000)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">Pre-Session Checklist</DialogTitle>
                <DialogDescription>
                  Generated: {new Date().toLocaleString()}
                </DialogDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchChecklist} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(90vh-180px)]">
          <div className="p-6 pt-4 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : data ? (
              <>
                {/* Unresolved Issues */}
                <Card className={data.unresolvedIssues.length > 0 ? 'border-destructive/50' : ''}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className={`h-5 w-5 ${data.unresolvedIssues.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
                      Unresolved Issues
                      {data.unresolvedIssues.length > 0 && (
                        <Badge variant="destructive">{data.unresolvedIssues.length}</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.unresolvedIssues.length === 0 ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span>All clear! No unresolved issues.</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {data.unresolvedIssues.map((issue) => (
                          <div
                            key={issue.id}
                            className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
                          >
                            <div className="mt-0.5">
                              {issue.severity === 'critical' ? (
                                <XCircle className="h-5 w-5 text-destructive" />
                              ) : issue.severity === 'high' ? (
                                <AlertTriangle className="h-5 w-5 text-orange-500" />
                              ) : (
                                <AlertCircle className="h-5 w-5 text-yellow-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">{issue.title}</span>
                                <Badge variant={
                                  issue.severity === 'critical' ? 'destructive' :
                                  issue.severity === 'high' ? 'default' : 'secondary'
                                } className="text-xs capitalize">
                                  {issue.severity}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {issue.issueType}
                                </Badge>
                              </div>
                              {issue.affectedFiles.length > 0 && (
                                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                  <FileCode className="h-3 w-3" />
                                  <span className="truncate">{issue.affectedFiles[0]}</span>
                                  {issue.affectedFiles.length > 1 && (
                                    <span>+{issue.affectedFiles.length - 1} more</span>
                                  )}
                                </div>
                              )}
                              <div className="mt-1 text-xs text-muted-foreground">
                                Detected: {new Date(issue.detectedAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* High-Risk Files */}
                <Card className={data.highRiskFiles.some(f => f.riskScore >= 80) ? 'border-orange-500/50' : ''}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileCode className="h-5 w-5 text-orange-500" />
                      High-Risk Files
                      <Badge variant="outline">{data.highRiskFiles.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      These files are frequently modified and prone to issues. Handle with care.
                    </p>
                    <div className="space-y-2">
                      {data.highRiskFiles.map((file) => (
                        <div
                          key={file.filePath}
                          className="flex items-center gap-3 p-3 rounded-lg border"
                        >
                          <div className="text-center min-w-[50px]">
                            <div className={`text-lg font-bold ${
                              file.riskScore >= 80 ? 'text-destructive' :
                              file.riskScore >= 60 ? 'text-orange-500' :
                              'text-yellow-500'
                            }`}>
                              {file.riskScore}
                            </div>
                            <div className="text-xs text-muted-foreground">Risk</div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{file.filePath}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {file.reason}
                            </div>
                            <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                              <span>{file.editCount} edits</span>
                              <span>{file.issueCount} issues</span>
                            </div>
                          </div>
                          <Progress
                            value={file.riskScore}
                            className="w-16 h-2"
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Active Patterns */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-yellow-500" />
                      Active Patterns to Avoid
                      <Badge variant="secondary">{data.activePatterns.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {data.activePatterns.map((pattern) => (
                        <div
                          key={pattern.id}
                          className="p-3 rounded-lg border"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{pattern.name}</span>
                                <Badge variant={
                                  pattern.severity === 'high' ? 'destructive' :
                                  pattern.severity === 'medium' ? 'default' : 'secondary'
                                } className="text-xs">
                                  {pattern.severity}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {pattern.description}
                              </p>
                            </div>
                            <div className="text-right text-xs text-muted-foreground">
                              <div>{pattern.occurrences} occurrences</div>
                              <div className="text-destructive font-medium">
                                ${pattern.totalCost.toFixed(2)} cost
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 p-2 rounded bg-green-500/10 text-green-700 dark:text-green-400 text-xs">
                            <span className="font-medium">💡 Prevention:</span> {pattern.preventionTip}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Budget Status */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-500" />
                      Budget Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center p-3 rounded-lg border">
                        <div className="text-2xl font-bold">${data.budgetStatus.remaining.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">Today's Remaining</div>
                        <Progress
                          value={(data.budgetStatus.remaining / data.budgetStatus.dailyBudget) * 100}
                          className="mt-2 h-1.5"
                        />
                      </div>
                      <div className="text-center p-3 rounded-lg border">
                        <div className="text-2xl font-bold">${data.budgetStatus.spentToday.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">Spent Today</div>
                        <div className="text-xs text-muted-foreground mt-2">
                          of ${data.budgetStatus.dailyBudget.toFixed(2)} budget
                        </div>
                      </div>
                      <div className="text-center p-3 rounded-lg border">
                        <div className="text-2xl font-bold">${(data.budgetStatus.weeklyBudget - data.budgetStatus.spentWeek).toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">Week Remaining</div>
                        <div className="text-xs text-muted-foreground mt-2">
                          ${data.budgetStatus.spentWeek.toFixed(2)} spent
                        </div>
                      </div>
                      <div className="text-center p-3 rounded-lg border">
                        <div className="text-2xl font-bold">{100 - data.budgetStatus.percentUsed}%</div>
                        <div className="text-xs text-muted-foreground">Monthly Left</div>
                        <Progress
                          value={100 - data.budgetStatus.percentUsed}
                          className="mt-2 h-1.5"
                        />
                      </div>
                    </div>

                    {data.budgetStatus.remaining < data.budgetStatus.dailyBudget * 0.2 && (
                      <div className="mt-3 p-3 rounded-lg bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 text-sm">
                        <AlertTriangle className="h-4 w-4 inline mr-2" />
                        Warning: Less than 20% of today's budget remaining.
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recommended Focus */}
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/20">
                        <Sparkles className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          Recommended Focus
                          <Badge variant="default" className="text-xs">
                            <Zap className="h-3 w-3 mr-1" />
                            AI Suggested
                          </Badge>
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {data.recommendedFocus}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 pt-0 border-t bg-muted/30">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Switch
                id="show-on-start"
                checked={showOnStart}
                onCheckedChange={setShowOnStart}
              />
              <Label htmlFor="show-on-start" className="text-sm text-muted-foreground">
                Show on session start
              </Label>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleDismiss}>
                Don't show again
              </Button>
              <Button onClick={handleConfirm} className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Start Session
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =============================================================================
// FLOATING BUTTON COMPONENT (for triggering the checklist)
// =============================================================================

interface ChecklistButtonProps {
  onClick: () => void
}

export function PreSessionChecklistButton({ onClick }: ChecklistButtonProps) {
  const [hasUnresolvedIssues, setHasUnresolvedIssues] = useState(false)

  useEffect(() => {
    // Check if there are unresolved issues
    fetch('/api/analytics/automation?action=pre-session-checklist')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.checklist?.unresolvedIssues?.length > 0) {
          setHasUnresolvedIssues(true)
        }
      })
      .catch(() => {})
  }, [])

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className={hasUnresolvedIssues ? 'border-destructive/50 bg-destructive/10' : ''}
    >
      <Target className="h-4 w-4 mr-2" />
      Pre-Session Checklist
      {hasUnresolvedIssues && (
        <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
          !
        </Badge>
      )}
    </Button>
  )
}
