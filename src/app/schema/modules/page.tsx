'use client'

import DashboardLayout from '@/components/layout/DashboardLayout'
import { ModulesTab } from '@/components/tabs/ModulesTab'

export default function ModulesPage() {
  return (
    <DashboardLayout title="Module Registry" subtitle="460+ HIS modules for auto-linking with schema tables">
      <ModulesTab />
    </DashboardLayout>
  )
}
