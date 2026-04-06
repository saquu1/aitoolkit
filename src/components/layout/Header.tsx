'use client'

import { Menu, LogOut, ChevronRight } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { useAppStore } from '@/lib/store'
import { getViewTitle, getViewGroup } from '@/lib/nav-config'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import { cn } from '@/lib/utils'

export function Header() {
  const isMobile = useIsMobile()
  const { currentView, currentUser, toggleSidebar, setCurrentView, logout } =
    useAppStore()

  const pageTitle = getViewTitle(currentView)
  const pageGroup = getViewGroup(currentView)
  const userInitials = currentUser?.loginName
    ? currentUser.loginName.slice(0, 2).toUpperCase()
    : 'U'

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-white px-4 md:px-6">
      {/* Mobile menu toggle */}
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-slate-600 hover:text-slate-900"
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
                className="text-slate-500 hover:text-slate-700"
              >
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage className="text-slate-700 font-medium">
                {pageTitle}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Mobile: just page title */}
        <h1 className="sm:hidden text-sm font-semibold text-slate-800 truncate">
          {pageTitle}
        </h1>

        {/* Desktop: group label */}
        <span className="hidden sm:block text-[11px] text-slate-400 font-medium -mt-0.5">
          {pageGroup}
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 h-9 px-2 hover:bg-slate-100"
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-amber-100 text-amber-700 text-xs font-semibold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden md:inline text-sm font-medium text-slate-700 max-w-[120px] truncate">
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
              <p className="text-xs text-slate-500">Administrator</p>
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
  )
}
