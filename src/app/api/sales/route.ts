import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// Helper: generate sale number based on transType and saleNoStart
function formatSaleNo(transType: string, saleNoStart: number): string {
  const padded = String(saleNoStart).padStart(4, '0')
  if (transType === 'CASH-SALE') {
    return `CS-${padded}`
  }
  return `SALE-${padded}`
}

// Helper: calculate sale totals from details
function calculateTotals(
  details: Array<{
    qtyOut?: number
    costPrice?: number
    totalAmount?: number
  }>,
  gst: number,
  discountAllow: number
) {
  const grossTotal = (details || []).reduce((sum, d) => sum + (d.totalAmount || 0), 0)
  const gstAmount = grossTotal * gst / 100
  const grandTotal = grossTotal - discountAllow + gstAmount
  const totalCost = (details || []).reduce((sum, d) => sum + ((d.qtyOut || 0) * (d.costPrice || 0)), 0)
  return { grossTotal, gstAmount, grandTotal, totalCost }
}

// Helper: build sale details data for Prisma create
function buildSaleDetailsData(details: Array<Record<string, unknown>>, saleId: number) {
  return details.map((d) => ({
    saleId,
    productId: Number(d.productId),
    qtyOut: Number(d.qtyOut) || 0,
    salePrice: Number(d.salePrice) || 0,
    costPrice: Number(d.costPrice) || 0,
    totalAmount: Number(d.totalAmount) || 0,
    lineGst: Number(d.lineGst) || 0,
    lineComments: d.lineComments || null,
    packNo: d.packNo || null,
  }))
}

// Helper: consistent include for sale master queries
const saleInclude = {
  account: { select: { id: true, aname: true, atype: true } },
  saleDetails: {
    include: {
      product: { select: { id: true, pname: true, pcode: true, punit: true } },
    },
    orderBy: { id: 'asc' } as Prisma.SaleDetailOrderByWithRelationInput,
  },
}

