'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, usePathname } from 'next/navigation'
import { ThemeProvider, useTheme } from '@/hooks/useTheme'
import { SchemaProvider } from '@/hooks/useSchema'
import { Badge } from '@/components/ui/badge'
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
  Upload,
  Brain,
  GitBranch,
  BarChart3,
  BookOpen
} from 'lucide-react'

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

const NAV_ITEMS = [
  { key: 'status', label: 'Status', icon: BarChart3, path: '' },
  { key: 'upload', label: 'Upload Files', icon: Upload, path: '/upload' },
  { key: 'files', label: 'Files', icon: FileCode, path: '/files' },
  { key: 'tables', label: 'Tables', icon: Table2, path: '/tables' },
  { key: 'procedures', label: 'Procedures', icon: Code, path: '/procedures' },
  { key: 'views', label: 'CSHTML Views', icon: FileText, path: '/views' },
  { key: 'fk-resolution', label: 'FK Resolution', icon: Key, path: '/fk-resolution' },
  { key: 'intelligence', label: 'Intelligence', icon: Brain, path: '/intelligence' },
  { key: 'modules', label: 'Modules', icon: GitBranch, path: '/modules' },
  { key: 'prisma', label: 'Prisma Schema', icon: Layers, path: '/prisma' },
  { key: 'learning', label: 'Learning', icon: BookOpen, path: '/learning' },
  { key: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
]

function ProjectLayoutContent({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const { colors } = useTheme()
  const projectId = params.id as string

  const [project, setProject] = useState<ProjectInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  useEffect(() => {
    fetchProject()
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

  const getActiveKey = () => {
    if (pathname === `/project/${projectId}`) {
      return 'status'
    }
    for (const item of NAV_ITEMS) {
      if (item.path && pathname === `/project/${projectId}${item.path}`) {
        return item.key
      }
    }
    return 'status'
  }

  const handleNavigation = (path: string) => {
    router.push(`/project/${projectId}${path}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.bg }}>
        <div className="animate-pulse text-lg" style={{ color: colors.textMuted }}>Loading...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.bg }}>
        <div className="text-center">
          <Database className="w-12 h-12 mx-auto mb-4" style={{ color: colors.textMuted }} />
          <p style={{ color: colors.textMuted }}>Project not found</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-4 py-2 rounded-lg"
            style={{ backgroundColor: colors.primary, color: '#fff' }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const activeKey = getActiveKey()

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: colors.bg }}>
      {/* Sidebar */}
      <aside
        className="fixed left-0 top-0 h-screen border-r flex flex-col transition-all duration-300 z-20"
        style={{
          width: isSidebarCollapsed ? '60px' : '240px',
          backgroundColor: colors.card,
          borderColor: colors.border
        }}
      >
        {/* Sidebar Header */}
        <div
          className="flex items-center gap-3 p-4 border-b cursor-pointer"
          style={{ borderColor: colors.border }}
          onClick={() => router.push('/dashboard')}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: project.color }}
          >
            <Database className="w-4 h-4 text-white" />
          </div>
          {!isSidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="font-semibold truncate" style={{ color: colors.text }}>
                {project.name}
              </div>
              <Badge variant="outline" className="text-xs mt-0.5">{project.softwareType}</Badge>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeKey === item.key
            const count = item.key === 'files' ? project._count?.files :
                         item.key === 'tables' ? project._count?.tables :
                         item.key === 'procedures' ? project._count?.procedures :
                         item.key === 'views' ? project._count?.cshtmlViews : undefined

            return (
              <button
                key={item.key}
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  isActive ? 'border-r-2' : ''
                }`}
                style={{
                  backgroundColor: isActive ? `color-mix(in srgb, ${colors.primary} 10%, transparent)` : 'transparent',
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
    </div>
  )
}

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SchemaProvider>
        <ProjectLayoutContent>{children}</ProjectLayoutContent>
      </SchemaProvider>
    </ThemeProvider>
  )
}
