/**
 * ERP Domain Patterns
 * 
 * Enterprise Resource Planning - Manufacturing, Finance, HR, Inventory
 * 
 * @module domain-intelligence/patterns/erp
 */

import { DomainDefinition, TableNamePattern, ColumnNamePattern, FKPattern, WorkflowPattern, SensitiveDataPattern, DomainCategory } from '../base'

// =============================================================================
// TABLE PATTERNS
// =============================================================================

export const ERP_TABLE_PATTERNS: TableNamePattern[] = [
  // Master Data - HR
  { pattern: 'Employee', weight: 8, category: 'master', description: 'Employee master record' },
  { pattern: 'Employees', weight: 9, category: 'master', description: 'Employee master table' },
  { pattern: 'Worker', weight: 7, category: 'master', description: 'Worker/staff master' },
  { pattern: 'Staff', weight: 6, category: 'master', description: 'Staff master' },
  { pattern: 'Contractor', weight: 7, category: 'master', description: 'Contractor master' },
  { pattern: 'Personnel', weight: 6, category: 'master', description: 'Personnel records' },
  { pattern: 'Department', weight: 6, category: 'master', description: 'Department master' },
  { pattern: 'Departments', weight: 7, category: 'master', description: 'Department table' },
  { pattern: 'Division', weight: 5, category: 'master', description: 'Division master' },
  { pattern: 'CostCenter', weight: 7, category: 'master', description: 'Cost center' },
  { pattern: 'ProfitCenter', weight: 7, category: 'master', description: 'Profit center' },
  
  // Master Data - Vendors/Suppliers
  { pattern: 'Vendor', weight: 8, category: 'master', description: 'Vendor master' },
  { pattern: 'Vendors', weight: 9, category: 'master', description: 'Vendor table' },
  { pattern: 'Supplier', weight: 8, category: 'master', description: 'Supplier master' },
  { pattern: 'Suppliers', weight: 9, category: 'master', description: 'Supplier table' },
  { pattern: 'Creditor', weight: 6, category: 'master', description: 'Creditor/AP master' },
  
  // Master Data - Customers
  { pattern: 'Customer', weight: 7, category: 'master', description: 'Customer master' },
  { pattern: 'Customers', weight: 8, category: 'master', description: 'Customer table' },
  { pattern: 'Debtor', weight: 6, category: 'master', description: 'Debtor/AR master' },
  
  // Master Data - Items/Products
  { pattern: 'Item', weight: 7, category: 'master', description: 'Item master' },
  { pattern: 'Items', weight: 8, category: 'master', description: 'Item table' },
  { pattern: 'Material', weight: 7, category: 'master', description: 'Material master' },
  { pattern: 'Materials', weight: 8, category: 'master', description: 'Material table' },
  { pattern: 'Product', weight: 6, category: 'master', description: 'Product master' },
  { pattern: 'Products', weight: 7, category: 'master', description: 'Product table' },
  { pattern: 'Component', weight: 6, category: 'master', description: 'Component master' },
  { pattern: 'RawMaterial', weight: 6, category: 'master', description: 'Raw material' },
  { pattern: 'FinishedGood', weight: 5, category: 'master', description: 'Finished goods' },
  
  // Master Data - Assets
  { pattern: 'Asset', weight: 7, category: 'master', description: 'Fixed asset' },
  { pattern: 'Assets', weight: 8, category: 'master', description: 'Assets table' },
  { pattern: 'FixedAsset', weight: 7, category: 'master', description: 'Fixed asset' },
  { pattern: 'Equipment', weight: 6, category: 'master', description: 'Equipment master' },
  { pattern: 'Resource', weight: 5, category: 'master', description: 'Resource master' },
  
  // Transaction - Purchasing
  { pattern: 'PurchaseOrder', weight: 9, category: 'transaction', description: 'Purchase order' },
  { pattern: 'PurchaseOrders', weight: 10, category: 'transaction', description: 'Purchase orders' },
  { pattern: 'PO', weight: 6, category: 'transaction', description: 'Purchase order' },
  { pattern: 'Requisition', weight: 7, category: 'transaction', description: 'Purchase requisition' },
  { pattern: 'Requisitions', weight: 8, category: 'transaction', description: 'Requisitions' },
  { pattern: 'PurchaseRequest', weight: 6, category: 'transaction', description: 'Purchase request' },
  { pattern: 'GoodsReceipt', weight: 8, category: 'transaction', description: 'Goods receipt (GRN)' },
  { pattern: 'GRN', weight: 7, category: 'transaction', description: 'Goods receipt note' },
  
  // Transaction - Sales
  { pattern: 'SalesOrder', weight: 9, category: 'transaction', description: 'Sales order' },
  { pattern: 'SalesOrders', weight: 10, category: 'transaction', description: 'Sales orders' },
  { pattern: 'SO', weight: 6, category: 'transaction', description: 'Sales order' },
  { pattern: 'GoodsIssue', weight: 7, category: 'transaction', description: 'Goods issue' },
  { pattern: 'Delivery', weight: 6, category: 'transaction', description: 'Delivery note' },
  { pattern: 'Shipment', weight: 6, category: 'transaction', description: 'Shipment' },
  
  // Transaction - Manufacturing
  { pattern: 'WorkOrder', weight: 9, category: 'transaction', description: 'Work order' },
  { pattern: 'WorkOrders', weight: 10, category: 'transaction', description: 'Work orders' },
  { pattern: 'ProductionOrder', weight: 8, category: 'transaction', description: 'Production order' },
  { pattern: 'JobOrder', weight: 7, category: 'transaction', description: 'Job order' },
  { pattern: 'BOM', weight: 8, category: 'master', description: 'Bill of materials' },
  { pattern: 'BillOfMaterial', weight: 9, category: 'master', description: 'Bill of materials' },
  { pattern: 'Routing', weight: 7, category: 'master', description: 'Production routing' },
  { pattern: 'Operation', weight: 6, category: 'master', description: 'Manufacturing operation' },
  { pattern: 'WorkCenter', weight: 7, category: 'master', description: 'Work center' },
  
  // Transaction - Financial
  { pattern: 'Invoice', weight: 8, category: 'transaction', description: 'Invoice' },
  { pattern: 'Invoices', weight: 9, category: 'transaction', description: 'Invoices' },
  { pattern: 'APInvoice', weight: 8, category: 'transaction', description: 'AP invoice' },
  { pattern: 'ARInvoice', weight: 8, category: 'transaction', description: 'AR invoice' },
  { pattern: 'VendorInvoice', weight: 7, category: 'transaction', description: 'Vendor invoice' },
  { pattern: 'CustomerInvoice', weight: 7, category: 'transaction', description: 'Customer invoice' },
  { pattern: 'Journal', weight: 7, category: 'transaction', description: 'Journal entry' },
  { pattern: 'JournalEntry', weight: 8, category: 'transaction', description: 'Journal entry' },
  { pattern: 'JournalEntries', weight: 9, category: 'transaction', description: 'Journal entries' },
  { pattern: 'GL', weight: 6, category: 'master', description: 'General ledger' },
  { pattern: 'GeneralLedger', weight: 8, category: 'master', description: 'General ledger' },
  { pattern: 'Account', weight: 6, category: 'master', description: 'GL account' },
  { pattern: 'GLAccount', weight: 8, category: 'master', description: 'GL account' },
  { pattern: 'Ledger', weight: 6, category: 'master', description: 'Ledger' },
  
  // Transaction - Payments
  { pattern: 'Payment', weight: 7, category: 'transaction', description: 'Payment' },
  { pattern: 'Payments', weight: 8, category: 'transaction', description: 'Payments' },
  { pattern: 'Receipt', weight: 6, category: 'transaction', description: 'Receipt' },
  { pattern: 'Receipts', weight: 7, category: 'transaction', description: 'Receipts' },
  { pattern: 'Disbursement', weight: 6, category: 'transaction', description: 'Disbursement' },
  { pattern: 'Reconciliation', weight: 6, category: 'transaction', description: 'Bank reconciliation' },
  
  // Inventory
  { pattern: 'Inventory', weight: 8, category: 'transaction', description: 'Inventory' },
  { pattern: 'Stock', weight: 7, category: 'transaction', description: 'Stock' },
  { pattern: 'Warehouse', weight: 7, category: 'master', description: 'Warehouse' },
  { pattern: 'Warehouses', weight: 8, category: 'master', description: 'Warehouses' },
  { pattern: 'Bin', weight: 6, category: 'master', description: 'Storage bin' },
  { pattern: 'Bins', weight: 7, category: 'master', description: 'Storage bins' },
  { pattern: 'Location', weight: 5, category: 'master', description: 'Storage location' },
  { pattern: 'Transfer', weight: 6, category: 'transaction', description: 'Stock transfer' },
  { pattern: 'StockTransfer', weight: 7, category: 'transaction', description: 'Stock transfer' },
  { pattern: 'Adjustment', weight: 6, category: 'transaction', description: 'Stock adjustment' },
  { pattern: 'StockAdjustment', weight: 7, category: 'transaction', description: 'Stock adjustment' },
  { pattern: 'Movement', weight: 5, category: 'transaction', description: 'Stock movement' },
  
  // Planning
  { pattern: 'Budget', weight: 7, category: 'master', description: 'Budget' },
  { pattern: 'Budgets', weight: 8, category: 'master', description: 'Budgets' },
  { pattern: 'Forecast', weight: 6, category: 'master', description: 'Forecast' },
  { pattern: 'Forecasts', weight: 7, category: 'master', description: 'Forecasts' },
  { pattern: 'Plan', weight: 4, category: 'master', description: 'Plan' },
  { pattern: 'Actual', weight: 4, category: 'transaction', description: 'Actuals' },
  { pattern: 'MRP', weight: 6, category: 'transaction', description: 'MRP records' },
  
  // HR/Payroll
  { pattern: 'Payroll', weight: 8, category: 'transaction', description: 'Payroll' },
  { pattern: 'Salary', weight: 6, category: 'transaction', description: 'Salary' },
  { pattern: 'PayRun', weight: 6, category: 'transaction', description: 'Pay run' },
  { pattern: 'Benefit', weight: 6, category: 'master', description: 'Employee benefit' },
  { pattern: 'Benefits', weight: 7, category: 'master', description: 'Benefits' },
  { pattern: 'Deduction', weight: 5, category: 'transaction', description: 'Payroll deduction' },
  { pattern: 'Deductions', weight: 6, category: 'transaction', description: 'Deductions' },
  { pattern: 'Attendance', weight: 7, category: 'transaction', description: 'Attendance' },
  { pattern: 'Timesheet', weight: 7, category: 'transaction', description: 'Timesheet' },
  { pattern: 'TimeEntry', weight: 6, category: 'transaction', description: 'Time entry' },
  { pattern: 'Leave', weight: 6, category: 'transaction', description: 'Leave request' },
  { pattern: 'LeaveRequest', weight: 7, category: 'transaction', description: 'Leave request' },
  { pattern: 'Absence', weight: 5, category: 'transaction', description: 'Absence record' },
  { pattern: 'Shift', weight: 5, category: 'master', description: 'Work shift' },
  { pattern: 'Shifts', weight: 6, category: 'master', description: 'Work shifts' },
  { pattern: 'Holiday', weight: 4, category: 'master', description: 'Holiday' },
  
  // Junction tables
  { pattern: 'OrderLine', weight: 7, category: 'junction', description: 'Order line item' },
  { pattern: 'OrderItem', weight: 7, category: 'junction', description: 'Order item' },
  { pattern: 'InvoiceLine', weight: 7, category: 'junction', description: 'Invoice line' },
  { pattern: 'POLine', weight: 7, category: 'junction', description: 'PO line item' },
  { pattern: 'BOMLine', weight: 6, category: 'junction', description: 'BOM component' },
  { pattern: 'BOMComponent', weight: 7, category: 'junction', description: 'BOM component' },
  { pattern: 'WorkCenterEmployee', weight: 5, category: 'junction', description: 'Work center assignment' },
]

