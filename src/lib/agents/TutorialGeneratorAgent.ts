// =============================================================================
// Tutorial Generator Agent - Intelligent Tutorial & Documentation Generation
// =============================================================================
// Generates step-by-step tutorials from forms, creates user manuals per module,
// generates developer documentation, and exports to Markdown/PDF
// =============================================================================

import {
  DocumentationGenerator,
  Document,
  DocumentationType,
  DocumentationFormat,
  TutorialStep,
} from '../generators/DocumentationGenerator';
import { WorkflowDefinition, WorkflowStep } from '../parsers/workflow-builder';
import { TableDef, ColumnDef, ModuleDef, ScreenBlueprint, ScreenField, ScreenAction } from '../types';

/**
 * Tutorial Generator Configuration
 */
export interface TutorialGeneratorConfig {
  projectId: string;
  projectName: string;
  includeScreenshots: boolean;
  includeCodeExamples: boolean;
  includeTroubleshooting: boolean;
  defaultLanguage: string;
  outputFormats: DocumentationFormat[];
}

/**
 * Form Analysis Result
 */
export interface FormAnalysisResult {
  formName: string;
  tableName: string;
  moduleName: string;
  fields: FormFieldAnalysis[];
  actions: FormActionAnalysis[];
  validations: FormValidationAnalysis[];
  workflow: string[];
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
}

/**
 * Form Field Analysis
 */
export interface FormFieldAnalysis {
  name: string;
  label: string;
  type: string;
  isRequired: boolean;
  hasValidation: boolean;
  hasDefaultValue: boolean;
  dependencies: string[];
  order: number;
}

/**
 * Form Action Analysis
 */
export interface FormActionAnalysis {
  name: string;
  type: 'submit' | 'cancel' | 'reset' | 'custom';
  requiresConfirmation: boolean;
  outcome: string;
}

/**
 * Form Validation Analysis
 */
export interface FormValidationAnalysis {
  fieldName: string;
  validationType: string;
  message: string;
  isBlocking: boolean;
}

/**
 * Generated Tutorial
 */
export interface GeneratedTutorial {
  id: string;
  title: string;
  moduleName: string;
  steps: TutorialStep[];
  relatedTables: string[];
  estimatedTime: number; // minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  exports: { format: DocumentationFormat; content: string }[];
}

/**
 * Tutorial Generation Result
 */
export interface TutorialGenerationResult {
  tutorials: GeneratedTutorial[];
  userManuals: Document[];
  developerDocs: Document[];
  quickStartGuides: Document[];
  apiReferences: Document[];
  statistics: {
    totalTutorials: number;
    totalSteps: number;
    totalDocuments: number;
    generationTimeMs: number;
  };
}

/**
 * Tutorial Generator Agent
 */
export class TutorialGeneratorAgent {
  private config: TutorialGeneratorConfig;
  private docGenerator: DocumentationGenerator;
  private tutorials: GeneratedTutorial[] = [];

  constructor(config: TutorialGeneratorConfig) {
    this.config = config;
    this.docGenerator = new DocumentationGenerator();
  }

  /**
   * Generate all documentation and tutorials
   */
  generateAll(
    modules: ModuleDef[],
    tables: TableDef[],
    screens: ScreenBlueprint[],
    workflows: WorkflowDefinition[]
  ): TutorialGenerationResult {
    const startTime = Date.now();

    const userManuals: Document[] = [];
    const developerDocs: Document[] = [];
    const quickStartGuides: Document[] = [];
    const apiReferences: Document[] = [];
    this.tutorials = [];

    // Generate for each module
    for (const module of modules) {
      const moduleScreens = screens.filter(s => module.tables.includes(s.tableName));
      const moduleTables = tables.filter(t => module.tables.includes(t.tableName));
      const moduleWorkflows = workflows.filter(w => w.module === module.key);

      // User Manual
      userManuals.push(
        this.docGenerator.generateUserManual(module, moduleScreens, moduleTables)
      );

      // Developer Documentation
      developerDocs.push(
        this.docGenerator.generateDeveloperDocumentation(module, moduleTables, moduleWorkflows)
      );

      // Quick Start Guide
      quickStartGuides.push(
        this.docGenerator.generateQuickStartGuide(module, moduleScreens)
      );

      // API Reference
      apiReferences.push(
        this.docGenerator.generateAPIReference(module, moduleTables)
      );

      // Generate tutorials from screens
      for (const screen of moduleScreens) {
        const tutorial = this.generateTutorialFromScreen(screen, module, moduleTables);
        if (tutorial) {
          this.tutorials.push(tutorial);
        }
      }

      // Generate tutorials from workflows
      for (const workflow of moduleWorkflows) {
        const tutorial = this.generateTutorialFromWorkflow(workflow, module);
        if (tutorial) {
          this.tutorials.push(tutorial);
        }
      }
    }

    // Calculate statistics
    const totalSteps = this.tutorials.reduce((sum, t) => sum + t.steps.length, 0);

    return {
      tutorials: this.tutorials,
      userManuals,
      developerDocs,
      quickStartGuides,
      apiReferences,
      statistics: {
        totalTutorials: this.tutorials.length,
        totalSteps,
        totalDocuments: userManuals.length + developerDocs.length + quickStartGuides.length + apiReferences.length,
        generationTimeMs: Date.now() - startTime,
      },
    };
  }

