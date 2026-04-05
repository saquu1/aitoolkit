'use client'

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ThemeProvider, useTheme } from '@/hooks/useTheme'
import { SchemaProvider, useSchema } from '@/hooks/useSchema'
import { ColorSchemeSelector } from '@/components/ColorSchemeSelector'
import { Clock, Search, Command, ChevronDown, ChevronRight, Menu, X, Filter } from 'lucide-react'
import { SessionStatusBadge } from '@/components/SessionStatusIndicator'
import { MemoryToggleButton } from '@/components/MemoryBreakdown'
import { ThreadStatusBadge } from '@/components/ThreadStatusBadge'
import { ThreadBreakdown } from '@/components/ThreadBreakdown'
import { ProjectScopeProvider } from '@/contexts/ProjectScopeContext'
import { ProjectScopeHeader } from '@/components/project/ProjectScopeHeader'
import { ErrorMonitor } from '@/components/ErrorMonitor'
import { VersionTracker } from '@/components/VersionTracker'
import { CommandPalette } from '@/components/CommandPalette'
import { KeyboardShortcutsDialog } from '@/components/KeyboardShortcutsDialog'
import { NotificationCenter } from '@/components/NotificationCenter'
import { TabTransition } from '@/components/TabTransition'
import { useActionToast } from '@/hooks/useActionToast'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useNavigationHistory } from '@/hooks/useNavigationHistory'
import { BreadcrumbNav } from '@/components/BreadcrumbNav'
import { TabSearchFilter } from '@/components/TabSearchFilter'

// Session start time - set once when module loads
const SESSION_START = new Date()

// Format uptime as HH:MM:SS
function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Dynamic import for ScrollArea to prevent hydration mismatch
const ScrollArea = dynamic(
  () => import('@/components/ui/scroll-area').then(m => m.ScrollArea),
  { ssr: false }
)
import {
  LayoutDashboard,
  Upload,
  Puzzle,
  GitBranch,
  Settings,
  Brain,
  Database,
  FileCode,
  Shield,
  BarChart3,
  Zap,
  AlertTriangle,
  ArrowRightLeft,
  ClipboardList,
  Sparkles,
  FolderKanban,
  Activity,
  Bug,
  ToggleLeft,
} from 'lucide-react'
import { DashboardTab } from '@/components/tabs/DashboardTab'
import { UploadTab } from '@/components/tabs/UploadTab'
import { ModulesTab } from '@/components/tabs/ModulesTab'
import { PipelineTab } from '@/components/tabs/PipelineTab'
import { SettingsTab } from '@/components/tabs/SettingsTab'
import { FKResolutionTab } from '@/components/tabs/FKResolutionTab'
import { MultiTenantTab } from '@/components/tabs/MultiTenantTab'
import { LegacyMigrationTab } from '@/components/tabs/LegacyMigrationTab'
import { UniversalUploadTab } from '@/components/tabs/UniversalUploadTab'
import { IntelligenceBankTab } from '@/components/tabs/IntelligenceBankTab'
import { LivingDataDictionaryTab } from '@/components/tabs/LivingDataDictionaryTab'
import { ProjectManagerTab } from '@/components/tabs/ProjectManagerTab'
import { ApiManagementTab } from '@/components/tabs/ApiManagementTab'
import { ErrorPatternDashboardTab } from '@/components/tabs/ErrorPatternDashboardTab'
import { ContractValidatorTab } from '@/components/tabs/ContractValidatorTab'
import { FixCenterDashboard } from '@/components/FixCenterDashboard'
import { PreCommitHookManager } from '@/components/PreCommitHookManager'
import { ImportFixerDashboard } from '@/components/ImportFixerDashboard'
import { FlowMapViewer } from '@/components/FlowMapViewer'
import { TestRunnerDashboard } from '@/components/TestRunnerDashboard'

// =============================================================================
// HEAVY COMPONENTS - Lazy Loaded for Memory Optimization
// =============================================================================

const ChatLogTab = dynamic(
  () => import('@/components/tabs/ChatLogTab').then(m => m.ChatLogTab),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading Chat Logs...</p>
        </div>
      </div>
    ),
  }
)

const FileManagerTab = dynamic(
  () => import('@/components/tabs/FileManagerTab'),
  { ssr: false }
)

const IntelligenceTab = dynamic(
  () => import('@/components/tabs/IntelligenceTab').then(m => m.IntelligenceTab),
  { ssr: false }
)

