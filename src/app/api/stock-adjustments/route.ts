import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get('page')) || 1
    const limit = Number(searchParams.get('limit')) || 20
    const skip = (page - 1) * limit
    const adjType = searchParams.get('adjType') || undefined
    const from = searchParams.get('from') || undefined
    const to = searchParams.get('to') || undefined

    const where: Record<string, unknown> = {}
    if (adjType) where.adjType = adjType
    if (from || to) {
      where.date = {}
      if (from) (where.date as Record<string, unknown>).gte = new Date(from)
      if (to) (where.date as Record<string, unknown>).lte = new Date(to)
    }

    const [adjustments, total] = await Promise.all([
      db.stockAdjustment.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
        include: {
          items: {
            include: { product: { select: { id: true, pname: true, punit: true } } },
          },
        },
      }),
      db.stockAdjustment.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: adjustments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Get stock adjustments error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, adjType, reason, items } = body

    if (!date) {
      return NextResponse.json({ success: false, error: 'Date is required' }, { status: 400 })
    }
    if (!['IN', 'OUT', 'SET'].includes(adjType)) {
      return NextResponse.json({ success: false, error: 'Adjustment type must be IN, OUT, or SET' }, { status: 400 })
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one item is required' }, { status: 400 })
    }

    const adjustment = await db.stockAdjustment.create({
      data: {
        date: new Date(date),
        adjType,
        reason: reason?.trim() || null,
        items: {
          create: items.map((item: { productId: number; qty: number; comments?: string }) => ({
            productId: Number(item.productId),
            qty: Number(item.qty),
            comments: item.comments?.trim() || null,
          })),
        },
      },
      include: {
        items: {
          include: { product: { select: { id: true, pname: true, punit: true } } },
        },
      },
    })

    // Update product openQty based on adjustment type
    for (const item of items) {
      const product = await db.product.findUnique({ where: { id: Number(item.productId) } })
      if (product) {
        const currentQty = product.openQty || 0
        let newQty = currentQty
        if (adjType === 'IN') newQty = currentQty + Number(item.qty)
        else if (adjType === 'OUT') newQty = Math.max(0, currentQty - Number(item.qty))
        else if (adjType === 'SET') newQty = Number(item.qty)
        await db.product.update({ where: { id: Number(item.productId) }, data: { openQty: newQty } })
      }
    }

    return NextResponse.json({ success: true, data: adjustment }, { status: 201 })
  } catch (error) {
    console.error('Create stock adjustment error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'Adjustment ID is required' }, { status: 400 })
    }

    // Get the adjustment with items to reverse stock changes
    const adjustment = await db.stockAdjustment.findUnique({
      where: { id: Number(id) },
      include: { items: true },
    })

    if (!adjustment) {
      return NextResponse.json({ success: false, error: 'Adjustment not found' }, { status: 404 })
    }

    // Reverse the stock changes
    for (const item of adjustment.items) {
      const product = await db.product.findUnique({ where: { id: item.productId } })
      if (product) {
        const currentQty = product.openQty || 0
        let newQty = currentQty
        if (adjustment.adjType === 'IN') newQty = Math.max(0, currentQty - item.qty)
        else if (adjustment.adjType === 'OUT') newQty = currentQty + item.qty
        // SET type reversal is not possible, skip
        if (adjustment.adjType !== 'SET') {
          await db.product.update({ where: { id: item.productId }, data: { openQty: newQty } })
        }
      }
    }

    await db.stockAdjustment.delete({ where: { id: Number(id) } })

    return NextResponse.json({ success: true, data: { id: Number(id) } })
  } catch (error: unknown) {
    console.error('Delete stock adjustment error:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Adjustment not found' }, { status: 404 })
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
