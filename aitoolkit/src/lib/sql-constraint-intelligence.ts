// =============================================================================
// SQL Constraint Intelligence - Enhanced Parser for Cross-Reference
// =============================================================================
// Extracts detailed constraint intelligence from SQL DDL for cross-referencing
// with C# Data Annotations and other parsers
// =============================================================================

import {
  TableDef,
  ColumnDef,
  CheckConstraintDef,
  IndexDef,
  ValidationRule,
} from './types';

// =============================================================================
// Enhanced Type Definitions
// =============================================================================

/**
 * Parsed CHECK constraint with extracted intelligence
 */
export interface ParsedCheckConstraint extends CheckConstraintDef {
  // Parsed condition details
  conditionType: CheckConditionType;
  columnName: string;
  operator: ComparisonOperator;
  value?: string | number | boolean;
  values?: (string | number)[];  // For IN conditions
  minValue?: string | number;
  maxValue?: string | number;
  
  // Inferred validation rules
  validationRules: ValidationRule[];
  
  // Business context
  businessRule?: string;
  inferredPurpose?: ConstraintPurpose;
  
  // Cross-reference data
  csharpEquivalent?: CSharpEquivalentValidation;
}

/**
 * CHECK constraint condition types
 */
export type CheckConditionType = 
  | 'comparison'      // Age >= 18
  | 'range'           // Age BETWEEN 0 AND 150
  | 'in_list'         // Status IN ('Active', 'Inactive')
  | 'pattern'         // Email LIKE '%@%.%'
  | 'length'          // LEN(Name) > 0
  | 'null_check'      // Column IS NOT NULL
  | 'composite'       // Multiple conditions
  | 'unknown';

/**
 * Comparison operators
 */
export type ComparisonOperator = 
  | '=' | '<>' | '!=' | '>' | '>=' | '<' | '<=' 
  | 'LIKE' | 'NOT LIKE' | 'IN' | 'NOT IN' 
  | 'BETWEEN' | 'IS NULL' | 'IS NOT NULL'
  | 'UNKNOWN';

/**
 * Constraint purpose classification
 */
export type ConstraintPurpose = 
  | 'business_rule'     // Business logic enforcement
  | 'data_integrity'    // Referential/data integrity
  | 'validation'        // Input validation
  | 'compliance'        // Regulatory compliance
  | 'security'          // Security constraints
  | 'unknown';

/**
 * UNIQUE constraint details
 */
export interface ParsedUniqueConstraint {
  name: string;
  columns: string[];
  isPrimaryKey: boolean;
  isClustered: boolean;
  
  // Cross-reference
  csharpEquivalent?: CSharpEquivalentValidation;
}

/**
 * DEFAULT constraint details
 */
export interface ParsedDefaultConstraint {
  columnName: string;
  constraintName?: string;
  value: string;
  valueType: DefaultValueTypes;
  inferredPurpose: DefaultPurpose;
  
  // Cross-reference
  csharpEquivalent?: CSharpEquivalentValidation;
}

/**
 * Default value types
 */
export type DefaultValueTypes = 
  | 'literal_string'
  | 'literal_number'
  | 'literal_boolean'
  | 'function_getdate'
  | 'function_newid'
  | 'function_suser'
  | 'expression'
  | 'unknown';

/**
 * Default purpose classification
 */
export type DefaultPurpose = 
  | 'audit_created'     // CreatedAt, CreatedBy
  | 'audit_updated'     // UpdatedAt, UpdatedBy
  | 'status_initial'    // Initial status
  | 'sort_order'        // Display order
  | 'soft_delete'       // IsDeleted = 0
  | 'tenant_isolation'  // TenantId
  | 'security'          // Security defaults
  | 'business_logic'    // Business defaults
  | 'unknown';

/**
 * C# equivalent validation mapping
 */
export interface CSharpEquivalentValidation {
  attribute: string;
  namespace: string;
  parameters: Record<string, string | number | boolean>;
  confidence: number;
  notes?: string;
}

/**
 * Column constraint intelligence
 */
export interface ColumnConstraintIntelligence {
  columnName: string;
  tableName: string;
  
  // From SQL
  isNullable: boolean;
  hasDefault: boolean;
  defaultValue?: ParsedDefaultConstraint;
  checkConstraints: ParsedCheckConstraint[];
  uniqueConstraints: ParsedUniqueConstraint[];
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  
  // Extracted validation rules from constraints
  validationRules: ValidationRule[];
  
  // Business context
  businessRules: string[];
  complianceFlags: string[];
  
  // Cross-reference ready
  crossRefKey: string;
}

/**
 * Table constraint intelligence summary
 */
export interface TableConstraintIntelligence {
  tableName: string;
  columns: ColumnConstraintIntelligence[];
  
  // Table-level constraints
  checkConstraints: ParsedCheckConstraint[];
  uniqueConstraints: ParsedUniqueConstraint[];
  
  // Inferred patterns
  softDeletePattern: boolean;
  auditPattern: boolean;
  tenantIsolation: boolean;
  
  // Compliance indicators
  piiColumns: string[];
  phiColumns: string[];
  
  // Summary
  totalConstraints: number;
  totalValidations: number;
  businessRulesCount: number;
}

// =============================================================================
// SQL Constraint Parser
// =============================================================================

/**
 * Enhanced SQL Constraint Parser
 */
