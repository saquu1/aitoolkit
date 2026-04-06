import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ============================================================
// GET - List credit entries with filters and summary
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId') || undefined
    const isPaid = searchParams.get('isPaid')
    const fromDate = searchParams.get('fromDate') || undefined
    const toDate = searchParams.get('toDate') || undefined
    const page = Number(searchParams.get('page')) || 1
    const limit = Number(searchParams.get('limit')) || 20
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (accountId) where.accountId = Number(accountId)
    if (isPaid !== null && isPaid !== undefined && isPaid !== '') {
      where.isPaid = isPaid === 'true'
    }
    if (fromDate || toDate) {
      const dateFilter: Record<string, unknown> = {}
      if (fromDate) dateFilter.gte = new Date(fromDate)
      if (toDate) dateFilter.lte = new Date(toDate)
      where.dueDate = dateFilter
    }

    const [credits, total] = await Promise.all([
      db.creditMaster.findMany({
        where,
        include: {
          sale: {
            select: {
              id: true,
              saleNo: true,
              saleDate: true,
              grandTotal: true,
            },
          },
          account: {
            select: {
              id: true,
              aname: true,
              atype: true,
              contactNo: true,
            },
          },
        },
        orderBy: { dueDate: 'asc' },
        skip,
        take: limit,
      }),
      db.creditMaster.count({ where }),
    ])

    // Calculate summary across all matching records (not just current page)
    const summaryResult = await db.creditMaster.aggregate({
      where,
      _sum: {
        credit: true,
        amt1: true,
        amt2: true,
        balance: true,
      },
    })

    const summary = {
      totalCredit: summaryResult._sum.credit || 0,
      totalPaid: (summaryResult._sum.amt1 || 0) + (summaryResult._sum.amt2 || 0),
      totalBalance: summaryResult._sum.balance || 0,
    }

    return NextResponse.json({
      success: true,
      data: credits,
      summary,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get credits error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================================
// PUT - Update credit (add payment, recalculate balance)
// ============================================================
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      id,
      amt1,
      amt2,
      otherCharges,
      discount,
      isPaid,
    } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Credit ID is required' },
        { status: 400 }
      )
    }

    // Fetch existing credit entry
    const existing = await db.creditMaster.findUnique({
      where: { id: Number(id) },
      include: { sale: true },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Credit entry not found' },
        { status: 404 }
      )
    }

    // Build update data
    const data: Record<string, unknown> = {}

    if (amt1 !== undefined) data.amt1 = Number(amt1)
    if (amt2 !== undefined) data.amt2 = Number(amt2)
    if (otherCharges !== undefined) data.otherCharges = Number(otherCharges)
    if (discount !== undefined) data.discount = Number(discount)
    if (isPaid !== undefined) data.isPaid = isPaid

    // Recalculate balance if payment amounts changed
    if (amt1 !== undefined || amt2 !== undefined || otherCharges !== undefined || discount !== undefined) {
      const paidAmt1 = amt1 !== undefined ? Number(amt1) : existing.amt1
      const paidAmt2 = amt2 !== undefined ? Number(amt2) : existing.amt2
      const charges = otherCharges !== undefined ? Number(otherCharges) : existing.otherCharges
      const disc = discount !== undefined ? Number(discount) : existing.discount

      const newBalance = existing.credit - paidAmt1 - paidAmt2 + charges - disc
      data.balance = Math.max(0, newBalance) // Prevent negative balance

      // Auto-set isPaid if balance <= 0
      if (newBalance <= 0) {
        data.isPaid = true
      }
    }

    const updated = await db.$transaction(async (tx) => {
      const credit = await tx.creditMaster.update({
        where: { id: existing.id },
        data,
        include: {
          sale: {
            select: {
              id: true,
              saleNo: true,
              saleDate: true,
              grandTotal: true,
            },
          },
          account: {
            select: {
              id: true,
              aname: true,
              atype: true,
              contactNo: true,
            },
          },
        },
      })

      // Update SaleMaster.isPaid if this credit's sale exists
      if (existing.saleId) {
        // Check if all credits for this sale are paid
        const unpaidCredits = await tx.creditMaster.count({
          where: {
            saleId: existing.saleId,
            isPaid: false,
          },
        })

        await tx.saleMaster.update({
          where: { id: existing.saleId },
          data: { isPaid: unpaidCredits === 0 },
        })
      }

      return credit
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: unknown) {
    console.error('Update credit error:', error)
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { success: false, error: 'Credit entry not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
