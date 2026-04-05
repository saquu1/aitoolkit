'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/hooks/useTheme'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import {
  LayoutDashboard,
  Upload,
  Puzzle,
  GitBranch,
  Settings,
  Brain,
  Database,
  FileCode,
  Shield,
  BarChart3,
  Zap,
  AlertTriangle,
  ArrowRightLeft,
  ClipboardList,
  Sparkles,
  FolderKanban,
  Activity,
  Bug,
  ToggleLeft,
  Layers,
  BookOpen,
  FolderSync,
  MessageSquare,
  FileCheck,
  Wrench,
  ShieldCheck,
  PackageSearch,
  Network,
  FlaskConical,
  SearchCode,
  Sun,
  Moon,
  Palette,
  Keyboard,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react'

interface NavItem {
  id: string
  icon: LucideIcon
  label: string
  group: string
  shortcut?: string
  keywords?: string[]
}

// All navigation items with searchable keywords
const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', group: 'Navigation', shortcut: 'Alt+1', keywords: ['home', 'overview', 'main'] },
  { id: 'schema-audit', icon: SearchCode, label: 'Schema Audit', group: 'Navigation', shortcut: 'Alt+2', keywords: ['audit', 'fix', 'check', 'sql'] },
  { id: 'projects', icon: FolderKanban, label: 'Projects', group: 'Navigation', shortcut: 'Alt+3', keywords: ['project', 'manage', 'multi'] },
  { id: 'file-manager', icon: FolderSync, label: 'File Manager', group: 'Navigation', keywords: ['file', 'files', 'browse', 'new'] },
  { id: 'smart-upload', icon: Sparkles, label: 'Universal Upload', group: 'Navigation', keywords: ['upload', 'ai', 'smart', 'parse'] },
  { id: 'upload', icon: Upload, label: 'Schema Toolkit', group: 'Navigation', keywords: ['toolkit', 'ddl', 'sql', 'schema'] },
  { id: 'data-dictionary', icon: BookOpen, label: 'Data Dictionary', group: 'Navigation', keywords: ['dictionary', 'data', 'live', 'columns'] },
  { id: 'modules', icon: Puzzle, label: 'Module Registry', group: 'Navigation', keywords: ['modules', 'registry', '35', 'his'] },
  { id: 'fk-resolution', icon: AlertTriangle, label: 'FK Resolution', group: 'Navigation', keywords: ['fk', 'foreign', 'key', 'queue'] },
  { id: 'intelligence-bank', icon: Layers, label: 'Intelligence Bank', group: 'Navigation', keywords: ['intelligence', 'bank', 'unified'] },
  { id: 'intelligence', icon: Brain, label: 'Intelligence', group: 'Navigation', keywords: ['intelligence', 'column', 'pii', 'analysis'] },
  { id: 'legacy-migration', icon: ArrowRightLeft, label: 'Legacy Migration', group: 'Navigation', keywords: ['legacy', 'migrate', 'convert'] },
  { id: 'project-intel', icon: ClipboardList, label: 'Project Intelligence', group: 'Navigation', keywords: ['project', 'intel', 'intelligence', 'phase'] },
  { id: 'pipeline', icon: GitBranch, label: 'Pipeline', group: 'Navigation', keywords: ['pipeline', 'run', 'analysis', 'execute'] },
  { id: 'multi-tenant', icon: Shield, label: 'Multi-Tenant', group: 'Navigation', keywords: ['tenant', 'multi', 'company'] },
  { id: 'api-management', icon: Activity, label: 'API Management', group: 'Navigation', keywords: ['api', 'debug', 'management'] },
  { id: 'error-patterns', icon: Bug, label: 'Error Patterns', group: 'Navigation', keywords: ['error', 'pattern', 'analysis'] },
  { id: 'chat-logs', icon: MessageSquare, label: 'Chat Logs', group: 'Navigation', keywords: ['chat', 'log', 'history', 'conversation'] },
  { id: 'smart-fixer', icon: Wrench, label: 'Smart Fixer', group: 'Navigation', keywords: ['fix', 'smart', 'resolve'] },
  { id: 'pre-commit-hook', icon: ShieldCheck, label: 'Pre-commit Hook', group: 'Navigation', keywords: ['precommit', 'hook', 'git'] },
  { id: 'import-fixer', icon: PackageSearch, label: 'Import Fixer', group: 'Navigation', keywords: ['import', 'fix', 'module'] },
  { id: 'flow-map', icon: Network, label: 'Flow Map', group: 'Navigation', keywords: ['flow', 'map', 'diagram'] },
  { id: 'test-generator', icon: FlaskConical, label: 'Test Generator', group: 'Navigation', keywords: ['test', 'generate', 'unit'] },
  { id: 'contract-validator', icon: FileCheck, label: 'Contract Validator', group: 'Navigation', keywords: ['contract', 'validate', 'api'] },
  { id: 'autoload', icon: ToggleLeft, label: 'Autoload Config', group: 'Navigation', keywords: ['autoload', 'config', 'auto'] },
  { id: 'settings', icon: Settings, label: 'Settings', group: 'Navigation', shortcut: 'Alt+Z', keywords: ['settings', 'config', 'preferences'] },
]