// =============================================================================
// COLUMN PATTERNS
// =============================================================================

export const ERP_COLUMN_PATTERNS: ColumnNamePattern[] = [
  // Employee identifiers
  { pattern: 'EmployeeId', weight: 7, semanticType: 'employee_id', description: 'Employee ID' },
  { pattern: 'employee_id', weight: 7, semanticType: 'employee_id', description: 'Employee ID' },
  { pattern: 'EmpId', weight: 6, semanticType: 'employee_id', description: 'Employee ID' },
  { pattern: 'Emp_No', weight: 6, semanticType: 'employee_id', description: 'Employee number' },
  { pattern: 'WorkerId', weight: 6, semanticType: 'employee_id', description: 'Worker ID' },
  { pattern: 'StaffId', weight: 6, semanticType: 'employee_id', description: 'Staff ID' },
  
  // Vendor/Supplier identifiers
  { pattern: 'VendorId', weight: 7, semanticType: 'vendor_id', description: 'Vendor ID' },
  { pattern: 'vendor_id', weight: 7, semanticType: 'vendor_id', description: 'Vendor ID' },
  { pattern: 'SupplierId', weight: 7, semanticType: 'vendor_id', description: 'Supplier ID' },
  { pattern: 'supplier_id', weight: 7, semanticType: 'vendor_id', description: 'Supplier ID' },
  
  // Item/Product identifiers
  { pattern: 'ItemId', weight: 7, semanticType: 'item_id', description: 'Item ID' },
  { pattern: 'item_id', weight: 7, semanticType: 'item_id', description: 'Item ID' },
  { pattern: 'MaterialId', weight: 6, semanticType: 'item_id', description: 'Material ID' },
  { pattern: 'ProductId', weight: 6, semanticType: 'item_id', description: 'Product ID' },
  { pattern: 'SKU', weight: 7, semanticType: 'sku', description: 'Stock keeping unit' },
  { pattern: 'ItemCode', weight: 6, semanticType: 'item_code', description: 'Item code' },
  
  // Order identifiers
  { pattern: 'OrderId', weight: 7, semanticType: 'order_id', description: 'Order ID' },
  { pattern: 'order_id', weight: 7, semanticType: 'order_id', description: 'Order ID' },
  { pattern: 'POId', weight: 7, semanticType: 'po_id', description: 'Purchase order ID' },
  { pattern: 'PONumber', weight: 8, semanticType: 'po_number', description: 'PO number' },
  { pattern: 'po_number', weight: 8, semanticType: 'po_number', description: 'PO number' },
  { pattern: 'SONumber', weight: 7, semanticType: 'so_number', description: 'Sales order number' },
  { pattern: 'WONumber', weight: 7, semanticType: 'wo_number', description: 'Work order number' },
  { pattern: 'GRNNumber', weight: 7, semanticType: 'grn_number', description: 'GRN number' },
  
  // Financial
  { pattern: 'GLAccountId', weight: 7, semanticType: 'gl_account_id', description: 'GL account ID' },
  { pattern: 'AccountId', weight: 6, semanticType: 'account_id', description: 'Account ID' },
  { pattern: 'account_id', weight: 6, semanticType: 'account_id', description: 'Account ID' },
  { pattern: 'Debit', weight: 6, semanticType: 'debit', description: 'Debit amount' },
  { pattern: 'Credit', weight: 6, semanticType: 'credit', description: 'Credit amount' },
  { pattern: 'Balance', weight: 5, semanticType: 'balance', description: 'Balance' },
  { pattern: 'Amount', weight: 4, semanticType: 'amount', description: 'Amount' },
  { pattern: 'TotalAmount', weight: 5, semanticType: 'total', description: 'Total amount' },
  { pattern: 'SubTotal', weight: 4, semanticType: 'subtotal', description: 'Subtotal' },
  { pattern: 'TaxAmount', weight: 4, semanticType: 'tax', description: 'Tax amount' },
  { pattern: 'DiscountAmount', weight: 4, semanticType: 'discount', description: 'Discount' },
  
  // Cost/Pricing
  { pattern: 'UnitCost', weight: 6, semanticType: 'unit_cost', description: 'Unit cost', sensitivity: 'CONFIDENTIAL' },
  { pattern: 'unit_cost', weight: 6, semanticType: 'unit_cost', description: 'Unit cost', sensitivity: 'CONFIDENTIAL' },
  { pattern: 'CostPrice', weight: 6, semanticType: 'cost_price', description: 'Cost price', sensitivity: 'CONFIDENTIAL' },
  { pattern: 'StandardCost', weight: 6, semanticType: 'standard_cost', description: 'Standard cost', sensitivity: 'CONFIDENTIAL' },
  { pattern: 'ActualCost', weight: 5, semanticType: 'actual_cost', description: 'Actual cost', sensitivity: 'CONFIDENTIAL' },
  { pattern: 'SellingPrice', weight: 5, semanticType: 'selling_price', description: 'Selling price' },
  { pattern: 'ListPrice', weight: 5, semanticType: 'list_price', description: 'List price' },
  { pattern: 'Margin', weight: 5, semanticType: 'margin', description: 'Profit margin', sensitivity: 'CONFIDENTIAL' },
  
  // Inventory
  { pattern: 'QtyOnHand', weight: 7, semanticType: 'quantity', description: 'Quantity on hand' },
  { pattern: 'QuantityOnHand', weight: 7, semanticType: 'quantity', description: 'Quantity on hand' },
  { pattern: 'QtyOrdered', weight: 6, semanticType: 'quantity', description: 'Quantity ordered' },
  { pattern: 'QtyReceived', weight: 6, semanticType: 'quantity', description: 'Quantity received' },
  { pattern: 'ReorderPoint', weight: 5, semanticType: 'reorder_point', description: 'Reorder point' },
  { pattern: 'ReorderLevel', weight: 5, semanticType: 'reorder_point', description: 'Reorder level' },
  { pattern: 'SafetyStock', weight: 5, semanticType: 'safety_stock', description: 'Safety stock' },
  { pattern: 'WarehouseId', weight: 6, semanticType: 'warehouse_id', description: 'Warehouse ID' },
  { pattern: 'BinId', weight: 5, semanticType: 'bin_id', description: 'Bin ID' },
  
  // HR/Payroll - Sensitive
  { pattern: 'Salary', weight: 8, semanticType: 'salary', description: 'Salary', sensitivity: 'CONFIDENTIAL' },
  { pattern: 'salary', weight: 8, semanticType: 'salary', description: 'Salary', sensitivity: 'CONFIDENTIAL' },
  { pattern: 'BasicSalary', weight: 7, semanticType: 'salary', description: 'Basic salary', sensitivity: 'CONFIDENTIAL' },
  { pattern: 'GrossSalary', weight: 7, semanticType: 'salary', description: 'Gross salary', sensitivity: 'CONFIDENTIAL' },
  { pattern: 'NetSalary', weight: 7, semanticType: 'salary', description: 'Net salary', sensitivity: 'CONFIDENTIAL' },
  { pattern: 'HourlyRate', weight: 6, semanticType: 'rate', description: 'Hourly rate', sensitivity: 'CONFIDENTIAL' },
  { pattern: 'Wage', weight: 6, semanticType: 'salary', description: 'Wage', sensitivity: 'CONFIDENTIAL' },
  { pattern: 'PayGrade', weight: 5, semanticType: 'pay_grade', description: 'Pay grade', sensitivity: 'CONFIDENTIAL' },
  { pattern: 'Compensation', weight: 6, semanticType: 'compensation', description: 'Compensation', sensitivity: 'CONFIDENTIAL' },
  
  // Banking - Sensitive
  { pattern: 'BankAccount', weight: 8, semanticType: 'bank_account', description: 'Bank account', sensitivity: 'PII' },
  { pattern: 'bank_account', weight: 8, semanticType: 'bank_account', description: 'Bank account', sensitivity: 'PII' },
  { pattern: 'AccountNo', weight: 7, semanticType: 'bank_account', description: 'Account number', sensitivity: 'PII' },
  { pattern: 'IBAN', weight: 8, semanticType: 'iban', description: 'IBAN', sensitivity: 'PII' },
  { pattern: 'RoutingNumber', weight: 7, semanticType: 'routing_number', description: 'Routing number', sensitivity: 'PII' },
  { pattern: 'SwiftCode', weight: 6, semanticType: 'swift_code', description: 'SWIFT code', sensitivity: 'PII' },
  
  // Tax
  { pattern: 'TaxId', weight: 7, semanticType: 'tax_id', description: 'Tax ID', sensitivity: 'PII' },
  { pattern: 'TaxNumber', weight: 7, semanticType: 'tax_id', description: 'Tax number', sensitivity: 'PII' },
  { pattern: 'TIN', weight: 7, semanticType: 'tax_id', description: 'Tax identification number', sensitivity: 'PII' },
  { pattern: 'VATNumber', weight: 6, semanticType: 'vat_number', description: 'VAT number', sensitivity: 'PII' },
  { pattern: 'GSTNumber', weight: 6, semanticType: 'gst_number', description: 'GST number', sensitivity: 'PII' },
  { pattern: 'TaxCode', weight: 5, semanticType: 'tax_code', description: 'Tax code' },
  { pattern: 'TaxRate', weight: 5, semanticType: 'tax_rate', description: 'Tax rate' },
  
  // Dates
  { pattern: 'HireDate', weight: 6, semanticType: 'date', description: 'Hire date' },
  { pattern: 'TerminationDate', weight: 6, semanticType: 'date', description: 'Termination date' },
  { pattern: 'OrderDate', weight: 5, semanticType: 'date', description: 'Order date' },
  { pattern: 'DeliveryDate', weight: 5, semanticType: 'date', description: 'Delivery date' },
  { pattern: 'DueDate', weight: 5, semanticType: 'date', description: 'Due date' },
  { pattern: 'PostingDate', weight: 5, semanticType: 'date', description: 'Posting date' },
  { pattern: 'DocumentDate', weight: 4, semanticType: 'date', description: 'Document date' },
  { pattern: 'Period', weight: 4, semanticType: 'period', description: 'Accounting period' },
  { pattern: 'FiscalYear', weight: 5, semanticType: 'fiscal_year', description: 'Fiscal year' },
  
  // Department
  { pattern: 'DepartmentId', weight: 6, semanticType: 'department_id', description: 'Department ID' },
  { pattern: 'DeptId', weight: 5, semanticType: 'department_id', description: 'Department ID' },
  { pattern: 'department_id', weight: 6, semanticType: 'department_id', description: 'Department ID' },
  { pattern: 'CostCenterId', weight: 6, semanticType: 'cost_center_id', description: 'Cost center ID' },
  
  // Manager/Approvals
  { pattern: 'ManagerId', weight: 5, semanticType: 'manager_id', description: 'Manager ID' },
  { pattern: 'ApproverId', weight: 5, semanticType: 'approver_id', description: 'Approver ID' },
  { pattern: 'ApprovedBy', weight: 5, semanticType: 'approver_id', description: 'Approved by' },
  { pattern: 'ApprovalStatus', weight: 6, semanticType: 'approval_status', description: 'Approval status' },
  { pattern: 'ApprovalDate', weight: 5, semanticType: 'date', description: 'Approval date' },
]

