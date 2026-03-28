'use client'

/**
 * ERROR DETECTION PANEL
 * ======================
 * Phase 2: Enhanced Detection - Auto-detect errors from chat logs
 *
 * Features:
 * - Scan chat logs for error patterns
 * - Display detected errors with severity
 * - Show error patterns and solutions
 * - Log errors to registry
 */

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertCircle,
  AlertTriangle,
  Bug,
  CheckCircle2,
  Clock,
  RefreshCw,
  Scan,
  TrendingUp,
  XCircle,
  Zap,
  ChevronDown,
  ChevronUp,
  FileCode,
  Terminal,
  Database,
  Globe
} from 'lucide-react'
import { cn } from '@/lib/utils'

// =============================================================================
// TYPES
// =============================================================================

interface DetectedError {
  id: string
  errorType: string
  category: string
  severity: string
  message: string
  pattern: string
  sessionId: string
  sessionTitle?: string
  file?: string
  line?: number
  codeSnippet?: string
  solution?: string
  preventionTips?: string[]
  firstSeen: string
  lastSeen: string
  occurrenceCount: number
}

interface DetectionResult {
  totalScanned: number
  errorsDetected: number
  newErrors: number
  repeatedErrors: number
  errors: DetectedError[]
  byCategory: Record<string, number>
  bySeverity: Record<string, number>
}

interface ErrorDetectionPanelProps {
  className?: string
  onErrorsDetected?: (errors: DetectedError[]) => void
}

// =============================================================================
// SEVERITY CONFIG
// =============================================================================

