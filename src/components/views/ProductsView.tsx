'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
  punit: string | null
  costPrice: number
  salePrice: number
  isActive: boolean
  createdAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface FormData {
  pname: string
  punit: string
  costPrice: string
  salePrice: string
}

const emptyForm: FormData = {
  pname: '',
  punit: 'PCS',
  costPrice: '',
  salePrice: '',
}

const UNIT_SUGGESTIONS = ['PCS', 'KG', 'MTR', 'LTR', 'BOX', 'SET']

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

function calcMargin(cost: number, sale: number): string | null {
  if (!sale || sale === 0) return null
  const margin = ((sale - cost) / sale) * 100
  return margin.toFixed(1)
}

// ─── Skeleton Loader ────────────────────────────────────────────────────────

function ProductsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      <Skeleton className="h-9 w-full max-w-sm" />
      <Card className="py-0 gap-0">
        <CardContent className="p-0">
          <div className="space-y-0">
            <div className="flex items-center gap-4 px-4 py-3 border-b bg-muted/30">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20 ml-auto" />
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-14" />
                <div className="flex gap-1 ml-auto">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ProductsView() {
  const [products, setProducts] = useState<Product[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // ── Fetch Data ──────────────────────────────────────────────────────────

  const fetchProducts = useCallback(async (searchTerm?: string, page?: number) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchTerm) params.set('search', searchTerm)
      if (page) params.set('page', page.toString())
      else params.set('page', pagination.page.toString())
      params.set('limit', '20')

      const res = await fetch(`/api/products?${params.toString()}`)
      const json = await res.json()
      if (!json.success) {
        toast.error('Failed to load products')
        return
      }
      setProducts(json.data)
      setPagination(json.pagination)
    } catch {
      toast.error('Network error while loading products')
    } finally {
      setLoading(false)
    }
  }, [pagination.page])

  useEffect(() => {
    fetchProducts()
  }, [])

  // ── Search Handler (debounced) ──────────────────────────────────────────

  function handleSearch(value: string) {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchProducts(value || undefined, 1)
    }, 400)
  }

  // ── Pagination ──────────────────────────────────────────────────────────

  function goToPage(page: number) {
    fetchProducts(search || undefined, page)
  }

  // ── Dialog Helpers ──────────────────────────────────────────────────────

  function openAddDialog() {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEditDialog(product: Product) {
    setEditingId(product.id)
    setForm({
      pname: product.pname,
      punit: product.punit ?? 'PCS',
      costPrice: product.costPrice.toString(),
      salePrice: product.salePrice.toString(),
    })
    setDialogOpen(true)
  }

  function openDeleteDialog(id: number) {
    setDeleteId(id)
    setDeleteOpen(true)
  }

  // ── CRUD Operations ─────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.pname.trim()) {
      toast.error('Product name is required')
      return
    }

    try {
      setSaving(true)
      const url = '/api/products'
      const method = editingId ? 'PUT' : 'POST'
      const body = {
        ...(editingId ? { id: editingId } : {}),
        pname: form.pname.trim(),
        punit: form.punit.trim() || 'PCS',
        costPrice: parseFloat(form.costPrice) || 0,
        salePrice: parseFloat(form.salePrice) || 0,
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()

      if (json.success) {
        toast.success(editingId ? 'Product updated' : 'Product created')
        setDialogOpen(false)
        fetchProducts(search || undefined)
      } else {
        toast.error(json.error ?? 'Failed to save product')
      }
    } catch {
      toast.error('Network error while saving')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return

    try {
      setSaving(true)
      const res = await fetch(`/api/products?id=${deleteId}`, { method: 'DELETE' })
      const json = await res.json()

      if (json.success) {
        toast.success('Product deleted')
        setDeleteOpen(false)
        setDeleteId(null)
        fetchProducts(search || undefined)
      } else {
        toast.error(json.error ?? 'Failed to delete product')
      }
    } catch {
      toast.error('Network error while deleting')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading) return <ProductsSkeleton />

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Products / Projects
            </h2>
            <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">
              {pagination.total}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage your products, services, or projects with pricing.
          </p>
        </div>
        <Button
          onClick={openAddDialog}
          className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search products..."
          className="pl-9"
        />
      </div>

      {/* Data Table */}
      <Card className="py-0 gap-0">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-semibold">Product Name</TableHead>
                  <TableHead className="text-xs font-semibold">Unit</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Cost Price</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Sale Price</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Margin %</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-right w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center text-center">
                        <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center mb-3">
                          <Package className="h-6 w-6 text-amber-500" />
                        </div>
                        <p className="text-sm font-medium text-foreground">No products found</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {search ? 'Try a different search term' : 'Add your first product to get started'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => {
                    const margin = calcMargin(product.costPrice, product.salePrice)
                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-semibold text-sm">
                          {product.pname}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-50 border-slate-200">
                            {product.punit ?? 'PCS'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-right tabular-nums text-muted-foreground">
                          {formatCurrency(product.costPrice)}
                        </TableCell>
                        <TableCell className="text-sm text-right tabular-nums font-medium">
                          {formatCurrency(product.salePrice)}
                        </TableCell>
                        <TableCell className="text-right">
                          {margin !== null ? (
                            <span
                              className={`text-sm font-medium tabular-nums ${
                                parseFloat(margin) > 0
                                  ? 'text-emerald-600'
                                  : parseFloat(margin) < 0
                                    ? 'text-rose-600'
                                    : 'text-muted-foreground'
                              }`}
                            >
                              {parseFloat(margin) > 0 ? '+' : ''}
                              {margin}%
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              product.isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0'
                                : 'bg-slate-50 text-slate-500 border-slate-200 text-[10px] px-1.5 py-0'
                            }
                          >
                            {product.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-amber-600"
                              onClick={() => openEditDialog(product)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-rose-600"
                              onClick={() => openDeleteDialog(product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              onClick={() => goToPage(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              onClick={() => goToPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Add/Edit Dialog ──────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center">
                <Package className="h-3.5 w-3.5 text-amber-600" />
              </div>
              {editingId ? 'Edit Product' : 'Add Product'}
            </DialogTitle>
          </DialogHeader>

          <Separator />

          <div className="space-y-4 py-1">
            {/* Product Name */}
            <div className="space-y-1.5">
              <Label htmlFor="pname" className="text-xs font-medium">
                Product Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="pname"
                value={form.pname}
                onChange={(e) => setForm((prev) => ({ ...prev, pname: e.target.value }))}
                placeholder="Enter product or project name"
              />
            </div>

            {/* Unit */}
            <div className="space-y-1.5">
              <Label htmlFor="punit" className="text-xs font-medium">
                Unit
              </Label>
              <div className="flex gap-2">
                <Input
                  id="punit"
                  value={form.punit}
                  onChange={(e) => setForm((prev) => ({ ...prev, punit: e.target.value.toUpperCase() }))}
                  placeholder="PCS"
                  className="flex-1 font-mono uppercase"
                />
                <div className="flex gap-1 flex-shrink-0">
                  {UNIT_SUGGESTIONS.slice(0, 4).map((unit) => (
                    <Button
                      key={unit}
                      type="button"
                      variant="outline"
                      size="sm"
                      className={`text-[10px] h-7 px-1.5 font-mono ${
                        form.punit === unit
                          ? 'bg-amber-50 border-amber-300 text-amber-700'
                          : ''
                      }`}
                      onClick={() => setForm((prev) => ({ ...prev, punit: unit }))}
                    >
                      {unit}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex gap-1">
                {UNIT_SUGGESTIONS.slice(4).map((unit) => (
                  <Button
                    key={unit}
                    type="button"
                    variant="outline"
                    size="sm"
                    className={`text-[10px] h-6 px-1.5 font-mono ${
                      form.punit === unit
                        ? 'bg-amber-50 border-amber-300 text-amber-700'
                        : ''
                    }`}
                    onClick={() => setForm((prev) => ({ ...prev, punit: unit }))}
                  >
                    {unit}
                  </Button>
                ))}
              </div>
            </div>

            {/* Cost Price */}
            <div className="space-y-1.5">
              <Label htmlFor="costPrice" className="text-xs font-medium">
                Cost Price
              </Label>
              <Input
                id="costPrice"
                type="number"
                min={0}
                step="0.01"
                value={form.costPrice}
                onChange={(e) => setForm((prev) => ({ ...prev, costPrice: e.target.value }))}
                placeholder="0"
              />
            </div>

            {/* Sale Price */}
            <div className="space-y-1.5">
              <Label htmlFor="salePrice" className="text-xs font-medium">
                Sale Price
              </Label>
              <Input
                id="salePrice"
                type="number"
                min={0}
                step="0.01"
                value={form.salePrice}
                onChange={(e) => setForm((prev) => ({ ...prev, salePrice: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>

          <Separator />

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ──────────────────────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? It will be soft-deleted and can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
