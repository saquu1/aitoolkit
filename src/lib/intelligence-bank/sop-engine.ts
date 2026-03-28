// =============================================================================
// UNIFIED INTELLIGENCE DATA BANK - SOP Engine
// =============================================================================
// Standard Operating Procedure Engine
// Parses documents for SOP rules and evaluates field compliance
// =============================================================================

import { db } from '@/lib/db';
import {
  SOPRuleDefinition,
  SOPCategory,
  SOPAppliesTo,
  UnifiedFieldRecord,
  AppliedSOPRule,
} from './types';

// ─────────────────────────────────────────────
// DEFAULT SYSTEM SOP RULES
// ─────────────────────────────────────────────

export const DEFAULT_SOP_RULES: Partial<SOPRuleDefinition>[] = [
  // Alignment Rules
  {
    sopId: 'SOP-ACTION-ALIGN',
    name: 'Action Column Center Alignment',
    description: 'Action columns in grids should be center-aligned',
    category: 'alignment',
    priority: 80,
    appliesTo: 'grid_columns',
    condition: { columnType: 'action' },
    expectedValue: 'text-align: center',
    autoFixAction: { addClass: 'text-center' },
    isSystemDefault: true,
    isCustom: false,
  },
  {
    sopId: 'SOP-LABEL-ALIGN',
    name: 'Label Left Alignment',
    description: 'All form labels should be left-aligned',
    category: 'alignment',
    priority: 70,
    appliesTo: 'all_fields',
    condition: { inForm: true },
    expectedValue: 'text-align: left',
    autoFixAction: { addClass: 'text-left' },
    isSystemDefault: true,
    isCustom: false,
  },

  // Typography Rules
  {
    sopId: 'SOP-TITLE-CAP',
    name: 'Title Capitalization',
    description: 'All titles and headings should use Title Case',
    category: 'typography',
    priority: 60,
    appliesTo: 'all_fields',
    condition: { fieldType: 'title' },
    expectedValue: 'Title Case',
    autoFixAction: null,
    isSystemDefault: true,
    isCustom: false,
  },

  // Form Rules
  {
    sopId: 'SOP-INPUT-MAX',
    name: 'Input Maximum Length',
    description: 'All text inputs should have maxlength attribute matching DB constraint',
    category: 'forms',
    priority: 90,
    appliesTo: 'text_inputs',
    condition: { hasMaxLength: true },
    expectedValue: 'maxlength attribute present',
    autoFixAction: { addAttribute: 'maxlength' },
    isSystemDefault: true,
    isCustom: false,
  },
  {
    sopId: 'SOP-DROPDOWN-SEARCH',
    name: 'Searchable Dropdown',
    description: 'Dropdowns with more than 10 options must be searchable',
    category: 'forms',
    priority: 85,
    appliesTo: 'dropdown_fields',
    condition: { optionsCount: { greaterThan: 10 } },
    expectedValue: 'hasSearch: true',
    autoFixAction: { setProperty: { 'dropdownConfig.hasSearch': true } },
    isSystemDefault: true,
    isCustom: false,
  },
  {
    sopId: 'SOP-DROPDOWN-DEFAULT',
    name: 'Dropdown Default Text',
    description: 'All dropdowns should have default "Select..." text',
    category: 'forms',
    priority: 70,
    appliesTo: 'dropdown_fields',
    condition: {},
    expectedValue: 'defaultText: "Select..."',
    autoFixAction: { setProperty: { 'dropdownConfig.defaultText': 'Select...' } },
    isSystemDefault: true,
    isCustom: false,
  },
  {
    sopId: 'SOP-REQUIRED-STAR',
    name: 'Required Field Indicator',
    description: 'Required fields must show asterisk (*) indicator',
    category: 'forms',
    priority: 95,
    appliesTo: 'required_fields',
    condition: {},
    expectedValue: 'label contains * or required indicator',
    autoFixAction: { addClass: 'required', appendLabel: ' *' },
    isSystemDefault: true,
    isCustom: false,
  },
  {
    sopId: 'SOP-DATE-FORMAT',
    name: 'Date Format Consistency',
    description: 'All date fields should use DD/MM/YYYY format',
    category: 'forms',
    priority: 75,
    appliesTo: 'date_fields',
    condition: {},
    expectedValue: 'format: "DD/MM/YYYY"',
    autoFixAction: { setProperty: { 'dateConfig.format': 'DD/MM/YYYY' } },
    isSystemDefault: true,
    isCustom: false,
  },
  {
    sopId: 'SOP-FORM-CANCEL',
    name: 'Form Cancel Button',
    description: 'All forms must have a Cancel button',
    category: 'forms',
    priority: 60,
    appliesTo: 'all_fields',
    condition: { inForm: true, isFormLevel: true },
    expectedValue: 'Cancel button present',
    autoFixAction: null,
    isSystemDefault: true,
    isCustom: false,
  },

  // Validation Rules
  {
    sopId: 'SOP-VALIDATION-EMAIL',
    name: 'Email Format Validation',
    description: 'Email fields must have email format validation',
    category: 'validation',
    priority: 90,
    appliesTo: 'all_fields',
    condition: { semanticType: 'email' },
    expectedValue: 'email validation rule',
    autoFixAction: { addValidation: { type: 'email', message: 'Invalid email format' } },
    isSystemDefault: true,
    isCustom: false,
  },
  {
    sopId: 'SOP-VALIDATION-PHONE',
    name: 'Phone Format Validation',
    description: 'Phone fields must have phone format validation',
    category: 'validation',
    priority: 85,
    appliesTo: 'all_fields',
    condition: { semanticType: 'phone_number' },
    expectedValue: 'phone validation rule',
    autoFixAction: { addValidation: { type: 'phone', message: 'Invalid phone format' } },
    isSystemDefault: true,
    isCustom: false,
  },

  // Security Rules
  {
    sopId: 'SOP-PII-MASK',
    name: 'PII Masking',
    description: 'PII fields must have masking in reports/exports',
    category: 'security',
    priority: 95,
    appliesTo: 'pii_fields',
    condition: {},
    expectedValue: 'masking pattern defined',
    autoFixAction: null,
    isSystemDefault: true,
    isCustom: false,
  },
  {
    sopId: 'SOP-PII-ENCRYPT',
    name: 'PII Encryption',
    description: 'PII fields must be encrypted at rest',
    category: 'security',
    priority: 100,
    appliesTo: 'pii_fields',
    condition: {},
    expectedValue: 'encryption enabled',
    autoFixAction: null,
    isSystemDefault: true,
    isCustom: false,
  },
  {
    sopId: 'SOP-PASSWORD-MASK',
    name: 'Password Masking',
    description: 'Password fields must use password input type',
    category: 'security',
    priority: 100,
    appliesTo: 'all_fields',
    condition: { semanticType: 'password' },
    expectedValue: 'input type: password',
    autoFixAction: { setInputType: 'password' },
    isSystemDefault: true,
    isCustom: false,
  },

  // Compliance Rules
  {
    sopId: 'SOP-CONSENT-PII',
    name: 'PII Consent Field',
    description: 'Forms collecting PII must have consent checkbox',
    category: 'compliance',
    priority: 90,
    appliesTo: 'pii_fields',
    condition: { inForm: true, isFormLevel: true },
    expectedValue: 'consent checkbox present',
    autoFixAction: null,
    isSystemDefault: true,
    isCustom: false,
  },
  {
    sopId: 'SOP-PHI-AUDIT',
    name: 'PHI Audit Trail',
    description: 'All PHI fields must have audit trail enabled',
    category: 'compliance',
    priority: 100,
    appliesTo: 'all_fields',
    condition: { isPHI: true },
    expectedValue: 'auditRequired: true',
    autoFixAction: null,
    isSystemDefault: true,
    isCustom: false,
  },

  // Reports Rules
  {
    sopId: 'SOP-REPORT-PAGE',
    name: 'Report Pagination',
    description: 'All reports should have maximum 50 records per page',
    category: 'reports',
    priority: 60,
    appliesTo: 'all_fields',
    condition: { inReport: true, isReportLevel: true },
    expectedValue: 'pageSize: 50',
    autoFixAction: null,
    isSystemDefault: true,
    isCustom: false,
  },
];

