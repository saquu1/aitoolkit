# Task 5c - Employee & Installment Views Developer

## Work Task
Build Employee Payment and Installment entry views with APIs for AccuBooks accounting application.

## Work Log

### APIs Created

#### 1. `/src/app/api/reports/employee-adjustment/route.ts`
- **GET endpoint**: Fetches salary adjustment data for a specific employee and month
- Query params: `employeeId` (required), `month` (required, format "YYYY-MM")
- Returns: `{ success: true, data: { adjustment: SalaryAdjustment | null } }`
- Includes employee relation (id, aname, atype, isActive)

#### 2. `/src/app/api/salary-adjustment/route.ts`
- **PUT endpoint**: Updates the `paid` field for a given employeeId + month combination
- Body: `{ employeeId, month, paid }`
- Finds existing SalaryAdjustment record, updates paid amount
- Returns 404 if no matching adjustment found

#### 3. `/src/app/api/installments/route.ts`
- **GET**: Lists all installments with customer and transaction relations, ordered by createdAt desc
- **POST**: Creates new installment plan + associated journal transaction
  - Validates required fields: customerId, totalAmount, emiAmount, totalEmis, emiStartDate, bankId
  - Creates journal: debit customer (receivable) + credit income account
  - Creates Installment record linked to the debit transaction
- **PUT**: Records an EMI payment for an installment
  - Validates: installment exists, not completed, is active
  - Creates RECEIPT transaction: debit bank + credit customer
  - Increments paidEmis, marks inactive when all EMIs paid

### Views Created

#### 4. `/src/components/views/EmployeePaymentView.tsx`
- **Title**: "Employee Payment" with UserCheck icon in purple-100 rounded-lg
- **Subtitle**: "Process employee salary payments"
- **Form fields** (2-col grid):
  - Date (required, default today, CalendarDays icon)
  - Employee (required, Select from EMPLOYEE accounts only, Users icon)
  - Month (required, input type="month", format "YYYY-MM", default current month)
  - Amount PKR (required, number Input, right-aligned tabular-nums, "Auto" badge when pre-filled)
  - Paid From Bank (required, Select from BANK accounts, Landmark icon)
  - Reference No (optional Input)
  - Comments (optional Textarea, full-width)
- **Auto-populate**: When employee + month are set, fetches SalaryAdjustment via `/api/reports/employee-adjustment` and pre-fills amount with monthlyAmount
- **Double-entry logic**:
  1. Debit: accountId=employeeId, bankId=bankId, debit=amount, credit=0, transType=EMPLOYEE
  2. Credit: accountId=bankId, debit=0, credit=amount, transType=EMPLOYEE
  - Also updates SalaryAdjustment.paid via PUT /api/salary-adjustment (non-blocking)
- **Recent Payments table**: Fetches last 20 EMPLOYEE transactions, pairs debit+credit entries, shows: Date, Employee Name, Amount (purple-600), Bank (hidden on mobile), Month (extracted from comments), Actions (delete)
- **Action buttons**: Save (purple-600), Save & New (purple outline), Reset (ghost)
- **Empty state**: UserCheck icon, "No employee payments yet"
- **Skeleton**: EmployeePaymentSkeleton
- **Double-entry indicator**: Landmark icon + purple info bar explaining debit/credit

#### 5. `/src/components/views/InstallmentEntryView.tsx`
- **Title**: "Installments" with Repeat icon in orange-100 rounded-lg
- **Subtitle**: "Manage customer installment plans"
- **Form section** — "New Installment Plan" (orange accent):
  - Customer (required, Select from RECEIVABLE + CUSTOMER accounts with type badges)
  - Total Amount PKR (required, number Input)
  - EMI Amount PKR (required, number Input)
  - Total EMIs (required, number Input)
  - Start Date (required, input type="date", CalendarDays icon)
  - Bank Account (required, Select from BANK accounts, Landmark icon)
  - Reference / Invoice No (optional)
  - Comments (optional Textarea)
- **Save creates**: Journal transaction (debit customer receivable, credit income) + Installment record
- **Active Installments table**: All installments with columns: Customer, Total, EMI (hidden md), EMIs count (hidden lg), Progress bar (hidden md), Outstanding, Start Date (hidden sm), Status, Actions
  - Progress bar: shadcn Progress component with percentage label
  - Status badges: Active (orange) / Completed (emerald)
  - Outstanding column: orange-600 when active, muted when completed
  - Total outstanding summary in header
- **EMI Payment Dialog**: shadcn Dialog with payment summary card (customer, EMI amount, next EMI number, outstanding after payment), bank selection, Record Payment button
- **Empty state**: Repeat icon, "No installment plans yet"
- **Skeleton**: InstallmentSkeleton
- **Info bar**: CreditCard icon + explanation of journal entry logic

### Wiring

#### 6. Updated `/src/app/page.tsx`
- Added imports: EmployeePaymentView, InstallmentEntryView
- Added switch cases: 'employee-entry' → EmployeePaymentView, 'installment-entry' → InstallmentEntryView

## Stage Summary
- Employee Payment: auto-populate from salary adjustments, double-entry EMPLOYEE transactions, paired recent payments table, purple accent theme
- Installments: plan creation with journal entry, progress bar tracking, EMI payment dialog, completion detection, total outstanding summary, orange accent theme
- ESLint passes with 0 errors, dev server compiles successfully
- 5 files created, 1 file updated
