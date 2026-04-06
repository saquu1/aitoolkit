# Task ID: 5-b — Purchase Entry View Developer

## Work Task
Build the PurchaseEntryView frontend component for recording purchases from suppliers in a Next.js retail accounting app.

## Work Summary

### File Created: `/src/components/views/PurchaseEntryView.tsx`
Full-featured purchase entry form with multi-line items, following blue color scheme as specified.

**Header:** Truck icon in blue-100 rounded-lg, title "Purchase Entry", subtitle "Record purchases from suppliers"

**Form Card (border-blue-200):**
- Date input (required, default today, CalendarDays icon)
- Supplier Account select (required, from SUPPLIER accounts via `/api/accounts?atype=SUPPLIER&isActive=true`, UserCircle icon)
- Bank/Cash Account select (required, from BANK accounts via `/api/accounts?atype=BANK&isActive=true`, Landmark icon)
- Reference No (optional, Hash icon)
- Discount Received PKR (optional, number input, right-aligned tabular-nums)
- GST % (optional, number input with Percent icon, 0-100 range)
- Comments (optional, Textarea with MessageSquare icon)

**Line Items Table:**
- Dynamic add/remove rows (min 1, max unlimited)
- Per row: Product select (from `/api/products?isActive=true`, shows unit badge), Qty input, Cost Price input (auto-filled from product selection, editable), Total (=qty×costPrice, auto-calculated), Line Comments (hidden on smaller screens), Remove button (hover reveal)
- Line IDs via `createLineId()` (timestamp + counter) for React keys
- Product selection auto-populates costPrice from product data
- Scrollable container (max-h-[360px]) with custom scrollbar

**Summary Panel (blue-50 card, right-aligned):**
- Total Cost (sum of all line totals)
- Discount (conditional, emerald-600 text)
- GST Amount (conditional, amber-600 text, = totalCost × gst%)
- Grand Total (= totalCost - discount + gstAmount, blue-600, bold)
- All values reactively recalculated via useMemo

**Action Buttons:** Save (blue-500 primary), Save & New (blue outline, keeps supplier+bank), Reset (ghost)

**Save Logic (POST /api/purchases):**
- Validates: date required, supplier required, bank required, at least one valid product line, no duplicate products
- Sends body: `{ transDate, accountId, bankId, discountReceive, gst, comments, refNo, details: [{ productId, qtyIn, costPrice, totalAmount }] }`
- Backend creates Trans (debit) + PurchaseDetail records + bank Trans (credit) atomically
- Toast success/error notifications

**Recent Purchases Table (max-h-96, custom scrollbar):**
- Columns: Date (formatted dd MMM yyyy), Ref No (font-mono), Supplier (font-medium), Bank (hidden on mobile, Landmark icon), Items count (hidden on lg-), Total Cost (blue-600, PKR formatted), Actions (delete with hover reveal)
- Fetches from GET /api/purchases
- Empty state: Truck icon in blue-50 circle, "No purchases yet" message

**Delete Flow:** AlertDialog confirmation, calls DELETE /api/purchases?id=<id>

**Loading:** Full PurchaseEntrySkeleton with form fields, line items grid, summary, and table row placeholders

**Design:**
- Blue color scheme throughout (bg-blue-100, text-blue-600, border-blue-200, blue-500/600 buttons)
- Info bar explaining double-entry logic (blue-50 bg, blue-100 border)
- PKR currency formatting via Intl.NumberFormat
- date-fns for date formatting
- Sonner toast notifications
- Custom scrollbar styling (6px, rounded)
- Responsive: 3-col grid on lg, 2-col on md, 1-col on mobile

### File Updated: `/src/app/page.tsx`
- Added import for PurchaseEntryView
- Added switch case `'purchase-entry': return <PurchaseEntryView />` in MainContent

### Validation
- ESLint passes with 0 errors, 0 warnings
- Dev server compiles successfully (200 status)

### shadcn/ui Components Used
Card, CardContent, Badge, Button, Input, Label, Select (Trigger/Content/Item/Value), Separator, Skeleton, Table (Header/Body/Row/Head/Cell), Textarea, AlertDialog (Action/Cancel/Content/Description/Footer/Header/Title)

### APIs Used
- GET /api/accounts?atype=SUPPLIER&isActive=true
- GET /api/accounts?atype=BANK&isActive=true
- GET /api/products?isActive=true
- POST /api/purchases
- GET /api/purchases
- DELETE /api/purchases?id=X
