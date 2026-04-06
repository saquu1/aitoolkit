'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import {
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Landmark,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
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

// ─── Types ──────────────────────────────────────────────────────────────────

interface AccountOption {
  id: number
  aname: string
  atype: string
}

interface LedgerTransaction {
  id: number
  transDate: string
  particular: string
  debit: number
  credit: number
  balance: number
  transType: string
  refNo: string | null
  comments: string | null
}

interface LedgerData {
  account: {
    id: number
    aname: string
    atype: string
    openBalance: number
    nature: string
  }
  transactions: LedgerTransaction[]
  summary: {
    totalDebit: number
    totalCredit: number
    closingBalance: number
  }
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ─── Constants ──────────────────────────────────────────────────────────────

const currencyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'PKR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

function formatCurrency(amount: number): string {
  return currencyFmt.format(amount)
}

const typeBadgeColors: Record<string, string> = {
  INCOME: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  EXPENSE: 'bg-rose-100 text-rose-700 border-rose-200',
  PAYMENT: 'bg-orange-100 text-orange-700 border-orange-200',
  RECEIPT: 'bg-sky-100 text-sky-700 border-sky-200',
  JOURNAL: 'bg-amber-100 text-amber-700 border-amber-200',
  FUND_PAYMENT: 'bg-violet-100 text-violet-700 border-violet-200',
  FUND_RECEIPT: 'bg-teal-100 text-teal-700 border-teal-200',
  EMPLOYEE: 'bg-purple-100 text-purple-700 border-purple-200',
}

const accountTypeBadgeColors: Record<string, string> = {
  BANK: 'bg-sky-100 text-sky-700',
  ASSET: 'bg-amber-100 text-amber-700',
  CAPITAL: 'bg-purple-100 text-purple-700',
  LIABILITY: 'bg-rose-100 text-rose-700',
  RECEIVABLE: 'bg-orange-100 text-orange-700',
  PAYABLE: 'bg-red-100 text-red-700',
  INCOME: 'bg-emerald-100 text-emerald-700',
  EXPENSE: 'bg-rose-100 text-rose-700',
  EMPLOYEE: 'bg-indigo-100 text-indigo-700',
  CUSTOMER: 'bg-teal-100 text-teal-700',
  STOCK: 'bg-stone-100 text-stone-700',
}

function getTypeBadgeClass(type: string): string {
  return typeBadgeColors[type] || 'bg-slate-100 text-slate-700 border-slate-200'
}

function getAccountBadgeClass(type: string): string {
  return accountTypeBadgeColors[type] || 'bg-slate-100 text-slate-700'
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function LedgerSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Account Selector */}
      <Card className="py-0 gap-0">
        <CardContent className="p-4">
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="py-0 gap-0">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Skeleton className="h-10 w-full sm:w-40" />
            <Skeleton className="h-10 w-full sm:w-40" />
            <Skeleton className="h-10 w-32" />
          </div>
        </CardContent>
      </Card>

