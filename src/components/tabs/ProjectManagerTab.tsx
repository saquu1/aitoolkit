'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/hooks/useTheme'
import { useActionToast } from '@/hooks/useActionToast'
import { useSchema, ActiveProject } from '@/hooks/useSchema'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { DataTable, ColumnDef } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import {
  Database,
  FolderPlus,
  FolderOpen,
  MoreVertical,
  Edit2,
  Trash2,
  Check,
  X,
  FileCode,
  Table2,
  Layers,
  Search,
  Plus,
  Settings,
  Clock,
  ChevronDown,
  ExternalLink,
  Copy,
  Download,
  Package,
  Loader2,
  BarChart3
} from 'lucide-react'

interface ProjectWithCounts {
  id: string
  name: string
  description?: string | null
  softwareType: string
  targetTemplate: string
  color: string
  icon: string
  status: string
  lastExportAt?: string | null
  exportCount: number
  createdAt: string
  updatedAt: string
  _count?: {
    files: number
    tables: number
    procedures: number
    cshtmlViews: number
  }
}

interface ProjectManagerTabProps {
  onNavigate?: (tab: string) => void
}

const SOFTWARE_TYPES = [
  { value: 'HIS', label: 'Hospital Information System', color: '#ef4444' },
  { value: 'ERP', label: 'Enterprise Resource Planning', color: '#3b82f6' },
  { value: 'CRM', label: 'Customer Relationship Management', color: '#22c55e' },
  { value: 'E-Commerce', label: 'E-Commerce Platform', color: '#f97316' },
  { value: 'LMS', label: 'Learning Management System', color: '#8b5cf6' },
  { value: 'Custom', label: 'Custom Application', color: '#6b7280' }
]

const TARGET_TEMPLATES = [
  { value: 'nextjs-react', label: 'Next.js 15 + React 19', icon: '⚛️', description: 'App Router, TypeScript, Prisma' },
  { value: 'nextjs-pages', label: 'Next.js Pages Router', icon: '📄', description: 'Legacy pages router' },
  { value: 'laravel', label: 'Laravel', icon: '🧱', description: 'PHP framework with Eloquent' },
  { value: 'dotnet-mvc', label: '.NET Core MVC', icon: '🔷', description: 'C# ASP.NET MVC' },
  { value: 'flutter', label: 'Flutter', icon: '📱', description: 'Cross-platform mobile' }
]

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Database,
  FolderOpen,
  Layers,
  FileCode,
  Table2,
  Building2,
  Microscope,
}

// Also map string icon names to lucide-react components for seeded data
const ICON_NAME_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Hospital: Building2,
  Microscope: Microscope,
}

interface DbProject {
  id: string
  name: string
  description: string
  softwareType: string
  status: string
  color: string
  icon: string
  tableCount: number
  procedureCount: number
  lastUpdated: string
  createdAt: string
}