// =============================================================================
// FK PATTERNS
// =============================================================================

export const ERP_FK_PATTERNS: FKPattern[] = [
  { columnPattern: /^EmployeeId$/i, referencesTable: 'Employees', weight: 7, description: 'Reference to employee' },
  { columnPattern: /^EmpId$/i, referencesTable: 'Employees', weight: 6, description: 'Reference to employee' },
  { columnPattern: /^WorkerId$/i, referencesTable: 'Workers', weight: 6, description: 'Reference to worker' },
  { columnPattern: /^StaffId$/i, referencesTable: 'Staff', weight: 5, description: 'Reference to staff' },
  { columnPattern: /^VendorId$/i, referencesTable: 'Vendors', weight: 7, description: 'Reference to vendor' },
  { columnPattern: /^SupplierId$/i, referencesTable: 'Suppliers', weight: 7, description: 'Reference to supplier' },
  { columnPattern: /^CustomerId$/i, referencesTable: 'Customers', weight: 6, description: 'Reference to customer' },
  { columnPattern: /^ItemId$/i, referencesTable: 'Items', weight: 7, description: 'Reference to item' },
  { columnPattern: /^MaterialId$/i, referencesTable: 'Materials', weight: 6, description: 'Reference to material' },
  { columnPattern: /^ProductId$/i, referencesTable: 'Products', weight: 6, description: 'Reference to product' },
  { columnPattern: /^WarehouseId$/i, referencesTable: 'Warehouses', weight: 6, description: 'Reference to warehouse' },
  { columnPattern: /^BinId$/i, referencesTable: 'Bins', weight: 5, description: 'Reference to bin' },
  { columnPattern: /^DepartmentId$/i, referencesTable: 'Departments', weight: 6, description: 'Reference to department' },
  { columnPattern: /^DeptId$/i, referencesTable: 'Departments', weight: 5, description: 'Reference to department' },
  { columnPattern: /^CostCenterId$/i, referencesTable: 'CostCenters', weight: 6, description: 'Reference to cost center' },
  { columnPattern: /^GLAccountId$/i, referencesTable: 'GLAccounts', weight: 7, description: 'Reference to GL account' },
  { columnPattern: /^AccountId$/i, referencesTable: 'Accounts', weight: 5, description: 'Reference to account' },
  { columnPattern: /^ManagerId$/i, referencesTable: 'Employees', weight: 5, description: 'Reference to manager' },
  { columnPattern: /^BOMId$/i, referencesTable: 'BOMs', weight: 6, description: 'Reference to BOM' },
  { columnPattern: /^RoutingId$/i, referencesTable: 'Routings', weight: 5, description: 'Reference to routing' },
  { columnPattern: /^WorkCenterId$/i, referencesTable: 'WorkCenters', weight: 5, description: 'Reference to work center' },
]

