// =============================================================================
// Expected Result Generator - Intelligent Expected Result Generation
// =============================================================================
// Generates detailed expected results for UAT test cases including
// success criteria, error scenarios, and edge cases
// =============================================================================

import { TableDef, ColumnDef, ScreenBlueprint, ScreenField, ScreenAction, ValidationRule } from '../types';
import { WorkflowDefinition, WorkflowStep } from '../parsers/workflow-builder';
import { GeneratedTestStep, TestStepType } from './TestStepGeneration';

/**
 * Expected Result Types
 */
export type ExpectedResultType =
  | 'success'
  | 'validation_error'
  | 'business_rule_violation'
  | 'permission_denied'
  | 'system_error'
  | 'timeout'
  | 'partial_success';

/**
 * Expected Result
 */
export interface ExpectedResult {
  id: string;
  type: ExpectedResultType;
  category: string;
  description: string;
  conditions: string[];
  outcomes: ExpectedOutcome[];
  verificationPoints: VerificationPoint[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  isBlocking: boolean;
}

/**
 * Expected Outcome
 */
export interface ExpectedOutcome {
  element: string;
  expectedState: string;
  expectedValue?: string;
  isVisible: boolean;
  isEnabled: boolean;
  additionalChecks?: string[];
}

/**
 * Verification Point
 */
export interface VerificationPoint {
  id: string;
  description: string;
  type: 'visual' | 'data' | 'behavior' | 'performance';
  expectedValue: string;
  actualValuePlaceholder: string;
  passCriteria: string;
  failCriteria: string;
}

/**
 * Expected Result Scenario
 */
export interface ExpectedResultScenario {
  name: string;
  description: string;
  preconditions: string[];
  testSteps: string[];
  expectedResults: ExpectedResult[];
  alternativeOutcomes?: ExpectedResult[];
}

/**
 * Expected Result Generator
 */
export class ExpectedResultGenerator {
  private resultCounter = 0;

  /**
   * Generate expected results for a test step
   */
  generateForTestStep(
    step: GeneratedTestStep,
    screen?: ScreenBlueprint,
    table?: TableDef
  ): ExpectedResult[] {
    this.resultCounter = 0;
    const results: ExpectedResult[] = [];

    switch (step.type) {
      case 'navigation':
        results.push(this.generateNavigationResult(step));
        break;
      case 'input':
        results.push(...this.generateInputResults(step, screen, table));
        break;
      case 'selection':
        results.push(this.generateSelectionResult(step));
        break;
      case 'action':
        results.push(this.generateActionResult(step, screen));
        break;
      case 'verification':
        results.push(this.generateVerificationResult(step));
        break;
      case 'assertion':
        results.push(this.generateAssertionResult(step));
        break;
    }

    return results;
  }

  /**
   * Generate expected results for CRUD operations
   */
  generateForCRUD(
    screen: ScreenBlueprint,
    table: TableDef,
    operation: 'create' | 'read' | 'update' | 'delete'
  ): ExpectedResultScenario {
    switch (operation) {
      case 'create':
        return this.generateCreateScenario(screen, table);
      case 'read':
        return this.generateReadScenario(screen, table);
      case 'update':
        return this.generateUpdateScenario(screen, table);
      case 'delete':
        return this.generateDeleteScenario(screen, table);
    }
  }

  /**
   * Generate expected results for workflow
   */
  generateForWorkflow(workflow: WorkflowDefinition): ExpectedResultScenario[] {
    const scenarios: ExpectedResultScenario[] = [];

    // Main success scenario
    scenarios.push({
      name: `${workflow.name} - Success Path`,
      description: `Complete the ${workflow.name} workflow successfully`,
      preconditions: ['User has appropriate permissions', 'Required data is available'],
      testSteps: workflow.steps.map(s => s.name),
      expectedResults: workflow.steps.map(step => this.generateWorkflowStepResult(step)),
    });

    // Error scenarios for each step
    for (const step of workflow.steps) {
      if (step.isRequired) {
        scenarios.push(this.generateWorkflowErrorScenario(step, workflow));
      }
    }

    return scenarios;
  }

