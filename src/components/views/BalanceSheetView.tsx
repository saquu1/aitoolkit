'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  Building2,
  RotateCcw,
  FileBarChart,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Landmark,
  Shield,
  Users,
  ArrowRightLeft,
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

interface BalanceItem {
  accountId: number
  accountName: string
  atype: string
  balance: number
}

interface BalanceSummary {
  totalAssets: number
  totalReceivables: number
  totalLiabilities: number
  totalCapital: number
  netProfit: number
  totalEquity: number
  totalAssetSide: number
  isBalanced: boolean
}

interface BalanceData {
  assets: BalanceItem[]
  liabilities: BalanceItem[]
  capital: BalanceItem[]
  receivables: BalanceItem[]
  incomeBalance: number
  expenseBalance: number
  summary: BalanceSummary
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

function BalanceSheetSkeleton() {
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
              <Skeleton className="h-3.5 w-24" />
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
          <Skeleton className="h-4 w-48 mx-auto" />
        </CardContent>
      </Card>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Skeleton className="h-56 rounded-lg" />
          <Skeleton className="h-44 rounded-lg" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-52 rounded-lg" />
        </div>
      </div>
      <Skeleton className="h-16 rounded-lg" />
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function BalanceSheetView() {
  const [data, setData] = useState<BalanceData | null>(null)
  const [company, setCompany] = useState<CompanyInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [asOfDate, setAsOfDate] = useState('')

  const fetchReport = useCallback(async (date?: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (date) params.set('asOfDate', date)

      const [reportRes, companyRes] = await Promise.all([
        fetch(`/api/reports/balance-sheet${params.toString() ? `?${params.toString()}` : ''}`),
        fetch('/api/company'),
      ])

      const reportJson = await reportRes.json()
      const companyJson = await companyRes.json()

      if (!reportJson.success) {
        toast.error('Failed to load balance sheet data')
        return
      }

      setData(reportJson.data)
      if (companyJson.success) {
        setCompany(companyJson.data)
      }
    } catch {
      toast.error('Network error while loading balance sheet')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const handleGenerate = () => {
    fetchReport(asOfDate)
  }

  const handleReset = () => {
    setAsOfDate('')
    fetchReport()
  }

  // Split assets into Fixed (ASSET) and Current (BANK)
  const fixedAssets = data?.assets.filter((a) => a.atype === 'ASSET') ?? []
  const currentAssets = data?.assets.filter((a) => a.atype === 'BANK') ?? []

  // Split liabilities into LIABILITY and PAYABLE
  const regularLiabilities = data?.liabilities.filter((a) => a.atype === 'LIABILITY') ?? []
  const payables = data?.liabilities.filter((a) => a.atype === 'PAYABLE') ?? []

  if (loading) return <BalanceSheetSkeleton />

  const hasData = data && (
    data.assets.length > 0 ||
    data.liabilities.length > 0 ||
    data.capital.length > 0 ||
    data.receivables.length > 0
  )

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-amber-600" />
          </div>
          Balance Sheet
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Financial position summary
        </p>
      </div>

      {/* Filters */}
      <Card className="py-0 gap-0">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">As of Date</Label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
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
            <Building2 className="h-8 w-8 text-amber-400" />
          </div>
          <p className="text-lg font-semibold text-foreground">No data available</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add accounts and transactions to generate a balance sheet
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
                  BALANCE SHEET
                </p>
                <p className="text-sm text-muted-foreground">
                  As at {asOfDate ? format(new Date(asOfDate), 'dd MMM yyyy') : format(new Date(), 'dd MMM yyyy')}
                </p>
              </CardContent>
            </Card>

            {/* Two-column layout */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* ─── LEFT COLUMN: ASSETS ─── */}
              <div className="space-y-4">
                {/* Fixed Assets */}
                {fixedAssets.length > 0 && (
                  <Card className="py-0 gap-0 border-l-4 border-l-amber-500">
                    <CardHeader className="pb-2 bg-amber-50/30">
                      <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
                        <Landmark className="h-4 w-4" />
                        Fixed Assets
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <Table>
                        <TableBody>
                          {fixedAssets.map((item) => (
                            <TableRow key={item.accountId}>
                              <TableCell className="text-xs font-medium">{item.accountName}</TableCell>
                              <TableCell className="text-xs text-right font-mono tabular-nums">
                                {formatCurrency(item.balance)}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-semibold bg-amber-50/30 hover:bg-amber-50/30">
                            <TableCell className="text-xs text-amber-700">Subtotal Fixed Assets</TableCell>
                            <TableCell className="text-xs text-right font-mono tabular-nums text-amber-700">
                              {formatCurrency(fixedAssets.reduce((s, a) => s + a.balance, 0))}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {/* Current Assets (BANK) */}
                {currentAssets.length > 0 && (
                  <Card className="py-0 gap-0 border-l-4 border-l-sky-500">
                    <CardHeader className="pb-2 bg-sky-50/30">
                      <CardTitle className="text-sm flex items-center gap-2 text-sky-700">
                        <Landmark className="h-4 w-4" />
                        Current Assets (Cash &amp; Bank)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <Table>
                        <TableBody>
                          {currentAssets.map((item) => (
                            <TableRow key={item.accountId}>
                              <TableCell className="text-xs font-medium">{item.accountName}</TableCell>
                              <TableCell className="text-xs text-right font-mono tabular-nums">
                                {formatCurrency(item.balance)}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-semibold bg-sky-50/30 hover:bg-sky-50/30">
                            <TableCell className="text-xs text-sky-700">Subtotal Current Assets</TableCell>
                            <TableCell className="text-xs text-right font-mono tabular-nums text-sky-700">
                              {formatCurrency(currentAssets.reduce((s, a) => s + a.balance, 0))}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {/* Receivables */}
                {data.receivables.length > 0 && (
                  <Card className="py-0 gap-0 border-l-4 border-l-orange-500">
                    <CardHeader className="pb-2 bg-orange-50/30">
                      <CardTitle className="text-sm flex items-center gap-2 text-orange-700">
                        <ArrowRightLeft className="h-4 w-4" />
                        Receivables
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <Table>
                        <TableBody>
                          {data.receivables.map((item) => (
                            <TableRow key={item.accountId}>
                              <TableCell className="text-xs font-medium">
                                {item.accountName}
                                <Badge variant="outline" className="text-[9px] px-1 py-0 ml-1.5 bg-orange-50 text-orange-600 border-orange-200">
                                  {item.atype}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-right font-mono tabular-nums">
                                {formatCurrency(item.balance)}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-semibold bg-orange-50/30 hover:bg-orange-50/30">
                            <TableCell className="text-xs text-orange-700">Subtotal Receivables</TableCell>
                            <TableCell className="text-xs text-right font-mono tabular-nums text-orange-700">
                              {formatCurrency(data.summary.totalReceivables)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {/* Total Assets */}
                <Card className="py-0 gap-0 bg-slate-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground">Total Assets</span>
                      <span className="text-lg font-bold text-foreground font-mono tabular-nums">
                        {formatCurrency(data.summary.totalAssetSide)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ─── RIGHT COLUMN: LIABILITIES & EQUITY ─── */}
              <div className="space-y-4">
                {/* Liabilities */}
                {(regularLiabilities.length > 0 || payables.length > 0) && (
                  <Card className="py-0 gap-0 border-l-4 border-l-rose-500">
                    <CardHeader className="pb-2 bg-rose-50/30">
                      <CardTitle className="text-sm flex items-center gap-2 text-rose-700">
                        <AlertCircle className="h-4 w-4" />
                        Liabilities
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <Table>
                        <TableBody>
                          {regularLiabilities.map((item) => (
                            <TableRow key={item.accountId}>
                              <TableCell className="text-xs font-medium">{item.accountName}</TableCell>
                              <TableCell className="text-xs text-right font-mono tabular-nums">
                                {formatCurrency(item.balance)}
                              </TableCell>
                            </TableRow>
                          ))}
                          {payables.map((item) => (
                            <TableRow key={item.accountId}>
                              <TableCell className="text-xs font-medium">
                                {item.accountName}
                                <Badge variant="outline" className="text-[9px] px-1 py-0 ml-1.5 bg-rose-50 text-rose-600 border-rose-200">
                                  PAYABLE
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-right font-mono tabular-nums">
                                {formatCurrency(item.balance)}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-semibold bg-rose-50/30 hover:bg-rose-50/30">
                            <TableCell className="text-xs text-rose-700">Total Liabilities</TableCell>
                            <TableCell className="text-xs text-right font-mono tabular-nums text-rose-700">
                              {formatCurrency(data.summary.totalLiabilities)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {/* Capital */}
                {data.capital.length > 0 && (
                  <Card className="py-0 gap-0 border-l-4 border-l-purple-500">
                    <CardHeader className="pb-2 bg-purple-50/30">
                      <CardTitle className="text-sm flex items-center gap-2 text-purple-700">
                        <Shield className="h-4 w-4" />
                        Capital / Owner&apos;s Equity
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <Table>
                        <TableBody>
                          {data.capital.map((item) => (
                            <TableRow key={item.accountId}>
                              <TableCell className="text-xs font-medium">{item.accountName}</TableCell>
                              <TableCell className="text-xs text-right font-mono tabular-nums">
                                {formatCurrency(item.balance)}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-semibold bg-purple-50/30 hover:bg-purple-50/30">
                            <TableCell className="text-xs text-purple-700">Total Capital</TableCell>
                            <TableCell className="text-xs text-right font-mono tabular-nums text-purple-700">
                              {formatCurrency(data.summary.totalCapital)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {/* Retained Earnings / Net Profit */}
                {(data.summary.netProfit !== 0) && (
                  <Card className="py-0 gap-0 border-l-4 border-l-emerald-500">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-emerald-600" />
                          <span className="text-xs font-semibold text-foreground">
                            Retained Earnings (Net {data.summary.netProfit >= 0 ? 'Profit' : 'Loss'})
                          </span>
                        </div>
                        <span className={`text-sm font-bold font-mono tabular-nums ${
                          data.summary.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {formatCurrency(data.summary.netProfit)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Total Liabilities + Equity */}
                <Card className="py-0 gap-0 bg-slate-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground">Total Liabilities + Equity</span>
                      <span className="text-lg font-bold text-foreground font-mono tabular-nums">
                        {formatCurrency(data.summary.totalEquity)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Balance check footer */}
            <Card className={`py-0 gap-0 ${data.summary.isBalanced ? 'border-emerald-200' : 'border-rose-200'}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-center gap-2">
                  {data.summary.isBalanced ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      <span className="text-sm font-semibold text-emerald-700">
                        Balanced ✓ — Assets = Liabilities + Equity
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-rose-500" />
                      <span className="text-sm font-semibold text-rose-700">
                        Difference: {formatCurrency(Math.abs(data.summary.totalAssetSide - data.summary.totalEquity))}
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
