import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const heads = await db.accountHead.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { accounts: { where: { isActive: true } } },
        },
      },
    })

    return NextResponse.json({ success: true, data: heads })
  } catch (error) {
    console.error('Get account heads error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { atype, dr, description, sortOrder } = body

    if (!atype || !dr) {
      return NextResponse.json(
        { success: false, error: 'Account type and DR/CR are required' },
        { status: 400 }
      )
    }

    const head = await db.accountHead.create({
      data: {
        atype,
        dr,
        description: description || null,
        sortOrder: sortOrder || 0,
      },
    })

    return NextResponse.json({ success: true, data: head }, { status: 201 })
  } catch (error) {
    console.error('Create account head error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, atype, dr, description, sortOrder } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Account head ID is required' },
        { status: 400 }
      )
    }

    const data: Record<string, unknown> = {}
    if (atype !== undefined) data.atype = atype
    if (dr !== undefined) data.dr = dr
    if (description !== undefined) data.description = description
    if (sortOrder !== undefined) data.sortOrder = sortOrder

    const head = await db.accountHead.update({
      where: { id: Number(id) },
      data,
    })

    return NextResponse.json({ success: true, data: head })
  } catch (error: unknown) {
    console.error('Update account head error:', error)
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { success: false, error: 'Account head not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
