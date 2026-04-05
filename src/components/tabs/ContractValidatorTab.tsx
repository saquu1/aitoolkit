'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

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

interface FileInfo {
  path: string
  name: string
  type: 'api' | 'component' | 'hook' | 'lib' | 'page'
  lastModified?: string
  hasRecentErrors?: boolean
  recentlyModified?: boolean
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
  const [applyingAll, setApplyingAll] = useState(false)
  const [allFixProgress, setAllFixProgress] = useState({ current: 0, total: 0 })

  // AI Fix state
  const [aiFixingIssue, setAiFixingIssue] = useState<string | null>(null)
  const [aiFixResult, setAiFixResult] = useState<any>(null)
  const [aiFixAllProgress, setAiFixAllProgress] = useState({ current: 0, total: 0, fixed: 0, skipped: 0 })
  const [showAiFixDialog, setShowAiFixDialog] = useState(false)

  // File selection state
  const [scanMode, setScanMode] = useState<'all' | 'selected' | 'feature'>('all')
  const [files, setFiles] = useState<FileInfo[]>([])
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [fileSearch, setFileSearch] = useState('')
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [selectedFeature, setSelectedFeature] = useState<string>('')

  // Feature groups
  const features = [
    {
      id: 'error-patterns',
      name: 'Error Pattern System',
      description: 'Error detection and AI resolution',
      files: [
        'src/components/tabs/ErrorPatternDashboardTab.tsx',
        'src/app/api/error-patterns/route.ts',
        'src/app/api/error-patterns/ai-resolution/route.ts',
      ]
    },
    {
      id: 'contract-validator',
      name: 'Contract Validator',
      description: 'API contract validation and scanning',
      files: [
        'src/components/tabs/ContractValidatorTab.tsx',
        'src/app/api/contract-validator/route.ts',
      ]
    },
    {
      id: 'chat-logs',
      name: 'Chat Logs System',
      description: 'AI session tracking and analysis',
      files: [
        'src/app/api/chat-logs/route.ts',
        'src/app/api/chat-logs/extract/route.ts',
        'src/components/tabs/ChatLogTab.tsx',
      ]
    },
    {
      id: 'intelligence-bank',
      name: 'Intelligence Bank',
      description: 'Field and table intelligence storage',
      files: [
        'src/components/tabs/IntelligenceBankTab.tsx',
        'src/app/api/intelligence-bank/route.ts',
      ]
    },
    {
      id: 'multi-tenant',
      name: 'Multi-Tenant System',
      description: 'Company and workspace management',
      files: [
        'src/components/tabs/MultiTenantTab.tsx',
        'src/app/api/multi-tenant/route.ts',
        'src/lib/multi-tenant.ts',
      ]
    },
  ]

