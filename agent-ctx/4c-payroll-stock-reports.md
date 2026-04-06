---
## Task ID: 4c
Agent: Payroll & Stock Reports Developer
Task: Build Payroll Report and Stock Report views with API routes

Work Log:
- Created API: `/src/app/api/reports/payroll-report/route.ts`
  - GET endpoint with query params: month (YYYY-MM, defaults to current), employeeId (optional)
  - Fetches SalaryAdjustment records with employee relation (Account) for given month
  - Calculates per-employee: monthlyAmount, taxAmount, leaveDays, otDays, additionAmt, deductionAmt, netSalary, paid, dueSalary
  - Returns employees array + summary (totalMonthly, totalTax, totalPaid, totalDue, employeeCount)
- Created API: `/src/app/api/reports/stock-report/route.ts`
  - GET endpoint with query params: productId (optional), fromDate, toDate
  - Fetches all active products, optionally filtered by productId
  - Aggregates PurchaseDetail (qtyIn, totalAmount) and SaleDetail (qtyOut, totalAmount) within date range
  - Calculates currentStock = totalQtyIn - totalQtyOut, profitMargin from cost/sale prices
  - Returns products array + summary (totalProducts, totalPurchaseValue, totalSaleValue, totalProfit)
- Created view: `/src/components/views/PayrollReportView.tsx`
  - Title with Receipt icon in amber-100 rounded-lg, subtitle "Employee salary summary"
  - Filters: Month picker (input type=month), Employee Select (from EMPLOYEE accounts), Generate/Reset buttons
  - Auto-generates report on mount with current month
  - Report header: Company name, "PAYROLL REPORT", month/year display
  - Employee table with 10 columns: Employee Name, Monthly (PKR), Tax (PKR), Leave Deduction, OT Addition, Other Additions, Other Deductions, Net Salary (bold), Paid, Due (rose-600 badge if > 0)
  - Summary footer with 5 metrics: Total Monthly, Total Tax, Total Paid, Total Due, Employee Count
  - Empty state with Receipt icon and contextual message
  - Full PayrollReportSkeleton loading state
- Created view: `/src/components/views/StockReportView.tsx`
  - Title with Warehouse icon in amber-100 rounded-lg, subtitle "Product inventory and stock summary"
  - Stock status cards at top: Total Items (amber), Low Stock Items < 10 (orange), Out of Stock = 0 (rose)
  - Filters: Product Select (from active products), From Date, To Date, Generate/Reset buttons
  - Auto-generates report on mount with current month date range
  - Report header: Company name, "STOCK REPORT", date range
  - Products table with 10 columns: Product Name (bold), Unit (outline badge), Cost (PKR), Sale (PKR), Margin %, Qty In (emerald-600), Qty Out (rose-600), Current Stock (bold, color-coded), Purchase Value (PKR), Sale Value (PKR)
  - Low stock indicator: "Low Stock" rose badge when currentStock > 0 and < 10, "Out" badge when = 0
  - Current stock color: amber-600 for low, emerald-600 for healthy, rose-600 for out
  - Summary footer: Total Products, Total Purchase Value, Total Sale Value, Total Profit (color-coded)
  - Empty state with Warehouse icon and contextual message
  - Full StockReportSkeleton loading state
- Updated `/src/app/page.tsx` to route payroll-report and stock-report views

Stage Summary:
- Payroll Report with monthly employee salary breakdown, deductions, due amounts, filterable by month and employee
- Stock Report with product inventory, qty in/out tracking, low stock indicators, filterable by product and date range
- ESLint passes with 0 errors, 0 warnings (only 1 pre-existing warning in ProjectReceivablesView)
- Dev server compiles successfully
