'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import {
  Bell,
  Plus,
  Search,
  Trash2,
  CheckCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
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

interface Reminder {
  id: number
  transDate: string
  accountId: number
  bankId: number | null
  projectId: number | null
  debit: number
  credit: number
  refNo: string | null
  comments: string | null
  transType: string
  isRemind: boolean
  createdAt: string
  account: {
    id: number
    aname: string
    atype: string
  }
  bank: {
    id: number
    aname: string
  } | null
  project: {
    id: number
    pname: string
  } | null
}

interface AccountOption {
  id: number
  aname: string
  atype: string
}

interface ProductOption {
  id: number
  pname: string
}

interface ReminderStats {
  total: number
  upcoming: number
  overdue: number
  completed: number
}

type StatusFilter = 'all' | 'upcoming' | 'overdue' | 'completed'

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Completed', value: 'completed' },
]

const TYPE_BADGE_COLORS: Record<string, string> = {
  BANK: 'bg-sky-100 text-sky-700 border-sky-200',
  ASSET: 'bg-amber-100 text-amber-700 border-amber-200',
  CAPITAL: 'bg-stone-100 text-stone-700 border-stone-200',
  LIABILITY: 'bg-rose-100 text-rose-700 border-rose-200',
  RECEIVABLE: 'bg-orange-100 text-orange-700 border-orange-200',
  PAYABLE: 'bg-red-100 text-red-700 border-red-200',
  INCOME: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  EXPENSE: 'bg-rose-100 text-rose-700 border-rose-200',
  EMPLOYEE: 'bg-stone-100 text-stone-700 border-stone-200',
  CUSTOMER: 'bg-teal-100 text-teal-700 border-teal-200',
  STOCK: 'bg-stone-100 text-stone-700 border-stone-200',
}

const STATUS_BADGE: Record<string, string> = {
  upcoming: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  overdue: 'bg-rose-100 text-rose-700 border-rose-200',
  completed: 'bg-stone-100 text-stone-500 border-stone-200',
}

const currencyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'PKR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

function formatCurrency(amount: number): string {
  return currencyFmt.format(amount)
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n)
}

