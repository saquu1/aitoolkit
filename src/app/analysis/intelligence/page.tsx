'use client'

import DashboardLayout from '@/components/layout/DashboardLayout'
import { IntelligenceTab } from '@/components/tabs/IntelligenceTab'
import { useRouter } from 'next/navigation'

// Force dynamic rendering to avoid ThemeProvider issues during build
export const dynamic = 'force-dynamic'

export default function IntelligencePage() {
  const router = useRouter()
  
  const handleNavigate = (tab: string) => {
    const routes: Record<string, string> = {
      'dashboard': '/dashboard',
      'upload': '/schema/upload',
      'modules': '/schema/modules',
      'fk-resolution': '/schema/fk-resolution',
      'intelligence': '/analysis/intelligence',
      'pipeline': '/generation/pipeline',
      'multi-tenant': '/architecture/multi-tenant',
      'settings': '/settings'
    }
    router.push(routes[tab] || '/dashboard')
  }

  return (
    <DashboardLayout title="Intelligence" subtitle="Column intelligence, PII/PHI detection, and business rules">
      <IntelligenceTab onNavigate={handleNavigate} />
    </DashboardLayout>
  )
}
