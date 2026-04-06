'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import {
  ArrowUpRight,
  ArrowUp,
  CheckCircle2,
  AlertTriangle,
  CalendarDays,
  RotateCcw,
  Filter,
  ChevronDown,
  ChevronRight,
  Loader2,
  FileDown,
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
import { exportToPDF, pdfFormatPKR, pdfFormatDate } from '@/lib/pdf-export'

// ─── Types ──────────────────────────────────────────────────────────────────

interface VendorRow {
  accountId: number
  accountName: string
  atype: string
  totalCredit: number
  totalDebit: number
  outstanding: number
  lastTransactionDate: string | null
  transactionCount: number
}

interface PayablesSummary {
  totalPayable: number
  totalPaid: number
  totalOutstanding: number
  vendorCount: number
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

interface VendorAccount {
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
  PAYABLE: 'bg-red-100 text-red-700 border-red-200',
  LIABILITY: 'bg-rose-100 text-rose-700 border-rose-200',
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
  GEN_PAY: 'bg-rose-100 text-rose-700',
  GEN_REC: 'bg-emerald-100 text-emerald-700',
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function PayablesSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-52 mt-1" />
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

export function ProjectPayablesView() {
  // ── Data State ──
  const [vendors, setVendors] = useState<VendorRow[]>([])
  const [summary, setSummary] = useState<PayablesSummary | null>(null)
  const [vendorAccounts, setVendorAccounts] = useState<VendorAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [exporting, setExporting] = useState(false)

  // ── Filter State ──
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [vendorFilter, setVendorFilter] = useState('')

  // ── Expand State ──
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({})
  const [recentTransactions, setRecentTransactions] = useState<Record<number, RecentTransaction[]>>({})
  const [loadingRows, setLoadingRows] = useState<Record<number, boolean>>({})

  // ── Fetch Vendor Accounts for dropdown ──
  const fetchVendorAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/accounts?isActive=true&limit=200')
      const json = await res.json()
      if (json.success) {
        const filtered = (json.data || []).filter(
          (a: VendorAccount) => a.atype === 'PAYABLE' || a.atype === 'LIABILITY'
        )
        setVendorAccounts(filtered)
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
      if (vendorFilter) params.set('vendorId', vendorFilter)

      const res = await fetch(`/api/reports/project-payables?${params.toString()}`)
      const json = await res.json()
      if (!json.success) {
        toast.error('Failed to load payables report')
        return
      }
      setVendors(json.data.vendors || [])
      setSummary(json.data.summary || null)
    } catch {
      toast.error('Network error while loading payables report')
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate, vendorFilter])

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
    setVendorFilter('')
  }

  // ── Handle Export PDF ──
  const handleExportPDF = async () => {
    if (vendors.length === 0 || !summary) return
    setExporting(true)
    try {
      await exportToPDF({
        title: 'Project Payables',
        columns: [
          { header: 'Vendor', key: 'vendor', width: 3 },
          { header: 'Type', key: 'type', width: 1 },
          { header: 'Total Purchases (PKR)', key: 'purchases', width: 2, align: 'right' },
          { header: 'Total Paid (PKR)', key: 'paid', width: 2, align: 'right' },
          { header: 'Outstanding (PKR)', key: 'outstanding', width: 2, align: 'right' },
          { header: 'Transactions', key: 'count', width: 1, align: 'center' },
        ],
        rows: vendors.map(v => [
          v.accountName,
          v.atype,
          pdfFormatPKR(v.totalCredit),
          pdfFormatPKR(v.totalDebit),
          pdfFormatPKR(v.outstanding),
          String(v.transactionCount),
        ]),
        summaryRows: [
          ['TOTAL', '', pdfFormatPKR(summary.totalPayable), pdfFormatPKR(summary.totalPaid), pdfFormatPKR(summary.totalOutstanding), String(summary.vendorCount)],
        ],
      })
      toast.success('PDF exported successfully')
    } catch { toast.error('Failed to export PDF') }
    finally { setExporting(false) }
  }

