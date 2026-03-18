// =============================================================================
// Test Step Generator - Intelligent Test Step Generation Engine
// =============================================================================
// Generates detailed test steps with instructions, screenshots placeholders,
// and test data suggestions for UAT testing
// =============================================================================

import { TableDef, ColumnDef, ScreenBlueprint, ScreenField, ScreenAction } from '../types';
import { WorkflowDefinition, WorkflowStep } from '../parsers/workflow-builder';

/**
 * Test Step Types
 */
export type TestStepType =
  | 'navigation'
  | 'input'
  | 'selection'
  | 'verification'
  | 'action'
  | 'wait'
  | 'assertion'
  | 'cleanup';

/**
 * Generated Test Step
 */
export interface GeneratedTestStep {
  id: string;
  order: number;
  type: TestStepType;
  instruction: string;
  detailedDescription: string;
  targetElement?: string;
  inputValue?: string;
  expectedBehavior: string;
  testData?: TestDataSuggestion;
  screenshot?: ScreenshotPlaceholder;
  timeout?: number;
  retryCount?: number;
  notes?: string[];
}

/**
 * Test Data Suggestion
 */
export interface TestDataSuggestion {
  fieldName: string;
  suggestedValue: string;
  dataType: string;
  isValid: boolean;
  alternatives?: string[];
}

/**
 * Screenshot Placeholder
 */
export interface ScreenshotPlaceholder {
  id: string;
  description: string;
  suggestedFileName: string;
  annotations: Annotation[];
}

/**
 * Annotation for screenshots
 */
export interface Annotation {
  type: 'arrow' | 'circle' | 'rectangle' | 'text';
  position: { x: number; y: number };
  size?: { width: number; height: number };
  label?: string;
}

/**
 * Test Step Group
 */
export interface TestStepGroup {
  id: string;
  name: string;
  description: string;
  steps: GeneratedTestStep[];
  isOptional: boolean;
  dependsOn?: string[];
}

/**
 * Test Step Generator
 */
export class TestStepGenerator {
  private stepCounter = 0;

  /**
   * Generate test steps from screen blueprint
   */
  generateFromScreen(
    screen: ScreenBlueprint,
    table: TableDef,
    operation: 'create' | 'read' | 'update' | 'delete'
  ): TestStepGroup[] {
    this.stepCounter = 0;
    const groups: TestStepGroup[] = [];

    switch (operation) {
      case 'create':
        groups.push(this.generateCreateSteps(screen, table));
        break;
      case 'read':
        groups.push(this.generateReadSteps(screen, table));
        break;
      case 'update':
        groups.push(this.generateUpdateSteps(screen, table));
        break;
      case 'delete':
        groups.push(this.generateDeleteSteps(screen, table));
        break;
    }

    return groups;
  }

  /**
   * Generate test steps from workflow
   */
  generateFromWorkflow(workflow: WorkflowDefinition): TestStepGroup[] {
    this.stepCounter = 0;
    const groups: TestStepGroup[] = [];

    // Navigation to workflow start
    groups.push({
      id: `group-nav`,
      name: 'Navigate to Workflow',
      description: `Access the ${workflow.name} workflow`,
      steps: [
        this.createNavigationStep('Main Menu', workflow.module),
        this.createNavigationStep(workflow.module, 'Start'),
      ],
      isOptional: false,
    });

    // Generate steps for each workflow step
    for (const wfStep of workflow.steps) {
      groups.push(this.convertWorkflowStep(wfStep));
    }

    // Verification
    groups.push({
      id: `group-verify`,
      name: 'Final Verification',
      description: 'Verify workflow completion',
      steps: [
        this.createAssertionStep('Workflow completed successfully'),
        this.createVerificationStep('Status check', 'Completed'),
      ],
      isOptional: false,
    });

    return groups;
  }

