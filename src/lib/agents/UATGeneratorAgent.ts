// =============================================================================
// UAT Generator Agent v2 - Comprehensive Test Case Generation
// =============================================================================
// Generates test cases from workflows, creates test steps with instructions,
// defines expected results, and exports to TestRail/Excel format
// =============================================================================

import { TestStepGenerator, TestStepGroup, GeneratedTestStep } from '../generators/TestStepGeneration';
import { ExpectedResultGenerator, ExpectedResult, ExpectedResultScenario } from '../generators/ExpectedResultGenerator';
import { WorkflowDefinition } from '../parsers/workflow-builder';
import { TableDef, ColumnDef, ModuleDef, ScreenBlueprint, UATTestCase } from '../types';

/**
 * UAT Generator Configuration
 */
export interface UATGeneratorConfig {
  projectId: string;
  projectName: string;
  includePositiveTests: boolean;
  includeNegativeTests: boolean;
  includeBoundaryTests: boolean;
  includeWorkflowTests: boolean;
  defaultPriority: 'High' | 'Medium' | 'Low';
  outputFormats: ExportFormat[];
}

/**
 * Export format
 */
export type ExportFormat = 'markdown' | 'json' | 'csv' | 'excel' | 'testrail' | 'xray';

/**
 * Generated Test Case
 */
export interface GeneratedTestCase {
  id: string;
  moduleId: string;
  moduleName: string;
  title: string;
  description: string;
  type: TestCaseType;
  priority: 'High' | 'Medium' | 'Low';
  preconditions: string[];
  testSteps: GeneratedTestStep[];
  expectedResults: ExpectedResult[];
  relatedTables: string[];
  relatedWorkflows: string[];
  tags: string[];
  estimatedTime: number; // minutes
  complexity: 'simple' | 'moderate' | 'complex';
  automationStatus: 'manual' | 'automated' | 'partial';
}

/**
 * Test Case Type
 */
export type TestCaseType =
  | 'functional_positive'
  | 'functional_negative'
  | 'boundary'
  | 'integration'
  | 'workflow'
  | 'security'
  | 'performance'
  | 'accessibility';

/**
 * Test Suite
 */
export interface TestSuite {
  id: string;
  name: string;
  description: string;
  moduleId: string;
  testCases: GeneratedTestCase[];
  statistics: TestSuiteStatistics;
}

/**
 * Test Suite Statistics
 */
export interface TestSuiteStatistics {
  totalCases: number;
  byPriority: Record<string, number>;
  byType: Record<string, number>;
  byComplexity: Record<string, number>;
  estimatedTotalTime: number;
}

/**
 * UAT Generation Result
 */
export interface UATGenerationResult {
  testSuites: TestSuite[];
  allTestCases: GeneratedTestCase[];
  statistics: {
    totalTestCases: number;
    totalTestSteps: number;
    totalSuites: number;
    generationTimeMs: number;
  };
  exports: Map<ExportFormat, string>;
}

/**
 * UAT Generator Agent v2
 */
export class UATGeneratorAgent {
  private config: UATGeneratorConfig;
  private stepGenerator: TestStepGenerator;
  private resultGenerator: ExpectedResultGenerator;
  private testCases: GeneratedTestCase[] = [];
  private caseCounter = 0;

  constructor(config: UATGeneratorConfig) {
    this.config = config;
    this.stepGenerator = new TestStepGenerator();
    this.resultGenerator = new ExpectedResultGenerator();
  }