function getReminderStatus(transDate: string, isRemind: boolean): string {
  if (!isRemind) return 'completed'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(transDate)
  date.setHours(0, 0, 0, 0)
  if (date < today) return 'overdue'
  return 'upcoming'
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function RemindersSkeleton() {
  return (
    <div className="space-y-4">
      {/* Top bar skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div>
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-52 mt-1" />
          </div>
        </div>
        <div className="flex-1" />
        <Skeleton className="h-9 w-36" />
      </div>
      {/* Filter bar skeleton */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex items-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-full" />
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      </div>
      {/* Stats row skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      {/* Table skeleton */}
      <div className="rounded-lg border">
        <div className="border-b px-4 py-3 flex gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20 hidden md:block" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border-b px-4 py-3 flex gap-4 items-center">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20 hidden md:block" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <div className="flex gap-1 ml-auto">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function RemindersView() {
  // ── Data State ──
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<ReminderStats>({
    total: 0,
    upcoming: 0,
    overdue: 0,
    completed: 0,
  })

  // ── Filter State ──
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // ── Dialog State ──
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // ── Form State ──
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [formAccountId, setFormAccountId] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formBankId, setFormBankId] = useState('')
  const [formProjectId, setFormProjectId] = useState('')
  const [formComments, setFormComments] = useState('')

  // ── Dropdown Data ──
  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [bankAccounts, setBankAccounts] = useState<AccountOption[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])

  // ── Delete State ──
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingReminder, setDeletingReminder] = useState<Reminder | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ── Debounce Search ──
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [searchQuery])

  // ── Reset page on filter change ──
  useEffect(() => {
    setPage(1)
  }, [statusFilter, debouncedSearch])

  // ── Fetch Stats ──
  const fetchStats = useCallback(async () => {
    try {
      const statuses: StatusFilter[] = ['all', 'upcoming', 'overdue', 'completed']
      const results = await Promise.all(
        statuses.map(async (s) => {
          const params = new URLSearchParams({ status: s, page: '1', limit: '1' })
          const res = await fetch(`/api/reminders?${params.toString()}`)
          const json = await res.json()
          return json.success ? (json.data.total as number) : 0
        })
      )
      setStats({
        total: results[0],
        upcoming: results[1],
        overdue: results[2],
        completed: results[3],
      })
    } catch {
      // Silent fail for stats
    }
  }, [])

  // ── Fetch Reminders ──
  const fetchReminders = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('status', statusFilter)
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (debouncedSearch) params.set('search', debouncedSearch)

      const res = await fetch(`/api/reminders?${params.toString()}`)
      const json = await res.json()
      if (!json.success) {
        toast.error('Failed to load reminders')
        return
      }
      setReminders(json.data.reminders)
      setTotal(json.data.total)
    } catch {
      toast.error('Network error while loading reminders')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, page, limit, debouncedSearch])

  // ── Fetch Dropdown Data ──
  const fetchDropdownData = useCallback(async () => {
    try {
      const [accRes, prodRes] = await Promise.all([
        fetch('/api/accounts?limit=500&isActive=true'),
        fetch('/api/products?limit=500'),
      ])
      const [accJson, prodJson] = await Promise.all([accRes.json(), prodRes.json()])

      if (accJson.success) {
        setAccounts(accJson.data || [])
        setBankAccounts(
          (accJson.data || []).filter(
            (a: AccountOption) => a.atype === 'BANK'
          )
        )
      }
      if (prodJson.success) {
        setProducts(prodJson.data || [])
      }
    } catch {
      // Silent fail for dropdowns
    }
  }, [])

  useEffect(() => {
    fetchStats()
    fetchReminders()
    fetchDropdownData()
  }, [fetchStats, fetchReminders, fetchDropdownData])

  // ── Pagination helpers ──
  const totalPages = Math.ceil(total / limit)
  const startItem = total > 0 ? (page - 1) * limit + 1 : 0
  const endItem = Math.min(page * limit, total)

  function goToPage(newPage: number) {
    setPage(newPage)
  }

  // ── Open Add Dialog ──
  function openAddDialog() {
    setFormDate(format(new Date(), 'yyyy-MM-dd'))
    setFormAccountId('')
    setFormAmount('')
    setFormBankId('')
    setFormProjectId('')
    setFormComments('')
    setDialogOpen(true)
  }

  // ── Save Reminder ──
  async function handleSave() {
    if (!formDate) {
      toast.error('Date is required')
      return
    }
    if (!formAccountId) {
      toast.error('Account is required')
      return
    }
    if (!formAmount || Number(formAmount) <= 0) {
      toast.error('Valid amount is required')
      return
    }

    try {
      setSaving(true)
      const body: Record<string, unknown> = {
        transDate: formDate,
        accountId: Number(formAccountId),
        amount: Number(formAmount),
      }
      if (formComments.trim()) body.comments = formComments.trim()
      if (formBankId) body.bankId = Number(formBankId)
      if (formProjectId) body.projectId = Number(formProjectId)

      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!json.success) {
        toast.error(json.error || 'Failed to create reminder')
        return
      }
      toast.success('Reminder created successfully')
      setDialogOpen(false)
      fetchReminders()
      fetchStats()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Complete Reminder ──
  async function handleComplete(reminder: Reminder) {
    try {
      const res = await fetch('/api/reminders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reminder.id, isRemind: false }),
      })
      const json = await res.json()
      if (!json.success) {
        toast.error(json.error || 'Failed to complete reminder')
        return
      }
      toast.success('Reminder marked as completed')
      fetchReminders()
      fetchStats()
    } catch {
      toast.error('Network error. Please try again.')
    }
  }

  // ── Open Delete Dialog ──
  function openDeleteDialog(reminder: Reminder) {
    setDeletingReminder(reminder)
    setDeleteOpen(true)
  }

  // ── Confirm Delete ──
  async function handleDelete() {
    if (!deletingReminder) return
    try {
      setDeleting(true)
      const res = await fetch('/api/reminders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deletingReminder.id }),
      })
      const json = await res.json()
      if (!json.success) {
        toast.error(json.error || 'Failed to delete reminder')
        return
      }
      toast.success('Reminder deleted successfully')
      setDeleteOpen(false)
      setDeletingReminder(null)
      fetchReminders()
      fetchStats()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading && reminders.length === 0) return <RemindersSkeleton />

  return (
    <div className="space-y-4">
      {/* ── Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center">
            <Bell className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Reminders
            </h2>
            <p className="text-xs text-muted-foreground">
              Track upcoming payments, dues, and important dates
            </p>
          </div>
        </div>
        <div className="flex-1" />
        <Button
          onClick={openAddDialog}
          className="bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Reminder
        </Button>
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Status filter badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_OPTIONS.map((opt) => (
            <Badge
              key={opt.value}
              variant="outline"
              className={`cursor-pointer select-none text-xs font-medium px-3 py-1 transition-colors ${
                statusFilter === opt.value
                  ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600'
                  : 'bg-white text-muted-foreground border-border hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200'
              }`}
              onClick={() => setStatusFilter(opt.value)}
            >
              {opt.label}
            </Badge>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs w-full sm:w-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reminders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="py-0 gap-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                <Bell className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Reminders</p>
                <p className="text-lg font-bold text-foreground tabular-nums">{formatNumber(stats.total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="py-0 gap-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Upcoming</p>
                <p className="text-lg font-bold text-emerald-600 tabular-nums">{formatNumber(stats.upcoming)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="py-0 gap-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Overdue</p>
                <p className="text-lg font-bold text-rose-600 tabular-nums">{formatNumber(stats.overdue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="py-0 gap-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4 w-4 text-stone-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Completed</p>
                <p className="text-lg font-bold text-stone-500 tabular-nums">{formatNumber(stats.completed)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Data Table ── */}
      <div className="rounded-lg border overflow-hidden">
        {reminders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-14 w-14 rounded-full bg-amber-50 flex items-center justify-center mb-4">
              <Bell className="h-7 w-7 text-amber-400" />
            </div>
            <p className="text-sm font-medium text-foreground">No reminders found</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters or search query.'
                : 'Get started by adding your first reminder.'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button
                onClick={openAddDialog}
                className="mt-4 bg-amber-500 hover:bg-amber-600 text-white h-8 text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add First Reminder
              </Button>
            )}
          </div>
        ) : (
          <ScrollArea className="max-h-[calc(100vh-380px)]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs font-semibold">Date</TableHead>
                  <TableHead className="text-xs font-semibold">Account</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Amount</TableHead>
                  <TableHead className="text-xs font-semibold hidden lg:table-cell">Bank</TableHead>
                  <TableHead className="text-xs font-semibold hidden md:table-cell">Comments</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reminders.map((reminder) => {
                  const status = getReminderStatus(reminder.transDate, reminder.isRemind)
                  return (
                    <TableRow key={reminder.id} className="group">
                      {/* Date */}
                      <TableCell>
                        <span className="text-sm font-medium tabular-nums text-foreground">
                          {format(parseISO(reminder.transDate), 'dd MMM yyyy')}
                        </span>
                      </TableCell>

                      {/* Account with type badge */}
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-semibold text-foreground truncate">
                            {reminder.account.aname}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 font-medium whitespace-nowrap shrink-0 ${
                              TYPE_BADGE_COLORS[reminder.account.atype] || 'bg-gray-100 text-gray-700 border-gray-200'
                            }`}
                          >
                            {reminder.account.atype}
                          </Badge>
                        </div>
                      </TableCell>

                      {/* Amount */}
                      <TableCell className="text-right">
                        <span className="text-sm font-semibold tabular-nums text-foreground">
                          {formatCurrency(reminder.debit || reminder.credit || 0)}
                        </span>
                      </TableCell>

                      {/* Bank */}
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {reminder.bank?.aname || '—'}
                        </span>
                      </TableCell>

                      {/* Comments */}
                      <TableCell className="hidden md:table-cell">
                        <span className="text-xs text-muted-foreground truncate max-w-[200px] block">
                          {reminder.comments || '—'}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 font-medium ${
                            STATUS_BADGE[status] || 'bg-gray-100 text-gray-700 border-gray-200'
                          }`}
                        >
                          {status === 'upcoming' ? 'Upcoming' : status === 'overdue' ? 'Overdue' : 'Completed'}
                        </Badge>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {reminder.isRemind && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50"
                              onClick={() => handleComplete(reminder)}
                              title="Mark as completed"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                            onClick={() => openDeleteDialog(reminder)}
                            title="Delete reminder"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-medium tabular-nums">{formatNumber(startItem)}</span>
            {'–'}
            <span className="font-medium tabular-nums">{formatNumber(endItem)}</span>
            {' of '}
            <span className="font-medium tabular-nums">{formatNumber(total)}</span>
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium tabular-nums px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Add Reminder Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Reminder</DialogTitle>
            <DialogDescription>
              Set a reminder for an upcoming payment, due, or important date.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="reminder-date">
                Date <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="reminder-date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>

            {/* Account */}
            <div className="space-y-1.5">
              <Label htmlFor="reminder-account">
                Account <span className="text-rose-500">*</span>
              </Label>
              <Select value={formAccountId} onValueChange={setFormAccountId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={String(acc.id)}>
                      <span className="flex items-center gap-2">
                        <span
                          className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                            TYPE_BADGE_COLORS[acc.atype]?.split(' ')[0] || 'bg-gray-300'
                          }`}
                        />
                        <span className="truncate">{acc.aname}</span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1 py-0 font-medium ml-auto shrink-0 ${
                            TYPE_BADGE_COLORS[acc.atype] || 'bg-gray-100 text-gray-700 border-gray-200'
                          }`}
                        >
                          {acc.atype}
                        </Badge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="reminder-amount">
                Amount (PKR) <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="reminder-amount"
                type="number"
                placeholder="0"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                min="0"
                className="text-right tabular-nums font-mono"
              />
            </div>

            {/* Bank */}
            <div className="space-y-1.5">
              <Label htmlFor="reminder-bank">Bank (optional)</Label>
              <Select value={formBankId} onValueChange={setFormBankId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={String(acc.id)}>
                      {acc.aname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project */}
            <div className="space-y-1.5">
              <Label htmlFor="reminder-project">Project (optional)</Label>
              <Select value={formProjectId} onValueChange={setFormProjectId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.pname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Comments */}
            <div className="space-y-1.5">
              <Label htmlFor="reminder-comments">Comments</Label>
              <Textarea
                id="reminder-comments"
                placeholder="Add any notes or details..."
                value={formComments}
                onChange={(e) => setFormComments(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Save Reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reminder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this reminder? This action cannot be undone.
              {deletingReminder && (
                <span className="block mt-2 text-sm font-medium text-foreground">
                  {deletingReminder.account.aname} — {formatCurrency(deletingReminder.debit || deletingReminder.credit || 0)} on{' '}
                  {format(parseISO(deletingReminder.transDate), 'dd MMM yyyy')}
                </span>
              )}
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
