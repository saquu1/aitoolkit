'use client'

import { useTheme } from '@/hooks/useTheme'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface KeyboardShortcutsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SHORTCUTS = [
  { category: 'General', items: [
    { keys: ['Ctrl', 'K'], description: 'Open Command Palette' },
    { keys: ['?'], description: 'Show Keyboard Shortcuts' },
    { keys: ['Esc'], description: 'Close Dialog / Panel' },
  ]},
  { category: 'Navigation', items: [
    { keys: ['Alt', '1'], description: 'Go to Dashboard' },
    { keys: ['Alt', '2'], description: 'Go to Schema Audit' },
    { keys: ['Alt', '3'], description: 'Go to Projects' },
    { keys: ['Alt', '4'], description: 'Go to File Manager' },
    { keys: ['Alt', '5'], description: 'Go to Universal Upload' },
    { keys: ['Alt', '6–9'], description: 'Navigate pages 6–9' },
    { keys: ['Alt', '0'], description: 'Go to Settings' },
    { keys: ['Alt', '↑'], description: 'Go to Previous Page' },
    { keys: ['Alt', '↓'], description: 'Go to Next Page' },
  ]},
  { category: 'Actions', items: [
    { keys: ['Ctrl', 'R'], description: 'Refresh Data' },
    { keys: ['Ctrl', 'Shift', 'P'], description: 'Run Pipeline Analysis' },
  ]},
]

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  const { colors } = useTheme()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0" style={{ backgroundColor: colors.bgSecondary }}>
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle style={{ color: colors.text }}>Keyboard Shortcuts</DialogTitle>
          <DialogDescription style={{ color: colors.textMuted }}>
            Navigate faster with keyboard shortcuts
          </DialogDescription>
        </DialogHeader>
        
        <div className="max-h-[60vh] overflow-y-auto px-6 pb-6 space-y-6">
          {SHORTCUTS.map((category) => (
            <div key={category.category}>
              <h4 
                className="text-xs font-semibold uppercase tracking-wider mb-3"
                style={{ color: colors.textMuted }}
              >
                {category.category}
              </h4>
              <div className="space-y-1">
                {category.items.map((item, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between py-2 px-2 rounded-lg transition-colors"
                    style={{ 
                      backgroundColor: 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${colors.primary} 8%, transparent)`
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    <span className="text-sm" style={{ color: colors.textSecondary }}>
                      {item.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, keyIdx) => (
                        <span key={keyIdx}>
                          {keyIdx > 0 && <span className="text-xs mx-0.5" style={{ color: colors.textMuted }}>+</span>}
                          <kbd 
                            className="inline-flex items-center justify-center h-6 min-w-[24px] px-1.5 rounded text-[11px] font-mono font-medium border shadow-sm"
                            style={{ 
                              backgroundColor: colors.bgTertiary,
                              borderColor: colors.border,
                              color: colors.textSecondary,
                            }}
                          >
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
