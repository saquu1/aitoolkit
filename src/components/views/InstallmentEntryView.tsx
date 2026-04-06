'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import {
  Repeat,
  Loader2,
  Plus,
  CalendarDays,
  Landmark,
  Users,
  CreditCard,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
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
  isActive: boolean
}

interface InstallmentData {
  id: number
  transId: number
  customerId: number
  totalAmount: number
  emiAmount: number
  totalEmis: number
  paidEmis: number
  emiStartDate: string
  isActive: boolean
  createdAt: string
  customer: { id: number; aname: string; atype: string } | null
  transaction: { id: number; transDate: string; refNo: string | null; comments: string | null } | null
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

// ─── Skeleton ───────────────────────────────────────────────────────────────

function InstallmentSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-7 w-44" />
      </div>
      <Card className="py-0 gap-0">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-36" />
          </div>
        </CardContent>
      </Card>
      <div className="space-y-3">
        <Skeleton className="h-6 w-44" />
        <div className="rounded-lg border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border-b px-4 py-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-2 w-48 mt-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function InstallmentEntryView() {
  const [bankAccounts, setBankAccounts] = useState<Account[]>([])
  const [customerAccounts, setCustomerAccounts] = useState<Account[]>([])
  const [installments, setInstallments] = useState<InstallmentData[]>([])
  const [loading, setLoading] = useState(true)

  // Form state
  const [customerId, setCustomerId] = useState('')
  const [formTotalAmount, setFormTotalAmount] = useState('')
  const [formEmiAmount, setFormEmiAmount] = useState('')
  const [formTotalEmis, setFormTotalEmis] = useState('')
  const [formStartDate, setFormStartDate] = useState(
    format(new Date(), 'yyyy-MM-dd')
  )
  const [formRef, setFormRef] = useState('')
  const [formComments, setFormComments] = useState('')
  const [formBankId, setFormBankId] = useState('')
  const [saving, setSaving] = useState(false)

  // EMI Payment dialog
  const [emiDialogOpen, setEmiDialogOpen] = useState(false)
  const [selectedInstallment, setSelectedInstallment] =
    useState<InstallmentData | null>(null)
  const [emiBankId, setEmiBankId] = useState('')
  const [emiSaving, setEmiSaving] = useState(false)

  // Fetch accounts
  const fetchAccounts = useCallback(async () => {
    try {
      const [bankRes, custRes1, custRes2] = await Promise.all([
        fetch('/api/accounts?atype=BANK&isActive=true&limit=100'),
        fetch('/api/accounts?atype=RECEIVABLE&isActive=true&limit=200'),
        fetch('/api/accounts?atype=CUSTOMER&isActive=true&limit=200'),
      ])
      const bankJson = await bankRes.json()
      const cust1Json = await custRes1.json()
      const cust2Json = await custRes2.json()
      if (bankJson.success) setBankAccounts(bankJson.data)
      const custList = []
      if (cust1Json.success) custList.push(...cust1Json.data)
      if (cust2Json.success) custList.push(...cust2Json.data)
      setCustomerAccounts(custList)
    } catch {
      toast.error('Failed to load accounts')
    }
  }, [])

  // Fetch installments
  const fetchInstallments = useCallback(async () => {
    try {
      const res = await fetch('/api/installments')
      const json = await res.json()
      if (json.success) setInstallments(json.data)
    } catch {
      toast.error('Failed to load installments')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    Promise.all([fetchAccounts(), fetchInstallments()])
  }, [fetchAccounts, fetchInstallments])

  function resetForm() {
    setCustomerId('')
    setFormTotalAmount('')
    setFormEmiAmount('')
    setFormTotalEmis('')
    setFormStartDate(format(new Date(), 'yyyy-MM-dd'))
    setFormRef('')
    setFormComments('')
    setFormBankId('')
  }

  async function handleSave(andNew = false) {
    if (!customerId) {
      toast.error('Select a customer')
      return
    }
    if (!formTotalAmount || Number(formTotalAmount) <= 0) {
      toast.error('Enter a valid total amount')
      return
    }
    if (!formEmiAmount || Number(formEmiAmount) <= 0) {
      toast.error('Enter a valid EMI amount')
      return
    }
    if (!formTotalEmis || Number(formTotalEmis) <= 0) {
      toast.error('Enter a valid number of EMIs')
      return
    }
    if (!formStartDate) {
      toast.error('Select a start date')
      return
    }
    if (!formBankId) {
      toast.error('Select a bank account')
      return
    }

    try {
      setSaving(true)
      const res = await fetch('/api/installments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: Number(customerId),
          totalAmount: Number(formTotalAmount),
          emiAmount: Number(formEmiAmount),
          totalEmis: Number(formTotalEmis),
          emiStartDate: formStartDate,
          refNo: formRef.trim() || undefined,
          comments: formComments.trim() || undefined,
          bankId: Number(formBankId),
        }),
      })

