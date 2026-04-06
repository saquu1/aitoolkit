'use client'

import { useIsMobile } from '@/hooks/use-mobile'
import { useAppStore } from '@/lib/store'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Footer } from './Footer'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const isMobile = useIsMobile()
  const { isLoading } = useAppStore()

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <div className="no-print">
        <Sidebar />
      </div>

      {/* Main content area */}
      <div
        className={cn(
          'flex flex-col min-h-screen transition-all duration-300',
          !isMobile && 'md:ml-64'
        )}
      >
        {/* Header */}
        <Header />

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-[50vh]">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-200 border-t-amber-500" />
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            </div>
          ) : (
            children
          )}
        </main>

        {/* Footer (sticky to bottom) */}
        <Footer />
      </div>
    </div>
  )
}
