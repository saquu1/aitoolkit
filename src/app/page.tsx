'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ThemeProvider, useTheme } from '@/hooks/useTheme'
import { SchemaProvider, useSchema } from '@/hooks/useSchema'
import { ColorSchemeSelector } from '@/components/ColorSchemeSelector'
import { Clock } from 'lucide-react'
import { SessionStatusBadge } from '@/components/SessionStatusIndicator'
import { MemoryToggleButton } from '@/components/MemoryBreakdown'
import { ThreadStatusBadge } from '@/components/ThreadStatusBadge'
import { ThreadBreakdown } from '@/components/ThreadBreakdown'
import { ProjectScopeProvider } from '@/contexts/ProjectScopeContext'
import { ProjectScopeHeader } from '@/components/project/ProjectScopeHeader'
import { ErrorMonitor } from '@/components/ErrorMonitor'
import { VersionTracker } from '@/components/VersionTracker'

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
// Radix UI ScrollArea generates different styles on server vs client
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
  ToggleLeft
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
import { Layers, BookOpen, FolderSync, MessageSquare, FileCheck } from 'lucide-react'

// =============================================================================
// HEAVY COMPONENTS - Lazy Loaded for Memory Optimization
// These components are large (1000+ lines) and loaded on-demand only
// =============================================================================

// ChatLogTab - 4,178 lines - loaded only when user navigates to chat-logs
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

// FileManagerTab - 1,434 lines - loaded only when user navigates to file-manager
const FileManagerTab = dynamic(
  () => import('@/components/tabs/FileManagerTab'),
  { ssr: false }
)

// IntelligenceTab - loaded only when user navigates to intelligence
const IntelligenceTab = dynamic(
  () => import('@/components/tabs/IntelligenceTab').then(m => m.IntelligenceTab),
  { ssr: false }
)

// ProjectIntelligenceTab - loaded only when user navigates to project-intel
const ProjectIntelligenceTab = dynamic(
  () => import('@/components/tabs/ProjectIntelligenceTab').then(m => m.ProjectIntelligenceTab),
  { ssr: false }
)

// AutoloadRegistryTab - loaded only when user navigates to autoload
const AutoloadRegistryTab = dynamic(
  () => import('@/components/tabs/AutoloadRegistryTab').then(m => m.AutoloadRegistryTab),
  { ssr: false }
)

