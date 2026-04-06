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
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { contactPerson: { contains: search } },
        { phone: { contains: search } },
      ]
    }

    const [suppliers, total] = await Promise.all([
      db.supplier.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
        include: { _count: { select: { products: true } } },
      }),
      db.supplier.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: suppliers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Get suppliers error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, contactPerson, phone, email, address, ntn } = body

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'Supplier name is required' }, { status: 400 })
    }

    const supplier = await db.supplier.create({
      data: {
        name: name.trim(),
        contactPerson: contactPerson?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        ntn: ntn?.trim() || null,
      },
    })

    return NextResponse.json({ success: true, data: supplier }, { status: 201 })
  } catch (error) {
    console.error('Create supplier error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, contactPerson, phone, email, address, ntn, isActive } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Supplier ID is required' }, { status: 400 })
    }

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name.trim()
    if (contactPerson !== undefined) data.contactPerson = contactPerson?.trim() || null
    if (phone !== undefined) data.phone = phone?.trim() || null
    if (email !== undefined) data.email = email?.trim() || null
    if (address !== undefined) data.address = address?.trim() || null
    if (ntn !== undefined) data.ntn = ntn?.trim() || null
    if (isActive !== undefined) data.isActive = isActive

    const supplier = await db.supplier.update({
      where: { id: Number(id) },
      data,
      include: { _count: { select: { products: true } } },
    })

    return NextResponse.json({ success: true, data: supplier })
  } catch (error: unknown) {
    console.error('Update supplier error:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 })
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'Supplier ID is required' }, { status: 400 })
    }

    const supplier = await db.supplier.findUnique({
      where: { id: Number(id) },
      include: { _count: { select: { products: true } } },
    })

    if (!supplier) {
      return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 })
    }

    if (supplier._count.products > 0) {
      return NextResponse.json(
        { success: false, error: `Cannot delete supplier with ${supplier._count.products} product(s). Remove or reassign products first.` },
        { status: 400 }
      )
    }

    await db.supplier.delete({ where: { id: Number(id) } })

    return NextResponse.json({ success: true, data: { id: Number(id) } })
  } catch (error: unknown) {
    console.error('Delete supplier error:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 })
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
