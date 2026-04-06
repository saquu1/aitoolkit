import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || undefined
    const categoryId = searchParams.get('categoryId') || undefined
    const supplierId = searchParams.get('supplierId') || undefined
    const lowStock = searchParams.get('lowStock') === 'true'
    const page = Number(searchParams.get('page')) || 1
    const limit = Number(searchParams.get('limit')) || 20
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { isActive: true }
    if (search) where.pname = { contains: search }
    if (categoryId) where.categoryId = Number(categoryId)
    if (supplierId) where.supplierId = Number(supplierId)
    if (lowStock) {
      // Products where openQty <= reOrder and reOrder > 0
      where.AND = [{ reOrder: { gt: 0 } }, { openQty: { lte: db.product.fields.reOrder } }]
    }

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          category: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
        },
      }),
      db.product.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get products error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pname, pcode, punit, costPrice, salePrice, openQty, reOrder, categoryId, supplierId } = body

    if (!pname) {
      return NextResponse.json(
        { success: false, error: 'Product name is required' },
        { status: 400 }
      )
    }

    const product = await db.product.create({
      data: {
        pname,
        pcode: pcode?.trim() || '',
        punit: punit || 'PCS',
        costPrice: costPrice || 0,
        salePrice: salePrice || 0,
        openQty: openQty || 0,
        reOrder: reOrder || 0,
        categoryId: categoryId ? Number(categoryId) : null,
        supplierId: supplierId ? Number(supplierId) : null,
      },
      include: {
        category: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ success: true, data: product }, { status: 201 })
  } catch (error: unknown) {
    console.error('Create product error:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2003') {
      return NextResponse.json({ success: false, error: 'Invalid category or supplier' }, { status: 400 })
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, pname, pcode, punit, costPrice, salePrice, openQty, reOrder, categoryId, supplierId, isActive } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      )
    }

    const data: Record<string, unknown> = {}
    if (pname !== undefined) data.pname = pname
    if (pcode !== undefined) data.pcode = pcode?.trim() || ''
    if (punit !== undefined) data.punit = punit
    if (costPrice !== undefined) data.costPrice = costPrice
    if (salePrice !== undefined) data.salePrice = salePrice
    if (openQty !== undefined) data.openQty = openQty
    if (reOrder !== undefined) data.reOrder = reOrder
    if (categoryId !== undefined) data.categoryId = categoryId ? Number(categoryId) : null
    if (supplierId !== undefined) data.supplierId = supplierId ? Number(supplierId) : null
    if (isActive !== undefined) data.isActive = isActive

    const product = await db.product.update({
      where: { id: Number(id) },
      data,
      include: {
        category: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ success: true, data: product })
  } catch (error: unknown) {
    console.error('Update product error:', error)
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2003') {
      return NextResponse.json({ success: false, error: 'Invalid category or supplier' }, { status: 400 })
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      )
    }

    // Soft delete
    const product = await db.product.update({
      where: { id: Number(id) },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, data: product })
  } catch (error: unknown) {
    console.error('Delete product error:', error)
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