const severityConfig = {
  LOW: {
    color: 'bg-blue-500/10 text-blue-600 border-blue-200',
    icon: AlertCircle,
    label: 'Low'
  },
  MEDIUM: {
    color: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
    icon: AlertTriangle,
    label: 'Medium'
  },
  HIGH: {
    color: 'bg-orange-500/10 text-orange-600 border-orange-200',
    icon: AlertTriangle,
    label: 'High'
  },
  CRITICAL: {
    color: 'bg-red-500/10 text-red-600 border-red-200',
    icon: XCircle,
    label: 'Critical'
  },
  FATAL: {
    color: 'bg-red-700/10 text-red-700 border-red-700',
    icon: XCircle,
    label: 'Fatal'
  }
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
  TYPE_MISMATCH: FileCode,
  ENUM_MISMATCH: FileCode,
  RUNTIME_ERROR: Terminal,
  NULL_REFERENCE: Bug,
  EXTERNAL_API: Globe
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ErrorDetectionPanel({ className, onErrorsDetected }: ErrorDetectionPanelProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [result, setResult] = useState<DetectionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedError, setExpandedError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'repeated'>('all')

  const handleScan = useCallback(async () => {
    setIsScanning(true)
    setError(null)

    try {
      const response = await fetch('/api/chat-logs/error-detection?action=scan&limit=100')
      const data = await response.json()

      if (data.success) {
        setResult(data.data)
        onErrorsDetected?.(data.data.errors)
      } else {
        setError(data.error || 'Failed to scan chat logs')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setIsScanning(false)
    }
  }, [onErrorsDetected])

  const handleLogToRegistry = useCallback(async () => {
    if (!result?.errors.length) return

    setIsScanning(true)
    try {
      const response = await fetch('/api/chat-logs/error-detection?action=log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errors: result.errors })
      })

      const data = await response.json()
      if (data.success) {
        // Show success feedback
        console.log('Logged errors:', data.data)
      } else {
        setError(data.error || 'Failed to log errors')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setIsScanning(false)
    }
  }, [result])

  const filteredErrors = result?.errors.filter(e => {
    if (activeTab === 'new') return e.occurrenceCount === 1
    if (activeTab === 'repeated') return e.occurrenceCount > 1
    return true
  }) || []

  const getSeverityIcon = (severity: string) => {
    const config = severityConfig[severity as keyof typeof severityConfig] || severityConfig.MEDIUM
    return config.icon
  }

  const getSeverityClass = (severity: string) => {
    return severityConfig[severity as keyof typeof severityConfig]?.color || severityConfig.MEDIUM.color
  }

  const getCategoryIcon = (category: string) => {
    return categoryIcons[category] || Bug
  }

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Scan className="h-5 w-5" />
              Error Detection
            </CardTitle>
            <CardDescription>
              Auto-detect errors from chat logs
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleScan}
              disabled={isScanning}
            >
              {isScanning ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Scan className="h-4 w-4 mr-2" />
              )}
              {isScanning ? 'Scanning...' : 'Scan'}
            </Button>
            {result && result.errors.length > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={handleLogToRegistry}
                disabled={isScanning}
              >
                <Zap className="h-4 w-4 mr-2" />
                Log to Registry
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="bg-red-500/10 text-red-600 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {result ? (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-2xl font-bold">{result.totalScanned}</div>
                <div className="text-xs text-muted-foreground">Scanned</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-red-600">{result.errorsDetected}</div>
                <div className="text-xs text-muted-foreground">Detected</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-orange-600">{result.newErrors}</div>
                <div className="text-xs text-muted-foreground">New</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-yellow-600">{result.repeatedErrors}</div>
                <div className="text-xs text-muted-foreground">Repeated</div>
              </div>
            </div>

            {/* Category/Severity Breakdown */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-2">By Category</h4>
                <div className="space-y-1">
                  {Object.entries(result.byCategory).map(([cat, count]) => {
                    const Icon = getCategoryIcon(cat)
                    return (
                      <div key={cat} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Icon className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{cat.replace(/_/g, ' ')}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">{count}</Badge>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">By Severity</h4>
                <div className="space-y-1">
                  {Object.entries(result.bySeverity).map(([sev, count]) => (
                    <div key={sev} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge className={cn('text-xs', getSeverityClass(sev))}>
                          {sev}
                        </Badge>
                      </div>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Error List */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All ({result.errors.length})</TabsTrigger>
                <TabsTrigger value="new">New ({result.newErrors})</TabsTrigger>
                <TabsTrigger value="repeated">Repeated ({result.repeatedErrors})</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-3">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {filteredErrors.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                        <p>No errors found</p>
                      </div>
                    ) : (
                      filteredErrors.map((err) => {
                        const isExpanded = expandedError === err.id
                        const SeverityIcon = getSeverityIcon(err.severity)
                        const CategoryIcon = getCategoryIcon(err.category)

                        return (
                          <div
                            key={err.id}
                            className="border rounded-lg p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => setExpandedError(isExpanded ? null : err.id)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2 flex-1">
                                <SeverityIcon className={cn('h-4 w-4 mt-0.5', {
                                  'text-blue-600': err.severity === 'LOW',
                                  'text-yellow-600': err.severity === 'MEDIUM',
                                  'text-orange-600': err.severity === 'HIGH',
                                  'text-red-600': err.severity === 'CRITICAL' || err.severity === 'FATAL'
                                })} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm truncate">
                                      {err.errorType}
                                    </span>
                                    <Badge className={cn('text-xs', getSeverityClass(err.severity))}>
                                      {err.severity}
                                    </Badge>
                                    {err.occurrenceCount > 1 && (
                                      <Badge variant="outline" className="text-xs">
                                        <TrendingUp className="h-3 w-3 mr-1" />
                                        {err.occurrenceCount}x
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {err.message}
                                  </p>
                                </div>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>

                            {isExpanded && (
                              <div className="mt-3 pt-3 border-t space-y-3">
                                {/* Session Info */}
                                <div className="text-xs">
                                  <span className="text-muted-foreground">Session: </span>
                                  <span className="font-mono">{err.sessionId}</span>
                                  {err.sessionTitle && (
                                    <span className="text-muted-foreground ml-2">
                                      ({err.sessionTitle})
                                    </span>
                                  )}
                                </div>

                                {/* Category */}
                                <div className="flex items-center gap-2 text-xs">
                                  <CategoryIcon className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-muted-foreground">Category:</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {err.category.replace(/_/g, ' ')}
                                  </Badge>
                                </div>

                                {/* Pattern */}
                                <div className="text-xs">
                                  <span className="text-muted-foreground">Pattern: </span>
                                  <code className="text-xs bg-muted px-1 rounded">
                                    {err.pattern.slice(0, 50)}...
                                  </code>
                                </div>

                                {/* Solution */}
                                {err.solution && (
                                  <div className="bg-green-500/5 border border-green-200 rounded p-2">
                                    <div className="text-xs font-medium text-green-700 mb-1">
                                      Solution
                                    </div>
                                    <p className="text-xs text-green-600">{err.solution}</p>
                                  </div>
                                )}

                                {/* Prevention Tips */}
                                {err.preventionTips && err.preventionTips.length > 0 && (
                                  <div>
                                    <div className="text-xs font-medium text-muted-foreground mb-1">
                                      Prevention Tips
                                    </div>
                                    <ul className="text-xs space-y-1">
                                      {err.preventionTips.map((tip, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                          <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5" />
                                          <span>{tip}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Timestamp */}
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    First: {new Date(err.firstSeen).toLocaleString()}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Last: {new Date(err.lastSeen).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="text-center text-muted-foreground py-12">
            <Scan className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Click "Scan" to detect errors from chat logs</p>
            <p className="text-xs mt-1">Errors will be analyzed and categorized automatically</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ErrorDetectionPanel
