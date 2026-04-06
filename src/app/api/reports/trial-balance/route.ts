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

    // Get all accounts with their head info and transaction aggregates
    const accounts = await db.account.findMany({
      where: { isActive: true },
      include: {
        head: { select: { atype: true, dr: true } },
      },
    })

    // Get transaction aggregates grouped by accountId
    const txAggregates = await db.trans.groupBy({
      by: ['accountId'],
      where: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
      _sum: { debit: true, credit: true },
    })

    // Build a map of accountId -> aggregate sums
    const aggMap = new Map<number, { totalDebit: number; totalCredit: number }>()
    for (const agg of txAggregates) {
      aggMap.set(agg.accountId, {
        totalDebit: agg._sum.debit ?? 0,
        totalCredit: agg._sum.credit ?? 0,
      })
    }

    // Get accounts that have transactions (either in aggMap or have opening balance)
    const trialAccounts = accounts
      .filter((acc) => {
        const agg = aggMap.get(acc.id)
        const hasTransactions = agg && (agg.totalDebit > 0 || agg.totalCredit > 0)
        const hasOpening = acc.openBalance > 0
        return hasTransactions || hasOpening
      })
      .map((acc) => {
        const agg = aggMap.get(acc.id) ?? { totalDebit: 0, totalCredit: 0 }
        const nature = acc.head?.dr ?? 'DR'
        const openBal = acc.openBalance ?? 0

        // Opening balance contributes: DR accounts get it as debit, CR accounts get it as credit
        const effectiveDebit = agg.totalDebit + (nature === 'DR' ? openBal : 0)
        const effectiveCredit = agg.totalCredit + (nature === 'CR' ? openBal : 0)

        // Calculate net balance based on nature
        let netBalance = 0
        let balanceSide: string
        if (nature === 'DR') {
          netBalance = effectiveDebit - effectiveCredit
          balanceSide = netBalance >= 0 ? 'DR' : 'CR'
          netBalance = Math.abs(netBalance)
        } else if (nature === 'CR') {
          netBalance = effectiveCredit - effectiveDebit
          balanceSide = netBalance >= 0 ? 'CR' : 'DR'
          netBalance = Math.abs(netBalance)
        } else {
          // BL (balance) - show on whichever side has higher
          netBalance = effectiveDebit - effectiveCredit
          balanceSide = netBalance >= 0 ? 'DR' : 'CR'
          netBalance = Math.abs(netBalance)
        }

        return {
          accountId: acc.id,
          accountName: acc.aname,
          atype: acc.atype,
          nature,
          totalDebit: effectiveDebit,
          totalCredit: effectiveCredit,
          netBalance,
          balanceSide,
        }
      })

    // Sort by account type, then by account name
    trialAccounts.sort((a, b) => {
      if (a.atype !== b.atype) return a.atype.localeCompare(b.atype)
      return a.accountName.localeCompare(b.accountName)
    })

    // Calculate grand totals
    let grandTotalDebit = 0
    let grandTotalCredit = 0
    for (const acc of trialAccounts) {
      grandTotalDebit += acc.totalDebit
      grandTotalCredit += acc.totalCredit
    }
    const difference = Math.abs(grandTotalDebit - grandTotalCredit)

    return NextResponse.json({
      success: true,
      data: {
        accounts: trialAccounts,
        summary: {
          totalDebit: Math.round(grandTotalDebit * 100) / 100,
          totalCredit: Math.round(grandTotalCredit * 100) / 100,
          difference: Math.round(difference * 100) / 100,
          isBalanced: difference < 0.01,
        },
      },
    })
  } catch (error) {
    console.error('Trial Balance error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate trial balance' },
      { status: 500 }
    )
  }
}
