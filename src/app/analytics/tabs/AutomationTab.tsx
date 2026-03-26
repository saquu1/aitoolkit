'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger 
} from '@/components/ui/dialog'
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import {
  Tag, Upload, Clock, Plus, Trash2, Play, Pause, Settings,
  FileJson, Mail, Calendar, CheckCircle, XCircle, AlertCircle,
  Zap, RefreshCw, Download, Eye, Edit, ChevronRight, History
} from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'

// =============================================================================
// TYPES
// =============================================================================

interface TaggingRule {
  id: string
  name: string
  description: string
  conditions: TaggingCondition[]
  tags: string[]
  isActive: boolean
  matchCount: number
  lastMatched?: Date
  createdAt: Date
}

interface TaggingCondition {
  field: 'title' | 'content' | 'category' | 'model' | 'tokens'
  operator: 'contains' | 'equals' | 'greater_than' | 'less_than' | 'regex'
  value: string
}

interface ImportJob {
  id: string
  name: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  totalItems: number
  processedItems: number
  errors: string[]
  createdAt: Date
  completedAt?: Date
}

interface ImportResult {
  sessionsImported: number
  issuesExtracted: number
  featuresExtracted: number
  patternsDetected: number
  totalTokens: number
  totalCost: number
}

interface ScheduledReport {
  id: string
  name: string
  type: 'daily' | 'weekly' | 'monthly'
  schedule: string
  recipients: string[]
  isActive: boolean
  lastRun?: Date
  nextRun?: Date
  format: 'pdf' | 'html' | 'json'
  includeSections: string[]
  createdAt: Date
}

interface ReportHistory {
  id: string
  reportId: string
  reportName: string
  type: string
  generatedAt: Date
  status: 'success' | 'failed'
  size?: number
  downloadUrl?: string
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AutomationTab() {
  const [activeSection, setActiveSection] = useState<'tagging' | 'import' | 'scheduled'>('tagging')
  const { toast } = useToast()

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 pr-4">
        {/* Section Tabs */}
        <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tagging" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Auto-Tagging (F17)
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Batch Import (F18)
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Scheduled Reports (F19)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tagging" className="mt-4">
            <AutoTaggingSection />
          </TabsContent>
          
          <TabsContent value="import" className="mt-4">
            <BatchImportSection />
          </TabsContent>
          
          <TabsContent value="scheduled" className="mt-4">
            <ScheduledReportsSection />
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  )
}

// =============================================================================
// F17: AUTO-TAGGING SYSTEM
// =============================================================================

