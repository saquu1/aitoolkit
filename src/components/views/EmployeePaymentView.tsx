'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import {
  UserCheck,
  Loader2,
  Trash2,
  Plus,
  CalendarDays,
  RefreshCw,
  Landmark,
  Users,
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

interface Account {
  id: number
  aname: string
  atype: string
  isActive: boolean
}

interface Transaction {
  id: number
  transDate: string
  accountId: number
  bankId: number | null
  debit: number
  credit: number
  refNo: string | null
  comments: string | null
  transType: string
  account: { id: number; aname: string; atype: string } | null
  bank: { id: number; aname: string } | null
}

interface SalaryAdjustment {
  id: number
  empId: number
  month: string
  monthlyAmount: number
  paid: number
  employee: { id: number; aname: string } | null
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

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function formatMonth(monthStr: string): string {
  try {
    const [year, mon] = monthStr.split('-').map(Number)
    const date = new Date(year, mon - 1, 1)
    return format(date, 'MMM yyyy')
  } catch {
    return monthStr
  }
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function EmployeePaymentSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-7 w-48" />
      </div>
      <Card className="py-0 gap-0">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-36" />
          </div>
        </CardContent>
      </Card>
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <div className="rounded-lg border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border-b px-4 py-3">
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function EmployeePaymentView() {
  const [bankAccounts, setBankAccounts] = useState<Account[]>([])
  const [employeeAccounts, setEmployeeAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  // Form state
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [employeeId, setEmployeeId] = useState('')
  const [formMonth, setFormMonth] = useState(getCurrentMonth())
  const [formAmount, setFormAmount] = useState('')
  const [bankId, setBankId] = useState('')
  const [formRef, setFormRef] = useState('')
  const [formComments, setFormComments] = useState('')
  const [saving, setSaving] = useState(false)
  const [adjustmentLoaded, setAdjustmentLoaded] = useState(false)

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Fetch accounts
  const fetchAccounts = useCallback(async () => {
    try {
      const [bankRes, empRes] = await Promise.all([
        fetch('/api/accounts?atype=BANK&isActive=true&limit=100'),
        fetch('/api/accounts?atype=EMPLOYEE&isActive=true&limit=200'),
      ])
      const bankJson = await bankRes.json()
      const empJson = await empRes.json()
      if (bankJson.success) setBankAccounts(bankJson.data)
      if (empJson.success) setEmployeeAccounts(empJson.data)
    } catch {
      toast.error('Failed to load accounts')
    }
  }, [])

  // Fetch recent employee payments
  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch('/api/transactions?transType=EMPLOYEE&limit=20')
      const json = await res.json()
      if (json.success) setTransactions(json.data)
    } catch {
      toast.error('Failed to load employee payments')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    Promise.all([fetchAccounts(), fetchTransactions()])
  }, [fetchAccounts, fetchTransactions])

  // Auto-populate from salary adjustment when employee + month are set
  useEffect(() => {
    if (!employeeId || !formMonth) {
      setAdjustmentLoaded(false)
      return
    }

    async function fetchAdjustment() {
      try {
        const res = await fetch(
          `/api/reports/employee-adjustment?employeeId=${employeeId}&month=${formMonth}`
        )
        const json = await res.json()
        if (json.success && json.data?.adjustment) {
          const adj = json.data.adjustment as SalaryAdjustment
          if (adj.monthlyAmount > 0) {
            setFormAmount(String(adj.monthlyAmount))
            setAdjustmentLoaded(true)
          }
        }
      } catch {
        // Silently fail — user can still enter amount manually
      }
    }

    fetchAdjustment()
  }, [employeeId, formMonth])

  function resetForm() {
    setFormDate(format(new Date(), 'yyyy-MM-dd'))
    setEmployeeId('')
    setFormMonth(getCurrentMonth())
    setFormAmount('')
    setBankId('')
    setFormRef('')
    setFormComments('')
    setAdjustmentLoaded(false)
  }

  async function handleSave(andNew = false) {
    if (!formDate) {
      toast.error('Date is required')
      return
    }
    if (!employeeId) {
      toast.error('Select an employee')
      return
    }
    if (!formMonth) {
      toast.error('Month is required')
      return
    }
    if (!formAmount || Number(formAmount) <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    if (!bankId) {
      toast.error('Select a bank')
      return
    }

    try {
      setSaving(true)
      const amount = Number(formAmount)
      const empAccount = employeeAccounts.find(
        (a) => a.id === Number(employeeId)
      )
      const monthLabel = formatMonth(formMonth)

      // Double-entry: Debit employee, Credit bank
      const debitRes = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transDate: formDate,
          accountId: Number(employeeId),
          bankId: Number(bankId),
          debit: amount,
          credit: 0,
          refNo: formRef.trim() || undefined,
          comments:
            formComments.trim() ||
            `Salary payment for ${monthLabel}` +
              (empAccount ? ` - ${empAccount.aname}` : ''),
          transType: 'EMPLOYEE',
        }),
      })

