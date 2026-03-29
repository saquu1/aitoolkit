'use client'

import DashboardLayout from '@/components/layout/DashboardLayout'
import { DashboardTab } from '@/components/tabs/DashboardTab'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
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
    <DashboardLayout title="Dashboard" subtitle="Multi-Agent Schema Intelligence Platform">
      <DashboardTab onNavigate={handleNavigate} />
    </DashboardLayout>
  )
}
