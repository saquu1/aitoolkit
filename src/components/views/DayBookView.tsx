'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import {
  CalendarDays,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronsDown,
  CheckCircle2,
  AlertCircle,
  FileDown,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { exportToPDF, pdfFormatPKR, pdfFormatDate } from '@/lib/pdf-export'

// ─── Types ──────────────────────────────────────────────────────────────────

interface DayTransaction {
  id: number
  transDate: string
  account: { aname: string; atype: string } | null
  bank: { aname: string } | null
  debit: number
  credit: number
  transType: string
  refNo: string | null
  comments: string | null
}

interface DateGroup {
  date: string
  transactions: DayTransaction[]
  totalDebit: number
  totalCredit: number
}

interface DayBookData {
  groups: DateGroup[]
  summary: {
    totalDebit: number
    totalCredit: number
    totalTransactions: number
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

function getTypeBadgeClass(type: string): string {
  return typeBadgeColors[type] || 'bg-slate-100 text-slate-700 border-slate-200'
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function DayBookSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-52" />
      </div>

      {/* Filters */}
      <Card className="py-0 gap-0">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Skeleton className="h-10 w-full sm:w-40" />
            <Skeleton className="h-10 w-full sm:w-40" />
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
          </div>
        </CardContent>
      </Card>

      {/* Date groups */}
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="py-0 gap-0">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <div className="flex gap-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="px-4 pb-3">
              <div className="rounded-lg border">
                <div className="border-b px-4 py-2.5 flex gap-4">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3.5 w-20 hidden md:block" />
                  <Skeleton className="h-3.5 w-16 ml-auto" />
                  <Skeleton className="h-3.5 w-16" />
                  <Skeleton className="h-3.5 w-14" />
                  <Skeleton className="h-3.5 w-14 hidden lg:block" />
                  <Skeleton className="h-3.5 w-20 hidden lg:block" />
                </div>
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="border-b last:border-b-0 px-4 py-2.5 flex gap-4 items-center">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3.5 w-20 hidden md:block" />
                    <Skeleton className="h-3.5 w-16 ml-auto" />
                    <Skeleton className="h-3.5 w-16" />
                    <Skeleton className="h-3.5 w-14" />
                    <Skeleton className="h-3.5 w-14 hidden lg:block" />
                    <Skeleton className="h-3.5 w-20 hidden lg:block" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

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

export function DayBookView() {
  const [data, setData] = useState<DayBookData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const limit = 50
  const searchTimer = useRef<NodeJS.Timeout | null>(null)
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)

  const fetchDayBook = useCallback(async (p: number, s: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(p))
      params.set('limit', String(limit))
      if (fromDate) params.set('fromDate', fromDate)
      if (toDate) params.set('toDate', toDate)
      if (s) params.set('search', s)

      const res = await fetch(`/api/reports/day-book?${params.toString()}`)
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      } else {
        toast.error(json.error || 'Failed to load day book')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate, limit])

  useEffect(() => {
    fetchDayBook(page, search)
  }, [fetchDayBook, page, search])

  // Debounced search
  function handleSearchChange(value: string) {
    setSearchInput(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setSearch(value)
      setPage(1)
    }, 400)
  }

  function handleApply() {
    setPage(1)
    fetchDayBook(1, search)
  }

  function handleReset() {
    setFromDate('')
    setToDate('')
    setSearch('')
    setSearchInput('')
    setPage(1)
  }

  const handleExportPDF = async () => {
    if (!data) return
    setExporting(true)
    try {
      const rows: string[][] = []
      for (const group of data.groups) {
        rows.push([`--- ${pdfFormatDate(group.date + 'T00:00:00')} ---`, '', '', ''])
        for (const t of group.transactions) {
          rows.push([
            pdfFormatDate(t.transDate),
            t.account?.aname || '—',
            t.debit > 0 ? pdfFormatPKR(t.debit) : '',
            t.credit > 0 ? pdfFormatPKR(t.credit) : '',
          ])
        }
      }
      await exportToPDF({
        title: 'Day Book',
        columns: [
          { header: 'Date', key: 'date', width: 1.5 },
          { header: 'Account', key: 'account', width: 3 },
          { header: 'Debit (PKR)', key: 'debit', width: 2, align: 'right' },
          { header: 'Credit (PKR)', key: 'credit', width: 2, align: 'right' },
        ],
        rows,
        summaryRows: [
          ['TOTAL', '', pdfFormatPKR(data.summary.totalDebit), pdfFormatPKR(data.summary.totalCredit)],
        ],
      })
      toast.success('PDF exported successfully')
    } catch { toast.error('Failed to export PDF') }
    finally { setExporting(false) }
  }

  function toggleDate(date: string) {
    setCollapsedDates(prev => {
      const next = new Set(prev)
      if (next.has(date)) {
        next.delete(date)
      } else {
        next.add(date)
      }
      return next
    })
  }

  const difference = data ? data.summary.totalDebit - data.summary.totalCredit : 0
  const isBalanced = data ? Math.abs(difference) < 0.01 : false

