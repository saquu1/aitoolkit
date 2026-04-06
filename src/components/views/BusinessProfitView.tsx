'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import {
  FileBarChart,
  Search,
  Printer,
  TrendingUp,
  TrendingDown,
  Percent,
  Tag,
  ArrowUpCircle,
  ArrowDownCircle,
  Loader2,
  CircleDollarSign,
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

function BusinessProfitSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Skeleton className="h-12 w-12 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Skeleton className="h-36 rounded-lg" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <Card className="py-0 gap-0">
        <CardContent className="p-0">
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function BusinessProfitView() {
  const [fromDate, setFromDate] = useState(getFirstOfMonth())
  const [toDate, setToDate] = useState(getToday())
  const [cashSales, setCashSales] = useState<SaleRecord[]>([])
  const [creditSales, setCreditSales] = useState<SaleRecord[]>([])
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filtering, setFiltering] = useState(false)

  const fetchAllData = useCallback(async (from?: string, to?: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (from) params.set('fromDate', from)
      if (to) params.set('toDate', to)

      const [cashRes, creditRes, purchaseRes] = await Promise.all([
        fetch(`/api/sales?transType=CASH-SALE&${params}`),
        fetch(`/api/sales?transType=SALE&${params}`),
        fetch(`/api/purchases?${params}`),
      ])

      const [cashJson, creditJson, purchaseJson] = await Promise.all([
        cashRes.json(),
        creditRes.json(),
        purchaseRes.json(),
      ])

      if (cashJson.success) {
        setCashSales(cashJson.data?.sales ?? cashJson.data ?? [])
      } else {
        toast.error('Failed to fetch cash sales')
      }

      if (creditJson.success) {
        setCreditSales(creditJson.data?.sales ?? creditJson.data ?? [])
      } else {
        toast.error('Failed to fetch credit sales')
      }

      if (purchaseJson.success) {
        setPurchases(purchaseJson.data?.purchases ?? purchaseJson.data ?? [])
      } else {
        toast.error('Failed to fetch purchases')
      }
    } catch {
      toast.error('Network error while fetching business data')
    } finally {
      setLoading(false)
      setFiltering(false)
    }
  }, [])

  useEffect(() => {
    fetchAllData(fromDate, toDate)
  }, [fetchAllData])

  const handleFilter = () => {
    setFiltering(true)
    fetchAllData(fromDate, toDate)
  }

  const handlePrint = () => {
    window.print()
  }

  // Calculations
  const cashSaleTotal = cashSales.reduce((sum, s) => sum + (s.grandTotal ?? 0), 0)
  const creditSaleTotal = creditSales.reduce((sum, s) => sum + (s.grandTotal ?? 0), 0)
  const totalSalesRevenue = cashSaleTotal + creditSaleTotal

  const purchaseTotal = purchases.reduce((sum, p) => sum + (p.credit ?? 0), 0)

  const totalDiscounts = cashSales.reduce((sum, s) => sum + (s.discountAllow ?? 0), 0)
    + creditSales.reduce((sum, s) => sum + (s.discountAllow ?? 0), 0)

  const totalGST = cashSales.reduce((sum, s) => sum + (s.gstAmount ?? 0), 0)
    + creditSales.reduce((sum, s) => sum + (s.gstAmount ?? 0), 0)

  const grossProfit = totalSalesRevenue - purchaseTotal
  const profitMargin = totalSalesRevenue > 0 ? (grossProfit / totalSalesRevenue) * 100 : 0

  const totalCashCost = cashSales.reduce((sum, s) => sum + (s.totalCost ?? 0), 0)
  const totalCreditCost = creditSales.reduce((sum, s) => sum + (s.totalCost ?? 0), 0)

  if (loading && !filtering) {
    return <BusinessProfitSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
          <FileBarChart className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Business Profit Report
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Comprehensive profitability analysis across all transactions
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
            <Button
              onClick={handleFilter}
              disabled={filtering}
              className="h-9 bg-purple-600 hover:bg-purple-700 text-white"
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
        <h3 className="text-lg font-bold">Business Profit Report</h3>
        <p className="text-sm text-muted-foreground">
          {fromDate && toDate
            ? `${format(parseISO(fromDate), 'dd MMM yyyy')} — ${format(parseISO(toDate), 'dd MMM yyyy')}`
            : 'All Time'}
        </p>
      </div>

      {/* Prominent profit/loss display */}
      <Card className={`py-0 gap-0 ${grossProfit >= 0 ? 'border-emerald-300' : 'border-rose-300'}`}>
        <CardContent className="p-6">
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {grossProfit >= 0 ? 'Gross Profit' : 'Net Loss'}
            </p>
            <p className={`text-4xl md:text-5xl font-bold tabular-nums ${grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {grossProfit >= 0 ? '+' : ''}{formatCurrency(grossProfit)}
            </p>
            <div className="flex items-center justify-center gap-2">
              {grossProfit >= 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-rose-500" />
              )}
              <span className={`text-sm font-medium tabular-nums ${grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                Profit Margin: {profitMargin.toFixed(1)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary section */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="py-0 gap-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <ArrowUpCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Sales Revenue</p>
                <p className="text-lg font-bold text-emerald-600 tabular-nums">{formatCurrency(totalSalesRevenue)}</p>
                <p className="text-[10px] text-muted-foreground">
                  Cash: {formatCurrency(cashSaleTotal)} + Credit: {formatCurrency(creditSaleTotal)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="py-0 gap-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <ArrowDownCircle className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Cost of Sales</p>
                <p className="text-lg font-bold text-rose-600 tabular-nums">{formatCurrency(purchaseTotal)}</p>
                <p className="text-[10px] text-muted-foreground">
                  {purchases.length} purchase transactions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="py-0 gap-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                <Tag className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Discounts Given</p>
                <p className="text-lg font-bold text-orange-600 tabular-nums">{formatCurrency(totalDiscounts)}</p>
                <p className="text-[10px] text-muted-foreground">
                  Across {cashSales.length + creditSales.length} sales
                </p>
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
                <p className="text-xs font-medium text-muted-foreground">Total GST Collected</p>
                <p className="text-lg font-bold text-sky-600 tabular-nums">{formatCurrency(totalGST)}</p>
                <p className="text-[10px] text-muted-foreground">
                  Sales tax collected from customers
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="py-0 gap-0 border-purple-200 col-span-2 md:col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                <CircleDollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">Revenue Breakdown</p>
                <div className="flex items-center gap-4 mt-1">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-muted-foreground">Cash Sales</span>
                      <span className="font-medium text-emerald-600 tabular-nums">{totalSalesRevenue > 0 ? ((cashSaleTotal / totalSalesRevenue) * 100).toFixed(1) : 0}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${totalSalesRevenue > 0 ? (cashSaleTotal / totalSalesRevenue) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-muted-foreground">Credit Sales</span>
                      <span className="font-medium text-orange-600 tabular-nums">{totalSalesRevenue > 0 ? ((creditSaleTotal / totalSalesRevenue) * 100).toFixed(1) : 0}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full transition-all"
                        style={{ width: `${totalSalesRevenue > 0 ? (creditSaleTotal / totalSalesRevenue) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown table */}
      <Card className="py-0 gap-0">
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="text-xs font-semibold text-foreground">Type</TableHead>
                  <TableHead className="text-xs font-semibold text-foreground text-center">Count</TableHead>
                  <TableHead className="text-xs font-semibold text-foreground text-right">Total Amount</TableHead>
                  <TableHead className="text-xs font-semibold text-foreground text-right">Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Cash Sales */}
                <TableRow className="group">
                  <TableCell className="text-xs font-medium">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px] px-1.5 py-0">
                        Cash Sale
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-center tabular-nums">{cashSales.length}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums font-semibold text-emerald-700">
                    {formatCurrency(cashSaleTotal)}
                  </TableCell>
                  <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                    {formatCurrency(totalCashCost)}
                  </TableCell>
                </TableRow>
                {/* Credit Sales */}
                <TableRow className="group">
                  <TableCell className="text-xs font-medium">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100 text-[10px] px-1.5 py-0">
                        Credit Sale
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-center tabular-nums">{creditSales.length}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums font-semibold text-orange-700">
                    {formatCurrency(creditSaleTotal)}
                  </TableCell>
                  <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                    {formatCurrency(totalCreditCost)}
                  </TableCell>
                </TableRow>
                {/* Purchases */}
                <TableRow className="group">
                  <TableCell className="text-xs font-medium">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[10px] px-1.5 py-0">
                        Purchase
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-center tabular-nums">{purchases.length}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums font-semibold text-blue-700">
                    {formatCurrency(purchaseTotal)}
                  </TableCell>
                  <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                    {formatCurrency(purchaseTotal)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Summary footer */}
          <div className="border-t bg-slate-50/80 p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Sales Revenue</p>
                <p className="text-sm font-bold text-emerald-600 tabular-nums">{formatCurrency(totalSalesRevenue)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Cost of Sales</p>
                <p className="text-sm font-bold text-rose-600 tabular-nums">{formatCurrency(purchaseTotal)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Gross Profit</p>
                <p className={`text-sm font-bold tabular-nums ${grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatCurrency(grossProfit)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Profit Margin</p>
                <p className={`text-sm font-bold tabular-nums ${grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {profitMargin.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
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
