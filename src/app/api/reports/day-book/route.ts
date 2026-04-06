import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get('fromDate') || undefined
    const toDate = searchParams.get('toDate') || undefined
    const search = searchParams.get('search') || undefined
    const page = Number(searchParams.get('page')) || 1
    const limit = Number(searchParams.get('limit')) || 50
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (fromDate || toDate) {
      const dateFilter: Record<string, unknown> = {}
      if (fromDate) dateFilter.gte = new Date(fromDate)
      if (toDate) {
        const end = new Date(toDate)
        end.setHours(23, 59, 59, 999)
        dateFilter.lte = end
      }
      where.transDate = dateFilter
    }

    if (search) {
      where.OR = [
        { comments: { contains: search } },
        { refNo: { contains: search } },
      ]
    }

    const [transactions, total] = await Promise.all([
      db.trans.findMany({
        where,
        include: {
          account: { select: { id: true, aname: true, atype: true } },
          bank: { select: { id: true, aname: true } },
        },
        orderBy: [{ transDate: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      db.trans.count({ where }),
    ])

    // Group transactions by date
    const dateGroups = new Map<string, typeof transactions>()

    for (const t of transactions) {
      const dateStr = t.transDate.toISOString().split('T')[0]
      if (!dateGroups.has(dateStr)) {
        dateGroups.set(dateStr, [])
      }
      dateGroups.get(dateStr)!.push(t)
    }

    let overallDebit = 0
    let overallCredit = 0

    const groups = Array.from(dateGroups.entries()).map(([date, trans]) => {
      let totalDebit = 0
      let totalCredit = 0

      const formattedTrans = trans.map((t) => {
        totalDebit += t.debit
        totalCredit += t.credit
        overallDebit += t.debit
        overallCredit += t.credit

        return {
          id: t.id,
          transDate: t.transDate.toISOString(),
          account: t.account ? { aname: t.account.aname, atype: t.account.atype } : null,
          bank: t.bank ? { aname: t.bank.aname } : null,
          debit: t.debit,
          credit: t.credit,
          transType: t.transType,
          refNo: t.refNo,
          comments: t.comments,
        }
      })

      return {
        date,
        transactions: formattedTrans,
        totalDebit,
        totalCredit,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        groups,
        summary: {
          totalDebit: overallDebit,
          totalCredit: overallCredit,
          totalTransactions: total,
        },
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error('Day book report error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