  /**
   * Generate validation error scenarios
   */
  generateValidationScenarios(
    field: ScreenField,
    table: TableDef
  ): ExpectedResultScenario[] {
    const scenarios: ExpectedResultScenario[] = [];
    const column = table.columns.find(c => c.name === field.columnName);

    if (!field.isRequired) return scenarios;

    // Required field missing
    scenarios.push({
      name: `${field.label} - Required Validation`,
      description: `Verify validation when ${field.label} is left empty`,
      preconditions: ['Form is open', 'All other required fields are filled'],
      testSteps: [
        `Leave ${field.label} empty`,
        'Click Submit button',
      ],
      expectedResults: [{
        id: this.generateResultId(),
        type: 'validation_error',
        category: 'Field Validation',
        description: `Validation error displayed for ${field.label}`,
        conditions: [`${field.label} is empty`, 'Submit is clicked'],
        outcomes: [{
          element: field.label,
          expectedState: 'error',
          expectedValue: `${field.label} is required`,
          isVisible: true,
          isEnabled: true,
        }],
        verificationPoints: [{
          id: `vp-${field.label}-required`,
          description: 'Error message visible',
          type: 'visual',
          expectedValue: `${field.label} is required`,
          actualValuePlaceholder: '[Actual error message]',
          passCriteria: 'Error message matches expected text',
          failCriteria: 'No error message or incorrect text',
        }],
        severity: 'high',
        isBlocking: true,
      }],
    });

    // Data type validation
    if (column && this.requiresDataTypeValidation(field, column)) {
      scenarios.push({
        name: `${field.label} - Data Type Validation`,
        description: `Verify validation when ${field.label} has invalid format`,
        preconditions: ['Form is open'],
        testSteps: [
          `Enter invalid value in ${field.label}`,
          'Click Submit button',
        ],
        expectedResults: [{
          id: this.generateResultId(),
          type: 'validation_error',
          category: 'Data Type Validation',
          description: `Invalid format error for ${field.label}`,
          conditions: [`${field.label} has invalid format`],
          outcomes: [{
            element: field.label,
            expectedState: 'error',
            expectedValue: this.getValidationMessage(field),
            isVisible: true,
            isEnabled: true,
          }],
          verificationPoints: [{
            id: `vp-${field.label}-format`,
            description: 'Format error message',
            type: 'visual',
            expectedValue: this.getValidationMessage(field),
            actualValuePlaceholder: '[Actual error message]',
            passCriteria: 'Error message indicates invalid format',
            failCriteria: 'No error or record is saved',
          }],
          severity: 'high',
          isBlocking: true,
        }],
      });
    }

    // Boundary validation
    if (column?.maxLength) {
      scenarios.push({
        name: `${field.label} - Max Length Validation`,
        description: `Verify validation when ${field.label} exceeds maximum length`,
        preconditions: ['Form is open'],
        testSteps: [
          `Enter ${parseInt(column.maxLength) + 1} characters in ${field.label}`,
          'Click Submit button',
        ],
        expectedResults: [{
          id: this.generateResultId(),
          type: 'validation_error',
          category: 'Boundary Validation',
          description: `Max length error for ${field.label}`,
          conditions: [`${field.label} exceeds ${column.maxLength} characters`],
          outcomes: [{
            element: field.label,
            expectedState: 'error',
            expectedValue: `Maximum ${column.maxLength} characters allowed`,
            isVisible: true,
            isEnabled: true,
          }],
          verificationPoints: [{
            id: `vp-${field.label}-maxlen`,
            description: 'Max length error',
            type: 'data',
            expectedValue: `Maximum ${column.maxLength} characters`,
            actualValuePlaceholder: '[Actual error message]',
            passCriteria: 'Input truncated or error shown',
            failCriteria: 'Invalid length accepted',
          }],
          severity: 'medium',
          isBlocking: true,
        }],
      });
    }

    return scenarios;
  }