// Navigation configuration with URL slugs
const NAV_ITEMS = [
  { id: 'dashboard', slug: '', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'projects', slug: 'projects', icon: FolderKanban, label: 'Projects', badge: 'Multi', badgeColorKey: 'accent' },
  { id: 'file-manager', slug: 'file-manager', icon: FolderSync, label: 'File Manager', badge: 'New', badgeColorKey: 'success' },
  { id: 'smart-upload', slug: 'universal-upload', icon: Sparkles, label: 'Universal Upload', badge: 'AI', badgeColorKey: 'primary' },
  { id: 'upload', slug: 'schema-toolkit', icon: Upload, label: 'Schema Toolkit' },
  { id: 'data-dictionary', slug: 'data-dictionary', icon: BookOpen, label: 'Data Dictionary', badge: 'Live', badgeColorKey: 'success' },
  { id: 'modules', slug: 'module-registry', icon: Puzzle, label: 'Module Registry', badge: '35', badgeColorKey: 'accent' },
  { id: 'fk-resolution', slug: 'fk-resolution', icon: AlertTriangle, label: 'FK Resolution', badge: 'Queue', badgeColorKey: 'warning' },
  { id: 'intelligence-bank', slug: 'intelligence-bank', icon: Layers, label: 'Intelligence Bank', badge: 'Unified', badgeColorKey: 'success' },
  { id: 'intelligence', slug: 'intelligence', icon: Brain, label: 'Intelligence', badge: 'Step 4', badgeColorKey: 'primary' },
  { id: 'legacy-migration', slug: 'legacy-migration', icon: ArrowRightLeft, label: 'Legacy Migration', badge: 'Step 9', badgeColorKey: 'success' },
  { id: 'project-intel', slug: 'project-intelligence', icon: ClipboardList, label: 'Project Intelligence', badge: 'Phase 5', badgeColorKey: 'primary' },
  { id: 'pipeline', slug: 'pipeline', icon: GitBranch, label: 'Pipeline' },
  { id: 'multi-tenant', slug: 'multi-tenant', icon: Shield, label: 'Multi-Tenant', badge: 'Step 5', badgeColorKey: 'warning' },
  { id: 'api-management', slug: 'api-management', icon: Activity, label: 'API Management', badge: 'Debug', badgeColorKey: 'warning' },
  { id: 'error-patterns', slug: 'error-patterns', icon: Bug, label: 'Error Patterns', badge: 'Analysis', badgeColorKey: 'warning' },
  { id: 'chat-logs', slug: 'chat-logs', icon: MessageSquare, label: 'Chat Logs', badge: 'History', badgeColorKey: 'primary' },
  { id: 'contract-validator', slug: 'contract-validator', icon: FileCheck, label: 'Contract Validator', badge: 'New', badgeColorKey: 'success' },
  { id: 'autoload', slug: 'autoload', icon: ToggleLeft, label: 'Autoload Config', badge: 'New', badgeColorKey: 'success' },
  { id: 'settings', slug: 'settings', icon: Settings, label: 'Settings' },
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
  // Workspace panel removed to save memory
  const { colors, colorScheme } = useTheme()
  const { totalTables, fkResolvedPercent, modulesLinked } = useSchema()

  // Session uptime tracking
  const [uptime, setUptime] = useState(0)
  const [showThreadBreakdown, setShowThreadBreakdown] = useState(false)

  useEffect(() => {
    // Update uptime every second
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
    // Check if we're on root path
    if (pathname === '/' && !tabParam) {
      return 'dashboard'
    }
    return 'dashboard'
  }, [pathname, searchParams])

  const [activeTab, setActiveTab] = useState(getActiveTabFromUrl)

  // Sync activeTab with URL changes
  useEffect(() => {
    const tabFromUrl = getActiveTabFromUrl()
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl)
    }
  }, [getActiveTabFromUrl, activeTab])

  // Navigation handler - updates URL
  const handleNavigate = useCallback((tabId: string) => {
    const navItem = NAV_ITEMS.find(item => item.id === tabId)
    if (navItem) {
      setActiveTab(tabId)
      if (navItem.slug) {
        router.push(`/?tab=${navItem.slug}`, { scroll: false })
      } else {
        router.push('/', { scroll: false })
      }
    }
  }, [router])

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

  return (
    <div 
      className="min-h-screen"
      style={{ 
        background: `linear-gradient(to bottom right, ${colors.bg}, ${colors.bgSecondary}, ${colors.bg})` 
      }}
    >
      {/* Header */}
      <header 
        className="border-b backdrop-blur-sm sticky top-0 z-50"
        style={{ 
          borderColor: `color-mix(in srgb, ${colors.border} 50%, transparent)`,
          backgroundColor: `color-mix(in srgb, ${colors.bg} 80%, transparent)`,
        }}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10">
              <div 
                className="w-full h-full rounded-lg flex items-center justify-center"
                style={{ 
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` 
                }}
              >
                <Database className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: colors.text }}>
                AI Enterprise Architect
              </h1>
              <p className="text-xs" style={{ color: colors.textMuted }}>
                Multi-Agent Schema Intelligence Platform
              </p>
            </div>
          </div>
          {/* Project Scope Selector */}
          <ProjectScopeHeader variant="header" showSettings />

          <div className="flex items-center gap-3">
            {/* Session Active Time */}
            <div 
              className="flex items-center gap-2 px-3 py-1.5 border rounded-full"
              style={{ 
                backgroundColor: `color-mix(in srgb, ${colors.success} 10%, transparent)`,
                borderColor: `color-mix(in srgb, ${colors.success} 20%, transparent)`,
              }}
            >
              <div 
                className="w-2 h-2 rounded-full animate-pulse" 
                style={{ backgroundColor: colors.success }} 
              />
              <span 
                className="text-xs font-medium"
                style={{ color: colors.success }}
              >
                System Ready
              </span>
            </div>
            {/* Version Tracker */}
            <VersionTracker />
            {/* Thread Status Badge */}
            <ThreadStatusBadge onClick={() => setShowThreadBreakdown(true)} />
            {/* Memory Breakdown Toggle */}
            <MemoryToggleButton />
            {/* Session Status Badge (shows uptime + warnings) */}
            <SessionStatusBadge />
            <ColorSchemeSelector />
            <div 
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: `color-mix(in srgb, ${colors.primary} 10%, transparent)` }}
            >
              <Brain className="w-4 h-4" style={{ color: colors.primary }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>Offline Mode</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex">
        {/* Sidebar */}
        <aside 
          className="w-64 border-r min-h-[calc(100vh-73px)] sticky top-[73px]"
          style={{ 
            borderColor: `color-mix(in srgb, ${colors.border} 50%, transparent)`,
            backgroundColor: `color-mix(in srgb, ${colors.bgSecondary} 30%, transparent)`,
          }}
        >
          <nav className="p-4 space-y-2">
            {NAV_ITEMS.map((item) => {
              const badgeColor = item.badgeColorKey ? getBadgeColor(item.badgeColorKey) : undefined
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all"
                  style={{
                    backgroundColor: activeTab === item.id 
                      ? `color-mix(in srgb, ${colors.primary} 15%, transparent)` 
                      : 'transparent',
                    color: activeTab === item.id 
                      ? colors.primaryLight 
                      : colors.textMuted,
                    border: activeTab === item.id 
                      ? `1px solid color-mix(in srgb, ${colors.primary} 30%, transparent)` 
                      : '1px solid transparent',
                  }}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  {item.badge && badgeColor && (
                    <span 
                      className="ml-auto text-xs px-2 py-0.5 rounded-full"
                      style={{ 
                        backgroundColor: `color-mix(in srgb, ${badgeColor} 20%, transparent)`,
                        color: badgeColor,
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Agent Status */}
          <div 
            className="p-4 border-t"
            style={{ borderColor: `color-mix(in srgb, ${colors.border} 50%, transparent)` }}
          >
            <h3 
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: colors.textMuted }}
            >
              Agent Layers
            </h3>
            <div className="space-y-2">
              {[
                { name: 'Schema', icon: Database, count: 5, color: colors.accent },
                { name: 'Intelligence', icon: Brain, count: 5, color: colors.primary },
                { name: 'Module', icon: Puzzle, count: 5, color: colors.success },
                { name: 'Requirements', icon: FileCode, count: 5, color: colors.warning },
                { name: 'Generation', icon: Zap, count: 6, color: '#eab308' },
                { name: 'Migration', icon: GitBranch, count: 4, color: '#ec4899' },
                { name: 'Management', icon: BarChart3, count: 5, color: '#06b6d4' },
              ].map((layer) => (
                <div 
                  key={layer.name} 
                  className="flex items-center justify-between px-3 py-2 rounded-lg"
                  style={{ backgroundColor: `color-mix(in srgb, ${colors.card} 50%, transparent)` }}
                >
                  <div className="flex items-center gap-2">
                    <layer.icon className="w-4 h-4" style={{ color: layer.color }} />
                    <span className="text-sm" style={{ color: colors.text }}>{layer.name}</span>
                  </div>
                  <span className="text-xs" style={{ color: colors.textMuted }}>{layer.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div 
            className="p-4 border-t"
            style={{ borderColor: `color-mix(in srgb, ${colors.border} 50%, transparent)` }}
          >
            <h3 
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: colors.textMuted }}
            >
              Quick Stats
            </h3>
            <div className="space-y-2 text-sm">
              {[
                { label: 'Tables Parsed', value: totalTables.toString() },
                { label: 'FK Resolved', value: `${fkResolvedPercent}%` },
                { label: 'Modules Covered', value: `${modulesLinked}/35` },
              ].map((stat) => (
                <div key={stat.label} className="flex justify-between" style={{ color: colors.textMuted }}>
                  <span>{stat.label}</span>
                  <span style={{ color: colors.text }} className="font-medium">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-h-[calc(100vh-73px)]">
          <ScrollArea className="h-[calc(100vh-73px)]">
            <div className="p-6">
              {activeTab === 'dashboard' && <DashboardTab onNavigate={handleNavigate} />}
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
              {activeTab === 'contract-validator' && <ContractValidatorTab />}
              {activeTab === 'autoload' && <AutoloadRegistryTab />}
              {activeTab === 'settings' && <SettingsTab />}
              {activeTab === 'file-manager' && <FileManagerTab onNavigate={handleNavigate} />}
            </div>
          </ScrollArea>
        </main>

        {/* Workspace Panel removed */}
      </div>

      {/* Thread Breakdown Modal */}
      <ThreadBreakdown 
        isOpen={showThreadBreakdown} 
        onClose={() => setShowThreadBreakdown(false)} 
      />
    </div>
  )
}

export default function Home() {
  return (
    <ThemeProvider>
      <SchemaProvider>
        <ProjectScopeProvider>
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <AppContent />
            <ErrorMonitor />
          </Suspense>
        </ProjectScopeProvider>
      </SchemaProvider>
    </ThemeProvider>
  )
}