const ProjectIntelligenceTab = dynamic(
  () => import('@/components/tabs/ProjectIntelligenceTab').then(m => m.ProjectIntelligenceTab),
  { ssr: false }
)

const AutoloadRegistryTab = dynamic(
  () => import('@/components/tabs/AutoloadRegistryTab').then(m => m.AutoloadRegistryTab),
  { ssr: false }
)
import { Layers, BookOpen, FolderSync, MessageSquare, FileCheck, Wrench, ShieldCheck, PackageSearch, Network, FlaskConical, SearchCode } from 'lucide-react'

const SchemaAuditTab = dynamic(
  () => import('./schema-audit/page').then(m => ({ default: m.SchemaAuditDashboard })),
  { ssr: false }
)

// =============================================================================
// Navigation Configuration with Groups
// =============================================================================
interface NavItemConfig {
  id: string
  slug: string
  icon: any
  label: string
  badge?: string
  badgeColorKey?: string
  group?: string
}

const NAV_ITEMS: NavItemConfig[] = [
  { id: 'dashboard', slug: '', icon: LayoutDashboard, label: 'Dashboard', group: 'Overview' },
  { id: 'schema-audit', slug: 'schema-audit', icon: SearchCode, label: 'Schema Audit', badge: 'FIX', badgeColorKey: 'warning', group: 'Core' },
  { id: 'projects', slug: 'projects', icon: FolderKanban, label: 'Projects', badge: 'Multi', badgeColorKey: 'accent', group: 'Core' },
  { id: 'file-manager', slug: 'file-manager', icon: FolderSync, label: 'File Manager', badge: 'New', badgeColorKey: 'success', group: 'Core' },
  { id: 'smart-upload', slug: 'universal-upload', icon: Sparkles, label: 'Universal Upload', badge: 'AI', badgeColorKey: 'primary', group: 'Analysis' },
  { id: 'upload', slug: 'schema-toolkit', icon: Upload, label: 'Schema Toolkit', group: 'Analysis' },
  { id: 'data-dictionary', slug: 'data-dictionary', icon: BookOpen, label: 'Data Dictionary', badge: 'Live', badgeColorKey: 'success', group: 'Analysis' },
  { id: 'modules', slug: 'module-registry', icon: Puzzle, label: 'Module Registry', badge: '35', badgeColorKey: 'accent', group: 'Analysis' },
  { id: 'fk-resolution', slug: 'fk-resolution', icon: AlertTriangle, label: 'FK Resolution', badge: 'Queue', badgeColorKey: 'warning', group: 'Analysis' },
  { id: 'intelligence-bank', slug: 'intelligence-bank', icon: Layers, label: 'Intelligence Bank', badge: 'Unified', badgeColorKey: 'success', group: 'Intelligence' },
  { id: 'intelligence', slug: 'intelligence', icon: Brain, label: 'Intelligence', badge: 'Step 4', badgeColorKey: 'primary', group: 'Intelligence' },
  { id: 'legacy-migration', slug: 'legacy-migration', icon: ArrowRightLeft, label: 'Legacy Migration', badge: 'Step 9', badgeColorKey: 'success', group: 'Intelligence' },
  { id: 'project-intel', slug: 'project-intelligence', icon: ClipboardList, label: 'Project Intelligence', badge: 'Phase 5', badgeColorKey: 'primary', group: 'Intelligence' },
  { id: 'pipeline', slug: 'pipeline', icon: GitBranch, label: 'Pipeline', group: 'Tools' },
  { id: 'multi-tenant', slug: 'multi-tenant', icon: Shield, label: 'Multi-Tenant', badge: 'Step 5', badgeColorKey: 'warning', group: 'Tools' },
  { id: 'api-management', slug: 'api-management', icon: Activity, label: 'API Management', badge: 'Debug', badgeColorKey: 'warning', group: 'Tools' },
  { id: 'error-patterns', slug: 'error-patterns', icon: Bug, label: 'Error Patterns', badge: 'Analysis', badgeColorKey: 'warning', group: 'Tools' },
  { id: 'chat-logs', slug: 'chat-logs', icon: MessageSquare, label: 'Chat Logs', badge: 'History', badgeColorKey: 'primary', group: 'Developer' },
  { id: 'smart-fixer', slug: 'smart-fixer', icon: Wrench, label: 'Smart Fixer', badge: 'Phase 3', badgeColorKey: 'primary', group: 'Developer' },
  { id: 'pre-commit-hook', slug: 'pre-commit-hook', icon: ShieldCheck, label: 'Pre-commit Hook', badge: 'Phase 5', badgeColorKey: 'success', group: 'Developer' },
  { id: 'import-fixer', slug: 'import-fixer', icon: PackageSearch, label: 'Import Fixer', badge: 'Phase 5', badgeColorKey: 'warning', group: 'Developer' },
  { id: 'flow-map', slug: 'flow-map', icon: Network, label: 'Flow Map', badge: 'Phase 4', badgeColorKey: 'primary', group: 'Developer' },
  { id: 'test-generator', slug: 'test-generator', icon: FlaskConical, label: 'Test Generator', badge: 'Phase 4', badgeColorKey: 'primary', group: 'Developer' },
  { id: 'contract-validator', slug: 'contract-validator', icon: FileCheck, label: 'Contract Validator', badge: 'New', badgeColorKey: 'success', group: 'Developer' },
  { id: 'autoload', slug: 'autoload', icon: ToggleLeft, label: 'Autoload Config', badge: 'New', badgeColorKey: 'success', group: 'Developer' },
  { id: 'settings', slug: 'settings', icon: Settings, label: 'Settings', group: 'System' },
]

