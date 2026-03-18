// =============================================================================
// Business Rule Engine - Define, validate, and enforce business rules
// =============================================================================

import { TableDef, ColumnDef, ModuleDef } from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface BusinessRule {
  id: string;
  code: string;
  name: string;
  description: string;
  category: RuleCategory;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'deprecated';
  tableName?: string;
  moduleName?: string;
  trigger: RuleTrigger;
  condition: RuleCondition;
  action: RuleAction;
  exception?: RuleException;
  examples?: string[];
  impact?: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  tags?: string[];
}

export type RuleCategory = 
  | 'validation'
  | 'workflow'
  | 'security'
  | 'compliance'
  | 'notification'
  | 'calculation'
  | 'integration'
  | 'data_integrity'
  | 'access_control'
  | 'business_logic';

export type RuleTrigger = {
  type: 'before_create' | 'after_create' | 'before_update' | 'after_update' | 'before_delete' | 'after_delete' | 'scheduled' | 'manual';
  tableName?: string;
  columnName?: string;
  schedule?: string; // cron expression for scheduled
};

export type RuleCondition = {
  type: 'simple' | 'compound' | 'script';
  field?: string;
  operator?: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'starts_with' | 'ends_with' | 'is_null' | 'is_not_null' | 'in' | 'not_in' | 'between' | 'regex';
  value?: unknown;
  conditions?: RuleCondition[];
  logicalOperator?: 'and' | 'or';
  script?: string; // JavaScript expression
};

export type RuleAction = {
  type: 'set_value' | 'validate' | 'reject' | 'notify' | 'create_record' | 'update_record' | 'delete_record' | 'call_api' | 'send_email' | 'send_sms' | 'log' | 'custom';
  target?: string;
  value?: unknown;
  message?: string;
  template?: string;
  recipients?: string[];
  endpoint?: string;
  script?: string;
};

export type RuleException = {
  condition: RuleCondition;
  action: RuleAction;
  description: string;
};

export interface RuleGroup {
  id: string;
  name: string;
  description: string;
  moduleName?: string;
  rules: BusinessRule[];
  status: 'pending' | 'partial' | 'complete';
}

export interface RuleValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  testedConditions: {
    condition: string;
    result: boolean;
  }[];
}

// =============================================================================
// RULE TEMPLATES
// =============================================================================