  /**
   * Generate success result for navigation
   */
  private generateNavigationResult(step: GeneratedTestStep): ExpectedResult {
    return {
      id: this.generateResultId(),
      type: 'success',
      category: 'Navigation',
      description: `Navigation to ${step.targetElement} is successful`,
      conditions: ['User clicks on navigation element'],
      outcomes: [
        {
          element: step.targetElement || 'Page',
          expectedState: 'loaded',
          isVisible: true,
          isEnabled: true,
        },
        {
          element: 'URL',
          expectedState: 'changed',
          expectedValue: `URL contains ${step.targetElement?.toLowerCase()}`,
          isVisible: true,
          isEnabled: true,
        },
      ],
      verificationPoints: [
        {
          id: `vp-nav-${this.resultCounter}`,
          description: 'Page loads successfully',
          type: 'behavior',
          expectedValue: 'Page fully loaded',
          actualValuePlaceholder: '[Page load status]',
          passCriteria: 'No errors, content visible',
          failCriteria: 'Error page or timeout',
        },
      ],
      severity: 'critical',
      isBlocking: true,
    };
  }

  /**
   * Generate results for input step
   */
  private generateInputResults(
    step: GeneratedTestStep,
    screen?: ScreenBlueprint,
    table?: TableDef
  ): ExpectedResult[] {
    const results: ExpectedResult[] = [];

    // Success case
    results.push({
      id: this.generateResultId(),
      type: 'success',
      category: 'Input',
      description: `${step.targetElement} accepts valid input`,
      conditions: ['Valid input is provided'],
      outcomes: [{
        element: step.targetElement || 'Input field',
        expectedState: 'filled',
        expectedValue: step.inputValue,
        isVisible: true,
        isEnabled: true,
      }],
      verificationPoints: [{
        id: `vp-input-${this.resultCounter}`,
        description: 'Field shows entered value',
        type: 'data',
        expectedValue: step.inputValue || 'valid value',
        actualValuePlaceholder: '[Actual input value]',
        passCriteria: 'Value matches input',
        failCriteria: 'Value different or empty',
      }],
      severity: 'high',
      isBlocking: false,
    });

    // Validation error if required field
    if (step.testData && step.notes?.some(n => n.includes('required'))) {
      results.push({
        id: this.generateResultId(),
        type: 'validation_error',
        category: 'Required Field Validation',
        description: `Error when ${step.targetElement} is empty`,
        conditions: [`${step.targetElement} is left empty`, 'Submit is clicked'],
        outcomes: [{
          element: step.targetElement || 'Field',
          expectedState: 'error',
          expectedValue: 'Field is required',
          isVisible: true,
          isEnabled: true,
        }],
        verificationPoints: [{
          id: `vp-required-${this.resultCounter}`,
          description: 'Required field error shown',
          type: 'visual',
          expectedValue: 'Field is required',
          actualValuePlaceholder: '[Error message]',
          passCriteria: 'Error message displayed',
          failCriteria: 'No error or form submits',
        }],
        severity: 'high',
        isBlocking: true,
      });
    }

    return results;
  }

  /**
   * Generate result for selection step
   */
  private generateSelectionResult(step: GeneratedTestStep): ExpectedResult {
    return {
      id: this.generateResultId(),
      type: 'success',
      category: 'Selection',
      description: `${step.targetElement} selection works correctly`,
      conditions: ['User clicks on dropdown/option'],
      outcomes: [{
        element: step.targetElement || 'Selection',
        expectedState: 'selected',
        expectedValue: step.inputValue,
        isVisible: true,
        isEnabled: true,
      }],
      verificationPoints: [
        {
          id: `vp-select-${this.resultCounter}`,
          description: 'Dropdown opens',
          type: 'behavior',
          expectedValue: 'Dropdown list visible',
          actualValuePlaceholder: '[Dropdown state]',
          passCriteria: 'Options visible and selectable',
          failCriteria: 'Dropdown does not open',
        },
        {
          id: `vp-selected-${this.resultCounter}`,
          description: 'Value is selected',
          type: 'data',
          expectedValue: step.inputValue || 'selected option',
          actualValuePlaceholder: '[Selected value]',
          passCriteria: 'Correct option selected',
          failCriteria: 'Wrong selection or no selection',
        },
      ],
      severity: 'high',
      isBlocking: false,
    };
  }

