'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import {
  ArrowDownLeft,
  ArrowDown,
  ArrowUp,
  AlertTriangle,
  CalendarDays,
  RotateCcw,
  Filter,
  ChevronDown,
  ChevronRight,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

// ─── Types ──────────────────────────────────────────────────────────────────

interface CustomerRow {
  accountId: number
  accountName: string
  atype: string
  totalDebit: number
  totalCredit: number
  outstanding: number
  lastTransactionDate: string | null
  transactionCount: number
  installmentCount: number
  totalInstallment: number
  totalEmiPaid: number
  totalEmiOutstanding: number
}

interface ReceivablesSummary {
  totalReceivable: number
  totalReceived: number
  totalOutstanding: number
  customerCount: number
  overdueCount: number
}

interface RecentTransaction {
  id: number
  transDate: string
  debit: number
  credit: number
  transType: string
  comments: string | null
  refNo: string | null
  account: { id: number; aname: string; atype: string } | null
  bank: { id: number; aname: string } | null
}

interface CustomerAccount {
  id: number
  aname: string
  atype: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

const currencyFmt = new Intl.NumberFormat('en-PK', {
  style: 'currency',
  currency: 'PKR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

function formatCurrency(amount: number): string {
  return currencyFmt.format(amount)
}

const TYPE_BADGE_COLORS: Record<string, string> = {
  RECEIVABLE: 'bg-orange-100 text-orange-700 border-orange-200',
  CUSTOMER: 'bg-teal-100 text-teal-700 border-teal-200',
}

const TRANS_TYPE_COLORS: Record<string, string> = {
  INCOME: 'bg-emerald-100 text-emerald-700',
  EXPENSE: 'bg-rose-100 text-rose-700',
  PAYMENT: 'bg-rose-100 text-rose-700',
  RECEIPT: 'bg-emerald-100 text-emerald-700',
  JOURNAL: 'bg-amber-100 text-amber-700',
  FUND_PAYMENT: 'bg-rose-100 text-rose-700',
  FUND_RECEIPT: 'bg-emerald-100 text-emerald-700',
  INSTALLMENT: 'bg-sky-100 text-sky-700',
  COLLECTION: 'bg-teal-100 text-teal-700',
  OPEN_BALANCE: 'bg-stone-100 text-stone-700',
  DUE: 'bg-orange-100 text-orange-700',
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function ReceivablesSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div>
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-36 mt-1" />
        </div>
      </div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-20" />
      </div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      {/* Table */}
      <div className="rounded-lg border">
        <div className="border-b px-4 py-3 flex gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border-b px-4 py-3 flex gap-4 items-center">
            {Array.from({ length: 6 }).map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ProjectReceivablesView() {
  // ── Data State ──
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [summary, setSummary] = useState<ReceivablesSummary | null>(null)
  const [customerAccounts, setCustomerAccounts] = useState<CustomerAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  // ── Filter State ──
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [customerFilter, setCustomerFilter] = useState('')

  // ── Expand State ──
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({})
  const [recentTransactions, setRecentTransactions] = useState<Record<number, RecentTransaction[]>>({})
  const [loadingRows, setLoadingRows] = useState<Record<number, boolean>>({})

  // ── Fetch Customer Accounts for dropdown ──
  const fetchCustomerAccounts = useCallback(async () => {
    try {
      // Fetch RECEIVABLE + CUSTOMER accounts
      const res = await fetch('/api/accounts?isActive=true&limit=200')
      const json = await res.json()
      if (json.success) {
        const filtered = (json.data || []).filter(
          (a: CustomerAccount) => a.atype === 'RECEIVABLE' || a.atype === 'CUSTOMER'
        )
        setCustomerAccounts(filtered)
      }
    } catch {
      // Silent fail
    }
  }, [])

  // ── Fetch Report Data ──
  const fetchReport = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (fromDate) params.set('fromDate', fromDate)
      if (toDate) params.set('toDate', toDate)
      if (customerFilter) params.set('customerId', customerFilter)

      const res = await fetch(`/api/reports/project-receivables?${params.toString()}`)
      const json = await res.json()
      if (!json.success) {
        toast.error('Failed to load receivables report')
        return
      }
      setCustomers(json.data.customers || [])
      setSummary(json.data.summary || null)
    } catch {
      toast.error('Network error while loading receivables report')
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate, customerFilter])

  // ── Handle Generate ──
  const handleGenerate = async () => {
    setGenerating(true)
    await fetchReport()
    setGenerating(false)
  }

  // ── Handle Reset ──
  const handleReset = () => {
    setFromDate('')
    setToDate('')
    setCustomerFilter('')
  }

  // ── Toggle Row Expand ──
  const toggleRow = async (accountId: number) => {
    const isExpanded = expandedRows[accountId] === true

    if (isExpanded) {
      setExpandedRows((prev) => ({ ...prev, [accountId]: false }))
      return
    }

    // If not already loaded, fetch transactions
    if (!recentTransactions[accountId]) {
      setLoadingRows((prev) => ({ ...prev, [accountId]: true }))
      try {
        const res = await fetch(`/api/transactions?accountId=${accountId}&limit=5`)
        const json = await res.json()
        if (json.success) {
          setRecentTransactions((prev) => ({
            ...prev,
            [accountId]: json.data || [],
          }))
        }
      } catch {
        toast.error('Failed to load transactions')
      } finally {
        setLoadingRows((prev) => ({ ...prev, [accountId]: false }))
      }
    }

    setExpandedRows((prev) => ({ ...prev, [accountId]: true }))
  }

  // ── Initial Load ──
  useEffect(() => {
    fetchCustomerAccounts()
  }, [fetchCustomerAccounts])

  useEffect(() => {
    fetchReport()
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading && !generating) return <ReceivablesSkeleton />

  return (
    <div className="space-y-4">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <ArrowDownLeft className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Project Receivables
            </h2>
            <p className="text-sm text-muted-foreground">
              Amounts owed by customers
            </p>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <Card className="py-0 gap-0">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                From Date
              </Label>
              <div className="relative">
                <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="pl-8 h-9 w-40"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                To Date
              </Label>
              <div className="relative">
                <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="pl-8 h-9 w-40"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Customer
              </Label>
              <Select value={customerFilter} onValueChange={setCustomerFilter}>
                <SelectTrigger className="h-9 w-52">
                  <Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="All Customers" />
                </SelectTrigger>
                <SelectContent>
                  {customerAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={String(acc.id)}>
                      <span className="flex items-center gap-2">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            TYPE_BADGE_COLORS[acc.atype]?.split(' ')[0] || 'bg-gray-300'
                          }`}
                        />
                        {acc.aname}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-amber-500 hover:bg-amber-600 text-white h-9 shadow-sm"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Filter className="h-4 w-4 mr-1.5" />
              )}
              Generate
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              className="h-9"
            >
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Summary Cards ── */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Receivable */}
          <Card className="py-0 gap-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Total Receivable
                  </p>
                  <p className="text-xl font-bold text-emerald-600 tabular-nums mt-1">
                    {formatCurrency(summary.totalReceivable)}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <ArrowDown className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Received */}
          <Card className="py-0 gap-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Total Received
                  </p>
                  <p className="text-xl font-bold text-sky-600 tabular-nums mt-1">
                    {formatCurrency(summary.totalReceived)}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-sky-50 flex items-center justify-center">
                  <ArrowUp className="h-5 w-5 text-sky-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Outstanding Balance */}
          <Card className="py-0 gap-0 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Outstanding Balance
                  </p>
                  <p className="text-xl font-bold text-amber-600 tabular-nums mt-1">
                    {formatCurrency(summary.totalOutstanding)}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {summary.overdueCount} of {summary.customerCount} have outstanding
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Customer Table ── */}
      <Card className="py-0 gap-0">
        <CardContent className="p-0">
          {customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-14 w-14 rounded-full bg-amber-50 flex items-center justify-center mb-4">
                <ArrowDownLeft className="h-7 w-7 text-amber-400" />
              </div>
              <p className="text-sm font-medium text-foreground">
                No receivable accounts found
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Create RECEIVABLE or CUSTOMER type accounts and record transactions to see receivables data.
              </p>
            </div>
          ) : (
            <div className="max-h-[calc(100vh-320px)] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-8 text-xs font-semibold" />
                    <TableHead className="text-xs font-semibold">Customer Name</TableHead>
                    <TableHead className="text-xs font-semibold">Type</TableHead>
                    <TableHead className="text-xs font-semibold text-right hidden sm:table-cell">
                      Total Billed
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right hidden sm:table-cell">
                      Total Received
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Outstanding
                    </TableHead>
                    <TableHead className="text-xs font-semibold hidden md:table-cell">
                      Last Transaction
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right hidden lg:table-cell">
                      Transactions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => {
                    const isExpanded = expandedRows[customer.accountId] === true
                    const isSettled = customer.outstanding <= 0

                    return (
                      <Collapsible
                        key={customer.accountId}
                        open={isExpanded}
                        onOpenChange={(open) => {
                          if (open) toggleRow(customer.accountId)
                          else setExpandedRows((prev) => ({ ...prev, [customer.accountId]: false }))
                        }}
                      >
                        <TableRow className="cursor-pointer hover:bg-muted/30 transition-colors">
                          {/* Expand Toggle */}
                          <TableCell className="w-8 pl-4">
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                {isExpanded ? (
                                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          </TableCell>

                          {/* Customer Name */}
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {!isSettled && (
                                <span className="inline-block h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                              )}
                              <span className="text-sm font-semibold text-foreground">
                                {customer.accountName}
                              </span>
                            </div>
                          </TableCell>

                          {/* Type Badge */}
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 font-medium whitespace-nowrap ${
                                TYPE_BADGE_COLORS[customer.atype] || 'bg-gray-100 text-gray-700 border-gray-200'
                              }`}
                            >
                              {customer.atype}
                            </Badge>
                          </TableCell>

                          {/* Total Billed/Sales */}
                          <TableCell className="text-right hidden sm:table-cell">
                            <span className="text-sm text-emerald-600 font-medium tabular-nums">
                              {formatCurrency(customer.totalDebit)}
                            </span>
                          </TableCell>

                          {/* Total Received */}
                          <TableCell className="text-right hidden sm:table-cell">
                            <span className="text-sm text-sky-600 font-medium tabular-nums">
                              {formatCurrency(customer.totalCredit)}
                            </span>
                          </TableCell>

                          {/* Outstanding */}
                          <TableCell className="text-right">
                            {isSettled ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0 font-medium">
                                  <CheckCircle2 className="h-3 w-3 mr-0.5" />
                                  Settled
                                </Badge>
                              </div>
                            ) : (
                              <span className="text-sm font-bold text-amber-600 tabular-nums">
                                {formatCurrency(customer.outstanding)}
                              </span>
                            )}
                          </TableCell>

                          {/* Last Transaction */}
                          <TableCell className="hidden md:table-cell">
                            <span className="text-xs text-muted-foreground">
                              {customer.lastTransactionDate
                                ? format(parseISO(customer.lastTransactionDate), 'dd MMM yyyy')
                                : '—'}
                            </span>
                          </TableCell>

                          {/* Transaction Count */}
                          <TableCell className="text-right hidden lg:table-cell">
                            <Badge variant="secondary" className="text-[10px] font-medium tabular-nums">
                              {customer.transactionCount}
                            </Badge>
                          </TableCell>
                        </TableRow>

                        {/* ── Expanded Transactions ── */}
                        <CollapsibleContent asChild>
                          <TableRow className="bg-muted/20 hover:bg-muted/20">
                            <TableCell colSpan={8} className="px-8 py-3">
                              {loadingRows[customer.accountId] ? (
                                <div className="flex items-center gap-2 py-4 justify-center">
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">Loading transactions...</span>
                                </div>
                              ) : recentTransactions[customer.accountId] &&
                                recentTransactions[customer.accountId].length > 0 ? (
                                <div className="rounded-md border bg-background">
                                  <div className="px-3 py-2 border-b bg-muted/30">
                                    <span className="text-xs font-semibold text-muted-foreground">
                                      Recent Transactions
                                    </span>
                                  </div>
                                  <div className="divide-y">
                                    {recentTransactions[customer.accountId].map((tx) => (
                                      <div
                                        key={tx.id}
                                        className="flex items-center gap-3 px-3 py-2 text-xs"
                                      >
                                        <span className="text-muted-foreground w-20 shrink-0">
                                          {format(parseISO(tx.transDate), 'dd MMM yyyy')}
                                        </span>
                                        <Badge
                                          className={`text-[9px] px-1 py-0 font-medium shrink-0 ${
                                            TRANS_TYPE_COLORS[tx.transType] || 'bg-gray-100 text-gray-700'
                                          }`}
                                        >
                                          {tx.transType}
                                        </Badge>
                                        {tx.comments && (
                                          <span className="text-foreground truncate flex-1">
                                            {tx.comments}
                                          </span>
                                        )}
                                        {tx.bank && (
                                          <span className="text-muted-foreground shrink-0">
                                            via {tx.bank.aname}
                                          </span>
                                        )}
                                        <span className="text-right ml-auto tabular-nums shrink-0">
                                          {tx.debit > 0 && (
                                            <span className="text-emerald-600 font-medium">
                                              DR {formatCurrency(tx.debit)}
                                            </span>
                                          )}
                                          {tx.credit > 0 && (
                                            <span className="text-sky-600 font-medium">
                                              CR {formatCurrency(tx.credit)}
                                            </span>
                                          )}
                                          {tx.debit === 0 && tx.credit === 0 && (
                                            <span className="text-muted-foreground">—</span>
                                          )}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-4">
                                  <span className="text-xs text-muted-foreground">
                                    No transactions found for this customer
                                  </span>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      </Collapsible>
                    )
                  })}
                </TableBody>
              </Table>

              {/* ── Summary Footer ── */}
              {summary && (
                <>
                  <Separator />
                  <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-muted/20">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold text-foreground">
                        Total Outstanding:{' '}
                        <span className="text-amber-600 tabular-nums">
                          {formatCurrency(summary.totalOutstanding)}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        Customers:{' '}
                        <span className="font-semibold text-foreground tabular-nums">
                          {summary.customerCount}
                        </span>
                      </span>
                      <span className="text-muted-foreground/40">|</span>
                      <span>
                        With Outstanding:{' '}
                        <span className="font-semibold text-amber-600 tabular-nums">
                          {summary.overdueCount}
                        </span>
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Custom Scrollbar Styles ── */}
      <style jsx global>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background-color: rgb(203 213 225 / 0.6);
          border-radius: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background-color: rgb(148 163 184 / 0.8);
        }
      `}</style>
    </div>
  )
}