// Group order and labels
const NAV_GROUPS: { key: string; label: string }[] = [
  { key: 'Overview', label: 'Overview' },
  { key: 'Core', label: 'Core' },
  { key: 'Analysis', label: 'Analysis' },
  { key: 'Intelligence', label: 'Intelligence' },
  { key: 'Tools', label: 'Tools' },
  { key: 'Developer', label: 'Developer' },
  { key: 'System', label: 'System' },
]

// Map slug to tab id
const SLUG_TO_ID: Record<string, string> = {}
NAV_ITEMS.forEach(item => {
  SLUG_TO_ID[item.slug] = item.id
})

function AppContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { colors, colorScheme, setColorScheme } = useTheme()
  const { totalTables, fkResolvedPercent, modulesLinked } = useSchema()

  // Session uptime tracking
  const [uptime, setUptime] = useState(0)
  const [showThreadBreakdown, setShowThreadBreakdown] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage('aitoolkit-sidebar-collapsed', false)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [sidebarSearch, setSidebarSearch] = useState('')
  const actionToast = useActionToast()
  const navHistory = useNavigationHistory()

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - SESSION_START.getTime()) / 1000)
      setUptime(elapsed)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Get active tab from URL
  const getActiveTabFromUrl = useCallback(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && SLUG_TO_ID[tabParam]) {
      return SLUG_TO_ID[tabParam]
    }
    if (pathname === '/' && !tabParam) {
      return 'dashboard'
    }
    return 'dashboard'
  }, [pathname, searchParams])

  const activeTab = getActiveTabFromUrl()

  const handleNavigate = useCallback((tabId: string) => {
    const navItem = NAV_ITEMS.find(item => item.id === tabId)
    if (navItem) {
      if (navItem.slug) {
        router.push(`/?tab=${navItem.slug}`, { scroll: false })
      } else {
        router.push('/', { scroll: false })
      }
      setMobileSidebarOpen(false)
      navHistory.push(navItem.id, navItem.label)
      actionToast.navigate(navItem.label)
    }
  }, [router, actionToast])

  // Keyboard shortcuts - declared after handleNavigate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K / Cmd+K: Open command palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(prev => !prev)
      }
      // ?: Show keyboard shortcuts
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault()
          setShortcutsDialogOpen(true)
        }
      }
      // Alt+1 through Alt+9, Alt+0: Quick page navigation
      if (e.altKey && e.key >= '0' && e.key <= '9') {
        e.preventDefault()
        const index = e.key === '0' ? 9 : parseInt(e.key) - 1
        if (index < NAV_ITEMS.length) {
          handleNavigate(NAV_ITEMS[index].id)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleNavigate])

  // Handle command palette actions
  const handleCommandAction = useCallback((actionId: string) => {
    if (actionId.startsWith('theme-')) {
      const themeName = actionId.replace('theme-', '')
      setColorScheme(themeName as any)
    } else if (actionId === 'action-shortcuts') {
      setShortcutsDialogOpen(true)
    } else if (actionId === 'action-refresh') {
      window.location.reload()
    } else if (actionId === 'action-pipeline') {
      handleNavigate('pipeline')
    }
  }, [setColorScheme, handleNavigate])

  // Toggle group collapse
  const toggleGroup = useCallback((group: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(group)) {
        next.delete(group)
      } else {
        next.add(group)
      }
      return next
    })
  }, [])

  // Get badge color from colors object
  const getBadgeColor = (colorKey: string) => {
    const colorMap: Record<string, string> = {
      primary: colors.primary,
      accent: colors.accent,
      warning: colors.warning,
      success: colors.success,
    }
    return colorMap[colorKey] || colors.primary
  }

  // Filter nav items by search query
  const filteredNavItems = useMemo(() => {
    if (!sidebarSearch.trim()) return NAV_ITEMS
    const q = sidebarSearch.toLowerCase()
    return NAV_ITEMS.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q) ||
      (item.badge && item.badge.toLowerCase().includes(q))
    )
  }, [sidebarSearch])

  // Group nav items by group (filtered)
  const groupedNavItems = useMemo(() => {
    return NAV_GROUPS.map(group => ({
      ...group,
      items: filteredNavItems.filter(item => item.group === group.key),
    })).filter(group => group.items.length > 0)
  }, [filteredNavItems])

  // Alpha helper
  const alpha = (color: string, opacity: number) =>
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  const activeNavLabel = NAV_ITEMS.find(n => n.id === activeTab)?.label || 'Dashboard'

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: `linear-gradient(to bottom right, ${colors.bg}, ${colors.bgSecondary}, ${colors.bg})`
      }}
    >
      {/* Header */}
      <header
        className="border-b backdrop-blur-md sticky top-0 z-50 glass-card-enhanced"
        style={{
          borderColor: alpha(colors.border, 50),
          backgroundColor: alpha(colors.bg, 85),
        }}
      >
        <div className="flex items-center justify-between px-4 md:px-6 py-3">
          <div className="flex items-center gap-3">
            {/* Mobile sidebar toggle */}
            <button
              className="lg:hidden p-2 rounded-lg transition-colors"
              style={{ color: colors.textMuted }}
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              aria-label="Toggle sidebar"
            >
              {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="relative w-9 h-9 md:w-10 md:h-10">
              {/* Glow effect behind logo */}
              <div
                className="absolute inset-[-4px] rounded-xl animate-glow-pulse"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
                  opacity: 0.25,
                }}
              />
              <div
                className="relative w-full h-full rounded-lg flex items-center justify-center animate-gradient-shift"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent}, ${colors.primary})`,
                  backgroundSize: '200% 200%',
                }}
              >
                <Database className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg md:text-xl font-bold text-gradient-primary">
                AI Enterprise Architect
              </h1>
              <p className="text-[10px] md:text-xs" style={{ color: colors.textMuted }}>
                Multi-Agent Schema Intelligence Platform
              </p>
            </div>
          </div>

          {/* Breadcrumb / Navigation History */}
          <div className="hidden md:flex items-center gap-1.5 flex-1 justify-center">
            {navHistory.canGoBack && (
              <button
                className="p-1 rounded-md transition-all duration-200 hover:scale-110"
                style={{ color: colors.textMuted, backgroundColor: alpha(colors.bgTertiary, 20) }}
                onClick={() => {
                  const entry = navHistory.goBack()
                  if (entry) handleNavigate(entry.tabId)
                }}
                aria-label="Go back"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}
            <div
              className="flex items-center gap-2 px-3 py-1 rounded-full"
              style={{
                backgroundColor: alpha(colors.primary, 8),
                border: `1px solid ${alpha(colors.primary, 15)}`,
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full animate-breathe" style={{ backgroundColor: colors.primary }} />
              <span className="text-xs font-medium" style={{ color: colors.primaryLight }}>{activeNavLabel}</span>
              {navHistory.historyLength > 1 && (
                <span className="text-[10px] font-mono px-1 py-0.5 rounded" style={{ backgroundColor: alpha(colors.primary, 12), color: colors.primary }}>
                  {navHistory.historyLength}
                </span>
              )}
            </div>
            {navHistory.canGoForward && (
              <button
                className="p-1 rounded-md transition-all duration-200 hover:scale-110"
                style={{ color: colors.textMuted, backgroundColor: alpha(colors.bgTertiary, 20) }}
                onClick={() => {
                  const entry = navHistory.goForward()
                  if (entry) handleNavigate(entry.tabId)
                }}
                aria-label="Go forward"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <ProjectScopeHeader variant="header" showSettings />

          <div className="flex items-center gap-1.5 md:gap-2">
            {/* Search / Command Palette trigger */}
            <button
              className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all duration-200 hover:scale-[1.02]"
              style={{
                backgroundColor: alpha(colors.bgTertiary, 30),
                borderColor: alpha(colors.border, 50),
                color: colors.textMuted,
              }}
              onClick={() => setCommandPaletteOpen(true)}
            >
              <Search className="w-3.5 h-3.5" />
              <span className="text-xs hidden md:inline">Search...</span>
              <kbd
                className="text-[9px] px-1 py-0.5 rounded border font-mono"
                style={{
                  backgroundColor: alpha(colors.bgTertiary, 40),
                  borderColor: alpha(colors.border, 60),
                  color: colors.textMuted
                }}
              >
                ⌘K
              </kbd>
            </button>

            {/* Uptime Display */}
            <div
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 border rounded-full"
              style={{
                backgroundColor: alpha(colors.success, 8),
                borderColor: alpha(colors.success, 15),
              }}
            >
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: colors.success }}
              />
              <span
                className="text-xs font-mono font-medium"
                style={{ color: colors.success }}
              >
                {formatUptime(uptime)}
              </span>
            </div>
            <NotificationCenter onNavigate={handleNavigate} />
            <VersionTracker />
            <ThreadStatusBadge onClick={() => setShowThreadBreakdown(true)} />
            <MemoryToggleButton />
            <SessionStatusBadge />
            <ColorSchemeSelector />
            <div
              className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: alpha(colors.primary, 10) }}
            >
              <Brain className="w-4 h-4" style={{ color: colors.primary }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>Offline Mode</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 relative">
        {/* Mobile sidebar overlay */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            ${sidebarCollapsed ? 'w-16' : 'w-60 lg:w-64'}
            ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            border-r min-h-0 flex-shrink-0 fixed lg:sticky top-[57px] lg:top-[57px] z-40 lg:z-auto
            transition-all duration-200 ease-in-out overflow-hidden
          `}
          style={{
            borderColor: alpha(colors.border, 50),
            backgroundColor: alpha(colors.bgSecondary, 30),
            height: 'calc(100vh - 57px)',
          }}
        >
          {/* Sidebar Search - filters nav items */}
          <div className="px-3 pb-2 pt-3">
            {!sidebarCollapsed && (
              <TabSearchFilter
                value={sidebarSearch}
                onChange={setSidebarSearch}
                placeholder="Filter pages..."
                totalCount={NAV_ITEMS.length}
                matchCount={filteredNavItems.length}
              />
            )}
          </div>

          {/* Scrollable nav area */}
          <ScrollArea className="h-[calc(100vh-57px-52px)] lg:h-[calc(100vh-57px-52px)]">
            <nav className="px-3 space-y-0.5 pb-4">
              {groupedNavItems.map((group) => (
                <div key={group.key}>
                  {/* Group Header */}
                  {!sidebarCollapsed && (
                    <button
                      className="w-full flex items-center gap-1.5 px-2 py-1.5 mt-3 first:mt-0 group"
                      onClick={() => toggleGroup(group.key)}
                    >
                      {collapsedGroups.has(group.key) ? (
                        <ChevronRight className="w-3 h-3 transition-transform duration-200" style={{ color: colors.textMuted }} />
                      ) : (
                        <ChevronDown className="w-3 h-3 transition-transform duration-200" style={{ color: colors.textMuted }} />
                      )}
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: colors.textMuted }}
                      >
                        {group.label}
                      </span>
                      <span
                        className="ml-auto text-[9px] font-mono tabular-nums"
                        style={{ color: alpha(colors.textMuted, 40) }}
                      >
                        {group.items.length}
                      </span>
                    </button>
                  )}

                  {/* Nav Items */}
                  {!collapsedGroups.has(group.key) && (
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const badgeColor = item.badgeColorKey ? getBadgeColor(item.badgeColorKey) : undefined
                        const isActive = activeTab === item.id
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleNavigate(item.id)}
                            className="sidebar-nav-item card-hover-lift w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all duration-200 text-left group relative overflow-hidden"
                            style={{
                              backgroundColor: isActive
                                ? alpha(colors.primary, 15)
                                : 'transparent',
                              color: isActive
                                ? colors.primaryLight
                                : colors.textMuted,
                              border: isActive
                                ? `1px solid ${alpha(colors.primary, 25)}`
                                : '1px solid transparent',
                              boxShadow: isActive
                                ? `0 0 12px ${alpha(colors.primary, 10)}, inset 0 0 0 1px ${alpha(colors.primary, 5)}`
                                : 'none',
                            }}
                            onMouseEnter={(e) => {
                              if (!isActive) {
                                e.currentTarget.style.backgroundColor = alpha(colors.primary, 6)
                                e.currentTarget.style.borderColor = alpha(colors.primary, 10)
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isActive) {
                                e.currentTarget.style.backgroundColor = 'transparent'
                                e.currentTarget.style.borderColor = '1px solid transparent'
                              }
                            }}
                          >
                            {/* Active glow indicator bar */}
                            {isActive && (
                              <div
                                className="sidebar-active-indicator"
                                style={{
                                  backgroundColor: colors.primary,
                                  boxShadow: `0 0 8px ${alpha(colors.primary, 50)}`,
                                }}
                              />
                            )}
                            <item.icon
                              className="w-4 h-4 flex-shrink-0 transition-all duration-200"
                              style={{
                                transform: isActive ? 'scale(1.1)' : undefined,
                                filter: isActive ? `drop-shadow(0 0 4px ${alpha(colors.primary, 40)})` : undefined,
                              }}
                            />
                            {!sidebarCollapsed && (
                              <>
                                <span className={`text-[13px] truncate transition-all duration-200 ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
                                {item.badge && badgeColor && (
                                  <span
                                    className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 transition-all duration-200"
                                    style={{
                                      backgroundColor: alpha(badgeColor, 20),
                                      color: badgeColor,
                                      boxShadow: isActive ? `0 0 6px ${alpha(badgeColor, 20)}` : 'none',
                                    }}
                                  >
                                    {item.badge}
                                  </span>
                                )}
                              </>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </nav>

            {/* Agent Layers Section */}
            {!sidebarCollapsed && (
              <div
                className="px-3 pt-3 pb-2 border-t mx-3"
                style={{ borderColor: alpha(colors.border, 50) }}
              >
                <h3
                  className="text-[10px] font-semibold uppercase tracking-wider mb-2"
                  style={{ color: colors.textMuted }}
                >
                  Agent Layers
                </h3>
                <div className="space-y-1.5">
                  {[
                    { name: 'Schema', icon: Database, count: 5, total: 5, color: colors.accent },
                    { name: 'Intelligence', icon: Brain, count: 5, total: 5, color: colors.primary },
                    { name: 'Module', icon: Puzzle, count: 5, total: 5, color: colors.success },
                    { name: 'Requirements', icon: FileCode, count: 5, total: 5, color: colors.warning },
                    { name: 'Generation', icon: Zap, count: 6, total: 6, color: '#eab308' },
                    { name: 'Migration', icon: GitBranch, count: 4, total: 4, color: '#ec4899' },
                    { name: 'Management', icon: BarChart3, count: 5, total: 5, color: '#06b6d4' },
                  ].map((layer) => (
                    <div
                      key={layer.name}
                      className="flex items-center gap-2 px-2 py-1 rounded-md"
                      style={{ backgroundColor: alpha(colors.card, 30) }}
                    >
                      <layer.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: layer.color }} />
                      <span className="text-xs flex-1 truncate" style={{ color: colors.text }}>{layer.name}</span>
                      <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: alpha(colors.border, 60) }}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(layer.count/layer.total)*100}%`, backgroundColor: layer.color }} />
                      </div>
                      <span className="text-[10px] w-5 text-right" style={{ color: colors.textMuted }}>{layer.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Stats Section */}
            {!sidebarCollapsed && (
              <div
                className="px-3 pt-3 pb-4 border-t mx-3"
                style={{ borderColor: alpha(colors.border, 50) }}
              >
                <h3
                  className="text-[10px] font-semibold uppercase tracking-wider mb-2"
                  style={{ color: colors.textMuted }}
                >
                  Quick Stats
                </h3>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: 'Tables', value: totalTables, color: colors.accent },
                    { label: 'FK %', value: fkResolvedPercent, color: colors.success },
                    { label: 'Modules', value: `${modulesLinked}/35`, color: colors.primary },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="text-center px-1.5 py-1.5 rounded-md"
                      style={{ backgroundColor: alpha(stat.color, 8) }}
                    >
                      <div className="text-sm font-bold" style={{ color: stat.color }}>{stat.value}</div>
                      <div className="text-[10px]" style={{ color: colors.textMuted }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Sidebar collapse toggle - desktop only */}
          <button
            className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border items-center justify-center z-10 transition-colors"
            style={{
              backgroundColor: colors.bgSecondary,
              borderColor: colors.border,
              color: colors.textMuted,
            }}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
            )}
          </button>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-h-0">
          <ScrollArea className="h-[calc(100vh-57px)]">
            <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
              {/* Breadcrumb Navigation */}
              <BreadcrumbNav
                items={(() => {
                  const activeItem = NAV_ITEMS.find(n => n.id === activeTab)
                  const groupLabel = activeItem?.group || ''
                  const crumbs = []
                  if (groupLabel) {
                    crumbs.push({ label: groupLabel.toUpperCase() })
                  }
                  crumbs.push({ label: activeItem?.label || 'Dashboard' })
                  return crumbs
                })()}
                className="mb-3"
              />
              <TabTransition activeTab={activeTab}>
                {activeTab === 'dashboard' && <DashboardTab onNavigate={handleNavigate} />}
                {activeTab === 'schema-audit' && <SchemaAuditTab />}
                {activeTab === 'projects' && <ProjectManagerTab onNavigate={handleNavigate} />}
                {activeTab === 'smart-upload' && <UniversalUploadTab onNavigate={handleNavigate} />}
                {activeTab === 'upload' && <UploadTab onNavigate={handleNavigate} />}
                {activeTab === 'data-dictionary' && <LivingDataDictionaryTab onNavigate={handleNavigate} />}
                {activeTab === 'fk-resolution' && <FKResolutionTab />}
                {activeTab === 'modules' && <ModulesTab />}
                {activeTab === 'intelligence-bank' && <IntelligenceBankTab />}
                {activeTab === 'intelligence' && <IntelligenceTab onNavigate={handleNavigate} />}
                {activeTab === 'legacy-migration' && <LegacyMigrationTab onNavigate={handleNavigate} />}
                {activeTab === 'project-intel' && <ProjectIntelligenceTab />}
                {activeTab === 'multi-tenant' && <MultiTenantTab onNavigate={handleNavigate} />}
                {activeTab === 'pipeline' && <PipelineTab />}
                {activeTab === 'api-management' && <ApiManagementTab />}
                {activeTab === 'error-patterns' && <ErrorPatternDashboardTab onNavigate={handleNavigate} />}
                {activeTab === 'chat-logs' && <ChatLogTab />}
                {activeTab === 'smart-fixer' && <FixCenterDashboard />}
                {activeTab === 'pre-commit-hook' && <PreCommitHookManager />}
                {activeTab === 'import-fixer' && <ImportFixerDashboard />}
                {activeTab === 'flow-map' && <FlowMapViewer />}
                {activeTab === 'test-generator' && <TestRunnerDashboard />}
                {activeTab === 'contract-validator' && <ContractValidatorTab />}
                {activeTab === 'autoload' && <AutoloadRegistryTab />}
                {activeTab === 'settings' && <SettingsTab />}
                {activeTab === 'file-manager' && <FileManagerTab onNavigate={handleNavigate} />}
              </TabTransition>
            </div>
          </ScrollArea>
        </main>
      </div>

      {/* Sticky Footer */}
      <footer
        className="border-t py-2.5 px-4 md:px-6 flex items-center justify-between text-[11px] flex-shrink-0 glass-card-enhanced"
        style={{
          borderColor: alpha(colors.border, 50),
          backgroundColor: alpha(colors.bgSecondary, 60),
          color: colors.textMuted,
        }}
      >
        <div className="flex items-center gap-3">
          <span className="font-medium" style={{ color: colors.text }}>AI Enterprise Architect</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: alpha(colors.primary, 12), color: colors.primaryLight, border: `1px solid ${alpha(colors.primary, 20)}` }}>v2.5</span>
          <span className="hidden sm:inline" style={{ color: alpha(colors.textMuted, 40) }}>|</span>
          <span className="hidden sm:flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full live-dot" style={{ backgroundColor: colors.success }} />
            <span>35 Agents Active</span>
          </span>
          <span className="hidden md:inline" style={{ color: alpha(colors.textMuted, 40) }}>|</span>
          <span className="hidden md:inline">Next.js 16 + Turbopack</span>
          <span className="hidden lg:inline" style={{ color: alpha(colors.textMuted, 40) }}>|</span>
          <span className="hidden lg:flex items-center gap-1">
            <Database className="w-3 h-3" style={{ color: alpha(colors.accent, 60) }} />
            <span>SQLite</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="hover:underline transition-colors"
            style={{ color: colors.textMuted }}
            onClick={() => setShortcutsDialogOpen(true)}
          >
            Shortcuts
          </button>
          <span className="hidden sm:inline" style={{ color: alpha(colors.textMuted, 30) }}>•</span>
          <span className="hidden sm:inline" style={{ color: alpha(colors.textMuted, 50) }}>
            Press <kbd className="px-1 py-0.5 rounded border font-mono text-[9px]" style={{ borderColor: colors.border }}>Ctrl+K</kbd> to search
          </span>
        </div>
      </footer>

      {/* Modals & Overlays */}
      <ThreadBreakdown
        isOpen={showThreadBreakdown}
        onClose={() => setShowThreadBreakdown(false)}
      />
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onNavigate={handleNavigate}
        onAction={handleCommandAction}
      />
      <KeyboardShortcutsDialog
        open={shortcutsDialogOpen}
        onOpenChange={setShortcutsDialogOpen}
      />
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] relative overflow-hidden dot-matrix-bg">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 rounded-full opacity-10 animate-float-subtle" style={{
          background: 'radial-gradient(circle, #a855f7, transparent)',
          top: '10%', left: '20%',
          animationDelay: '0ms',
        }} />
        <div className="absolute w-80 h-80 rounded-full opacity-8 animate-float-subtle" style={{
          background: 'radial-gradient(circle, #6366f1, transparent)',
          bottom: '15%', right: '15%',
          animationDelay: '1.5s',
        }} />
        <div className="absolute w-64 h-64 rounded-full opacity-5 animate-float-subtle" style={{
          background: 'radial-gradient(circle, #22c55e, transparent)',
          top: '60%', left: '60%',
          animationDelay: '3s',
        }} />
      </div>

      <div className="relative z-10 text-center">
        <div className="relative w-20 h-20 mx-auto mb-8">
          {/* Outer glow ring */}
          <div className="absolute inset-[-8px] rounded-2xl animate-glow-pulse" style={{
            background: 'linear-gradient(135deg, #a855f7, #6366f1)',
            opacity: 0.3,
          }} />
          {/* Rotating gradient border */}
          <div className="absolute inset-0 rounded-xl animate-spin" style={{
            animationDuration: '4s',
            background: 'conic-gradient(from 0deg, #a855f7, #6366f1, #22c55e, #6366f1, #a855f7)',
          }}>
            <div className="absolute inset-[2px] rounded-[10px] bg-[#0f172a]" />
          </div>
          {/* Inner icon */}
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-600/20 backdrop-blur-sm">
            <Database className="w-9 h-9 text-white" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
          AI Enterprise Architect
        </h2>
        <p className="text-sm text-slate-400 mb-1">Multi-Agent Schema Intelligence Platform</p>
        <p className="text-xs text-slate-500 mb-6">Initializing 35 agent modules across 7 layers...</p>

        {/* Progress steps */}
        <div className="flex items-center justify-center gap-1 mb-6">
          <div className="w-8 h-1 rounded-full bg-purple-500 animate-shimmer" />
          <div className="w-8 h-1 rounded-full bg-purple-400/50 animate-shimmer" style={{ animationDelay: '0.2s' }} />
          <div className="w-8 h-1 rounded-full bg-purple-400/30 animate-shimmer" style={{ animationDelay: '0.4s' }} />
          <div className="w-8 h-1 rounded-full bg-purple-400/20 animate-shimmer" style={{ animationDelay: '0.6s' }} />
          <div className="w-8 h-1 rounded-full bg-purple-400/10 animate-shimmer" style={{ animationDelay: '0.8s' }} />
        </div>

        <div className="flex items-center justify-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-green-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <ThemeProvider>
      <SchemaProvider>
        <ProjectScopeProvider>
          <Suspense fallback={<LoadingScreen />}>
            <AppContent />
            <ErrorMonitor />
          </Suspense>
        </ProjectScopeProvider>
      </SchemaProvider>
    </ThemeProvider>
  )
}
