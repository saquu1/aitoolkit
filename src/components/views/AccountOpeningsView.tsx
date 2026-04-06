'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  BookOpen,
  Save,
  RotateCcw,
  Loader2,
  Info,
  ArrowUpDown,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ─── Types ──────────────────────────────────────────────────────────────────

interface AccountHead {
  id: number
  atype: string
  dr: string
  description: string | null
}

interface Account {
  id: number
  aname: string
  atype: string
  isActive: boolean
  openBalance: number
  head?: { id: number; atype: string; dr: string } | null
}

interface AccountWithBalance extends Account {
  currentBalance: number
  isDirty: boolean
}

// ─── Type Badge Colors ──────────────────────────────────────────────────────

const typeColorMap: Record<string, string> = {
  BANK: 'bg-sky-100 text-sky-700',
  ASSET: 'bg-amber-100 text-amber-700',
  CAPITAL: 'bg-purple-100 text-purple-700',
  LIABILITY: 'bg-rose-100 text-rose-700',
  RECEIVABLE: 'bg-orange-100 text-orange-700',
  PAYABLE: 'bg-red-100 text-red-700',
  INCOME: 'bg-emerald-100 text-emerald-700',
  EXPENSE: 'bg-rose-100 text-rose-700',
  EMPLOYEE: 'bg-indigo-100 text-indigo-700',
  CUSTOMER: 'bg-teal-100 text-teal-700',
  STOCK: 'bg-stone-100 text-stone-700',
}