const RULE_TEMPLATES: Record<string, Partial<BusinessRule>[]> = {
  // Patient Registration Rules
  'patient-reg': [
    {
      name: 'MRN Auto-Generation',
      description: 'Automatically generate MRN when creating a new patient',
      category: 'business_logic',
      priority: 'critical',
      trigger: { type: 'before_create', tableName: 'Patients' },
      condition: { type: 'simple', field: 'MRN', operator: 'is_null' },
      action: {
        type: 'set_value',
        target: 'MRN',
        value: 'AUTO_GENERATE',
        script: "generateMRN(orgCode, year, sequence)"
      },
      examples: ['Patient created without MRN → System generates MRN-2024-000001']
    },
    {
      name: 'Duplicate Patient Detection',
      description: 'Prevent duplicate patient records based on CNIC',
      category: 'validation',
      priority: 'critical',
      trigger: { type: 'before_create', tableName: 'Patients' },
      condition: {
        type: 'compound',
        logicalOperator: 'and',
        conditions: [
          { type: 'simple', field: 'CNIC', operator: 'is_not_null' },
          { type: 'script', script: 'existsPatientWithCNIC(record.CNIC)' }
        ]
      },
      action: {
        type: 'reject',
        message: 'A patient with this CNIC already exists. Would you like to view the existing record?'
      },
      exception: {
        condition: { type: 'script', script: 'user.hasRole("admin")' },
        action: { type: 'log', message: 'Admin override: Duplicate CNIC allowed' },
        description: 'Administrators can create duplicate CNIC entries with warning'
      }
    },
    {
      name: 'Patient Age Validation',
      description: 'Validate patient age is within reasonable range',
      category: 'validation',
      priority: 'medium',
      trigger: { type: 'before_create', tableName: 'Patients' },
      condition: {
        type: 'compound',
        logicalOperator: 'or',
        conditions: [
          { type: 'script', script: 'calculateAge(record.DateOfBirth) < 0' },
          { type: 'script', script: 'calculateAge(record.DateOfBirth) > 150' }
        ]
      },
      action: {
        type: 'reject',
        message: 'Invalid date of birth. Age must be between 0 and 150 years.'
      }
    }
  ],

  // Appointment Rules
  'appointment': [
    {
      name: 'Double Booking Prevention',
      description: 'Prevent double booking of appointment slots',
      category: 'validation',
      priority: 'critical',
      trigger: { type: 'before_create', tableName: 'Appointments' },
      condition: {
        type: 'script',
        script: 'isSlotBooked(record.DoctorId, record.AppointmentDate, record.SlotId) && record.Status !== "WaitingList"'
      },
      action: {
        type: 'reject',
        message: 'This time slot is already booked. Please select another slot or add to waiting list.'
      }
    },
    {
      name: 'Past Date Restriction',
      description: 'Prevent booking appointments in the past',
      category: 'validation',
      priority: 'high',
      trigger: { type: 'before_create', tableName: 'Appointments' },
      condition: {
        type: 'script',
        script: 'record.AppointmentDate < new Date().setHours(0,0,0,0)'
      },
      action: {
        type: 'reject',
        message: 'Cannot book appointments in the past.'
      }
    },
    {
      name: 'Appointment Reminder',
      description: 'Send reminder 24 hours before appointment',
      category: 'notification',
      priority: 'medium',
      trigger: { type: 'scheduled', schedule: '0 9 * * *' }, // Daily at 9 AM
      condition: {
        type: 'script',
        script: 'getAppointmentsForTomorrow().length > 0'
      },
      action: {
        type: 'send_sms',
        template: 'appointment_reminder',
        script: 'getAppointmentsForTomorrow().map(a => a.PatientPhone)'
      }
    },
    {
      name: 'Auto-Complete Past Appointments',
      description: 'Mark past appointments as completed automatically',
      category: 'workflow',
      priority: 'low',
      trigger: { type: 'scheduled', schedule: '0 0 * * *' }, // Daily at midnight
      condition: {
        type: 'script',
        script: 'getPastPendingAppointments().length > 0'
      },
      action: {
        type: 'update_record',
        target: 'Appointments',
        script: 'updateStatus(getPastPendingAppointments(), "Completed")'
      }
    }
  ],

  // Billing Rules
  'billing': [
    {
      name: 'Invoice Number Generation',
      description: 'Auto-generate sequential invoice numbers',
      category: 'business_logic',
      priority: 'critical',
      trigger: { type: 'before_create', tableName: 'Invoices' },
      condition: { type: 'simple', field: 'InvoiceNumber', operator: 'is_null' },
      action: {
        type: 'set_value',
        target: 'InvoiceNumber',
        script: 'generateInvoiceNumber(branchCode, date, sequence)'
      }
    },
    {
      name: 'Payment Validation',
      description: 'Validate payment amount against invoice total',
      category: 'validation',
      priority: 'critical',
      trigger: { type: 'before_create', tableName: 'Payments' },
      condition: {
        type: 'script',
        script: 'record.Amount > getInvoiceBalance(record.InvoiceId)'
      },
      action: {
        type: 'reject',
        message: 'Payment amount exceeds the outstanding balance.'
      }
    },
    {
      name: 'Credit Limit Check',
      description: 'Check patient credit limit before service',
      category: 'business_logic',
      priority: 'high',
      trigger: { type: 'before_create', tableName: 'InvoiceItems' },
      condition: {
        type: 'script',
        script: 'getPatientBalance(record.PatientId) + record.TotalAmount > getPatientCreditLimit(record.PatientId)'
      },
      action: {
        type: 'validate',
        message: 'Patient has exceeded credit limit. Manager approval required.',
        script: 'requireManagerApproval()'
      }
    },
    {
      name: 'Tax Calculation',
      description: 'Auto-calculate tax based on service type',
      category: 'calculation',
      priority: 'high',
      trigger: { type: 'before_create', tableName: 'InvoiceItems' },
      condition: { type: 'simple', field: 'TaxAmount', operator: 'is_null' },
      action: {
        type: 'set_value',
        target: 'TaxAmount',
        script: 'calculateTax(record.ServiceType, record.Amount, branch.taxRate)'
      }
    }
  ],

  // User Management Rules
  'users': [
    {
      name: 'Password Complexity',
      description: 'Enforce strong password requirements',
      category: 'security',
      priority: 'critical',
      trigger: { type: 'before_create', tableName: 'Users' },
      condition: {
        type: 'script',
        script: '!isPasswordStrong(record.Password)'
      },
      action: {
        type: 'reject',
        message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character.'
      }
    },
    {
      name: 'Email Uniqueness',
      description: 'Ensure email addresses are unique',
      category: 'validation',
      priority: 'critical',
      trigger: { type: 'before_create', tableName: 'Users' },
      condition: {
        type: 'script',
        script: 'existsUserWithEmail(record.Email)'
      },
      action: {
        type: 'reject',
        message: 'An account with this email already exists.'
      }
    },
    {
      name: 'Account Lockout',
      description: 'Lock account after multiple failed login attempts',
      category: 'security',
      priority: 'critical',
      trigger: { type: 'after_update', tableName: 'Users', columnName: 'FailedLoginAttempts' },
      condition: {
        type: 'simple',
        field: 'FailedLoginAttempts',
        operator: 'greater_than',
        value: 5
      },
      action: {
        type: 'update_record',
        target: 'Users',
        script: 'lockAccount(record.Id, 30) // Lock for 30 minutes'
      }
    }
  ],

  // Pharmacy Rules
  'pharmacy': [
    {
      name: 'Stock Validation',
      description: 'Prevent dispensing out-of-stock items',
      category: 'validation',
      priority: 'critical',
      trigger: { type: 'before_create', tableName: 'DispenseItems' },
      condition: {
        type: 'script',
        script: 'getStockQuantity(record.DrugId, record.BranchId) < record.Quantity'
      },
      action: {
        type: 'reject',
        message: 'Insufficient stock. Available: {available}, Requested: {requested}'
      }
    },
    {
      name: 'Expiry Alert',
      description: 'Alert for medicines nearing expiry',
      category: 'notification',
      priority: 'high',
      trigger: { type: 'scheduled', schedule: '0 8 * * *' }, // Daily at 8 AM
      condition: {
        type: 'script',
        script: 'getExpiringStock(30).length > 0' // 30 days
      },
      action: {
        type: 'send_email',
        template: 'expiry_alert',
        recipients: ['pharmacy_manager', 'inventory_clerk'],
        script: 'getExpiringStock(30)'
      }
    },
    {
      name: 'Controlled Drug Logging',
      description: 'Log all controlled substance transactions',
      category: 'compliance',
      priority: 'critical',
      trigger: { type: 'after_create', tableName: 'DispenseItems' },
      condition: {
        type: 'script',
        script: 'isControlledSubstance(record.DrugId)'
      },
      action: {
        type: 'create_record',
        target: 'ControlledSubstanceLog',
        script: '{ dispenseId: record.Id, drugId: record.DrugId, quantity: record.Quantity, patientId: record.PatientId, dispensedBy: currentUser.id, timestamp: new Date() }'
      }
    }
  ]
};

