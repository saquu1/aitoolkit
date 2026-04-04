'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { useSchema } from '@/hooks/useSchema'
import { useAuth } from '@/components/AuthProvider'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Settings, 
  Brain, 
  Database, 
  Shield, 
  ShieldOff,
  Bell, 
  Code,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Info,
  Loader2,
  LogOut,
  Palette,
  Monitor,
  MousePointer,
  Sparkles,
  Maximize,
  Cpu,
  Globe,
  Layers,
  Clock,
  Activity,
  Zap,
  FolderKanban,
  FileSpreadsheet,
  Link2,
  Cog,
  Boxes,
} from 'lucide-react'
import { useActionToast } from '@/hooks/useActionToast'

// ═══════════════════════════════════════════════════════════════
// Enhanced System Info Tab – real-time data from /api/schema/stats
// ═══════════════════════════════════════════════════════════════

interface ApiStats {
  stats: {
    totalProjects: number
    totalTables: number
    totalColumns: number
    totalProcedures: number
    fkRelationships: number
    fkResolved: number
    fkResolvedPercent: number
    lastSync: string | null
  }
  data: {
    modules: number
    linkedModules: number
    moduleLinkedPercent: number
    recentActivity: Array<{
      id: string
      type: string
      name: string
      status: string
      timestamp: string
      details: {
        itemsProcessed: number | null
        duration: number | null
      }
    }>
    topTables: Array<{ tableName: string; columnCount: number; status: string; linkedModule: string | null }>
    tablesByStatus: Record<string, number>
    lastSync: string
  }
}