  /**
   * Generate tutorial from screen
   */
  generateTutorialFromScreen(
    screen: ScreenBlueprint,
    module: ModuleDef,
    tables: TableDef[]
  ): GeneratedTutorial | null {
    const table = tables.find(t => t.tableName === screen.tableName);
    if (!table) return null;

    const steps: TutorialStep[] = [];
    const tutorialId = `tutorial-${screen.tableName}-${screen.screenType}`;

    switch (screen.screenType) {
      case 'form':
        steps.push(...this.generateFormTutorialSteps(screen, table, module));
        break;
      case 'list':
        steps.push(...this.generateListTutorialSteps(screen, table, module));
        break;
      case 'detail':
        steps.push(...this.generateDetailTutorialSteps(screen, table, module));
        break;
      case 'dashboard':
        steps.push(...this.generateDashboardTutorialSteps(screen, table, module));
        break;
    }

    if (steps.length === 0) return null;

    const tutorial: GeneratedTutorial = {
      id: tutorialId,
      title: this.generateTutorialTitle(screen, module),
      moduleName: module.key,
      steps,
      relatedTables: [screen.tableName],
      estimatedTime: Math.ceil(steps.length * 2), // 2 minutes per step
      difficulty: this.determineDifficulty(screen, table),
      exports: [],
    };

    // Generate exports
    for (const format of this.config.outputFormats) {
      const document = this.createDocumentFromTutorial(tutorial);
      tutorial.exports.push({
        format,
        content: this.docGenerator.exportDocument(document, format),
      });
    }

    return tutorial;
  }

