'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import {
  Landmark,
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
  fromAccountId: number
  fromAccountName: string
  toBankId: number
  toBankName: string
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

function FundReceiptSkeleton() {
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

export function FundReceiptView() {
  // ── Data State ──
  const [bankAccounts, setBankAccounts] = useState<Account[]>([])
  const [allAccounts, setAllAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [pairedTransactions, setPairedTransactions] = useState<PairedTransaction[]>([])
  const [loading, setLoading] = useState(true)

  // ── Form State ──
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [fromAccountId, setFromAccountId] = useState('')
  const [toBankId, setToBankId] = useState('')
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
    return `FR-${dateStr}-${timeStr}`
  }

  function pairTransactions(transList: Transaction[]): PairedTransaction[] {
    const grouped: Record<string, Transaction[]> = {}
    for (const t of transList) {
      const key = t.refNo || `${t.transDate}-${t.debit}-${t.credit}-${t.comments}`
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(t)
    }

    const paired: PairedTransaction[] = []
    for (const entries of Object.values(grouped)) {
      const debitEntry = entries.find((e) => e.debit > 0)
      const creditEntry = entries.find((e) => e.credit > 0)

      if (debitEntry && creditEntry) {
        paired.push({
          date: debitEntry.transDate,
          fromAccountId: creditEntry.accountId,
          fromAccountName: creditEntry.account.aname,
          toBankId: debitEntry.accountId,
          toBankName: debitEntry.account.aname,
          amount: debitEntry.debit,
          refNo: debitEntry.refNo,
          comments: debitEntry.comments,
          ids: entries.map((e) => e.id),
        })
      } else {
        // Unpaired entry
        const entry = entries[0]
        if (entry) {
          paired.push({
            date: entry.transDate,
            fromAccountId: entry.credit > 0 ? entry.accountId : 0,
            fromAccountName: entry.credit > 0 ? entry.account.aname : '—',
            toBankId: entry.debit > 0 ? entry.accountId : 0,
            toBankName: entry.debit > 0 ? entry.account.aname : '—',
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
      const res = await fetch('/api/transactions?transType=FUND_RECEIPT&limit=20')
      const json = await res.json()
      if (json.success) {
        setTransactions(json.data)
        setPairedTransactions(pairTransactions(json.data))
      }
    } catch {
      toast.error('Failed to load fund receipts')
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
    setFromAccountId('')
    setToBankId('')
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
    if (!fromAccountId) {
      toast.error('Please select a received-from account')
      return
    }
    if (!toBankId) {
      toast.error('Please select a received-in bank')
      return
    }
    if (fromAccountId === toBankId) {
      toast.error('Received From and Received In cannot be the same account')
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
      const [debitRes, creditRes] = await Promise.all([
        // Debit (money entering bank)
        fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transDate: formDate,
            accountId: Number(toBankId),
            debit: amount,
            credit: 0,
            refNo,
            comments: formComments.trim() || undefined,
            transType: 'FUND_RECEIPT',
          }),
        }),
        // Credit (money leaving source)
        fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transDate: formDate,
            accountId: Number(fromAccountId),
            debit: 0,
            credit: amount,
            refNo,
            comments: formComments.trim() || undefined,
            transType: 'FUND_RECEIPT',
          }),
        }),
      ])

      const debitJson = await debitRes.json()
      const creditJson = await creditRes.json()

      if (!debitJson.success || !creditJson.success) {
        toast.error(debitJson.error || creditJson.error || 'Failed to create fund receipt')
        return
      }

      toast.success(`Fund receipt of ${formatCurrency(amount)} saved successfully`)

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
      toast.success('Fund receipt deleted successfully')
      setDeleteOpen(false)
      setDeletingItem(null)
      fetchTransactions()
    } catch {
      toast.error('Failed to delete fund receipt')
    } finally {
      setDeleting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return <FundReceiptSkeleton />

  // Filter out the toBank from "Received From" dropdown
  const availableFromAccounts = allAccounts.filter((a) => a.id !== Number(toBankId))

  return (
    <div className="space-y-6">
      {/* ── Title ── */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center">
          <Landmark className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Fund Receipt
          </h2>
          <p className="text-xs text-muted-foreground">Receive funds from an account into a bank</p>
        </div>
      </div>

      {/* ── Form Card ── */}
      <Card className="py-0 gap-0 border-emerald-200">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="fr-date">
                Date <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fr-date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="fr-amount">
                Amount (PKR) <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="fr-amount"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                className="text-right tabular-nums"
              />
            </div>

            {/* Received From */}
            <div className="space-y-1.5">
              <Label>
                Received From <span className="text-rose-500">*</span>
              </Label>
              <Select value={fromAccountId} onValueChange={setFromAccountId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select source account" />
                </SelectTrigger>
                <SelectContent>
                  {availableFromAccounts.length === 0 && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      No accounts available
                    </div>
                  )}
                  {availableFromAccounts.map((acc) => (
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

            {/* Received In Bank */}
            <div className="space-y-1.5">
              <Label>
                Received In Bank <span className="text-rose-500">*</span>
              </Label>
              <Select value={toBankId} onValueChange={setToBankId}>
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

            {/* Reference No */}
            <div className="space-y-1.5">
              <Label htmlFor="fr-ref">Reference No</Label>
              <Input
                id="fr-ref"
                placeholder="Auto-generated if empty"
                value={formRef}
                onChange={(e) => setFormRef(e.target.value)}
              />
            </div>

            {/* Comments */}
            <div className="space-y-1.5">
              <Label htmlFor="fr-comments">Comments</Label>
              <Textarea
                id="fr-comments"
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
              className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
            >
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Save
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={saving}
              variant="outline"
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
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
        <span>Double-entry: Debit to bank + Credit from source account</span>
      </div>

      <Separator />

      {/* ── Recent Transactions ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Recent Fund Receipts</h3>
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-semibold tabular-nums">
            {pairedTransactions.length}
          </Badge>
        </div>

        {pairedTransactions.length === 0 ? (
          <Card className="py-0 gap-0">
            <CardContent className="p-8 flex flex-col items-center justify-center text-center">
              <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                <Landmark className="h-6 w-6 text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-foreground">No fund receipts yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create your first fund receipt using the form above.
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
                    <TableHead className="text-xs font-semibold">From Account</TableHead>
                    <TableHead className="text-xs font-semibold">To Bank</TableHead>
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

                      {/* From Account */}
                      <TableCell>
                        <span className="text-xs font-medium text-rose-600">
                          {item.fromAccountName}
                        </span>
                      </TableCell>

                      {/* To Bank */}
                      <TableCell>
                        <span className="text-xs font-medium text-emerald-600">
                          {item.toBankName}
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
            <AlertDialogTitle>Delete Fund Receipt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this fund receipt of{' '}
              <span className="font-semibold text-foreground">
                {deletingItem ? formatCurrency(deletingItem.amount) : ''}
              </span>{' '}
              from <span className="font-semibold text-foreground">{deletingItem?.fromAccountName}</span> to{' '}
              <span className="font-semibold text-foreground">{deletingItem?.toBankName}</span>?
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
