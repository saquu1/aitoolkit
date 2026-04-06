'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  Scale,
  RotateCcw,
  FileBarChart,
  CheckCircle2,
  AlertCircle,
  Calendar,
  FileDown,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { exportToPDF, pdfFormatPKR, pdfFormatDate } from '@/lib/pdf-export'

// ─── Types ──────────────────────────────────────────────────────────────────

interface TrialAccount {
  accountId: number
  accountName: string
  atype: string
  nature: string
  totalDebit: number
  totalCredit: number
  netBalance: number
  balanceSide: string
}

interface TrialSummary {
  totalDebit: number
  totalCredit: number
  difference: number
  isBalanced: boolean
}

interface TrialData {
  accounts: TrialAccount[]
  summary: TrialSummary
}

interface CompanyInfo {
  companyName: string
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

const typeBadgeColors: Record<string, string> = {
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

// ─── Skeleton ───────────────────────────────────────────────────────────────

function TrialBalanceSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 mt-2" />
      </div>
      {/* Filters */}
      <Card className="py-0 gap-0">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-9 w-40" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-9 w-40" />
            </div>
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-20" />
          </div>
        </CardContent>
      </Card>
      {/* Report header */}
      <Card className="py-0 gap-0">
        <CardContent className="p-6 text-center space-y-2">
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </CardContent>
      </Card>
      {/* Table */}
      <Card className="py-0 gap-0">
        <CardContent className="p-4">
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-20 ml-auto" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function TrialBalanceView() {
  const [data, setData] = useState<TrialData | null>(null)
  const [company, setCompany] = useState<CompanyInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [exporting, setExporting] = useState(false)

  const fetchReport = useCallback(async (from?: string, to?: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (from) params.set('fromDate', from)
      if (to) params.set('toDate', to)

      const [reportRes, companyRes] = await Promise.all([
        fetch(`/api/reports/trial-balance${params.toString() ? `?${params.toString()}` : ''}`),
        fetch('/api/company'),
      ])

      const reportJson = await reportRes.json()
      const companyJson = await companyRes.json()

      if (!reportJson.success) {
        toast.error('Failed to load trial balance data')
        return
      }

      setData(reportJson.data)
      if (companyJson.success) {
        setCompany(companyJson.data)
      }
    } catch {
      toast.error('Network error while loading trial balance')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const handleGenerate = () => {
    fetchReport(fromDate, toDate)
  }

  const handleReset = () => {
    setFromDate('')
    setToDate('')
    fetchReport()
  }

  const handleExportPDF = async () => {
    if (!data || !company) return
    setExporting(true)
    try {
      await exportToPDF({
        title: 'Trial Balance',
        subtitle: company.companyName,
        columns: [
          { header: 'Code', key: 'code', width: 1, align: 'center' },
          { header: 'Account Name', key: 'name', width: 3 },
          { header: 'Type', key: 'type', width: 1.5 },
          { header: 'Debit (PKR)', key: 'debit', width: 2, align: 'right' },
          { header: 'Credit (PKR)', key: 'credit', width: 2, align: 'right' },
        ],
        rows: data.accounts.map(a => [
          String(a.accountId).padStart(3, '0'),
          a.accountName,
          a.atype,
          a.totalDebit > 0 ? pdfFormatPKR(a.totalDebit) : '',
          a.totalCredit > 0 ? pdfFormatPKR(a.totalCredit) : '',
        ]),
        summaryRows: [
          ['', '', 'GRAND TOTAL', pdfFormatPKR(data.summary.totalDebit), pdfFormatPKR(data.summary.totalCredit)],
          ['', '', 'Difference', data.summary.difference > 0 ? pdfFormatPKR(data.summary.difference) : '', ''],
        ],
      })
      toast.success('PDF exported successfully')
    } catch { toast.error('Failed to export PDF') }
    finally { setExporting(false) }
  }

  // Group accounts by type for subtotals
  const groupedAccounts = data?.accounts.reduce<Record<string, TrialAccount[]>>((groups, acc) => {
    if (!groups[acc.atype]) groups[acc.atype] = []
    groups[acc.atype].push(acc)
    return groups
  }, {})

  if (loading) return <TrialBalanceSkeleton />

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center">
            <Scale className="h-5 w-5 text-amber-600" />
          </div>
          Trial Balance
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Summary of all account balances
        </p>
      </div>

      {/* Filters */}
      <Card className="py-0 gap-0">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">From Date</Label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="pl-9 h-9 w-40"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">To Date</Label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="pl-9 h-9 w-40"
                />
              </div>
            </div>
            <Button onClick={handleGenerate} size="sm" className="h-9">
              <FileBarChart className="h-4 w-4 mr-1.5" />
              Generate
            </Button>
            <Button onClick={handleReset} variant="ghost" size="sm" className="h-9">
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Reset
            </Button>
            <Button
              onClick={handleExportPDF}
              variant="outline"
              size="sm"
              disabled={exporting || !data}
              className="h-9 gap-1.5"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              <span className="hidden sm:inline text-xs">Export PDF</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report content */}
      {data && data.accounts.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
            <Scale className="h-8 w-8 text-amber-400" />
          </div>
          <p className="text-lg font-semibold text-foreground">No transactions found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try adjusting the date range or add some transactions first
          </p>
        </div>
      ) : (
        data && groupedAccounts && (
          <>
            {/* Report header */}
            <Card className="py-0 gap-0">
              <CardContent className="p-6 text-center space-y-1">
                <h3 className="text-lg font-bold text-foreground uppercase">
                  {company?.companyName ?? 'Company'}
                </h3>
                <p className="text-base font-semibold text-foreground uppercase tracking-widest">
                  TRIAL BALANCE
                </p>
                {(fromDate || toDate) && (
                  <p className="text-sm text-muted-foreground">
                    {fromDate ? `From: ${format(new Date(fromDate), 'dd MMM yyyy')}` : ''}
                    {fromDate && toDate ? '  |  ' : ''}
                    {toDate ? `To: ${format(new Date(toDate), 'dd MMM yyyy')}` : ''}
                    {!fromDate && !toDate ? 'All Transactions' : ''}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Main table */}
            <Card className="py-0 gap-0">
              <CardContent className="p-4">
                <ScrollArea className="max-h-[calc(100vh-420px)]">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs font-semibold w-20">Code</TableHead>
                        <TableHead className="text-xs font-semibold">Account Name</TableHead>
                        <TableHead className="text-xs font-semibold w-28">Type</TableHead>
                        <TableHead className="text-xs font-semibold w-16 text-center">Nature</TableHead>
                        <TableHead className="text-xs font-semibold text-right w-32">Debit (PKR)</TableHead>
                        <TableHead className="text-xs font-semibold text-right w-32">Credit (PKR)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(groupedAccounts).map(([type, accounts]) => (
                        <>
                          {/* Account type header */}
                          <TableRow key={`header-${type}`} className="bg-slate-50 hover:bg-slate-50">
                            <TableCell
                              colSpan={6}
                              className="text-xs font-bold text-slate-600 uppercase tracking-wider py-2"
                            >
                              {type.replace(/_/g, ' ')}
                            </TableCell>
                          </TableRow>

                          {/* Individual accounts */}
                          {accounts.map((acc) => (
                            <TableRow key={acc.accountId}>
                              <TableCell className="text-xs text-muted-foreground font-mono">
                                {String(acc.accountId).padStart(3, '0')}
                              </TableCell>
                              <TableCell className="text-xs font-medium text-foreground">
                                {acc.accountName}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-0 ${
                                    typeBadgeColors[acc.atype] ?? 'bg-gray-100 text-gray-700 border-gray-200'
                                  }`}
                                >
                                  {acc.atype}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-0 ${
                                    acc.balanceSide === 'DR'
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : acc.balanceSide === 'CR'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-slate-50 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  {acc.balanceSide}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-right text-emerald-600 font-mono tabular-nums">
                                {acc.totalDebit > 0 ? formatCurrency(acc.totalDebit) : '—'}
                              </TableCell>
                              <TableCell className="text-xs text-right text-rose-600 font-mono tabular-nums">
                                {acc.totalCredit > 0 ? formatCurrency(acc.totalCredit) : '—'}
                              </TableCell>
                            </TableRow>
                          ))}

                          {/* Subtotal row */}
                          <TableRow key={`sub-${type}`} className="bg-slate-50/50 hover:bg-slate-50/50">
                            <TableCell colSpan={4} className="text-xs font-semibold text-slate-500 italic">
                              Subtotal {type.replace(/_/g, ' ')}
                            </TableCell>
                            <TableCell className="text-xs text-right font-semibold text-slate-600 font-mono tabular-nums">
                              {formatCurrency(accounts.reduce((s, a) => s + a.totalDebit, 0))}
                            </TableCell>
                            <TableCell className="text-xs text-right font-semibold text-slate-600 font-mono tabular-nums">
                              {formatCurrency(accounts.reduce((s, a) => s + a.totalCredit, 0))}
                            </TableCell>
                          </TableRow>
                          <TableRow key={`sep-${type}`}>
                            <TableCell colSpan={6} className="p-0">
                              <Separator />
                            </TableCell>
                          </TableRow>
                        </>
                      ))}

                      {/* Grand Total */}
                      <TableRow className="font-bold bg-slate-100 hover:bg-slate-100">
                        <TableCell colSpan={4} className="text-sm font-bold text-foreground">
                          GRAND TOTAL
                        </TableCell>
                        <TableCell className="text-sm text-right font-bold text-emerald-700 font-mono tabular-nums">
                          {formatCurrency(data.summary.totalDebit)}
                        </TableCell>
                        <TableCell className="text-sm text-right font-bold text-rose-700 font-mono tabular-nums">
                          {formatCurrency(data.summary.totalCredit)}
                        </TableCell>
                      </TableRow>

                      {/* Difference row */}
                      <TableRow className="bg-slate-50 hover:bg-slate-50">
                        <TableCell colSpan={4} className="text-xs font-medium text-muted-foreground">
                          Difference
                        </TableCell>
                        <TableCell colSpan={2} className="text-xs text-right font-mono tabular-nums">
                          {data.summary.difference > 0 ? formatCurrency(data.summary.difference) : '—'}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Balance indicator */}
            <Card className={`py-0 gap-0 ${data.summary.isBalanced ? 'border-emerald-200' : 'border-rose-200'}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-center gap-2">
                  {data.summary.isBalanced ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      <span className="text-sm font-semibold text-emerald-700">
                        Balanced ✓
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-rose-500" />
                      <span className="text-sm font-semibold text-rose-700">
                        Unbalanced — Difference: {formatCurrency(data.summary.difference)}
                      </span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )
      )}
    </div>
  )
}
