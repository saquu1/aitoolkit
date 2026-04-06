'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import {
  Settings2,
  Plus,
  Trash2,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Package,
  CalendarDays,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Product {
  id: number
  pname: string
  punit?: string
  isActive: boolean
}

interface AdjustmentLine {
  id: string
  productId: number
  productName: string
  productUnit?: string
  qty: number
  comments: string
}

interface AdjustmentItem {
  id: number
  productId: number
  qty: number
  comments?: string
  product?: { id: number; pname: string; punit: string }
}

interface StockAdjustment {
  id: number
  date: string
  adjType: 'IN' | 'OUT' | 'SET'
  reason: string
  createdAt: string
  items: AdjustmentItem[]
}

type AdjType = 'IN' | 'OUT' | 'SET'

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ADJ_TYPE_CONFIG: Record<AdjType, { label: string; bg: string; text: string; border: string }> = {
  IN:  { label: 'Stock IN',  bg: 'bg-emerald-50',  text: 'text-emerald-700',  border: 'border-emerald-200' },
  OUT: { label: 'Stock OUT', bg: 'bg-rose-50',      text: 'text-rose-700',      border: 'border-rose-200' },
  SET: { label: 'Stock SET',  bg: 'bg-amber-50',     text: 'text-amber-700',     border: 'border-amber-200' },
}

let lineIdCounter = 0
function createLineId(): string {
  lineIdCounter += 1
  return `line-${Date.now()}-${lineIdCounter}`
}

