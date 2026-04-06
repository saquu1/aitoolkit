'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Users,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Phone,
  MapPin,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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

interface AccountHead {
  id: number
  atype: string
  dr: boolean
  description: string | null
  sortOrder: number
  _count: { accounts: number }
}

interface Account {
  id: number
  aname: string
  atype: string
  isActive: boolean
  address: string | null
  contactNo: string | null
  registerDate: string | null
  openBalance: number
  createdAt: string
  head: {
    id: number
    atype: string
    description: string | null
    dr: boolean
  } | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ACCOUNT_TYPES = [
  'ALL',
  'BANK',
  'ASSET',
  'CAPITAL',
  'LIABILITY',
  'RECEIVABLE',
  'PAYABLE',
  'INCOME',
  'EXPENSE',
  'EMPLOYEE',
  'CUSTOMER',
  'STOCK',
] as const

const TYPE_BADGE_COLORS: Record<string, string> = {
  BANK: 'bg-sky-100 text-sky-700 border-sky-200',
  ASSET: 'bg-amber-100 text-amber-700 border-amber-200',
  CAPITAL: 'bg-purple-100 text-purple-700 border-purple-200',
  LIABILITY: 'bg-rose-100 text-rose-700 border-rose-200',
  RECEIVABLE: 'bg-orange-100 text-orange-700 border-orange-200',
  PAYABLE: 'bg-red-100 text-red-700 border-red-200',
  INCOME: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  EXPENSE: 'bg-rose-100 text-rose-700 border-rose-200',
  EMPLOYEE: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  CUSTOMER: 'bg-teal-100 text-teal-700 border-teal-200',
  STOCK: 'bg-stone-100 text-stone-700 border-stone-200',
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

// ─── Skeleton ───────────────────────────────────────────────────────────────

function AccountsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Top bar skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-6 w-10 rounded-full" />
        </div>
        <div className="flex-1" />
        <Skeleton className="h-9 w-36" />
      </div>
      {/* Filters skeleton */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-9 flex-1 max-w-xs" />
        <Skeleton className="h-9 w-40" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-10" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      {/* Table skeleton */}
      <div className="rounded-lg border">
        <div className="border-b px-4 py-3 flex gap-6">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24 hidden sm:block" />
          <Skeleton className="h-4 w-20 ml-auto" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b px-4 py-3 flex gap-6 items-center">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-24 hidden sm:block" />
            <Skeleton className="h-4 w-20 ml-auto" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <div className="flex gap-1">
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

export function AccountsView() {
  // ── Data State ──
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountHeads, setAccountHeads] = useState<AccountHead[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)

  // ── Filter State ──
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [activeFilter, setActiveFilter] = useState<boolean | null>(true)

  // ── Dialog State ──
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add')
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [saving, setSaving] = useState(false)

  // ── Form State ──
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState('')
  const [formAddress, setFormAddress] = useState('')
  const [formContact, setFormContact] = useState('')
  const [formBalance, setFormBalance] = useState('')

  // ── Delete State ──
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null)
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

  // ── Fetch Account Heads ──
  const fetchAccountHeads = useCallback(async () => {
    try {
      const res = await fetch('/api/account-heads')
      const json = await res.json()
      if (json.success) {
        setAccountHeads(json.data)
      }
    } catch {
      // Silent fail — heads are for dropdown only
    }
  }, [])

  // ── Fetch Accounts ──
  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', String(pagination.page))
      params.set('limit', String(pagination.limit))
      if (typeFilter !== 'ALL') params.set('atype', typeFilter)
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (activeFilter !== null) params.set('isActive', String(activeFilter))

      const res = await fetch(`/api/accounts?${params.toString()}`)
      const json = await res.json()
      if (!json.success) {
        toast.error('Failed to load accounts')
        return
      }
      setAccounts(json.data)
      setPagination(json.pagination)
    } catch {
      toast.error('Network error while loading accounts')
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, typeFilter, debouncedSearch, activeFilter])

  useEffect(() => {
    fetchAccountHeads()
  }, [fetchAccountHeads])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  // Reset to page 1 when filters change (not page)
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }))
  }, [typeFilter, debouncedSearch, activeFilter])

  // ── Pagination helpers ──
  const startItem = pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0
  const endItem = Math.min(pagination.page * pagination.limit, pagination.total)

  function goToPage(page: number) {
    setPagination((prev) => ({ ...prev, page }))
  }

  // ── Open Add Dialog ──
  function openAddDialog() {
    setDialogMode('add')
    setEditingAccount(null)
    setFormName('')
    setFormType('')
    setFormAddress('')
    setFormContact('')
    setFormBalance('')
    setDialogOpen(true)
  }

  // ── Open Edit Dialog ──
  function openEditDialog(account: Account) {
    setDialogMode('edit')
    setEditingAccount(account)
    setFormName(account.aname)
    setFormType(account.atype)
    setFormAddress(account.address || '')
    setFormContact(account.contactNo || '')
    setFormBalance(String(account.openBalance || ''))
    setDialogOpen(true)
  }

  // ── Save Account ──
  async function handleSave() {
    if (!formName.trim()) {
      toast.error('Account name is required')
      return
    }
    if (!formType) {
      toast.error('Account type is required')
      return
    }

    try {
      setSaving(true)

      if (dialogMode === 'add') {
        const res = await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            aname: formName.trim(),
            atype: formType,
            address: formAddress.trim() || undefined,
            contactNo: formContact.trim() || undefined,
            openBalance: Number(formBalance) || 0,
          }),
        })
        const json = await res.json()
        if (!json.success) {
          toast.error(json.error || 'Failed to create account')
          return
        }
        toast.success(`Account "${json.data.aname}" created successfully`)
      } else {
        const res = await fetch('/api/accounts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingAccount!.id,
            aname: formName.trim(),
            atype: formType,
            address: formAddress.trim() || '',
            contactNo: formContact.trim() || '',
            openBalance: Number(formBalance) || 0,
          }),
        })
        const json = await res.json()
        if (!json.success) {
          toast.error(json.error || 'Failed to update account')
          return
        }
        toast.success(`Account "${json.data.aname}" updated successfully`)
      }

      setDialogOpen(false)
      fetchAccounts()
      fetchAccountHeads()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Open Delete Dialog ──
  function openDeleteDialog(account: Account) {
    setDeletingAccount(account)
    setDeleteOpen(true)
  }

  // ── Confirm Delete ──
  async function handleDelete() {
    if (!deletingAccount) return
    try {
      setDeleting(true)
      const res = await fetch(`/api/accounts?id=${deletingAccount.id}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!json.success) {
        toast.error(json.error || 'Failed to delete account')
        return
      }
      toast.success(`Account "${deletingAccount.aname}" deactivated`)
      setDeleteOpen(false)
      setDeletingAccount(null)
      fetchAccounts()
      fetchAccountHeads()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading && accounts.length === 0) return <AccountsSkeleton />

  return (
    <div className="space-y-4">
      {/* ── Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center">
            <Users className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Accounts
            </h2>
          </div>
          <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200 text-xs font-semibold tabular-nums">
            {formatNumber(pagination.total)}
          </Badge>
        </div>
        <div className="flex-1" />
        <Button
          onClick={openAddDialog}
          className="bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Account
        </Button>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        {/* Type Filter */}
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder="Account Type" />
          </SelectTrigger>
          <SelectContent>
            {ACCOUNT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                <span className="flex items-center gap-2">
                  {type !== 'ALL' && (
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        TYPE_BADGE_COLORS[type]?.split(' ')[0] || 'bg-gray-300'
                      }`}
                    />
                  )}
                  {type === 'ALL' ? 'All Types' : type}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Active/Inactive Toggle */}
        <div className="flex items-center gap-2">
          <Switch
            id="active-filter"
            checked={activeFilter === true}
            onCheckedChange={(checked) => {
              setActiveFilter(checked ? true : null)
            }}
            className="data-[state=checked]:bg-emerald-500"
          />
          <Label htmlFor="active-filter" className="text-sm text-muted-foreground whitespace-nowrap cursor-pointer">
            {activeFilter === true ? 'Active' : activeFilter === false ? 'Inactive' : 'All'}
          </Label>
        </div>
      </div>

      {/* ── Data Table ── */}
      <div className="rounded-lg border overflow-hidden">
        {accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-14 w-14 rounded-full bg-amber-50 flex items-center justify-center mb-4">
              <Users className="h-7 w-7 text-amber-400" />
            </div>
            <p className="text-sm font-medium text-foreground">No accounts found</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              {searchQuery || typeFilter !== 'ALL' || activeFilter !== null
                ? 'Try adjusting your filters or search query.'
                : 'Get started by adding your first account.'}
            </p>
            {!searchQuery && typeFilter === 'ALL' && activeFilter === null && (
              <Button
                onClick={openAddDialog}
                className="mt-4 bg-amber-500 hover:bg-amber-600 text-white h-8 text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add First Account
              </Button>
            )}
          </div>
        ) : (
          <div className="max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs font-semibold">Account Name</TableHead>
                  <TableHead className="text-xs font-semibold">Type</TableHead>
                  <TableHead className="text-xs font-semibold hidden md:table-cell">Contact</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Balance</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id} className="group">
                    {/* Account Name */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                            account.isActive ? 'bg-emerald-400' : 'bg-gray-300'
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {account.aname}
                          </p>
                          {account.registerDate && (
                            <p className="text-[11px] text-muted-foreground">
                              Reg: {format(parseISO(account.registerDate), 'dd MMM yyyy')}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Type Badge */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 font-medium whitespace-nowrap ${
                          TYPE_BADGE_COLORS[account.atype] || 'bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                      >
                        {account.atype}
                      </Badge>
                    </TableCell>

                    {/* Contact */}
                    <TableCell className="hidden md:table-cell">
                      <div className="text-xs text-muted-foreground space-y-0.5 max-w-[180px]">
                        {account.contactNo && (
                          <div className="flex items-center gap-1 truncate">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span className="truncate">{account.contactNo}</span>
                          </div>
                        )}
                        {account.address && (
                          <div className="flex items-start gap-1">
                            <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                            <span className="truncate">{account.address}</span>
                          </div>
                        )}
                        {!account.contactNo && !account.address && (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Balance */}
                    <TableCell className="text-right">
                      <span className="text-sm font-medium tabular-nums text-foreground">
                        {formatCurrency(account.openBalance || 0)}
                      </span>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 font-medium ${
                          account.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-gray-100 text-gray-500 border-gray-200'
                        }`}
                      >
                        {account.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-amber-600 hover:bg-amber-50"
                          onClick={() => openEditDialog(account)}
                          title="Edit account"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {account.isActive && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                            onClick={() => openDeleteDialog(account)}
                            title="Deactivate account"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-medium tabular-nums">{formatNumber(startItem)}</span>
            {'–'}
            <span className="font-medium tabular-nums">{formatNumber(endItem)}</span>
            {' of '}
            <span className="font-medium tabular-nums">{formatNumber(pagination.total)}</span>
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={pagination.page <= 1}
              onClick={() => goToPage(pagination.page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium tabular-nums px-2">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => goToPage(pagination.page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Add/Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'add' ? 'Add New Account' : 'Edit Account'}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'add'
                ? 'Fill in the details to create a new account.'
                : `Update the details for "${editingAccount?.aname}".`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Account Name */}
            <div className="space-y-1.5">
              <Label htmlFor="account-name">
                Account Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="account-name"
                placeholder="e.g. Meezan Bank Account"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            {/* Account Type */}
            <div className="space-y-1.5">
              <Label htmlFor="account-type">
                Account Type <span className="text-rose-500">*</span>
              </Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  {accountHeads.map((head) => (
                    <SelectItem key={head.atype} value={head.atype}>
                      <span className="flex items-center gap-2">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            TYPE_BADGE_COLORS[head.atype]?.split(' ')[0] || 'bg-gray-300'
                          }`}
                        />
                        <span>{head.atype}</span>
                        {head.description && (
                          <span className="text-muted-foreground text-xs">— {head.description}</span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label htmlFor="account-address">Address</Label>
              <Textarea
                id="account-address"
                placeholder="Enter address"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                rows={2}
              />
            </div>

            {/* Contact No */}
            <div className="space-y-1.5">
              <Label htmlFor="account-contact">Contact No</Label>
              <Input
                id="account-contact"
                placeholder="e.g. 0300-1234567"
                value={formContact}
                onChange={(e) => setFormContact(e.target.value)}
              />
            </div>

            {/* Opening Balance */}
            <div className="space-y-1.5">
              <Label htmlFor="account-balance">Opening Balance (PKR)</Label>
              <Input
                id="account-balance"
                type="number"
                placeholder="0"
                value={formBalance}
                onChange={(e) => setFormBalance(e.target.value)}
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
              {dialogMode === 'add' ? 'Create Account' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate{' '}
              <span className="font-semibold text-foreground">
                &quot;{deletingAccount?.aname}&quot;
              </span>
              ? This will mark the account as inactive. You can still see it by switching to
              the &quot;All&quot; filter.
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
              Deactivate
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