// =============================================================================
// BUSINESS RULE ENGINE CLASS
// =============================================================================

export class BusinessRuleEngine {
  private rules: Map<string, BusinessRule> = new Map();

  /**
   * Generate rules for a module
   */
  generateModuleRules(module: ModuleDef): RuleGroup {
    const templates = RULE_TEMPLATES[module.key] || [];
    const rules: BusinessRule[] = templates.map((template, index) => {
      const rule: BusinessRule = {
        id: `${module.key}-rule-${index + 1}`,
        code: this.generateRuleCode(module.key, template.name || '', index + 1),
        name: template.name || '',
        description: template.description || '',
        category: template.category || 'business_logic',
        priority: template.priority || 'medium',
        status: 'draft',
        moduleName: module.key,
        tableName: template.trigger?.tableName,
        trigger: template.trigger || { type: 'before_create' },
        condition: template.condition || { type: 'simple' },
        action: template.action || { type: 'log' },
        exception: template.exception,
        examples: template.examples,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        tags: [module.key, template.category || 'business_logic']
      };
      
      this.rules.set(rule.id, rule);
      return rule;
    });

    return {
      id: `group-${module.key}`,
      name: `${module.name} Rules`,
      description: `Business rules for ${module.name} module`,
      moduleName: module.key,
      rules,
      status: rules.length > 0 ? 'pending' : 'complete'
    };
  }

