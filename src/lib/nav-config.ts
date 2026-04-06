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
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type AppView =
  | 'dashboard'
  | 'accounts'
  | 'account-heads'
  | 'products'
  | 'income-entry'
  | 'expense-entry'
  | 'payment-entry'
  | 'receipt-entry'
  | 'journal-entry'
  | 'fund-payment'
  | 'fund-receipt'
  | 'employee-entry'
  | 'installment-entry'
  | 'day-book'
  | 'ledger'
  | 'trial-balance'
  | 'income-statement'
  | 'payroll-report'
  | 'project-receivables'
  | 'project-payables'
  | 'stock-report'
  | 'reports'
  | 'company-settings'
  | 'change-password'
  | 'account-openings'

export interface NavItem {
  label: string
  view: AppView
  icon: LucideIcon
  group: string
  badge?: string
}

export const navItems: NavItem[] = [
  // Main
  { label: 'Dashboard', view: 'dashboard', icon: LayoutDashboard, group: 'Main' },
  { label: 'Accounts', view: 'accounts', icon: Users, group: 'Main' },
  { label: 'Account Heads', view: 'account-heads', icon: BookOpen, group: 'Main' },
  { label: 'Products', view: 'products', icon: Package, group: 'Main' },

  // Transactions
  { label: 'Income Entry', view: 'income-entry', icon: TrendingUp, group: 'Transactions' },
  { label: 'Expense Entry', view: 'expense-entry', icon: TrendingDown, group: 'Transactions' },
  { label: 'Payment Entry', view: 'payment-entry', icon: ArrowDownCircle, group: 'Transactions' },
  { label: 'Receipt Entry', view: 'receipt-entry', icon: ArrowUpCircle, group: 'Transactions' },
  { label: 'Journal Voucher', view: 'journal-entry', icon: FileText, group: 'Transactions' },
  { label: 'Fund Payment', view: 'fund-payment', icon: Wallet, group: 'Transactions' },
  { label: 'Fund Receipt', view: 'fund-receipt', icon: Landmark, group: 'Transactions' },

  // Employees
  { label: 'Employee Payment', view: 'employee-entry', icon: UserCheck, group: 'Employees' },
  { label: 'Installments', view: 'installment-entry', icon: Repeat, group: 'Employees' },

  // Reports
  { label: 'Day Book', view: 'day-book', icon: CalendarDays, group: 'Reports' },
  { label: 'Ledger', view: 'ledger', icon: BookOpenText, group: 'Reports' },
  { label: 'Trial Balance', view: 'trial-balance', icon: Scale, group: 'Reports' },
  { label: 'Income Statement', view: 'income-statement', icon: BarChart3, group: 'Reports' },
  { label: 'Payroll Report', view: 'payroll-report', icon: Receipt, group: 'Reports' },
  { label: 'Project Receivables', view: 'project-receivables', icon: ArrowDownLeft, group: 'Reports' },
  { label: 'Project Payables', view: 'project-payables', icon: ArrowUpRight, group: 'Reports' },
  { label: 'Stock Report', view: 'stock-report', icon: Warehouse, group: 'Reports' },

  // Settings
  { label: 'Account Openings', view: 'account-openings', icon: BookOpen, group: 'Settings' },
  { label: 'Company Settings', view: 'company-settings', icon: Building2, group: 'Settings' },
  { label: 'Change Password', view: 'change-password', icon: KeyRound, group: 'Settings' },
]

export const navGroups: { label: string; items: NavItem[] }[] = [
  { label: 'Main', items: navItems.filter((i) => i.group === 'Main') },
  { label: 'Transactions', items: navItems.filter((i) => i.group === 'Transactions') },
  { label: 'Employees', items: navItems.filter((i) => i.group === 'Employees') },
  { label: 'Reports', items: navItems.filter((i) => i.group === 'Reports') },
  { label: 'Settings', items: navItems.filter((i) => i.group === 'Settings') },
]

export function getViewTitle(view: AppView): string {
  const item = navItems.find((i) => i.view === view)
  return item?.label ?? 'Dashboard'
}

export function getViewGroup(view: AppView): string {
  const item = navItems.find((i) => i.view === view)
  return item?.group ?? 'Main'
}
