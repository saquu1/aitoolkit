'use client'

import DashboardLayout from '@/components/layout/DashboardLayout'
import { SettingsTab } from '@/components/tabs/SettingsTab'

export default function SettingsPage() {
  return (
    <DashboardLayout title="Settings" subtitle="Configure system preferences and options">
      <SettingsTab />
    </DashboardLayout>
  )
}