  /**
   * Generate form tutorial steps
   */
  private generateFormTutorialSteps(
    screen: ScreenBlueprint,
    table: TableDef,
    module: ModuleDef
  ): TutorialStep[] {
    const steps: TutorialStep[] = [];
    let stepOrder = 1;

    // Introduction step
    steps.push({
      id: `step-intro`,
      title: 'Getting Started',
      description: `In this tutorial, you will learn how to ${screen.title} in ${module.name}.`,
      instructions: [
        `Navigate to ${module.name} from the main menu`,
        `Click on "${screen.title}" to open the form`,
      ],
      tips: ['Make sure you have the necessary permissions before proceeding'],
    });

    // Navigation step
    steps.push({
      id: `step-nav-${stepOrder++}`,
      title: 'Navigate to the Form',
      description: `Access the ${screen.title} form.`,
      instructions: [
        `Click on "${module.name}" in the main navigation`,
        `Look for the "Add New" or "Create" button`,
        `Click to open a blank form`,
      ],
      expectedOutcome: 'The form opens with empty fields ready for input.',
    });

    // Field instruction steps
    const requiredFields = screen.fields.filter(f => f.isRequired);
    const optionalFields = screen.fields.filter(f => !f.isRequired);

    // Group required fields
    if (requiredFields.length > 0) {
      steps.push({
        id: `step-required-${stepOrder++}`,
        title: 'Fill Required Fields',
        description: 'Complete all required fields marked with an asterisk (*).',
        instructions: requiredFields.map(f =>
          this.generateFieldInstruction(f, table)
        ),
        warnings: ['All required fields must be completed before you can save'],
      });
    }

    // Group optional fields
    if (optionalFields.length > 0) {
      steps.push({
        id: `step-optional-${stepOrder++}`,
        title: 'Complete Optional Fields (If Needed)',
        description: 'Fill in any optional fields that are relevant.',
        instructions: optionalFields.slice(0, 5).map(f =>
          this.generateFieldInstruction(f, table)
        ),
        tips: ['Optional fields can be left blank if not applicable'],
      });
    }

    // Validation step
    steps.push({
      id: `step-validate-${stepOrder++}`,
      title: 'Review Your Input',
      description: 'Before submitting, review all entered information.',
      instructions: [
        'Check all field values for accuracy',
        'Ensure required fields are completed',
        'Verify any dropdown selections',
      ],
      tips: ['Take a moment to verify your entries before submitting'],
    });

    // Submit step
    const submitAction = screen.actions.find(a => a.type === 'create' || a.type === 'edit');
    if (submitAction) {
      steps.push({
        id: `step-submit-${stepOrder++}`,
        title: 'Submit the Form',
        description: `Click "${submitAction.label}" to save your data.`,
        instructions: [
          `Click the "${submitAction.label}" button`,
          submitAction.requiresConfirmation
            ? 'Confirm the action in the dialog that appears'
            : 'Wait for the system to process your request',
          'Look for a success message',
        ],
        warnings: submitAction.requiresConfirmation
          ? ['You will need to confirm before the action is executed']
          : undefined,
        expectedOutcome: `A success message appears and the record is saved.`,
      });
    }

    // Verification step
    steps.push({
      id: `step-verify-${stepOrder++}`,
      title: 'Verify the Result',
      description: 'Confirm that your record was saved correctly.',
      instructions: [
        'Navigate to the list view',
        'Search for your newly created record',
        'Verify all information is correct',
      ],
      expectedOutcome: 'Your record appears in the list with all correct information.',
    });

    return steps;
  }

  /**
   * Generate list tutorial steps
   */
  private generateListTutorialSteps(
    screen: ScreenBlueprint,
    table: TableDef,
    module: ModuleDef
  ): TutorialStep[] {
    const steps: TutorialStep[] = [];

    steps.push({
      id: 'step-list-intro',
      title: 'Understanding the List View',
      description: `The ${screen.title} shows all records in a tabular format.`,
      instructions: [
        `Navigate to ${module.name} from the main menu`,
        'The list view shows all records by default',
      ],
    });

    // Search/Filter
    if (screen.filters && screen.filters.length > 0) {
      steps.push({
        id: 'step-list-filter',
        title: 'Using Filters',
        description: 'Filter the list to find specific records.',
        instructions: [
          'Locate the filter panel',
          `Use filters: ${screen.filters.map(f => f.label).join(', ')}`,
          'Click "Apply" to filter results',
        ],
        tips: ['Filters help you quickly find the records you need'],
      });
    }

    // Actions
    steps.push({
      id: 'step-list-actions',
      title: 'Available Actions',
      description: 'Perform actions on records in the list.',
      instructions: screen.actions.map(a =>
        `"${a.label}" - ${a.type} action${a.requiresConfirmation ? ' (requires confirmation)' : ''}`
      ),
    });

    return steps;
  }

  /**
   * Generate detail tutorial steps
   */
  private generateDetailTutorialSteps(
    screen: ScreenBlueprint,
    table: TableDef,
    module: ModuleDef
  ): TutorialStep[] {
    const steps: TutorialStep[] = [];

    steps.push({
      id: 'step-detail-intro',
      title: 'Viewing Record Details',
      description: `The ${screen.title} shows complete information about a record.`,
      instructions: [
        `Navigate to ${module.name} list`,
        'Click on a record to view its details',
        'All field values are displayed in read-only format',
      ],
    });

    steps.push({
      id: 'step-detail-edit',
      title: 'Editing the Record',
      description: 'If you have permission, you can edit the record.',
      instructions: [
        'Click the "Edit" button',
        'Modify the desired fields',
        'Click "Save" to update',
      ],
      warnings: ['You need edit permission to modify records'],
    });

    return steps;
  }

