import { PrismaClient } from '@prisma/client'
import { db } from '../src/lib/db'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ── Delete existing data (reverse dependency order) ──
  console.log('🗑️  Cleaning existing data...')
  await prisma.saleDetail.deleteMany()
  await prisma.purchaseDetail.deleteMany()
  await prisma.installment.deleteMany()
  await prisma.salaryAdjustment.deleteMany()
  await prisma.trans.deleteMany()
  await prisma.account.deleteMany()
  await prisma.accountHead.deleteMany()
  await prisma.report.deleteMany()
  await prisma.companyInfo.deleteMany()
  await prisma.appUser.deleteMany()

  // ── Default Admin User ──
  console.log('👤 Creating admin user...')
  await prisma.appUser.create({
    data: {
      loginName: 'admin',
      password: 'admin123',
      isActive: true,
    },
  })

  // ── Company Info ──
  console.log('🏢 Creating company info...')
  await prisma.companyInfo.create({
    data: {
      id: 1,
      companyName: 'My Accounting Firm',
      address: '123 Business Street, Suite 100',
      phone: '+1 (555) 123-4567',
      email: 'info@myaccountingfirm.com',
      website: 'https://myaccountingfirm.com',
      ntn: '0000000-0',
      stn: '0000000-0',
      expVoucherTitle: 'EXPENSE VOUCHER',
      expVoucherFooter: 'Authorized Signature: ___________________',
      expVoucherSignature: 'Accounts Manager',
      incVoucherTitle: 'INCOME VOUCHER',
      incVoucherFooter: 'Authorized Signature: ___________________',
      incVoucherSignature: 'Accounts Manager',
      fundsPaymentTitle: 'PAYMENT VOUCHER',
      fundsPaymentFooter: 'Payment authorized by: ___________________',
      fundsReceiveTitle: 'RECEIPT VOUCHER',
      fundsReceiveFooter: 'Received by: ___________________',
      journalTitle: 'JOURNAL VOUCHER',
      journalFooter: 'Prepared by: ___________________  |  Approved by: ___________________',
      employeePaymentTitle: 'EMPLOYEE PAYMENT',
      employeePaymentFooter: 'Employee Signature: ___________________',
      saleNoStart: 1,
    },
  })

  // ── Account Heads (Chart of Accounts) ──
  console.log('📋 Creating account heads...')
  const accountHeads = [
    { atype: 'BANK', dr: 'DR', description: 'Bank Accounts', sortOrder: 1 },
    { atype: 'ASSET', dr: 'DR', description: 'Fixed & Current Assets', sortOrder: 2 },
    { atype: 'CAPITAL', dr: 'CR', description: "Owner's Equity / Capital", sortOrder: 3 },
    { atype: 'LIABILITY', dr: 'CR', description: 'Business Liabilities', sortOrder: 4 },
    { atype: 'RECEIVABLE', dr: 'DR', description: 'Amounts to Receive', sortOrder: 5 },
    { atype: 'PAYABLE', dr: 'CR', description: 'Amounts to Pay', sortOrder: 6 },
    { atype: 'INCOME', dr: 'CR', description: 'Income Categories', sortOrder: 7 },
    { atype: 'EXPENSE', dr: 'DR', description: 'Expense Categories', sortOrder: 8 },
    { atype: 'EMPLOYEE', dr: 'DR', description: 'Employee Accounts', sortOrder: 9 },
    { atype: 'CUSTOMER', dr: 'DR', description: 'Customer Accounts', sortOrder: 10 },
    { atype: 'STOCK', dr: 'DR', description: 'Inventory / Stock', sortOrder: 11 },
  ]

  for (const head of accountHeads) {
    await prisma.accountHead.create({ data: head })
  }

  // ── Default Reports ──
  console.log('📊 Creating default reports...')
  const reports = [
    // Accounting Reports (A)
    { reportName: 'Day Book', dispName: 'Day Book', reportType: 'A' },
    { reportName: 'Payments During Period', dispName: 'Payments During Period', reportType: 'A' },
    { reportName: 'Receipts During Period', dispName: 'Receipts During Period', reportType: 'A' },
    { reportName: 'All Transactions', dispName: 'All Transactions', reportType: 'A' },
    { reportName: 'Employee Payments', dispName: 'Employee Payments', reportType: 'A' },
    { reportName: 'Expense Summary', dispName: 'Expense Summary', reportType: 'A' },
    { reportName: 'Income Summary', dispName: 'Income Summary', reportType: 'A' },

    // Financial Reports (F)
    { reportName: 'Employee Payroll Report', dispName: 'Employee Payroll Report', reportType: 'F' },
    { reportName: 'Trial Balance - Payables', dispName: 'Trial Balance - Payables', reportType: 'F' },
    { reportName: 'Trial Balance - Receivables', dispName: 'Trial Balance - Receivables', reportType: 'F' },

    // Project Reports (P)
    { reportName: 'Project Payables', dispName: 'Project Payables', reportType: 'P' },
    { reportName: 'Project Receivables', dispName: 'Project Receivables', reportType: 'P' },
    { reportName: 'Project Income Statement', dispName: 'Project Income Statement', reportType: 'P' },

    // Special Reports (S)
    { reportName: 'Stock Availability', dispName: 'Stock Availability', reportType: 'S' },
    { reportName: 'Supplier Payment Voucher', dispName: 'Supplier Payment Voucher', reportType: 'S' },
    { reportName: 'Customer Report', dispName: 'Customer Report', reportType: 'S' },
  ]

  for (const report of reports) {
    await prisma.report.create({ data: report })
  }

  console.log('✅ Seeding completed successfully!')
  console.log(`   - 1 Admin User created`)
  console.log(`   - 1 Company Info created`)
  console.log(`   - ${accountHeads.length} Account Heads created`)
  console.log(`   - ${reports.length} Reports created`)
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await (db as any).$disconnect()
  })
