import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/search?q=term&limit=10 — Unified search across accounts, transactions, products
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')
    const limit = Number(searchParams.get('limit')) || 10

    if (!q || q.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Search query parameter "q" is required' },
        { status: 400 }
      )
    }

    const searchTerm = q.trim()

    // Case-insensitive search for SQLite: try original + lowercase + uppercase
    const searchVariants = [
      { contains: searchTerm },
      { contains: searchTerm.toLowerCase() },
      { contains: searchTerm.toUpperCase() },
    ]

    // Run all 3 searches in parallel
    const [accounts, transactions, products] = await Promise.all([
      db.account.findMany({
        where: {
          isActive: true,
          OR: searchVariants.map((v) => ({ aname: v })),
        },
        take: limit,
        select: { id: true, aname: true, atype: true },
      }),
      db.trans.findMany({
        where: {
          OR: [
            ...searchVariants.map((v) => ({ comments: v })),
            ...searchVariants.map((v) => ({ refNo: v })),
          ],
        },
        take: limit,
        orderBy: { transDate: 'desc' },
        select: {
          id: true,
          transDate: true,
          debit: true,
          credit: true,
          transType: true,
          comments: true,
          account: { select: { id: true, aname: true } },
        },
      }),
      db.product.findMany({
        where: {
          isActive: true,
          OR: searchVariants.map((v) => ({ pname: v })),
        },
        take: limit,
        select: { id: true, pname: true, punit: true, salePrice: true },
      }),
    ])

    // Add type field to each result item for identification
    const accountsWithType = accounts.map((a) => ({ ...a, type: 'account' as const }))
    const transactionsWithType = transactions.map((t) => ({ ...t, type: 'transaction' as const }))
    const productsWithType = products.map((p) => ({ ...p, type: 'product' as const }))

    return NextResponse.json({
      success: true,
      data: {
        accounts: accountsWithType,
        transactions: transactionsWithType,
        products: productsWithType,
      },
    })
  } catch (error) {
    console.error('Unified search error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
