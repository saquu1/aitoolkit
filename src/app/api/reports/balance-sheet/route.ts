import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const asOfDate = searchParams.get('asOfDate')

    // Date filter: all transactions up to and including asOfDate
    const dateFilter: Prisma.TransWhereInput = {}
    if (asOfDate) {
      const endDate = new Date(asOfDate)
      endDate.setHours(23, 59, 59, 999)
      dateFilter.transDate = { lte: endDate }
    }

    // Get all accounts with their head info
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

    // Build aggregate map
    const aggMap = new Map<number, { totalDebit: number; totalCredit: number }>()
    for (const agg of txAggregates) {
      aggMap.set(agg.accountId, {
        totalDebit: agg._sum.debit ?? 0,
        totalCredit: agg._sum.credit ?? 0,
      })
    }

    // Calculate balance for each account
    interface AccountBalance {
      accountId: number
      accountName: string
      atype: string
      balance: number
    }

    const assets: AccountBalance[] = []
    const liabilities: AccountBalance[] = []
    const capital: AccountBalance[] = []
    const receivables: AccountBalance[] = []
    let incomeBalance = 0
    let expenseBalance = 0

    for (const acc of accounts) {
      const agg = aggMap.get(acc.id) ?? { totalDebit: 0, totalCredit: 0 }
      const nature = acc.head?.dr ?? 'DR'
      const openBal = acc.openBalance ?? 0

      let balance = 0
      if (nature === 'DR') {
        balance = openBal + agg.totalDebit - agg.totalCredit
      } else if (nature === 'CR') {
        balance = openBal + agg.totalCredit - agg.totalDebit
      } else {
        // BL - net of debit/credit
        balance = openBal + agg.totalDebit - agg.totalCredit
      }

      const item: AccountBalance = {
        accountId: acc.id,
        accountName: acc.aname,
        atype: acc.atype,
        balance: Math.round(balance * 100) / 100,
      }

      switch (acc.atype) {
        case 'ASSET':
          assets.push(item)
          break
        case 'BANK':
          assets.push(item)
          break
        case 'LIABILITY':
          liabilities.push(item)
          break
        case 'PAYABLE':
          liabilities.push(item)
          break
        case 'CAPITAL':
          capital.push(item)
          break
        case 'RECEIVABLE':
          receivables.push(item)
          break
        case 'CUSTOMER':
          receivables.push(item)
          break
        case 'INCOME':
          incomeBalance += (openBal + agg.totalCredit - agg.totalDebit)
          break
        case 'EXPENSE':
          expenseBalance += (openBal + agg.totalDebit - agg.totalCredit)
          break
        default:
          break
      }
    }

    // Filter out zero-balance accounts
    const filteredAssets = assets.filter((a) => a.balance !== 0).sort((a, b) => a.accountName.localeCompare(b.accountName))
    const filteredLiabilities = liabilities.filter((a) => a.balance !== 0).sort((a, b) => a.accountName.localeCompare(b.accountName))
    const filteredCapital = capital.filter((a) => a.balance !== 0).sort((a, b) => a.accountName.localeCompare(b.accountName))
    const filteredReceivables = receivables.filter((a) => a.balance !== 0).sort((a, b) => a.accountName.localeCompare(b.accountName))

    const totalAssets = filteredAssets.reduce((sum, a) => sum + a.balance, 0)
    const totalReceivables = filteredReceivables.reduce((sum, a) => sum + a.balance, 0)
    const totalLiabilities = filteredLiabilities.reduce((sum, a) => sum + a.balance, 0)
    const totalCapital = filteredCapital.reduce((sum, a) => sum + a.balance, 0)

    const netProfit = Math.round((incomeBalance - expenseBalance) * 100) / 100
    const totalEquity = totalLiabilities + totalCapital + netProfit
    const totalAssetSide = totalAssets + totalReceivables

    return NextResponse.json({
      success: true,
      data: {
        assets: filteredAssets,
        liabilities: filteredLiabilities,
        capital: filteredCapital,
        receivables: filteredReceivables,
        incomeBalance: Math.round(incomeBalance * 100) / 100,
        expenseBalance: Math.round(expenseBalance * 100) / 100,
        summary: {
          totalAssets: Math.round(totalAssets * 100) / 100,
          totalReceivables: Math.round(totalReceivables * 100) / 100,
          totalLiabilities: Math.round(totalLiabilities * 100) / 100,
          totalCapital: Math.round(totalCapital * 100) / 100,
          netProfit,
          totalEquity: Math.round(totalEquity * 100) / 100,
          totalAssetSide: Math.round(totalAssetSide * 100) / 100,
          isBalanced: Math.abs(totalAssetSide - totalEquity) < 0.01,
        },
      },
    })
  } catch (error) {
    console.error('Balance Sheet error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate balance sheet' },
      { status: 500 }
    )
  }
}