  /**
   * Generate result for action step
   */
  private generateActionResult(
    step: GeneratedTestStep,
    screen?: ScreenBlueprint
  ): ExpectedResult {
    const actionName = step.targetElement?.toLowerCase() || '';

    // Submit/Save actions
    if (actionName.includes('save') || actionName.includes('submit') || actionName.includes('create')) {
      return {
        id: this.generateResultId(),
        type: 'success',
        category: 'Submit Action',
        description: 'Record is saved successfully',
        conditions: ['All required fields are valid', 'User clicks submit'],
        outcomes: [
          {
            element: 'Success Message',
            expectedState: 'visible',
            expectedValue: 'Record saved successfully',
            isVisible: true,
            isEnabled: true,
          },
          {
            element: 'Form',
            expectedState: 'closed or reset',
            isVisible: true,
            isEnabled: true,
          },
          {
            element: 'Record List',
            expectedState: 'updated',
            expectedValue: 'New record appears in list',
            isVisible: true,
            isEnabled: true,
          },
        ],
        verificationPoints: [
          {
            id: `vp-success-${this.resultCounter}`,
            description: 'Success message displayed',
            type: 'visual',
            expectedValue: 'Success message visible',
            actualValuePlaceholder: '[Message shown]',
            passCriteria: 'Green success message',
            failCriteria: 'Error or no message',
          },
          {
            id: `vp-record-${this.resultCounter}`,
            description: 'Record created in database',
            type: 'data',
            expectedValue: 'Record exists',
            actualValuePlaceholder: '[Database check]',
            passCriteria: 'Record found in table',
            failCriteria: 'Record not found',
          },
        ],
        severity: 'critical',
        isBlocking: true,
      };
    }

    // Delete action
    if (actionName.includes('delete') || actionName.includes('remove')) {
      return {
        id: this.generateResultId(),
        type: 'success',
        category: 'Delete Action',
        description: 'Record is deleted successfully',
        conditions: ['User confirms deletion', 'Record has no dependencies'],
        outcomes: [
          {
            element: 'Success Message',
            expectedState: 'visible',
            expectedValue: 'Record deleted successfully',
            isVisible: true,
            isEnabled: true,
          },
          {
            element: 'Record List',
            expectedState: 'updated',
            expectedValue: 'Record removed from list',
            isVisible: true,
            isEnabled: true,
          },
        ],
        verificationPoints: [
          {
            id: `vp-delete-${this.resultCounter}`,
            description: 'Confirmation dialog appears',
            type: 'behavior',
            expectedValue: 'Dialog with Confirm/Cancel',
            actualValuePlaceholder: '[Dialog state]',
            passCriteria: 'Dialog shown before deletion',
            failCriteria: 'Immediate deletion without confirmation',
          },
          {
            id: `vp-deleted-${this.resultCounter}`,
            description: 'Record removed from database',
            type: 'data',
            expectedValue: 'Record not found',
            actualValuePlaceholder: '[Database check]',
            passCriteria: 'Record no longer exists',
            failCriteria: 'Record still present',
          },
        ],
        severity: 'critical',
        isBlocking: true,
      };
    }

    // Generic action
    return {
      id: this.generateResultId(),
      type: 'success',
      category: 'Action',
      description: `Action ${step.targetElement} executed successfully`,
      conditions: ['User triggers the action'],
      outcomes: [{
        element: step.targetElement || 'Action result',
        expectedState: 'completed',
        isVisible: true,
        isEnabled: true,
      }],
      verificationPoints: [{
        id: `vp-action-${this.resultCounter}`,
        description: 'Action completes',
        type: 'behavior',
        expectedValue: 'Action executed without errors',
        actualValuePlaceholder: '[Action result]',
        passCriteria: 'Expected outcome achieved',
        failCriteria: 'Error or unexpected result',
      }],
      severity: 'high',
      isBlocking: false,
    };
  }

  /**
   * Generate verification result
   */
  private generateVerificationResult(step: GeneratedTestStep): ExpectedResult {
    return {
      id: this.generateResultId(),
      type: 'success',
      category: 'Verification',
      description: `${step.targetElement} matches expected value`,
      conditions: ['System displays the element correctly'],
      outcomes: [{
        element: step.targetElement || 'Element',
        expectedState: 'matching',
        expectedValue: step.expectedBehavior,
        isVisible: true,
        isEnabled: true,
      }],
      verificationPoints: [{
        id: `vp-verify-${this.resultCounter}`,
        description: 'Value matches expected',
        type: 'data',
        expectedValue: step.expectedBehavior,
        actualValuePlaceholder: '[Actual value]',
        passCriteria: 'Values match exactly',
        failCriteria: 'Values differ',
      }],
      severity: 'high',
      isBlocking: true,
    };
  }

