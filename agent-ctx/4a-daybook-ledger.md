---
Task ID: 4a - Day Book + Ledger Reports Developer
### Work Task
Build Day Book and Ledger report views with API routes

### Work Log
- Created API route: /src/app/api/reports/day-book/route.ts (GET with fromDate, toDate, search, page, limit; groups transactions by date; computes daily subtotals and overall summary)
- Created API route: /src/app/api/reports/ledger/route.ts (GET with accountId, fromDate, toDate, page, limit; computes running balance from opening balance + prior transactions + cumulative)
- Created view: /src/components/views/DayBookView.tsx (date-grouped collapsible transactions, filters bar with debounced search, daily/overall totals, balance check, pagination, skeleton loading)
- Created view: /src/components/views/LedgerView.tsx (account selector with type badges, date filters, account info card with opening balance/nature, running balance table, closing balance summary, pagination, skeleton loading)
- Updated /src/app/page.tsx to wire day-book and ledger views into MainContent switch

### Stage Summary
- Day Book report: date-grouped transactions with collapsible sections, daily Dr/Cr totals, overall summary with balanced check, search, date filters, pagination
- Ledger report: account selector with type badges, running balance computation, opening/closing balance, prior period handling, particular column logic
- Both views follow established design patterns: PKR currency, date-fns, sonner toasts, skeleton loaders, warm color palette, responsive design
- ESLint: 0 errors (2 pre-existing unrelated warnings), dev server compiles successfully (200 status)