  /**
   * Generate comprehensive UAT test suite
   */
  generateUATSuites(
    modules: ModuleDef[],
    tables: TableDef[],
    screens: ScreenBlueprint[],
    workflows: WorkflowDefinition[]
  ): UATGenerationResult {
    const startTime = Date.now();
    this.testCases = [];
    this.caseCounter = 0;

    const testSuites: TestSuite[] = [];

    // Generate test suites for each module
    for (const module of modules) {
      const moduleTables = tables.filter(t => module.tables.includes(t.tableName));
      const moduleScreens = screens.filter(s => module.tables.includes(s.tableName));
      const moduleWorkflows = workflows.filter(w => w.module === module.key);

      const suite = this.generateModuleTestSuite(
        module,
        moduleTables,
        moduleScreens,
        moduleWorkflows
      );

      testSuites.push(suite);
    }

    // Generate exports
    const exports = new Map<ExportFormat, string>();
    for (const format of this.config.outputFormats) {
      exports.set(format, this.exportToFormat(format));
    }

    // Calculate statistics
    const totalSteps = this.testCases.reduce(
      (sum, tc) => sum + tc.testSteps.length,
      0
    );

    return {
      testSuites,
      allTestCases: this.testCases,
      statistics: {
        totalTestCases: this.testCases.length,
        totalTestSteps: totalSteps,
        totalSuites: testSuites.length,
        generationTimeMs: Date.now() - startTime,
      },
      exports,
    };
  }

  /**
   * Generate test suite for a module
   */
  private generateModuleTestSuite(
    module: ModuleDef,
    tables: TableDef[],
    screens: ScreenBlueprint[],
    workflows: WorkflowDefinition[]
  ): TestSuite {
    const cases: GeneratedTestCase[] = [];

    // Generate CRUD tests for each table
    for (const table of tables) {
      const screen = screens.find(s => s.tableName === table.tableName);

      if (this.config.includePositiveTests) {
        cases.push(...this.generateCRUDPositiveTests(table, screen, module));
      }

      if (this.config.includeNegativeTests) {
        cases.push(...this.generateCRUDNegativeTests(table, screen, module));
      }

      if (this.config.includeBoundaryTests) {
        cases.push(...this.generateBoundaryTests(table, screen, module));
      }
    }

    // Generate workflow tests
    if (this.config.includeWorkflowTests) {
      for (const workflow of workflows) {
        cases.push(...this.generateWorkflowTests(workflow, module));
      }
    }

    // Generate integration tests
    cases.push(...this.generateIntegrationTests(module, tables, screens, workflows));

    this.testCases.push(...cases);

    // Calculate statistics
    const statistics: TestSuiteStatistics = {
      totalCases: cases.length,
      byPriority: this.groupByProperty(cases, 'priority'),
      byType: this.groupByProperty(cases, 'type'),
      byComplexity: this.groupByProperty(cases, 'complexity'),
      estimatedTotalTime: cases.reduce((sum, c) => sum + c.estimatedTime, 0),
    };

    return {
      id: `suite-${module.key}`,
      name: `${module.name} Test Suite`,
      description: `UAT test cases for ${module.name} module`,
      moduleId: module.key,
      testCases: cases,
      statistics,
    };
  }