  // ── Toggle Row Expand ──
  const toggleRow = async (accountId: number) => {
    const isExpanded = expandedRows[accountId] === true

    if (isExpanded) {
      setExpandedRows((prev) => ({ ...prev, [accountId]: false }))
      return
    }

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
    fetchVendorAccounts()
  }, [fetchVendorAccounts])

  useEffect(() => {
    fetchReport()
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading && !generating) return <PayablesSkeleton />

  return (
    <div className="space-y-4">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <ArrowUpRight className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Project Payables
            </h2>
            <p className="text-sm text-muted-foreground">
              Amounts owed to vendors and suppliers
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
                Vendor
              </Label>
              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger className="h-9 w-52">
                  <Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="All Vendors" />
                </SelectTrigger>
                <SelectContent>
                  {vendorAccounts.map((acc) => (
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
            <Button
              onClick={handleExportPDF}
              variant="outline"
              size="sm"
              disabled={exporting || vendors.length === 0}
              className="h-9 gap-1.5"
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

      {/* ── Summary Cards ── */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Payable */}
          <Card className="py-0 gap-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Total Payable
                  </p>
                  <p className="text-xl font-bold text-rose-600 tabular-nums mt-1">
                    {formatCurrency(summary.totalPayable)}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-rose-50 flex items-center justify-center">
                  <ArrowUp className="h-5 w-5 text-rose-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Paid */}
          <Card className="py-0 gap-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Total Paid
                  </p>
                  <p className="text-xl font-bold text-sky-600 tabular-nums mt-1">
                    {formatCurrency(summary.totalPaid)}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-sky-50 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-sky-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Outstanding Balance */}
          <Card className="py-0 gap-0 border-rose-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Outstanding Balance
                  </p>
                  <p className="text-xl font-bold text-rose-600 tabular-nums mt-1">
                    {formatCurrency(summary.totalOutstanding)}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {summary.vendorCount} vendor{summary.vendorCount !== 1 ? 's' : ''} total
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-rose-50 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-rose-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Vendor Table ── */}
      <Card className="py-0 gap-0">
        <CardContent className="p-0">
          {vendors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-14 w-14 rounded-full bg-amber-50 flex items-center justify-center mb-4">
                <ArrowUpRight className="h-7 w-7 text-amber-400" />
              </div>
              <p className="text-sm font-medium text-foreground">
                No payable accounts found
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Create PAYABLE or LIABILITY type accounts and record transactions to see payables data.
              </p>
            </div>
          ) : (
            <div className="max-h-[calc(100vh-320px)] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-8 text-xs font-semibold" />
                    <TableHead className="text-xs font-semibold">Vendor Name</TableHead>
                    <TableHead className="text-xs font-semibold">Type</TableHead>
                    <TableHead className="text-xs font-semibold text-right hidden sm:table-cell">
                      Total Purchases
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right hidden sm:table-cell">
                      Total Paid
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
                  {vendors.map((vendor) => {
                    const isExpanded = expandedRows[vendor.accountId] === true
                    const isSettled = vendor.outstanding <= 0

                    return (
                      <Collapsible
                        key={vendor.accountId}
                        open={isExpanded}
                        onOpenChange={(open) => {
                          if (open) toggleRow(vendor.accountId)
                          else setExpandedRows((prev) => ({ ...prev, [vendor.accountId]: false }))
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

                          {/* Vendor Name */}
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {!isSettled && (
                                <span className="inline-block h-2 w-2 rounded-full bg-rose-400 shrink-0" />
                              )}
                              <span className="text-sm font-semibold text-foreground">
                                {vendor.accountName}
                              </span>
                            </div>
                          </TableCell>

                          {/* Type Badge */}
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 font-medium whitespace-nowrap ${
                                TYPE_BADGE_COLORS[vendor.atype] || 'bg-gray-100 text-gray-700 border-gray-200'
                              }`}
                            >
                              {vendor.atype}
                            </Badge>
                          </TableCell>

                          {/* Total Purchases/Billed */}
                          <TableCell className="text-right hidden sm:table-cell">
                            <span className="text-sm text-rose-600 font-medium tabular-nums">
                              {formatCurrency(vendor.totalCredit)}
                            </span>
                          </TableCell>

                          {/* Total Paid */}
                          <TableCell className="text-right hidden sm:table-cell">
                            <span className="text-sm text-sky-600 font-medium tabular-nums">
                              {formatCurrency(vendor.totalDebit)}
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
                              <span className="text-sm font-bold text-rose-600 tabular-nums">
                                {formatCurrency(vendor.outstanding)}
                              </span>
                            )}
                          </TableCell>

                          {/* Last Transaction */}
                          <TableCell className="hidden md:table-cell">
                            <span className="text-xs text-muted-foreground">
                              {vendor.lastTransactionDate
                                ? format(parseISO(vendor.lastTransactionDate), 'dd MMM yyyy')
                                : '—'}
                            </span>
                          </TableCell>

                          {/* Transaction Count */}
                          <TableCell className="text-right hidden lg:table-cell">
                            <Badge variant="secondary" className="text-[10px] font-medium tabular-nums">
                              {vendor.transactionCount}
                            </Badge>
                          </TableCell>
                        </TableRow>

                        {/* ── Expanded Transactions ── */}
                        <CollapsibleContent asChild>
                          <TableRow className="bg-muted/20 hover:bg-muted/20">
                            <TableCell colSpan={8} className="px-8 py-3">
                              {loadingRows[vendor.accountId] ? (
                                <div className="flex items-center gap-2 py-4 justify-center">
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">Loading transactions...</span>
                                </div>
                              ) : recentTransactions[vendor.accountId] &&
                                recentTransactions[vendor.accountId].length > 0 ? (
                                <div className="rounded-md border bg-background">
                                  <div className="px-3 py-2 border-b bg-muted/30">
                                    <span className="text-xs font-semibold text-muted-foreground">
                                      Recent Transactions
                                    </span>
                                  </div>
                                  <div className="divide-y">
                                    {recentTransactions[vendor.accountId].map((tx) => (
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
                                    No transactions found for this vendor
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
                        <span className="text-rose-600 tabular-nums">
                          {formatCurrency(summary.totalOutstanding)}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        Vendors:{' '}
                        <span className="font-semibold text-foreground tabular-nums">
                          {summary.vendorCount}
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
