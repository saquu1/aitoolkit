'use client'

import { useTheme } from '@/hooks/useTheme'
import { useSchema } from '@/hooks/useSchema'
import type { LinkedModule } from '@/types/his-modules'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Database, 
  Brain, 
  Puzzle, 
  GitBranch, 
  FileCode, 
  Zap, 
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Shield,
  BarChart3,
  Activity,
  Upload
} from 'lucide-react'

interface DashboardTabProps {
  onNavigate?: (tab: string) => void
}

export function DashboardTab({ onNavigate }: DashboardTabProps) {
  const { colors } = useTheme()
  const { 
    totalTables, 
    totalColumns, 
    fkRelationships, 
    fkResolved, 
    fkResolvedPercent, 
    modulesLinked,
    linkedModules,
    moduleSummary,
    missingTables,
    dbStats,
    dbStatsLoading,
    refreshDbStats
  } = useSchema()

  // Helper function to create semi-transparent colors
  const alpha = (color: string, opacity: number) => 
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  // Real data from schema context
  const stats = {
    tablesParsed: totalTables,
    totalColumns: totalColumns,
    fkRelationships: fkRelationships,
    fkResolved: fkResolvedPercent,
    modulesLinked: modulesLinked,
    healthScore: totalTables > 0 ? Math.round((fkResolvedPercent + (modulesLinked / 35 * 100)) / 2) : 0,
  }
  
  // Format last sync time
  const formatLastSync = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const agentLayers = [
    { 
      name: 'Schema Layer', 
      icon: Database, 
      description: 'SQL DDL Parser, SP Parser, View Analyzer, CSHTML Parser, FK Resolver',
      status: 'ready',
      agents: 5,
      iconColor: colors.accent
    },
    { 
      name: 'Intelligence Layer', 
      icon: Brain, 
      description: 'Column Intelligence, PII/PHI Detection, Relationships, Business Rules',
      status: 'ready',
      agents: 5,
      iconColor: colors.primary
    },
    { 
      name: 'Module Layer', 
      icon: Puzzle, 
      description: 'Module Registry, Auto-Linker, Priority Planner, Dependency Chain',
      status: 'ready',
      agents: 5,
      iconColor: colors.success
    },
    { 
      name: 'Requirements Layer', 
      icon: FileCode, 
      description: 'AI Questions, User Stories, Acceptance Criteria, SOPs',
      status: 'ready',
      agents: 5,
      iconColor: colors.warning
    },
    { 
      name: 'Generation Layer', 
      icon: Zap, 
      description: 'Prisma Schema, API Specs, Screen Blueprints, Code, Tests, Docs',
      status: 'ready',
      agents: 6,
      iconColor: '#eab308'
    },
    { 
      name: 'Migration Layer', 
      icon: GitBranch, 
      description: 'DB Converter, SP to Node.js, CSHTML to React, Migration Planner',
      status: 'ready',
      agents: 4,
      iconColor: '#ec4899'
    },
    { 
      name: 'Management Layer', 
      icon: BarChart3, 
      description: 'Dashboards, Risk Assessment, Decision Log, Compliance, Team',
      status: 'ready',
      agents: 5,
      iconColor: '#06b6d4'
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: colors.text }}>Dashboard</h2>
          <p className="mt-1" style={{ color: colors.textMuted }}>Multi-Agent Schema Intelligence Platform</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge 
            variant="outline" 
            style={{
              backgroundColor: alpha(colors.bgSecondary, 50),
              color: colors.textMuted,
              borderColor: colors.border
            }}
          >
            <Clock className="w-3 h-3 mr-1" />
            Last sync: {formatLastSync(dbStats?.lastSync || null)}
          </Badge>
          <Button 
            style={{ backgroundColor: colors.primary }}
            onClick={() => onNavigate?.('pipeline')}
          >
            <Activity className="w-4 h-4 mr-2" />
            Run Full Analysis
          </Button>
        </div>
      </div>

      {/* Health Score Card */}
      <div 
        className="rounded-xl border p-6"
        style={{ 
          background: `linear-gradient(to right, ${colors.bgSecondary}, ${alpha(colors.bgSecondary, 50)})`,
          borderColor: colors.border 
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="relative">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  style={{ color: colors.border }}
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${stats.healthScore * 2.51} 251`}
                  style={{ color: colors.primary }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold" style={{ color: colors.text }}>{stats.healthScore}</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold" style={{ color: colors.text }}>Schema Health Score</h3>
              <p className="text-sm mt-1" style={{ color: colors.textMuted }}>Upload SQL files to begin analysis</p>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.accent }} />
                  <span className="text-xs" style={{ color: colors.textMuted }}>FK Resolution: {stats.fkResolved}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.success }} />
                  <span className="text-xs" style={{ color: colors.textMuted }}>Module Coverage: {stats.modulesLinked}/35</span>
                </div>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold" style={{ color: colors.text }}>{stats.tablesParsed}</div>
            <div className="text-sm" style={{ color: colors.textMuted }}>Tables Parsed</div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Tables', value: stats.tablesParsed, icon: Database, iconColor: colors.accent },
          { label: 'Columns Analyzed', value: stats.totalColumns, icon: FileCode, iconColor: colors.primary },
          { label: 'FK Relationships', value: stats.fkRelationships, icon: GitBranch, iconColor: colors.success },
          { label: 'Modules Linked', value: stats.modulesLinked, icon: Puzzle, iconColor: colors.warning },
        ].map((stat) => (
          <div 
            key={stat.label}
            className="rounded-xl border p-4"
            style={{ 
              backgroundColor: alpha(colors.card, 50),
              borderColor: colors.border 
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: colors.textMuted }}>{stat.label}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: colors.text }}>{stat.value}</p>
              </div>
              <stat.icon className="w-8 h-8 opacity-50" style={{ color: stat.iconColor }} />
            </div>
          </div>
        ))}
      </div>

      {/* Agent Layers Status */}
      <div 
        className="rounded-xl border p-6"
        style={{ 
          backgroundColor: alpha(colors.card, 50),
          borderColor: colors.border 
        }}
      >
        <div className="mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: colors.text }}>
            <Brain className="w-5 h-5" style={{ color: colors.primary }} />
            Agent System Status
          </h3>
          <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
            35 sub-agents across 7 layers ready for execution
          </p>
        </div>
        <div className="space-y-3">
          {agentLayers.map((layer) => (
            <div 
              key={layer.name}
              className="flex items-center justify-between p-4 rounded-lg transition-colors cursor-pointer"
              style={{ 
                backgroundColor: alpha(colors.bgTertiary, 30),
              }}
            >
              <div className="flex items-center gap-4">
                <div 
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: alpha(layer.iconColor, 20) }}
                >
                  <layer.icon className="w-5 h-5" style={{ color: layer.iconColor }} />
                </div>
                <div>
                  <h4 className="font-medium" style={{ color: colors.text }}>{layer.name}</h4>
                  <p className="text-xs mt-0.5" style={{ color: colors.textMuted }}>{layer.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge 
                  variant="secondary"
                  style={{ 
                    backgroundColor: alpha(colors.bgTertiary, 50),
                    color: colors.textMuted 
                  }}
                >
                  {layer.agents} agents
                </Badge>
                <Badge 
                  style={{ 
                    backgroundColor: alpha(colors.success, 20),
                    color: colors.success,
                    border: `1px solid ${alpha(colors.success, 30)}`
                  }}
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Ready
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { 
            title: 'Upload SQL Schema', 
            desc: 'Parse DDL, procedures, views, and CSHTML',
            icon: Upload,
            tab: 'upload',
            color: colors.accent
          },
          { 
            title: 'Run Pipeline', 
            desc: 'Execute full analysis or quick scan',
            icon: GitBranch,
            tab: 'pipeline',
            color: colors.primary
          },
          { 
            title: 'View Compliance', 
            desc: 'PII/PHI detection and data sensitivity',
            icon: Shield,
            tab: 'intelligence',
            color: colors.success
          },
        ].map((action) => (
          <div 
            key={action.title}
            className="rounded-xl border p-6 cursor-pointer transition-all hover:scale-[1.02]"
            style={{ 
              background: `linear-gradient(to bottom right, ${alpha(action.color, 20)}, ${alpha(action.color, 10)})`,
              borderColor: alpha(action.color, 30),
            }}
            onClick={() => onNavigate?.(action.tab)}
          >
            <action.icon className="w-8 h-8 mb-3" style={{ color: action.color }} />
            <h3 className="font-semibold" style={{ color: colors.text }}>{action.title}</h3>
            <p className="text-sm mt-1" style={{ color: colors.textMuted }}>{action.desc}</p>
            <ArrowRight className="w-4 h-4 mt-3" style={{ color: action.color }} />
          </div>
        ))}
      </div>

      {/* Getting Started - only show if no tables in DB */}
      {totalTables === 0 && !dbStatsLoading && (
        <div 
          className="rounded-xl border p-6"
          style={{ 
            background: `linear-gradient(to right, ${alpha(colors.primary, 30)}, ${alpha(colors.accent, 30)})`,
            borderColor: alpha(colors.primary, 30)
          }}
        >
          <div className="flex items-start gap-4">
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: alpha(colors.primary, 20) }}
            >
              <TrendingUp className="w-6 h-6" style={{ color: colors.primary }} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold" style={{ color: colors.text }}>Getting Started</h3>
              <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                Upload your SQL schema files to begin the analysis. The system will:
              </p>
              <ul className="mt-3 space-y-2">
                {[
                  'Parse tables, columns, constraints, and foreign keys',
                  'Detect missing tables and resolve FK dependencies',
                  'Auto-link tables to 35 HIS modules',
                  'Infer column intelligence (UI types, validation rules)',
                  'Detect PII/PHI data for compliance',
                  'Generate Prisma schemas and API specifications',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm" style={{ color: colors.textSecondary }}>
                    <CheckCircle2 className="w-4 h-4" style={{ color: colors.success }} />
                    {item}
                  </li>
                ))}
              </ul>
              <Button 
                className="mt-4"
                style={{ backgroundColor: colors.primary }}
                onClick={() => onNavigate?.('upload')}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Your First Schema
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
