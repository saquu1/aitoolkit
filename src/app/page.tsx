'use client'

import {
  Database,
  Table2,
  LayoutDashboard,
  FileText,
  ArrowLeftRight,
  Calculator,
  BookOpen,
  Cpu,
  Lightbulb,
  Layers,
  Shield,
  Globe,
  Mail,
  BarChart3,
  Smartphone,
  FileArchive,
  QrCode,
  Moon,
  Receipt,
  Users,
  Building2,
  CreditCard,
  TrendingUp,
  ChevronRight,
  FolderOpen,
  ClipboardList,
  Search,
  Eye,
  Calendar,
  HardDrive,
  Workflow,
  Zap,
  Target,
  Code2,
  CheckCircle2,
  Clock,
  Package,
  Banknote,
  HandCoins,
  ArrowRightLeft,
  BookMarked,
  UserCog,
  Lock,
  Settings,
  Link2,
  SlidersHorizontal,
  Bell,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'

/* ─────────────────────── Data Constants ─────────────────────── */

const DB_FILE = {
  name: 'AccountingProject.accde',
  size: '~4 MB',
  type: 'Microsoft Access Compiled Database (.accde)',
  complexity: 'High',
  sqlCount: '162+',
  formsCount: '30+',
  queriesCount: '20+',
  reportsCount: '15+',
  category: 'Full-Featured Double-Entry Accounting System',
}

const TABLES = [
  {
    name: 'ACCOUNTS',
    description: 'Master accounts table',
    icon: BookOpen,
    fields: [
      { name: 'ACCOUNT_ID', type: 'PK', desc: 'Unique identifier' },
      { name: 'ANAME', type: 'Text', desc: 'Account name' },
      { name: 'ATYPE', type: 'FK', desc: 'Account type reference' },
      { name: 'IS_ACTIVE', type: 'Boolean', desc: 'Active status' },
      { name: 'ADDRESS', type: 'Text', desc: 'Address info' },
      { name: 'CONTACT_NO', type: 'Text', desc: 'Contact number' },
      { name: 'REGISTER_DATE', type: 'Date', desc: 'Registration date' },
    ],
    accountTypes: ['BANK', 'EMPLOYEE', 'INCOME', 'EXPENSE', 'CUSTOMER', 'PAYABLE', 'RECEIVABLE', 'CAPITAL', 'ASSET', 'LIABILITY', 'STOCK'],
  },
  {
    name: 'ACCOUNT_HEADS',
    description: 'Account type definitions (chart of accounts)',
    icon: Layers,
    fields: [
      { name: 'ATYPE', type: 'PK', desc: 'Account type key' },
      { name: 'DR', type: 'Text', desc: 'Debit/credit nature' },
      { name: 'DESCRIPTION', type: 'Text', desc: 'Description' },
    ],
  },
  {
    name: 'TRANS',
    description: 'Central transactions table (double-entry)',
    icon: ArrowLeftRight,
    fields: [
      { name: 'TRANS_ID', type: 'PK', desc: 'Transaction ID' },
      { name: 'TRANS_DATE', type: 'Date', desc: 'Transaction date' },
      { name: 'ACCOUNT_ID', type: 'FK', desc: 'Account reference' },
      { name: 'BANK_ID', type: 'FK', desc: 'Bank account reference' },
      { name: 'PROJECT_ID', type: 'FK', desc: 'Project/product reference' },
      { name: 'DEBIT', type: 'Decimal', desc: 'Debit amount' },
      { name: 'CREDIT', type: 'Decimal', desc: 'Credit amount' },
      { name: 'REF_NO', type: 'Text', desc: 'Reference number' },
      { name: 'COMMENTS', type: 'Text', desc: 'Transaction notes' },
      { name: 'TRANS_TYPE', type: 'Text', desc: 'Transaction type' },
      { name: 'IS_REMIND', type: 'Boolean', desc: 'Reminder flag' },
    ],
    transTypes: ['EXPENSE', 'INCOME', 'EMPLOYEE', 'JOURNAL', 'PAYMENT', 'RECEIPT', 'GEN. PAY', 'GEN. REC', 'OPEN BALANCE', 'DUE'],
  },
  {
    name: 'COMPANY_INFO',
    description: 'Company settings & configuration',
    icon: Building2,
    fields: [
      { name: 'COMPANY_ID', type: 'PK', desc: 'Company ID' },
      { name: 'COMPANY_NAME', type: 'Text', desc: 'Company name' },
      { name: 'ADDRESS', type: 'Text', desc: 'Company address' },
      { name: 'PIC_PATH', type: 'Text', desc: 'Logo path' },
      { name: 'INCOME_ACCOUNT_ID', type: 'FK', desc: 'Default income account' },
      { name: 'EMPLOYEE_PAYMENT_TITLE', type: 'Text', desc: 'Payment voucher title' },
      { name: 'EMPLOYEE_PAYMENT_FOOTER', type: 'Text', desc: 'Payment voucher footer' },
      { name: 'EXP_VOUCHER_TITLE/FOOTER', type: 'Text', desc: 'Expense voucher templates' },
      { name: 'INC_VOUCHER_TITLE/FOOTER', type: 'Text', desc: 'Income voucher templates' },
      { name: 'FUND_*', type: 'Text', desc: 'Fund transfer templates' },
      { name: 'JOURNAL_TITLE/FOOTER', type: 'Text', desc: 'Journal voucher templates' },
    ],
  },
  {
    name: 'PRODUCTS',
    description: 'Products/Projects inventory',
    icon: Package,
    fields: [
      { name: 'PRODUCT_ID', type: 'PK', desc: 'Product ID' },
      { name: 'PNAME', type: 'Text', desc: 'Product name' },
      { name: 'PUNIT', type: 'Text', desc: 'Unit of measurement' },
      { name: 'COST_PRICE', type: 'Decimal', desc: 'Cost price' },
      { name: 'SALE_PRICE', type: 'Decimal', desc: 'Sale price' },
      { name: 'IS_ACTIVE', type: 'Boolean', desc: 'Active status' },
      { name: 'AVAILABLE', type: 'Calc', desc: 'Available quantity' },
    ],
  },
  {
    name: 'SALARY_ADJUSTMENTS',
    description: 'Employee salary modifications',
    icon: HandCoins,
    fields: [
      { name: 'EMP_ID', type: 'FK', desc: 'Employee reference' },
      { name: 'MONTHLY_AMOUNT', type: 'Decimal', desc: 'Base salary' },
      { name: 'TAX_AMOUNT', type: 'Decimal', desc: 'Tax deduction' },
      { name: 'LEAVE_DAYS', type: 'Integer', desc: 'Leave days' },
      { name: 'OT_DAYS', type: 'Integer', desc: 'Overtime days' },
      { name: 'ADDITION_AMT', type: 'Decimal', desc: 'Additional amount' },
      { name: 'DEDUCTION_AMT', type: 'Decimal', desc: 'Deduction amount' },
      { name: 'PAID', type: 'Decimal', desc: 'Amount already paid' },
      { name: 'DUE_SALARY', type: 'Decimal', desc: 'Due salary' },
    ],
  },
  {
    name: 'REPORTS',
    description: 'Reports configuration table',
    icon: FileText,
    fields: [
      { name: 'REPORT_ID', type: 'PK', desc: 'Report ID' },
      { name: 'REPORT_NAME', type: 'Text', desc: 'Internal report name' },
      { name: 'DISP_NAME', type: 'Text', desc: 'Display name' },
      { name: 'REPORT_TYPE', type: 'Text', desc: 'Report category' },
    ],
  },
  {
    name: 'REPORT_PARAMETER',
    description: 'Report filter parameters',
    icon: SlidersHorizontal,
    fields: [
      { name: '(Various)', type: 'Mixed', desc: 'Dynamic filter parameters for reports' },
    ],
  },
  {
    name: 'USERS / ADMIN',
    description: 'User authentication',
    icon: Lock,
    fields: [
      { name: 'USER_ID', type: 'PK', desc: 'User ID' },
      { name: 'LOGIN_NAME', type: 'Text', desc: 'Login username' },
      { name: 'PASSWORD', type: 'Text', desc: 'Login password' },
    ],
  },
]

const FORMS = {
  setup: {
    title: 'Setup & Configuration',
    icon: Settings,
    color: 'text-amber-600 bg-amber-50',
    forms: [
      { name: 'MENU', desc: 'Main navigation menu', icon: LayoutDashboard },
      { name: 'COMPANY_INFO', desc: 'Company details & settings', icon: Building2 },
      { name: 'ACCOUNT_OPENINGS', desc: 'Set opening balances', icon: BookOpen },
      { name: 'DEFINE_EMPLOYEES', desc: 'Manage employee accounts', icon: Users },
      { name: 'DEFINE_EXPENSES', desc: 'Define expense categories', icon: CreditCard },
      { name: 'DEFINE_INCOME', desc: 'Define income categories', icon: TrendingUp },
      { name: 'DEFINE_OTHER_ACCOUNTS', desc: 'Assets, Liabilities, Capital, Payable, Receivable', icon: Layers },
      { name: 'DEFINE_SALARY_ADJUSTMENTS', desc: 'Configure salary structures', icon: HandCoins },
      { name: 'CHANGE_PASSWORD', desc: 'User password management', icon: Lock },
      { name: 'PRODUCT_EDIT', desc: 'Add/edit products', icon: Package },
    ],
  },
  transaction: {
    title: 'Transaction Entry Forms',
    icon: ArrowRightLeft,
    color: 'text-emerald-600 bg-emerald-50',
    forms: [
      { name: 'INCOME_ENTRY', desc: 'Record income transactions', icon: TrendingUp },
      { name: 'EXPENSE_ENTRY', desc: 'Record expense transactions', icon: CreditCard },
      { name: 'EMPLOYEE_ENTRY', desc: 'Record employee payments', icon: Users },
      { name: 'PAYMENT_ENTRY', desc: 'Record general payments', icon: Banknote },
      { name: 'JV_ENTRY', desc: 'Journal voucher entries (double-entry)', icon: BookMarked },
      { name: 'FUND_PAYMENT', desc: 'Fund transfer out', icon: ArrowRightLeft },
      { name: 'FUND_RECEIPT', desc: 'Fund transfer in', icon: ArrowRightLeft },
      { name: 'INSTALLMENT_ENTRY', desc: 'Customer installment management', icon: Receipt },
      { name: 'COLLECTION_PAYMENT_ENTRY', desc: 'Collection entries', icon: ClipboardList },
    ],
  },
  search: {
    title: 'Search & Reference',
    icon: Search,
    color: 'text-sky-600 bg-sky-50',
    forms: [
      { name: 'INCOME_REMINDER', desc: 'Pending income reminders', icon: Bell },
      { name: 'EXPENSE_REMINDER', desc: 'Pending expense reminders', icon: Bell },
      { name: 'JOURNAL_UNION_SEARCH', desc: 'Search journal entries', icon: Search },
      { name: 'PRODUCT_LIST', desc: 'View products with available quantity', icon: Package },
      { name: 'BANKS', desc: 'View bank accounts', icon: Building2 },
      { name: 'CUSTOMERS', desc: 'View customer list', icon: Users },
      { name: 'EMPLOYEES', desc: 'View employee list', icon: UserCog },
      { name: 'OTHER_ACCOUNTS', desc: 'View other accounts', icon: Layers },
      { name: 'INST_CUSTOMER', desc: 'Installment customers', icon: Users },
    ],
  },
  voucher: {
    title: 'Voucher / Report Preview',
    icon: Eye,
    color: 'text-rose-600 bg-rose-50',
    forms: [
      { name: 'INCOME_VOUCHER', desc: 'Income voucher preview', icon: FileText },
      { name: 'EXPENSE_VOUCHER', desc: 'Expense voucher preview', icon: FileText },
      { name: 'EMPLOYEE_PAY', desc: 'Employee payment receipt', icon: FileText },
      { name: 'DAY_BOOK_BTW', desc: 'Day book view', icon: Calendar },
      { name: 'LEDGER_DR', desc: 'Ledger view (debit/credit)', icon: BookOpen },
      { name: 'LEDGER_INC_EXP', desc: 'Income/Expense ledger', icon: BookOpen },
    ],
  },
}

const REPORTS = {
  financial: {
    title: 'Financial Reports',
    icon: BarChart3,
    items: [
      { name: 'DAY_BOOK_BTW', desc: 'Daily transaction book' },
      { name: 'PAYMENTS_BTW', desc: 'Payments during a period' },
      { name: 'RECEIPTS_BTW', desc: 'Receipts during a period' },
      { name: 'TRANS_BTW', desc: 'All transactions during a period' },
      { name: 'EMPLOYEE_ALL_BTW_FINAL', desc: 'Employee payment summary' },
      { name: 'EXPENSE_ALL_BTW_FINAL', desc: 'Expense summary' },
      { name: 'INCOME_ALL_BTW_FINAL', desc: 'Income summary' },
    ],
  },
  accounting: {
    title: 'Accounting Reports',
    icon: Calculator,
    items: [
      { name: 'EMPLOYEE_PAYROLL_REPORT', desc: 'Detailed payroll report' },
      { name: 'TRIAL_BALANCE_PAYABLES', desc: 'Trial balance for payables' },
      { name: 'TRIAL_BALANCE_RECEIVABLES', desc: 'Trial balance for receivables' },
    ],
  },
  project: {
    title: 'Project / Product Reports',
    icon: Package,
    items: [
      { name: 'PROJECT_PAYABLES', desc: 'Project-wise payables' },
      { name: 'PROJECT_RECEIVABLES', desc: 'Project-wise receivables' },
      { name: 'INCOME_ST_BTW_REPORT', desc: 'Business income statement' },
      { name: 'INCOME_ST_PROJECT_BTW_REPORT', desc: 'Project income statement' },
    ],
  },
  specialized: {
    title: 'Specialized Reports',
    icon: Zap,
    items: [
      { name: 'SUPPLIER_PAY_VOUCHER', desc: 'Supplier payment voucher' },
      { name: 'CUSTOMER_IN_OUT_REPORT', desc: 'Customer transactions' },
      { name: 'PRODUCT_QTY_AVAIL_SUM', desc: 'Stock availability summary' },
    ],
  },
}

const RELATIONSHIPS = [
  { from: 'ACCOUNTS.ATYPE', to: 'ACCOUNT_HEADS.ATYPE', desc: 'Account type mapping' },
  { from: 'TRANS.ACCOUNT_ID', to: 'ACCOUNTS.ACCOUNT_ID', desc: 'Transaction account link' },
  { from: 'TRANS.BANK_ID', to: 'ACCOUNTS.ACCOUNT_ID', desc: 'Transaction bank link' },
  { from: 'TRANS.PROJECT_ID', to: 'PRODUCTS.PRODUCT_ID', desc: 'Transaction project link' },
  { from: 'SALARY_ADJUSTMENTS.EMP_ID', to: 'ACCOUNTS.ACCOUNT_ID', desc: 'Salary employee link' },
  { from: 'PRODUCT_AVAILABLE_QTY.PRODUCT_ID', to: 'PRODUCTS.PRODUCT_ID', desc: 'Stock quantity link' },
]

const BUSINESS_LOGIC = [
  {
    title: 'Double-Entry System',
    formula: 'Every transaction has debit & credit sides',
    icon: ArrowLeftRight,
    desc: 'Each financial entry records both a debit and a credit to maintain the accounting equation: Assets = Liabilities + Equity.',
  },
  {
    title: 'Payroll Calculation',
    formula: 'Net Pay = Monthly + Debit - Tax - Leave Deduction + Overtime + Addition - Deduction - Already Paid',
    icon: Calculator,
    desc: 'Comprehensive salary calculation that accounts for base pay, taxes, leave, overtime, and other adjustments.',
  },
  {
    title: 'Daily Rate',
    formula: 'Int(Monthly_Amount / 26)',
    icon: Calendar,
    desc: 'Daily rate used for leave and overtime calculations, based on 26 working days per month.',
  },
  {
    title: 'Balance Calculation',
    formula: 'Sum of (Debit - Credit) per account',
    icon: TrendingUp,
    desc: 'Running balance computed by aggregating all debit and credit transactions for each account.',
  },
  {
    title: 'Stock Tracking',
    formula: 'Available = QTY_IN - QTY_OUT',
    icon: Package,
    desc: 'Real-time inventory tracking through transaction-based quantity in and out records.',
  },
  {
    title: 'Opening Balances',
    formula: 'Stored as "OPEN BALANCE" transaction type',
    icon: BookOpen,
    desc: 'Opening balances are entered as special transactions to establish starting account balances.',
  },
  {
    title: 'Reminder System',
    formula: 'IS_REMIND flag for pending income/expenses',
    icon: Bell,
    desc: 'Flag-based system to track and remind about pending income and expense items.',
  },
]

const CHART_OF_ACCOUNTS = [
  { type: 'BANK', nature: 'Asset', desc: 'Bank accounts', color: 'bg-emerald-100 text-emerald-800' },
  { type: 'ASSET', nature: 'Asset', desc: 'Fixed/Current assets', color: 'bg-teal-100 text-teal-800' },
  { type: 'CAPITAL', nature: 'Capital', desc: "Owner's equity", color: 'bg-amber-100 text-amber-800' },
  { type: 'LIABILITY', nature: 'Liability', desc: 'Business liabilities', color: 'bg-rose-100 text-rose-800' },
  { type: 'RECEIVABLE', nature: 'Asset', desc: 'Amounts to receive', color: 'bg-sky-100 text-sky-800' },
  { type: 'PAYABLE', nature: 'Liability', desc: 'Amounts to pay', color: 'bg-orange-100 text-orange-800' },
  { type: 'INCOME', nature: 'Revenue', desc: 'Income categories', color: 'bg-green-100 text-green-800' },
  { type: 'EXPENSE', nature: 'Expense', desc: 'Expense categories', color: 'bg-red-100 text-red-800' },
  { type: 'EMPLOYEE', nature: 'Asset/Liability', desc: 'Employee accounts', color: 'bg-purple-100 text-purple-800' },
  { type: 'CUSTOMER', nature: 'Asset', desc: 'Customer accounts', color: 'bg-cyan-100 text-cyan-800' },
  { type: 'STOCK', nature: 'Asset', desc: 'Inventory/Stock', color: 'bg-lime-100 text-lime-800' },
]

const IMPLEMENTATION_PLAN = [
  {
    phase: 1,
    title: 'Foundation',
    duration: 'Week 1',
    icon: HardDrive,
    progress: 0,
    color: 'border-amber-300 bg-amber-50',
    items: [
      'Setup Prisma schema with all 9 tables',
      'Create SQLite database with relationships',
      'Build authentication system (login/password)',
      'Create company settings page',
      'Setup responsive layout with sidebar navigation',
    ],
  },
  {
    phase: 2,
    title: 'Core Data Management',
    duration: 'Week 2',
    icon: Database,
    progress: 0,
    color: 'border-emerald-300 bg-emerald-50',
    items: [
      'CRUD for Accounts (all types)',
      'CRUD for Products/Projects',
      'Account Opening Balances',
      'Define Income/Expense/Employee categories',
    ],
  },
  {
    phase: 3,
    title: 'Transaction Engine',
    duration: 'Week 3',
    icon: ArrowLeftRight,
    progress: 0,
    color: 'border-sky-300 bg-sky-50',
    items: [
      'Income Entry with auto voucher',
      'Expense Entry with auto voucher',
      'Payment/Receipt Entry',
      'Journal Voucher (double-entry)',
      'Fund Transfer (Payment/Receipt)',
      'Employee Payment Processing',
      'Installment Management',
    ],
  },
  {
    phase: 4,
    title: 'Reports & Analytics',
    duration: 'Week 4',
    icon: BarChart3,
    progress: 0,
    color: 'border-violet-300 bg-violet-50',
    items: [
      'Day Book (daily transactions)',
      'Ledger (account-wise)',
      'Trial Balance (receivables/payables)',
      'Income Statement (business & project)',
      'Employee Payroll Report',
      'Expense/Income Summary Reports',
      'Project Payables/Receivables',
      'Stock/Inventory Report',
    ],
  },
  {
    phase: 5,
    title: 'Advanced Features',
    duration: 'Week 5',
    icon: Zap,
    progress: 0,
    color: 'border-rose-300 bg-rose-50',
    items: [
      'Dashboard with key metrics',
      'Reminder system (pending income/expenses)',
      'Advanced filtering & search',
      'PDF report generation',
      'Data export (Excel/CSV)',
      'Print-friendly voucher formats',
    ],
  },
]

const FUTURE_FEATURES = [
  { title: 'Multi-Currency Support', desc: 'Handle transactions in multiple currencies', icon: Globe },
  { title: 'Budget Management', desc: 'Set budgets per category and track variance', icon: Target },
  { title: 'Tax Management', desc: 'Automated tax calculations and tax reports', icon: Receipt },
  { title: 'Audit Trail', desc: 'Track all changes with timestamps and user info', icon: ClipboardList },
  { title: 'Multi-User Roles', desc: 'Admin, Accountant, Viewer roles with permissions', icon: Shield },
  { title: 'Recurring Transactions', desc: 'Auto-create monthly recurring entries', icon: Workflow },
  { title: 'Bank Reconciliation', desc: 'Match bank statements with records', icon: Building2 },
  { title: 'Dashboard Analytics', desc: 'Charts, graphs, KPIs, trends', icon: BarChart3 },
  { title: 'Mobile App', desc: 'React Native companion app', icon: Smartphone },
  { title: 'Email Notifications', desc: 'Payment reminders, overdue alerts', icon: Mail },
  { title: 'Document Attachment', desc: 'Attach bills/receipts to transactions', icon: FileArchive },
  { title: 'Backup & Restore', desc: 'Automated database backups', icon: HardDrive },
  { title: 'API Integration', desc: 'Connect with banks, payment gateways', icon: Link2 },
  { title: 'Barcode/QR Support', desc: 'Product scanning for inventory', icon: QrCode },
  { title: 'Dark Mode', desc: 'Theme switching support', icon: Moon },
]

/* ─────────────────────── Helper Components ─────────────────────── */

function SectionHeading({
  title,
  subtitle,
  icon: Icon,
}: {
  title: string
  subtitle?: string
  icon?: React.ElementType
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        {Icon && <Icon className="h-6 w-6 text-amber-600" />}
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{title}</h2>
      </div>
      {subtitle && <p className="text-muted-foreground text-sm ml-9">{subtitle}</p>}
      <Separator className="mt-4" />
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string
  color: string
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function FormCard({
  name,
  desc,
  icon: Icon,
  color,
}: {
  name: string
  desc: string
  icon: React.ElementType
  color: string
}) {
  return (
    <Card className="hover:shadow-md transition-shadow py-0 gap-0">
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`p-2 rounded-md ${color} shrink-0`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight">{name}</p>
          <p className="text-xs text-muted-foreground leading-tight mt-0.5">{desc}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function RelationshipArrow({ from, to, desc }: { from: string; to: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 py-3 px-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <code className="text-xs font-mono font-medium bg-background px-2 py-1 rounded border shrink-0">{from}</code>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      <code className="text-xs font-mono font-medium bg-background px-2 py-1 rounded border shrink-0">{to}</code>
      <span className="text-xs text-muted-foreground ml-auto hidden sm:block">{desc}</span>
    </div>
  )
}

function FutureFeatureCard({
  title,
  desc,
  icon: Icon,
}: {
  title: string
  desc: string
  icon: React.ElementType
}) {
  return (
    <Card className="hover:shadow-md transition-shadow py-0 gap-0 group">
      <CardContent className="p-4 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-amber-50 text-amber-600 shrink-0 group-hover:bg-amber-100 transition-colors">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium leading-tight">{title}</p>
          <p className="text-xs text-muted-foreground leading-tight mt-1">{desc}</p>
        </div>
      </CardContent>
    </Card>
  )
}

/* ─────────────────────── Main Page ─────────────────────── */

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* ─── Hero Section ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-background to-emerald-50/30" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("/hero-report.png")', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="flex flex-col lg:flex-row items-start gap-8 lg:gap-12">
            <div className="flex-1">
              <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs">
                <Database className="h-3 w-3 mr-1" />
                Database Analysis Report
              </Badge>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight">
                Accounting Database
                <span className="block text-amber-600">Comprehensive Analysis</span>
              </h1>
              <p className="mt-4 text-muted-foreground text-base sm:text-lg max-w-2xl leading-relaxed">
                Complete reverse-engineering analysis of a Microsoft Access double-entry accounting system.
                Full schema documentation, business logic extraction, and migration roadmap.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Badge variant="outline" className="px-3 py-1">
                  <HardDrive className="h-3 w-3 mr-1" />
                  {DB_FILE.type}
                </Badge>
                <Badge variant="outline" className="px-3 py-1">
                  <FolderOpen className="h-3 w-3 mr-1" />
                  {DB_FILE.size}
                </Badge>
                <Badge className="bg-amber-600 text-white px-3 py-1">
                  {DB_FILE.complexity} Complexity
                </Badge>
              </div>
            </div>
            <div className="w-full lg:w-80 shrink-0">
              <Card className="border-amber-200 bg-amber-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">File Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Filename</span>
                    <span className="font-mono text-xs">{DB_FILE.name}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Size</span>
                    <span>{DB_FILE.size}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Format</span>
                    <span className="text-xs">.accde</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category</span>
                    <span className="text-xs text-right max-w-[160px]">{DB_FILE.category}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Main Content ─── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12 sm:space-y-16">

        {/* ─── Executive Summary ─── */}
        <section>
          <SectionHeading title="Executive Summary" subtitle="Key metrics at a glance from the database analysis" icon={LayoutDashboard} />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <StatCard icon={Table2} label="User Tables" value="15" color="bg-amber-100 text-amber-700" />
            <StatCard icon={LayoutDashboard} label="UI Forms" value="30+" color="bg-emerald-100 text-emerald-700" />
            <StatCard icon={FileText} label="Reports" value="15+" color="bg-sky-100 text-sky-700" />
            <StatCard icon={Code2} label="SQL Expressions" value="162+" color="bg-violet-100 text-violet-700" />
            <StatCard icon={Search} label="Queries" value="20+" color="bg-rose-100 text-rose-700" />
            <StatCard icon={ArrowLeftRight} label="Account Types" value="11" color="bg-teal-100 text-teal-700" />
          </div>
        </section>

        {/* ─── Database Schema ─── */}
        <section>
          <SectionHeading title="Database Schema" subtitle="All 15 user tables with their fields and relationships" icon={Database} />
          <Tabs defaultValue="accounts" className="w-full">
            <TabsList className="flex flex-wrap h-auto gap-1 p-1 bg-muted/80">
              {TABLES.map((t) => (
                <TabsTrigger key={t.name} value={t.name.toLowerCase()} className="text-xs px-2 sm:px-3">
                  {t.name}
                </TabsTrigger>
              ))}
            </TabsList>
            {TABLES.map((table) => (
              <TabsContent key={table.name} value={table.name.toLowerCase()}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <table.icon className="h-5 w-5 text-amber-600" />
                      <CardTitle className="text-lg">{table.name}</CardTitle>
                    </div>
                    <CardDescription>{table.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="max-h-96">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Field Name</TableHead>
                            <TableHead className="w-20">Type</TableHead>
                            <TableHead className="hidden sm:table-cell">Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {table.fields.map((field, idx) => (
                            <TableRow key={field.name}>
                              <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                              <TableCell className="font-mono text-sm font-medium">{field.name}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    field.type === 'PK'
                                      ? 'default'
                                      : field.type === 'FK'
                                        ? 'secondary'
                                        : field.type === 'Calc'
                                          ? 'outline'
                                          : 'outline'
                                  }
                                  className={`text-xs ${
                                    field.type === 'PK'
                                      ? 'bg-amber-600 text-white'
                                      : field.type === 'FK'
                                        ? 'bg-emerald-600 text-white'
                                        : field.type === 'Calc'
                                          ? 'text-violet-700 border-violet-300'
                                          : ''
                                  }`}
                                >
                                  {field.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm hidden sm:table-cell">{field.desc}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                    {table.accountTypes && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Supported Account Types:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {table.accountTypes.map((at) => (
                            <Badge key={at} variant="outline" className="text-xs">
                              {at}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {table.transTypes && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Transaction Types:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {table.transTypes.map((tt) => (
                            <Badge key={tt} variant="outline" className="text-xs">
                              {tt}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </section>

        {/* ─── Forms & Screens ─── */}
        <section>
          <SectionHeading title="Forms & Screens" subtitle="All 30+ user interface screens organized by category" icon={LayoutDashboard} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(FORMS).map(([key, category]) => (
              <Card key={key}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <category.icon className="h-5 w-5" />
                      <CardTitle className="text-base">{category.title}</CardTitle>
                    </div>
                    <Badge variant="secondary" className="text-xs">{category.forms.length} forms</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-80">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {category.forms.map((form) => (
                        <FormCard
                          key={form.name}
                          name={form.name}
                          desc={form.desc}
                          icon={form.icon}
                          color={category.color}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ─── Reports ─── */}
        <section>
          <SectionHeading title="Reports" subtitle="All 17+ reports categorized by function" icon={FileText} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(REPORTS).map(([key, category]) => (
              <Card key={key}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <category.icon className="h-4 w-4 text-amber-600" />
                    <CardTitle className="text-sm font-semibold">{category.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {category.items.map((item) => (
                      <div key={item.name} className="flex items-start gap-2">
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium font-mono">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="px-6 py-3 border-t">
                  <span className="text-xs text-muted-foreground">{category.items.length} reports</span>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>

        {/* ─── Relationships ─── */}
        <section>
          <SectionHeading title="Key Relationships" subtitle="Foreign key relationships between database tables" icon={Link2} />
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-2">
                {RELATIONSHIPS.map((rel) => (
                  <RelationshipArrow key={rel.from + rel.to} from={rel.from} to={rel.to} desc={rel.desc} />
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ─── Business Logic ─── */}
        <section>
          <SectionHeading title="Business Logic" subtitle="Core calculations, rules, and algorithms powering the system" icon={Calculator} />
          <Accordion type="multiple" className="w-full">
            {BUSINESS_LOGIC.map((logic, idx) => (
              <AccordionItem key={idx} value={`logic-${idx}`}>
                <AccordionTrigger>
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-md bg-amber-50">
                      <logic.icon className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="text-left">
                      <span className="font-medium">{logic.title}</span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="ml-10 space-y-3">
                    <div className="bg-muted/50 rounded-lg p-3 border">
                      <p className="text-xs text-muted-foreground mb-1">Formula / Rule</p>
                      <code className="text-sm font-mono font-medium">{logic.formula}</code>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{logic.desc}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* ─── Chart of Accounts ─── */}
        <section>
          <SectionHeading title="Chart of Accounts" subtitle="Complete account type definitions with debit/credit nature" icon={BookOpen} />
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Account Type</TableHead>
                      <TableHead>Nature</TableHead>
                      <TableHead className="hidden sm:table-cell">Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {CHART_OF_ACCOUNTS.map((acct, idx) => (
                      <TableRow key={acct.type}>
                        <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                        <TableCell>
                          <Badge className={`text-xs border-0 ${acct.color}`}>{acct.type}</Badge>
                        </TableCell>
                        <TableCell className="text-sm font-medium">{acct.nature}</TableCell>
                        <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">{acct.desc}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </section>

        {/* ─── Implementation Plan ─── */}
        <section>
          <SectionHeading title="Implementation Plan" subtitle="Phase-by-phase roadmap for building the Next.js application" icon={Cpu} />
          <div className="space-y-4">
            {IMPLEMENTATION_PLAN.map((phase) => (
              <Card key={phase.phase} className={`border-l-4 ${phase.color}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-background border text-sm font-bold">
                        {phase.phase}
                      </div>
                      <div>
                        <CardTitle className="text-base">{phase.title}</CardTitle>
                        <CardDescription>{phase.duration}</CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {phase.duration}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Progress value={phase.progress} className="mb-3 h-2" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {phase.items.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ─── Future Features ─── */}
        <section>
          <SectionHeading title="Future Feature Ideas" subtitle="Enhancement proposals for the next-generation accounting system" icon={Lightbulb} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FUTURE_FEATURES.map((feature) => (
              <FutureFeatureCard
                key={feature.title}
                title={feature.title}
                desc={feature.desc}
                icon={feature.icon}
              />
            ))}
          </div>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer className="sticky bottom-0 mt-12 border-t bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="h-4 w-4 text-amber-500" />
            <span>Generated by <strong className="text-foreground">Z.ai Code</strong></span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>AccountingProject.accde Analysis</span>
            <Separator orientation="vertical" className="h-3" />
            <span>Full-Featured Double-Entry System</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
