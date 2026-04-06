'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import {
  Banknote,
  Search,
  Printer,
  TrendingUp,
  Percent,
  Tag,
  Receipt,
  Loader2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// ─── Types ──────────────────────────────────────────────────────────────────

interface SaleRecord {
  id: number
  saleNo: string
  saleDate: string
  accountId: number
  transType: string
  customerName?: string
  contactNo?: string
  grossTotal: number
  discountAllow: number
  gst: number
  gstAmount: number
  grandTotal: number
  totalCost: number
  isPaid: boolean
  saleDetails?: any[]
  account?: { id: number; aname: string }
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

function CashSaleReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Skeleton className="h-12 w-12 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-56" />
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

export function CashSaleReportView() {
  const [fromDate, setFromDate] = useState(getFirstOfMonth())
  const [toDate, setToDate] = useState(getToday())
  const [search, setSearch] = useState('')
  const [data, setData] = useState<SaleRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filtering, setFiltering] = useState(false)

  const fetchReport = useCallback(async (from?: string, to?: string, searchVal?: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('transType', 'CASH-SALE')
      if (from) params.set('fromDate', from)
      if (to) params.set('toDate', to)
      if (searchVal) params.set('search', searchVal)

      const res = await fetch(`/api/sales?${params}`)
      const json = await res.json()
      if (!json.success) {
        toast.error('Failed to fetch cash sale report')
        return
      }
      setData(json.data?.sales ?? json.data ?? [])
    } catch {
      toast.error('Network error while fetching report')
    } finally {
      setLoading(false)
      setFiltering(false)
    }
  }, [])

  useEffect(() => {
    fetchReport(fromDate, toDate, search)
  }, [fetchReport])

  const handleFilter = () => {
    setFiltering(true)
    fetchReport(fromDate, toDate, search)
  }

  const handlePrint = () => {
    window.print()
  }

  // Calculations
  const totalSales = data.length
  const grandTotal = data.reduce((sum, s) => sum + (s.grandTotal ?? 0), 0)
  const totalDiscount = data.reduce((sum, s) => sum + (s.discountAllow ?? 0), 0)
  const totalGST = data.reduce((sum, s) => sum + (s.gstAmount ?? 0), 0)

  if (loading && !filtering) {
    return <CashSaleReportSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
          <Banknote className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Cash Sale Report
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Summary of all cash sales transactions
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
              <Label className="text-xs font-medium text-muted-foreground">Search</Label>
              <Input
                type="text"
                placeholder="Customer, Sale No..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-52"
              />
            </div>
            <Button
              onClick={handleFilter}
              disabled={filtering}
              className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
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
        <h3 className="text-lg font-bold">Cash Sale Report</h3>
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
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <Receipt className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Sales</p>
                <p className="text-xl font-bold text-foreground tabular-nums">{totalSales}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="py-0 gap-0 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Grand Total</p>
                <p className="text-xl font-bold text-emerald-600 tabular-nums">{formatCurrency(grandTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="py-0 gap-0 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                <Tag className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Discount</p>
                <p className="text-xl font-bold text-orange-600 tabular-nums">{formatCurrency(totalDiscount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="py-0 gap-0">
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
      </div>

      {/* Data table */}
      <Card className="py-0 gap-0">
        <CardContent className="p-0">
          {data.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                <Banknote className="h-8 w-8 text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-foreground">No cash sales found</p>
              <p className="text-xs text-muted-foreground mt-1">
                No cash sale records match your filter criteria
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                    <TableHead className="text-xs font-semibold text-foreground">Sale No</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground">Date</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground hidden sm:table-cell">Customer</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground text-right">Gross Total</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground text-right hidden md:table-cell">Discount</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground text-right hidden md:table-cell">GST</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground text-right">Grand Total</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground text-center hidden lg:table-cell">Items</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((sale) => (
                    <TableRow key={sale.id} className="group">
                      <TableCell className="text-xs font-medium font-mono text-emerald-700">
                        {sale.saleNo}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {sale.saleDate ? format(parseISO(sale.saleDate), 'dd MMM yyyy') : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-foreground hidden sm:table-cell">
                        {sale.customerName ?? sale.account?.aname ?? 'Walk-in'}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                        {formatCurrency(sale.grossTotal)}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums text-orange-600 hidden md:table-cell">
                        {formatCurrency(sale.discountAllow)}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums text-sky-600 hidden md:table-cell">
                        {formatCurrency(sale.gstAmount)}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums font-semibold text-emerald-700">
                        {formatCurrency(sale.grandTotal)}
                      </TableCell>
                      <TableCell className="text-xs text-center hidden lg:table-cell">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                          {sale.saleDetails?.length ?? 0}
                        </Badge>
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
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total Sales</p>
                  <p className="text-sm font-bold text-foreground tabular-nums">{totalSales}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Grand Total</p>
                  <p className="text-sm font-bold text-emerald-600 tabular-nums">{formatCurrency(grandTotal)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total Discount</p>
                  <p className="text-sm font-bold text-orange-600 tabular-nums">{formatCurrency(totalDiscount)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total GST</p>
                  <p className="text-sm font-bold text-sky-600 tabular-nums">{formatCurrency(totalGST)}</p>
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