  /**
   * Generate create operation steps
   */
  private generateCreateSteps(screen: ScreenBlueprint, table: TableDef): TestStepGroup {
    const steps: GeneratedTestStep[] = [];

    // Navigation
    steps.push(this.createNavigationStep('Main Menu', screen.tableName));
    steps.push(this.createActionStep('Click "Add New" button', 'create', 'Add New button'));

    // Fill fields
    const requiredFields = screen.fields.filter(f => f.isRequired);
    const optionalFields = screen.fields.filter(f => !f.isRequired);

    for (const field of requiredFields) {
      steps.push(this.createInputStep(field, table, true));
    }

    for (const field of optionalFields.slice(0, 3)) {
      steps.push(this.createInputStep(field, table, false));
    }

    // Submit
    const submitAction = screen.actions.find(a => a.type === 'create');
    if (submitAction) {
      steps.push(this.createActionStep(
        `Click "${submitAction.label}" button`,
        'action',
        submitAction.label
      ));
    }

    // Verification
    steps.push(this.createVerificationStep('Success message', 'Record created successfully'));
    steps.push(this.createAssertionStep('Record appears in list'));

    return {
      id: `group-create-${screen.tableName}`,
      name: `Create ${screen.title}`,
      description: `Create a new ${screen.title} record`,
      steps,
      isOptional: false,
    };
  }

  /**
   * Generate read operation steps
   */
  private generateReadSteps(screen: ScreenBlueprint, table: TableDef): TestStepGroup {
    const steps: GeneratedTestStep[] = [];

    // Navigation
    steps.push(this.createNavigationStep('Main Menu', screen.tableName));

    // Verify list display
    steps.push(this.createAssertionStep('List view is displayed'));
    steps.push(this.createVerificationStep('Table headers', screen.fields.slice(0, 5).map(f => f.label).join(', ')));

    // Search functionality
    const searchableField = screen.fields.find(f =>
      f.uiType === 'text_input' || f.uiType === 'email_input'
    );
    if (searchableField) {
      steps.push(this.createInputStep(searchableField, table, false, 'search'));
      steps.push(this.createActionStep('Click Search button', 'action', 'Search button'));
      steps.push(this.createVerificationStep('Search results', 'Filtered list displayed'));
    }

    // View detail
    steps.push(this.createActionStep('Click on a record row', 'action', 'First record row'));
    steps.push(this.createAssertionStep('Detail view is displayed'));

    return {
      id: `group-read-${screen.tableName}`,
      name: `Read ${screen.title}`,
      description: `View and search ${screen.title} records`,
      steps,
      isOptional: false,
    };
  }

  /**
   * Generate update operation steps
   */
  private generateUpdateSteps(screen: ScreenBlueprint, table: TableDef): TestStepGroup {
    const steps: GeneratedTestStep[] = [];

    // Navigation
    steps.push(this.createNavigationStep('Main Menu', screen.tableName));

    // Select record
    steps.push(this.createActionStep('Click Edit on a record', 'action', 'Edit button'));
    steps.push(this.createAssertionStep('Edit form is displayed'));

    // Modify fields
    const editableFields = screen.fields.filter(f =>
      f.uiType !== 'hidden' && f.uiType !== 'auto_generated'
    ).slice(0, 3);

    for (const field of editableFields) {
      steps.push({
        ...this.createInputStep(field, table, false),
        instruction: `Modify ${field.label}`,
        detailedDescription: `Update the ${field.label} field with new value`,
      });
    }

    // Save
    const saveAction = screen.actions.find(a => a.type === 'edit');
    if (saveAction) {
      steps.push(this.createActionStep(
        `Click "${saveAction.label}" button`,
        'action',
        saveAction.label
      ));
    }

    // Verification
    steps.push(this.createVerificationStep('Success message', 'Record updated successfully'));
    steps.push(this.createAssertionStep('Changes are reflected'));

    return {
      id: `group-update-${screen.tableName}`,
      name: `Update ${screen.title}`,
      description: `Edit an existing ${screen.title} record`,
      steps,
      isOptional: false,
    };
  }

