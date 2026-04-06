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
        { phone: { contains: search } },
        { email: { contains: search } },
        { city: { contains: search } },
      ]
    }

    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      db.customer.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: customers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Get customers error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, email, address, city, ntn } = body

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'Customer name is required' }, { status: 400 })
    }

    const customer = await db.customer.create({
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        city: city?.trim() || null,
        ntn: ntn?.trim() || null,
      },
    })

    return NextResponse.json({ success: true, data: customer }, { status: 201 })
  } catch (error) {
    console.error('Create customer error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, phone, email, address, city, ntn, isActive } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Customer ID is required' }, { status: 400 })
    }

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name.trim()
    if (phone !== undefined) data.phone = phone?.trim() || null
    if (email !== undefined) data.email = email?.trim() || null
    if (address !== undefined) data.address = address?.trim() || null
    if (city !== undefined) data.city = city?.trim() || null
    if (ntn !== undefined) data.ntn = ntn?.trim() || null
    if (isActive !== undefined) data.isActive = isActive

    const customer = await db.customer.update({
      where: { id: Number(id) },
      data,
    })

    return NextResponse.json({ success: true, data: customer })
  } catch (error: unknown) {
    console.error('Update customer error:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 })
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'Customer ID is required' }, { status: 400 })
    }

    await db.customer.update({
      where: { id: Number(id) },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, data: { id: Number(id) } })
  } catch (error: unknown) {
    console.error('Delete customer error:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 })
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