      const creditRes = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transDate: formDate,
          accountId: Number(bankId),
          debit: 0,
          credit: amount,
          refNo: formRef.trim() || undefined,
          comments:
            formComments.trim() ||
            `Salary payment for ${monthLabel}` +
              (empAccount ? ` - ${empAccount.aname}` : ''),
          transType: 'EMPLOYEE',
        }),
      })

      const debitJson = await debitRes.json()
      const creditJson = await creditRes.json()

      if (!debitJson.success || !creditJson.success) {
        toast.error(debitJson.error || creditJson.error || 'Failed to save')
        return
      }

      // Update salary adjustment paid amount
      try {
        await fetch('/api/salary-adjustment', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: Number(employeeId),
            month: formMonth,
            paid: amount,
          }),
        })
      } catch {
        // Non-blocking: salary adjustment update failure shouldn't block payment
      }

      toast.success(
        `Employee payment of ${formatCurrency(amount)} saved for ${monthLabel}`
      )

      if (andNew) {
        // Keep employee and month, reset the rest
        setFormDate(format(new Date(), 'yyyy-MM-dd'))
        setFormAmount('')
        setFormRef('')
        setFormComments('')
      } else {
        resetForm()
      }
      fetchTransactions()
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
      const res = await fetch(`/api/transactions?id=${deletingId}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!json.success) {
        toast.error(json.error || 'Delete failed')
        return
      }
      toast.success('Entry deleted')
      setDeleteOpen(false)
      fetchTransactions()
    } catch {
      toast.error('Network error')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <EmployeePaymentSkeleton />

  // Group transactions by refNo/comments to pair debit+credit
  const pairedTransactions: Array<{
    id: number
    transDate: string
    employeeName: string
    amount: number
    bankName: string
    month: string
  }> = []
  const seen = new Set<number>()

  for (const t of transactions) {
    if (seen.has(t.id)) continue
    // Debit entry is the employee side
    if (t.debit > 0 && t.account?.atype === 'EMPLOYEE') {
      const creditEntry = transactions.find(
        (c) =>
          c.credit === t.debit &&
          c.accountId === t.bankId &&
          !seen.has(c.id) &&
          c.id !== t.id
      )
      seen.add(t.id)
      if (creditEntry) seen.add(creditEntry.id)

      // Try to extract month from comments or refNo
      const monthMatch =
        (t.comments || '').match(/\b(\d{4}-\d{2})\b/) ||
        (t.refNo || '').match(/\b(\d{4}-\d{2})\b/)
      const monthStr = monthMatch ? monthMatch[1] : ''

      pairedTransactions.push({
        id: t.id,
        transDate: t.transDate,
        employeeName: t.account?.aname || '—',
        amount: t.debit,
        bankName: t.bank?.aname || '—',
        month: monthStr,
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-purple-100 flex items-center justify-center">
          <UserCheck className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Employee Payment
          </h2>
          <p className="text-xs text-muted-foreground">
            Process employee salary payments
          </p>
        </div>
      </div>

      {/* Form card */}
      <Card className="py-0 gap-0 border-purple-200">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="emp-date">
                Date <span className="text-purple-500">*</span>
              </Label>
              <div className="relative">
                <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="emp-date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Employee */}
            <div className="space-y-1.5">
              <Label>
                Employee <span className="text-purple-500">*</span>
              </Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Select employee" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {employeeAccounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.aname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month */}
            <div className="space-y-1.5">
              <Label htmlFor="emp-month">
                Month <span className="text-purple-500">*</span>
              </Label>
              <Input
                id="emp-month"
                type="month"
                value={formMonth}
                onChange={(e) => {
                  setFormMonth(e.target.value)
                  setAdjustmentLoaded(false)
                }}
              />
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="emp-amount">
                Amount (PKR) <span className="text-purple-500">*</span>
                {adjustmentLoaded && (
                  <Badge
                    variant="secondary"
                    className="ml-2 bg-purple-100 text-purple-700 text-[10px] border-purple-200"
                  >
                    Auto
                  </Badge>
                )}
              </Label>
              <Input
                id="emp-amount"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                className="text-right tabular-nums"
              />
            </div>

            {/* Paid From Bank */}
            <div className="space-y-1.5">
              <Label>
                Paid From Bank <span className="text-purple-500">*</span>
              </Label>
              <Select value={bankId} onValueChange={setBankId}>
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
              <Label htmlFor="emp-ref">Reference No</Label>
              <Input
                id="emp-ref"
                placeholder="Optional"
                value={formRef}
                onChange={(e) => setFormRef(e.target.value)}
              />
            </div>

            {/* Comments - full width */}
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="emp-comments">Comments</Label>
              <Textarea
                id="emp-comments"
                placeholder="Optional notes..."
                value={formComments}
                onChange={(e) => setFormComments(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Double-entry indicator */}
          <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground bg-purple-50 rounded-lg px-3 py-2 border border-purple-100">
            <Landmark className="h-3.5 w-3.5 text-purple-500" />
            <span>
              Double-entry: Debit Employee Account / Credit Bank Account
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
            >
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Save
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={saving}
              variant="outline"
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
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

      {/* Recent Payments */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            Recent Payments
          </h3>
          <Badge
            variant="secondary"
            className="bg-purple-100 text-purple-700 border-purple-200 text-[10px] font-semibold tabular-nums"
          >
            {pairedTransactions.length}
          </Badge>
        </div>

        {pairedTransactions.length === 0 ? (
          <Card className="py-0 gap-0">
            <CardContent className="p-8 flex flex-col items-center justify-center text-center">
              <div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center mb-3">
                <UserCheck className="h-6 w-6 text-purple-400" />
              </div>
              <p className="text-sm font-medium text-foreground">
                No employee payments yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Create your first employee payment above.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-xs font-semibold">Date</TableHead>
                    <TableHead className="text-xs font-semibold">
                      Employee
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Amount
                    </TableHead>
                    <TableHead className="text-xs font-semibold hidden md:table-cell">
                      Bank
                    </TableHead>
                    <TableHead className="text-xs font-semibold hidden sm:table-cell">
                      Month
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pairedTransactions.map((t) => (
                    <TableRow key={t.id} className="group">
                      <TableCell>
                        <span className="text-xs tabular-nums">
                          {format(parseISO(t.transDate), 'dd MMM yyyy')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium">
                          {t.employeeName}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-xs tabular-nums text-purple-600 font-medium">
                          {formatCurrency(t.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {t.bankName}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {t.month ? (
                          <Badge
                            variant="secondary"
                            className="bg-slate-100 text-slate-700 text-[10px] font-medium"
                          >
                            {formatMonth(t.month)}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            setDeletingId(t.id)
                            setDeleteOpen(true)
                          }}
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

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this employee payment? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-rose-500 hover:bg-rose-600 text-white"
            >
              {deleting && (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
