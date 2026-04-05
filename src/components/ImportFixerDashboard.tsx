'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

interface ImportStats {
  totalImports: number
  validImports: number
  invalidImports: number
  unusedImports: number
  fixableImports: number
}

interface ImportIssue {
  id: string
  filePath: string
  importStatement: string
  importType: string
  source: string
  sourcePath: string
  isValid: boolean
  isUsed: boolean
  canBeFixed: boolean
  suggestedFix?: string
  confidence: number
  lineNumber?: number
  usageCount: number
}

interface ImportSuggestion {
  id: string
  filePath: string
  currentImport: string
  currentPath: string
  suggestedImport?: string
  suggestedPath: string
  reason: string
  impactLevel: string
  status: string
}

export function ImportFixerDashboard() {
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [fixing, setFixing] = useState(false)
  const [stats, setStats] = useState<ImportStats | null>(null)
  const [issues, setIssues] = useState<ImportIssue[]>([])
  const [pendingFixes, setPendingFixes] = useState<ImportSuggestion[]>([])
  const [selectedIssue, setSelectedIssue] = useState<ImportIssue | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [filter, setFilter] = useState<'all' | 'invalid' | 'unused' | 'fixable'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [statsRes, issuesRes, pendingRes] = await Promise.all([
        fetch('/api/import-analyzer?action=stats'),
        fetch('/api/import-analyzer?action=issues&limit=100'),
        fetch('/api/import-analyzer?action=pending-fixes&limit=50')
      ])

      const statsData = await statsRes.json()
      const issuesData = await issuesRes.json()
      const pendingData = await pendingRes.json()

      if (statsData.success) setStats(statsData.stats)
      if (issuesData.success) setIssues(issuesData.issues)
      if (pendingData.success) setPendingFixes(pendingData.pending)
    } catch (error) {
      console.error('Failed to load import data:', error)
    } finally {
      setLoading(false)
    }
  }

  const analyzeCodebase = async () => {
    setAnalyzing(true)
    try {
      const response = await fetch('/api/import-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze' })
      })
      const data = await response.json()
      
      if (data.success) {
        alert(`Analysis complete!\n\nTotal imports: ${data.totalImports}\nInvalid: ${data.invalidImports}\nUnused: ${data.unusedImports}\n\n${data.suggestions.length} suggestions generated`)
        loadData()
      }
    } catch (error) {
      console.error('Failed to analyze:', error)
    } finally {
      setAnalyzing(false)
    }
  }

  const applyFix = async (suggestionId: string) => {
    setFixing(true)
    try {
      const response = await fetch('/api/import-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply-fix',
          suggestionId
        })
      })
      const data = await response.json()
      
      if (data.success) {
        alert('Fix applied!')
        loadData()
      } else {
        alert(`Error: ${data.message}`)
      }
    } catch (error) {
      console.error('Failed to apply fix:', error)
    } finally {
      setFixing(false)
    }
  }

  const applyAllFixes = async () => {
    if (!confirm('Apply all pending import fixes? This will modify files.')) return

    setFixing(true)
    try {
      const response = await fetch('/api/import-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'apply-all-fixes' })
      })
      const data = await response.json()
      
      if (data.success) {
        alert(`Applied ${data.applied} fixes, ${data.failed} failed`)
        loadData()
      }
    } catch (error) {
      console.error('Failed to apply fixes:', error)
    } finally {
      setFixing(false)
    }
  }

  const dismissSuggestion = async (suggestionId: string) => {
    try {
      await fetch('/api/import-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dismiss-suggestion',
          suggestionId
        })
      })
      loadData()
    } catch (error) {
      console.error('Failed to dismiss:', error)
    }
  }

  const getReasonIcon = (reason: string) => {
    switch (reason) {
      case 'unused': return '🗑️'
      case 'typo': return '✏️'
      case 'wrong_path': return '🔀'
      case 'moved': return '📦'
      case 'renamed': return '🏷️'
      case 'better_alias': return '✨'
      default: return '❓'
    }
  }

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'unused': return 'Unused Import'
      case 'typo': return 'Typo in Path'
      case 'wrong_path': return 'Wrong Import Path'
      case 'moved': return 'Module Moved'
      case 'renamed': return 'Module Renamed'
      case 'better_alias': return 'Use Alias'
      default: return 'Unknown'
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredIssues = issues.filter(issue => {
    const matchesFilter = filter === 'all' ||
      (filter === 'invalid' && !issue.isValid) ||
      (filter === 'unused' && !issue.isUsed) ||
      (filter === 'fixable' && issue.canBeFixed)
    
    const matchesSearch = !searchQuery ||
      issue.filePath.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.importStatement.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesFilter && matchesSearch
  })

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-pulse text-4xl mb-4">📦</div>
        <p className="text-gray-600">Loading Import Analyzer...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">📦 Import Analyzer & Fixer</h2>
          <p className="text-gray-600 mt-1">
            Detect and fix import issues automatically
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>
            🔄 Refresh
          </Button>
          <Button onClick={analyzeCodebase} disabled={analyzing} className="bg-blue-600 hover:bg-blue-700">
            {analyzing ? '⏳ Analyzing...' : '🔍 Analyze Imports'}
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Total Imports</div>
              <div className="text-2xl font-bold">{stats.totalImports}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Valid</div>
              <div className="text-2xl font-bold text-green-600">{stats.validImports}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Invalid</div>
              <div className="text-2xl font-bold text-red-600">{stats.invalidImports}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Unused</div>
              <div className="text-2xl font-bold text-orange-600">{stats.unusedImports}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Fixable</div>
              <div className="text-2xl font-bold text-blue-600">{stats.fixableImports}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="issues">
        <TabsList>
          <TabsTrigger value="issues">Import Issues</TabsTrigger>
          <TabsTrigger value="suggestions">Fix Suggestions ({pendingFixes.length})</TabsTrigger>
        </TabsList>

        {/* Issues Tab */}
        <TabsContent value="issues" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 items-center">
            <Input
              placeholder="Search files or imports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <div className="flex gap-2">
              {(['all', 'invalid', 'unused', 'fixable'] as const).map(f => (
                <Button
                  key={f}
                  variant={filter === f ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Issues List */}
          <Card>
            <CardContent className="p-0">
              {filteredIssues.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {stats?.totalImports === 0 
                    ? 'Click "Analyze Imports" to scan your codebase'
                    : 'No issues match the current filter'}
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="divide-y">
                    {filteredIssues.map((issue) => (
                      <div
                        key={issue.id}
                        className="p-4 hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          setSelectedIssue(issue)
                          setShowDetailDialog(true)
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {!issue.isValid && (
                                <Badge className="bg-red-100 text-red-800">Invalid</Badge>
                              )}
                              {!issue.isUsed && (
                                <Badge className="bg-orange-100 text-orange-800">Unused</Badge>
                              )}
                              {issue.canBeFixed && (
                                <Badge className="bg-blue-100 text-blue-800">Fixable</Badge>
                              )}
                            </div>
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded block truncate">
                              {issue.importStatement}
                            </code>
                            <div className="text-xs text-gray-500 mt-1">
                              📄 {issue.filePath}
                              {issue.lineNumber && `:${issue.lineNumber}`}
                              {' • '}Usage: {issue.usageCount}
                            </div>
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

        {/* Suggestions Tab */}
        <TabsContent value="suggestions" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {pendingFixes.length} pending fix suggestions
            </div>
            {pendingFixes.length > 0 && (
              <Button onClick={applyAllFixes} disabled={fixing}>
                {fixing ? '⏳ Fixing...' : '✨ Apply All Fixes'}
              </Button>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              {pendingFixes.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No pending fix suggestions. Analyze imports to find issues.
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="divide-y">
                    {pendingFixes.map((suggestion) => (
                      <div key={suggestion.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">{getReasonIcon(suggestion.reason)}</span>
                              <span className="font-medium">{getReasonLabel(suggestion.reason)}</span>
                              <Badge className={getImpactColor(suggestion.impactLevel)}>
                                {suggestion.impactLevel} impact
                              </Badge>
                            </div>
                            
                            <div className="text-sm">
                              <div className="text-gray-500">Current:</div>
                              <code className="bg-gray-100 px-2 py-1 rounded block text-red-600 line-through">
                                {suggestion.currentImport}
                              </code>
                            </div>
                            
                            {suggestion.suggestedPath && (
                              <div className="text-sm mt-2">
                                <div className="text-gray-500">Suggested:</div>
                                <code className="bg-gray-100 px-2 py-1 rounded block text-green-600">
                                  {suggestion.suggestedPath}
                                </code>
                              </div>
                            )}
                            
                            <div className="text-xs text-gray-500 mt-2">
                              📄 {suggestion.filePath}
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            {suggestion.suggestedPath && (
                              <Button
                                size="sm"
                                onClick={() => applyFix(suggestion.id)}
                                disabled={fixing}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Apply
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => dismissSuggestion(suggestion.id)}
                            >
                              Dismiss
                            </Button>
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
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Details</DialogTitle>
            <DialogDescription>
              {selectedIssue?.filePath}
            </DialogDescription>
          </DialogHeader>

          {selectedIssue && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Status:</span>
                  <div className="flex gap-1 mt-1">
                    {selectedIssue.isValid ? (
                      <Badge className="bg-green-100 text-green-800">Valid</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">Invalid</Badge>
                    )}
                    {selectedIssue.isUsed ? (
                      <Badge className="bg-blue-100 text-blue-800">Used</Badge>
                    ) : (
                      <Badge className="bg-orange-100 text-orange-800">Unused</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Import Type:</span>
                  <Badge className="ml-2">{selectedIssue.importType}</Badge>
                </div>
              </div>

              <div>
                <span className="text-sm text-gray-600">Import Statement:</span>
                <pre className="mt-2 p-3 bg-gray-900 text-green-400 rounded-lg text-sm font-mono overflow-x-auto">
                  {selectedIssue.importStatement}
                </pre>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Source Path:</span>
                  <code className="block mt-1 bg-gray-100 px-2 py-1 rounded text-sm">
                    {selectedIssue.sourcePath}
                  </code>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Usage Count:</span>
                  <div className="mt-1 font-medium">{selectedIssue.usageCount}</div>
                </div>
              </div>

              {selectedIssue.suggestedFix && (
                <div>
                  <span className="text-sm text-gray-600">Suggested Fix:</span>
                  <pre className="mt-2 p-3 bg-green-900 text-green-400 rounded-lg text-sm font-mono overflow-x-auto">
                    {selectedIssue.suggestedFix}
                  </pre>
                </div>
              )}

              <div className="text-sm text-gray-600">
                Confidence: {Math.round(selectedIssue.confidence * 100)}%
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
