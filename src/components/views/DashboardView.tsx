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
  BarChart3,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  ShoppingCart,
  Banknote,
  Truck,
  AlertTriangle,
  ClipboardCheck,
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

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

interface MonthlyTrendItem {
  month: string
  income: number
  expenses: number
  netProfit: number
}

interface TopAccount {
  accountId: number
  accountName: string
  atype: string
  totalDebit: number
  totalCredit: number
  balance: number
}

interface RecentActivity {
  todayCount: number
  weekCount: number
  monthCount: number
}

interface DashboardData {
  accountsByType: AccountGroup[]
  totalTransactions: number
  todayTransactions: number
  totalIncome: number
  totalExpenses: number
  totalProducts: number
  recentTransactions: RecentTransaction[]
  monthlyTrend: MonthlyTrendItem[]
  topAccounts: TopAccount[]
  recentActivity: RecentActivity
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
  PAYMENT: 'bg-sky-100 text-sky-700 border-sky-200',
  RECEIPT: 'bg-teal-100 text-teal-700 border-teal-200',
  EMPLOYEE: 'bg-purple-100 text-purple-700 border-purple-200',
  GEN_PAY: 'bg-slate-100 text-slate-700 border-slate-200',
  GEN_REC: 'bg-stone-100 text-stone-700 border-stone-200',
  OPEN_BALANCE: 'bg-stone-100 text-stone-700 border-stone-200',
  DUE: 'bg-orange-100 text-orange-700 border-orange-200',
  INSTALLMENT: 'bg-orange-100 text-orange-700 border-orange-200',
  COLLECTION: 'bg-teal-100 text-teal-700 border-teal-200',
}

const accountTypeColorMap: Record<string, string> = {
  BANK: 'bg-sky-100 text-sky-700 border-sky-200',
  ASSET: 'bg-amber-100 text-amber-700 border-amber-200',
  CAPITAL: 'bg-stone-100 text-stone-700 border-stone-200',
  LIABILITY: 'bg-rose-100 text-rose-700 border-rose-200',
  RECEIVABLE: 'bg-orange-100 text-orange-700 border-orange-200',
  PAYABLE: 'bg-rose-100 text-rose-700 border-rose-200',
  INCOME: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  EXPENSE: 'bg-rose-100 text-rose-700 border-rose-200',
  EMPLOYEE: 'bg-stone-100 text-stone-700 border-stone-200',
  CUSTOMER: 'bg-teal-100 text-teal-700 border-teal-200',
  STOCK: 'bg-stone-100 text-stone-700 border-stone-200',
}

// Pie chart colors (no blue/indigo)
const PIE_COLORS = ['#f59e0b', '#10b981', '#f43f5e', '#0ea5e9', '#f97316', '#78716c', '#14b8a6', '#a16207', '#e11d48', '#0284c7', '#ea580c']

// ─── Custom Tooltip for Bar Chart ───────────────────────────────────────────

function PKRTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  )
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
      {/* Row 1: Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
      {/* Row 2: Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 py-0 gap-0">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Skeleton className="h-[250px] w-full rounded-lg" />
          </CardContent>
        </Card>
        <Card className="py-0 gap-0">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Skeleton className="h-[250px] w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
      {/* Row 3: Top Accounts + Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 py-0 gap-0">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-12 w-2 rounded-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <div className="space-y-4">
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
          <Card className="py-0 gap-0">
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-36" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Row 4: Recent Transactions */}
      <Card className="py-0 gap-0">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
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
    </div>
  )
}

// ─── Quick Action Cards ─────────────────────────────────────────────────────

const quickActions: { label: string; icon: React.ElementType; view: AppView }[] = [
  { label: 'Cash Sale', icon: Banknote, view: 'cash-sale' },
  { label: 'Credit Sale', icon: ShoppingCart, view: 'sale-entry' },
  { label: 'Purchase', icon: Truck, view: 'purchase-entry' },
  { label: 'Quotation', icon: FileText, view: 'quote-entry' },
  { label: 'Income', icon: TrendingUp, view: 'income-entry' },
  { label: 'Expense', icon: TrendingDown, view: 'expense-entry' },
]

// ─── Account Distribution Data ──────────────────────────────────────────────

