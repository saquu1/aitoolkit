import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')

    // Build date filter
    const dateFilter: Prisma.TransWhereInput = {}
    if (fromDate) {
      dateFilter.transDate = { ...(dateFilter.transDate as Prisma.DateTimeNullableFilter ?? {}), gte: new Date(fromDate) }
    }
    if (toDate) {
      dateFilter.transDate = { ...(dateFilter.transDate as Prisma.DateTimeNullableFilter ?? {}), lte: new Date(toDate) }
    }

    // Get all income and expense accounts
    const [incomeAccounts, expenseAccounts] = await Promise.all([
      // INCOME accounts with their credit aggregates
      db.account.findMany({
        where: { isActive: true, atype: 'INCOME' },
        include: {
          head: { select: { atype: true, dr: true } },
          _count: {
            select: {
              debitTrans: {
                where: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
              },
            },
          },
        },
        orderBy: { aname: 'asc' },
      }),
      // EXPENSE accounts with their debit aggregates
      db.account.findMany({
        where: { isActive: true, atype: 'EXPENSE' },
        include: {
          head: { select: { atype: true, dr: true } },
          _count: {
            select: {
              debitTrans: {
                where: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
              },
            },
          },
        },
        orderBy: { aname: 'asc' },
      }),
    ])

    // Get transaction sums for income accounts (credits = income earned)
    const incomeAccountIds = incomeAccounts.map((a) => a.id)
    const expenseAccountIds = expenseAccounts.map((a) => a.id)

    const [incomeTxSums, expenseTxSums] = await Promise.all([
      // For income accounts, sum credits (money coming in)
      incomeAccountIds.length > 0
        ? db.trans.groupBy({
            by: ['accountId'],
            where: {
              accountId: { in: incomeAccountIds },
              ...dateFilter,
            },
            _sum: { credit: true },
          })
        : [],
      // For expense accounts, sum debits (money going out)
      expenseAccountIds.length > 0
        ? db.trans.groupBy({
            by: ['accountId'],
            where: {
              accountId: { in: expenseAccountIds },
              ...dateFilter,
            },
            _sum: { debit: true },
          })
        : [],
    ])

    // Build maps for quick lookup
    const incomeSumMap = new Map<number, number>()
    for (const sum of incomeTxSums) {
      incomeSumMap.set(sum.accountId, sum._sum.credit ?? 0)
    }

    const expenseSumMap = new Map<number, number>()
    for (const sum of expenseTxSums) {
      expenseSumMap.set(sum.accountId, sum._sum.debit ?? 0)
    }

    // Build income accounts list (only those with transactions)
    const incomeList = incomeAccounts
      .map((acc) => ({
        accountId: acc.id,
        accountName: acc.aname,
        totalIncome: incomeSumMap.get(acc.id) ?? 0,
      }))
      .filter((acc) => acc.totalIncome > 0)

    // Build expense accounts list (only those with transactions)
    const expenseList = expenseAccounts
      .map((acc) => ({
        accountId: acc.id,
        accountName: acc.aname,
        totalExpense: expenseSumMap.get(acc.id) ?? 0,
      }))
      .filter((acc) => acc.totalExpense > 0)

    const totalIncome = incomeList.reduce((sum, a) => sum + a.totalIncome, 0)
    const totalExpenses = expenseList.reduce((sum, a) => sum + a.totalExpense, 0)
    const netProfit = totalIncome - totalExpenses

    return NextResponse.json({
      success: true,
      data: {
        incomeAccounts: incomeList,
        expenseAccounts: expenseList,
        summary: {
          totalIncome: Math.round(totalIncome * 100) / 100,
          totalExpenses: Math.round(totalExpenses * 100) / 100,
          netProfit: Math.round(netProfit * 100) / 100,
        },
      },
    })
  } catch (error) {
    console.error('Income Statement error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate income statement' },
      { status: 500 }
    )
  }
}
