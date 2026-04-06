import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const atype = searchParams.get('atype') || undefined
    const search = searchParams.get('search') || undefined
    const isActive = searchParams.get('isActive')
    const page = Number(searchParams.get('page')) || 1
    const limit = Number(searchParams.get('limit')) || 20
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (atype) where.atype = atype
    if (search) where.aname = { contains: search }
    if (isActive !== null && isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true'
    }

    const [accounts, total] = await Promise.all([
      db.account.findMany({
        where,
        include: {
          head: { select: { id: true, atype: true, description: true, dr: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.account.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: accounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get accounts error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { aname, atype, address, contactNo, openBalance } = body

    if (!aname || !atype) {
      return NextResponse.json(
        { success: false, error: 'Account name and type are required' },
        { status: 400 }
      )
    }

    // Check if account head exists
    const headExists = await db.accountHead.findUnique({ where: { atype } })
    if (!headExists) {
      return NextResponse.json(
        { success: false, error: `Account head type "${atype}" does not exist` },
        { status: 400 }
      )
    }

    const account = await db.account.create({
      data: {
        aname,
        atype,
        address: address || undefined,
        contactNo: contactNo || undefined,
        openBalance: openBalance || 0,
      },
      include: {
        head: { select: { id: true, atype: true, description: true, dr: true } },
      },
    })

    return NextResponse.json({ success: true, data: account }, { status: 201 })
  } catch (error) {
    console.error('Create account error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, aname, atype, isActive, address, contactNo, openBalance } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Account ID is required' },
        { status: 400 }
      )
    }

    const data: Record<string, unknown> = {}
    if (aname !== undefined) data.aname = aname
    if (atype !== undefined) data.atype = atype
    if (isActive !== undefined) data.isActive = isActive
    if (address !== undefined) data.address = address
    if (contactNo !== undefined) data.contactNo = contactNo
    if (openBalance !== undefined) data.openBalance = openBalance

    const account = await db.account.update({
      where: { id: Number(id) },
      data,
      include: {
        head: { select: { id: true, atype: true, description: true, dr: true } },
      },
    })

    return NextResponse.json({ success: true, data: account })
  } catch (error: unknown) {
    console.error('Update account error:', error)
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
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
        { success: false, error: 'Account ID is required' },
        { status: 400 }
      )
    }

    // Soft delete: set isActive to false
    const account = await db.account.update({
      where: { id: Number(id) },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, data: account })
  } catch (error: unknown) {
    console.error('Delete account error:', error)
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
