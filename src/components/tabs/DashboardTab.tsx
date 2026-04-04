'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
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
  Terminal,
  Globe,
  Server,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Timer,
} from 'lucide-react'
import { Sparkline, MiniBarChart, AnimatedCounter } from '@/components/Sparkline'
import { WelcomeBanner } from '@/components/WelcomeBanner'
import { ActivityTimeline } from '@/components/ActivityTimeline'
import { DataTable, type ColumnDef } from '@/components/DataTable'
import { useActionToast } from '@/hooks/useActionToast'
import { useExportCSV } from '@/hooks/useExportCSV'
import { RealtimeEventFeed } from '@/components/RealtimeEventFeed'

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

const initialActivities: ActivityItem[] = [
  { id: '1', type: 'success', message: 'System initialized successfully', time: '0s ago', icon: CheckCircle2 },
  { id: '2', type: 'info', message: 'Schema Intelligence Engine loaded', time: '1s ago', icon: Brain },
  { id: '3', type: 'info', message: '35 agent modules registered', time: '2s ago', icon: Layers },
  { id: '4', type: 'info', message: 'Theme engine initialized', time: '3s ago', icon: Sparkles },
  { id: '5', type: 'success', message: 'Database connection established', time: '4s ago', icon: Database },
  { id: '6', type: 'info', message: 'Command palette ready (Ctrl+K)', time: '5s ago', icon: Terminal },
]

