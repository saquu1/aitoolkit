'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTheme } from '@/hooks/useTheme'
import { Code, Database, Loader2, Eye, ArrowRight } from 'lucide-react'

export default function ProceduresPage() {
  const params = useParams()
  const router = useRouter()
  const { colors } = useTheme()
  const projectId = params.id as string

  const [procedures, setProcedures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProc, setSelectedProc] = useState<any>(null)

  useEffect(() => {
    fetchProcedures()
  }, [projectId])

  const fetchProcedures = async () => {
    try {
      const response = await fetch(`/api/project-status?projectId=${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setProcedures(data.procedures || [])
      }
    } catch (error) {
      console.error('Error fetching procedures:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg }}>
      <div className="sticky top-0 z-10 border-b" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Code className="w-6 h-6" style={{ color: '#8b5cf6' }} />
              <h1 className="text-xl font-bold" style={{ color: colors.text }}>Stored Procedures ({procedures.length})</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
          </div>
        ) : procedures.length === 0 ? (
          <div className="text-center py-12">
            <Code className="w-12 h-12 mx-auto mb-4" style={{ color: colors.textMuted }} />
            <p style={{ color: colors.textMuted }}>No stored procedures parsed yet</p>
            <button
              onClick={() => router.push(`/project/${projectId}/upload`)}
              className="mt-4 px-4 py-2 rounded-lg"
              style={{ backgroundColor: colors.primary, color: '#fff' }}
            >
              Upload SQL Files
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {procedures.map((proc: any) => (
              <div key={proc.id} className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Code className="w-5 h-5" style={{ color: '#8b5cf6' }} />
                    <div>
                      <div className="font-medium" style={{ color: colors.text }}>{proc.procedureName}</div>
                      <div className="text-sm" style={{ color: colors.textMuted }}>
                        {proc.schemaName} • Complexity: {proc.complexity || 0}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm" style={{ color: colors.textMuted }}>
                      {proc.tablesAccessed?.length || 0} tables accessed
                    </span>
                    <button
                      onClick={() => setSelectedProc(proc)}
                      className="p-1.5 rounded hover:opacity-80"
                      style={{ color: colors.primary }}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Procedure Detail Modal */}
      {selectedProc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setSelectedProc(null)}>
          <div className="max-w-4xl w-full max-h-[80vh] rounded-xl overflow-hidden" style={{ backgroundColor: colors.card }} onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: colors.border }}>
              <h3 className="font-semibold" style={{ color: colors.text }}>{selectedProc.procedureName}</h3>
              <button onClick={() => setSelectedProc(null)} className="text-sm" style={{ color: colors.textMuted }}>Close</button>
            </div>
            <div className="p-4 overflow-auto max-h-[60vh]">
              {selectedProc.parameters && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2" style={{ color: colors.text }}>Parameters</h4>
                  <pre className="text-sm p-2 rounded" style={{ backgroundColor: colors.bg, color: colors.textMuted }}>
                    {JSON.stringify(selectedProc.parameters, null, 2)}
                  </pre>
                </div>
              )}
              {selectedProc.tablesAccessed?.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2" style={{ color: colors.text }}>Tables Accessed</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProc.tablesAccessed.map((t: string, i: number) => (
                      <span key={i} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: colors.bg, color: colors.text }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <h4 className="font-medium mb-2" style={{ color: colors.text }}>Body</h4>
              <pre className="text-sm p-2 rounded overflow-auto" style={{ backgroundColor: colors.bg, color: colors.textMuted, maxHeight: '300px' }}>
                {selectedProc.body || 'No body available'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