  /**
   * Generate rules for a table
   */
  generateTableRules(table: TableDef): BusinessRule[] {
    const rules: BusinessRule[] = [];
    const tableName = table.tableName;

    // Standard audit trail rule
    rules.push({
      id: `audit-${tableName}`,
      code: this.generateRuleCode(tableName, 'Audit Trail', 1),
      name: 'Audit Trail',
      description: 'Automatically set audit fields on record changes',
      category: 'data_integrity',
      priority: 'medium',
      status: 'approved',
      tableName,
      trigger: { type: 'before_update', tableName },
      condition: { type: 'simple' },
      action: {
        type: 'set_value',
        script: '{ ModifiedOn: new Date(), ModifiedBy: currentUser.id }'
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    });

    // Check for status column - add workflow rule
    const statusCol = table.columns.find(c => 
      c.name.toLowerCase().endsWith('status') || c.name.toLowerCase() === 'status'
    );
    
    if (statusCol) {
      rules.push({
        id: `status-${tableName}`,
        code: this.generateRuleCode(tableName, 'Status Tracking', 2),
        name: 'Status Change Tracking',
        description: 'Track all status changes for audit purposes',
        category: 'compliance',
        priority: 'medium',
        status: 'draft',
        tableName,
        trigger: { type: 'after_update', tableName, columnName: statusCol.name },
        condition: { type: 'simple' },
        action: {
          type: 'create_record',
          target: 'StatusHistory',
          script: `{ tableName: '${tableName}', recordId: record.Id, oldStatus: oldValue, newStatus: record.${statusCol.name}, changedBy: currentUser.id, changedAt: new Date() }`
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      });
    }

    // Check for IsActive column - add soft delete rule
    const isActiveCol = table.columns.find(c => 
      c.name.toLowerCase() === 'isactive'
    );
    
    if (isActiveCol) {
      rules.push({
        id: `soft-delete-${tableName}`,
        code: this.generateRuleCode(tableName, 'Soft Delete', 3),
        name: 'Soft Delete Enforcement',
        description: 'Prevent hard deletes, use IsActive flag instead',
        category: 'data_integrity',
        priority: 'high',
        status: 'approved',
        tableName,
        trigger: { type: 'before_delete', tableName },
        condition: { type: 'simple' },
        action: {
          type: 'reject',
          message: 'Hard delete is not allowed. Use the IsActive flag to deactivate records.'
        },
        exception: {
          condition: { type: 'script', script: 'user.hasRole("super_admin") && confirmPermanentDelete()' },
          action: { type: 'log', message: 'Permanent delete executed by super admin' },
          description: 'Super admins can perform hard delete with confirmation'
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      });
    }

    // Check for amount/price columns - add validation rule
    const amountCol = table.columns.find(c => 
      c.name.toLowerCase().includes('amount') || 
      c.name.toLowerCase().includes('price') ||
      c.name.toLowerCase().includes('fee')
    );
    
    if (amountCol) {
      rules.push({
        id: `amount-validation-${tableName}`,
        code: this.generateRuleCode(tableName, 'Amount Validation', 4),
        name: 'Positive Amount Validation',
        description: 'Ensure monetary amounts are positive',
        category: 'validation',
        priority: 'high',
        status: 'approved',
        tableName,
        trigger: { type: 'before_create', tableName, columnName: amountCol.name },
        condition: {
          type: 'script',
          script: `record.${amountCol.name} < 0`
        },
        action: {
          type: 'reject',
          message: 'Amount cannot be negative'
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      });
    }

    // Store rules
    for (const rule of rules) {
      this.rules.set(rule.id, rule);
    }

    return rules;
  }

  /**
   * Generate all rules for a project
   */
  generateAllRules(tables: TableDef[], modules: ModuleDef[]): RuleGroup[] {
    const groups: RuleGroup[] = [];
    
    // Generate module rules
    for (const mod of modules) {
      const group = this.generateModuleRules(mod);
      if (group.rules.length > 0) {
        groups.push(group);
      }
    }
    
    // Generate table-specific rules
    const tableRulesGroup: RuleGroup = {
      id: 'table-rules',
      name: 'Table-Level Rules',
      description: 'Auto-generated rules based on table structure',
      rules: [],
      status: 'pending'
    };
    
    for (const table of tables) {
      const rules = this.generateTableRules(table);
      tableRulesGroup.rules.push(...rules);
    }
    
    if (tableRulesGroup.rules.length > 0) {
      groups.push(tableRulesGroup);
    }
    
    return groups;
  }

  /**
   * Get rule by ID
   */
  getRule(id: string): BusinessRule | undefined {
    return this.rules.get(id);
  }

  /**
   * Get all rules
   */
  getAllRules(): BusinessRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Update rule
   */
  updateRule(id: string, updates: Partial<BusinessRule>): BusinessRule | undefined {
    const rule = this.rules.get(id);
    if (!rule) return undefined;
    
    const updated: BusinessRule = {
      ...rule,
      ...updates,
      version: rule.version + 1,
      updatedAt: new Date()
    };
    
    this.rules.set(id, updated);
    return updated;
  }

  /**
   * Approve rule
   */
  approveRule(id: string, approvedBy: string): BusinessRule | undefined {
    return this.updateRule(id, {
      status: 'approved',
      approvedBy,
      approvedAt: new Date()
    });
  }

  /**
   * Validate rule
   */
  validateRule(rule: BusinessRule): RuleValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const testedConditions: { condition: string; result: boolean }[] = [];

    // Check required fields
    if (!rule.name) errors.push('Rule name is required');
    if (!rule.code) errors.push('Rule code is required');
    if (!rule.trigger?.type) errors.push('Trigger type is required');
    if (!rule.action?.type) errors.push('Action type is required');

    // Validate condition
    if (rule.condition.type === 'simple' && !rule.condition.field) {
      warnings.push('Simple condition has no field specified');
    }
    if (rule.condition.type === 'compound' && (!rule.condition.conditions || rule.condition.conditions.length === 0)) {
      errors.push('Compound condition has no sub-conditions');
    }
    if (rule.condition.type === 'script' && !rule.condition.script) {
      errors.push('Script condition has no script defined');
    }

    // Validate action
    if (rule.action.type === 'set_value' && !rule.action.target && !rule.action.script) {
      warnings.push('Set value action has no target or script');
    }
    if (rule.action.type === 'reject' && !rule.action.message) {
      warnings.push('Reject action has no error message');
    }
    if (rule.action.type === 'send_email' && (!rule.action.recipients || rule.action.recipients.length === 0)) {
      warnings.push('Email action has no recipients');
    }

    // Validate trigger
    if (rule.trigger.type === 'scheduled' && !rule.trigger.schedule) {
      errors.push('Scheduled trigger has no cron expression');
    }

    // Test condition structure
    testedConditions.push({
      condition: JSON.stringify(rule.condition),
      result: this.testConditionStructure(rule.condition)
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      testedConditions
    };
  }

  /**
   * Test condition structure
   */
  private testConditionStructure(condition: RuleCondition): boolean {
    switch (condition.type) {
      case 'simple':
        return !!(condition.field || condition.operator);
      case 'compound':
        return !!(condition.conditions && condition.conditions.length > 0);
      case 'script':
        return !!(condition.script);
      default:
        return false;
    }
  }

  /**
   * Generate rule code
   */
  private generateRuleCode(moduleKey: string, name: string, index: number): string {
    const prefix = moduleKey.substring(0, 3).toUpperCase();
    const nameCode = name.replace(/[^A-Z]/gi, '').substring(0, 3).toUpperCase();
    return `BR-${prefix}-${nameCode}-${String(index).padStart(3, '0')}`;
  }

  /**
   * Export rules to various formats
   */
  exportRules(format: 'json' | 'markdown' | 'csv'): string {
    const rules = this.getAllRules();
    
    switch (format) {
      case 'json':
        return JSON.stringify(rules, null, 2);
      
      case 'markdown':
        return this.exportToMarkdown(rules);
      
      case 'csv':
        return this.exportToCSV(rules);
      
      default:
        return JSON.stringify(rules, null, 2);
    }
  }

  /**
   * Export to Markdown
   */
  private exportToMarkdown(rules: BusinessRule[]): string {
    const lines: string[] = [
      '# Business Rules Registry',
      '',
      `Generated: ${new Date().toISOString()}`,
      `Total Rules: ${rules.length}`,
      ''
    ];

    // Group by module
    const byModule = new Map<string, BusinessRule[]>();
    for (const rule of rules) {
      const key = rule.moduleName || 'general';
      if (!byModule.has(key)) {
        byModule.set(key, []);
      }
      byModule.get(key)!.push(rule);
    }

    for (const [module, moduleRules] of byModule) {
      lines.push(`## ${module.toUpperCase()}`);
      lines.push('');
      
      for (const rule of moduleRules) {
        lines.push(`### ${rule.code}: ${rule.name}`);
        lines.push('');
        lines.push(`**Category:** ${rule.category}`);
        lines.push(`**Priority:** ${rule.priority}`);
        lines.push(`**Status:** ${rule.status}`);
        lines.push('');
        lines.push(`**Description:** ${rule.description}`);
        lines.push('');
        lines.push(`**Trigger:** ${rule.trigger.type}${rule.trigger.tableName ? ` on ${rule.trigger.tableName}` : ''}`);
        lines.push('');
        
        if (rule.examples && rule.examples.length > 0) {
          lines.push('**Examples:**');
          for (const ex of rule.examples) {
            lines.push(`- ${ex}`);
          }
          lines.push('');
        }
        
        lines.push('---');
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Export to CSV
   */
  private exportToCSV(rules: BusinessRule[]): string {
    const headers = ['Code', 'Name', 'Category', 'Priority', 'Status', 'Module', 'Table', 'Trigger', 'Description'];
    const rows = rules.map(r => [
      r.code,
      r.name,
      r.category,
      r.priority,
      r.status,
      r.moduleName || '',
      r.tableName || '',
      r.trigger.type,
      r.description.replace(/,/g, ';')
    ]);
    
    return [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');
  }
}

// Export singleton
export const businessRuleEngine = new BusinessRuleEngine();
