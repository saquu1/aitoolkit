import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const transType = searchParams.get('transType') || undefined
    const accountId = searchParams.get('accountId') || undefined
    const bankId = searchParams.get('bankId') || undefined
    const projectId = searchParams.get('projectId') || undefined
    const fromDate = searchParams.get('fromDate') || undefined
    const toDate = searchParams.get('toDate') || undefined
    const search = searchParams.get('search') || undefined
    const page = Number(searchParams.get('page')) || 1
    const limit = Number(searchParams.get('limit')) || 20
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (transType) where.transType = transType
    if (accountId) where.accountId = Number(accountId)
    if (bankId) where.bankId = Number(bankId)
    if (projectId) where.projectId = Number(projectId)

    if (fromDate || toDate) {
      const dateFilter: Record<string, unknown> = {}
      if (fromDate) dateFilter.gte = new Date(fromDate)
      if (toDate) {
        const end = new Date(toDate)
        end.setHours(23, 59, 59, 999)
        dateFilter.lte = end
      }
      where.transDate = dateFilter
    }

    if (search) {
      where.OR = [
        { comments: { contains: search } },
        { refNo: { contains: search } },
      ]
    }

    const [transactions, total] = await Promise.all([
      db.trans.findMany({
        where,
        include: {
          account: { select: { id: true, aname: true, atype: true } },
          bank: { select: { id: true, aname: true } },
          project: { select: { id: true, pname: true } },
        },
        orderBy: { transDate: 'desc' },
        skip,
        take: limit,
      }),
      db.trans.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get transactions error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { transDate, accountId, bankId, projectId, debit, credit, refNo, comments, transType } = body

    if (!transDate || !accountId || !transType) {
      return NextResponse.json(
        { success: false, error: 'Transaction date, account ID, and type are required' },
        { status: 400 }
      )
    }

    const transaction = await db.trans.create({
      data: {
        transDate: new Date(transDate),
        accountId: Number(accountId),
        bankId: bankId ? Number(bankId) : null,
        projectId: projectId ? Number(projectId) : null,
        debit: debit || 0,
        credit: credit || 0,
        refNo: refNo || null,
        comments: comments || null,
        transType,
      },
      include: {
        account: { select: { id: true, aname: true, atype: true } },
        bank: { select: { id: true, aname: true } },
        project: { select: { id: true, pname: true } },
      },
    })

    return NextResponse.json({ success: true, data: transaction }, { status: 201 })
  } catch (error) {
    console.error('Create transaction error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, transDate, accountId, bankId, projectId, debit, credit, refNo, comments, transType } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Transaction ID is required' },
        { status: 400 }
      )
    }

    const data: Record<string, unknown> = {}
    if (transDate !== undefined) data.transDate = new Date(transDate)
    if (accountId !== undefined) data.accountId = Number(accountId)
    if (bankId !== undefined) data.bankId = bankId ? Number(bankId) : null
    if (projectId !== undefined) data.projectId = projectId ? Number(projectId) : null
    if (debit !== undefined) data.debit = debit
    if (credit !== undefined) data.credit = credit
    if (refNo !== undefined) data.refNo = refNo
    if (comments !== undefined) data.comments = comments
    if (transType !== undefined) data.transType = transType

    const transaction = await db.trans.update({
      where: { id: Number(id) },
      data,
      include: {
        account: { select: { id: true, aname: true, atype: true } },
        bank: { select: { id: true, aname: true } },
        project: { select: { id: true, pname: true } },
      },
    })

    return NextResponse.json({ success: true, data: transaction })
  } catch (error: unknown) {
    console.error('Update transaction error:', error)
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found' },
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
        { success: false, error: 'Transaction ID is required' },
        { status: 400 }
      )
    }

    await db.trans.delete({
      where: { id: Number(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Delete transaction error:', error)
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
