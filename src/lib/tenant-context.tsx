'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  TenantContext,
  Company,
  Workspace,
  Project,
  CompanyRole,
  ProjectRole,
  DEFAULT_LIMITS,
  DEFAULT_COMPANY_SETTINGS,
} from '@/lib/tenant-types'

// ============================================================================
// TENANT CONTEXT
// ============================================================================

interface TenantContextValue {
  // Current state
  isLoading: boolean
  error: string | null
  
  // User's companies
  companies: Company[]
  currentCompany: Company | null
  
  // Workspaces
  workspaces: Workspace[]
  currentWorkspace: Workspace | null
  
  // Projects
  projects: Project[]
  currentProject: Project | null
  
  // User role
  companyRole: CompanyRole | null
  projectRole: ProjectRole | null
  
  // Actions
  switchCompany: (companyId: string) => Promise<void>
  switchWorkspace: (workspaceId: string) => Promise<void>
  switchProject: (projectId: string) => Promise<void>
  
  // Company CRUD
  createCompany: (data: CreateCompanyInput) => Promise<Company>
  updateCompany: (companyId: string, data: UpdateCompanyInput) => Promise<Company>
  
  // Workspace CRUD
  createWorkspace: (data: CreateWorkspaceInput) => Promise<Workspace>
  
  // Project CRUD
  createProject: (data: CreateProjectInput) => Promise<Project>
  updateProject: (projectId: string, data: UpdateProjectInput) => Promise<Project>
  
  // Helpers
  canAccess: (permission: string) => boolean
  isOwner: () => boolean
  isAdmin: () => boolean
  refreshContext: () => Promise<void>
}

// ============================================================================
// INPUT TYPES
// ============================================================================

interface CreateCompanyInput {
  name: string
  slug?: string
  subscriptionTier?: 'free' | 'starter' | 'professional' | 'enterprise'
}

interface UpdateCompanyInput {
  name?: string
  logo?: string
  primaryColor?: string
  secondaryColor?: string
}

interface CreateWorkspaceInput {
  name: string
  description?: string
}

interface CreateProjectInput {
  name: string
  description?: string
  workspaceId?: string
  softwareType?: string
}

interface UpdateProjectInput {
  name?: string
  description?: string
  status?: string
}

// ============================================================================
// CONTEXT
// ============================================================================

const TenantContextInstance = createContext<TenantContextValue | null>(null)