const natureColors: Record<string, string> = {
  DR: 'bg-amber-100 text-amber-700',
  CR: 'bg-emerald-100 text-emerald-700',
  BL: 'bg-slate-100 text-slate-700',
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const currencyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'PKR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

function formatCurrency(amount: number): string {
  return currencyFmt.format(amount)
}

// ─── Skeleton Loader ────────────────────────────────────────────────────────

function OpeningsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80 mt-2" />
      </div>
      <Card className="py-0 gap-0">
        <CardContent className="p-4 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-40 ml-auto" />
      </div>
      <Card className="py-0 gap-0">
        <CardContent className="p-0">
          <div className="space-y-0">
            <div className="flex items-center gap-4 px-4 py-3 border-b bg-muted/30">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-16 rounded" />
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-5 w-12 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card className="py-0 gap-0">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-32" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function AccountOpeningsView() {
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([])
  const [originalBalances, setOriginalBalances] = useState<Record<number, number>>({})
  const [accountHeads, setAccountHeads] = useState<AccountHead[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [filterType, setFilterType] = useState<string>('all')

  // ── Fetch Data ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [accountsRes, headsRes] = await Promise.all([
        fetch('/api/accounts?isActive=true&limit=1000'),
        fetch('/api/account-heads'),
      ])

      const accountsJson = await accountsRes.json()
      const headsJson = await headsRes.json()

      if (!accountsJson.success) {
        toast.error('Failed to load accounts')
        return
      }

      const accs: AccountWithBalance[] = (accountsJson.data ?? []).map((acc: Account) => ({
        ...acc,
        currentBalance: acc.openBalance,
        isDirty: false,
      }))

      setAccounts(accs)
      setOriginalBalances(
        Object.fromEntries(accs.map((a: AccountWithBalance) => [a.id, a.openBalance]))
      )

      if (headsJson.success) {
        setAccountHeads(headsJson.data ?? [])
      }
    } catch {
      toast.error('Network error while loading data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Helpers ─────────────────────────────────────────────────────────────

  function getAccountNature(atype: string): string {
    const head = accountHeads.find((h) => h.atype === atype)
    return head?.dr ?? 'BL'
  }

  function getAccountHeadId(atype: string): number | undefined {
    const head = accountHeads.find((h) => h.atype === atype)
    return head?.id
  }

  const dirtyCount = accounts.filter((a) => a.isDirty).length

  const filteredAccounts = filterType === 'all'
    ? accounts
    : accounts.filter((a) => a.atype === filterType)

  const totalDebit = filteredAccounts
    .filter((a) => getAccountNature(a.atype) === 'DR')
    .reduce((sum, a) => sum + a.currentBalance, 0)

  const totalCredit = filteredAccounts
    .filter((a) => getAccountNature(a.atype) === 'CR')
    .reduce((sum, a) => sum + a.currentBalance, 0)

  const difference = totalDebit - totalCredit

  // ── Handlers ────────────────────────────────────────────────────────────

  function handleBalanceChange(accountId: number, value: string) {
    const numValue = parseFloat(value) || 0
    setAccounts((prev) =>
      prev.map((a) => {
        if (a.id !== accountId) return a
        const original = originalBalances[a.id] ?? 0
        return {
          ...a,
          currentBalance: numValue,
          isDirty: numValue !== original,
        }
      })
    )
  }

  async function handleSaveAll() {
    const changedAccounts = accounts.filter((a) => a.isDirty)
    if (changedAccounts.length === 0) {
      toast.info('No changes to save')
      return
    }

    try {
      setSaving(true)
      const promises = changedAccounts.map((account) =>
        fetch('/api/accounts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: account.id,
            openBalance: account.currentBalance,
          }),
        }).then((res) => res.json())
      )

      const results = await Promise.all(promises)
      const failures = results.filter((r) => !r.success)

      if (failures.length === 0) {
        toast.success(`${changedAccounts.length} balance(s) saved successfully`)
        setOriginalBalances(
          Object.fromEntries(
            accounts.map((a) => [a.id, a.currentBalance])
          )
        )
        setAccounts((prev) => prev.map((a) => ({ ...a, isDirty: false })))
      } else {
        toast.error(`${failures.length} balance(s) failed to save`)
      }
    } catch {
      toast.error('Network error while saving balances')
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setAccounts((prev) =>
      prev.map((a) => ({
        ...a,
        currentBalance: originalBalances[a.id] ?? 0,
        isDirty: false,
      }))
    )
    toast.info('Balances reset to original values')
  }

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading) return <OpeningsSkeleton />

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Opening Balances
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Set initial balances for your accounts when starting with the system.
        </p>
      </div>

      {/* Info Card */}
      <Card className="py-0 gap-0 border-sky-200 bg-sky-50/50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-sky-100 flex items-center justify-center shrink-0 mt-0.5">
              <Info className="h-4 w-4 text-sky-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Opening balances represent the starting balances when you begin using the system.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Edit the balance values below and click &ldquo;Save All&rdquo; to update. 
                For double-entry accuracy, ensure Total Debit equals Total Credit (Difference = 0).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSaveAll}
            disabled={saving || dirtyCount === 0}
            className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save All {dirtyCount > 0 ? `(${dirtyCount})` : ''}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving || dirtyCount === 0}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>

        <div className="flex items-center gap-2 sm:ml-auto">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {accountHeads
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((head) => (
                  <SelectItem key={head.atype} value={head.atype}>
                    {head.atype}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Data Table */}
      <Card className="py-0 gap-0">
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Account Name</TableHead>
                  <TableHead className="text-xs font-semibold">Type</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Opening Balance</TableHead>
                  <TableHead className="text-xs font-semibold">Nature</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12">
                      <div className="flex flex-col items-center text-center">
                        <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center mb-3">
                          <BookOpen className="h-6 w-6 text-amber-500" />
                        </div>
                        <p className="text-sm font-medium text-foreground">No accounts found</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {filterType !== 'all'
                            ? 'No accounts match the selected filter'
                            : 'Create accounts first to set opening balances'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAccounts.map((account) => {
                    const nature = getAccountNature(account.atype)
                    return (
                      <TableRow key={account.id} className={account.isDirty ? 'bg-amber-50/50' : ''}>
                        <TableCell className="font-medium text-sm">
                          {account.aname}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 border-0 font-semibold ${
                              typeColorMap[account.atype] ?? 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {account.atype}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={account.currentBalance || ''}
                            onChange={(e) => handleBalanceChange(account.id, e.target.value)}
                            placeholder="0"
                            className="h-8 w-32 text-right tabular-nums text-sm ml-auto font-mono"
                          />
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 border-0 font-semibold ${
                              natureColors[nature] ?? 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {nature}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {filteredAccounts.length > 0 && (
        <Card className="py-0 gap-0">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center justify-between sm:justify-start sm:gap-3">
                <span className="text-xs font-medium text-muted-foreground">Total Debit</span>
                <span className="text-sm font-bold text-amber-700 tabular-nums">
                  {formatCurrency(totalDebit)}
                </span>
              </div>
              <div className="flex items-center justify-between sm:justify-start sm:gap-3">
                <span className="text-xs font-medium text-muted-foreground">Total Credit</span>
                <span className="text-sm font-bold text-emerald-700 tabular-nums">
                  {formatCurrency(totalCredit)}
                </span>
              </div>
              <div className="flex items-center justify-between sm:justify-start sm:gap-3">
                <span className="text-xs font-medium text-muted-foreground">Difference</span>
                <span
                  className={`text-sm font-bold tabular-nums ${
                    Math.abs(difference) < 0.01
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }`}
                >
                  {formatCurrency(Math.abs(difference))}
                  {Math.abs(difference) < 0.01 && (
                    <span className="text-emerald-500 ml-1 text-xs">(Balanced)</span>
                  )}
                  {Math.abs(difference) >= 0.01 && (
                    <span className="text-rose-500 ml-1 text-xs">(Unbalanced)</span>
                  )}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
