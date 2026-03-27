'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ContractIssue {
  id?: string
  type: string
  severity: 'error' | 'warning' | 'info'
  message: string
  frontendFile?: string
  frontendLine?: number
  apiFile?: string
  suggestion: string
  status?: string
  fixApplied?: boolean
  createdAt?: string
}

interface ValidationResult {
  success: boolean
  scanId: string
  savedScanId?: string
  summary: {
    totalEndpoints: number
    totalCalls: number
    totalIssues: number
    errors: number
    warnings: number
  }
  issues: ContractIssue[]
}

interface ScanHistory {
  id: string
  scanId: string
  status: string
  issuesFound: number
  issuesFixed: number
  duration?: number
  createdAt: string
  completedAt?: string
  issueCount?: number
}

interface ScanStats {
  totalScans: number
  totalIssues: number
  openIssues: number
  fixedIssues: number
  errorIssues: number
  issuesByType: Record<string, number>
  recentScans: ScanHistory[]
}

export function ContractValidatorTab() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [activeTab, setActiveTab] = useState('scan')
  const [scanHistory, setScanHistory] = useState<ScanHistory[]>([])
  const [stats, setStats] = useState<ScanStats | null>(null)
  const [selectedScan, setSelectedScan] = useState<any>(null)
  const [showScanDetail, setShowScanDetail] = useState(false)
  const [fixingIssue, setFixingIssue] = useState<string | null>(null)

  // Load stats and history on mount
  useEffect(() => {
    loadStats()
    loadHistory()
  }, [])

  const loadStats = async () => {
    try {
      const response = await fetch('/api/contract-validator?action=stats')
      const data = await response.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const loadHistory = async () => {
    try {
      const response = await fetch('/api/contract-validator?action=history&limit=10')
      const data = await response.json()
      if (data.success) {
        setScanHistory(data.scans)
      }
    } catch (error) {
      console.error('Failed to load history:', error)
    }
  }

  const runValidation = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/contract-validator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate_with_save' })
      })
      const data = await response.json()
      setResult(data)
      // Refresh stats and history after scan
      loadStats()
      loadHistory()
    } catch (error) {
      console.error('Validation failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const viewScanDetail = async (scanId: string) => {
    try {
      const response = await fetch(`/api/contract-validator?action=scan&scanId=${scanId}`)
      const data = await response.json()
      if (data.success) {
        setSelectedScan(data.scan)
        setShowScanDetail(true)
      }
    } catch (error) {
      console.error('Failed to load scan detail:', error)
    }
  }

  const fixIssue = async (issueId: string) => {
    setFixingIssue(issueId)
    try {
      const response = await fetch('/api/contract-validator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'fix_issue',
          issueId,
          fixDescription: 'Marked as fixed via UI'
        })
      })
      const data = await response.json()
      if (data.success) {
        // Update the selected scan if open
        if (selectedScan) {
          viewScanDetail(selectedScan.scanId)
        }
        loadStats()
      }
    } catch (error) {
      console.error('Failed to fix issue:', error)
    } finally {
      setFixingIssue(null)
    }
  }

  const ignoreIssue = async (issueId: string) => {
    try {
      const response = await fetch('/api/contract-validator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ignore_issue',
          issueId
        })
      })
      const data = await response.json()
      if (data.success) {
        if (selectedScan) {
          viewScanDetail(selectedScan.scanId)
        }
        loadStats()
      }
    } catch (error) {
      console.error('Failed to ignore issue:', error)
    }
  }

  const restoreScan = async (scanId: string) => {
    if (!confirm('Are you sure you want to restore this scan? This will revert all fixes applied.')) {
      return
    }
    try {
      const response = await fetch('/api/contract-validator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'restore_scan',
          scanId
        })
      })
      const data = await response.json()
      if (data.success) {
        loadStats()
        loadHistory()
        setShowScanDetail(false)
        alert(data.message)
      }
    } catch (error) {
      console.error('Failed to restore scan:', error)
    }
  }

  const deleteScan = async (scanId: string) => {
    if (!confirm('Are you sure you want to delete this scan? This cannot be undone.')) {
      return
    }
    try {
      const response = await fetch('/api/contract-validator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_scan',
          scanId
        })
      })
      const data = await response.json()
      if (data.success) {
        loadStats()
        loadHistory()
        setShowScanDetail(false)
      }
    } catch (error) {
      console.error('Failed to delete scan:', error)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'bg-red-100 text-red-800 border-red-200'
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getIssueStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800'
      case 'fixed': return 'bg-green-100 text-green-800'
      case 'ignored': return 'bg-gray-100 text-gray-800'
      case 'reverted': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'missing_param': return '❌ Missing Param'
      case 'undefined_access': return '⚠️ Undefined Access'
      case 'unknown_endpoint': return '❓ Unknown Endpoint'
      case 'type_mismatch': return '🔄 Type Mismatch'
      case 'extra_param': return '➕ Extra Param'
      default: return '📋 Issue'
    }
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">🔍 API Contract Validator</h2>
          <p className="text-gray-600 mt-1">
            Detect data mismatches between Frontend ↔ API ↔ Database with persistent tracking
          </p>
        </div>
        <Button 
          onClick={runValidation} 
          disabled={loading}
          size="lg"
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading ? '⏳ Scanning...' : '🔍 Scan & Save'}
        </Button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Total Scans</div>
              <div className="text-2xl font-bold">{stats.totalScans}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Open Issues</div>
              <div className="text-2xl font-bold text-red-600">{stats.openIssues}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Errors</div>
              <div className="text-2xl font-bold text-red-600">{stats.errorIssues}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Fixed</div>
              <div className="text-2xl font-bold text-green-600">{stats.fixedIssues}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Total Issues</div>
              <div className="text-2xl font-bold">{stats.totalIssues}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="scan">Current Scan</TabsTrigger>
          <TabsTrigger value="history">Scan History</TabsTrigger>
          <TabsTrigger value="issues">Open Issues</TabsTrigger>
        </TabsList>

        {/* Current Scan Tab */}
        <TabsContent value="scan" className="space-y-4">
          {!result && !loading && (
            <Card className="bg-gray-50 border-dashed">
              <CardContent className="p-8 text-center">
                <div className="text-4xl mb-4">🔍</div>
                <p className="text-gray-600">
                  Click "Scan & Save" to detect and persist contract issues:
                </p>
                <ul className="text-left mt-4 space-y-2 max-w-md mx-auto text-gray-700">
                  <li>• <strong>Missing Parameters</strong> - Frontend sends X but API expects Y</li>
                  <li>• <strong>Undefined Access</strong> - Code accesses property on potentially undefined object</li>
                  <li>• <strong>Unknown Endpoints</strong> - Frontend calls non-existent API</li>
                  <li>• <strong>Type Mismatches</strong> - Data format inconsistencies</li>
                </ul>
                <p className="text-sm text-gray-500 mt-4">
                  All scan results are saved to the database for tracking and restoration.
                </p>
              </CardContent>
            </Card>
          )}

          {loading && (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="animate-pulse text-4xl mb-4">⏳</div>
                <p className="text-gray-600">Scanning all API routes and frontend calls...</p>
                <p className="text-sm text-gray-500 mt-2">Results will be saved automatically</p>
              </CardContent>
            </Card>
          )}

          {result && (
            <>
              {/* Scan ID Banner */}
              {result.savedScanId && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-blue-800 font-medium">📋 Scan ID:</span>
                        <code className="bg-blue-100 px-2 py-1 rounded text-blue-900">{result.savedScanId}</code>
                      </div>
                      <span className="text-sm text-blue-600">Saved to database</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Summary Cards */}
              <div className="grid grid-cols-5 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-600">API Endpoints</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{result.summary.totalEndpoints}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-600">API Calls</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{result.summary.totalCalls}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-600">Total Issues</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{result.summary.totalIssues}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-600">Errors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{result.summary.errors}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-600">Warnings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">{result.summary.warnings}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Status */}
              <Card className={result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{result.success ? '✅' : '⚠️'}</span>
                    <span className="font-medium">
                      {result.success 
                        ? 'All contracts are valid! No issues found.' 
                        : `Found ${result.summary.totalIssues} issue(s) that need attention.`}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Issues List */}
              {result.issues.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>📋 Issues Found</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="max-h-96">
                      <div className="space-y-4">
                        {result.issues.map((issue, index) => (
                          <div key={index} className="border rounded-lg p-4 bg-gray-50">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <Badge className={getSeverityColor(issue.severity)}>
                                  {issue.severity.toUpperCase()}
                                </Badge>
                                <span className="font-medium">{getTypeIcon(issue.type)}</span>
                              </div>
                            </div>
                            
                            <div className="mt-2">
                              <p className="text-gray-800">{issue.message}</p>
                            </div>

                            {(issue.frontendFile || issue.apiFile) && (
                              <div className="mt-2 text-sm text-gray-600 font-mono bg-gray-100 p-2 rounded">
                                {issue.frontendFile && (
                                  <div>📱 Frontend: {issue.frontendFile}:{issue.frontendLine}</div>
                                )}
                                {issue.apiFile && (
                                  <div>🖥️ API: {issue.apiFile}</div>
                                )}
                              </div>
                            )}

                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                              <div className="text-sm font-medium text-blue-800">💡 Suggestion:</div>
                              <div className="text-sm text-blue-700 mt-1">{issue.suggestion}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Scan History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>📋 Scan History</CardTitle>
            </CardHeader>
            <CardContent>
              {scanHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No scans yet. Run a scan to see history.
                </div>
              ) : (
                <div className="space-y-3">
                  {scanHistory.map((scan) => (
                    <div 
                      key={scan.id} 
                      className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => viewScanDetail(scan.scanId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm">{scan.scanId}</code>
                          <Badge className={getStatusColor(scan.status)}>
                            {scan.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(scan.createdAt)}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                        <span>🔍 {scan.issuesFound || scan.issueCount || 0} issues</span>
                        {scan.issuesFixed > 0 && (
                          <span className="text-green-600">✅ {scan.issuesFixed} fixed</span>
                        )}
                        {scan.duration && (
                          <span>⏱️ {formatDuration(scan.duration)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Open Issues Tab */}
        <TabsContent value="issues" className="space-y-4">
          <OpenIssuesTab 
            onFix={fixIssue} 
            onIgnore={ignoreIssue} 
            fixingIssue={fixingIssue}
          />
        </TabsContent>
      </Tabs>

      {/* Scan Detail Dialog */}
      <Dialog open={showScanDetail} onOpenChange={setShowScanDetail}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Scan Details: {selectedScan?.scanId}</DialogTitle>
            <DialogDescription>
              Scanned on {selectedScan?.createdAt && formatDate(selectedScan.createdAt)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedScan && (
            <div className="space-y-4">
              {/* Scan Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Status:</span>
                  <Badge className={getStatusColor(selectedScan.status)}>
                    {selectedScan.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Duration:</span>
                  <span className="ml-2">{formatDuration(selectedScan.duration)}</span>
                </div>
              </div>

              <Separator />

              {/* Issues */}
              <div>
                <h4 className="font-medium mb-3">
                  Issues ({selectedScan.issues?.length || 0})
                </h4>
                <ScrollArea className="max-h-96">
                  <div className="space-y-3">
                    {selectedScan.issues?.map((issue: any) => (
                      <div key={issue.id} className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge className={getSeverityColor(issue.severity)}>
                              {issue.severity}
                            </Badge>
                            <Badge className={getIssueStatusColor(issue.status)}>
                              {issue.status}
                            </Badge>
                            <span className="text-sm">{getTypeIcon(issue.issueType)}</span>
                          </div>
                          {issue.status === 'open' && (
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => fixIssue(issue.id)}
                                disabled={fixingIssue === issue.id}
                              >
                                {fixingIssue === issue.id ? 'Fixing...' : 'Fix'}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => ignoreIssue(issue.id)}
                              >
                                Ignore
                              </Button>
                            </div>
                          )}
                        </div>
                        <p className="text-sm">{issue.message}</p>
                        {issue.suggestion && (
                          <p className="text-xs text-blue-600 mt-1">💡 {issue.suggestion}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => restoreScan(selectedScan?.scanId)}>
                🔄 Restore
              </Button>
              <Button variant="destructive" onClick={() => deleteScan(selectedScan?.scanId)}>
                🗑️ Delete
              </Button>
            </div>
            <Button onClick={() => setShowScanDetail(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Separate component for Open Issues Tab
function OpenIssuesTab({ onFix, onIgnore, fixingIssue }: { 
  onFix: (id: string) => void, 
  onIgnore: (id: string) => void,
  fixingIssue: string | null 
}) {
  const [issues, setIssues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadIssues()
  }, [])

  const loadIssues = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/contract-validator?action=issues&limit=50')
      const data = await response.json()
      if (data.success) {
        setIssues(data.issues)
      }
    } catch (error) {
      console.error('Failed to load issues:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'bg-red-100 text-red-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-blue-100 text-blue-800'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'missing_param': return '❌ Missing Param'
      case 'undefined_access': return '⚠️ Undefined Access'
      case 'unknown_endpoint': return '❓ Unknown Endpoint'
      case 'type_mismatch': return '🔄 Type Mismatch'
      default: return '📋 Issue'
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading issues...</div>
  }

  if (issues.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          ✅ No open issues! All contracts are valid.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>🚨 Open Issues ({issues.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-96">
          <div className="space-y-3">
            {issues.map((issue) => (
              <div key={issue.id} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className={getSeverityColor(issue.severity)}>
                      {issue.severity}
                    </Badge>
                    <span className="text-sm font-medium">{getTypeIcon(issue.issueType)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => { onFix(issue.id); loadIssues(); }}
                      disabled={fixingIssue === issue.id}
                    >
                      {fixingIssue === issue.id ? 'Fixing...' : '✅ Fix'}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => { onIgnore(issue.id); loadIssues(); }}
                    >
                      Ignore
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-gray-800">{issue.message}</p>
                {issue.frontendFile && (
                  <p className="text-xs text-gray-500 mt-1 font-mono">
                    📱 {issue.frontendFile}:{issue.frontendLine}
                  </p>
                )}
                {issue.suggestion && (
                  <p className="text-xs text-blue-600 mt-2">💡 {issue.suggestion}</p>
                )}
                <div className="text-xs text-gray-400 mt-2">
                  From scan: {issue.scan?.scanId} • {issue.createdAt && new Date(issue.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

export default ContractValidatorTab
