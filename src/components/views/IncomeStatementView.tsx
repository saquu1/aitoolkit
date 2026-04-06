'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  BarChart3,
  RotateCcw,
  FileBarChart,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
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

// ─── Types ──────────────────────────────────────────────────────────────────

interface IncomeAccount {
  accountId: number
  accountName: string
  totalIncome: number
}

interface ExpenseAccount {
  accountId: number
  accountName: string
  totalExpense: number
}

interface IncomeSummary {
  totalIncome: number
  totalExpenses: number
  netProfit: number
}

interface IncomeData {
  incomeAccounts: IncomeAccount[]
  expenseAccounts: ExpenseAccount[]
  summary: IncomeSummary
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

// ─── Skeleton ───────────────────────────────────────────────────────────────

function IncomeStatementSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 mt-2" />
      </div>
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
      <Card className="py-0 gap-0">
        <CardContent className="p-6 text-center space-y-2">
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </CardContent>
      </Card>
      <div className="grid lg:grid-cols-2 gap-6">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
      <Skeleton className="h-48 rounded-lg" />
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function IncomeStatementView() {
  const [data, setData] = useState<IncomeData | null>(null)
  const [company, setCompany] = useState<CompanyInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const fetchReport = useCallback(async (from?: string, to?: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (from) params.set('fromDate', from)
      if (to) params.set('toDate', to)

      const [reportRes, companyRes] = await Promise.all([
        fetch(`/api/reports/income-statement${params.toString() ? `?${params.toString()}` : ''}`),
        fetch('/api/company'),
      ])

      const reportJson = await reportRes.json()
      const companyJson = await companyRes.json()

      if (!reportJson.success) {
        toast.error('Failed to load income statement data')
        return
      }

      setData(reportJson.data)
      if (companyJson.success) {
        setCompany(companyJson.data)
      }
    } catch {
      toast.error('Network error while loading income statement')
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

  if (loading) return <IncomeStatementSkeleton />

  const hasData = data && (data.incomeAccounts.length > 0 || data.expenseAccounts.length > 0)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-amber-600" />
          </div>
          Income Statement
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Profit &amp; Loss Statement
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
          </div>
        </CardContent>
      </Card>

      {!hasData ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
            <BarChart3 className="h-8 w-8 text-amber-400" />
          </div>
          <p className="text-lg font-semibold text-foreground">No income or expense transactions found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try adjusting the date range or record some transactions first
          </p>
        </div>
      ) : (
        data && (
          <>
            {/* Report header */}
            <Card className="py-0 gap-0">
              <CardContent className="p-6 text-center space-y-1">
                <h3 className="text-lg font-bold text-foreground uppercase">
                  {company?.companyName ?? 'Company'}
                </h3>
                <p className="text-base font-semibold text-foreground uppercase tracking-widest">
                  INCOME STATEMENT (Profit &amp; Loss)
                </p>
                <p className="text-sm text-muted-foreground">
                  {toDate
                    ? `As at ${format(new Date(toDate), 'dd MMM yyyy')}`
                    : format(new Date(), 'dd MMM yyyy')}
                  {fromDate && toDate && ` (${format(new Date(fromDate), 'dd MMM yyyy')} to ${format(new Date(toDate), 'dd MMM yyyy')})`}
                </p>
              </CardContent>
            </Card>

            {/* Income & Expense sections */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Income Section */}
              <Card className="py-0 gap-0 border-t-4 border-t-emerald-500">
                <CardHeader className="pb-3 bg-emerald-50/50">
                  <CardTitle className="text-base flex items-center gap-2 text-emerald-700">
                    <TrendingUp className="h-4 w-4" />
                    Revenue / Income
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {data.incomeAccounts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No income accounts with transactions
                    </p>
                  ) : (
                    <ScrollArea className="max-h-64">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="text-xs">Account</TableHead>
                            <TableHead className="text-xs text-right">Amount (PKR)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.incomeAccounts.map((acc) => (
                            <TableRow key={acc.accountId}>
                              <TableCell className="text-xs font-medium">{acc.accountName}</TableCell>
                              <TableCell className="text-xs text-right text-emerald-600 font-mono tabular-nums">
                                {formatCurrency(acc.totalIncome)}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-bold bg-emerald-50/50 hover:bg-emerald-50/50">
                            <TableCell className="text-xs font-bold text-emerald-700">
                              Total Income
                            </TableCell>
                            <TableCell className="text-xs text-right font-bold text-emerald-700 font-mono tabular-nums">
                              {formatCurrency(data.summary.totalIncome)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              {/* Expense Section */}
              <Card className="py-0 gap-0 border-t-4 border-t-rose-500">
                <CardHeader className="pb-3 bg-rose-50/50">
                  <CardTitle className="text-base flex items-center gap-2 text-rose-700">
                    <TrendingDown className="h-4 w-4" />
                    Expenses
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {data.expenseAccounts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No expense accounts with transactions
                    </p>
                  ) : (
                    <ScrollArea className="max-h-64">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="text-xs">Account</TableHead>
                            <TableHead className="text-xs text-right">Amount (PKR)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.expenseAccounts.map((acc) => (
                            <TableRow key={acc.accountId}>
                              <TableCell className="text-xs font-medium">{acc.accountName}</TableCell>
                              <TableCell className="text-xs text-right text-rose-600 font-mono tabular-nums">
                                {formatCurrency(acc.totalExpense)}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-bold bg-rose-50/50 hover:bg-rose-50/50">
                            <TableCell className="text-xs font-bold text-rose-700">
                              Total Expenses
                            </TableCell>
                            <TableCell className="text-xs text-right font-bold text-rose-700 font-mono tabular-nums">
                              {formatCurrency(data.summary.totalExpenses)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Visual bar: income vs expense proportion */}
            {data.summary.totalIncome > 0 && (
              <Card className="py-0 gap-0">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-2">
                    <span className="text-emerald-600">Income</span>
                    <span className="text-rose-600">Expenses</span>
                  </div>
                  <div className="w-full h-3 bg-rose-100 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-500 rounded-l-full transition-all duration-500"
                      style={{
                        width: `${Math.min((data.summary.totalExpenses / data.summary.totalIncome) * 100, 100)}%`,
                      }}
                    />
                    <div className="flex-1 h-full bg-rose-400" />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1.5">
                    <span>{formatCurrency(data.summary.totalIncome)}</span>
                    <span>{formatCurrency(data.summary.totalExpenses)}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Net Profit/Loss Summary */}
            <Card className={`py-0 gap-0 ${data.summary.netProfit >= 0 ? 'border-emerald-200' : 'border-rose-200'}`}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Revenue line */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm font-medium text-foreground">Total Revenue</span>
                    </div>
                    <span className="text-lg font-bold text-emerald-600 font-mono tabular-nums">
                      {formatCurrency(data.summary.totalIncome)}
                    </span>
                  </div>

                  <Separator />

                  {/* Expenses line */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-rose-500" />
                      <span className="text-sm font-medium text-foreground">Less: Total Expenses</span>
                    </div>
                    <span className="text-lg font-bold text-rose-600 font-mono tabular-nums">
                      ({formatCurrency(data.summary.totalExpenses)})
                    </span>
                  </div>

                  <Separator />

                  {/* Net Profit / Loss */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                        data.summary.netProfit >= 0 ? 'bg-emerald-100' : 'bg-rose-100'
                      }`}>
                        <DollarSign className={`h-3.5 w-3.5 ${data.summary.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} />
                      </div>
                      <span className={`text-base font-bold ${
                        data.summary.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {data.summary.netProfit >= 0 ? 'Net Profit' : 'Net Loss'}
                      </span>
                    </div>
                    <span className={`text-2xl font-bold font-mono tabular-nums ${
                      data.summary.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {formatCurrency(Math.abs(data.summary.netProfit))}
                    </span>
                  </div>

                  {/* Profit margin */}
                  {data.summary.totalIncome > 0 && (
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <span className="text-xs text-muted-foreground">Profit Margin:</span>
                      <Badge
                        variant="outline"
                        className={`text-xs font-mono ${
                          data.summary.netProfit >= 0
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {((data.summary.netProfit / data.summary.totalIncome) * 100).toFixed(1)}%
                      </Badge>
                    </div>
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
