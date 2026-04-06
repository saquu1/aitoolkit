'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import {
  UsersRound,
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

interface Customer {
  id: number
  name: string
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  ntn: string | null
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
  name: string
  phone: string
  email: string
  address: string
  city: string
  ntn: string
}

const emptyForm: FormData = {
  name: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  ntn: '',
}

// ─── Skeleton Loader ────────────────────────────────────────────────────────

function CustomersSkeleton() {
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
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-28 hidden md:block" />
              <Skeleton className="h-4 w-20 hidden md:block" />
              <Skeleton className="h-4 w-20 hidden md:block" />
              <Skeleton className="h-4 w-20 ml-auto" />
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28 hidden md:block" />
                <Skeleton className="h-4 w-16 hidden md:block" />
                <Skeleton className="h-4 w-16 hidden md:block" />
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

export function CustomersView() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 })
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

  const fetchCustomers = useCallback(async (searchTerm?: string, page?: number) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchTerm) params.set('search', searchTerm)
      if (page) params.set('page', page.toString())
      else params.set('page', pagination.page.toString())
      params.set('limit', '50')

      const res = await fetch(`/api/customers?${params.toString()}`)
      const json = await res.json()
      if (!json.success) {
        toast.error('Failed to load customers')
        return
      }
      setCustomers(json.data)
      setPagination(json.pagination)
    } catch {
      toast.error('Network error while loading customers')
    } finally {
      setLoading(false)
    }
  }, [pagination.page])

  useEffect(() => {
    fetchCustomers()
  }, [])

  // ── Search Handler (debounced) ──────────────────────────────────────────

  function handleSearch(value: string) {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchCustomers(value || undefined, 1)
    }, 400)
  }

  // ── Pagination ──────────────────────────────────────────────────────────

  function goToPage(page: number) {
    fetchCustomers(search || undefined, page)
  }

  // ── Dialog Helpers ──────────────────────────────────────────────────────

  function openAddDialog() {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEditDialog(customer: Customer) {
    setEditingId(customer.id)
    setForm({
      name: customer.name,
      phone: customer.phone ?? '',
      email: customer.email ?? '',
      address: customer.address ?? '',
      city: customer.city ?? '',
      ntn: customer.ntn ?? '',
    })
    setDialogOpen(true)
  }

  function openDeleteDialog(id: number) {
    setDeleteId(id)
    setDeleteOpen(true)
  }

  // ── CRUD Operations ─────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error('Customer name is required')
      return
    }

    try {
      setSaving(true)
      const url = '/api/customers'
      const method = editingId ? 'PUT' : 'POST'
      const body = {
        ...(editingId ? { id: editingId } : {}),
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        ntn: form.ntn.trim() || null,
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()

      if (json.success) {
        toast.success(editingId ? 'Customer updated' : 'Customer created')
        setDialogOpen(false)
        fetchCustomers(search || undefined)
      } else {
        toast.error(json.error ?? 'Failed to save customer')
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
      const res = await fetch(`/api/customers?id=${deleteId}`, { method: 'DELETE' })
      const json = await res.json()

      if (json.success) {
        toast.success('Customer deleted')
        setDeleteOpen(false)
        setDeleteId(null)
        fetchCustomers(search || undefined)
      } else {
        toast.error(json.error ?? 'Failed to delete customer')
      }
    } catch {
      toast.error('Network error while deleting')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading) return <CustomersSkeleton />

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Customers
            </h2>
            <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">
              {pagination.total}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage your retail customer directory with contact details.
          </p>
        </div>
        <Button
          onClick={openAddDialog}
          className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
        >
          <Plus className="h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search customers..."
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
                  <TableHead className="text-xs font-semibold">Customer Name</TableHead>
                  <TableHead className="text-xs font-semibold">Phone</TableHead>
                  <TableHead className="text-xs font-semibold hidden md:table-cell">Email</TableHead>
                  <TableHead className="text-xs font-semibold hidden md:table-cell">City</TableHead>
                  <TableHead className="text-xs font-semibold hidden md:table-cell">NTN</TableHead>
                  <TableHead className="text-xs font-semibold text-right w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center text-center">
                        <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center mb-3">
                          <UsersRound className="h-6 w-6 text-amber-500" />
                        </div>
                        <p className="text-sm font-medium text-foreground">No customers found</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {search ? 'Try a different search term' : 'Add your first customer to get started'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-semibold text-sm">
                        {customer.name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {customer.phone || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                        {customer.email || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                        {customer.city || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                        {customer.ntn ? (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-50 border-slate-200 font-mono">
                            {customer.ntn}
                          </Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-amber-600"
                            onClick={() => openEditDialog(customer)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-rose-600"
                            onClick={() => openDeleteDialog(customer.id)}
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
                <UsersRound className="h-3.5 w-3.5 text-amber-600" />
              </div>
              {editingId ? 'Edit Customer' : 'Add Customer'}
            </DialogTitle>
          </DialogHeader>

          <Separator />

          <div className="space-y-4 py-1">
            {/* Customer Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium">
                Customer Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter customer name"
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
                placeholder="ali@example.com"
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
                placeholder="Street address"
              />
            </div>

            {/* City */}
            <div className="space-y-1.5">
              <Label htmlFor="city" className="text-xs font-medium">
                City
              </Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                placeholder="e.g. Lahore"
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
                placeholder="National Tax Number"
                className="font-mono"
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
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this customer? It will be soft-deleted (isActive set to false) and can be restored later.
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
