'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import {
  Tags,
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

interface Category {
  id: number
  name: string
  description: string | null
  isActive: boolean
  _count: {
    products: number
  }
  createdAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface FormData {
  name: string
  description: string
}

const emptyForm: FormData = {
  name: '',
  description: '',
}

// ─── Skeleton Loader ────────────────────────────────────────────────────────

function CategoriesSkeleton() {
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
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20 ml-auto" />
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-12" />
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

export function CategoriesView() {
  const [categories, setCategories] = useState<Category[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // ── Fetch Data ──────────────────────────────────────────────────────────

  const fetchCategories = useCallback(async (searchTerm?: string, page?: number) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchTerm) params.set('search', searchTerm)
      if (page) params.set('page', page.toString())
      else params.set('page', pagination.page.toString())
      params.set('limit', '50')

      const res = await fetch(`/api/categories?${params.toString()}`)
      const json = await res.json()
      if (!json.success) {
        toast.error('Failed to load categories')
        return
      }
      setCategories(json.data)
      setPagination(json.pagination)
    } catch {
      toast.error('Network error while loading categories')
    } finally {
      setLoading(false)
    }
  }, [pagination.page])

  useEffect(() => {
    fetchCategories()
  }, [])

  // ── Search Handler (debounced) ──────────────────────────────────────────

  function handleSearch(value: string) {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchCategories(value || undefined, 1)
    }, 400)
  }

  // ── Pagination ──────────────────────────────────────────────────────────

  function goToPage(page: number) {
    fetchCategories(search || undefined, page)
  }

  // ── Dialog Helpers ──────────────────────────────────────────────────────

  function openAddDialog() {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEditDialog(category: Category) {
    setEditingId(category.id)
    setForm({
      name: category.name,
      description: category.description ?? '',
    })
    setDialogOpen(true)
  }

  function openDeleteDialog(category: Category) {
    setDeleteId(category.id)
    setDeleteTarget(category)
    setDeleteOpen(true)
  }

  // ── CRUD Operations ─────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error('Category name is required')
      return
    }

    try {
      setSaving(true)
      const url = '/api/categories'
      const method = editingId ? 'PUT' : 'POST'
      const body = {
        ...(editingId ? { id: editingId } : {}),
        name: form.name.trim(),
        description: form.description.trim() || null,
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()

      if (json.success) {
        toast.success(editingId ? 'Category updated' : 'Category created')
        setDialogOpen(false)
        fetchCategories(search || undefined)
      } else {
        toast.error(json.error ?? 'Failed to save category')
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
      const res = await fetch(`/api/categories?id=${deleteId}`, { method: 'DELETE' })
      const json = await res.json()

      if (json.success) {
        toast.success('Category deleted')
        setDeleteOpen(false)
        setDeleteId(null)
        setDeleteTarget(null)
        fetchCategories(search || undefined)
      } else {
        toast.error(json.error ?? 'Failed to delete category')
      }
    } catch {
      toast.error('Network error while deleting')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading) return <CategoriesSkeleton />

  const hasLinkedProducts = deleteTarget ? (deleteTarget._count?.products ?? 0) > 0 : false

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Categories
            </h2>
            <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">
              {pagination.total}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Organize your products into categories for better management.
          </p>
        </div>
        <Button
          onClick={openAddDialog}
          className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search categories..."
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
                  <TableHead className="text-xs font-semibold">Category Name</TableHead>
                  <TableHead className="text-xs font-semibold">Description</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Products</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-right w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center text-center">
                        <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center mb-3">
                          <Tags className="h-6 w-6 text-amber-500" />
                        </div>
                        <p className="text-sm font-medium text-foreground">No categories found</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {search ? 'Try a different search term' : 'Add your first category to get started'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-semibold text-sm">
                        {category.name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {category.description || '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            (category._count?.products ?? 0) > 0
                              ? 'bg-amber-50 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0'
                              : 'bg-slate-50 text-slate-500 border-slate-200 text-[10px] px-1.5 py-0'
                          }
                        >
                          {category._count?.products ?? 0} product{(category._count?.products ?? 0) !== 1 ? 's' : ''}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            category.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0'
                              : 'bg-slate-50 text-slate-500 border-slate-200 text-[10px] px-1.5 py-0'
                          }
                        >
                          {category.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-amber-600"
                            onClick={() => openEditDialog(category)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-rose-600"
                            onClick={() => openDeleteDialog(category)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
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
                <Tags className="h-3.5 w-3.5 text-amber-600" />
              </div>
              {editingId ? 'Edit Category' : 'Add Category'}
            </DialogTitle>
          </DialogHeader>

          <Separator />

          <div className="space-y-4 py-1">
            {/* Category Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium">
                Category Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter category name"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-medium">
                Description
              </Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Enter a brief description (optional)"
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
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              {hasLinkedProducts ? (
                <span className="text-rose-600 font-medium">
                  Cannot delete &quot;{deleteTarget?.name}&quot; — it has {(deleteTarget?._count?.products ?? 0)} linked product{(deleteTarget?._count?.products ?? 0) !== 1 ? 's' : ''}. Please remove or reassign the products first.
                </span>
              ) : (
                <>
                  Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? It will be soft-deleted and can be restored later.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving || hasLinkedProducts}
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