function AutoTaggingSection() {
  const [rules, setRules] = useState<TaggingRule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const { toast } = useToast()

  // Form state for new rule
  const [newRule, setNewRule] = useState<Partial<TaggingRule>>({
    name: '',
    description: '',
    conditions: [{ field: 'title', operator: 'contains', value: '' }],
    tags: [],
    isActive: true
  })
  const [newTag, setNewTag] = useState('')

  useEffect(() => {
    fetchRules()
  }, [])

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/analytics/automation?action=tagging-rules')
      const data = await res.json()
      if (data.success) {
        setRules(data.rules || [])
      }
    } catch (error) {
      console.error('Failed to fetch tagging rules:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      const res = await fetch('/api/analytics/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle-tagging-rule', ruleId, isActive })
      })
      const data = await res.json()
      if (data.success) {
        setRules(prev => prev.map(r => r.id === ruleId ? { ...r, isActive } : r))
        toast({ title: isActive ? 'Rule activated' : 'Rule deactivated' })
      }
    } catch (error) {
      toast({ title: 'Failed to update rule', variant: 'destructive' })
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const res = await fetch('/api/analytics/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-tagging-rule', ruleId })
      })
      const data = await res.json()
      if (data.success) {
        setRules(prev => prev.filter(r => r.id !== ruleId))
        toast({ title: 'Rule deleted' })
      }
    } catch (error) {
      toast({ title: 'Failed to delete rule', variant: 'destructive' })
    }
  }

  const handleCreateRule = async () => {
    if (!newRule.name || !newRule.conditions?.length || !newRule.tags?.length) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' })
      return
    }

    try {
      const res = await fetch('/api/analytics/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-tagging-rule', rule: newRule })
      })
      const data = await res.json()
      if (data.success) {
        setRules(prev => [data.rule, ...prev])
        setIsCreateDialogOpen(false)
        setNewRule({
          name: '',
          description: '',
          conditions: [{ field: 'title', operator: 'contains', value: '' }],
          tags: [],
          isActive: true
        })
        toast({ title: 'Tagging rule created' })
      }
    } catch (error) {
      toast({ title: 'Failed to create rule', variant: 'destructive' })
    }
  }

  const handleRunTagging = async () => {
    try {
      const res = await fetch('/api/analytics/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run-auto-tagging' })
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: `Tagged ${data.taggedCount} sessions` })
        fetchRules()
      }
    } catch (error) {
      toast({ title: 'Failed to run auto-tagging', variant: 'destructive' })
    }
  }

  const addCondition = () => {
    setNewRule(prev => ({
      ...prev,
      conditions: [...(prev.conditions || []), { field: 'title', operator: 'contains', value: '' }]
    }))
  }

  const removeCondition = (index: number) => {
    setNewRule(prev => ({
      ...prev,
      conditions: prev.conditions?.filter((_, i) => i !== index)
    }))
  }

  const addTag = () => {
    if (newTag && !newRule.tags?.includes(newTag)) {
      setNewRule(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag]
      }))
      setNewTag('')
    }
  }

  const removeTag = (tag: string) => {
    setNewRule(prev => ({
      ...prev,
      tags: prev.tags?.filter(t => t !== tag)
    }))
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Auto-Tagging Rules
              </CardTitle>
              <CardDescription>
                Automatically tag sessions based on content patterns
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRunTagging}>
                <Zap className="h-4 w-4 mr-2" />
                Run Now
              </Button>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Rule
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Tagging Rule</DialogTitle>
                    <DialogDescription>
                      Define conditions for automatic session tagging
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="rule-name">Rule Name</Label>
                      <Input
                        id="rule-name"
                        value={newRule.name}
                        onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., High-cost sessions"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Description</Label>
                      <Input
                        value={newRule.description}
                        onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Brief description of this rule"
                      />
                    </div>
                    
                    {/* Conditions */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Conditions</Label>
                        <Button variant="outline" size="sm" onClick={addCondition}>
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </div>
                      {newRule.conditions?.map((condition, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <Select
                            value={condition.field}
                            onValueChange={(v) => {
                              const newConditions = [...(newRule.conditions || [])]
                              newConditions[index] = { ...condition, field: v as any }
                              setNewRule(prev => ({ ...prev, conditions: newConditions }))
                            }}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="title">Title</SelectItem>
                              <SelectItem value="content">Content</SelectItem>
                              <SelectItem value="category">Category</SelectItem>
                              <SelectItem value="model">Model</SelectItem>
                              <SelectItem value="tokens">Tokens</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select
                            value={condition.operator}
                            onValueChange={(v) => {
                              const newConditions = [...(newRule.conditions || [])]
                              newConditions[index] = { ...condition, operator: v as any }
                              setNewRule(prev => ({ ...prev, conditions: newConditions }))
                            }}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="contains">Contains</SelectItem>
                              <SelectItem value="equals">Equals</SelectItem>
                              <SelectItem value="greater_than">Greater Than</SelectItem>
                              <SelectItem value="less_than">Less Than</SelectItem>
                              <SelectItem value="regex">Regex</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            value={condition.value}
                            onChange={(e) => {
                              const newConditions = [...(newRule.conditions || [])]
                              newConditions[index] = { ...condition, value: e.target.value }
                              setNewRule(prev => ({ ...prev, conditions: newConditions }))
                            }}
                            placeholder="Value"
                            className="flex-1"
                          />
                          {newRule.conditions && newRule.conditions.length > 1 && (
                            <Button variant="ghost" size="sm" onClick={() => removeCondition(index)}>
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                      <Label>Tags to Apply</Label>
                      <div className="flex gap-2">
                        <Input
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="Enter tag"
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        />
                        <Button variant="outline" onClick={addTag}>Add</Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {newRule.tags?.map(tag => (
                          <Badge key={tag} variant="secondary" className="gap-1">
                            {tag}
                            <XCircle className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateRule}>Create Rule</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-8">
              <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No tagging rules created yet</p>
              <p className="text-xs text-muted-foreground mt-2">
                Create rules to automatically tag sessions based on patterns
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Switch
                      checked={rule.isActive}
                      onCheckedChange={(checked) => handleToggleRule(rule.id, checked)}
                    />
                    <div>
                      <p className="font-medium">{rule.name}</p>
                      <p className="text-sm text-muted-foreground">{rule.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {rule.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">{rule.matchCount} matches</p>
                      <p className="text-xs text-muted-foreground">
                        {rule.lastMatched ? `Last: ${new Date(rule.lastMatched).toLocaleDateString()}` : 'Never matched'}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteRule(rule.id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tag Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tag Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <TagStatistics />
        </CardContent>
      </Card>
    </div>
  )
}

function TagStatistics() {
  const [stats, setStats] = useState<{ tag: string; count: number; trend: number }[]>([])

  useEffect(() => {
    fetch('/api/analytics/automation?action=tag-statistics')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStats(data.stats || [])
        }
      })
      .catch(console.error)
  }, [])

  if (stats.length === 0) {
    return <p className="text-muted-foreground text-sm">No tag statistics available</p>
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.slice(0, 8).map(stat => (
        <div key={stat.tag} className="p-3 rounded-lg border">
          <div className="flex items-center justify-between">
            <Badge variant="secondary">{stat.tag}</Badge>
            {stat.trend !== 0 && (
              <span className={`text-xs ${stat.trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {stat.trend > 0 ? '+' : ''}{stat.trend}%
              </span>
            )}
          </div>
          <p className="text-2xl font-bold mt-2">{stat.count}</p>
          <p className="text-xs text-muted-foreground">sessions</p>
        </div>
      ))}
    </div>
  )
}

// =============================================================================
// F18: BATCH IMPORT
// =============================================================================

function BatchImportSection() {
  const [importJobs, setImportJobs] = useState<ImportJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const { toast } = useToast()

  // Import form state
  const [importSource, setImportSource] = useState<'file' | 'paste' | 'api'>('file')
  const [importData, setImportData] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    fetchImportJobs()
  }, [])

  const fetchImportJobs = async () => {
    try {
      const res = await fetch('/api/analytics/automation?action=import-jobs')
      const data = await res.json()
      if (data.success) {
        setImportJobs(data.jobs || [])
      }
    } catch (error) {
      console.error('Failed to fetch import jobs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleImport = async () => {
    setIsImporting(true)
    setImportProgress(0)
    setImportResult(null)

    try {
      let dataToImport: any[] = []

      if (importSource === 'file' && selectedFile) {
        const text = await selectedFile.text()
        dataToImport = JSON.parse(text)
        if (!Array.isArray(dataToImport)) {
          dataToImport = [dataToImport]
        }
      } else if (importSource === 'paste' && importData) {
        dataToImport = JSON.parse(importData)
        if (!Array.isArray(dataToImport)) {
          dataToImport = [dataToImport]
        }
      }

      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const res = await fetch('/api/analytics/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'batch-import', 
          sessions: dataToImport 
        })
      })

      clearInterval(progressInterval)
      setImportProgress(100)

      const data = await res.json()
      if (data.success) {
        setImportResult(data.result)
        toast({ title: `Imported ${data.result.sessionsImported} sessions` })
        fetchImportJobs()
      } else {
        throw new Error(data.error || 'Import failed')
      }
    } catch (error) {
      toast({ 
        title: 'Import failed', 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive' 
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleExportTemplate = () => {
    const template = [
      {
        chatId: 'example-chat-id',
        title: 'Example Session',
        category: 'feature',
        model: 'claude-3-sonnet',
        messages: [
          { role: 'user', content: 'Example user message' },
          { role: 'assistant', content: 'Example assistant response' }
        ]
      }
    ]
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'import-template.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-4">
      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Sessions</DialogTitle>
            <DialogDescription>
              Import AI chat sessions from JSON files or paste data directly
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Import Source Selection */}
            <div className="flex gap-2">
              <Button 
                variant={importSource === 'file' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setImportSource('file')}
              >
                <FileJson className="h-4 w-4 mr-2" />
                File Upload
              </Button>
              <Button 
                variant={importSource === 'paste' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setImportSource('paste')}
              >
                <Edit className="h-4 w-4 mr-2" />
                Paste JSON
              </Button>
            </div>

            {importSource === 'file' ? (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop or click to upload
                </p>
                <Input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <Button variant="outline" asChild>
                    <span>Select File</span>
                  </Button>
                </Label>
                {selectedFile && (
                  <p className="text-sm mt-2">{selectedFile.name}</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Paste JSON Data</Label>
                <textarea
                  className="w-full h-48 p-3 rounded-lg border font-mono text-sm"
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  placeholder='[{"chatId": "...", "messages": [...]}]'
                />
              </div>
            )}

            {/* Import Progress */}
            {isImporting && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Importing...</span>
                  <span>{importProgress}%</span>
                </div>
                <Progress value={importProgress} />
              </div>
            )}

            {/* Import Result */}
            {importResult && (
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Import Complete</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Sessions</p>
                      <p className="font-bold">{importResult.sessionsImported}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Issues</p>
                      <p className="font-bold">{importResult.issuesExtracted}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Features</p>
                      <p className="font-bold">{importResult.featuresExtracted}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Patterns</p>
                      <p className="font-bold">{importResult.patternsDetected}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tokens</p>
                      <p className="font-bold">{importResult.totalTokens.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cost</p>
                      <p className="font-bold">${importResult.totalCost.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleExportTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Template
            </Button>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={handleImport} disabled={isImporting}>
              {isImporting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Batch Import
              </CardTitle>
              <CardDescription>
                Import multiple AI chat sessions at once
              </CardDescription>
            </div>
            <Button onClick={() => setIsImportDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Import
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {importJobs.length === 0 ? (
            <div className="text-center py-8">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No import history</p>
              <p className="text-xs text-muted-foreground mt-2">
                Import sessions to extract analytics data automatically
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {importJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    {job.status === 'completed' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : job.status === 'failed' ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : job.status === 'processing' ? (
                      <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium">{job.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {job.processedItems} / {job.totalItems} items
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Progress value={(job.processedItems / job.totalItems) * 100} className="w-24" />
                    <Badge variant={
                      job.status === 'completed' ? 'default' :
                      job.status === 'failed' ? 'destructive' : 'secondary'
                    }>
                      {job.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Format Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Import Format Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <pre className="text-xs overflow-auto">
{`{
  "chatId": "unique-chat-id",
  "title": "Session Title",
  "category": "feature|bug_fix|refactor|architecture|documentation",
  "model": "claude-3-sonnet|gpt-4|...",
  "sessionDate": "2024-01-15T10:30:00Z",
  "messages": [
    { "role": "user", "content": "User message" },
    { "role": "assistant", "content": "Assistant response" }
  ]
}`}
              </pre>
            </div>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Auto-extract issues
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Auto-detect patterns
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Calculate costs
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================================
// F19: SCHEDULED REPORTS
// =============================================================================

function ScheduledReportsSection() {
  const [reports, setReports] = useState<ScheduledReport[]>([])
  const [history, setHistory] = useState<ReportHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const { toast } = useToast()

  // New report form state
  const [newReport, setNewReport] = useState<Partial<ScheduledReport>>({
    name: '',
    type: 'weekly',
    schedule: '0 9 * * 1', // Every Monday at 9 AM
    recipients: [],
    isActive: true,
    format: 'pdf',
    includeSections: ['summary', 'issues', 'patterns', 'recommendations']
  })
  const [newRecipient, setNewRecipient] = useState('')

  useEffect(() => {
    fetchReports()
    fetchHistory()
  }, [])

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/analytics/automation?action=scheduled-reports')
      const data = await res.json()
      if (data.success) {
        setReports(data.reports || [])
      }
    } catch (error) {
      console.error('Failed to fetch scheduled reports:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/analytics/automation?action=report-history')
      const data = await res.json()
      if (data.success) {
        setHistory(data.history || [])
      }
    } catch (error) {
      console.error('Failed to fetch report history:', error)
    }
  }

  const handleToggleReport = async (reportId: string, isActive: boolean) => {
    try {
      const res = await fetch('/api/analytics/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle-scheduled-report', reportId, isActive })
      })
      const data = await res.json()
      if (data.success) {
        setReports(prev => prev.map(r => r.id === reportId ? { ...r, isActive } : r))
        toast({ title: isActive ? 'Report activated' : 'Report paused' })
      }
    } catch (error) {
      toast({ title: 'Failed to update report', variant: 'destructive' })
    }
  }

  const handleDeleteReport = async (reportId: string) => {
    try {
      const res = await fetch('/api/analytics/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-scheduled-report', reportId })
      })
      const data = await res.json()
      if (data.success) {
        setReports(prev => prev.filter(r => r.id !== reportId))
        toast({ title: 'Report deleted' })
      }
    } catch (error) {
      toast({ title: 'Failed to delete report', variant: 'destructive' })
    }
  }

  const handleRunNow = async (reportId: string) => {
    try {
      toast({ title: 'Generating report...' })
      const res = await fetch('/api/analytics/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run-scheduled-report', reportId })
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Report generated and sent' })
        fetchHistory()
      }
    } catch (error) {
      toast({ title: 'Failed to generate report', variant: 'destructive' })
    }
  }

  const handleCreateReport = async () => {
    if (!newReport.name || !newReport.recipients?.length) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' })
      return
    }

    try {
      const res = await fetch('/api/analytics/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-scheduled-report', report: newReport })
      })
      const data = await res.json()
      if (data.success) {
        setReports(prev => [data.report, ...prev])
        setIsCreateDialogOpen(false)
        setNewReport({
          name: '',
          type: 'weekly',
          schedule: '0 9 * * 1',
          recipients: [],
          isActive: true,
          format: 'pdf',
          includeSections: ['summary', 'issues', 'patterns', 'recommendations']
        })
        toast({ title: 'Scheduled report created' })
      }
    } catch (error) {
      toast({ title: 'Failed to create report', variant: 'destructive' })
    }
  }

  const addRecipient = () => {
    if (newRecipient && !newReport.recipients?.includes(newRecipient)) {
      setNewReport(prev => ({
        ...prev,
        recipients: [...(prev.recipients || []), newRecipient]
      }))
      setNewRecipient('')
    }
  }

  const removeRecipient = (email: string) => {
    setNewReport(prev => ({
      ...prev,
      recipients: prev.recipients?.filter(r => r !== email)
    }))
  }

  const getScheduleDescription = (schedule: string) => {
    if (schedule === '0 9 * * 1') return 'Every Monday at 9:00 AM'
    if (schedule === '0 9 * * *') return 'Every day at 9:00 AM'
    if (schedule === '0 9 1 * *') return 'First of every month at 9:00 AM'
    return schedule
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Scheduled Reports
              </CardTitle>
              <CardDescription>
                Automate report generation and delivery
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Schedule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Scheduled Report</DialogTitle>
                  <DialogDescription>
                    Set up automated report generation and email delivery
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="report-name">Report Name</Label>
                    <Input
                      id="report-name"
                      value={newReport.name}
                      onChange={(e) => setNewReport(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Weekly AI Analytics"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Report Type</Label>
                    <Select
                      value={newReport.type}
                      onValueChange={(v) => setNewReport(prev => ({ ...prev, type: v as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Schedule (Cron)</Label>
                    <Select
                      value={newReport.schedule}
                      onValueChange={(v) => setNewReport(prev => ({ ...prev, schedule: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0 9 * * *">Every day at 9:00 AM</SelectItem>
                        <SelectItem value="0 9 * * 1">Every Monday at 9:00 AM</SelectItem>
                        <SelectItem value="0 9 1 * *">First of every month at 9:00 AM</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {getScheduleDescription(newReport.schedule || '')}
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label>Format</Label>
                    <Select
                      value={newReport.format}
                      onValueChange={(v) => setNewReport(prev => ({ ...prev, format: v as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="html">HTML</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Recipients */}
                  <div className="space-y-2">
                    <Label>Email Recipients</Label>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        value={newRecipient}
                        onChange={(e) => setNewRecipient(e.target.value)}
                        placeholder="email@example.com"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRecipient())}
                      />
                      <Button variant="outline" onClick={addRecipient}>Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {newReport.recipients?.map(email => (
                        <Badge key={email} variant="secondary" className="gap-1">
                          <Mail className="h-3 w-3" />
                          {email}
                          <XCircle className="h-3 w-3 cursor-pointer" onClick={() => removeRecipient(email)} />
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Include Sections */}
                  <div className="space-y-2">
                    <Label>Include Sections</Label>
                    <div className="flex flex-wrap gap-2">
                      {['summary', 'issues', 'patterns', 'recommendations', 'costs', 'trends'].map(section => (
                        <Badge
                          key={section}
                          variant={newReport.includeSections?.includes(section) ? 'default' : 'outline'}
                          className="cursor-pointer capitalize"
                          onClick={() => {
                            setNewReport(prev => ({
                              ...prev,
                              includeSections: prev.includeSections?.includes(section)
                                ? prev.includeSections.filter(s => s !== section)
                                : [...(prev.includeSections || []), section]
                            }))
                          }}
                        >
                          {section}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateReport}>Create Schedule</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No scheduled reports</p>
              <p className="text-xs text-muted-foreground mt-2">
                Create a schedule to automate report delivery
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Switch
                      checked={report.isActive}
                      onCheckedChange={(checked) => handleToggleReport(report.id, checked)}
                    />
                    <div>
                      <p className="font-medium">{report.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{report.type}</Badge>
                        <span>•</span>
                        <span>{getScheduleDescription(report.schedule)}</span>
                        <span>•</span>
                        <span>{report.format.toUpperCase()}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {report.recipients.slice(0, 3).map(email => (
                          <Badge key={email} variant="secondary" className="text-xs">
                            {email}
                          </Badge>
                        ))}
                        {report.recipients.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{report.recipients.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right mr-4">
                      <p className="text-sm font-medium">Next run</p>
                      <p className="text-xs text-muted-foreground">
                        {report.nextRun ? new Date(report.nextRun).toLocaleDateString() : 'Not scheduled'}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleRunNow(report.id)}>
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteReport(report.id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5" />
              Report History
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchHistory}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              No reports generated yet
            </p>
          ) : (
            <div className="space-y-2">
              {history.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    {item.status === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{item.reportName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.generatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.size && (
                      <span className="text-xs text-muted-foreground">
                        {(item.size / 1024).toFixed(1)} KB
                      </span>
                    )}
                    {item.downloadUrl && (
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-48">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}
