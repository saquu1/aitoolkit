import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Run all queries in parallel
    const [
      accountsByType,
      totalTransactions,
      todayTransactions,
      totalIncome,
      totalExpenses,
      totalProducts,
      recentTransactions,
    ] = await Promise.all([
      // Accounts grouped by atype
      db.account.groupBy({
        by: ['atype'],
        where: { isActive: true },
        _count: { id: true },
      }),
      // Total transactions count
      db.trans.count(),
      // Today's transactions count
      db.trans.count({
        where: {
          transDate: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      // Total income (sum of credits where transType = "INCOME")
      db.trans.aggregate({
        where: { transType: 'INCOME' },
        _sum: { credit: true },
      }),
      // Total expenses (sum of debits where transType = "EXPENSE")
      db.trans.aggregate({
        where: { transType: 'EXPENSE' },
        _sum: { debit: true },
      }),
      // Total products count
      db.product.count({ where: { isActive: true } }),
      // Recent 10 transactions with account and project names
      db.trans.findMany({
        take: 10,
        orderBy: { transDate: 'desc' },
        include: {
          account: { select: { id: true, aname: true, atype: true } },
          project: { select: { id: true, pname: true } },
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        accountsByType,
        totalTransactions,
        todayTransactions,
        totalIncome: totalIncome._sum.credit ?? 0,
        totalExpenses: totalExpenses._sum.debit ?? 0,
        totalProducts,
        recentTransactions,
      },
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