  /**
   * Generate positive CRUD tests
   */
  private generateCRUDPositiveTests(
    table: TableDef,
    screen: ScreenBlueprint | undefined,
    module: ModuleDef
  ): GeneratedTestCase[] {
    const cases: GeneratedTestCase[] = [];
    const modelName = this.toSingular(table.tableName);

    if (!screen) {
      // Generate basic tests from table definition
      screen = this.createDefaultScreen(table);
    }

    // CREATE - Success
    cases.push(this.createTestCase({
      moduleId: module.key,
      moduleName: module.name,
      title: `Create ${modelName} - Valid Data`,
      description: `Verify that a new ${modelName} can be created with all valid fields`,
      type: 'functional_positive',
      priority: 'High',
      preconditions: [
        `User has create permission for ${modelName}`,
        'Required lookup data exists',
      ],
      testSteps: this.stepGenerator.generateFromScreen(screen, table, 'create')
        .flatMap(g => g.steps),
      expectedResults: [this.resultGenerator.generateForCRUD(screen, table, 'create')
        .expectedResults[0]],
      relatedTables: [table.tableName],
      complexity: 'moderate',
    }));

    // READ - List
    cases.push(this.createTestCase({
      moduleId: module.key,
      moduleName: module.name,
      title: `Read ${modelName} - List All`,
      description: `Verify that all ${modelName} records are displayed correctly`,
      type: 'functional_positive',
      priority: 'High',
      preconditions: [
        `At least one ${modelName} record exists`,
        'User has view permission',
      ],
      testSteps: this.stepGenerator.generateFromScreen(screen, table, 'read')
        .flatMap(g => g.steps),
      expectedResults: [this.resultGenerator.generateForCRUD(screen, table, 'read')
        .expectedResults[0]],
      relatedTables: [table.tableName],
      complexity: 'simple',
    }));

    // UPDATE - Success
    cases.push(this.createTestCase({
      moduleId: module.key,
      moduleName: module.name,
      title: `Update ${modelName} - Valid Data`,
      description: `Verify that an existing ${modelName} can be updated`,
      type: 'functional_positive',
      priority: 'High',
      preconditions: [
        `${modelName} record exists`,
        'User has edit permission',
      ],
      testSteps: this.stepGenerator.generateFromScreen(screen, table, 'update')
        .flatMap(g => g.steps),
      expectedResults: [this.resultGenerator.generateForCRUD(screen, table, 'update')
        .expectedResults[0]],
      relatedTables: [table.tableName],
      complexity: 'moderate',
    }));

    // DELETE - Success
    cases.push(this.createTestCase({
      moduleId: module.key,
      moduleName: module.name,
      title: `Delete ${modelName} - Success`,
      description: `Verify that a ${modelName} can be deleted`,
      type: 'functional_positive',
      priority: 'Medium',
      preconditions: [
        `${modelName} record exists without dependencies`,
        'User has delete permission',
      ],
      testSteps: this.stepGenerator.generateFromScreen(screen, table, 'delete')
        .flatMap(g => g.steps),
      expectedResults: [this.resultGenerator.generateForCRUD(screen, table, 'delete')
        .expectedResults[0]],
      relatedTables: [table.tableName],
      complexity: 'simple',
    }));

    return cases;
  }

  /**
   * Generate negative CRUD tests
   */
  private generateCRUDNegativeTests(
    table: TableDef,
    screen: ScreenBlueprint | undefined,
    module: ModuleDef
  ): GeneratedTestCase[] {
    const cases: GeneratedTestCase[] = [];
    const modelName = this.toSingular(table.tableName);
    const requiredColumns = table.columns.filter(c => !c.isNullable && !c.isPrimaryKey);

    if (!screen) {
      screen = this.createDefaultScreen(table);
    }

    // Required field validation
    for (const column of requiredColumns.slice(0, 3)) {
      const field = screen.fields.find(f => f.columnName === column.name) || {
        columnName: column.name,
        label: column.name,
        uiType: 'text_input',
        isRequired: true,
        isReadOnly: false,
        order: 0,
      };

      const scenarios = this.resultGenerator.generateValidationScenarios(field as any, table);

      for (const scenario of scenarios.slice(0, 2)) {
        cases.push(this.createTestCase({
          moduleId: module.key,
          moduleName: module.name,
          title: scenario.name,
          description: scenario.description,
          type: 'functional_negative',
          priority: 'High',
          preconditions: scenario.preconditions,
          testSteps: scenario.testSteps.map((step, index) => ({
            id: `step-${index}`,
            order: index + 1,
            type: 'input' as const,
            instruction: step,
            detailedDescription: step,
            expectedBehavior: 'Validation error displayed',
          })),
          expectedResults: scenario.expectedResults,
          relatedTables: [table.tableName],
          complexity: 'simple',
        }));
      }
    }

    // Permission denied tests
    cases.push(this.createTestCase({
      moduleId: module.key,
      moduleName: module.name,
      title: `Create ${modelName} - No Permission`,
      description: `Verify that user without create permission cannot create ${modelName}`,
      type: 'security',
      priority: 'High',
      preconditions: ['User does NOT have create permission'],
      testSteps: [
        {
          id: 'step-1',
          order: 1,
          type: 'navigation',
          instruction: `Navigate to ${modelName} list`,
          detailedDescription: 'Open the module',
          expectedBehavior: 'List displayed',
        },
        {
          id: 'step-2',
          order: 2,
          type: 'action',
          instruction: 'Look for Create button',
          detailedDescription: 'Check if Create button exists',
          expectedBehavior: 'Create button should be hidden or disabled',
        },
      ],
      expectedResults: [{
        id: 'result-perm',
        type: 'permission_denied',
        category: 'Security',
        description: 'Create action not available',
        conditions: ['User lacks create permission'],
        outcomes: [{
          element: 'Create Button',
          expectedState: 'hidden or disabled',
          isVisible: false,
          isEnabled: false,
        }],
        verificationPoints: [{
          id: 'vp-perm',
          description: 'No create action available',
          type: 'behavior',
          expectedValue: 'Button not clickable',
          actualValuePlaceholder: '[Button state]',
          passCriteria: 'Create action not available',
          failCriteria: 'User can create record',
        }],
        severity: 'critical',
        isBlocking: true,
      }],
      relatedTables: [table.tableName],
      complexity: 'simple',
    }));

    return cases;
  }

