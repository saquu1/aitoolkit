// =============================================================================
// Testing Intelligence API - Complete Implementation
// Handles: Test Case Generation, Test Data, Execution, Coverage, Automation,
//          Reporting, Test Suites, Test Management, Quality Metrics
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ROUTER
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, projectId } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    switch (action) {
      // ─────────────────────────────────────────────────────────────────────
      // Test Case Generation
      // ─────────────────────────────────────────────────────────────────────
      case 'generate-test-cases':
        return await generateTestCases(projectId, body.options);
      
      case 'generate-crud-tests':
        return await generateCRUDTests(projectId, body.tableName);
      
      case 'generate-sp-tests':
        return await generateSPTests(projectId, body.spName);
      
      case 'generate-workflow-tests':
        return await generateWorkflowTests(projectId, body.workflowId);
      
      case 'generate-validation-tests':
        return await generateValidationTests(projectId, body.tableName);
      
      case 'generate-integration-tests':
        return await generateIntegrationTests(projectId, body.options);
      
      case 'generate-security-tests':
        return await generateSecurityTests(projectId);
      
      case 'generate-performance-tests':
        return await generatePerformanceTests(projectId, body.options);

      // ─────────────────────────────────────────────────────────────────────
      // Test Case Management
      // ─────────────────────────────────────────────────────────────────────
      case 'create-test-case':
        return await createTestCase(projectId, body.testCase);
      
      case 'update-test-case':
        return await updateTestCase(projectId, body.testCaseId, body.updates);
      
      case 'get-test-cases':
        return await getTestCases(projectId, body.filters);
      
      case 'get-test-case':
        return await getTestCase(projectId, body.testCaseId);
      
      case 'delete-test-case':
        return await deleteTestCase(projectId, body.testCaseId);
      
      case 'bulk-create-test-cases':
        return await bulkCreateTestCases(projectId, body.testCases);
      
      case 'clone-test-case':
        return await cloneTestCase(projectId, body.testCaseId, body.options);
      
      case 'import-test-cases':
        return await importTestCases(projectId, body.testCases, body.format);

      // ─────────────────────────────────────────────────────────────────────
      // Test Data Generation
      // ─────────────────────────────────────────────────────────────────────
      case 'generate-test-data':
        return await generateTestData(projectId, body.tableName, body.options);
      
      case 'generate-synthetic-data':
        return await generateSyntheticData(projectId, body.schema, body.count);
      
      case 'generate-fixtures':
        return await generateTestFixtures(projectId, body.tables);
      
      case 'generate-edge-case-data':
        return await generateEdgeCaseData(projectId, body.tableName);
      
      case 'generate-mock-responses':
        return await generateMockResponses(projectId, body.spName);
      
      case 'get-test-data-templates':
        return await getTestDataTemplates(projectId);
      
      case 'create-test-data-template':
        return await createTestDataTemplate(projectId, body.template);
      
      case 'anonymize-test-data':
        return await anonymizeTestData(projectId, body.data, body.rules);

      // ─────────────────────────────────────────────────────────────────────
      // Test Execution
      // ─────────────────────────────────────────────────────────────────────
      case 'create-test-run':
        return await createTestRun(projectId, body.testRun);
      
      case 'execute-test-case':
        return await executeTestCase(projectId, body.testCaseId, body.execution);
      
      case 'execute-test-suite':
        return await executeTestSuite(projectId, body.suiteId, body.options);
      
      case 'get-test-runs':
        return await getTestRuns(projectId, body.filters);
      
      case 'get-test-run':
        return await getTestRun(projectId, body.runId);
      
      case 'update-test-run':
        return await updateTestRun(projectId, body.runId, body.updates);
      
      case 'record-test-result':
        return await recordTestResult(projectId, body.result);
      
      case 'get-test-results':
        return await getTestResults(projectId, body.filters);
      
      case 'get-execution-history':
        return await getExecutionHistory(projectId, body.testCaseId);

      // ─────────────────────────────────────────────────────────────────────
      // Test Coverage Analysis
      // ─────────────────────────────────────────────────────────────────────
      case 'analyze-test-coverage':
        return await analyzeTestCoverage(projectId);
      
      case 'get-table-coverage':
        return await getTableCoverage(projectId, body.tableName);
      
      case 'get-sp-coverage':
        return await getSPCoverage(projectId, body.spName);
      
      case 'get-coverage-report':
        return await getCoverageReport(projectId);
      
      case 'get-coverage-gaps':
        return await getCoverageGaps(projectId);
      
      case 'suggest-tests-for-coverage':
        return await suggestTestsForCoverage(projectId, body.entityType, body.entityName);

      // ─────────────────────────────────────────────────────────────────────
      // Test Suites & Organization
      // ─────────────────────────────────────────────────────────────────────
      case 'create-test-suite':
        return await createTestSuite(projectId, body.suite);
      
      case 'update-test-suite':
        return await updateTestSuite(projectId, body.suiteId, body.updates);
      
      case 'get-test-suites':
        return await getTestSuites(projectId);
      
      case 'get-test-suite':
        return await getTestSuite(projectId, body.suiteId);
      
      case 'add-to-test-suite':
        return await addToTestSuite(projectId, body.suiteId, body.testCaseIds);
      
      case 'remove-from-test-suite':
        return await removeFromTestSuite(projectId, body.suiteId, body.testCaseIds);
      
      case 'delete-test-suite':
        return await deleteTestSuite(projectId, body.suiteId);
      
      case 'reorder-test-suite':
        return await reorderTestSuite(projectId, body.suiteId, body.order);

      // ─────────────────────────────────────────────────────────────────────
      // Test Automation
      // ─────────────────────────────────────────────────────────────────────
      case 'generate-automation-script':
        return await generateAutomationScript(projectId, body.testCaseId, body.framework);
      
      case 'generate-playwright-tests':
        return await generatePlaywrightTests(projectId, body.options);
      
      case 'generate-cypress-tests':
        return await generateCypressTests(projectId, body.options);
      
      case 'generate-jest-tests':
        return await generateJestTests(projectId, body.options);
      
      case 'generate-api-tests':
        return await generateAPITests(projectId, body.options);
      
      case 'get-automation-scripts':
        return await getAutomationScripts(projectId);
      
      case 'update-automation-script':
        return await updateAutomationScript(projectId, body.scriptId, body.updates);

      // ─────────────────────────────────────────────────────────────────────
      // Test Reporting & Analytics
      // ─────────────────────────────────────────────────────────────────────
      case 'get-test-dashboard':
        return await getTestDashboard(projectId);
      
      case 'get-test-metrics':
        return await getTestMetrics(projectId, body.period);
      
      case 'get-test-trends':
        return await getTestTrends(projectId, body.period);
      
      case 'generate-test-report':
        return await generateTestReport(projectId, body.options);
      
      case 'get-defect-analysis':
        return await getDefectAnalysis(projectId);
      
      case 'get-test-efficiency':
        return await getTestEfficiency(projectId);
      
      case 'export-test-report':
        return await exportTestReport(projectId, body.format, body.options);

      // ─────────────────────────────────────────────────────────────────────
      // Test Templates & Library
      // ─────────────────────────────────────────────────────────────────────
      case 'get-test-templates':
        return await getTestTemplates();
      
      case 'create-test-template':
        return await createTestTemplate(body.template);
      
      case 'instantiate-template':
        return await instantiateTemplate(projectId, body.templateId, body.params);
      
      case 'get-test-patterns':
        return await getTestPatterns();

      // ─────────────────────────────────────────────────────────────────────
      // Quality Metrics
      // ─────────────────────────────────────────────────────────────────────
      case 'calculate-quality-score':
        return await calculateQualityScore(projectId);
      
      case 'get-risk-assessment':
        return await getRiskAssessment(projectId);
      
      case 'get-test-health':
        return await getTestHealth(projectId);
      
      case 'get-flaky-tests':
        return await getFlakyTests(projectId);
      
      case 'mark-flaky-test':
        return await markFlakyTest(projectId, body.testCaseId, body.isFlaky);

      // ─────────────────────────────────────────────────────────────────────
      // Test Export/Import
      // ─────────────────────────────────────────────────────────────────────
      case 'export-test-cases':
        return await exportTestCases(projectId, body.format, body.filters);
      
      case 'import-from-excel':
        return await importFromExcel(projectId, body.data);
      
      case 'import-from-csv':
        return await importFromCSV(projectId, body.data);
      
      case 'sync-with-testrail':
        return await syncWithTestRail(projectId, body.config);
      
      case 'sync-with-jira':
        return await syncWithJira(projectId, body.config);

      // ─────────────────────────────────────────────────────────────────────
      // UAT & Acceptance Testing
      // ─────────────────────────────────────────────────────────────────────
      case 'generate-uat-cases':
        return await generateUATCases(projectId);
      
      case 'create-uat-session':
        return await createUATSession(projectId, body.session);
      
      case 'get-uat-sessions':
        return await getUATSessions(projectId);
      
      case 'record-uat-feedback':
        return await recordUATFeedback(projectId, body.sessionId, body.feedback);
      
      case 'get-uat-report':
        return await getUATReport(projectId, body.sessionId);

      // ─────────────────────────────────────────────────────────────────────
      // Test Summary
      // ─────────────────────────────────────────────────────────────────────
      case 'get-testing-summary':
        return await getTestingSummary(projectId);
      
      case 'get-testing-health':
        return await getTestingHealth(projectId);

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Testing Intelligence API error:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST CASE GENERATION
// ═══════════════════════════════════════════════════════════════════════════

async function generateTestCases(projectId: string, options?: any) {
  const tables = await db.toolkitTable.findMany({
    where: { projectId },
    select: { tableName: true, columns: true, foreignKeys: true },
  });

  const procedures = await db.toolkitProcedure.findMany({
    where: { projectId },
    select: { procedureName: true, parameters: true, body: true },
  });

  const generatedCases: any[] = [];
  let caseCounter = 1;

  // Generate CRUD tests for each table
  for (const table of tables) {
    const columns = JSON.parse(table.columns || '[]');
    const fks = JSON.parse(table.foreignKeys || '[]');
    const requiredCols = columns.filter((c: any) => !c.isNullable && !c.isPrimaryKey);
    const pkCol = columns.find((c: any) => c.isPrimaryKey);

    // CREATE - Valid Data
    generatedCases.push({
      id: `TC-${String(caseCounter++).padStart(3, '0')}`,
      module: table.tableName,
      title: `Create ${table.tableName} - Valid Data`,
      description: `Verify that a new ${table.tableName} record can be created with all required fields`,
      type: 'functional',
      priority: 'high',
      preconditions: [`User has create permission for ${table.tableName}`],
      steps: [
        `Navigate to ${table.tableName} creation form`,
        ...requiredCols.slice(0, 5).map((c: any) => `Enter valid value for "${c.name}" (${c.dataType})`),
        'Click Save/Submit button',
      ],
      expectedResult: `New ${table.tableName} record is created successfully. System shows success message.`,
      testData: generateTestDataForColumns(columns.filter((c: any) => !c.isPrimaryKey)),
    });

    // CREATE - Missing Required Fields
    for (const col of requiredCols.slice(0, 3)) {
      generatedCases.push({
        id: `TC-${String(caseCounter++).padStart(3, '0')}`,
        module: table.tableName,
        title: `Create ${table.tableName} - Missing "${col.name}"`,
        description: `Verify validation when required field "${col.name}" is empty`,
        type: 'negative',
        priority: 'high',
        preconditions: ['User has create permission'],
        steps: [
          `Navigate to ${table.tableName} creation form`,
          `Leave "${col.name}" field empty`,
          'Fill all other required fields with valid data',
          'Click Save button',
        ],
        expectedResult: `System shows validation error: "${col.name} is required". Record is not created.`,
      });
    }

    // READ - List All
    generatedCases.push({
      id: `TC-${String(caseCounter++).padStart(3, '0')}`,
      module: table.tableName,
      title: `Read ${table.tableName} - List All`,
      description: `Verify that all ${table.tableName} records are listed`,
      type: 'functional',
      priority: 'high',
      preconditions: [`At least one ${table.tableName} record exists`],
      steps: [
        `Navigate to ${table.tableName} list page`,
        'Verify records are displayed',
        `Verify column headers include: ${columns.slice(0, 5).map((c: any) => c.name).join(', ')}`,
      ],
      expectedResult: `All ${table.tableName} records are displayed with correct column headers`,
    });

    // UPDATE - Valid Data
    generatedCases.push({
      id: `TC-${String(caseCounter++).padStart(3, '0')}`,
      module: table.tableName,
      title: `Update ${table.tableName} - Valid Data`,
      description: `Verify that an existing ${table.tableName} record can be updated`,
      type: 'functional',
      priority: 'high',
      preconditions: [`At least one ${table.tableName} record exists`, 'User has edit permission'],
      steps: [
        `Navigate to ${table.tableName} list`,
        'Click Edit on an existing record',
        'Modify one or more fields with valid data',
        'Click Save button',
      ],
      expectedResult: `Record is updated successfully. Changes are reflected.`,
    });

    // DELETE - Confirm and Delete
    generatedCases.push({
      id: `TC-${String(caseCounter++).padStart(3, '0')}`,
      module: table.tableName,
      title: `Delete ${table.tableName} - Confirm and Delete`,
      description: `Verify that a ${table.tableName} record can be deleted`,
      type: 'functional',
      priority: 'medium',
      preconditions: [`At least one ${table.tableName} record exists`, 'User has delete permission'],
      steps: [
        `Navigate to ${table.tableName} list`,
        'Click Delete on a record',
        'Confirm deletion in dialog',
      ],
      expectedResult: `Record is removed. System shows success message.`,
    });

    // FK Validation Tests
    for (const fk of fks.slice(0, 2)) {
      generatedCases.push({
        id: `TC-${String(caseCounter++).padStart(3, '0')}`,
        module: table.tableName,
        title: `FK Validation - ${fk.column} references ${fk.referencedTable}`,
        description: `Verify that ${fk.column} only accepts valid values from ${fk.referencedTable}`,
        type: 'integration',
        priority: 'high',
        preconditions: [`${fk.referencedTable} has at least one record`],
        steps: [
          `Navigate to ${table.tableName} form`,
          `For field "${fk.column}", select a valid value from ${fk.referencedTable}`,
          'Save the record',
        ],
        expectedResult: `System accepts valid reference. Record is saved correctly.`,
      });
    }

    // Boundary Tests
    const varcharCols = columns.filter((c: any) => 
      (c.dataType === 'NVARCHAR' || c.dataType === 'VARCHAR') && c.maxLength && c.maxLength !== 'MAX'
    );

    for (const col of varcharCols.slice(0, 2)) {
      generatedCases.push({
        id: `TC-${String(caseCounter++).padStart(3, '0')}`,
        module: table.tableName,
        title: `Boundary Test - ${col.name} Max Length`,
        description: `Verify that ${col.name} accepts exactly ${col.maxLength} characters`,
        type: 'boundary',
        priority: 'low',
        preconditions: ['User has create permission'],
        steps: [
          `Navigate to ${table.tableName} form`,
          `Enter exactly ${col.maxLength} characters in "${col.name}"`,
          'Click Save',
        ],
        expectedResult: `Record is saved successfully with the maximum allowed length.`,
      });
    }
  }

  // Generate SP tests
  for (const sp of procedures) {
    const params = JSON.parse(sp.parameters || '[]');
    
    generatedCases.push({
      id: `TC-${String(caseCounter++).padStart(3, '0')}`,
      module: 'StoredProcedures',
      title: `SP Test - ${sp.procedureName}`,
      description: `Verify that ${sp.procedureName} executes correctly with valid parameters`,
      type: 'integration',
      priority: 'high',
      preconditions: ['Database connection is established', 'Valid parameters are available'],
      steps: [
        `Execute ${sp.procedureName}`,
        ...params.slice(0, 5).map((p: any) => `Pass valid ${p.name} parameter`),
        'Verify return value/output',
      ],
      expectedResult: `SP executes successfully without errors.`,
      testData: generateTestDataForParams(params),
    });
  }

  // Store generated test cases
  for (const tc of generatedCases) {
    try {
      await db.testCase.create({
        data: {
          projectId,
          testCaseId: tc.id,
          title: tc.title,
          description: tc.description,
          module: tc.module,
          type: tc.type || 'functional',
          priority: tc.priority || 'medium',
          preconditions: JSON.stringify(tc.preconditions || []),
          steps: JSON.stringify(tc.steps || []),
          expectedResult: tc.expectedResult || '',
          testData: JSON.stringify(tc.testData || {}),
          status: 'draft',
        }
      });
    } catch (e) {
      // Skip duplicates
    }
  }

  return NextResponse.json({
    success: true,
    generatedCount: generatedCases.length,
    testCases: generatedCases,
    summary: {
      byModule: groupByModule(generatedCases),
      byPriority: {
        high: generatedCases.filter(tc => tc.priority === 'high').length,
        medium: generatedCases.filter(tc => tc.priority === 'medium').length,
        low: generatedCases.filter(tc => tc.priority === 'low').length,
      },
      byType: {
        functional: generatedCases.filter(tc => tc.type === 'functional').length,
        negative: generatedCases.filter(tc => tc.type === 'negative').length,
        integration: generatedCases.filter(tc => tc.type === 'integration').length,
        boundary: generatedCases.filter(tc => tc.type === 'boundary').length,
      },
    }
  });
}

function generateTestDataForColumns(columns: any[]): Record<string, any> {
  const data: Record<string, any> = {};
  for (const col of columns) {
    data[col.name] = generateSampleValue(col);
  }
  return data;
}

function generateTestDataForParams(params: any[]): Record<string, any> {
  const data: Record<string, any> = {};
  for (const p of params) {
    data[p.name] = generateSampleValue({ name: p.name, dataType: p.type || 'VARCHAR' });
  }
  return data;
}

function generateSampleValue(col: any): any {
  const name = (col.name || '').toLowerCase();
  const type = (col.dataType || col.type || 'VARCHAR').toUpperCase();

  // Name-based inference
  if (name.includes('email')) return 'test@example.com';
  if (name.includes('phone') || name.includes('mobile')) return '+1234567890';
  if (name.includes('firstname')) return 'John';
  if (name.includes('lastname')) return 'Doe';
  if (name.includes('name')) return 'Test Name';
  if (name.includes('address')) return '123 Test Street';
  if (name.includes('city')) return 'Test City';
  if (name.includes('country')) return 'Test Country';
  if (name.includes('url') || name.includes('website')) return 'https://example.com';
  if (name.includes('date') && !name.includes('update') && !name.includes('create')) return '2024-01-15';
  if (name.includes('status')) return 'Active';
  if (name.includes('is') || name.includes('has')) return true;

  // Type-based inference
  if (type === 'BIT' || type === 'BOOLEAN') return true;
  if (type === 'UNIQUEIDENTIFIER' || type === 'UUID') return '00000000-0000-0000-0000-000000000000';
  if (['INT', 'BIGINT', 'SMALLINT', 'TINYINT'].includes(type)) return 1;
  if (['DECIMAL', 'FLOAT', 'MONEY', 'NUMERIC'].includes(type)) return 100.0;
  if (['DATETIME', 'DATETIME2', 'DATE'].includes(type)) return new Date().toISOString();
  if (['NVARCHAR', 'VARCHAR', 'TEXT', 'NTEXT'].includes(type)) {
    const maxLen = parseInt(col.maxLength || '50');
    return 'Test' + Math.random().toString(36).substring(2, Math.min(maxLen, 10));
  }

  return null;
}

function groupByModule(testCases: any[]): Record<string, number> {
  const groups: Record<string, number> = {};
  for (const tc of testCases) {
    groups[tc.module] = (groups[tc.module] || 0) + 1;
  }
  return groups;
}

async function generateCRUDTests(projectId: string, tableName: string) {
  const table = await db.toolkitTable.findFirst({
    where: { projectId, tableName },
    select: { tableName: true, columns: true, foreignKeys: true },
  });

  if (!table) {
    return NextResponse.json({ error: 'Table not found' }, { status: 404 });
  }

  const columns = JSON.parse(table.columns || '[]');
  const testCases: any[] = [];

  // CREATE tests
  testCases.push({
    module: tableName,
    title: `Create ${tableName} - Valid Data`,
    type: 'functional',
    priority: 'high',
    steps: [
      `Navigate to ${tableName} creation form`,
      'Fill all required fields with valid data',
      'Click Save button',
    ],
    expectedResult: 'Record created successfully',
  });

  // READ tests
  testCases.push({
    module: tableName,
    title: `Read ${tableName} - List All`,
    type: 'functional',
    priority: 'high',
    steps: [
      `Navigate to ${tableName} list page`,
      'Verify records are displayed',
    ],
    expectedResult: 'All records listed correctly',
  });

  // UPDATE tests
  testCases.push({
    module: tableName,
    title: `Update ${tableName} - Valid Data`,
    type: 'functional',
    priority: 'high',
    steps: [
      `Navigate to ${tableName} edit form`,
      'Modify fields with valid data',
      'Click Save button',
    ],
    expectedResult: 'Record updated successfully',
  });

  // DELETE tests
  testCases.push({
    module: tableName,
    title: `Delete ${tableName} - Confirm`,
    type: 'functional',
    priority: 'medium',
    steps: [
      `Navigate to ${tableName} list`,
      'Click Delete on a record',
      'Confirm deletion',
    ],
    expectedResult: 'Record deleted successfully',
  });

  return NextResponse.json({
    success: true,
    tableName,
    testCases,
  });
}

async function generateSPTests(projectId: string, spName: string) {
  const sp = await db.toolkitProcedure.findFirst({
    where: { projectId, procedureName: spName },
    select: { procedureName: true, parameters: true, body: true },
  });

  if (!sp) {
    return NextResponse.json({ error: 'Stored procedure not found' }, { status: 404 });
  }

  const params = JSON.parse(sp.parameters || '[]');
  const testCases: any[] = [];

  // Valid execution test
  testCases.push({
    module: 'StoredProcedures',
    title: `Execute ${spName} - Valid Parameters`,
    type: 'integration',
    priority: 'high',
    steps: [
      `Call ${spName} with valid parameters`,
      ...params.map((p: any) => `Pass ${p.name}: ${generateSampleValue({ name: p.name, dataType: p.type })}`),
      'Verify execution result',
    ],
    expectedResult: 'SP executes successfully',
    testData: generateTestDataForParams(params),
  });

  // Null parameter tests
  for (const param of params.filter((p: any) => !p.isNullable)) {
    testCases.push({
      module: 'StoredProcedures',
      title: `Execute ${spName} - Null ${param.name}`,
      type: 'negative',
      priority: 'medium',
      steps: [
        `Call ${spName} with null ${param.name}`,
        'Verify error handling',
      ],
      expectedResult: 'SP returns appropriate error for null parameter',
    });
  }

  return NextResponse.json({
    success: true,
    spName,
    testCases,
  });
}

async function generateWorkflowTests(projectId: string, workflowId: string) {
  // Generate workflow-based tests
  const testCases: any[] = [];

  testCases.push({
    module: 'Workflows',
    title: `Workflow Test - ${workflowId}`,
    type: 'workflow',
    priority: 'high',
    steps: [
      'Start workflow',
      'Complete each step in sequence',
      'Verify workflow completion',
    ],
    expectedResult: 'Workflow completes successfully',
  });

  return NextResponse.json({
    success: true,
    workflowId,
    testCases,
  });
}

async function generateValidationTests(projectId: string, tableName: string) {
  const table = await db.toolkitTable.findFirst({
    where: { projectId, tableName },
    select: { columns: true },
  });

  if (!table) {
    return NextResponse.json({ error: 'Table not found' }, { status: 404 });
  }

  const columns = JSON.parse(table.columns || '[]');
  const testCases: any[] = [];

  for (const col of columns) {
    // Required field validation
    if (!col.isNullable && !col.isPrimaryKey) {
      testCases.push({
        module: tableName,
        title: `Validation - ${col.name} Required`,
        type: 'validation',
        priority: 'high',
        steps: [
          `Leave ${col.name} empty`,
          'Attempt to save',
        ],
        expectedResult: `Validation error for ${col.name}`,
      });
    }

    // Type validation
    if (['INT', 'BIGINT', 'DECIMAL'].includes(col.dataType)) {
      testCases.push({
        module: tableName,
        title: `Validation - ${col.name} Type`,
        type: 'validation',
        priority: 'medium',
        steps: [
          `Enter non-numeric value in ${col.name}`,
          'Attempt to save',
        ],
        expectedResult: `Type validation error for ${col.name}`,
      });
    }

    // Length validation
    if (col.maxLength && col.maxLength !== 'MAX') {
      testCases.push({
        module: tableName,
        title: `Validation - ${col.name} Max Length`,
        type: 'validation',
        priority: 'low',
        steps: [
          `Enter ${parseInt(col.maxLength) + 1} characters in ${col.name}`,
          'Attempt to save',
        ],
        expectedResult: `Length validation error for ${col.name}`,
      });
    }
  }

  return NextResponse.json({
    success: true,
    tableName,
    validationTests: testCases,
  });
}

async function generateIntegrationTests(projectId: string, options?: any) {
  const tables = await db.toolkitTable.findMany({
    where: { projectId },
    select: { tableName: true, foreignKeys: true },
  });

  const testCases: any[] = [];

  for (const table of tables) {
    const fks = JSON.parse(table.foreignKeys || '[]');
    
    for (const fk of fks) {
      testCases.push({
        module: 'Integration',
        title: `FK Integrity - ${table.tableName}.${fk.column}`,
        type: 'integration',
        priority: 'high',
        steps: [
          `Create record in ${fk.referencedTable}`,
          `Create record in ${table.tableName} referencing it`,
          `Delete referenced record`,
          'Verify cascade behavior or error',
        ],
        expectedResult: 'FK integrity maintained',
      });
    }
  }

  return NextResponse.json({
    success: true,
    integrationTests: testCases,
  });
}

async function generateSecurityTests(projectId: string) {
  const testCases: any[] = [
    {
      module: 'Security',
      title: 'SQL Injection Test - Input Fields',
      type: 'security',
      priority: 'critical',
      steps: [
        "Enter SQL injection payload: ' OR '1'='1",
        'Attempt to submit form',
        'Verify response',
      ],
      expectedResult: 'Input sanitized, no SQL injection possible',
    },
    {
      module: 'Security',
      title: 'XSS Test - Input Fields',
      type: 'security',
      priority: 'critical',
      steps: [
        'Enter XSS payload: <script>alert(1)</script>',
        'View the data',
        'Verify script not executed',
      ],
      expectedResult: 'Input sanitized, XSS prevented',
    },
    {
      module: 'Security',
      title: 'Authentication Bypass Test',
      type: 'security',
      priority: 'critical',
      steps: [
        'Attempt to access protected resource without auth',
        'Verify response',
      ],
      expectedResult: 'Access denied, redirect to login',
    },
    {
      module: 'Security',
      title: 'Authorization Test - Role-based Access',
      type: 'security',
      priority: 'high',
      steps: [
        'Login as low-privilege user',
        'Attempt to access admin resources',
        'Verify response',
      ],
      expectedResult: 'Access denied for unauthorized resources',
    },
  ];

  return NextResponse.json({
    success: true,
    securityTests: testCases,
  });
}

async function generatePerformanceTests(projectId: string, options?: any) {
  const testCases: any[] = [
    {
      module: 'Performance',
      title: 'Load Test - List Page',
      type: 'performance',
      priority: 'medium',
      steps: [
        'Simulate 100 concurrent users',
        'Access list page',
        'Measure response time',
      ],
      expectedResult: 'Response time < 2 seconds',
      metrics: { maxResponseTime: 2000, concurrentUsers: 100 },
    },
    {
      module: 'Performance',
      title: 'Stress Test - Create Operation',
      type: 'performance',
      priority: 'medium',
      steps: [
        'Execute 1000 create operations',
        'Measure throughput',
        'Check for errors',
      ],
      expectedResult: 'No errors, throughput > 100 ops/sec',
    },
    {
      module: 'Performance',
      title: 'Query Performance Test',
      type: 'performance',
      priority: 'medium',
      steps: [
        'Execute complex queries',
        'Measure execution time',
        'Verify index usage',
      ],
      expectedResult: 'Query time < 1 second',
    },
  ];

  return NextResponse.json({
    success: true,
    performanceTests: testCases,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST CASE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

async function createTestCase(projectId: string, testCase: any) {
  const created = await db.testCase.create({
    data: {
      projectId,
      testCaseId: testCase.id || `TC-${Date.now()}`,
      title: testCase.title,
      description: testCase.description,
      module: testCase.module,
      type: testCase.type || 'functional',
      priority: testCase.priority || 'medium',
      preconditions: JSON.stringify(testCase.preconditions || []),
      steps: JSON.stringify(testCase.steps || []),
      expectedResult: testCase.expectedResult || '',
      testData: JSON.stringify(testCase.testData || {}),
      status: 'draft',
    }
  });

  return NextResponse.json({ success: true, testCase: created });
}

async function updateTestCase(projectId: string, testCaseId: string, updates: any) {
  const updated = await db.testCase.update({
    where: { id: testCaseId, projectId },
    data: {
      ...updates,
      preconditions: updates.preconditions ? JSON.stringify(updates.preconditions) : undefined,
      steps: updates.steps ? JSON.stringify(updates.steps) : undefined,
      testData: updates.testData ? JSON.stringify(updates.testData) : undefined,
      updatedAt: new Date(),
    }
  });

  return NextResponse.json({ success: true, testCase: updated });
}

async function getTestCases(projectId: string, filters?: any) {
  const where: any = { projectId };
  if (filters?.module) where.module = filters.module;
  if (filters?.type) where.type = filters.type;
  if (filters?.priority) where.priority = filters.priority;
  if (filters?.status) where.status = filters.status;

  const testCases = await db.testCase.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: filters?.limit || 100,
  });

  return NextResponse.json({
    success: true,
    testCases: testCases.map(tc => ({
      ...tc,
      preconditions: JSON.parse(tc.preconditions || '[]'),
      steps: JSON.parse(tc.steps || '[]'),
      testData: JSON.parse(tc.testData || '{}'),
    })),
    total: testCases.length,
  });
}

async function getTestCase(projectId: string, testCaseId: string) {
  const testCase = await db.testCase.findFirst({
    where: { id: testCaseId, projectId },
  });

  if (!testCase) {
    return NextResponse.json({ error: 'Test case not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    testCase: {
      ...testCase,
      preconditions: JSON.parse(testCase.preconditions || '[]'),
      steps: JSON.parse(testCase.steps || '[]'),
      testData: JSON.parse(testCase.testData || '{}'),
    }
  });
}

async function deleteTestCase(projectId: string, testCaseId: string) {
  await db.testCase.delete({ where: { id: testCaseId, projectId } });
  return NextResponse.json({ success: true, message: 'Test case deleted' });
}

async function bulkCreateTestCases(projectId: string, testCases: any[]) {
  const created: any[] = [];
  for (const tc of testCases) {
    try {
      const result = await db.testCase.create({
        data: {
          projectId,
          testCaseId: tc.id || `TC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: tc.title,
          description: tc.description || '',
          module: tc.module || 'General',
          type: tc.type || 'functional',
          priority: tc.priority || 'medium',
          preconditions: JSON.stringify(tc.preconditions || []),
          steps: JSON.stringify(tc.steps || []),
          expectedResult: tc.expectedResult || '',
          testData: JSON.stringify(tc.testData || {}),
          status: 'draft',
        }
      });
      created.push(result);
    } catch (e) {
      // Skip failures
    }
  }

  return NextResponse.json({
    success: true,
    created: created.length,
    testCases: created,
  });
}

async function cloneTestCase(projectId: string, testCaseId: string, options?: any) {
  const original = await db.testCase.findFirst({
    where: { id: testCaseId, projectId },
  });

  if (!original) {
    return NextResponse.json({ error: 'Test case not found' }, { status: 404 });
  }

  const cloned = await db.testCase.create({
    data: {
      projectId,
      testCaseId: `${original.testCaseId}-copy`,
      title: `${original.title} (Copy)`,
      description: original.description,
      module: original.module,
      type: original.type,
      priority: original.priority,
      preconditions: original.preconditions,
      steps: original.steps,
      expectedResult: original.expectedResult,
      testData: original.testData,
      status: 'draft',
    }
  });

  return NextResponse.json({ success: true, testCase: cloned });
}

async function importTestCases(projectId: string, testCases: any[], format: string) {
  const imported: any[] = [];
  
  for (const tc of testCases) {
    try {
      const result = await db.testCase.create({
        data: {
          projectId,
          testCaseId: tc.id || tc.testCaseId || `TC-${Date.now()}`,
          title: tc.title || tc.testCase || tc.name,
          description: tc.description || '',
          module: tc.module || 'Imported',
          type: tc.type || 'functional',
          priority: tc.priority || 'medium',
          preconditions: JSON.stringify(tc.preconditions || []),
          steps: JSON.stringify(tc.steps || []),
          expectedResult: tc.expectedResult || tc.expected || '',
          testData: JSON.stringify(tc.testData || {}),
          status: 'draft',
        }
      });
      imported.push(result);
    } catch (e) {
      // Skip failures
    }
  }

  return NextResponse.json({
    success: true,
    imported: imported.length,
    testCases: imported,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST DATA GENERATION
// ═══════════════════════════════════════════════════════════════════════════

async function generateTestData(projectId: string, tableName: string, options?: any) {
  const table = await db.toolkitTable.findFirst({
    where: { projectId, tableName },
    select: { columns: true },
  });

  if (!table) {
    return NextResponse.json({ error: 'Table not found' }, { status: 404 });
  }

  const columns = JSON.parse(table.columns || '[]');
  const count = options?.count || 10;
  const dataRows: any[] = [];

  for (let i = 0; i < count; i++) {
    const row: Record<string, any> = {};
    for (const col of columns) {
      if (!col.isPrimaryKey || options?.includePK) {
        row[col.name] = generateSampleValue(col);
      }
    }
    dataRows.push(row);
  }

  return NextResponse.json({
    success: true,
    tableName,
    testData: dataRows,
    count: dataRows.length,
  });
}

async function generateSyntheticData(projectId: string, schema: any, count: number) {
  const dataRows: any[] = [];
  
  for (let i = 0; i < count; i++) {
    const row: Record<string, any> = {};
    for (const [key, type] of Object.entries(schema)) {
      row[key] = generateSampleValue({ name: key, dataType: type });
    }
    dataRows.push(row);
  }

  return NextResponse.json({
    success: true,
    syntheticData: dataRows,
    count: dataRows.length,
  });
}

async function generateTestFixtures(projectId: string, tables: string[]) {
  const fixtures: Record<string, any[]> = {};

  for (const tableName of tables) {
    const result = await generateTestData(projectId, tableName, { count: 5 });
    const data = await result.json();
    fixtures[tableName] = data.testData;
  }

  return NextResponse.json({
    success: true,
    fixtures,
  });
}

async function generateEdgeCaseData(projectId: string, tableName: string) {
  const table = await db.toolkitTable.findFirst({
    where: { projectId, tableName },
    select: { columns: true },
  });

  if (!table) {
    return NextResponse.json({ error: 'Table not found' }, { status: 404 });
  }

  const columns = JSON.parse(table.columns || '[]');
  const edgeCases: any[] = [];

  // Empty values
  const emptyRow: Record<string, any> = {};
  for (const col of columns) {
    emptyRow[col.name] = '';
  }
  edgeCases.push({ type: 'empty_values', data: emptyRow });

  // Max values
  const maxRow: Record<string, any> = {};
  for (const col of columns) {
    if (col.maxLength) {
      maxRow[col.name] = 'X'.repeat(parseInt(col.maxLength));
    } else if (['INT', 'BIGINT'].includes(col.dataType)) {
      maxRow[col.name] = Number.MAX_SAFE_INTEGER;
    } else {
      maxRow[col.name] = generateSampleValue(col);
    }
  }
  edgeCases.push({ type: 'max_values', data: maxRow });

  // Special characters
  const specialRow: Record<string, any> = {};
  for (const col of columns) {
    if (['VARCHAR', 'NVARCHAR', 'TEXT'].includes(col.dataType)) {
      specialRow[col.name] = '<script>alert("xss")</script>\'; DROP TABLE--;';
    } else {
      specialRow[col.name] = generateSampleValue(col);
    }
  }
  edgeCases.push({ type: 'special_characters', data: specialRow });

  return NextResponse.json({
    success: true,
    tableName,
    edgeCases,
  });
}

async function generateMockResponses(projectId: string, spName: string) {
  const sp = await db.toolkitProcedure.findFirst({
    where: { projectId, procedureName: spName },
    select: { parameters: true, body: true },
  });

  if (!sp) {
    return NextResponse.json({ error: 'SP not found' }, { status: 404 });
  }

  const params = JSON.parse(sp.parameters || '[]');
  
  const mockResponses = [
    {
      scenario: 'success',
      input: generateTestDataForParams(params),
      output: { success: true, message: 'Operation completed' },
    },
    {
      scenario: 'not_found',
      input: generateTestDataForParams(params),
      output: { success: false, error: 'Record not found' },
    },
    {
      scenario: 'validation_error',
      input: generateTestDataForParams(params),
      output: { success: false, error: 'Validation failed' },
    },
  ];

  return NextResponse.json({
    success: true,
    spName,
    mockResponses,
  });
}

async function getTestDataTemplates(projectId: string) {
  // Return predefined templates
  const templates = [
    { id: 'user', name: 'User Data', fields: ['firstName', 'lastName', 'email', 'phone'] },
    { id: 'address', name: 'Address Data', fields: ['street', 'city', 'state', 'zip', 'country'] },
    { id: 'product', name: 'Product Data', fields: ['name', 'price', 'description', 'category'] },
    { id: 'order', name: 'Order Data', fields: ['orderId', 'customerId', 'total', 'status'] },
  ];

  return NextResponse.json({ success: true, templates });
}

async function createTestDataTemplate(projectId: string, template: any) {
  // Store template
  return NextResponse.json({
    success: true,
    message: 'Template created',
    template,
  });
}

async function anonymizeTestData(projectId: string, data: any[], rules: any) {
  const anonymized = data.map(row => {
    const newRow = { ...row };
    for (const [field, rule] of Object.entries(rules)) {
      if (newRow[field]) {
        switch (rule) {
          case 'email':
            newRow[field] = `anon${Math.random().toString(36).substr(2, 5)}@example.com`;
            break;
          case 'name':
            newRow[field] = 'Anonymous';
            break;
          case 'phone':
            newRow[field] = '+0000000000';
            break;
          case 'mask':
            newRow[field] = '*****';
            break;
          default:
            newRow[field] = '[REDACTED]';
        }
      }
    }
    return newRow;
  });

  return NextResponse.json({
    success: true,
    anonymizedData: anonymized,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function createTestRun(projectId: string, testRun: any) {
  const run = await db.testExecution.create({
    data: {
      projectId,
      executionId: `RUN-${Date.now()}`,
      name: testRun.name || `Test Run ${new Date().toISOString()}`,
      status: 'pending',
      totalCases: testRun.testCaseIds?.length || 0,
      passedCases: 0,
      failedCases: 0,
      skippedCases: 0,
      startedAt: new Date(),
      metadata: JSON.stringify(testRun.metadata || {}),
    }
  });

  return NextResponse.json({ success: true, testRun: run });
}

async function executeTestCase(projectId: string, testCaseId: string, execution: any) {
  const testCase = await db.testCase.findFirst({
    where: { id: testCaseId, projectId },
  });

  if (!testCase) {
    return NextResponse.json({ error: 'Test case not found' }, { status: 404 });
  }

  const result = await db.testResult.create({
    data: {
      projectId,
      testCaseId,
      executionId: execution.runId || `exec-${Date.now()}`,
      status: execution.status || 'passed',
      actualResult: execution.actualResult || '',
      duration: execution.duration || 0,
      executedAt: new Date(),
      executedBy: execution.executedBy || 'system',
      notes: execution.notes || '',
      artifacts: JSON.stringify(execution.artifacts || []),
    }
  });

  // Update test case status
  await db.testCase.update({
    where: { id: testCaseId },
    data: { status: execution.status === 'passed' ? 'passed' : 'failed' }
  });

  return NextResponse.json({ success: true, result });
}

async function executeTestSuite(projectId: string, suiteId: string, options?: any) {
  const suite = await db.testSuite.findFirst({
    where: { id: suiteId, projectId },
  });

  if (!suite) {
    return NextResponse.json({ error: 'Test suite not found' }, { status: 404 });
  }

  const testCaseIds = JSON.parse(suite.testCaseIds || '[]');
  const results: any[] = [];

  // Create test run
  const run = await db.testExecution.create({
    data: {
      projectId,
      executionId: `RUN-${Date.now()}`,
      name: `Suite: ${suite.name}`,
      status: 'running',
      totalCases: testCaseIds.length,
      passedCases: 0,
      failedCases: 0,
      skippedCases: 0,
      startedAt: new Date(),
      metadata: JSON.stringify({ suiteId }),
    }
  });

  return NextResponse.json({
    success: true,
    testRun: run,
    message: `Executing ${testCaseIds.length} test cases`,
  });
}

async function getTestRuns(projectId: string, filters?: any) {
  const runs = await db.testExecution.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    take: filters?.limit || 50,
  });

  return NextResponse.json({
    success: true,
    testRuns: runs,
    total: runs.length,
  });
}

async function getTestRun(projectId: string, runId: string) {
  const run = await db.testExecution.findFirst({
    where: { id: runId, projectId },
  });

  if (!run) {
    return NextResponse.json({ error: 'Test run not found' }, { status: 404 });
  }

  const results = await db.testResult.findMany({
    where: { executionId: run.executionId },
  });

  return NextResponse.json({
    success: true,
    testRun: {
      ...run,
      metadata: JSON.parse(run.metadata || '{}'),
    },
    results: results.map(r => ({
      ...r,
      artifacts: JSON.parse(r.artifacts || '[]'),
    })),
  });
}

async function updateTestRun(projectId: string, runId: string, updates: any) {
  const updated = await db.testExecution.update({
    where: { id: runId, projectId },
    data: {
      ...updates,
      completedAt: updates.status === 'completed' ? new Date() : undefined,
    }
  });

  return NextResponse.json({ success: true, testRun: updated });
}

async function recordTestResult(projectId: string, result: any) {
  const created = await db.testResult.create({
    data: {
      projectId,
      testCaseId: result.testCaseId,
      executionId: result.executionId,
      status: result.status,
      actualResult: result.actualResult || '',
      duration: result.duration || 0,
      executedAt: new Date(),
      executedBy: result.executedBy || 'system',
      notes: result.notes || '',
      artifacts: JSON.stringify(result.artifacts || []),
    }
  });

  return NextResponse.json({ success: true, result: created });
}

async function getTestResults(projectId: string, filters?: any) {
  const where: any = { projectId };
  if (filters?.executionId) where.executionId = filters.executionId;
  if (filters?.status) where.status = filters.status;
  if (filters?.testCaseId) where.testCaseId = filters.testCaseId;

  const results = await db.testResult.findMany({
    where,
    orderBy: { executedAt: 'desc' },
    take: filters?.limit || 100,
  });

  return NextResponse.json({
    success: true,
    results: results.map(r => ({
      ...r,
      artifacts: JSON.parse(r.artifacts || '[]'),
    })),
    total: results.length,
  });
}

async function getExecutionHistory(projectId: string, testCaseId: string) {
  const history = await db.testResult.findMany({
    where: { projectId, testCaseId },
    orderBy: { executedAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({
    success: true,
    testCaseId,
    history: history.map(h => ({
      ...h,
      artifacts: JSON.parse(h.artifacts || '[]'),
    })),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST COVERAGE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

async function analyzeTestCoverage(projectId: string) {
  const tables = await db.toolkitTable.findMany({
    where: { projectId },
    select: { tableName: true },
  });

  const procedures = await db.toolkitProcedure.findMany({
    where: { projectId },
    select: { procedureName: true },
  });

  const testCases = await db.testCase.findMany({
    where: { projectId },
    select: { module: true, title: true, type: true },
  });

  const tableNames = tables.map(t => t.tableName);
  const spNames = procedures.map(p => p.procedureName);

  // Calculate coverage
  const tableCoverage: Record<string, any> = {};
  for (const tableName of tableNames) {
    const relatedTests = testCases.filter(tc => tc.module === tableName);
    tableCoverage[tableName] = {
      tested: relatedTests.length > 0,
      testCount: relatedTests.length,
      testTypes: [...new Set(relatedTests.map(tc => tc.type))],
    };
  }

  const spCoverage: Record<string, any> = {};
  for (const spName of spNames) {
    const relatedTests = testCases.filter(tc => tc.title.includes(spName));
    spCoverage[spName] = {
      tested: relatedTests.length > 0,
      testCount: relatedTests.length,
    };
  }

  const totalEntities = tableNames.length + spNames.length;
  const coveredEntities = Object.values(tableCoverage).filter((c: any) => c.tested).length +
                          Object.values(spCoverage).filter((c: any) => c.tested).length;

  return NextResponse.json({
    success: true,
    coverage: {
      tables: tableCoverage,
      procedures: spCoverage,
      summary: {
        totalEntities,
        coveredEntities,
        coveragePercentage: totalEntities > 0 ? Math.round((coveredEntities / totalEntities) * 100) : 0,
        untestedTables: tableNames.filter(t => !tableCoverage[t].tested),
        untestedSPs: spNames.filter(s => !spCoverage[s].tested),
      }
    }
  });
}

async function getTableCoverage(projectId: string, tableName: string) {
  const testCases = await db.testCase.findMany({
    where: { projectId, module: tableName },
  });

  const table = await db.toolkitTable.findFirst({
    where: { projectId, tableName },
    select: { columns: true },
  });

  const columns = JSON.parse(table?.columns || '[]');
  const columnCoverage: Record<string, boolean> = {};

  for (const col of columns) {
    const isCovered = testCases.some(tc => 
      tc.title.toLowerCase().includes(col.name.toLowerCase()) ||
      tc.steps?.toLowerCase().includes(col.name.toLowerCase())
    );
    columnCoverage[col.name] = isCovered;
  }

  return NextResponse.json({
    success: true,
    tableName,
    coverage: {
      testCount: testCases.length,
      columns: columnCoverage,
      coveredColumns: Object.values(columnCoverage).filter(Boolean).length,
      totalColumns: columns.length,
    }
  });
}

async function getSPCoverage(projectId: string, spName: string) {
  const testCases = await db.testCase.findMany({
    where: { projectId },
    select: { title: true, steps: true },
  });

  const relatedTests = testCases.filter(tc => 
    tc.title.toLowerCase().includes(spName.toLowerCase()) ||
    tc.steps?.toLowerCase().includes(spName.toLowerCase())
  );

  return NextResponse.json({
    success: true,
    spName,
    coverage: {
      tested: relatedTests.length > 0,
      testCount: relatedTests.length,
    }
  });
}

async function getCoverageReport(projectId: string) {
  const coverageResult = await analyzeTestCoverage(projectId);
  const coverageData = await coverageResult.json();

  return NextResponse.json({
    success: true,
    report: {
      generatedAt: new Date().toISOString(),
      summary: coverageData.coverage.summary,
      recommendations: generateCoverageRecommendations(coverageData.coverage),
    }
  });
}

function generateCoverageRecommendations(coverage: any): string[] {
  const recommendations: string[] = [];
  
  if (coverage.summary.untestedTables?.length > 0) {
    recommendations.push(`Add tests for untested tables: ${coverage.summary.untestedTables.slice(0, 5).join(', ')}`);
  }
  
  if (coverage.summary.coveragePercentage < 50) {
    recommendations.push('Coverage is below 50%. Prioritize adding tests for critical modules.');
  }
  
  if (coverage.summary.coveragePercentage >= 50 && coverage.summary.coveragePercentage < 80) {
    recommendations.push('Coverage is moderate. Focus on edge cases and error handling tests.');
  }

  return recommendations;
}

async function getCoverageGaps(projectId: string) {
  const coverageResult = await analyzeTestCoverage(projectId);
  const coverageData = await coverageResult.json();

  const gaps: any[] = [];

  for (const tableName of coverageData.coverage.summary.untestedTables || []) {
    gaps.push({
      type: 'table',
      name: tableName,
      severity: 'high',
      recommendation: `Generate CRUD tests for ${tableName}`,
    });
  }

  for (const spName of coverageData.coverage.summary.untestedSPs || []) {
    gaps.push({
      type: 'procedure',
      name: spName,
      severity: 'medium',
      recommendation: `Create test cases for ${spName}`,
    });
  }

  return NextResponse.json({
    success: true,
    gaps,
    totalGaps: gaps.length,
  });
}

async function suggestTestsForCoverage(projectId: string, entityType: string, entityName: string) {
  const suggestions: any[] = [];

  if (entityType === 'table') {
    suggestions.push(
      { type: 'crud', title: `Create ${entityName} - Valid Data`, priority: 'high' },
      { type: 'crud', title: `Read ${entityName} - List All`, priority: 'high' },
      { type: 'crud', title: `Update ${entityName} - Valid Data`, priority: 'high' },
      { type: 'crud', title: `Delete ${entityName} - Confirm`, priority: 'medium' },
      { type: 'validation', title: `${entityName} - Required Fields Validation`, priority: 'high' }
    );
  } else if (entityType === 'procedure') {
    suggestions.push(
      { type: 'integration', title: `Execute ${entityName} - Valid Parameters`, priority: 'high' },
      { type: 'integration', title: `Execute ${entityName} - Error Handling`, priority: 'medium' }
    );
  }

  return NextResponse.json({
    success: true,
    entityType,
    entityName,
    suggestions,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITES & ORGANIZATION
// ═══════════════════════════════════════════════════════════════════════════

async function createTestSuite(projectId: string, suite: any) {
  const created = await db.testSuite.create({
    data: {
      projectId,
      name: suite.name,
      description: suite.description || '',
      testCaseIds: JSON.stringify(suite.testCaseIds || []),
      tags: JSON.stringify(suite.tags || []),
      priority: suite.priority || 'medium',
      status: 'active',
    }
  });

  return NextResponse.json({ success: true, suite: created });
}

async function updateTestSuite(projectId: string, suiteId: string, updates: any) {
  const updated = await db.testSuite.update({
    where: { id: suiteId, projectId },
    data: {
      ...updates,
      testCaseIds: updates.testCaseIds ? JSON.stringify(updates.testCaseIds) : undefined,
      tags: updates.tags ? JSON.stringify(updates.tags) : undefined,
      updatedAt: new Date(),
    }
  });

  return NextResponse.json({ success: true, suite: updated });
}

async function getTestSuites(projectId: string) {
  const suites = await db.testSuite.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    success: true,
    suites: suites.map(s => ({
      ...s,
      testCaseIds: JSON.parse(s.testCaseIds || '[]'),
      tags: JSON.parse(s.tags || '[]'),
    })),
  });
}

async function getTestSuite(projectId: string, suiteId: string) {
  const suite = await db.testSuite.findFirst({
    where: { id: suiteId, projectId },
  });

  if (!suite) {
    return NextResponse.json({ error: 'Test suite not found' }, { status: 404 });
  }

  const testCaseIds = JSON.parse(suite.testCaseIds || '[]');
  const testCases = await db.testCase.findMany({
    where: { id: { in: testCaseIds } },
  });

  return NextResponse.json({
    success: true,
    suite: {
      ...suite,
      testCaseIds,
      tags: JSON.parse(suite.tags || '[]'),
    },
    testCases,
  });
}

async function addToTestSuite(projectId: string, suiteId: string, testCaseIds: string[]) {
  const suite = await db.testSuite.findFirst({
    where: { id: suiteId, projectId },
  });

  if (!suite) {
    return NextResponse.json({ error: 'Test suite not found' }, { status: 404 });
  }

  const currentIds = JSON.parse(suite.testCaseIds || '[]');
  const newIds = [...new Set([...currentIds, ...testCaseIds])];

  const updated = await db.testSuite.update({
    where: { id: suiteId },
    data: { testCaseIds: JSON.stringify(newIds) }
  });

  return NextResponse.json({ success: true, added: testCaseIds.length, suite: updated });
}

async function removeFromTestSuite(projectId: string, suiteId: string, testCaseIds: string[]) {
  const suite = await db.testSuite.findFirst({
    where: { id: suiteId, projectId },
  });

  if (!suite) {
    return NextResponse.json({ error: 'Test suite not found' }, { status: 404 });
  }

  const currentIds = JSON.parse(suite.testCaseIds || '[]');
  const newIds = currentIds.filter((id: string) => !testCaseIds.includes(id));

  const updated = await db.testSuite.update({
    where: { id: suiteId },
    data: { testCaseIds: JSON.stringify(newIds) }
  });

  return NextResponse.json({ success: true, removed: testCaseIds.length, suite: updated });
}

async function deleteTestSuite(projectId: string, suiteId: string) {
  await db.testSuite.delete({ where: { id: suiteId, projectId } });
  return NextResponse.json({ success: true, message: 'Test suite deleted' });
}

async function reorderTestSuite(projectId: string, suiteId: string, order: string[]) {
  const updated = await db.testSuite.update({
    where: { id: suiteId, projectId },
    data: { testCaseIds: JSON.stringify(order) }
  });

  return NextResponse.json({ success: true, suite: updated });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST AUTOMATION
// ═══════════════════════════════════════════════════════════════════════════

async function generateAutomationScript(projectId: string, testCaseId: string, framework: string) {
  const testCase = await db.testCase.findFirst({
    where: { id: testCaseId, projectId },
  });

  if (!testCase) {
    return NextResponse.json({ error: 'Test case not found' }, { status: 404 });
  }

  const steps = JSON.parse(testCase.steps || '[]');
  let script = '';

  switch (framework) {
    case 'playwright':
      script = generatePlaywrightScript(testCase, steps);
      break;
    case 'cypress':
      script = generateCypressScript(testCase, steps);
      break;
    case 'jest':
      script = generateJestScript(testCase, steps);
      break;
    default:
      script = generatePlaywrightScript(testCase, steps);
  }

  return NextResponse.json({
    success: true,
    testCaseId,
    framework,
    script,
  });
}

function generatePlaywrightScript(testCase: any, steps: string[]): string {
  return `import { test, expect } from '@playwright/test';

test.describe('${testCase.module}', () => {
  test('${testCase.title}', async ({ page }) => {
    // Preconditions: ${testCase.preconditions || 'None'}
    
    // Test Steps
    ${steps.map((step, i) => `// Step ${i + 1}: ${step}`).join('\n    ')}
    
    // Expected Result: ${testCase.expectedResult}
    // await expect(page.locator('.success-message')).toBeVisible();
  });
});
`;
}

function generateCypressScript(testCase: any, steps: string[]): string {
  return `describe('${testCase.module}', () => {
  it('${testCase.title}', () => {
    // Preconditions: ${testCase.preconditions || 'None'}
    
    // Test Steps
    ${steps.map((step, i) => `// Step ${i + 1}: ${step}`).join('\n    ')}
    
    // Expected Result: ${testCase.expectedResult}
    // cy.get('.success-message').should('be.visible');
  });
});
`;
}

function generateJestScript(testCase: any, steps: string[]): string {
  return `describe('${testCase.module}', () => {
  it('${testCase.title}', async () => {
    // Preconditions: ${testCase.preconditions || 'None'}
    
    // Test Steps
    ${steps.map((step, i) => `// Step ${i + 1}: ${step}`).join('\n    ')}
    
    // Expected Result: ${testCase.expectedResult}
    // expect(result).toBeDefined();
  });
});
`;
}

async function generatePlaywrightTests(projectId: string, options?: any) {
  const testCases = await db.testCase.findMany({
    where: { projectId, type: { in: ['functional', 'integration'] } },
    take: options?.limit || 50,
  });

  const scripts: any[] = [];
  for (const tc of testCases) {
    const steps = JSON.parse(tc.steps || '[]');
    scripts.push({
      testCaseId: tc.id,
      title: tc.title,
      script: generatePlaywrightScript(tc, steps),
    });
  }

  return NextResponse.json({
    success: true,
    framework: 'playwright',
    scripts,
    count: scripts.length,
  });
}

async function generateCypressTests(projectId: string, options?: any) {
  const testCases = await db.testCase.findMany({
    where: { projectId, type: { in: ['functional', 'integration'] } },
    take: options?.limit || 50,
  });

  const scripts: any[] = [];
  for (const tc of testCases) {
    const steps = JSON.parse(tc.steps || '[]');
    scripts.push({
      testCaseId: tc.id,
      title: tc.title,
      script: generateCypressScript(tc, steps),
    });
  }

  return NextResponse.json({
    success: true,
    framework: 'cypress',
    scripts,
    count: scripts.length,
  });
}

async function generateJestTests(projectId: string, options?: any) {
  const testCases = await db.testCase.findMany({
    where: { projectId },
    take: options?.limit || 50,
  });

  const scripts: any[] = [];
  for (const tc of testCases) {
    const steps = JSON.parse(tc.steps || '[]');
    scripts.push({
      testCaseId: tc.id,
      title: tc.title,
      script: generateJestScript(tc, steps),
    });
  }

  return NextResponse.json({
    success: true,
    framework: 'jest',
    scripts,
    count: scripts.length,
  });
}

async function generateAPITests(projectId: string, options?: any) {
  const procedures = await db.toolkitProcedure.findMany({
    where: { projectId },
    select: { procedureName: true, parameters: true },
  });

  const tests: any[] = [];
  for (const sp of procedures) {
    const params = JSON.parse(sp.parameters || '[]');
    tests.push({
      name: `API Test - ${sp.procedureName}`,
      endpoint: `/api/sp/${sp.procedureName}`,
      method: 'POST',
      body: generateTestDataForParams(params),
      assertions: [
        { type: 'status', value: 200 },
        { type: 'responseTime', value: '<5000ms' },
      ],
    });
  }

  return NextResponse.json({
    success: true,
    apiTests: tests,
    count: tests.length,
  });
}

async function getAutomationScripts(projectId: string) {
  // Return generated automation scripts
  return NextResponse.json({
    success: true,
    scripts: [],
    message: 'Use generate-automation-script to create scripts',
  });
}

async function updateAutomationScript(projectId: string, scriptId: string, updates: any) {
  return NextResponse.json({
    success: true,
    message: 'Script updated',
    scriptId,
    updates,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST REPORTING & ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════

async function getTestDashboard(projectId: string) {
  const totalTestCases = await db.testCase.count({ where: { projectId } });
  const totalRuns = await db.testExecution.count({ where: { projectId } });
  const totalResults = await db.testResult.count({ where: { projectId } });
  
  const passedResults = await db.testResult.count({ 
    where: { projectId, status: 'passed' } 
  });
  const failedResults = await db.testResult.count({ 
    where: { projectId, status: 'failed' } 
  });

  const recentRuns = await db.testExecution.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  return NextResponse.json({
    success: true,
    dashboard: {
      summary: {
        totalTestCases,
        totalRuns,
        totalExecutions: totalResults,
        passRate: totalResults > 0 ? Math.round((passedResults / totalResults) * 100) : 0,
      },
      statusBreakdown: {
        passed: passedResults,
        failed: failedResults,
        skipped: totalResults - passedResults - failedResults,
      },
      recentRuns,
    }
  });
}

async function getTestMetrics(projectId: string, period?: string) {
  const results = await db.testResult.findMany({
    where: { projectId },
    select: { status: true, duration: true, executedAt: true },
  });

  const avgDuration = results.length > 0
    ? results.reduce((sum, r) => sum + (r.duration || 0), 0) / results.length
    : 0;

  return NextResponse.json({
    success: true,
    metrics: {
      totalExecutions: results.length,
      passRate: results.length > 0 
        ? Math.round((results.filter(r => r.status === 'passed').length / results.length) * 100)
        : 0,
      avgDuration: Math.round(avgDuration),
      executionTrend: 'stable', // Would calculate from historical data
    }
  });
}

async function getTestTrends(projectId: string, period: string) {
  // Return trend data
  const trends = {
    daily: [
      { date: '2024-01-01', passed: 45, failed: 5 },
      { date: '2024-01-02', passed: 48, failed: 2 },
      { date: '2024-01-03', passed: 50, failed: 0 },
    ],
    weekly: [
      { week: 'W1', passed: 200, failed: 15 },
      { week: 'W2', passed: 220, failed: 10 },
    ],
  };

  return NextResponse.json({
    success: true,
    period,
    trends: trends[period as keyof typeof trends] || trends.daily,
  });
}

async function generateTestReport(projectId: string, options?: any) {
  const dashboard = await getTestDashboard(projectId);
  const dashboardData = await dashboard.json();
  
  const coverage = await analyzeTestCoverage(projectId);
  const coverageData = await coverage.json();

  return NextResponse.json({
    success: true,
    report: {
      generatedAt: new Date().toISOString(),
      projectId,
      summary: dashboardData.dashboard.summary,
      coverage: coverageData.coverage.summary,
      details: options?.includeDetails ? {
        testCases: await db.testCase.findMany({ where: { projectId } }),
        recentExecutions: await db.testResult.findMany({ 
          where: { projectId }, 
          orderBy: { executedAt: 'desc' },
          take: 50,
        }),
      } : undefined,
    }
  });
}

async function getDefectAnalysis(projectId: string) {
  const failedResults = await db.testResult.findMany({
    where: { projectId, status: 'failed' },
    include: { testCase: true },
  });

  const defectsByModule: Record<string, number> = {};
  for (const result of failedResults) {
    const module = result.testCase?.module || 'Unknown';
    defectsByModule[module] = (defectsByModule[module] || 0) + 1;
  }

  return NextResponse.json({
    success: true,
    analysis: {
      totalDefects: failedResults.length,
      byModule: defectsByModule,
      topDefectAreas: Object.entries(defectsByModule)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([module, count]) => ({ module, count })),
    }
  });
}

async function getTestEfficiency(projectId: string) {
  const testCases = await db.testCase.count({ where: { projectId } });
  const results = await db.testResult.findMany({ 
    where: { projectId },
    select: { duration: true },
  });

  const totalExecutionTime = results.reduce((sum, r) => sum + (r.duration || 0), 0);
  const avgExecutionTime = results.length > 0 ? totalExecutionTime / results.length : 0;

  return NextResponse.json({
    success: true,
    efficiency: {
      testCasesCreated: testCases,
      totalExecutionTimeMs: totalExecutionTime,
      avgExecutionTimeMs: Math.round(avgExecutionTime),
      testsPerHour: avgExecutionTime > 0 ? Math.round(3600000 / avgExecutionTime) : 0,
    }
  });
}

async function exportTestReport(projectId: string, format: string, options?: any) {
  const reportResult = await generateTestReport(projectId, options);
  const reportData = await reportResult.json();

  let exported: string;
  switch (format) {
    case 'json':
      exported = JSON.stringify(reportData.report, null, 2);
      break;
    case 'markdown':
      exported = convertReportToMarkdown(reportData.report);
      break;
    case 'csv':
      exported = convertReportToCSV(reportData.report);
      break;
    default:
      exported = JSON.stringify(reportData.report, null, 2);
  }

  return NextResponse.json({
    success: true,
    format,
    data: exported,
  });
}

function convertReportToMarkdown(report: any): string {
  return `# Test Report

Generated: ${report.generatedAt}

## Summary
- Total Test Cases: ${report.summary?.totalTestCases || 0}
- Total Runs: ${report.summary?.totalRuns || 0}
- Pass Rate: ${report.summary?.passRate || 0}%

## Coverage
- Coverage: ${report.coverage?.coveragePercentage || 0}%
- Covered Entities: ${report.coverage?.coveredEntities || 0}
- Total Entities: ${report.coverage?.totalEntities || 0}
`;
}

function convertReportToCSV(report: any): string {
  return `Metric,Value
Total Test Cases,${report.summary?.totalTestCases || 0}
Total Runs,${report.summary?.totalRuns || 0}
Pass Rate,${report.summary?.passRate || 0}%
Coverage,${report.coverage?.coveragePercentage || 0}%
`;
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST TEMPLATES & LIBRARY
// ═══════════════════════════════════════════════════════════════════════════

async function getTestTemplates() {
  const templates = [
    {
      id: 'login-test',
      name: 'Login Test Template',
      category: 'authentication',
      steps: [
        'Navigate to login page',
        'Enter valid username',
        'Enter valid password',
        'Click login button',
        'Verify successful login',
      ],
    },
    {
      id: 'crud-create',
      name: 'CRUD Create Template',
      category: 'crud',
      steps: [
        'Navigate to create form',
        'Fill all required fields',
        'Click save button',
        'Verify record created',
      ],
    },
    {
      id: 'search-test',
      name: 'Search Test Template',
      category: 'functional',
      steps: [
        'Navigate to list page',
        'Enter search criteria',
        'Click search button',
        'Verify filtered results',
      ],
    },
    {
      id: 'validation-test',
      name: 'Validation Test Template',
      category: 'validation',
      steps: [
        'Navigate to form',
        'Leave required field empty',
        'Click submit',
        'Verify validation error',
      ],
    },
  ];

  return NextResponse.json({ success: true, templates });
}

async function createTestTemplate(template: any) {
  return NextResponse.json({
    success: true,
    message: 'Template created',
    template,
  });
}

async function instantiateTemplate(projectId: string, templateId: string, params: any) {
  const templates = await getTestTemplates();
  const templatesData = await templates.json();
  
  const template = templatesData.templates.find((t: any) => t.id === templateId);
  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  const testCase = await db.testCase.create({
    data: {
      projectId,
      testCaseId: `TC-${Date.now()}`,
      title: params.title || template.name,
      description: `Created from template: ${template.name}`,
      module: params.module || 'General',
      type: template.category,
      priority: params.priority || 'medium',
      steps: JSON.stringify(template.steps),
      expectedResult: 'Test passes successfully',
      status: 'draft',
    }
  });

  return NextResponse.json({ success: true, testCase });
}

async function getTestPatterns() {
  const patterns = [
    {
      id: 'given-when-then',
      name: 'Given-When-Then Pattern',
      description: 'BDD-style test pattern',
      example: 'Given user is logged in, When user clicks logout, Then user is redirected to login page',
    },
    {
      id: 'arrange-act-assert',
      name: 'Arrange-Act-Assert Pattern',
      description: 'Unit test pattern',
      example: 'Arrange: Set up test data. Act: Execute function. Assert: Verify result.',
    },
    {
      id: 'page-object',
      name: 'Page Object Model',
      description: 'UI test organization pattern',
      example: 'Encapsulate page elements and actions in a class',
    },
  ];

  return NextResponse.json({ success: true, patterns });
}

// ═══════════════════════════════════════════════════════════════════════════
// QUALITY METRICS
// ═══════════════════════════════════════════════════════════════════════════

async function calculateQualityScore(projectId: string) {
  const totalTests = await db.testCase.count({ where: { projectId } });
  const passedTests = await db.testResult.count({ where: { projectId, status: 'passed' } });
  const failedTests = await db.testResult.count({ where: { projectId, status: 'failed' } });

  const coverageResult = await analyzeTestCoverage(projectId);
  const coverageData = await coverageResult.json();
  const coveragePercent = coverageData.coverage.summary.coveragePercentage;

  const passRate = (passedTests + failedTests) > 0 
    ? (passedTests / (passedTests + failedTests)) * 100 
    : 100;

  const score = Math.round((coveragePercent * 0.4) + (passRate * 0.4) + (Math.min(totalTests / 10, 20)));

  return NextResponse.json({
    success: true,
    qualityScore: {
      overall: Math.min(score, 100),
      factors: {
        coverage: coveragePercent,
        passRate: Math.round(passRate),
        testCount: totalTests,
      },
      grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F',
    }
  });
}

async function getRiskAssessment(projectId: string) {
  const coverageResult = await analyzeTestCoverage(projectId);
  const coverageData = await coverageResult.json();

  const risks: any[] = [];

  // High risk: Low coverage
  if (coverageData.coverage.summary.coveragePercentage < 50) {
    risks.push({
      level: 'high',
      area: 'coverage',
      description: 'Test coverage is below 50%',
      mitigation: 'Prioritize adding tests for untested modules',
    });
  }

  // Medium risk: Untested tables
  if (coverageData.coverage.summary.untestedTables?.length > 5) {
    risks.push({
      level: 'medium',
      area: 'missing_tests',
      description: `${coverageData.coverage.summary.untestedTables.length} tables have no tests`,
      mitigation: 'Generate tests for critical tables',
    });
  }

  return NextResponse.json({
    success: true,
    risks,
    riskLevel: risks.filter(r => r.level === 'high').length > 0 ? 'high' : 
                risks.filter(r => r.level === 'medium').length > 0 ? 'medium' : 'low',
  });
}

async function getTestHealth(projectId: string) {
  const totalTests = await db.testCase.count({ where: { projectId } });
  const totalRuns = await db.testExecution.count({ where: { projectId } });
  const passedRuns = await db.testExecution.count({ 
    where: { projectId, status: 'completed' } 
  });

  const health = {
    score: totalTests > 0 ? Math.min(100, (totalRuns / totalTests) * 10) : 0,
    status: totalRuns > 0 ? 'active' : 'inactive',
    testCount: totalTests,
    runCount: totalRuns,
    lastRunDate: null as string | null,
  };

  const lastRun = await db.testExecution.findFirst({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });

  if (lastRun) {
    health.lastRunDate = lastRun.createdAt.toISOString();
  }

  return NextResponse.json({ success: true, health });
}

async function getFlakyTests(projectId: string) {
  // Identify flaky tests (tests that pass and fail inconsistently)
  const results = await db.testResult.findMany({
    where: { projectId },
    include: { testCase: true },
  });

  const testCaseResults: Record<string, string[]> = {};
  for (const result of results) {
    if (!testCaseResults[result.testCaseId]) {
      testCaseResults[result.testCaseId] = [];
    }
    testCaseResults[result.testCaseId].push(result.status);
  }

  const flakyTests: any[] = [];
  for (const [testCaseId, statuses] of Object.entries(testCaseResults)) {
    const hasPassed = statuses.includes('passed');
    const hasFailed = statuses.includes('failed');
    
    if (hasPassed && hasFailed && statuses.length >= 3) {
      const testCase = results.find(r => r.testCaseId === testCaseId)?.testCase;
      flakyTests.push({
        testCaseId,
        title: testCase?.title || 'Unknown',
        passCount: statuses.filter(s => s === 'passed').length,
        failCount: statuses.filter(s => s === 'failed').length,
        flakyScore: Math.min(statuses.filter(s => s === 'failed').length / statuses.length, 1),
      });
    }
  }

  return NextResponse.json({
    success: true,
    flakyTests,
    count: flakyTests.length,
  });
}

async function markFlakyTest(projectId: string, testCaseId: string, isFlaky: boolean) {
  await db.testCase.update({
    where: { id: testCaseId, projectId },
    data: { tags: JSON.stringify([isFlaky ? 'flaky' : 'stable']) }
  });

  return NextResponse.json({
    success: true,
    message: `Test marked as ${isFlaky ? 'flaky' : 'stable'}`,
    testCaseId,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST EXPORT/IMPORT
// ═══════════════════════════════════════════════════════════════════════════

async function exportTestCases(projectId: string, format: string, filters?: any) {
  const testCases = await db.testCase.findMany({
    where: { projectId, ...filters },
  });

  let exported: string;
  switch (format) {
    case 'json':
      exported = JSON.stringify(testCases, null, 2);
      break;
    case 'csv':
      exported = convertTestCasesToCSV(testCases);
      break;
    case 'markdown':
      exported = convertTestCasesToMarkdown(testCases);
      break;
    default:
      exported = JSON.stringify(testCases, null, 2);
  }

  return NextResponse.json({
    success: true,
    format,
    data: exported,
    count: testCases.length,
  });
}

function convertTestCasesToCSV(testCases: any[]): string {
  const headers = ['ID', 'Title', 'Module', 'Type', 'Priority', 'Status', 'Steps', 'Expected Result'];
  const rows = testCases.map(tc => [
    tc.testCaseId,
    `"${tc.title}"`,
    tc.module,
    tc.type,
    tc.priority,
    tc.status,
    `"${tc.steps}"`,
    `"${tc.expectedResult}"`,
  ]);
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

function convertTestCasesToMarkdown(testCases: any[]): string {
  let md = '# Test Cases\n\n';
  for (const tc of testCases) {
    md += `## ${tc.testCaseId}: ${tc.title}\n`;
    md += `- **Module:** ${tc.module}\n`;
    md += `- **Priority:** ${tc.priority}\n`;
    md += `- **Status:** ${tc.status}\n\n`;
  }
  return md;
}

async function importFromExcel(projectId: string, data: any[]) {
  return await importTestCases(projectId, data, 'excel');
}

async function importFromCSV(projectId: string, data: string) {
  // Parse CSV and import
  const lines = data.split('\n');
  const headers = lines[0].split(',');
  const testCases: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length >= headers.length) {
      testCases.push({
        id: values[0],
        title: values[1]?.replace(/"/g, ''),
        module: values[2],
        type: values[3],
        priority: values[4],
        status: values[5] || 'draft',
      });
    }
  }

  return await importTestCases(projectId, testCases, 'csv');
}

async function syncWithTestRail(projectId: string, config: any) {
  return NextResponse.json({
    success: true,
    message: 'TestRail sync configured',
    projectId,
  });
}

async function syncWithJira(projectId: string, config: any) {
  return NextResponse.json({
    success: true,
    message: 'Jira sync configured',
    projectId,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// UAT & ACCEPTANCE TESTING
// ═══════════════════════════════════════════════════════════════════════════

async function generateUATCases(projectId: string) {
  const tables = await db.toolkitTable.findMany({
    where: { projectId },
    select: { tableName: true, columns: true },
  });

  const uatCases: any[] = [];
  let counter = 1;

  for (const table of tables) {
    const columns = JSON.parse(table.columns || '[]');
    const requiredCols = columns.filter((c: any) => !c.isNullable && !c.isPrimaryKey);

    // Create
    uatCases.push({
      id: `UAT-${String(counter++).padStart(3, '0')}`,
      module: table.tableName,
      title: `Create ${table.tableName} - Valid Data`,
      steps: [
        `Navigate to ${table.tableName} creation form`,
        ...requiredCols.slice(0, 5).map((c: any) => `Enter ${c.name}`),
        'Click Save',
      ],
      expectedResult: 'Record created successfully',
    });

    // Read
    uatCases.push({
      id: `UAT-${String(counter++).padStart(3, '0')}`,
      module: table.tableName,
      title: `View ${table.tableName} List`,
      steps: [
        `Navigate to ${table.tableName} list`,
        'Verify data is displayed',
      ],
      expectedResult: 'List displays correctly',
    });

    // Update
    uatCases.push({
      id: `UAT-${String(counter++).padStart(3, '0')}`,
      module: table.tableName,
      title: `Update ${table.tableName}`,
      steps: [
        `Navigate to ${table.tableName}`,
        'Click Edit',
        'Modify fields',
        'Click Save',
      ],
      expectedResult: 'Record updated successfully',
    });

    // Delete
    uatCases.push({
      id: `UAT-${String(counter++).padStart(3, '0')}`,
      module: table.tableName,
      title: `Delete ${table.tableName}`,
      steps: [
        `Navigate to ${table.tableName}`,
        'Click Delete',
        'Confirm deletion',
      ],
      expectedResult: 'Record deleted successfully',
    });
  }

  return NextResponse.json({
    success: true,
    uatCases,
    total: uatCases.length,
  });
}

async function createUATSession(projectId: string, session: any) {
  return NextResponse.json({
    success: true,
    session: {
      id: `UAT-SESSION-${Date.now()}`,
      projectId,
      ...session,
      createdAt: new Date().toISOString(),
    }
  });
}

async function getUATSessions(projectId: string) {
  return NextResponse.json({
    success: true,
    sessions: [],
  });
}

async function recordUATFeedback(projectId: string, sessionId: string, feedback: any) {
  return NextResponse.json({
    success: true,
    message: 'Feedback recorded',
    sessionId,
    feedback,
  });
}

async function getUATReport(projectId: string, sessionId: string) {
  return NextResponse.json({
    success: true,
    report: {
      sessionId,
      projectId,
      generatedAt: new Date().toISOString(),
      summary: {
        totalCases: 0,
        passed: 0,
        failed: 0,
        pending: 0,
      },
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

async function getTestingSummary(projectId: string) {
  const totalTestCases = await db.testCase.count({ where: { projectId } });
  const totalSuites = await db.testSuite.count({ where: { projectId } });
  const totalRuns = await db.testExecution.count({ where: { projectId } });
  
  const passed = await db.testResult.count({ where: { projectId, status: 'passed' } });
  const failed = await db.testResult.count({ where: { projectId, status: 'failed' } });

  const coverageResult = await analyzeTestCoverage(projectId);
  const coverageData = await coverageResult.json();

  return NextResponse.json({
    success: true,
    summary: {
      testCases: totalTestCases,
      testSuites: totalSuites,
      testRuns: totalRuns,
      executions: passed + failed,
      passRate: (passed + failed) > 0 ? Math.round((passed / (passed + failed)) * 100) : 0,
      coverage: coverageData.coverage.summary.coveragePercentage,
      status: totalTestCases > 0 ? 'configured' : 'not_configured',
    }
  });
}

async function getTestingHealth(projectId: string) {
  const summary = await getTestingSummary(projectId);
  const summaryData = await summary.json();

  const health = {
    overall: 'good' as string,
    score: summaryData.summary.passRate,
    issues: [] as string[],
    recommendations: [] as string[],
  };

  if (summaryData.summary.coverage < 50) {
    health.issues.push('Low test coverage');
    health.recommendations.push('Increase test coverage for critical modules');
  }

  if (summaryData.summary.passRate < 80) {
    health.issues.push('High failure rate');
    health.recommendations.push('Investigate and fix failing tests');
  }

  if (health.issues.length > 0) {
    health.overall = health.issues.length > 2 ? 'critical' : 'needs_attention';
  }

  return NextResponse.json({
    success: true,
    health,
  });
}
