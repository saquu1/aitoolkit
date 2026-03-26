// =============================================================================
// Workflow Builder Agent - Discover Business Workflows from SP Chains
// =============================================================================
// Reconstructs business workflows from SP naming patterns and dependencies
// =============================================================================

import { SPIntelligenceResult, SPActionType } from '../sp-parser';

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  id: string;
  order: number;
  name: string;
  description: string;
  spName?: string;
  actionType: SPActionType;
  inputParameters: string[];
  outputFields: string[];
  tablesUsed: string[];
  isRequired: boolean;
  isConditional: boolean;
  condition?: string;
  nextSteps: string[];
  previousSteps: string[];
}

/**
 * Workflow definition
 */
export interface WorkflowDefinition {
  id: string;
  name: string;
  module: string;
  description: string;
  steps: WorkflowStep[];
  transitions: WorkflowTransition[];
  startStep: string;
  endSteps: string[];
  totalSteps: number;
  complexity: 'simple' | 'moderate' | 'complex';
  businessContext: string[];
}

/**
 * Workflow transition
 */
export interface WorkflowTransition {
  id: string;
  fromStep: string;
  toStep: string;
  trigger?: string;
  condition?: string;
  isAutomatic: boolean;
}

/**
 * Discovered workflow chain
 */
export interface WorkflowChain {
  moduleName: string;
  prefixPattern: string;
  procedures: string[];
  suggestedWorkflow: WorkflowDefinition;
  confidence: number;
}

/**
 * Business process type
 */
export type BusinessProcessType =
  | 'registration'
  | 'admission'
  | 'billing'
  | 'discharge'
  | 'appointment'
  | 'prescription'
  | 'lab_order'
  | 'radiology_order'
  | 'inventory_request'
  | 'approval'
  | 'notification'
  | 'reporting'
  | 'data_import'
  | 'data_export'
  | 'custom';

/**
 * Workflow template
 */
interface WorkflowTemplate {
  processType: BusinessProcessType;
  typicalSteps: string[];
  requiredActions: SPActionType[];
  keywords: string[];
}

/**
 * Common workflow templates
 */
const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    processType: 'registration',
    typicalSteps: ['Validate', 'Check Duplicate', 'Generate ID', 'Create Record', 'Notify'],
    requiredActions: ['validate', 'create', 'dropdown'],
    keywords: ['registration', 'register', 'enroll', 'signup'],
  },
  {
    processType: 'admission',
    typicalSteps: ['Check Bed', 'Validate Insurance', 'Generate MRN', 'Admit', 'Notify Nursing'],
    requiredActions: ['validate', 'create', 'update', 'dropdown'],
    keywords: ['admission', 'admit', 'bed', 'ward'],
  },
  {
    processType: 'billing',
    typicalSteps: ['Calculate Charges', 'Apply Discounts', 'Generate Invoice', 'Process Payment', 'Receipt'],
    requiredActions: ['calculate', 'create', 'update', 'report'],
    keywords: ['billing', 'invoice', 'charge', 'payment', 'receipt'],
  },
  {
    processType: 'discharge',
    typicalSteps: ['Final Charges', 'Clear Dues', 'Generate Summary', 'Discharge', 'Follow-up'],
    requiredActions: ['calculate', 'update', 'report'],
    keywords: ['discharge', 'checkout', 'release'],
  },
  {
    processType: 'appointment',
    typicalSteps: ['Check Availability', 'Book Slot', 'Confirm', 'Remind', 'Check-in'],
    requiredActions: ['validate', 'create', 'dropdown'],
    keywords: ['appointment', 'booking', 'schedule', 'slot'],
  },
  {
    processType: 'lab_order',
    typicalSteps: ['Order', 'Sample Collection', 'Process', 'Result Entry', 'Verify', 'Report'],
    requiredActions: ['create', 'update', 'validate', 'report'],
    keywords: ['lab', 'test', 'sample', 'specimen', 'result'],
  },
  {
    processType: 'prescription',
    typicalSteps: ['Prescribe', 'Check Stock', 'Dispense', 'Record', 'Notify'],
    requiredActions: ['create', 'validate', 'update'],
    keywords: ['prescription', 'medication', 'drug', 'dispense'],
  },
  {
    processType: 'approval',
    typicalSteps: ['Submit', 'Review', 'Approve/Reject', 'Notify', 'Execute'],
    requiredActions: ['create', 'update', 'validate'],
    keywords: ['approval', 'approve', 'reject', 'review'],
  },
];

/**
 * Workflow Builder Agent
 */
export class WorkflowBuilderAgent {
  private spResults: SPIntelligenceResult[] = [];

