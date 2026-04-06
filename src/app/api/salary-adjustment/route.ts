import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { employeeId, month, paid } = body

    if (!employeeId || !month || paid === undefined) {
      return NextResponse.json(
        { success: false, error: 'employeeId, month, and paid are required' },
        { status: 400 }
      )
    }

    // Find the adjustment record
    const existing = await db.salaryAdjustment.findFirst({
      where: {
        empId: Number(employeeId),
        month,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Salary adjustment not found for this employee and month' },
        { status: 404 }
      )
    }

    // Update the paid amount
    const updated = await db.salaryAdjustment.update({
      where: { id: existing.id },
      data: {
        paid: Number(paid),
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Salary adjustment update error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