// =============================================================================
// WORKFLOW PATTERNS
// =============================================================================

export const ERP_WORKFLOWS: WorkflowPattern[] = [
  {
    name: 'Purchase Order Workflow',
    tableName: /^PurchaseOrder|^PO/i,
    statusColumn: 'Status',
    states: ['Draft', 'Submitted', 'PendingApproval', 'Approved', 'Rejected', 'PartiallyReceived', 'Received', 'Closed', 'Cancelled'],
    weight: 9
  },
  {
    name: 'Sales Order Workflow',
    tableName: /^SalesOrder|^SO/i,
    statusColumn: 'Status',
    states: ['Draft', 'Confirmed', 'InProduction', 'PartiallyShipped', 'Shipped', 'Invoiced', 'Closed', 'Cancelled', 'OnHold'],
    weight: 9
  },
  {
    name: 'Work Order Workflow',
    tableName: /^WorkOrder|^ProductionOrder|^JobOrder/i,
    statusColumn: 'Status',
    states: ['Planned', 'Released', 'InProgress', 'QualityCheck', 'Completed', 'Closed', 'Cancelled'],
    weight: 8
  },
  {
    name: 'Leave Request Workflow',
    tableName: /^LeaveRequest|^Leave|^Absence/i,
    statusColumn: 'Status',
    states: ['Draft', 'Submitted', 'PendingApproval', 'Approved', 'Rejected', 'Cancelled', 'Taken'],
    weight: 7
  },
  {
    name: 'Invoice Workflow',
    tableName: /^Invoice/i,
    statusColumn: 'Status',
    states: ['Draft', 'Submitted', 'PendingApproval', 'Approved', 'Posted', 'Paid', 'PartialPayment', 'Void', 'Cancelled'],
    weight: 8
  },
  {
    name: 'Journal Entry Workflow',
    tableName: /^JournalEntry|^Journal/i,
    statusColumn: 'Status',
    states: ['Draft', 'Submitted', 'PendingApproval', 'Approved', 'Posted', 'Reversed'],
    weight: 7
  },
  {
    name: 'Inventory Adjustment Workflow',
    tableName: /^StockAdjustment|^Adjustment|^InventoryAdjustment/i,
    statusColumn: 'Status',
    states: ['Draft', 'Submitted', 'PendingApproval', 'Approved', 'Adjusted', 'Rejected'],
    weight: 6
  },
  {
    name: 'Expense Report Workflow',
    tableName: /^ExpenseReport|^Expense/i,
    statusColumn: 'Status',
    states: ['Draft', 'Submitted', 'PendingApproval', 'Approved', 'Processing', 'Reimbursed', 'Rejected'],
    weight: 6
  },
]