  /**
   * Generate assertion result
   */
  private generateAssertionResult(step: GeneratedTestStep): ExpectedResult {
    return {
      id: this.generateResultId(),
      type: 'success',
      category: 'Assertion',
      description: step.expectedBehavior,
      conditions: ['Assertion evaluates to true'],
      outcomes: [{
        element: 'System State',
        expectedState: 'as expected',
        expectedValue: step.expectedBehavior,
        isVisible: true,
        isEnabled: true,
      }],
      verificationPoints: [{
        id: `vp-assert-${this.resultCounter}`,
        description: 'Assertion passes',
        type: 'behavior',
        expectedValue: 'True',
        actualValuePlaceholder: '[Assertion result]',
        passCriteria: 'Assertion returns true',
        failCriteria: 'Assertion returns false',
      }],
      severity: 'critical',
      isBlocking: true,
    };
  }

  /**
   * Generate create scenario
   */
  private generateCreateScenario(screen: ScreenBlueprint, table: TableDef): ExpectedResultScenario {
    return {
      name: `Create ${screen.title} - Success`,
      description: `Successfully create a new ${screen.title} record`,
      preconditions: [
        'User has create permission',
        'All required lookup data exists',
      ],
      testSteps: [
        'Navigate to form',
        'Fill all required fields',
        'Click Save',
      ],
      expectedResults: [
        {
          id: this.generateResultId(),
          type: 'success',
          category: 'Create Operation',
          description: 'Record created successfully',
          conditions: ['All validations pass'],
          outcomes: [
            {
              element: 'Success Message',
              expectedState: 'visible',
              expectedValue: 'Record created successfully',
              isVisible: true,
              isEnabled: true,
            },
            {
              element: 'Database',
              expectedState: 'inserted',
              expectedValue: 'New record exists with generated ID',
              isVisible: false,
              isEnabled: true,
            },
          ],
          verificationPoints: [
            {
              id: 'vp-create-success',
              description: 'Record in database',
              type: 'data',
              expectedValue: 'Record exists',
              actualValuePlaceholder: '[Query result]',
              passCriteria: 'Record found with correct values',
              failCriteria: 'Record not found or values incorrect',
            },
          ],
          severity: 'critical',
          isBlocking: true,
        },
      ],
    };
  }

  /**
   * Generate read scenario
   */
  private generateReadScenario(screen: ScreenBlueprint, table: TableDef): ExpectedResultScenario {
    return {
      name: `Read ${screen.title} - Success`,
      description: `Successfully view ${screen.title} records`,
      preconditions: ['Records exist in system', 'User has view permission'],
      testSteps: ['Navigate to list', 'Search/Filter', 'View detail'],
      expectedResults: [
        {
          id: this.generateResultId(),
          type: 'success',
          category: 'Read Operation',
          description: 'Records displayed correctly',
          conditions: ['Records exist', 'User has permission'],
          outcomes: [
            {
              element: 'List View',
              expectedState: 'populated',
              expectedValue: 'Records visible in table',
              isVisible: true,
              isEnabled: true,
            },
            {
              element: 'Search Results',
              expectedState: 'filtered',
              expectedValue: 'Matching records shown',
              isVisible: true,
              isEnabled: true,
            },
          ],
          verificationPoints: [
            {
              id: 'vp-read-records',
              description: 'Correct records shown',
              type: 'data',
              expectedValue: 'Expected record count',
              actualValuePlaceholder: '[Record count]',
              passCriteria: 'Count matches expected',
              failCriteria: 'Missing or extra records',
            },
          ],
          severity: 'high',
          isBlocking: false,
        },
      ],
    };
  }

