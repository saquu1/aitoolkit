import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Date ranges
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
    const sixMonthsAgo = new Date(today)
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
    sixMonthsAgo.setDate(1)
    sixMonthsAgo.setHours(0, 0, 0, 0)

    // Run all queries in parallel
    const [
      accountsByType,
      totalTransactions,
      todayTransactions,
      totalIncome,
      totalExpenses,
      totalProducts,
      recentTransactions,
      monthLabels,
      weekTransactions,
      monthTransactions,
      topAccountsRaw,
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
        where: { transDate: { gte: today, lt: tomorrow } },
      }),
      // Total income
      db.trans.aggregate({
        where: { transType: 'INCOME' },
        _sum: { credit: true },
      }),
      // Total expenses
      db.trans.aggregate({
        where: { transType: 'EXPENSE' },
        _sum: { debit: true },
      }),
      // Total products count
      db.product.count({ where: { isActive: true } }),
      // Recent 10 transactions
      db.trans.findMany({
        take: 10,
        orderBy: { transDate: 'desc' },
        include: {
          account: { select: { id: true, aname: true, atype: true } },
          project: { select: { id: true, pname: true } },
        },
      }),
      // Monthly trend: income & expense grouped by month for last 6 months (SQLite strftime)
      db.$queryRaw<Array<{
        monthKey: string
        income: number | null
        expenses: number | null
      }>>`
        SELECT
          strftime('%Y-%m', t.trans_date) as "monthKey",
          SUM(CASE WHEN t.trans_type = 'INCOME' THEN t.credit ELSE 0 END) as "income",
          SUM(CASE WHEN t.trans_type = 'EXPENSE' THEN t.debit ELSE 0 END) as "expenses"
        FROM trans t
        WHERE t.trans_date >= ${sixMonthsAgo.toISOString()}
        GROUP BY strftime('%Y-%m', t.trans_date)
        ORDER BY "monthKey" ASC
      `,
      // Transactions in the last 7 days
      db.trans.count({
        where: { transDate: { gte: sevenDaysAgo, lt: tomorrow } },
      }),
      // Transactions in the last 30 days
      db.trans.count({
        where: { transDate: { gte: thirtyDaysAgo, lt: tomorrow } },
      }),
      // Top 5 accounts by total activity volume
      db.$queryRaw<Array<{
        accountId: number
        accountName: string
        atype: string
        totalDebit: number
        totalCredit: number
      }>>`
        SELECT
          a.account_id as "accountId",
          a.aname as "accountName",
          a.atype as "atype",
          COALESCE(SUM(t.debit), 0) as "totalDebit",
          COALESCE(SUM(t.credit), 0) as "totalCredit"
        FROM accounts a
        LEFT JOIN trans t ON a.account_id = t.account_id
        WHERE a.is_active = 1
        GROUP BY a.account_id, a.aname, a.atype
        ORDER BY (COALESCE(SUM(t.debit), 0) + COALESCE(SUM(t.credit), 0)) DESC
        LIMIT 5
      `,
    ])

    // ── Build Monthly Trend ───────────────────────────────────────────────
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const now = new Date()

    // Initialize 6 month buckets
    const monthlyTrend: { month: string; income: number; expenses: number; netProfit: number }[] = []
    const monthKeys: string[] = [] // YYYY-MM format keys for matching
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const label = `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthKeys.push(key)
      monthlyTrend.push({ month: label, income: 0, expenses: 0, netProfit: 0 })
    }

    // Map raw query results into buckets
    for (const row of monthLabels) {
      const idx = monthKeys.indexOf(row.monthKey)
      if (idx !== -1) {
        monthlyTrend[idx].income = Math.round(row.income ?? 0)
        monthlyTrend[idx].expenses = Math.round(row.expenses ?? 0)
        monthlyTrend[idx].netProfit = monthlyTrend[idx].income - monthlyTrend[idx].expenses
      }
    }

    // ── Build Top Accounts ────────────────────────────────────────────────
    const topAccounts = topAccountsRaw.map((a) => ({
      accountId: a.accountId,
      accountName: a.accountName,
      atype: a.atype,
      totalDebit: Math.round(a.totalDebit),
      totalCredit: Math.round(a.totalCredit),
      balance: Math.round(a.totalDebit - a.totalCredit),
    }))

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
        monthlyTrend,
        topAccounts,
        recentActivity: {
          todayCount: todayTransactions,
          weekCount: weekTransactions,
          monthCount: monthTransactions,
        },
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