function createEmptyLine(): AdjustmentLine {
  return {
    id: createLineId(),
    productId: 0,
    productName: '',
    productUnit: '',
    qty: 0,
    comments: '',
  }
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function StockAdjustmentsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div>
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-56 mt-1" />
        </div>
      </div>

      {/* Form card skeleton */}
      <Card className="py-0 gap-0">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-20 w-full mt-4" />

          {/* Line items skeleton */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-8 w-28" />
            </div>
            <div className="rounded-lg border">
              <div className="border-b px-4 py-3 grid grid-cols-12 gap-3">
                <Skeleton className="h-4 col-span-5" />
                <Skeleton className="h-4 col-span-2" />
                <Skeleton className="h-4 col-span-3" />
                <Skeleton className="h-4 col-span-1" />
              </div>
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="border-b px-4 py-3 grid grid-cols-12 gap-3 items-center">
                  <Skeleton className="h-9 col-span-5" />
                  <Skeleton className="h-9 col-span-2" />
                  <Skeleton className="h-9 col-span-3" />
                  <Skeleton className="h-8 w-8 col-span-1" />
                </div>
              ))}
            </div>

            {/* Summary skeleton */}
            <div className="flex justify-end">
              <Skeleton className="h-8 w-48" />
            </div>
          </div>

          {/* Buttons skeleton */}
          <div className="flex gap-3 mt-6">
            <Skeleton className="h-10 w-40" />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Recent adjustments skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <div className="rounded-lg border">
          <div className="border-b px-4 py-3 grid grid-cols-5 gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-16" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border-b px-4 py-3 grid grid-cols-5 gap-4 items-center">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-8" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function StockAdjustmentsView() {
  // ── Data state ──
  const [products, setProducts] = useState<Product[]>([])
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 1 })

  // ── Form state ──
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [adjType, setAdjType] = useState<string>('')
  const [formReason, setFormReason] = useState('')
  const [saving, setSaving] = useState(false)

  // ── Line items state ──
  const [lines, setLines] = useState<AdjustmentLine[]>([createEmptyLine()])

  // ── Expanded rows ──
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  // ── Delete state ──
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ── Fetch products ──
  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products?limit=100')
      const json = await res.json()
      if (json.success) {
        const items = json.data?.products ?? json.data ?? []
        setProducts(Array.isArray(items) ? items : [])
      }
    } catch {
      toast.error('Failed to load products')
    }
  }, [])

  // ── Fetch adjustments ──
  const fetchAdjustments = useCallback(async (page = 1) => {
    try {
      const res = await fetch(`/api/stock-adjustments?page=${page}&limit=20`)
      const json = await res.json()
      if (json.success) {
        setAdjustments(json.data ?? [])
        setPagination(json.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 1 })
      }
    } catch {
      toast.error('Failed to load stock adjustments')
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Mount ──
  useEffect(() => {
    Promise.all([fetchProducts(), fetchAdjustments()])
  }, [fetchProducts, fetchAdjustments])

  // ── Line item handlers ──
  function addLine() {
    setLines((prev) => [...prev, createEmptyLine()])
  }

  function removeLine(lineId: string) {
    if (lines.length <= 1) {
      toast.error('At least one line item is required')
      return
    }
    setLines((prev) => prev.filter((l) => l.id !== lineId))
  }

  function handleProductChange(lineId: string, productIdStr: string) {
    const productId = Number(productIdStr)
    const product = products.find((p) => p.id === productId)
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l
        return {
          ...l,
          productId,
          productName: product?.pname ?? '',
          productUnit: product?.punit ?? '',
        }
      })
    )
  }

  function updateLineQty(lineId: string, qty: number) {
    setLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, qty } : l))
    )
  }

  function updateLineComments(lineId: string, comments: string) {
    setLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, comments } : l))
    )
  }

  // ── Form reset ──
  function resetForm() {
    setFormDate(format(new Date(), 'yyyy-MM-dd'))
    setAdjType('')
    setFormReason('')
    setLines([createEmptyLine()])
  }

  // ── Save handler ──
  async function handleSave() {
    if (!formDate) {
      toast.error('Date is required')
      return
    }
    if (!adjType) {
      toast.error('Please select an adjustment type')
      return
    }

    const validLines = lines.filter((l) => l.productId > 0 && l.qty > 0)
    if (validLines.length === 0) {
      toast.error('At least one product line with quantity is required')
      return
    }

    try {
      setSaving(true)

      const body = {
        date: formDate,
        adjType,
        reason: formReason.trim() || undefined,
        items: validLines.map((l) => ({
          productId: l.productId,
          qty: l.qty,
          comments: l.comments.trim() || undefined,
        })),
      }

      const res = await fetch('/api/stock-adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const json = await res.json()
      if (!json.success) {
        toast.error(json.error || 'Failed to save stock adjustment')
        return
      }

      toast.success('Stock adjustment saved successfully')
      resetForm()
      fetchAdjustments(pagination.page)
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
      const res = await fetch(`/api/stock-adjustments?id=${deletingId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) {
        toast.error(json.error || 'Delete failed')
        return
      }
      toast.success('Stock adjustment deleted')
      setDeleteOpen(false)
      setDeletingId(null)
      fetchAdjustments(pagination.page)
    } catch {
      toast.error('Network error')
    } finally {
      setDeleting(false)
    }
  }

  // ── Toggle row expansion ──
  function toggleRow(id: number) {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // ── Pagination ──
  function goToPage(page: number) {
    if (page < 1 || page > pagination.totalPages) return
    fetchAdjustments(page)
  }

  // ── Loading ──
  if (loading) return <StockAdjustmentsSkeleton />

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center">
          <Settings2 className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Stock Adjustment</h2>
          <p className="text-xs text-muted-foreground">Record stock IN, OUT, or SET adjustments</p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          Section 1 — New Adjustment Form
         ══════════════════════════════════════════════════════════════════════ */}
      <Card className="py-0 gap-0 border-amber-200">
        <CardHeader className="pb-0 pt-4 px-6">
          <CardTitle className="text-sm font-semibold text-amber-700 flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            New Stock Adjustment
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-4">
          {/* Form fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="adj-date">
                Date <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="adj-date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Adjustment Type */}
            <div className="space-y-1.5">
              <Label>
                Adjustment Type <span className="text-rose-500">*</span>
              </Label>
              <Select value={adjType} onValueChange={setAdjType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">
                    <span className="flex items-center gap-2">
                      <Badge className={`${ADJ_TYPE_CONFIG.IN.bg} ${ADJ_TYPE_CONFIG.IN.text} ${ADJ_TYPE_CONFIG.IN.border} border text-[10px] font-semibold px-1.5`}>
                        IN
                      </Badge>
                      Stock IN
                    </span>
                  </SelectItem>
                  <SelectItem value="OUT">
                    <span className="flex items-center gap-2">
                      <Badge className={`${ADJ_TYPE_CONFIG.OUT.bg} ${ADJ_TYPE_CONFIG.OUT.text} ${ADJ_TYPE_CONFIG.OUT.border} border text-[10px] font-semibold px-1.5`}>
                        OUT
                      </Badge>
                      Stock OUT
                    </span>
                  </SelectItem>
                  <SelectItem value="SET">
                    <span className="flex items-center gap-2">
                      <Badge className={`${ADJ_TYPE_CONFIG.SET.bg} ${ADJ_TYPE_CONFIG.SET.text} ${ADJ_TYPE_CONFIG.SET.border} border text-[10px] font-semibold px-1.5`}>
                        SET
                      </Badge>
                      Stock SET
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Spacer on 3rd column for md+; reason spans below */}
            <div className="hidden md:block" />
          </div>

          {/* Reason */}
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="adj-reason">Reason</Label>
            <Textarea
              id="adj-reason"
              placeholder="Optional reason for this adjustment..."
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
              rows={2}
            />
          </div>

          <Separator className="my-5" />

          {/* ── Line Items ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-amber-600" />
                <h3 className="text-sm font-semibold text-foreground">Line Items</h3>
                <Badge
                  variant="secondary"
                  className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] font-semibold tabular-nums"
                >
                  {lines.length}
                </Badge>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                onClick={addLine}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Item
              </Button>
            </div>

            {/* Line items table */}
            <div className="rounded-lg border overflow-hidden">
              <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="text-xs font-semibold min-w-[200px]">Product</TableHead>
                      <TableHead className="text-xs font-semibold text-right w-[100px]">Qty</TableHead>
                      <TableHead className="text-xs font-semibold hidden sm:table-cell w-[200px]">Comments</TableHead>
                      <TableHead className="text-xs font-semibold text-center w-[50px]"></TableHead>
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
                                        <Badge
                                          variant="secondary"
                                          className="text-[9px] bg-slate-100 text-slate-500 ml-1"
                                        >
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
                            min="1"
                            step="1"
                            value={line.qty || ''}
                            onChange={(e) => updateLineQty(line.id, Number(e.target.value) || 0)}
                            className="h-9 text-xs text-right tabular-nums"
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Input
                            type="text"
                            value={line.comments}
                            onChange={(e) => updateLineComments(line.id, e.target.value)}
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
                            <X className="h-3.5 w-3.5" />
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
              <div className="text-xs text-muted-foreground bg-amber-50 rounded-lg border border-amber-100 px-4 py-2">
                Total line items:{' '}
                <span className="font-semibold text-amber-700 tabular-nums">{lines.length}</span>
              </div>
            </div>
          </div>

          {/* ── Save button ── */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
            >
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Save Adjustment
            </Button>
            <Button
              onClick={resetForm}
              disabled={saving}
              variant="ghost"
              className="text-muted-foreground"
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* ══════════════════════════════════════════════════════════════════════
          Section 2 — Recent Adjustments Table
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Recent Adjustments</h3>
          <Badge
            variant="secondary"
            className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] font-semibold tabular-nums"
          >
            {pagination.total}
          </Badge>
        </div>

        {adjustments.length === 0 ? (
          <Card className="py-0 gap-0">
            <CardContent className="p-8 flex flex-col items-center justify-center text-center">
              <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center mb-3">
                <Package className="h-6 w-6 text-amber-400" />
              </div>
              <p className="text-sm font-medium text-foreground">No stock adjustments yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create your first adjustment above.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <div className="max-h-[calc(100vh-460px)] overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-xs font-semibold w-[30px]"></TableHead>
                    <TableHead className="text-xs font-semibold">Date</TableHead>
                    <TableHead className="text-xs font-semibold">Type</TableHead>
                    <TableHead className="text-xs font-semibold hidden sm:table-cell">Items</TableHead>
                    <TableHead className="text-xs font-semibold">Reason</TableHead>
                    <TableHead className="text-xs font-semibold text-right w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adjustments.map((adj) => {
                    const isExpanded = expandedRows.has(adj.id)
                    const typeConf = ADJ_TYPE_CONFIG[adj.adjType as AdjType] ?? ADJ_TYPE_CONFIG.SET

                    return (
                      <Collapsible
                        key={adj.id}
                        open={isExpanded}
                        onOpenChange={() => toggleRow(adj.id)}
                      >
                        {/* Main row */}
                        <TableRow className="group cursor-pointer hover:bg-muted/30">
                          <TableCell className="pl-3 pr-0 w-[30px]">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs tabular-nums">
                              {format(parseISO(adj.date), 'dd MMM yyyy')}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`${typeConf.bg} ${typeConf.text} ${typeConf.border} border text-[10px] font-semibold px-2`}
                            >
                              {adj.adjType}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <span className="text-xs tabular-nums text-muted-foreground">
                              {adj.items?.length ?? 0} item{(adj.items?.length ?? 0) !== 1 ? 's' : ''}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground truncate max-w-[200px] block">
                              {adj.reason || '—'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeletingId(adj.id)
                                setDeleteOpen(true)
                              }}
                              title="Delete adjustment"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>

                        {/* Expanded detail rows */}
                        <CollapsibleContent>
                          {adj.items && adj.items.length > 0 && (
                            <TableRow className="bg-amber-50/30 hover:bg-amber-50/30">
                              <TableCell colSpan={6} className="py-3 px-6">
                                <div className="space-y-2">
                                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                                    Adjustment Items
                                  </p>
                                  <div className="rounded-lg border border-amber-100 bg-white overflow-hidden">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="bg-amber-50/80 hover:bg-amber-50/80">
                                          <TableHead className="text-[10px] font-semibold text-amber-800">Product</TableHead>
                                          <TableHead className="text-[10px] font-semibold text-amber-800 text-right">Qty</TableHead>
                                          <TableHead className="text-[10px] font-semibold text-amber-800">Unit</TableHead>
                                          <TableHead className="text-[10px] font-semibold text-amber-800 hidden sm:table-cell">Comments</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {adj.items.map((item) => (
                                          <TableRow key={item.id} className="hover:bg-white">
                                            <TableCell className="text-xs font-medium text-foreground">
                                              <div className="flex items-center gap-1.5">
                                                <Package className="h-3 w-3 text-amber-500 shrink-0" />
                                                {item.product?.pname ?? `Product #${item.productId}`}
                                              </div>
                                            </TableCell>
                                            <TableCell className="text-xs text-right tabular-nums font-medium text-foreground">
                                              {item.qty}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                              {item.product?.punit ? (
                                                <Badge
                                                  variant="outline"
                                                  className="text-[9px] px-1.5 py-0 font-mono"
                                                >
                                                  {item.product.punit}
                                                </Badge>
                                              ) : (
                                                '—'
                                              )}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                                              {item.comments || '—'}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* ── Pagination ── */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={pagination.page <= 1}
                    onClick={() => goToPage(pagination.page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => goToPage(pagination.page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stock Adjustment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this stock adjustment? This will permanently remove the
              adjustment and all its line items. This action cannot be undone.
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