  // Load stats, history, and files on mount
  useEffect(() => {
    loadStats()
    loadHistory()
    loadFiles()
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

  const loadFiles = async () => {
    setLoadingFiles(true)
    try {
      const response = await fetch('/api/contract-validator?action=list-files')
      const data = await response.json()
      if (data.success) {
        setFiles(data.files)
      }
    } catch (error) {
      console.error('Failed to load files:', error)
      // Fallback to empty array
      setFiles([])
    } finally {
      setLoadingFiles(false)
    }
  }

  const toggleFileSelection = (filePath: string) => {
    setSelectedFiles(prev => 
      prev.includes(filePath) 
        ? prev.filter(f => f !== filePath)
        : [...prev, filePath]
    )
  }

  const selectAllFiles = () => {
    setSelectedFiles(files.map(f => f.path))
  }

  const clearSelection = () => {
    setSelectedFiles([])
  }

  const selectFeatureFiles = (featureId: string) => {
    const feature = features.find(f => f.id === featureId)
    if (feature) {
      setSelectedFiles(feature.files)
      setSelectedFeature(featureId)
    }
  }

  const runValidation = async () => {
    setLoading(true)
    try {
      const body: any = { action: 'validate_with_save' }
      
      // Add file selection if not scanning all
      if (scanMode === 'selected' && selectedFiles.length > 0) {
        body.targetFiles = selectedFiles
        body.scanMode = 'selected'
      } else if (scanMode === 'feature' && selectedFeature) {
        body.featureId = selectedFeature
        body.scanMode = 'feature'
      }

      const response = await fetch('/api/contract-validator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await response.json()
      console.log('Validation response:', data)
      
      if (data && data.summary) {
        setResult(data)
        loadStats()
        loadHistory()
      } else if (data.error) {
        console.error('API Error:', data.error)
        alert(`Scan failed: ${data.error}`)
      } else {
        console.error('Unexpected response format:', data)
        alert('Unexpected response from server')
      }
    } catch (error) {
      console.error('Validation failed:', error)
      alert('Validation request failed')
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

  // AI Fix a single issue
  const aiFixIssue = async (issueId: string) => {
    setAiFixingIssue(issueId)
    setAiFixResult(null)
    setShowAiFixDialog(true)
    try {
      const response = await fetch('/api/contract-validator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ai_fix_issue', issueId })
      })
      const data = await response.json()
      setAiFixResult(data)
      if (data.success && selectedScan) {
        await viewScanDetail(selectedScan.scanId)
      }
      loadStats()
    } catch (error: any) {
      setAiFixResult({ success: false, error: error.message, analysis: 'Network error' })
    } finally {
      setAiFixingIssue(null)
    }
  }

  // AI Fix all open issues sequentially
  const aiFixAll = async () => {
    if (!selectedScan?.issues?.length) return
    const openIssues = selectedScan.issues.filter((i: any) => i.status === 'open')
    if (openIssues.length === 0) return
    if (!confirm(`AI will analyze and fix ${openIssues.length} issues one by one. Continue?\n\nThis may take a few minutes.`)) return

    setApplyingAll(true)
    setAiFixAllProgress({ current: 0, total: openIssues.length, fixed: 0, skipped: 0 })

    let fixed = 0
    let skipped = 0
    for (let idx = 0; idx < openIssues.length; idx++) {
      const issue = openIssues[idx]
      setAiFixAllProgress({ current: idx + 1, total: openIssues.length, fixed, skipped })
    try {
      const response = await fetch('/api/contract-validator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ai_fix_issue', issueId: issue.id })
      })
      const data = await response.json()
      if (data.success) {
        if (data.fixApplied) fixed++
        else if (data.isFalsePositive) skipped++
      }
    } catch (e) {
      console.error(`AI Fix All failed for ${issue.id}:`, e)
      skipped++
    }
  }

    setAiFixAllProgress({ current: openIssues.length, total: openIssues.length, fixed, skipped })
    setApplyingAll(false)

    // Refresh
    if (selectedScan) {
      await viewScanDetail(selectedScan.scanId)
    }
    loadStats()
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

