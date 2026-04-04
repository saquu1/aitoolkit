'use client'

import DashboardLayout from '@/components/layout/DashboardLayout'
import { FKResolutionTab } from '@/components/tabs/FKResolutionTab'

export default function FKResolutionPage() {
  return (
    <DashboardLayout title="FK Resolution" subtitle="Resolve missing foreign key references and table dependencies">
      <FKResolutionTab />
    </DashboardLayout>
  )
}
