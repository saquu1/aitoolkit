// =============================================================================
// Business Rules Extractor - Extract rules from SPs and constraints
// =============================================================================
// Analyzes stored procedures, check constraints, triggers, and DDL
// to extract business rules and validation logic
// =============================================================================

import { TableDef, ColumnDef, StoredProcedureDef, CheckConstraintDef } from '../types';
import { BusinessRule, RuleCategory, RuleTrigger, RuleCondition, RuleAction } from '../business-rule-engine';

// =============================================================================
// Types
// =============================================================================

export interface ExtractedRule {
  id: string;
  source: 'stored_procedure' | 'check_constraint' | 'trigger' | 'default_value' | 'column_property';
  sourceName: string;
  category: RuleCategory;
  name: string;
  description: string;
  tableName: string;
  columnName?: string;
  trigger: RuleTrigger;
  condition: RuleCondition;
  action: RuleAction;
  confidence: number;
  rawDefinition: string;
  examples: string[];
  relatedRules: string[];
}

export interface BusinessRulesExtractionResult {
  projectId: string;
  extractionDate: Date;
  summary: ExtractionSummary;
  rules: ExtractedRule[];
  byTable: Map<string, ExtractedRule[]>;
  byCategory: Map<RuleCategory, ExtractedRule[]>;
  bySource: Map<string, ExtractedRule[]>;
  validationPatterns: ValidationPattern[];
  workflowPatterns: WorkflowPattern[];
  recommendations: string[];
}

export interface ExtractionSummary {
  totalRules: number;
  fromStoredProcedures: number;
  fromConstraints: number;
  fromDefaults: number;
  fromColumnProperties: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  tablesCovered: number;
}

export interface ValidationPattern {
  pattern: string;
  type: 'format' | 'range' | 'lookup' | 'unique' | 'required';
  tables: string[];
  columns: string[];
  frequency: number;
}

export interface WorkflowPattern {
  name: string;
  steps: WorkflowStep[];
  tables: string[];
  sps: string[];
}

export interface WorkflowStep {
  order: number;
  operation: 'validate' | 'transform' | 'insert' | 'update' | 'delete' | 'notify';
  tableName?: string;
  description: string;
}

// =============================================================================
// Rule Pattern Definitions
// =============================================================================

interface RulePattern {
  regex: RegExp;
  category: RuleCategory;
  extractCondition: (match: RegExpMatchArray) => Partial<RuleCondition>;
  extractAction: (match: RegExpMatchArray) => Partial<RuleAction>;
  confidence: number;
}

