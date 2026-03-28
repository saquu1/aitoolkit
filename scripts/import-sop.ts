// =============================================================================
// Import SOP Document to SOP Bank
// =============================================================================
// This script parses the sop.md file and imports the SOP rules to the database
// =============================================================================

import { db } from '../src/lib/db'
import fs from 'fs'
import path from 'path'

// SOP Rules extracted from the document
const SOP_RULES_FROM_DOCUMENT = [
  // Alignment Rules
  {
    sopId: 'SOP-DOC-ACTION-CENTER',
    name: 'Action Column Center Alignment',
    description: 'All Buttons in "Action" Column of Data Table should be Centrally Aligned',
    category: 'alignment',
    priority: 80,
    appliesTo: 'grid_columns',
    condition: { columnType: 'action' },
    expectedValue: 'text-align: center',
    autoFixAction: { addClass: 'text-center' },
    sourceDocument: 'sop.md',
  },
  {
    sopId: 'SOP-DOC-STATUS-CENTER',
    name: 'Status Column Center Alignment',
    description: 'All "Active/Inactive" heading in DataTable Columns should be Replaced with "Status" and Centrally Aligned',
    category: 'alignment',
    priority: 75,
    appliesTo: 'grid_columns',
    condition: { columnName: 'status' },
    expectedValue: 'Status heading, center aligned',
    autoFixAction: { addClass: 'text-center' },
    sourceDocument: 'sop.md',
  },
  {
    sopId: 'SOP-DOC-SYMBOLS-CENTER',
    name: 'Symbol Data Center Alignment',
    description: 'The Data in Columns of DataTable that contain "Symbols data" should be Centrally Aligned in all direction',
    category: 'alignment',
    priority: 70,
    appliesTo: 'grid_columns',
    condition: { columnType: 'symbol' },
    expectedValue: 'text-align: center',
    autoFixAction: { addClass: 'text-center' },
    sourceDocument: 'sop.md',
  },
  {
    sopId: 'SOP-DOC-NUMERIC-CENTER',
    name: 'Numeric Data Center Alignment',
    description: 'The data in Columns of DataTable that contain "Numeric Data" should be Centrally Aligned',
    category: 'alignment',
    priority: 70,
    appliesTo: 'grid_columns',
    condition: { columnType: 'numeric' },
    expectedValue: 'text-align: center',
    autoFixAction: { addClass: 'text-center' },
    sourceDocument: 'sop.md',
  },
  {
    sopId: 'SOP-DOC-TEXT-LEFT',
    name: 'Text Data Left Alignment',
    description: 'The Data in Columns of DataTable that contain "Text Data" should be Left Aligned',
    category: 'alignment',
    priority: 70,
    appliesTo: 'grid_columns',
    condition: { columnType: 'text' },
    expectedValue: 'text-align: left',
    autoFixAction: { addClass: 'text-left' },
    sourceDocument: 'sop.md',
  },
  
  // Sorting Rules
  {
    sopId: 'SOP-DOC-SORT-COLUMNS',
    name: 'DataTable Column Sorting',
    description: 'All DataTable Columns should contain Ascending/Descending Sorting',
    category: 'ux',
    priority: 65,
    appliesTo: 'grid_columns',
    condition: {},
    expectedValue: 'sortable: true',
    autoFixAction: { setProperty: { 'columnConfig.sortable': true } },
    sourceDocument: 'sop.md',
  },
  
  // Search Rules
  {
    sopId: 'SOP-DOC-SEARCH-CNIC-MR',
    name: 'CNIC and MR Search',
    description: 'All DataTables columns that contain CNIC and MR. It should be allowed searching for both CNIC, MR No, Visit No, Admission No, Lab and Procedure No.',
    category: 'ux',
    priority: 75,
    appliesTo: 'grid_columns',
    condition: { columnName: { in: ['cnic', 'mr_no', 'mr', 'mrno'] } },
    expectedValue: 'searchable: true',
    autoFixAction: { setProperty: { 'columnConfig.searchable': true } },
    sourceDocument: 'sop.md',
  },
  
  // Form Rules
  {
    sopId: 'SOP-DOC-ADD-HEADING',
    name: 'Add Form Heading',
    description: 'All pages Add New content should contain "Add" with module in Heading',
    category: 'forms',
    priority: 60,
    appliesTo: 'all_fields',
    condition: { formType: 'create' },
    expectedValue: 'Heading contains "Add [Module Name]"',
    autoFixAction: null,
    sourceDocument: 'sop.md',
  },
  {
    sopId: 'SOP-DOC-EDIT-HEADING',
    name: 'Edit Form Heading',
    description: 'All pages Edit content should contain "Edit" with module in Heading',
    category: 'forms',
    priority: 60,
    appliesTo: 'all_fields',
    condition: { formType: 'edit' },
    expectedValue: 'Heading contains "Edit [Module Name]"',
    autoFixAction: null,
    sourceDocument: 'sop.md',
  },
  
  // Price Formatting
  {
    sopId: 'SOP-DOC-PRICE-FORMAT',
    name: 'Numeric Prices Formatting',
    description: 'All pages containing "Numeric Prices" should be separated by comas with 2 decimal points also all columns containing Amount/Prices should be Right Align with 3 digits',
    category: 'typography',
    priority: 70,
    appliesTo: 'all_fields',
    condition: { semanticType: 'price' },
    expectedValue: 'Format: 000,000,000.00, right aligned',
    autoFixAction: { addClass: 'text-right' },
    sourceDocument: 'sop.md',
  },
  
  // Timestamp Rules
  {
    sopId: 'SOP-DOC-TIMESTAMP',
    name: 'Timestamp Fields',
    description: 'Modified On, Created On, Modified by, Created by should be present. Timestamp locking (Server side)',
    category: 'audit',
    priority: 85,
    appliesTo: 'all_fields',
    condition: { isFormLevel: true },
    expectedValue: 'createdAt, updatedAt, createdBy, updatedBy fields present',
    autoFixAction: null,
    sourceDocument: 'sop.md',
  },
  
  // Typography Rules
  {
    sopId: 'SOP-DOC-FONT-SIZE',
    name: 'Font Size & Color',
    description: 'Font Size in Bold 13 and normal 12, color should be Black',
    category: 'typography',
    priority: 50,
    appliesTo: 'all_fields',
    condition: {},
    expectedValue: 'Font: Bold 13 / Normal 12, Color: Black',
    autoFixAction: null,
    sourceDocument: 'sop.md',
  },
  {
    sopId: 'SOP-DOC-LINE-SPACING',
    name: 'Line Spacing',
    description: 'Spacing should be 1 or 1.15 Size between two lines in whole system',
    category: 'typography',
    priority: 45,
    appliesTo: 'all_fields',
    condition: {},
    expectedValue: 'Line height: 1 or 1.15',
    autoFixAction: null,
    sourceDocument: 'sop.md',
  },
  
  // UX Rules
  {
    sopId: 'SOP-DOC-SCROLL-BUTTON',
    name: 'Scrolling Button Position',
    description: 'Scrolling button should be Left Bottom in whole system',
    category: 'ux',
    priority: 40,
    appliesTo: 'all_fields',
    condition: {},
    expectedValue: 'Scroll button: left bottom',
    autoFixAction: null,
    sourceDocument: 'sop.md',
  },
  {
    sopId: 'SOP-DOC-TAB-SELECTION',
    name: 'Tab Selection Highlight',
    description: 'Selected Tabs in Header should be BOLD and Highlighted, horizontal scroll if tab more than one page',
    category: 'ux',
    priority: 60,
    appliesTo: 'all_fields',
    condition: {},
    expectedValue: 'Selected tab: bold, highlighted',
    autoFixAction: null,
    sourceDocument: 'sop.md',
  },
  {
    sopId: 'SOP-DOC-NO-DATA-PRINT',
    name: 'No Zero Data Printing',
    description: 'No or 0 data input fields/columns should NOT be showing in the Print',
    category: 'reports',
    priority: 70,
    appliesTo: 'all_fields',
    condition: {},
    expectedValue: 'Hide empty/zero values in print',
    autoFixAction: null,
    sourceDocument: 'sop.md',
  },
  
  // Compatibility Rules
  {
    sopId: 'SOP-DOC-BROWSER-COMPAT',
    name: 'Browser Compatibility',
    description: 'Compatibility for all Browsers (Chrome, Microsoft Edge, Safari, Firefox)',
    category: 'compatibility',
    priority: 75,
    appliesTo: 'all_fields',
    condition: {},
    expectedValue: 'Works in Chrome, Edge, Safari, Firefox',
    autoFixAction: null,
    sourceDocument: 'sop.md',
  },
  {
    sopId: 'SOP-DOC-RESPONSIVE',
    name: 'Page Responsiveness',
    description: 'There should be responsiveness of pages, (layout design)',
    category: 'ux',
    priority: 80,
    appliesTo: 'all_fields',
    condition: {},
    expectedValue: 'Responsive layout',
    autoFixAction: null,
    sourceDocument: 'sop.md',
  },
  
  // Data Order Rules
  {
    sopId: 'SOP-DOC-ASCENDING-ORDER',
    name: 'Data Ascending Order',
    description: 'New Edit/Updated data in data table modified by ascending order',
    category: 'ux',
    priority: 55,
    appliesTo: 'grid_columns',
    condition: {},
    expectedValue: 'Recent data first',
    autoFixAction: null,
    sourceDocument: 'sop.md',
  },
  {
    sopId: 'SOP-DOC-MEDICINE-ORDER',
    name: 'Medicines Data Order',
    description: 'Medicines layout/priority should be the same as when order in eRx/Pharmacy/Challan/anywhere showing as output',
    category: 'ux',
    priority: 60,
    appliesTo: 'all_fields',
    condition: {},
    expectedValue: 'Consistent order across all views',
    autoFixAction: null,
    sourceDocument: 'sop.md',
  },
  
  // Input Field Rules
  {
    sopId: 'SOP-DOC-TAB-NAVIGATION',
    name: 'Tab Button Navigation',
    description: 'There should be input data field focus, highlighted and cursor should also move with Tab Button',
    category: 'forms',
    priority: 70,
    appliesTo: 'all_fields',
    condition: { inForm: true },
    expectedValue: 'Tab navigation works',
    autoFixAction: null,
    sourceDocument: 'sop.md',
  },
  {
    sopId: 'SOP-DOC-ENTER-BUTTON',
    name: 'Enter Button Functionality',
    description: 'Enter button should be working on every Search field, Submit button and Update Button after focusing with tab button',
    category: 'forms',
    priority: 75,
    appliesTo: 'all_fields',
    condition: { inForm: true },
    expectedValue: 'Enter key submits form',
    autoFixAction: null,
    sourceDocument: 'sop.md',
  },
  {
    sopId: 'SOP-DOC-AUTOFOCUS',
    name: 'Form Autofocus',
    description: 'First element of the form should be autofocused on the page load and reload',
    category: 'forms',
    priority: 65,
    appliesTo: 'all_fields',
    condition: { inForm: true, isFirstField: true },
    expectedValue: 'autofocus on first input',
    autoFixAction: { setAttribute: { autofocus: true } },
    sourceDocument: 'sop.md',
  },
  {
    sopId: 'SOP-DOC-DOUBLE-CLICK',
    name: 'Double Click Prevention',
    description: 'Verify all the button (Submit, Update, Edit etc.) by adding double click checking to prevent duplicate submissions',
    category: 'forms',
    priority: 90,
    appliesTo: 'all_fields',
    condition: { isButton: true },
    expectedValue: 'Button disabled after first click',
    autoFixAction: null,
    sourceDocument: 'sop.md',
  },
  
  // Report Rules
  {
    sopId: 'SOP-DOC-REPORT-ALIGN',
    name: 'Report Header Footer Alignment',
    description: 'Header and Footer Data should be Centrally Aligned',
    category: 'reports',
    priority: 60,
    appliesTo: 'all_fields',
    condition: { inReport: true },
    expectedValue: 'text-align: center for header/footer',
    autoFixAction: { addClass: 'text-center' },
    sourceDocument: 'sop.md',
  },
  
  // Configuration Rules
  {
    sopId: 'SOP-DOC-HIDE-UNIMPLEMENTED',
    name: 'Hide Unimplemented Configuration',
    description: 'Non implemented configurations should not show up anywhere in the software',
    category: 'ux',
    priority: 85,
    appliesTo: 'all_fields',
    condition: {},
    expectedValue: 'Hide unimplemented features',
    autoFixAction: null,
    sourceDocument: 'sop.md',
  },
  
  // Naming Convention
  {
    sopId: 'SOP-DOC-RECEIPT-WORD',
    name: 'Use Receipt Instead of Challan',
    description: 'Replace "Challan" to "Receipt" in whole software and from onward only "Receipt" word will be use',
    category: 'naming',
    priority: 50,
    appliesTo: 'all_fields',
    condition: {},
    expectedValue: 'Use "Receipt" instead of "Challan"',
    autoFixAction: null,
    sourceDocument: 'sop.md',
  },
  
  // State/Province
  {
    sopId: 'SOP-DOC-STATE-PROVINCE',
    name: 'State vs Province Display',
    description: 'Province should be shown only for Pakistan and for all the other countries there should be State',
    category: 'forms',
    priority: 55,
    appliesTo: 'all_fields',
    condition: { fieldName: { in: ['state', 'province'] } },
    expectedValue: 'Pakistan: Province, Others: State',
    autoFixAction: null,
    sourceDocument: 'sop.md',
  },
  
  // Security Rules
  {
    sopId: 'SOP-DOC-PASSWORD-EYE',
    name: 'Password Eye Icon',
    description: 'Every Password field should have hide and unhide icon in all of HIMS',
    category: 'security',
    priority: 85,
    appliesTo: 'all_fields',
    condition: { semanticType: 'password' },
    expectedValue: 'Password visibility toggle present',
    autoFixAction: null,
    sourceDocument: 'sop.md',
  },
  
  // Date Format
  {
    sopId: 'SOP-DOC-DATE-FORMAT',
    name: 'Standard Date Format',
    description: 'Date format for all of the HIMS should be showing in all the places of data table and on Reports will be like Nov 08, 2023',
    category: 'typography',
    priority: 70,
    appliesTo: 'date_fields',
    condition: {},
    expectedValue: 'Format: MMM DD, YYYY (e.g., Nov 08, 2023)',
    autoFixAction: { setProperty: { 'dateConfig.format': 'MMM DD, YYYY' } },
    sourceDocument: 'sop.md',
  },
  
  // Data Table Spacing
  {
    sopId: 'SOP-DOC-DATATABLE-SPACING',
    name: 'DataTable Column Spacing',
    description: 'There should be 3 Character space in all the data table columns which has specific data such as Action Columns, Status, National ID, Phone Number, MR No.',
    category: 'ux',
    priority: 50,
    appliesTo: 'grid_columns',
    condition: {},
    expectedValue: 'Min 3 char width for specific columns',
    autoFixAction: null,
    sourceDocument: 'sop.md',
  },
  
  // Database Rules
  {
    sopId: 'SOP-DOC-BASEMODEL',
    name: 'Table Inherit BaseModel',
    description: 'Every New Table should inherit with basemodel and there should be BranchId column foreign key in table',
    category: 'database',
    priority: 90,
    appliesTo: 'all_fields',
    condition: {},
    expectedValue: 'BaseModel fields + BranchId FK',
    autoFixAction: null,
    sourceDocument: 'sop.md',
  },
  {
    sopId: 'SOP-DOC-NULL-HANDLING',
    name: 'Null Value Handling',
    description: 'Null Handling even value can not be null, should be there',
    category: 'database',
    priority: 85,
    appliesTo: 'all_fields',
    condition: {},
    expectedValue: 'Proper null handling/defaults',
    autoFixAction: null,
    sourceDocument: 'sop.md',
  },
]

