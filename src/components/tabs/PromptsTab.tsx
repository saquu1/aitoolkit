'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MessageSquare,
  Plus,
  Search,
  Copy,
  Star,
  StarOff,
  Trash2,
  Edit3,
  Eye,
  Play,
  RefreshCw,
  Code,
  Sparkles,
  Database,
  GitBranch,
  Bot,
  CheckCircle2,
  XCircle,
  FileText,
  Zap
} from 'lucide-react'

// Types
interface PromptTemplate {
  id: string
  name: string
  key: string
  category: string
  description: string | null
  template: string
  variables: string | null
  isDefault: boolean
  isActive: boolean
  version: number
  createdAt: string
  updatedAt: string
}

interface PromptFormData {
  name: string
  key: string
  category: string
  description: string
  template: string
  variables: string
  isDefault: boolean
}

const CATEGORY_CONFIG = {
  analysis: { label: 'Analysis', icon: Database, color: '#3b82f6' },
  generation: { label: 'Generation', icon: Code, color: '#10b981' },
  resolution: { label: 'Resolution', icon: GitBranch, color: '#f59e0b' },
  chat: { label: 'Chat', icon: Bot, color: '#8b5cf6' },
}

const DEFAULT_FORM_DATA: PromptFormData = {
  name: '',
  key: '',
  category: 'analysis',
  description: '',
  template: '',
  variables: '[]',
  isDefault: false,
}

// Helper to extract variables from template
function extractVariables(template: string): string[] {
  const regex = /\{(\w+)\}/g
  const variables: string[] = []
  let match
  
  while ((match = regex.exec(template)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1])
    }
  }
  
  return variables
}

