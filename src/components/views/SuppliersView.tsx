'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import {
  UserCog,
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

interface Supplier {
  id: number
  name: string
  contactPerson: string | null
  phone: string | null
  email: string | null
  address: string | null
  ntn: string | null
  isActive: boolean
  _count: { products: number }
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
  contactPerson: string
  phone: string
  email: string
  address: string
  ntn: string
}

const emptyForm: FormData = {
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  ntn: '',
}

// ─── Skeleton Loader ────────────────────────────────────────────────────────

function SuppliersSkeleton() {
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
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24 hidden md:block" />
              <Skeleton className="h-4 w-28 hidden md:block" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20 ml-auto" />
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20 hidden md:block" />
                <Skeleton className="h-4 w-24 hidden md:block" />
                <Skeleton className="h-4 w-10" />
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

export function SuppliersView() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteSupplier, setDeleteSupplier] = useState<Supplier | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // ── Fetch Data ──────────────────────────────────────────────────────────

  const fetchSuppliers = useCallback(async (searchTerm?: string, page?: number) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchTerm) params.set('search', searchTerm)
      if (page) params.set('page', page.toString())
      else params.set('page', pagination.page.toString())
      params.set('limit', '20')

      const res = await fetch(`/api/suppliers?${params.toString()}`)
      const json = await res.json()
      if (!json.success) {
        toast.error('Failed to load suppliers')
        return
      }
      setSuppliers(json.data)
      setPagination(json.pagination)
    } catch {
      toast.error('Network error while loading suppliers')
    } finally {
      setLoading(false)
    }
  }, [pagination.page])

  useEffect(() => {
    fetchSuppliers()
  }, [])

  // ── Search Handler (debounced) ──────────────────────────────────────────

  function handleSearch(value: string) {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchSuppliers(value || undefined, 1)
    }, 400)
  }

  // ── Pagination ──────────────────────────────────────────────────────────

  function goToPage(page: number) {
    fetchSuppliers(search || undefined, page)
  }

  // ── Dialog Helpers ──────────────────────────────────────────────────────

  function openAddDialog() {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEditDialog(supplier: Supplier) {
    setEditingId(supplier.id)
    setForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson ?? '',
      phone: supplier.phone ?? '',
      email: supplier.email ?? '',
      address: supplier.address ?? '',
      ntn: supplier.ntn ?? '',
    })
    setDialogOpen(true)
  }

  function openDeleteDialog(supplier: Supplier) {
    setDeleteId(supplier.id)
    setDeleteSupplier(supplier)
    setDeleteOpen(true)
  }

  // ── CRUD Operations ─────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error('Supplier name is required')
      return
    }

    try {
      setSaving(true)
      const url = '/api/suppliers'
      const method = editingId ? 'PUT' : 'POST'
      const body = {
        ...(editingId ? { id: editingId } : {}),
        name: form.name.trim(),
        contactPerson: form.contactPerson.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        ntn: form.ntn.trim() || null,
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()

      if (json.success) {
        toast.success(editingId ? 'Supplier updated' : 'Supplier created')
        setDialogOpen(false)
        fetchSuppliers(search || undefined)
      } else {
        toast.error(json.error ?? 'Failed to save supplier')
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
      const res = await fetch(`/api/suppliers?id=${deleteId}`, { method: 'DELETE' })
      const json = await res.json()

      if (json.success) {
        toast.success('Supplier deleted')
        setDeleteOpen(false)
        setDeleteId(null)
        setDeleteSupplier(null)
        fetchSuppliers(search || undefined)
      } else {
        toast.error(json.error ?? 'Failed to delete supplier')
      }
    } catch {
      toast.error('Network error while deleting')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading) return <SuppliersSkeleton />

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Suppliers
            </h2>
            <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">
              {pagination.total}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage your suppliers and vendor contacts.
          </p>
        </div>
        <Button
          onClick={openAddDialog}
          className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
        >
          <Plus className="h-4 w-4" />
          Add Supplier
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search suppliers..."
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
                  <TableHead className="text-xs font-semibold">Supplier Name</TableHead>
                  <TableHead className="text-xs font-semibold">Contact Person</TableHead>
                  <TableHead className="text-xs font-semibold hidden md:table-cell">Phone</TableHead>
                  <TableHead className="text-xs font-semibold hidden md:table-cell">Email</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Products</TableHead>
                  <TableHead className="text-xs font-semibold text-right w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center text-center">
                        <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center mb-3">
                          <UserCog className="h-6 w-6 text-amber-500" />
                        </div>
                        <p className="text-sm font-medium text-foreground">No suppliers found</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {search ? 'Try a different search term' : 'Add your first supplier to get started'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  suppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-semibold text-sm">
                        {supplier.name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {supplier.contactPerson ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                        {supplier.phone ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                        {supplier.email ?? '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        {supplier._count.products > 0 ? (
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0"
                          >
                            {supplier._count.products}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-amber-600"
                            onClick={() => openEditDialog(supplier)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-rose-600"
                            onClick={() => openDeleteDialog(supplier)}
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
                <UserCog className="h-3.5 w-3.5 text-amber-600" />
              </div>
              {editingId ? 'Edit Supplier' : 'Add Supplier'}
            </DialogTitle>
          </DialogHeader>

          <Separator />

          <div className="space-y-4 py-1">
            {/* Supplier Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium">
                Supplier Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter supplier name"
              />
            </div>

            {/* Contact Person */}
            <div className="space-y-1.5">
              <Label htmlFor="contactPerson" className="text-xs font-medium">
                Contact Person
              </Label>
              <Input
                id="contactPerson"
                value={form.contactPerson}
                onChange={(e) => setForm((prev) => ({ ...prev, contactPerson: e.target.value }))}
                placeholder="Enter contact person name"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-medium">
                Phone
              </Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="03001234567"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="supplier@example.com"
              />
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label htmlFor="address" className="text-xs font-medium">
                Address
              </Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Enter address"
              />
            </div>

            {/* NTN */}
            <div className="space-y-1.5">
              <Label htmlFor="ntn" className="text-xs font-medium">
                NTN
              </Label>
              <Input
                id="ntn"
                value={form.ntn}
                onChange={(e) => setForm((prev) => ({ ...prev, ntn: e.target.value }))}
                placeholder="1234567-8"
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
            <AlertDialogTitle>Delete Supplier</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteSupplier && deleteSupplier._count.products > 0 ? (
                <span className="text-rose-600 font-medium">
                  Cannot delete &ldquo;{deleteSupplier.name}&rdquo;. It has{' '}
                  {deleteSupplier._count.products} linked product{deleteSupplier._count.products > 1 ? 's' : ''}.
                  Please remove the linked products first.
                </span>
              ) : (
                <>
                  Are you sure you want to delete &ldquo;{deleteSupplier?.name}&rdquo;?
                  It will be soft-deleted and can be restored later.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            {deleteSupplier && deleteSupplier._count.products > 0 ? null : (
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
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
