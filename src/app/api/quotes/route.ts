import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ============================================================
// GET - List quotes with filters
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get('fromDate') || undefined
    const toDate = searchParams.get('toDate') || undefined
    const accountId = searchParams.get('accountId') || undefined
    const search = searchParams.get('search') || undefined
    const isActive = searchParams.get('isActive')
    const page = Number(searchParams.get('page')) || 1
    const limit = Number(searchParams.get('limit')) || 20
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (fromDate || toDate) {
      const dateFilter: Record<string, unknown> = {}
      if (fromDate) dateFilter.gte = new Date(fromDate)
      if (toDate) dateFilter.lte = new Date(toDate)
      where.quoteDate = dateFilter
    }

    if (accountId) where.accountId = Number(accountId)
    if (isActive !== null && isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true'
    }
    if (search) {
      where.OR = [
        { quoteNo: { contains: search } },
        { customerName: { contains: search } },
      ]
    }

    const [quotes, total] = await Promise.all([
      db.quoteMaster.findMany({
        where,
        include: {
          account: {
            select: { id: true, aname: true, atype: true, contactNo: true },
          },
          quoteDetails: {
            include: {
              product: {
                select: { id: true, pname: true, punit: true, salePrice: true },
              },
            },
            orderBy: { id: 'asc' },
          },
        },
        orderBy: { quoteDate: 'desc' },
        skip,
        take: limit,
      }),
      db.quoteMaster.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: quotes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get quotes error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================================
// POST - Create quote OR convert quote to sale (action="convert")
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Handle quote-to-sale conversion
    if (body.action === 'convert') {
      return handleConvertToSale(body)
    }

    // Handle quote creation
    return handleCreateQuote(body)
  } catch (error) {
    console.error('POST quotes error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================================
// Create a new quote with auto-generated quoteNo
// ============================================================
async function handleCreateQuote(body: Record<string, unknown>) {
  const {
    quoteDate,
    accountId,
    customerName,
    contactNo,
    gst,
    discountAllow,
    comments,
    details,
  } = body

  // Validation
  if (!quoteDate || !accountId) {
    return NextResponse.json(
      { success: false, error: 'Quote date and customer account are required' },
      { status: 400 }
    )
  }

  if (!details || !Array.isArray(details) || details.length === 0) {
    return NextResponse.json(
      { success: false, error: 'At least one quote detail item is required' },
      { status: 400 }
    )
  }

  // Validate each detail
  for (const detail of details) {
    if (!detail.productId || !detail.qty || detail.qty <= 0) {
      return NextResponse.json(
        { success: false, error: 'Each detail must have a valid product and quantity' },
        { status: 400 }
      )
    }
  }

  const gstPercent = Number(gst) || 0
  const discount = Number(discountAllow) || 0

  // Calculate totals
  let grossTotal = 0
  let totalGst = 0

  const detailData = details.map((d: Record<string, unknown>) => {
    const qty = Number(d.qty) || 0
    const price = Number(d.price) || 0
    const lineGst = gstPercent > 0 ? (qty * price * gstPercent) / 100 : 0
    const totalAmount = qty * price

    grossTotal += totalAmount
    totalGst += lineGst

    return {
      productId: Number(d.productId),
      qty,
      price,
      totalAmount,
      lineGst,
      lineComments: d.lineComments || null,
      packNo: d.packNo || null,
    }
  })

  const gstAmount = totalGst
  const grandTotal = grossTotal - discount + gstAmount

  // Auto-generate quoteNo from CompanyInfo.quoteNoStart
  const companyInfo = await db.companyInfo.findUnique({ where: { id: 1 } })
  const quoteNoStart = companyInfo?.quoteNoStart || 1
  const quoteNo = `QUO-${String(quoteNoStart).padStart(4, '0')}`

  // Use transaction for atomicity
  const quote = await db.$transaction(async (tx) => {
    const created = await tx.quoteMaster.create({
      data: {
        quoteNo,
        quoteDate: new Date(quoteDate as string),
        accountId: Number(accountId),
        customerName: (customerName as string) || null,
        contactNo: (contactNo as string) || null,
        grossTotal,
        discountAllow: discount,
        gst: gstPercent,
        gstAmount,
        grandTotal,
        comments: (comments as string) || null,
        quoteDetails: {
          create: detailData,
        },
      },
      include: {
        account: {
          select: { id: true, aname: true, atype: true },
        },
        quoteDetails: {
          include: {
            product: {
              select: { id: true, pname: true, punit: true, salePrice: true },
            },
          },
          orderBy: { id: 'asc' },
        },
      },
    })

    // Increment quoteNoStart
    await tx.companyInfo.update({
      where: { id: 1 },
      data: { quoteNoStart: quoteNoStart + 1 },
    })

    return created
  })

  return NextResponse.json({ success: true, data: quote }, { status: 201 })
}

// ============================================================
// Convert a quote to a sale
// ============================================================
async function handleConvertToSale(body: Record<string, unknown>) {
  const { quoteId } = body

  if (!quoteId) {
    return NextResponse.json(
      { success: false, error: 'Quote ID is required for conversion' },
      { status: 400 }
    )
  }

  // Fetch the quote with details
  const quote = await db.quoteMaster.findUnique({
    where: { id: Number(quoteId) },
    include: {
      account: true,
      quoteDetails: {
        include: { product: true },
        orderBy: { id: 'asc' },
      },
    },
  })

  if (!quote) {
    return NextResponse.json(
      { success: false, error: 'Quote not found' },
      { status: 404 }
    )
  }

  if (!quote.isActive) {
    return NextResponse.json(
      { success: false, error: 'Quote is no longer active (already converted or cancelled)' },
      { status: 400 }
    )
  }

  if (quote.convertedSaleId) {
    return NextResponse.json(
      { success: false, error: 'Quote has already been converted to a sale' },
      { status: 400 }
    )
  }

  // Auto-generate saleNo from CompanyInfo.saleNoStart
  const companyInfo = await db.companyInfo.findUnique({ where: { id: 1 } })
  const saleNoStart = companyInfo?.saleNoStart || 1
  const saleNo = `SALE-${String(saleNoStart).padStart(4, '0')}`

  // Calculate totalCost from products
  let totalCost = 0
  for (const qd of quote.quoteDetails) {
    totalCost += Number(qd.product.costPrice) * Number(qd.qty)
  }

  const sale = await db.$transaction(async (tx) => {
    // Determine transType based on account type
    const accountType = quote.account.atype
    const transType = (accountType === 'BANK' || accountType === 'CASH') ? 'CASH-SALE' : 'SALE'

    // Create SaleMaster
    const createdSale = await tx.saleMaster.create({
      data: {
        saleNo,
        saleDate: new Date(),
        accountId: quote.accountId,
        transType,
        customerName: quote.customerName,
        contactNo: quote.contactNo,
        grossTotal: quote.grossTotal,
        discountAllow: quote.discountAllow,
        gst: quote.gst,
        gstAmount: quote.gstAmount,
        grandTotal: quote.grandTotal,
        totalCost,
        isPaid: transType === 'CASH-SALE',
        comments: quote.comments,
        saleDetails: {
          create: quote.quoteDetails.map((qd) => ({
            productId: qd.productId,
            qtyOut: qd.qty,
            salePrice: qd.price,
            costPrice: Number(qd.product.costPrice),
            totalAmount: qd.totalAmount,
            lineGst: qd.lineGst,
            lineComments: qd.lineComments,
            packNo: qd.packNo,
          })),
        },
      },
      include: {
        account: { select: { id: true, aname: true, atype: true } },
        saleDetails: {
          include: {
            product: { select: { id: true, pname: true, punit: true } },
          },
        },
      },
    })

    // Update the quote as converted
    await tx.quoteMaster.update({
      where: { id: quote.id },
      data: {
        convertedSaleId: createdSale.id,
        isActive: false,
      },
    })

    // Increment saleNoStart
    await tx.companyInfo.update({
      where: { id: 1 },
      data: { saleNoStart: saleNoStart + 1 },
    })

    return createdSale
  })

  return NextResponse.json({
    success: true,
    data: sale,
    message: `Quote ${quote.quoteNo} converted to sale ${sale.saleNo}`,
  })
}

// ============================================================
// PUT - Update quote (delete/recreate details)
// ============================================================
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, quoteDate, accountId, customerName, contactNo, gst, discountAllow, comments, details } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Quote ID is required' },
        { status: 400 }
      )
    }

    // Check quote exists
    const existing = await db.quoteMaster.findUnique({
      where: { id: Number(id) },
      include: { quoteDetails: true },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Quote not found' },
        { status: 404 }
      )
    }

    if (existing.convertedSaleId) {
      return NextResponse.json(
        { success: false, error: 'Cannot edit a quote that has been converted to a sale' },
        { status: 400 }
      )
    }

    const gstPercent = Number(gst) || 0
    const discount = Number(discountAllow) || 0

    // Calculate totals from details
    let grossTotal = 0
    let totalGst = 0

    const detailData = (details || []).map((d: Record<string, unknown>) => {
      const qty = Number(d.qty) || 0
      const price = Number(d.price) || 0
      const lineGst = gstPercent > 0 ? (qty * price * gstPercent) / 100 : 0
      const totalAmount = qty * price

      grossTotal += totalAmount
      totalGst += lineGst

      return {
        productId: Number(d.productId),
        qty,
        price,
        totalAmount,
        lineGst,
        lineComments: d.lineComments || null,
        packNo: d.packNo || null,
      }
    })

    const gstAmount = totalGst
    const grandTotal = grossTotal - discount + gstAmount

    const updated = await db.$transaction(async (tx) => {
      // Delete existing details
      if (existing.quoteDetails.length > 0) {
        await tx.quoteDetail.deleteMany({ where: { quoteId: existing.id } })
      }

      // Update master and create new details
      return tx.quoteMaster.update({
        where: { id: existing.id },
        data: {
          quoteDate: quoteDate ? new Date(quoteDate) : undefined,
          accountId: accountId !== undefined ? Number(accountId) : undefined,
          customerName: customerName !== undefined ? (customerName as string) || null : undefined,
          contactNo: contactNo !== undefined ? (contactNo as string) || null : undefined,
          grossTotal,
          discountAllow: discount,
          gst: gstPercent,
          gstAmount,
          grandTotal,
          comments: comments !== undefined ? (comments as string) || null : undefined,
          quoteDetails: {
            create: detailData,
          },
        },
        include: {
          account: {
            select: { id: true, aname: true, atype: true },
          },
          quoteDetails: {
            include: {
              product: {
                select: { id: true, pname: true, punit: true, salePrice: true },
              },
            },
            orderBy: { id: 'asc' },
          },
        },
      })
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: unknown) {
    console.error('Update quote error:', error)
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { success: false, error: 'Quote not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================================
// DELETE - Delete quote and cascade details
// ============================================================
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Quote ID is required' },
        { status: 400 }
      )
    }

    // Check quote exists and can be deleted
    const existing = await db.quoteMaster.findUnique({
      where: { id: Number(id) },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Quote not found' },
        { status: 404 }
      )
    }

    if (existing.convertedSaleId) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete a quote that has been converted to a sale' },
        { status: 400 }
      )
    }

    // Hard delete — cascade will remove quoteDetails
    await db.quoteMaster.delete({
      where: { id: Number(id) },
    })

    return NextResponse.json({ success: true, data: { id: Number(id) } })
  } catch (error: unknown) {
    console.error('Delete quote error:', error)
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { success: false, error: 'Quote not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