export function PromptsTab() {
  const { colors } = useTheme()
  
  // State
  const [prompts, setPrompts] = useState<PromptTemplate[]>([])
  const [groupedPrompts, setGroupedPrompts] = useState<Record<string, PromptTemplate[]>>({})
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, active: 0, defaults: 0 })
  
  // Dialog states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState<PromptFormData>(DEFAULT_FORM_DATA)
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({})
  const [renderedPreview, setRenderedPreview] = useState('')
  
  // Helper function
  const alpha = (color: string, opacity: number) => 
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`
  
  // Fetch prompts
  const fetchPrompts = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/prompts?action=list')
      const data = await response.json()
      
      if (data.success) {
        setPrompts(data.prompts)
        setGroupedPrompts(data.grouped)
      }
      
      // Fetch stats
      const statsResponse = await fetch('/api/prompts?action=stats')
      const statsData = await statsResponse.json()
      if (statsData.success) {
        setStats(statsData.stats)
      }
    } catch (error) {
      console.error('Error fetching prompts:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Seed default prompts
  const seedDefaults = async () => {
    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed' }),
      })
      const data = await response.json()
      
      if (data.success) {
        fetchPrompts()
      }
    } catch (error) {
      console.error('Error seeding prompts:', error)
    }
  }
  
  useEffect(() => {
    fetchPrompts()
  }, [])
  
  // Filter prompts
  const filteredPrompts = prompts.filter(prompt => {
    const matchesCategory = selectedCategory === 'all' || prompt.category === selectedCategory
    const matchesSearch = !searchQuery || 
      prompt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (prompt.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesCategory && matchesSearch
  })
  
  // Group filtered prompts
  const filteredGrouped = filteredPrompts.reduce((acc, prompt) => {
    if (!acc[prompt.category]) {
      acc[prompt.category] = []
    }
    acc[prompt.category].push(prompt)
    return acc
  }, {} as Record<string, PromptTemplate[]>)
  
  // Handle create
  const handleCreate = () => {
    setFormData(DEFAULT_FORM_DATA)
    setIsCreateDialogOpen(true)
  }
  
  const submitCreate = async () => {
    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          ...formData,
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setIsCreateDialogOpen(false)
        fetchPrompts()
      }
    } catch (error) {
      console.error('Error creating prompt:', error)
    }
  }
  
  // Handle edit
  const handleEdit = (prompt: PromptTemplate) => {
    setFormData({
      name: prompt.name,
      key: prompt.key,
      category: prompt.category,
      description: prompt.description || '',
      template: prompt.template,
      variables: prompt.variables || '[]',
      isDefault: prompt.isDefault,
    })
    setSelectedPrompt(prompt)
    setIsEditDialogOpen(true)
  }
  
  const submitEdit = async () => {
    if (!selectedPrompt) return
    
    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          id: selectedPrompt.id,
          ...formData,
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setIsEditDialogOpen(false)
        setSelectedPrompt(null)
        fetchPrompts()
      }
    } catch (error) {
      console.error('Error updating prompt:', error)
    }
  }
  
  // Handle delete
  const handleDelete = (prompt: PromptTemplate) => {
    setSelectedPrompt(prompt)
    setIsDeleteDialogOpen(true)
  }
  
  const confirmDelete = async () => {
    if (!selectedPrompt) return
    
    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          id: selectedPrompt.id,
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setIsDeleteDialogOpen(false)
        setSelectedPrompt(null)
        fetchPrompts()
      }
    } catch (error) {
      console.error('Error deleting prompt:', error)
    }
  }
  
  // Handle duplicate
  const handleDuplicate = async (prompt: PromptTemplate) => {
    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'duplicate',
          id: prompt.id,
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        fetchPrompts()
      }
    } catch (error) {
      console.error('Error duplicating prompt:', error)
    }
  }
  
  // Handle set default
  const handleSetDefault = async (prompt: PromptTemplate) => {
    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set-default',
          id: prompt.id,
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        fetchPrompts()
      }
    } catch (error) {
      console.error('Error setting default:', error)
    }
  }
  
  // Handle toggle active
  const handleToggleActive = async (prompt: PromptTemplate) => {
    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle-active',
          id: prompt.id,
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        fetchPrompts()
      }
    } catch (error) {
      console.error('Error toggling active:', error)
    }
  }
  
  // Handle preview
  const handlePreview = (prompt: PromptTemplate) => {
    setSelectedPrompt(prompt)
    const vars = prompt.variables ? JSON.parse(prompt.variables) : []
    const initialVars: Record<string, string> = {}
    vars.forEach((v: string) => {
      initialVars[v] = `sample_${v}`
    })
    setPreviewVariables(initialVars)
    setIsPreviewDialogOpen(true)
  }
  
  // Render preview
  const renderPreview = async () => {
    if (!selectedPrompt) return
    
    let rendered = selectedPrompt.template
    for (const [key, value] of Object.entries(previewVariables)) {
      rendered = rendered.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
    }
    setRenderedPreview(rendered)
  }
  
  useEffect(() => {
    if (isPreviewDialogOpen && selectedPrompt) {
      renderPreview()
    }
  }, [previewVariables, isPreviewDialogOpen, selectedPrompt])
  
  // Update variables when template changes
  const handleTemplateChange = (template: string) => {
    const vars = extractVariables(template)
    setFormData({
      ...formData,
      template,
      variables: JSON.stringify(vars),
    })
  }
  
  // Category tabs
  const categoryTabs = [
    { key: 'all', label: 'All', icon: FileText },
    { key: 'analysis', label: 'Analysis', icon: Database },
    { key: 'generation', label: 'Generation', icon: Code },
    { key: 'resolution', label: 'Resolution', icon: GitBranch },
    { key: 'chat', label: 'Chat', icon: Bot },
  ]
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: colors.text }}>
            <MessageSquare className="w-6 h-6" style={{ color: colors.primary }} />
            Prompts Management
          </h2>
          <p className="mt-1" style={{ color: colors.textMuted }}>
            Manage and customize AI prompts for schema analysis, generation, and assistance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={seedDefaults}
            style={{ borderColor: colors.border, color: colors.text }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Seed Defaults
          </Button>
          <Button onClick={handleCreate} style={{ backgroundColor: colors.primary }}>
            <Plus className="w-4 h-4 mr-2" />
            New Prompt
          </Button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Prompts', value: stats.total, icon: FileText, color: colors.primary },
          { label: 'Active', value: stats.active, icon: CheckCircle2, color: colors.success },
          { label: 'Defaults', value: stats.defaults, icon: Star, color: colors.warning },
          { label: 'Categories', value: Object.keys(CATEGORY_CONFIG).length, icon: Zap, color: colors.accent },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className="rounded-lg border p-4"
              style={{
                backgroundColor: alpha(colors.card, 50),
                borderColor: colors.border,
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: colors.textMuted }}>{stat.label}</p>
                  <p className="text-2xl font-bold" style={{ color: colors.text }}>{stat.value}</p>
                </div>
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: alpha(stat.color, 20) }}
                >
                  <Icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: colors.textMuted }} />
          <Input
            placeholder="Search prompts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            style={{
              backgroundColor: colors.bg,
              borderColor: colors.border,
              color: colors.text,
            }}
          />
        </div>
        
        {/* Category Tabs */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: colors.bgSecondary }}>
          {categoryTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = selectedCategory === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setSelectedCategory(tab.key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors`}
                style={{
                  backgroundColor: isActive ? colors.primary : 'transparent',
                  color: isActive ? '#fff' : colors.textMuted,
                }}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>
      
      {/* Prompts List */}
      {isLoading ? (
        <div className="text-center py-12" style={{ color: colors.textMuted }}>
          Loading prompts...
        </div>
      ) : filteredPrompts.length === 0 ? (
        <div
          className="text-center py-12 rounded-lg border"
          style={{
            backgroundColor: alpha(colors.card, 30),
            borderColor: colors.border,
          }}
        >
          <MessageSquare className="w-12 h-12 mx-auto mb-4" style={{ color: colors.textMuted }} />
          <p style={{ color: colors.textMuted }}>No prompts found</p>
          <p className="text-sm mt-2" style={{ color: colors.textMuted }}>
            Click "Seed Defaults" to add default prompts or "New Prompt" to create one
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(filteredGrouped).map(([category, categoryPrompts]) => {
            const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG] || 
              { label: category, icon: FileText, color: colors.textMuted }
            const Icon = config.icon
            
            return (
              <div key={category}>
                {/* Category Header */}
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-4 h-4" style={{ color: config.color }} />
                  <h3 className="font-semibold" style={{ color: colors.text }}>
                    {config.label}
                  </h3>
                  <Badge
                    variant="outline"
                    style={{ borderColor: colors.border, color: colors.textMuted }}
                  >
                    {categoryPrompts.length}
                  </Badge>
                </div>
                
                {/* Prompts Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {categoryPrompts.map((prompt) => (
                    <div
                      key={prompt.id}
                      className="rounded-lg border p-4 hover:shadow-md transition-shadow"
                      style={{
                        backgroundColor: alpha(colors.card, 50),
                        borderColor: colors.border,
                        opacity: prompt.isActive ? 1 : 0.6,
                      }}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium truncate" style={{ color: colors.text }}>
                              {prompt.name}
                            </h4>
                            {prompt.isDefault && (
                              <Star className="w-4 h-4 flex-shrink-0" style={{ color: colors.warning }} />
                            )}
                            {!prompt.isActive && (
                              <XCircle className="w-4 h-4 flex-shrink-0" style={{ color: colors.textMuted }} />
                            )}
                          </div>
                          <p className="text-sm font-mono" style={{ color: colors.textMuted }}>
                            {prompt.key}
                          </p>
                        </div>
                        <Badge
                          style={{
                            backgroundColor: alpha(config.color, 20),
                            color: config.color,
                            border: `1px solid ${alpha(config.color, 30)}`,
                          }}
                        >
                          v{prompt.version}
                        </Badge>
                      </div>
                      
                      {/* Description */}
                      {prompt.description && (
                        <p className="text-sm mb-3 line-clamp-2" style={{ color: colors.textMuted }}>
                          {prompt.description}
                        </p>
                      )}
                      
                      {/* Variables */}
                      {prompt.variables && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {JSON.parse(prompt.variables).map((v: string) => (
                            <Badge
                              key={v}
                              variant="outline"
                              className="text-xs"
                              style={{ borderColor: colors.border, color: colors.textSecondary }}
                            >
                              {`{${v}}`}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: colors.border }}>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePreview(prompt)}
                            title="Preview"
                            style={{ color: colors.textMuted }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(prompt)}
                            title="Edit"
                            style={{ color: colors.textMuted }}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicate(prompt)}
                            title="Duplicate"
                            style={{ color: colors.textMuted }}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefault(prompt)}
                            title={prompt.isDefault ? 'Unset as default' : 'Set as default'}
                            style={{ color: prompt.isDefault ? colors.warning : colors.textMuted }}
                          >
                            {prompt.isDefault ? <Star className="w-4 h-4" /> : <StarOff className="w-4 h-4" />}
                          </Button>
                        </div>
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={prompt.isActive}
                            onCheckedChange={() => handleToggleActive(prompt)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(prompt)}
                            title="Delete"
                            style={{ color: colors.danger }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
      
      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: colors.card }}>
          <DialogHeader>
            <DialogTitle style={{ color: colors.text }}>Create New Prompt</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label style={{ color: colors.textSecondary }}>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., My Custom Prompt"
                  style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                />
              </div>
              <div className="space-y-2">
                <Label style={{ color: colors.textSecondary }}>Key</Label>
                <Input
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  placeholder="e.g., my_custom_prompt"
                  style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label style={{ color: colors.textSecondary }}>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ backgroundColor: colors.card }}>
                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label style={{ color: colors.textSecondary }}>Variables (auto-extracted)</Label>
                <Input
                  value={formData.variables}
                  readOnly
                  placeholder="Auto-extracted from template"
                  style={{ backgroundColor: colors.bgSecondary, borderColor: colors.border, color: colors.textMuted }}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label style={{ color: colors.textSecondary }}>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this prompt does..."
                rows={2}
                style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
              />
            </div>
            
            <div className="space-y-2">
              <Label style={{ color: colors.textSecondary }}>Template</Label>
              <Textarea
                value={formData.template}
                onChange={(e) => handleTemplateChange(e.target.value)}
                placeholder="Enter your prompt template. Use {variable_name} for variables."
                rows={10}
                className="font-mono text-sm"
                style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
              />
              <p className="text-xs" style={{ color: colors.textMuted }}>
                Use {'{variable_name}'} syntax to define variables. They will be auto-extracted.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isDefault}
                onCheckedChange={(v) => setFormData({ ...formData, isDefault: v })}
              />
              <Label style={{ color: colors.textSecondary }}>Set as default for this category</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} style={{ borderColor: colors.border, color: colors.text }}>
              Cancel
            </Button>
            <Button onClick={submitCreate} style={{ backgroundColor: colors.primary }}>
              Create Prompt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: colors.card }}>
          <DialogHeader>
            <DialogTitle style={{ color: colors.text }}>Edit Prompt</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label style={{ color: colors.textSecondary }}>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                />
              </div>
              <div className="space-y-2">
                <Label style={{ color: colors.textSecondary }}>Key</Label>
                <Input
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label style={{ color: colors.textSecondary }}>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ backgroundColor: colors.card }}>
                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label style={{ color: colors.textSecondary }}>Variables</Label>
                <Input
                  value={formData.variables}
                  readOnly
                  style={{ backgroundColor: colors.bgSecondary, borderColor: colors.border, color: colors.textMuted }}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label style={{ color: colors.textSecondary }}>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
              />
            </div>
            
            <div className="space-y-2">
              <Label style={{ color: colors.textSecondary }}>Template</Label>
              <Textarea
                value={formData.template}
                onChange={(e) => handleTemplateChange(e.target.value)}
                rows={10}
                className="font-mono text-sm"
                style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isDefault}
                onCheckedChange={(v) => setFormData({ ...formData, isDefault: v })}
              />
              <Label style={{ color: colors.textSecondary }}>Set as default for this category</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} style={{ borderColor: colors.border, color: colors.text }}>
              Cancel
            </Button>
            <Button onClick={submitEdit} style={{ backgroundColor: colors.primary }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: colors.card }}>
          <DialogHeader>
            <DialogTitle style={{ color: colors.text }}>
              Preview: {selectedPrompt?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Test Variables */}
            <div className="space-y-3">
              <h4 className="font-medium" style={{ color: colors.text }}>Test Variables</h4>
              {selectedPrompt?.variables && JSON.parse(selectedPrompt.variables).map((v: string) => (
                <div key={v} className="space-y-1">
                  <Label style={{ color: colors.textSecondary }}>{`{${v}}`}</Label>
                  <Input
                    value={previewVariables[v] || ''}
                    onChange={(e) => setPreviewVariables({ ...previewVariables, [v]: e.target.value })}
                    placeholder={`Enter value for ${v}`}
                    style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                  />
                </div>
              ))}
            </div>
            
            {/* Rendered Output */}
            <div className="space-y-3">
              <h4 className="font-medium" style={{ color: colors.text }}>Rendered Preview</h4>
              <ScrollArea className="h-[400px] rounded-lg border p-4" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                <pre className="text-sm whitespace-pre-wrap font-mono" style={{ color: colors.text }}>
                  {renderedPreview || selectedPrompt?.template}
                </pre>
              </ScrollArea>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)} style={{ borderColor: colors.border, color: colors.text }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent style={{ backgroundColor: colors.card }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: colors.text }}>Delete Prompt</AlertDialogTitle>
            <AlertDialogDescription style={{ color: colors.textMuted }}>
              Are you sure you want to delete "{selectedPrompt?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ borderColor: colors.border, color: colors.text }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} style={{ backgroundColor: colors.danger }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
