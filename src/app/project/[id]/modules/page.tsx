'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTheme } from '@/hooks/useTheme'
import { GitBranch, Loader2, Package, Table2, Code, FileText } from 'lucide-react'

export default function ModulesPage() {
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
      console.error('Error fetching modules:', error)
    } finally {
      setLoading(false)
    }
  }

  // Group tables by module based on naming conventions
  const getModules = () => {
    if (!data?.tables) return []

    const modules: { [key: string]: any[] } = {}
    data.tables.forEach((table: any) => {
      const name = table.tableName
      // Extract module prefix (e.g., "Patient" from "PatientRegistration")
      const prefix = name.split(/(?=[A-Z])/)[0]
      if (!modules[prefix]) modules[prefix] = []
      modules[prefix].push(table)
    })

    return Object.entries(modules).map(([name, tables]) => ({
      name,
      tables,
      tableCount: tables.length,
      procedures: data.procedures?.filter((p: any) =>
        p.procedureName.toLowerCase().includes(name.toLowerCase())
      ) || []
    }))
  }

  const modules = getModules()

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg }}>
      <div className="sticky top-0 z-10 border-b" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            <GitBranch className="w-6 h-6" style={{ color: '#8b5cf6' }} />
            <h1 className="text-xl font-bold" style={{ color: colors.text }}>Modules ({modules.length})</h1>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
          </div>
        ) : modules.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 mx-auto mb-4" style={{ color: colors.textMuted }} />
            <p style={{ color: colors.textMuted }}>No modules detected yet</p>
            <button
              onClick={() => router.push(`/project/${projectId}/upload`)}
              className="mt-4 px-4 py-2 rounded-lg"
              style={{ backgroundColor: colors.primary, color: '#fff' }}
            >
              Upload SQL Files
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((module: any, idx: number) => (
              <div key={idx} className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-5 h-5" style={{ color: colors.primary }} />
                  <h3 className="font-semibold" style={{ color: colors.text }}>{module.name}</h3>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="p-2 rounded" style={{ backgroundColor: colors.bg }}>
                    <Table2 className="w-4 h-4 mx-auto mb-1" style={{ color: '#22c55e' }} />
                    <div style={{ color: colors.text }}>{module.tableCount}</div>
                    <div style={{ color: colors.textMuted }}>Tables</div>
                  </div>
                  <div className="p-2 rounded" style={{ backgroundColor: colors.bg }}>
                    <Code className="w-4 h-4 mx-auto mb-1" style={{ color: '#8b5cf6' }} />
                    <div style={{ color: colors.text }}>{module.procedures.length}</div>
                    <div style={{ color: colors.textMuted }}>Procs</div>
                  </div>
                  <div className="p-2 rounded" style={{ backgroundColor: colors.bg }}>
                    <FileText className="w-4 h-4 mx-auto mb-1" style={{ color: '#f97316' }} />
                    <div style={{ color: colors.text }}>0</div>
                    <div style={{ color: colors.textMuted }}>Views</div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {module.tables.slice(0, 3).map((t: any, i: number) => (
                    <span key={i} className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: colors.bg, color: colors.textMuted }}>
                      {t.tableName}
                    </span>
                  ))}
                  {module.tables.length > 3 && (
                    <span className="px-2 py-0.5 rounded text-xs" style={{ color: colors.textMuted }}>
                      +{module.tables.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
