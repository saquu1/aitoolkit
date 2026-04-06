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
  CommandSeparator,
} from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import { Users, ArrowLeftRight, Package, Loader2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'

// --- Search result types from unified API ---

interface AccountResult {
  id: number
  aname: string
  atype: string
  type: 'account'
}

interface TransactionResult {
  id: number
  transDate: string
  debit: number
  credit: number
  transType: string
  comments: string | null
  account: { id: number; aname: string }
  type: 'transaction'
}

interface ProductResult {
  id: number
  pname: string
  punit: string | null
  salePrice: number
  type: 'product'
}

interface RecentView {
  view: AppView
  label: string
  visitedAt: number
}

interface SearchResults {
  accounts: AccountResult[]
  transactions: TransactionResult[]
  products: ProductResult[]
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

/** Color mapping for transaction type badges */
function getTransTypeColor(type: string): string {
  const colors: Record<string, string> = {
    INCOME: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    EXPENSE: 'bg-rose-100 text-rose-700 border-rose-200',
    PAYMENT: 'bg-orange-100 text-orange-700 border-orange-200',
    RECEIPT: 'bg-sky-100 text-sky-700 border-sky-200',
    JOURNAL: 'bg-amber-100 text-amber-700 border-amber-200',
    FUND_PAYMENT: 'bg-amber-100 text-amber-700 border-amber-200',
    FUND_RECEIPT: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    EMPLOYEE: 'bg-purple-100 text-purple-700 border-purple-200',
  OPEN_BALANCE: 'bg-slate-100 text-slate-700 border-slate-200',
  INSTALLMENT: 'bg-teal-100 text-teal-700 border-teal-200',
  COLLECTION: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  DUE: 'bg-rose-100 text-rose-700 border-rose-200',
    GEN_PAY: 'bg-orange-100 text-orange-700 border-orange-200',
    GEN_REC: 'bg-sky-100 text-sky-700 border-sky-200',
  SALE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  PURCHASE: 'bg-amber-100 text-amber-700 border-amber-200',
  SALARY: 'bg-purple-100 text-purple-700 border-purple-200',
  DAILY_WAGES: 'bg-purple-100 text-purple-700 border-purple-200',
  RETURN: 'bg-slate-100 text-slate-700 border-slate-200',
  DISCOUNT: 'bg-orange-100 text-orange-700 border-orange-200',
  CLOSING: 'bg-slate-100 text-slate-700 border-slate-200',
  ROUNDING: 'bg-slate-100 text-slate-700 border-slate-200',
    }
  return colors[type] || 'bg-slate-100 text-slate-700 border-slate-200'
}

/** Format PKR amount */
function formatPKR(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResults>({ accounts: [], transactions: [], products: [] })
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

  // Debounced unified search via /api/search
  const performSearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim()) {
      setSearchResults({ accounts: [], transactions: [], products: [] })
      setLoading(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`)
        if (res.ok) {
          const data = await res.json()
          if (data.success && data.data) {
            setSearchResults({
              accounts: data.data.accounts ?? [],
              transactions: data.data.transactions ?? [],
              products: data.data.products ?? [],
            })
          } else {
            setSearchResults({ accounts: [], transactions: [], products: [] })
          }
        } else {
          setSearchResults({ accounts: [], transactions: [], products: [] })
        }
      } catch {
        setSearchResults({ accounts: [], transactions: [], products: [] })
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [])

  // Sync search query with unified API
  useEffect(() => {
    performSearch(query)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, performSearch])

  const handleSelectNav = (view: AppView) => {
    setOpen(false)
    setQuery('')
    setSearchResults({ accounts: [], transactions: [], products: [] })
    setCurrentView(view)
  }

  const handleSelectAccount = (accountId: number) => {
    setOpen(false)
    setQuery('')
    setSearchResults({ accounts: [], transactions: [], products: [] })
    // Navigate to ledger with this account
    setCurrentView('ledger')
    // Store the selected account ID for the ledger view to pick up
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('accubooks-ledger-account-id', String(accountId))
    }
  }

  const handleSelectTransaction = (transaction: TransactionResult) => {
    setOpen(false)
    setQuery('')
    setSearchResults({ accounts: [], transactions: [], products: [] })
    // Navigate to day-book view
    setCurrentView('day-book')
    // Store transaction date for the day-book view to filter by
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('accubooks-daybook-date', transaction.transDate)
    }
  }

  const handleSelectProduct = () => {
    setOpen(false)
    setQuery('')
    setSearchResults({ accounts: [], transactions: [], products: [] })
    // Navigate to products view
    setCurrentView('products')
  }

  const recentViews = getRecentViews()
  const hasQuery = query.trim().length > 0
  const { accounts, transactions, products } = searchResults
  const hasApiResults = accounts.length > 0 || transactions.length > 0 || products.length > 0

  // Filter navigation items based on query
  const filteredNav = hasQuery
    ? navItems.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.group.toLowerCase().includes(query.toLowerCase())
      )
    : navItems

  // Total result count for empty state
  const totalResults = filteredNav.length + accounts.length + transactions.length + products.length

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search navigation, accounts, transactions, products..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {hasQuery && !loading && totalResults === 0 && (
          <CommandEmpty>No results found.</CommandEmpty>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="flex items-center justify-center py-6 gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Searching...</span>
          </div>
        )}

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

        {/* Separator before API results when there are nav results */}
        {hasQuery && hasApiResults && filteredNav.length > 0 && (
          <CommandSeparator />
        )}

        {/* Accounts group - from unified API */}
        {hasQuery && accounts.length > 0 && (
          <CommandGroup heading={`Accounts (${accounts.length})`}>
            {accounts.map((account) => (
              <CommandItem
                key={`account-${account.id}`}
                value={`account-${account.aname} ${account.atype}`}
                onSelect={() => handleSelectAccount(account.id)}
              >
                <Users className="h-4 w-4 text-amber-500" />
                <span className="flex-1 truncate">{account.aname}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal border-slate-200 text-slate-500">
                  {account.atype}
                </Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Transactions group - from unified API */}
        {hasQuery && transactions.length > 0 && (
          <CommandGroup heading={`Transactions (${transactions.length})`}>
            {transactions.map((trans) => {
              const amount = trans.debit > 0 ? trans.debit : trans.credit
              return (
                <CommandItem
                  key={`trans-${trans.id}`}
                  value={`trans-${trans.account.aname} ${trans.transType} ${trans.comments || ''}`}
                  onSelect={() => handleSelectTransaction(trans)}
                >
                  <ArrowLeftRight className="h-4 w-4 text-sky-500 shrink-0" />
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm truncate">{trans.account.aname}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 font-normal shrink-0 ${getTransTypeColor(trans.transType)}`}
                      >
                        {trans.transType}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{formatPKR(amount)}</span>
                      <span>·</span>
                      <span>{format(parseISO(trans.transDate), 'dd MMM yyyy')}</span>
                      {trans.comments && (
                        <>
                          <span>·</span>
                          <span className="truncate max-w-[120px]">{trans.comments}</span>
                        </>
                      )}
                    </div>
                  </div>
                </CommandItem>
              )
            })}
          </CommandGroup>
        )}

        {/* Products group - from unified API */}
        {hasQuery && products.length > 0 && (
          <CommandGroup heading={`Products (${products.length})`}>
            {products.map((product) => (
              <CommandItem
                key={`product-${product.id}`}
                value={`product-${product.pname} ${product.punit || ''}`}
                onSelect={() => handleSelectProduct()}
              >
                <Package className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="flex-1 truncate">{product.pname}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {product.punit && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal border-slate-200 text-slate-500">
                      {product.punit}
                    </Badge>
                  )}
                  <span className="text-xs text-slate-500 tabular-nums">{formatPKR(product.salePrice)}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
