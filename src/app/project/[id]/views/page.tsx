'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTheme } from '@/hooks/useTheme'
import { FileText, Loader2, Eye } from 'lucide-react'

export default function ViewsPage() {
  const params = useParams()
  const router = useRouter()
  const { colors } = useTheme()
  const projectId = params.id as string

  const [views, setViews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedView, setSelectedView] = useState<any>(null)

  useEffect(() => {
    fetchViews()
  }, [projectId])

  const fetchViews = async () => {
    try {
      const response = await fetch(`/api/project-status?projectId=${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setViews(data.cshtmlViews || [])
      }
    } catch (error) {
      console.error('Error fetching views:', error)
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
              <FileText className="w-6 h-6" style={{ color: '#f97316' }} />
              <h1 className="text-xl font-bold" style={{ color: colors.text }}>CSHTML Views ({views.length})</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
          </div>
        ) : views.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto mb-4" style={{ color: colors.textMuted }} />
            <p style={{ color: colors.textMuted }}>No CSHTML views parsed yet</p>
            <button
              onClick={() => router.push(`/project/${projectId}/upload`)}
              className="mt-4 px-4 py-2 rounded-lg"
              style={{ backgroundColor: colors.primary, color: '#fff' }}
            >
              Upload CSHTML Files
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {views.map((view: any) => (
              <div key={view.id} className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5" style={{ color: '#f97316' }} />
                    <div>
                      <div className="font-medium" style={{ color: colors.text }}>{view.viewName}</div>
                      <div className="text-sm" style={{ color: colors.textMuted }}>
                        {view.viewType || 'Unknown type'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedView(view)}
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

      {/* View Detail Modal */}
      {selectedView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setSelectedView(null)}>
          <div className="max-w-4xl w-full max-h-[80vh] rounded-xl overflow-hidden" style={{ backgroundColor: colors.card }} onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: colors.border }}>
              <h3 className="font-semibold" style={{ color: colors.text }}>{selectedView.viewName}</h3>
              <button onClick={() => setSelectedView(null)} className="text-sm" style={{ color: colors.textMuted }}>Close</button>
            </div>
            <div className="p-4 overflow-auto max-h-[60vh]">
              <h4 className="font-medium mb-2" style={{ color: colors.text }}>Content</h4>
              <pre className="text-sm p-2 rounded overflow-auto" style={{ backgroundColor: colors.bg, color: colors.textMuted, maxHeight: '400px' }}>
                {selectedView.body || selectedView.content || 'No content available'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
