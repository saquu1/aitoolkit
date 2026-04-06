'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { Receipt, Search, RotateCcw, Users, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
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
import { ScrollArea } from '@/components/ui/scroll-area'

// ─── Types ──────────────────────────────────────────────────────────────────

interface EmployeeAccount {
  id: number
  aname: string
  atype: string
}

interface PayrollEmployee {
  employeeId: number
  employeeName: string
  monthlyAmount: number
  taxAmount: number
  leaveDays: number
  otDays: number
  additionAmt: number
  deductionAmt: number
  netSalary: number
  paid: number
  dueSalary: number
}

interface PayrollSummary {
  totalMonthly: number
  totalTax: number
  totalPaid: number
  totalDue: number
  employeeCount: number
}

interface PayrollData {
  month: string
  employees: PayrollEmployee[]
  summary: PayrollSummary
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const currencyFmt = new Intl.NumberFormat('en-PK', {
  style: 'currency',
  currency: 'PKR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

function formatCurrency(amount: number): string {
  return currencyFmt.format(amount)
}

function formatMonth(monthStr: string): string {
  try {
    const [year, mon] = monthStr.split('-').map(Number)
    const date = new Date(year, mon - 1, 1)
    return format(date, 'MMMM yyyy')
  } catch {
    return monthStr
  }
}

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function PayrollReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Skeleton className="h-12 w-12 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-52" />
        </div>
      </div>

      {/* Filters */}
      <Card className="py-0 gap-0">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-9 w-40" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-44" />
            </div>
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-20" />
          </div>
        </CardContent>
      </Card>

      {/* Report header */}
      <Card className="py-0 gap-0">
        <CardContent className="p-6">
          <div className="text-center space-y-2">
            <Skeleton className="h-6 w-48 mx-auto" />
            <Skeleton className="h-5 w-36 mx-auto" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="py-0 gap-0">
        <CardContent className="p-0">
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function PayrollReportView() {
  // Filters
  const [month, setMonth] = useState(getCurrentMonth())
  const [employeeId, setEmployeeId] = useState<string>('')
  const [generating, setGenerating] = useState(false)

  // Data
  const [data, setData] = useState<PayrollData | null>(null)
  const [loading, setLoading] = useState(false)
  const [employeeAccounts, setEmployeeAccounts] = useState<EmployeeAccount[]>([])
  const [hasGenerated, setHasGenerated] = useState(false)

  // Fetch employee accounts on mount
  useEffect(() => {
    async function fetchEmployees() {
      try {
        const res = await fetch('/api/accounts?atype=EMPLOYEE&isActive=true&limit=200')
        const json = await res.json()
        if (json.success && json.data?.accounts) {
          setEmployeeAccounts(json.data.accounts)
        }
      } catch {
        // Silently fail for employee list
      }
    }
    fetchEmployees()
  }, [])

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true)
      setGenerating(true)
      const params = new URLSearchParams({ month })
      if (employeeId) params.set('employeeId', employeeId)

      const res = await fetch(`/api/reports/payroll-report?${params}`)
      const json = await res.json()
      if (!json.success) {
        toast.error('Failed to generate payroll report')
        return
      }
      setData(json.data)
      setHasGenerated(true)
    } catch {
      toast.error('Network error while generating report')
    } finally {
      setLoading(false)
      setGenerating(false)
    }
  }, [month, employeeId])

  const handleGenerate = () => {
    fetchReport()
  }

  const handleReset = () => {
    setMonth(getCurrentMonth())
    setEmployeeId('')
    setData(null)
    setHasGenerated(false)
  }

  // Auto-generate on mount
  useEffect(() => {
    fetchReport()
  }, [])

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
          <Receipt className="h-6 w-6 text-amber-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Payroll Report
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Employee salary summary
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="py-0 gap-0">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Month</Label>
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="h-9 w-40"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Employee</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger className="h-9 w-44">
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employeeAccounts.map((emp) => (
                    <SelectItem key={emp.id} value={String(emp.id)}>
                      {emp.aname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="h-9 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Search className="h-4 w-4 mr-1.5" />
              )}
              Generate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-9 text-muted-foreground"
            >
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading skeleton */}
      {loading && <PayrollReportSkeleton />}

      {/* Report content */}
      {!loading && data && (
        <>
          {/* Report header */}
          <Card className="py-0 gap-0">
            <CardContent className="p-6">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold text-foreground">
                  My Accounting Firm
                </h3>
                <h4 className="text-base font-semibold text-amber-700 uppercase tracking-wide">
                  Payroll Report
                </h4>
                <p className="text-sm text-muted-foreground">
                  {formatMonth(data.month)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Employee table */}
          {data.employees.length === 0 ? (
            <Card className="py-0 gap-0">
              <CardContent className="p-12 flex flex-col items-center justify-center text-center">
                <div className="h-16 w-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
                  <Receipt className="h-8 w-8 text-amber-400" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  No payroll data found for this month
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Salary adjustments have not been configured for {formatMonth(data.month)}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="py-0 gap-0">
              <CardContent className="p-0">
                <ScrollArea className="max-h-[calc(100vh-320px)]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                        <TableHead className="text-xs font-semibold text-foreground sticky left-0 bg-slate-50/95 z-10 min-w-[160px]">
                          Employee Name
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-foreground text-right">
                          Monthly (PKR)
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-foreground text-right">
                          Tax (PKR)
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-foreground text-right">
                          Leave Ded. (PKR)
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-foreground text-right">
                          OT Add. (PKR)
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-foreground text-right">
                          Other Add. (PKR)
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-foreground text-right">
                          Other Ded. (PKR)
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-foreground text-right">
                          Net Salary (PKR)
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-foreground text-right">
                          Paid (PKR)
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-foreground text-right">
                          Due (PKR)
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.employees.map((emp) => (
                        <TableRow key={emp.employeeId} className="group">
                          <TableCell className="text-xs font-medium text-foreground sticky left-0 bg-white group-hover:bg-slate-50/50 z-10">
                            <div className="flex items-center gap-2">
                              <Users className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                              <span className="truncate">{emp.employeeName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                            {formatCurrency(emp.monthlyAmount)}
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums text-rose-600">
                            {formatCurrency(emp.taxAmount)}
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums text-orange-600">
                            {formatCurrency(emp.deductionAmt)}
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums text-emerald-600">
                            {emp.additionAmt > 0 ? formatCurrency(emp.additionAmt) : '—'}
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums text-emerald-600">
                            {emp.additionAmt > 0 ? formatCurrency(emp.additionAmt) : '—'}
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums text-orange-600">
                            {emp.deductionAmt > 0 ? formatCurrency(emp.deductionAmt) : '—'}
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums font-bold text-foreground">
                            {formatCurrency(emp.netSalary)}
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums text-slate-600">
                            {formatCurrency(emp.paid)}
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums">
                            {emp.dueSalary > 0 ? (
                              <Badge
                                variant="outline"
                                className="text-rose-600 border-rose-200 bg-rose-50 text-[10px] px-1.5 py-0"
                              >
                                {formatCurrency(emp.dueSalary)}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>

              {/* Summary footer */}
              <div className="border-t bg-slate-50/80 p-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Total Monthly
                    </p>
                    <p className="text-sm font-bold text-foreground tabular-nums">
                      {formatCurrency(data.summary.totalMonthly)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Total Tax
                    </p>
                    <p className="text-sm font-bold text-rose-600 tabular-nums">
                      {formatCurrency(data.summary.totalTax)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Total Paid
                    </p>
                    <p className="text-sm font-bold text-slate-700 tabular-nums">
                      {formatCurrency(data.summary.totalPaid)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Total Due
                    </p>
                    <p className="text-sm font-bold text-rose-600 tabular-nums">
                      {formatCurrency(data.summary.totalDue)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Employees
                    </p>
                    <p className="text-sm font-bold text-amber-700 tabular-nums">
                      {data.summary.employeeCount}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* No data, no loading yet */}
      {!loading && !data && !hasGenerated && (
        <Card className="py-0 gap-0">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
              <Receipt className="h-8 w-8 text-amber-400" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Generate a payroll report
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Select a month and click &quot;Generate&quot; to view salary data
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