  /**
   * Generate delete operation steps
   */
  private generateDeleteSteps(screen: ScreenBlueprint, table: TableDef): TestStepGroup {
    const steps: GeneratedTestStep[] = [];

    // Navigation
    steps.push(this.createNavigationStep('Main Menu', screen.tableName));

    // Select record
    steps.push(this.createActionStep('Click Delete on a record', 'action', 'Delete button'));

    // Confirmation
    const deleteAction = screen.actions.find(a => a.type === 'delete');
    if (deleteAction?.requiresConfirmation) {
      steps.push(this.createVerificationStep('Confirmation dialog', 'Dialog appears'));
      steps.push(this.createActionStep('Click Confirm in dialog', 'action', 'Confirm button'));
    }

    // Verification
    steps.push(this.createVerificationStep('Success message', 'Record deleted successfully'));
    steps.push(this.createAssertionStep('Record is removed from list'));

    return {
      id: `group-delete-${screen.tableName}`,
      name: `Delete ${screen.title}`,
      description: `Delete a ${screen.title} record`,
      steps,
      isOptional: false,
    };
  }

  /**
   * Convert workflow step to test step group
   */
  private convertWorkflowStep(wfStep: WorkflowStep): TestStepGroup {
    const steps: GeneratedTestStep[] = [];

    // Description
    steps.push({
      id: this.generateStepId(),
      order: this.stepCounter++,
      type: 'action',
      instruction: `Execute: ${wfStep.name}`,
      detailedDescription: wfStep.description,
      expectedBehavior: wfStep.isRequired ? 'Step must complete successfully' : 'Step may be optional',
    });

    // Input parameters
    for (const param of wfStep.inputParameters) {
      steps.push(this.createInputStep({
        columnName: param,
        label: param,
        uiType: 'text_input',
        isRequired: wfStep.isRequired,
        isReadOnly: false,
        order: 0,
      }, { tableName: '', columns: [], foreignKeys: [] } as TableDef, wfStep.isRequired));
    }

    // Verification
    if (wfStep.outputFields.length > 0) {
      steps.push(this.createVerificationStep(
        'Output fields',
        wfStep.outputFields.join(', ')
      ));
    }

    return {
      id: `group-${wfStep.id}`,
      name: wfStep.name,
      description: wfStep.description,
      steps,
      isOptional: !wfStep.isRequired,
      dependsOn: wfStep.previousSteps.length > 0 ? wfStep.previousSteps : undefined,
    };
  }

  /**
   * Create navigation step
   */
  private createNavigationStep(from: string, to: string): GeneratedTestStep {
    return {
      id: this.generateStepId(),
      order: this.stepCounter++,
      type: 'navigation',
      instruction: `Navigate from "${from}" to "${to}"`,
      detailedDescription: `Click on "${to}" in the navigation menu or follow the path from ${from}`,
      targetElement: to,
      expectedBehavior: `The ${to} page loads successfully`,
      screenshot: {
        id: `ss-${this.stepCounter}`,
        description: `Navigation to ${to}`,
        suggestedFileName: `nav-${to.toLowerCase().replace(/\s+/g, '-')}.png`,
        annotations: [
          { type: 'arrow', position: { x: 100, y: 50 }, label: from },
          { type: 'circle', position: { x: 150, y: 80 }, label: to },
        ],
      },
    };
  }

  /**
   * Create input step
   */
  private createInputStep(
    field: ScreenField,
    table: TableDef,
    isRequired: boolean,
    context: 'form' | 'search' = 'form'
  ): GeneratedTestStep {
    const column = table.columns.find(c => c.name === field.columnName);
    const testData = this.generateTestData(field, column);

    return {
      id: this.generateStepId(),
      order: this.stepCounter++,
      type: 'input',
      instruction: `Enter ${field.label}${isRequired ? ' (Required)' : ''}`,
      detailedDescription: `${context === 'search' ? 'Search by' : 'Fill in'} the ${field.label} field with a ${field.uiType.replace('_', ' ')} value`,
      targetElement: field.label,
      inputValue: testData.suggestedValue,
      expectedBehavior: isRequired
        ? 'Field accepts valid input, no validation error'
        : 'Field accepts input if provided',
      testData,
      notes: isRequired ? ['This field is required'] : undefined,
    };
  }