// =============================================================================
// SENSITIVE DATA PATTERNS
// =============================================================================

export const ERP_SENSITIVE_PATTERNS: SensitiveDataPattern[] = [
  {
    name: 'Salary/Compensation',
    patterns: [
      /\bsalary\b/i,
      /\bcompensation\b/i,
      /\bwage\b/i,
      /\bpay_rate\b/i,
      /\bhourly_rate\b/i,
    ],
    sensitivity: 'CONFIDENTIAL',
    domainWeight: 9,
    description: 'Employee compensation information'
  },
  {
    name: 'Bank Account',
    patterns: [
      /\bbank_account\b/i,
      /\baccount_no\b/i,
      /\bbank_account_no\b/i,
      /\biban\b/i,
      /\bswift_code\b/i,
      /\brouting_number\b/i,
    ],
    sensitivity: 'PII',
    domainWeight: 8,
    description: 'Banking information'
  },
  {
    name: 'Tax Identification',
    patterns: [
      /\btax_id\b/i,
      /\btin\b/i,
      /\bvat_number\b/i,
      /\bgst_number\b/i,
      /\btax_identification\b/i,
    ],
    sensitivity: 'PII',
    domainWeight: 7,
    description: 'Tax identification numbers'
  },
  {
    name: 'Cost Information',
    patterns: [
      /\bcost_price\b/i,
      /\bunit_cost\b/i,
      /\bstandard_cost\b/i,
      /\bactual_cost\b/i,
      /\blanding_cost\b/i,
      /\bcogs\b/i,
    ],
    sensitivity: 'CONFIDENTIAL',
    domainWeight: 6,
    description: 'Cost and pricing information'
  },
  {
    name: 'Margin/Profit',
    patterns: [
      /\bprofit_margin\b/i,
      /\bmargin\b/i,
      /\bmarkup\b/i,
      /\bgross_profit\b/i,
    ],
    sensitivity: 'CONFIDENTIAL',
    domainWeight: 5,
    description: 'Profit and margin information'
  },
]

