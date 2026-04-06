import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || undefined
    const page = Number(searchParams.get('page')) || 1
    const limit = Number(searchParams.get('limit')) || 50
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { isActive: true }
    if (search) where.name = { contains: search }

    const [categories, total] = await Promise.all([
      db.category.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
        include: { _count: { select: { products: true } } },
      }),
      db.category.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: categories,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Get categories error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description } = body

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'Category name is required' }, { status: 400 })
    }

    const category = await db.category.create({
      data: { name: name.trim(), description: description?.trim() || null },
    })

    return NextResponse.json({ success: true, data: category }, { status: 201 })
  } catch (error: unknown) {
    console.error('Create category error:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ success: false, error: 'Category name already exists' }, { status: 409 })
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, description, isActive } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Category ID is required' }, { status: 400 })
    }

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name.trim()
    if (description !== undefined) data.description = description?.trim() || null
    if (isActive !== undefined) data.isActive = isActive

    const category = await db.category.update({
      where: { id: Number(id) },
      data,
      include: { _count: { select: { products: true } } },
    })

    return NextResponse.json({ success: true, data: category })
  } catch (error: unknown) {
    console.error('Update category error:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 })
    }
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ success: false, error: 'Category name already exists' }, { status: 409 })
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'Category ID is required' }, { status: 400 })
    }

    // Check if category has products
    const category = await db.category.findUnique({
      where: { id: Number(id) },
      include: { _count: { select: { products: true } } },
    })

    if (!category) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 })
    }

    if (category._count.products > 0) {
      return NextResponse.json(
        { success: false, error: `Cannot delete category with ${category._count.products} product(s). Remove or reassign products first.` },
        { status: 400 }
      )
    }

    await db.category.delete({ where: { id: Number(id) } })

    return NextResponse.json({ success: true, data: { id: Number(id) } })
  } catch (error: unknown) {
    console.error('Delete category error:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 })
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
