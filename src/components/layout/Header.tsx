'use client'

import { Menu, LogOut, ChevronRight, Search, Printer } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { useAppStore } from '@/lib/store'
import { getViewTitle, getViewGroup } from '@/lib/nav-config'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { GlobalSearch } from './GlobalSearch'
import { ThemeToggle } from './ThemeToggle'
import { cn } from '@/lib/utils'

const REPORT_VIEWS = [
  'day-book',
  'ledger',
  'trial-balance',
  'income-statement',
  'balance-sheet',
  'payroll-report',
  'stock-report',
  'project-receivables',
  'project-payables',
] as const

export function Header() {
  const isMobile = useIsMobile()
  const { currentView, currentUser, toggleSidebar, setCurrentView, logout } =
    useAppStore()

  const pageTitle = getViewTitle(currentView)
  const pageGroup = getViewGroup(currentView)
  const userInitials = currentUser?.loginName
    ? currentUser.loginName.slice(0, 2).toUpperCase()
    : 'U'
  const isReportView = REPORT_VIEWS.includes(currentView as (typeof REPORT_VIEWS)[number])

  const handlePrint = () => {
    window.print()
  }

  return (
    <>
      <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-2 md:gap-3 border-b bg-background px-4 md:px-6">
        {/* Mobile menu toggle */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={toggleSidebar}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
        )}

        {/* Breadcrumb + Page title */}
        <div className="flex flex-col min-w-0">
          <Breadcrumb className="hidden sm:flex">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    setCurrentView('dashboard')
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Home
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium">
                  {pageTitle}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Mobile: just page title */}
          <h1 className="sm:hidden text-sm font-semibold text-foreground truncate">
            {pageTitle}
          </h1>

          {/* Desktop: group label */}
          <span className="hidden sm:block text-[11px] text-muted-foreground font-medium -mt-0.5">
            {pageGroup}
          </span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'h-8 gap-2 text-muted-foreground',
                isMobile ? 'px-2' : 'px-3'
              )}
              onClick={() => {
                // Trigger the command dialog by simulating Ctrl+K
                const event = new KeyboardEvent('keydown', {
                  key: 'k',
                  metaKey: true,
                  ctrlKey: true,
                })
                document.dispatchEvent(event)
              }}
            >
              <Search className="h-4 w-4" />
              {!isMobile && (
                <>
                  <span className="text-xs">Search...</span>
                  <Badge variant="secondary" className="hidden lg:inline-flex h-5 px-1.5 text-[10px] font-mono">
                    ⌘K
                  </Badge>
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Search (⌘K)</TooltipContent>
        </Tooltip>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Print button - only on report views */}
        {isReportView && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4" />
                <span className="sr-only">Print report</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Print report</TooltipContent>
          </Tooltip>
        )}

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 h-9 px-2 hover:bg-accent"
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-amber-100 text-amber-700 text-xs font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:inline text-sm font-medium text-foreground max-w-[120px] truncate">
                {currentUser?.loginName ?? 'User'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium">
                  {currentUser?.loginName ?? 'User'}
                </p>
                <p className="text-xs text-muted-foreground">Administrator</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setCurrentView('company-settings')}
              className="cursor-pointer"
            >
              Company Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setCurrentView('change-password')}
              className="cursor-pointer"
            >
              Change Password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              variant="destructive"
              className="cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Global Search Command Palette */}
      <GlobalSearch />
    </>
  )
}