  /**
   * Build workflows from SP intelligence results
   */
  buildWorkflows(spResults: SPIntelligenceResult[]): WorkflowDefinition[] {
    this.spResults = spResults;
    
    // Group SPs by module/prefix
    const chains = this.groupByModulePrefix(spResults);
    
    // Build workflow for each chain
    const workflows: WorkflowDefinition[] = [];
    
    for (const chain of chains) {
      const workflow = this.constructWorkflow(chain);
      if (workflow) {
        workflows.push(workflow);
      }
    }
    
    // Also detect cross-module workflows
    const crossModuleWorkflows = this.detectCrossModuleWorkflows(spResults);
    workflows.push(...crossModuleWorkflows);
    
    return workflows;
  }

  /**
   * Group SPs by module prefix
   */
  private groupByModulePrefix(spResults: SPIntelligenceResult[]): WorkflowChain[] {
    const groups = new Map<string, SPIntelligenceResult[]>();
    
    for (const sp of spResults) {
      // Extract prefix from SP name (e.g., SP_AdmissionQueue_ -> AdmissionQueue)
      const prefixMatch = sp.procedureName.match(/^SP_(\w+?)(?:_|$)/i);
      if (prefixMatch) {
        const prefix = prefixMatch[1];
        const existing = groups.get(prefix) || [];
        existing.push(sp);
        groups.set(prefix, existing);
      }
    }
    
    const chains: WorkflowChain[] = [];
    
    for (const [prefix, procedures] of groups) {
      if (procedures.length >= 2) { // Need at least 2 SPs to form a workflow
        chains.push({
          moduleName: this.inferModuleName(prefix),
          prefixPattern: prefix,
          procedures: procedures.map(p => p.procedureName),
          suggestedWorkflow: this.constructWorkflowFromGroup(prefix, procedures),
          confidence: this.calculateChainConfidence(procedures),
        });
      }
    }
    
    return chains;
  }

  /**
   * Infer module name from prefix
   */
  private inferModuleName(prefix: string): string {
    const moduleMap: Record<string, string> = {
      'AdmissionQueue': 'Admission',
      'Patient': 'Patient Management',
      'Appointment': 'Appointment & Queue',
      'Billing': 'Billing & Finance',
      'Lab': 'Laboratory',
      'Pharmacy': 'Pharmacy',
      'Radiology': 'Radiology',
      'Nursing': 'Nursing Care',
      'Inventory': 'Inventory',
      'HR': 'HR & Payroll',
      'User': 'User Management',
      'Report': 'Reports',
      'Dashboard': 'Dashboard',
    };
    
    for (const [key, module] of Object.entries(moduleMap)) {
      if (prefix.toLowerCase().includes(key.toLowerCase())) {
        return module;
      }
    }
    
    return prefix;
  }

  /**
   * Construct workflow from grouped SPs
   */
  private constructWorkflowFromGroup(prefix: string, procedures: SPIntelligenceResult[]): WorkflowDefinition {
    const steps: WorkflowStep[] = [];
    const transitions: WorkflowTransition[] = [];
    
    // Sort procedures by typical workflow order
    const sortedProcedures = this.sortByWorkflowOrder(procedures);
    
    sortedProcedures.forEach((sp, index) => {
      const step = this.createStepFromSP(sp, index + 1);
      steps.push(step);
      
      // Create transition to next step
      if (index < sortedProcedures.length - 1) {
        transitions.push({
          id: `trans-${index}`,
          fromStep: step.id,
          toStep: `step-${index + 2}`,
          isAutomatic: this.isAutomaticTransition(sp.actionType),
        });
      }
    });
    
    // Determine workflow complexity
    const complexity = this.determineComplexity(steps);
    
    // Extract business context
    const businessContext = this.extractBusinessContext(procedures);
    
    return {
      id: `wf-${prefix.toLowerCase()}`,
      name: `${this.inferModuleName(prefix)} Workflow`,
      module: this.inferModuleName(prefix),
      description: `Automated workflow for ${this.inferModuleName(prefix)} process`,
      steps,
      transitions,
      startStep: 'step-1',
      endSteps: steps.length > 0 ? [steps[steps.length - 1].id] : [],
      totalSteps: steps.length,
      complexity,
      businessContext,
    };
  }

  /**
   * Sort SPs by typical workflow order
   */
  private sortByWorkflowOrder(procedures: SPIntelligenceResult[]): SPIntelligenceResult[] {
    const actionOrder: Record<SPActionType, number> = {
      'dropdown': 1,
      'validate': 2,
      'read': 3,
      'search': 4,
      'create': 5,
      'update': 6,
      'process': 7,
      'workflow': 8,
      'calculate': 9,
      'report': 10,
      'delete': 11,
      'import': 12,
      'export': 13,
      'unknown': 14,
    };
    
    return [...procedures].sort((a, b) => {
      const orderA = actionOrder[a.actionType] || 14;
      const orderB = actionOrder[b.actionType] || 14;
      return orderA - orderB;
    });
  }

