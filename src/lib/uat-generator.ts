// =============================================================================
// Schema Toolkit - UAT Test Case Generator
// =============================================================================

import { TableDef, ColumnDef, UATTestCase } from './types';

/**
 * Generate UAT test cases from parsed tables
 */
export function generateUATCases(tables: TableDef[]): UATTestCase[] {
  const cases: UATTestCase[] = [];
  let counter = 1;

  for (const table of tables) {
    const name = table.tableName;
    const requiredCols = table.columns.filter(
      (c) => !c.isNullable && !c.isPrimaryKey
    );
    const pkCol = table.columns.find((c) => c.isPrimaryKey);

    // ─── CREATE TESTS ───

    // Create - Valid Data
    cases.push({
      id: `TC-${String(counter++).padStart(3, '0')}`,
      module: name,
      testCase: `Create ${name} — Valid Data`,
      description: `Verify that a new ${name} record can be created with all required fields`,
      preconditions: `User has create permission for ${name}`,
      steps: [
        `Navigate to ${name} creation form`,
        ...requiredCols.slice(0, 5).map(
          (c) => `Enter valid value for "${c.name}" (${c.dataType})`
        ),
        'Click Save / Submit button',
      ],
      expectedResult: `New ${name} record is created successfully. System shows success message. Record appears in list.`,
      priority: 'High',
      status: 'Not Started',
    });

    // Create - Missing Required Fields
    for (const col of requiredCols.slice(0, 3)) {
      cases.push({
        id: `TC-${String(counter++).padStart(3, '0')}`,
        module: name,
        testCase: `Create ${name} — Missing "${col.name}"`,
        description: `Verify validation when required field "${col.name}" is empty`,
        preconditions: 'User has create permission',
        steps: [
          `Navigate to ${name} creation form`,
          `Leave "${col.name}" field empty`,
          'Fill all other required fields with valid data',
          'Click Save button',
        ],
        expectedResult: `System shows validation error: "${col.name} is required". Record is not created.`,
        priority: 'High',
        status: 'Not Started',
      });
    }

    // Create - Data Type Validation
    const numericCols = table.columns.filter(
      (c) =>
        ['INT', 'BIGINT', 'DECIMAL', 'FLOAT', 'MONEY'].includes(c.dataType) &&
        !c.isPrimaryKey
    );

    for (const col of numericCols.slice(0, 2)) {
      cases.push({
        id: `TC-${String(counter++).padStart(3, '0')}`,
        module: name,
        testCase: `Create ${name} — Invalid ${col.name} Format`,
        description: `Verify validation when "${col.name}" receives non-numeric input`,
        preconditions: 'User has create permission',
        steps: [
          `Navigate to ${name} creation form`,
          `Enter "abc" in "${col.name}" field`,
          'Fill all other required fields',
          'Click Save button',
        ],
        expectedResult: `System shows validation error for "${col.name}". Only numeric values accepted.`,
        priority: 'Medium',
        status: 'Not Started',
      });
    }

    // ─── READ TESTS ───

    // Read - List All
    cases.push({
      id: `TC-${String(counter++).padStart(3, '0')}`,
      module: name,
      testCase: `Read ${name} — List All`,
      description: `Verify that all ${name} records are listed`,
      preconditions: `At least one ${name} record exists in the system`,
      steps: [
        `Navigate to ${name} list page`,
        'Verify records are displayed',
        `Verify column headers include: ${table.columns
          .slice(0, 5)
          .map((c) => c.name)
          .join(', ')}`,
      ],
      expectedResult: `All ${name} records are displayed in a table/list format with correct column headers`,
      priority: 'High',
      status: 'Not Started',
    });

    // Read - Search/Filter
    const searchableCol = table.columns.find(
      (c) =>
        c.dataType.includes('VARCHAR') ||
        c.dataType.includes('NVARCHAR') ||
        c.dataType === 'TEXT'
    );

    if (searchableCol) {
      cases.push({
        id: `TC-${String(counter++).padStart(3, '0')}`,
        module: name,
        testCase: `Read ${name} — Search by ${searchableCol.name}`,
        description: `Verify search functionality works for ${searchableCol.name}`,
        preconditions: `Multiple ${name} records exist with different ${searchableCol.name} values`,
        steps: [
          `Navigate to ${name} list page`,
          `Enter a known partial value in search field`,
          'Click Search or press Enter',
        ],
        expectedResult: `System displays only records matching the search criteria`,
        priority: 'Medium',
        status: 'Not Started',
      });
    }

    // Read - View Detail
    if (pkCol) {
      cases.push({
        id: `TC-${String(counter++).padStart(3, '0')}`,
        module: name,
        testCase: `Read ${name} — View Detail`,
        description: `Verify that clicking a record shows full details`,
        preconditions: `At least one ${name} record exists`,
        steps: [
          `Navigate to ${name} list page`,
          'Click on a record row or View button',
          'Verify all fields are displayed',
        ],
        expectedResult: `Full ${name} details are shown including all columns`,
        priority: 'High',
        status: 'Not Started',
      });
    }

    // ─── UPDATE TESTS ───

    cases.push({
      id: `TC-${String(counter++).padStart(3, '0')}`,
      module: name,
      testCase: `Update ${name} — Valid Data`,
      description: `Verify that an existing ${name} record can be updated`,
      preconditions: `At least one ${name} record exists. User has edit permission.`,
      steps: [
        `Navigate to ${name} list`,
        'Click Edit on an existing record',
        'Modify one or more fields with valid data',
        'Click Save button',
      ],
      expectedResult: `Record is updated successfully. Changes are reflected in the list and detail view.`,
      priority: 'High',
      status: 'Not Started',
    });

    // Update - Modify PK (should fail)
    if (pkCol && !pkCol.isIdentity) {
      cases.push({
        id: `TC-${String(counter++).padStart(3, '0')}`,
        module: name,
        testCase: `Update ${name} — Attempt to Modify ${pkCol.name}`,
        description: `Verify that primary key ${pkCol.name} cannot be modified`,
        preconditions: `At least one ${name} record exists. User has edit permission.`,
        steps: [
          `Navigate to ${name} edit form`,
          `Attempt to modify "${pkCol.name}" field`,
          'Click Save button',
        ],
        expectedResult: `Either "${pkCol.name}" field is disabled/read-only, or system shows error that PK cannot be changed.`,
        priority: 'Medium',
        status: 'Not Started',
      });
    }

    // ─── DELETE TESTS ───

    cases.push({
      id: `TC-${String(counter++).padStart(3, '0')}`,
      module: name,
      testCase: `Delete ${name} — Confirm and Delete`,
      description: `Verify that a ${name} record can be deleted`,
      preconditions: `At least one ${name} record exists. User has delete permission. Record has no dependent records.`,
      steps: [
        `Navigate to ${name} list`,
        'Click Delete on a record',
        'Confirm deletion in dialog',
      ],
      expectedResult: `Record is removed from the list. System shows success message.`,
      priority: 'Medium',
      status: 'Not Started',
    });

    // Delete - Cancel Confirmation
    cases.push({
      id: `TC-${String(counter++).padStart(3, '0')}`,
      module: name,
      testCase: `Delete ${name} — Cancel Confirmation`,
      description: `Verify that cancellation of delete dialog works`,
      preconditions: `At least one ${name} record exists`,
      steps: [
        `Navigate to ${name} list`,
        'Click Delete on a record',
        'Click Cancel in confirmation dialog',
      ],
      expectedResult: `Record is NOT deleted. Dialog closes. Record remains in list.`,
      priority: 'Low',
      status: 'Not Started',
    });

    // ─── FK VALIDATION TESTS ───

    for (const fk of table.foreignKeys) {
      cases.push({
        id: `TC-${String(counter++).padStart(3, '0')}`,
        module: name,
        testCase: `FK Validation — ${fk.columnName} references ${fk.referencesTable}`,
        description: `Verify that ${fk.columnName} only accepts valid values from ${fk.referencesTable}`,
        preconditions: `${fk.referencesTable} has at least one record`,
        steps: [
          `Navigate to ${name} form`,
          `For field "${fk.columnName}", select a valid value from ${fk.referencesTable}`,
          'Save the record',
          `Verify the link to ${fk.referencesTable} is established`,
        ],
        expectedResult: `System accepts valid ${fk.referencesTable} reference. Record is saved with correct FK relationship.`,
        priority: 'High',
        status: 'Not Started',
      });

      cases.push({
        id: `TC-${String(counter++).padStart(3, '0')}`,
        module: name,
        testCase: `FK Validation — ${fk.columnName} Invalid Reference`,
        description: `Verify system rejects invalid FK value for ${fk.columnName}`,
        preconditions: 'User has create permission',
        steps: [
          `Navigate to ${name} form`,
          `Attempt to enter non-existent value in "${fk.columnName}"`,
          'Click Save',
        ],
        expectedResult: `System rejects invalid FK value. Shows error that selected ${fk.referencesTable} does not exist.`,
        priority: 'Medium',
        status: 'Not Started',
      });
    }

    // ─── BOUNDARY TESTS ───

    // Max length validation
    const varcharCols = table.columns.filter(
      (c) =>
        (c.dataType === 'NVARCHAR' || c.dataType === 'VARCHAR') &&
        c.maxLength &&
        c.maxLength !== 'MAX'
    );

    for (const col of varcharCols.slice(0, 2)) {
      cases.push({
        id: `TC-${String(counter++).padStart(3, '0')}`,
        module: name,
        testCase: `Boundary Test — ${col.name} Max Length`,
        description: `Verify that ${col.name} accepts exactly ${col.maxLength} characters`,
        preconditions: 'User has create permission',
        steps: [
          `Navigate to ${name} form`,
          `Enter exactly ${col.maxLength} characters in "${col.name}"`,
          'Click Save',
        ],
        expectedResult: `Record is saved successfully with the maximum allowed length.`,
        priority: 'Low',
        status: 'Not Started',
      });

      cases.push({
        id: `TC-${String(counter++).padStart(3, '0')}`,
        module: name,
        testCase: `Boundary Test — ${col.name} Exceeds Max Length`,
        description: `Verify validation when ${col.name} exceeds ${col.maxLength} characters`,
        preconditions: 'User has create permission',
        steps: [
          `Navigate to ${name} form`,
          `Enter ${parseInt(col.maxLength || '0') + 1} characters in "${col.name}"`,
          'Click Save',
        ],
        expectedResult: `System shows validation error. Characters beyond limit are either truncated or rejected.`,
        priority: 'Low',
        status: 'Not Started',
      });
    }
  }

  return cases;
}

