'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { AutomationDashboard } from '@/components/automation';
import { useRouter } from 'next/navigation';

export default function AutomationPage() {
  const router = useRouter();
  
  const handleNavigate = (tab: string) => {
    const routes: Record<string, string> = {
      'dashboard': '/dashboard',
      'upload': '/schema/upload',
      'modules': '/schema/modules',
      'fk-resolution': '/schema/fk-resolution',
      'intelligence': '/analysis/intelligence',
      'chat-logs': '/analysis/chat-logs',
      'automation': '/automation',
      'pipeline': '/generation/pipeline',
      'settings': '/settings'
    };
    router.push(routes[tab] || '/automation');
  };

  return (
    <DashboardLayout 
      title="Automation Hub" 
      subtitle="Smart checklists, pattern alerts, and prevention rules for self-correction"
    >
      <AutomationDashboard />
    </DashboardLayout>
  );
}