  /**
   * Generate boundary tests
   */
  private generateBoundaryTests(
    table: TableDef,
    screen: ScreenBlueprint | undefined,
    module: ModuleDef
  ): GeneratedTestCase[] {
    const cases: GeneratedTestCase[] = [];
    const modelName = this.toSingular(table.tableName);

    if (!screen) {
      screen = this.createDefaultScreen(table);
    }

    // Max length tests for varchar columns
    const varcharColumns = table.columns.filter(
      c => (c.dataType === 'NVARCHAR' || c.dataType === 'VARCHAR') && c.maxLength && c.maxLength !== 'MAX'
    );

    for (const column of varcharColumns.slice(0, 2)) {
      const maxLength = parseInt(column.maxLength);

      // At max length
      cases.push(this.createTestCase({
        moduleId: module.key,
        moduleName: module.name,
        title: `${column.name} - Max Length Valid`,
        description: `Verify that ${column.name} accepts exactly ${maxLength} characters`,
        type: 'boundary',
        priority: 'Low',
        preconditions: ['Form is open for create'],
        testSteps: [
          {
            id: 'step-1',
            order: 1,
            type: 'input',
            instruction: `Enter exactly ${maxLength} characters in ${column.name}`,
            detailedDescription: `Fill ${column.name} with maximum allowed characters`,
            expectedBehavior: 'Input accepted',
            inputValue: 'X'.repeat(maxLength),
          },
          {
            id: 'step-2',
            order: 2,
            type: 'action',
            instruction: 'Submit the form',
            detailedDescription: 'Click Save button',
            expectedBehavior: 'Record saved successfully',
          },
        ],
        expectedResults: [{
          id: 'result-maxlen',
          type: 'success',
          category: 'Boundary',
          description: 'Max length accepted',
          conditions: [`Exactly ${maxLength} characters entered`],
          outcomes: [{
            element: column.name,
            expectedState: 'valid',
            expectedValue: 'X'.repeat(maxLength),
            isVisible: true,
            isEnabled: true,
          }],
          verificationPoints: [{
            id: 'vp-maxlen',
            description: 'Value saved correctly',
            type: 'data',
            expectedValue: `${maxLength} characters`,
            actualValuePlaceholder: '[Actual length]',
            passCriteria: 'Value saved without truncation',
            failCriteria: 'Value truncated or rejected',
          }],
          severity: 'low',
          isBlocking: false,
        }],
        relatedTables: [table.tableName],
        complexity: 'simple',
      }));

      // Over max length
      cases.push(this.createTestCase({
        moduleId: module.key,
        moduleName: module.name,
        title: `${column.name} - Exceeds Max Length`,
        description: `Verify validation when ${column.name} exceeds ${maxLength} characters`,
        type: 'boundary',
        priority: 'Low',
        preconditions: ['Form is open for create'],
        testSteps: [
          {
            id: 'step-1',
            order: 1,
            type: 'input',
            instruction: `Enter ${maxLength + 1} characters in ${column.name}`,
            detailedDescription: `Exceed maximum length`,
            expectedBehavior: 'Input rejected or truncated',
            inputValue: 'X'.repeat(maxLength + 1),
          },
        ],
        expectedResults: [{
          id: 'result-overmax',
          type: 'validation_error',
          category: 'Boundary',
          description: 'Exceeds max length validation',
          conditions: [`More than ${maxLength} characters entered`],
          outcomes: [{
            element: column.name,
            expectedState: 'error',
            expectedValue: `Maximum ${maxLength} characters`,
            isVisible: true,
            isEnabled: true,
          }],
          verificationPoints: [{
            id: 'vp-overmax',
            description: 'Validation error shown',
            type: 'visual',
            expectedValue: 'Error message visible',
            actualValuePlaceholder: '[Error state]',
            passCriteria: 'Error message or input prevented',
            failCriteria: 'Invalid input accepted',
          }],
          severity: 'low',
          isBlocking: false,
        }],
        relatedTables: [table.tableName],
        complexity: 'simple',
      }));
    }

    return cases;
  }

