'use client'

import DashboardLayout from '@/components/layout/DashboardLayout'
import { ChatLogsIntelligenceDashboard } from '@/components/chat-logs'
import { useRouter } from 'next/navigation'

export default function ChatLogsAnalysisPage() {
  const router = useRouter()
  
  const handleNavigate = (tab: string) => {
    const routes: Record<string, string> = {
      'dashboard': '/dashboard',
      'upload': '/schema/upload',
      'modules': '/schema/modules',
      'fk-resolution': '/schema/fk-resolution',
      'intelligence': '/analysis/intelligence',
      'chat-logs': '/analysis/chat-logs',
      'pipeline': '/generation/pipeline',
      'multi-tenant': '/architecture/multi-tenant',
      'settings': '/settings'
    }
    router.push(routes[tab] || '/dashboard')
  }

  return (
    <DashboardLayout 
      title="Chat Logs Intelligence" 
      subtitle="AI development session analytics, token metrics, and performance insights"
    >
      <ChatLogsIntelligenceDashboard />
    </DashboardLayout>
  )
}
