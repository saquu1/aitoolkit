'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import type { AppView } from '@/lib/nav-config'
import { format, parseISO } from 'date-fns'
import {
  Users,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Package,
  FileText,
  Wallet,
  Landmark,
  BookOpen,
  Plus,
  Activity,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'

// ─── Types ──────────────────────────────────────────────────────────────────

interface AccountGroup {
  atype: string
  _count: { id: number }
}

interface RecentTransaction {
  id: number
  transDate: string
  account: { id: number; aname: string; atype: string }
  project?: { id: number; pname: string } | null
  debit: number
  credit: number
  transType: string
  comments: string | null
}

interface DashboardData {
  accountsByType: AccountGroup[]
  totalTransactions: number
  todayTransactions: number
  totalIncome: number
  totalExpenses: number
  totalProducts: number
  recentTransactions: RecentTransaction[]
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const currencyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'PKR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

function formatCurrency(amount: number): string {
  return currencyFmt.format(amount)
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n)
}

const typeColorMap: Record<string, string> = {
  INCOME: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  EXPENSE: 'bg-rose-100 text-rose-700 border-rose-200',
  JOURNAL: 'bg-amber-100 text-amber-700 border-amber-200',
  PAYMENT: 'bg-blue-100 text-blue-700 border-blue-200',
  RECEIPT: 'bg-teal-100 text-teal-700 border-teal-200',
  EMPLOYEE: 'bg-purple-100 text-purple-700 border-purple-200',
  GEN_PAY: 'bg-slate-100 text-slate-700 border-slate-200',
  GEN_REC: 'bg-sky-100 text-sky-700 border-sky-200',
  OPEN_BALANCE: 'bg-stone-100 text-stone-700 border-stone-200',
  DUE: 'bg-orange-100 text-orange-700 border-orange-200',
  INSTALLMENT: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  COLLECTION: 'bg-cyan-100 text-cyan-700 border-cyan-200',
}

// ─── Skeleton Loaders ───────────────────────────────────────────────────────

function MetricCardSkeleton() {
  return (
    <Card className="py-0 gap-0">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </CardContent>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 mt-2" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 py-0 gap-0">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="py-0 gap-0">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Quick Action Cards ─────────────────────────────────────────────────────

const quickActions: { label: string; icon: React.ElementType; view: AppView }[] = [
  { label: 'Income Entry', icon: TrendingUp, view: 'income-entry' },
  { label: 'Expense Entry', icon: TrendingDown, view: 'expense-entry' },
  { label: 'Payment', icon: Wallet, view: 'payment-entry' },
  { label: 'Receipt', icon: Landmark, view: 'receipt-entry' },
  { label: 'Journal', icon: FileText, view: 'journal-entry' },
  { label: 'New Account', icon: Plus, view: 'accounts' },
]

// ─── Main Component ─────────────────────────────────────────────────────────

export function DashboardView() {
  const { setCurrentView } = useAppStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/dashboard')
      const json = await res.json()
      if (!json.success) {
        toast.error('Failed to load dashboard data')
        return
      }
      setData(json.data)
    } catch {
      toast.error('Network error while loading dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  // Compute total accounts from grouped data
  const totalAccounts = data
    ? data.accountsByType.reduce((sum, g) => sum + g._count.id, 0)
    : 0

  if (loading) return <DashboardSkeleton />

  if (!data) return null

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Dashboard
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back! Here&apos;s your accounting overview.
        </p>
      </div>

      {/* ── Row 1: Key Metric Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Accounts */}
        <Card className="py-0 gap-0">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Total Accounts
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {formatNumber(totalAccounts)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(totalAccounts)} active
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Transactions */}
        <Card className="py-0 gap-0">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Transactions
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {formatNumber(data.totalTransactions)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {data.todayTransactions} today
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                <ArrowLeftRight className="h-5 w-5 text-sky-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Income */}
        <Card className="py-0 gap-0 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Total Income
                </p>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(data.totalIncome)}
                </p>
                <p className="text-xs text-emerald-600/70">
                  Revenue earned
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Expenses */}
        <Card className="py-0 gap-0 border-rose-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Total Expenses
                </p>
                <p className="text-2xl font-bold text-rose-600">
                  {formatCurrency(data.totalExpenses)}
                </p>
                <p className="text-xs text-rose-600/70">
                  Total spent
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <TrendingDown className="h-5 w-5 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 2: Recent Transactions + Quick Actions ────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Recent Transactions */}
        <Card className="lg:col-span-2 py-0 gap-0">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Recent Transactions</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => setCurrentView('day-book')}
            >
              View All Transactions
            </Button>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {data.recentTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center mb-3">
                  <Activity className="h-6 w-6 text-amber-500" />
                </div>
                <p className="text-sm font-medium text-foreground">No transactions yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Start by recording income or expense entries
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Account</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs text-right">Debit</TableHead>
                      <TableHead className="text-xs text-right">Credit</TableHead>
                      <TableHead className="text-xs">Comments</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(parseISO(tx.transDate), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {tx.account.aname}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${
                              typeColorMap[tx.transType] ?? 'bg-gray-100 text-gray-700 border-gray-200'
                            }`}
                          >
                            {tx.transType.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-right text-emerald-600 font-medium">
                          {tx.debit > 0 ? formatCurrency(tx.debit) : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-right text-rose-600 font-medium">
                          {tx.credit > 0 ? formatCurrency(tx.credit) : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">
                          {tx.comments || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Right: Quick Actions + Account Types */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="py-0 gap-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <button
                      key={action.view}
                      onClick={() => setCurrentView(action.view)}
                      className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card p-3 hover:bg-accent hover:border-amber-200 transition-colors cursor-pointer group"
                    >
                      <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                        <Icon className="h-4 w-4 text-amber-600" />
                      </div>
                      <span className="text-xs font-medium text-foreground text-center leading-tight">
                        {action.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Account Types Summary */}
          <Card className="py-0 gap-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                Account Types
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {data.accountsByType.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No accounts yet
                </p>
              ) : (
                <div className="space-y-2">
                  {data.accountsByType
                    .sort((a, b) => b._count.id - a._count.id)
                    .map((group) => (
                      <div
                        key={group.atype}
                        className="flex items-center justify-between"
                      >
                        <span className="text-xs font-medium text-foreground">
                          {group.atype.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {group._count.id} account{group._count.id !== 1 ? 's' : ''}
                        </span>
                      </div>
                    ))}
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Total
                    </span>
                    <span className="text-xs font-semibold text-foreground tabular-nums">
                      {formatNumber(totalAccounts)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Row 3: Products Summary ────────────────────────────────────── */}
      {data.totalProducts > 0 && (
        <Card className="py-0 gap-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-stone-100 flex items-center justify-center">
                  <Package className="h-5 w-5 text-stone-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {formatNumber(data.totalProducts)} Product{data.totalProducts !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Active products in inventory
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => setCurrentView('products')}
              >
                View Products
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