  /**
   * Generate workflow tests
   */
  private generateWorkflowTests(
    workflow: WorkflowDefinition,
    module: ModuleDef
  ): GeneratedTestCase[] {
    const cases: GeneratedTestCase[] = [];

    // Main workflow success test
    cases.push(this.createTestCase({
      moduleId: module.key,
      moduleName: module.name,
      title: `${workflow.name} - Complete Flow`,
      description: `Execute complete ${workflow.name} workflow successfully`,
      type: 'workflow',
      priority: 'High',
      preconditions: [
        'User has workflow permissions',
        'Required data available',
      ],
      testSteps: this.stepGenerator.generateFromWorkflow(workflow)
        .flatMap(g => g.steps),
      expectedResults: this.resultGenerator.generateForWorkflow(workflow)
        .flatMap(s => s.expectedResults),
      relatedTables: workflow.steps.flatMap(s => s.tablesUsed),
      relatedWorkflows: [workflow.id],
      complexity: workflow.complexity === 'simple' ? 'simple' :
                  workflow.complexity === 'moderate' ? 'moderate' : 'complex',
      tags: ['workflow', workflow.module],
    }));

    // Workflow failure tests for critical steps
    for (const step of workflow.steps.filter(s => s.isRequired).slice(0, 2)) {
      cases.push(this.createTestCase({
        moduleId: module.key,
        moduleName: module.name,
        title: `${workflow.name} - ${step.name} Failure`,
        description: `Verify error handling when ${step.name} fails`,
        type: 'workflow',
        priority: 'Medium',
        preconditions: ['Workflow started', 'Reached the step'],
        testSteps: [
          {
            id: 'step-1',
            order: 1,
            type: 'action',
            instruction: `Execute ${step.name} with invalid data`,
            detailedDescription: 'Trigger error condition',
            expectedBehavior: 'Error handling',
          },
        ],
        expectedResults: [{
          id: 'result-fail',
          type: 'system_error',
          category: 'Workflow Error',
          description: 'Error handled gracefully',
          conditions: ['Error triggered'],
          outcomes: [{
            element: 'Error Message',
            expectedState: 'visible',
            expectedValue: `Error at ${step.name}`,
            isVisible: true,
            isEnabled: true,
          }],
          verificationPoints: [{
            id: 'vp-fail',
            description: 'Error handled',
            type: 'behavior',
            expectedValue: 'User informed, can recover',
            actualValuePlaceholder: '[Error handling]',
            passCriteria: 'Clear error and recovery options',
            failCriteria: 'Workflow stuck',
          }],
          severity: 'high',
          isBlocking: false,
        }],
        relatedTables: step.tablesUsed,
        relatedWorkflows: [workflow.id],
        complexity: 'moderate',
      }));
    }

    return cases;
  }

