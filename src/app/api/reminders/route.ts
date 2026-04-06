import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/reminders — List reminders (transactions where isRemind=true)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const search = searchParams.get('search') || undefined
    const page = Number(searchParams.get('page')) || 1
    const limit = Number(searchParams.get('limit')) || 20
    const skip = (page - 1) * limit

    // Base filter: only reminders
    const where: Record<string, unknown> = { isRemind: true }

    // Status filter
    if (status === 'upcoming') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      where.transDate = { gte: tomorrow }
    } else if (status === 'overdue') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      where.transDate = { lt: today }
    } else if (status === 'completed') {
      // Show DUE-type transactions that were marked as completed (isRemind=false)
      where.isRemind = false
      where.transType = 'DUE'
    }
    // "all" — just isRemind: true (already set above)

    // Search filter: match account name or comments (case-insensitive for SQLite)
    if (search) {
      where.OR = [
        { comments: { contains: search } },
        { comments: { contains: search.toLowerCase() } },
        { comments: { contains: search.toUpperCase() } },
        { account: { aname: { contains: search } } },
        { account: { aname: { contains: search.toLowerCase() } } },
        { account: { aname: { contains: search.toUpperCase() } } },
      ]
    }

    // Build the include for relations
    const include = {
      account: { select: { id: true, aname: true, atype: true } },
      bank: { select: { id: true, aname: true } },
      project: { select: { id: true, pname: true } },
    }

    const [reminders, total] = await Promise.all([
      db.trans.findMany({
        where,
        include,
        orderBy: { transDate: 'asc' },
        skip,
        take: limit,
      }),
      db.trans.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        reminders,
        total,
        page,
        limit,
      },
    })
  } catch (error) {
    console.error('Get reminders error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/reminders — Create a new reminder
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { transDate, accountId, amount, comments, bankId, projectId } = body

    if (!transDate || !accountId || amount === undefined || amount === null) {
      return NextResponse.json(
        { success: false, error: 'Transaction date, account ID, and amount are required' },
        { status: 400 }
      )
    }

    const reminder = await db.trans.create({
      data: {
        transDate: new Date(transDate),
        accountId: Number(accountId),
        bankId: bankId ? Number(bankId) : null,
        projectId: projectId ? Number(projectId) : null,
        debit: Number(amount),
        credit: 0,
        comments: comments || null,
        transType: 'DUE',
        isRemind: true,
      },
      include: {
        account: { select: { id: true, aname: true, atype: true } },
        bank: { select: { id: true, aname: true } },
        project: { select: { id: true, pname: true } },
      },
    })

    return NextResponse.json({ success: true, data: reminder }, { status: 201 })
  } catch (error: unknown) {
    console.error('Create reminder error:', error)
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2003'
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid reference: account, bank, or project not found' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/reminders — Update a reminder
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, transDate, amount, comments, isRemind } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Reminder ID is required' },
        { status: 400 }
      )
    }

    const data: Record<string, unknown> = {}
    if (transDate !== undefined) data.transDate = new Date(transDate)
    if (amount !== undefined) data.debit = Number(amount)
    if (comments !== undefined) data.comments = comments
    if (isRemind !== undefined) data.isRemind = isRemind

    const reminder = await db.trans.update({
      where: { id: Number(id) },
      data,
      include: {
        account: { select: { id: true, aname: true, atype: true } },
        bank: { select: { id: true, aname: true } },
        project: { select: { id: true, pname: true } },
      },
    })

    return NextResponse.json({ success: true, data: reminder })
  } catch (error: unknown) {
    console.error('Update reminder error:', error)
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { success: false, error: 'Reminder not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/reminders — Delete a reminder (hard delete)
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Reminder ID is required' },
        { status: 400 }
      )
    }

    await db.trans.delete({
      where: { id: Number(id) },
    })

    return NextResponse.json({ success: true, data: { deleted: true } })
  } catch (error: unknown) {
    console.error('Delete reminder error:', error)
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { success: false, error: 'Reminder not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