  if (loading) return <DayBookSkeleton />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center">
          <CalendarDays className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Day Book</h2>
          <p className="text-xs text-muted-foreground">All transactions grouped by date</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="py-0 gap-0">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="space-y-1.5 w-full sm:w-auto">
              <Label htmlFor="db-from" className="text-xs">From Date</Label>
              <Input
                id="db-from"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5 w-full sm:w-auto">
              <Label htmlFor="db-to" className="text-xs">To Date</Label>
              <Input
                id="db-to"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5 flex-1 w-full">
              <Label htmlFor="db-search" className="text-xs">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="db-search"
                  placeholder="Comments or ref..."
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="h-10 pl-9"
                />
              </div>
            </div>
            <Button onClick={handleApply} size="sm" className="bg-amber-500 hover:bg-amber-600 text-white shadow-sm h-10">
              Apply
            </Button>
            <Button onClick={handleReset} variant="outline" size="sm" className="h-10 text-muted-foreground">
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />Reset
            </Button>
            <Button
              onClick={handleExportPDF}
              variant="outline"
              size="sm"
              disabled={exporting || !data}
              className="h-10 gap-1.5"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              <span className="hidden sm:inline text-xs">Export PDF</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Date Groups */}
      {!data || data.groups.length === 0 ? (
        <Card className="py-0 gap-0">
          <CardContent className="p-8 flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center mb-3">
              <CalendarDays className="h-6 w-6 text-amber-400" />
            </div>
            <p className="text-sm font-medium text-foreground">No transactions found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {fromDate || toDate ? 'Try adjusting the date range or filters.' : 'No transactions have been recorded yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.groups.map((group) => {
            const isCollapsed = collapsedDates.has(group.date)
            const dateFormatted = format(parseISO(group.date + 'T00:00:00'), 'dd MMM yyyy (EEE)')
            return (
              <Card key={group.date} className="py-0 gap-0">
                {/* Date Header - Collapsible */}
                <button
                  onClick={() => toggleDate(group.date)}
                  className="w-full text-left hover:bg-muted/30 transition-colors rounded-t-lg"
                >
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isCollapsed ? (
                          <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronsDown className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm font-semibold text-foreground">{dateFormatted}</span>
                        <Badge variant="secondary" className="text-[10px] font-semibold tabular-nums bg-slate-100 text-slate-600 border-slate-200">
                          {group.transactions.length}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-emerald-600 font-medium tabular-nums">
                          Dr: {formatCurrency(group.totalDebit)}
                        </span>
                        <span className="text-xs text-rose-600 font-medium tabular-nums">
                          Cr: {formatCurrency(group.totalCredit)}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                </button>

                {/* Transactions Table */}
                {!isCollapsed && (
                  <CardContent className="p-0 pb-1">
                    <div className="px-4 pb-3">
                      <div className="rounded-lg border overflow-hidden">
                        <div className="max-h-[calc(100vh-420px)] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="text-xs font-semibold">Account</TableHead>
                                <TableHead className="text-xs font-semibold hidden md:table-cell">Bank</TableHead>
                                <TableHead className="text-xs font-semibold text-right">Debit</TableHead>
                                <TableHead className="text-xs font-semibold text-right">Credit</TableHead>
                                <TableHead className="text-xs font-semibold hidden lg:table-cell">Type</TableHead>
                                <TableHead className="text-xs font-semibold hidden lg:table-cell">Ref</TableHead>
                                <TableHead className="text-xs font-semibold hidden xl:table-cell">Comments</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {group.transactions.map((t) => (
                                <TableRow key={t.id}>
                                  <TableCell>
                                    <div className="flex flex-col">
                                      <span className="text-xs font-medium text-foreground">{t.account?.aname || '—'}</span>
                                      {t.account && (
                                        <span className={`text-[10px] font-medium ${getTypeBadgeClass(t.account.atype)} rounded px-1.5 py-0 w-fit mt-0.5`}>
                                          {t.account.atype}
                                        </span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell">
                                    <span className="text-xs text-muted-foreground">{t.bank?.aname || '—'}</span>
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
                                  <TableCell className="hidden lg:table-cell">
                                    <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${getTypeBadgeClass(t.transType)}`}>
                                      {t.transType.replace(/_/g, ' ')}
                                    </span>
                                  </TableCell>
                                  <TableCell className="hidden lg:table-cell">
                                    <span className="text-[11px] text-muted-foreground font-mono">{t.refNo || '—'}</span>
                                  </TableCell>
                                  <TableCell className="hidden xl:table-cell">
                                    <span className="text-[11px] text-muted-foreground max-w-[180px] truncate block">{t.comments || '—'}</span>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Summary Footer */}
      {data && data.groups.length > 0 && (
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
                <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Transactions</p>
                <p className="text-sm font-bold text-foreground tabular-nums">{data.summary.totalTransactions.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Difference</p>
                <div className="flex items-center gap-1.5">
                  {isBalanced ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-500" />
                  )}
                  <p className={`text-sm font-bold tabular-nums ${isBalanced ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {isBalanced ? 'Balanced' : formatCurrency(difference)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
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
    </div>
  )
}