async function importSOPRules() {
  console.log('Importing SOP rules from sop.md...')
  
  let imported = 0
  let skipped = 0
  
  for (const rule of SOP_RULES_FROM_DOCUMENT) {
    try {
      // Check if rule already exists
      const existing = await db.unifiedSOPRule.findUnique({
        where: { sopId: rule.sopId }
      })
      
      if (existing) {
        console.log(`  Skipping ${rule.sopId} - already exists`)
        skipped++
        continue
      }
      
      // Create the rule
      await db.unifiedSOPRule.create({
        data: {
          projectId: null, // System-wide rule
          sopId: rule.sopId,
          name: rule.name,
          description: rule.description,
          category: rule.category,
          priority: rule.priority,
          isActive: true,
          appliesTo: rule.appliesTo,
          condition: JSON.stringify(rule.condition),
          expectedValue: rule.expectedValue,
          autoFixAction: rule.autoFixAction ? JSON.stringify(rule.autoFixAction) : null,
          sourceDocument: rule.sourceDocument,
          sourceVersion: '1.0',
          isSystemDefault: true,
          isCustom: false,
        }
      })
      
      console.log(`  ✓ Imported: ${rule.sopId} - ${rule.name}`)
      imported++
    } catch (error) {
      console.error(`  ✗ Failed to import ${rule.sopId}:`, error)
    }
  }
  
  console.log(`\nImport complete!`)
  console.log(`  Imported: ${imported}`)
  console.log(`  Skipped: ${skipped}`)
  console.log(`  Total: ${SOP_RULES_FROM_DOCUMENT.length}`)
}

// Run the import
importSOPRules()
  .then(() => {
    console.log('\nDone!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Import failed:', error)
    process.exit(1)
  })