  /**
   * Create workflow step from SP
   */
  private createStepFromSP(sp: SPIntelligenceResult, order: number): WorkflowStep {
    const stepName = this.generateStepName(sp);
    const description = this.generateStepDescription(sp);
    
    return {
      id: `step-${order}`,
      order,
      name: stepName,
      description,
      spName: sp.procedureName,
      actionType: sp.actionType,
      inputParameters: Object.keys(sp.apiInputSchema.properties),
      outputFields: this.extractOutputFields(sp),
      tablesUsed: sp.tablesReferenced.map(t => t.tableName),
      isRequired: sp.riskLevel === 'high' || sp.riskLevel === 'critical',
      isConditional: sp.actionType === 'validate',
      nextSteps: [],
      previousSteps: [],
    };
  }

  /**
   * Generate step name from SP
   */
  private generateStepName(sp: SPIntelligenceResult): string {
    // Extract action and entity from SP name
    const match = sp.procedureName.match(/SP_(\w+)_(\w+)/i);
    if (match) {
      const action = match[1];
      const entity = match[2];
      return `${this.formatAction(action)} ${this.formatEntity(entity)}`;
    }
    
    return sp.moduleIdentification.moduleName || 'Process Step';
  }

  /**
   * Format action verb
   */
  private formatAction(action: string): string {
    const actionMap: Record<string, string> = {
      'Get': 'Retrieve',
      'Add': 'Create',
      'Update': 'Modify',
      'Delete': 'Remove',
      'Validate': 'Validate',
      'Process': 'Process',
      'Calculate': 'Calculate',
      'Search': 'Search',
      'DDL': 'Load',
    };
    
    return actionMap[action] || action;
  }

  /**
   * Format entity name
   */
  private formatEntity(entity: string): string {
    return entity
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .toLowerCase()
      .replace(/^\w/, c => c.toUpperCase());
  }

  /**
   * Generate step description
   */
  private generateStepDescription(sp: SPIntelligenceResult): string {
    const templates: Record<SPActionType, string> = {
      'dropdown': 'Loads dropdown options for {entity}',
      'read': 'Retrieves {entity} data from database',
      'create': 'Creates a new {entity} record',
      'update': 'Updates existing {entity} record',
      'delete': 'Removes {entity} record from system',
      'search': 'Searches for {entity} based on criteria',
      'validate': 'Validates {entity} data before processing',
      'process': 'Processes {entity} through business logic',
      'calculate': 'Calculates values for {entity}',
      'report': 'Generates report for {entity}',
      'import': 'Imports {entity} data from external source',
      'export': 'Exports {entity} data to external format',
      'workflow': 'Executes workflow step for {entity}',
      'unknown': 'Performs operation on {entity}',
    };
    
    const entity = sp.moduleIdentification.moduleName || 'data';
    return templates[sp.actionType].replace('{entity}', entity);
  }

  /**
   * Extract output fields from SP
   */
  private extractOutputFields(sp: SPIntelligenceResult): string[] {
    const fields: string[] = [];
    
    // From SELECT columns in read operations
    for (const op of sp.readOperations) {
      if (op.columns) {
        fields.push(...op.columns);
      }
    }
    
    // From output parameters
    for (const [name, prop] of Object.entries(sp.apiInputSchema.properties)) {
      if (prop.isOutput) {
        fields.push(name);
      }
    }
    
    return [...new Set(fields)];
  }

  /**
   * Determine if transition is automatic
   */
  private isAutomaticTransition(actionType: SPActionType): boolean {
    return ['dropdown', 'read', 'search', 'calculate'].includes(actionType);
  }

  /**
   * Determine workflow complexity
   */
  private determineComplexity(steps: WorkflowStep[]): 'simple' | 'moderate' | 'complex' {
    if (steps.length <= 3) return 'simple';
    if (steps.length <= 7) return 'moderate';
    return 'complex';
  }

  /**
   * Extract business context from procedures
   */
  private extractBusinessContext(procedures: SPIntelligenceResult[]): string[] {
    const context: string[] = [];
    
    for (const sp of procedures) {
      context.push(...sp.moduleIdentification.matchedKeywords.map(k => 
        `Involves ${k}`
      ));
      
      for (const rule of sp.businessRules) {
        context.push(`${rule.tableName}.${rule.column} ${rule.operator} ${rule.valuePattern}`);
      }
    }
    
    return [...new Set(context)].slice(0, 10);
  }

