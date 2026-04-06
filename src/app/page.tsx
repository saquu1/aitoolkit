'use client'

import { useAppStore } from '@/lib/store'
import { getViewTitle, getViewGroup, type AppView } from '@/lib/nav-config'
import { AppShell } from '@/components/layout/AppShell'
import { LoginView } from '@/components/views/LoginView'
import { ChangePasswordView } from '@/components/views/ChangePasswordView'
import { DashboardView } from '@/components/views/DashboardView'
import { CompanySettingsView } from '@/components/views/CompanySettingsView'
import { AccountHeadsView } from '@/components/views/AccountHeadsView'
import { ProductsView } from '@/components/views/ProductsView'
import { AccountOpeningsView } from '@/components/views/AccountOpeningsView'
import { AccountsView } from '@/components/views/AccountsView'
import { IncomeEntryView } from '@/components/views/IncomeEntryView'
import { ExpenseEntryView } from '@/components/views/ExpenseEntryView'
import { PaymentEntryView } from '@/components/views/PaymentEntryView'
import { ReceiptEntryView } from '@/components/views/ReceiptEntryView'
import { JournalEntryView } from '@/components/views/JournalEntryView'
import { FundPaymentView } from '@/components/views/FundPaymentView'
import { FundReceiptView } from '@/components/views/FundReceiptView'
import { DayBookView } from '@/components/views/DayBookView'
import { LedgerView } from '@/components/views/LedgerView'
import { TrialBalanceView } from '@/components/views/TrialBalanceView'
import { IncomeStatementView } from '@/components/views/IncomeStatementView'
import { BalanceSheetView } from '@/components/views/BalanceSheetView'
import { PayrollReportView } from '@/components/views/PayrollReportView'
import { StockReportView } from '@/components/views/StockReportView'
import { ProjectReceivablesView } from '@/components/views/ProjectReceivablesView'
import { ProjectPayablesView } from '@/components/views/ProjectPayablesView'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Package,
  TrendingUp,
  TrendingDown,
  ArrowDownCircle,
  ArrowUpCircle,
  FileText,
  Wallet,
  Landmark,
  UserCheck,
  Repeat,
  CalendarDays,
  BookOpenText,
  Scale,
  BarChart3,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  Warehouse,
  Building2,
  KeyRound,
  PieChart,
  Construction,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { LucideIcon } from 'lucide-react'

const viewIcons: Record<AppView, LucideIcon> = {
  dashboard: LayoutDashboard,
  accounts: Users,
  'account-heads': BookOpen,
  products: Package,
  'income-entry': TrendingUp,
  'expense-entry': TrendingDown,
  'payment-entry': ArrowDownCircle,
  'receipt-entry': ArrowUpCircle,
  'journal-entry': FileText,
  'fund-payment': Wallet,
  'fund-receipt': Landmark,
  'employee-entry': UserCheck,
  'installment-entry': Repeat,
  'day-book': CalendarDays,
  ledger: BookOpenText,
  'trial-balance': Scale,
  'income-statement': BarChart3,
  'balance-sheet': PieChart,
  'payroll-report': Receipt,
  'project-receivables': ArrowDownLeft,
  'project-payables': ArrowUpRight,
  'stock-report': Warehouse,
  reports: BarChart3,
  'company-settings': Building2,
  'change-password': KeyRound,
  'account-openings': BookOpen,
}

function ViewPlaceholder() {
  const { currentView } = useAppStore()
  const Icon = viewIcons[currentView] ?? Construction
  const title = getViewTitle(currentView)
  const group = getViewGroup(currentView)

  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="flex flex-col items-center text-center max-w-sm">
        <div className="h-16 w-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
          <Icon className="h-8 w-8 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {group} module
        </p>
        <Card className="mt-6 w-full py-0 gap-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <Construction className="h-4 w-4" />
              <span className="font-medium">Under Development</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This module is being built. Check back soon for updates.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MainContent() {
  const { currentView } = useAppStore()

  switch (currentView) {
    case 'dashboard':
      return <DashboardView />
    case 'accounts':
      return <AccountsView />
    case 'account-heads':
      return <AccountHeadsView />
    case 'products':
      return <ProductsView />
    case 'account-openings':
      return <AccountOpeningsView />
    case 'change-password':
      return <ChangePasswordView />
    case 'company-settings':
      return <CompanySettingsView />
    case 'income-entry':
      return <IncomeEntryView />
    case 'expense-entry':
      return <ExpenseEntryView />
    case 'payment-entry':
      return <PaymentEntryView />
    case 'receipt-entry':
      return <ReceiptEntryView />
    case 'journal-entry':
      return <JournalEntryView />
    case 'fund-payment':
      return <FundPaymentView />
    case 'fund-receipt':
      return <FundReceiptView />
    case 'day-book':
      return <DayBookView />
    case 'ledger':
      return <LedgerView />
    case 'trial-balance':
      return <TrialBalanceView />
    case 'income-statement':
      return <IncomeStatementView />
    case 'balance-sheet':
      return <BalanceSheetView />
    case 'payroll-report':
      return <PayrollReportView />
    case 'stock-report':
      return <StockReportView />
    case 'project-receivables':
      return <ProjectReceivablesView />
    case 'project-payables':
      return <ProjectPayablesView />
    default:
      return <ViewPlaceholder />
  }
}

export default function Home() {
  const { isAuthenticated } = useAppStore()

  if (!isAuthenticated) {
    return <LoginView />
  }

  return (
    <AppShell>
      <MainContent />
    </AppShell>
  )
}