function SystemInfoPanel() {
  const { colors } = useTheme()
  const actionToast = useActionToast()
  const [apiStats, setApiStats] = useState<ApiStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<string>('')

  const alpha = (color: string, opacity: number) =>
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  // ── Fetch stats ──
  const fetchStats = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const res = await fetch('/api/schema/stats')
      if (res.ok) {
        const json = await res.json()
        setApiStats(json as ApiStats)
        setLastRefresh(new Date().toLocaleTimeString())
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(() => fetchStats(), 60000)
    return () => clearInterval(interval)
  }, [])

  // ── Manual refresh ──
  const handleRefresh = async () => {
    await fetchStats(true)
    actionToast.success('System stats refreshed')
  }

  // ── Detect browser platform ──
  const getBrowserPlatform = () => {
    if (typeof navigator === 'undefined') return 'Browser'
    const ua = navigator.userAgent
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome'
    if (ua.includes('Firefox')) return 'Firefox'
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari'
    if (ua.includes('Edg')) return 'Edge'
    return 'Browser'
  }

  // ── Format duration ms → human-readable ──
  const formatDuration = (ms: number | null) => {
    if (ms === null || ms === undefined) return '—'
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
  }

  // ── Format relative time ──
  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso)
      const now = Date.now()
      const diff = now - d.getTime()
      if (diff < 60000) return 'Just now'
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
      return d.toLocaleDateString()
    } catch {
      return '—'
    }
  }

  // ── Status badge colors ──
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed': return { bg: alpha(colors.success, 15), color: colors.success, border: alpha(colors.success, 30) }
      case 'running': return { bg: alpha(colors.primary, 15), color: colors.primary, border: alpha(colors.primary, 30) }
      case 'failed': return { bg: alpha('#ef4444', 15), color: '#ef4444', border: alpha('#ef4444', 30) }
      default: return { bg: alpha(colors.textMuted, 10), color: colors.textMuted, border: alpha(colors.textMuted, 20) }
    }
  }

  const s = apiStats?.stats
  const d = apiStats?.data

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="p-4 rounded-xl border animate-pulse" style={{ borderColor: alpha(colors.border, 40) }}>
              <div className="h-4 w-10 rounded mb-2" style={{ backgroundColor: alpha(colors.border, 30) }} />
              <div className="h-6 w-16 rounded mb-1" style={{ backgroundColor: alpha(colors.border, 20) }} />
              <div className="h-3 w-20 rounded" style={{ backgroundColor: alpha(colors.border, 15) }} />
            </div>
          ))}
        </div>
        {/* Env skeleton */}
        <div className="rounded-xl border p-6 animate-pulse" style={{ borderColor: alpha(colors.border, 40) }}>
          <div className="h-5 w-40 rounded mb-4" style={{ backgroundColor: alpha(colors.border, 30) }} />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-10 rounded-lg" style={{ backgroundColor: alpha(colors.border, 15) }} />
            ))}
          </div>
        </div>
        {/* Activity skeleton */}
        <div className="rounded-xl border p-6 animate-pulse" style={{ borderColor: alpha(colors.border, 40) }}>
          <div className="h-5 w-48 rounded mb-4" style={{ backgroundColor: alpha(colors.border, 30) }} />
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="h-14 rounded-lg" style={{ backgroundColor: alpha(colors.border, 12) }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Section Header with Refresh ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: alpha(colors.primary, 10) }}>
            <Activity className="w-5 h-5" style={{ color: colors.primary }} />
          </div>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: colors.text }}>Database Statistics</h3>
            <p className="text-xs" style={{ color: colors.textMuted }}>
              Real-time metrics from the schema engine{lastRefresh ? ` · Last updated ${lastRefresh}` : ''}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          style={{ borderColor: colors.border, color: colors.textSecondary }}
        >
          <Loader2 className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* ── 1. Real-time Database Statistics ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Projects */}
        <div
          className="p-4 rounded-xl border transition-all duration-200 hover:scale-[1.02] hover-lift"
          style={{ backgroundColor: alpha(colors.warning, 6), borderColor: alpha(colors.warning, 15) }}
        >
          <div className="flex items-center gap-2 mb-2">
            <FolderKanban className="w-4 h-4" style={{ color: colors.warning }} />
            <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: colors.textMuted }}>Projects</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: colors.warning }}>{s?.totalProjects ?? 0}</p>
          <p className="text-[11px] mt-0.5" style={{ color: colors.textMuted }}>active</p>
        </div>

        {/* Tables */}
        <div
          className="p-4 rounded-xl border transition-all duration-200 hover:scale-[1.02] hover-lift"
          style={{ backgroundColor: alpha(colors.accent, 6), borderColor: alpha(colors.accent, 15) }}
        >
          <div className="flex items-center gap-2 mb-2">
            <FileSpreadsheet className="w-4 h-4" style={{ color: colors.accent }} />
            <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: colors.textMuted }}>Tables</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: colors.accent }}>{s?.totalTables ?? 0}</p>
          <p className="text-[11px] mt-0.5" style={{ color: colors.textMuted }}>parsed ({s?.totalColumns ?? 0} columns)</p>
        </div>

        {/* FK Relationships */}
        <div
          className="p-4 rounded-xl border transition-all duration-200 hover:scale-[1.02] hover-lift"
          style={{ backgroundColor: alpha(colors.primary, 6), borderColor: alpha(colors.primary, 15) }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="w-4 h-4" style={{ color: colors.primary }} />
            <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: colors.textMuted }}>FK Relationships</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: colors.primary }}>{s?.fkRelationships ?? 0}</p>
          <p className="text-[11px] mt-0.5" style={{ color: colors.textMuted }}>
            {s?.fkResolved ?? 0} resolved ({s?.fkResolvedPercent ?? 0}%)
          </p>
        </div>

        {/* Stored Procedures */}
        <div
          className="p-4 rounded-xl border transition-all duration-200 hover:scale-[1.02] hover-lift"
          style={{ backgroundColor: alpha('#f472b6', 6), borderColor: alpha('#f472b6', 15) }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Cog className="w-4 h-4" style={{ color: '#f472b6' }} />
            <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: colors.textMuted }}>Procedures</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: '#f472b6' }}>{s?.totalProcedures ?? 0}</p>
          <p className="text-[11px] mt-0.5" style={{ color: colors.textMuted }}>stored procedures</p>
        </div>

        {/* HIS Modules */}
        <div
          className="p-4 rounded-xl border transition-all duration-200 hover:scale-[1.02] hover-lift"
          style={{ backgroundColor: alpha(colors.success, 6), borderColor: alpha(colors.success, 15) }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Boxes className="w-4 h-4" style={{ color: colors.success }} />
            <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: colors.textMuted }}>HIS Modules</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: colors.success }}>{d?.modules ?? 0}</p>
          <p className="text-[11px] mt-0.5" style={{ color: colors.textMuted }}>
            {d?.linkedModules ?? 0} linked ({d?.moduleLinkedPercent ?? 0}%)
          </p>
        </div>
      </div>

      {/* ── 2. System Environment Info ── */}
      <div
        className="rounded-xl border p-6"
        style={{ borderColor: colors.border, backgroundColor: alpha(colors.card, 30) }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-4 h-4" style={{ color: colors.accent }} />
          <h4 className="text-sm font-semibold" style={{ color: colors.text }}>System Environment</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: 'Platform', value: getBrowserPlatform(), icon: Monitor },
            { label: 'Runtime', value: 'Next.js 16 + Turbopack', icon: Zap },
            { label: 'Database', value: 'SQLite via Prisma ORM', icon: Database },
            { label: 'Framework', value: 'React 19 + TypeScript 5', icon: Layers },
            { label: 'UI Library', value: 'shadcn/ui + Tailwind CSS 4', icon: Palette },
            { label: 'Cache', value: 'In-Memory (Zustand)', icon: Cpu },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 p-3 rounded-lg transition-colors"
              style={{ backgroundColor: alpha(colors.bgTertiary, 15) }}
            >
              <div className="p-1.5 rounded-md shrink-0" style={{ backgroundColor: alpha(colors.primary, 10) }}>
                <item.icon className="w-3.5 h-3.5" style={{ color: colors.primary }} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: colors.textMuted }}>{item.label}</p>
                <p className="text-xs font-semibold truncate" style={{ color: colors.textSecondary }}>{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. Recent Agent Activity ── */}
      <div
        className="rounded-xl border p-6"
        style={{ borderColor: colors.border, backgroundColor: alpha(colors.card, 30) }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" style={{ color: colors.warning }} />
            <h4 className="text-sm font-semibold" style={{ color: colors.text }}>Recent Agent Activity</h4>
          </div>
          <Badge variant="outline" style={{ borderColor: alpha(colors.textMuted, 20), color: colors.textMuted, fontSize: '10px' }}>
            Last {d?.recentActivity?.length ?? 0} runs
          </Badge>
        </div>

        {!d?.recentActivity?.length ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Activity className="w-8 h-8 mb-2" style={{ color: alpha(colors.textMuted, 40) }} />
            <p className="text-sm" style={{ color: colors.textMuted }}>No agent runs recorded yet</p>
            <p className="text-xs mt-1" style={{ color: alpha(colors.textMuted, 60) }}>Agent activity will appear here after runs are executed</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
            {d.recentActivity.map((run, idx) => {
              const statusStyle = getStatusStyle(run.status)
              return (
                <div
                  key={run.id || idx}
                  className="flex items-center gap-3 p-3 rounded-lg transition-colors"
                  style={{
                    backgroundColor: alpha(colors.bgTertiary, 10),
                    borderLeft: `3px solid ${statusStyle.color}`,
                  }}
                >
                  {/* Agent icon */}
                  <div
                    className="p-1.5 rounded-md shrink-0"
                    style={{ backgroundColor: statusStyle.bg }}
                  >
                    <Cpu className="w-3.5 h-3.5" style={{ color: statusStyle.color }} />
                  </div>

                  {/* Agent name + items */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate" style={{ color: colors.text }}>
                        {run.name || 'Unknown Agent'}
                      </span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                        style={{ backgroundColor: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.border}` }}
                      >
                        {run.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {run.details?.itemsProcessed != null && (
                        <span className="text-[11px]" style={{ color: colors.textMuted }}>
                          {run.details.itemsProcessed} items processed
                        </span>
                      )}
                      {run.details?.duration != null && (
                        <span className="text-[11px]" style={{ color: colors.textMuted }}>
                          {formatDuration(run.details.duration)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Timestamp */}
                  <span className="text-[11px] shrink-0" style={{ color: colors.textMuted }}>
                    {formatTime(run.timestamp)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export function SettingsTab() {
  const { colors, colorScheme, setColorScheme } = useTheme()
  const { isAuthenticated, user, loginEnabled, logout, checkAuth } = useAuth()
  const actionToast = useActionToast()
  const [loginToggle, setLoginToggle] = useState(loginEnabled)
  const [toggleLoading, setToggleLoading] = useState(false)
  const [authMsg, setAuthMsg] = useState<string | null>(null)
  const [compactMode, setCompactMode] = useLocalStorage('aitoolkit-compact-mode', false)
  const [animationsEnabled, setAnimationsEnabled] = useLocalStorage('aitoolkit-animations', true)
  const [sidebarDefault, setSidebarDefault] = useLocalStorage<'expanded' | 'collapsed'>('aitoolkit-sidebar-default', 'expanded')

  // Sync toggle state with auth status
  useEffect(() => {
    setLoginToggle(loginEnabled)
  }, [loginEnabled])
  // Connect to shared schema state
  const { 
    parseResult, 
    totalTables, 
    totalColumns, 
    fkResolvedPercent, 
    modulesLinked, 
    missingTables,
    clearAll
  } = useSchema()

  // Helper function to create semi-transparent colors
  const alpha = (color: string, opacity: number) => 
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  // ── Toggle login on/off ──
  const handleLoginToggle = async (checked: boolean) => {
    setToggleLoading(true)
    setAuthMsg(null)
    try {
      const res = await fetch("/api/settings/auth", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginEnabled: checked }),
      })
      const data = await res.json()
      if (data.success) {
        setLoginToggle(data.loginEnabled)
        setAuthMsg(data.message)
        await checkAuth() // refresh auth state
      } else {
        setAuthMsg(data.error || "Failed to toggle login")
        setLoginToggle(!checked) // revert
      }
    } catch (err) {
      setAuthMsg("Network error")
      setLoginToggle(!checked)
    } finally {
      setToggleLoading(false)
      setTimeout(() => setAuthMsg(null), 4000)
    }
  }

  // ── Logout ──
  const handleLogout = () => {
    logout()
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: colors.text }}>
            Settings
          </h2>
          <p className="mt-1" style={{ color: colors.textMuted }}>
            Configure your AI Enterprise Architect preferences
          </p>
        </div>
        <Button style={{ backgroundColor: colors.primary }}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="ai" className="space-y-4">
        <TabsList style={{ backgroundColor: colors.bgSecondary, borderColor: colors.border }}>
          <TabsTrigger 
            value="ai" 
            className="data-[state=active]:text-white"
            style={{
              color: colors.textMuted,
            }}
          >
            <Brain className="w-4 h-4 mr-2" style={{ color: colors.primary }} />
            AI Engine
          </TabsTrigger>
          <TabsTrigger 
            value="database"
            style={{ color: colors.textMuted }}
          >
            <Database className="w-4 h-4 mr-2" style={{ color: colors.accent }} />
            Database
          </TabsTrigger>
          <TabsTrigger 
            value="security"
            style={{ color: colors.textMuted }}
          >
            <Shield className="w-4 h-4 mr-2" style={{ color: colors.warning }} />
            Security
          </TabsTrigger>
          <TabsTrigger 
            value="notifications"
            style={{ color: colors.textMuted }}
          >
            <Bell className="w-4 h-4 mr-2" style={{ color: colors.success }} />
            Notifications
          </TabsTrigger>
          <TabsTrigger 
            value="developer"
            style={{ color: colors.textMuted }}
          >
            <Code className="w-4 h-4 mr-2" style={{ color: colors.accentLight }} />
            Developer
          </TabsTrigger>
          <TabsTrigger 
            value="appearance"
            style={{ color: colors.textMuted }}
          >
            <Palette className="w-4 h-4 mr-2" style={{ color: '#f472b6' }} />
            Appearance
          </TabsTrigger>
          <TabsTrigger
            value="system-info"
            style={{ color: colors.textMuted }}
          >
            <Cpu className="w-4 h-4 mr-2" style={{ color: colors.accent }} />
            System Info
          </TabsTrigger>
        </TabsList>

        {/* AI Engine Settings */}
        <TabsContent value="ai">
          <div className="grid gap-4">
            {/* Mode Selection */}
            <div 
              className="rounded-lg border p-6"
              style={{ 
                backgroundColor: alpha(colors.card, 50),
                borderColor: colors.border 
              }}
            >
              <div className="mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: colors.text }}>
                  <Brain className="w-5 h-5" style={{ color: colors.primary }} />
                  AI Engine Mode
                </h3>
                <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                  Choose how AI analysis is performed
                </p>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div 
                    className="p-4 rounded-lg border-2 cursor-pointer"
                    style={{ 
                      backgroundColor: alpha(colors.primary, 10),
                      borderColor: colors.primary 
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium" style={{ color: colors.text }}>Offline</span>
                      <Badge style={{ 
                        backgroundColor: alpha(colors.success, 20),
                        color: colors.success,
                        border: `1px solid ${alpha(colors.success, 30)}`
                      }}>
                        Active
                      </Badge>
                    </div>
                    <p className="text-sm" style={{ color: colors.textMuted }}>
                      Rule-based analysis without external API calls
                    </p>
                  </div>
                  <div 
                    className="p-4 rounded-lg border cursor-pointer transition-colors"
                    style={{ 
                      backgroundColor: alpha(colors.bgSecondary, 30),
                      borderColor: colors.border 
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium" style={{ color: colors.text }}>Local LLM</span>
                      <Badge 
                        variant="outline"
                        style={{ 
                          borderColor: colors.border,
                          color: colors.textMuted 
                        }}
                      >
                        Unavailable
                      </Badge>
                    </div>
                    <p className="text-sm" style={{ color: colors.textMuted }}>
                      Use local Ollama or LM Studio
                    </p>
                  </div>
                  <div 
                    className="p-4 rounded-lg border cursor-pointer transition-colors"
                    style={{ 
                      backgroundColor: alpha(colors.bgSecondary, 30),
                      borderColor: colors.border 
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium" style={{ color: colors.text }}>Cloud</span>
                      <Badge 
                        variant="outline"
                        style={{ 
                          borderColor: colors.border,
                          color: colors.textMuted 
                        }}
                      >
                        Config Required
                      </Badge>
                    </div>
                    <p className="text-sm" style={{ color: colors.textMuted }}>
                      Use cloud LLM APIs (OpenAI, Anthropic)
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { title: 'Auto-analyze on upload', desc: 'Automatically run AI analysis when SQL is uploaded' },
                    { title: 'Smart suggestions', desc: 'Show AI-powered suggestions in the interface' },
                    { title: 'PII/PHI Detection', desc: 'Automatically detect sensitive data columns' },
                  ].map((item) => (
                    <div 
                      key={item.title}
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{ backgroundColor: alpha(colors.bgTertiary, 20) }}
                    >
                      <div>
                        <span className="text-sm font-medium" style={{ color: colors.text }}>{item.title}</span>
                        <p className="text-xs" style={{ color: colors.textMuted }}>{item.desc}</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Column Intelligence */}
            <div 
              className="rounded-lg border p-6"
              style={{ 
                backgroundColor: alpha(colors.card, 50),
                borderColor: colors.border 
              }}
            >
              <h3 className="text-lg font-semibold" style={{ color: colors.text }}>
                Column Intelligence
              </h3>
              <p className="text-sm mt-1 mb-4" style={{ color: colors.textMuted }}>
                Configure how column metadata is inferred
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label style={{ color: colors.textSecondary }}>Confidence Threshold</Label>
                  <Input 
                    type="number" 
                    defaultValue="65" 
                    style={{ 
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                      color: colors.text 
                    }}
                  />
                  <p className="text-xs" style={{ color: colors.textMuted }}>
                    Minimum confidence for auto-apply (0-100)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label style={{ color: colors.textSecondary }}>Max Suggestions</Label>
                  <Input 
                    type="number" 
                    defaultValue="5" 
                    style={{ 
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                      color: colors.text 
                    }}
                  />
                  <p className="text-xs" style={{ color: colors.textMuted }}>
                    Maximum suggestions per column
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Database Settings */}
        <TabsContent value="database">
          <div 
            className="rounded-lg border p-6"
            style={{ 
              backgroundColor: alpha(colors.card, 50),
              borderColor: colors.border 
            }}
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: colors.text }}>
                <Database className="w-5 h-5" style={{ color: colors.accent }} />
                Database Configuration
              </h3>
              <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                Connection and storage settings
              </p>
            </div>
            <div className="space-y-4">
              <div 
                className="flex items-center justify-between p-4 rounded-lg"
                style={{ 
                  backgroundColor: alpha(colors.success, 10),
                  border: `1px solid ${alpha(colors.success, 20)}`
                }}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5" style={{ color: colors.success }} />
                  <div>
                    <span className="font-medium" style={{ color: colors.text }}>
                      SQLite Database Connected
                    </span>
                    <p className="text-xs" style={{ color: colors.textMuted }}>
                      Location: /db/custom.db
                    </p>
                  </div>
                </div>
                <Badge style={{ 
                  backgroundColor: alpha(colors.success, 20),
                  color: colors.success,
                  border: `1px solid ${alpha(colors.success, 30)}`
                }}>
                  Active
                </Badge>
              </div>

              <div className="space-y-3">
                {[
                  { title: 'Auto-backup', desc: 'Automatically backup database daily' },
                  { title: 'Cache parsed results', desc: 'Store parsed schemas for faster loading' },
                ].map((item) => (
                  <div 
                    key={item.title}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ backgroundColor: alpha(colors.bgTertiary, 20) }}
                  >
                    <div>
                      <span className="text-sm font-medium" style={{ color: colors.text }}>{item.title}</span>
                      <p className="text-xs" style={{ color: colors.textMuted }}>{item.desc}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  style={{ 
                    borderColor: colors.border,
                    color: colors.text 
                  }}
                >
                  Export Database
                </Button>
                <Button 
                  variant="outline"
                  style={{ 
                    borderColor: colors.border,
                    color: colors.text 
                  }}
                >
                  Clear Cache
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <div 
            className="rounded-lg border p-6"
            style={{ 
              backgroundColor: alpha(colors.card, 50),
              borderColor: colors.border 
            }}
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: colors.text }}>
                <Shield className="w-5 h-5" style={{ color: colors.warning }} />
                Security &amp; Authentication
              </h3>
              <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                Control login requirements and access settings
              </p>
            </div>
            <div className="space-y-4">

              {/* ── Login Enable/Disable Toggle ── */}
              <div 
                className="p-4 rounded-lg border-2"
                style={{ 
                  backgroundColor: loginToggle ? alpha(colors.success, 5) : alpha(colors.card, 20),
                  borderColor: loginToggle ? alpha(colors.success, 30) : colors.border
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    {loginToggle ? (
                      <Shield className="w-5 h-5 mt-0.5" style={{ color: colors.success }} />
                    ) : (
                      <ShieldOff className="w-5 h-5 mt-0.5" style={{ color: colors.textMuted }} />
                    )}
                    <div>
                      <span className="font-medium" style={{ color: colors.text }}>
                        Require Login
                      </span>
                      <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                        {loginToggle
                          ? "Login is required. All API routes need a valid token."
                          : "Login is disabled. All routes are open (no auth needed)."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {toggleLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Switch
                      checked={loginToggle}
                      onCheckedChange={handleLoginToggle}
                      disabled={toggleLoading}
                    />
                  </div>
                </div>

                {authMsg && (
                  <p className="text-sm mt-3 ml-8" style={{ color: colors.primary }}>
                    {authMsg}
                  </p>
                )}
              </div>

              {/* ── Current Session Info ── */}
              <div 
                className="p-4 rounded-lg"
                style={{ backgroundColor: alpha(colors.bgTertiary, 20) }}
              >
                <span className="text-sm font-medium" style={{ color: colors.text }}>
                  Current Session
                </span>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-sm" style={{ color: colors.textMuted }}>
                    {isAuthenticated ? (
                      <>
                        <Badge variant="outline" style={{ color: colors.success, borderColor: alpha(colors.success, 30) }}>
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Logged in
                        </Badge>
                        <span className="ml-2">{user?.name} ({user?.email})</span>
                      </>
                    ) : (
                      <Badge variant="outline" style={{ color: colors.textMuted }}>
                        Not logged in
                      </Badge>
                    )}
                  </div>
                  {isAuthenticated && (
                    <Button variant="ghost" size="sm" onClick={handleLogout}>
                      <LogOut className="w-4 h-4 mr-1" />
                      Logout
                    </Button>
                  )}
                </div>
              </div>

              {/* ── Data Sensitivity Notice ── */}
              <div 
                className="p-4 rounded-lg"
                style={{ 
                  backgroundColor: alpha(colors.warning, 10),
                  border: `1px solid ${alpha(colors.warning, 20)}`
                }}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 mt-0.5" style={{ color: colors.warning }} />
                  <div>
                    <span className="font-medium" style={{ color: colors.text }}>
                      Data Sensitivity Notice
                    </span>
                    <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                      This system processes SQL schemas that may contain PII/PHI field definitions.
                      Ensure compliance with HIPAA, GDPR, and local regulations.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { title: 'Log all schema access', desc: 'Keep audit trail of all operations' },
                  { title: 'Anonymize sample data', desc: 'Remove sensitive data from exports' },
                ].map((item) => (
                  <div 
                    key={item.title}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ backgroundColor: alpha(colors.bgTertiary, 20) }}
                  >
                    <div>
                      <span className="text-sm font-medium" style={{ color: colors.text }}>{item.title}</span>
                      <p className="text-xs" style={{ color: colors.textMuted }}>{item.desc}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <div 
            className="rounded-lg border p-6"
            style={{ 
              backgroundColor: alpha(colors.card, 50),
              borderColor: colors.border 
            }}
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: colors.text }}>
                <Bell className="w-5 h-5" style={{ color: colors.success }} />
                Notifications
              </h3>
              <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                Configure alerts and notifications
              </p>
            </div>
            <div className="space-y-3">
              {[
                { title: 'Parse errors', desc: 'Alert when SQL parsing fails' },
                { title: 'Missing FK tables', desc: 'Alert when foreign key tables are missing' },
                { title: 'Generation complete', desc: 'Notify when artifact generation finishes' },
              ].map((item) => (
                <div 
                  key={item.title}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ backgroundColor: alpha(colors.bgTertiary, 20) }}
                >
                  <div>
                    <span className="text-sm font-medium" style={{ color: colors.text }}>{item.title}</span>
                    <p className="text-xs" style={{ color: colors.textMuted }}>{item.desc}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Developer Settings */}
        <TabsContent value="developer">
          <div 
            className="rounded-lg border p-6"
            style={{ 
              backgroundColor: alpha(colors.card, 50),
              borderColor: colors.border 
            }}
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: colors.text }}>
                <Code className="w-5 h-5" style={{ color: colors.accentLight }} />
                Developer Options
              </h3>
              <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                Advanced settings for developers
              </p>
            </div>
            <div className="space-y-4">
              <div 
                className="p-4 rounded-lg"
                style={{ 
                  backgroundColor: alpha(colors.accent, 10),
                  border: `1px solid ${alpha(colors.accent, 20)}`
                }}
              >
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 mt-0.5" style={{ color: colors.accent }} />
                  <div>
                    <span className="font-medium" style={{ color: colors.text }}>
                      API Access
                    </span>
                    <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                      All features are available via REST API. See documentation for endpoints.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { title: 'Debug mode', desc: 'Show detailed error messages and logs' },
                  { title: 'Export API logs', desc: 'Download detailed API request/response logs' },
                ].map((item) => (
                  <div 
                    key={item.title}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ backgroundColor: alpha(colors.bgTertiary, 20) }}
                  >
                    <div>
                      <span className="text-sm font-medium" style={{ color: colors.text }}>{item.title}</span>
                      <p className="text-xs" style={{ color: colors.textMuted }}>{item.desc}</p>
                    </div>
                    <Switch />
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  style={{ 
                    borderColor: colors.border,
                    color: colors.text 
                  }}
                >
                  View API Docs
                </Button>
                <Button 
                  variant="outline"
                  style={{ 
                    borderColor: colors.border,
                    color: colors.text 
                  }}
                >
                  Export Logs
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance">
          <div className="grid gap-4">
            {/* Theme Selection */}
            <div 
              className="rounded-lg border p-6"
              style={{ 
                backgroundColor: alpha(colors.card, 50),
                borderColor: colors.border 
              }}
            >
              <div className="mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: colors.text }}>
                  <Palette className="w-5 h-5" style={{ color: '#f472b6' }} />
                  Color Theme
                </h3>
                <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                  Choose a color scheme that suits your preference
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                  { key: 'midnight', label: 'Midnight', preview: ['#a855f7', '#6366f1', '#0f172a'] },
                  { key: 'ocean', label: 'Ocean', preview: ['#3b82f6', '#06b6d4', '#0c1929'] },
                  { key: 'forest', label: 'Forest', preview: ['#22c55e', '#14b8a6', '#0a1a0f'] },
                  { key: 'sunset', label: 'Sunset', preview: ['#f97316', '#ec4899', '#1a0f0a'] },
                  { key: 'lavender', label: 'Lavender', preview: ['#a78bfa', '#f472b6', '#13111c'] },
                  { key: 'cyberpunk', label: 'Cyberpunk', preview: ['#f0abfc', '#22d3ee', '#0a0a0a'] },
                  { key: 'light', label: 'Light', preview: ['#7c3aed', '#2563eb', '#f8fafc'] },
                ].map((theme) => (
                  <button
                    key={theme.key}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 hover:scale-[1.05] hover-lift"
                    style={{
                      borderColor: colorScheme === theme.key ? colors.primary : colors.border,
                      backgroundColor: colorScheme === theme.key ? alpha(colors.primary, 10) : 'transparent',
                    }}
                    onClick={() => {
                      setColorScheme(theme.key as any)
                      actionToast.settingsSaved(`Theme: ${theme.label}`)
                    }}
                  >
                    <div className="flex gap-0.5">
                      {theme.preview.map((c, i) => (
                        <div
                          key={i}
                          className="w-5 h-5 rounded-full border"
                          style={{
                            backgroundColor: c,
                            borderColor: alpha(colors.border, 50),
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-medium" style={{ color: colorScheme === theme.key ? colors.primary : colors.textMuted }}>
                      {theme.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Layout Settings */}
            <div 
              className="rounded-lg border p-6"
              style={{ 
                backgroundColor: alpha(colors.card, 50),
                borderColor: colors.border 
              }}
            >
              <div className="mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: colors.text }}>
                  <Monitor className="w-5 h-5" style={{ color: colors.primary }} />
                  Layout &amp; Density
                </h3>
                <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                  Adjust the interface layout and density
                </p>
              </div>
              <div className="space-y-4">
                {/* Compact Mode */}
                <div 
                  className="flex items-center justify-between p-4 rounded-lg"
                  style={{ backgroundColor: alpha(colors.bgTertiary, 20) }}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: alpha(colors.primary, 10) }}>
                      <MousePointer className="w-4 h-4" style={{ color: colors.primary }} />
                    </div>
                    <div>
                      <span className="text-sm font-medium" style={{ color: colors.text }}>Compact Mode</span>
                      <p className="text-xs" style={{ color: colors.textMuted }}>Reduce spacing for more content visibility</p>
                    </div>
                  </div>
                  <Switch
                    checked={compactMode}
                    onCheckedChange={(checked) => {
                      setCompactMode(checked)
                      actionToast.settingsSaved(checked ? 'Compact Mode On' : 'Compact Mode Off')
                    }}
                  />
                </div>

                {/* Default Sidebar State */}
                <div 
                  className="flex items-center justify-between p-4 rounded-lg"
                  style={{ backgroundColor: alpha(colors.bgTertiary, 20) }}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: alpha(colors.accent, 10) }}>
                      <Maximize className="w-4 h-4" style={{ color: colors.accent }} />
                    </div>
                    <div>
                      <span className="text-sm font-medium" style={{ color: colors.text }}>Default Sidebar</span>
                      <p className="text-xs" style={{ color: colors.textMuted }}>Choose sidebar state on startup</p>
                    </div>
                  </div>
                  <div className="flex gap-1 p-0.5 rounded-lg" style={{ backgroundColor: alpha(colors.bgTertiary, 30) }}>
                    {(['expanded', 'collapsed'] as const).map((state) => (
                      <button
                        key={state}
                        className="text-[11px] px-3 py-1.5 rounded-md transition-all font-medium"
                        style={{
                          backgroundColor: sidebarDefault === state ? alpha(colors.primary, 20) : 'transparent',
                          color: sidebarDefault === state ? colors.primary : colors.textMuted,
                        }}
                        onClick={() => {
                          setSidebarDefault(state)
                          actionToast.settingsSaved(`Sidebar: ${state}`)
                        }}
                      >
                        {state.charAt(0).toUpperCase() + state.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Animation Settings */}
            <div 
              className="rounded-lg border p-6"
              style={{ 
                backgroundColor: alpha(colors.card, 50),
                borderColor: colors.border 
              }}
            >
              <div className="mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: colors.text }}>
                  <Sparkles className="w-5 h-5" style={{ color: colors.warning }} />
                  Animations &amp; Effects
                </h3>
                <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                  Control motion and visual effects
                </p>
              </div>
              <div className="space-y-3">
                <div 
                  className="flex items-center justify-between p-4 rounded-lg"
                  style={{ backgroundColor: alpha(colors.bgTertiary, 20) }}
                >
                  <div>
                    <span className="text-sm font-medium" style={{ color: colors.text }}>Enable Animations</span>
                    <p className="text-xs" style={{ color: colors.textMuted }}>Smooth transitions, hover effects, and loading states</p>
                  </div>
                  <Switch
                    checked={animationsEnabled}
                    onCheckedChange={(checked) => {
                      setAnimationsEnabled(checked)
                      actionToast.settingsSaved(checked ? 'Animations On' : 'Animations Off (reduced motion)')
                    }}
                  />
                </div>

                {[
                  { title: 'Glow effects', desc: 'Subtle glow on active elements and logo', enabled: true },
                  { title: 'Staggered children', desc: 'Sequential entrance animations for list items', enabled: true },
                  { title: 'Hover lift', desc: 'Cards lift slightly on hover for depth effect', enabled: true },
                  { title: 'Gradient borders', desc: 'Gradient border effects on featured elements', enabled: false },
                ].map((item) => (
                  <div 
                    key={item.title}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ backgroundColor: alpha(colors.bgTertiary, 20) }}
                  >
                    <div>
                      <span className="text-sm font-medium" style={{ color: colors.text }}>{item.title}</span>
                      <p className="text-xs" style={{ color: colors.textMuted }}>{item.desc}</p>
                    </div>
                    <Switch defaultChecked={item.enabled} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* System Info Tab */}
        <TabsContent value="system-info">
          <SystemInfoPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