// ============================================
// GET - List sales with filters
// ============================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const transType = searchParams.get('transType') || undefined
    const fromDate = searchParams.get('fromDate') || undefined
    const toDate = searchParams.get('toDate') || undefined
    const accountId = searchParams.get('accountId') || undefined
    const isPaidParam = searchParams.get('isPaid') || undefined
    const search = searchParams.get('search') || undefined

    const where: Record<string, unknown> = {}

    if (transType) where.transType = transType
    if (accountId) where.accountId = Number(accountId)
    if (isPaidParam !== undefined && isPaidParam !== null && isPaidParam !== '') {
      where.isPaid = isPaidParam === 'true'
    }

    if (fromDate || toDate) {
      const dateFilter: Record<string, unknown> = {}
      if (fromDate) dateFilter.gte = new Date(fromDate)
      if (toDate) {
        const end = new Date(toDate)
        end.setHours(23, 59, 59, 999)
        dateFilter.lte = end
      }
      where.saleDate = dateFilter
    }

    if (search) {
      where.OR = [
        { saleNo: { contains: search } },
        { customerName: { contains: search } },
        { contactNo: { contains: search } },
      ]
    }

    const sales = await db.saleMaster.findMany({
      where,
      include: saleInclude,
      orderBy: [
        { saleDate: 'desc' },
        { id: 'desc' },
      ],
    })

    return NextResponse.json({ success: true, data: sales })
  } catch (error) {
    console.error('Get sales error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// POST - Create a new sale with line items
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      saleDate,
      accountId,
      transType,
      customerName,
      contactNo,
      idCard,
      discountAllow,
      gst,
      comments,
      poRefNo,
      details,
    } = body

    // Validation
    if (!saleDate || !accountId || !transType) {
      return NextResponse.json(
        { success: false, error: 'Sale date, account ID, and transaction type are required' },
        { status: 400 }
      )
    }

    if (!details || !Array.isArray(details) || details.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one sale detail item is required' },
        { status: 400 }
      )
    }

    if (transType !== 'SALE' && transType !== 'CASH-SALE') {
      return NextResponse.json(
        { success: false, error: 'Transaction type must be SALE or CASH-SALE' },
        { status: 400 }
      )
    }

    // Calculate totals
    const totals = calculateTotals(details, gst || 0, discountAllow || 0)

    // Generate sale number via transaction
    const sale = await db.$transaction(async (tx) => {
      // Get and increment saleNoStart
      const companyInfo = await tx.companyInfo.findUnique({ where: { id: 1 } })
      if (!companyInfo) {
        throw new Error('Company info not found')
      }

      const saleNo = formatSaleNo(transType, companyInfo.saleNoStart)
      const nextSaleNoStart = companyInfo.saleNoStart + 1

      // Update company info with next sale number
      await tx.companyInfo.update({
        where: { id: 1 },
        data: { saleNoStart: nextSaleNoStart },
      })

      // Create SaleMaster
      const saleMaster = await tx.saleMaster.create({
        data: {
          saleNo,
          saleDate: new Date(saleDate),
          accountId: Number(accountId),
          transType,
          customerName: customerName || null,
          contactNo: contactNo || null,
          idCard: idCard || null,
          grossTotal: totals.grossTotal,
          discountAllow: discountAllow || 0,
          gst: gst || 0,
          gstAmount: totals.gstAmount,
          grandTotal: totals.grandTotal,
          totalCost: totals.totalCost,
          isPaid: transType === 'CASH-SALE',
          comments: comments || null,
          poRefNo: poRefNo || null,
          saleDetails: {
            create: buildSaleDetailsData(details, 0).map((d) => {
              // saleId will be set by Prisma via nested create
              const { saleId: _, ...rest } = d
              return rest
            }),
          },
        },
        include: saleInclude,
      })

      // For credit SALE: create CreditMaster record
      if (transType === 'SALE') {
        const dueDate = new Date(saleDate)
        dueDate.setDate(dueDate.getDate() + 30)

        await tx.creditMaster.create({
          data: {
            saleId: saleMaster.id,
            accountId: Number(accountId),
            invNo: saleNo,
            credit: totals.grandTotal,
            dueDate,
            balance: totals.grandTotal,
          },
        })
      }

      return saleMaster
    })

    return NextResponse.json({ success: true, data: sale }, { status: 201 })
  } catch (error: unknown) {
    console.error('Create sale error:', error)
    if (error instanceof Error && error.message === 'Company info not found') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2003'
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid account or product reference' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// PUT - Update an existing sale
// ============================================
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      id,
      saleDate,
      accountId,
      transType,
      customerName,
      contactNo,
      idCard,
      discountAllow,
      gst,
      comments,
      poRefNo,
      details,
    } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Sale ID is required' },
        { status: 400 }
      )
    }

    if (!details || !Array.isArray(details) || details.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one sale detail item is required' },
        { status: 400 }
      )
    }

    // Calculate totals
    const totals = calculateTotals(details, gst || 0, discountAllow || 0)

    const sale = await db.$transaction(async (tx) => {
      // Verify the sale exists
      const existing = await tx.saleMaster.findUnique({
        where: { id: Number(id) },
      })
      if (!existing) {
        throw new Prisma.PrismaClientKnownRequestError('Sale not found', {
          code: 'P2025',
          clientVersion: Prisma.prismaVersion.client,
        })
      }

      // Delete existing sale details (cascade)
      await tx.saleDetail.deleteMany({
        where: { saleId: Number(id) },
      })

      // Delete existing CreditMaster records for this sale
      await tx.creditMaster.deleteMany({
        where: { saleId: Number(id) },
      })

      // Update SaleMaster
      const updatedSale = await tx.saleMaster.update({
        where: { id: Number(id) },
        data: {
          saleDate: saleDate ? new Date(saleDate) : undefined,
          accountId: accountId ? Number(accountId) : undefined,
          transType: transType || undefined,
          customerName: customerName !== undefined ? customerName : undefined,
          contactNo: contactNo !== undefined ? contactNo : undefined,
          idCard: idCard !== undefined ? idCard : undefined,
          grossTotal: totals.grossTotal,
          discountAllow: discountAllow || 0,
          gst: gst || 0,
          gstAmount: totals.gstAmount,
          grandTotal: totals.grandTotal,
          totalCost: totals.totalCost,
          isPaid: transType === 'CASH-SALE' ? true : (transType === 'SALE' ? false : undefined),
          comments: comments !== undefined ? comments : undefined,
          poRefNo: poRefNo !== undefined ? poRefNo : undefined,
          saleDetails: {
            create: buildSaleDetailsData(details, Number(id)).map((d) => {
              const { saleId: _, ...rest } = d
              return rest
            }),
          },
        },
        include: saleInclude,
      })

      // For credit SALE: create CreditMaster record
      if (transType === 'SALE') {
        const dueDate = new Date(saleDate)
        dueDate.setDate(dueDate.getDate() + 30)

        await tx.creditMaster.create({
          data: {
            saleId: updatedSale.id,
            accountId: Number(accountId),
            invNo: updatedSale.saleNo,
            credit: totals.grandTotal,
            dueDate,
            balance: totals.grandTotal,
          },
        })
      }

      return updatedSale
    })

    return NextResponse.json({ success: true, data: sale })
  } catch (error: unknown) {
    console.error('Update sale error:', error)
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { success: false, error: 'Sale not found' },
        { status: 404 }
      )
    }
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2003'
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid account or product reference' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE - Delete a sale (cascade deletes details)
// ============================================
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Sale ID is required' },
        { status: 400 }
      )
    }

    await db.$transaction(async (tx) => {
      // Delete associated CreditMaster records first
      await tx.creditMaster.deleteMany({
        where: { saleId: Number(id) },
      })

      // Delete the sale (cascade will delete saleDetails)
      await tx.saleMaster.delete({
        where: { id: Number(id) },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Delete sale error:', error)
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { success: false, error: 'Sale not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