/**
 * Convert UAT cases to Markdown format
 */
export function uatToMarkdown(cases: UATTestCase[]): string {
  const lines: string[] = [];

  lines.push('# UAT Test Cases');
  lines.push('');
  lines.push(`> Total Test Cases: ${cases.length}`);
  lines.push(`> Generated: ${new Date().toISOString().split('T')[0]}`);
  lines.push('');

  // Summary by module
  const modules = [...new Set(cases.map((c) => c.module))];
  lines.push('## 📊 Summary by Module');
  lines.push('');
  lines.push('| Module | Test Cases | High | Medium | Low |');
  lines.push('|--------|-----------|------|--------|-----|');

  for (const mod of modules) {
    const modCases = cases.filter((c) => c.module === mod);
    const high = modCases.filter((c) => c.priority === 'High').length;
    const medium = modCases.filter((c) => c.priority === 'Medium').length;
    const low = modCases.filter((c) => c.priority === 'Low').length;

    lines.push(`| ${mod} | ${modCases.length} | ${high} | ${medium} | ${low} |`);
  }

  lines.push('');
  lines.push('---');
  lines.push('');

  // Detailed test cases
  for (const tc of cases) {
    lines.push(`## ${tc.id}: ${tc.testCase}`);
    lines.push('');
    lines.push(`- **Module:** ${tc.module}`);
    lines.push(`- **Priority:** ${tc.priority}`);
    lines.push(`- **Status:** ${tc.status}`);
    lines.push(`- **Description:** ${tc.description}`);
    lines.push(`- **Preconditions:** ${tc.preconditions}`);
    lines.push('');
    lines.push('**Steps:**');
    lines.push('');
    tc.steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
    lines.push('');
    lines.push(`**Expected Result:** ${tc.expectedResult}`);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Convert UAT cases to CSV format
 */
export function uatToCSV(cases: UATTestCase[]): string {
  const headers = [
    'ID',
    'Module',
    'Test Case',
    'Description',
    'Priority',
    'Status',
    'Preconditions',
    'Steps',
    'Expected Result',
  ];

  const rows = cases.map((tc) => [
    tc.id,
    tc.module,
    `"${tc.testCase}"`,
    `"${tc.description}"`,
    tc.priority,
    tc.status,
    `"${tc.preconditions}"`,
    `"${tc.steps.join('; ')}"`,
    `"${tc.expectedResult}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Convert UAT cases to JSON format
 */
export function uatToJSON(cases: UATTestCase[]): string {
  return JSON.stringify(cases, null, 2);
}

/**
 * Generate test execution report template
 */
export function generateTestExecutionReport(
  cases: UATTestCase[]
): string {
  const lines: string[] = [];

  lines.push('# UAT Test Execution Report');
  lines.push('');
  lines.push(`**Execution Date:** ________________`);
  lines.push(`**Tester:** ________________`);
  lines.push(`**Environment:** ________________`);
  lines.push('');

  lines.push('## Execution Summary');
  lines.push('');
  lines.push('| Status | Count | Percentage |');
  lines.push('|--------|-------|------------|');
  lines.push(`| Total | ${cases.length} | 100% |`);
  lines.push('| Passed | ___ | ___% |');
  lines.push('| Failed | ___ | ___% |');
  lines.push('| Blocked | ___ | ___% |');
  lines.push('| Not Started | ___ | ___% |');
  lines.push('');

  lines.push('## Detailed Results');
  lines.push('');
  lines.push('| ID | Test Case | Status | Actual Result | Defect ID | Comments |');
  lines.push('|----|-----------|--------|---------------|-----------|----------|');

  for (const tc of cases) {
    lines.push(`| ${tc.id} | ${tc.testCase} | | | | |`);
  }

  lines.push('');
  lines.push('## Defects Found');
  lines.push('');
  lines.push('| Defect ID | Test Case | Description | Severity | Status |');
  lines.push('|-----------|-----------|-------------|----------|--------|');
  lines.push('| | | | | |');
  lines.push('');

  lines.push('## Sign-off');
  lines.push('');
  lines.push('**Tester Signature:** ________________ **Date:** ________________');
  lines.push('');
  lines.push('**QA Lead Signature:** ________________ **Date:** ________________');

  return lines.join('\n');
}

/**
 * Generate test data suggestions for testing
 */
export function generateTestDataSuggestions(tables: TableDef[]): Record<string, unknown>[] {
  const suggestions: Record<string, unknown>[] = [];

  for (const table of tables) {
    const data: Record<string, unknown> = {};

    for (const col of table.columns) {
      if (col.isPrimaryKey) continue;

      data[col.name] = generateSampleValue(col);
    }

    suggestions.push({
      tableName: table.tableName,
      sampleData: data,
    });
  }

  return suggestions;
}

/**
 * Generate sample value based on column definition
 */
function generateSampleValue(col: ColumnDef): unknown {
  const name = col.name.toLowerCase();
  const type = col.dataType.toUpperCase();

  // Name-based inference
  if (name.includes('email')) return 'test@example.com';
  if (name.includes('phone') || name.includes('mobile') || name.includes('cell'))
    return '+1234567890';
  if (name.includes('name') && name.includes('first')) return 'John';
  if (name.includes('name') && name.includes('last')) return 'Doe';
  if (name.includes('name')) return 'Test Name';
  if (name.includes('address')) return '123 Test Street';
  if (name.includes('city')) return 'Test City';
  if (name.includes('country')) return 'Test Country';
  if (name.includes('url') || name.includes('website')) return 'https://example.com';

  // Type-based inference
  if (type === 'BIT') return true;
  if (type === 'UNIQUEIDENTIFIER') return '00000000-0000-0000-0000-000000000000';
  if (['INT', 'BIGINT', 'SMALLINT', 'TINYINT'].includes(type)) return 1;
  if (['DECIMAL', 'FLOAT', 'MONEY'].includes(type)) return 100.0;
  if (['DATETIME', 'DATETIME2', 'DATE'].includes(type))
    return new Date().toISOString();
  if (['NVARCHAR', 'VARCHAR', 'TEXT', 'NTEXT'].includes(type)) {
    const maxLen = parseInt(col.maxLength || '50');
    return 'X'.repeat(Math.min(maxLen, 10));
  }

  return null;
}