export function TenantProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  
  // State
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [companies, setCompanies] = useState<Company[]>([])
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null)
  
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null)
  
  const [projects, setProjects] = useState<Project[]>([])
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  
  const [companyRole, setCompanyRole] = useState<CompanyRole | null>(null)
  const [projectRole, setProjectRole] = useState<ProjectRole | null>(null)
  
  // Load initial data
  useEffect(() => {
    loadTenantContext()
  }, [])
  
  // Load tenant context from API
  const loadTenantContext = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/tenant/context')
      
      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated - redirect to login
          router.push('/login')
          return
        }
        throw new Error('Failed to load tenant context')
      }
      
      const data = await response.json()
      
      setCompanies(data.companies || [])
      setCurrentCompany(data.currentCompany || null)
      setWorkspaces(data.workspaces || [])
      setCurrentWorkspace(data.currentWorkspace || null)
      setProjects(data.projects || [])
      setCurrentProject(data.currentProject || null)
      setCompanyRole(data.companyRole || null)
      setProjectRole(data.projectRole || null)
      
    } catch (err) {
      console.error('Failed to load tenant context:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }
  
  // Switch company
  const switchCompany = async (companyId: string) => {
    try {
      const response = await fetch('/api/tenant/switch-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      })
      
      if (!response.ok) throw new Error('Failed to switch company')
      
      const data = await response.json()
      setCurrentCompany(data.company)
      setWorkspaces(data.workspaces || [])
      setProjects(data.projects || [])
      setCurrentWorkspace(null)
      setCurrentProject(null)
      setCompanyRole(data.role)
      setProjectRole(null)
      
      router.push('/dashboard')
    } catch (err) {
      console.error('Failed to switch company:', err)
      throw err
    }
  }
  
  // Switch workspace
  const switchWorkspace = async (workspaceId: string) => {
    const workspace = workspaces.find(w => w.id === workspaceId)
    if (workspace) {
      setCurrentWorkspace(workspace)
      // Load projects for this workspace
      const response = await fetch(`/api/tenant/projects?workspaceId=${workspaceId}`)
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects || [])
      }
    }
  }
  
  // Switch project
  const switchProject = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (project) {
      setCurrentProject(project)
      // Update URL to project dashboard
      router.push(`/projects/${project.slug}`)
    }
  }
  
  // Create company
  const createCompany = async (data: CreateCompanyInput): Promise<Company> => {
    const response = await fetch('/api/tenant/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) throw new Error('Failed to create company')
    
    const newCompany = await response.json()
    setCompanies(prev => [...prev, newCompany])
    return newCompany
  }
  
  // Update company
  const updateCompany = async (companyId: string, data: UpdateCompanyInput): Promise<Company> => {
    const response = await fetch(`/api/tenant/companies/${companyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) throw new Error('Failed to update company')
    
    const updated = await response.json()
    setCurrentCompany(updated)
    setCompanies(prev => prev.map(c => c.id === companyId ? updated : c))
    return updated
  }
  
  // Create workspace
  const createWorkspace = async (data: CreateWorkspaceInput): Promise<Workspace> => {
    if (!currentCompany) throw new Error('No company selected')
    
    const response = await fetch('/api/tenant/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, companyId: currentCompany.id }),
    })
    
    if (!response.ok) throw new Error('Failed to create workspace')
    
    const newWorkspace = await response.json()
    setWorkspaces(prev => [...prev, newWorkspace])
    return newWorkspace
  }
  
  // Create project
  const createProject = async (data: CreateProjectInput): Promise<Project> => {
    if (!currentCompany) throw new Error('No company selected')
    
    const response = await fetch('/api/tenant/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ...data, 
        companyId: currentCompany.id,
        workspaceId: currentWorkspace?.id 
      }),
    })
    
    if (!response.ok) throw new Error('Failed to create project')
    
    const newProject = await response.json()
    setProjects(prev => [...prev, newProject])
    return newProject
  }
  
  // Update project
  const updateProject = async (projectId: string, data: UpdateProjectInput): Promise<Project> => {
    const response = await fetch(`/api/tenant/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) throw new Error('Failed to update project')
    
    const updated = await response.json()
    setCurrentProject(updated)
    setProjects(prev => prev.map(p => p.id === projectId ? updated : p))
    return updated
  }
  
  // Permission checks
  const canAccess = (permission: string): boolean => {
    if (companyRole === 'owner') return true
    if (companyRole === 'admin') return true
    // Add more granular permission checks
    return false
  }
  
  const isOwner = (): boolean => companyRole === 'owner'
  const isAdmin = (): boolean => companyRole === 'admin' || companyRole === 'owner'
  
  // Refresh context
  const refreshContext = async () => {
    await loadTenantContext()
  }
  
  const value: TenantContextValue = {
    isLoading,
    error,
    companies,
    currentCompany,
    workspaces,
    currentWorkspace,
    projects,
    currentProject,
    companyRole,
    projectRole,
    switchCompany,
    switchWorkspace,
    switchProject,
    createCompany,
    updateCompany,
    createWorkspace,
    createProject,
    updateProject,
    canAccess,
    isOwner,
    isAdmin,
    refreshContext,
  }
  
  return (
    <TenantContextInstance.Provider value={value}>
      {children}
    </TenantContextInstance.Provider>
  )
}

// ============================================================================
// HOOKS
// ============================================================================

export function useTenant() {
  const context = useContext(TenantContextInstance)
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}

export function useCurrentCompany() {
  const { currentCompany, companyRole, isOwner, isAdmin, canAccess } = useTenant()
  return { company: currentCompany, role: companyRole, isOwner, isAdmin, canAccess }
}

export function useCurrentProject() {
  const { currentProject, projectRole } = useTenant()
  return { project: currentProject, role: projectRole }
}

export function useProjects() {
  const { projects, createProject, updateProject, switchProject } = useTenant()
  return { projects, createProject, updateProject, switchProject }
}
