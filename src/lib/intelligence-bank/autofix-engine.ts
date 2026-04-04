// =============================================================================
// UNIFIED INTELLIGENCE DATA BANK - Auto-Fix Engine
// =============================================================================
// Engine for automatically fixing SOP violations
// =============================================================================

import { db } from '@/lib/db';
import { UnifiedFieldRecord } from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface AutoFixAction {
  type: 'set_property' | 'add_validation' | 'set_input_type' | 'add_class' | 'update_config' | 'set_attribute';
  target: string;
  value: unknown;
  description: string;
}

export interface AutoFixResult {
  success: boolean;
  fieldId: string;
  sopId: string;
  appliedActions: AutoFixAction[];
  message: string;
  timestamp: Date;
}

export interface AutoFixBatchResult {
  totalViolations: number;
  fixedCount: number;
  failedCount: number;
  skippedCount: number;
  results: AutoFixResult[];
}

// =============================================================================
// AUTO-FIX ENGINE CLASS
// =============================================================================

export class AutoFixEngine {
  private projectId: string;
  private dryRun: boolean;

  constructor(projectId: string, dryRun: boolean = false) {
    this.projectId = projectId;
    this.dryRun = dryRun;
  }

  /**
   * Auto-fix all violations for a project
   */
  async fixAllViolations(): Promise<AutoFixBatchResult> {
    // Get all non-compliant SOP records with auto-fix available
    const violations = await db.unifiedFieldSOPCompliance.findMany({
      where: {
        field: { projectId: this.projectId },
        isCompliant: false,
        autoFixAvailable: true,
      },
      include: {
        field: true,
      },
    });

    const results: AutoFixResult[] = [];
    let fixedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const violation of violations) {
      const result = await this.fixViolation(violation);
      results.push(result);

      if (result.success) {
        fixedCount++;
      } else if (result.appliedActions.length === 0) {
        skippedCount++;
      } else {
        failedCount++;
      }
    }