  /**
   * Generate integration tests
   */
  private generateIntegrationTests(
    module: ModuleDef,
    tables: TableDef[],
    screens: ScreenBlueprint[],
    workflows: WorkflowDefinition[]
  ): GeneratedTestCase[] {
    const cases: GeneratedTestCase[] = [];

    // FK relationship tests
    for (const table of tables) {
      for (const fk of table.foreignKeys) {
        cases.push(this.createTestCase({
          moduleId: module.key,
          moduleName: module.name,
          title: `FK Validation - ${fk.columnName} → ${fk.referencesTable}`,
          description: `Verify FK relationship between ${table.tableName} and ${fk.referencesTable}`,
          type: 'integration',
          priority: 'High',
          preconditions: [
            `${fk.referencesTable} has valid records`,
            'User has create permission',
          ],
          testSteps: [
            {
              id: 'step-1',
              order: 1,
              type: 'selection',
              instruction: `Select valid ${fk.referencesTable} reference`,
              detailedDescription: `Choose from ${fk.referencesTable} dropdown`,
              expectedBehavior: 'Valid selection accepted',
            },
            {
              id: 'step-2',
              order: 2,
              type: 'action',
              instruction: 'Save the record',
              detailedDescription: 'Submit the form',
              expectedBehavior: 'Record saved with correct FK',
            },
          ],
          expectedResults: [{
            id: 'result-fk',
            type: 'success',
            category: 'Integration',
            description: 'FK relationship established',
            conditions: ['Valid FK selected'],
            outcomes: [{
              element: 'Record',
              expectedState: 'saved',
              expectedValue: `Linked to ${fk.referencesTable}`,
              isVisible: false,
              isEnabled: true,
            }],
            verificationPoints: [{
              id: 'vp-fk',
              description: 'FK stored correctly',
              type: 'data',
              expectedValue: 'Valid FK value in database',
              actualValuePlaceholder: '[FK value]',
              passCriteria: 'Correct FK reference',
              failCriteria: 'FK not saved or incorrect',
            }],
            severity: 'high',
            isBlocking: true,
          }],
          relatedTables: [table.tableName, fk.referencesTable],
          complexity: 'simple',
        }));
      }
    }

    return cases;
  }

  /**
   * Create test case
   */
  private createTestCase(options: {
    moduleId: string;
    moduleName: string;
    title: string;
    description: string;
    type: TestCaseType;
    priority: 'High' | 'Medium' | 'Low';
    preconditions: string[];
    testSteps: GeneratedTestStep[];
    expectedResults: ExpectedResult[];
    relatedTables: string[];
    relatedWorkflows?: string[];
    complexity: 'simple' | 'moderate' | 'complex';
    tags?: string[];
  }): GeneratedTestCase {
    return {
      id: `TC-${String(++this.caseCounter).padStart(4, '0')}`,
      moduleId: options.moduleId,
      moduleName: options.moduleName,
      title: options.title,
      description: options.description,
      type: options.type,
      priority: options.priority,
      preconditions: options.preconditions,
      testSteps: options.testSteps,
      expectedResults: options.expectedResults,
      relatedTables: options.relatedTables,
      relatedWorkflows: options.relatedWorkflows || [],
      tags: options.tags || [options.type, options.moduleId],
      estimatedTime: Math.ceil(options.testSteps.length * 1.5), // 1.5 min per step
      complexity: options.complexity,
      automationStatus: 'manual',
    };
  }

  /**
   * Export to format
   */
  exportToFormat(format: ExportFormat): string {
    switch (format) {
      case 'markdown':
        return this.toMarkdown();
      case 'json':
        return this.toJSON();
      case 'csv':
        return this.toCSV();
      case 'excel':
        return this.toExcelFormat();
      case 'testrail':
        return this.toTestRailFormat();
      case 'xray':
        return this.toXrayFormat();
      default:
        return this.toMarkdown();
    }
  }

