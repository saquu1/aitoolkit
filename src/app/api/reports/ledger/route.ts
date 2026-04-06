import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const fromDate = searchParams.get('fromDate') || undefined
    const toDate = searchParams.get('toDate') || undefined
    const page = Number(searchParams.get('page')) || 1
    const limit = Number(searchParams.get('limit')) || 50
    const skip = (page - 1) * limit

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: 'Account ID is required' },
        { status: 400 }
      )
    }

    // Fetch account info with head relation
    const account = await db.account.findUnique({
      where: { id: Number(accountId) },
      include: {
        head: { select: { id: true, atype: true, dr: true } },
      },
    })

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      )
    }

    // Build where clause for transactions
    const where: Record<string, unknown> = {
      accountId: Number(accountId),
    }

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

    // Fetch transactions with pagination
    const [transactions, total] = await Promise.all([
      db.trans.findMany({
        where,
        include: {
          bank: { select: { id: true, aname: true } },
        },
        orderBy: [{ transDate: 'asc' }, { id: 'asc' }],
        skip,
        take: limit,
      }),
      db.trans.count({ where }),
    ])

    // Calculate running balance
    // Opening balance is from account.openBalance
    let runningBalance = account.openBalance

    // If there's a fromDate and it's not the beginning, we need to compute
    // balance of transactions before fromDate
    if (fromDate) {
      const priorWhere: Record<string, unknown> = {
        accountId: Number(accountId),
        transDate: { lt: new Date(fromDate) },
      }
      const priorTransactions = await db.trans.findMany({
        where: priorWhere,
        select: { debit: true, credit: true },
      })
      for (const t of priorTransactions) {
        runningBalance += (t.debit - t.credit)
      }
    }

    const formattedTrans = transactions.map((t) => {
      // For the "particular" column: show bank account name if bankId exists, otherwise comments
      const particular = t.bank ? t.bank.aname : (t.comments || '—')

      runningBalance += (t.debit - t.credit)

      return {
        id: t.id,
        transDate: t.transDate.toISOString(),
        particular,
        debit: t.debit,
        credit: t.credit,
        balance: runningBalance,
        transType: t.transType,
        refNo: t.refNo,
        comments: t.comments,
      }
    })

    // Calculate totals
    let totalDebit = 0
    let totalCredit = 0
    for (const t of transactions) {
      totalDebit += t.debit
      totalCredit += t.credit
    }

    const closingBalance = runningBalance

    return NextResponse.json({
      success: true,
      data: {
        account: {
          id: account.id,
          aname: account.aname,
          atype: account.atype,
          openBalance: account.openBalance,
          nature: account.head?.dr || 'DR',
        },
        transactions: formattedTrans,
        summary: {
          totalDebit,
          totalCredit,
          closingBalance,
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
    console.error('Ledger report error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
