import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ============================================================
// GET - List delivery challans with filters
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get('fromDate') || undefined
    const toDate = searchParams.get('toDate') || undefined
    const accountId = searchParams.get('accountId') || undefined
    const isDelivered = searchParams.get('isDelivered')
    const page = Number(searchParams.get('page')) || 1
    const limit = Number(searchParams.get('limit')) || 20
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (fromDate || toDate) {
      const dateFilter: Record<string, unknown> = {}
      if (fromDate) dateFilter.gte = new Date(fromDate)
      if (toDate) dateFilter.lte = new Date(toDate)
      where.dcDate = dateFilter
    }

    if (accountId) where.accountId = Number(accountId)
    if (isDelivered !== null && isDelivered !== undefined && isDelivered !== '') {
      where.isDelivered = isDelivered === 'true'
    }

    const [dcs, total] = await Promise.all([
      db.deliveryChallan.findMany({
        where,
        include: {
          account: {
            select: { id: true, aname: true, atype: true, contactNo: true },
          },
          dcDetails: {
            include: {
              product: {
                select: { id: true, pname: true, punit: true, salePrice: true },
              },
            },
            orderBy: { id: 'asc' },
          },
        },
        orderBy: { dcDate: 'desc' },
        skip,
        take: limit,
      }),
      db.deliveryChallan.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: dcs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get delivery challans error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================================
// POST - Create delivery challan with auto-generated dcNo
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      dcDate,
      saleId,
      accountId,
      customerName,
      contactNo,
      address,
      comments,
      details,
    } = body

    // Validation
    if (!dcDate || !accountId) {
      return NextResponse.json(
        { success: false, error: 'DC date and customer account are required' },
        { status: 400 }
      )
    }

    if (!details || !Array.isArray(details) || details.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one DC detail item is required' },
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

    // Auto-generate dcNo using a counter
    // Find the highest existing DC ID to generate sequential number
    const lastDC = await db.deliveryChallan.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true },
    })
    const nextNo = (lastDC?.id || 0) + 1
    const dcNo = `DC-${String(nextNo).padStart(4, '0')}`

    const detailData = details.map((d: Record<string, unknown>) => ({
      productId: Number(d.productId),
      qty: Number(d.qty) || 0,
      lineComments: d.lineComments || null,
    }))

    const dc = await db.deliveryChallan.create({
      data: {
        dcNo,
        dcDate: new Date(dcDate),
        saleId: saleId ? Number(saleId) : null,
        accountId: Number(accountId),
        customerName: (customerName as string) || null,
        contactNo: (contactNo as string) || null,
        address: (address as string) || null,
        comments: (comments as string) || null,
        dcDetails: {
          create: detailData,
        },
      },
      include: {
        account: {
          select: { id: true, aname: true, atype: true },
        },
        dcDetails: {
          include: {
            product: {
              select: { id: true, pname: true, punit: true, salePrice: true },
            },
          },
          orderBy: { id: 'asc' },
        },
      },
    })

    return NextResponse.json({ success: true, data: dc }, { status: 201 })
  } catch (error) {
    console.error('Create delivery challan error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================================
// PUT - Update delivery challan
// ============================================================
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      id,
      dcDate,
      accountId,
      customerName,
      contactNo,
      address,
      comments,
      isDelivered,
      details,
    } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'DC ID is required' },
        { status: 400 }
      )
    }

    // Check DC exists
    const existing = await db.deliveryChallan.findUnique({
      where: { id: Number(id) },
      include: { dcDetails: true },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Delivery challan not found' },
        { status: 404 }
      )
    }

    const data: Record<string, unknown> = {}

    if (dcDate !== undefined) data.dcDate = new Date(dcDate)
    if (accountId !== undefined) data.accountId = Number(accountId)
    if (customerName !== undefined) data.customerName = (customerName as string) || null
    if (contactNo !== undefined) data.contactNo = (contactNo as string) || null
    if (address !== undefined) data.address = (address as string) || null
    if (comments !== undefined) data.comments = (comments as string) || null
    if (isDelivered !== undefined) data.isDelivered = isDelivered

    let updated: Awaited<ReturnType<typeof db.deliveryChallan.findUnique>>

    // If details are provided, delete/recreate them
    if (details && Array.isArray(details)) {
      updated = await db.$transaction(async (tx) => {
        // Delete existing details
        if (existing.dcDetails.length > 0) {
          await tx.dCDetail.deleteMany({ where: { dcId: existing.id } })
        }

        // Create new details
        const detailData = details.map((d: Record<string, unknown>) => ({
          productId: Number(d.productId),
          qty: Number(d.qty) || 0,
          lineComments: d.lineComments || null,
        }))

        return tx.deliveryChallan.update({
          where: { id: existing.id },
          data: {
            ...data,
            dcDetails: {
              create: detailData,
            },
          },
          include: {
            account: {
              select: { id: true, aname: true, atype: true },
            },
            dcDetails: {
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
    } else {
      updated = await db.deliveryChallan.update({
        where: { id: existing.id },
        data,
        include: {
          account: {
            select: { id: true, aname: true, atype: true },
          },
          dcDetails: {
            include: {
              product: {
                select: { id: true, pname: true, punit: true, salePrice: true },
              },
            },
            orderBy: { id: 'asc' },
          },
        },
      })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error: unknown) {
    console.error('Update delivery challan error:', error)
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { success: false, error: 'Delivery challan not found' },
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
// DELETE - Delete delivery challan and cascade details
// ============================================================
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'DC ID is required' },
        { status: 400 }
      )
    }

    // Check DC exists
    const existing = await db.deliveryChallan.findUnique({
      where: { id: Number(id) },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Delivery challan not found' },
        { status: 404 }
      )
    }

    if (existing.isDelivered) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete a delivered challan' },
        { status: 400 }
      )
    }

    // Hard delete — cascade will remove dcDetails
    await db.deliveryChallan.delete({
      where: { id: Number(id) },
    })

    return NextResponse.json({ success: true, data: { id: Number(id) } })
  } catch (error: unknown) {
    console.error('Delete delivery challan error:', error)
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { success: false, error: 'Delivery challan not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
