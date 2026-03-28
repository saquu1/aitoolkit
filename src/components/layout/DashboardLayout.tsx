'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  AlertTriangle
} from 'lucide-react'

interface DashboardLayoutProps {
  children: ReactNode
  title?: string
  subtitle?: string
}

const navigationItems = [
  { 
    href: '/dashboard', 
    label: 'Dashboard', 
    icon: LayoutDashboard 
  },
  { 
    href: '/projects', 
    label: 'Projects', 
    icon: Database 
  },
  { 
    href: '/schema/upload', 
    label: 'Upload & Parse', 
    icon: Upload 
  },
  { 
    href: '/schema/modules', 
    label: 'Module Registry', 
    icon: Puzzle,
    badge: '460+'
  },
  { 
    href: '/schema/fk-resolution', 
    label: 'FK Resolution', 
    icon: AlertTriangle,
    badge: 'Queue'
  },
  { 
    href: '/analysis/intelligence', 
    label: 'Intelligence', 
    icon: Brain,
    badge: 'Step 4'
  },
  { 
    href: '/generation/pipeline', 
    label: 'Pipeline', 
    icon: GitBranch 
  },
  { 
    href: '/architecture/multi-tenant', 
    label: 'Multi-Tenant', 
    icon: Shield,
    badge: 'Step 5'
  },
  { 
    href: '/settings', 
    label: 'Settings', 
    icon: Settings 
  },
]

const agentLayers = [
  { name: 'Schema', icon: Database, count: 5, color: 'blue' },
  { name: 'Intelligence', icon: Brain, count: 5, color: 'purple' },
  { name: 'Module', icon: Puzzle, count: 5, color: 'emerald' },
  { name: 'Requirements', icon: FileCode, count: 5, color: 'orange' },
  { name: 'Generation', icon: Zap, count: 6, color: 'yellow' },
  { name: 'Migration', icon: GitBranch, count: 4, color: 'pink' },
  { name: 'Management', icon: BarChart3, count: 5, color: 'cyan' },
]

export default function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="relative w-10 h-10">
                <img
                  src="/logo.svg"
                  alt="Z.ai Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">AI Enterprise Architect</h1>
                <p className="text-xs text-slate-400">Multi-Agent Schema Intelligence Platform</p>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs text-emerald-400 font-medium">System Ready</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/50 rounded-lg">
              <Brain className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-slate-300">Offline Mode</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-700/50 bg-slate-900/30 min-h-[calc(100vh-73px)] sticky top-[73px]">
          <nav className="p-4 space-y-2">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive 
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                      : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  {item.badge && (
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                      item.badge === 'Queue' 
                        ? 'bg-amber-500/20 text-amber-300' 
                        : item.badge.startsWith('Step')
                        ? 'bg-purple-500/20 text-purple-300'
                        : 'bg-blue-500/20 text-blue-300'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Agent Status */}
          <div className="p-4 border-t border-slate-700/50">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Agent Layers</h3>
            <div className="space-y-2">
              {agentLayers.map((layer) => (
                <div key={layer.name} className="flex items-center justify-between px-3 py-2 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <layer.icon className={`w-4 h-4 text-${layer.color}-400`} />
                    <span className="text-sm text-slate-300">{layer.name}</span>
                  </div>
                  <span className="text-xs text-slate-500">{layer.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="p-4 border-t border-slate-700/50">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Tables Parsed</span>
                <span className="text-white font-medium">0</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>FK Resolved</span>
                <span className="text-white font-medium">0%</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Modules Covered</span>
                <span className="text-white font-medium">0/460</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-h-[calc(100vh-73px)]">
          <ScrollArea className="h-[calc(100vh-73px)]">
            <div className="p-6">
              {/* Breadcrumb / Page Title */}
              {(title || subtitle) && (
                <div className="mb-6">
                  {title && <h1 className="text-2xl font-bold text-white">{title}</h1>}
                  {subtitle && <p className="text-slate-400 mt-1">{subtitle}</p>}
                </div>
              )}
              {children}
            </div>
          </ScrollArea>
        </main>
      </div>
    </div>
  )
}
