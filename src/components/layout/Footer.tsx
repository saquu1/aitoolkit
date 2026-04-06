'use client'

import { Calculator } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t bg-slate-50 px-4 md:px-6 py-3">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-1 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <Calculator className="h-3.5 w-3.5 text-amber-500" />
          <span className="font-medium text-slate-600">
            Accounting System v1.0
          </span>
        </div>
        <span>Powered by Z.ai Code</span>
      </div>
    </footer>
  )
}