      const json = await res.json()
      if (!json.success) {
        toast.error(json.error || 'Failed to create installment plan')
        return
      }

      toast.success(
        `Installment plan of ${formatCurrency(Number(formTotalAmount))} created`
      )

      if (andNew) {
        setFormTotalAmount('')
        setFormEmiAmount('')
        setFormTotalEmis('')
        setFormRef('')
        setFormComments('')
      } else {
        resetForm()
      }
      fetchInstallments()
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  function openEmiDialog(installment: InstallmentData) {
    setSelectedInstallment(installment)
    setEmiBankId('')
    setEmiDialogOpen(true)
  }

  async function handleEmiPayment() {
    if (!selectedInstallment || !emiBankId) {
      toast.error('Select a bank account')
      return
    }

    try {
      setEmiSaving(true)
      const res = await fetch('/api/installments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installmentId: selectedInstallment.id,
          bankId: Number(emiBankId),
        }),
      })

      const json = await res.json()
      if (!json.success) {
        toast.error(json.error || 'Failed to record EMI payment')
        return
      }

      const completed = json.data.paidEmis >= json.data.totalEmis
      toast.success(
        completed
          ? 'Final EMI payment recorded! Plan completed.'
          : `EMI payment #${json.data.paidEmis} recorded successfully`
      )

      setEmiDialogOpen(false)
      setSelectedInstallment(null)
      setEmiBankId('')
      fetchInstallments()
    } catch {
      toast.error('Network error')
    } finally {
      setEmiSaving(false)
    }
  }

  if (loading) return <InstallmentSkeleton />

  // Calculate totals
  const totalOutstanding = installments
    .filter((i) => i.isActive)
    .reduce(
      (sum, i) => sum + i.emiAmount * (i.totalEmis - i.paidEmis),
      0
    )

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-orange-100 flex items-center justify-center">
          <Repeat className="h-5 w-5 text-orange-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Installments
          </h2>
          <p className="text-xs text-muted-foreground">
            Manage customer installment plans
          </p>
        </div>
      </div>

      {/* Form card */}
      <Card className="py-0 gap-0 border-orange-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="h-4 w-4 text-orange-600" />
            <h3 className="text-sm font-semibold text-foreground">
              New Installment Plan
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer */}
            <div className="space-y-1.5">
              <Label>
                Customer <span className="text-orange-500">*</span>
              </Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Select customer" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {customerAccounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      <span className="flex items-center gap-2">
                        {a.aname}
                        <Badge
                          variant="secondary"
                          className="text-[9px] bg-slate-100 text-slate-600"
                        >
                          {a.atype}
                        </Badge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Total Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="inst-total">
                Total Amount (PKR) <span className="text-orange-500">*</span>
              </Label>
              <Input
                id="inst-total"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={formTotalAmount}
                onChange={(e) => setFormTotalAmount(e.target.value)}
                className="text-right tabular-nums"
              />
            </div>

            {/* EMI Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="inst-emi">
                EMI Amount (PKR) <span className="text-orange-500">*</span>
              </Label>
              <Input
                id="inst-emi"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={formEmiAmount}
                onChange={(e) => setFormEmiAmount(e.target.value)}
                className="text-right tabular-nums"
              />
            </div>

            {/* Total EMIs */}
            <div className="space-y-1.5">
              <Label htmlFor="inst-emis">
                Total EMIs <span className="text-orange-500">*</span>
              </Label>
              <Input
                id="inst-emis"
                type="number"
                min="1"
                step="1"
                placeholder="0"
                value={formTotalEmis}
                onChange={(e) => setFormTotalEmis(e.target.value)}
                className="text-right tabular-nums"
              />
            </div>

            {/* Start Date */}
            <div className="space-y-1.5">
              <Label htmlFor="inst-date">
                Start Date <span className="text-orange-500">*</span>
              </Label>
              <div className="relative">
                <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="inst-date"
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Bank Account (for the journal credit side) */}
            <div className="space-y-1.5">
              <Label>
                Bank Account <span className="text-orange-500">*</span>
              </Label>
              <Select value={formBankId} onValueChange={setFormBankId}>
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Select bank" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.aname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reference No */}
            <div className="space-y-1.5">
              <Label htmlFor="inst-ref">Reference / Invoice No</Label>
              <Input
                id="inst-ref"
                placeholder="Optional"
                value={formRef}
                onChange={(e) => setFormRef(e.target.value)}
              />
            </div>

            {/* Comments */}
            <div className="space-y-1.5">
              <Label htmlFor="inst-comments">Comments</Label>
              <Textarea
                id="inst-comments"
                placeholder="Optional notes..."
                value={formComments}
                onChange={(e) => setFormComments(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          {/* Info bar */}
          <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground bg-orange-50 rounded-lg px-3 py-2 border border-orange-100">
            <CreditCard className="h-3.5 w-3.5 text-orange-500" />
            <span>
              Creates a journal entry: Debit Customer (Receivable) / Credit
              Income
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

      <Separator />

      {/* Installments table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              Active Installments
            </h3>
            <Badge
              variant="secondary"
              className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] font-semibold tabular-nums"
            >
              {installments.filter((i) => i.isActive).length}
            </Badge>
          </div>
          {totalOutstanding > 0 && (
            <div className="text-xs text-muted-foreground">
              Total Outstanding:{' '}
              <span className="font-semibold text-orange-600 tabular-nums">
                {formatCurrency(totalOutstanding)}
              </span>
            </div>
          )}
        </div>

        {installments.length === 0 ? (
          <Card className="py-0 gap-0">
            <CardContent className="p-8 flex flex-col items-center justify-center text-center">
              <div className="h-12 w-12 rounded-full bg-orange-50 flex items-center justify-center mb-3">
                <Repeat className="h-6 w-6 text-orange-400" />
              </div>
              <p className="text-sm font-medium text-foreground">
                No installment plans yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Create your first installment plan above.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-xs font-semibold">
                      Customer
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right hidden sm:table-cell">
                      Total
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right hidden md:table-cell">
                      EMI
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right hidden lg:table-cell">
                      EMIs
                    </TableHead>
                    <TableHead className="text-xs font-semibold hidden md:table-cell min-w-[140px]">
                      Progress
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Outstanding
                    </TableHead>
                    <TableHead className="text-xs font-semibold hidden sm:table-cell">
                      Start Date
                    </TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installments.map((inst) => {
                    const isCompleted =
                      inst.paidEmis >= inst.totalEmis
                    const outstanding =
                      inst.emiAmount * (inst.totalEmis - inst.paidEmis)
                    const progressPercent =
                      inst.totalEmis > 0
                        ? Math.round(
                            (inst.paidEmis / inst.totalEmis) * 100
                          )
                        : 0

                    return (
                      <TableRow
                        key={inst.id}
                        className={`group ${isCompleted ? 'opacity-60' : ''}`}
                      >
                        <TableCell>
                          <span className="text-xs font-medium">
                            {inst.customer?.aname || '—'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right hidden sm:table-cell">
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {formatCurrency(inst.totalAmount)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right hidden md:table-cell">
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {formatCurrency(inst.emiAmount)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right hidden lg:table-cell">
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {inst.paidEmis}/{inst.totalEmis}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <Progress
                              value={progressPercent}
                              className="h-2 flex-1"
                            />
                            <span className="text-[10px] tabular-nums text-muted-foreground w-8 text-right">
                              {progressPercent}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`text-xs tabular-nums font-medium ${
                              isCompleted
                                ? 'text-muted-foreground'
                                : 'text-orange-600'
                            }`}
                          >
                            {isCompleted
                              ? formatCurrency(0)
                              : formatCurrency(outstanding)}
                          </span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {format(
                              parseISO(inst.emiStartDate),
                              'dd MMM yyyy'
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          {isCompleted ? (
                            <Badge
                              variant="secondary"
                              className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-semibold"
                            >
                              Completed
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] font-semibold"
                            >
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {!isCompleted && inst.isActive && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] px-2.5 border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800"
                              onClick={() => openEmiDialog(inst)}
                            >
                              <CreditCard className="h-3 w-3 mr-1" />
                              Pay
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

      {/* EMI Payment Dialog */}
      <Dialog open={emiDialogOpen} onOpenChange={setEmiDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-orange-600" />
              Record EMI Payment
            </DialogTitle>
            <DialogDescription>
              Record the next EMI payment for this installment plan.
            </DialogDescription>
          </DialogHeader>

          {selectedInstallment && (
            <div className="space-y-4">
              {/* Payment summary */}
              <div className="bg-orange-50 rounded-lg border border-orange-100 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Customer</span>
                  <span className="font-medium">
                    {selectedInstallment.customer?.aname || '—'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    EMI Amount
                  </span>
                  <span className="font-semibold text-orange-600 tabular-nums">
                    {formatCurrency(selectedInstallment.emiAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Next EMI Number
                  </span>
                  <span className="font-medium">
                    {selectedInstallment.paidEmis + 1} /{' '}
                    {selectedInstallment.totalEmis}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Outstanding After Payment
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(
                      selectedInstallment.emiAmount *
                        (selectedInstallment.totalEmis -
                          selectedInstallment.paidEmis -
                          1)
                    )}
                  </span>
                </div>
              </div>

              {/* Bank selection */}
              <div className="space-y-1.5">
                <Label>
                  Receive Into Bank{' '}
                  <span className="text-orange-500">*</span>
                </Label>
                <Select value={emiBankId} onValueChange={setEmiBankId}>
                  <SelectTrigger className="w-full">
                    <div className="flex items-center gap-2">
                      <Landmark className="h-4 w-4 text-muted-foreground shrink-0" />
                      <SelectValue placeholder="Select bank" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.aname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setEmiDialogOpen(false)}
              disabled={emiSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEmiPayment}
              disabled={emiSaving || !emiBankId}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {emiSaving && (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              )}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
