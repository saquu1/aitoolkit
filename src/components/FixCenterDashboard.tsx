'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'

interface FixSuggestion {
  id: string
  fixType: string
  description: string
  codeChange: {
    file: string
    oldCode: string
    newCode: string
    lineStart: number
    lineEnd: number
  }
  affectedFiles: string[]
  impactScore: number
  effortLevel: string
  estimatedTime: number
  confidence: number
  autoSafe: boolean
  preferredFix: boolean
  status: string
}

interface FixStats {
  totalSuggestions: number
  appliedSuggestions: number
  revertedSuggestions: number
  totalBackups: number
  totalPatterns: number
  autoAppliedCount: number
  applyRate: string
  revertRate: string
}

interface BackupInfo {
  id: string
  scanId: string
  filePath: string
  fileSize: number
  lineCount: number
  createdAt: string
  restored: boolean
}

interface IssueWithFixes {
  id: string
  issueType: string
  severity: string
  message: string
  suggestion: string
  status: string
  suggestions: FixSuggestion[]
}

export function FixCenterDashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<FixStats | null>(null)
  const [issues, setIssues] = useState<IssueWithFixes[]>([])
  const [selectedIssue, setSelectedIssue] = useState<IssueWithFixes | null>(null)
  const [selectedFix, setSelectedFix] = useState<FixSuggestion | null>(null)
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [showFixDialog, setShowFixDialog] = useState(false)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [applying, setApplying] = useState(false)
  const [scanId, setScanId] = useState<string>('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [statsRes] = await Promise.all([
        fetch('/api/smart-fixer?action=stats')
      ])

      const statsData = await statsRes.json()
      if (statsData.success) setStats(statsData.stats)

      // Auto-load latest scan ID from contract validator history
      if (!scanId) {
        try {
          const historyRes = await fetch('/api/contract-validator?action=history&limit=1')
          const historyData = await historyRes.json()
          if (historyData.success && historyData.scans && historyData.scans.length > 0) {
            setScanId(historyData.scans[0].scanId)
          }
        } catch (e) {
          // Non-critical, continue without scan ID
        }
      }

      // Load issues with pending fixes
      await loadIssuesWithFixes()
    } catch (error) {
      console.error('Failed to load fix center data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadIssuesWithFixes = async () => {
    try {
      // Get issues from contract validator
      const issuesRes = await fetch('/api/contract-validator?action=issues&limit=20')
      const issuesData = await issuesRes.json()

      if (issuesData.success) {
        // For each issue, get its fix suggestions
        const issuesWithFixes = await Promise.all(
          issuesData.issues.map(async (issue: any) => {
            const fixesRes = await fetch(`/api/smart-fixer?action=suggestions&issueId=${issue.id}`)
            const fixesData = await fixesRes.json()
            return {
              ...issue,
              suggestions: fixesData.success ? fixesData.suggestions : []
            }
          })
        )
        setIssues(issuesWithFixes)
      }
    } catch (error) {
      console.error('Failed to load issues with fixes:', error)
    }
  }

  const generateFixes = async (issue: IssueWithFixes) => {
    try {
      const response = await fetch('/api/smart-fixer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          issue: {
            issueId: issue.id,
            issueType: issue.issueType,
            severity: issue.severity,
            message: issue.message,
            suggestion: issue.suggestion
          }
        })
      })
      const data = await response.json()
      if (data.success) {
        // Refresh issues with new fixes
        await loadIssuesWithFixes()
      }
    } catch (error) {
      console.error('Failed to generate fixes:', error)
    }
  }

  const applyFix = async (fix: FixSuggestion, dryRun: boolean = false) => {
    if (!scanId) {
      alert('Please run a scan first to get a scan ID')
      return
    }

    setApplying(true)
    try {
      const response = await fetch('/api/smart-fixer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: dryRun ? 'preview' : 'apply',
          suggestionId: fix.id,
          scanId,
          issueId: selectedIssue?.id
        })
      })
      const data = await response.json()
      
      if (data.success) {
        if (dryRun) {
          alert(`Preview:\n${data.diff}`)
        } else {
          alert(`Fix applied successfully!\nBackup created: ${data.backupId}`)
          setShowFixDialog(false)
          await loadData()
        }
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Failed to apply fix:', error)
    } finally {
      setApplying(false)
    }
  }

  const autoApplySafeFixes = async () => {
    if (!scanId) {
      alert('Please enter a scan ID')
      return
    }

    if (!confirm('This will automatically apply all safe fixes (confidence >= 90%, low impact). Continue?')) {
      return
    }

    setApplying(true)
    try {
      const response = await fetch('/api/smart-fixer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'auto-apply',
          scanId
        })
      })
      const data = await response.json()
      
      if (data.success) {
        alert(`Auto-applied ${data.applied} fixes, ${data.failed} failed`)
        await loadData()
      }
    } catch (error) {
      console.error('Failed to auto-apply fixes:', error)
    } finally {
      setApplying(false)
    }
  }

  const loadBackups = async (scanId: string) => {
    try {
      const response = await fetch(`/api/smart-fixer?action=backups&scanId=${scanId}`)
      const data = await response.json()
      if (data.success) {
        setBackups(data.backups)
      }
    } catch (error) {
      console.error('Failed to load backups:', error)
    }
  }

  const restoreBackup = async (backupId?: string) => {
    if (!scanId && !backupId) return

    if (!confirm('Are you sure you want to restore? This will revert all applied fixes.')) {
      return
    }

    setApplying(true)
    try {
      const response = await fetch('/api/smart-fixer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'restore',
          scanId,
          backupId
        })
      })
      const data = await response.json()
      
      if (data.success) {
        alert(`Restored ${data.restoredFiles.length} file(s)`)
        setShowRestoreDialog(false)
        await loadData()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Failed to restore:', error)
    } finally {
      setApplying(false)
    }
  }

  const getFixTypeIcon = (type: string) => {
    switch (type) {
      case 'add_param': return '➕ Add Param'
      case 'remove_param': return '➖ Remove Param'
      case 'add_null_check': return '🛡️ Add Null Check'
      case 'change_type': return '🔄 Change Type'
      case 'create_endpoint': return '🔌 Create Endpoint'
      case 'add_default': return '⚙️ Add Default'
      case 'learned_pattern': return '🧠 Learned Pattern'
      default: return '🔧 Fix'
    }
  }

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'trivial': return 'bg-green-100 text-green-800'
      case 'easy': return 'bg-blue-100 text-blue-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'hard': return 'bg-orange-100 text-orange-800'
      case 'complex': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'bg-red-100 text-red-800 border-red-200'
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-pulse text-4xl mb-4">🔧</div>
        <p className="text-gray-600">Loading Fix Center...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">🔧 Smart Fix Center</h2>
          <p className="text-gray-600 mt-1">
            Intelligent fix suggestions with automatic backup and restore
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Enter Scan ID"
            value={scanId}
            onChange={(e) => setScanId(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          />
          <Button 
            variant="outline"
            onClick={() => { setShowRestoreDialog(true); loadBackups(scanId) }}
            disabled={!scanId}
          >
            🔄 Restore
          </Button>
          <Button 
            onClick={autoApplySafeFixes}
            disabled={applying || !scanId}
            className="bg-green-600 hover:bg-green-700"
          >
            ⚡ Auto-Apply Safe
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Total Suggestions</div>
              <div className="text-2xl font-bold">{stats.totalSuggestions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Applied</div>
              <div className="text-2xl font-bold text-green-600">{stats.appliedSuggestions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Reverted</div>
              <div className="text-2xl font-bold text-orange-600">{stats.revertedSuggestions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Backups</div>
              <div className="text-2xl font-bold">{stats.totalBackups}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Learned Patterns</div>
              <div className="text-2xl font-bold">{stats.totalPatterns}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Apply Rate</div>
              <div className="text-2xl font-bold">{stats.applyRate}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Auto-Applied</div>
              <div className="text-2xl font-bold text-blue-600">{stats.autoAppliedCount}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="issues">
        <TabsList>
          <TabsTrigger value="issues">Issues with Fixes</TabsTrigger>
          <TabsTrigger value="backups">Backup History</TabsTrigger>
          <TabsTrigger value="patterns">Learned Patterns</TabsTrigger>
        </TabsList>

        {/* Issues Tab */}
        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {issues.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p className="text-lg mb-2">No issues loaded</p>
                  <p className="text-sm">Issues from the Contract Validator will appear here automatically.</p>
                  <p className="text-sm mt-1">Run a scan in the Contract Validator tab first, then return here.</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="divide-y">
                    {issues.map((issue) => (
                      <div key={issue.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={getSeverityColor(issue.severity)}>
                                {issue.severity.toUpperCase()}
                              </Badge>
                              <span className="text-sm font-medium">{issue.issueType}</span>
                              {issue.suggestions.length > 0 && (
                                <Badge variant="outline">
                                  {issue.suggestions.length} fix(es)
                                </Badge>
                              )}
                            </div>
                            <p className="text-gray-800">{issue.message}</p>
                            <p className="text-sm text-blue-600 mt-1">💡 {issue.suggestion}</p>
                          </div>
                          <div className="flex gap-2">
                            {issue.suggestions.length === 0 ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => generateFixes(issue)}
                              >
                                Generate Fixes
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedIssue(issue)
                                  setShowFixDialog(true)
                                }}
                              >
                                View Fixes
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backups Tab */}
        <TabsContent value="backups" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Backup History</CardTitle>
              <CardDescription>
                Files backed up before applying fixes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {backups.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Enter a Scan ID above to view backups
                </div>
              ) : (
                <div className="space-y-2">
                  {backups.map((backup) => (
                    <div key={backup.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-mono text-sm">{backup.filePath}</div>
                        <div className="text-xs text-gray-500">
                          {backup.lineCount} lines • {(backup.fileSize / 1024).toFixed(1)} KB
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {backup.restored ? (
                          <Badge variant="outline" className="text-green-600">Restored</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => restoreBackup(backup.id)}
                          >
                            Restore
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Patterns Tab */}
        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Learned Fix Patterns</CardTitle>
              <CardDescription>
                Patterns learned from successful fixes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center p-8 text-gray-500">
                Patterns will appear here after fixes are applied and learned from
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Fix Dialog */}
      <Dialog open={showFixDialog} onOpenChange={setShowFixDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fix Suggestions</DialogTitle>
            <DialogDescription>
              Choose a fix to apply. A backup will be created automatically.
            </DialogDescription>
          </DialogHeader>

          {selectedIssue && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={getSeverityColor(selectedIssue.severity)}>
                    {selectedIssue.severity.toUpperCase()}
                  </Badge>
                  <span>{selectedIssue.issueType}</span>
                </div>
                <p className="text-sm">{selectedIssue.message}</p>
              </div>

              <div className="space-y-3">
                {selectedIssue.suggestions.map((fix) => (
                  <div
                    key={fix.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedFix?.id === fix.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    } ${fix.preferredFix ? 'border-green-300 bg-green-50' : ''}`}
                    onClick={() => setSelectedFix(fix)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{getFixTypeIcon(fix.fixType)}</span>
                        {fix.preferredFix && (
                          <Badge className="bg-green-100 text-green-800">Recommended</Badge>
                        )}
                        {fix.autoSafe && (
                          <Badge className="bg-blue-100 text-blue-800">Auto-Safe</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getEffortColor(fix.effortLevel)}>
                          {fix.effortLevel}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {(fix.confidence * 100).toFixed(0)}% confident
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">{fix.description}</p>
                    <div className="mt-2 text-xs text-gray-500">
                      📁 {fix.affectedFiles.length} file(s) • ⏱️ ~{fix.estimatedTime}min • 
                      Impact: {fix.impactScore}/100
                    </div>
                    <div className="mt-2 p-2 bg-gray-100 rounded font-mono text-xs overflow-x-auto">
                      <div className="text-red-600">- {fix.codeChange.oldCode?.slice(0, 100)}...</div>
                      <div className="text-green-600">+ {fix.codeChange.newCode?.slice(0, 100)}...</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFixDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => selectedFix && applyFix(selectedFix, true)}
              disabled={!selectedFix || applying}
            >
              Preview
            </Button>
            <Button
              onClick={() => selectedFix && applyFix(selectedFix)}
              disabled={!selectedFix || applying || !scanId}
              className="bg-green-600 hover:bg-green-700"
            >
              {applying ? 'Applying...' : 'Apply Fix'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore from Backup</DialogTitle>
            <DialogDescription>
              Restore files to their state before fixes were applied
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              This will revert all files that were modified during the scan. 
              Any fixes applied will be undone.
            </p>

            {backups.length > 0 ? (
              <div className="text-sm">
                {backups.length} file(s) available for restore
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                No backups found for this scan ID
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => restoreBackup()}
              disabled={backups.length === 0 || applying}
            >
              {applying ? 'Restoring...' : 'Restore All'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