  /**
   * Generate update scenario
   */
  private generateUpdateScenario(screen: ScreenBlueprint, table: TableDef): ExpectedResultScenario {
    return {
      name: `Update ${screen.title} - Success`,
      description: `Successfully update a ${screen.title} record`,
      preconditions: [
        'Record exists',
        'User has edit permission',
      ],
      testSteps: ['Select record', 'Modify fields', 'Save changes'],
      expectedResults: [
        {
          id: this.generateResultId(),
          type: 'success',
          category: 'Update Operation',
          description: 'Record updated successfully',
          conditions: ['Changes are valid'],
          outcomes: [
            {
              element: 'Success Message',
              expectedState: 'visible',
              expectedValue: 'Record updated successfully',
              isVisible: true,
              isEnabled: true,
            },
            {
              element: 'Database',
              expectedState: 'updated',
              expectedValue: 'Record reflects changes',
              isVisible: false,
              isEnabled: true,
            },
          ],
          verificationPoints: [
            {
              id: 'vp-update-success',
              description: 'Changes persisted',
              type: 'data',
              expectedValue: 'Updated values',
              actualValuePlaceholder: '[Database values]',
              passCriteria: 'All changes saved correctly',
              failCriteria: 'Some or all changes not saved',
            },
          ],
          severity: 'critical',
          isBlocking: true,
        },
      ],
    };
  }

  /**
   * Generate delete scenario
   */
  private generateDeleteScenario(screen: ScreenBlueprint, table: TableDef): ExpectedResultScenario {
    return {
      name: `Delete ${screen.title} - Success`,
      description: `Successfully delete a ${screen.title} record`,
      preconditions: [
        'Record exists',
        'User has delete permission',
        'Record has no dependencies',
      ],
      testSteps: ['Select record', 'Click Delete', 'Confirm deletion'],
      expectedResults: [
        {
          id: this.generateResultId(),
          type: 'success',
          category: 'Delete Operation',
          description: 'Record deleted successfully',
          conditions: ['Confirmation provided', 'No dependencies'],
          outcomes: [
            {
              element: 'Success Message',
              expectedState: 'visible',
              expectedValue: 'Record deleted successfully',
              isVisible: true,
              isEnabled: true,
            },
            {
              element: 'Database',
              expectedState: 'deleted',
              expectedValue: 'Record removed',
              isVisible: false,
              isEnabled: true,
            },
          ],
          verificationPoints: [
            {
              id: 'vp-delete-success',
              description: 'Record removed',
              type: 'data',
              expectedValue: 'Record not found',
              actualValuePlaceholder: '[Query result]',
              passCriteria: 'Record no longer exists',
              failCriteria: 'Record still present',
            },
          ],
          severity: 'critical',
          isBlocking: true,
        },
      ],
    };
  }

  /**
   * Generate workflow step result
   */
  private generateWorkflowStepResult(step: WorkflowStep): ExpectedResult {
    return {
      id: this.generateResultId(),
      type: 'success',
      category: 'Workflow Step',
      description: step.description,
      conditions: ['Step executes successfully'],
      outcomes: step.outputFields.map(field => ({
        element: field,
        expectedState: 'generated',
        expectedValue: `Value for ${field}`,
        isVisible: true,
        isEnabled: true,
      })),
      verificationPoints: [{
        id: `vp-wf-step-${step.id}`,
        description: `Step ${step.order} completed`,
        type: 'behavior',
        expectedValue: 'Step completed without errors',
        actualValuePlaceholder: '[Step result]',
        passCriteria: 'Step moves to next',
        failCriteria: 'Workflow stops or errors',
      }],
      severity: step.isRequired ? 'critical' : 'medium',
      isBlocking: step.isRequired,
    };
  }

  /**
   * Generate workflow error scenario
   */
  private generateWorkflowErrorScenario(
    step: WorkflowStep,
    workflow: WorkflowDefinition
  ): ExpectedResultScenario {
    return {
      name: `${workflow.name} - ${step.name} Failure`,
      description: `Handle failure at ${step.name}`,
      preconditions: ['Workflow started', 'Previous steps completed'],
      testSteps: [
        `Reach ${step.name}`,
        'Trigger error condition',
        'Verify error handling',
      ],
      expectedResults: [{
        id: this.generateResultId(),
        type: 'system_error',
        category: 'Workflow Error',
        description: `Error at ${step.name} is handled gracefully`,
        conditions: ['Error condition triggered'],
        outcomes: [
          {
            element: 'Error Message',
            expectedState: 'visible',
            expectedValue: `Error: ${step.name} failed`,
            isVisible: true,
            isEnabled: true,
          },
          {
            element: 'Workflow State',
            expectedState: 'paused or rolled back',
            expectedValue: 'User can retry or cancel',
            isVisible: true,
            isEnabled: true,
          },
        ],
        verificationPoints: [{
          id: `vp-wf-error-${step.id}`,
          description: 'Error handled gracefully',
          type: 'behavior',
          expectedValue: 'User informed, can recover',
          actualValuePlaceholder: '[Error handling]',
          passCriteria: 'Clear error message, recovery options',
          failCriteria: 'Workflow stuck or data corrupted',
        }],
        severity: 'high',
        isBlocking: true,
      }],
    };
  }

