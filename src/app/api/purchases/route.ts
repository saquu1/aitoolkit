import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// ============================================================
// GET /api/purchases — List purchases with filters
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get('fromDate') || undefined
    const toDate = searchParams.get('toDate') || undefined
    const accountId = searchParams.get('accountId') || undefined
    const search = searchParams.get('search') || undefined

    const where: Record<string, unknown> = {
      transType: 'PURCHASE',
    }

    if (accountId) {
      where.accountId = Number(accountId)
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

    if (search) {
      where.OR = [
        { refNo: { contains: search } },
        { comments: { contains: search } },
        { account: { aname: { contains: search } } },
      ]
    }

    // Only fetch the main purchase entry (debit > 0), not the bank reverse entry
    const purchases = await db.trans.findMany({
      where: {
        ...where,
        debit: { gt: 0 },
      },
      include: {
        purchaseEntries: {
          include: {
            product: {
              select: {
                id: true,
                pname: true,
                punit: true,
                pcode: true,
              },
            },
          },
          orderBy: { id: 'asc' },
        },
        account: {
          select: { id: true, aname: true, atype: true },
        },
        bank: {
          select: { id: true, aname: true },
        },
      },
      orderBy: [
        { transDate: 'desc' },
        { id: 'desc' },
      ],
    })

    return NextResponse.json({
      success: true,
      data: purchases,
    })
  } catch (error) {
    console.error('Get purchases error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================================
// POST /api/purchases — Create a new purchase
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      transDate,
      accountId,
      bankId,
      discountReceive,
      gst,
      comments,
      refNo,
      details,
    } = body

    // --- Validation ---
    if (!transDate) {
      return NextResponse.json(
        { success: false, error: 'Transaction date is required' },
        { status: 400 }
      )
    }
    if (!accountId) {
      return NextResponse.json(
        { success: false, error: 'Supplier account is required' },
        { status: 400 }
      )
    }
    if (!bankId) {
      return NextResponse.json(
        { success: false, error: 'Bank/Cash account is required' },
        { status: 400 }
      )
    }
    if (!details || !Array.isArray(details) || details.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one purchase detail line is required' },
        { status: 400 }
      )
    }

    // Validate each detail line
    for (let i = 0; i < details.length; i++) {
      const d = details[i]
      if (!d.productId) {
        return NextResponse.json(
          { success: false, error: `Product is required on line ${i + 1}` },
          { status: 400 }
        )
      }
      if (!d.qtyIn || d.qtyIn <= 0) {
        return NextResponse.json(
          { success: false, error: `Quantity must be greater than 0 on line ${i + 1}` },
          { status: 400 }
        )
      }
      if (!d.costPrice || d.costPrice < 0) {
        return NextResponse.json(
          { success: false, error: `Cost price must be 0 or greater on line ${i + 1}` },
          { status: 400 }
        )
      }
    }

    // --- Calculate totals ---
    const totalCost = details.reduce(
      (sum: number, d: { totalAmount: number }) => sum + (d.totalAmount || 0),
      0
    )
    const gstPercent = gst || 0
    const gstAmount = totalCost * gstPercent / 100
    const discount = discountReceive || 0
    const grandTotal = totalCost - discount + gstAmount

    if (grandTotal <= 0) {
      return NextResponse.json(
        { success: false, error: 'Grand total must be greater than 0' },
        { status: 400 }
      )
    }

    // Generate a purchase reference number if not provided
    const purchaseRefNo =
      refNo ||
      `PUR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now()).slice(-6)}`

    // --- Create purchase in a transaction ---
    const result = await db.$transaction(async (tx) => {
      // 1. Create the main purchase Trans (debit side - stock/purchase increases)
      const purchaseTrans = await tx.trans.create({
        data: {
          transDate: new Date(transDate),
          accountId: Number(accountId),
          bankId: Number(bankId),
          debit: grandTotal,
          credit: 0,
          refNo: purchaseRefNo,
          comments: comments || null,
          transType: 'PURCHASE',
        },
        include: {
          account: { select: { id: true, aname: true, atype: true } },
          bank: { select: { id: true, aname: true } },
        },
      })

      // 2. Create PurchaseDetail records
      const purchaseDate = new Date(transDate)
      const purchaseDetails = await Promise.all(
        details.map(
          (d: { productId: number; qtyIn: number; costPrice: number; totalAmount: number }) =>
            tx.purchaseDetail.create({
              data: {
                purchaseId: purchaseTrans.id,
                productId: Number(d.productId),
                purchaseDate,
                qtyIn: Number(d.qtyIn),
                costPrice: Number(d.costPrice),
                totalAmount: Number(d.totalAmount),
              },
              include: {
                product: {
                  select: { id: true, pname: true, punit: true, pcode: true },
                },
              },
            })
        )
      )

      // 3. Create the reverse bank Trans (credit side - cash/bank decreases)
      const bankTrans = await tx.trans.create({
        data: {
          transDate: new Date(transDate),
          accountId: Number(bankId),
          bankId: null,
          debit: 0,
          credit: grandTotal,
          refNo: purchaseRefNo,
          comments: comments || null,
          transType: 'PURCHASE',
        },
      })

      return { purchaseTrans, purchaseDetails, bankTrans }
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          trans: result.purchaseTrans,
          details: result.purchaseDetails,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create purchase error:', error)

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2003'
    ) {
      return NextResponse.json(
        { success: false, error: 'Referenced account or product not found' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================================
// DELETE /api/purchases?id=<trans_id> — Delete a purchase
// ============================================================
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Purchase ID is required' },
        { status: 400 }
      )
    }

    const transId = Number(id)

    // Find the purchase Trans to get its refNo and details
    const purchaseTrans = await db.trans.findUnique({
      where: { id: transId },
      include: {
        purchaseEntries: true,
      },
    })

    if (!purchaseTrans) {
      return NextResponse.json(
        { success: false, error: 'Purchase not found' },
        { status: 404 }
      )
    }

    if (purchaseTrans.transType !== 'PURCHASE') {
      return NextResponse.json(
        { success: false, error: 'Record is not a purchase transaction' },
        { status: 400 }
      )
    }

    // Delete everything in a transaction
    await db.$transaction(async (tx) => {
      // 1. Delete all PurchaseDetail records for this purchase
      if (purchaseTrans.purchaseEntries.length > 0) {
        await tx.purchaseDetail.deleteMany({
          where: { purchaseId: transId },
        })
      }

      // 2. Find and delete the bank reverse entry (same refNo, PURCHASE type, credit > 0, different id)
      if (purchaseTrans.refNo) {
        await tx.trans.deleteMany({
          where: {
            refNo: purchaseTrans.refNo,
            transType: 'PURCHASE',
            id: { not: transId },
          },
        })
      }

      // 3. Delete the main purchase Trans
      await tx.trans.delete({
        where: { id: transId },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete purchase error:', error)

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return NextResponse.json(
        { success: false, error: 'Purchase not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
