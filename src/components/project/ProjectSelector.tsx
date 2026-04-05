'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  ChevronDown,
  Check,
  Globe,
  FolderKanban,
  Layers,
  Settings,
  Search,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useTheme } from '@/hooks/useTheme'

// Helper function to create transparent color
const hexToRgba = (hex: string, alpha: number) => {
  if (!hex || !hex.startsWith('#')) return `rgba(59, 130, 246, ${alpha})`
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export interface ProjectInfo {
  id: string
  name: string
  description?: string
  softwareType: string
  targetTemplate: string
  color: string
  icon: string
  status: string
  _count?: {
    files: number
    tables: number
    procedures: number
    cshtmlViews: number
  }
}

export type ScopeType = 'all' | 'project' | 'multi'

export interface ProjectScope {
  type: ScopeType
  activeProjectId: string | null
  selectedProjectIds: string[]
}

interface ProjectSelectorProps {
  /** Currently active scope */
  scope: ProjectScope
  /** Callback when scope changes */
  onScopeChange: (scope: ProjectScope) => void
  /** Whether to show settings button */
  showSettings?: boolean
  /** Callback when settings clicked */
  onSettingsClick?: () => void
  /** Custom class name */
  className?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Whether the selector is compact (for headers) */
  compact?: boolean
}

export function ProjectSelector({
  scope,
  onScopeChange,
  showSettings = true,
  onSettingsClick,
  className = '',
  size = 'md',
  compact = false
}: ProjectSelectorProps) {
  const { colors } = useTheme()
  const router = useRouter()
  const pathname = usePathname()
  
  const [isOpen, setIsOpen] = useState(false)
  const [isMultiSelectOpen, setIsMultiSelectOpen] = useState(false)
  const [projects, setProjects] = useState<ProjectInfo[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchProjects = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects || [])
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getActiveProject = (): ProjectInfo | undefined => {
    if (scope.type === 'project' && scope.activeProjectId) {
      return projects.find(p => p.id === scope.activeProjectId)
    }
    return undefined
  }

  const getDisplayLabel = (): string => {
    switch (scope.type) {
      case 'all':
        return 'All Projects'
      case 'project':
        const project = getActiveProject()
        return project?.name || 'Select Project'
      case 'multi':
        return `${scope.selectedProjectIds.length} Projects`
      default:
        return 'Select Scope'
    }
  }

  const getDisplayIcon = () => {
    switch (scope.type) {
      case 'all':
        return <Globe className="w-4 h-4" />
      case 'project':
        const project = getActiveProject()
        if (project) {
          return (
            <div
              className="w-4 h-4 rounded flex items-center justify-center"
              style={{ backgroundColor: project.color || colors.primary }}
            >
              <Layers className="w-2.5 h-2.5 text-white" />
            </div>
          )
        }
        return <FolderKanban className="w-4 h-4" />
      case 'multi':
        return <Layers className="w-4 h-4" />
      default:
        return <FolderKanban className="w-4 h-4" />
    }
  }

  const handleSelectAll = () => {
    onScopeChange({
      type: 'all',
      activeProjectId: null,
      selectedProjectIds: []
    })
    setIsOpen(false)
  }

  const handleSelectProject = (projectId: string) => {
    onScopeChange({
      type: 'project',
      activeProjectId: projectId,
      selectedProjectIds: []
    })
    setIsOpen(false)
  }

  const handleOpenMultiSelect = () => {
    setTempSelectedIds(scope.type === 'multi' ? scope.selectedProjectIds : [])
    setIsMultiSelectOpen(true)
    setIsOpen(false)
  }

  const handleToggleProjectInMulti = (projectId: string) => {
    setTempSelectedIds(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    )
  }

  const handleApplyMultiSelect = () => {
    if (tempSelectedIds.length === 0) {
      handleSelectAll()
    } else if (tempSelectedIds.length === 1) {
      handleSelectProject(tempSelectedIds[0])
    } else {
      onScopeChange({
        type: 'multi',
        activeProjectId: null,
        selectedProjectIds: tempSelectedIds
      })
    }
    setIsMultiSelectOpen(false)
  }

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.softwareType.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const sizeClasses = {
    sm: 'h-8 text-xs px-2.5',
    md: 'h-9 text-sm px-3',
    lg: 'h-10 text-sm px-4'
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 rounded-lg border transition-all
          ${sizeClasses[size]}
          ${compact ? 'bg-transparent' : ''}
        `}
        style={{
          backgroundColor: compact ? 'transparent' : colors.card,
          borderColor: isOpen ? colors.primary : colors.border,
          color: colors.text
        }}
      >
        <span style={{ color: colors.textMuted }}>{getDisplayIcon()}</span>
        <span className="truncate max-w-[150px]">{getDisplayLabel()}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: colors.textMuted }}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 w-72 rounded-lg border shadow-xl z-50 overflow-hidden"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border
          }}
        >
          {/* Search */}
          <div className="p-2 border-b" style={{ borderColor: colors.border }}>
            <div className="relative">
              <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: colors.textMuted }}
              />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-md text-sm outline-none"
                style={{
                  backgroundColor: colors.bg,
                  border: `1px solid ${colors.border}`,
                  color: colors.text
                }}
              />
            </div>
          </div>

          <ScrollArea className="max-h-64">
            {/* All Projects Option */}
            <button
              onClick={handleSelectAll}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: scope.type === 'all' ? hexToRgba(colors.primary, 0.08) : 'transparent'
              }}
            >
              <Globe className="w-4 h-4" style={{ color: colors.primary }} />
              <div className="flex-1 min-w-0">
                <div
                  className="text-sm font-medium truncate"
                  style={{ color: scope.type === 'all' ? colors.primary : colors.text }}
                >
                  All Projects
                </div>
                <div className="text-xs truncate" style={{ color: colors.textMuted }}>
                  Global view across all projects
                </div>
              </div>
              {scope.type === 'all' && (
                <Check className="w-4 h-4 flex-shrink-0" style={{ color: colors.primary }} />
              )}
            </button>

            <Separator style={{ backgroundColor: colors.border }} />

            {/* Projects List */}
            <div className="py-1">
              <div
                className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider"
                style={{ color: colors.textMuted }}
              >
                Projects
              </div>
              
              {isLoading ? (
                <div className="px-3 py-4 text-center" style={{ color: colors.textMuted }}>
                  Loading...
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="px-3 py-4 text-center" style={{ color: colors.textMuted }}>
                  {searchQuery ? 'No matching projects' : 'No projects found'}
                </div>
              ) : (
                filteredProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleSelectProject(project.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:opacity-80 transition-opacity"
                    style={{
                      backgroundColor: scope.type === 'project' && scope.activeProjectId === project.id
                        ? hexToRgba(colors.primary, 0.08)
                        : 'transparent'
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: project.color || colors.primary }}
                    >
                      <Layers className="w-3 h-3 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-sm font-medium truncate"
                        style={{
                          color: scope.type === 'project' && scope.activeProjectId === project.id
                            ? colors.primary
                            : colors.text
                        }}
                      >
                        {project.name}
                      </div>
                      <div className="text-xs truncate" style={{ color: colors.textMuted }}>
                        {project._count?.tables || 0} tables
                      </div>
                    </div>
                    {scope.type === 'project' && scope.activeProjectId === project.id && (
                      <Check className="w-4 h-4 flex-shrink-0" style={{ color: colors.primary }} />
                    )}
                  </button>
                ))
              )}
            </div>

            <Separator style={{ backgroundColor: colors.border }} />

            {/* Multi-Select Option */}
            <button
              onClick={handleOpenMultiSelect}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: scope.type === 'multi' ? hexToRgba(colors.primary, 0.08) : 'transparent'
              }}
            >
              <Layers className="w-4 h-4" style={{ color: colors.textMuted }} />
              <div className="flex-1 min-w-0">
                <div
                  className="text-sm font-medium truncate"
                  style={{ color: scope.type === 'multi' ? colors.primary : colors.text }}
                >
                  Multiple Projects...
                </div>
                <div className="text-xs truncate" style={{ color: colors.textMuted }}>
                  Select multiple projects for comparison
                </div>
              </div>
              {scope.type === 'multi' && scope.selectedProjectIds.length > 0 && (
                <Badge
                  variant="secondary"
                  className="text-xs"
                  style={{ backgroundColor: colors.primary, color: '#fff' }}
                >
                  {scope.selectedProjectIds.length}
                </Badge>
              )}
            </button>
          </ScrollArea>

          {/* Footer with Settings */}
          {showSettings && (
            <>
              <Separator style={{ backgroundColor: colors.border }} />
              <button
                onClick={() => {
                  setIsOpen(false)
                  onSettingsClick?.()
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:opacity-80 transition-opacity"
                style={{ backgroundColor: colors.bg }}
              >
                <Settings className="w-4 h-4" style={{ color: colors.textMuted }} />
                <span className="text-sm" style={{ color: colors.textMuted }}>
                  Scope Settings
                </span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Multi-Select Dialog */}
      <Dialog open={isMultiSelectOpen} onOpenChange={setIsMultiSelectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Multiple Projects</DialogTitle>
            <DialogDescription>
              Choose multiple projects to view and compare data across them.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <ScrollArea className="h-64 rounded-md border" style={{ borderColor: colors.border }}>
              <div className="p-2 space-y-1">
                {filteredProjects.map((project) => (
                  <label
                    key={project.id}
                    className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      backgroundColor: tempSelectedIds.includes(project.id)
                        ? hexToRgba(colors.primary, 0.08)
                        : 'transparent'
                    }}
                  >
                    <Checkbox
                      checked={tempSelectedIds.includes(project.id)}
                      onCheckedChange={() => handleToggleProjectInMulti(project.id)}
                    />
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: project.color || colors.primary }}
                    >
                      <Layers className="w-2.5 h-2.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{project.name}</div>
                      <div className="text-xs truncate" style={{ color: colors.textMuted }}>
                        {project.softwareType}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </ScrollArea>
            
            {tempSelectedIds.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {tempSelectedIds.map(id => {
                  const project = projects.find(p => p.id === id)
                  return project ? (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {project.name}
                      <button
                        onClick={() => handleToggleProjectInMulti(id)}
                        className="ml-1 hover:opacity-70"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ) : null
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMultiSelectOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyMultiSelect}>
              Apply ({tempSelectedIds.length} selected)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ProjectSelector