// =============================================================================
// TABLE CATEGORIES
// =============================================================================

export const ERP_TABLE_CATEGORIES: Record<DomainCategory, string[]> = {
  master: ['Employees', 'Vendors', 'Suppliers', 'Customers', 'Items', 'Materials', 'Products', 'Assets', 'Departments', 'Warehouses', 'GLAccounts', 'WorkCenters'],
  transaction: ['PurchaseOrders', 'SalesOrders', 'WorkOrders', 'Invoices', 'Payments', 'JournalEntries', 'GoodsReceipt', 'GoodsIssue', 'StockAdjustments', 'Timesheets'],
  lookup: ['UnitsOfMeasure', 'Currencies', 'PaymentTerms', 'ItemCategories', 'TaxCodes', 'Locations', 'ProjectCodes'],
  audit: ['AuditLog', 'ChangeLog', 'TransactionHistory', 'ApprovalHistory'],
  config: ['CompanySettings', 'NumberingSeries', 'WorkflowConfig', 'ApprovalRules'],
  workflow: ['ApprovalRequests', 'WorkflowInstances', 'WorkflowSteps'],
  reporting: ['FinancialReports', 'InventoryReports', 'SalesReports', 'HRReports'],
  junction: [],
    integration: ['ExternalSystemSync', 'EDIMessages', 'APIIntegrations']
}