  /**
   * Create selection step
   */
  private createSelectionStep(
    field: ScreenField,
    options: string[],
    selectMultiple: boolean = false
  ): GeneratedTestStep {
    return {
      id: this.generateStepId(),
      order: this.stepCounter++,
      type: 'selection',
      instruction: `Select ${selectMultiple ? 'options from' : 'an option for'} ${field.label}`,
      detailedDescription: `Choose ${selectMultiple ? 'one or more values' : 'a value'} from the ${field.label} dropdown`,
      targetElement: field.label,
      inputValue: options[0],
      expectedBehavior: `Selected value(s) appear in the field`,
      testData: {
        fieldName: field.label,
        suggestedValue: options[0],
        dataType: 'selection',
        isValid: true,
        alternatives: options.slice(1, 4),
      },
    };
  }

  /**
   * Create action step
   */
  private createActionStep(
    instruction: string,
    actionType: string,
    target: string
  ): GeneratedTestStep {
    return {
      id: this.generateStepId(),
      order: this.stepCounter++,
      type: 'action',
      instruction,
      detailedDescription: `Perform the action: ${instruction}`,
      targetElement: target,
      expectedBehavior: `Action executes and system responds accordingly`,
      timeout: 5000,
      retryCount: 2,
    };
  }

  /**
   * Create verification step
   */
  private createVerificationStep(
    element: string,
    expectedValue: string
  ): GeneratedTestStep {
    return {
      id: this.generateStepId(),
      order: this.stepCounter++,
      type: 'verification',
      instruction: `Verify ${element}`,
      detailedDescription: `Check that ${element} shows: ${expectedValue}`,
      targetElement: element,
      expectedBehavior: `${element} displays "${expectedValue}"`,
      notes: [`Expected: ${expectedValue}`],
    };
  }

  /**
   * Create assertion step
   */
  private createAssertionStep(assertion: string): GeneratedTestStep {
    return {
      id: this.generateStepId(),
      order: this.stepCounter++,
      type: 'assertion',
      instruction: `Assert: ${assertion}`,
      detailedDescription: `Verify that ${assertion}`,
      expectedBehavior: assertion,
    };
  }

  /**
   * Generate test data suggestion
   */
  private generateTestData(
    field: ScreenField,
    column?: ColumnDef
  ): TestDataSuggestion {
    const value = this.generateSampleValue(field, column);
    return {
      fieldName: field.label,
      suggestedValue: value,
      dataType: field.uiType,
      isValid: true,
      alternatives: this.generateAlternatives(field, column),
    };
  }

  /**
   * Generate sample value based on field type
   */
  private generateSampleValue(field: ScreenField, column?: ColumnDef): string {
    // Use field options if available
    if (field.options && field.options.length > 0) {
      return field.options[0].value;
    }

    // Use default value if available
    if (field.defaultValue) {
      return field.defaultValue;
    }

    // Generate based on UI type
    switch (field.uiType) {
      case 'email_input':
        return 'test@example.com';
      case 'phone_input':
        return '+1234567890';
      case 'date_picker':
        return new Date().toISOString().split('T')[0];
      case 'datetime_picker':
        return new Date().toISOString();
      case 'toggle':
      case 'checkbox':
        return 'true';
      case 'number_input':
      case 'currency_input':
        return '100';
      case 'percentage_input':
        return '50';
      case 'url_input':
        return 'https://example.com';
      case 'text_input':
      default:
        const maxLength = column?.maxLength ? parseInt(column.maxLength) : 50;
        return `Test${field.label.replace(/\s+/g, '')}`.substring(0, Math.min(maxLength, 20));
    }
  }