export class SQLConstraintParser {
  /**
   * Parse all constraints from a table definition
   */
  parseTableConstraints(table: TableDef): TableConstraintIntelligence {
    const columnIntelligence = table.columns.map(col => 
      this.parseColumnConstraints(col, table)
    );
    
    // Parse table-level CHECK constraints
    const checkConstraints = (table.checkConstraints || []).map(cc =>
      this.parseCheckConstraint(cc, table.tableName)
    );
    
    // Parse unique constraints from indexes
    const uniqueConstraints = (table.indexes || [])
      .filter(idx => idx.isUnique)
      .map(idx => this.parseUniqueConstraint(idx, table.tableName));
    
    // Detect patterns
    const softDeletePattern = this.detectSoftDeletePattern(table);
    const auditPattern = this.detectAuditPattern(table);
    const tenantIsolation = this.detectTenantIsolation(table);
    
    // Detect PII/PHI columns
    const piiColumns = this.detectPIIColumns(table);
    const phiColumns = this.detectPHIColumns(table);
    
    return {
      tableName: table.tableName,
      columns: columnIntelligence,
      checkConstraints,
      uniqueConstraints,
      softDeletePattern,
      auditPattern,
      tenantIsolation,
      piiColumns,
      phiColumns,
      totalConstraints: checkConstraints.length + uniqueConstraints.length,
      totalValidations: columnIntelligence.reduce((sum, col) => sum + col.validationRules.length, 0),
      businessRulesCount: checkConstraints.filter(cc => cc.inferredPurpose === 'business_rule').length,
    };
  }
  
  /**
   * Parse constraints for a single column
   */
  parseColumnConstraints(
    column: ColumnDef, 
    table: TableDef
  ): ColumnConstraintIntelligence {
    const checkConstraints = (table.checkConstraints || [])
      .filter(cc => this.isColumnInCheckConstraint(cc, column.name))
      .map(cc => this.parseCheckConstraint(cc, table.tableName, column.name));
    
    const uniqueConstraints = (table.indexes || [])
      .filter(idx => idx.isUnique && idx.columns.includes(column.name))
      .map(idx => this.parseUniqueConstraint(idx, table.tableName));
    
    const defaultValue = column.defaultValue 
      ? this.parseDefaultValue(column.name, column.defaultValue)
      : undefined;
    
    const validationRules = this.extractValidationRules(
      column,
      checkConstraints,
      uniqueConstraints,
      defaultValue
    );
    
    const businessRules = checkConstraints
      .filter(cc => cc.inferredPurpose === 'business_rule')
      .map(cc => cc.businessRule || cc.expression);
    
    const complianceFlags = this.extractComplianceFlags(column, checkConstraints);
    
    return {
      columnName: column.name,
      tableName: table.tableName,
      isNullable: column.isNullable,
      hasDefault: !!column.defaultValue,
      defaultValue,
      checkConstraints,
      uniqueConstraints,
      isPrimaryKey: column.isPrimaryKey,
      isForeignKey: table.foreignKeys.some(fk => fk.columnName === column.name),
      validationRules,
      businessRules,
      complianceFlags,
      crossRefKey: `${table.tableName}.${column.name}`.toLowerCase(),
    };
  }
  
  /**
   * Parse a CHECK constraint expression
   */
  parseCheckConstraint(
    constraint: CheckConstraintDef,
    tableName: string,
    specificColumn?: string
  ): ParsedCheckConstraint {
    const expression = constraint.expression;
    
    // Parse the condition
    const parsed = this.parseCheckExpression(expression);
    
    // Infer validation rules
    const validationRules = this.inferValidationRules(parsed);
    
    // Infer purpose
    const inferredPurpose = this.inferConstraintPurpose(parsed, expression);
    
    // Generate business rule description
    const businessRule = this.generateBusinessRuleDescription(parsed, tableName);
    
    // Generate C# equivalent
    const csharpEquivalent = this.generateCSharpEquivalent(parsed);
    
    return {
      ...constraint,
      name: constraint.name,
      expression,
      columns: parsed.columns,
      conditionType: parsed.conditionType,
      columnName: specificColumn || parsed.columns[0] || '',
      operator: parsed.operator,
      value: parsed.value,
      values: parsed.values,
      minValue: parsed.minValue,
      maxValue: parsed.maxValue,
      validationRules,
      businessRule,
      inferredPurpose,
      csharpEquivalent,
    };
  }
  
  /**
   * Parse CHECK constraint expression
   */
  private parseCheckExpression(expression: string): {
    conditionType: CheckConditionType;
    columns: string[];
    operator: ComparisonOperator;
    value?: string | number | boolean;
    values?: (string | number)[];
    minValue?: string | number;
    maxValue?: string | number;
  } {
    const normalized = expression.trim();
    
    // Extract column names
    const columns = this.extractColumnsFromExpression(normalized);
    
    // Try different patterns
    
    // Pattern: Column IN ('value1', 'value2', ...)
    const inMatch = normalized.match(/\b(\w+)\s+IN\s*\(([^)]+)\)/i);
    if (inMatch) {
      const valuesStr = inMatch[2];
      const values = this.parseValueList(valuesStr);
      return {
        conditionType: 'in_list',
        columns: [inMatch[1]],
        operator: 'IN',
        values,
      };
    }
    
