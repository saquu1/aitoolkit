'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import {
  Truck,
  Loader2,
  Trash2,
  Plus,
  CalendarDays,
  RefreshCw,
  Package,
  Hash,
  Percent,
  MessageSquare,
  Landmark,
  UserCircle,
  AlertCircle,
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

interface PurchaseLine {
  productId: number
  qtyIn: number
  costPrice: number
  totalAmount: number
  purchaseDate?: string
}

interface PurchaseDetailRow {
  id: string
  productId: number
  productName: string
  productUnit?: string
  qtyIn: number
  costPrice: number
  totalAmount: number
  lineComments: string
}

interface PurchaseTrans {
  id: number
  transDate: string
  accountId: number
  bankId: number | null
  debit: number
  credit: number
  refNo: string | null
  comments: string | null
  transType: string
  account?: { id: number; aname: string; atype: string }
  bank?: { id: number; aname: string }
  purchaseEntries?: PurchaseLine[]
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

let lineIdCounter = 0
function createLineId(): string {
  lineIdCounter += 1
  return `line-${Date.now()}-${lineIdCounter}`
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function PurchaseEntrySkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-52 mt-1" />
        </div>
      </div>

      {/* Form card skeleton */}
      <Card className="py-0 gap-0">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-16 w-full mt-4" />

          {/* Line items skeleton */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-8 w-28" />
            </div>
            <div className="rounded-lg border">
              <div className="border-b px-4 py-3 grid grid-cols-12 gap-3">
                <Skeleton className="h-4 col-span-4" />
                <Skeleton className="h-4 col-span-2" />
                <Skeleton className="h-4 col-span-2" />
                <Skeleton className="h-4 col-span-2" />
                <Skeleton className="h-4 col-span-1" />
              </div>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border-b px-4 py-3 grid grid-cols-12 gap-3 items-center">
                  <Skeleton className="h-9 col-span-4" />
                  <Skeleton className="h-9 col-span-2" />
                  <Skeleton className="h-9 col-span-2" />
                  <Skeleton className="h-4 col-span-2" />
                  <Skeleton className="h-8 w-8 col-span-1" />
                </div>
              ))}
            </div>

            {/* Summary skeleton */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            </div>
          </div>

          {/* Buttons skeleton */}
          <div className="flex gap-3 mt-6">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-24" />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Recent purchases skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <div className="rounded-lg border">
          <div className="border-b px-4 py-3 grid grid-cols-6 gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border-b px-4 py-3 grid grid-cols-6 gap-4 items-center">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function PurchaseEntryView() {
  // ── Data state ──
  const [products, setProducts] = useState<Product[]>([])
  const [supplierAccounts, setSupplierAccounts] = useState<Account[]>([])
  const [bankAccounts, setBankAccounts] = useState<Account[]>([])
  const [recentPurchases, setRecentPurchases] = useState<PurchaseTrans[]>([])
  const [loading, setLoading] = useState(true)

  // ── Form state ──
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [supplierId, setSupplierId] = useState('')
  const [bankId, setBankId] = useState('')
  const [formRef, setFormRef] = useState('')
  const [discount, setDiscount] = useState('')
  const [gstPercent, setGstPercent] = useState('')
  const [formComments, setFormComments] = useState('')
  const [saving, setSaving] = useState(false)

  // ── Line items state ──
  const [lines, setLines] = useState<PurchaseDetailRow[]>([
    { id: createLineId(), productId: 0, productName: '', productUnit: '', qtyIn: 1, costPrice: 0, totalAmount: 0, lineComments: '' },
  ])

  // ── Delete state ──
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ── Fetch data ──
  const fetchAccounts = useCallback(async () => {
    try {
      const [supplierRes, bankRes] = await Promise.all([
        fetch('/api/accounts?atype=SUPPLIER&isActive=true&limit=100'),
        fetch('/api/accounts?atype=BANK&isActive=true&limit=100'),
      ])
      const supplierJson = await supplierRes.json()
      const bankJson = await bankRes.json()
      if (supplierJson.success) setSupplierAccounts(supplierJson.data)
      if (bankJson.success) setBankAccounts(bankJson.data)
    } catch {
      toast.error('Failed to load accounts')
    }
  }, [])

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products?isActive=true&limit=200')
      const json = await res.json()
      if (json.success) setProducts(json.data)
    } catch {
      toast.error('Failed to load products')
    }
  }, [])

  const fetchRecentPurchases = useCallback(async () => {
    try {
      const res = await fetch('/api/purchases')
      const json = await res.json()
      if (json.success) setRecentPurchases(json.data)
    } catch {
      toast.error('Failed to load recent purchases')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    Promise.all([fetchAccounts(), fetchProducts(), fetchRecentPurchases()])
  }, [fetchAccounts, fetchProducts, fetchRecentPurchases])

  // ── Line item handlers ──
  function addLine() {
    setLines((prev) => [
      ...prev,
      { id: createLineId(), productId: 0, productName: '', productUnit: '', qtyIn: 1, costPrice: 0, totalAmount: 0, lineComments: '' },
    ])
  }

  function removeLine(lineId: string) {
    if (lines.length <= 1) {
      toast.error('At least one line item is required')
      return
    }
    setLines((prev) => prev.filter((l) => l.id !== lineId))
  }

  function updateLine(lineId: string, updates: Partial<PurchaseDetailRow>) {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l
        const updated = { ...l, ...updates }
        // Auto-calculate total
        updated.totalAmount = updated.qtyIn * updated.costPrice
        return updated
      })
    )
  }

  function handleProductChange(lineId: string, productIdStr: string) {
    const productId = Number(productIdStr)
    const product = products.find((p) => p.id === productId)
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l
        const costPrice = product?.costPrice ?? 0
        const updated = {
          ...l,
          productId,
          productName: product?.pname ?? '',
          productUnit: product?.punit ?? '',
          costPrice,
          totalAmount: l.qtyIn * costPrice,
        }
        return updated
      })
    )
  }

  // ── Summary calculations ──
  const totalCost = useMemo(() => lines.reduce((sum, l) => sum + l.totalAmount, 0), [lines])
  const discountAmount = useMemo(() => Number(discount) || 0, [discount])
  const gstValue = useMemo(() => Number(gstPercent) || 0, [gstPercent])
  const gstAmount = useMemo(() => totalCost * gstValue / 100, [totalCost, gstValue])
  const grandTotal = useMemo(() => totalCost - discountAmount + gstAmount, [totalCost, discountAmount, gstAmount])

  // ── Form reset ──
  function resetForm() {
    setFormDate(format(new Date(), 'yyyy-MM-dd'))
    setSupplierId('')
    setBankId('')
    setFormRef('')
    setDiscount('')
    setGstPercent('')
    setFormComments('')
    setLines([{ id: createLineId(), productId: 0, productName: '', productUnit: '', qtyIn: 1, costPrice: 0, totalAmount: 0, lineComments: '' }])
  }

  // ── Save handler ──
  async function handleSave(andNew = false) {
    // Validation
    if (!formDate) { toast.error('Date is required'); return }
    if (!supplierId) { toast.error('Please select a supplier'); return }
    if (!bankId) { toast.error('Please select a bank/cash account'); return }

    const validLines = lines.filter((l) => l.productId > 0 && l.qtyIn > 0)
    if (validLines.length === 0) {
      toast.error('At least one product line with quantity is required')
      return
    }

    // Check for duplicate products
    const productIds = validLines.map((l) => l.productId)
    const duplicates = productIds.filter((id, idx) => productIds.indexOf(id) !== idx)
    if (duplicates.length > 0) {
      toast.error('Duplicate products found in line items')
      return
    }

    try {
      setSaving(true)

      const body = {
        transDate: formDate,
        accountId: Number(supplierId),
        bankId: Number(bankId),
        discountReceive: discountAmount,
        gst: gstValue,
        comments: formComments.trim() || undefined,
        refNo: formRef.trim() || undefined,
        details: validLines.map((l) => ({
          productId: l.productId,
          qtyIn: l.qtyIn,
          costPrice: l.costPrice,
          totalAmount: l.totalAmount,
        })),
      }

      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const json = await res.json()
      if (!json.success) {
        toast.error(json.error || 'Failed to save purchase')
        return
      }

      toast.success(`Purchase of ${formatCurrency(grandTotal)} saved successfully`)

      if (andNew) {
        // Keep supplier and bank, reset the rest
        setFormDate(format(new Date(), 'yyyy-MM-dd'))
        setFormRef('')
        setDiscount('')
        setGstPercent('')
        setFormComments('')
        setLines([{ id: createLineId(), productId: 0, productName: '', productUnit: '', qtyIn: 1, costPrice: 0, totalAmount: 0, lineComments: '' }])
      } else {
        resetForm()
      }

      fetchRecentPurchases()
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete handler ──
  async function handleDelete() {
    if (!deletingId) return
    try {
      setDeleting(true)
      const res = await fetch(`/api/purchases?id=${deletingId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) { toast.error(json.error || 'Delete failed'); return }
      toast.success('Purchase deleted')
      setDeleteOpen(false)
      setDeletingId(null)
      fetchRecentPurchases()
    } catch {
      toast.error('Network error')
    } finally {
      setDeleting(false)
    }
  }

  // ── Loading ──
  if (loading) return <PurchaseEntrySkeleton />

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center">
          <Truck className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Purchase Entry</h2>
          <p className="text-xs text-muted-foreground">Record purchases from suppliers</p>
        </div>
      </div>

      {/* ── Form Card ── */}
      <Card className="py-0 gap-0 border-blue-200">
        <CardContent className="p-6">
          {/* Form header */}
          <div className="flex items-center gap-2 mb-4">
            <Plus className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-foreground">New Purchase</h3>
          </div>

          {/* Main form fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="pur-date">Date <span className="text-rose-500">*</span></Label>
              <div className="relative">
                <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="pur-date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Supplier */}
            <div className="space-y-1.5">
              <Label>Supplier Account <span className="text-rose-500">*</span></Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    <UserCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Select supplier" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {supplierAccounts.length === 0 ? (
                    <SelectItem value="__none" disabled>No suppliers found</SelectItem>
                  ) : (
                    supplierAccounts.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.aname}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Bank / Cash */}
            <div className="space-y-1.5">
              <Label>Bank / Cash Account <span className="text-rose-500">*</span></Label>
              <Select value={bankId} onValueChange={setBankId}>
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Select bank/cash" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.length === 0 ? (
                    <SelectItem value="__none" disabled>No bank accounts found</SelectItem>
                  ) : (
                    bankAccounts.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.aname}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Reference No */}
            <div className="space-y-1.5">
              <Label htmlFor="pur-ref">Reference No</Label>
              <div className="relative">
                <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="pur-ref"
                  placeholder="e.g. PO-001"
                  value={formRef}
                  onChange={(e) => setFormRef(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Discount */}
            <div className="space-y-1.5">
              <Label htmlFor="pur-discount">Discount Received (PKR)</Label>
              <Input
                id="pur-discount"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="text-right tabular-nums"
              />
            </div>

            {/* GST % */}
            <div className="space-y-1.5">
              <Label htmlFor="pur-gst">GST %</Label>
              <div className="relative">
                <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="pur-gst"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="0"
                  value={gstPercent}
                  onChange={(e) => setGstPercent(e.target.value)}
                  className="text-right tabular-nums pr-9"
                />
              </div>
            </div>
          </div>

          {/* Comments */}
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="pur-comments">Comments</Label>
            <div className="relative">
              <MessageSquare className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Textarea
                id="pur-comments"
                placeholder="Optional notes about this purchase..."
                value={formComments}
                onChange={(e) => setFormComments(e.target.value)}
                rows={2}
                className="pl-9"
              />
            </div>
          </div>

          <Separator className="my-5" />

          {/* ── Line Items Section ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-foreground">Purchase Items</h3>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] font-semibold tabular-nums">
                  {lines.length}
                </Badge>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                onClick={addLine}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Item
              </Button>
            </div>

            {/* Line items grid */}
            <div className="rounded-lg border overflow-hidden">
              <div className="max-h-[360px] overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="text-xs font-semibold min-w-[200px]">Product</TableHead>
                      <TableHead className="text-xs font-semibold text-right w-[100px]">Qty</TableHead>
                      <TableHead className="text-xs font-semibold text-right w-[130px]">Cost Price</TableHead>
                      <TableHead className="text-xs font-semibold text-right w-[130px]">Total</TableHead>
                      <TableHead className="text-xs font-semibold hidden lg:table-cell w-[140px]">Line Comments</TableHead>
                      <TableHead className="text-xs font-semibold text-center w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line, idx) => (
                      <TableRow key={line.id} className="group bg-white">
                        <TableCell>
                          <Select
                            value={line.productId > 0 ? String(line.productId) : ''}
                            onValueChange={(val) => handleProductChange(line.id, val)}
                          >
                            <SelectTrigger className="h-9 text-xs w-full">
                              <SelectValue placeholder={`Select product #${idx + 1}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {products.length === 0 ? (
                                <SelectItem value="__none" disabled>No products found</SelectItem>
                              ) : (
                                products.map((p) => (
                                  <SelectItem key={p.id} value={String(p.id)}>
                                    <span className="flex items-center gap-2">
                                      {p.pname}
                                      {p.punit && (
                                        <Badge variant="secondary" className="text-[9px] bg-slate-100 text-slate-500 ml-1">
                                          {p.punit}
                                        </Badge>
                                      )}
                                    </span>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0.01"
                            step="1"
                            value={line.qtyIn || ''}
                            onChange={(e) => updateLine(line.id, { qtyIn: Number(e.target.value) || 0 })}
                            className="h-9 text-xs text-right tabular-nums"
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={line.costPrice || ''}
                            onChange={(e) => updateLine(line.id, { costPrice: Number(e.target.value) || 0 })}
                            className="h-9 text-xs text-right tabular-nums"
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-right tabular-nums font-medium text-foreground">
                            {formatCurrency(line.totalAmount)}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Input
                            type="text"
                            value={line.lineComments}
                            onChange={(e) => updateLine(line.id, { lineComments: e.target.value })}
                            className="h-9 text-xs"
                            placeholder="Optional"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeLine(line.id)}
                            disabled={lines.length <= 1}
                            title="Remove line"
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

            {/* ── Summary ── */}
            <div className="flex justify-end">
              <div className="w-full sm:w-72 space-y-2 bg-blue-50 rounded-lg border border-blue-100 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Cost</span>
                  <span className="font-medium tabular-nums">{formatCurrency(totalCost)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-medium tabular-nums text-emerald-600">-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                {gstValue > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">GST ({gstValue}%)</span>
                    <span className="font-medium tabular-nums text-amber-600">+{formatCurrency(gstAmount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span className="text-foreground">Grand Total</span>
                  <span className="tabular-nums text-blue-600">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Info bar ── */}
          <div className="flex items-center gap-2 mt-5 text-xs text-muted-foreground bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
            <AlertCircle className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span>Creates a purchase transaction (Debit: Supplier / Credit: Bank) with stock entries for each product line.</span>
          </div>

          {/* ── Action buttons ── */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="bg-blue-500 hover:bg-blue-600 text-white shadow-sm"
            >
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Save
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={saving}
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
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

      <Separator />

      {/* ── Recent Purchases Table ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Recent Purchases</h3>
          <Badge
            variant="secondary"
            className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] font-semibold tabular-nums"
          >
            {recentPurchases.length}
          </Badge>
        </div>

        {recentPurchases.length === 0 ? (
          <Card className="py-0 gap-0">
            <CardContent className="p-8 flex flex-col items-center justify-center text-center">
              <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                <Truck className="h-6 w-6 text-blue-400" />
              </div>
              <p className="text-sm font-medium text-foreground">No purchases yet</p>
              <p className="text-xs text-muted-foreground mt-1">Create your first purchase entry above.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-xs font-semibold">Date</TableHead>
                    <TableHead className="text-xs font-semibold">Ref No</TableHead>
                    <TableHead className="text-xs font-semibold">Supplier</TableHead>
                    <TableHead className="text-xs font-semibold hidden md:table-cell">Bank</TableHead>
                    <TableHead className="text-xs font-semibold hidden lg:table-cell">Items</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Total Cost</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPurchases.map((t) => (
                    <TableRow key={t.id} className="group">
                      <TableCell>
                        <span className="text-xs tabular-nums">
                          {format(parseISO(t.transDate), 'dd MMM yyyy')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {t.refNo || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium">
                          {t.account?.aname || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1.5">
                          <Landmark className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {t.bank?.aname || '—'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {t.purchaseEntries?.length ?? 0} items
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-xs tabular-nums font-medium text-blue-600">
                          {formatCurrency(t.debit)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            setDeletingId(t.id)
                            setDeleteOpen(true)
                          }}
                          title="Delete purchase"
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

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Purchase</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this purchase? This will remove the transaction and all associated product line items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-rose-500 hover:bg-rose-600 text-white"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Custom Scrollbar Styles ── */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgb(203 213 225 / 0.6); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgb(148 163 184 / 0.8); }
      `}</style>
    </div>
  )
}
