import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get('fromDate') || undefined
    const toDate = searchParams.get('toDate') || undefined
    const vendorId = searchParams.get('vendorId') || undefined

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

    // Get all PAYABLE and LIABILITY accounts
    const accountFilter: Prisma.AccountWhereInput = {
      isActive: true,
      atype: { in: ['PAYABLE', 'LIABILITY'] },
    }

    if (vendorId) {
      accountFilter.id = Number(vendorId)
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

    // Build vendor data
    const vendorData = []

    for (const account of accounts) {
      // Transaction filter for this account
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

      const totalCredit = aggregates._sum.credit || 0
      const totalDebit = aggregates._sum.debit || 0
      const outstanding = totalCredit - totalDebit

      vendorData.push({
        accountId: account.id,
        accountName: account.aname,
        atype: account.atype,
        totalCredit,
        totalDebit,
        outstanding,
        lastTransactionDate: aggregates._max.transDate
          ? aggregates._max.transDate.toISOString().split('T')[0]
          : null,
        transactionCount: aggregates._count,
      })
    }

    // Sort by outstanding DESC
    vendorData.sort((a, b) => b.outstanding - a.outstanding)

    // Summary
    const totalPayable = vendorData.reduce((sum, v) => sum + v.totalCredit, 0)
    const totalPaid = vendorData.reduce((sum, v) => sum + v.totalDebit, 0)
    const totalOutstanding = vendorData.reduce((sum, v) => sum + v.outstanding, 0)
    const vendorCount = vendorData.length

    return NextResponse.json({
      success: true,
      data: {
        vendors: vendorData,
        summary: {
          totalPayable,
          totalPaid,
          totalOutstanding,
          vendorCount,
        },
      },
    })
  } catch (error) {
    console.error('Project payables report error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