function getAccountDistribution(accountsByType: AccountGroup[]) {
  const sorted = [...accountsByType].sort((a, b) => b._count.id - a._count.id)
  const top6 = sorted.slice(0, 6)
  return top6.map((group, idx) => ({
    name: group.atype.replace(/_/g, ' '),
    value: group._count.id,
    color: PIE_COLORS[idx % PIE_COLORS.length],
  }))
}

// ─── Custom Label for Pie Chart ─────────────────────────────────────────────

const RADIAN = Math.PI / 180
function renderCustomizedLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: { cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number }) {
  if (percent < 0.05) return null
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

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

  // Account distribution for pie chart
  const accountDistribution = data ? getAccountDistribution(data.accountsByType) : []

  // Current month badge label
  const currentMonthLabel = format(new Date(), 'MMM')

  // Max activity level for top accounts (for proportional bar)
  const maxActivity = data
    ? Math.max(...data.topAccounts.map((a) => a.totalDebit + a.totalCredit), 1)
    : 1

  if (loading) return <DashboardSkeleton />

  if (!data) return null

  // Check if there's any chart data
  const hasTrendData = data.monthlyTrend.some((m) => m.income > 0 || m.expenses > 0)
  const hasAccounts = accountDistribution.length > 0

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

      {/* ── Row 1.5: Retail KPI Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Today's Sales */}
        <Card className="py-0 gap-0 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Today&apos;s Sales</p>
                <p className="text-xl font-bold text-emerald-600">{formatCurrency(data.retail.todaySalesAmount)}</p>
                <p className="text-xs text-muted-foreground">{data.retail.todaySalesCount} invoice{data.retail.todaySalesCount !== 1 ? 's' : ''}</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <ShoppingCart className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Sales */}
        <Card className="py-0 gap-0">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Sales</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(data.retail.totalSalesAmount)}</p>
                <p className="text-xs text-muted-foreground">{data.retail.totalSalesCount} total</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                <Banknote className="h-4 w-4 text-sky-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gross Profit */}
        <Card className="py-0 gap-0 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Gross Profit</p>
                <p className={`text-xl font-bold ${data.retail.totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(data.retail.totalProfit)}</p>
                <p className="text-xs text-muted-foreground">{data.retail.totalSalesAmount > 0 ? `${((data.retail.totalProfit / data.retail.totalSalesAmount) * 100).toFixed(1)}% margin` : 'N/A'}</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <TrendingUp className="h-4 w-4 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Outstanding */}
        <Card className="py-0 gap-0 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Receivables</p>
                <p className="text-xl font-bold text-orange-600">{formatCurrency(data.retail.outstandingReceivables)}</p>
                <p className="text-xs text-muted-foreground">{data.retail.outstandingCount} unpaid</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                <ClipboardCheck className="h-4 w-4 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overdue */}
        {data.retail.overdueCount > 0 && (
          <Card className="py-0 gap-0 border-rose-200 bg-rose-50/50">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Overdue</p>
                  <p className="text-xl font-bold text-rose-600">{data.retail.overdueCount}</p>
                  <p className="text-xs text-rose-500">invoices past due</p>
                </div>
                <div className="h-9 w-9 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Row 2: Charts Section ─────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left (2/3): Monthly Income vs Expense Bar Chart */}
        <Card className="lg:col-span-2 py-0 gap-0">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Monthly Trend</CardTitle>
              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                {currentMonthLabel}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {!hasTrendData ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center mb-3">
                  <BarChart3 className="h-6 w-6 text-amber-500" />
                </div>
                <p className="text-sm font-medium text-foreground">No trend data yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Start recording income and expense entries to see trends
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.monthlyTrend} barGap={4} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value: number) => {
                      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
                      if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
                      return String(value)
                    }}
                  />
                  <Tooltip content={<PKRTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  />
                  <Bar
                    dataKey="income"
                    name="Income"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="expenses"
                    name="Expenses"
                    fill="#f43f5e"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Right (1/3): Account Distribution Donut Chart */}
        <Card className="py-0 gap-0">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Account Distribution</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {!hasAccounts ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center mb-3">
                  <BookOpen className="h-6 w-6 text-amber-500" />
                </div>
                <p className="text-sm font-medium text-foreground">No accounts yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create accounts to see distribution
                </p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={accountDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      labelLine={false}
                      label={renderCustomizedLabel}
                    >
                      {accountDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${value} accounts`, '']}
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legend below chart */}
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
                  {accountDistribution.map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-[11px] text-muted-foreground leading-none">
                        {item.name}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Top Accounts Table + Quick Actions ─────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left (2/3): Top Accounts by Activity */}
        <Card className="lg:col-span-2 py-0 gap-0">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Top Accounts by Activity</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => setCurrentView('accounts')}
            >
              View All
            </Button>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {data.topAccounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center mb-3">
                  <Activity className="h-6 w-6 text-amber-500" />
                </div>
                <p className="text-sm font-medium text-foreground">No account activity</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Record transactions to see top accounts
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Account</TableHead>
                      <TableHead className="text-xs text-right">Total Debit</TableHead>
                      <TableHead className="text-xs text-right">Total Credit</TableHead>
                      <TableHead className="text-xs text-right">Balance</TableHead>
                      <TableHead className="text-xs w-20">Activity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topAccounts.map((acct) => {
                      const totalVol = acct.totalDebit + acct.totalCredit
                      const activityPercent = maxActivity > 0 ? (totalVol / maxActivity) * 100 : 0
                      return (
                        <TableRow key={acct.accountId}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-foreground">
                                {acct.accountName}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[9px] px-1 py-0 ${
                                  accountTypeColorMap[acct.atype] ?? 'bg-stone-100 text-stone-700 border-stone-200'
                                }`}
                              >
                                {acct.atype}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-right text-emerald-600 font-medium tabular-nums">
                            {formatCurrency(acct.totalDebit)}
                          </TableCell>
                          <TableCell className="text-xs text-right text-rose-600 font-medium tabular-nums">
                            {formatCurrency(acct.totalCredit)}
                          </TableCell>
                          <TableCell className={`text-xs text-right font-bold tabular-nums ${acct.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatCurrency(Math.abs(acct.balance))}
                            <span className="text-[10px] font-normal ml-0.5">
                              {acct.balance >= 0 ? 'DR' : 'CR'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-amber-400 transition-all"
                                style={{ width: `${Math.max(activityPercent, 4)}%` }}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Right (1/3): Quick Actions + Activity Summary */}
        <div className="space-y-4">
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

          {/* Activity Summary */}
          <Card className="py-0 gap-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                Activity Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-3">
                {/* Today */}
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <CalendarCheck className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Today</p>
                    <p className="text-sm font-semibold text-foreground tabular-nums">
                      {formatNumber(data.recentActivity.todayCount)} transaction{data.recentActivity.todayCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <Separator />
                {/* This Week */}
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                    <CalendarDays className="h-4 w-4 text-sky-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">This Week</p>
                    <p className="text-sm font-semibold text-foreground tabular-nums">
                      {formatNumber(data.recentActivity.weekCount)} transaction{data.recentActivity.weekCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <Separator />
                {/* This Month */}
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <CalendarRange className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">This Month</p>
                    <p className="text-sm font-semibold text-foreground tabular-nums">
                      {formatNumber(data.recentActivity.monthCount)} transaction{data.recentActivity.monthCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
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

      {/* ── Row 4: Recent Transactions (full width) ───────────────────── */}
      <Card className="py-0 gap-0">
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

      {/* ── Row 5: Recent Sales / Invoices ──────────────────────────────── */}
      {data.retail.recentSales.length > 0 && (
        <Card className="py-0 gap-0">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Recent Sales / Invoices</CardTitle>
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">{data.retail.totalSalesCount}</Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setCurrentView('cash-sale-report')}>
                Cash Sales
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setCurrentView('credit-sale-report')}>
                Credit Sales
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ScrollArea className="max-h-72">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Invoice No</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Customer</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.retail.recentSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="text-xs font-mono font-medium">{sale.saleNo}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(parseISO(sale.saleDate), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${sale.transType === 'CASH-SALE' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>
                          {sale.transType === 'CASH-SALE' ? 'Cash' : 'Credit'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-medium">{sale.customerName || sale.accountName || '—'}</TableCell>
                      <TableCell className="text-xs text-right font-semibold tabular-nums text-emerald-600">
                        {formatCurrency(sale.grandTotal)}
                      </TableCell>
                      <TableCell>
                        {sale.isPaid ? (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 border-emerald-200">Paid</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-amber-200">Unpaid</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* ── Row 6: Products Summary ────────────────────────────────────── */}
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