// ─────────────────────────────────────────────
// SOPEngine CLASS
// ─────────────────────────────────────────────

export class SOPEngine {
  private projectId: string;
  private rules: SOPRuleDefinition[] = [];

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  /**
   * Load SOP rules (default + project-specific)
   */
  async loadRules(): Promise<void> {
    // Load from database
    const dbRules = await db.unifiedSOPRule.findMany({
      where: {
        OR: [
          { projectId: this.projectId },
          { projectId: null, isSystemDefault: true },
        ],
        isActive: true,
      },
    });

    this.rules = dbRules.map(r => ({
      id: r.id,
      projectId: r.projectId,
      sopId: r.sopId,
      name: r.name,
      description: r.description,
      category: r.category as SOPCategory,
      priority: r.priority,
      isActive: r.isActive,
      appliesTo: r.appliesTo as SOPAppliesTo,
      condition: JSON.parse(r.condition || '{}'),
      expectedValue: r.expectedValue,
      autoFixAction: r.autoFixAction ? JSON.parse(r.autoFixAction) : null,
      sourceDocument: r.sourceDocument,
      sourceVersion: r.sourceVersion,
      isSystemDefault: r.isSystemDefault,
      isCustom: r.isCustom,
    }));
  }

  /**
   * Initialize default SOP rules in database
   */
  async initializeDefaultRules(): Promise<void> {
    for (const rule of DEFAULT_SOP_RULES) {
      const existing = await db.unifiedSOPRule.findUnique({
        where: { sopId: rule.sopId! },
      });

      if (!existing) {
        await db.unifiedSOPRule.create({
          data: {
            projectId: null,
            sopId: rule.sopId!,
            name: rule.name!,
            description: rule.description!,
            category: rule.category!,
            priority: rule.priority!,
            isActive: true,
            appliesTo: rule.appliesTo!,
            condition: JSON.stringify(rule.condition || {}),
            expectedValue: rule.expectedValue,
            autoFixAction: rule.autoFixAction ? JSON.stringify(rule.autoFixAction) : null,
            sourceDocument: null,
            sourceVersion: null,
            isSystemDefault: true,
            isCustom: false,
          },
        });
      }
    }
  }