    return {
      totalViolations: violations.length,
      fixedCount,
      failedCount,
      skippedCount,
      results,
    };
  }

  /**
   * Auto-fix a single violation
   */
  async fixViolation(violation: {
    id: string;
    sopId: string;
    fieldId: string;
    field: any;
  }): Promise<AutoFixResult> {
    const { sopId, fieldId, field } = violation;
    const appliedActions: AutoFixAction[] = [];

    try {
      // Get SOP rule with auto-fix action
      const rule = await db.unifiedSOPRule.findUnique({
        where: { sopId },
      });

      if (!rule?.autoFixAction) {
        return {
          success: false,
          fieldId,
          sopId,
          appliedActions: [],
          message: 'No auto-fix action defined for this SOP rule',
          timestamp: new Date(),
        };
      }

      const autoFixActions = typeof rule.autoFixAction === 'string'
        ? JSON.parse(rule.autoFixAction)
        : rule.autoFixAction;

      const updates: Record<string, unknown> = {};

      // Process each auto-fix action
      for (const [actionType, actionValue] of Object.entries(autoFixActions)) {
        const action = this.processAction(actionType, actionValue, field);
        if (action) {
          appliedActions.push(action);

          // Apply to updates
          if (action.target.startsWith('ui')) {
            updates[action.target] = action.value;
          } else if (action.target.includes('.')) {
            // Nested property
            const [parent, child] = action.target.split('.');
            if (!updates[parent]) {
              updates[parent] = field[parent] ? JSON.parse(field[parent]) : {};
            }
            (updates[parent] as Record<string, unknown>)[child] = action.value;
          } else {
            updates[action.target] = action.value;
          }
        }
      }

      // Apply updates if not dry run
      if (!this.dryRun && Object.keys(updates).length > 0) {
        // Convert JSON objects back to strings
        const dbUpdates: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(updates)) {
          if (typeof value === 'object') {
            dbUpdates[key] = JSON.stringify(value);
          } else {
            dbUpdates[key] = value;
          }
        }
        dbUpdates['updatedAt'] = new Date();

        await db.unifiedField.update({
          where: { id: fieldId },
          data: dbUpdates,
        });

        // Mark as compliant
        await db.unifiedFieldSOPCompliance.update({
          where: { id: violation.id },
          data: {
            isCompliant: true,
            fixedAt: new Date(),
          },
        });

        // Log the fix
        await db.unifiedEnrichmentLog.create({
          data: {
            fieldId,
            projectId: this.projectId,
            agentName: 'AutoFixEngine',
            layerEnriched: 'sop',
            previousValue: JSON.stringify({ compliant: false }),
            newValue: JSON.stringify({ compliant: true, appliedActions }),
            confidenceAfter: 1.0,
            enrichmentMethod: 'auto_fix',
          },
        });
      }

      return {
        success: true,
        fieldId,
        sopId,
        appliedActions,
        message: this.dryRun 
          ? `Dry run: Would apply ${appliedActions.length} fixes`
          : `Applied ${appliedActions.length} fixes successfully`,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        fieldId,
        sopId,
        appliedActions,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Process a single auto-fix action
   */
  private processAction(
    actionType: string,
    actionValue: unknown,
    field: Record<string, unknown>
  ): AutoFixAction | null {
    switch (actionType) {
      case 'setProperty':
        return this.handleSetProperty(actionValue as Record<string, unknown>);

      case 'addValidation':
        return this.handleAddValidation(actionValue as Record<string, unknown>, field);

      case 'setInputType':
        return this.handleSetInputType(actionValue as string);

      case 'addClass':
        return this.handleAddClass(actionValue as string, field);

      case 'addAttribute':
        return this.handleAddAttribute(actionValue as Record<string, unknown>);

      case 'updateConfig':
        return this.handleUpdateConfig(actionValue as Record<string, unknown>);

      default:
        return null;
    }
  }

  /**
   * Handle setProperty action
   */
  private handleSetProperty(actionValue: Record<string, unknown>): AutoFixAction {
    const [[propPath, propValue]] = Object.entries(actionValue);
    return {
      type: 'set_property',
      target: propPath,
      value: propValue,
      description: `Set ${propPath} = ${JSON.stringify(propValue)}`,
    };
  }

  /**
   * Handle addValidation action
   */
  private handleAddValidation(
    actionValue: Record<string, unknown>,
    field: Record<string, unknown>
  ): AutoFixAction {
    const validationType = actionValue.type as string;
    const message = actionValue.message as string;

    // Add to client validation rules
    const existingRules = field.validationClientRules
      ? JSON.parse(field.validationClientRules as string)
      : [];

    existingRules.push({
      ruleType: validationType,
      ruleValue: null,
      errorMessage: message,
      source: 'sop_auto_fix',
    });

    return {
      type: 'add_validation',
      target: 'validationClientRules',
      value: existingRules,
      description: `Add ${validationType} validation with message: "${message}"`,
    };
  }

  /**
   * Handle setInputType action
   */
  private handleSetInputType(inputType: string): AutoFixAction {
    return {
      type: 'set_input_type',
      target: 'uiHtmlInputType',
      value: inputType,
      description: `Set input type to "${inputType}"`,
    };
  }

  /**
   * Handle addClass action
   */
  private handleAddClass(className: string, field: Record<string, unknown>): AutoFixAction {
    const existingClasses = field.cshtmlCssClasses
      ? JSON.parse(field.cshtmlCssClasses as string)
      : [];

    if (!existingClasses.includes(className)) {
      existingClasses.push(className);
    }

    return {
      type: 'add_class',
      target: 'cshtmlCssClasses',
      value: existingClasses,
      description: `Add CSS class "${className}"`,
    };
  }

  /**
   * Handle addAttribute action
   */
  private handleAddAttribute(actionValue: Record<string, unknown>): AutoFixAction {
    const [[attrName, attrValue]] = Object.entries(actionValue);
    return {
      type: 'set_attribute',
      target: attrName,
      value: attrValue,
      description: `Add attribute ${attrName}="${attrValue}"`,
    };
  }

  /**
   * Handle updateConfig action
   */
  private handleUpdateConfig(actionValue: Record<string, unknown>): AutoFixAction {
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(actionValue)) {
      updates[key] = value;
    }
    return {
      type: 'update_config',
      target: 'uiComponentConfig',
      value: updates,
      description: `Update UI config: ${JSON.stringify(updates)}`,
    };
  }

  /**
   * Preview auto-fixes without applying them
   */
  async previewFixes(): Promise<AutoFixBatchResult> {
    const dryRunEngine = new AutoFixEngine(this.projectId, true);
    return dryRunEngine.fixAllViolations();
  }

  /**
   * Get auto-fix summary for a project
   */
  async getAutoFixSummary(): Promise<{
    totalViolations: number;
    autoFixable: number;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
  }> {
    const violations = await db.unifiedFieldSOPCompliance.findMany({
      where: {
        field: { projectId: this.projectId },
        isCompliant: false,
      },
      include: {
        field: true,
      },
    });

    const autoFixable = violations.filter(v => v.autoFixAvailable);
    const byCategory: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    for (const v of autoFixable) {
      // Get category from SOP rule
      const rule = await db.unifiedSOPRule.findUnique({
        where: { sopId: v.sopId },
        select: { category: true, priority: true },
      });

      if (rule) {
        byCategory[rule.category] = (byCategory[rule.category] || 0) + 1;
        
        const priorityBucket = rule.priority >= 90 ? 'critical' :
                              rule.priority >= 70 ? 'high' :
                              rule.priority >= 50 ? 'medium' : 'low';
        byPriority[priorityBucket] = (byPriority[priorityBucket] || 0) + 1;
      }
    }

    return {
      totalViolations: violations.length,
      autoFixable: autoFixable.length,
      byCategory,
      byPriority,
    };
  }

  /**
   * Generate fix script for manual application
   */
  async generateFixScript(): Promise<string> {
    const preview = await this.previewFixes();
    const lines: string[] = [
      '// Auto-Generated SOP Fix Script',
      `// Project: ${this.projectId}`,
      `// Generated: ${new Date().toISOString()}`,
      `// Total fixes: ${preview.fixedCount}`,
      '',
      'const fixes = [',
    ];

    for (const result of preview.results) {
      if (result.success) {
        lines.push(`  {`);
        lines.push(`    fieldId: '${result.fieldId}',`);
        lines.push(`    sopId: '${result.sopId}',`);
        lines.push(`    actions: [`);
        for (const action of result.appliedActions) {
          lines.push(`      { type: '${action.type}', target: '${action.target}', value: ${JSON.stringify(action.value)} },`);
        }
        lines.push(`    ]`);
        lines.push(`  },`);
      }
    }

    lines.push('];');
    lines.push('');
    lines.push('// Apply fixes:');
    lines.push('for (const fix of fixes) {');
    lines.push('  console.log(`Applying fixes to field ${fix.fieldId}...`);');
    lines.push('  // Add your apply logic here');
    lines.push('}');

    return lines.join('\n');
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

export function createAutoFixEngine(projectId: string, dryRun: boolean = false): AutoFixEngine {
  return new AutoFixEngine(projectId, dryRun);
}

export async function runAutoFixForProject(projectId: string): Promise<AutoFixBatchResult> {
  const engine = new AutoFixEngine(projectId);
  return engine.fixAllViolations();
}

export async function previewAutoFixes(projectId: string): Promise<AutoFixBatchResult> {
  const engine = new AutoFixEngine(projectId, true);
  return engine.fixAllViolations();
}

// Default export
export default AutoFixEngine;