  /**
   * Calculate chain confidence
   */
  private calculateChainConfidence(procedures: SPIntelligenceResult[]): number {
    if (procedures.length < 2) return 0;
    
    // Check if actions form a logical sequence
    const actionTypes = procedures.map(p => p.actionType);
    const hasCreate = actionTypes.includes('create');
    const hasValidate = actionTypes.includes('validate');
    const hasRead = actionTypes.includes('read');
    
    let score = 50;
    
    // Logical workflow patterns
    if (hasValidate && hasCreate) score += 20;
    if (hasRead && hasCreate) score += 15;
    if (procedures.length >= 3) score += 10;
    if (procedures.length >= 5) score += 5;
    
    // Module consistency
    const modules = new Set(procedures.map(p => p.moduleIdentification.moduleName));
    if (modules.size === 1) score += 10;
    
    return Math.min(score, 95);
  }

  /**
   * Construct workflow from chain
   */
  private constructWorkflow(chain: WorkflowChain): WorkflowDefinition | null {
    if (chain.confidence < 60) return null;
    return chain.suggestedWorkflow;
  }

  /**
   * Detect cross-module workflows
   */
  private detectCrossModuleWorkflows(spResults: SPIntelligenceResult[]): WorkflowDefinition[] {
    const workflows: WorkflowDefinition[] = [];
    
    // Look for workflows that span multiple modules
    // E.g., Patient Registration -> Appointment -> Billing
    
    const processTypes = WORKFLOW_TEMPLATES.map(t => t.processType);
    
    for (const processType of processTypes) {
      const template = WORKFLOW_TEMPLATES.find(t => t.processType === processType);
      if (!template) continue;
      
      // Find SPs that match this process type
      const matchingSPs = spResults.filter(sp => 
        template.keywords.some(kw => 
          sp.procedureName.toLowerCase().includes(kw) ||
          sp.body.toLowerCase().includes(kw)
        )
      );
      
      if (matchingSPs.length >= 2) {
        workflows.push(this.constructWorkflowFromGroup(
          processType,
          matchingSPs
        ));
      }
    }
    
    return workflows;
  }

  /**
   * Generate Mermaid diagram for workflow
   */
  generateMermaidDiagram(workflow: WorkflowDefinition): string {
    const lines: string[] = ['flowchart TD'];
    
    // Add steps
    for (const step of workflow.steps) {
      const label = step.name.replace(/"/g, "'");
      lines.push(`  ${step.id}["${label}"]`);
    }
    
    lines.push('');
    
    // Add transitions
    for (const trans of workflow.transitions) {
      const arrow = trans.isAutomatic ? '-->' : '-.->';
      lines.push(`  ${trans.fromStep} ${arrow} ${trans.toStep}`);
    }
    
    // Add styling
    lines.push('');
    lines.push('  classDef start fill:#4ade80,stroke:#16a34a');
    lines.push('  classDef end fill:#f87171,stroke:#dc2626');
    lines.push('  classDef process fill:#60a5fa,stroke:#2563eb');
    lines.push('');
    
    if (workflow.steps.length > 0) {
      lines.push(`  class ${workflow.startStep} start`);
      workflow.endSteps.forEach(endStep => {
        lines.push(`  class ${endStep} end`);
      });
    }
    
    return lines.join('\n');
  }

  /**
   * Generate workflow documentation
   */
  generateDocumentation(workflow: WorkflowDefinition): string {
    const lines: string[] = [];
    
    lines.push(`# ${workflow.name}`);
    lines.push('');
    lines.push(`**Module:** ${workflow.module}`);
    lines.push(`**Complexity:** ${workflow.complexity}`);
    lines.push(`**Total Steps:** ${workflow.totalSteps}`);
    lines.push('');
    lines.push(`## Description`);
    lines.push(workflow.description);
    lines.push('');
    lines.push(`## Workflow Steps`);
    lines.push('');
    
    for (const step of workflow.steps) {
      lines.push(`### Step ${step.order}: ${step.name}`);
      lines.push('');
      lines.push(step.description);
      lines.push('');
      if (step.spName) {
        lines.push(`**Source:** \`${step.spName}\``);
        lines.push('');
      }
      if (step.inputParameters.length > 0) {
        lines.push(`**Input Parameters:** ${step.inputParameters.join(', ')}`);
        lines.push('');
      }
      if (step.tablesUsed.length > 0) {
        lines.push(`**Tables Used:** ${step.tablesUsed.join(', ')}`);
        lines.push('');
      }
    }
    
    lines.push(`## Business Context`);
    lines.push('');
    for (const ctx of workflow.businessContext) {
      lines.push(`- ${ctx}`);
    }
    
    return lines.join('\n');
  }
}

// Export singleton
export const workflowBuilder = new WorkflowBuilderAgent();