// Theme items for quick switching
const THEME_ITEMS = [
  { id: 'theme-midnight', icon: Moon, label: 'Midnight Purple', group: 'Themes' },
  { id: 'theme-ocean', icon: Palette, label: 'Ocean Blue', group: 'Themes' },
  { id: 'theme-forest', icon: Sun, label: 'Forest Green', group: 'Themes' },
  { id: 'theme-sunset', icon: Sun, label: 'Sunset Orange', group: 'Themes' },
  { id: 'theme-lavender', icon: Palette, label: 'Lavender Dream', group: 'Themes' },
  { id: 'theme-cyberpunk', icon: Zap, label: 'Cyberpunk Neon', group: 'Themes' },
  { id: 'theme-light', icon: Sun, label: 'Light Mode', group: 'Themes' },
]

// Action items
const ACTION_ITEMS = [
  { id: 'action-refresh', icon: Activity, label: 'Refresh Data', group: 'Actions', keywords: ['refresh', 'reload', 'sync'] },
  { id: 'action-pipeline', icon: GitBranch, label: 'Run Full Analysis', group: 'Actions', keywords: ['pipeline', 'run', 'analyze'] },
  { id: 'action-shortcuts', icon: Keyboard, label: 'Show Keyboard Shortcuts', group: 'Actions', keywords: ['keyboard', 'shortcuts', 'help'] },
]

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigate: (tabId: string) => void
  onAction?: (actionId: string) => void
}

export function CommandPalette({ open, onOpenChange, onNavigate, onAction }: CommandPaletteProps) {
  const { colors } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')

  // Use open state directly - CommandDialog component manages its own state
  // searchQuery is only used when dialog is open

  const handleSelect = useCallback((callback: () => void) => {
    callback()
    onOpenChange(false)
  }, [onOpenChange])

  const handleNavSelect = useCallback((tabId: string) => {
    handleSelect(() => onNavigate(tabId))
  }, [handleSelect, onNavigate])

  const handleActionSelect = useCallback((actionId: string) => {
    handleSelect(() => onAction?.(actionId))
  }, [handleSelect, onAction])

  return (
    <CommandDialog 
      open={open} 
      onOpenChange={onOpenChange}
      title="Command Palette"
      description="Search for pages, themes, and actions..."
      className="max-w-lg"
    >
      <CommandInput 
        placeholder="Search pages, themes, actions..."
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList className="max-h-[400px]">
        <CommandEmpty>No results found.</CommandEmpty>
        
        {/* Navigation Pages */}
        <CommandGroup heading="Pages">
          {NAV_ITEMS.map((item) => (
            <CommandItem
              key={item.id}
              value={`${item.label} ${item.keywords?.join(' ') || ''}`}
              onSelect={() => handleNavSelect(item.id)}
            >
              <item.icon className="mr-2 h-4 w-4" style={{ color: colors.primary }} />
              <span>{item.label}</span>
              {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>

        {/* Theme Switcher */}
        <CommandSeparator />
        <CommandGroup heading="Themes">
          {THEME_ITEMS.map((item) => (
            <CommandItem
              key={item.id}
              value={item.label}
              onSelect={() => {
                // Theme switching handled by ColorSchemeSelector - emit action
                handleActionSelect(item.id)
              }}
            >
              <item.icon className="mr-2 h-4 w-4" style={{ color: colors.accent }} />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {/* Actions */}
        <CommandSeparator />
        <CommandGroup heading="Actions">
          {ACTION_ITEMS.map((item) => (
            <CommandItem
              key={item.id}
              value={`${item.label} ${item.keywords?.join(' ') || ''}`}
              onSelect={() => handleActionSelect(item.id)}
            >
              <item.icon className="mr-2 h-4 w-4" style={{ color: colors.success }} />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>

      {/* Footer hint */}
      <div 
        className="flex items-center justify-between px-4 py-2 border-t text-xs"
        style={{ 
          borderColor: colors.border,
          color: colors.textMuted 
        }}
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded text-[10px] border" style={{ borderColor: colors.border }}>↑↓</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded text-[10px] border" style={{ borderColor: colors.border }}>↵</kbd>
            Select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded text-[10px] border" style={{ borderColor: colors.border }}>Esc</kbd>
            Close
          </span>
        </div>
        <span className="flex items-center gap-1">
          <HelpCircle className="w-3 h-3" />
          Type to search
        </span>
      </div>
    </CommandDialog>
  )
}
