'use client'

import { ReactNode, useId } from 'react'

interface TabTransitionProps {
  activeTab: string
  children: ReactNode
}

export function TabTransition({ activeTab, children }: TabTransitionProps) {
  const id = useId()

  return (
    <div
      key={activeTab}
      className="animate-in fade-in slide-in-from-bottom-1 duration-200"
      style={{ willChange: 'opacity, transform' }}
    >
      {children}
    </div>
  )
}
