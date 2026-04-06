import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const installments = await db.installment.findMany({
      include: {
        customer: {
          select: { id: true, aname: true, atype: true },
        },
        transaction: {
          select: { id: true, transDate: true, refNo: true, comments: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: installments })
  } catch (error) {
    console.error('Get installments error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      customerId,
      totalAmount,
      emiAmount,
      totalEmis,
      emiStartDate,
      refNo,
      comments,
      bankId,
    } = body

    if (!customerId || !totalAmount || !emiAmount || !totalEmis || !emiStartDate || !bankId) {
      return NextResponse.json(
        { success: false, error: 'customerId, totalAmount, emiAmount, totalEmis, emiStartDate, and bankId are required' },
        { status: 400 }
      )
    }

    // Create journal transaction: Debit customer (receivable), Credit income
    // Find the default income account or the first INCOME account
    const incomeAccount = await db.account.findFirst({
      where: { atype: 'INCOME', isActive: true },
    })

    if (!incomeAccount) {
      return NextResponse.json(
        { success: false, error: 'No active INCOME account found. Please create one first.' },
        { status: 400 }
      )
    }

    const journalTrans = await db.trans.create({
      data: {
        transDate: new Date(emiStartDate),
        accountId: Number(customerId),
        bankId: Number(bankId),
        debit: Number(totalAmount),
        credit: 0,
        refNo: refNo || null,
        comments: comments || `Installment plan: ${totalEmis} EMIs of ${emiAmount} PKR`,
        transType: 'JOURNAL',
      },
    })

    // Create the credit side of the journal
    await db.trans.create({
      data: {
        transDate: new Date(emiStartDate),
        accountId: incomeAccount.id,
        bankId: null,
        debit: 0,
        credit: Number(totalAmount),
        refNo: refNo || null,
        comments: comments || `Installment plan: ${totalEmis} EMIs of ${emiAmount} PKR`,
        transType: 'JOURNAL',
      },
    })

    // Create installment record
    const installment = await db.installment.create({
      data: {
        transId: journalTrans.id,
        customerId: Number(customerId),
        totalAmount: Number(totalAmount),
        emiAmount: Number(emiAmount),
        totalEmis: Number(totalEmis),
        paidEmis: 0,
        emiStartDate: new Date(emiStartDate),
        isActive: true,
      },
      include: {
        customer: {
          select: { id: true, aname: true, atype: true },
        },
        transaction: {
          select: { id: true, transDate: true, refNo: true, comments: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: installment }, { status: 201 })
  } catch (error) {
    console.error('Create installment error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { installmentId, bankId } = body

    if (!installmentId || !bankId) {
      return NextResponse.json(
        { success: false, error: 'installmentId and bankId are required' },
        { status: 400 }
      )
    }

    // Fetch the installment
    const installment = await db.installment.findUnique({
      where: { id: Number(installmentId) },
      include: {
        customer: { select: { id: true, aname: true } },
      },
    })

    if (!installment) {
      return NextResponse.json(
        { success: false, error: 'Installment not found' },
        { status: 404 }
      )
    }

    if (installment.paidEmis >= installment.totalEmis) {
      return NextResponse.json(
        { success: false, error: 'All EMIs have already been paid' },
        { status: 400 }
      )
    }

    if (!installment.isActive) {
      return NextResponse.json(
        { success: false, error: 'This installment plan is no longer active' },
        { status: 400 }
      )
    }

    // Create RECEIPT transaction: Debit bank, Credit customer
    await db.trans.create({
      data: {
        transDate: new Date(),
        accountId: Number(bankId),
        debit: installment.emiAmount,
        credit: 0,
        refNo: `EMI-${installment.paidEmis + 1}/${installment.totalEmis}`,
        comments: `EMI payment #${installment.paidEmis + 1} for ${installment.customer.aname}`,
        transType: 'RECEIPT',
      },
    })

    await db.trans.create({
      data: {
        transDate: new Date(),
        accountId: installment.customerId,
        credit: installment.emiAmount,
        debit: 0,
        refNo: `EMI-${installment.paidEmis + 1}/${installment.totalEmis}`,
        comments: `EMI payment #${installment.paidEmis + 1} for ${installment.customer.aname}`,
        transType: 'RECEIPT',
      },
    })

    // Update installment: increment paidEmis, mark inactive if completed
    const newPaidEmis = installment.paidEmis + 1
    const isCompleted = newPaidEmis >= installment.totalEmis

    const updated = await db.installment.update({
      where: { id: Number(installmentId) },
      data: {
        paidEmis: newPaidEmis,
        isActive: !isCompleted,
      },
      include: {
        customer: {
          select: { id: true, aname: true, atype: true },
        },
        transaction: {
          select: { id: true, transDate: true, refNo: true, comments: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Record EMI payment error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
