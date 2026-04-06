import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || undefined
    const page = Number(searchParams.get('page')) || 1
    const limit = Number(searchParams.get('limit')) || 20
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (search) where.pname = { contains: search }

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
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
    const { pname, punit, costPrice, salePrice } = body

    if (!pname) {
      return NextResponse.json(
        { success: false, error: 'Product name is required' },
        { status: 400 }
      )
    }

    const product = await db.product.create({
      data: {
        pname,
        punit: punit || 'PCS',
        costPrice: costPrice || 0,
        salePrice: salePrice || 0,
      },
    })

    return NextResponse.json({ success: true, data: product }, { status: 201 })
  } catch (error) {
    console.error('Create product error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, pname, punit, costPrice, salePrice, isActive } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      )
    }

    const data: Record<string, unknown> = {}
    if (pname !== undefined) data.pname = pname
    if (punit !== undefined) data.punit = punit
    if (costPrice !== undefined) data.costPrice = costPrice
    if (salePrice !== undefined) data.salePrice = salePrice
    if (isActive !== undefined) data.isActive = isActive

    const product = await db.product.update({
      where: { id: Number(id) },
      data,
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