      {/* Account Info Card */}
      <Card className="py-0 gap-0">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="py-0 gap-0">
        <CardContent className="p-0">
          <div className="rounded-lg border">
            <div className="border-b px-4 py-2.5 flex gap-4">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3.5 w-16 ml-auto" />
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3.5 w-14" />
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="border-b last:border-b-0 px-4 py-2.5 flex gap-4 items-center">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3.5 w-16 ml-auto" />
                <Skeleton className="h-3.5 w-16" />
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-3.5 w-14" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="py-0 gap-0">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function LedgerView() {
  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [data, setData] = useState<LedgerData | null>(null)
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [loadingLedger, setLoadingLedger] = useState(false)
  const [page, setPage] = useState(1)
  const limit = 50

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/accounts?isActive=true&limit=500')
      const json = await res.json()
      if (json.success) {
        setAccounts(json.data)
      }
    } catch {
      toast.error('Failed to load accounts')
    } finally {
      setLoadingAccounts(false)
    }
  }, [])

  const fetchLedger = useCallback(async (p: number) => {
    if (!selectedAccountId) return
    setLoadingLedger(true)
    try {
      const params = new URLSearchParams()
      params.set('accountId', selectedAccountId)
      params.set('page', String(p))
      params.set('limit', String(limit))
      if (fromDate) params.set('fromDate', fromDate)
      if (toDate) params.set('toDate', toDate)

      const res = await fetch(`/api/reports/ledger?${params.toString()}`)
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      } else {
        toast.error(json.error || 'Failed to load ledger')
        setData(null)
      }
    } catch {
      toast.error('Network error')
    } finally {
      setLoadingLedger(false)
    }
  }, [selectedAccountId, fromDate, toDate, limit])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  function handleViewLedger() {
    if (!selectedAccountId) {
      toast.error('Please select an account')
      return
    }
    setPage(1)
    fetchLedger(1)
  }

  useEffect(() => {
    if (selectedAccountId) {
      fetchLedger(page)
    }
  }, [page])

  const netChange = data ? data.summary.totalDebit - data.summary.totalCredit : 0
  const selectedAccount = accounts.find(a => String(a.id) === selectedAccountId)

  if (loadingAccounts) return <LedgerSkeleton />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center">
          <BookOpenText className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Ledger</h2>
          <p className="text-xs text-muted-foreground">Account-wise transaction history</p>
        </div>
      </div>

      {/* Account Selector */}
      <Card className="py-0 gap-0">
        <CardContent className="p-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Select Account</Label>
            <Select value={selectedAccountId} onValueChange={(v) => { setSelectedAccountId(v); setData(null); setPage(1) }}>
              <SelectTrigger className="h-12 text-sm">
                <div className="flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Choose an account to view its ledger..." />
                </div>
              </SelectTrigger>
              <SelectContent>
                {accounts
                  .sort((a, b) => a.aname.localeCompare(b.aname))
                  .map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{a.aname}</span>
                        <span className={`text-[10px] font-semibold rounded px-1.5 py-0 ${getAccountBadgeClass(a.atype)}`}>
                          {a.atype}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Date Filters + View Button */}
      <Card className="py-0 gap-0">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="space-y-1.5 w-full sm:w-auto">
              <Label htmlFor="lg-from" className="text-xs">From Date</Label>
              <Input
                id="lg-from"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5 w-full sm:w-auto">
              <Label htmlFor="lg-to" className="text-xs">To Date</Label>
              <Input
                id="lg-to"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-10"
              />
            </div>
            <Button onClick={handleViewLedger} disabled={!selectedAccountId || loadingLedger} className="bg-amber-500 hover:bg-amber-600 text-white shadow-sm h-10">
              {loadingLedger && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              View Ledger
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* No Account Selected */}
      {!data && !loadingLedger && (
        <Card className="py-0 gap-0">
          <CardContent className="p-8 flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center mb-3">
              <BookOpenText className="h-6 w-6 text-amber-400" />
            </div>
            <p className="text-sm font-medium text-foreground">Select an account to view ledger</p>
            <p className="text-xs text-muted-foreground mt-1">
              Choose an account from the dropdown above and click &quot;View Ledger&quot;.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading Ledger */}
      {loadingLedger && <LedgerSkeleton />}

      {/* Ledger Content */}
      {data && !loadingLedger && (
        <>
          {/* Account Info Card */}
          <Card className="py-0 gap-0">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Account</p>
                  <p className="text-sm font-bold text-foreground">{data.account.aname}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Type</p>
                  <Badge className={`text-[10px] font-semibold ${getAccountBadgeClass(data.account.atype)}`}>
                    {data.account.atype}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Opening Balance</p>
                  <p className="text-sm font-bold tabular-nums text-foreground">
                    {formatCurrency(data.account.openBalance)}
                    <span className="text-xs font-medium text-muted-foreground ml-1.5">
                      ({data.account.nature})
                    </span>
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Nature</p>
                  <Badge variant="secondary" className={`text-[10px] font-semibold ${
                    data.account.nature === 'DR'
                      ? 'bg-amber-100 text-amber-700 border-amber-200'
                      : data.account.nature === 'CR'
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {data.account.nature === 'DR' ? 'Debit' : data.account.nature === 'CR' ? 'Credit' : 'Balance'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          {data.transactions.length === 0 ? (
            <Card className="py-0 gap-0">
              <CardContent className="p-8 flex flex-col items-center justify-center text-center">
                <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center mb-3">
                  <BookOpenText className="h-6 w-6 text-amber-400" />
                </div>
                <p className="text-sm font-medium text-foreground">No transactions found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  No transactions for this account in the selected date range.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="py-0 gap-0">
              <CardContent className="p-0">
                <div className="rounded-lg border overflow-hidden">
                  <div className="max-h-[calc(100vh-380px)] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="text-xs font-semibold">Date</TableHead>
                          <TableHead className="text-xs font-semibold">Particular</TableHead>
                          <TableHead className="text-xs font-semibold text-right">Debit</TableHead>
                          <TableHead className="text-xs font-semibold text-right">Credit</TableHead>
                          <TableHead className="text-xs font-semibold text-right">Balance</TableHead>
                          <TableHead className="text-xs font-semibold hidden lg:table-cell">Type</TableHead>
                          <TableHead className="text-xs font-semibold hidden xl:table-cell">Ref</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.transactions.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell>
                              <span className="text-xs tabular-nums">
                                {format(parseISO(t.transDate), 'dd MMM yyyy')}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs font-medium text-foreground">
                                {t.particular}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-xs tabular-nums text-emerald-600 font-medium">
                                {t.debit > 0 ? formatCurrency(t.debit) : '—'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-xs tabular-nums text-rose-600 font-medium">
                                {t.credit > 0 ? formatCurrency(t.credit) : '—'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`text-xs tabular-nums font-bold ${t.balance >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                {formatCurrency(t.balance)}
                              </span>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${getTypeBadgeClass(t.transType)}`}>
                                {t.transType.replace(/_/g, ' ')}
                              </span>
                            </TableCell>
                            <TableCell className="hidden xl:table-cell">
                              <span className="text-[11px] text-muted-foreground font-mono">{t.refNo || '—'}</span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary Footer */}
          <Card className="py-0 gap-0">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Total Debit</p>
                  <p className="text-sm font-bold text-emerald-600 tabular-nums">{formatCurrency(data.summary.totalDebit)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Total Credit</p>
                  <p className="text-sm font-bold text-rose-600 tabular-nums">{formatCurrency(data.summary.totalCredit)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Net Change</p>
                  <p className={`text-sm font-bold tabular-nums ${netChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {netChange >= 0 ? '+' : ''}{formatCurrency(netChange)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Closing Balance</p>
                  <p className={`text-sm font-bold tabular-nums ${data.summary.closingBalance >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {formatCurrency(data.summary.closingBalance)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Page {data.pagination.page} of {data.pagination.totalPages}
                <span className="mx-1.5 text-slate-300">|</span>
                {data.pagination.total.toLocaleString()} transactions
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-8 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                  disabled={page >= data.pagination.totalPages}
                  className="h-8 text-xs"
                >
                  Next<ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
