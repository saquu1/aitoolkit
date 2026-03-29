'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Plus, 
  Database, 
  Folder, 
  Building2, 
  MoreVertical,
  Trash2,
  Edit,
  Eye,
  Settings,
  ChevronRight,
  LayoutGrid,
  List,
  Search,
  Filter
} from 'lucide-react'

interface Company {
  id: string
  name: string
  slug: string
  subscriptionTier: string
  settings: any
  limits: any
  usage: any
}

interface Workspace {
  id: string
  name: string
  slug: string
  description?: string
  isActive: boolean
}

interface Project {
  id: string
  name: string
  slug: string
  description?: string
  softwareType: string
  status: string
  settings: any
  statistics: {
    tablesCount: number
    columnsCount: number
    foreignKeysCount: number
    resolvedFKs: number
    missingTables: number
    healthScore: number
  }
  createdAt: string
}

const SOFTWARE_TYPES = [
  { value: 'HIS', label: 'Hospital Information System (HIS)', icon: '🏥' },
  { value: 'ERP', label: 'Enterprise Resource Planning (ERP)', icon: '🏢' },
  { value: 'CRM', label: 'Customer Relationship Management (CRM)', icon: '👥' },
  { value: 'E-Commerce', label: 'E-Commerce Platform', icon: '🛒' },
  { value: 'LMS', label: 'Learning Management System (LMS)', icon: '📚' },
  { value: 'Custom', label: 'Custom Application', icon: '⚙️' },
]

const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-slate-500/20 text-slate-400',
  in_development: 'bg-blue-500/20 text-blue-400',
  testing: 'bg-amber-500/20 text-amber-400',
  production: 'bg-green-500/20 text-green-400',
  archived: 'bg-red-500/20 text-red-400',
}

