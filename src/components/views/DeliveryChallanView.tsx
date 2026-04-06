'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import {
  PackageCheck,
  Loader2,
  Trash2,
  Plus,
  CalendarDays,
  RefreshCw,
  CheckCircle2,
  X,
  Link2,
  MapPin,
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
  punit: string
  salePrice: number
}

interface Account {
  id: number
  aname: string
  atype: string
  contactNo?: string
}

interface Sale {
  id: number
  saleNo: string
  saleDate: string
  grandTotal: number
  accountId: number
  customerName?: string
  account?: { id: number; aname: string }
}

interface DCDetail {
  id?: number
  productId: number
  qty: number
  lineComments?: string
  product?: Product
}

interface DeliveryChallan {
  id: number
  dcNo: string
  dcDate: string
  accountId: number
  saleId?: number | null
  customerName?: string
  contactNo?: string
  address?: string
  comments?: string
  isDelivered: boolean
  dcDetails?: DCDetail[]
  account?: Account
}

interface LineItem {
  _key: number
  productId: string
  qty: string
  lineComments: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

let lineKeyCounter = 0
function nextLineKey() {
  return ++lineKeyCounter
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function DeliveryChallanSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-7 w-40" />
      </div>
      <Card className="py-0 gap-0">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
          <Skeleton className="h-40 w-full mt-6" />
          <div className="flex gap-3 mt-6">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-24" />
          </div>
        </CardContent>
      </Card>
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <div className="rounded-lg border">
          <div className="border-b px-4 py-3 flex gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border-b px-4 py-3 flex gap-4">
              {Array.from({ length: 6 }).map((_, j) => (
                <Skeleton key={j} className="h-4 w-20" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function DeliveryChallanView() {
  const [customers, setCustomers] = useState<Account[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [dcs, setDcs] = useState<DeliveryChallan[]>([])
  const [loading, setLoading] = useState(true)

  // Form state
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [customerId, setCustomerId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [contactNo, setContactNo] = useState('')
  const [address, setAddress] = useState('')
  const [comments, setComments] = useState('')
  const [linkedSaleId, setLinkedSaleId] = useState('')

  // Line items
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { _key: nextLineKey(), productId: '', qty: '', lineComments: '' },
  ])

  // UI state
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deliveringId, setDeliveringId] = useState<number | null>(null)

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch('/api/accounts?atype=CUSTOMER&isActive=true&limit=200')
      const json = await res.json()
      if (json.success) setCustomers(json.data)
    } catch {
      toast.error('Failed to load customers')
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

  const fetchSales = useCallback(async () => {
    try {
      const res = await fetch('/api/sales?transType=SALE&limit=200')
      const json = await res.json()
      if (json.success) setSales(json.data || [])
    } catch {
      // Silently ignore — sales linking is optional
    }
  }, [])

  const fetchDCs = useCallback(async () => {
    try {
      const res = await fetch('/api/delivery-challans?limit=20')
      const json = await res.json()
      if (json.success) setDcs(json.data)
    } catch {
      toast.error('Failed to load delivery challans')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    Promise.all([fetchCustomers(), fetchProducts(), fetchSales(), fetchDCs()])
  }, [fetchCustomers, fetchProducts, fetchSales, fetchDCs])

  // Handle customer select — auto-fill contact
  function handleCustomerChange(val: string) {
    setCustomerId(val)
    const cust = customers.find((c) => c.id === Number(val))
    if (cust) {
      setCustomerName(cust.aname)
      setContactNo(cust.contactNo || '')
    }
  }

  // Handle linked sale select — filter sales for the selected customer
  const filteredSales = sales.filter((s) => {
    if (!customerId) return true
    return s.accountId === Number(customerId) || s.account?.id === Number(customerId)
  })

  // Line item operations
  function addLine() {
    setLineItems((prev) => [
      ...prev,
      { _key: nextLineKey(), productId: '', qty: '', lineComments: '' },
    ])
  }

  function removeLine(key: number) {
    setLineItems((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((item) => item._key !== key)
    })
  }

  function updateLine(key: number, field: keyof LineItem, value: string) {
    setLineItems((prev) =>
      prev.map((item) => (item._key === key ? { ...item, [field]: value } : item))
    )
  }

  function resetForm() {
    setFormDate(format(new Date(), 'yyyy-MM-dd'))
    setCustomerId('')
    setCustomerName('')
    setContactNo('')
    setAddress('')
    setComments('')
    setLinkedSaleId('')
    setLineItems([
      { _key: nextLineKey(), productId: '', qty: '', lineComments: '' },
    ])
  }

  // Save DC
  async function handleSave(andNew = false) {
    if (!formDate) { toast.error('Date is required'); return }
    if (!customerId) { toast.error('Please select a customer'); return }

    const validItems = lineItems.filter((item) => item.productId && Number(item.qty) > 0)
    if (validItems.length === 0) {
      toast.error('Add at least one line item with a product and quantity')
      return
    }

    try {
      setSaving(true)
      const details = validItems.map((item) => ({
        productId: Number(item.productId),
        qty: Number(item.qty),
        lineComments: item.lineComments.trim() || undefined,
      }))

      const res = await fetch('/api/delivery-challans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dcDate: formDate,
          accountId: Number(customerId),
          customerName: customerName.trim() || undefined,
          contactNo: contactNo.trim() || undefined,
          address: address.trim() || undefined,
          comments: comments.trim() || undefined,
          saleId: linkedSaleId ? Number(linkedSaleId) : undefined,
          details,
        }),
      })

      const json = await res.json()
      if (!json.success) {
        toast.error(json.error || 'Failed to save delivery challan')
        return
      }

      toast.success(`Delivery Challan ${json.data.dcNo} created`)
      if (andNew) {
        resetForm()
      } else {
        resetForm()
      }
      fetchDCs()
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  // Delete DC
  async function handleDelete() {
    if (!deletingId) return
    try {
      setDeleting(true)
      const res = await fetch(`/api/delivery-challans?id=${deletingId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) { toast.error(json.error || 'Delete failed'); return }
      toast.success('Delivery challan deleted')
      setDeleteOpen(false)
      fetchDCs()
    } catch {
      toast.error('Network error')
    } finally {
      setDeleting(false)
    }
  }

  // Mark as delivered
  async function handleMarkDelivered(dcId: number) {
    try {
      setDeliveringId(dcId)
      const res = await fetch('/api/delivery-challans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: dcId, isDelivered: true }),
      })
      const json = await res.json()
      if (!json.success) {
        toast.error(json.error || 'Failed to update')
        return
      }
      toast.success('Marked as delivered')
      fetchDCs()
    } catch {
      toast.error('Network error')
    } finally {
      setDeliveringId(null)
    }
  }

  if (loading) return <DeliveryChallanSkeleton />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-teal-100 flex items-center justify-center">
          <PackageCheck className="h-5 w-5 text-teal-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Delivery Challan</h2>
          <p className="text-xs text-muted-foreground">Create and manage delivery challans for shipments</p>
        </div>
      </div>

      {/* DC Form */}
      <Card className="py-0 gap-0 border-teal-200">
        <CardContent className="p-6">
          {/* Header Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="dc-date">DC Date <span className="text-rose-500">*</span></Label>
              <div className="relative">
                <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="dc-date" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="pl-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Customer <span className="text-rose-500">*</span></Label>
              <Select value={customerId} onValueChange={handleCustomerChange}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.aname}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dc-contact">Contact</Label>
              <Input id="dc-contact" placeholder="Auto-filled" value={contactNo} onChange={(e) => setContactNo(e.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="dc-address">
                <MapPin className="h-3.5 w-3.5 inline mr-1" />
                Delivery Address
              </Label>
              <Input id="dc-address" placeholder="Customer delivery address..." value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dc-sale">
                <Link2 className="h-3.5 w-3.5 inline mr-1" />
                Link to Sale (Optional)
              </Label>
              <Select value={linkedSaleId} onValueChange={setLinkedSaleId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {filteredSales.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.saleNo} — {s.account?.aname || s.customerName || 'N/A'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-3">
              <Label htmlFor="dc-comments">Comments</Label>
              <Textarea id="dc-comments" placeholder="Delivery instructions or notes..." value={comments} onChange={(e) => setComments(e.target.value)} rows={2} />
            </div>
          </div>

          {/* Line Items */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold">Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine} className="h-7 text-xs border-teal-200 text-teal-700 hover:bg-teal-50">
                <Plus className="h-3.5 w-3.5 mr-1" />Add Row
              </Button>
            </div>

            <div className="rounded-lg border border-teal-100 overflow-hidden">
              <div className="max-h-64 overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-teal-50/60 hover:bg-teal-50/60">
                      <TableHead className="text-xs font-semibold w-[200px]">Product</TableHead>
                      <TableHead className="text-xs font-semibold text-right w-[100px]">Quantity</TableHead>
                      <TableHead className="text-xs font-semibold hidden md:table-cell">Line Comments</TableHead>
                      <TableHead className="text-xs font-semibold w-[40px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item) => (
                      <TableRow key={item._key} className="group">
                        <TableCell>
                          <Select value={item.productId} onValueChange={(v) => updateLine(item._key, 'productId', v)}>
                            <SelectTrigger className="h-8 text-xs w-full"><SelectValue placeholder="Select product" /></SelectTrigger>
                            <SelectContent>
                              {products.map((p) => (
                                <SelectItem key={p.id} value={String(p.id)}>
                                  {p.pname} ({p.punit})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            className="h-8 text-xs text-right tabular-nums w-full"
                            value={item.qty}
                            onChange={(e) => updateLine(item._key, 'qty', e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Input
                            className="h-8 text-xs w-full"
                            placeholder="—"
                            value={item.lineComments}
                            onChange={(e) => updateLine(item._key, 'lineComments', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                            onClick={() => removeLine(item._key)}
                            disabled={lineItems.length <= 1}
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
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button onClick={() => handleSave(false)} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm">
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}Save
            </Button>
            <Button onClick={() => handleSave(true)} disabled={saving} variant="outline" className="border-teal-200 text-teal-700 hover:bg-teal-50">
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}<Plus className="h-4 w-4 mr-1.5" />Save &amp; New
            </Button>
            <Button onClick={resetForm} disabled={saving} variant="ghost" className="text-muted-foreground">
              <RefreshCw className="h-4 w-4 mr-1.5" />Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Recent Delivery Challans */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Recent Delivery Challans</h3>
          <Badge variant="secondary" className="bg-teal-100 text-teal-700 border-teal-200 text-[10px] font-semibold tabular-nums">{dcs.length}</Badge>
        </div>

        {dcs.length === 0 ? (
          <Card className="py-0 gap-0">
            <CardContent className="p-8 flex flex-col items-center justify-center text-center">
              <div className="h-12 w-12 rounded-full bg-teal-50 flex items-center justify-center mb-3">
                <PackageCheck className="h-6 w-6 text-teal-400" />
              </div>
              <p className="text-sm font-medium text-foreground">No delivery challans yet</p>
              <p className="text-xs text-muted-foreground mt-1">Create your first delivery challan above.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-xs font-semibold">DC No</TableHead>
                    <TableHead className="text-xs font-semibold">Date</TableHead>
                    <TableHead className="text-xs font-semibold">Customer</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Products</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dcs.map((dc) => (
                    <TableRow key={dc.id} className="group">
                      <TableCell>
                        <span className="text-xs font-mono font-semibold text-teal-600">{dc.dcNo}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs tabular-nums">{format(parseISO(dc.dcDate), 'dd MMM yyyy')}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium">{dc.account?.aname || dc.customerName || '—'}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-xs tabular-nums">
                          {dc.dcDetails?.length || 0} item{(dc.dcDetails?.length || 0) !== 1 ? 's' : ''}
                        </span>
                      </TableCell>
                      <TableCell>
                        {dc.isDelivered ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-semibold hover:bg-emerald-100">
                            <CheckCircle2 className="h-3 w-3 mr-1" />Delivered
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] font-semibold hover:bg-amber-100">
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!dc.isDelivered && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] border-teal-200 text-teal-700 hover:bg-teal-50 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleMarkDelivered(dc.id)}
                              disabled={deliveringId === dc.id}
                            >
                              {deliveringId === dc.id ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                              )}
                              Mark Delivered
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => { setDeletingId(dc.id); setDeleteOpen(true) }}
                            disabled={dc.isDelivered}
                            title={dc.isDelivered ? 'Cannot delete delivered challan' : 'Delete'}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Delivery Challan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this delivery challan? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-rose-500 hover:bg-rose-600 text-white">
              {deleting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgb(203 213 225 / 0.6); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgb(148 163 184 / 0.8); }
      `}</style>
    </div>
  )
}