  // Helper methods
  private requiresDataTypeValidation(field: ScreenField, column: ColumnDef): boolean {
    return ['email_input', 'phone_input', 'number_input', 'currency_input', 'url_input'].includes(field.uiType);
  }

  private getValidationMessage(field: ScreenField): string {
    switch (field.uiType) {
      case 'email_input':
        return 'Please enter a valid email address';
      case 'phone_input':
        return 'Please enter a valid phone number';
      case 'number_input':
      case 'currency_input':
        return 'Please enter a valid number';
      case 'url_input':
        return 'Please enter a valid URL';
      default:
        return 'Invalid format';
    }
  }

  private generateResultId(): string {
    return `result-${++this.resultCounter}`;
  }

  /**
   * Export expected results to format
   */
  exportToFormat(
    results: ExpectedResult[],
    format: 'markdown' | 'json' | 'csv' | 'testrail'
  ): string {
    switch (format) {
      case 'markdown':
        return this.toMarkdown(results);
      case 'json':
        return JSON.stringify(results, null, 2);
      case 'csv':
        return this.toCSV(results);
      case 'testrail':
        return this.toTestRailFormat(results);
      default:
        return this.toMarkdown(results);
    }
  }

  private toMarkdown(results: ExpectedResult[]): string {
    const lines: string[] = [];

    for (const result of results) {
      lines.push(`### ${result.category} - ${result.type}`);
      lines.push('');
      lines.push(`**Description:** ${result.description}`);
      lines.push('');
      lines.push(`**Severity:** ${result.severity}`);
      lines.push(`**Blocking:** ${result.isBlocking ? 'Yes' : 'No'}`);
      lines.push('');

      if (result.conditions.length > 0) {
        lines.push('**Conditions:**');
        for (const cond of result.conditions) {
          lines.push(`- ${cond}`);
        }
        lines.push('');
      }

      lines.push('**Expected Outcomes:**');
      lines.push('| Element | State | Value |');
      lines.push('|---------|-------|-------|');
      for (const outcome of result.outcomes) {
        lines.push(`| ${outcome.element} | ${outcome.expectedState} | ${outcome.expectedValue || 'N/A'} |`);
      }
      lines.push('');

      lines.push('**Verification Points:**');
      for (const vp of result.verificationPoints) {
        lines.push(`- ${vp.description}`);
        lines.push(`  - Expected: ${vp.expectedValue}`);
        lines.push(`  - Pass: ${vp.passCriteria}`);
      }
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    return lines.join('\n');
  }

  private toCSV(results: ExpectedResult[]): string {
    const rows: string[] = ['ID,Type,Category,Description,Severity,Blocking'];
    for (const result of results) {
      rows.push([
        result.id,
        result.type,
        result.category,
        `"${result.description.replace(/"/g, '""')}"`,
        result.severity,
        result.isBlocking ? 'Yes' : 'No',
      ].join(','));
    }
    return rows.join('\n');
  }

  private toTestRailFormat(results: ExpectedResult[]): string {
    const lines: string[] = [];
    for (const result of results) {
      lines.push(`Expected Result: ${result.description}`);
      for (const outcome of result.outcomes) {
        lines.push(`  - ${outcome.element}: ${outcome.expectedState}`);
      }
      lines.push('');
    }
    return lines.join('\n');
  }
}

/**
 * Create Expected Result Generator
 */
export function createExpectedResultGenerator(): ExpectedResultGenerator {
  return new ExpectedResultGenerator();
}