export default function ProjectsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [companies, setCompanies] = useState<Company[]>([])
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  
  // Form state
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    softwareType: 'Custom',
    workspaceId: '',
  })

  useEffect(() => {
    loadTenantContext()
  }, [])

  const loadTenantContext = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/tenant/context')
      
      if (response.ok) {
        const data = await response.json()
        setCompanies(data.companies || [])
        setCurrentCompany(data.currentCompany)
        setWorkspaces(data.workspaces || [])
        setProjects(data.projects || [])
      }
    } catch (error) {
      console.error('Failed to load tenant context:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateProject = async () => {
    if (!currentCompany || !newProject.name) return

    try {
      const response = await fetch('/api/tenant/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProject,
          companyId: currentCompany.id,
        }),
      })

      if (response.ok) {
        const project = await response.json()
        setProjects(prev => [...prev, project])
        setIsCreateDialogOpen(false)
        setNewProject({ name: '', description: '', softwareType: 'Custom', workspaceId: '' })
      }
    } catch (error) {
      console.error('Failed to create project:', error)
    }
  }

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === 'all' || project.softwareType === filterType
    return matchesSearch && matchesType
  })

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-amber-400'
    return 'text-red-400'
  }

  return (
    <DashboardLayout title="Projects" subtitle="Manage your database schema projects">
      {/* Company Selector */}
      {companies.length > 1 && (
        <Card className="mb-6 bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Building2 className="w-5 h-5 text-slate-400" />
              <span className="text-sm text-slate-400">Organization:</span>
              <Select value={currentCompany?.id} onValueChange={async (value) => {
                const response = await fetch('/api/tenant/switch-company', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ companyId: value }),
                })
                if (response.ok) {
                  const data = await response.json()
                  setCurrentCompany(data.company)
                  setWorkspaces(data.workspaces)
                  setProjects(data.projects)
                }
              }}>
                <SelectTrigger className="w-64 bg-slate-700 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Projects</p>
                <p className="text-2xl font-bold text-white">{projects.length}</p>
              </div>
              <Folder className="w-8 h-8 text-blue-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Tables</p>
                <p className="text-2xl font-bold text-white">
                  {projects.reduce((sum, p) => sum + (p.statistics?.tablesCount || 0), 0)}
                </p>
              </div>
              <Database className="w-8 h-8 text-purple-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Workspaces</p>
                <p className="text-2xl font-bold text-white">{workspaces.length}</p>
              </div>
              <Building2 className="w-8 h-8 text-emerald-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Subscription</p>
                <p className="text-lg font-bold text-white capitalize">{currentCompany?.subscriptionTier || 'Free'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64 bg-slate-800 border-slate-700"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48 bg-slate-800 border-slate-700">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {SOFTWARE_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>{type.icon} {type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center border border-slate-700 rounded-lg overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'bg-slate-700' : ''}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-slate-700' : ''}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Add a new database schema project to your workspace
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Project Name *</label>
                  <Input
                    value={newProject.name}
                    onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., HMIS Database"
                    className="bg-slate-900 border-slate-700"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Description</label>
                  <Textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the project..."
                    className="bg-slate-900 border-slate-700"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Software Type</label>
                  <Select 
                    value={newProject.softwareType} 
                    onValueChange={(value) => setNewProject(prev => ({ ...prev, softwareType: value }))}
                  >
                    <SelectTrigger className="bg-slate-900 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOFTWARE_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {workspaces.length > 0 && (
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Workspace (Optional)</label>
                    <Select 
                      value={newProject.workspaceId} 
                      onValueChange={(value) => setNewProject(prev => ({ ...prev, workspaceId: value }))}
                    >
                      <SelectTrigger className="bg-slate-900 border-slate-700">
                        <SelectValue placeholder="Select workspace" />
                      </SelectTrigger>
                      <SelectContent>
                        {workspaces.map(ws => (
                          <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={handleCreateProject}
                    disabled={!newProject.name}
                  >
                    Create Project
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Projects Grid/List */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Loading projects...</div>
      ) : filteredProjects.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="py-12 text-center">
            <Database className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Projects Yet</h3>
            <p className="text-slate-400 mb-4">Create your first project to start analyzing database schemas</p>
            <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Project
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-3 gap-4">
          {filteredProjects.map(project => (
            <Card key={project.id} className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {SOFTWARE_TYPES.find(t => t.value === project.softwareType)?.icon || '📦'}
                    </div>
                    <div>
                      <CardTitle className="text-white text-lg">{project.name}</CardTitle>
                      <CardDescription className="text-slate-400 text-xs">{project.softwareType}</CardDescription>
                    </div>
                  </div>
                  <Badge className={STATUS_COLORS[project.status] || STATUS_COLORS.planning}>
                    {project.status.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-400 mb-4 line-clamp-2">{project.description || 'No description'}</p>
                
                {/* Statistics */}
                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                  <div className="bg-slate-900/50 rounded p-2">
                    <div className="text-lg font-bold text-white">{project.statistics?.tablesCount || 0}</div>
                    <div className="text-xs text-slate-500">Tables</div>
                  </div>
                  <div className="bg-slate-900/50 rounded p-2">
                    <div className="text-lg font-bold text-white">{project.statistics?.foreignKeysCount || 0}</div>
                    <div className="text-xs text-slate-500">FKs</div>
                  </div>
                  <div className="bg-slate-900/50 rounded p-2">
                    <div className={`text-lg font-bold ${getHealthColor(project.statistics?.healthScore || 0)}`}>
                      {project.statistics?.healthScore || 0}%
                    </div>
                    <div className="text-xs text-slate-500">Health</div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Created {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                  <Button variant="ghost" size="sm" className="text-purple-400 hover:text-purple-300">
                    Open <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-slate-800/50 border-slate-700">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Project</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Tables</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Health</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredProjects.map(project => (
                <tr key={project.id} className="hover:bg-slate-700/30 cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">
                        {SOFTWARE_TYPES.find(t => t.value === project.softwareType)?.icon || '📦'}
                      </span>
                      <div>
                        <div className="font-medium text-white">{project.name}</div>
                        <div className="text-xs text-slate-500">{project.description?.substring(0, 50) || 'No description'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{project.softwareType}</td>
                  <td className="px-4 py-3">
                    <Badge className={STATUS_COLORS[project.status]}>
                      {project.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{project.statistics?.tablesCount || 0}</td>
                  <td className="px-4 py-3">
                    <span className={getHealthColor(project.statistics?.healthScore || 0)}>
                      {project.statistics?.healthScore || 0}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-sm">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </DashboardLayout>
  )
}
