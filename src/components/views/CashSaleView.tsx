'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import {
  Banknote,
  Loader2,
  Plus,
  Trash2,
  CalendarDays,
  RefreshCw,
  Landmark,
  Package,
  User,
  Phone,
  MessageSquare,
  ShoppingCart,
  Percent,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Product {
  id: number
  pname: string
  pcode?: string
  punit?: string
  costPrice: number
  salePrice: number
  isActive: boolean
}

interface Account {
  id: number
  aname: string
  atype: string
  isActive: boolean
}

interface SaleLineForm {
  _key: number
  productId: number | null
  qtyOut: number
  salePrice: number
  costPrice: number
  totalAmount: number
  lineGst: number
  lineComments: string
}

interface SaleRecord {
  id: number
  saleNo: string
  saleDate: string
  accountId: number
  transType: string
  customerName?: string | null
  grossTotal: number
  discountAllow: number
  gst: number
  gstAmount: number
  grandTotal: number
  comments?: string | null
  account?: { id: number; aname: string; atype: string } | null
  saleDetails?: {
    id: number
    productId: number
    qtyOut: number
    salePrice: number
    costPrice: number
    totalAmount: number
    lineGst: number
    lineComments?: string | null
    product?: { id: number; pname: string; pcode?: string; punit?: string } | null
  }[]
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

let lineKeyCounter = 0
function nextLineKey(): number {
  return ++lineKeyCounter
}

function emptyLine(): SaleLineForm {
  return {
    _key: nextLineKey(),
    productId: null,
    qtyOut: 1,
    salePrice: 0,
    costPrice: 0,
    totalAmount: 0,
    lineGst: 0,
    lineComments: '',
  }
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function CashSaleSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-44" />
        </div>
      </div>

      {/* Form card */}
      <Card className="py-0 gap-0">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
          <div className="flex gap-3 mt-6">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-24" />
          </div>
        </CardContent>
      </Card>

      {/* Line items skeleton */}
      <Card className="py-0 gap-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-24" />
          </div>
          <div className="rounded-lg border">
            <div className="border-b px-4 py-3 grid grid-cols-12 gap-2">
              <Skeleton className="h-4 col-span-4" />
              <Skeleton className="h-4 col-span-1" />
              <Skeleton className="h-4 col-span-2" />
              <Skeleton className="h-4 col-span-2" />
              <Skeleton className="h-4 col-span-2" />
              <Skeleton className="h-4 col-span-1" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border-b px-4 py-3 grid grid-cols-12 gap-2">
                <Skeleton className="h-9 col-span-4" />
                <Skeleton className="h-9 col-span-1" />
                <Skeleton className="h-9 col-span-2" />
                <Skeleton className="h-9 col-span-2" />
                <Skeleton className="h-9 col-span-2" />
                <Skeleton className="h-9 col-span-1" />
              </div>
            ))}
          </div>
          <Skeleton className="h-16 w-full mt-4" />
        </CardContent>
      </Card>

      {/* Recent table skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-44" />
        <div className="rounded-lg border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border-b px-4 py-3 flex gap-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function CashSaleView() {
  // Data
  const [bankAccounts, setBankAccounts] = useState<Account[]>([])
  const [customerAccounts, setCustomerAccounts] = useState<Account[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [recentSales, setRecentSales] = useState<SaleRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Form state
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [bankId, setBankId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [contactNo, setContactNo] = useState('')
  const [discountAllow, setDiscountAllow] = useState('')
  const [gstPercent, setGstPercent] = useState('')
  const [comments, setComments] = useState('')
  const [saving, setSaving] = useState(false)

  // Line items
  const [lines, setLines] = useState<SaleLineForm[]>([emptyLine()])

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ─── Computed values ─────────────────────────────────────────────────────

  const grossTotal = lines.reduce((sum, l) => sum + l.totalAmount, 0)
  const discountAmount = Number(discountAllow) || 0
  const gstValue = Number(gstPercent) || 0
  const gstAmount = grossTotal * gstValue / 100
  const grandTotal = grossTotal - discountAmount + gstAmount

  // ─── Data fetching ──────────────────────────────────────────────────────

  const fetchAccounts = useCallback(async () => {
    try {
      const [bankRes, custRes] = await Promise.all([
        fetch('/api/accounts?atype=BANK&isActive=true&limit=100'),
        fetch('/api/accounts?atype=CUSTOMER&isActive=true&limit=200'),
      ])
      const bankJson = await bankRes.json()
      const custJson = await custRes.json()
      if (bankJson.success) setBankAccounts(bankJson.data)
      if (custJson.success) setCustomerAccounts(custJson.data)
    } catch {
      toast.error('Failed to load accounts')
    }
  }, [])

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products?isActive=true&limit=500')
      const json = await res.json()
      if (json.success) setProducts(json.data)
    } catch {
      toast.error('Failed to load products')
    }
  }, [])

  const fetchRecentSales = useCallback(async () => {
    try {
      const res = await fetch('/api/sales?transType=CASH-SALE&limit=50')
      const json = await res.json()
      if (json.success) setRecentSales(json.data)
    } catch {
      toast.error('Failed to load recent cash sales')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    Promise.all([fetchAccounts(), fetchProducts(), fetchRecentSales()])
  }, [fetchAccounts, fetchProducts, fetchRecentSales])

  // ─── Line item handlers ─────────────────────────────────────────────────

  function addLine() {
    setLines((prev) => [...prev, emptyLine()])
  }

  function removeLine(key: number) {
    if (lines.length <= 1) {
      toast.error('Must have at least one line item')
      return
    }
    setLines((prev) => prev.filter((l) => l._key !== key))
  }

  function updateLine(key: number, updates: Partial<SaleLineForm>) {
    setLines((prev) =>
      prev.map((l) => {
        if (l._key !== key) return l
        const updated = { ...l, ...updates }
        // Recalculate total
        updated.totalAmount = updated.qtyOut * updated.salePrice
        return updated
      })
    )
  }

  function handleProductSelect(key: number, productId: string) {
    const pid = Number(productId)
    const product = products.find((p) => p.id === pid)
    if (product) {
      updateLine(key, {
        productId: pid,
        salePrice: product.salePrice,
        costPrice: product.costPrice,
      })
    } else {
      updateLine(key, { productId: pid, salePrice: 0, costPrice: 0 })
    }
  }

  // ─── Form reset ─────────────────────────────────────────────────────────

  function resetForm() {
    setFormDate(format(new Date(), 'yyyy-MM-dd'))
    setBankId('')
    setCustomerId('')
    setCustomerName('')
    setContactNo('')
    setDiscountAllow('')
    setGstPercent('')
    setComments('')
    setLines([emptyLine()])
  }

  // ─── Save ───────────────────────────────────────────────────────────────

  async function handleSave(andNew = false) {
    if (!formDate) {
      toast.error('Date is required')
      return
    }
    if (!bankId) {
      toast.error('Please select a bank/cash account')
      return
    }

    const validLines = lines.filter((l) => l.productId && l.qtyOut > 0 && l.salePrice > 0)
    if (validLines.length === 0) {
      toast.error('Add at least one product with quantity and price')
      return
    }

    if (discountAmount < 0) {
      toast.error('Discount cannot be negative')
      return
    }
    if (gstValue < 0) {
      toast.error('GST cannot be negative')
      return
    }

    try {
      setSaving(true)

      const body = {
        saleDate: formDate,
        accountId: Number(bankId),
        transType: 'CASH-SALE',
        customerName: customerName.trim() || undefined,
        contactNo: contactNo.trim() || undefined,
        discountAllow: discountAmount,
        gst: gstValue,
        comments: comments.trim() || undefined,
        details: validLines.map((l) => ({
          productId: l.productId,
          qtyOut: l.qtyOut,
          salePrice: l.salePrice,
          costPrice: l.costPrice,
          totalAmount: l.qtyOut * l.salePrice,
          lineGst: 0,
          lineComments: l.lineComments.trim() || undefined,
        })),
      }

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const json = await res.json()
      if (!json.success) {
        toast.error(json.error || 'Failed to save cash sale')
        return
      }

      toast.success(
        `Cash Sale ${json.data.saleNo} saved — ${formatCurrency(grandTotal)}`
      )

      if (andNew) {
        // Keep bank, date, reset the rest
        setCustomerId('')
        setCustomerName('')
        setContactNo('')
        setDiscountAllow('')
        setGstPercent('')
        setComments('')
        setLines([emptyLine()])
      } else {
        resetForm()
      }

      fetchRecentSales()
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  // ─── Delete ─────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deletingId) return
    try {
      setDeleting(true)
      const res = await fetch(`/api/sales?id=${deletingId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) {
        toast.error(json.error || 'Delete failed')
        return
      }
      toast.success('Cash sale deleted')
      setDeleteOpen(false)
      fetchRecentSales()
    } catch {
      toast.error('Network error')
    } finally {
      setDeleting(false)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  if (loading) return <CashSaleSkeleton />

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center">
          <Banknote className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Cash Sale
          </h2>
          <p className="text-xs text-muted-foreground">
            Direct cash/bank sales
          </p>
        </div>
      </div>

      {/* ── Form Card ───────────────────────────────────────────────────── */}
      <Card className="py-0 gap-0 border-emerald-200">
        <CardContent className="p-6">
          {/* Grid 1: Date, Bank, Customer */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="cs-date">
                Date <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="cs-date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Bank / Cash Account */}
            <div className="space-y-1.5">
              <Label>
                Bank / Cash Account <span className="text-rose-500">*</span>
              </Label>
              <Select value={bankId} onValueChange={setBankId}>
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Select bank/cash" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.aname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Customer (optional) */}
            <div className="space-y-1.5">
              <Label>Customer (optional)</Label>
              <Select value={customerId} onValueChange={(val) => {
                setCustomerId(val)
                if (val) {
                  const acc = customerAccounts.find((a) => a.id === Number(val))
                  if (acc) setCustomerName(acc.aname)
                } else {
                  setCustomerName('')
                }
              }}>
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Walk-in customer" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__walkin">Walk-in (no customer)</SelectItem>
                  {customerAccounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.aname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Grid 2: Customer Name, Contact, Discount */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {/* Customer Name */}
            <div className="space-y-1.5">
              <Label htmlFor="cs-custname">Customer Name</Label>
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="cs-custname"
                  placeholder="Walk-in"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Contact No */}
            <div className="space-y-1.5">
              <Label htmlFor="cs-contact">Contact No</Label>
              <div className="relative">
                <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="cs-contact"
                  placeholder="Optional"
                  value={contactNo}
                  onChange={(e) => setContactNo(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Discount */}
            <div className="space-y-1.5">
              <Label htmlFor="cs-discount">Discount (PKR)</Label>
              <Input
                id="cs-discount"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={discountAllow}
                onChange={(e) => setDiscountAllow(e.target.value)}
                className="text-right tabular-nums"
              />
            </div>
          </div>

          {/* Grid 3: GST%, Comments */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {/* GST % */}
            <div className="space-y-1.5">
              <Label htmlFor="cs-gst">GST %</Label>
              <div className="relative">
                <Percent className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="cs-gst"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="0"
                  value={gstPercent}
                  onChange={(e) => setGstPercent(e.target.value)}
                  className="pl-9 text-right tabular-nums"
                />
              </div>
            </div>

            {/* Comments */}
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="cs-comments">Comments</Label>
              <div className="relative">
                <MessageSquare className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Textarea
                  id="cs-comments"
                  placeholder="Optional notes..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={2}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
            >
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Save
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={saving}
              variant="outline"
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              <Plus className="h-4 w-4 mr-1.5" />
              Save &amp; New
            </Button>
            <Button
              onClick={resetForm}
              disabled={saving}
              variant="ghost"
              className="text-muted-foreground"
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Line Items Card ──────────────────────────────────────────────── */}
      <Card className="py-0 gap-0 border-emerald-200">
        <CardContent className="p-6">
          {/* Line items header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-foreground">
                Sale Items
              </h3>
              <Badge
                variant="secondary"
                className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-semibold tabular-nums"
              >
                {lines.length}
              </Badge>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addLine}
              className="h-8 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Item
            </Button>
          </div>

          {/* Line items table */}
          <div className="rounded-lg border overflow-hidden">
            <div className="max-h-[420px] overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-xs font-semibold min-w-[200px]">
                      Product
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-center w-[70px]">
                      Qty
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right min-w-[120px]">
                      Price
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right min-w-[120px]">
                      Total
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right hidden md:table-cell min-w-[120px]">
                      Cost
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-center w-[60px]">
                      &nbsp;
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow key={line._key} className="group">
                      {/* Product select */}
                      <TableCell>
                        <Select
                          value={line.productId ? String(line.productId) : ''}
                          onValueChange={(val) =>
                            handleProductSelect(line._key, val)
                          }
                        >
                          <SelectTrigger className="h-9 text-xs w-full">
                            <div className="flex items-center gap-1.5">
                              <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <SelectValue placeholder="Select product" />
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>
                                <span className="flex items-center gap-2">
                                  {p.pname}
                                  {p.pcode && (
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                      {p.pcode}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-emerald-600 font-semibold ml-auto">
                                    {formatCurrency(p.salePrice)}
                                  </span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* Qty */}
                      <TableCell>
                        <Input
                          type="number"
                          min="0.01"
                          step="1"
                          value={line.qtyOut || ''}
                          onChange={(e) =>
                            updateLine(line._key, {
                              qtyOut: Number(e.target.value) || 0,
                            })
                          }
                          className="h-9 text-xs text-center tabular-nums"
                        />
                      </TableCell>

                      {/* Sale Price */}
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={line.salePrice || ''}
                          onChange={(e) =>
                            updateLine(line._key, {
                              salePrice: Number(e.target.value) || 0,
                            })
                          }
                          className="h-9 text-xs text-right tabular-nums"
                        />
                      </TableCell>

                      {/* Total */}
                      <TableCell className="text-right">
                        <span className="text-xs tabular-nums font-semibold text-emerald-700">
                          {formatCurrency(line.totalAmount)}
                        </span>
                      </TableCell>

                      {/* Cost (hidden on mobile) */}
                      <TableCell className="text-right hidden md:table-cell">
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {formatCurrency(line.costPrice * line.qtyOut)}
                        </span>
                      </TableCell>

                      {/* Remove */}
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeLine(line._key)}
                          disabled={lines.length <= 1}
                          title="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-4 bg-emerald-50 rounded-lg border border-emerald-100 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Gross Total</span>
              <span className="font-semibold tabular-nums">
                {formatCurrency(grossTotal)}
              </span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-rose-600 font-medium tabular-nums">
                  -{formatCurrency(discountAmount)}
                </span>
              </div>
            )}
            {gstValue > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  GST ({gstValue}%)
                </span>
                <span className="text-amber-600 font-medium tabular-nums">
                  +{formatCurrency(gstAmount)}
                </span>
              </div>
            )}
            <Separator className="bg-emerald-200" />
            <div className="flex justify-between text-base font-bold">
              <span className="text-emerald-800">Grand Total</span>
              <span className="text-emerald-700 tabular-nums">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* ── Recent Cash Sales Table ──────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            Recent Cash Sales
          </h3>
          <Badge
            variant="secondary"
            className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-semibold tabular-nums"
          >
            {recentSales.length}
          </Badge>
        </div>

        {recentSales.length === 0 ? (
          <Card className="py-0 gap-0">
            <CardContent className="p-8 flex flex-col items-center justify-center text-center">
              <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                <Banknote className="h-6 w-6 text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-foreground">
                No cash sales yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Create your first cash sale above.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-xs font-semibold">
                      Sale No
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Date
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Customer
                    </TableHead>
                    <TableHead className="text-xs font-semibold hidden md:table-cell">
                      Bank
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Gross
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Grand Total
                    </TableHead>
                    <TableHead className="text-xs font-semibold hidden lg:table-cell">
                      Items
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSales.map((sale) => (
                    <TableRow key={sale.id} className="group">
                      <TableCell>
                        <span className="text-xs font-semibold font-mono text-emerald-700">
                          {sale.saleNo}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs tabular-nums">
                          {format(parseISO(sale.saleDate), 'dd MMM yyyy')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium">
                          {sale.customerName || (
                            <span className="text-muted-foreground italic">
                              Walk-in
                            </span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {sale.account?.aname || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {formatCurrency(sale.grossTotal)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-xs tabular-nums font-semibold text-emerald-600">
                          {formatCurrency(sale.grandTotal)}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {sale.saleDetails?.length || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            setDeletingId(sale.id)
                            setDeleteOpen(true)
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* ── Delete Confirmation ──────────────────────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cash Sale</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this cash sale? This action cannot
              be undone and will remove all line items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-rose-500 hover:bg-rose-600 text-white"
            >
              {deleting && (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Global Styles ────────────────────────────────────────────────── */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgb(203 213 225 / 0.6); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgb(148 163 184 / 0.8); }
      `}</style>
    </div>
  )
}
