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
  PlayCircle,
  Sparkles,
  Zap,
  Brain,
  Layers,
  Key,
  Puzzle
} from 'lucide-react'

interface LearningModule {
  id: string
  title: string
  description: string
  type: 'documentation' | 'tutorial' | 'video' | 'interactive'
  duration: string
  completed: boolean
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
}

interface QuickStat {
  label: string
  value: string | number
  icon: any
  color: string
}

export default function LearningDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const { colors } = useTheme()
  const projectId = params.id as string

  const [project, setProject] = useState<any>(null)
  const [modules, setModules] = useState<LearningModule[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

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
    // Learning modules based on Schema Architect features
    const defaultModules: LearningModule[] = [
      // Getting Started
      {
        id: 'gs-1',
        title: 'Getting Started with Schema Architect',
        description: 'Learn the basics of uploading and parsing SQL schemas. Understand the project structure and navigation.',
        type: 'tutorial',
        duration: '15 min',
        completed: false,
        category: 'Getting Started',
        difficulty: 'beginner'
      },
      {
        id: 'gs-2',
        title: 'Project Management',
        description: 'Create and manage projects. Learn how to organize your work with multiple database schemas.',
        type: 'documentation',
        duration: '10 min',
        completed: false,
        category: 'Getting Started',
        difficulty: 'beginner'
      },
      // Parsing & Intelligence
      {
        id: 'pi-1',
        title: 'SQL DDL Parsing',
        description: 'Master the SQL parser that extracts tables, columns, foreign keys, and constraints from CREATE TABLE statements.',
        type: 'tutorial',
        duration: '25 min',
        completed: false,
        category: 'Parsing & Intelligence',
        difficulty: 'intermediate'
      },
      {
        id: 'pi-2',
        title: 'CSHTML View Analysis',
        description: 'Learn how the system extracts field intelligence from ASP.NET MVC views including FK detection.',
        type: 'tutorial',
        duration: '20 min',
        completed: false,
        category: 'Parsing & Intelligence',
        difficulty: 'intermediate'
      },
      {
        id: 'pi-3',
        title: 'Stored Procedure Intelligence',
        description: 'Extract business logic and table access patterns from stored procedures.',
        type: 'documentation',
        duration: '15 min',
        completed: false,
        category: 'Parsing & Intelligence',
        difficulty: 'intermediate'
      },
      // FK Resolution
      {
        id: 'fk-1',
        title: 'Understanding FK Resolution',
        description: 'Learn the foreign key dependency resolution workflow. Resolve missing tables before generating schemas.',
        type: 'tutorial',
        duration: '20 min',
        completed: false,
        category: 'FK Resolution',
        difficulty: 'advanced'
      },
      {
        id: 'fk-2',
        title: 'AI Schema Generation',
        description: 'Use AI to generate table schemas for missing dependencies based on field analysis.',
        type: 'interactive',
        duration: '10 min',
        completed: false,
        category: 'FK Resolution',
        difficulty: 'advanced'
      },
      // Code Generation
      {
        id: 'cg-1',
        title: 'Prisma Schema Generation',
        description: 'Convert SQL DDL to Prisma schema format with proper type mappings.',
        type: 'tutorial',
        duration: '30 min',
        completed: false,
        category: 'Code Generation',
        difficulty: 'intermediate'
      },
      {
        id: 'cg-2',
        title: 'React Component Generation',
        description: 'Auto-generate React forms, tables, and pages from schema intelligence.',
        type: 'tutorial',
        duration: '25 min',
        completed: false,
        category: 'Code Generation',
        difficulty: 'intermediate'
      },
      {
        id: 'cg-3',
        title: 'API Route Generation',
        description: 'Generate Next.js API routes with CRUD operations, validation, and error handling.',
        type: 'tutorial',
        duration: '20 min',
        completed: false,
        category: 'Code Generation',
        difficulty: 'intermediate'
      },
      // Intelligence Bank
      {
        id: 'ib-1',
        title: 'Intelligence Bank Overview',
        description: 'Explore the unified intelligence layer that stores column, field, and SOP data.',
        type: 'documentation',
        duration: '15 min',
        completed: false,
        category: 'Intelligence Bank',
        difficulty: 'beginner'
      },
      {
        id: 'ib-2',
        title: 'SOP Bank Integration',
        description: 'Standard Operating Procedures for healthcare data handling and compliance.',
        type: 'documentation',
        duration: '20 min',
        completed: false,
        category: 'Intelligence Bank',
        difficulty: 'intermediate'
      },
      // Advanced Topics
      {
        id: 'at-1',
        title: 'Module Registry & Matching',
        description: 'Match tables to 35 HIS modules automatically. Understand layer-based organization.',
        type: 'documentation',
        duration: '20 min',
        completed: false,
        category: 'Advanced Topics',
        difficulty: 'advanced'
      },
      {
        id: 'at-2',
        title: 'Project Export & Packaging',
        description: 'Export complete Next.js projects with all dependencies, ready for deployment.',
        type: 'tutorial',
        duration: '25 min',
        completed: false,
        category: 'Advanced Topics',
        difficulty: 'advanced'
      },
    ]
    setModules(defaultModules)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'documentation': return <FileText className="w-5 h-5" />
      case 'tutorial': return <PlayCircle className="w-5 h-5" />
      case 'video': return <PlayCircle className="w-5 h-5" />
      case 'interactive': return <Zap className="w-5 h-5" />
      default: return <BookOpen className="w-5 h-5" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'documentation': return colors.primary
      case 'tutorial': return colors.accent
      case 'video': return '#ef4444'
      case 'interactive': return '#10b981'
      default: return colors.textMuted
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '#10b981'
      case 'intermediate': return '#f59e0b'
      case 'advanced': return '#ef4444'
      default: return colors.textMuted
    }
  }

  const filteredModules = modules.filter(m => {
    const matchesCategory = activeCategory === 'all' || m.category === activeCategory
    const matchesSearch = !searchQuery || 
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const categories = ['all', ...new Set(modules.map(m => m.category))]

  const quickStats: QuickStat[] = [
    { label: 'Modules', value: modules.length, icon: BookOpen, color: colors.primary },
    { label: 'Completed', value: modules.filter(m => m.completed).length, icon: CheckCircle, color: '#10b981' },
    { label: 'Total Time', value: '4h 15m', icon: Clock, color: colors.accent },
  ]

  const handleModuleComplete = (moduleId: string) => {
    setModules(prev => 
      prev.map(m => m.id === moduleId ? { ...m, completed: true } : m)
    )
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
        <div className="flex-1">
          <h1 className="text-2xl font-bold" style={{ color: colors.text }}>
            Learning Dashboard
          </h1>
          <p style={{ color: colors.textMuted }}>
            Master Schema Architect with tutorials and documentation
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ backgroundColor: `${colors.accent}20` }}>
          <Brain className="w-5 h-5" style={{ color: colors.accent }} />
          <span className="text-sm font-medium" style={{ color: colors.accent }}>AI-Powered Learning</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        {quickStats.map((stat) => (
          <div 
            key={stat.label}
            className="p-4 rounded-lg border"
            style={{ borderColor: colors.border, backgroundColor: colors.cardBg }}
          >
            <div className="flex items-center gap-3">
              <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
              <div>
                <div className="text-xl font-bold" style={{ color: colors.text }}>
                  {stat.value}
                </div>
                <div className="text-sm" style={{ color: colors.textMuted }}>{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search modules..."
          className="flex-1 px-4 py-2 rounded-lg border"
          style={{ borderColor: colors.border, backgroundColor: colors.bg, color: colors.text }}
        />
        <div className="flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="px-4 py-2 rounded-lg text-sm transition-colors"
              style={{
                backgroundColor: activeCategory === cat ? colors.primary : 'transparent',
                color: activeCategory === cat ? '#fff' : colors.textMuted,
                border: `1px solid ${activeCategory === cat ? colors.primary : colors.border}`
              }}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredModules.map((module) => (
          <div
            key={module.id}
            className="p-4 rounded-lg border cursor-pointer hover:shadow-lg transition-all"
            style={{ borderColor: colors.border, backgroundColor: colors.cardBg }}
            onClick={() => handleModuleComplete(module.id)}
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
                <div className="flex items-center gap-3 text-xs" style={{ color: colors.textMuted }}>
                  <span 
                    className="px-2 py-0.5 rounded"
                    style={{ backgroundColor: `${getTypeColor(module.type)}20`, color: getTypeColor(module.type) }}
                  >
                    {module.type}
                  </span>
                  <span 
                    className="px-2 py-0.5 rounded"
                    style={{ backgroundColor: `${getDifficultyColor(module.difficulty)}20`, color: getDifficultyColor(module.difficulty) }}
                  >
                    {module.difficulty}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {module.duration}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-4 gap-4">
        <button
          onClick={() => router.push(`/project/${projectId}/tables`)}
          className="p-4 rounded-lg border text-left hover:opacity-90 transition-opacity"
          style={{ borderColor: colors.border, backgroundColor: colors.bg }}
        >
          <Database className="w-6 h-6 mb-2" style={{ color: colors.primary }} />
          <div className="font-medium text-sm" style={{ color: colors.text }}>Tables</div>
          <div className="text-xs" style={{ color: colors.textMuted }}>View parsed schemas</div>
        </button>
        <button
          onClick={() => router.push(`/project/${projectId}/fk-resolution`)}
          className="p-4 rounded-lg border text-left hover:opacity-90 transition-opacity"
          style={{ borderColor: colors.border, backgroundColor: colors.bg }}
        >
          <Key className="w-6 h-6 mb-2" style={{ color: colors.accent }} />
          <div className="font-medium text-sm" style={{ color: colors.text }}>FK Resolution</div>
          <div className="text-xs" style={{ color: colors.textMuted }}>Resolve dependencies</div>
        </button>
        <button
          onClick={() => router.push(`/project/${projectId}/prisma`)}
          className="p-4 rounded-lg border text-left hover:opacity-90 transition-opacity"
          style={{ borderColor: colors.border, backgroundColor: colors.bg }}
        >
          <Code className="w-6 h-6 mb-2" style={{ color: '#10b981' }} />
          <div className="font-medium text-sm" style={{ color: colors.text }}>Prisma Schema</div>
          <div className="text-xs" style={{ color: colors.textMuted }}>Generated schemas</div>
        </button>
        <button
          onClick={() => router.push(`/?tab=intelligence-bank`)}
          className="p-4 rounded-lg border text-left hover:opacity-90 transition-opacity"
          style={{ borderColor: colors.border, backgroundColor: colors.bg }}
        >
          <Layers className="w-6 h-6 mb-2" style={{ color: '#8b5cf6' }} />
          <div className="font-medium text-sm" style={{ color: colors.text }}>Intelligence Bank</div>
          <div className="text-xs" style={{ color: colors.textMuted }}>Unified intelligence</div>
        </button>
      </div>
    </div>
  )
}