  /**
   * Generate alternative test values
   */
  private generateAlternatives(field: ScreenField, column?: ColumnDef): string[] {
    const alternatives: string[] = [];

    // Boundary values for numeric fields
    if (['number_input', 'currency_input'].includes(field.uiType)) {
      alternatives.push('0', '999999');
    }

    // Empty value for optional fields
    if (!field.isRequired) {
      alternatives.push('(leave empty)');
    }

    // Invalid values for validation testing
    if (field.uiType === 'email_input') {
      alternatives.push('invalid-email');
    }

    return alternatives.slice(0, 3);
  }

  /**
   * Generate step ID
   */
  private generateStepId(): string {
    return `step-${++this.stepCounter}`;
  }

  /**
   * Generate test steps for CRUD operations
   */
  generateCRUDTestSteps(
    screen: ScreenBlueprint,
    table: TableDef
  ): Map<string, TestStepGroup[]> {
    const crudSteps = new Map<string, TestStepGroup[]>();

    crudSteps.set('create', this.generateFromScreen(screen, table, 'create'));
    crudSteps.set('read', this.generateFromScreen(screen, table, 'read'));
    crudSteps.set('update', this.generateFromScreen(screen, table, 'update'));
    crudSteps.set('delete', this.generateFromScreen(screen, table, 'delete'));

    return crudSteps;
  }

  /**
   * Export test steps to various formats
   */
  exportToFormat(
    groups: TestStepGroup[],
    format: 'markdown' | 'json' | 'csv' | 'testrail'
  ): string {
    switch (format) {
      case 'markdown':
        return this.toMarkdown(groups);
      case 'json':
        return this.toJSON(groups);
      case 'csv':
        return this.toCSV(groups);
      case 'testrail':
        return this.toTestRailFormat(groups);
      default:
        return this.toMarkdown(groups);
    }
  }

  /**
   * Export to Markdown
   */
  private toMarkdown(groups: TestStepGroup[]): string {
    const lines: string[] = [];

    for (const group of groups) {
      lines.push(`## ${group.name}`);
      lines.push('');
      lines.push(`*${group.description}*`);
      if (group.isOptional) {
        lines.push('**(Optional)**');
      }
      lines.push('');

      for (const step of group.steps) {
        lines.push(`${step.order}. **${step.instruction}**`);
        lines.push(`   - Type: ${step.type}`);
        lines.push(`   - Expected: ${step.expectedBehavior}`);
        if (step.inputValue) {
          lines.push(`   - Test Data: \`${step.inputValue}\``);
        }
        lines.push('');
      }

      lines.push('---');
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Export to JSON
   */
  private toJSON(groups: TestStepGroup[]): string {
    return JSON.stringify(groups, null, 2);
  }

  /**
   * Export to CSV
   */
  private toCSV(groups: TestStepGroup[]): string {
    const rows: string[] = ['Step ID,Order,Type,Instruction,Expected Behavior,Test Data'];

    for (const group of groups) {
      for (const step of group.steps) {
        rows.push([
          step.id,
          step.order,
          step.type,
          `"${step.instruction.replace(/"/g, '""')}"`,
          `"${step.expectedBehavior.replace(/"/g, '""')}"`,
          step.inputValue ? `"${step.inputValue.replace(/"/g, '""')}"` : '',
        ].join(','));
      }
    }

    return rows.join('\n');
  }

  /**
   * Export to TestRail format
   */
  private toTestRailFormat(groups: TestStepGroup[]): string {
    const lines: string[] = [];

    lines.push('TestRail Import Format');
    lines.push('');

    for (const group of groups) {
      lines.push(`[TestCase]`);
      lines.push(`Name: ${group.name}`);
      lines.push(`Description: ${group.description}`);
      lines.push('');

      for (let i = 0; i < group.steps.length; i++) {
        const step = group.steps[i];
        lines.push(`Step ${i + 1}: ${step.instruction}`);
        lines.push(`Expected: ${step.expectedBehavior}`);
      }

      lines.push('');
      lines.push('---');
      lines.push('');
    }

    return lines.join('\n');
  }
}

/**
 * Create Test Step Generator
 */
export function createTestStepGenerator(): TestStepGenerator {
  return new TestStepGenerator();
}
