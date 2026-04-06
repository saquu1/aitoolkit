'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import {
  Warehouse,
  Search,
  RotateCcw,
  Package,
  AlertTriangle,
  XCircle,
  Loader2,
  FileDown,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { exportToPDF, pdfFormatPKR, pdfFormatDate } from '@/lib/pdf-export'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProductOption {
  id: number
  pname: string
  isActive: boolean
}

interface StockProduct {
  productId: number
  productName: string
  unit: string
  costPrice: number
  salePrice: number
  totalQtyIn: number
  totalQtyOut: number
  currentStock: number
  totalPurchaseValue: number
  totalSaleValue: number
  profitMargin: number
}

interface StockSummary {
  totalProducts: number
  totalPurchaseValue: number
  totalSaleValue: number
  totalProfit: number
}

interface StockData {
  products: StockProduct[]
  summary: StockSummary
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const currencyFmt = new Intl.NumberFormat('en-PK', {
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

function getToday(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

function getFirstOfMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function StockReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Skeleton className="h-12 w-12 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-60" />
        </div>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>

      {/* Filters */}
      <Card className="py-0 gap-0">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <Skeleton className="h-9 w-44" />
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-20" />
          </div>
        </CardContent>
      </Card>

      {/* Report header */}
      <Card className="py-0 gap-0">
        <CardContent className="p-6">
          <div className="text-center space-y-2">
            <Skeleton className="h-6 w-48 mx-auto" />
            <Skeleton className="h-5 w-36 mx-auto" />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="py-0 gap-0">
        <CardContent className="p-0">
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-16" />
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

// ─── Main Component ─────────────────────────────────────────────────────────

export function StockReportView() {
  // Filters
  const [productId, setProductId] = useState<string>('')
  const [fromDate, setFromDate] = useState(getFirstOfMonth())
  const [toDate, setToDate] = useState(getToday())
  const [generating, setGenerating] = useState(false)

  // Data
  const [data, setData] = useState<StockData | null>(null)
  const [loading, setLoading] = useState(false)
  const [productOptions, setProductOptions] = useState<ProductOption[]>([])
  const [hasGenerated, setHasGenerated] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Fetch products on mount
  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch('/api/products?isActive=true&limit=200')
        const json = await res.json()
        if (json.success && json.data?.products) {
          setProductOptions(json.data.products)
        }
      } catch {
        // Silently fail
      }
    }
    fetchProducts()
  }, [])

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true)
      setGenerating(true)
      const params = new URLSearchParams()
      if (productId && productId !== 'all') params.set('productId', productId)
      if (fromDate) params.set('fromDate', fromDate)
      if (toDate) params.set('toDate', toDate)

      const res = await fetch(`/api/reports/stock-report?${params}`)
      const json = await res.json()
      if (!json.success) {
        toast.error('Failed to generate stock report')
        return
      }
      setData(json.data)
      setHasGenerated(true)
    } catch {
      toast.error('Network error while generating report')
    } finally {
      setLoading(false)
      setGenerating(false)
    }
  }, [productId, fromDate, toDate])

  const handleGenerate = () => {
    fetchReport()
  }

  const handleReset = () => {
    setProductId('')
    setFromDate(getFirstOfMonth())
    setToDate(getToday())
    setData(null)
    setHasGenerated(false)
  }

  const handleExportPDF = async () => {
    if (!data) return
    setExporting(true)
    try {
      await exportToPDF({
        title: 'Stock Report',
        columns: [
          { header: 'Product', key: 'product', width: 3 },
          { header: 'Unit', key: 'unit', width: 0.7, align: 'center' },
          { header: 'Cost (PKR)', key: 'cost', width: 1.3, align: 'right' },
          { header: 'Sale (PKR)', key: 'sale', width: 1.3, align: 'right' },
          { header: 'Qty In', key: 'qtyIn', width: 0.9, align: 'right' },
          { header: 'Qty Out', key: 'qtyOut', width: 0.9, align: 'right' },
          { header: 'Stock', key: 'stock', width: 0.9, align: 'right' },
          { header: 'Purchase Val.', key: 'purchaseVal', width: 1.3, align: 'right' },
        ],
        rows: data.products.map(p => [
          p.productName,
          p.unit,
          pdfFormatPKR(p.costPrice),
          pdfFormatPKR(p.salePrice),
          String(p.totalQtyIn),
          String(p.totalQtyOut),
          String(p.currentStock),
          pdfFormatPKR(p.totalPurchaseValue),
        ]),
        summaryRows: [
          ['TOTAL', '', '', '', '', '', '', pdfFormatPKR(data.summary.totalPurchaseValue)],
          ['', '', '', '', '', '', 'Total Profit', pdfFormatPKR(data.summary.totalProfit)],
        ],
      })
      toast.success('PDF exported successfully')
    } catch { toast.error('Failed to export PDF') }
    finally { setExporting(false) }
  }

  // Auto-generate on mount
  useEffect(() => {
    fetchReport()
  }, [])

  // Calculate stock status from data
  const totalItems = data?.products.length ?? 0
  const lowStockCount = data?.products.filter((p) => p.currentStock > 0 && p.currentStock < 10).length ?? 0
  const outOfStockCount = data?.products.filter((p) => p.currentStock <= 0).length ?? 0

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
          <Warehouse className="h-6 w-6 text-amber-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Stock Report
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Product inventory and stock summary
          </p>
        </div>
      </div>

      {/* Stock status cards */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="py-0 gap-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <Package className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Items</p>
                  <p className="text-xl font-bold text-foreground tabular-nums">
                    {totalItems}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="py-0 gap-0 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Low Stock</p>
                  <p className="text-xl font-bold text-orange-600 tabular-nums">
                    {lowStockCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="py-0 gap-0 border-rose-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                  <XCircle className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Out of Stock</p>
                  <p className="text-xl font-bold text-rose-600 tabular-nums">
                    {outOfStockCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="py-0 gap-0">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Product</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger className="h-9 w-44">
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {productOptions.map((prod) => (
                    <SelectItem key={prod.id} value={String(prod.id)}>
                      {prod.pname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              onClick={handleGenerate}
              disabled={generating}
              className="h-9 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Search className="h-4 w-4 mr-1.5" />
              )}
              Generate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-9 text-muted-foreground"
            >
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Reset
            </Button>
            <Button
              onClick={handleExportPDF}
              variant="outline"
              size="sm"
              disabled={exporting || !data}
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

      {/* Loading skeleton */}
      {loading && <StockReportSkeleton />}

      {/* Report content */}
      {!loading && data && (
        <>
          {/* Report header */}
          <Card className="py-0 gap-0">
            <CardContent className="p-6">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold text-foreground">
                  My Accounting Firm
                </h3>
                <h4 className="text-base font-semibold text-amber-700 uppercase tracking-wide">
                  Stock Report
                </h4>
                <p className="text-sm text-muted-foreground">
                  {fromDate && toDate
                    ? `${format(parseISO(fromDate), 'dd MMM yyyy')} — ${format(parseISO(toDate), 'dd MMM yyyy')}`
                    : 'All Time'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Products table */}
          {data.products.length === 0 ? (
            <Card className="py-0 gap-0">
              <CardContent className="p-12 flex flex-col items-center justify-center text-center">
                <div className="h-16 w-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
                  <Warehouse className="h-8 w-8 text-amber-400" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  No stock data found
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  No products match your filter criteria
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="py-0 gap-0">
              <CardContent className="p-0">
                <ScrollArea className="max-h-[calc(100vh-320px)]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                        <TableHead className="text-xs font-semibold text-foreground sticky left-0 bg-slate-50/95 z-10 min-w-[160px]">
                          Product Name
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-foreground text-center">
                          Unit
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-foreground text-right">
                          Cost (PKR)
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-foreground text-right">
                          Sale (PKR)
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-foreground text-right">
                          Margin %
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-foreground text-right">
                          Qty In
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-foreground text-right">
                          Qty Out
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-foreground text-right">
                          Current Stock
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-foreground text-right">
                          Purchase Val.
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-foreground text-right">
                          Sale Val.
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.products.map((prod) => {
                        const isLowStock = prod.currentStock > 0 && prod.currentStock < 10
                        const isOutOfStock = prod.currentStock <= 0

                        return (
                          <TableRow key={prod.productId} className="group">
                            <TableCell className="text-xs font-medium text-foreground sticky left-0 bg-white group-hover:bg-slate-50/50 z-10">
                              <div className="flex items-center gap-2">
                                <Package className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                <span className="truncate">{prod.productName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-center">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                                {prod.unit}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                              {formatCurrency(prod.costPrice)}
                            </TableCell>
                            <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                              {formatCurrency(prod.salePrice)}
                            </TableCell>
                            <TableCell className="text-xs text-right tabular-nums">
                              <span
                                className={
                                  prod.profitMargin > 0
                                    ? 'text-emerald-600'
                                    : prod.profitMargin < 0
                                    ? 'text-rose-600'
                                    : 'text-muted-foreground'
                                }
                              >
                                {prod.profitMargin > 0 ? '+' : ''}
                                {prod.profitMargin.toFixed(1)}%
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-right tabular-nums text-emerald-600 font-medium">
                              {formatNumber(prod.totalQtyIn)}
                            </TableCell>
                            <TableCell className="text-xs text-right tabular-nums text-rose-600 font-medium">
                              {formatNumber(prod.totalQtyOut)}
                            </TableCell>
                            <TableCell className="text-xs text-right tabular-nums">
                              <div className="flex items-center justify-end gap-1.5">
                                <span
                                  className={`font-bold ${
                                    isOutOfStock
                                      ? 'text-rose-600'
                                      : isLowStock
                                      ? 'text-amber-600'
                                      : 'text-emerald-600'
                                  }`}
                                >
                                  {formatNumber(prod.currentStock)}
                                </span>
                                {isLowStock && (
                                  <Badge
                                    variant="outline"
                                    className="text-rose-600 border-rose-200 bg-rose-50 text-[9px] px-1 py-0"
                                  >
                                    Low Stock
                                  </Badge>
                                )}
                                {isOutOfStock && (
                                  <Badge
                                    variant="outline"
                                    className="text-rose-600 border-rose-300 bg-rose-100 text-[9px] px-1 py-0"
                                  >
                                    Out
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                              {formatCurrency(prod.totalPurchaseValue)}
                            </TableCell>
                            <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                              {formatCurrency(prod.totalSaleValue)}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>

              {/* Summary footer */}
              <div className="border-t bg-slate-50/80 p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Total Products
                    </p>
                    <p className="text-sm font-bold text-foreground tabular-nums">
                      {data.summary.totalProducts}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Total Purchase Value
                    </p>
                    <p className="text-sm font-bold text-foreground tabular-nums">
                      {formatCurrency(data.summary.totalPurchaseValue)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Total Sale Value
                    </p>
                    <p className="text-sm font-bold text-emerald-600 tabular-nums">
                      {formatCurrency(data.summary.totalSaleValue)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Total Profit
                    </p>
                    <p
                      className={`text-sm font-bold tabular-nums ${
                        data.summary.totalProfit >= 0
                          ? 'text-emerald-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {formatCurrency(data.summary.totalProfit)}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* No data, no loading yet */}
      {!loading && !data && !hasGenerated && (
        <Card className="py-0 gap-0">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
              <Warehouse className="h-8 w-8 text-amber-400" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Generate a stock report
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Select filters and click &quot;Generate&quot; to view stock data
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
