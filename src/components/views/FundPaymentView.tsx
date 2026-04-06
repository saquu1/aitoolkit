'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import {
  Wallet,
  Loader2,
  Trash2,
  Plus,
  CalendarDays,
  ArrowRightLeft,
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
  account: { id: number; aname: string; atype: string }
  bank: { id: number; aname: string } | null
}

interface PairedTransaction {
  date: string
  fromBankId: number
  fromBankName: string
  toAccountId: number
  toAccountName: string
  amount: number
  refNo: string | null
  comments: string | null
  ids: number[]
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

function FundPaymentSkeleton() {
  return (
    <div className="space-y-6">
      {/* Title skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-7 w-36" />
      </div>
      {/* Form card skeleton */}
      <Card className="py-0 gap-0">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
          <div className="flex gap-3 mt-6">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-36" />
          </div>
        </CardContent>
      </Card>
      {/* Table skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <div className="rounded-lg border">
          <div className="border-b px-4 py-3 flex gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16 ml-auto" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border-b px-4 py-3 flex gap-4 items-center">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function FundPaymentView() {
  // ── Data State ──
  const [bankAccounts, setBankAccounts] = useState<Account[]>([])
  const [allAccounts, setAllAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [pairedTransactions, setPairedTransactions] = useState<PairedTransaction[]>([])
  const [loading, setLoading] = useState(true)

  // ── Form State ──
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [fromBankId, setFromBankId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formRef, setFormRef] = useState('')
  const [formComments, setFormComments] = useState('')
  const [saving, setSaving] = useState(false)

  // ── Delete State ──
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingItem, setDeletingItem] = useState<PairedTransaction | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ── Helpers ──
  function generateRefNo(): string {
    const now = new Date()
    const dateStr = format(now, 'yyyyMMdd')
    const timeStr = format(now, 'HHmmss')
    return `FP-${dateStr}-${timeStr}`
  }

  function pairTransactions(transList: Transaction[]): PairedTransaction[] {
    // Group by refNo to pair credit and debit entries
    const grouped: Record<string, Transaction[]> = {}
    for (const t of transList) {
      const key = t.refNo || `${t.transDate}-${t.debit}-${t.credit}-${t.comments}`
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(t)
    }

    const paired: PairedTransaction[] = []
    for (const entries of Object.values(grouped)) {
      const creditEntry = entries.find((e) => e.credit > 0)
      const debitEntry = entries.find((e) => e.debit > 0)

      if (creditEntry && debitEntry) {
        paired.push({
          date: creditEntry.transDate,
          fromBankId: creditEntry.accountId,
          fromBankName: creditEntry.account.aname,
          toAccountId: debitEntry.accountId,
          toAccountName: debitEntry.account.aname,
          amount: creditEntry.credit,
          refNo: creditEntry.refNo,
          comments: creditEntry.comments,
          ids: entries.map((e) => e.id),
        })
      } else {
        // Unpaired entry — show as-is
        const entry = entries[0]
        if (entry) {
          paired.push({
            date: entry.transDate,
            fromBankId: entry.credit > 0 ? entry.accountId : 0,
            fromBankName: entry.credit > 0 ? entry.account.aname : '—',
            toAccountId: entry.debit > 0 ? entry.accountId : 0,
            toAccountName: entry.debit > 0 ? entry.account.aname : '—',
            amount: entry.debit || entry.credit,
            refNo: entry.refNo,
            comments: entry.comments,
            ids: entries.map((e) => e.id),
          })
        }
      }
    }

    return paired
  }

  // ── Fetch Data ──
  const fetchAccounts = useCallback(async () => {
    try {
      const [bankRes, allRes] = await Promise.all([
        fetch('/api/accounts?atype=BANK&isActive=true&limit=100'),
        fetch('/api/accounts?isActive=true&limit=100'),
      ])
      const bankJson = await bankRes.json()
      const allJson = await allRes.json()
      if (bankJson.success) setBankAccounts(bankJson.data)
      if (allJson.success) setAllAccounts(allJson.data)
    } catch {
      toast.error('Failed to load accounts')
    }
  }, [])

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch('/api/transactions?transType=FUND_PAYMENT&limit=20')
      const json = await res.json()
      if (json.success) {
        setTransactions(json.data)
        setPairedTransactions(pairTransactions(json.data))
      }
    } catch {
      toast.error('Failed to load fund payments')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    Promise.all([fetchAccounts(), fetchTransactions()])
  }, [fetchAccounts, fetchTransactions])

  // ── Reset Form ──
  function resetForm() {
    setFormDate(format(new Date(), 'yyyy-MM-dd'))
    setFromBankId('')
    setToAccountId('')
    setFormAmount('')
    setFormRef('')
    setFormComments('')
  }

  // ── Save ──
  async function handleSave(andNew = false) {
    // Validation
    if (!formDate) {
      toast.error('Transaction date is required')
      return
    }
    if (!fromBankId) {
      toast.error('Please select a transfer-from bank')
      return
    }
    if (!toAccountId) {
      toast.error('Please select a transfer-to account')
      return
    }
    if (fromBankId === toAccountId) {
      toast.error('Transfer From and Transfer To cannot be the same account')
      return
    }
    if (!formAmount || Number(formAmount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    try {
      setSaving(true)

      const refNo = formRef.trim() || generateRefNo()
      const amount = Number(formAmount)

      // Double-entry: two individual POST calls
      const [creditRes, debitRes] = await Promise.all([
        // Credit (money leaving from bank)
        fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transDate: formDate,
            accountId: Number(fromBankId),
            debit: 0,
            credit: amount,
            refNo,
            comments: formComments.trim() || undefined,
            transType: 'FUND_PAYMENT',
          }),
        }),
        // Debit (money going to destination)
        fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transDate: formDate,
            accountId: Number(toAccountId),
            debit: amount,
            credit: 0,
            refNo,
            comments: formComments.trim() || undefined,
            transType: 'FUND_PAYMENT',
          }),
        }),
      ])

      const creditJson = await creditRes.json()
      const debitJson = await debitRes.json()

      if (!creditJson.success || !debitJson.success) {
        toast.error(creditJson.error || debitJson.error || 'Failed to create fund payment')
        return
      }

      toast.success(`Fund payment of ${formatCurrency(amount)} saved successfully`)

      if (andNew) {
        resetForm()
      } else {
        resetForm()
      }

      fetchTransactions()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ──
  function openDeleteDialog(item: PairedTransaction) {
    setDeletingItem(item)
    setDeleteOpen(true)
  }

  async function handleDelete() {
    if (!deletingItem) return
    try {
      setDeleting(true)
      await Promise.all(
        deletingItem.ids.map((id) =>
          fetch(`/api/transactions?id=${id}`, { method: 'DELETE' })
        )
      )
      toast.success('Fund payment deleted successfully')
      setDeleteOpen(false)
      setDeletingItem(null)
      fetchTransactions()
    } catch {
      toast.error('Failed to delete fund payment')
    } finally {
      setDeleting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return <FundPaymentSkeleton />

  // Filter out the fromBank from "Transfer To" dropdown
  const availableToAccounts = allAccounts.filter((a) => a.id !== Number(fromBankId))

  return (
    <div className="space-y-6">
      {/* ── Title ── */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center">
          <Wallet className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Fund Payment
          </h2>
          <p className="text-xs text-muted-foreground">Transfer funds from bank to another account</p>
        </div>
      </div>

      {/* ── Form Card ── */}
      <Card className="py-0 gap-0 border-amber-200">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="fp-date">
                Date <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fp-date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="fp-amount">
                Amount (PKR) <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="fp-amount"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                className="text-right tabular-nums"
              />
            </div>

            {/* Transfer From Bank */}
            <div className="space-y-1.5">
              <Label>
                Transfer From Bank <span className="text-rose-500">*</span>
              </Label>
              <Select value={fromBankId} onValueChange={setFromBankId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.length === 0 && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      No bank accounts found
                    </div>
                  )}
                  {bankAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={String(acc.id)}>
                      {acc.aname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Transfer To */}
            <div className="space-y-1.5">
              <Label>
                Transfer To <span className="text-rose-500">*</span>
              </Label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select destination account" />
                </SelectTrigger>
                <SelectContent>
                  {availableToAccounts.length === 0 && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      No accounts available
                    </div>
                  )}
                  {availableToAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={String(acc.id)}>
                      <span className="flex items-center gap-2">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            acc.atype === 'BANK'
                              ? 'bg-sky-400'
                              : acc.atype === 'ASSET'
                              ? 'bg-amber-400'
                              : acc.atype === 'CAPITAL'
                              ? 'bg-purple-400'
                              : acc.atype === 'EXPENSE'
                              ? 'bg-rose-400'
                              : 'bg-emerald-400'
                          }`}
                        />
                        {acc.aname}
                        <span className="text-muted-foreground text-[10px]">({acc.atype})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reference No */}
            <div className="space-y-1.5">
              <Label htmlFor="fp-ref">Reference No</Label>
              <Input
                id="fp-ref"
                placeholder="Auto-generated if empty"
                value={formRef}
                onChange={(e) => setFormRef(e.target.value)}
              />
            </div>

            {/* Comments */}
            <div className="space-y-1.5">
              <Label htmlFor="fp-comments">Comments</Label>
              <Textarea
                id="fp-comments"
                placeholder="Optional notes..."
                value={formComments}
                onChange={(e) => setFormComments(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
            >
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Save
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={saving}
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              <Plus className="h-4 w-4 mr-1.5" />
              Save &amp; New
            </Button>
            <Button
              onClick={resetForm}
              disabled={saving}
              variant="outline"
              className="text-muted-foreground"
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Double-Entry Indicator ── */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
        <ArrowRightLeft className="h-3.5 w-3.5" />
        <span>Double-entry: Credit from bank + Debit to destination account</span>
      </div>

      <Separator />

      {/* ── Recent Transactions ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Recent Fund Payments</h3>
          <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] font-semibold tabular-nums">
            {pairedTransactions.length}
          </Badge>
        </div>

        {pairedTransactions.length === 0 ? (
          <Card className="py-0 gap-0">
            <CardContent className="p-8 flex flex-col items-center justify-center text-center">
              <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center mb-3">
                <Wallet className="h-6 w-6 text-amber-400" />
              </div>
              <p className="text-sm font-medium text-foreground">No fund payments yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create your first fund payment using the form above.
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
                    <TableHead className="text-xs font-semibold">From Bank</TableHead>
                    <TableHead className="text-xs font-semibold">To Account</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Amount</TableHead>
                    <TableHead className="text-xs font-semibold hidden md:table-cell">Ref</TableHead>
                    <TableHead className="text-xs font-semibold hidden lg:table-cell">Comments</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pairedTransactions.map((item, idx) => (
                    <TableRow key={idx} className="group">
                      {/* Date */}
                      <TableCell>
                        <span className="text-xs tabular-nums text-foreground">
                          {format(parseISO(item.date), 'dd MMM yyyy')}
                        </span>
                      </TableCell>

                      {/* From Bank */}
                      <TableCell>
                        <span className="text-xs font-medium text-rose-600">
                          {item.fromBankName}
                        </span>
                      </TableCell>

                      {/* To Account */}
                      <TableCell>
                        <span className="text-xs font-medium text-emerald-600">
                          {item.toAccountName}
                        </span>
                      </TableCell>

                      {/* Amount */}
                      <TableCell className="text-right">
                        <span className="text-xs font-semibold tabular-nums text-foreground">
                          {formatCurrency(item.amount)}
                        </span>
                      </TableCell>

                      {/* Ref */}
                      <TableCell className="hidden md:table-cell">
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {item.refNo || '—'}
                        </span>
                      </TableCell>

                      {/* Comments */}
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-[11px] text-muted-foreground max-w-[160px] truncate block">
                          {item.comments || '—'}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => openDeleteDialog(item)}
                          title="Delete"
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

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Fund Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this fund payment of{' '}
              <span className="font-semibold text-foreground">
                {deletingItem ? formatCurrency(deletingItem.amount) : ''}
              </span>{' '}
              from <span className="font-semibold text-foreground">{deletingItem?.fromBankName}</span> to{' '}
              <span className="font-semibold text-foreground">{deletingItem?.toAccountName}</span>?
              Both debit and credit entries will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
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

      {/* ── Custom Scrollbar Styles ── */}
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
