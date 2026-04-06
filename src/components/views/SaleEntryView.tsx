'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import {
  ShoppingCart,
  Loader2,
  Trash2,
  Plus,
  CalendarDays,
  RefreshCw,
  Search,
  Package,
  Users,
  FileText,
  CreditCard,
  MessageSquare,
  Hash,
  Phone,
  User,
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
  openQty?: number
}

interface Account {
  id: number
  aname: string
  atype: string
  isActive: boolean
  contactNo?: string
  address?: string
}

interface CompanyInfo {
  gstEnabled: boolean
  defaultGstPercent: number
  saleTitle?: string
  saleFooter?: string
}

interface SaleDetail {
  id?: number
  productId: number
  qtyOut: number
  salePrice: number
  costPrice: number
  totalAmount: number
  lineGst: number
  lineComments?: string
  packNo?: string
  product?: Product
}

interface SaleMaster {
  id: number
  saleNo: string
  saleDate: string
  accountId: number
  transType: string
  customerName?: string
  contactNo?: string
  grossTotal: number
  discountAllow: number
  gst: number
  gstAmount: number
  grandTotal: number
  isPaid: boolean
  comments?: string
  saleDetails?: SaleDetail[]
  account?: Account
}

// Line item form row (uses a local key for React rendering)
interface LineItem {
  _key: number
  productId: string
  qty: string
  salePrice: string
  costPrice: string
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
function nextLineKey(): number {
  lineKeyCounter += 1
  return lineKeyCounter
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function SaleEntrySkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-44" />
      </div>

      {/* Form card */}
      <Card className="py-0 gap-0">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="flex gap-3 mt-6">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-24" />
          </div>
        </CardContent>
      </Card>

      {/* Line items */}
      <Card className="py-0 gap-0">
        <CardContent className="p-6">
          <Skeleton className="h-5 w-28 mb-4" />
          <div className="rounded-lg border">
            <div className="border-b px-4 py-3 flex gap-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border-b px-4 py-3 flex gap-3 items-center">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
          <Skeleton className="h-12 w-full mt-4" />
          <div className="flex gap-3 mt-4">
            <Skeleton className="h-10 w-28" />
          </div>
        </CardContent>
      </Card>

      {/* Recent sales table */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-44" />
        <div className="rounded-lg border">
          <div className="border-b px-4 py-3 flex gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16 ml-auto" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border-b px-4 py-3 flex gap-4 items-center">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function SaleEntryView() {
  // ─── Data state ─────────────────────────────────────────────────────────
  const [customers, setCustomers] = useState<Account[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null)
  const [recentSales, setRecentSales] = useState<SaleMaster[]>([])
  const [loading, setLoading] = useState(true)

  // ─── Form state ─────────────────────────────────────────────────────────
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [customerId, setCustomerId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [contactNo, setContactNo] = useState('')
  const [idCard, setIdCard] = useState('')
  const [poRefNo, setPoRefNo] = useState('')
  const [discountAllow, setDiscountAllow] = useState('0')
  const [gstPercent, setGstPercent] = useState('0')
  const [comments, setComments] = useState('')
  const [saving, setSaving] = useState(false)

  // ─── Line items state ───────────────────────────────────────────────────
  const [lineItems, setLineItems] = useState<LineItem[]>([])

  // ─── Product search ─────────────────────────────────────────────────────
  const [productSearch, setProductSearch] = useState('')

  // ─── Delete dialog state ────────────────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deletingSale, setDeletingSale] = useState<SaleMaster | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ─── Fetch data ─────────────────────────────────────────────────────────
  const fetchInitialData = useCallback(async () => {
    try {
      const [custRes, prodRes, compRes, salesRes] = await Promise.all([
        fetch('/api/accounts?atype=CUSTOMER&isActive=true&limit=200'),
        fetch('/api/products?isActive=true&limit=200'),
        fetch('/api/company'),
        fetch('/api/sales?transType=SALE'),
      ])

      const [custJson, prodJson, compJson, salesJson] = await Promise.all([
        custRes.json(),
        prodRes.json(),
        compRes.json(),
        salesRes.json(),
      ])

      if (custJson.success) setCustomers(custJson.data)
      if (prodJson.success) setProducts(prodJson.data)
      if (compJson.success) {
        setCompanyInfo(compJson.data)
        if (compJson.data.gstEnabled) {
          setGstPercent(String(compJson.data.defaultGstPercent || 0))
        }
      }
      if (salesJson.success) setRecentSales(salesJson.data)
    } catch {
      toast.error('Failed to load initial data')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchRecentSales = useCallback(async () => {
    try {
      const res = await fetch('/api/sales?transType=SALE')
      const json = await res.json()
      if (json.success) setRecentSales(json.data)
    } catch {
      toast.error('Failed to load recent sales')
    }
  }, [])

  useEffect(() => {
    fetchInitialData()
  }, [fetchInitialData])

  // ─── Customer auto-fill ─────────────────────────────────────────────────
  useEffect(() => {
    if (customerId) {
      const customer = customers.find((c) => c.id === Number(customerId))
      if (customer) {
        setCustomerName(customer.aname)
        setContactNo(customer.contactNo || '')
      }
    }
  }, [customerId, customers])

  // ─── Line item helpers ──────────────────────────────────────────────────
  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      {
        _key: nextLineKey(),
        productId: '',
        qty: '1',
        salePrice: '0',
        costPrice: '0',
        lineComments: '',
      },
    ])
  }

  function removeLineItem(key: number) {
    setLineItems((prev) => prev.filter((item) => item._key !== key))
  }

  function updateLineItem(key: number, field: keyof LineItem, value: string) {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item._key !== key) return item
        const updated = { ...item, [field]: value }
        // Auto-fill prices when product is selected
        if (field === 'productId' && value) {
          const product = products.find((p) => p.id === Number(value))
          if (product) {
            updated.salePrice = String(product.salePrice)
            updated.costPrice = String(product.costPrice)
          }
        }
        return updated
      })
    )
  }

  // ─── Calculations ───────────────────────────────────────────────────────
  function calcLineTotal(item: LineItem): number {
    return (Number(item.qty) || 0) * (Number(item.salePrice) || 0)
  }

  function calcLineGst(item: LineItem): number {
    return calcLineTotal(item) * (Number(gstPercent) || 0) / 100
  }

  const grossTotal = lineItems.reduce((sum, item) => sum + calcLineTotal(item), 0)
  const gstAmount = lineItems.reduce((sum, item) => sum + calcLineGst(item), 0)
  const discount = Number(discountAllow) || 0
  const grandTotal = grossTotal - discount + gstAmount

  // ─── Filtered products for dropdown ─────────────────────────────────────
  const filteredProducts = productSearch
    ? products.filter(
        (p) =>
          p.pname.toLowerCase().includes(productSearch.toLowerCase()) ||
          (p.pcode && p.pcode.toLowerCase().includes(productSearch.toLowerCase()))
      )
    : products

  // ─── Form actions ───────────────────────────────────────────────────────
  function resetForm() {
    setFormDate(format(new Date(), 'yyyy-MM-dd'))
    setCustomerId('')
    setCustomerName('')
    setContactNo('')
    setIdCard('')
    setPoRefNo('')
    setDiscountAllow('0')
    if (companyInfo?.gstEnabled) {
      setGstPercent(String(companyInfo.defaultGstPercent || 0))
    } else {
      setGstPercent('0')
    }
    setComments('')
    setLineItems([])
    setProductSearch('')
  }

  async function handleSave(andNew = false) {
    // Validation
    if (!formDate) {
      toast.error('Date is required')
      return
    }
    if (!customerId) {
      toast.error('Please select a customer')
      return
    }
    if (lineItems.length === 0) {
      toast.error('Add at least one line item')
      return
    }

    const validLines = lineItems.filter(
      (item) => item.productId && Number(item.qty) > 0
    )
    if (validLines.length === 0) {
      toast.error('All line items must have a product and quantity')
      return
    }

    try {
      setSaving(true)

      const details = validLines.map((item) => ({
        productId: Number(item.productId),
        qtyOut: Number(item.qty),
        salePrice: Number(item.salePrice) || 0,
        costPrice: Number(item.costPrice) || 0,
        totalAmount: calcLineTotal(item),
        lineGst: calcLineGst(item),
        lineComments: item.lineComments.trim() || undefined,
      }))

      const body = {
        saleDate: formDate,
        accountId: Number(customerId),
        transType: 'SALE',
        customerName: customerName.trim() || undefined,
        contactNo: contactNo.trim() || undefined,
        idCard: idCard.trim() || undefined,
        discountAllow: discount,
        gst: Number(gstPercent) || 0,
        comments: comments.trim() || undefined,
        poRefNo: poRefNo.trim() || undefined,
        details,
      }

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const json = await res.json()
      if (!json.success) {
        toast.error(json.error || 'Failed to save sale')
        return
      }

      toast.success(
        `Sale ${json.data.saleNo} saved — ${formatCurrency(json.data.grandTotal)}`
      )

      if (andNew) {
        // Keep customer, reset line items and amounts
        setLineItems([])
        setDiscountAllow('0')
        setComments('')
        setIdCard('')
        setPoRefNo('')
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
      toast.success(`Sale ${deletingSale?.saleNo || ''} deleted`)
      setDeleteOpen(false)
      setDeletingId(null)
      setDeletingSale(null)
      fetchRecentSales()
    } catch {
      toast.error('Network error')
    } finally {
      setDeleting(false)
    }
  }

  function openDeleteDialog(sale: SaleMaster) {
    setDeletingId(sale.id)
    setDeletingSale(sale)
    setDeleteOpen(true)
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  if (loading) return <SaleEntrySkeleton />

  return (
    <div className="space-y-6">
      {/* ═══ Page Header ═══ */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-orange-100 flex items-center justify-center">
          <ShoppingCart className="h-5 w-5 text-orange-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Sale Entry
          </h2>
          <p className="text-xs text-muted-foreground">
            Credit sales to customers
          </p>
        </div>
        {companyInfo?.gstEnabled && (
          <Badge
            variant="secondary"
            className="ml-auto bg-orange-100 text-orange-700 border-orange-200 text-[10px] font-semibold"
          >
            GST Enabled
          </Badge>
        )}
      </div>

      {/* ═══ Form Card ═══ */}
      <Card className="py-0 gap-0 border-orange-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="h-4 w-4 text-orange-600" />
            <h3 className="text-sm font-semibold text-foreground">
              New Credit Sale
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="sale-date">
                Date <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="sale-date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Customer Select */}
            <div className="space-y-1.5">
              <Label>
                Customer <span className="text-rose-500">*</span>
              </Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Select customer" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.aname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Customer Name (auto-filled, editable) */}
            <div className="space-y-1.5">
              <Label htmlFor="sale-cust-name" className="flex items-center gap-1.5">
                <User className="h-3 w-3 text-muted-foreground" />
                Customer Name
              </Label>
              <Input
                id="sale-cust-name"
                placeholder="Auto-filled from selection"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>

            {/* Contact No */}
            <div className="space-y-1.5">
              <Label htmlFor="sale-contact" className="flex items-center gap-1.5">
                <Phone className="h-3 w-3 text-muted-foreground" />
                Contact No
              </Label>
              <Input
                id="sale-contact"
                placeholder="Auto-filled from selection"
                value={contactNo}
                onChange={(e) => setContactNo(e.target.value)}
              />
            </div>

            {/* ID Card */}
            <div className="space-y-1.5">
              <Label htmlFor="sale-idcard" className="flex items-center gap-1.5">
                <CreditCard className="h-3 w-3 text-muted-foreground" />
                ID Card
              </Label>
              <Input
                id="sale-idcard"
                placeholder="Optional"
                value={idCard}
                onChange={(e) => setIdCard(e.target.value)}
              />
            </div>

            {/* PO Reference No */}
            <div className="space-y-1.5">
              <Label htmlFor="sale-poref" className="flex items-center gap-1.5">
                <Hash className="h-3 w-3 text-muted-foreground" />
                PO Reference No
              </Label>
              <Input
                id="sale-poref"
                placeholder="Optional"
                value={poRefNo}
                onChange={(e) => setPoRefNo(e.target.value)}
              />
            </div>

            {/* Discount Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="sale-discount">
                Discount Amount (PKR)
              </Label>
              <Input
                id="sale-discount"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={discountAllow}
                onChange={(e) => setDiscountAllow(e.target.value)}
                className="text-right tabular-nums"
              />
            </div>

            {/* GST % */}
            <div className="space-y-1.5">
              <Label htmlFor="sale-gst" className="flex items-center gap-1.5">
                GST %
                {companyInfo?.gstEnabled && (
                  <Badge
                    variant="secondary"
                    className="text-[9px] bg-orange-50 text-orange-600 border-orange-100"
                  >
                    from settings
                  </Badge>
                )}
              </Label>
              <Input
                id="sale-gst"
                type="number"
                min="0"
                max="100"
                step="0.5"
                placeholder="0"
                value={gstPercent}
                onChange={(e) => setGstPercent(e.target.value)}
                className="text-right tabular-nums"
              />
            </div>
          </div>

          {/* Comments */}
          <div className="space-y-1.5 mt-4">
            <Label htmlFor="sale-comments" className="flex items-center gap-1.5">
              <MessageSquare className="h-3 w-3 text-muted-foreground" />
              Comments
            </Label>
            <Textarea
              id="sale-comments"
              placeholder="Optional notes..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={2}
            />
          </div>

          {/* Info bar */}
          <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground bg-orange-50 rounded-lg px-3 py-2 border border-orange-100">
            <FileText className="h-3.5 w-3.5 text-orange-500" />
            <span>
              Credit sale creates a receivable entry. Customer balance will be
              updated automatically.
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
            >
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Save
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={saving}
              variant="outline"
              className="border-orange-300 text-orange-700 hover:bg-orange-50"
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

      {/* ═══ Line Items Section ═══ */}
      <Card className="py-0 gap-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Package className="h-4 w-4 text-orange-600" />
              Line Items
              {lineItems.length > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] font-semibold tabular-nums"
                >
                  {lineItems.length}
                </Badge>
              )}
            </h3>
            <Button
              type="button"
              onClick={addLineItem}
              size="sm"
              variant="outline"
              className="border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Item
            </Button>
          </div>

          {lineItems.length === 0 ? (
            <div className="text-center py-10 border border-dashed rounded-lg">
              <Package className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No line items added yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Click &quot;Add Item&quot; to start adding products
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden lg:block rounded-lg border overflow-hidden">
                <div className="max-h-96 overflow-y-auto custom-scrollbar">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="text-xs font-semibold min-w-[200px]">
                          Product
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-right w-[80px]">
                          Qty
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-right w-[120px]">
                          Sale Price
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-right w-[120px]">
                          Cost Price
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-right w-[120px]">
                          Total
                        </TableHead>
                        {(Number(gstPercent) || 0) > 0 && (
                          <TableHead className="text-xs font-semibold text-right w-[100px]">
                            GST
                          </TableHead>
                        )}
                        <TableHead className="text-xs font-semibold min-w-[140px]">
                          Comments
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-right w-[50px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.map((item) => (
                        <TableRow key={item._key}>
                          <TableCell>
                            <Select
                              value={item.productId}
                              onValueChange={(val) =>
                                updateLineItem(item._key, 'productId', val)
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                              <SelectContent>
                                <div className="px-2 pb-2">
                                  <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                      className="h-7 text-xs pl-7"
                                      placeholder="Search products..."
                                      value={productSearch}
                                      onChange={(e) =>
                                        setProductSearch(e.target.value)
                                      }
                                    />
                                  </div>
                                </div>
                                {filteredProducts.length === 0 ? (
                                  <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                                    No products found
                                  </div>
                                ) : (
                                  filteredProducts.map((p) => (
                                    <SelectItem
                                      key={p.id}
                                      value={String(p.id)}
                                      className="text-xs"
                                    >
                                      <span className="flex items-center gap-2">
                                        <span className="font-medium">
                                          {p.pname}
                                        </span>
                                        {p.pcode && (
                                          <span className="text-muted-foreground font-mono text-[10px]">
                                            {p.pcode}
                                          </span>
                                        )}
                                        <span className="text-muted-foreground ml-auto text-[10px]">
                                          {p.punit || 'PCS'} @{' '}
                                          {formatCurrency(p.salePrice)}
                                        </span>
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
                              value={item.qty}
                              onChange={(e) =>
                                updateLineItem(item._key, 'qty', e.target.value)
                              }
                              className="h-8 text-xs text-right tabular-nums w-[80px]"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={item.salePrice}
                              onChange={(e) =>
                                updateLineItem(
                                  item._key,
                                  'salePrice',
                                  e.target.value
                                )
                              }
                              className="h-8 text-xs text-right tabular-nums w-[120px]"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={item.costPrice}
                              onChange={(e) =>
                                updateLineItem(
                                  item._key,
                                  'costPrice',
                                  e.target.value
                                )
                              }
                              className="h-8 text-xs text-right tabular-nums w-[120px]"
                            />
                          </TableCell>
                          <TableCell>
                            <span className="text-xs tabular-nums font-medium text-orange-700">
                              {formatCurrency(calcLineTotal(item))}
                            </span>
                          </TableCell>
                          {(Number(gstPercent) || 0) > 0 && (
                            <TableCell>
                              <span className="text-xs tabular-nums text-muted-foreground">
                                {formatCurrency(calcLineGst(item))}
                              </span>
                            </TableCell>
                          )}
                          <TableCell>
                            <Input
                              value={item.lineComments}
                              onChange={(e) =>
                                updateLineItem(
                                  item._key,
                                  'lineComments',
                                  e.target.value
                                )
                              }
                              className="h-8 text-xs w-full"
                              placeholder="Notes..."
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                              onClick={() => removeLineItem(item._key)}
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

              {/* Mobile cards */}
              <div className="lg:hidden space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                {lineItems.map((item) => {
                  const product = products.find(
                    (p) => p.id === Number(item.productId)
                  )
                  return (
                    <div
                      key={item._key}
                      className="rounded-lg border p-3 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 mr-2">
                          <Select
                            value={item.productId}
                            onValueChange={(val) =>
                              updateLineItem(item._key, 'productId', val)
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredProducts.map((p) => (
                                <SelectItem
                                  key={p.id}
                                  value={String(p.id)}
                                  className="text-xs"
                                >
                                  {p.pname}
                                  {p.pcode && (
                                    <span className="text-muted-foreground font-mono text-[10px] ml-1">
                                      ({p.pcode})
                                    </span>
                                  )}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {product && (
                            <p className="text-[10px] text-muted-foreground mt-1 truncate">
                              {product.punit || 'PCS'} @{' '}
                              {formatCurrency(product.salePrice)} | Cost:{' '}
                              {formatCurrency(product.costPrice)}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 shrink-0"
                          onClick={() => removeLineItem(item._key)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">
                            Qty
                          </Label>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            value={item.qty}
                            onChange={(e) =>
                              updateLineItem(item._key, 'qty', e.target.value)
                            }
                            className="h-8 text-xs text-right tabular-nums"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">
                            Sale Price
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={item.salePrice}
                            onChange={(e) =>
                              updateLineItem(
                                item._key,
                                'salePrice',
                                e.target.value
                              )
                            }
                            className="h-8 text-xs text-right tabular-nums"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">
                            Total
                          </Label>
                          <div className="h-8 flex items-center justify-end text-xs font-medium text-orange-700 tabular-nums">
                            {formatCurrency(calcLineTotal(item))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Summary Row */}
              <div className="mt-4 rounded-lg border bg-muted/30 p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center md:text-right">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      Gross Total
                    </p>
                    <p className="text-sm font-semibold tabular-nums text-foreground">
                      {formatCurrency(grossTotal)}
                    </p>
                  </div>
                  <div className="text-center md:text-right">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      Discount
                    </p>
                    <p className="text-sm font-semibold tabular-nums text-rose-600">
                      -{formatCurrency(discount)}
                    </p>
                  </div>
                  {(Number(gstPercent) || 0) > 0 && (
                    <div className="text-center md:text-right">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                        GST ({gstPercent}%)
                      </p>
                      <p className="text-sm font-semibold tabular-nums text-amber-600">
                        +{formatCurrency(gstAmount)}
                      </p>
                    </div>
                  )}
                  <div
                    className={`text-center md:text-right ${(Number(gstPercent) || 0) > 0 ? 'md:col-span-1' : 'md:col-span-2'}`}
                  >
                    <p className="text-[10px] text-orange-600 uppercase tracking-wide font-semibold">
                      Grand Total
                    </p>
                    <p className="text-lg font-bold tabular-nums text-orange-700">
                      {formatCurrency(grandTotal)}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* ═══ Recent Sales Table ═══ */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            Recent Credit Sales
          </h3>
          <Badge
            variant="secondary"
            className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] font-semibold tabular-nums"
          >
            {recentSales.length}
          </Badge>
        </div>

        {recentSales.length === 0 ? (
          <Card className="py-0 gap-0">
            <CardContent className="p-8 flex flex-col items-center justify-center text-center">
              <div className="h-12 w-12 rounded-full bg-orange-50 flex items-center justify-center mb-3">
                <ShoppingCart className="h-6 w-6 text-orange-400" />
              </div>
              <p className="text-sm font-medium text-foreground">
                No credit sales yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Create your first credit sale above.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-xs font-semibold">Sale No</TableHead>
                    <TableHead className="text-xs font-semibold hidden sm:table-cell">
                      Date
                    </TableHead>
                    <TableHead className="text-xs font-semibold">Customer</TableHead>
                    <TableHead className="text-xs font-semibold text-right hidden md:table-cell">
                      Gross
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right hidden lg:table-cell">
                      GST
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Grand Total
                    </TableHead>
                    <TableHead className="text-xs font-semibold hidden sm:table-cell">
                      Status
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
                        <span className="text-xs font-mono font-medium text-orange-700">
                          {sale.saleNo}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {format(parseISO(sale.saleDate), 'dd MMM yyyy')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium">
                          {sale.customerName || sale.account?.aname || '—'}
                        </span>
                        {sale.contactNo && (
                          <span className="block text-[10px] text-muted-foreground">
                            {sale.contactNo}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell">
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {formatCurrency(sale.grossTotal)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right hidden lg:table-cell">
                        <span className="text-xs tabular-nums text-amber-600">
                          {sale.gst > 0 ? formatCurrency(sale.gstAmount) : '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-xs tabular-nums font-semibold text-orange-700">
                          {formatCurrency(sale.grandTotal)}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {sale.isPaid ? (
                          <Badge
                            variant="secondary"
                            className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-semibold"
                          >
                            Paid
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] font-semibold"
                          >
                            Unpaid
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => openDeleteDialog(sale)}
                          title="Delete sale"
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

      {/* ═══ Delete Confirmation ═══ */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sale {deletingSale?.saleNo}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this credit sale? This will also
              remove the associated receivable entry. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deletingSale && (
            <div className="bg-rose-50 rounded-lg border border-rose-100 p-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Customer</span>
                <span className="font-medium">
                  {deletingSale.customerName || deletingSale.account?.aname || '—'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Grand Total</span>
                <span className="font-semibold text-rose-600 tabular-nums">
                  {formatCurrency(deletingSale.grandTotal)}
                </span>
              </div>
            </div>
          )}
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

      {/* ═══ Global Styles ═══ */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgb(203 213 225 / 0.6);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgb(148 163 184 / 0.8);
        }
      `}</style>
    </div>
  )
}
