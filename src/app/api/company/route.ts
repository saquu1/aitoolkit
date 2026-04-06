import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const company = await db.companyInfo.findUnique({
      where: { id: 1 },
    })

    if (!company) {
      return NextResponse.json(
        { success: false, error: 'Company info not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: company })
  } catch (error) {
    console.error('Get company error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    // Only allow updating id 1
    const existing = await db.companyInfo.findUnique({ where: { id: 1 } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Company info not found' },
        { status: 404 }
      )
    }

    const company = await db.companyInfo.update({
      where: { id: 1 },
      data: {
        companyName: body.companyName ?? existing.companyName,
        address: body.address ?? existing.address,
        phone: body.phone ?? existing.phone,
        email: body.email ?? existing.email,
        website: body.website ?? existing.website,
        ntn: body.ntn ?? existing.ntn,
        stn: body.stn ?? existing.stn,
        logoPath: body.logoPath ?? existing.logoPath,
        incomeAccountId: body.incomeAccountId ?? existing.incomeAccountId,
        expVoucherTitle: body.expVoucherTitle ?? existing.expVoucherTitle,
        expVoucherFooter: body.expVoucherFooter ?? existing.expVoucherFooter,
        expVoucherSignature: body.expVoucherSignature ?? existing.expVoucherSignature,
        incVoucherTitle: body.incVoucherTitle ?? existing.incVoucherTitle,
        incVoucherFooter: body.incVoucherFooter ?? existing.incVoucherFooter,
        incVoucherSignature: body.incVoucherSignature ?? existing.incVoucherSignature,
        fundsPaymentTitle: body.fundsPaymentTitle ?? existing.fundsPaymentTitle,
        fundsPaymentFooter: body.fundsPaymentFooter ?? existing.fundsPaymentFooter,
        fundsReceiveTitle: body.fundsReceiveTitle ?? existing.fundsReceiveTitle,
        fundsReceiveFooter: body.fundsReceiveFooter ?? existing.fundsReceiveFooter,
        journalTitle: body.journalTitle ?? existing.journalTitle,
        journalFooter: body.journalFooter ?? existing.journalFooter,
        employeePaymentTitle: body.employeePaymentTitle ?? existing.employeePaymentTitle,
        employeePaymentFooter: body.employeePaymentFooter ?? existing.employeePaymentFooter,
        saleNoStart: body.saleNoStart ?? existing.saleNoStart,
      },
    })

    return NextResponse.json({ success: true, data: company })
  } catch (error) {
    console.error('Update company error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
