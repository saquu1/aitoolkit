import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { entries } = body

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one transaction entry is required' },
        { status: 400 }
      )
    }

    // Validate each entry has required fields
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      if (!entry.transDate || !entry.accountId || !entry.transType) {
        return NextResponse.json(
          {
            success: false,
            error: `Entry ${i + 1} is missing required fields (transDate, accountId, transType)`,
          },
          { status: 400 }
        )
      }
    }

    // Build transaction data with proper types
    const data = entries.map((entry: Record<string, unknown>) => ({
      transDate: new Date(entry.transDate as string),
      accountId: Number(entry.accountId),
      bankId: entry.bankId ? Number(entry.bankId) : null,
      projectId: entry.projectId ? Number(entry.projectId) : null,
      debit: Number(entry.debit) || 0,
      credit: Number(entry.credit) || 0,
      refNo: (entry.refNo as string) || null,
      comments: (entry.comments as string) || null,
      transType: entry.transType as string,
      isRemind: false,
    }))

    // Use Prisma transaction for atomicity
    const created = await db.$transaction(async (tx) => {
      const result = await tx.trans.createMany({
        data,
      })

      // Fetch all created records to return them with relations
      // Since SQLite doesn't return created IDs from createMany,
      // we fetch the most recent N records matching our entries
      const lastIds = await tx.trans.findMany({
        where: {
          transDate: { in: data.map((d) => d.transDate) },
        },
        include: {
          account: { select: { id: true, aname: true, atype: true } },
          bank: { select: { id: true, aname: true } },
          project: { select: { id: true, pname: true } },
        },
        orderBy: { id: 'desc' },
        take: data.length,
      })

      // Sort by id ascending to match insertion order
      return lastIds.reverse()
    })

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error) {
    console.error('Batch create transactions error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