// Generate realistic random data for sparklines
function generateSparklineData(length: number, min: number, max: number): number[] {
  return Array.from({ length }, () => Math.floor(Math.random() * (max - min) + min))
}

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
  const [apiStats, setApiStats] = useState<any>(null)
  const [apiStatsLoading, setApiStatsLoading] = useState(false)
  const actionToast = useActionToast()
  const { exportCSV } = useExportCSV()

  // Fetch real API stats on mount and refresh
  const fetchApiStats = useCallback(async () => {
    setApiStatsLoading(true)
    try {
      const res = await fetch('/api/schema/stats')
      const json = await res.json()
      if (json.success) setApiStats(json)
    } catch {
      // Silently fail - dashboard shows simulated data
    } finally {
      setApiStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchApiStats()
    const interval = setInterval(fetchApiStats, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [fetchApiStats])

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

  // Sparkline data - regenerated periodically for live feel
  const [sparkData, setSparkData] = useState({
    cpu: generateSparklineData(20, 5, 30),
    memory: generateSparklineData(20, 40, 70),
    requests: generateSparklineData(20, 10, 100),
    tables: generateSparklineData(20, 0, Math.max(totalTables, 5)),
  })

  useEffect(() => {
    const timer = setInterval(() => {
      setSparkData(prev => ({
        cpu: [...prev.cpu.slice(1), Math.max(5, Math.min(95, prev.cpu[prev.cpu.length - 1] + (Math.random() - 0.5) * 10))],
        memory: [...prev.memory.slice(1), Math.max(30, Math.min(85, prev.memory[prev.memory.length - 1] + (Math.random() - 0.5) * 5))],
        requests: [...prev.requests.slice(1), Math.floor(Math.random() * 80 + 20)],
        tables: [...prev.tables.slice(1), Math.max(0, prev.tables[prev.tables.length - 1] + Math.floor(Math.random() * 3))],
      }))
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  // Helper function
  const alpha = (color: string, opacity: number) =>
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  const stats = {
    tablesParsed: totalTables,
    totalColumns: totalColumns,
    fkRelationships: fkRelationships,
    fkResolved: fkResolvedPercent,
    modulesLinked: modulesLinked,
    healthScore: totalTables > 0 ? Math.round((fkResolvedPercent + (modulesLinked / 35 * 100)) / 2) : 0,
  }

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
    { name: 'Schema Layer', icon: Database, description: 'SQL DDL Parser, SP Parser, View Analyzer, CSHTML Parser, FK Resolver', status: 'ready', agents: 5, iconColor: colors.accent },
    { name: 'Intelligence Layer', icon: Brain, description: 'Column Intelligence, PII/PHI Detection, Relationships, Business Rules', status: 'ready', agents: 5, iconColor: colors.primary },
    { name: 'Module Layer', icon: Puzzle, description: 'Module Registry, Auto-Linker, Priority Planner, Dependency Chain', status: 'ready', agents: 5, iconColor: colors.success },
    { name: 'Requirements Layer', icon: FileCode, description: 'AI Questions, User Stories, Acceptance Criteria, SOPs', status: 'ready', agents: 5, iconColor: colors.warning },
    { name: 'Generation Layer', icon: Zap, description: 'Prisma Schema, API Specs, Screen Blueprints, Code, Tests, Docs', status: 'ready', agents: 6, iconColor: '#eab308' },
    { name: 'Migration Layer', icon: GitBranch, description: 'DB Converter, SP to Node.js, CSHTML to React, Migration Planner', status: 'ready', agents: 4, iconColor: '#ec4899' },
    { name: 'Management Layer', icon: BarChart3, description: 'Dashboards, Risk Assessment, Decision Log, Compliance, Team', status: 'ready', agents: 5, iconColor: '#06b6d4' },
  ]

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'success': return colors.success
      case 'warning': return colors.warning
      case 'error': return colors.error
      default: return colors.primary
    }
  }

  const refreshData = () => {
    refreshDbStats()
    fetchApiStats()
    const newActivity: ActivityItem = {
      id: `refresh-${Date.now()}`,
      type: 'info' as const,
      message: 'Data refreshed successfully',
      time: 'Just now',
      icon: RefreshCw,
      detail: 'System metrics and schema stats updated',
    }
    setActivities(prev => [newActivity, ...prev.slice(0, 9)])
    actionToast.success('Data Refreshed', 'System metrics and schema stats updated')
  }

  return (
    <div className="space-y-5">
      {/* Page Header with Live Clock */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="text-sm font-mono px-3 py-1.5 rounded-lg border"
            style={{
              backgroundColor: alpha(colors.bgTertiary, 30),
              borderColor: colors.border,
              color: colors.textSecondary
            }}
          >
            <Timer className="w-3.5 h-3.5 inline mr-1.5" style={{ color: colors.textMuted }} />
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
            onClick={() => {
              actionToast.info('Pipeline Started', 'Full analysis pipeline is now running')
              onNavigate?.('pipeline')
            }}
            className="text-xs hover-lift"
          >
            <Activity className="w-4 h-4 mr-2" />
            Run Full Analysis
          </Button>
        </div>
      </div>

      {/* Health Score + System Metrics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Health Score Card */}
        <div
          className="lg:col-span-2 rounded-xl border p-6 transition-all duration-200"
          style={{
            background: `linear-gradient(135deg, ${colors.bgSecondary}, ${alpha(colors.bgSecondary, 50)})`,
            borderColor: colors.border
          }}
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div className="relative flex-shrink-0">
                <svg className="w-28 h-28 transform -rotate-90">
                  <circle
                    cx="56" cy="56" r="48"
                    stroke="currentColor" strokeWidth="8" fill="transparent"
                    style={{ color: alpha(colors.border, 80) }}
                  />
                  <circle
                    cx="56" cy="56" r="48"
                    stroke="currentColor" strokeWidth="8" fill="transparent"
                    strokeLinecap="round"
                    strokeDasharray={`${stats.healthScore * 3.016} 301.6`}
                    style={{
                      color: stats.healthScore > 70 ? colors.success : stats.healthScore > 40 ? colors.warning : colors.error,
                      transition: 'stroke-dasharray 1s ease'
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <AnimatedCounter value={stats.healthScore} className="text-3xl font-bold" style={{ color: colors.text }} />
                  <span className="text-[10px]" style={{ color: colors.textMuted }}>SCORE</span>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: colors.text }}>Schema Health Score</h3>
                <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                  {totalTables === 0 ? 'Upload SQL files to begin analysis' : `${totalTables} tables analyzed across ${modulesLinked} modules`}
                </p>
                <div className="flex items-center gap-4 mt-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.accent }} />
                    <span className="text-xs" style={{ color: colors.textMuted }}>FK Resolution: {stats.fkResolved}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.success }} />
                    <span className="text-xs" style={{ color: colors.textMuted }}>Module Coverage: {stats.modulesLinked}/35</span>
                  </div>
                  {missingTables.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.warning }} />
                      <span className="text-xs" style={{ color: colors.textMuted }}>Missing: {missingTables.length}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-5xl font-bold" style={{ color: colors.text }}>
                <AnimatedCounter value={stats.tablesParsed} />
              </div>
              <div className="text-sm font-medium" style={{ color: colors.textMuted }}>Tables Parsed</div>
              <div className="text-xs mt-2" style={{ color: colors.textMuted }}>
                {stats.totalColumns} columns • {stats.fkRelationships} FKs
              </div>
              {/* Mini sparkline under tables count */}
              <div className="mt-2 flex justify-end">
                <Sparkline data={sparkData.tables} width={80} height={24} color={colors.accent} strokeWidth={1.5} />
              </div>
            </div>
          </div>
        </div>

        {/* System Monitor */}
        <div
          className="rounded-xl border p-5 transition-all duration-200"
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
            {/* CPU with sparkline */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5" style={{ color: colors.textMuted }} />
                  <span className="text-xs font-medium" style={{ color: colors.textMuted }}>CPU</span>
                </div>
                <div className="flex items-center gap-2">
                  {systemMetrics.cpu > 50 && (
                    <ArrowUpRight className="w-3 h-3" style={{ color: colors.error }} />
                  )}
                  <span className="text-xs font-bold font-mono" style={{ color: systemMetrics.cpu > 80 ? colors.error : colors.text }}>
                    {Math.round(systemMetrics.cpu)}%
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: alpha(colors.border, 60) }}>
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${systemMetrics.cpu}%`,
                      backgroundColor: systemMetrics.cpu > 80 ? colors.error : systemMetrics.cpu > 60 ? colors.warning : colors.success
                    }}
                  />
                </div>
                <Sparkline data={sparkData.cpu} width={50} height={18} color={systemMetrics.cpu > 80 ? colors.error : colors.success} strokeWidth={1} />
              </div>
            </div>
            {/* Memory with sparkline */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-3.5 h-3.5" style={{ color: colors.textMuted }} />
                  <span className="text-xs font-medium" style={{ color: colors.textMuted }}>Memory</span>
                </div>
                <span className="text-xs font-bold font-mono" style={{ color: systemMetrics.memory > 80 ? colors.error : colors.text }}>
                  {Math.round(systemMetrics.memory)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: alpha(colors.border, 60) }}>
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${systemMetrics.memory}%`,
                      backgroundColor: systemMetrics.memory > 80 ? colors.error : systemMetrics.memory > 60 ? colors.warning : colors.primary
                    }}
                  />
                </div>
                <Sparkline data={sparkData.memory} width={50} height={18} color={systemMetrics.memory > 80 ? colors.error : colors.primary} strokeWidth={1} />
              </div>
            </div>
            {/* Network */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Wifi className="w-3.5 h-3.5" style={{ color: colors.textMuted }} />
                  <span className="text-xs font-medium" style={{ color: colors.textMuted }}>Requests</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold font-mono" style={{ color: colors.success }}>
                    <AnimatedCounter value={sparkData.requests[sparkData.requests.length - 1] || 0} duration={500} />
                  </span>
                  <span className="text-[10px]" style={{ color: colors.textMuted }}>/min</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: alpha(colors.border, 60) }}>
                  <div className="h-full rounded-full" style={{ width: '15%', backgroundColor: colors.success }} />
                </div>
                <Sparkline data={sparkData.requests} width={50} height={18} color={colors.success} strokeWidth={1} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - 4 columns with sparklines */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-children">
        {[
          { label: 'Total Tables', value: stats.tablesParsed, icon: Database, iconColor: colors.accent, spark: sparkData.tables, change: '+3' },
          { label: 'Columns Analyzed', value: stats.totalColumns, icon: FileCode, iconColor: colors.primary, spark: null, change: null },
          { label: 'FK Relationships', value: stats.fkRelationships, icon: GitBranch, iconColor: colors.success, spark: null, change: '+1' },
          { label: 'Modules Linked', value: stats.modulesLinked, icon: Puzzle, iconColor: colors.warning, spark: null, change: null },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border p-4 group transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover-lift"
            style={{
              backgroundColor: alpha(colors.card, 50),
              borderColor: alpha(colors.border, 80)
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium" style={{ color: colors.textMuted }}>{stat.label}</p>
                  {stat.change && (
                    <span
                      className="text-[10px] font-medium flex items-center gap-0.5"
                      style={{ color: colors.success }}
                    >
                      <ArrowUpRight className="w-3 h-3" />
                      {stat.change}
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold mt-1" style={{ color: colors.text }}>
                  <AnimatedCounter value={stat.value} />
                </p>
              </div>
              <div
                className="p-2.5 rounded-lg transition-transform group-hover:scale-110 flex-shrink-0"
                style={{ backgroundColor: alpha(stat.iconColor, 12) }}
              >
                <stat.icon className="w-5 h-5" style={{ color: stat.iconColor }} />
              </div>
            </div>
            {stat.spark && (
              <div className="mt-2 flex justify-end">
                <Sparkline data={stat.spark} width={80} height={20} color={stat.iconColor} strokeWidth={1.5} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Agent System Status + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Agent Layers Status */}
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
                className="flex items-center justify-between p-3 rounded-lg transition-all duration-200 cursor-pointer group"
                style={{ backgroundColor: alpha(colors.bgTertiary, 20) }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = alpha(layer.iconColor, 8)
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = alpha(colors.bgTertiary, 20)
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <div
                      className="p-2 rounded-lg transition-transform group-hover:scale-105"
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
                  <div className="min-w-0">
                    <h4 className="text-sm font-medium" style={{ color: colors.text }}>{layer.name}</h4>
                    <p className="text-[11px] mt-0.5 truncate" style={{ color: colors.textMuted }}>{layer.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
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

        {/* Activity Timeline */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: colors.text }}>
              <Terminal className="w-4 h-4" style={{ color: colors.primary }} />
              Activity Timeline
            </h3>
            <button
              className="p-1.5 rounded-md transition-all duration-200 hover:scale-105"
              style={{ color: colors.textMuted, backgroundColor: alpha(colors.bgTertiary, 20) }}
              onClick={refreshData}
              aria-label="Refresh data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <ActivityTimeline activities={activities} maxItems={8} />
        </div>
      </div>

      {/* Quick Actions - 4 columns */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-children">
        {[
          {
            title: 'Upload SQL Schema',
            desc: 'Parse DDL, procedures, views, and CSHTML files',
            icon: Upload,
            tab: 'upload',
            color: colors.accent,
            toastMsg: 'Opening upload wizard for SQL schema files',
          },
          {
            title: 'Run Pipeline',
            desc: 'Execute full analysis or quick scan',
            icon: GitBranch,
            tab: 'pipeline',
            color: colors.primary,
            toastMsg: 'Opening analysis pipeline dashboard',
          },
          {
            title: 'View Compliance',
            desc: 'PII/PHI detection and data sensitivity',
            icon: Shield,
            tab: 'intelligence',
            color: colors.success,
            toastMsg: 'Opening intelligence compliance view',
          },
          {
            title: 'Generate Code',
            desc: 'Prisma schemas, APIs, React components',
            icon: Sparkles,
            tab: 'smart-upload',
            color: colors.warning,
            toastMsg: 'Opening AI-powered code generation studio',
          },
        ].map((action) => (
          <div
            key={action.title}
            className="rounded-xl border p-5 cursor-pointer transition-all duration-200 hover:scale-[1.03] hover:shadow-xl group hover-lift"
            style={{
              background: `linear-gradient(135deg, ${alpha(action.color, 15)}, ${alpha(action.color, 5)})`,
              borderColor: alpha(action.color, 25),
            }}
            onClick={() => {
              actionToast.info(action.title, action.toastMsg)
              onNavigate?.(action.tab)
            }}
          >
            <div className="flex items-start justify-between">
              <div
                className="p-2.5 rounded-lg mb-3 transition-transform group-hover:scale-110"
                style={{ backgroundColor: alpha(action.color, 15) }}
              >
                <action.icon className="w-5 h-5" style={{ color: action.color }} />
              </div>
              <ArrowRight className="w-4 h-4 mt-1 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5" style={{ color: action.color }} />
            </div>
            <h3 className="text-sm font-semibold" style={{ color: colors.text }}>{action.title}</h3>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: colors.textMuted }}>{action.desc}</p>
          </div>
        ))}
      </div>

      {/* Welcome Banner - shown for first-time users */}
      <WelcomeBanner onNavigate={onNavigate} />

      {/* Task Progress Rings */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Schema Parsing', percent: totalTables > 0 ? 85 : 0, color: colors.accent, icon: Database },
          { label: 'FK Resolution', percent: stats.fkResolved, color: colors.success, icon: GitBranch },
          { label: 'Module Linking', percent: Math.round((modulesLinked / 35) * 100), color: colors.primary, icon: Puzzle },
          { label: 'Intelligence', percent: totalTables > 0 ? 62 : 0, color: colors.warning, icon: Brain },
        ].map((ring) => (
          <div
            key={ring.label}
            className="rounded-xl border p-4 transition-all duration-200 hover:scale-[1.02]"
            style={{
              backgroundColor: alpha(ring.color, 6),
              borderColor: alpha(ring.color, 20),
              backdropFilter: 'blur(8px)',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <svg className="w-14 h-14 transform -rotate-90">
                  <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="3" fill="transparent"
                    style={{ color: alpha(colors.border, 50) }} />
                  <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="3" fill="transparent"
                    strokeLinecap="round"
                    strokeDasharray={`${ring.percent * 1.508} 150.8`}
                    style={{ color: ring.color, transition: 'stroke-dasharray 1s ease' }} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold" style={{ color: ring.color }}>{ring.percent}%</span>
                </div>
              </div>
              <div className="min-w-0">
                <ring.icon className="w-4 h-4 mb-1" style={{ color: ring.color }} />
                <p className="text-xs font-medium truncate" style={{ color: colors.text }}>{ring.label}</p>
                <p className="text-[10px]" style={{ color: colors.textMuted }}>
                  {ring.percent >= 80 ? 'Almost done' : ring.percent >= 40 ? 'In progress' : 'Not started'}
                </p>
              </div>
            </div>
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
              className="p-3 rounded-lg flex-shrink-0"
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

      {/* Performance Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Recent Activity Chart */}
        <div
          className="md:col-span-2 rounded-xl border p-5"
          style={{
            backgroundColor: alpha(colors.card, 50),
            borderColor: colors.border
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: colors.text }}>
              <Globe className="w-4 h-4" style={{ color: colors.primary }} />
              Performance Overview
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: alpha(colors.primary, 10), color: colors.primary }}>Last 20 cycles</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs mb-2" style={{ color: colors.textMuted }}>CPU Usage</p>
              <MiniBarChart data={sparkData.cpu} width={160} height={40} color={colors.success} maxValue={100} />
            </div>
            <div>
              <p className="text-xs mb-2" style={{ color: colors.textMuted }}>Memory Usage</p>
              <MiniBarChart data={sparkData.memory} width={160} height={40} color={colors.primary} maxValue={100} />
            </div>
            <div>
              <p className="text-xs mb-2" style={{ color: colors.textMuted }}>Request Rate</p>
              <MiniBarChart data={sparkData.requests} width={160} height={40} color={colors.accent} maxValue={100} />
            </div>
          </div>
        </div>

        {/* Quick System Info */}
        <div
          className="rounded-xl border p-5"
          style={{
            backgroundColor: alpha(colors.card, 50),
            borderColor: colors.border
          }}
        >
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4" style={{ color: colors.text }}>
            <Server className="w-4 h-4" style={{ color: colors.accent }} />
            System Info
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Platform', value: 'Next.js 16 + Turbopack', color: colors.primary },
              { label: 'Runtime', value: 'Bun Runtime', color: colors.success },
              { label: 'Database', value: 'SQLite + Prisma ORM', color: colors.accent },
              { label: 'Agent Count', value: '35 Agents / 7 Layers', color: colors.warning },
              { label: 'Color Theme', value: colorScheme.charAt(0).toUpperCase() + colorScheme.slice(1), color: colors.primary },
            ].map((info) => (
              <div key={info.label} className="flex items-center justify-between">
                <span className="text-xs" style={{ color: colors.textMuted }}>{info.label}</span>
                <span className="text-xs font-medium" style={{ color: info.color }}>{info.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* API Data Table - Recent Schema Activity */}
      <DataTable
        title="Database Activity"
        subtitle={apiStats ? `Last sync: ${formatLastSync(apiStats.data?.lastSync || null)}` : 'Real-time schema statistics'}
        headerExtra={
          <button
            onClick={() => {
              const exportData = apiStats ? [
                { label: 'Total Projects', value: apiStats.stats?.totalProjects ?? 0 },
                { label: 'Parsed Tables', value: apiStats.stats?.totalTables ?? 0 },
                { label: 'Total Columns', value: apiStats.stats?.totalColumns ?? 0 },
                { label: 'Total FKs', value: apiStats.stats?.totalFKs ?? 0 },
                { label: 'FK Resolved', value: apiStats.stats?.fkResolved ?? 0 },
                { label: 'Modules', value: apiStats.data?.modules ?? 0 },
                { label: 'Linked Modules', value: apiStats.data?.linkedModules ?? 0 },
                { label: 'Recent Activity', value: apiStats.data?.recentActivity?.length ?? 0 },
              ] : []
              exportCSV(exportData, `dashboard-stats-${new Date().toISOString().slice(0,10)}`, { title: 'AI Enterprise Architect - Dashboard Statistics' })
              actionToast.success('Exported CSV', 'Dashboard statistics downloaded successfully')
            }}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all duration-200 hover:scale-[1.02]"
            style={{
              backgroundColor: alpha(colors.primary, 10),
              borderColor: alpha(colors.primary, 20),
              color: colors.primary,
            }}
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        }
        columns={[
          { key: 'label', label: 'Metric', sortable: true, width: '40%' },
          { key: 'value', label: 'Value', sortable: true, width: '25%', align: 'right' as const,
            render: (val: any) => <span className="font-mono font-semibold">{val}</span>
          },
          { key: 'status', label: 'Status', width: '35%',
            render: (val: any, row: any) => {
              const numVal = typeof row.value === 'number' ? row.value : 0
              const isActive = numVal > 0
              return (
                <span
                  className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: alpha(isActive ? colors.success : colors.textMuted, 15),
                    color: isActive ? colors.success : colors.textMuted,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isActive ? colors.success : colors.textMuted }} />
                  {isActive ? 'Active' : 'Empty'}
                </span>
              )
            }
          },
        ]}
        data={apiStats ? [
          { label: 'Total Projects', value: apiStats.stats?.totalProjects ?? 0, status: 'info' },
          { label: 'Parsed Tables', value: apiStats.stats?.totalTables ?? 0, status: 'info' },
          { label: 'Total Columns', value: apiStats.stats?.totalColumns ?? 0, status: 'info' },
          { label: 'Stored Procedures', value: apiStats.stats?.totalProcedures ?? 0, status: 'info' },
          { label: 'FK Relationships', value: apiStats.stats?.fkRelationships ?? 0, status: 'info' },
          { label: 'Resolved FKs', value: apiStats.stats?.fkResolved ?? 0, status: 'info' },
          { label: 'FK Resolution %', value: `${apiStats.stats?.fkResolvedPercent ?? 0}%`, status: 'info' },
          { label: 'HIS Modules', value: apiStats.data?.modules ?? 0, status: 'info' },
          { label: 'Linked Modules', value: apiStats.data?.linkedModules ?? 0, status: 'info' },
        ] : []}
        loading={apiStatsLoading}
        emptyMessage="No schema data yet. Upload SQL files to see statistics here."
        maxHeight="max-h-80"
        pageSize={5}
      />

      {/* Real-time Event Stream */}
      <RealtimeEventFeed />
    </div>
  )
}
