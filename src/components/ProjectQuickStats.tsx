'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { AnimatedCounter } from '@/components/Sparkline'
import {
  FolderKanban,
  Table2,
  Columns3,
  Puzzle,
  ArrowRight,
} from 'lucide-react'

// ── Color helper consistent with codebase ──
function alpha(color: string, opacity: number): string {
  return `color-mix(in srgb, ${color} ${opacity}%, transparent)`
}

// ── Types ──
interface SchemaStats {
  totalProjects: number
  totalTables: number
  totalColumns: number
  totalModules: number
}

interface ProjectSummary {
  id: string
  name: string
  tableCount: number
}

interface StatItem {
  icon: React.ReactNode
  label: string
  value: number
  color: string
  href: string
}

// ── Component ──
export function ProjectQuickStats({ className = '' }: { className?: string }) {
  const { colors, mounted } = useTheme()
  const [stats, setStats] = useState<SchemaStats>({
    totalProjects: 0,
    totalTables: 0,
    totalColumns: 0,
    totalModules: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        const [statsRes] = await Promise.all([
          fetch('/api/schema/stats'),
        ])

        if (!statsRes.ok) throw new Error('Failed to fetch stats')

        const statsData = await statsRes.json()

        if (!cancelled) {
          setStats({
            totalProjects: statsData.totalProjects ?? 0,
            totalTables: statsData.totalTables ?? 0,
            totalColumns: statsData.totalColumns ?? 0,
            totalModules: statsData.totalModules ?? 0,
          })
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    if (mounted) {
      fetchData()
    }

    return () => {
      cancelled = true
    }
  }, [mounted])

  const items: StatItem[] = [
    {
      icon: <FolderKanban size={14} />,
      label: 'Projects',
      value: stats.totalProjects,
      color: colors.primary,
      href: '#projects',
    },
    {
      icon: <Table2 size={14} />,
      label: 'Tables',
      value: stats.totalTables,
      color: colors.accent,
      href: '#schema-audit',
    },
    {
      icon: <Columns3 size={14} />,
      label: 'Columns',
      value: stats.totalColumns,
      color: colors.success,
      href: '#data-dictionary',
    },
    {
      icon: <Puzzle size={14} />,
      label: 'Modules',
      value: stats.totalModules,
      color: colors.warning,
      href: '#modules',
    },
  ]

  // ── SSR fallback ──
  if (!mounted) {
    return (
      <div className={`glass-card-elevated p-4 ${className}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className="h-4 w-24 rounded-md" style={{ backgroundColor: alpha(colors.border, 30) }} />
        </div>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-8 w-28 rounded-full skeleton-shine"
              style={{ backgroundColor: alpha(colors.bgTertiary, 20) }}
            />
          ))}
        </div>
      </div>
    )
  }

  function handleClick(href: string) {
    // Dispatch a custom navigation event that the main page can listen to
    const event = new CustomEvent('quick-stats-navigate', { detail: { href } })
    window.dispatchEvent(event)
  }

  return (
    <div className={`glass-card-elevated p-4 content-fade-in ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: colors.text }}>
          Quick Stats
        </h3>
        {loading && (
          <div
            className="h-3 w-3 rounded-full animate-pulse"
            style={{ backgroundColor: alpha(colors.primary, 40) }}
          />
        )}
      </div>

      {/* Stat Chips */}
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={() => handleClick(item.href)}
            className="stat-chip press-effect cursor-pointer group"
            style={{
              borderColor: alpha(item.color, 20),
              backgroundColor: alpha(item.color, 6),
            }}
            aria-label={`${item.label}: ${item.value}`}
          >
            <span
              className="stat-chip-icon"
              style={{ color: item.color }}
            >
              {item.icon}
            </span>
            <span className="stat-chip-value">
              {loading ? '—' : <AnimatedCounter value={item.value} duration={800} />}
            </span>
            <span className="stat-chip-label hidden sm:inline">
              {item.label}
            </span>
            <ArrowRight
              size={12}
              className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
              style={{ color: alpha(colors.textMuted, 60) }}
            />
          </button>
        ))}
      </div>
    </div>
  )
}

export default ProjectQuickStats
