/**
 * ERROR PATTERN DASHBOARD TAB
 * ===========================
 * Centralized error pattern management with analysis and shortcut solutions.
 * Displays patterns detected from the Error Monitor with actionable fixes.
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertTriangle,
  Target,
  RefreshCw,
  Shield,
  Zap,
  Bug,
  TrendingUp,
  Clock,
  Search,
  Filter,
  ChevronDown,
  Lightbulb,
  Wrench,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  Server,
  Wifi,
  Lock,
  Layers,
  FileWarning,
  Brain,
  Trash2,
  Send,
  Play,
  Copy,
  Settings,
  BarChart3,
  Activity,
  Sparkles,
  Wand2,
  Save,
  Code,
  CheckSquare,
} from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { useProjectScopeContext } from '@/contexts/ProjectScopeContext'

// =============================================================================
// TYPES
// =============================================================================

interface ErrorPattern {
  id: string
  patternKey: string
  patternName: string
  errorType: string
  endpoint: string
  httpStatus: number
  description: string
  occurrenceCount: number
  severity: 'critical' | 'error' | 'warning' | 'info'
  rootCause?: string
  preventionStrategy?: string
  autoFixSolution?: string
  firstOccurrence: string
  lastOccurrence: string
  patternStatus: 'ACTIVE' | 'MONITORING' | 'RESOLVED' | 'IGNORED'
}

interface PatternStats {
  totalPatterns: number
  criticalCount: number
  errorCount: number
  warningCount: number
  infoCount: number
  totalOccurrences: number
  resolvedPatterns: number
}

interface ShortcutSolution {
  id: string
  name: string
  description: string
  action: () => Promise<void>
  icon: any
  category: 'retry' | 'auth' | 'cache' | 'config' | 'custom'
}

interface AIResolution {
  analysis: string
  rootCause: string
  solution: string
  preventionStrategy: string
  codeFix?: string
  fixedCode?: string
  steps: string[]
  confidence: number
  relatedPatterns: string[]
  savedSolutionId?: string
  autoFixApplied?: boolean
  filePath?: string
  testResult?: { passed: boolean; message: string }
  fixApplied?: boolean
}

// =============================================================================
// SHORTCUT SOLUTIONS - Quick fixes for common errors
// =============================================================================

const SHORTCUT_SOLUTIONS: Record<string, ShortcutSolution[]> = {
  'AUTH_ERROR': [
    {
      id: 'refresh-session',
      name: 'Refresh Session',
      description: 'Clear local session and reload page',
      icon: RefreshCw,
      category: 'auth',
      action: async () => {
        localStorage.clear()
        sessionStorage.clear()
        window.location.reload()
      }
    },
    {
      id: 'clear-tokens',
      name: 'Clear Tokens',
      description: 'Remove all auth tokens from storage',
      icon: Lock,
      category: 'auth',
      action: async () => {
        localStorage.removeItem('token')
        localStorage.removeItem('auth-token')
        localStorage.removeItem('session')
      }
    }
  ],
  'NETWORK_ERROR': [
    {
      id: 'retry-request',
      name: 'Retry Request',
      description: 'Retry the failed request',
      icon: RefreshCw,
      category: 'retry',
      action: async () => {
        // Will be overridden with actual endpoint
        console.log('Retrying request...')
      }
    },
    {
      id: 'clear-cache',
      name: 'Clear Cache',
      description: 'Clear browser cache and reload',
      icon: Trash2,
      category: 'cache',
      action: async () => {
        if ('caches' in window) {
          const cacheNames = await caches.keys()
          await Promise.all(cacheNames.map(name => caches.delete(name)))
        }
      }
    }
  ],
  'SERVER_FAILURE': [
    {
      id: 'check-health',
      name: 'Check Server Health',
      description: 'Ping server health endpoint',
      icon: Activity,
      category: 'config',
      action: async () => {
        const res = await fetch('/api/health')
        const data = await res.json()
        console.log('Health check:', data)
        alert(`Server status: ${data.status}`)
      }
    },
    {
      id: 'clear-error-log',
      name: 'Clear Error Log',
      description: 'Clear all logged errors',
      icon: Trash2,
      category: 'cache',
      action: async () => {
        await fetch('/api/error-log?action=clear-all', { method: 'DELETE' })
      }
    }
  ],
  'VALIDATION_ERROR': [
    {
      id: 'reset-form',
      name: 'Reset Form',
      description: 'Clear form data and start fresh',
      icon: RefreshCw,
      category: 'cache',
      action: async () => {
        // Reset form logic
        console.log('Form reset')
      }
    }
  ],
  'BUSINESS_LOGIC': [
    {
      id: 'force-refresh',
      name: 'Force Refresh Data',
      description: 'Bypass cache and fetch fresh data',
      icon: RefreshCw,
      category: 'cache',
      action: async () => {
        window.location.reload()
      }
    }
  ]
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface ErrorPatternDashboardTabProps {
  onNavigate?: (tab: string) => void
}

export function ErrorPatternDashboardTab({ onNavigate }: ErrorPatternDashboardTabProps) {
  const { colors } = useTheme()
  const { 
    scope, 
    isGlobalScope, 
    isIsolated, 
    includeGlobal 
  } = useProjectScopeContext()
  
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [patterns, setPatterns] = useState<ErrorPattern[]>([])
  const [filteredPatterns, setFilteredPatterns] = useState<ErrorPattern[]>([])
  const [stats, setStats] = useState<PatternStats | null>(null)
  const [selectedPattern, setSelectedPattern] = useState<ErrorPattern | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [executingSolution, setExecutingSolution] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('patterns')

  // AI Resolution states
  const [aiResolution, setAiResolution] = useState<AIResolution | null>(null)
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [aiApplying, setAiApplying] = useState(false)
  const [showAiDialog, setShowAiDialog] = useState(false)

  const alpha = (color: string, opacity: number) =>
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  // Build scope parameters for API calls
  const getScopeParams = useCallback(() => {
    const params: Record<string, string> = {}
    
    if (scope.type === 'project' && scope.activeProjectId) {
      params.projectId = scope.activeProjectId
      params.scopeType = 'project'
    } else if (scope.type === 'multi' && scope.selectedProjectIds.length > 0) {
      params.projectIds = JSON.stringify(scope.selectedProjectIds)
      params.scopeType = 'multi'
    } else {
      params.scopeType = 'all'
    }
    
    if (isIsolated) {
      params.isIsolated = 'true'
    }
    if (includeGlobal) {
      params.includeGlobal = 'true'
    }
    
    return params
  }, [scope, isIsolated, includeGlobal])

  useEffect(() => {
    fetchPatterns()
  }, [scope.type, scope.activeProjectId])

  useEffect(() => {
    filterPatterns()
  }, [patterns, searchQuery, severityFilter, typeFilter])

  const fetchPatterns = async () => {
    setRefreshing(true)
    try {
      const scopeParams = getScopeParams()
      const queryParams = new URLSearchParams({
        action: 'list',
        ...scopeParams
      })
      
      // Use scope-aware endpoint
      const response = await fetch(`/api/error-patterns/scope?${queryParams}`)
      const data = await response.json()

      if (data.success) {
        setPatterns(data.patterns || [])
        setStats(data.stats || null)
      } else {
        // Fallback to empty if API fails
        setPatterns([])
        setStats({
          totalPatterns: 0,
          criticalCount: 0,
          errorCount: 0,
          warningCount: 0,
          infoCount: 0,
          totalOccurrences: 0,
          resolvedPatterns: 0,
        })
      }
    } catch (error) {
      console.error('Failed to fetch error patterns:', error)
      setPatterns([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const filterPatterns = () => {
    let filtered = [...patterns]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.patternName.toLowerCase().includes(query) ||
          p.endpoint.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.errorType.toLowerCase().includes(query)
      )
    }

    if (severityFilter !== 'all') {
      filtered = filtered.filter((p) => p.severity === severityFilter)
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter((p) => p.errorType === typeFilter)
    }

    setFilteredPatterns(filtered)
  }

  const handleResolvePattern = async (patternId: string) => {
    try {
      await fetch('/api/error-patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve', patternId }),
      })
      await fetchPatterns()
      setSelectedPattern(null)
    } catch (error) {
      console.error('Failed to resolve pattern:', error)
    }
  }

  const handleIgnorePattern = async (patternId: string) => {
    try {
      await fetch('/api/error-patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ignore', patternId }),
      })
      await fetchPatterns()
      setSelectedPattern(null)
    } catch (error) {
      console.error('Failed to ignore pattern:', error)
    }
  }

  const executeShortcutSolution = async (solution: ShortcutSolution, pattern: ErrorPattern) => {
    setExecutingSolution(solution.id)
    try {
      await solution.action()
      // Show success feedback
      console.log(`Solution "${solution.name}" executed for pattern ${pattern.patternName}`)
    } catch (error) {
      console.error('Failed to execute solution:', error)
    } finally {
      setExecutingSolution(null)
    }
  }

  const copySolutionCode = (pattern: ErrorPattern) => {
    const code = `// Fix for: ${pattern.patternName}
// Root Cause: ${pattern.rootCause || 'Unknown'}
// Prevention: ${pattern.preventionStrategy || 'N/A'}

// Auto-Fix Solution:
${pattern.autoFixSolution || '// No auto-fix solution available'}

// Pattern Details:
// - Endpoint: ${pattern.endpoint}
// - HTTP Status: ${pattern.httpStatus}
// - Type: ${pattern.errorType}
// - Occurrences: ${pattern.occurrenceCount}`

    navigator.clipboard.writeText(code)
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4" style={{ color: colors.error || '#ef4444' }} />
      case 'error': return <AlertCircle className="h-4 w-4" style={{ color: '#f97316' }} />
      case 'warning': return <AlertTriangle className="h-4 w-4" style={{ color: colors.warning }} />
      default: return <Info className="h-4 w-4" style={{ color: colors.primary }} />
    }
  }

  const getSeverityBadge = (severity: string) => {
    const colorMap: Record<string, string> = {
      critical: colors.error || '#ef4444',
      error: '#f97316',
      warning: colors.warning,
      info: colors.primary,
    }
    return (
      <Badge style={{ backgroundColor: alpha(colorMap[severity] || colors.primary, 20), color: colorMap[severity] || colors.primary }}>
        {severity}
      </Badge>
    )
  }

  const getErrorTypeIcon = (type: string) => {
    switch (type) {
      case 'SERVER_FAILURE': return <Server className="h-4 w-4" style={{ color: colors.error || '#ef4444' }} />
      case 'NETWORK_ERROR': return <Wifi className="h-4 w-4" style={{ color: colors.warning }} />
      case 'AUTH_ERROR': return <Lock className="h-4 w-4" style={{ color: colors.accent }} />
      case 'VALIDATION_ERROR': return <FileWarning className="h-4 w-4" style={{ color: colors.warning }} />
      case 'BUSINESS_LOGIC': return <Brain className="h-4 w-4" style={{ color: colors.primary }} />
      default: return <Bug className="h-4 w-4" style={{ color: colors.textMuted }} />
    }
  }

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      ACTIVE: colors.error || '#ef4444',
      MONITORING: colors.warning,
      RESOLVED: colors.success,
      IGNORED: colors.textMuted,
    }
    return (
      <Badge style={{ backgroundColor: alpha(statusColors[status] || colors.textMuted, 20), color: statusColors[status] || colors.textMuted }}>
        {status}
      </Badge>
    )
  }

  const getShortcutSolutions = (pattern: ErrorPattern): ShortcutSolution[] => {
    return SHORTCUT_SOLUTIONS[pattern.errorType] || []
  }

  // AI Error Resolution
  const handleAIResolution = async (pattern: ErrorPattern) => {
    setAiAnalyzing(true)
    setShowAiDialog(true)
    setAiResolution(null)

    try {
      // First check for saved solutions
      const savedResponse = await fetch(`/api/saved-solutions?action=match&errorType=${pattern.errorType}&httpStatus=${pattern.httpStatus}&endpoint=${pattern.endpoint}`)
      const savedData = await savedResponse.json()
      
      if (savedData.found && savedData.solution) {
        // Use saved solution
        setAiResolution({
          analysis: `Found a saved solution with ${savedData.solution.successRate}% success rate (used ${savedData.solution.usageCount} times)`,
          rootCause: 'Previously identified and resolved',
          solution: savedData.solution.solution,
          preventionStrategy: 'Solution has been tested and verified',
          codeFix: savedData.solution.codeFix,
          steps: ['Apply the saved solution', 'Verify the fix works', 'Report success or failure'],
          confidence: savedData.solution.confidence / 100,
          relatedPatterns: [],
          savedSolutionId: savedData.solution.id,
        })
        setAiAnalyzing(false)
        return
      }
      
      // No saved solution, use AI to analyze
      const response = await fetch('/api/error-patterns/ai-resolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze',
          pattern: {
            id: pattern.id,
            patternKey: pattern.patternKey,
            patternName: pattern.patternName,
            errorType: pattern.errorType,
            endpoint: pattern.endpoint,
            httpStatus: pattern.httpStatus,
            description: pattern.description,
            occurrenceCount: pattern.occurrenceCount,
            severity: pattern.severity,
            rootCause: pattern.rootCause,
          },
        }),
      })

      const data = await response.json()

      if (data.success && data.result) {
        setAiResolution({
          analysis: data.result.analysis,
          rootCause: data.result.rootCause,
          solution: data.result.solution,
          preventionStrategy: data.result.preventionStrategy,
          codeFix: data.result.codeFix?.fixedCode,
          steps: [],
          confidence: data.result.confidence / 100,
          relatedPatterns: [],
        })
      } else {
        setAiResolution({
          analysis: 'Failed to analyze error pattern',
          rootCause: 'Unable to determine root cause',
          solution: 'Please try again or manually investigate',
          preventionStrategy: 'Add proper error handling',
          steps: ['Check server logs', 'Review code', 'Implement fix'],
          confidence: 0,
          relatedPatterns: [],
        })
      }
    } catch (error) {
      console.error('AI resolution failed:', error)
      setAiResolution({
        analysis: 'Failed to connect to AI service',
        rootCause: 'Connection error',
        solution: 'Please try again later',
        preventionStrategy: 'Check network connectivity',
        steps: ['Retry', 'Check connection'],
        confidence: 0,
        relatedPatterns: [],
      })
    } finally {
      setAiAnalyzing(false)
    }
  }

  // Apply AI Fix with full resolution flow
  const applyAIFix = async () => {
    if (!selectedPattern) return

    setAiApplying(true)

    try {
      // If we have a saved solution, just apply it
      if (aiResolution?.savedSolutionId) {
        const applyResponse = await fetch('/api/saved-solutions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'apply',
            solutionId: aiResolution.savedSolutionId,
          }),
        })
        
        if (applyResponse.ok) {
          // Mark pattern as resolved
          await fetch('/api/error-patterns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'resolve',
              patternId: selectedPattern.id,
            }),
          })
          
          await fetchPatterns()
          setShowAiDialog(false)
          setSelectedPattern(null)
          setAiResolution(null)
        }
        setAiApplying(false)
        return
      }
      
      // Full AI resolution flow
      const response = await fetch('/api/error-patterns/ai-resolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'full_resolution',
          pattern: {
            id: selectedPattern.id,
            patternKey: selectedPattern.patternKey,
            patternName: selectedPattern.patternName,
            errorType: selectedPattern.errorType,
            endpoint: selectedPattern.endpoint,
            httpStatus: selectedPattern.httpStatus,
            description: selectedPattern.description,
            occurrenceCount: selectedPattern.occurrenceCount,
            severity: selectedPattern.severity,
            rootCause: selectedPattern.rootCause,
          },
        }),
      })

      const data = await response.json()

      if (data.success && data.result) {
        // Update the resolution with the fix result
        setAiResolution(prev => prev ? {
          ...prev,
          codeFix: data.result.codeFix?.fixedCode,
          testResult: data.result.testResult,
          fixApplied: data.result.codeFix?.applied,
        } : null)
        
        // If fix was successful, save the solution
        if (data.result.success) {
          await fetch('/api/saved-solutions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'create',
              data: {
                errorType: selectedPattern.errorType,
                httpStatus: selectedPattern.httpStatus,
                errorPattern: selectedPattern.patternKey,
                solution: data.result.solution,
                codeFix: data.result.codeFix?.fixedCode,
                confidence: data.result.confidence,
              },
            }),
          })
          
          // Refresh patterns
          await fetchPatterns()
        }
      }
    } catch (error) {
      console.error('Failed to apply AI fix:', error)
    } finally {
      setAiApplying(false)
    }
  }

  // Save current solution
  const saveCurrentSolution = async () => {
    if (!selectedPattern || !aiResolution) return
    
    try {
      await fetch('/api/saved-solutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          data: {
            errorType: selectedPattern.errorType,
            httpStatus: selectedPattern.httpStatus,
            errorPattern: selectedPattern.patternKey,
            solution: aiResolution.solution,
            codeFix: aiResolution.codeFix,
            confidence: aiResolution.confidence * 100,
          },
        }),
      })
    } catch (error) {
      console.error('Failed to save solution:', error)
    }
  }
  
  // Report solution success/failure
  const reportSolutionResult = async (success: boolean) => {
    if (!aiResolution?.savedSolutionId) return
    
    try {
      await fetch('/api/saved-solutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: success ? 'report-success' : 'report-failure',
          solutionId: aiResolution.savedSolutionId,
        }),
      })
    } catch (error) {
      console.error('Failed to report solution result:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
        <span className="ml-3" style={{ color: colors.textMuted }}>Loading error patterns...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Scope Info Banner */}
      {isGlobalScope && (
        <Alert className="mb-4">
          <Layers className="h-4 w-4" />
          <AlertTitle>Global Scope Active</AlertTitle>
          <AlertDescription>
            Viewing error patterns across all projects. Data is aggregated from all projects and global patterns.
          </AlertDescription>
        </Alert>
      )}
      
      {!isGlobalScope && scope.type === 'multi' && (
        <Alert className="mb-4">
          <Layers className="h-4 w-4" />
          <AlertTitle>Multi-Project Scope</AlertTitle>
          <AlertDescription>
            Comparing error patterns across {scope.selectedProjectIds.length} selected projects.
          </AlertDescription>
        </Alert>
      )}
      
      {!isGlobalScope && isIsolated && (
        <Alert className="mb-4" variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertTitle>Isolated Mode</AlertTitle>
          <AlertDescription>
            This project is isolated. Only project-specific error patterns are visible.
          </AlertDescription>
        </Alert>
      )}
      
      {!isGlobalScope && !isIsolated && includeGlobal && (
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertTitle>Including Global Patterns</AlertTitle>
          <AlertDescription>
            Inheriting global error patterns in addition to project-specific patterns.
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: colors.text }}>
            <Bug className="w-6 h-6" style={{ color: colors.error || '#ef4444' }} />
            Error Pattern Dashboard
          </h2>
          <p className="mt-1" style={{ color: colors.textMuted }}>
            Analyze errors, detect patterns, and apply shortcut solutions
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPatterns} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs" style={{ color: colors.textMuted }}>Total Patterns</p>
                  <p className="text-xl font-bold" style={{ color: colors.text }}>{stats.totalPatterns}</p>
                </div>
                <Target className="w-5 h-5 opacity-50" style={{ color: colors.accent }} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs" style={{ color: colors.textMuted }}>Critical</p>
                  <p className="text-xl font-bold" style={{ color: colors.error || '#ef4444' }}>{stats.criticalCount}</p>
                </div>
                <XCircle className="w-5 h-5 opacity-50" style={{ color: colors.error || '#ef4444' }} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs" style={{ color: colors.textMuted }}>Errors</p>
                  <p className="text-xl font-bold" style={{ color: '#f97316' }}>{stats.errorCount}</p>
                </div>
                <AlertCircle className="w-5 h-5 opacity-50" style={{ color: '#f97316' }} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs" style={{ color: colors.textMuted }}>Warnings</p>
                  <p className="text-xl font-bold" style={{ color: colors.warning }}>{stats.warningCount}</p>
                </div>
                <AlertTriangle className="w-5 h-5 opacity-50" style={{ color: colors.warning }} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs" style={{ color: colors.textMuted }}>Info</p>
                  <p className="text-xl font-bold" style={{ color: colors.primary }}>{stats.infoCount}</p>
                </div>
                <Info className="w-5 h-5 opacity-50" style={{ color: colors.primary }} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs" style={{ color: colors.textMuted }}>Occurrences</p>
                  <p className="text-xl font-bold" style={{ color: colors.text }}>{stats.totalOccurrences}</p>
                </div>
                <RefreshCw className="w-5 h-5 opacity-50" style={{ color: colors.warning }} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs" style={{ color: colors.textMuted }}>Resolved</p>
                  <p className="text-xl font-bold" style={{ color: colors.success }}>{stats.resolvedPatterns}</p>
                </div>
                <CheckCircle2 className="w-5 h-5 opacity-50" style={{ color: colors.success }} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs" style={{ color: colors.textMuted }}>Active Rate</p>
                  <p className="text-xl font-bold" style={{ color: colors.text }}>
                    {stats.totalPatterns > 0
                      ? Math.round(((stats.totalPatterns - stats.resolvedPatterns) / stats.totalPatterns) * 100)
                      : 0}%
                  </p>
                </div>
                <TrendingUp className="w-5 h-5 opacity-50" style={{ color: colors.accent }} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Critical Alert */}
      {stats && stats.criticalCount > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Critical Error Patterns Detected</AlertTitle>
          <AlertDescription>
            {stats.criticalCount} critical pattern(s) require immediate attention. Click on a pattern to see solutions.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="patterns">
            <Bug className="w-4 h-4 mr-2" />
            Patterns ({filteredPatterns.length})
          </TabsTrigger>
          <TabsTrigger value="solutions">
            <Sparkles className="w-4 h-4 mr-2" />
            Quick Solutions
          </TabsTrigger>
          <TabsTrigger value="analysis">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analysis
          </TabsTrigger>
        </TabsList>

        {/* Patterns Tab */}
        <TabsContent value="patterns" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bug className="h-5 w-5" />
                  Error Patterns
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4" style={{ color: colors.textMuted }} />
                    <Input
                      placeholder="Search patterns..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 w-64"
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Filter className="h-4 w-4 mr-2" />
                        Severity
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setSeverityFilter('all')}>All Severities</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSeverityFilter('critical')}>Critical</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSeverityFilter('error')}>Error</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSeverityFilter('warning')}>Warning</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSeverityFilter('info')}>Info</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {filteredPatterns.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8" style={{ color: colors.textMuted }}>
                    <Shield className="h-12 w-12 mb-2 opacity-50" />
                    <p>No error patterns detected</p>
                    <p className="text-xs mt-1">Patterns will appear here after errors are logged 3+ times</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pattern</TableHead>
                        <TableHead className="w-24">Type</TableHead>
                        <TableHead className="w-20">Status</TableHead>
                        <TableHead className="w-20">Severity</TableHead>
                        <TableHead className="w-24">Occurrences</TableHead>
                        <TableHead className="w-32">Last Seen</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPatterns.map((pattern) => (
                        <TableRow
                          key={pattern.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedPattern(pattern)}
                        >
                          <TableCell>
                            <div className="flex items-start gap-2">
                              {getErrorTypeIcon(pattern.errorType)}
                              <div>
                                <p className="font-medium text-sm" style={{ color: colors.text }}>{pattern.patternName}</p>
                                <p className="text-xs" style={{ color: colors.textMuted }}>
                                  {pattern.endpoint} • HTTP {pattern.httpStatus}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {pattern.errorType.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(pattern.patternStatus)}</TableCell>
                          <TableCell>{getSeverityBadge(pattern.severity)}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                pattern.occurrenceCount >= 10
                                  ? 'bg-red-100 text-red-800'
                                  : pattern.occurrenceCount >= 5
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : ''
                              }
                            >
                              {pattern.occurrenceCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs" style={{ color: colors.textMuted }}>
                            {new Date(pattern.lastOccurrence).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedPattern(pattern) }}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleAIResolution(pattern) }}
                                style={{ color: colors.primary }}
                                title="AI Error Resolution"
                              >
                                <Wand2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quick Solutions Tab */}
        <TabsContent value="solutions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" style={{ color: colors.primary }} />
                Quick Fix Solutions
              </CardTitle>
              <CardDescription>
                One-click solutions for common error patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(SHORTCUT_SOLUTIONS).map(([errorType, solutions]) => (
                  <Card key={errorType} style={{ borderColor: alpha(colors.border, 50) }}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        {getErrorTypeIcon(errorType)}
                        <CardTitle className="text-sm">{errorType.replace('_', ' ')}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {solutions.map((solution) => (
                        <Button
                          key={solution.id}
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => solution.action()}
                        >
                          <solution.icon className="w-4 h-4 mr-2" />
                          {solution.name}
                        </Button>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Error Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span style={{ color: colors.textMuted }}>Critical</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 rounded-full bg-gray-200">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${stats.totalPatterns > 0 ? (stats.criticalCount / stats.totalPatterns) * 100 : 0}%`,
                              backgroundColor: colors.error || '#ef4444'
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium">{stats.criticalCount}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span style={{ color: colors.textMuted }}>Error</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 rounded-full bg-gray-200">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${stats.totalPatterns > 0 ? (stats.errorCount / stats.totalPatterns) * 100 : 0}%`,
                              backgroundColor: '#f97316'
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium">{stats.errorCount}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span style={{ color: colors.textMuted }}>Warning</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 rounded-full bg-gray-200">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${stats.totalPatterns > 0 ? (stats.warningCount / stats.totalPatterns) * 100 : 0}%`,
                              backgroundColor: colors.warning
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium">{stats.warningCount}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span style={{ color: colors.textMuted }}>Info</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 rounded-full bg-gray-200">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${stats.totalPatterns > 0 ? (stats.infoCount / stats.totalPatterns) * 100 : 0}%`,
                              backgroundColor: colors.primary
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium">{stats.infoCount}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Resolution Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-4xl font-bold" style={{ color: colors.success }}>
                        {stats.totalPatterns > 0
                          ? Math.round((stats.resolvedPatterns / stats.totalPatterns) * 100)
                          : 0}%
                      </div>
                      <p style={{ color: colors.textMuted }}>Resolution Rate</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-3 rounded-lg" style={{ backgroundColor: alpha(colors.success, 10) }}>
                        <div className="text-2xl font-bold" style={{ color: colors.success }}>{stats.resolvedPatterns}</div>
                        <p className="text-xs" style={{ color: colors.textMuted }}>Resolved</p>
                      </div>
                      <div className="p-3 rounded-lg" style={{ backgroundColor: alpha(colors.error || '#ef4444', 10) }}>
                        <div className="text-2xl font-bold" style={{ color: colors.error || '#ef4444' }}>
                          {stats.totalPatterns - stats.resolvedPatterns}
                        </div>
                        <p className="text-xs" style={{ color: colors.textMuted }}>Active</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Pattern Detail Dialog */}
      <Dialog open={!!selectedPattern} onOpenChange={() => setSelectedPattern(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedPattern && getErrorTypeIcon(selectedPattern.errorType)}
              {selectedPattern?.patternName}
            </DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-2 mt-2">
                {selectedPattern && getSeverityBadge(selectedPattern.severity)}
                {selectedPattern && getStatusBadge(selectedPattern.patternStatus)}
                <Badge variant="outline">{selectedPattern?.errorType}</Badge>
              </div>
            </DialogDescription>
          </DialogHeader>
          {selectedPattern && (
            <div className="space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded-lg" style={{ backgroundColor: alpha(colors.bgSecondary, 30) }}>
                  <p className="text-2xl font-bold" style={{ color: colors.text }}>{selectedPattern.occurrenceCount}</p>
                  <p className="text-xs" style={{ color: colors.textMuted }}>Occurrences</p>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: alpha(colors.bgSecondary, 30) }}>
                  <p className="text-2xl font-bold" style={{ color: colors.text }}>{selectedPattern.httpStatus}</p>
                  <p className="text-xs" style={{ color: colors.textMuted }}>HTTP Status</p>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: alpha(colors.bgSecondary, 30) }}>
                  <p className="text-sm font-bold truncate" style={{ color: colors.text }}>{selectedPattern.endpoint}</p>
                  <p className="text-xs" style={{ color: colors.textMuted }}>Endpoint</p>
                </div>
              </div>

              {/* Description */}
              <div className="p-3 rounded-lg" style={{ backgroundColor: alpha(colors.bgSecondary, 30) }}>
                <p className="text-sm font-medium mb-1" style={{ color: colors.text }}>Description</p>
                <p className="text-sm" style={{ color: colors.textMuted }}>{selectedPattern.description}</p>
              </div>

              {/* Root Cause */}
              {selectedPattern.rootCause && (
                <div className="p-3 rounded-lg border" style={{ backgroundColor: alpha(colors.error || '#ef4444', 5), borderColor: alpha(colors.error || '#ef4444', 20) }}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 mt-0.5" style={{ color: colors.error || '#ef4444' }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: colors.error || '#ef4444' }}>Root Cause</p>
                      <p className="text-sm" style={{ color: colors.textSecondary }}>{selectedPattern.rootCause}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Prevention Strategy */}
              {selectedPattern.preventionStrategy && (
                <div className="p-3 rounded-lg border" style={{ backgroundColor: alpha(colors.success, 5), borderColor: alpha(colors.success, 20) }}>
                  <div className="flex items-start gap-2">
                    <Shield className="h-5 w-5 mt-0.5" style={{ color: colors.success }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: colors.success }}>Prevention Strategy</p>
                      <p className="text-sm" style={{ color: colors.textSecondary }}>{selectedPattern.preventionStrategy}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Auto Fix */}
              {selectedPattern.autoFixSolution && (
                <div className="p-3 rounded-lg border" style={{ backgroundColor: alpha(colors.primary, 5), borderColor: alpha(colors.primary, 20) }}>
                  <div className="flex items-start gap-2">
                    <Wrench className="h-5 w-5 mt-0.5" style={{ color: colors.primary }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: colors.primary }}>Auto-Fix Solution</p>
                      <p className="text-sm" style={{ color: colors.textSecondary }}>{selectedPattern.autoFixSolution}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Shortcut Solutions */}
              {getShortcutSolutions(selectedPattern).length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2" style={{ color: colors.text }}>
                    <Zap className="w-4 h-4" style={{ color: colors.warning }} />
                    Quick Solutions
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {getShortcutSolutions(selectedPattern).map((solution) => (
                      <Button
                        key={solution.id}
                        variant="outline"
                        size="sm"
                        onClick={() => executeShortcutSolution(solution, selectedPattern)}
                        disabled={executingSolution === solution.id}
                      >
                        {executingSolution === solution.id ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <solution.icon className="w-4 h-4 mr-2" />
                        )}
                        {solution.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4 text-xs" style={{ color: colors.textMuted }}>
                <div>
                  <span className="font-medium">First Occurrence:</span>{' '}
                  {new Date(selectedPattern.firstOccurrence).toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">Last Occurrence:</span>{' '}
                  {new Date(selectedPattern.lastOccurrence).toLocaleString()}
                </div>
              </div>

              {/* AI Resolution Button */}
              <div className="p-3 rounded-lg border" style={{ backgroundColor: alpha(colors.primary, 5), borderColor: alpha(colors.primary, 20) }}>
                <Button
                  className="w-full"
                  onClick={() => handleAIResolution(selectedPattern)}
                  disabled={aiAnalyzing}
                  style={{ backgroundColor: colors.primary }}
                >
                  {aiAnalyzing ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4 mr-2" />
                  )}
                  AI Error Resolution
                </Button>
                <p className="text-xs mt-2 text-center" style={{ color: colors.textMuted }}>
                  Analyze with AI and get automated fix suggestions
                </p>
              </div>

              {/* Actions */}
              <DialogFooter className="flex justify-between">
                <Button variant="outline" size="sm" onClick={() => copySolutionCode(selectedPattern)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Details
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResolvePattern(selectedPattern.id)}
                    style={{ borderColor: colors.success, color: colors.success }}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark Resolved
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleIgnorePattern(selectedPattern.id)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ignore
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Resolution Dialog */}
      <Dialog open={showAiDialog} onOpenChange={setShowAiDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" style={{ color: colors.primary }} />
              AI Error Resolution
            </DialogTitle>
            <DialogDescription>
              {selectedPattern?.patternName} - {selectedPattern?.endpoint}
            </DialogDescription>
          </DialogHeader>

          {aiAnalyzing ? (
            <div className="flex flex-col items-center justify-center py-12">
              <RefreshCw className="h-12 w-12 animate-spin" style={{ color: colors.primary }} />
              <p className="mt-4" style={{ color: colors.textMuted }}>Analyzing error pattern with AI...</p>
              <p className="text-sm mt-2" style={{ color: colors.textMuted }}>This may take a few seconds</p>
            </div>
          ) : aiResolution ? (
            <div className="space-y-4">
              {/* Confidence Score */}
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: alpha(colors.bgSecondary, 30) }}>
                <span style={{ color: colors.textMuted }}>Confidence Score</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${aiResolution.confidence * 100}%`,
                        backgroundColor: aiResolution.confidence >= 0.8 ? colors.success : aiResolution.confidence >= 0.6 ? colors.warning : colors.error
                      }}
                    />
                  </div>
                  <span className="font-medium">{Math.round(aiResolution.confidence * 100)}%</span>
                </div>
              </div>

              {/* Analysis */}
              <div className="p-3 rounded-lg border" style={{ backgroundColor: alpha(colors.primary, 5), borderColor: alpha(colors.primary, 20) }}>
                <div className="flex items-start gap-2">
                  <Brain className="h-5 w-5 mt-0.5" style={{ color: colors.primary }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: colors.primary }}>Analysis</p>
                    <p className="text-sm" style={{ color: colors.textSecondary }}>{aiResolution.analysis}</p>
                  </div>
                </div>
              </div>

              {/* Root Cause */}
              <div className="p-3 rounded-lg border" style={{ backgroundColor: alpha(colors.error || '#ef4444', 5), borderColor: alpha(colors.error || '#ef4444', 20) }}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 mt-0.5" style={{ color: colors.error || '#ef4444' }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: colors.error || '#ef4444' }}>Root Cause</p>
                    <p className="text-sm" style={{ color: colors.textSecondary }}>{aiResolution.rootCause}</p>
                  </div>
                </div>
              </div>

              {/* Solution */}
              <div className="p-3 rounded-lg border" style={{ backgroundColor: alpha(colors.success, 5), borderColor: alpha(colors.success, 20) }}>
                <div className="flex items-start gap-2">
                  <CheckSquare className="h-5 w-5 mt-0.5" style={{ color: colors.success }} />
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: colors.success }}>Solution</p>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: colors.textSecondary }}>{aiResolution.solution}</p>
                  </div>
                </div>
              </div>

              {/* Prevention Strategy */}
              <div className="p-3 rounded-lg border" style={{ backgroundColor: alpha(colors.warning, 5), borderColor: alpha(colors.warning, 20) }}>
                <div className="flex items-start gap-2">
                  <Shield className="h-5 w-5 mt-0.5" style={{ color: colors.warning }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: colors.warning }}>Prevention Strategy</p>
                    <p className="text-sm" style={{ color: colors.textSecondary }}>{aiResolution.preventionStrategy}</p>
                  </div>
                </div>
              </div>

              {/* Steps */}
              {aiResolution.steps.length > 0 && (
                <div className="p-3 rounded-lg" style={{ backgroundColor: alpha(colors.bgSecondary, 30) }}>
                  <p className="text-sm font-medium mb-2" style={{ color: colors.text }}>Resolution Steps</p>
                  <ol className="list-decimal list-inside space-y-1">
                    {aiResolution.steps.map((step, index) => (
                      <li key={index} className="text-sm" style={{ color: colors.textSecondary }}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Code Fix */}
              {aiResolution.codeFix && (
                <div className="p-3 rounded-lg border" style={{ backgroundColor: alpha(colors.bgSecondary, 30), borderColor: alpha(colors.border, 50) }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium flex items-center gap-2" style={{ color: colors.text }}>
                      <Code className="h-4 w-4" />
                      Suggested Code Fix
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(aiResolution.codeFix || '')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <pre className="text-xs p-3 rounded overflow-x-auto" style={{ backgroundColor: alpha(colors.bg, 80), color: colors.textSecondary }}>
                    {aiResolution.codeFix}
                  </pre>
                </div>
              )}

              {/* Related Patterns */}
              {aiResolution.relatedPatterns.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {aiResolution.relatedPatterns.map((pattern, index) => (
                    <Badge key={index} variant="outline">{pattern}</Badge>
                  ))}
                </div>
              )}

              {/* Actions */}
              <DialogFooter className="flex justify-between gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAiDialog(false)
                    setAiResolution(null)
                  }}
                >
                  Cancel
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => navigator.clipboard.writeText(JSON.stringify(aiResolution, null, 2))}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  <Button
                    onClick={applyAIFix}
                    disabled={aiApplying}
                    style={{ backgroundColor: colors.success }}
                  >
                    {aiApplying ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Apply & Save for Future
                  </Button>
                </div>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ErrorPatternDashboardTab
