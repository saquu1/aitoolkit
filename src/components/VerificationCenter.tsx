"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  ArrowRight,
  Filter
} from "lucide-react"

// ============================================================================
// Types
// ============================================================================

interface VerificationItem {
  id: string
  projectId: string | null
  itemType: 'column' | 'fk' | 'sp' | 'view' | 'module' | 'rule' | 'table'
  itemId: string
  itemName: string
  itemData: Record<string, any>
  confidence: number
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: string
  suggestedValue: Record<string, any> | null
  reason: string | null
  status: 'pending' | 'approved' | 'rejected' | 'deferred'
  reviewedBy: string | null
  reviewedAt: Date | null
  reviewNotes: string | null
  createdAt: Date
  updatedAt: Date
}

interface QueueStats {
  total: number
  pending: number
  approved: number
  rejected: number
  deferred: number
  critical: number
  highPriority: number
  avgConfidence: number
  byCategory: Record<string, number>
  byType: Record<string, number>
  oldestPending: string | null
  estimatedReviewTime: number
}

// ============================================================================
// Verification Center Component
// ============================================================================

export function VerificationCenter() {
  const [queue, setQueue] = useState<VerificationItem[]>([])
  const [stats, setStats] = useState<QueueStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<VerificationItem | null>(null)
  const [reviewNotes, setReviewNotes] = useState("")
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all')

  useEffect(() => {
    loadQueue()
    loadStats()
  }, [filter])

  async function loadQueue() {
    try {
      const params = new URLSearchParams({
        action: 'verification-queue',
        status: 'pending',
        ...(filter !== 'all' && { priority: filter })
      })
      
      const res = await fetch(`/api/phase2?${params}`)
      const data = await res.json()
      setQueue(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load queue:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadStats() {
    try {
      const res = await fetch('/api/phase2?action=verification-stats')
      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  async function handleDecision(
    itemId: string,
    decision: 'approve' | 'reject' | 'defer'
  ) {
    try {
      const res = await fetch('/api/phase2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'process-decision',
          itemId,
          decision,
          reviewedBy: 'current-user', // In real app, use actual user ID
          notes: reviewNotes
        })
      })
      
      if (res.ok) {
        setQueue(prev => prev.filter(item => item.id !== itemId))
        setSelectedItem(null)
        setReviewNotes("")
        loadStats()
      }
    } catch (error) {
      console.error('Failed to process decision:', error)
    }
  }

  async function handleBulkApprove() {
    try {
      const decisions = queue.slice(0, 10).map(item => ({
        itemId: item.id,
        decision: 'approve' as const,
        reviewedBy: 'current-user',
        notes: 'Bulk approved'
      }))
      
      const res = await fetch('/api/phase2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk-decision',
          decisions
        })
      })
      
      if (res.ok) {
        loadQueue()
        loadStats()
      }
    } catch (error) {
      console.error('Failed to bulk approve:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'table': return '📊'
      case 'column': return '📋'
      case 'fk': return '🔗'
      case 'sp': return '⚙️'
      case 'view': return '👁️'
      case 'module': return '📦'
      default: return '📄'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Verification Center</h2>
          <p className="text-muted-foreground">
            Review and verify low-confidence entities
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setFilter('all')}>
            All
          </Button>
          <Button variant="outline" onClick={() => setFilter('critical')}>
            Critical
          </Button>
          <Button variant="outline" onClick={() => setFilter('high')}>
            High
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">
                ~{stats.estimatedReviewTime} min to review
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Critical</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
              <p className="text-xs text-muted-foreground">
                Requires immediate attention
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(stats.avgConfidence * 100)}%
              </div>
              <Progress value={stats.avgConfidence * 100} className="mt-2 h-2" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.approved + stats.rejected}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.approved} approved, {stats.rejected} rejected
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Queue Tabs */}
      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">
            Queue ({queue.length})
          </TabsTrigger>
          <TabsTrigger value="stats">
            Statistics
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="queue" className="space-y-4">
          {queue.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8">
                <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                <p className="text-lg font-medium">All caught up!</p>
                <p className="text-muted-foreground">No items pending verification</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Bulk Actions */}
              <div className="flex justify-end">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline">
                      Bulk Approve (10)
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Bulk Approve Items?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will approve the next 10 items in the queue. Make sure you've reviewed them.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBulkApprove}>
                        Approve
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {/* Item Cards */}
              {queue.map((item) => (
                <Card key={item.id} className={
                  item.priority === 'critical' ? 'border-red-500 border-2' : ''
                }>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getTypeIcon(item.itemType)}</span>
                        <div>
                          <CardTitle className="text-lg">{item.itemName}</CardTitle>
                          <p className="text-sm text-muted-foreground capitalize">
                            {item.itemType} • {item.category}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getPriorityColor(item.priority)} text-white`}>
                          {item.priority}
                        </Badge>
                        <Badge variant="outline">
                          {Math.round(item.confidence * 100)}% confidence
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {item.reason && (
                      <p className="text-sm text-muted-foreground mb-4">
                        <AlertTriangle className="h-4 w-4 inline mr-1" />
                        {item.reason}
                      </p>
                    )}
                    
                    {/* Item Data Preview */}
                    <div className="bg-muted rounded p-3 mb-4">
                      <pre className="text-xs overflow-auto max-h-32">
                        {JSON.stringify(item.itemData, null, 2)}
                      </pre>
                    </div>
                    
                    {/* Suggested Value */}
                    {item.suggestedValue && (
                      <div className="mb-4">
                        <p className="text-sm font-medium mb-1">Suggested Value:</p>
                        <div className="bg-green-50 border border-green-200 rounded p-2">
                          <pre className="text-xs">
                            {JSON.stringify(item.suggestedValue, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                    
                    {/* Review Notes */}
                    <Textarea
                      placeholder="Add review notes (optional)"
                      value={selectedItem?.id === item.id ? reviewNotes : ""}
                      onChange={(e) => {
                        setSelectedItem(item)
                        setReviewNotes(e.target.value)
                      }}
                      className="mb-4"
                    />
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => handleDecision(item.id, 'approve')}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => handleDecision(item.id, 'reject')}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleDecision(item.id, 'defer')}
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Defer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </TabsContent>
        
        <TabsContent value="stats">
          <div className="grid grid-cols-2 gap-4">
            {/* By Category */}
            <Card>
              <CardHeader>
                <CardTitle>By Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats && Object.entries(stats.byCategory).map(([category, count]) => (
                    <div key={category} className="flex justify-between">
                      <span className="capitalize">{category}</span>
                      <Badge>{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* By Type */}
            <Card>
              <CardHeader>
                <CardTitle>By Entity Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats && Object.entries(stats.byType).map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <span>{getTypeIcon(type)}</span>
                        <span className="capitalize">{type}</span>
                      </span>
                      <Badge>{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================================================
// Version History Component
// ============================================================================

export function VersionHistory({ projectId }: { projectId: string }) {
  const [versions, setVersions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadVersions()
  }, [projectId])

  async function loadVersions() {
    try {
      const res = await fetch(
        `/api/phase2?action=version-history&projectId=${projectId}`
      )
      const data = await res.json()
      setVersions(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load versions:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading versions...</div>

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Version History</h3>
      {versions.length === 0 ? (
        <p className="text-muted-foreground">No versions saved</p>
      ) : (
        <div className="space-y-2">
          {versions.map((version, index) => (
            <Card key={version.version}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                    {version.version}
                  </div>
                  <div>
                    <p className="font-medium">{version.name || `v${version.version}`}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(version.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {version.changeCount} changes
                  </Badge>
                  {index > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        // Compare versions
                        const res = await fetch(
                          `/api/phase2?action=compare-versions&projectId=${projectId}&versionFrom=${version.version}&versionTo=${versions[index - 1].version}`
                        )
                        const comparison = await res.json()
                        console.log('Comparison:', comparison)
                      }}
                    >
                      Compare
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default VerificationCenter
