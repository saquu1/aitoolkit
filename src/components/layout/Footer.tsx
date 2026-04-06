'use client'

import { Calculator } from 'lucide-react'

export function Footer() {
  return (
    <footer className="no-print border-t bg-muted/40 px-4 md:px-6 py-3">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Calculator className="h-3.5 w-3.5 text-amber-500" />
          <span className="font-medium text-foreground">
            Accounting System v1.0
          </span>
        </div>
        <span>Powered by Z.ai Code</span>
      </div>
    </footer>
  )
}
