'use client'

import { useParams, useRouter } from 'next/navigation'
import { useTheme } from '@/hooks/useTheme'
import { SchemaApplyTab } from '@/components/tabs/SchemaApplyTab'
import { Play, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SchemaApplyPage() {
  const params = useParams()
  const router = useRouter()
  const { colors } = useTheme()
  const projectId = params.id as string

  const handleApplyComplete = () => {
    // Optionally refresh project data or navigate
    router.refresh()
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg }}>
      {/* Header */}
      <div className="sticky top-0 z-10 border-b" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/project/${projectId}`)}
                className="p-2"
                style={{ color: colors.textMuted }}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${colors.success}20` }}
                >
                  <Play className="w-5 h-5" style={{ color: colors.success }} />
                </div>
                <div>
                  <h1 className="text-xl font-bold" style={{ color: colors.text }}>Schema Apply</h1>
                  <p className="text-sm" style={{ color: colors.textMuted }}>
                    Parse and apply database schemas
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        <SchemaApplyTab 
          projectId={projectId}
          onApplyComplete={handleApplyComplete}
        />
      </div>
    </div>
  )
}
