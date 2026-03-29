'use client'

import { useState, useEffect, useCallback } from 'react'
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
  AlertTriangle, AlertCircle, CheckCircle2, Clock, 
  Inbox, Eye, Play, TestTube, CheckCheck,
  RefreshCw, Filter, GripVertical, ExternalLink,
  Calendar, FileCode, GitBranch, ChevronDown, ChevronUp
} from 'lucide-react'

// Types
interface KanbanIssue {
  id: string
  issueId: string
  title: string
  description: string
  issueType: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: string
  sessionId: string
  sessionTitle?: string
  column: 'backlog' | 'detected' | 'in_progress' | 'testing' | 'resolved'
  order: number
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  relatedIssues: string[]
  relatedFiles: string[]
  patterns: string[]
}

interface KanbanBoard {
  backlog: KanbanIssue[]
  detected: KanbanIssue[]
  in_progress: KanbanIssue[]
  testing: KanbanIssue[]
  resolved: KanbanIssue[]
}

interface KanbanData {
  success: boolean
  board: KanbanBoard
  stats: {
    totalIssues: number
    bySeverity: Record<string, number>
    byType: Record<string, number>
    resolutionRate: number
    avgResolutionTime: number
  }
}

const COLUMNS: Array<{
  id: keyof KanbanBoard
  title: string
  icon: React.ReactNode
  color: string
  bgGradient: string
}> = [
  { 
    id: 'backlog', 
    title: 'Backlog', 
    icon: <Inbox className="h-4 w-4" />, 
    color: 'text-slate-500',
    bgGradient: 'from-slate-500/10 to-slate-600/5'
  },
  { 
    id: 'detected', 
    title: 'Detected', 
    icon: <Eye className="h-4 w-4" />, 
    color: 'text-orange-500',
    bgGradient: 'from-orange-500/10 to-orange-600/5'
  },
  { 
    id: 'in_progress', 
    title: 'In Progress', 
    icon: <Play className="h-4 w-4" />, 
    color: 'text-blue-500',
    bgGradient: 'from-blue-500/10 to-blue-600/5'
  },
  { 
    id: 'testing', 
    title: 'Testing', 
    icon: <TestTube className="h-4 w-4" />, 
    color: 'text-purple-500',
    bgGradient: 'from-purple-500/10 to-purple-600/5'
  },
  { 
    id: 'resolved', 
    title: 'Resolved', 
    icon: <CheckCheck className="h-4 w-4" />, 
    color: 'text-green-500',
    bgGradient: 'from-green-500/10 to-green-600/5'
  }
]

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  critical: { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  high: { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  medium: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  low: { color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30' }
}

export function KanbanBoardTab() {
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<KanbanData | null>(null)
  const [board, setBoard] = useState<KanbanBoard>({
    backlog: [],
    detected: [],
    in_progress: [],
    testing: [],
    resolved: []
  })
  const [draggedIssue, setDraggedIssue] = useState<KanbanIssue | null>(null)
  const [dragSource, setDragSource] = useState<keyof KanbanBoard | null>(null)
  const [selectedIssue, setSelectedIssue] = useState<KanbanIssue | null>(null)
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)
  const [expandedColumns, setExpandedColumns] = useState<Set<keyof KanbanBoard>>(
    new Set(['backlog', 'detected', 'in_progress', 'testing', 'resolved'])
  )

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/analytics?action=kanban-board')
      const result = await response.json()
      setData(result)
      if (result.board) {
        setBoard(result.board)
      }
    } catch (error) {
      console.error('Failed to fetch kanban board:', error)
    } finally {
      setIsLoading(false)
      setLastRefresh(new Date())
    }
  }

  useEffect(() => {
    setMounted(true)
    fetchData()
  }, [])

  // Filter issues
  const filterIssues = (issues: KanbanIssue[]) => {
    return issues.filter(issue => {
      if (filterSeverity !== 'all' && issue.severity !== filterSeverity) return false
      if (filterType !== 'all' && issue.issueType !== filterType) return false
      return true
    })
  }

  // Drag and drop handlers
  const handleDragStart = (issue: KanbanIssue, source: keyof KanbanBoard) => {
    setDraggedIssue(issue)
    setDragSource(source)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (targetColumn: keyof KanbanBoard) => {
    if (!draggedIssue || !dragSource || dragSource === targetColumn) {
      setDraggedIssue(null)
      setDragSource(null)
      return
    }

    // Optimistic update
    const newBoard = { ...board }
    newBoard[dragSource] = newBoard[dragSource].filter(i => i.id !== draggedIssue.id)
    newBoard[targetColumn] = [...newBoard[targetColumn], { ...draggedIssue, column: targetColumn }]
    setBoard(newBoard)

    // API call to update
    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-kanban-issue',
          issueId: draggedIssue.issueId,
          updates: { column: targetColumn }
        })
      })
    } catch (error) {
      console.error('Failed to update issue:', error)
      // Revert on error
      fetchData()
    }

    setDraggedIssue(null)
    setDragSource(null)
  }

  const toggleColumn = (columnId: keyof KanbanBoard) => {
    const newExpanded = new Set(expandedColumns)
    if (newExpanded.has(columnId)) {
      newExpanded.delete(columnId)
    } else {
      newExpanded.add(columnId)
    }
    setExpandedColumns(newExpanded)
  }

  // Get unique types for filter
  const issueTypes = data?.stats?.byType ? Object.keys(data.stats.byType) : []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const stats = data?.stats || {
    totalIssues: 0,
    bySeverity: {},
    byType: {},
    resolutionRate: 0,
    avgResolutionTime: 0
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-4">
          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {issueTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 p-4 border-b bg-muted/10">
        <StatCard
          label="Total Issues"
          value={stats.totalIssues}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <StatCard
          label="Critical"
          value={stats.bySeverity?.critical || 0}
          icon={<AlertCircle className="h-4 w-4 text-red-500" />}
          highlight="red"
        />
        <StatCard
          label="High Priority"
          value={stats.bySeverity?.high || 0}
          icon={<AlertTriangle className="h-4 w-4 text-orange-500" />}
          highlight="orange"
        />
        <StatCard
          label="Resolution Rate"
          value={`${stats.resolutionRate?.toFixed(0) || 0}%`}
          icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
          highlight="green"
        />
        <StatCard
          label="Avg Resolution"
          value={`${stats.avgResolutionTime?.toFixed(1) || 0}h`}
          icon={<Clock className="h-4 w-4 text-blue-500" />}
        />
      </div>

      {/* Kanban Board */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {COLUMNS.map(column => (
              <KanbanColumn
                key={column.id}
                column={column}
                issues={filterIssues(board[column.id])}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(column.id)}
                onDragStart={handleDragStart}
                onSelect={setSelectedIssue}
                isExpanded={expandedColumns.has(column.id)}
                onToggle={() => toggleColumn(column.id)}
              />
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* Issue Detail Dialog */}
      <Dialog open={!!selectedIssue} onOpenChange={() => setSelectedIssue(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Issue Details
            </DialogTitle>
            <DialogDescription>
              View and manage issue information
            </DialogDescription>
          </DialogHeader>
          {selectedIssue && (
            <IssueDetail issue={selectedIssue} onClose={() => setSelectedIssue(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function StatCard({ 
  label, 
  value, 
  icon, 
  highlight 
}: { 
  label: string
  value: string | number
  icon: React.ReactNode
  highlight?: 'red' | 'orange' | 'green' | 'blue'
}) {
  const highlightStyles = {
    red: 'bg-red-500/10 border-red-500/20',
    orange: 'bg-orange-500/10 border-orange-500/20',
    green: 'bg-green-500/10 border-green-500/20',
    blue: 'bg-blue-500/10 border-blue-500/20'
  }

  return (
    <div className={`p-3 rounded-lg border ${highlight ? highlightStyles[highlight] : 'bg-card'}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        {icon}
      </div>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  )
}

function KanbanColumn({
  column,
  issues,
  onDragOver,
  onDrop,
  onDragStart,
  onSelect,
  isExpanded,
  onToggle
}: {
  column: typeof COLUMNS[0]
  issues: KanbanIssue[]
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
  onDragStart: (issue: KanbanIssue, source: keyof KanbanBoard) => void
  onSelect: (issue: KanbanIssue) => void
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <Card 
      className={`bg-gradient-to-b ${column.bgGradient} border-t-2`}
      style={{ borderTopColor: column.color.replace('text-', '').replace('-500', '') }}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <CardHeader className="py-3 px-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <CardTitle className={`text-sm font-medium flex items-center gap-2 ${column.color}`}>
            {column.icon}
            {column.title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {issues.length}
            </Badge>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-0 px-3 pb-3">
          <ScrollArea className="h-[calc(100vh-400px)] max-h-96">
            <div className="space-y-2 pr-1">
              {issues.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No issues
                </div>
              ) : (
                issues.map(issue => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    onDragStart={() => onDragStart(issue, column.id)}
                    onClick={() => onSelect(issue)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  )
}

function IssueCard({
  issue,
  onDragStart,
  onClick
}: {
  issue: KanbanIssue
  onDragStart: () => void
  onClick: () => void
}) {
  const severityConfig = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.medium

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={`p-3 rounded-lg border ${severityConfig.bg} ${severityConfig.border} cursor-pointer hover:shadow-md transition-all group`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{issue.title}</p>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {issue.issueType}
          </p>
        </div>
        <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </div>
      
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <Badge className={`${severityConfig.bg} ${severityConfig.color} text-xs`}>
          {issue.severity}
        </Badge>
        {issue.sessionTitle && (
          <span className="text-xs text-muted-foreground truncate max-w-[100px]">
            {issue.sessionTitle}
          </span>
        )}
      </div>

      {issue.relatedFiles.length > 0 && (
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
          <FileCode className="h-3 w-3" />
          <span>{issue.relatedFiles.length} files</span>
        </div>
      )}

      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
        <Calendar className="h-3 w-3" />
        <span>{formatRelativeTime(issue.createdAt)}</span>
      </div>
    </div>
  )
}

function IssueDetail({ issue, onClose }: { issue: KanbanIssue; onClose: () => void }) {
  const severityConfig = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.medium

  return (
    <div className="space-y-4">
      {/* Title & Severity */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-lg">{issue.title}</h3>
          <p className="text-sm text-muted-foreground">{issue.issueType}</p>
        </div>
        <Badge className={`${severityConfig.bg} ${severityConfig.color}`}>
          {issue.severity}
        </Badge>
      </div>

      {/* Description */}
      {issue.description && (
        <div>
          <h4 className="text-sm font-medium mb-1">Description</h4>
          <p className="text-sm text-muted-foreground">{issue.description}</p>
        </div>
      )}

      {/* Session Info */}
      {issue.sessionTitle && (
        <div>
          <h4 className="text-sm font-medium mb-1">Session</h4>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <GitBranch className="h-4 w-4" />
            <span>{issue.sessionTitle}</span>
          </div>
        </div>
      )}

      {/* Related Files */}
      {issue.relatedFiles.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Related Files ({issue.relatedFiles.length})</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {issue.relatedFiles.map((file, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <FileCode className="h-4 w-4 text-muted-foreground" />
                <code className="text-xs bg-muted px-1 rounded truncate flex-1">{file}</code>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
        <div>
          <p className="text-xs text-muted-foreground">Created</p>
          <p className="text-sm">{new Date(issue.createdAt).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Updated</p>
          <p className="text-sm">{new Date(issue.updatedAt).toLocaleString()}</p>
        </div>
        {issue.resolvedAt && (
          <div>
            <p className="text-xs text-muted-foreground">Resolved</p>
            <p className="text-sm text-green-500">{new Date(issue.resolvedAt).toLocaleString()}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export default KanbanBoardTab
