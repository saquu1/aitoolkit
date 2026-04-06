'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import {
  Truck,
  Search,
  Printer,
  TrendingUp,
  Percent,
  Receipt,
  Wallet,
  Loader2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

interface PurchaseRecord {
  id: number
  transDate: string
  accountId: number
  bankId: number | null
  debit: number
  credit: number
  refNo: string | null
  comments: string | null
  transType: string
  account?: { id: number; aname: string }
  bank?: { id: number; aname: string }
  purchaseEntries?: any[]
}

interface AccountOption {
  id: number
  aname: string
  isActive: boolean
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

function getToday(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

function getFirstOfMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function PurchaseReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Skeleton className="h-12 w-12 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-60" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Card className="py-0 gap-0">
        <CardContent className="p-0">
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function PurchaseReportView() {
  const [fromDate, setFromDate] = useState(getFirstOfMonth())
  const [toDate, setToDate] = useState(getToday())
  const [accountId, setAccountId] = useState<string>('')
  const [search, setSearch] = useState('')
  const [data, setData] = useState<PurchaseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filtering, setFiltering] = useState(false)
  const [supplierOptions, setSupplierOptions] = useState<AccountOption[]>([])

  // Fetch supplier accounts on mount
  useEffect(() => {
    async function fetchSuppliers() {
      try {
        const res = await fetch('/api/accounts?isActive=true&limit=200')
        const json = await res.json()
        if (json.success && json.data?.accounts) {
          setSupplierOptions(json.data.accounts)
        }
      } catch {
        // Silently fail
      }
    }
    fetchSuppliers()
  }, [])

  const fetchReport = useCallback(async (from?: string, to?: string, acctId?: string, searchVal?: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (from) params.set('fromDate', from)
      if (to) params.set('toDate', to)
      if (acctId && acctId !== 'all') params.set('accountId', acctId)
      if (searchVal) params.set('search', searchVal)

      const res = await fetch(`/api/purchases?${params}`)
      const json = await res.json()
      if (!json.success) {
        toast.error('Failed to fetch purchase report')
        return
      }
      setData(json.data?.purchases ?? json.data ?? [])
    } catch {
      toast.error('Network error while fetching report')
    } finally {
      setLoading(false)
      setFiltering(false)
    }
  }, [])

  useEffect(() => {
    fetchReport(fromDate, toDate, accountId, search)
  }, [fetchReport])

  const handleFilter = () => {
    setFiltering(true)
    fetchReport(fromDate, toDate, accountId, search)
  }

  const handlePrint = () => {
    window.print()
  }

  // Calculations
  const totalPurchases = data.length
  const totalCost = data.reduce((sum, p) => sum + (p.credit ?? 0), 0)
  const totalGST = 0 // GST calculated from purchase entries if available
  const netPayable = totalCost

  if (loading && !filtering) {
    return <PurchaseReportSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
          <Truck className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Purchase Report
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Summary of all purchase transactions
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <Card className="py-0 gap-0 no-print">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">From Date</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9 w-36"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">To Date</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-9 w-36"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Supplier</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="h-9 w-44">
                  <SelectValue placeholder="All Suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {supplierOptions.map((acc) => (
                    <SelectItem key={acc.id} value={String(acc.id)}>
                      {acc.aname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Search</Label>
              <Input
                type="text"
                placeholder="Ref No, Comments..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-44"
              />
            </div>
            <Button
              onClick={handleFilter}
              disabled={filtering}
              className="h-9 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {filtering ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Search className="h-4 w-4 mr-1.5" />
              )}
              Filter
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-9 gap-1.5"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Print</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Print header */}
      <div className="print-only hidden text-center space-y-1 mb-4">
        <h3 className="text-lg font-bold">Purchase Report</h3>
        <p className="text-sm text-muted-foreground">
          {fromDate && toDate
            ? `${format(parseISO(fromDate), 'dd MMM yyyy')} — ${format(parseISO(toDate), 'dd MMM yyyy')}`
            : 'All Time'}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="py-0 gap-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Receipt className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Purchases</p>
                <p className="text-xl font-bold text-foreground tabular-nums">{totalPurchases}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="py-0 gap-0 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Cost</p>
                <p className="text-xl font-bold text-blue-600 tabular-nums">{formatCurrency(totalCost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="py-0 gap-0 border-sky-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                <Percent className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total GST</p>
                <p className="text-xl font-bold text-sky-600 tabular-nums">{formatCurrency(totalGST)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="py-0 gap-0 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Wallet className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Net Payable</p>
                <p className="text-xl font-bold text-amber-600 tabular-nums">{formatCurrency(netPayable)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data table */}
      <Card className="py-0 gap-0">
        <CardContent className="p-0">
          {data.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                <Truck className="h-8 w-8 text-blue-400" />
              </div>
              <p className="text-sm font-medium text-foreground">No purchases found</p>
              <p className="text-xs text-muted-foreground mt-1">
                No purchase records match your filter criteria
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                    <TableHead className="text-xs font-semibold text-foreground">Date</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground hidden sm:table-cell">Ref No</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground">Supplier</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground hidden md:table-cell">Bank</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground text-center hidden lg:table-cell">Items</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground text-right">Total Cost</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground text-right hidden md:table-cell">GST</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground text-right">Grand Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((purchase) => (
                    <TableRow key={purchase.id} className="group">
                      <TableCell className="text-xs text-muted-foreground">
                        {purchase.transDate ? format(parseISO(purchase.transDate), 'dd MMM yyyy') : '—'}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-blue-700 hidden sm:table-cell">
                        {purchase.refNo ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground">
                        {purchase.account?.aname ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                        {purchase.bank?.aname ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs text-center hidden lg:table-cell">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                          {purchase.purchaseEntries?.length ?? 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                        {formatCurrency(purchase.credit)}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums text-sky-600 hidden md:table-cell">
                        {formatCurrency(0)}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums font-semibold text-blue-700">
                        {formatCurrency(purchase.credit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Summary footer */}
          {data.length > 0 && (
            <div className="border-t bg-slate-50/80 p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total Purchases</p>
                  <p className="text-sm font-bold text-foreground tabular-nums">{totalPurchases}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total Cost</p>
                  <p className="text-sm font-bold text-blue-600 tabular-nums">{formatCurrency(totalCost)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total GST</p>
                  <p className="text-sm font-bold text-sky-600 tabular-nums">{formatCurrency(totalGST)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Net Payable</p>
                  <p className="text-sm font-bold text-amber-600 tabular-nums">{formatCurrency(netPayable)}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgb(203 213 225 / 0.6); border-radius: 3px; }
      `}</style>
    </div>
  )
}
