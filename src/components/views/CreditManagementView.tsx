'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { format, parseISO, isBefore, startOfDay } from 'date-fns'
import {
  ClipboardCheck,
  Loader2,
  Filter,
  CalendarDays,
  Banknote,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Account {
  id: number
  aname: string
  atype: string
}

interface CreditEntry {
  id: number
  saleId: number
  accountId: number
  invNo?: string
  credit: number
  dueDate: string
  amt1: number
  amt2: number
  balance: number
  isPaid: boolean
  sale?: {
    saleNo: string
    saleDate: string
  }
  account?: Account
}

interface CreditSummary {
  totalCredit: number
  totalPaid: number
  totalBalance: number
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

// ─── Skeleton ───────────────────────────────────────────────────────────────

function CreditManagementSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-7 w-48" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <div className="rounded-lg border">
          <div className="border-b px-4 py-3 flex gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border-b px-4 py-3 flex gap-4">
              {Array.from({ length: 7 }).map((_, j) => (
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

export function CreditManagementView() {
  const [customers, setCustomers] = useState<Account[]>([])
  const [credits, setCredits] = useState<CreditEntry[]>([])
  const [summary, setSummary] = useState<CreditSummary>({ totalCredit: 0, totalPaid: 0, totalBalance: 0 })
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterCustomer, setFilterCustomer] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterFromDate, setFilterFromDate] = useState('')
  const [filterToDate, setFilterToDate] = useState('')

  // Payment dialog
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentCredit, setPaymentCredit] = useState<CreditEntry | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentSaving, setPaymentSaving] = useState(false)

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch('/api/accounts?atype=CUSTOMER&isActive=true&limit=200')
      const json = await res.json()
      if (json.success) setCustomers(json.data)
    } catch {
      toast.error('Failed to load customers')
    }
  }, [])

  const fetchCredits = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      params.set('limit', '50')
      if (filterCustomer) params.set('accountId', filterCustomer)
      if (filterStatus === 'paid') params.set('isPaid', 'true')
      if (filterStatus === 'unpaid') params.set('isPaid', 'false')
      if (filterFromDate) params.set('fromDate', filterFromDate)
      if (filterToDate) params.set('toDate', filterToDate)

      const res = await fetch(`/api/credits?${params.toString()}`)
      const json = await res.json()
      if (json.success) {
        setCredits(json.data || [])
        setSummary(json.summary || { totalCredit: 0, totalPaid: 0, totalBalance: 0 })
      }
    } catch {
      toast.error('Failed to load credits')
    } finally {
      setLoading(false)
    }
  }, [filterCustomer, filterStatus, filterFromDate, filterToDate])

  useEffect(() => {
    Promise.all([fetchCustomers(), fetchCredits()])
  }, [fetchCustomers, fetchCredits])

  // Detect status
  function getStatus(entry: CreditEntry): 'Paid' | 'Overdue' | 'Unpaid' {
    if (entry.isPaid) return 'Paid'
    const today = startOfDay(new Date())
    const dueDate = startOfDay(parseISO(entry.dueDate))
    if (isBefore(dueDate, today)) return 'Overdue'
    return 'Unpaid'
  }

  // Open payment dialog
  function openPaymentDialog(entry: CreditEntry) {
    setPaymentCredit(entry)
    setPaymentAmount('')
    setPaymentOpen(true)
  }

  // Record payment
  async function handleRecordPayment() {
    if (!paymentCredit) return
    const amount = Number(paymentAmount)
    if (!amount || amount <= 0) {
      toast.error('Enter a valid payment amount')
      return
    }
    if (amount > paymentCredit.balance) {
      toast.error('Payment exceeds outstanding balance')
      return
    }

    try {
      setPaymentSaving(true)
      // Add payment to amt1 (first payment column)
      const newAmt1 = paymentCredit.amt1 + amount
      const res = await fetch('/api/credits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: paymentCredit.id,
          amt1: newAmt1,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        toast.error(json.error || 'Failed to record payment')
        return
      }
      toast.success(`Payment of ${formatCurrency(amount)} recorded`)
      setPaymentOpen(false)
      fetchCredits()
    } catch {
      toast.error('Network error')
    } finally {
      setPaymentSaving(false)
    }
  }

  if (loading) return <CreditManagementSkeleton />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center">
          <ClipboardCheck className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Credit / Receivables</h2>
          <p className="text-xs text-muted-foreground">Manage customer credit balances and payments</p>
        </div>
      </div>

      {/* Filter Section */}
      <Card className="py-0 gap-0 border-amber-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-amber-600" />
            <span className="text-xs font-semibold text-amber-700">Filters</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Customer</Label>
              <Select value={filterCustomer} onValueChange={(v) => setFilterCustomer(v === '__all__' ? '' : v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All Customers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Customers</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.aname}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">From Date</Label>
              <Input type="date" value={filterFromDate} onChange={(e) => setFilterFromDate(e.target.value)} className="h-9 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">To Date</Label>
              <Input type="date" value={filterToDate} onChange={(e) => setFilterToDate(e.target.value)} className="h-9 text-xs" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="py-0 gap-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-sky-100 flex items-center justify-center shrink-0">
                <DollarSign className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">Total Credit</p>
                <p className="text-lg font-bold tabular-nums text-sky-700">{formatCurrency(summary.totalCredit)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="py-0 gap-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">Total Received</p>
                <p className="text-lg font-bold tabular-nums text-emerald-700">{formatCurrency(summary.totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="py-0 gap-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
                <TrendingDown className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">Total Outstanding</p>
                <p className="text-lg font-bold tabular-nums text-rose-700">{formatCurrency(summary.totalBalance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Credits Table */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Credit Entries</h3>
          <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] font-semibold tabular-nums">{credits.length}</Badge>
        </div>

        {credits.length === 0 ? (
          <Card className="py-0 gap-0">
            <CardContent className="p-8 flex flex-col items-center justify-center text-center">
              <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center mb-3">
                <ClipboardCheck className="h-6 w-6 text-amber-400" />
              </div>
              <p className="text-sm font-medium text-foreground">No credit entries found</p>
              <p className="text-xs text-muted-foreground mt-1">Credit entries are created when sales are made on credit.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-xs font-semibold">Invoice No</TableHead>
                    <TableHead className="text-xs font-semibold">Customer</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Credit</TableHead>
                    <TableHead className="text-xs font-semibold hidden md:table-cell">Due Date</TableHead>
                    <TableHead className="text-xs font-semibold text-right hidden sm:table-cell">Paid</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Balance</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {credits.map((entry) => {
                    const status = getStatus(entry)
                    return (
                      <TableRow key={entry.id} className="group">
                        <TableCell>
                          <span className="text-xs font-mono font-semibold">
                            {entry.sale?.saleNo || entry.invNo || `INV-${entry.saleId}`}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-medium">{entry.account?.aname || '—'}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-xs tabular-nums font-medium">{formatCurrency(entry.credit)}</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className={`text-xs tabular-nums ${status === 'Overdue' ? 'text-rose-600 font-medium' : ''}`}>
                            {format(parseISO(entry.dueDate), 'dd MMM yyyy')}
                          </span>
                        </TableCell>
                        <TableCell className="text-right hidden sm:table-cell">
                          <span className="text-xs tabular-nums text-emerald-600">
                            {formatCurrency(entry.amt1 + entry.amt2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`text-xs tabular-nums font-semibold ${entry.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {formatCurrency(entry.balance)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {status === 'Paid' && (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-semibold hover:bg-emerald-100">
                              <CheckCircle2 className="h-3 w-3 mr-1" />Paid
                            </Badge>
                          )}
                          {status === 'Overdue' && (
                            <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-[10px] font-semibold hover:bg-rose-100">
                              <AlertTriangle className="h-3 w-3 mr-1" />Overdue
                            </Badge>
                          )}
                          {status === 'Unpaid' && (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] font-semibold hover:bg-amber-100">
                              <Clock className="h-3 w-3 mr-1" />Unpaid
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {!entry.isPaid && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] border-amber-200 text-amber-700 hover:bg-amber-50 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => openPaymentDialog(entry)}
                            >
                              <Banknote className="h-3 w-3 mr-1" />Record Payment
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* Record Payment Dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-amber-600" />
              Record Payment
            </DialogTitle>
            <DialogDescription>
              Enter the payment amount to apply against this credit entry.
            </DialogDescription>
          </DialogHeader>
          {paymentCredit && (
            <div className="space-y-4">
              {/* Invoice Details */}
              <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Invoice</span>
                  <span className="font-mono font-semibold">{paymentCredit.sale?.saleNo || paymentCredit.invNo || `INV-${paymentCredit.saleId}`}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Customer</span>
                  <span className="font-medium">{paymentCredit.account?.aname || '—'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Credit Amount</span>
                  <span className="tabular-nums font-medium">{formatCurrency(paymentCredit.credit)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Already Paid</span>
                  <span className="tabular-nums text-emerald-600">{formatCurrency(paymentCredit.amt1 + paymentCredit.amt2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-bold">
                  <span>Outstanding Balance</span>
                  <span className="tabular-nums text-rose-600">{formatCurrency(paymentCredit.balance)}</span>
                </div>
              </div>

              {/* Payment Amount Input */}
              <div className="space-y-1.5">
                <Label htmlFor="payment-amount" className="text-sm font-medium">
                  Payment Amount (PKR)
                </Label>
                <Input
                  id="payment-amount"
                  type="number"
                  min="1"
                  max={paymentCredit.balance}
                  step="1"
                  placeholder="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="text-right tabular-nums text-lg font-semibold"
                  autoFocus
                />
                <p className="text-[11px] text-muted-foreground">
                  Max: {formatCurrency(paymentCredit.balance)}
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPaymentOpen(false)} disabled={paymentSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleRecordPayment}
              disabled={paymentSaving || !paymentAmount || Number(paymentAmount) <= 0}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {paymentSaving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgb(203 213 225 / 0.6); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgb(148 163 184 / 0.8); }
      `}</style>
    </div>
  )
}
