'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import {
  FileText,
  Loader2,
  Trash2,
  Plus,
  CalendarDays,
  RefreshCw,
  Minus,
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

interface JournalLine {
  id: string
  accountId: string
  debit: string
  credit: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

const currencyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0, maximumFractionDigits: 0 })
function formatCurrency(amount: number): string { return currencyFmt.format(amount) }

// ─── Skeleton ───────────────────────────────────────────────────────────────

function JournalEntrySkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-lg" /><Skeleton className="h-7 w-36" /></div>
      <Card className="py-0 gap-0"><CardContent className="p-6"><Skeleton className="h-10 w-full mb-4" /><div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="grid grid-cols-3 gap-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>)}</div><div className="flex gap-3 mt-4"><Skeleton className="h-10 w-32" /><Skeleton className="h-10 w-36" /></div></CardContent></Card>
      <div className="space-y-3"><Skeleton className="h-6 w-40" /><div className="rounded-lg border">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="border-b px-4 py-3"><Skeleton className="h-4 w-full" /></div>)}</div></div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function JournalEntryView() {
  const [allAccounts, setAllAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [formRef, setFormRef] = useState('')
  const [formComments, setFormComments] = useState('')
  const [lines, setLines] = useState<JournalLine[]>([
    { id: crypto.randomUUID(), accountId: '', debit: '', credit: '' },
    { id: crypto.randomUUID(), accountId: '', debit: '', credit: '' },
  ])
  const [saving, setSaving] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/accounts?isActive=true&limit=100')
      const json = await res.json()
      if (json.success) setAllAccounts(json.data)
    } catch { toast.error('Failed to load accounts') }
  }, [])

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch('/api/transactions?transType=JOURNAL&limit=20')
      const json = await res.json()
      if (json.success) setTransactions(json.data)
    } catch { toast.error('Failed to load journals') } finally { setLoading(false) }
  }, [])

  useEffect(() => { Promise.all([fetchAccounts(), fetchTransactions()]) }, [fetchAccounts, fetchTransactions])

  function resetForm() {
    setFormDate(format(new Date(), 'yyyy-MM-dd'))
    setFormRef('')
    setFormComments('')
    setLines([
      { id: crypto.randomUUID(), accountId: '', debit: '', credit: '' },
      { id: crypto.randomUUID(), accountId: '', debit: '', credit: '' },
    ])
  }

  function updateLine(id: string, field: keyof JournalLine, value: string) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)))
  }

  function addLine() {
    setLines((prev) => [...prev, { id: crypto.randomUUID(), accountId: '', debit: '', credit: '' }])
  }

  function removeLine(id: string) {
    if (lines.length <= 2) { toast.error('Minimum 2 journal lines required'); return }
    setLines((prev) => prev.filter((l) => l.id !== id))
  }

  function getTotalDebit(): number {
    return lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0)
  }

  function getTotalCredit(): number {
    return lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0)
  }

  async function handleSave(andNew = false) {
    if (!formDate) { toast.error('Date is required'); return }

    const validLines = lines.filter((l) => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0))
    if (validLines.length < 2) { toast.error('At least 2 journal lines with accounts are required'); return }

    const totalDebit = getTotalDebit()
    const totalCredit = getTotalCredit()
    if (totalDebit === 0 && totalCredit === 0) { toast.error('Enter debit or credit amounts'); return }
    if (totalDebit !== totalCredit) {
      toast.error(`Debit (${formatCurrency(totalDebit)}) must equal Credit (${formatCurrency(totalCredit)})`)
      return
    }

    try {
      setSaving(true)
      const refNo = formRef.trim() || undefined
      const comments = formComments.trim() || undefined

      const results = await Promise.all(
        validLines.map((l) =>
          fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transDate: formDate,
              accountId: Number(l.accountId),
              debit: Number(l.debit) || 0,
              credit: Number(l.credit) || 0,
              refNo,
              comments,
              transType: 'JOURNAL',
            }),
          })
        )
      )

      const jsons = await Promise.all(results.map((r) => r.json()))
      if (jsons.some((j) => !j.success)) {
        toast.error(jsons.find((j) => !j.success)?.error || 'Failed to save journal entry')
        return
      }

      toast.success(`Journal entry saved (${validLines.length} lines)`)
      if (andNew) resetForm()
      else resetForm()
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
      toast.success('Entry deleted'); setDeleteOpen(false); fetchTransactions()
    } catch { toast.error('Network error') } finally { setDeleting(false) }
  }

  if (loading) return <JournalEntrySkeleton />

  const totalDebit = getTotalDebit()
  const totalCredit = getTotalCredit()
  const isBalanced = totalDebit === totalCredit && totalDebit > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-purple-100 flex items-center justify-center"><FileText className="h-5 w-5 text-purple-600" /></div>
        <div><h2 className="text-xl font-bold tracking-tight text-foreground">Journal Entry</h2><p className="text-xs text-muted-foreground">Record manual double-entry journal entries</p></div>
      </div>

      <Card className="py-0 gap-0 border-purple-200">
        <CardContent className="p-6">
          {/* Date & Ref */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-1.5">
              <Label htmlFor="jnl-date">Date <span className="text-rose-500">*</span></Label>
              <div className="relative"><CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="jnl-date" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="pl-9" /></div>
            </div>
            <div className="space-y-1.5"><Label htmlFor="jnl-ref">Reference No</Label><Input id="jnl-ref" placeholder="Optional" value={formRef} onChange={(e) => setFormRef(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="jnl-comments">Comments</Label><Textarea id="jnl-comments" placeholder="Optional notes..." value={formComments} onChange={(e) => setFormComments(e.target.value)} rows={1} /></div>
          </div>

          {/* Journal Lines */}
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_100px_100px_40px] md:grid-cols-[1fr_120px_120px_40px] gap-2 px-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Account</span>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase text-right">Debit</span>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase text-right">Credit</span>
              <span />
            </div>
            {lines.map((line, idx) => (
              <div key={line.id} className="grid grid-cols-[1fr_100px_100px_40px] md:grid-cols-[1fr_120px_120px_40px] gap-2 items-start">
                <Select value={line.accountId} onValueChange={(v) => updateLine(line.id, 'accountId', v)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>{allAccounts.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.aname}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" min="0" step="1" placeholder="0" value={line.debit} onChange={(e) => updateLine(line.id, 'debit', e.target.value)} className="h-9 text-right tabular-nums text-xs" />
                <Input type="number" min="0" step="1" placeholder="0" value={line.credit} onChange={(e) => updateLine(line.id, 'credit', e.target.value)} className="h-9 text-right tabular-nums text-xs" />
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-rose-600 hover:bg-rose-50" onClick={() => removeLine(line.id)} disabled={lines.length <= 2}><Minus className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="grid grid-cols-[1fr_100px_100px_40px] md:grid-cols-[1fr_120px_120px_40px] gap-2 mt-3 pt-3 border-t">
            <div />
            <div className="text-right text-xs font-semibold tabular-nums text-foreground">{formatCurrency(totalDebit)}</div>
            <div className="text-right text-xs font-semibold tabular-nums text-foreground">{formatCurrency(totalCredit)}</div>
            <div />
          </div>
          <div className="flex items-center justify-between mt-2">
            <Badge variant="outline" className={`text-[10px] ${isBalanced ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
              {isBalanced ? '✓ Balanced' : `⚠ Difference: ${formatCurrency(Math.abs(totalDebit - totalCredit))}`}
            </Badge>
            <Button variant="outline" size="sm" className="h-7 text-xs text-muted-foreground" onClick={addLine}><Plus className="h-3 w-3 mr-1" />Add Line</Button>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 mt-5">
            <Button onClick={() => handleSave(false)} disabled={saving || !isBalanced} className="bg-purple-500 hover:bg-purple-600 text-white shadow-sm">{saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}Save</Button>
            <Button onClick={() => handleSave(true)} disabled={saving || !isBalanced} variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50">{saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}<Plus className="h-4 w-4 mr-1.5" />Save &amp; New</Button>
            <Button onClick={resetForm} disabled={saving} variant="outline" className="text-muted-foreground"><RefreshCw className="h-4 w-4 mr-1.5" />Reset</Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center gap-2"><h3 className="text-sm font-semibold text-foreground">Recent Journal Entries</h3><Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200 text-[10px] font-semibold tabular-nums">{transactions.length}</Badge></div>
        {transactions.length === 0 ? (
          <Card className="py-0 gap-0"><CardContent className="p-8 flex flex-col items-center justify-center text-center"><div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center mb-3"><FileText className="h-6 w-6 text-purple-400" /></div><p className="text-sm font-medium text-foreground">No journal entries yet</p><p className="text-xs text-muted-foreground mt-1">Create your first journal entry above.</p></CardContent></Card>
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
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Journal Entry</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete this transaction?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-rose-500 hover:bg-rose-600 text-white">{deleting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <style jsx global>{`.custom-scrollbar::-webkit-scrollbar{width:6px}.custom-scrollbar::-webkit-scrollbar-track{background:transparent}.custom-scrollbar::-webkit-scrollbar-thumb{background-color:rgb(203 213 225/0.6);border-radius:3px}.custom-scrollbar::-webkit-scrollbar-thumb:hover{background-color:rgb(148 163 184/0.8)}`}</style>
    </div>
  )
}
