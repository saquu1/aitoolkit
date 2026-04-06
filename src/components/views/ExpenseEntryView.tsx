'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import {
  TrendingDown,
  Loader2,
  Trash2,
  Plus,
  CalendarDays,
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

interface Account { id: number; aname: string; atype: string; isActive: boolean }
interface Transaction {
  id: number; transDate: string; accountId: number; bankId: number | null
  debit: number; credit: number; refNo: string | null; comments: string | null
  transType: string; account: { id: number; aname: string; atype: string } | null
  bank: { id: number; aname: string } | null
}

// ─── Constants ──────────────────────────────────────────────────────────────

const currencyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0, maximumFractionDigits: 0 })
function formatCurrency(amount: number): string { return currencyFmt.format(amount) }

// ─── Skeleton ───────────────────────────────────────────────────────────────

function ExpenseEntrySkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-lg" /><Skeleton className="h-7 w-40" /></div>
      <Card className="py-0 gap-0"><CardContent className="p-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div><div className="flex gap-3 mt-6"><Skeleton className="h-10 w-32" /><Skeleton className="h-10 w-36" /></div></CardContent></Card>
      <div className="space-y-3"><Skeleton className="h-6 w-40" /><div className="rounded-lg border">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="border-b px-4 py-3"><Skeleton className="h-4 w-full" /></div>)}</div></div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ExpenseEntryView() {
  const [bankAccounts, setBankAccounts] = useState<Account[]>([])
  const [expenseAccounts, setExpenseAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [bankId, setBankId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formRef, setFormRef] = useState('')
  const [formComments, setFormComments] = useState('')
  const [saving, setSaving] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchAccounts = useCallback(async () => {
    try {
      const [bankRes, expRes] = await Promise.all([
        fetch('/api/accounts?atype=BANK&isActive=true&limit=100'),
        fetch('/api/accounts?atype=EXPENSE&isActive=true&limit=100'),
      ])
      const bankJson = await bankRes.json()
      const expJson = await expRes.json()
      if (bankJson.success) setBankAccounts(bankJson.data)
      if (expJson.success) setExpenseAccounts(expJson.data)
    } catch { toast.error('Failed to load accounts') }
  }, [])

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch('/api/transactions?transType=EXPENSE&limit=20')
      const json = await res.json()
      if (json.success) setTransactions(json.data)
    } catch { toast.error('Failed to load expenses') } finally { setLoading(false) }
  }, [])

  useEffect(() => { Promise.all([fetchAccounts(), fetchTransactions()]) }, [fetchAccounts, fetchTransactions])

  function resetForm() { setFormDate(format(new Date(), 'yyyy-MM-dd')); setBankId(''); setAccountId(''); setFormAmount(''); setFormRef(''); setFormComments('') }

  async function handleSave(andNew = false) {
    if (!formDate) { toast.error('Date is required'); return }
    if (!bankId) { toast.error('Select a bank'); return }
    if (!accountId) { toast.error('Select an expense account'); return }
    if (!formAmount || Number(formAmount) <= 0) { toast.error('Enter a valid amount'); return }

    try {
      setSaving(true)
      const amount = Number(formAmount)
      // Credit (money leaving bank)
      const creditRes = await fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transDate: formDate, accountId: Number(bankId), debit: 0, credit: amount, refNo: formRef.trim() || undefined, comments: formComments.trim() || undefined, transType: 'EXPENSE' }) })
      // Debit (expense recognized)
      const debitRes = await fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transDate: formDate, accountId: Number(accountId), debit: amount, credit: 0, refNo: formRef.trim() || undefined, comments: formComments.trim() || undefined, transType: 'EXPENSE' }) })

      const creditJson = await creditRes.json()
      const debitJson = await debitRes.json()
      if (!creditJson.success || !debitJson.success) { toast.error(creditJson.error || debitJson.error || 'Failed'); return }

      toast.success(`Expense of ${formatCurrency(amount)} saved`)
      resetForm()
      fetchTransactions()
    } catch { toast.error('Network error') } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deletingId) return
    try {
      setDeleting(true)
      const res = await fetch(`/api/transactions?id=${deletingId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) { toast.error(json.error || 'Delete failed'); return }
      toast.success('Entry deleted')
      setDeleteOpen(false)
      fetchTransactions()
    } catch { toast.error('Network error') } finally { setDeleting(false) }
  }

  if (loading) return <ExpenseEntrySkeleton />

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-rose-100 flex items-center justify-center"><TrendingDown className="h-5 w-5 text-rose-600" /></div>
        <div><h2 className="text-xl font-bold tracking-tight text-foreground">Expense Entry</h2><p className="text-xs text-muted-foreground">Record expense paid from bank</p></div>
      </div>

      <Card className="py-0 gap-0 border-rose-200">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="exp-date">Date <span className="text-rose-500">*</span></Label>
              <div className="relative"><CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="exp-date" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="pl-9" /></div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-amount">Amount (PKR) <span className="text-rose-500">*</span></Label>
              <Input id="exp-amount" type="number" min="0" step="1" placeholder="0" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} className="text-right tabular-nums" />
            </div>
            <div className="space-y-1.5">
              <Label>Paid From Bank <span className="text-rose-500">*</span></Label>
              <Select value={bankId} onValueChange={setBankId}><SelectTrigger className="w-full"><SelectValue placeholder="Select bank" /></SelectTrigger><SelectContent>{bankAccounts.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.aname}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1.5">
              <Label>Expense Account <span className="text-rose-500">*</span></Label>
              <Select value={accountId} onValueChange={setAccountId}><SelectTrigger className="w-full"><SelectValue placeholder="Select expense account" /></SelectTrigger><SelectContent>{expenseAccounts.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.aname}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1.5"><Label htmlFor="exp-ref">Reference No</Label><Input id="exp-ref" placeholder="Optional" value={formRef} onChange={(e) => setFormRef(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="exp-comments">Comments</Label><Textarea id="exp-comments" placeholder="Optional notes..." value={formComments} onChange={(e) => setFormComments(e.target.value)} rows={3} /></div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button onClick={() => handleSave(false)} disabled={saving} className="bg-rose-500 hover:bg-rose-600 text-white shadow-sm">{saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}Save</Button>
            <Button onClick={() => handleSave(true)} disabled={saving} variant="outline" className="border-rose-300 text-rose-700 hover:bg-rose-50">{saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}<Plus className="h-4 w-4 mr-1.5" />Save &amp; New</Button>
            <Button onClick={resetForm} disabled={saving} variant="outline" className="text-muted-foreground"><RefreshCw className="h-4 w-4 mr-1.5" />Reset</Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center gap-2"><h3 className="text-sm font-semibold text-foreground">Recent Expenses</h3><Badge variant="secondary" className="bg-rose-100 text-rose-700 border-rose-200 text-[10px] font-semibold tabular-nums">{transactions.length}</Badge></div>
        {transactions.length === 0 ? (
          <Card className="py-0 gap-0"><CardContent className="p-8 flex flex-col items-center justify-center text-center"><div className="h-12 w-12 rounded-full bg-rose-50 flex items-center justify-center mb-3"><TrendingDown className="h-6 w-6 text-rose-400" /></div><p className="text-sm font-medium text-foreground">No expense entries yet</p><p className="text-xs text-muted-foreground mt-1">Create your first expense entry above.</p></CardContent></Card>
        ) : (
          <div className="rounded-lg border overflow-hidden"><div className="max-h-96 overflow-y-auto custom-scrollbar"><Table><TableHeader><TableRow className="bg-muted/50 hover:bg-muted/50"><TableHead className="text-xs font-semibold">Date</TableHead><TableHead className="text-xs font-semibold">Account</TableHead><TableHead className="text-xs font-semibold text-right">Debit</TableHead><TableHead className="text-xs font-semibold text-right">Credit</TableHead><TableHead className="text-xs font-semibold hidden md:table-cell">Ref</TableHead><TableHead className="text-xs font-semibold hidden lg:table-cell">Comments</TableHead><TableHead className="text-xs font-semibold text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
            {transactions.map((t) => (
              <TableRow key={t.id} className="group">
                <TableCell><span className="text-xs tabular-nums">{format(parseISO(t.transDate), 'dd MMM yyyy')}</span></TableCell>
                <TableCell><span className="text-xs font-medium">{t.account?.aname || '—'}</span></TableCell>
                <TableCell className="text-right"><span className="text-xs tabular-nums text-emerald-600 font-medium">{t.debit > 0 ? formatCurrency(t.debit) : '—'}</span></TableCell>
                <TableCell className="text-right"><span className="text-xs tabular-nums text-rose-600 font-medium">{t.credit > 0 ? formatCurrency(t.credit) : '—'}</span></TableCell>
                <TableCell className="hidden md:table-cell"><span className="text-[11px] text-muted-foreground font-mono">{t.refNo || '—'}</span></TableCell>
                <TableCell className="hidden lg:table-cell"><span className="text-[11px] text-muted-foreground max-w-[160px] truncate block">{t.comments || '—'}</span></TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { setDeletingId(t.id); setDeleteOpen(true) }}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody></Table></div></div>
        )}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Expense Entry</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete this transaction?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-rose-500 hover:bg-rose-600 text-white">{deleting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <style jsx global>{`.custom-scrollbar::-webkit-scrollbar{width:6px}.custom-scrollbar::-webkit-scrollbar-track{background:transparent}.custom-scrollbar::-webkit-scrollbar-thumb{background-color:rgb(203 213 225/0.6);border-radius:3px}.custom-scrollbar::-webkit-scrollbar-thumb:hover{background-color:rgb(148 163 184/0.8)}`}</style>
    </div>
  )
}
