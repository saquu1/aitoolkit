'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTheme } from '@/hooks/useTheme'
import { 
  BookOpen, 
  FileText, 
  Database, 
  Code, 
  ArrowLeft,
  ExternalLink,
  CheckCircle,
  Clock,
  PlayCircle
} from 'lucide-react'

interface LearningModule {
  id: string
  title: string
  description: string
  type: 'documentation' | 'tutorial' | 'video'
  duration: string
  completed: boolean
}

export default function LearningPage() {
  const params = useParams()
  const router = useRouter()
  const { colors } = useTheme()
  const projectId = params.id as string

  const [project, setProject] = useState<any>(null)
  const [modules, setModules] = useState<LearningModule[]>([])

  useEffect(() => {
    fetchProject()
    fetchLearningModules()
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
    }
  }

  const fetchLearningModules = async () => {
    // Default learning modules based on the project type
    const defaultModules: LearningModule[] = [
      {
        id: '1',
        title: 'Getting Started with Schema Architect',
        description: 'Learn the basics of uploading and parsing SQL schemas',
        type: 'tutorial',
        duration: '15 min',
        completed: false
      },
      {
        id: '2',
        title: 'Understanding FK Resolution',
        description: 'Master the foreign key dependency resolution workflow',
        type: 'documentation',
        duration: '10 min',
        completed: false
      },
      {
        id: '3',
        title: 'CSHTML View Analysis',
        description: 'Learn how to analyze CSHTML views and extract intelligence',
        type: 'tutorial',
        duration: '20 min',
        completed: false
      },
      {
        id: '4',
        title: 'Module Registry Overview',
        description: 'Explore the 35 HIS modules and their relationships',
        type: 'documentation',
        duration: '15 min',
        completed: false
      },
      {
        id: '5',
        title: 'Generating Prisma Schemas',
        description: 'Convert SQL DDL to Prisma schema format',
        type: 'tutorial',
        duration: '25 min',
        completed: false
      }
    ]
    setModules(defaultModules)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'documentation': return <FileText className="w-5 h-5" />
      case 'tutorial': return <PlayCircle className="w-5 h-5" />
      case 'video': return <PlayCircle className="w-5 h-5" />
      default: return <BookOpen className="w-5 h-5" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'documentation': return colors.primary
      case 'tutorial': return colors.accent
      case 'video': return '#ef4444'
      default: return colors.textMuted
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push(`/project/${projectId}`)}
          className="p-2 rounded-lg hover:opacity-80"
          style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.border}` }}
        >
          <ArrowLeft className="w-5 h-5" style={{ color: colors.text }} />
        </button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: colors.text }}>
            Learning Center
          </h1>
          <p style={{ color: colors.textMuted }}>
            Tutorials and documentation for {project?.name || 'your project'}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div 
          className="p-4 rounded-lg border"
          style={{ borderColor: colors.border, backgroundColor: colors.cardBg }}
        >
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8" style={{ color: colors.primary }} />
            <div>
              <div className="text-2xl font-bold" style={{ color: colors.text }}>
                {modules.length}
              </div>
              <div className="text-sm" style={{ color: colors.textMuted }}>Modules</div>
            </div>
          </div>
        </div>
        <div 
          className="p-4 rounded-lg border"
          style={{ borderColor: colors.border, backgroundColor: colors.cardBg }}
        >
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8" style={{ color: '#10b981' }} />
            <div>
              <div className="text-2xl font-bold" style={{ color: colors.text }}>
                {modules.filter(m => m.completed).length}
              </div>
              <div className="text-sm" style={{ color: colors.textMuted }}>Completed</div>
            </div>
          </div>
        </div>
        <div 
          className="p-4 rounded-lg border"
          style={{ borderColor: colors.border, backgroundColor: colors.cardBg }}
        >
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8" style={{ color: colors.accent }} />
            <div>
              <div className="text-2xl font-bold" style={{ color: colors.text }}>
                85 min
              </div>
              <div className="text-sm" style={{ color: colors.textMuted }}>Total Duration</div>
            </div>
          </div>
        </div>
      </div>

      {/* Learning Modules */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold" style={{ color: colors.text }}>
          Available Modules
        </h2>
        <div className="grid gap-4">
          {modules.map((module) => (
            <div
              key={module.id}
              className="p-4 rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
              style={{ borderColor: colors.border, backgroundColor: colors.cardBg }}
              onClick={() => {
                // Mark as completed for demo
                setModules(prev => 
                  prev.map(m => m.id === module.id ? { ...m, completed: true } : m)
                )
              }}
            >
              <div className="flex items-start gap-4">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${getTypeColor(module.type)}20` }}
                >
                  {getTypeIcon(module.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium" style={{ color: colors.text }}>
                      {module.title}
                    </h3>
                    {module.completed && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  <p className="text-sm mb-2" style={{ color: colors.textMuted }}>
                    {module.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs" style={{ color: colors.textMuted }}>
                    <span 
                      className="px-2 py-0.5 rounded"
                      style={{ backgroundColor: `${getTypeColor(module.type)}20`, color: getTypeColor(module.type) }}
                    >
                      {module.type}
                    </span>
                    <span>{module.duration}</span>
                  </div>
                </div>
                <ExternalLink className="w-5 h-5 flex-shrink-0" style={{ color: colors.textMuted }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Resources */}
      <div className="p-4 rounded-lg border" style={{ borderColor: colors.border, backgroundColor: colors.cardBg }}>
        <h3 className="font-medium mb-3" style={{ color: colors.text }}>
          Additional Resources
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            className="p-3 rounded-lg border text-left hover:opacity-90"
            style={{ borderColor: colors.border, backgroundColor: colors.bg }}
            onClick={() => router.push(`/project/${projectId}/tables`)}
          >
            <Database className="w-5 h-5 mb-2" style={{ color: colors.primary }} />
            <div className="font-medium text-sm" style={{ color: colors.text }}>Tables Reference</div>
            <div className="text-xs" style={{ color: colors.textMuted }}>View parsed tables</div>
          </button>
          <button
            className="p-3 rounded-lg border text-left hover:opacity-90"
            style={{ borderColor: colors.border, backgroundColor: colors.bg }}
            onClick={() => router.push(`/project/${projectId}/prisma`)}
          >
            <Code className="w-5 h-5 mb-2" style={{ color: colors.accent }} />
            <div className="font-medium text-sm" style={{ color: colors.text }}>Prisma Schema</div>
            <div className="text-xs" style={{ color: colors.textMuted }}>Generated schemas</div>
          </button>
        </div>
      </div>
    </div>
  )
}