  /**
   * Export to Markdown
   */
  private toMarkdown(): string {
    const lines: string[] = [];

    lines.push('# UAT Test Cases');
    lines.push('');
    lines.push(`> Generated: ${new Date().toISOString()}`);
    lines.push(`> Project: ${this.config.projectName}`);
    lines.push(`> Total Test Cases: ${this.testCases.length}`);
    lines.push('');

    // Summary
    lines.push('## Summary');
    lines.push('');
    const byModule = this.groupByModule();
    for (const [module, cases] of Object.entries(byModule)) {
      lines.push(`- **${module}**: ${cases.length} test cases`);
    }
    lines.push('');

    // Test Cases
    for (const tc of this.testCases) {
      lines.push(`## ${tc.id}: ${tc.title}`);
      lines.push('');
      lines.push(`**Module:** ${tc.moduleName}`);
      lines.push(`**Type:** ${tc.type}`);
      lines.push(`**Priority:** ${tc.priority}`);
      lines.push(`**Complexity:** ${tc.complexity}`);
      lines.push(`**Estimated Time:** ${tc.estimatedTime} minutes`);
      lines.push('');

      lines.push('**Description:**');
      lines.push(tc.description);
      lines.push('');

      lines.push('**Preconditions:**');
      for (const pre of tc.preconditions) {
        lines.push(`- ${pre}`);
      }
      lines.push('');

      lines.push('**Test Steps:**');
      lines.push('');
      lines.push('| # | Step | Expected |');
      lines.push('|---|------|----------|');
      for (const step of tc.testSteps) {
        lines.push(`| ${step.order} | ${step.instruction} | ${step.expectedBehavior} |`);
      }
      lines.push('');

      lines.push('**Expected Results:**');
      for (const result of tc.expectedResults) {
        lines.push(`- ${result.description}`);
      }
      lines.push('');

      lines.push('---');
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Export to JSON
   */
  private toJSON(): string {
    return JSON.stringify({
      generated: new Date().toISOString(),
      project: this.config.projectName,
      testCases: this.testCases,
    }, null, 2);
  }

  /**
   * Export to CSV
   */
  private toCSV(): string {
    const headers = [
      'ID', 'Module', 'Title', 'Description', 'Type', 'Priority',
      'Complexity', 'Preconditions', 'Steps', 'Expected Results', 'Time (min)'
    ];

    const rows = this.testCases.map(tc => [
      tc.id,
      tc.moduleName,
      `"${tc.title.replace(/"/g, '""')}"`,
      `"${tc.description.replace(/"/g, '""')}"`,
      tc.type,
      tc.priority,
      tc.complexity,
      `"${tc.preconditions.join('; ').replace(/"/g, '""')}"`,
      `"${tc.testSteps.map(s => s.instruction).join('; ').replace(/"/g, '""')}"`,
      `"${tc.expectedResults.map(r => r.description).join('; ').replace(/"/g, '""')}"`,
      tc.estimatedTime.toString(),
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  /**
   * Export to Excel-ready format (TSV)
   */
  private toExcelFormat(): string {
    return this.toCSV().replace(/,/g, '\t');
  }

  /**
   * Export to TestRail format
   */
  private toTestRailFormat(): string {
    const lines: string[] = [];

    lines.push('TestRail Import Format');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');

    for (const tc of this.testCases) {
      lines.push(`[TestCase]`);
      lines.push(`ID: ${tc.id}`);
      lines.push(`Title: ${tc.title}`);
      lines.push(`Section: ${tc.moduleName}`);
      lines.push(`Type: ${tc.type}`);
      lines.push(`Priority: ${tc.priority}`);
      lines.push(`Estimate: ${tc.estimatedTime}m`);
      lines.push(`References: ${tc.relatedTables.join(', ')}`);
      lines.push('');

      lines.push('Preconditions:');
      for (const pre of tc.preconditions) {
        lines.push(`- ${pre}`);
      }
      lines.push('');

      for (let i = 0; i < tc.testSteps.length; i++) {
        const step = tc.testSteps[i];
        lines.push(`Step ${i + 1}: ${step.instruction}`);
        lines.push(`Expected: ${step.expectedBehavior}`);
      }

      lines.push('');
      lines.push('---');
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Export to Xray format (JIRA)
   */
  private toXrayFormat(): string {
    return JSON.stringify({
      testCases: this.testCases.map(tc => ({
        key: tc.id,
        summary: tc.title,
        description: tc.description,
        priority: tc.priority,
        status: 'TODO',
        testType: tc.type,
        steps: tc.testSteps.map((step, index) => ({
          id: index + 1,
          action: step.instruction,
          result: step.expectedBehavior,
        })),
        labels: tc.tags,
      })),
    }, null, 2);
  }

  // Helper methods
  private groupByModule(): Record<string, GeneratedTestCase[]> {
    const groups: Record<string, GeneratedTestCase[]> = {};
    for (const tc of this.testCases) {
      if (!groups[tc.moduleName]) {
        groups[tc.moduleName] = [];
      }
      groups[tc.moduleName].push(tc);
    }
    return groups;
  }

  private groupByProperty(
    cases: GeneratedTestCase[],
    prop: keyof GeneratedTestCase
  ): Record<string, number> {
    const groups: Record<string, number> = {};
    for (const tc of cases) {
      const value = String(tc[prop]);
      groups[value] = (groups[value] || 0) + 1;
    }
    return groups;
  }

  private toSingular(name: string): string {
    let singular = name;
    if (singular.endsWith('ies')) {
      singular = singular.slice(0, -3) + 'y';
    } else if (singular.endsWith('ses') || singular.endsWith('xes')) {
      singular = singular.slice(0, -2);
    } else if (singular.endsWith('s') && !singular.endsWith('ss') && !singular.endsWith('us')) {
      singular = singular.slice(0, -1);
    }
    return singular;
  }

  private createDefaultScreen(table: TableDef): ScreenBlueprint {
    return {
      screenType: 'form',
      tableName: table.tableName,
      title: table.tableName,
      fields: table.columns.map((col, index) => ({
        columnName: col.name,
        label: col.name,
        uiType: this.mapDataTypeToUIType(col.dataType),
        isRequired: !col.isNullable,
        isReadOnly: col.isPrimaryKey,
        order: index,
      })),
      actions: [
        { type: 'create', label: 'Save' },
        { type: 'edit', label: 'Update' },
        { type: 'delete', label: 'Delete' },
      ],
    };
  }

  private mapDataTypeToUIType(dataType: string): string {
    const type = dataType.toUpperCase();
    if (type === 'BIT') return 'toggle';
    if (['INT', 'BIGINT', 'SMALLINT', 'TINYINT'].includes(type)) return 'number_input';
    if (['DECIMAL', 'FLOAT', 'MONEY'].includes(type)) return 'currency_input';
    if (['DATE'].includes(type)) return 'date_picker';
    if (['DATETIME', 'DATETIME2'].includes(type)) return 'datetime_picker';
    if (type === 'UNIQUEIDENTIFIER') return 'text_input';
    if (type === 'TEXT' || type === 'NTEXT') return 'textarea';
    return 'text_input';
  }
}

/**
 * Create UAT Generator Agent
 */
export function createUATGeneratorAgent(config: UATGeneratorConfig): UATGeneratorAgent {
  return new UATGeneratorAgent(config);
}

/**
 * Quick UAT generation
 */
export function generateQuickUAT(
  tables: TableDef[],
  modules: ModuleDef[]
): GeneratedTestCase[] {
  const agent = new UATGeneratorAgent({
    projectId: 'quick',
    projectName: 'Quick UAT',
    includePositiveTests: true,
    includeNegativeTests: true,
    includeBoundaryTests: false,
    includeWorkflowTests: false,
    defaultPriority: 'High',
    outputFormats: ['markdown'],
  });

  const result = agent.generateUATSuites(modules, tables, [], []);
  return result.allTestCases;
}

/**
 * Convert to legacy UATTestCase format
 */
export function convertToLegacyFormat(cases: GeneratedTestCase[]): UATTestCase[] {
  return cases.map(tc => ({
    id: tc.id,
    module: tc.moduleName,
    testCase: tc.title,
    description: tc.description,
    preconditions: tc.preconditions.join('; '),
    steps: tc.testSteps.map(s => s.instruction),
    expectedResult: tc.expectedResults.map(r => r.description).join('; '),
    priority: tc.priority,
    status: 'Not Started' as const,
  }));
}
