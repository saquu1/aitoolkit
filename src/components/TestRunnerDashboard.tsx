'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'

interface GeneratedTest {
  id?: string
  testName: string
  testType: string
  description: string
  endpointPath?: string
  testCode: string
  testFilePath: string
  status?: string
  runCount?: number
  passCount?: number
  failCount?: number
}

interface TestStats {
  total: number
  byType: Record<string, number>
  byStatus: Record<string, number>
  savedCount: number
  passedCount: number
  failedCount: number
}

export function TestRunnerDashboard() {
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [scanId, setScanId] = useState('')
  const [tests, setTests] = useState<GeneratedTest[]>([])
  const [stats, setStats] = useState<TestStats | null>(null)
  const [selectedTest, setSelectedTest] = useState<GeneratedTest | null>(null)
  const [showTestDialog, setShowTestDialog] = useState(false)
  const [selectedTests, setSelectedTests] = useState<string[]>([])

  useEffect(() => {
    if (scanId) {
      loadTests()
    }
  }, [scanId])

  const loadTests = async () => {
    if (!scanId) return

    setLoading(true)
    try {
      const [testsRes, statsRes] = await Promise.all([
        fetch(`/api/test-generator?action=tests&scanId=${scanId}`),
        fetch(`/api/test-generator?action=stats&scanId=${scanId}`)
      ])

      const testsData = await testsRes.json()
      const statsData = await statsRes.json()

      if (testsData.success) setTests(testsData.tests)
      if (statsData.success) setStats(statsData.stats)
    } catch (error) {
      console.error('Failed to load tests:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateContractTests = async () => {
    if (!scanId) {
      const newScanId = `TEST-${Date.now()}`
      setScanId(newScanId)
    }

    setGenerating(true)
    try {
      const response = await fetch('/api/test-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-contracts',
          scanId: scanId || `TEST-${Date.now()}`
        })
      })
      const data = await response.json()
      
      if (data.success) {
        setTests(data.tests)
        alert(`Generated ${data.count} contract tests!`)
        loadTests()
      }
    } catch (error) {
      console.error('Failed to generate tests:', error)
    } finally {
      setGenerating(false)
    }
  }

  const generateTestsFromIssues = async () => {
    if (!scanId) return

    setGenerating(true)
    try {
      const response = await fetch('/api/test-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-from-issues',
          scanId
        })
      })
      const data = await response.json()
      
      if (data.success) {
        alert(`Generated ${data.count} regression tests from issues!`)
        loadTests()
      }
    } catch (error) {
      console.error('Failed to generate tests from issues:', error)
    } finally {
      setGenerating(false)
    }
  }

  const saveTestsToFilesystem = async () => {
    const testsToSave = tests.filter(t => selectedTests.includes(t.testName))
    if (testsToSave.length === 0) {
      alert('Please select tests to save')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/test-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-tests',
          tests: testsToSave
        })
      })
      const data = await response.json()
      
      if (data.success) {
        alert(`Saved ${data.saved} test files!`)
        if (data.errors.length > 0) {
          console.error('Errors:', data.errors)
        }
        loadTests()
      }
    } catch (error) {
      console.error('Failed to save tests:', error)
    } finally {
      setSaving(false)
    }
  }

  const toggleTestSelection = (testName: string) => {
    setSelectedTests(prev =>
      prev.includes(testName)
        ? prev.filter(t => t !== testName)
        : [...prev, testName]
    )
  }

  const selectAllTests = () => {
    setSelectedTests(tests.map(t => t.testName))
  }

  const clearSelection = () => {
    setSelectedTests([])
  }

  const getTestTypeIcon = (type: string) => {
    switch (type) {
      case 'contract': return '📋'
      case 'integration': return '🔗'
      case 'unit': return '🔬'
      case 'e2e': return '🎭'
      default: return '🧪'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'saved': return 'bg-blue-100 text-blue-800'
      case 'generated': return 'bg-gray-100 text-gray-800'
      case 'skipped': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">🧪 Contract Test Generator</h2>
          <p className="text-gray-600 mt-1">
            Generate and manage contract tests to prevent regressions
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Input
            placeholder="Scan ID"
            value={scanId}
            onChange={(e) => setScanId(e.target.value)}
            className="w-48"
          />
          <Button variant="outline" onClick={loadTests} disabled={loading || !scanId}>
            Load
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Total Tests</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Saved</div>
              <div className="text-2xl font-bold text-blue-600">{stats.savedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Passed</div>
              <div className="text-2xl font-bold text-green-600">{stats.passedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Failed</div>
              <div className="text-2xl font-bold text-red-600">{stats.failedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Contract</div>
              <div className="text-2xl font-bold">{stats.byType['contract'] || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Integration</div>
              <div className="text-2xl font-bold">{stats.byType['integration'] || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={generateContractTests}
          disabled={generating}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {generating ? '⏳ Generating...' : '📋 Generate Contract Tests'}
        </Button>
        <Button
          variant="outline"
          onClick={generateTestsFromIssues}
          disabled={generating || !scanId}
        >
          ⚠️ Generate from Issues
        </Button>
        <Button
          variant="outline"
          onClick={saveTestsToFilesystem}
          disabled={saving || selectedTests.length === 0}
        >
          {saving ? '⏳ Saving...' : `💾 Save Selected (${selectedTests.length})`}
        </Button>
      </div>

      <Tabs defaultValue="tests">
        <TabsList>
          <TabsTrigger value="tests">Generated Tests</TabsTrigger>
          <TabsTrigger value="runs">Test Runs</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
        </TabsList>

        {/* Tests Tab */}
        <TabsContent value="tests" className="space-y-4">
          {tests.length === 0 ? (
            <Card className="bg-gray-50 border-dashed">
              <CardContent className="p-8 text-center">
                <div className="text-4xl mb-4">🧪</div>
                <p className="text-gray-600 mb-4">
                  No tests generated yet. Click "Generate Contract Tests" to create tests from API endpoints.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {tests.length} test(s) • {selectedTests.length} selected
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAllTests}>
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    Clear
                  </Button>
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="h-[500px]">
                    <div className="divide-y">
                      {tests.map((test) => (
                        <div
                          key={test.testName}
                          className="p-4 hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            setSelectedTest(test)
                            setShowTestDialog(true)
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={selectedTests.includes(test.testName)}
                              onCheckedChange={() => toggleTestSelection(test.testName)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span>{getTestTypeIcon(test.testType)}</span>
                                <span className="font-medium">{test.testName}</span>
                                {test.status && (
                                  <Badge className={getStatusColor(test.status)}>
                                    {test.status}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">{test.description}</p>
                              {test.endpointPath && (
                                <p className="text-xs text-gray-500 mt-1 font-mono">
                                  {test.endpointPath}
                                </p>
                              )}
                              {(test.runCount || 0) > 0 && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Runs: {test.runCount} • 
                                  <span className="text-green-600"> ✓{test.passCount}</span> •
                                  <span className="text-red-600"> ✗{test.failCount}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Runs Tab */}
        <TabsContent value="runs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Run History</CardTitle>
              <CardDescription>View past test execution results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center p-8 text-gray-500">
                Run tests to see execution history here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contracts Tab */}
        <TabsContent value="contracts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contract Definitions</CardTitle>
              <CardDescription>API contracts used for validation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center p-8 text-gray-500">
                Contracts will appear here after generation
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Test Detail Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{getTestTypeIcon(selectedTest?.testType || '')}</span>
              {selectedTest?.testName}
            </DialogTitle>
            <DialogDescription>
              {selectedTest?.description}
            </DialogDescription>
          </DialogHeader>

          {selectedTest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Type:</span>
                  <Badge className="ml-2">{selectedTest.testType}</Badge>
                </div>
                {selectedTest.status && (
                  <div>
                    <span className="text-sm text-gray-600">Status:</span>
                    <Badge className={`ml-2 ${getStatusColor(selectedTest.status)}`}>
                      {selectedTest.status}
                    </Badge>
                  </div>
                )}
              </div>

              {selectedTest.endpointPath && (
                <div>
                  <span className="text-sm text-gray-600">Endpoint:</span>
                  <code className="ml-2 text-sm bg-gray-100 px-2 py-1 rounded">
                    {selectedTest.endpointPath}
                  </code>
                </div>
              )}

              <div>
                <span className="text-sm text-gray-600">File Path:</span>
                <code className="ml-2 text-sm bg-gray-100 px-2 py-1 rounded block mt-1">
                  {selectedTest.testFilePath}
                </code>
              </div>

              <div>
                <span className="text-sm text-gray-600 font-medium">Generated Test Code:</span>
                <pre className="mt-2 p-4 bg-gray-900 text-green-400 rounded-lg overflow-x-auto text-sm font-mono max-h-[400px]">
                  {selectedTest.testCode}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
