import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get('fromDate') || undefined
    const toDate = searchParams.get('toDate') || undefined
    const customerId = searchParams.get('customerId') || undefined

    // Build date filter for transactions
    const dateFilter: Prisma.DateTimeNullableFilter | undefined =
      fromDate || toDate
        ? {
            ...(fromDate ? { gte: new Date(fromDate) } : {}),
            ...(toDate
              ? (() => {
                  const end = new Date(toDate)
                  end.setHours(23, 59, 59, 999)
                  return { lte: end }
                })()
              : {}),
          }
        : undefined

    // Get all RECEIVABLE and CUSTOMER accounts
    const accountFilter: Prisma.AccountWhereInput = {
      isActive: true,
      atype: { in: ['RECEIVABLE', 'CUSTOMER'] },
    }

    if (customerId) {
      accountFilter.id = Number(customerId)
    }

    const accounts = await db.account.findMany({
      where: accountFilter,
      select: {
        id: true,
        aname: true,
        atype: true,
      },
      orderBy: { aname: 'asc' },
    })

    // Build a map of account aggregates
    const customerData = []

    for (const account of accounts) {
      // Transaction filter: for this account
      const transWhere: Prisma.TransWhereInput = {
        accountId: account.id,
        ...(dateFilter ? { transDate: dateFilter } : {}),
      }

      // Get aggregates for the filtered period
      const aggregates = await db.trans.aggregate({
        where: transWhere,
        _sum: {
          debit: true,
          credit: true,
        },
        _count: true,
        _max: {
          transDate: true,
        },
      })

      // Also get installment data linked to this customer
      const installmentData = await db.installment.findMany({
        where: { customerId: account.id, isActive: true },
        select: {
          totalAmount: true,
          emiAmount: true,
          totalEmis: true,
          paidEmis: true,
          emiStartDate: true,
        },
      })

      const totalInstallment = installmentData.reduce(
        (sum, inst) => sum + inst.totalAmount,
        0
      )
      const totalEmiPaid = installmentData.reduce(
        (sum, inst) => sum + inst.emiAmount * inst.paidEmis,
        0
      )
      const totalEmiOutstanding = installmentData.reduce(
        (sum, inst) => sum + inst.emiAmount * (inst.totalEmis - inst.paidEmis),
        0
      )

      const totalDebit = aggregates._sum.debit || 0
      const totalCredit = aggregates._sum.credit || 0
      const outstanding = totalDebit - totalCredit

      customerData.push({
        accountId: account.id,
        accountName: account.aname,
        atype: account.atype,
        totalDebit,
        totalCredit,
        outstanding,
        lastTransactionDate: aggregates._max.transDate
          ? aggregates._max.transDate.toISOString().split('T')[0]
          : null,
        transactionCount: aggregates._count,
        // Installment info
        installmentCount: installmentData.length,
        totalInstallment,
        totalEmiPaid,
        totalEmiOutstanding,
      })
    }

    // Sort by outstanding DESC
    customerData.sort((a, b) => b.outstanding - a.outstanding)

    // Summary
    const totalReceivable = customerData.reduce((sum, c) => sum + c.totalDebit, 0)
    const totalReceived = customerData.reduce((sum, c) => sum + c.totalCredit, 0)
    const totalOutstanding = customerData.reduce((sum, c) => sum + c.outstanding, 0)
    const customerCount = customerData.length
    const overdueCount = customerData.filter((c) => c.outstanding > 0).length

    return NextResponse.json({
      success: true,
      data: {
        customers: customerData,
        summary: {
          totalReceivable,
          totalReceived,
          totalOutstanding,
          customerCount,
          overdueCount,
        },
      },
    })
  } catch (error) {
    console.error('Project receivables report error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
