'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { useSchema } from '@/hooks/useSchema'
import type { LinkedModule } from '@/types/his-modules'
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
  CheckCircle2,
  Clock,
  ArrowRight,
  Shield,
  BarChart3,
  Activity,
  Upload,
  Cpu,
  HardDrive,
  Wifi,
  Layers,
  Sparkles,
  RefreshCw,
  Terminal
} from 'lucide-react'

interface DashboardTabProps {
  onNavigate?: (tab: string) => void
}

interface ActivityItem {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
  time: string
  icon: typeof Database
}

// Simulated activity feed data
const initialActivities: ActivityItem[] = [
  { id: '1', type: 'success', message: 'System initialized successfully', time: '0s ago', icon: CheckCircle2 },
  { id: '2', type: 'info', message: 'Schema Intelligence Engine loaded', time: '1s ago', icon: Brain },
  { id: '3', type: 'info', message: '35 agent modules registered', time: '2s ago', icon: Layers },
  { id: '4', type: 'info', message: 'Theme engine initialized (Midnight)', time: '3s ago', icon: Sparkles },
  { id: '5', type: 'success', message: 'Database connection established', time: '4s ago', icon: Database },
]

export function DashboardTab({ onNavigate }: DashboardTabProps) {
  const { colors, colorScheme } = useTheme()
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

  const [currentTime, setCurrentTime] = useState(new Date())
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities)
  const [systemMetrics, setSystemMetrics] = useState({ cpu: 12, memory: 45, uptime: 0 })

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // System metrics simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setSystemMetrics(prev => ({
        cpu: Math.max(5, Math.min(95, prev.cpu + (Math.random() - 0.5) * 8)),
        memory: Math.max(30, Math.min(85, prev.memory + (Math.random() - 0.5) * 4)),
        uptime: prev.uptime + 1,
      }))
    }, 3000)
    return () => clearInterval(timer)
  }, [])

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

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`
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

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'success': return colors.success
      case 'warning': return colors.warning
      case 'error': return colors.error
      default: return colors.primary
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header with Live Clock */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold" style={{ color: colors.text }}>Dashboard</h2>
            <div 
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ 
                backgroundColor: alpha(colors.success, 15),
                color: colors.success,
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: colors.success }} />
              Live
            </div>
          </div>
          <p className="mt-1" style={{ color: colors.textMuted }}>Multi-Agent Schema Intelligence Platform</p>
        </div>
        <div className="flex items-center gap-3">
          <div 
            className="text-sm font-mono px-3 py-1.5 rounded-lg border"
            style={{ 
              backgroundColor: alpha(colors.bgTertiary, 30),
              borderColor: colors.border,
              color: colors.textSecondary
            }}
          >
            {currentTime.toLocaleTimeString()}
          </div>
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

      {/* Health Score + System Metrics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Health Score Card - spans 2 columns */}
        <div 
          className="lg:col-span-2 rounded-xl border p-6"
          style={{ 
            background: `linear-gradient(135deg, ${colors.bgSecondary}, ${alpha(colors.bgSecondary, 50)})`,
            borderColor: colors.border 
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="relative">
                <svg className="w-28 h-28 transform -rotate-90">
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    style={{ color: alpha(colors.border, 80) }}
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeLinecap="round"
                    strokeDasharray={`${stats.healthScore * 3.016} 301.6`}
                    style={{ 
                      color: stats.healthScore > 70 ? colors.success : stats.healthScore > 40 ? colors.warning : colors.error,
                      transition: 'stroke-dasharray 0.5s ease'
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold" style={{ color: colors.text }}>{stats.healthScore}</span>
                  <span className="text-[10px]" style={{ color: colors.textMuted }}>SCORE</span>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: colors.text }}>Schema Health Score</h3>
                <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                  {totalTables === 0 ? 'Upload SQL files to begin analysis' : `${totalTables} tables analyzed across ${modulesLinked} modules`}
                </p>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.accent }} />
                    <span className="text-xs" style={{ color: colors.textMuted }}>FK Resolution: {stats.fkResolved}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.success }} />
                    <span className="text-xs" style={{ color: colors.textMuted }}>Module Coverage: {stats.modulesLinked}/35</span>
                  </div>
                  {missingTables.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.warning }} />
                      <span className="text-xs" style={{ color: colors.textMuted }}>Missing: {missingTables.length}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className="text-5xl font-bold" style={{ color: colors.text }}>{stats.tablesParsed}</div>
              <div className="text-sm font-medium" style={{ color: colors.textMuted }}>Tables Parsed</div>
              <div className="text-xs mt-2" style={{ color: colors.textMuted }}>
                {stats.totalColumns} columns • {stats.fkRelationships} FKs
              </div>
            </div>
          </div>
        </div>

        {/* System Monitor */}
        <div 
          className="rounded-xl border p-5"
          style={{ 
            backgroundColor: alpha(colors.card, 50),
            borderColor: colors.border 
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: colors.text }}>
              <Cpu className="w-4 h-4" style={{ color: colors.primary }} />
              System Monitor
            </h3>
            <span 
              className="text-xs px-2 py-0.5 rounded-full font-mono"
              style={{ backgroundColor: alpha(colors.success, 15), color: colors.success }}
            >
              {formatUptime(systemMetrics.uptime)}
            </span>
          </div>
          <div className="space-y-4">
            {/* CPU */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5" style={{ color: colors.textMuted }} />
                  <span className="text-xs font-medium" style={{ color: colors.textMuted }}>CPU</span>
                </div>
                <span className="text-xs font-bold" style={{ color: systemMetrics.cpu > 80 ? colors.error : colors.text }}>
                  {Math.round(systemMetrics.cpu)}%
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: alpha(colors.border, 60) }}>
                <div 
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ 
                    width: `${systemMetrics.cpu}%`,
                    backgroundColor: systemMetrics.cpu > 80 ? colors.error : systemMetrics.cpu > 60 ? colors.warning : colors.success 
                  }}
                />
              </div>
            </div>
            {/* Memory */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-3.5 h-3.5" style={{ color: colors.textMuted }} />
                  <span className="text-xs font-medium" style={{ color: colors.textMuted }}>Memory</span>
                </div>
                <span className="text-xs font-bold" style={{ color: systemMetrics.memory > 80 ? colors.error : colors.text }}>
                  {Math.round(systemMetrics.memory)}%
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: alpha(colors.border, 60) }}>
                <div 
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ 
                    width: `${systemMetrics.memory}%`,
                    backgroundColor: systemMetrics.memory > 80 ? colors.error : systemMetrics.memory > 60 ? colors.warning : colors.primary 
                  }}
                />
              </div>
            </div>
            {/* Network */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Wifi className="w-3.5 h-3.5" style={{ color: colors.textMuted }} />
                  <span className="text-xs font-medium" style={{ color: colors.textMuted }}>Network</span>
                </div>
                <span className="text-xs font-bold" style={{ color: colors.success }}>Active</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: alpha(colors.border, 60) }}>
                <div className="h-full rounded-full" style={{ width: '15%', backgroundColor: colors.success }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - 4 columns */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Tables', value: stats.tablesParsed, icon: Database, iconColor: colors.accent, change: null },
          { label: 'Columns Analyzed', value: stats.totalColumns, icon: FileCode, iconColor: colors.primary, change: null },
          { label: 'FK Relationships', value: stats.fkRelationships, icon: GitBranch, iconColor: colors.success, change: null },
          { label: 'Modules Linked', value: stats.modulesLinked, icon: Puzzle, iconColor: colors.warning, change: null },
        ].map((stat) => (
          <div 
            key={stat.label}
            className="rounded-xl border p-4 group transition-all duration-200 hover:scale-[1.02]"
            style={{ 
              backgroundColor: alpha(colors.card, 50),
              borderColor: alpha(colors.border, 80) 
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium" style={{ color: colors.textMuted }}>{stat.label}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: colors.text }}>{stat.value}</p>
              </div>
              <div 
                className="p-2.5 rounded-lg transition-colors"
                style={{ backgroundColor: alpha(stat.iconColor, 12) }}
              >
                <stat.icon className="w-5 h-5" style={{ color: stat.iconColor }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid: Agent Layers + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Agent Layers Status - 2 cols */}
        <div 
          className="lg:col-span-2 rounded-xl border p-5"
          style={{ 
            backgroundColor: alpha(colors.card, 50),
            borderColor: colors.border 
          }}
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: colors.text }}>
                <Brain className="w-5 h-5" style={{ color: colors.primary }} />
                Agent System Status
              </h3>
              <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
                35 sub-agents across 7 layers ready for execution
              </p>
            </div>
            <Badge 
              style={{ 
                backgroundColor: alpha(colors.success, 15),
                color: colors.success,
                border: `1px solid ${alpha(colors.success, 30)}`
              }}
            >
              All Systems Operational
            </Badge>
          </div>
          <div className="space-y-2">
            {agentLayers.map((layer, index) => {
              const LayerIcon = layer.icon
              return (
              <div 
                key={layer.name}
                className="flex items-center justify-between p-3 rounded-lg transition-all duration-200 cursor-pointer"
                style={{ 
                  backgroundColor: alpha(colors.bgTertiary, 20),
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: alpha(layer.iconColor, 15) }}
                    >
                      <LayerIcon className="w-4 h-4" style={{ color: layer.iconColor }} />
                    </div>
                    <span 
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                      style={{ backgroundColor: layer.iconColor }}
                    >
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium" style={{ color: colors.text }}>{layer.name}</h4>
                    <p className="text-[11px] mt-0.5" style={{ color: colors.textMuted }}>{layer.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1">
                    {Array.from({ length: Math.min(layer.agents, 3) }, (_, i) => (
                      <div 
                        key={i} 
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-[8px]"
                        style={{ 
                          borderColor: colors.bgTertiary,
                          backgroundColor: alpha(layer.iconColor, 30 + i * 15),
                          color: layer.iconColor
                        }}
                      >
                        {String.fromCharCode(65 + i)}
                      </div>
                    ))}
                    {layer.agents > 3 && (
                      <div 
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-[8px]"
                        style={{ 
                          borderColor: colors.bgTertiary,
                          backgroundColor: alpha(colors.textMuted, 20),
                          color: colors.textMuted
                        }}
                      >
                        +{layer.agents - 3}
                      </div>
                    )}
                  </div>
                  <Badge 
                    variant="secondary"
                    className="text-[10px]"
                    style={{ 
                      backgroundColor: alpha(colors.bgTertiary, 40),
                      color: colors.textMuted 
                    }}
                  >
                    {layer.agents}
                  </Badge>
                </div>
              </div>
            )})}
          </div>
        </div>

        {/* Activity Feed - 1 col */}
        <div 
          className="rounded-xl border p-5"
          style={{ 
            backgroundColor: alpha(colors.card, 50),
            borderColor: colors.border 
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: colors.text }}>
              <Terminal className="w-4 h-4" style={{ color: colors.primary }} />
              Activity Feed
            </h3>
            <button 
              className="p-1 rounded-md transition-colors"
              style={{ color: colors.textMuted }}
              onClick={() => refreshDbStats()}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
            {activities.map((activity) => (
              <div 
                key={activity.id}
                className="flex items-start gap-3 p-2 rounded-lg transition-colors"
                style={{ backgroundColor: alpha(getActivityColor(activity.type), 5) }}
              >
                <div 
                  className="p-1.5 rounded-md mt-0.5 flex-shrink-0"
                  style={{ backgroundColor: alpha(getActivityColor(activity.type), 15) }}
                >
                  <activity.icon className="w-3.5 h-3.5" style={{ color: getActivityColor(activity.type) }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs" style={{ color: colors.textSecondary }}>{activity.message}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: colors.textMuted }}>{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions - 4 columns */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { 
            title: 'Upload SQL Schema', 
            desc: 'Parse DDL, procedures, views, and CSHTML files',
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
          { 
            title: 'Generate Code', 
            desc: 'Prisma schemas, APIs, React components',
            icon: Sparkles,
            tab: 'smart-upload',
            color: colors.warning
          },
        ].map((action) => (
          <div 
            key={action.title}
            className="rounded-xl border p-5 cursor-pointer transition-all duration-200 hover:scale-[1.02] group"
            style={{ 
              background: `linear-gradient(135deg, ${alpha(action.color, 15)}, ${alpha(action.color, 5)})`,
              borderColor: alpha(action.color, 25),
            }}
            onClick={() => onNavigate?.(action.tab)}
          >
            <div className="flex items-start justify-between">
              <div 
                className="p-2.5 rounded-lg mb-3 transition-transform group-hover:scale-110"
                style={{ backgroundColor: alpha(action.color, 15) }}
              >
                <action.icon className="w-5 h-5" style={{ color: action.color }} />
              </div>
              <ArrowRight className="w-4 h-4 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: action.color }} />
            </div>
            <h3 className="text-sm font-semibold" style={{ color: colors.text }}>{action.title}</h3>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: colors.textMuted }}>{action.desc}</p>
          </div>
        ))}
      </div>

      {/* Getting Started - only show if no tables in DB */}
      {totalTables === 0 && !dbStatsLoading && (
        <div 
          className="rounded-xl border p-6"
          style={{ 
            background: `linear-gradient(135deg, ${alpha(colors.primary, 25)}, ${alpha(colors.accent, 25)})`,
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
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: colors.success }} />
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
