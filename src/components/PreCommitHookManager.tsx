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

interface HookConfig {
  id: string
  name: string
  description?: string
  isActive: boolean
  checkContracts: boolean
  checkTypes: boolean
  checkImports: boolean
  blockOnErrors: boolean
  blockOnWarnings: boolean
  autoFix: boolean
  includePatterns: string[]
  excludePatterns: string[]
  timesRun: number
  timesBlocked: number
  lastRunAt?: string
}

interface ExecutionHistory {
  id: string
  trigger: string
  filesChecked: number
  issuesFound: number
  errorsFound: number
  warningsFound: number
  passed: boolean
  blocked: boolean
  duration: number
  createdAt: string
  gitBranch?: string
}

interface HookStats {
  totalRuns: number
  totalBlocked: number
  totalIssues: number
  passRate: number
}

export function PreCommitHookManager() {
  const [loading, setLoading] = useState(true)
  const [installing, setInstalling] = useState(false)
  const [running, setRunning] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [config, setConfig] = useState<HookConfig | null>(null)
  const [history, setHistory] = useState<ExecutionHistory[]>([])
  const [stats, setStats] = useState<HookStats | null>(null)
  const [showConfigDialog, setShowConfigDialog] = useState(false)
  const [editConfig, setEditConfig] = useState<Partial<HookConfig>>({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [statusRes, configRes, historyRes, statsRes] = await Promise.all([
        fetch('/api/pre-commit-hook?action=status'),
        fetch('/api/pre-commit-hook?action=config'),
        fetch('/api/pre-commit-hook?action=history&limit=20'),
        fetch('/api/pre-commit-hook?action=stats')
      ])

      const statusData = await statusRes.json()
      const configData = await configRes.json()
      const historyData = await historyRes.json()
      const statsData = await statsRes.json()

      if (statusData.success) setIsInstalled(statusData.installed)
      if (configData.success) setConfig(configData.config)
      if (historyData.success) setHistory(historyData.history)
      if (statsData.success) setStats(statsData.stats)
    } catch (error) {
      console.error('Failed to load hook data:', error)
    } finally {
      setLoading(false)
    }
  }

  const installHook = async () => {
    setInstalling(true)
    try {
      const response = await fetch('/api/pre-commit-hook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'install',
          config: editConfig
        })
      })
      const data = await response.json()
      
      if (data.success) {
        alert(data.message)
        setIsInstalled(true)
        loadData()
      } else {
        alert(`Error: ${data.message}`)
      }
    } catch (error) {
      console.error('Failed to install hook:', error)
    } finally {
      setInstalling(false)
    }
  }

  const uninstallHook = async () => {
    if (!confirm('Are you sure you want to uninstall the pre-commit hook?')) return

    setInstalling(true)
    try {
      const response = await fetch('/api/pre-commit-hook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'uninstall' })
      })
      const data = await response.json()
      
      if (data.success) {
        alert(data.message)
        setIsInstalled(false)
      }
    } catch (error) {
      console.error('Failed to uninstall hook:', error)
    } finally {
      setInstalling(false)
    }
  }

  const runHookManually = async () => {
    setRunning(true)
    try {
      const response = await fetch('/api/pre-commit-hook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run',
          hookId: config?.id
        })
      })
      const data = await response.json()
      
      if (data.success) {
        alert(`Hook passed!\n\nFiles checked: ${data.result.filesChecked}\nIssues found: ${data.result.issuesFound}\nDuration: ${data.result.duration}ms`)
      } else {
        alert(`Hook blocked!\n\n${data.result?.output || 'Unknown error'}`)
      }
      loadData()
    } catch (error) {
      console.error('Failed to run hook:', error)
    } finally {
      setRunning(false)
    }
  }

  const updateConfig = async () => {
    if (!config) return

    try {
      await fetch('/api/pre-commit-hook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-config',
          hookId: config.id,
          config: editConfig
        })
      })
      
      setShowConfigDialog(false)
      loadData()
    } catch (error) {
      console.error('Failed to update config:', error)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const getTriggerIcon = (trigger: string) => {
    switch (trigger) {
      case 'commit': return '📤'
      case 'push': return '🚀'
      case 'pre-push': return '⏫'
      case 'manual': return '👤'
      default: return '❓'
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-pulse text-4xl mb-4">🪝</div>
        <p className="text-gray-600">Loading Pre-commit Hook Manager...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">🪝 Pre-commit Hook Manager</h2>
          <p className="text-gray-600 mt-1">
            Catch contract issues before they're committed
          </p>
        </div>
        <div className="flex gap-2">
          {isInstalled ? (
            <>
              <Button variant="outline" onClick={() => setShowConfigDialog(true)}>
                ⚙️ Configure
              </Button>
              <Button variant="outline" onClick={runHookManually} disabled={running}>
                {running ? '⏳ Running...' : '▶️ Run Manually'}
              </Button>
              <Button variant="destructive" onClick={uninstallHook} disabled={installing}>
                🗑️ Uninstall
              </Button>
            </>
          ) : (
            <Button onClick={installHook} disabled={installing} className="bg-blue-600 hover:bg-blue-700">
              {installing ? '⏳ Installing...' : '📥 Install Hook'}
            </Button>
          )}
        </div>
      </div>

      {/* Status Card */}
      <Card className={isInstalled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{isInstalled ? '✅' : '❌'}</span>
              <div>
                <div className="font-medium">
                  {isInstalled ? 'Pre-commit Hook Active' : 'No Pre-commit Hook Installed'}
                </div>
                <div className="text-sm text-gray-600">
                  {isInstalled 
                    ? 'Issues will be caught before each commit' 
                    : 'Install the hook to catch issues before commit'}
                </div>
              </div>
            </div>
            {config && (
              <div className="text-right">
                <div className="text-sm text-gray-600">Runs: {config.timesRun}</div>
                <div className="text-sm text-red-600">Blocked: {config.timesBlocked}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Total Runs</div>
              <div className="text-2xl font-bold">{stats.totalRuns}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Commits Blocked</div>
              <div className="text-2xl font-bold text-red-600">{stats.totalBlocked}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Issues Found</div>
              <div className="text-2xl font-bold">{stats.totalIssues}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Pass Rate</div>
              <div className="text-2xl font-bold text-green-600">{stats.passRate}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Current Configuration */}
      {config && isInstalled && (
        <Card>
          <CardHeader>
            <CardTitle>Current Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Checkbox checked={config.checkContracts} readOnly />
                <span className="text-sm">Check Contracts</span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={config.checkTypes} readOnly />
                <span className="text-sm">Check Types</span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={config.checkImports} readOnly />
                <span className="text-sm">Check Imports</span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={config.blockOnErrors} readOnly />
                <span className="text-sm">Block on Errors</span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={config.blockOnWarnings} readOnly />
                <span className="text-sm">Block on Warnings</span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={config.autoFix} readOnly />
                <span className="text-sm">Auto-fix Issues</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Execution History */}
      <Card>
        <CardHeader>
          <CardTitle>Execution History</CardTitle>
          <CardDescription>Recent pre-commit hook runs</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No execution history yet. Run the hook to see results.
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {history.map((exec) => (
                  <div key={exec.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getTriggerIcon(exec.trigger)}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">{exec.trigger}</span>
                          {exec.passed ? (
                            <Badge className="bg-green-100 text-green-800">Passed</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">Failed</Badge>
                          )}
                          {exec.blocked && (
                            <Badge variant="destructive">Blocked</Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {exec.filesChecked} files • {exec.issuesFound} issues • {formatDuration(exec.duration)}
                          {exec.gitBranch && ` • ${exec.gitBranch}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(exec.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Configuration Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Configure Pre-commit Hook</DialogTitle>
            <DialogDescription>
              Customize what the hook checks and how it behaves
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="font-medium">Checks</div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={editConfig.checkContracts ?? config?.checkContracts ?? true}
                    onCheckedChange={(checked) => setEditConfig(prev => ({ ...prev, checkContracts: !!checked }))}
                  />
                  <span className="text-sm">Check API Contracts</span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={editConfig.checkTypes ?? config?.checkTypes ?? true}
                    onCheckedChange={(checked) => setEditConfig(prev => ({ ...prev, checkTypes: !!checked }))}
                  />
                  <span className="text-sm">Check Type Safety</span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={editConfig.checkImports ?? config?.checkImports ?? true}
                    onCheckedChange={(checked) => setEditConfig(prev => ({ ...prev, checkImports: !!checked }))}
                  />
                  <span className="text-sm">Check Imports</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-medium">Blocking Behavior</div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={editConfig.blockOnErrors ?? config?.blockOnErrors ?? true}
                    onCheckedChange={(checked) => setEditConfig(prev => ({ ...prev, blockOnErrors: !!checked }))}
                  />
                  <span className="text-sm">Block commits with errors</span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={editConfig.blockOnWarnings ?? config?.blockOnWarnings ?? false}
                    onCheckedChange={(checked) => setEditConfig(prev => ({ ...prev, blockOnWarnings: !!checked }))}
                  />
                  <span className="text-sm">Block commits with warnings</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-medium">Auto-fix</div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={editConfig.autoFix ?? config?.autoFix ?? false}
                  onCheckedChange={(checked) => setEditConfig(prev => ({ ...prev, autoFix: !!checked }))}
                />
                <span className="text-sm">Automatically fix issues when possible</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
              Cancel
            </Button>
            <Button onClick={updateConfig} className="bg-blue-600 hover:bg-blue-700">
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