// =============================================================================
// DOMAIN DEFINITION
// =============================================================================

export const ERP_DOMAIN: DomainDefinition = {
  domain: 'erp',
  displayName: 'ERP / Enterprise Resource Planning',
  description: 'Enterprise Resource Planning systems covering Manufacturing, Finance, HR, Inventory, Procurement, and Supply Chain Management',
  industries: [
    'Manufacturing',
    'Distribution & Wholesale',
    'Retail Chains',
    'Construction',
    'Professional Services',
    'Healthcare Operations',
    'Government',
    'Non-Profit Organizations'
  ],
  
  tablePatterns: ERP_TABLE_PATTERNS,
  columnPatterns: ERP_COLUMN_PATTERNS,
  fkPatterns: ERP_FK_PATTERNS,
  workflows: ERP_WORKFLOWS,
  sensitivePatterns: ERP_SENSITIVE_PATTERNS,
  
  tableCategories: ERP_TABLE_CATEGORIES,
  
  keywords: [
    'purchase', 'sales', 'order', 'invoice', 'payment', 'receipt',
    'inventory', 'stock', 'warehouse', 'goods', 'receipt', 'issue',
    'employee', 'payroll', 'salary', 'attendance', 'leave', 'shift',
    'budget', 'forecast', 'journal', 'ledger', 'account', 'posting',
    'bom', 'routing', 'work', 'production', 'manufacturing',
    'vendor', 'supplier', 'customer', 'creditor', 'debtor',
    'cost', 'price', 'margin', 'discount', 'tax',
    'approval', 'workflow', 'requisition', 'request',
    'gl', 'ap', 'ar', 'mrp', 'po', 'so', 'wo', 'grn'
  ],
  
  specificity: 8  // ERP has very specific patterns
}
