'use client'

import DashboardLayout from '@/components/layout/DashboardLayout'
import { PipelineTab } from '@/components/tabs/PipelineTab'

export default function PipelinePage() {
  return (
    <DashboardLayout title="Pipeline" subtitle="Execute analysis pipeline and manage workflow">
      <PipelineTab />
    </DashboardLayout>
  )
}