  /**
   * Generate dashboard tutorial steps
   */
  private generateDashboardTutorialSteps(
    screen: ScreenBlueprint,
    table: TableDef,
    module: ModuleDef
  ): TutorialStep[] {
    const steps: TutorialStep[] = [];

    steps.push({
      id: 'step-dash-intro',
      title: 'Dashboard Overview',
      description: `The ${screen.title} provides a visual summary of key metrics.`,
      instructions: [
        `Navigate to ${module.name} Dashboard`,
        'Review the displayed charts and statistics',
        'Each widget shows different aspects of the data',
      ],
      tips: [
        'Dashboards are updated in real-time',
        'Click on chart elements to drill down into details',
      ],
    });

    steps.push({
      id: 'step-dash-widgets',
      title: 'Understanding Widgets',
      description: 'Each widget displays specific information.',
      instructions: [
        'Summary cards show totals and counts',
        'Charts visualize trends and distributions',
        'Tables list recent or important records',
      ],
    });

    return steps;
  }

  /**
   * Generate tutorial from workflow
   */
  generateTutorialFromWorkflow(
    workflow: WorkflowDefinition,
    module: ModuleDef
  ): GeneratedTutorial | null {
    const steps: TutorialStep[] = [];

    // Introduction
    steps.push({
      id: `step-wf-intro`,
      title: 'Workflow Overview',
      description: `This tutorial guides you through the ${workflow.name} workflow.`,
      instructions: [
        `The ${workflow.name} has ${workflow.totalSteps} steps`,
        `Complexity: ${workflow.complexity}`,
        `Module: ${module.name}`,
      ],
    });

    // Generate step for each workflow step
    for (const wfStep of workflow.steps) {
      steps.push(this.convertWorkflowStepToTutorialStep(wfStep));
    }

    // Completion
    steps.push({
      id: `step-wf-complete`,
      title: 'Workflow Complete',
      description: 'You have successfully completed the workflow.',
      instructions: [
        'Verify all steps were completed successfully',
        'Check for any notifications or follow-up actions',
      ],
    });

    const tutorial: GeneratedTutorial = {
      id: `tutorial-workflow-${workflow.id}`,
      title: `${workflow.name} - Step by Step`,
      moduleName: module.key,
      steps,
      relatedTables: workflow.steps.flatMap(s => s.tablesUsed),
      estimatedTime: Math.ceil(steps.length * 3),
      difficulty: workflow.complexity === 'simple' ? 'beginner' :
                  workflow.complexity === 'moderate' ? 'intermediate' : 'advanced',
      exports: [],
    };

    // Generate exports
    const document = this.createDocumentFromTutorial(tutorial);
    for (const format of this.config.outputFormats) {
      tutorial.exports.push({
        format,
        content: this.docGenerator.exportDocument(document, format),
      });
    }

    return tutorial;
  }

  /**
   * Convert workflow step to tutorial step
   */
  private convertWorkflowStepToTutorialStep(wfStep: WorkflowStep): TutorialStep {
    return {
      id: `step-wf-${wfStep.id}`,
      title: `Step ${wfStep.order}: ${wfStep.name}`,
      description: wfStep.description,
      instructions: [
        ...wfStep.inputParameters.map(p => `Provide input: ${p}`),
        wfStep.isRequired
          ? 'This step is required'
          : 'This step is optional',
        ...wfStep.tablesUsed.map(t => `Data is saved to: ${t}`),
      ],
      warnings: wfStep.isConditional
        ? ['This step may be skipped based on conditions']
        : undefined,
      expectedOutcome: wfStep.outputFields.length > 0
        ? `Output: ${wfStep.outputFields.join(', ')}`
        : 'Step completed successfully',
    };
  }