// Common SP patterns that indicate business rules
const SP_RULE_PATTERNS: RulePattern[] = [
  // Validation patterns
  {
    regex: /IF\s+(?:NOT\s+)?EXISTS\s*\(\s*SELECT.*FROM\s+\[?(\w+)\]?\s+WHERE\s+\[?(\w+)\]?\s*=\s*@?(\w+)/gi,
    category: 'validation',
    extractCondition: (match) => ({
      type: 'script',
      script: `exists(${match[1]}.${match[2]} = ${match[3]})`
    }),
    extractAction: () => ({ type: 'reject', message: 'Record already exists' }),
    confidence: 0.9
  },
  {
    regex: /RAISERROR\s*\(\s*['"]([^'"]+)['"]/gi,
    category: 'validation',
    extractCondition: () => ({ type: 'simple' }),
    extractAction: (match) => ({ type: 'reject', message: match[1] }),
    confidence: 0.85
  },
  {
    regex: /THROW\s+\d+\s*,\s*['"]([^'"]+)['"]/gi,
    category: 'validation',
    extractCondition: () => ({ type: 'simple' }),
    extractAction: (match) => ({ type: 'reject', message: match[1] }),
    confidence: 0.85
  },
  {
    regex: /IF\s+@(\w+)\s+IS\s+NULL/gi,
    category: 'validation',
    extractCondition: (match) => ({
      type: 'simple',
      field: match[1],
      operator: 'is_null'
    }),
    extractAction: () => ({ type: 'reject', message: 'Required field is missing' }),
    confidence: 0.8
  },
  {
    regex: /IF\s+@(\w+)\s*=\s*0/gi,
    category: 'validation',
    extractCondition: (match) => ({
      type: 'simple',
      field: match[1],
      operator: 'equals',
      value: 0
    }),
    extractAction: () => ({ type: 'reject', message: 'Invalid value' }),
    confidence: 0.75
  },
  
  // Date validation patterns
  {
    regex: /DATEDIFF\s*\(\s*DAY\s*,\s*@?(\w+)\s*,\s*@?(\w+)\s*\)\s*([<>=!]+)\s*(\d+)/gi,
    category: 'validation',
    extractCondition: (match) => ({
      type: 'script',
      script: `dateDiff(${match[1]}, ${match[2]}) ${match[3]} ${match[4]}`
    }),
    extractAction: () => ({ type: 'reject', message: 'Date validation failed' }),
    confidence: 0.85
  },
  
  // Auto-generation patterns
  {
    regex: /SET\s+@(\w+)\s*=\s*(?:NEXT\s+VALUE\s+FOR|IDENT_CURRENT|SCOPE_IDENTITY)/gi,
    category: 'business_logic',
    extractCondition: () => ({ type: 'simple' }),
    extractAction: (match) => ({ 
      type: 'set_value', 
      target: match[1],
      value: 'AUTO_GENERATE'
    }),
    confidence: 0.9
  },
  {
    regex: /SELECT\s+@(\w+)\s*=\s*(?:ISNULL|COALESCE)\s*\(/gi,
    category: 'business_logic',
    extractCondition: () => ({ type: 'simple' }),
    extractAction: (match) => ({ 
      type: 'set_value', 
      target: match[1],
      script: 'set_default_if_null'
    }),
    confidence: 0.8
  },
  
  // Notification patterns
  {
    regex: /EXEC\s+(?:msdb\.dbo\.sp_send_dbmail|sp_send_dbmail)/gi,
    category: 'notification',
    extractCondition: () => ({ type: 'simple' }),
    extractAction: () => ({ type: 'send_email' }),
    confidence: 0.9
  },
  
  // Audit patterns
  {
    regex: /SET\s+\[?(\w+)?\]?\.\[?(ModifiedOn|UpdatedOn|ModifiedDate)\]?\s*=\s*(?:GETDATE|SYSDATETIME|GETUTCDATE)\s*\(\s*\)/gi,
    category: 'data_integrity',
    extractCondition: () => ({ type: 'simple' }),
    extractAction: (match) => ({ 
      type: 'set_value', 
      target: match[2],
      script: 'current_timestamp'
    }),
    confidence: 0.95
  },
  {
    regex: /SET\s+\[?(\w+)?\]?\.\[?(ModifiedBy|UpdatedBy|ModifiedByUser)\]?\s*=\s*@?(\w+)/gi,
    category: 'data_integrity',
    extractCondition: () => ({ type: 'simple' }),
    extractAction: (match) => ({ 
      type: 'set_value', 
      target: match[2],
      script: 'current_user'
    }),
    confidence: 0.95
  },
  
  // Status workflow patterns
  {
    regex: /UPDATE\s+\[?(\w+)\]?\s+SET\s+\[?Status\]?\s*=\s*['"]([^'"]+)['"]/gi,
    category: 'workflow',
    extractCondition: () => ({ type: 'simple' }),
    extractAction: (match) => ({ 
      type: 'update_record', 
      target: match[1],
      script: `set_status = '${match[2]}'`
    }),
    confidence: 0.8
  },
  
  // Soft delete pattern
  {
    regex: /UPDATE\s+\[?(\w+)\]?\s+SET\s+\[?IsActive\]?\s*=\s*0/gi,
    category: 'data_integrity',
    extractCondition: () => ({ type: 'simple' }),
    extractAction: () => ({ 
      type: 'update_record',
      script: 'soft_delete'
    }),
    confidence: 0.9
  }
];

// =============================================================================
// Business Rules Extractor Class
// =============================================================================

export class BusinessRulesExtractor {
  private projectId: string;
  private rules: ExtractedRule[] = [];
  private ruleCounter = 0;

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  /**
   * Extract all business rules from tables and SPs
   */
  extractRules(
    tables: TableDef[],
    storedProcedures: StoredProcedureDef[]
  ): BusinessRulesExtractionResult {
    this.rules = [];
    this.ruleCounter = 0;

    // Extract from stored procedures
    for (const sp of storedProcedures) {
      this.extractFromStoredProcedure(sp, tables);
    }

    // Extract from table constraints
    for (const table of tables) {
      this.extractFromTableConstraints(table);
    }

    // Extract from column properties
    for (const table of tables) {
      this.extractFromColumnProperties(table);
    }

    // Group results
    const byTable = this.groupByTable();
    const byCategory = this.groupByCategory();
    const bySource = this.groupBySource();

    // Identify patterns
    const validationPatterns = this.identifyValidationPatterns();
    const workflowPatterns = this.identifyWorkflowPatterns(storedProcedures);

    // Generate summary
    const summary = this.generateSummary(tables);

    // Generate recommendations
    const recommendations = this.generateRecommendations();

    return {
      projectId: this.projectId,
      extractionDate: new Date(),
      summary,
      rules: this.rules,
      byTable,
      byCategory,
      bySource,
      validationPatterns,
      workflowPatterns,
      recommendations,
    };
  }

  /**
   * Extract rules from stored procedure
   */
  private extractFromStoredProcedure(sp: StoredProcedureDef, tables: TableDef[]): void {
    const body = sp.body;

    // Apply each pattern
    for (const pattern of SP_RULE_PATTERNS) {
      let match: RegExpExecArray | null;
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      
      while ((match = regex.exec(body)) !== null) {
        // Determine table context
        const tableName = this.inferTableFromSP(sp, tables);
        
        const rule = this.createRule({
          source: 'stored_procedure',
          sourceName: sp.procedureName,
          category: pattern.category,
          name: `${sp.procedureName} - ${pattern.category} Rule`,
          description: `Extracted from stored procedure ${sp.procedureName}`,
          tableName,
          trigger: this.inferTriggerFromSP(sp),
          condition: pattern.extractCondition(match) as RuleCondition,
          action: pattern.extractAction(match) as RuleAction,
          confidence: pattern.confidence,
          rawDefinition: match[0],
        });

        if (rule) {
          this.rules.push(rule);
        }
      }
    }

    // Extract parameter validations
    this.extractParameterValidations(sp);

    // Extract transaction patterns
    this.extractTransactionPatterns(sp);
  }

  /**
   * Extract parameter validation rules from SP
   */
  private extractParameterValidations(sp: StoredProcedureDef): void {
    for (const param of sp.parameters) {
      // Check for validation in SP body
      const paramValidationRegex = new RegExp(
        `IF\\s+@${param.name.replace('@', '')}\\s*(IS\\s+NULL|=\\s*['"]?['"]?)`,
        'gi'
      );
      
      if (paramValidationRegex.test(sp.body)) {
        this.rules.push(this.createRule({
          source: 'stored_procedure',
          sourceName: sp.procedureName,
          category: 'validation',
          name: `${sp.procedureName} - ${param.name} Validation`,
          description: `Parameter ${param.name} is validated in ${sp.procedureName}`,
          tableName: this.inferTableFromParam(param.name, sp),
          columnName: this.inferColumnFromParam(param.name),
          trigger: { type: 'before_create' },
          condition: {
            type: 'simple',
            field: param.name,
            operator: 'is_null'
          },
          action: {
            type: 'reject',
            message: `${param.name} is required`
          },
          confidence: 0.7,
          rawDefinition: `@${param.name} ${param.dataType}`,
        })!);
      }
    }
  }

  /**
   * Extract transaction and workflow patterns from SP
   */
  private extractTransactionPatterns(sp: StoredProcedureDef): void {
    // Check for transaction usage
    if (/BEGIN\s+TRANSACTION/i.test(sp.body)) {
      this.rules.push(this.createRule({
        source: 'stored_procedure',
        sourceName: sp.procedureName,
        category: 'data_integrity',
        name: `${sp.procedureName} - Transaction Safety`,
        description: `${sp.procedureName} uses transactions for data integrity`,
        tableName: sp.tablesModified?.[0] || '',
        trigger: { type: 'before_create' },
        condition: { type: 'simple' },
        action: { type: 'validate', message: 'Operation wrapped in transaction' },
        confidence: 0.9,
        rawDefinition: 'BEGIN TRANSACTION ... COMMIT/ROLLBACK',
      })!);
    }

    // Check for error handling
    if (/TRY\s*\{/i.test(sp.body) || /BEGIN\s+TRY/i.test(sp.body)) {
      this.rules.push(this.createRule({
        source: 'stored_procedure',
        sourceName: sp.procedureName,
        category: 'data_integrity',
        name: `${sp.procedureName} - Error Handling`,
        description: `${sp.procedureName} has structured error handling`,
        tableName: sp.tablesModified?.[0] || '',
        trigger: { type: 'before_create' },
        condition: { type: 'simple' },
        action: { type: 'log', message: 'Error caught and handled' },
        confidence: 0.85,
        rawDefinition: 'BEGIN TRY ... END TRY',
      })!);
    }
  }

  /**
   * Extract rules from table constraints
   */
  private extractFromTableConstraints(table: TableDef): void {
    // Check constraints
    if (table.checkConstraints) {
      for (const cc of table.checkConstraints) {
        this.extractFromCheckConstraint(table, cc);
      }
    }

    // Foreign keys imply relationship rules
    for (const fk of table.foreignKeys) {
      this.rules.push(this.createRule({
        source: 'stored_procedure',
        sourceName: fk.constraintName || 'FK',
        category: 'data_integrity',
        name: `${table.tableName} - FK to ${fk.referencesTable}`,
        description: `Foreign key relationship from ${table.tableName}.${fk.columnName} to ${fk.referencesTable}.${fk.referencesColumn}`,
        tableName: table.tableName,
        columnName: fk.columnName,
        trigger: { type: 'before_create', tableName: table.tableName, columnName: fk.columnName },
        condition: {
          type: 'script',
          script: `exists(${fk.referencesTable}.${fk.referencesColumn} = record.${fk.columnName})`
        },
        action: {
          type: 'reject',
          message: `Referenced ${fk.referencesTable} record not found`
        },
        confidence: 0.95,
        rawDefinition: `FK: ${fk.columnName} -> ${fk.referencesTable}.${fk.referencesColumn}`,
      })!);
    }
  }

  /**
   * Extract rules from check constraint
   */
  private extractFromCheckConstraint(table: TableDef, cc: CheckConstraintDef): void {
    const expr = cc.expression;
    let category: RuleCategory = 'validation';
    let condition: RuleCondition = { type: 'simple' };
    let action: RuleAction = { type: 'reject', message: 'Check constraint violation' };
    let confidence = 0.9;

    // Parse common constraint patterns
    if (/IN\s*\(/i.test(expr)) {
      // List of allowed values
      const valuesMatch = expr.match(/IN\s*\(([^)]+)\)/i);
      if (valuesMatch) {
        const values = valuesMatch[1].split(',').map(v => v.trim().replace(/['"]/g, ''));
        condition = {
          type: 'simple',
          field: cc.columns?.[0] || 'unknown',
          operator: 'in',
          value: values
        };
        action.message = `Value must be one of: ${values.join(', ')}`;
      }
    } else if (/BETWEEN/i.test(expr)) {
      // Range check
      const rangeMatch = expr.match(/BETWEEN\s+(\d+)\s+AND\s+(\d+)/i);
      if (rangeMatch) {
        condition = {
          type: 'script',
          script: `value BETWEEN ${rangeMatch[1]} AND ${rangeMatch[2]}`
        };
        action.message = `Value must be between ${rangeMatch[1]} and ${rangeMatch[2]}`;
      }
    } else if (/[><=]/.test(expr)) {
      // Comparison check
      condition = {
        type: 'script',
        script: expr
      };
      action.message = `Value must satisfy: ${expr}`;
    } else if (/LIKE/i.test(expr)) {
      // Pattern check
      const patternMatch = expr.match(/LIKE\s+['"]([^'"]+)['"]/i);
      if (patternMatch) {
        condition = {
          type: 'script',
          script: `value LIKE '${patternMatch[1]}'`
        };
        action.message = `Value must match pattern: ${patternMatch[1]}`;
      }
    }

    this.rules.push(this.createRule({
      source: 'check_constraint',
      sourceName: cc.name || 'anonymous',
      category,
      name: `${table.tableName} - ${cc.name || 'Check Constraint'}`,
      description: `Check constraint: ${expr}`,
      tableName: table.tableName,
      columnName: cc.columns?.[0],
      trigger: { type: 'before_create', tableName: table.tableName },
      condition,
      action,
      confidence,
      rawDefinition: expr,
    })!);
  }

  /**
   * Extract rules from column properties
   */
  private extractFromColumnProperties(table: TableDef): void {
    for (const col of table.columns) {
      // NOT NULL implies required field
      if (!col.isNullable && !col.isPrimaryKey && !col.isIdentity) {
        this.rules.push(this.createRule({
          source: 'column_property',
          sourceName: col.name,
          category: 'validation',
          name: `${table.tableName}.${col.name} - Required`,
          description: `Column ${col.name} is required (NOT NULL)`,
          tableName: table.tableName,
          columnName: col.name,
          trigger: { type: 'before_create', tableName: table.tableName, columnName: col.name },
          condition: {
            type: 'simple',
            field: col.name,
            operator: 'is_null'
          },
          action: {
            type: 'reject',
            message: `${col.name} is required`
          },
          confidence: 0.95,
          rawDefinition: `${col.name} ${col.dataType} NOT NULL`,
        })!);
      }

      // Default value implies auto-fill rule
      if (col.defaultValue) {
        this.rules.push(this.createRule({
          source: 'default_value',
          sourceName: col.name,
          category: 'business_logic',
          name: `${table.tableName}.${col.name} - Default Value`,
          description: `Column ${col.name} has default value: ${col.defaultValue}`,
          tableName: table.tableName,
          columnName: col.name,
          trigger: { type: 'before_create', tableName: table.tableName, columnName: col.name },
          condition: {
            type: 'simple',
            field: col.name,
            operator: 'is_null'
          },
          action: {
            type: 'set_value',
            target: col.name,
            value: col.defaultValue
          },
          confidence: 0.95,
          rawDefinition: `DEFAULT ${col.defaultValue}`,
        })!);
      }

      // Identity implies auto-generation
      if (col.isIdentity) {
        this.rules.push(this.createRule({
          source: 'column_property',
          sourceName: col.name,
          category: 'business_logic',
          name: `${table.tableName}.${col.name} - Auto-generated`,
          description: `Column ${col.name} is auto-generated (IDENTITY)`,
          tableName: table.tableName,
          columnName: col.name,
          trigger: { type: 'before_create', tableName: table.tableName, columnName: col.name },
          condition: { type: 'simple' },
          action: {
            type: 'set_value',
            target: col.name,
            value: 'AUTO_GENERATE'
          },
          confidence: 0.98,
          rawDefinition: 'IDENTITY(1,1)',
        })!);
      }

      // Detect common patterns
      this.detectSemanticRules(table, col);
    }
  }

  /**
   * Detect semantic rules from column naming patterns
   */
  private detectSemanticRules(table: TableDef, col: ColumnDef): void {
    const colNameLower = col.name.toLowerCase();

    // Email validation
    if (colNameLower.includes('email')) {
      this.rules.push(this.createRule({
        source: 'column_property',
        sourceName: col.name,
        category: 'validation',
        name: `${table.tableName}.${col.name} - Email Format`,
        description: `Column ${col.name} should contain valid email`,
        tableName: table.tableName,
        columnName: col.name,
        trigger: { type: 'before_create', tableName: table.tableName, columnName: col.name },
        condition: {
          type: 'script',
          script: `isValidEmail(record.${col.name})`
        },
        action: {
          type: 'reject',
          message: 'Invalid email format'
        },
        confidence: 0.7,
        rawDefinition: 'email pattern inferred from column name',
      })!);
    }

    // Phone validation
    if (colNameLower.includes('phone') || colNameLower.includes('mobile') || colNameLower.includes('tel')) {
      this.rules.push(this.createRule({
        source: 'column_property',
        sourceName: col.name,
        category: 'validation',
        name: `${table.tableName}.${col.name} - Phone Format`,
        description: `Column ${col.name} should contain valid phone number`,
        tableName: table.tableName,
        columnName: col.name,
        trigger: { type: 'before_create', tableName: table.tableName, columnName: col.name },
        condition: {
          type: 'script',
          script: `isValidPhone(record.${col.name})`
        },
        action: {
          type: 'reject',
          message: 'Invalid phone number format'
        },
        confidence: 0.7,
        rawDefinition: 'phone pattern inferred from column name',
      })!);
    }

    // Status workflow
    if (colNameLower === 'status' || colNameLower.endsWith('status')) {
      this.rules.push(this.createRule({
        source: 'column_property',
        sourceName: col.name,
        category: 'workflow',
        name: `${table.tableName}.${col.name} - Status Tracking`,
        description: `Track status changes for ${table.tableName}`,
        tableName: table.tableName,
        columnName: col.name,
        trigger: { type: 'after_update', tableName: table.tableName, columnName: col.name },
        condition: { type: 'simple' },
        action: {
          type: 'create_record',
          target: 'StatusHistory',
          script: `{ table: '${table.tableName}', recordId: record.Id, oldStatus: oldValue, newStatus: record.${col.name} }`
        },
        confidence: 0.65,
        rawDefinition: 'status tracking inferred from column name',
      })!);
    }

    // Amount validation
    if (colNameLower.includes('amount') || colNameLower.includes('price') || colNameLower.includes('fee') || colNameLower.includes('salary')) {
      this.rules.push(this.createRule({
        source: 'column_property',
        sourceName: col.name,
        category: 'validation',
        name: `${table.tableName}.${col.name} - Positive Value`,
        description: `Column ${col.name} should be positive`,
        tableName: table.tableName,
        columnName: col.name,
        trigger: { type: 'before_create', tableName: table.tableName, columnName: col.name },
        condition: {
          type: 'script',
          script: `record.${col.name} >= 0`
        },
        action: {
          type: 'reject',
          message: `${col.name} must be a positive value`
        },
        confidence: 0.75,
        rawDefinition: 'amount validation inferred from column name',
      })!);
    }

    // Audit fields
    if (colNameLower === 'createdon' || colNameLower === 'createddate' || colNameLower === 'createdat') {
      this.rules.push(this.createRule({
        source: 'column_property',
        sourceName: col.name,
        category: 'data_integrity',
        name: `${table.tableName}.${col.name} - Auto-set Created`,
        description: `Auto-set creation timestamp`,
        tableName: table.tableName,
        columnName: col.name,
        trigger: { type: 'before_create', tableName: table.tableName, columnName: col.name },
        condition: {
          type: 'simple',
          field: col.name,
          operator: 'is_null'
        },
        action: {
          type: 'set_value',
          target: col.name,
          script: 'current_timestamp'
        },
        confidence: 0.9,
        rawDefinition: 'audit timestamp pattern',
      })!);
    }

    if (colNameLower === 'modifiedon' || colNameLower === 'modifieddate' || colNameLower === 'modifiedat' || colNameLower === 'updatedon') {
      this.rules.push(this.createRule({
        source: 'column_property',
        sourceName: col.name,
        category: 'data_integrity',
        name: `${table.tableName}.${col.name} - Auto-set Modified`,
        description: `Auto-set modification timestamp on update`,
        tableName: table.tableName,
        columnName: col.name,
        trigger: { type: 'before_update', tableName: table.tableName, columnName: col.name },
        condition: { type: 'simple' },
        action: {
          type: 'set_value',
          target: col.name,
          script: 'current_timestamp'
        },
        confidence: 0.9,
        rawDefinition: 'audit timestamp pattern',
      })!);
    }
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  private createRule(partial: Partial<ExtractedRule>): ExtractedRule | null {
    if (!partial.category || !partial.name || !partial.tableName) {
      return null;
    }

    this.ruleCounter++;
    return {
      id: `rule-${this.projectId}-${this.ruleCounter}`,
      source: partial.source || 'stored_procedure',
      sourceName: partial.sourceName || 'unknown',
      category: partial.category,
      name: partial.name,
      description: partial.description || '',
      tableName: partial.tableName,
      columnName: partial.columnName,
      trigger: partial.trigger || { type: 'before_create' },
      condition: partial.condition || { type: 'simple' },
      action: partial.action || { type: 'log' },
      confidence: partial.confidence || 0.5,
      rawDefinition: partial.rawDefinition || '',
      examples: partial.examples || [],
      relatedRules: partial.relatedRules || [],
    };
  }

  private inferTableFromSP(sp: StoredProcedureDef, tables: TableDef[]): string {
    // Check tables accessed/modified
    if (sp.tablesModified && sp.tablesModified.length > 0) {
      return sp.tablesModified[0];
    }
    if (sp.tablesAccessed && sp.tablesAccessed.length > 0) {
      return sp.tablesAccessed[0];
    }
    
    // Try to infer from SP name
    for (const table of tables) {
      if (sp.procedureName.toLowerCase().includes(table.tableName.toLowerCase())) {
        return table.tableName;
      }
    }
    
    return 'unknown';
  }

  private inferTriggerFromSP(sp: StoredProcedureDef): RuleTrigger {
    const name = sp.procedureName.toLowerCase();
    
    if (name.includes('insert') || name.includes('add') || name.includes('create')) {
      return { type: 'before_create' };
    }
    if (name.includes('update') || name.includes('edit') || name.includes('modify')) {
      return { type: 'before_update' };
    }
    if (name.includes('delete') || name.includes('remove')) {
      return { type: 'before_delete' };
    }
    
    return { type: 'before_create' };
  }

  private inferTableFromParam(paramName: string, sp: StoredProcedureDef): string {
    // Remove @ prefix and common suffixes
    const cleanName = paramName.replace('@', '').toLowerCase();
    
    if (sp.tablesModified && sp.tablesModified.length > 0) {
      return sp.tablesModified[0];
    }
    
    return 'unknown';
  }

  private inferColumnFromParam(paramName: string): string {
    // Remove @ prefix
    return paramName.replace('@', '');
  }

  private groupByTable(): Map<string, ExtractedRule[]> {
    const map = new Map<string, ExtractedRule[]>();
    
    for (const rule of this.rules) {
      const key = rule.tableName;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(rule);
    }
    
    return map;
  }

  private groupByCategory(): Map<RuleCategory, ExtractedRule[]> {
    const map = new Map<RuleCategory, ExtractedRule[]>();
    
    for (const rule of this.rules) {
      const key = rule.category;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(rule);
    }
    
    return map;
  }

  private groupBySource(): Map<string, ExtractedRule[]> {
    const map = new Map<string, ExtractedRule[]>();
    
    for (const rule of this.rules) {
      const key = rule.source;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(rule);
    }
    
    return map;
  }

  private identifyValidationPatterns(): ValidationPattern[] {
    const patterns: ValidationPattern[] = [];
    
    // Find email validation pattern
    const emailRules = this.rules.filter(r => 
      r.category === 'validation' && 
      r.rawDefinition?.includes('email')
    );
    if (emailRules.length > 0) {
      patterns.push({
        pattern: 'email',
        type: 'format',
        tables: [...new Set(emailRules.map(r => r.tableName))],
        columns: [...new Set(emailRules.filter(r => r.columnName).map(r => r.columnName!))],
        frequency: emailRules.length
      });
    }

    // Find required field pattern
    const requiredRules = this.rules.filter(r =>
      r.category === 'validation' &&
      r.condition.operator === 'is_null' &&
      r.action.type === 'reject'
    );
    if (requiredRules.length > 0) {
      patterns.push({
        pattern: 'required',
        type: 'required',
        tables: [...new Set(requiredRules.map(r => r.tableName))],
        columns: [...new Set(requiredRules.filter(r => r.columnName).map(r => r.columnName!))],
        frequency: requiredRules.length
      });
    }

    return patterns;
  }

  private identifyWorkflowPatterns(sps: StoredProcedureDef[]): WorkflowPattern[] {
    const patterns: WorkflowPattern[] = [];
    
    // Group SPs by common prefixes
    const spGroups = new Map<string, StoredProcedureDef[]>();
    for (const sp of sps) {
      const prefix = sp.procedureName.replace(/_(Add|Update|Delete|Get|List|Create)$/, '');
      if (!spGroups.has(prefix)) {
        spGroups.set(prefix, []);
      }
      spGroups.get(prefix)!.push(sp);
    }

    // Create workflow patterns for groups with CRUD operations
    for (const [prefix, group] of spGroups) {
      if (group.length >= 3) { // At least 3 CRUD operations
        const steps: WorkflowStep[] = [];
        const tables = new Set<string>();
        const spNames: string[] = [];

        let order = 1;
        for (const sp of group) {
          spNames.push(sp.procedureName);
          sp.tablesAccessed?.forEach(t => tables.add(t));
          sp.tablesModified?.forEach(t => tables.add(t));

          const name = sp.procedureName.toLowerCase();
          if (name.includes('add') || name.includes('create')) {
            steps.push({ order: order++, operation: 'insert', tableName: sp.tablesModified?.[0], description: 'Create new record' });
          } else if (name.includes('update')) {
            steps.push({ order: order++, operation: 'update', tableName: sp.tablesModified?.[0], description: 'Update record' });
          } else if (name.includes('delete')) {
            steps.push({ order: order++, operation: 'delete', tableName: sp.tablesModified?.[0], description: 'Delete record' });
          } else if (name.includes('get') || name.includes('list')) {
            steps.push({ order: order++, operation: 'validate', tableName: sp.tablesAccessed?.[0], description: 'Retrieve records' });
          }
        }

        if (steps.length >= 2) {
          patterns.push({
            name: `${prefix} Workflow`,
            steps: steps.sort((a, b) => a.order - b.order),
            tables: Array.from(tables),
            sps: spNames
          });
        }
      }
    }

    return patterns;
  }

  private generateSummary(tables: TableDef[]): ExtractionSummary {
    const tableSet = new Set(this.rules.map(r => r.tableName));
    
    return {
      totalRules: this.rules.length,
      fromStoredProcedures: this.rules.filter(r => r.source === 'stored_procedure').length,
      fromConstraints: this.rules.filter(r => r.source === 'check_constraint').length,
      fromDefaults: this.rules.filter(r => r.source === 'default_value').length,
      fromColumnProperties: this.rules.filter(r => r.source === 'column_property').length,
      highConfidence: this.rules.filter(r => r.confidence >= 0.8).length,
      mediumConfidence: this.rules.filter(r => r.confidence >= 0.6 && r.confidence < 0.8).length,
      lowConfidence: this.rules.filter(r => r.confidence < 0.6).length,
      tablesCovered: tableSet.size
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    const lowConfidence = this.rules.filter(r => r.confidence < 0.7);
    if (lowConfidence.length > 0) {
      recommendations.push(`Review ${lowConfidence.length} low-confidence rules for accuracy`);
    }

    const validationRules = this.rules.filter(r => r.category === 'validation');
    if (validationRules.length < 5) {
      recommendations.push('Consider adding more validation rules for data integrity');
    }

    const tablesWithRules = new Set(this.rules.map(r => r.tableName));
    const tablesWithoutRules = this.rules.filter(r => r.tableName === 'unknown');
    if (tablesWithoutRules.length > 0) {
      recommendations.push(`${tablesWithoutRules.length} rules could not be mapped to specific tables`);
    }

    const duplicateChecks = this.findPotentialDuplicates();
    if (duplicateChecks.length > 0) {
      recommendations.push(`Found ${duplicateChecks.length} potential duplicate rules - consider consolidating`);
    }

    return recommendations;
  }

  private findPotentialDuplicates(): ExtractedRule[][] {
    const duplicates: ExtractedRule[][] = [];
    const processed = new Set<string>();

    for (let i = 0; i < this.rules.length; i++) {
      const rule1 = this.rules[i];
      if (processed.has(rule1.id)) continue;

      const group: ExtractedRule[] = [rule1];
      
      for (let j = i + 1; j < this.rules.length; j++) {
        const rule2 = this.rules[j];
        if (processed.has(rule2.id)) continue;

        if (
          rule1.tableName === rule2.tableName &&
          rule1.category === rule2.category &&
          rule1.columnName === rule2.columnName
        ) {
          group.push(rule2);
          processed.add(rule2.id);
        }
      }

      if (group.length > 1) {
        duplicates.push(group);
        processed.add(rule1.id);
      }
    }

    return duplicates;
  }

  /**
   * Convert extracted rules to standard BusinessRule format
   */
  toBusinessRules(extractedRules: ExtractedRule[]): BusinessRule[] {
    return extractedRules.map((er, index) => ({
      id: er.id,
      code: `BR-${er.category.substring(0, 3).toUpperCase()}-${er.tableName.substring(0, 3).toUpperCase()}-${String(index + 1).padStart(3, '0')}`,
      name: er.name,
      description: er.description,
      category: er.category,
      priority: er.confidence >= 0.8 ? 'high' : er.confidence >= 0.6 ? 'medium' : 'low',
      status: 'draft' as const,
      tableName: er.tableName,
      trigger: er.trigger,
      condition: er.condition,
      action: er.action,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      tags: [er.source, er.category, er.tableName]
    }));
  }
}

// =============================================================================
// Export convenience functions
// =============================================================================

export function createBusinessRulesExtractor(projectId: string): BusinessRulesExtractor {
  return new BusinessRulesExtractor(projectId);
}

export function extractBusinessRules(
  projectId: string,
  tables: TableDef[],
  storedProcedures: StoredProcedureDef[]
): BusinessRulesExtractionResult {
  const extractor = new BusinessRulesExtractor(projectId);
  return extractor.extractRules(tables, storedProcedures);
}
