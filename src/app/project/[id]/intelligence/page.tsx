'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTheme } from '@/hooks/useTheme'
import { Brain, Loader2, Database, Table2, FileText } from 'lucide-react'

export default function IntelligencePage() {
  const params = useParams()
  const router = useRouter()
  const { colors } = useTheme()
  const projectId = params.id as string

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [projectId])

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/project-status?projectId=${projectId}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Error fetching intelligence:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg }}>
      <div className="sticky top-0 z-10 border-b" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            <Brain className="w-6 h-6" style={{ color: '#06b6d4' }} />
            <h1 className="text-xl font-bold" style={{ color: colors.text }}>Intelligence</h1>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-5 h-5" style={{ color: colors.primary }} />
                  <span className="text-sm" style={{ color: colors.textMuted }}>Stored Proc Cache</span>
                </div>
                <div className="text-2xl font-bold" style={{ color: colors.text }}>{data?.counts?.storedProcCache || 0}</div>
              </div>
              <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <div className="flex items-center gap-2 mb-2">
                  <Table2 className="w-5 h-5" style={{ color: '#22c55e' }} />
                  <span className="text-sm" style={{ color: colors.textMuted }}>View Cache</span>
                </div>
                <div className="text-2xl font-bold" style={{ color: colors.text }}>{data?.counts?.viewCache || 0}</div>
              </div>
              <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5" style={{ color: '#f97316' }} />
                  <span className="text-sm" style={{ color: colors.textMuted }}>Discovered Tables</span>
                </div>
                <div className="text-2xl font-bold" style={{ color: colors.text }}>{data?.counts?.discoveredTables || 0}</div>
              </div>
              <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-5 h-5" style={{ color: '#8b5cf6' }} />
                  <span className="text-sm" style={{ color: colors.textMuted }}>Analysis Score</span>
                </div>
                <div className="text-2xl font-bold" style={{ color: colors.text }}>
                  {data?.counts?.tables && data?.counts?.files ? Math.min(100, Math.round((data.counts.tables / Math.max(data.counts.files, 1)) * 100)) : 0}%
                </div>
              </div>
            </div>

            {/* Intelligence Overview */}
            <div className="p-6 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
              <h3 className="font-semibold mb-4" style={{ color: colors.text }}>Intelligence Analysis</h3>
              <p className="text-sm mb-4" style={{ color: colors.textMuted }}>
                This page shows AI-generated intelligence about your database schema, including:
              </p>
              <ul className="space-y-2 text-sm" style={{ color: colors.text }}>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.primary }}></span>
                  Column semantic types and suggestions
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }}></span>
                  Business rules detected from stored procedures
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8b5cf6' }}></span>
                  Module grouping and dependencies
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f97316' }}></span>
                  Screen blueprints for UI generation
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
