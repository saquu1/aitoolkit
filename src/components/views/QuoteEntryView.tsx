'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import {
  FileSpreadsheet,
  Loader2,
  Trash2,
  Plus,
  CalendarDays,
  RefreshCw,
  ArrowRightLeft,
  MessageSquare,
  X,
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

interface QuoteDetail {
  id?: number
  productId: number
  qty: number
  price: number
  totalAmount: number
  lineGst: number
  lineComments?: string
  product?: Product
}

interface Quote {
  id: number
  quoteNo: string
  quoteDate: string
  accountId: number
  customerName?: string
  grossTotal: number
  discountAllow: number
  gst: number
  gstAmount: number
  grandTotal: number
  isActive: boolean
  convertedSaleId?: number
  quoteDetails?: QuoteDetail[]
  account?: Account
}

interface LineItem {
  _key: number
  productId: string
  qty: string
  price: string
  lineComments: string
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
function nextLineKey() {
  return ++lineKeyCounter
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function QuoteEntrySkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-7 w-36" />
      </div>
      <Card className="py-0 gap-0">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
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

export function QuoteEntryView() {
  const [customers, setCustomers] = useState<Account[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)

  // Form state
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [customerId, setCustomerId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [contactNo, setContactNo] = useState('')
  const [discount, setDiscount] = useState('')
  const [gstPercent, setGstPercent] = useState('')
  const [comments, setComments] = useState('')

  // Line items
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { _key: nextLineKey(), productId: '', qty: '', price: '', lineComments: '' },
  ])

  // UI state
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [convertingId, setConvertingId] = useState<number | null>(null)

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

  const fetchQuotes = useCallback(async () => {
    try {
      const res = await fetch('/api/quotes?limit=20')
      const json = await res.json()
      if (json.success) setQuotes(json.data)
    } catch {
      toast.error('Failed to load quotes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    Promise.all([fetchCustomers(), fetchProducts(), fetchQuotes()])
  }, [fetchCustomers, fetchProducts, fetchQuotes])

  // Derived calculations
  const grossTotal = lineItems.reduce((sum, item) => {
    const qty = Number(item.qty) || 0
    const price = Number(item.price) || 0
    return sum + qty * price
  }, 0)

  const gstAmount = grossTotal * (Number(gstPercent) || 0) / 100
  const discountAmount = Number(discount) || 0
  const grandTotal = grossTotal - discountAmount + gstAmount

  // Handle customer select
  function handleCustomerChange(val: string) {
    setCustomerId(val)
    const cust = customers.find((c) => c.id === Number(val))
    if (cust) {
      setCustomerName(cust.aname)
      setContactNo(cust.contactNo || '')
    }
  }

  // Handle product select in line item
  function handleLineProductChange(key: number, productId: string) {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item._key !== key) return item
        const prod = products.find((p) => p.id === Number(productId))
        return {
          ...item,
          productId,
          price: prod ? String(prod.salePrice) : item.price,
        }
      })
    )
  }

  // Line item CRUD
  function addLine() {
    setLineItems((prev) => [
      ...prev,
      { _key: nextLineKey(), productId: '', qty: '', price: '', lineComments: '' },
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
    setDiscount('')
    setGstPercent('')
    setComments('')
    setLineItems([
      { _key: nextLineKey(), productId: '', qty: '', price: '', lineComments: '' },
    ])
  }

  // Save quote
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
        price: Number(item.price) || 0,
        lineComments: item.lineComments.trim() || undefined,
      }))

      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteDate: formDate,
          accountId: Number(customerId),
          customerName: customerName.trim() || undefined,
          contactNo: contactNo.trim() || undefined,
          gst: Number(gstPercent) || 0,
          discountAllow: Number(discount) || 0,
          comments: comments.trim() || undefined,
          details,
        }),
      })

      const json = await res.json()
      if (!json.success) {
        toast.error(json.error || 'Failed to save quote')
        return
      }

      toast.success(`Quote ${json.data.quoteNo} created`)
      if (andNew) {
        resetForm()
      } else {
        resetForm()
      }
      fetchQuotes()
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  // Delete quote
  async function handleDelete() {
    if (!deletingId) return
    try {
      setDeleting(true)
      const res = await fetch(`/api/quotes?id=${deletingId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) { toast.error(json.error || 'Delete failed'); return }
      toast.success('Quote deleted')
      setDeleteOpen(false)
      fetchQuotes()
    } catch {
      toast.error('Network error')
    } finally {
      setDeleting(false)
    }
  }

  // Convert quote to sale
  async function handleConvert(quoteId: number) {
    try {
      setConvertingId(quoteId)
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'convert', quoteId }),
      })
      const json = await res.json()
      if (!json.success) {
        toast.error(json.error || 'Failed to convert quote')
        return
      }
      toast.success(json.message || 'Quote converted to sale')
      fetchQuotes()
    } catch {
      toast.error('Network error')
    } finally {
      setConvertingId(null)
    }
  }

  if (loading) return <QuoteEntrySkeleton />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-purple-100 flex items-center justify-center">
          <FileSpreadsheet className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Quotation</h2>
          <p className="text-xs text-muted-foreground">Create and manage customer quotations</p>
        </div>
      </div>

      {/* Quote Form */}
      <Card className="py-0 gap-0 border-purple-200">
        <CardContent className="p-6">
          {/* Header Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="q-date">Quote Date <span className="text-rose-500">*</span></Label>
              <div className="relative">
                <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="q-date" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="pl-9" />
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
              <Label htmlFor="q-contact">Contact</Label>
              <Input id="q-contact" placeholder="Auto-filled" value={contactNo} onChange={(e) => setContactNo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-discount">Discount (PKR)</Label>
              <Input id="q-discount" type="number" min="0" step="1" placeholder="0" value={discount} onChange={(e) => setDiscount(e.target.value)} className="text-right tabular-nums" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-gst">GST %</Label>
              <Input id="q-gst" type="number" min="0" max="100" step="0.1" placeholder="0" value={gstPercent} onChange={(e) => setGstPercent(e.target.value)} className="text-right tabular-nums" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-comments">Comments</Label>
              <Textarea id="q-comments" placeholder="Optional notes..." value={comments} onChange={(e) => setComments(e.target.value)} rows={1} />
            </div>
          </div>

          {/* Line Items */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold">Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine} className="h-7 text-xs border-purple-200 text-purple-700 hover:bg-purple-50">
                <Plus className="h-3.5 w-3.5 mr-1" />Add Row
              </Button>
            </div>

            <div className="rounded-lg border border-purple-100 overflow-hidden">
              <div className="max-h-64 overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-purple-50/60 hover:bg-purple-50/60">
                      <TableHead className="text-xs font-semibold w-[180px]">Product</TableHead>
                      <TableHead className="text-xs font-semibold text-right w-[80px]">Qty</TableHead>
                      <TableHead className="text-xs font-semibold text-right w-[100px]">Price</TableHead>
                      <TableHead className="text-xs font-semibold text-right w-[110px]">Total</TableHead>
                      <TableHead className="text-xs font-semibold text-right w-[100px]">GST</TableHead>
                      <TableHead className="text-xs font-semibold hidden md:table-cell">Comments</TableHead>
                      <TableHead className="text-xs font-semibold w-[40px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item) => {
                      const qty = Number(item.qty) || 0
                      const price = Number(item.price) || 0
                      const total = qty * price
                      const lineGst = total * (Number(gstPercent) || 0) / 100
                      return (
                        <TableRow key={item._key} className="group">
                          <TableCell>
                            <Select value={item.productId} onValueChange={(v) => handleLineProductChange(item._key, v)}>
                              <SelectTrigger className="h-8 text-xs w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>
                                {products.map((p) => (
                                  <SelectItem key={p.id} value={String(p.id)}>{p.pname}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input type="number" min="1" step="1" className="h-8 text-xs text-right tabular-nums w-full" value={item.qty} onChange={(e) => updateLine(item._key, 'qty', e.target.value)} />
                          </TableCell>
                          <TableCell>
                            <Input type="number" min="0" step="1" className="h-8 text-xs text-right tabular-nums w-full" value={item.price} onChange={(e) => updateLine(item._key, 'price', e.target.value)} />
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-xs tabular-nums font-medium">{total > 0 ? formatCurrency(total) : '—'}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-xs tabular-nums text-purple-600">{lineGst > 0 ? formatCurrency(lineGst) : '—'}</span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Input className="h-8 text-xs w-full" placeholder="—" value={item.lineComments} onChange={(e) => updateLine(item._key, 'lineComments', e.target.value)} />
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50" onClick={() => removeLine(item._key)} disabled={lineItems.length <= 1}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-4 flex flex-col items-end gap-1.5 p-4 rounded-lg bg-purple-50/50 border border-purple-100 max-w-xs ml-auto">
            <div className="flex justify-between w-full text-xs">
              <span className="text-muted-foreground">Gross Total</span>
              <span className="font-medium tabular-nums">{formatCurrency(grossTotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between w-full text-xs">
                <span className="text-muted-foreground">Discount</span>
                <span className="font-medium tabular-nums text-rose-600">-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            {gstAmount > 0 && (
              <div className="flex justify-between w-full text-xs">
                <span className="text-muted-foreground">GST Amount</span>
                <span className="font-medium tabular-nums text-purple-600">+{formatCurrency(gstAmount)}</span>
              </div>
            )}
            <Separator className="my-1" />
            <div className="flex justify-between w-full text-sm font-bold">
              <span>Grand Total</span>
              <span className="tabular-nums text-purple-700">{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button onClick={() => handleSave(false)} disabled={saving} className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm">
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}Save
            </Button>
            <Button onClick={() => handleSave(true)} disabled={saving} variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50">
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}<Plus className="h-4 w-4 mr-1.5" />Save &amp; New
            </Button>
            <Button onClick={resetForm} disabled={saving} variant="ghost" className="text-muted-foreground">
              <RefreshCw className="h-4 w-4 mr-1.5" />Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Recent Quotes */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Recent Quotes</h3>
          <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200 text-[10px] font-semibold tabular-nums">{quotes.length}</Badge>
        </div>

        {quotes.length === 0 ? (
          <Card className="py-0 gap-0">
            <CardContent className="p-8 flex flex-col items-center justify-center text-center">
              <div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center mb-3">
                <FileSpreadsheet className="h-6 w-6 text-purple-400" />
              </div>
              <p className="text-sm font-medium text-foreground">No quotations yet</p>
              <p className="text-xs text-muted-foreground mt-1">Create your first quotation above.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-xs font-semibold">Quote No</TableHead>
                    <TableHead className="text-xs font-semibold">Date</TableHead>
                    <TableHead className="text-xs font-semibold">Customer</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Total</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((q) => (
                    <TableRow key={q.id} className="group">
                      <TableCell>
                        <span className="text-xs font-mono font-semibold text-purple-600">{q.quoteNo}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs tabular-nums">{format(parseISO(q.quoteDate), 'dd MMM yyyy')}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium">{q.account?.aname || q.customerName || '—'}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-xs tabular-nums font-semibold">{formatCurrency(q.grandTotal)}</span>
                      </TableCell>
                      <TableCell>
                        {q.convertedSaleId ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-semibold hover:bg-emerald-100">Converted</Badge>
                        ) : q.isActive ? (
                          <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[10px] font-semibold hover:bg-purple-100">Active</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!q.convertedSaleId && q.isActive && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] border-purple-200 text-purple-700 hover:bg-purple-50 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleConvert(q.id)}
                              disabled={convertingId === q.id}
                            >
                              {convertingId === q.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <ArrowRightLeft className="h-3 w-3 mr-1" />}
                              Convert to Sale
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => { setDeletingId(q.id); setDeleteOpen(true) }}
                            disabled={!!q.convertedSaleId}
                            title={q.convertedSaleId ? 'Cannot delete converted quote' : 'Delete'}
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
            <AlertDialogTitle>Delete Quotation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this quotation? This action cannot be undone.
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