export function ProjectManagerTab({ onNavigate }: ProjectManagerTabProps) {
  const { colors } = useTheme()
  const toast = useActionToast()
  const { activeProject, setActiveProject } = useSchema()
  const router = useRouter()
  const alpha = (color: string, opacity: number) => `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  // Database Projects DataTable state
  const [dbProjects, setDbProjects] = useState<DbProject[]>([])
  const [dbLoading, setDbLoading] = useState(true)

  // State
  const [projects, setProjects] = useState<ProjectWithCounts[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewProject, setShowNewProject] = useState(false)
  const [editingProject, setEditingProject] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // New project form
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    softwareType: 'Custom',
    targetTemplate: 'nextjs-react',
    color: '#3b82f6',
    icon: 'Database'
  })

  // Export state
  const [exportingProject, setExportingProject] = useState<string | null>(null)
  const [exportProgress, setExportProgress] = useState(0)
  const [lastExportUrl, setLastExportUrl] = useState<string | null>(null)

  // Edit form
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    softwareType: '',
    color: '',
    icon: ''
  })

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch('/api/projects')
      const data = await response.json()
      if (data.projects) {
        setProjects(data.projects)
      }
    } catch (err) {
      console.error('Error fetching projects:', err)
      setError('Failed to load projects')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Fetch database projects for DataTable
  useEffect(() => {
    const fetchDbProjects = async () => {
      try {
        const res = await fetch('/api/projects/list')
        const data = await res.json()
        if (data.success) {
          setDbProjects(data.projects)
        }
      } catch {
        console.error('Failed to fetch database projects')
      } finally {
        setDbLoading(false)
      }
    }
    fetchDbProjects()
  }, [])

  // Project table columns
  const projectColumns: ColumnDef<DbProject>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (_val, row) => {
        const IconComponent = ICONS[row.icon] || Database
        return (
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
              style={{ backgroundColor: row.color }}
            >
              <IconComponent className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-medium" style={{ color: colors.text }}>{row.name}</span>
          </div>
        )
      },
    },
    {
      key: 'softwareType',
      label: 'Type',
      sortable: true,
      render: (val) => (
        <span className="text-xs px-2 py-0.5 rounded-full" style={{
          backgroundColor: alpha(colors.primary, 12),
          color: colors.primary,
          border: `1px solid ${alpha(colors.primary, 20)}`,
        }}>
          {val || '—'}
        </span>
      ),
    },
    { key: 'tableCount', label: 'Tables', sortable: true, align: 'center' },
    { key: 'procedureCount', label: 'Procedures', sortable: true, align: 'center' },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (val) => {
        const statusMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'pending' | 'idle'> = {
          active: 'success', completed: 'success', archived: 'pending',
          inactive: 'idle', unknown: 'pending',
        }
        return <StatusBadge status={statusMap[val] || 'pending'} label={String(val)} size="sm" />
      },
    },
    {
      key: 'lastUpdated',
      label: 'Last Updated',
      sortable: true,
      render: (val) => (
        <span className="flex items-center gap-1.5 text-xs" style={{ color: colors.textMuted }}>
          <Clock className="w-3 h-3" />
          {val ? new Date(val).toLocaleDateString() : '—'}
        </span>
      ),
    },
  ]

  // Create project
  const handleCreateProject = async () => {
    if (!newProject.name.trim()) {
      setError('Project name is required')
      return
    }

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject)
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create project')
        return
      }

      setProjects(prev => [data.project, ...prev])
      setShowNewProject(false)
      setNewProject({
        name: '',
        description: '',
        softwareType: 'Custom',
        targetTemplate: 'nextjs-react',
        color: '#3b82f6',
        icon: 'Database'
      })

      // Auto-select the new project
      handleSelectProject(data.project)
    } catch (err) {
      console.error('Error creating project:', err)
      setError('Failed to create project')
    }
  }

  // Update project
  const handleUpdateProject = async (projectId: string) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: projectId, ...editForm })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to update project')
        return
      }

      setProjects(prev => prev.map(p => p.id === projectId ? data.project : p))
      setEditingProject(null)
      setMenuOpen(null)
    } catch (err) {
      console.error('Error updating project:', err)
      setError('Failed to update project')
    }
  }

  // Delete project
  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? All files and parsed data will be permanently removed.')) {
      return
    }

    try {
      const response = await fetch(`/api/projects?id=${projectId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to delete project')
        return
      }

      setProjects(prev => prev.filter(p => p.id !== projectId))

      // Clear active project if it was deleted
      if (activeProject?.id === projectId) {
        setActiveProject(null)
      }
    } catch (err) {
      console.error('Error deleting project:', err)
      setError('Failed to delete project')
    }
  }

  // Select project
  const handleSelectProject = (project: ProjectWithCounts) => {
    const activeProj: ActiveProject = {
      id: project.id,
      name: project.name,
      description: project.description,
      softwareType: project.softwareType,
      color: project.color,
      icon: project.icon,
      status: project.status,
      fileCount: project._count?.files || 0,
      tableCount: project._count?.tables || 0,
      procedureCount: project._count?.procedures || 0
    }
    setActiveProject(activeProj)
  }

  // Start editing
  const startEditing = (project: ProjectWithCounts) => {
    setEditingProject(project.id)
    setEditForm({
      name: project.name,
      description: project.description || '',
      softwareType: project.softwareType,
      color: project.color,
      icon: project.icon
    })
    setMenuOpen(null)
  }

  // Export project as ZIP
  const handleExportProject = async (project: ProjectWithCounts) => {
    setExportingProject(project.id)
    setExportProgress(0)
    setLastExportUrl(null)
    setError(null)

    try {
      // Step 1: Validate
      setExportProgress(10)
      const validateResponse = await fetch('/api/project-export?action=validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id })
      })
      
      setExportProgress(30)
      
      // Step 2: Export
      setExportProgress(50)
      const exportResponse = await fetch('/api/project-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          projectName: project.name,
          template: project.targetTemplate
        })
      })

      setExportProgress(80)
      const exportResult = await exportResponse.json()

      if (!exportResult.success) {
        throw new Error(exportResult.error || 'Export failed')
      }

      setExportProgress(100)
      setLastExportUrl(exportResult.downloadUrl)
      
      // Auto-download
      if (exportResult.downloadUrl) {
        window.open(exportResult.downloadUrl, '_blank')
      }
    } catch (err: any) {
      console.error('Export error:', err)
      setError(err.message || 'Failed to export project')
    } finally {
      setTimeout(() => {
        setExportingProject(null)
        setExportProgress(0)
      }, 1500)
    }
  }

  // Filter projects
  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.softwareType.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Get icon component
  const getIconComponent = (iconName: string) => {
    return ICONS[iconName] || Database
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: colors.text }}>
            Project Manager
          </h2>
          <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
            Manage multiple database projects • Each project has its own SQL, CSHTML, and parsed intelligence
          </p>
        </div>
        <button
          onClick={() => setShowNewProject(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium"
          style={{ backgroundColor: colors.primary, color: '#fff' }}
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Database Projects DataTable */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{
          backgroundColor: alpha(colors.card, 50),
          borderColor: colors.border,
        }}
      >
        <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: colors.border }}>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: colors.text }}>Database Projects</h3>
            <p className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
              {dbProjects.length} project{dbProjects.length !== 1 ? 's' : ''} from the database
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: colors.textMuted }}>
            <Database className="w-3.5 h-3.5" />
            {dbProjects.reduce((sum, p) => sum + p.tableCount, 0)} tables total
          </div>
        </div>
        <div>
          {dbProjects.map((proj) => (
            <div
              key={proj.id}
              className="flex items-center gap-4 px-5 py-3 border-b transition-colors"
              style={{
                borderColor: alpha(colors.border, 30),
                borderLeft: `3px solid ${proj.color}`,
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = alpha(proj.color, 6) }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              <div className="flex items-center gap-2 min-w-[180px]">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                  style={{ backgroundColor: proj.color }}
                >
                  {(() => {
                    const IconComp = ICONS[proj.icon] || ICON_NAME_MAP[proj.icon] || Database
                    return <IconComp className="w-3.5 h-3.5 text-white" />
                  })()}
                </div>
                <span className="font-medium text-sm" style={{ color: colors.text }}>{proj.name}</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full min-w-[100px]" style={{
                backgroundColor: alpha(colors.primary, 12),
                color: colors.primary,
                border: `1px solid ${alpha(colors.primary, 20)}`,
              }}>
                {proj.softwareType || '—'}
              </span>
              <span className="text-sm text-center min-w-[60px]" style={{ color: colors.textSecondary }}>
                {proj.tableCount}
              </span>
              <span className="text-sm text-center min-w-[80px]" style={{ color: colors.textSecondary }}>
                {proj.procedureCount}
              </span>
              <div className="min-w-[90px]">
                <StatusBadge
                  status={
                    proj.status === 'active' ? 'success' :
                    proj.status === 'completed' ? 'success' :
                    proj.status === 'archived' ? 'pending' :
                    proj.status === 'inactive' ? 'idle' : 'pending'
                  }
                  label={proj.status}
                  size="sm"
                />
              </div>
              <span className="flex items-center gap-1.5 text-xs min-w-[100px]" style={{ color: colors.textMuted }}>
                <Clock className="w-3 h-3" />
                {proj.lastUpdated ? new Date(proj.lastUpdated).toLocaleDateString() : '—'}
              </span>
            </div>
          ))}
          {dbLoading && (
            <div className="px-5 py-8 text-center" style={{ color: colors.textMuted }}>
              <Loader2 className="w-5 h-5 mx-auto mb-2 animate-spin" style={{ color: colors.primary }} />
              <span className="text-sm">Loading database projects...</span>
            </div>
          )}
          {!dbLoading && dbProjects.length === 0 && (
            <div className="px-5 py-8 text-center" style={{ color: colors.textMuted }}>
              <p className="text-sm">No database projects found</p>
            </div>
          )}
        </div>
      </div>

      {/* Active Project Banner */}
      {activeProject && (
        <div
          className="p-4 rounded-xl border"
          style={{
            backgroundColor: `color-mix(in srgb, ${activeProject.color} 10%, transparent)`,
            borderColor: `color-mix(in srgb, ${activeProject.color} 30%, transparent)`
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: activeProject.color }}
              >
                <Database className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold" style={{ color: colors.text }}>
                    {activeProject.name}
                  </span>
                  <Badge variant="outline" className="text-xs">{activeProject.softwareType}</Badge>
                </div>
                <span className="text-xs" style={{ color: colors.textMuted }}>
                  {activeProject.fileCount} files • {activeProject.tableCount} tables • {activeProject.procedureCount} procedures
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate?.('smart-upload')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{ backgroundColor: colors.primary, color: '#fff' }}
              >
                <ExternalLink className="w-4 h-4" />
                Upload Files
              </button>
              <button
                onClick={() => setActiveProject(null)}
                className="p-1.5 rounded-lg"
                style={{ color: colors.textMuted }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Project Form */}
      {showNewProject && (
        <div
          className="p-6 rounded-xl border"
          style={{
            backgroundColor: colors.card,
            borderColor: `color-mix(in srgb, ${colors.border} 50%, transparent)`
          }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: colors.text }}>
            Create New Project
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                Project Name *
              </label>
              <input
                type="text"
                value={newProject.name}
                onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border"
                style={{
                  backgroundColor: colors.bg,
                  borderColor: colors.border,
                  color: colors.text
                }}
                placeholder="e.g., HIS Production Database"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                Description
              </label>
              <textarea
                value={newProject.description}
                onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border"
                style={{
                  backgroundColor: colors.bg,
                  borderColor: colors.border,
                  color: colors.text
                }}
                placeholder="Brief description of the project..."
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                Software Type
              </label>
              <div className="flex flex-wrap gap-2">
                {SOFTWARE_TYPES.map(type => (
                  <button
                    key={type.value}
                    onClick={() => setNewProject(prev => ({ ...prev, softwareType: type.value, color: type.color }))}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium border transition-all"
                    style={{
                      backgroundColor: newProject.softwareType === type.value
                        ? `color-mix(in srgb, ${type.color} 15%, transparent)`
                        : 'transparent',
                      borderColor: newProject.softwareType === type.value
                        ? type.color
                        : colors.border,
                      color: newProject.softwareType === type.value ? type.color : colors.textMuted
                    }}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                Target Framework *
              </label>
              <p className="text-xs mb-2" style={{ color: colors.textMuted }}>
                Select the output framework for code generation
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {TARGET_TEMPLATES.map(template => (
                  <button
                    key={template.value}
                    onClick={() => setNewProject(prev => ({ ...prev, targetTemplate: template.value }))}
                    className="p-3 rounded-lg text-left border transition-all"
                    style={{
                      backgroundColor: newProject.targetTemplate === template.value
                        ? `color-mix(in srgb, ${colors.primary} 15%, transparent)`
                        : 'transparent',
                      borderColor: newProject.targetTemplate === template.value
                        ? colors.primary
                        : colors.border,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{template.icon}</span>
                      <div>
                        <div className="font-medium text-sm" style={{ color: colors.text }}>
                          {template.label}
                        </div>
                        <div className="text-xs" style={{ color: colors.textMuted }}>
                          {template.description}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowNewProject(false)}
                className="px-4 py-2 rounded-lg"
                style={{ color: colors.textMuted }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium"
                style={{ backgroundColor: colors.primary, color: '#fff' }}
              >
                <Check className="w-4 h-4" />
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.textMuted }} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
            color: colors.text
          }}
          placeholder="Search projects..."
        />
      </div>

      {/* Error Message */}
      {error && (
        <div
          className="p-3 rounded-lg text-sm"
          style={{
            backgroundColor: `color-mix(in srgb, ${colors.error} 10%, transparent)`,
            color: colors.error
          }}
        >
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* Projects Grid */}
      {isLoading ? (
        <div className="text-center py-12" style={{ color: colors.textMuted }}>
          Loading projects...
        </div>
      ) : filteredProjects.length === 0 ? (
        <div
          className="text-center py-12 rounded-xl border"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
            color: colors.textMuted
          }}
        >
          <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium" style={{ color: colors.text }}>No projects yet</p>
          <p className="text-sm mt-1">Create your first project to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => {
            const isActive = activeProject?.id === project.id
            const IconComponent = getIconComponent(project.icon)

            return (
              <div
                key={project.id}
                className={`rounded-xl border transition-all cursor-pointer ${
                  isActive ? 'ring-2' : ''
                }`}
                style={{
                  backgroundColor: colors.card,
                  borderColor: isActive ? project.color : `color-mix(in srgb, ${colors.border} 50%, transparent)`,
                  ringColor: isActive ? project.color : 'transparent'
                }}
                onClick={() => handleSelectProject(project)}
              >
                {/* Project Header */}
                <div
                  className="flex items-center justify-between p-4 border-b"
                  style={{ borderColor: `color-mix(in srgb, ${colors.border} 30%, transparent)` }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: project.color }}
                    >
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold" style={{ color: colors.text }}>
                        {project.name}
                      </h4>
                      <Badge variant="outline" className="text-xs">{project.softwareType}</Badge>
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setMenuOpen(menuOpen === project.id ? null : project.id)
                      }}
                      className="p-1.5 rounded-lg hover:bg-opacity-10"
                      style={{ color: colors.textMuted }}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Dropdown Menu */}
                    {menuOpen === project.id && (
                      <div
                        className="absolute right-0 top-full mt-1 w-40 rounded-lg border shadow-lg z-10"
                        style={{
                          backgroundColor: colors.card,
                          borderColor: colors.border
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            handleExportProject(project)
                            setMenuOpen(null)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-opacity-10"
                          style={{ color: colors.primary }}
                        >
                          <Package className="w-4 h-4" />
                          Export ZIP
                        </button>
                        <button
                          onClick={() => startEditing(project)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-opacity-10"
                          style={{ color: colors.text }}
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteProject(project.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left"
                          style={{ color: colors.error }}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Project Body */}
                <div className="p-4">
                  {project.description && (
                    <p className="text-sm mb-3" style={{ color: colors.textMuted }}>
                      {project.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <div className="text-lg font-bold" style={{ color: colors.text }}>
                        {project._count?.files || 0}
                      </div>
                      <div className="text-xs" style={{ color: colors.textMuted }}>Files</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold" style={{ color: colors.text }}>
                        {project._count?.tables || 0}
                      </div>
                      <div className="text-xs" style={{ color: colors.textMuted }}>Tables</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold" style={{ color: colors.text }}>
                        {project._count?.procedures || 0}
                      </div>
                      <div className="text-xs" style={{ color: colors.textMuted }}>Procs</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold" style={{ color: colors.text }}>
                        {project._count?.cshtmlViews || 0}
                      </div>
                      <div className="text-xs" style={{ color: colors.textMuted }}>Views</div>
                    </div>
                  </div>

                  {/* Export Progress */}
                  {exportingProject === project.id && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Loader2 className="w-4 h-4 animate-spin" style={{ color: colors.primary }} />
                        <span className="text-sm" style={{ color: colors.textMuted }}>
                          Exporting... {exportProgress}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="h-1.5 rounded-full transition-all" 
                          style={{ 
                            width: `${exportProgress}%`,
                            backgroundColor: colors.primary 
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Export Button */}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/project/${project.id}`)
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border"
                      style={{ 
                        borderColor: colors.primary,
                        color: colors.primary
                      }}
                    >
                      <BarChart3 className="w-4 h-4" />
                      View Dashboard
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleExportProject(project)
                      }}
                      disabled={exportingProject === project.id}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                      style={{ 
                        backgroundColor: colors.primary,
                        color: '#fff'
                      }}
                    >
                      {exportingProject === project.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Package className="w-4 h-4" />
                          Export ZIP
                        </>
                      )}
                    </button>
                    {lastExportUrl && exportingProject !== project.id && (
                      <a
                        href={lastExportUrl}
                        download
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all"
                        style={{ 
                          borderColor: colors.primary,
                          color: colors.primary
                        }}
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </a>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="flex items-center gap-1 mt-3 text-xs" style={{ color: colors.textMuted }}>
                    <Clock className="w-3 h-3" />
                    <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Edit Form */}
                {editingProject === project.id && (
                  <div
                    className="p-4 border-t"
                    style={{ borderColor: `color-mix(in srgb, ${colors.border} 30%, transparent)` }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-1.5 rounded-lg border text-sm"
                        style={{
                          backgroundColor: colors.bg,
                          borderColor: colors.border,
                          color: colors.text
                        }}
                      />
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-1.5 rounded-lg border text-sm"
                        style={{
                          backgroundColor: colors.bg,
                          borderColor: colors.border,
                          color: colors.text
                        }}
                        rows={2}
                        placeholder="Description..."
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingProject(null)}
                          className="px-3 py-1 rounded text-sm"
                          style={{ color: colors.textMuted }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleUpdateProject(project.id)}
                          className="px-3 py-1 rounded text-sm font-medium"
                          style={{ backgroundColor: colors.primary, color: '#fff' }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
