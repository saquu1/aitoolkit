'use client'

import { useCallback } from 'react'
import { Calculator, ChevronDown } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { useAppStore } from '@/lib/store'
import { navGroups } from '@/lib/nav-config'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useState } from 'react'

// ── Sidebar nav item button ──
function SidebarNavItem({
  label,
  icon: Icon,
  active,
  onClick,
  collapsed,
}: {
  label: string
  icon: React.ElementType
  active: boolean
  onClick: () => void
  collapsed?: boolean
}) {
  const button = (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
        'outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900',
        active
          ? 'bg-amber-500/15 text-amber-400 shadow-sm'
          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      )}
    >
      <Icon className={cn('h-4.5 w-4.5 shrink-0', active && 'text-amber-400')} />
      {!collapsed && <span className="truncate">{label}</span>}
      {!collapsed && active && (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-400" />
      )}
    </button>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return button
}

// ── Group section ──
function SidebarGroup({
  label,
  items,
  currentView,
  onSelect,
  collapsed,
}: {
  label: string
  items: typeof navGroups[number]['items']
  currentView: string
  onSelect: (view: typeof items[number]['view']) => void
  collapsed?: boolean
}) {
  const hasActive = items.some((i) => i.view === currentView)
  const [open, setOpen] = useState(hasActive)

  if (collapsed) {
    return (
      <>
        <Separator className="bg-slate-700/50 mx-2" />
        <div className="space-y-0.5 px-2 py-1">
          {items.map((item) => (
            <SidebarNavItem
              key={item.view}
              label={item.label}
              icon={item.icon}
              active={currentView === item.view}
              onClick={() => onSelect(item.view)}
              collapsed
            />
          ))}
        </div>
      </>
    )
  }

  return (
    <>
      <Separator className="bg-slate-700/50 mx-3" />
      <Collapsible open={open} onOpenChange={setOpen} className="px-3 py-1">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center gap-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-300 transition-colors">
            <span className="truncate">{label}</span>
            <ChevronDown
              className={cn(
                'ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-200',
                open && 'rotate-180'
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-0.5 pt-1">
          {items.map((item) => (
            <SidebarNavItem
              key={item.view}
              label={item.label}
              icon={item.icon}
              active={currentView === item.view}
              onClick={() => onSelect(item.view)}
            />
          ))}
        </CollapsibleContent>
      </Collapsible>
    </>
  )
}

// ── Desktop sidebar (fixed) ──
function DesktopSidebar() {
  const { currentView, setCurrentView } = useAppStore()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col fixed top-0 left-0 z-40 h-screen bg-slate-900 border-r border-slate-800 transition-all duration-300',
        collapsed ? 'w-[68px]' : 'w-64'
      )}
    >
      {/* Logo area */}
      <div className="flex h-14 items-center gap-2.5 border-b border-slate-800 px-4">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-amber-500/20 shrink-0">
          <Calculator className="h-4.5 w-4.5 text-amber-400" />
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-white truncate">
              AccuBooks
            </span>
            <span className="text-[10px] text-slate-400 truncate">
              Accounting System
            </span>
          </div>
        )}
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-800 shrink-0"
            onClick={() => setCollapsed(true)}
          >
            <ChevronDown className="h-4 w-4 rotate-90" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-0.5">
          {/* Main group (no separator before first) */}
          {navGroups.map((group, idx) => {
            if (idx === 0) {
              // First group - no separator at top
              return (
                <div key={group.label} className="space-y-0.5 px-3 py-1">
                  {!collapsed && (
                    <p className="flex w-full items-center gap-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      <span className="truncate">{group.label}</span>
                    </p>
                  )}
                  {collapsed && (
                    <Separator className="bg-slate-700/50 mx-2" />
                  )}
                  {group.items.map((item) => (
                    <SidebarNavItem
                      key={item.view}
                      label={item.label}
                      icon={item.icon}
                      active={currentView === item.view}
                      onClick={() => setCurrentView(item.view)}
                      collapsed={collapsed}
                    />
                  ))}
                </div>
              )
            }
            return (
              <SidebarGroup
                key={group.label}
                label={group.label}
                items={group.items}
                currentView={currentView}
                onSelect={setCurrentView}
                collapsed={collapsed}
              />
            )
          })}
        </nav>
      </ScrollArea>

      {/* Expand button when collapsed */}
      {collapsed && (
        <div className="border-t border-slate-800 p-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-full h-8 text-slate-400 hover:text-white hover:bg-slate-800"
                onClick={() => setCollapsed(false)}
              >
                <ChevronDown className="h-4 w-4 -rotate-90" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
        </div>
      )}
    </aside>
  )
}

// ── Mobile sidebar (sheet overlay) ──
function MobileSidebar() {
  const { sidebarOpen, setSidebarOpen, currentView, setCurrentView } =
    useAppStore()

  const handleSelect = useCallback(
    (view: (typeof navGroups)[number]['items'][number]['view']) => {
      setCurrentView(view)
      setSidebarOpen(false)
    },
    [setCurrentView, setSidebarOpen]
  )

  return (
    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <SheetContent
        side="left"
        className="w-72 p-0 bg-slate-900 border-slate-800"
      >
        <SheetHeader className="h-14 flex flex-row items-center gap-2.5 border-b border-slate-800 px-4 py-0 shrink-0">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-amber-500/20 shrink-0">
            <Calculator className="h-4.5 w-4.5 text-amber-400" />
          </div>
          <SheetTitle className="text-sm font-bold text-white">
            AccuBooks
          </SheetTitle>
          <span className="text-[10px] text-slate-400">
            Accounting System
          </span>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <nav className="flex flex-col gap-0.5 py-2">
            {navGroups.map((group, idx) => (
              <div key={group.label}>
                {idx > 0 && (
                  <Separator className="bg-slate-700/50 mx-3" />
                )}
                <div className="px-3 py-1">
                  <p className="flex w-full items-center gap-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    <span className="truncate">{group.label}</span>
                  </p>
                </div>
                <div className="space-y-0.5 px-3">
                  {group.items.map((item) => (
                    <SidebarNavItem
                      key={item.view}
                      label={item.label}
                      icon={item.icon}
                      active={currentView === item.view}
                      onClick={() => handleSelect(item.view)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

// ── Main sidebar export ──
export function Sidebar() {
  const isMobile = useIsMobile()

  return (
    <>
      {isMobile ? <MobileSidebar /> : <DesktopSidebar />}
    </>
  )
}
