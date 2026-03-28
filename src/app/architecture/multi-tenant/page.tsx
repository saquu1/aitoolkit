'use client'

import DashboardLayout from '@/components/layout/DashboardLayout'
import { MultiTenantTab } from '@/components/tabs/MultiTenantTab'
import { useRouter } from 'next/navigation'

export default function MultiTenantPage() {
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
    <DashboardLayout title="Multi-Tenant" subtitle="Multi-tenant schema architecture and tenant management">
      <MultiTenantTab onNavigate={handleNavigate} />
    </DashboardLayout>
  )
}