  /**
   * Evaluate a field against all applicable SOP rules
   */
  evaluateField(field: UnifiedFieldRecord): AppliedSOPRule[] {
    const results: AppliedSOPRule[] = [];

    for (const rule of this.rules) {
      if (this.ruleAppliesToField(rule, field)) {
        const result = this.checkRuleCompliance(rule, field);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Check if a rule applies to a field
   */
  private ruleAppliesToField(rule: SOPRuleDefinition, field: UnifiedFieldRecord): boolean {
    switch (rule.appliesTo) {
      case 'all_fields':
        return true;
      
      case 'dropdown_fields':
        return field.uiComponent.componentType === 'dropdown';
      
      case 'date_fields':
        return field.intelligence.semanticType === 'date' ||
               field.uiComponent.componentType === 'datepicker';
      
      case 'grid_columns':
        return field.cshtmlEvidence.foundInViews.some(v => v.isInGrid);
      
      case 'text_inputs':
        return field.uiComponent.componentType === 'text_input';
      
      case 'required_fields':
        return field.validation.isRequired;
      
      case 'pii_fields':
        return field.compliance.isPII;
      
      default:
        return false;
    }
  }

  /**
   * Check compliance for a specific rule
   */
  private checkRuleCompliance(rule: SOPRuleDefinition, field: UnifiedFieldRecord): AppliedSOPRule {
    let isCompliant = false;
    let note = '';

    switch (rule.sopId) {
      // Input maxlength
      case 'SOP-INPUT-MAX':
        isCompliant = field.schema.maxLength !== null && field.schema.maxLength > 0;
        note = isCompliant
          ? `Max length: ${field.schema.maxLength}`
          : 'Missing max length constraint';
        break;

      // Dropdown search
      case 'SOP-DROPDOWN-SEARCH':
        isCompliant = field.uiComponent.dropdownConfig?.hasSearch === true;
        note = isCompliant
          ? 'Searchable dropdown'
          : 'Dropdown should be searchable';
        break;

      // Dropdown default text
      case 'SOP-DROPDOWN-DEFAULT':
        const defaultText = field.uiComponent.dropdownConfig?.defaultText || '';
        isCompliant = defaultText.toLowerCase().includes('select');
        note = isCompliant
          ? `Default text: "${defaultText}"`
          : 'Missing default selection text';
        break;

      // Required indicator
      case 'SOP-REQUIRED-STAR':
        if (field.validation.isRequired) {
          // Check if label has asterisk
          const label = field.intelligence.suggestedLabel || '';
          isCompliant = label.includes('*') || label.includes('required');
          note = isCompliant
            ? 'Required indicator present'
            : 'Missing required indicator (*)';
        } else {
          isCompliant = true;
          note = 'Not a required field';
        }
        break;

      // Date format
      case 'SOP-DATE-FORMAT':
        const dateFormat = field.uiComponent.dateConfig?.format || '';
        isCompliant = dateFormat === 'DD/MM/YYYY' || dateFormat.includes('DD');
        note = isCompliant
          ? `Date format: ${dateFormat || 'default'}`
          : 'Inconsistent date format';
        break;

      // Email validation
      case 'SOP-VALIDATION-EMAIL':
        if (field.intelligence.semanticType === 'email') {
          isCompliant = field.uiComponent.htmlInputType === 'email' ||
            field.validation.clientSideRules.some(r => r.ruleType === 'email');
          note = isCompliant
            ? 'Email validation present'
            : 'Missing email validation';
        } else {
          isCompliant = true;
          note = 'Not an email field';
        }
        break;

      // Phone validation
      case 'SOP-VALIDATION-PHONE':
        if (field.intelligence.semanticType === 'phone_number') {
          isCompliant = field.uiComponent.htmlInputType === 'tel' ||
            field.validation.clientSideRules.some(r => r.ruleType === 'phone' || r.ruleType === 'regexp');
          note = isCompliant
            ? 'Phone validation present'
            : 'Missing phone validation';
        } else {
          isCompliant = true;
          note = 'Not a phone field';
        }
        break;

      // PII masking
      case 'SOP-PII-MASK':
        if (field.compliance.isPII) {
          isCompliant = field.compliance.requiresMasking && !!field.compliance.maskingPattern;
          note = isCompliant
            ? `Masking: ${field.compliance.maskingPattern}`
            : 'Missing masking pattern for PII';
        } else {
          isCompliant = true;
          note = 'Not a PII field';
        }
        break;

      // PII encryption
      case 'SOP-PII-ENCRYPT':
        if (field.compliance.isPII) {
          isCompliant = field.compliance.requiresEncryption;
          note = isCompliant
            ? 'Encryption required'
            : 'PII field should require encryption';
        } else {
          isCompliant = true;
          note = 'Not a PII field';
        }
        break;

      // Password mask
      case 'SOP-PASSWORD-MASK':
        if (field.intelligence.semanticType === 'password' || 
            field.fieldName.toLowerCase().includes('password')) {
          isCompliant = field.uiComponent.htmlInputType === 'password';
          note = isCompliant
            ? 'Password field masked'
            : 'Password field should use password input type';
        } else {
          isCompliant = true;
          note = 'Not a password field';
        }
        break;

      // PHI audit
      case 'SOP-PHI-AUDIT':
        if (field.compliance.isPHI) {
          isCompliant = field.compliance.auditRequired;
          note = isCompliant
            ? 'Audit trail enabled'
            : 'PHI field should have audit trail';
        } else {
          isCompliant = true;
          note = 'Not a PHI field';
        }
        break;

      // Action align
      case 'SOP-ACTION-ALIGN':
        if (field.cshtmlEvidence.foundInViews.some(v => v.isInGrid)) {
          const isAction = field.fieldName.toLowerCase().includes('action');
          if (isAction) {
            isCompliant = field.cshtmlEvidence.cssClasses.some(c => 
              c.includes('text-center') || c.includes('center')
            );
            note = isCompliant
              ? 'Action column center-aligned'
              : 'Action column should be center-aligned';
          } else {
            isCompliant = true;
            note = 'Not an action column';
          }
        } else {
          isCompliant = true;
          note = 'Not in grid';
        }
        break;

      default:
        // Generic check based on condition
        isCompliant = this.evaluateCondition(rule.condition, field);
        note = isCompliant ? 'Compliant' : 'Non-compliant';
    }

    return {
      sopId: rule.sopId,
      sopName: rule.name,
      category: rule.category,
      priority: rule.priority,
      isCompliant,
      complianceNote: note,
      autoFixAvailable: !!rule.autoFixAction,
    };
  }

  /**
   * Evaluate a condition against a field
   */
  private evaluateCondition(condition: Record<string, any>, field: UnifiedFieldRecord): boolean {
    if (!condition || Object.keys(condition).length === 0) {
      return true;
    }

    for (const [key, value] of Object.entries(condition)) {
      switch (key) {
        case 'semanticType':
          if (field.intelligence.semanticType !== value) return false;
          break;
        case 'hasMaxLength':
          if (!field.schema.maxLength) return false;
          break;
        case 'inForm':
          if (!field.cshtmlEvidence.foundInViews.some(v => v.isInCreateForm || v.isInUpdateForm)) return false;
          break;
        case 'inReport':
          // TODO: implement report detection
          break;
        case 'isPHI':
          if (field.compliance.isPHI !== value) return false;
          break;
      }
    }

    return true;
  }

  /**
   * Apply auto-fix to a field
   */
  applyAutoFix(rule: SOPRuleDefinition, field: Partial<UnifiedFieldRecord>): Partial<UnifiedFieldRecord> {
    if (!rule.autoFixAction) return field;

    const updated = { ...field };

    for (const [key, value] of Object.entries(rule.autoFixAction)) {
      switch (key) {
        case 'addClass':
          // Add CSS class
          if (updated.uiComponent) {
            // Track in SOP rules applied
            updated.uiComponent.sopRulesApplied = [
              ...(updated.uiComponent.sopRulesApplied || []),
              rule.sopId,
            ];
          }
          break;

        case 'setProperty':
          // Set nested property
          for (const [propPath, propValue] of Object.entries(value as Record<string, any>)) {
            const parts = propPath.split('.');
            let obj: any = updated;
            for (let i = 0; i < parts.length - 1; i++) {
              obj = obj[parts[i]];
              if (!obj) break;
            }
            if (obj) {
              obj[parts[parts.length - 1]] = propValue;
            }
          }
          break;

        case 'addAttribute':
          // Add HTML attribute
          // Would be applied during generation
          break;

        case 'addValidation':
          // Add validation rule
          if (updated.validation && value) {
            updated.validation.clientSideRules.push({
              ruleType: (value as any).type,
              ruleValue: null,
              errorMessage: (value as any).message,
              source: 'sop_rule',
            });
          }
          break;

        case 'setInputType':
          // Set input type
          if (updated.uiComponent) {
            updated.uiComponent.htmlInputType = value as string;
          }
          break;
      }
    }

    return updated;
  }

  /**
   * Parse SOP rules from document content
   */
  async parseSOPFromDocument(
    content: string,
    fileName: string,
    fileType: 'pdf' | 'docx' | 'md' | 'txt'
  ): Promise<Partial<SOPRuleDefinition>[]> {
    const parsedRules: Partial<SOPRuleDefinition>[] = [];

    // Pattern detection for SOP rules in documents
    const patterns = [
      // "All action columns should be center-aligned"
      /(?:all|every)\s+(\w+)\s+(?:columns?|fields?|inputs?)\s+(?:should|must)\s+be\s+(\w+(?:-\w+)*)/gi,
      
      // "Date format must be DD/MM/YYYY"
      /(\w+)\s+(?:format|type)\s+(?:should|must)\s+be\s+([A-Z\/]+)/gi,
      
      // "Maximum 50 records per page"
      /maximum\s+(\d+)\s+(\w+)\s+per\s+(\w+)/gi,
      
      // "Required fields must show asterisk"
      /required\s+fields\s+(?:should|must)\s+(\w+(?:\s+\w+)*)/gi,
    ];

    let ruleNumber = 1;
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const sopId = `SOP-CUSTOM-${this.projectId.substring(0, 4).toUpperCase()}-${String(ruleNumber++).padStart(3, '0')}`;
        
        let category: SOPCategory = 'forms';
        const text = match[0].toLowerCase();
        
        if (text.includes('column') || text.includes('align')) {
          category = 'alignment';
        } else if (text.includes('format') || text.includes('font')) {
          category = 'typography';
        } else if (text.includes('validation') || text.includes('valid')) {
          category = 'validation';
        } else if (text.includes('report') || text.includes('page')) {
          category = 'reports';
        } else if (text.includes('security') || text.includes('encrypt')) {
          category = 'security';
        } else if (text.includes('compliance') || text.includes('consent')) {
          category = 'compliance';
        }

        parsedRules.push({
          projectId: this.projectId,
          sopId,
          name: match[0].substring(0, 50),
          description: match[0],
          category,
          priority: 50,
          isActive: true,
          appliesTo: 'all_fields',
          condition: {},
          sourceDocument: fileName,
          isSystemDefault: false,
          isCustom: true,
        });
      }
    }

    return parsedRules;
  }

  /**
   * Save parsed SOP rules to database
   */
  async saveSOPRules(rules: Partial<SOPRuleDefinition>[]): Promise<number> {
    let saved = 0;
    
    for (const rule of rules) {
      try {
        await db.unifiedSOPRule.create({
          data: {
            projectId: rule.projectId || this.projectId,
            sopId: rule.sopId!,
            name: rule.name!,
            description: rule.description || '',
            category: rule.category || 'forms',
            priority: rule.priority || 50,
            isActive: rule.isActive ?? true,
            appliesTo: rule.appliesTo || 'all_fields',
            condition: JSON.stringify(rule.condition || {}),
            expectedValue: rule.expectedValue,
            autoFixAction: rule.autoFixAction ? JSON.stringify(rule.autoFixAction) : null,
            sourceDocument: rule.sourceDocument,
            sourceVersion: rule.sourceVersion,
            isSystemDefault: rule.isSystemDefault ?? false,
            isCustom: rule.isCustom ?? true,
          },
        });
        saved++;
      } catch (error) {
        console.error(`Failed to save SOP rule ${rule.sopId}:`, error);
      }
    }

    return saved;
  }

  /**
   * Get SOP compliance summary for a project
   */
  async getComplianceSummary(): Promise<{
    totalRules: number;
    activeRules: number;
    categories: Record<string, number>;
  }> {
    const rules = await db.unifiedSOPRule.findMany({
      where: {
        OR: [
          { projectId: this.projectId },
          { projectId: null, isSystemDefault: true },
        ],
      },
    });

    const categories: Record<string, number> = {};
    
    for (const rule of rules) {
      categories[rule.category] = (categories[rule.category] || 0) + 1;
    }

    return {
      totalRules: rules.length,
      activeRules: rules.filter(r => r.isActive).length,
      categories,
    };
  }
}

// Export singleton factory
export function createSOPEngine(projectId: string): SOPEngine {
  return new SOPEngine(projectId);
}

// Export initialization function
export async function initializeDefaultSOPRules(): Promise<void> {
  const engine = new SOPEngine('system');
  await engine.initializeDefaultRules();
}