  /**
   * Generate tutorial from form analysis
   */
  generateTutorialFromFormAnalysis(
    analysis: FormAnalysisResult,
    module: ModuleDef
  ): GeneratedTutorial {
    const steps: TutorialStep[] = [];

    // Introduction
    steps.push({
      id: 'step-form-intro',
      title: 'Introduction',
      description: `This tutorial covers the ${analysis.formName} form in ${analysis.moduleName}.`,
      instructions: ['Follow each step carefully to complete the form.'],
    });

    // Group fields by logical sections
    const fieldGroups = this.groupFieldsBySection(analysis.fields);

    for (const [section, fields] of Object.entries(fieldGroups)) {
      steps.push({
        id: `step-section-${this.slugify(section)}`,
        title: section,
        description: `Complete the ${section.toLowerCase()} information.`,
        instructions: fields.map(f =>
          `${f.isRequired ? '(Required) ' : ''}${f.label}: Enter ${f.type} value${f.hasValidation ? ' (validation applies)' : ''}`
        ),
        warnings: fields.filter(f => f.isRequired).map(f =>
          `${f.label} is a required field`
        ),
      });
    }

    // Actions
    steps.push({
      id: 'step-form-actions',
      title: 'Available Actions',
      description: 'After completing the form, you can perform these actions.',
      instructions: analysis.actions.map(a =>
        `"${a.name}" - ${a.outcome}${a.requiresConfirmation ? ' (confirmation required)' : ''}`
      ),
    });

    const tutorial: GeneratedTutorial = {
      id: `tutorial-form-${analysis.formName}`,
      title: `How to Use ${analysis.formName}`,
      moduleName: module.key,
      steps,
      relatedTables: [analysis.tableName],
      estimatedTime: Math.ceil(steps.length * 2),
      difficulty: analysis.estimatedComplexity === 'simple' ? 'beginner' :
                  analysis.estimatedComplexity === 'moderate' ? 'intermediate' : 'advanced',
      exports: [],
    };

    return tutorial;
  }

  /**
   * Analyze form from screen blueprint
   */
  analyzeForm(screen: ScreenBlueprint, table: TableDef): FormAnalysisResult {
    return {
      formName: screen.title,
      tableName: screen.tableName,
      moduleName: screen.tableName,
      fields: screen.fields.map((f, index) => ({
        name: f.columnName,
        label: f.label,
        type: f.uiType,
        isRequired: f.isRequired,
        hasValidation: (f.validation?.length || 0) > 0,
        hasDefaultValue: !!f.defaultValue,
        dependencies: [],
        order: index,
      })),
      actions: screen.actions.map(a => ({
        name: a.label,
        type: a.type,
        requiresConfirmation: a.requiresConfirmation || false,
        outcome: `${a.type} action`,
      })),
      validations: screen.fields
        .filter(f => f.validation && f.validation.length > 0)
        .flatMap(f =>
          f.validation!.map(v => ({
            fieldName: f.label,
            validationType: v.type,
            message: v.message || `${v.type} validation`,
            isBlocking: v.type === 'required',
          }))
        ),
      workflow: [],
      estimatedComplexity: screen.fields.length > 10 ? 'complex' :
                          screen.fields.length > 5 ? 'moderate' : 'simple',
    };
  }

