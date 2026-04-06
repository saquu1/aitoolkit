'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { navItems, type AppView } from '@/lib/nav-config'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import { Users } from 'lucide-react'

interface AccountResult {
  id: number
  name: string
  atype: string
  isActive: boolean
}

interface RecentView {
  view: AppView
  label: string
  visitedAt: number
}

const RECENT_KEY = 'accubooks-recent-views'
const MAX_RECENT = 5

function getRecentViews(): RecentView[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function addRecentView(view: AppView, label: string) {
  try {
    const current = getRecentViews()
    const filtered = current.filter((r) => r.view !== view)
    const updated = [{ view, label, visitedAt: Date.now() }, ...filtered].slice(0, MAX_RECENT)
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
  } catch {
    // ignore localStorage errors
  }
}

function trackViewVisit(view: AppView) {
  const item = navItems.find((n) => n.view === view)
  if (item) {
    addRecentView(view, item.label)
  }
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [accounts, setAccounts] = useState<AccountResult[]>([])
  const [loading, setLoading] = useState(false)
  const { setCurrentView } = useAppStore()
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Track current view in recent on each view change
  const currentView = useAppStore((s) => s.currentView)
  useEffect(() => {
    trackViewVisit(currentView)
  }, [currentView])

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Debounced account search
  const searchAccounts = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim()) {
      setAccounts([])
      setLoading(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/accounts?isActive=true&search=${encodeURIComponent(q)}&limit=20`)
        if (res.ok) {
          const data = await res.json()
          setAccounts(data.success ? data.data?.accounts ?? [] : [])
        }
      } catch {
        setAccounts([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [])

  // Sync search query with account API
  useEffect(() => {
    searchAccounts(query)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, searchAccounts])

  const handleSelectNav = (view: AppView) => {
    setOpen(false)
    setQuery('')
    setAccounts([])
    setCurrentView(view)
  }

  const handleSelectAccount = (accountId: number) => {
    setOpen(false)
    setQuery('')
    setAccounts([])
    // Navigate to ledger with this account
    setCurrentView('ledger')
    // Store the selected account ID for the ledger view to pick up
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('accubooks-ledger-account-id', String(accountId))
    }
  }

  const recentViews = getRecentViews()
  const hasQuery = query.trim().length > 0

  // Filter navigation items based on query
  const filteredNav = hasQuery
    ? navItems.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.group.toLowerCase().includes(query.toLowerCase())
      )
    : navItems

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search navigation, accounts, recent views..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Recent group - only show when no query */}
        {!hasQuery && recentViews.length > 0 && (
          <CommandGroup heading="Recent">
            {recentViews.map((rv) => {
              const navItem = navItems.find((n) => n.view === rv.view)
              if (!navItem) return null
              const Icon = navItem.icon
              return (
                <CommandItem
                  key={`recent-${rv.view}`}
                  value={rv.label}
                  onSelect={() => handleSelectNav(rv.view)}
                >
                  <Icon className="h-4 w-4 text-slate-400" />
                  <span>{rv.label}</span>
                </CommandItem>
              )
            })}
          </CommandGroup>
        )}

        {/* Navigation group */}
        <CommandGroup heading="Navigation">
          {filteredNav.map((item) => {
            const Icon = item.icon
            return (
              <CommandItem
                key={item.view}
                value={item.label}
                onSelect={() => handleSelectNav(item.view)}
              >
                <Icon className="h-4 w-4 text-slate-400" />
                <span>{item.label}</span>
                <span className="ml-auto text-xs text-slate-400">{item.group}</span>
              </CommandItem>
            )
          })}
        </CommandGroup>

        {/* Accounts group - only when there are results */}
        {(hasQuery || accounts.length > 0) && (
          <CommandGroup heading={loading ? 'Searching Accounts...' : 'Accounts'}>
            {accounts.map((account) => (
              <CommandItem
                key={`account-${account.id}`}
                value={`${account.name} ${account.atype}`}
                onSelect={() => handleSelectAccount(account.id)}
              >
                <Users className="h-4 w-4 text-slate-400" />
                <span className="flex-1 truncate">{account.name}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                  {account.atype}
                </Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