  const applyAllFixes = async () => {
    if (!selectedScan?.issues?.length) return
    const openIssues = selectedScan.issues.filter((i: any) => i.status === 'open')
    if (openIssues.length === 0) return
    if (!confirm(`Mark all ${openIssues.length} open issues as fixed?`)) return

    setApplyingAll(true)
    setAllFixProgress({ current: 0, total: openIssues.length })
    let fixed = 0

    for (const issue of openIssues) {
      try {
        const response = await fetch('/api/contract-validator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'fix_issue',
            issueId: issue.id,
            fixDescription: 'Batch fixed via Apply All Fixes'
          })
        })
        const data = await response.json()
        if (data.success) fixed++
      } catch (error) {
        console.error(`Failed to fix issue ${issue.id}:`, error)
      }
      setAllFixProgress({ current: fixed, total: openIssues.length })
    }

    setApplyingAll(false)
    setAllFixProgress({ current: 0, total: 0 })

    // Refresh scan detail and stats
    if (selectedScan) {
      await viewScanDetail(selectedScan.scanId)
    }
    loadStats()
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

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case 'api': return '🔌'
      case 'component': return '🧩'
      case 'hook': return '🪝'
      case 'lib': return '📚'
      case 'page': return '📄'
      default: return '📄'
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

  const filteredFiles = files.filter(file => 
    file.path.toLowerCase().includes(fileSearch.toLowerCase()) ||
    file.name.toLowerCase().includes(fileSearch.toLowerCase())
  )

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
          <TabsTrigger value="select">File Selection</TabsTrigger>
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
                  Use the <strong>File Selection</strong> tab to scan specific files or features.
                </p>
              </CardContent>
            </Card>
          )}

          {loading && (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="animate-pulse text-4xl mb-4">⏳</div>
                <p className="text-gray-600">
                  {scanMode === 'all' 
                    ? 'Scanning all API routes and frontend calls...' 
                    : `Scanning ${selectedFiles.length} selected files...`}
                </p>
                <p className="text-sm text-gray-500 mt-2">Results will be saved automatically</p>
              </CardContent>
            </Card>
          )}

          {result && result.summary && (
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
                    <div className="text-2xl font-bold">{result.summary?.totalEndpoints ?? 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-600">API Calls</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{result.summary?.totalCalls ?? 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-600">Total Issues</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{result.summary?.totalIssues ?? 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-600">Errors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{result.summary?.errors ?? 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-600">Warnings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">{result.summary?.warnings ?? 0}</div>
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

        {/* File Selection Tab */}
        <TabsContent value="select" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Scan Mode Selection */}
            <Card>
              <CardHeader>
                <CardTitle>🎯 Scan Mode</CardTitle>
                <CardDescription>Choose what to scan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="mode-all"
                      name="scanMode"
                      checked={scanMode === 'all'}
                      onChange={() => {
                        setScanMode('all')
                        setSelectedFiles([])
                        setSelectedFeature('')
                      }}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="mode-all" className="font-medium">
                      Scan All Files
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="mode-selected"
                      name="scanMode"
                      checked={scanMode === 'selected'}
                      onChange={() => setScanMode('selected')}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="mode-selected" className="font-medium">
                      Selected Files Only
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="mode-feature"
                      name="scanMode"
                      checked={scanMode === 'feature'}
                      onChange={() => setScanMode('feature')}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="mode-feature" className="font-medium">
                      By Feature
                    </Label>
                  </div>
                </div>

                {scanMode === 'selected' && (
                  <div className="pt-2 text-sm text-gray-600">
                    {selectedFiles.length} file(s) selected
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Feature Selection */}
            <Card className={scanMode !== 'feature' ? 'opacity-50' : ''}>
              <CardHeader>
                <CardTitle>📦 Select Feature</CardTitle>
                <CardDescription>Scan files related to a specific feature</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {features.map(feature => (
                  <div
                    key={feature.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedFeature === feature.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => scanMode === 'feature' && selectFeatureFiles(feature.id)}
                  >
                    <div className="font-medium">{feature.name}</div>
                    <div className="text-sm text-gray-600">{feature.description}</div>
                    <div className="text-xs text-gray-500 mt-1">{feature.files.length} files</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>⚡ Quick Actions</CardTitle>
                <CardDescription>Priority-based scanning</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    const recentFiles = files.filter(f => f.recentlyModified).map(f => f.path)
                    setSelectedFiles(recentFiles)
                    setScanMode('selected')
                  }}
                >
                  🕐 Scan Recently Modified
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    const errorFiles = files.filter(f => f.hasRecentErrors).map(f => f.path)
                    setSelectedFiles(errorFiles)
                    setScanMode('selected')
                  }}
                >
                  🔴 Scan Files with Errors
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    const apiFiles = files.filter(f => f.type === 'api').map(f => f.path)
                    setSelectedFiles(apiFiles)
                    setScanMode('selected')
                  }}
                >
                  🔌 Scan All API Routes
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    const componentFiles = files.filter(f => f.type === 'component').map(f => f.path)
                    setSelectedFiles(componentFiles)
                    setScanMode('selected')
                  }}
                >
                  🧩 Scan All Components
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* File List */}
          {(scanMode === 'selected' || scanMode === 'feature') && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>📁 Select Files to Scan</CardTitle>
                    <CardDescription>
                      Choose specific files or use quick actions above
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllFiles}>
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearSelection}>
                      Clear
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search */}
                <div className="mb-4">
                  <Input
                    placeholder="Search files..."
                    value={fileSearch}
                    onChange={(e) => setFileSearch(e.target.value)}
                    className="max-w-md"
                  />
                </div>

                {/* File List */}
                <ScrollArea className="h-96">
                  {loadingFiles ? (
                    <div className="text-center py-8 text-gray-500">Loading files...</div>
                  ) : filteredFiles.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No files found</div>
                  ) : (
                    <div className="space-y-1">
                      {filteredFiles.map((file) => (
                        <div
                          key={file.path}
                          className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                            selectedFiles.includes(file.path) 
                              ? 'bg-blue-50 border border-blue-200' 
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => toggleFileSelection(file.path)}
                        >
                          <Checkbox
                            checked={selectedFiles.includes(file.path)}
                            onCheckedChange={() => toggleFileSelection(file.path)}
                          />
                          <span className="text-lg">{getFileTypeIcon(file.type)}</span>
                          <span className="flex-1 truncate font-mono text-sm">{file.path}</span>
                          {file.hasRecentErrors && (
                            <Badge variant="destructive" className="text-xs">Error</Badge>
                          )}
                          {file.recentlyModified && (
                            <Badge variant="outline" className="text-xs">Recent</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {/* Selection Summary */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {selectedFiles.length} file(s) selected for scanning
                    </span>
                    <Button onClick={runValidation} disabled={loading || selectedFiles.length === 0}>
                      {loading ? 'Scanning...' : `Scan ${selectedFiles.length} Files`}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* All Files Mode Info */}
          {scanMode === 'all' && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-4">🌐</div>
                <h3 className="text-lg font-semibold mb-2">Full Codebase Scan</h3>
                <p className="text-gray-600 mb-4">
                  This will scan all API routes, components, hooks, and pages in the project.
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  For faster scanning, use the <strong>Selected Files</strong> or <strong>By Feature</strong> mode.
                </p>
                <Button onClick={runValidation} disabled={loading}>
                  {loading ? 'Scanning...' : 'Scan All Files'}
                </Button>
              </CardContent>
            </Card>
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
            onAiFix={aiFixIssue}
            onIgnore={ignoreIssue} 
            fixingIssue={fixingIssue}
            aiFixingIssue={aiFixingIssue}
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

              {/* Batch Actions Bar */}
              {selectedScan.issues?.filter((i: any) => i.status === 'open').length > 0 && (
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-blue-800">
                      {selectedScan.issues.filter((i: any) => i.status === 'open').length} open issues
                    </span>
                    {applyingAll && aiFixAllProgress.total > 0 && (
                      <span className="text-xs text-blue-600">
                        (AI: {aiFixAllProgress.current}/{aiFixAllProgress.total} — {aiFixAllProgress.fixed} fixed, {aiFixAllProgress.skipped} skipped)
                      </span>
                    )}
                    {!applyingAll && allFixProgress.total > 0 && (
                      <span className="text-xs text-blue-600">
                        ({allFixProgress.current}/{allFixProgress.total})
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={aiFixAll}
                      disabled={applyingAll}
                      className="bg-violet-600 hover:bg-violet-700 text-white"
                    >
                      {applyingAll ? `🤖 AI Fixing ${aiFixAllProgress.current}/${aiFixAllProgress.total}...` : '🤖 AI Fix All'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={applyAllFixes}
                      disabled={applyingAll}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {applyingAll ? `Marking ${allFixProgress.current}/${allFixProgress.total}...` : 'Mark All Fixed'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const openIssues = selectedScan.issues.filter((i: any) => i.status === 'open')
                        if (openIssues.length === 0) return
                        if (!confirm(`Ignore all ${openIssues.length} open issues?`)) return
                        for (const issue of openIssues) {
                          await ignoreIssue(issue.id)
                        }
                      }}
                      disabled={applyingAll}
                    >
                      Ignore All
                    </Button>
                  </div>
                </div>
              )}

              {/* All Fixed Banner */}
              {selectedScan.issues?.length > 0 && selectedScan.issues.every((i: any) => i.status !== 'open') && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <span className="text-green-600 text-lg">✅</span>
                  <span className="text-sm font-medium text-green-800">All issues resolved</span>
                </div>
              )}

              <Separator />

              <div>
                <h4 className="font-medium mb-3">
                  Issues ({selectedScan.issues?.length || 0})
                  {selectedScan.issues?.filter((i: any) => i.status === 'open').length > 0 && (
                    <span className="text-sm text-gray-500 font-normal ml-2">
                      — {selectedScan.issues.filter((i: any) => i.status === 'open').length} open
                    </span>
                  )}
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
                                onClick={() => aiFixIssue(issue.id)}
                                disabled={aiFixingIssue === issue.id}
                                className="bg-violet-600 hover:bg-violet-700 text-white border-violet-600"
                              >
                                {aiFixingIssue === issue.id ? '🤖 AI Fixing...' : '🤖 AI Fix'}
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
                          {issue.status === 'fixed' && issue.fixApplied && (
                            <div className="flex gap-2">
                              <Badge className="bg-green-100 text-green-800 border-green-200">
                                ✅ AI Fixed
                              </Badge>
                              {issue.fixDescription && (
                                <span className="text-xs text-gray-500 max-w-[200px] truncate" title={issue.fixDescription}>
                                  {issue.fixDescription}
                                </span>
                              )}
                            </div>
                          )}
                          {issue.status === 'ignored' && issue.fixDescription && (
                            <span className="text-xs text-gray-400 italic">
                              AI: {issue.fixDescription}
                            </span>
                          )}
                        </div>
                        <p className="text-sm">{issue.message}</p>
                        {issue.frontendFile && (
                          <p className="text-xs text-gray-500 mt-1 font-mono">
                            📱 {issue.frontendFile}{issue.frontendLine ? `:${issue.frontendLine}` : ''}
                          </p>
                        )}
                        {issue.suggestion && (
                          <p className="text-xs text-blue-600 mt-1">💡 {issue.suggestion}</p>
                        )}
                        {issue.fixDescription && (issue.status === 'fixed' || issue.status === 'ignored') && (
                          <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                            <span className="text-gray-500">AI Analysis: </span>
                            <span>{issue.fixDescription}</span>
                          </div>
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

      {/* AI Fix Result Dialog */}
      <Dialog open={showAiFixDialog} onOpenChange={setShowAiFixDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>🤖 AI Auto-Fix Result</DialogTitle>
            <DialogDescription>
              {aiFixingIssue ? 'AI is analyzing and fixing the issue...' : aiFixResult ? 'Fix analysis complete' : 'No result'}
            </DialogDescription>
          </DialogHeader>
          
          {aiFixingIssue && !aiFixResult && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="animate-spin text-4xl">🤖</div>
              <p className="text-gray-600">AI is reading source files, analyzing the issue, and preparing a fix...</p>
              <p className="text-xs text-gray-400">This typically takes 5-15 seconds per issue</p>
            </div>
          )}
          
          {aiFixResult && (
            <div className="space-y-4">
              {/* Status Badge */}
              <div className="flex items-center gap-3">
                {aiFixResult.success ? (
                  <>
                    {aiFixResult.isFalsePositive ? (
                      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                        False Positive
                      </Badge>
                    ) : aiFixResult.fixApplied ? (
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        Fix Applied to Code
                      </Badge>
                    ) : (
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                        Analysis Only (no code change)
                      </Badge>
                    )}
                  </>
                ) : (
                  <Badge className="bg-red-100 text-red-800 border-red-200">
                    Failed
                  </Badge>
                )}
                {aiFixResult.confidence && (
                  <span className="text-xs text-gray-500">
                    Confidence: {aiFixResult.confidence}
                  </span>
                )}
              </div>
              
              {/* AI Analysis */}
              <div className="p-4 bg-gray-50 border rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">AI Analysis</h4>
                <p className="text-sm text-gray-800">{aiFixResult.analysis}</p>
              </div>
              
              {/* File Modified */}
              {aiFixResult.file && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-800">File</h4>
                  <code className="text-xs text-blue-700 font-mono break-all">{aiFixResult.file}</code>
                </div>
              )}
              
              {/* Code Diff */}
              {aiFixResult.originalCode && aiFixResult.fixedCode && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Code Changes</h4>
                  <div className="space-y-2">
                    <div className="p-3 bg-red-50 border border-red-200 rounded">
                      <div className="text-xs font-medium text-red-700 mb-1">- Before</div>
                      <pre className="text-xs text-red-800 font-mono whitespace-pre-wrap overflow-x-auto">{aiFixResult.originalCode}</pre>
                    </div>
                    <div className="p-3 bg-green-50 border border-green-200 rounded">
                      <div className="text-xs font-medium text-green-700 mb-1">+ After</div>
                      <pre className="text-xs text-green-800 font-mono whitespace-pre-wrap overflow-x-auto">{aiFixResult.fixedCode}</pre>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Error */}
              {aiFixResult.error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="text-sm font-medium text-red-700">Error</h4>
                  <p className="text-sm text-red-800">{aiFixResult.error}</p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setShowAiFixDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Open Issues Tab component
function OpenIssuesTab({ onFix, onAiFix, onIgnore, fixingIssue, aiFixingIssue }: { 
  onFix: (id: string) => void, 
  onAiFix: (id: string) => void, 
  onIgnore: (id: string) => void,
  fixingIssue: string | null,
  aiFixingIssue: string | null,
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
                      onClick={() => { onAiFix(issue.id); setTimeout(loadIssues, 2000); }}
                      disabled={aiFixingIssue === issue.id}
                      className="bg-violet-600 hover:bg-violet-700 text-white border-violet-600"
                    >
                      {aiFixingIssue === issue.id ? '🤖 AI Fixing...' : '🤖 AI Fix'}
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
                {issue.fixDescription && (issue.status === 'fixed' || issue.status === 'ignored') && (
                  <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                    <span className="text-gray-500">AI: </span>
                    <span>{issue.fixDescription}</span>
                    {issue.fixApplied && <span className="ml-2 text-green-600">✅ Code fix applied</span>}
                  </div>
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
