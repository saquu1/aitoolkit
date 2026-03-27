'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname, useParams } from 'next/navigation'
import { useTheme } from '@/hooks/useTheme'
import { useSchema } from '@/hooks/useSchema'
import {
  Database,
  FileCode,
  Table2,
  Code,
  FileText,
  Key,
  Layers,
  Settings,
  ChevronRight,
  ChevronDown,
  Upload,
  Brain,
  GitBranch,
  BarChart3,
  BookOpen,
  Building2,
  Play,
  MessageSquare,
  Check,
  FolderKanban,
  LayoutDashboard,
  Puzzle,
  Shield,
  ArrowRightLeft,
  ClipboardList,
  Sparkles,
  FolderSync,
  Zap,
  AlertTriangle,
  Home,
  Menu,
  X
} from 'lucide-react'

// Helper function to create transparent color
const hexToRgba = (hex: string, alpha: number) => {
  if (!hex || !hex.startsWith('#')) return `rgba(59, 130, 246, ${alpha})`
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

interface ProjectInfo {
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

// Project-specific navigation items
const PROJECT_NAV_ITEMS = [
  { key: 'status', label: 'Status', icon: BarChart3, path: '' },
  { key: 'upload', label: 'Upload Files', icon: Upload, path: '/upload' },
  { key: 'files', label: 'Files', icon: FileCode, path: '/files' },
  { key: 'tables', label: 'Tables', icon: Table2, path: '/tables' },
  { key: 'procedures', label: 'Procedures', icon: Code, path: '/procedures' },
  { key: 'views', label: 'CSHTML Views', icon: FileText, path: '/views' },
  { key: 'fk-resolution', label: 'FK Resolution', icon: Key, path: '/fk-resolution' },
  { key: 'schema-apply', label: 'Schema Apply', icon: Play, path: '/schema-apply' },
  { key: 'intelligence', label: 'Intelligence', icon: Brain, path: '/intelligence' },
  { key: 'modules', label: 'Modules', icon: GitBranch, path: '/modules' },
  { key: 'organization', label: 'Organization', icon: Building2, path: '/organization' },
  { key: 'prisma', label: 'Prisma Schema', icon: Layers, path: '/prisma' },
  { key: 'learning', label: 'Learning', icon: BookOpen, path: '/learning' },
  { key: 'prompts', label: 'Prompts', icon: MessageSquare, path: '/prompts' },
  { key: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
]

// Main app navigation items
const MAIN_NAV_ITEMS = [
  { key: 'home', label: 'Home', icon: Home, path: '/', tab: 'dashboard' },
  { key: 'projects', label: 'Projects', icon: FolderKanban, path: '/?tab=projects', tab: 'projects' },
  { key: 'file-manager', label: 'File Manager', icon: FolderSync, path: '/?tab=file-manager', tab: 'file-manager' },
  { key: 'smart-upload', label: 'Universal Upload', icon: Sparkles, path: '/?tab=universal-upload', tab: 'smart-upload' },
  { key: 'fk-resolution-main', label: 'FK Resolution', icon: AlertTriangle, path: '/?tab=fk-resolution', tab: 'fk-resolution' },
  { key: 'intelligence-bank', label: 'Intelligence Bank', icon: Layers, path: '/?tab=intelligence-bank', tab: 'intelligence-bank' },
  { key: 'modules-main', label: 'Modules', icon: Puzzle, path: '/?tab=module-registry', tab: 'modules' },
  { key: 'settings-main', label: 'Settings', icon: Settings, path: '/?tab=settings', tab: 'settings' },
]

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const { colors } = useTheme()
  const { totalTables, fkResolvedPercent, modulesLinked } = useSchema()
  
  const projectId = params?.id as string | undefined
  const isProjectPage = pathname?.startsWith('/project/')
  
  const [project, setProject] = useState<ProjectInfo | null>(null)
  const [allProjects, setAllProjects] = useState<ProjectInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    fetchAllProjects()
    if (projectId) {
      fetchProject()
    } else {
      setIsLoading(false)
    }
  }, [projectId])

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects?id=${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setProject(data.project)
      }
    } catch (error) {
      console.error('Error fetching project:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAllProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        setAllProjects(data.projects || [])
      }
    } catch (error) {
      console.error('Error fetching all projects:', error)
    }
  }

  const getActiveProjectKey = () => {
    if (!isProjectPage || !projectId) return ''
    if (pathname === `/project/${projectId}`) {
      return 'status'
    }
    for (const item of PROJECT_NAV_ITEMS) {
      if (item.path && pathname === `/project/${projectId}${item.path}`) {
        return item.key
      }
    }
    return 'status'
  }

  const handleProjectNavigation = (path: string) => {
    router.push(`/project/${projectId}${path}`)
  }

  const handleMainNavigation = (path: string) => {
    router.push(path)
    setIsMobileSidebarOpen(false)
  }

  const handleProjectSwitch = (targetProjectId: string) => {
    setIsProjectDropdownOpen(false)
    const currentPath = pathname?.replace(`/project/${projectId}`, '') || ''
    router.push(`/project/${targetProjectId}${currentPath}`)
  }

  const activeProjectKey = getActiveProjectKey()

  // Determine which nav items to show
  const navItems = isProjectPage ? PROJECT_NAV_ITEMS : MAIN_NAV_ITEMS

  if (isLoading && isProjectPage) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.bg }}>
        <div className="animate-pulse text-lg" style={{ color: colors.textMuted }}>Loading...</div>
      </div>
    )
  }

  if (isProjectPage && !project) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.bg }}>
        <div className="text-center">
          <Database className="w-12 h-12 mx-auto mb-4" style={{ color: colors.textMuted }} />
          <p style={{ color: colors.textMuted }}>Project not found</p>
          <button
            onClick={() => router.push('/?tab=projects')}
            className="mt-4 px-4 py-2 rounded-lg"
            style={{ backgroundColor: colors.primary, color: '#fff' }}
          >
            Back to Projects
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: colors.bg }}>
      {/* Mobile Menu Button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg"
        style={{ backgroundColor: colors.card, color: colors.text }}
        onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      >
        {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen border-r flex flex-col transition-all duration-300 z-40 ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{
          width: isSidebarCollapsed ? '60px' : '240px',
          backgroundColor: colors.card,
          borderColor: colors.border
        }}
      >
        {/* Sidebar Header */}
        <div
          className="border-b relative"
          style={{ borderColor: colors.border }}
          ref={dropdownRef}
        >
          {/* Logo / Project Selector */}
          <button
            className="w-full flex items-center gap-3 p-4 hover:opacity-90 transition-all"
            style={{ 
              backgroundColor: isProjectDropdownOpen ? hexToRgba(colors.primary, 0.08) : 'transparent',
              cursor: 'pointer'
            }}
            onClick={() => {
              if (isProjectPage && !isSidebarCollapsed) {
                setIsProjectDropdownOpen(!isProjectDropdownOpen)
              } else if (!isProjectPage) {
                router.push('/?tab=projects')
              }
            }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
              style={{ backgroundColor: project?.color || colors.primary }}
            >
              <Database className="w-4 h-4 text-white" />
            </div>
            {!isSidebarCollapsed && (
              <div className="min-w-0 flex-1 text-left">
                {isProjectPage && project ? (
                  <>
                    <div className="font-semibold truncate text-sm" style={{ color: colors.text }}>
                      {project.name}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span 
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ 
                          backgroundColor: hexToRgba(colors.primary, 0.08),
                          color: colors.primary
                        }}
                      >
                        {project.softwareType}
                      </span>
                      <ChevronDown 
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${isProjectDropdownOpen ? 'rotate-180' : ''}`} 
                        style={{ color: colors.textMuted }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-semibold truncate text-sm" style={{ color: colors.text }}>
                      AI Enterprise Architect
                    </div>
                    <div className="text-xs truncate" style={{ color: colors.textMuted }}>
                      Schema Intelligence Platform
                    </div>
                  </>
                )}
              </div>
            )}
          </button>

          {/* Project Dropdown Menu */}
          {isProjectDropdownOpen && isProjectPage && !isSidebarCollapsed && (
            <div
              className="absolute left-0 right-0 top-full mx-2 mt-1 rounded-lg border shadow-xl overflow-hidden z-50"
              style={{ 
                backgroundColor: colors.card,
                borderColor: colors.border,
                width: 'calc(100% - 16px)'
              }}
            >
              <div className="py-1">
                <div 
                  className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider"
                  style={{ color: colors.textMuted }}
                >
                  Switch Project
                </div>
                {allProjects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleProjectSwitch(p.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:opacity-80 transition-opacity"
                    style={{ 
                      backgroundColor: p.id === project?.id ? hexToRgba(colors.primary, 0.08) : 'transparent'
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: p.color || colors.primary }}
                    >
                      <Database className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div 
                        className="text-sm font-medium truncate"
                        style={{ color: p.id === project?.id ? colors.primary : colors.text }}
                      >
                        {p.name}
                      </div>
                      <div className="text-xs truncate" style={{ color: colors.textMuted }}>
                        {p._count?.tables || 0} tables • {p.softwareType}
                      </div>
                    </div>
                    {p.id === project?.id && (
                      <Check className="w-4 h-4 flex-shrink-0" style={{ color: colors.primary }} />
                    )}
                  </button>
                ))}
              </div>
              
              <div className="border-t" style={{ borderColor: colors.border }} />
              
              <button
                onClick={() => {
                  setIsProjectDropdownOpen(false)
                  router.push('/?tab=projects')
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:opacity-80 transition-opacity"
                style={{ backgroundColor: colors.bg }}
              >
                <FolderKanban className="w-4 h-4" style={{ color: colors.textMuted }} />
                <span className="text-sm" style={{ color: colors.textMuted }}>View All Projects</span>
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = isProjectPage 
              ? activeProjectKey === item.key 
              : pathname === item.path || (item.tab && pathname === '/' && new URLSearchParams(window.location.search).get('tab') === item.tab.replace('-main', ''))
            
            const count = isProjectPage && project?._count ? 
              (item.key === 'files' ? project._count.files :
               item.key === 'tables' ? project._count.tables :
               item.key === 'procedures' ? project._count.procedures :
               item.key === 'views' ? project._count.cshtmlViews : undefined) : undefined

            return (
              <button
                key={item.key}
                onClick={() => isProjectPage ? handleProjectNavigation((item as any).path || '') : handleMainNavigation((item as any).path)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  isActive ? 'border-r-2' : ''
                }`}
                style={{
                  backgroundColor: isActive ? hexToRgba(colors.primary, 0.1) : 'transparent',
                  borderRightColor: isActive ? colors.primary : 'transparent',
                  color: isActive ? colors.primary : colors.textMuted
                }}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isSidebarCollapsed && (
                  <>
                    <span className="flex-1 truncate">{item.label}</span>
                    {count !== undefined && count > 0 && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: colors.bg, color: colors.textMuted }}
                      >
                        {count}
                      </span>
                    )}
                  </>
                )}
              </button>
            )
          })}
        </nav>

        {/* Quick Stats (only on project pages) */}
        {isProjectPage && project && !isSidebarCollapsed && (
          <div className="p-4 border-t" style={{ borderColor: colors.border }}>
            <h3 
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: colors.textMuted }}
            >
              Quick Stats
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between" style={{ color: colors.textMuted }}>
                <span>Tables</span>
                <span style={{ color: colors.text }} className="font-medium">{project._count?.tables || 0}</span>
              </div>
              <div className="flex justify-between" style={{ color: colors.textMuted }}>
                <span>Procedures</span>
                <span style={{ color: colors.text }} className="font-medium">{project._count?.procedures || 0}</span>
              </div>
              <div className="flex justify-between" style={{ color: colors.textMuted }}>
                <span>Views</span>
                <span style={{ color: colors.text }} className="font-medium">{project._count?.cshtmlViews || 0}</span>
              </div>
            </div>
          </div>
        )}

        {/* Sidebar Footer */}
        <div className="p-3 border-t" style={{ borderColor: colors.border }}>
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm"
            style={{ color: colors.textMuted }}
          >
            <ChevronRight
              className={`w-4 h-4 transition-transform ${isSidebarCollapsed ? '' : 'rotate-180'}`}
            />
            {!isSidebarCollapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className="flex-1 transition-all duration-300"
        style={{
          marginLeft: isSidebarCollapsed ? '60px' : '240px'
        }}
      >
        {children}
      </main>

      {/* Mobile Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}
    </div>
  )
}