    // Pattern: Column NOT IN ('value1', 'value2', ...)
    const notInMatch = normalized.match(/\b(\w+)\s+NOT\s+IN\s*\(([^)]+)\)/i);
    if (notInMatch) {
      const valuesStr = notInMatch[2];
      const values = this.parseValueList(valuesStr);
      return {
        conditionType: 'in_list',
        columns: [notInMatch[1]],
        operator: 'NOT IN',
        values,
      };
    }
    
    // Pattern: Column BETWEEN min AND max
    const betweenMatch = normalized.match(/\b(\w+)\s+BETWEEN\s+(\S+)\s+AND\s+(\S+)/i);
    if (betweenMatch) {
      return {
        conditionType: 'range',
        columns: [betweenMatch[1]],
        operator: 'BETWEEN',
        minValue: this.parseValue(betweenMatch[2]),
        maxValue: this.parseValue(betweenMatch[3]),
      };
    }
    
    // Pattern: LEN(Column) >= value or LEN(Column) > value
    const lenMatch = normalized.match(/LEN\s*\(\s*(\w+)\s*\)\s*(>=?|<=?)\s*(\d+)/i);
    if (lenMatch) {
      return {
        conditionType: 'length',
        columns: [lenMatch[1]],
        operator: lenMatch[2] as ComparisonOperator,
        value: parseInt(lenMatch[3]),
      };
    }
    
    // Pattern: Column LIKE 'pattern'
    const likeMatch = normalized.match(/\b(\w+)\s+(NOT\s+)?LIKE\s+['"]([^'"]+)['"]/i);
    if (likeMatch) {
      return {
        conditionType: 'pattern',
        columns: [likeMatch[1]],
        operator: likeMatch[2] ? 'NOT LIKE' : 'LIKE',
        value: likeMatch[3],
      };
    }
    
    // Pattern: Column IS NOT NULL
    const notNullMatch = normalized.match(/\b(\w+)\s+IS\s+NOT\s+NULL/i);
    if (notNullMatch) {
      return {
        conditionType: 'null_check',
        columns: [notNullMatch[1]],
        operator: 'IS NOT NULL',
      };
    }
    
    // Pattern: Column IS NULL
    const nullMatch = normalized.match(/\b(\w+)\s+IS\s+NULL/i);
    if (nullMatch) {
      return {
        conditionType: 'null_check',
        columns: [nullMatch[1]],
        operator: 'IS NULL',
      };
    }
    
    // Pattern: Column = value, Column > value, etc.
    const comparisonMatch = normalized.match(/\b(\w+)\s*(=|<>|!=|>=?|<=?)\s*(\S+)/);
    if (comparisonMatch) {
      return {
        conditionType: 'comparison',
        columns: [comparisonMatch[1]],
        operator: comparisonMatch[2] as ComparisonOperator,
        value: this.parseValue(comparisonMatch[3]),
      };
    }
    
    // Pattern: Column >= min AND Column <= max (range as two conditions)
    const rangeAndMatch = normalized.match(/\b(\w+)\s*(>=?)\s*(\S+)\s+AND\s+\1\s*(<=?)\s*(\S+)/i);
    if (rangeAndMatch) {
      return {
        conditionType: 'range',
        columns: [rangeAndMatch[1]],
        operator: 'BETWEEN',
        minValue: this.parseValue(rangeAndMatch[3]),
        maxValue: this.parseValue(rangeAndMatch[5]),
      };
    }
    
    // Default: unknown composite
    return {
      conditionType: 'composite',
      columns,
      operator: 'UNKNOWN',
    };
  }
  
  /**
   * Extract column names from expression
   */
  private extractColumnsFromExpression(expression: string): string[] {
    const columns: string[] = [];
    
    // Match bare identifiers (not in quotes, not SQL keywords)
    const keywords = new Set([
      'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'BETWEEN', 'LIKE',
      'TRUE', 'FALSE', 'GETDATE', 'NEWID', 'LEN', 'CONVERT', 'CAST'
    ]);
    
    const identifierPattern = /\b([A-Za-z_][A-Za-z0-9_]*)\b/g;
    let match;
    
    while ((match = identifierPattern.exec(expression)) !== null) {
      const identifier = match[1];
      if (!keywords.has(identifier.toUpperCase()) && 
          !identifier.match(/^\d/) &&
          !columns.includes(identifier)) {
        columns.push(identifier);
      }
    }
    
    return columns;
  }
  
  /**
   * Parse a list of values from IN clause
   */
  private parseValueList(valuesStr: string): (string | number)[] {
    const values: (string | number)[] = [];
    
    // Match quoted strings and numbers
    const valuePattern = /'([^']*)'|(\d+(?:\.\d+)?)/g;
    let match;
    
    while ((match = valuePattern.exec(valuesStr)) !== null) {
      if (match[1] !== undefined) {
        values.push(match[1]);
      } else if (match[2] !== undefined) {
        const num = parseFloat(match[2]);
        values.push(Number.isInteger(num) ? parseInt(match[2]) : num);
      }
    }
    
    return values;
  }
  
  /**
   * Parse a single value
   */
  private parseValue(valueStr: string): string | number | boolean {
    const trimmed = valueStr.trim();
    
    // Boolean
    if (trimmed.toUpperCase() === 'TRUE') return true;
    if (trimmed.toUpperCase() === 'FALSE') return false;
    
    // Number
    if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
      const num = parseFloat(trimmed);
      return Number.isInteger(num) ? parseInt(trimmed) : num;
    }
    
    // String (remove quotes)
    if ((trimmed.startsWith("'") && trimmed.endsWith("'")) ||
        (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
      return trimmed.slice(1, -1);
    }
    
    return trimmed;
  }
  
  /**
   * Infer validation rules from parsed constraint
   */
  private inferValidationRules(parsed: ReturnType<typeof this.parseCheckExpression>): ValidationRule[] {
    const rules: ValidationRule[] = [];
    
    switch (parsed.conditionType) {
      case 'comparison':
        if (parsed.operator === '>=' || parsed.operator === '>') {
          rules.push({
            type: 'min_value',
            value: parsed.value as number,
            message: `Value must be ${parsed.operator === '>=' ? 'at least' : 'greater than'} ${parsed.value}`,
          });
        }
        if (parsed.operator === '<=' || parsed.operator === '<') {
          rules.push({
            type: 'max_value',
            value: parsed.value as number,
            message: `Value must be ${parsed.operator === '<=' ? 'at most' : 'less than'} ${parsed.value}`,
          });
        }
        break;
        
      case 'range':
        if (parsed.minValue !== undefined) {
          rules.push({
            type: 'min_value',
            value: parsed.minValue as number,
            message: `Minimum value: ${parsed.minValue}`,
          });
        }
        if (parsed.maxValue !== undefined) {
          rules.push({
            type: 'max_value',
            value: parsed.maxValue as number,
            message: `Maximum value: ${parsed.maxValue}`,
          });
        }
        break;
        
      case 'in_list':
        rules.push({
          type: 'pattern',
          value: parsed.values?.join('|'),
          message: `Must be one of: ${parsed.values?.join(', ')}`,
        });
        break;
        
      case 'length':
        if (parsed.operator === '>=' && parsed.value) {
          rules.push({
            type: 'min_length',
            value: parsed.value as number,
          });
        }
        if (parsed.operator === '<=' && parsed.value) {
          rules.push({
            type: 'max_length',
            value: parsed.value as number,
          });
        }
        break;
        
      case 'null_check':
        if (parsed.operator === 'IS NOT NULL') {
          rules.push({
            type: 'required',
            message: 'This field is required',
          });
        }
        break;
        
      case 'pattern':
        // Convert LIKE pattern to regex
        if (parsed.value) {
          const regex = this.likeToRegex(parsed.value as string);
          rules.push({
            type: 'pattern',
            value: regex,
            message: `Must match pattern: ${parsed.value}`,
          });
        }
        break;
    }
    
    return rules;
  }
  
  /**
   * Convert SQL LIKE pattern to regex
   */
  private likeToRegex(likePattern: string): string {
    return likePattern
      .replace(/%/g, '.*')
      .replace(/_/g, '.')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]');
  }
  
  /**
   * Infer the purpose of a constraint
   */
  private inferConstraintPurpose(
    parsed: ReturnType<typeof this.parseCheckExpression>,
    expression: string
  ): ConstraintPurpose {
    const lowerExpr = expression.toLowerCase();
    
    // Compliance patterns
    if (/age|dob|birth|minor|adult/.test(lowerExpr)) {
      return 'compliance';
    }
    if (/ssn|tax|salary|income/.test(lowerExpr)) {
      return 'compliance';
    }
    
    // Security patterns
    if (/password|token|secret|key/.test(lowerExpr)) {
      return 'security';
    }
    
    // Data integrity patterns
    if (parsed.conditionType === 'null_check') {
      return 'data_integrity';
    }
    if (parsed.conditionType === 'range' || parsed.conditionType === 'comparison') {
      if (/id|count|qty|quantity|amount|price/.test(lowerExpr)) {
        return 'data_integrity';
      }
    }
    
    // Business rule patterns
    if (/status|state|type|category|level/.test(lowerExpr)) {
      return 'business_rule';
    }
    if (parsed.conditionType === 'in_list') {
      return 'business_rule';
    }
    
    return 'validation';
  }
  
  /**
   * Generate business rule description
   */
  private generateBusinessRuleDescription(
    parsed: ReturnType<typeof this.parseCheckExpression>,
    tableName: string
  ): string | undefined {
    const column = parsed.columns[0];
    
    switch (parsed.conditionType) {
      case 'range':
        return `${column} must be between ${parsed.minValue} and ${parsed.maxValue}`;
      case 'comparison':
        return `${column} must be ${parsed.operator} ${parsed.value}`;
      case 'in_list':
        return `${column} must be one of: ${parsed.values?.join(', ')}`;
      case 'length':
        return `${column} length must be ${parsed.operator} ${parsed.value}`;
      case 'pattern':
        return `${column} must match pattern: ${parsed.value}`;
      default:
        return undefined;
    }
  }
  
  /**
   * Generate C# equivalent validation attribute
   */
  private generateCSharpEquivalent(
    parsed: ReturnType<typeof this.parseCheckExpression>
  ): CSharpEquivalentValidation | undefined {
    const column = parsed.columns[0];
    
    switch (parsed.conditionType) {
      case 'range':
        return {
          attribute: 'Range',
          namespace: 'System.ComponentModel.DataAnnotations',
          parameters: {
            minimum: parsed.minValue as number,
            maximum: parsed.maxValue as number,
          },
          confidence: 95,
          notes: `Generated from CHECK constraint: ${column} BETWEEN ${parsed.minValue} AND ${parsed.maxValue}`,
        };
        
      case 'comparison':
        if (parsed.operator === '>=' || parsed.operator === '>') {
          return {
            attribute: 'Range',
            namespace: 'System.ComponentModel.DataAnnotations',
            parameters: {
              minimum: parsed.value as number,
              maximum: 'double.MaxValue',
            },
            confidence: 80,
            notes: `Generated from CHECK constraint: ${column} ${parsed.operator} ${parsed.value}`,
          };
        }
        if (parsed.operator === '<=' || parsed.operator === '<') {
          return {
            attribute: 'Range',
            namespace: 'System.ComponentModel.DataAnnotations',
            parameters: {
              minimum: 'double.MinValue',
              maximum: parsed.value as number,
            },
            confidence: 80,
            notes: `Generated from CHECK constraint: ${column} ${parsed.operator} ${parsed.value}`,
          };
        }
        break;
        
      case 'in_list':
        return {
          attribute: 'RegularExpression',
          namespace: 'System.ComponentModel.DataAnnotations',
          parameters: {
            pattern: `^(${parsed.values?.join('|')})$`,
          },
          confidence: 70,
          notes: `Generated from CHECK constraint: ${column} IN (...) - consider using enum instead`,
        };
        
      case 'null_check':
        if (parsed.operator === 'IS NOT NULL') {
          return {
            attribute: 'Required',
            namespace: 'System.ComponentModel.DataAnnotations',
            parameters: {},
            confidence: 95,
          };
        }
        break;
    }
    
    return undefined;
  }
  
  /**
   * Parse a UNIQUE constraint/index
   */
  parseUniqueConstraint(index: IndexDef, tableName: string): ParsedUniqueConstraint {
    return {
      name: index.name,
      columns: index.columns,
      isPrimaryKey: false,
      isClustered: index.isClustered || false,
      csharpEquivalent: {
        attribute: index.columns.length === 1 ? 'Unique' : 'Index',
        namespace: 'System.ComponentModel.DataAnnotations.Schema',
        parameters: {
          IsUnique: true,
        },
        confidence: 90,
      },
    };
  }
  
  /**
   * Parse a DEFAULT constraint
   */
  parseDefaultValue(columnName: string, defaultValue: string): ParsedDefaultConstraint {
    const value = defaultValue.trim();
    const lower = value.toLowerCase();
    
    let valueType: DefaultValueTypes;
    let inferredPurpose: DefaultPurpose;
    
    // Determine value type
    if (/^getdate\(\)|getutcdate\(\)|sysdatetime\(\)/i.test(value)) {
      valueType = 'function_getdate';
    } else if (/^newid\(\)|newsequentialid\(\)/i.test(value)) {
      valueType = 'function_newid';
    } else if (/^suser_|user_name|current_user/i.test(value)) {
      valueType = 'function_suser';
    } else if (/^'.*'$/.test(value)) {
      valueType = 'literal_string';
    } else if (/^\d+$/.test(value)) {
      valueType = 'literal_number';
    } else if (/^true|false$/i.test(value)) {
      valueType = 'literal_boolean';
    } else {
      valueType = 'expression';
    }
    
    // Infer purpose
    const lowerColumn = columnName.toLowerCase();
    
    if (lowerColumn.includes('created') || lowerColumn.includes('createdat')) {
      inferredPurpose = 'audit_created';
    } else if (lowerColumn.includes('updated') || lowerColumn.includes('modified')) {
      inferredPurpose = 'audit_updated';
    } else if (lowerColumn.includes('createdby') || lowerColumn.includes('modifiedby')) {
      inferredPurpose = 'audit_updated';
    } else if (lowerColumn.includes('isdeleted') || lowerColumn.includes('isactive')) {
      inferredPurpose = 'soft_delete';
    } else if (lowerColumn.includes('tenant')) {
      inferredPurpose = 'tenant_isolation';
    } else if (lowerColumn.includes('status') || lowerColumn.includes('state')) {
      inferredPurpose = 'status_initial';
    } else if (lowerColumn.includes('sort') || lowerColumn.includes('order') || lowerColumn.includes('displayorder')) {
      inferredPurpose = 'sort_order';
    } else {
      inferredPurpose = 'business_logic';
    }
    
    return {
      columnName,
      value,
      valueType,
      inferredPurpose,
      csharpEquivalent: {
        attribute: 'DefaultValue',
        namespace: 'System.ComponentModel',
        parameters: {
          value: valueType === 'function_getdate' ? 'DateTime.Now' :
                 valueType === 'function_newid' ? 'Guid.NewGuid()' :
                 valueType === 'literal_boolean' ? value :
                 valueType === 'literal_number' ? value :
                 valueType === 'literal_string' ? value.slice(1, -1) : value,
        },
        confidence: 85,
      },
    };
  }
  
  /**
   * Check if a column is referenced in a CHECK constraint
   */
  private isColumnInCheckConstraint(constraint: CheckConstraintDef, columnName: string): boolean {
    const expr = constraint.expression.toLowerCase();
    const col = columnName.toLowerCase();
    
    // Check for column reference
    const patterns = [
      new RegExp(`\\b${col}\\b`, 'i'),
      new RegExp(`\\[${col}\\]`, 'i'),
    ];
    
    return patterns.some(p => p.test(expr));
  }
  
  /**
   * Extract validation rules from column constraints
   */
  private extractValidationRules(
    column: ColumnDef,
    checkConstraints: ParsedCheckConstraint[],
    uniqueConstraints: ParsedUniqueConstraint[],
    defaultValue?: ParsedDefaultConstraint
  ): ValidationRule[] {
    const rules: ValidationRule[] = [];
    
    // NOT NULL -> Required
    if (!column.isNullable) {
      rules.push({
        type: 'required',
        message: 'This field is required',
      });
    }
    
    // Max length from data type
    if (column.maxLength) {
      const maxLength = parseInt(column.maxLength);
      if (!isNaN(maxLength)) {
        rules.push({
          type: 'max_length',
          value: maxLength,
          message: `Maximum ${maxLength} characters`,
        });
      }
    }
    
    // CHECK constraints -> validation rules
    for (const check of checkConstraints) {
      rules.push(...check.validationRules);
    }
    
    // UNIQUE constraints -> unique validation
    for (const unique of uniqueConstraints) {
      if (unique.columns.length === 1) {
        rules.push({
          type: 'unique',
          message: 'This value must be unique',
        });
      }
    }
    
    return this.deduplicateRules(rules);
  }
  
  /**
   * Deduplicate validation rules
   */
  private deduplicateRules(rules: ValidationRule[]): ValidationRule[] {
    const seen = new Set<string>();
    return rules.filter(rule => {
      const key = `${rule.type}:${rule.value}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  
  /**
   * Extract compliance flags
   */
  private extractComplianceFlags(
    column: ColumnDef,
    checkConstraints: ParsedCheckConstraint[]
  ): string[] {
    const flags: string[] = [];
    const lowerName = column.name.toLowerCase();
    
    // PII detection
    if (/email|mail/.test(lowerName)) flags.push('PII_EMAIL');
    if (/phone|tel|mobile/.test(lowerName)) flags.push('PII_PHONE');
    if (/ssn|social|national.?id|cnic/.test(lowerName)) flags.push('PII_NATIONAL_ID');
    if (/address|street|city|postal|zip/.test(lowerName)) flags.push('PII_ADDRESS');
    if (/birth|dob|birthday/.test(lowerName)) flags.push('PII_DOB');
    if (/name$/i.test(column.name) && !/user|file|table/.test(lowerName)) flags.push('PII_NAME');
    
    // PHI detection
    if (/diagnosis|icd|condition|ailment/.test(lowerName)) flags.push('PHI_DIAGNOSIS');
    if (/medication|drug|prescription/.test(lowerName)) flags.push('PHI_MEDICATION');
    if (/mrn|medical.?record|patient.?id/.test(lowerName)) flags.push('PHI_MRNs');
    if (/lab|test|result|specimen/.test(lowerName)) flags.push('PHI_LAB');
    
    // From CHECK constraints
    for (const check of checkConstraints) {
      if (check.inferredPurpose === 'compliance') {
        flags.push('COMPLIANCE_RULE');
      }
    }
    
    return flags;
  }
  
  /**
   * Detect soft delete pattern
   */
  private detectSoftDeletePattern(table: TableDef): boolean {
    return table.columns.some(col => 
      /isdeleted|is_active|deletedat|deleted/.test(col.name.toLowerCase())
    );
  }
  
  /**
   * Detect audit pattern
   */
  private detectAuditPattern(table: TableDef): boolean {
    const hasCreated = table.columns.some(col => 
      /created|createdat|createdby/.test(col.name.toLowerCase())
    );
    const hasUpdated = table.columns.some(col => 
      /updated|modified|updatedat|updatedby/.test(col.name.toLowerCase())
    );
    return hasCreated || hasUpdated;
  }
  
  /**
   * Detect tenant isolation
   */
  private detectTenantIsolation(table: TableDef): boolean {
    return table.columns.some(col => 
      /tenant|organization|org.?id/.test(col.name.toLowerCase())
    );
  }
  
  /**
   * Detect PII columns
   */
  private detectPIIColumns(table: TableDef): string[] {
    const piiPatterns = [
      /email/i, /phone/i, /ssn/i, /social.?security/i,
      /address/i, /street/i, /city/i, /postal/i, /zip/i,
      /birth/i, /dob/i, /name$/i, /firstname/i, /lastname/i,
    ];
    
    return table.columns
      .filter(col => piiPatterns.some(p => p.test(col.name)))
      .map(col => col.name);
  }
  
  /**
   * Detect PHI columns
   */
  private detectPHIColumns(table: TableDef): string[] {
    const phiPatterns = [
      /diagnosis/i, /icd/i, /medication/i, /prescription/i,
      /mrn/i, /medical.?record/i, /patient/i, /lab.?result/i,
      /treatment/i, /condition/i, /allergy/i, /symptom/i,
    ];
    
    return table.columns
      .filter(col => phiPatterns.some(p => p.test(col.name)))
      .map(col => col.name);
  }
}

// =============================================================================
// Cross-Reference Engine
// =============================================================================

/**
 * Cross-Reference Intelligence from C# and SQL
 */
export interface CrossReferenceIntelligence {
  tableName: string;
  columnName: string;
  
  // Sources
  csharp: {
    isRequired: boolean;
    maxLength?: number;
    minLength?: number;
    range?: { min: number | string; max: number | string };
    pattern?: string;
    email: boolean;
    phone: boolean;
    url: boolean;
    isUnique: boolean;
    isPII: boolean;
    regulations: string[];
  } | null;
  
  sql: {
    isRequired: boolean;
    maxLength?: number;
    checkConstraints: ParsedCheckConstraint[];
    uniqueConstraints: ParsedUniqueConstraint[];
    defaultValue?: ParsedDefaultConstraint;
    isPrimaryKey: boolean;
    isForeignKey: boolean;
  };
  
  // Unified Intelligence
  unified: {
    isRequired: boolean;
    requiredSource: 'csharp' | 'sql' | 'both' | 'none';
    maxLength?: number;
    maxLengthSource: 'csharp' | 'sql' | 'both' | 'none';
    validations: ValidationRule[];
    isUnique: boolean;
    isPII: boolean;
    complianceFlags: string[];
    businessRules: string[];
  };
  
  // Gap Detection
  gaps: ValidationGap[];
  
  // Confidence
  confidence: number;
}

/**
 * Validation gap between C# and SQL
 */
export interface ValidationGap {
  id: string;
  type: 'missing_in_csharp' | 'missing_in_sql' | 'conflict' | 'inconsistency';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  csharpValue?: string | number | boolean;
  sqlValue?: string | number | boolean;
  recommendation: string;
  autoFixable: boolean;
}

/**
 * Cross-Reference Engine for C# and SQL Intelligence
 */
export class CrossReferenceEngine {
  private sqlParser: SQLConstraintParser;
  
  constructor() {
    this.sqlParser = new SQLConstraintParser();
  }
  
  /**
   * Cross-reference C# model properties with SQL column constraints
   */
  crossReference(
    csharpProperties: Map<string, {
      isRequired: boolean;
      maxLength?: number;
      minLength?: number;
      range?: { min: number | string; max: number | string };
      pattern?: string;
      email: boolean;
      phone: boolean;
      url: boolean;
      isUnique: boolean;
      isPII: boolean;
      regulations: string[];
    }>,
    sqlTable: TableDef
  ): CrossReferenceIntelligence[] {
    const results: CrossReferenceIntelligence[] = [];
    const tableIntelligence = this.sqlParser.parseTableConstraints(sqlTable);
    
    for (const sqlCol of tableIntelligence.columns) {
      const propName = this.matchPropertyName(sqlCol.columnName, Array.from(csharpProperties.keys()));
      const csharpProp = propName ? csharpProperties.get(propName) : null;
      
      const crossRef: CrossReferenceIntelligence = {
        tableName: sqlCol.tableName,
        columnName: sqlCol.columnName,
        csharp: csharpProp ? {
          isRequired: csharpProp.isRequired,
          maxLength: csharpProp.maxLength,
          minLength: csharpProp.minLength,
          range: csharpProp.range,
          pattern: csharpProp.pattern,
          email: csharpProp.email,
          phone: csharpProp.phone,
          url: csharpProp.url,
          isUnique: csharpProp.isUnique,
          isPII: csharpProp.isPII,
          regulations: csharpProp.regulations,
        } : null,
        sql: {
          isRequired: !sqlCol.isNullable,
          maxLength: this.extractMaxLength(sqlCol),
          checkConstraints: sqlCol.checkConstraints,
          uniqueConstraints: sqlCol.uniqueConstraints,
          defaultValue: sqlCol.defaultValue,
          isPrimaryKey: sqlCol.isPrimaryKey,
          isForeignKey: sqlCol.isForeignKey,
        },
        unified: this.unifyIntelligence(sqlCol, csharpProp),
        gaps: this.detectGaps(sqlCol, csharpProp),
        confidence: this.calculateConfidence(sqlCol, csharpProp),
      };
      
      results.push(crossRef);
    }
    
    // Check for C# properties not in SQL
    for (const [propName, prop] of csharpProperties) {
      const exists = results.some(r => 
        this.matchPropertyName(r.columnName, [propName])
      );
      
      if (!exists) {
        results.push({
          tableName: sqlTable.tableName,
          columnName: propName,
          csharp: {
            isRequired: prop.isRequired,
            maxLength: prop.maxLength,
            minLength: prop.minLength,
            range: prop.range,
            pattern: prop.pattern,
            email: prop.email,
            phone: prop.phone,
            url: prop.url,
            isUnique: prop.isUnique,
            isPII: prop.isPII,
            regulations: prop.regulations,
          },
          sql: {
            isRequired: false,
            checkConstraints: [],
            uniqueConstraints: [],
            isPrimaryKey: false,
            isForeignKey: false,
          },
          unified: {
            isRequired: prop.isRequired,
            requiredSource: 'csharp',
            maxLength: prop.maxLength,
            maxLengthSource: 'csharp',
            validations: [],
            isUnique: prop.isUnique,
            isPII: prop.isPII,
            complianceFlags: prop.regulations,
            businessRules: [],
          },
          gaps: [{
            id: `GAP-${propName}-MISSING_SQL`,
            type: 'missing_in_sql',
            severity: 'high',
            description: `Property '${propName}' exists in C# but not in SQL table '${sqlTable.tableName}'`,
            csharpValue: 'exists',
            recommendation: `Add column '${propName}' to table '${sqlTable.tableName}' or remove from C# model`,
            autoFixable: true,
          }],
          confidence: 50,
        });
      }
    }
    
    return results;
  }
  
  /**
   * Match C# property name to SQL column name
   */
  private matchPropertyName(columnName: string, propertyNames: string[]): string | null {
    const lowerCol = columnName.toLowerCase();
    
    // Exact match
    if (propertyNames.includes(columnName)) return columnName;
    if (propertyNames.some(p => p.toLowerCase() === lowerCol)) {
      return propertyNames.find(p => p.toLowerCase() === lowerCol) || null;
    }
    
    // PascalCase to snake_case or vice versa
    const snakeCase = columnName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
    if (propertyNames.some(p => p.toLowerCase() === snakeCase)) {
      return propertyNames.find(p => p.toLowerCase() === snakeCase) || null;
    }
    
    // Without Id suffix
    if (lowerCol.endsWith('id')) {
      const baseName = lowerCol.slice(0, -2);
      if (propertyNames.some(p => p.toLowerCase() === baseName || p.toLowerCase() === baseName + 'id')) {
        return propertyNames.find(p => 
          p.toLowerCase() === baseName || p.toLowerCase() === baseName + 'id'
        ) || null;
      }
    }
    
    return null;
  }
  
  /**
   * Unify intelligence from SQL and C# sources
   */
  private unifyIntelligence(
    sqlCol: ColumnConstraintIntelligence,
    csharpProp: CrossReferenceIntelligence['csharp']
  ): CrossReferenceIntelligence['unified'] {
    const isRequired = csharpProp?.isRequired || !sqlCol.isNullable;
    const requiredSource = 
      (csharpProp?.isRequired && !sqlCol.isNullable) ? 'both' :
      csharpProp?.isRequired ? 'csharp' :
      !sqlCol.isNullable ? 'sql' : 'none';
    
    const csharpMax = csharpProp?.maxLength;
    const sqlMax = this.extractMaxLength(sqlCol);
    const maxLength = Math.min(csharpMax || Infinity, sqlMax || Infinity);
    const maxLengthSource = 
      (csharpMax && sqlMax) ? 'both' :
      csharpMax ? 'csharp' :
      sqlMax ? 'sql' : 'none';
    
    const validations = [...sqlCol.validationRules];
    if (csharpProp?.email && !validations.some(v => v.type === 'email')) {
      validations.push({ type: 'email', message: 'Must be a valid email' });
    }
    if (csharpProp?.phone && !validations.some(v => v.type === 'phone')) {
      validations.push({ type: 'phone', message: 'Must be a valid phone number' });
    }
    if (csharpProp?.pattern) {
      validations.push({ type: 'pattern', value: csharpProp.pattern });
    }
    if (csharpProp?.range) {
      validations.push({ type: 'min_value', value: csharpProp.range.min as number });
      validations.push({ type: 'max_value', value: csharpProp.range.max as number });
    }
    
    const isUnique = csharpProp?.isUnique || sqlCol.uniqueConstraints.length > 0;
    const isPII = csharpProp?.isPII || sqlCol.complianceFlags.length > 0;
    
    return {
      isRequired,
      requiredSource,
      maxLength: maxLength === Infinity ? undefined : maxLength,
      maxLengthSource,
      validations: this.deduplicateValidations(validations),
      isUnique,
      isPII,
      complianceFlags: [...new Set([
        ...(csharpProp?.regulations || []),
        ...sqlCol.complianceFlags,
      ])],
      businessRules: sqlCol.businessRules,
    };
  }
  
  /**
   * Extract max length from SQL column intelligence
   */
  private extractMaxLength(sqlCol: ColumnConstraintIntelligence): number | undefined {
    // From length CHECK constraints
    for (const check of sqlCol.checkConstraints) {
      if (check.conditionType === 'length' && check.operator === '<=') {
        return check.value as number;
      }
    }
    return undefined;
  }
  
  /**
   * Detect gaps between C# and SQL intelligence
   */
  private detectGaps(
    sqlCol: ColumnConstraintIntelligence,
    csharpProp: CrossReferenceIntelligence['csharp']
  ): ValidationGap[] {
    const gaps: ValidationGap[] = [];
    
    // No C# property found
    if (!csharpProp) {
      gaps.push({
        id: `GAP-${sqlCol.columnName}-NO_CSHARP`,
        type: 'missing_in_csharp',
        severity: 'medium',
        description: `Column '${sqlCol.columnName}' exists in SQL but no matching C# property found`,
        sqlValue: 'exists',
        recommendation: `Add property '${sqlCol.columnName}' to C# model or mark as not mapped`,
        autoFixable: true,
      });
      return gaps;
    }
    
    // Required mismatch
    if (csharpProp.isRequired && sqlCol.isNullable) {
      gaps.push({
        id: `GAP-${sqlCol.columnName}-REQUIRED`,
        type: 'inconsistency',
        severity: 'high',
        description: `C# marks '${sqlCol.columnName}' as Required but SQL allows NULL`,
        csharpValue: 'Required',
        sqlValue: 'NULL allowed',
        recommendation: `Add NOT NULL constraint to SQL column or remove [Required] from C#`,
        autoFixable: true,
      });
    }
    
    if (!csharpProp.isRequired && !sqlCol.isNullable) {
      gaps.push({
        id: `GAP-${sqlCol.columnName}-NULLABLE`,
        type: 'inconsistency',
        severity: 'medium',
        description: `SQL marks '${sqlCol.columnName}' as NOT NULL but C# doesn't have [Required]`,
        csharpValue: 'Not Required',
        sqlValue: 'NOT NULL',
        recommendation: `Add [Required] attribute to C# property`,
        autoFixable: true,
      });
    }
    
    // Max length mismatch
    if (csharpProp.maxLength && sqlCol.checkConstraints.some(c => 
      c.conditionType === 'length' && c.value !== csharpProp.maxLength
    )) {
      const sqlMax = sqlCol.checkConstraints.find(c => c.conditionType === 'length')?.value;
      gaps.push({
        id: `GAP-${sqlCol.columnName}-MAXLENGTH`,
        type: 'conflict',
        severity: 'medium',
        description: `Max length mismatch: C#=${csharpProp.maxLength}, SQL=${sqlMax}`,
        csharpValue: csharpProp.maxLength,
        sqlValue: sqlMax,
        recommendation: `Align max length in both C# and SQL to same value`,
        autoFixable: false,
      });
    }
    
    // Unique mismatch
    if (csharpProp.isUnique && sqlCol.uniqueConstraints.length === 0) {
      gaps.push({
        id: `GAP-${sqlCol.columnName}-UNIQUE`,
        type: 'missing_in_sql',
        severity: 'high',
        description: `C# marks '${sqlCol.columnName}' as unique but SQL has no UNIQUE constraint`,
        csharpValue: 'Unique',
        sqlValue: 'Not unique',
        recommendation: `Add UNIQUE constraint or index to SQL column`,
        autoFixable: true,
      });
    }
    
    // CHECK constraints not reflected in C#
    for (const check of sqlCol.checkConstraints) {
      const hasEquivalent = csharpProp.range || csharpProp.pattern;
      if (!hasEquivalent && check.inferredPurpose !== 'data_integrity') {
        gaps.push({
          id: `GAP-${sqlCol.columnName}-CHECK-${check.name || 'unnamed'}`,
          type: 'missing_in_csharp',
          severity: 'medium',
          description: `SQL CHECK constraint not reflected in C#: ${check.expression}`,
          sqlValue: check.expression,
          recommendation: `Add validation attribute to C# property: ${check.csharpEquivalent?.attribute || 'custom validation'}`,
          autoFixable: true,
        });
      }
    }
    
    return gaps;
  }
  
  /**
   * Calculate confidence score for cross-reference
   */
  private calculateConfidence(
    sqlCol: ColumnConstraintIntelligence,
    csharpProp: CrossReferenceIntelligence['csharp']
  ): number {
    let confidence = 50;
    
    // Both sources present
    if (csharpProp) confidence += 20;
    
    // No gaps
    if (this.detectGaps(sqlCol, csharpProp).length === 0) confidence += 20;
    
    // Required matches
    if (csharpProp?.isRequired === !sqlCol.isNullable) confidence += 10;
    
    return Math.min(confidence, 100);
  }
  
  /**
   * Deduplicate validation rules
   */
  private deduplicateValidations(rules: ValidationRule[]): ValidationRule[] {
    const seen = new Set<string>();
    return rules.filter(rule => {
      const key = `${rule.type}:${rule.value}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

// =============================================================================
// Convenience Exports
// =============================================================================

export const sqlConstraintParser = new SQLConstraintParser();
export const crossReferenceEngine = new CrossReferenceEngine();

export function parseTableConstraints(table: TableDef): TableConstraintIntelligence {
  return sqlConstraintParser.parseTableConstraints(table);
}

export function crossReferenceCSharpWithSQL(
  csharpProperties: Map<string, CrossReferenceIntelligence['csharp']>,
  sqlTable: TableDef
): CrossReferenceIntelligence[] {
  return crossReferenceEngine.crossReference(csharpProperties, sqlTable);
}
