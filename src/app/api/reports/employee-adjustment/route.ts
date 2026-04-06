import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const month = searchParams.get('month')

    if (!employeeId || !month) {
      return NextResponse.json(
        { success: false, error: 'employeeId and month are required' },
        { status: 400 }
      )
    }

    const adjustment = await db.salaryAdjustment.findFirst({
      where: {
        empId: Number(employeeId),
        month,
      },
      include: {
        employee: {
          select: {
            id: true,
            aname: true,
            atype: true,
            isActive: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: { adjustment },
    })
  } catch (error) {
    console.error('Employee adjustment fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