  /**
   * Generate quick reference card
   */
  generateQuickReferenceCard(module: ModuleDef, tables: TableDef[]): string {
    const lines: string[] = [];

    lines.push(`# ${module.name} - Quick Reference`);
    lines.push('');
    lines.push('## Keyboard Shortcuts');
    lines.push('| Action | Shortcut |');
    lines.push('|--------|----------|');
    lines.push('| Save | Ctrl+S |');
    lines.push('| Cancel | Escape |');
    lines.push('| New Record | Ctrl+N |');
    lines.push('| Search | Ctrl+F |');
    lines.push('');

    lines.push('## Common Actions');
    lines.push('| Action | Location |');
    lines.push('|--------|----------|');
    lines.push('| Create New | Click "Add New" button |');
    lines.push('| Edit | Click record row or Edit button |');
    lines.push('| Delete | Click Delete button (confirmation required) |');
    lines.push('| Export | Click Export in toolbar |');
    lines.push('');

    lines.push('## Tables');
    for (const tableName of module.tables) {
      const table = tables.find(t => t.tableName === tableName);
      if (table) {
        lines.push(`### ${tableName}`);
        lines.push(`- Columns: ${table.columns.length}`);
        lines.push(`- Required: ${table.columns.filter(c => !c.isNullable).length}`);
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  // Helper methods
  private generateFieldInstruction(field: ScreenField, table: TableDef): string {
    const column = table.columns.find(c => c.name === field.columnName);
    let instruction = `${field.label}: `;

    switch (field.uiType) {
      case 'dropdown':
      case 'multi_select':
        instruction += `Select from the dropdown options`;
        break;
      case 'date_picker':
      case 'datetime_picker':
        instruction += `Select a date${field.uiType === 'datetime_picker' ? ' and time' : ''}`;
        break;
      case 'toggle':
      case 'checkbox':
        instruction += `Check or uncheck the box`;
        break;
      case 'textarea':
      case 'rich_text':
        instruction += `Enter text in the text area`;
        break;
      case 'number_input':
      case 'currency_input':
        instruction += `Enter a numeric value`;
        break;
      case 'email_input':
        instruction += `Enter a valid email address`;
        break;
      case 'phone_input':
        instruction += `Enter a phone number`;
        break;
      case 'file_upload':
      case 'image_upload':
        instruction += `Upload a file`;
        break;
      default:
        instruction += `Enter the value`;
    }

    if (field.isRequired) {
      instruction += ` (required)`;
    }

    if (column?.maxLength) {
      instruction += ` [max ${column.maxLength} characters]`;
    }

    return instruction;
  }

  private generateTutorialTitle(screen: ScreenBlueprint, module: ModuleDef): string {
    const action = screen.screenType === 'form' ? 'Use' :
                   screen.screenType === 'list' ? 'Browse' :
                   screen.screenType === 'detail' ? 'View' : 'Understand';
    return `${action} ${screen.title} in ${module.name}`;
  }

  private determineDifficulty(
    screen: ScreenBlueprint,
    table: TableDef
  ): 'beginner' | 'intermediate' | 'advanced' {
    const fieldCount = screen.fields.length;
    const fkCount = table.foreignKeys.length;

    if (fieldCount <= 5 && fkCount <= 1) return 'beginner';
    if (fieldCount <= 15 && fkCount <= 3) return 'intermediate';
    return 'advanced';
  }

  private groupFieldsBySection(
    fields: FormFieldAnalysis[]
  ): Record<string, FormFieldAnalysis[]> {
    const groups: Record<string, FormFieldAnalysis[]> = {
      'Required Information': fields.filter(f => f.isRequired),
      'Additional Details': fields.filter(f => !f.isRequired),
    };

    // Remove empty groups
    for (const key of Object.keys(groups)) {
      if (groups[key].length === 0) {
        delete groups[key];
      }
    }

    return groups;
  }

  private createDocumentFromTutorial(tutorial: GeneratedTutorial): Document {
    return {
      id: tutorial.id,
      type: 'tutorial',
      title: tutorial.title,
      description: `Step-by-step tutorial with ${tutorial.steps.length} steps`,
      version: '1.0.0',
      generatedAt: new Date(),
      author: 'AI Enterprise Architect',
      sections: tutorial.steps.map((step, index) => ({
        id: step.id,
        title: step.title,
        content: step.description,
        order: index + 1,
        subsections: [],
        warnings: step.warnings,
        tips: step.tips,
      })),
      metadata: {
        moduleName: tutorial.moduleName,
        targetAudience: 'end_user',
        difficulty: tutorial.difficulty,
        estimatedReadTime: tutorial.estimatedTime,
        tags: [tutorial.moduleName, 'tutorial'],
      },
      tableOfContents: tutorial.steps.map(step => ({
        id: step.id,
        title: step.title,
        level: 1,
        children: [],
      })),
    };
  }

  private slugify(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

/**
 * Create Tutorial Generator Agent
 */
export function createTutorialGeneratorAgent(config: TutorialGeneratorConfig): TutorialGeneratorAgent {
  return new TutorialGeneratorAgent(config);
}

/**
 * Quick tutorial generation from screen
 */
export function generateQuickTutorial(
  screen: ScreenBlueprint,
  module: ModuleDef,
  table: TableDef
): GeneratedTutorial | null {
  const agent = new TutorialGeneratorAgent({
    projectId: 'quick',
    projectName: 'Quick Tutorial',
    includeScreenshots: false,
    includeCodeExamples: true,
    includeTroubleshooting: true,
    defaultLanguage: 'en',
    outputFormats: ['markdown'],
  });
  return agent.generateTutorialFromScreen(screen, module, [table]);
}
