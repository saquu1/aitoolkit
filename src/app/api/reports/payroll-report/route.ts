import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse month (default to current month)
    const monthParam = searchParams.get('month')
    const now = new Date()
    const month = monthParam
      ? monthParam
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    // Parse optional employee filter
    const employeeIdParam = searchParams.get('employeeId')
    const employeeId = employeeIdParam ? parseInt(employeeIdParam, 10) : null

    // Build where clause for salary adjustments
    const whereClause: Record<string, unknown> = { month }
    if (employeeId && !isNaN(employeeId)) {
      whereClause.empId = employeeId
    }

    // Fetch salary adjustments with employee details
    const adjustments = await db.salaryAdjustment.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            aname: true,
            atype: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        employee: {
          aname: 'asc',
        },
      },
    })

    // Fetch EMPLOYEE type transactions for the period (first day to last day of month)
    const [year, mon] = month.split('-').map(Number)
    const periodStart = new Date(year, mon - 1, 1)
    const periodEnd = new Date(year, mon, 0, 23, 59, 59, 999)

    // Build employee data
    const employees = adjustments.map((adj) => {
      const monthlyAmount = adj.monthlyAmount || 0
      const taxAmount = adj.taxAmount || 0
      const leaveDays = adj.leaveDays || 0
      const otDays = adj.otDays || 0
      const additionAmt = adj.additionAmt || 0
      const deductionAmt = adj.deductionAmt || 0
      const paid = adj.paid || 0

      // Net salary = monthly - tax - (leave deduction) + ot addition + other additions - other deductions
      const netSalary = monthlyAmount - taxAmount - deductionAmt + additionAmt
      const dueSalary = netSalary - paid

      return {
        employeeId: adj.empId,
        employeeName: adj.employee.aname,
        monthlyAmount,
        taxAmount,
        leaveDays,
        otDays,
        additionAmt,
        deductionAmt,
        netSalary,
        paid,
        dueSalary,
      }
    })

    // Summary calculations
    const totalMonthly = employees.reduce((sum, e) => sum + e.monthlyAmount, 0)
    const totalTax = employees.reduce((sum, e) => sum + e.taxAmount, 0)
    const totalPaid = employees.reduce((sum, e) => sum + e.paid, 0)
    const totalDue = employees.reduce((sum, e) => sum + e.dueSalary, 0)

    return NextResponse.json({
      success: true,
      data: {
        month,
        employees,
        summary: {
          totalMonthly,
          totalTax,
          totalPaid,
          totalDue,
          employeeCount: employees.length,
        },
      },
    })
  } catch (error) {
    console.error('Payroll Report Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
