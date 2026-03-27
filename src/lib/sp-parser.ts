// =============================================================================
// Stored Procedure Intelligence Engine - Advanced SP Analysis
// =============================================================================
// Tables tell you STRUCTURE, SPs tell you BEHAVIOR
// =============================================================================

import { StoredProcedureDef, ProcedureParameter, SQLOperation, TableDef } from './types';

/**
 * SP Action Types derived from naming convention
 */
export type SPActionType =
  | 'dropdown'      // SP_DDL_*
  | 'read'          // SP_Get*
  | 'create'        // SP_Add*
  | 'update'        // SP_Update*
  | 'delete'        // SP_Delete*
  | 'search'        // SP_Search*
  | 'report'        // SP_Report*
  | 'validate'      // SP_Validate*
  | 'process'       // SP_Process*
  | 'import'        // SP_Import*
  | 'export'        // SP_Export*
  | 'calculate'     // SP_Calculate*
  | 'workflow'      // SP_Workflow*
  | 'unknown';

/**
 * SP Module identification result
 */
export interface SPModuleIdentification {
  moduleName: string;
  confidence: number;
  matchedKeywords: string[];
  suggestedLayer: number;
}

/**
 * Table dependency information
 */
export interface TableDependency {
  tableName: string;
  accessType: 'read' | 'write' | 'both';
  columns: string[];
  joinType?: string;
  isViaJoin: boolean;
}

/**
 * JOIN relationship discovered from SP
 */
export interface SPJoinRelationship {
  fromTable: string;
  toTable: string;
  fromColumn?: string;
  toColumn?: string;
  joinType: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS';
  confidence: number;
  discoveredInSP: string;
}

/**
 * WHERE clause business rule
 */
export interface BusinessFilterRule {
  tableName: string;
  column: string;
  operator: string;
  valuePattern: string;
  isParameterized: boolean;
  parameterName?: string;
  description: string;
}

/**
 * Discovered table not in original DDL
 */
export interface DiscoveredTable {
  tableName: string;
  discoveredInSP: string;
  accessType: 'read' | 'write';
  columns: string[];
  suggestedModule: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Commented code analysis
 */
export interface CommentedCodeAnalysis {
  lineCount: number;
  historicalContext: string[];
  deprecatedLogic: string[];
  businessRulesRemoved: string[];
}

/**
 * Complete SP Intelligence Result
 */
export interface SPIntelligenceResult {
  procedureName: string;
  schemaName: string;
  
  // Classification
  actionType: SPActionType;
  moduleIdentification: SPModuleIdentification;
  
  // Dependencies
  tablesReferenced: TableDependency[];
  implicitJoins: SPJoinRelationship[];
  discoveredTables: DiscoveredTable[];
  
  // Business Logic
  businessRules: BusinessFilterRule[];
  writeOperations: SQLOperation[];
  readOperations: SQLOperation[];
  
  // Parameters mapped to API schema
  apiInputSchema: APIInputSchema;
  
  // Historical context
  commentedCode: CommentedCodeAnalysis;
  
  // Metrics
  complexity: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  suggestedEndpoint: string;
  
  // Raw
  parameters: ProcedureParameter[];
  body: string;
}

/**
 * API Input Schema derived from SP parameters
 */
export interface APIInputSchema {
  properties: Record<string, APIProperty>;
  required: string[];
  example: Record<string, unknown>;
}

export interface APIProperty {
  type: string;
  format?: string;
  description?: string;
  default?: unknown;
  isOutput: boolean;
  source: 'parameter' | 'derived';
}

/**
 * SP Naming Pattern Recognition Rules
 */
const SP_NAMING_PATTERNS: Array<{ pattern: RegExp; actionType: SPActionType }> = [
  { pattern: /^SP_DDL_/i, actionType: 'dropdown' },
  { pattern: /^SP_Get/i, actionType: 'read' },
  { pattern: /^SP_Add/i, actionType: 'create' },
  { pattern: /^SP_Create/i, actionType: 'create' },
  { pattern: /^SP_Insert/i, actionType: 'create' },
  { pattern: /^SP_Update/i, actionType: 'update' },
  { pattern: /^SP_Edit/i, actionType: 'update' },
  { pattern: /^SP_Delete/i, actionType: 'delete' },
  { pattern: /^SP_Remove/i, actionType: 'delete' },
  { pattern: /^SP_Search/i, actionType: 'search' },
  { pattern: /^SP_Find/i, actionType: 'search' },
  { pattern: /^SP_Report/i, actionType: 'report' },
  { pattern: /^SP_Rpt/i, actionType: 'report' },
  { pattern: /^SP_Validate/i, actionType: 'validate' },
  { pattern: /^SP_Check/i, actionType: 'validate' },
  { pattern: /^SP_Process/i, actionType: 'process' },
  { pattern: /^SP_Import/i, actionType: 'import' },
  { pattern: /^SP_Export/i, actionType: 'export' },
  { pattern: /^SP_Calculate/i, actionType: 'calculate' },
  { pattern: /^SP_Compute/i, actionType: 'calculate' },
  { pattern: /^SP_Workflow/i, actionType: 'workflow' },
];

/**
 * Module keyword mappings
 */
const MODULE_KEYWORDS: Record<string, string[]> = {
  'Patient': ['patient', 'mrn', 'demographic', 'registration'],
  'Appointment': ['appointment', 'schedule', 'booking', 'slot'],
  'Billing': ['billing', 'invoice', 'payment', 'charge', 'receipt'],
  'Pharmacy': ['pharmacy', 'medication', 'drug', 'prescription', 'dispense'],
  'Laboratory': ['lab', 'test', 'specimen', 'result', 'sample'],
  'Radiology': ['radiology', 'imaging', 'xray', 'ct', 'mri', 'ultrasound'],
  'Nursing': ['nursing', 'care', 'vital', 'nursing_note'],
  'OperatingRoom': ['surgery', 'operation', 'or_', 'theatre', 'procedure'],
  'Emergency': ['emergency', 'er_', 'trauma', 'urgent'],
  'Inventory': ['inventory', 'stock', 'item', 'supply', 'reorder'],
  'HR': ['employee', 'staff', 'payroll', 'attendance', 'leave'],
  'Finance': ['finance', 'account', 'journal', 'ledger', 'budget'],
  'Insurance': ['insurance', 'claim', 'coverage', 'policy'],
  'Reports': ['report', 'rpt', 'dashboard', 'statistics'],
  'Admin': ['user', 'role', 'permission', 'config', 'setting'],
  'ADT': ['admission', 'discharge', 'transfer', 'bed', 'adt'],
};

/**
 * Stored Procedure Intelligence Engine
 */
export class SPParserEngine {
  private existingTables: Set<string>;
  private existingModules: Map<string, string[]>;

  constructor(tables: TableDef[] = [], modules: Record<string, string[]> = {}) {
    this.existingTables = new Set(tables.map(t => t.tableName.toLowerCase()));
    this.existingModules = new Map(Object.entries(modules));
  }

  /**
   * Analyze a single stored procedure
   */
  analyzeProcedure(sp: StoredProcedureDef): SPIntelligenceResult {
    const actionType = this.identifyActionType(sp.procedureName);
    const moduleIdentification = this.identifyModule(sp);
    const tablesReferenced = this.extractTableDependencies(sp.body);
    const implicitJoins = this.extractJoinRelationships(sp.body, sp.procedureName);
    const discoveredTables = this.findDiscoveredTables(tablesReferenced);
    const businessRules = this.extractBusinessRules(sp.body);
    const writeOperations = this.extractWriteOperations(sp.body);
    const readOperations = this.extractReadOperations(sp.body);
    const apiInputSchema = this.generateAPISchema(sp.parameters);
    const commentedCode = this.analyzeCommentedCode(sp.body);
    const complexity = this.calculateComplexity(sp.body);
    const riskLevel = this.assessRiskLevel(sp, complexity);
    const suggestedEndpoint = this.suggestEndpoint(sp.procedureName, actionType);

    return {
      procedureName: sp.procedureName,
      schemaName: sp.schemaName,
      actionType,
      moduleIdentification,
      tablesReferenced,
      implicitJoins,
      discoveredTables,
      businessRules,
      writeOperations,
      readOperations,
      apiInputSchema,
      commentedCode,
      complexity,
      riskLevel,
      suggestedEndpoint,
      parameters: sp.parameters,
      body: sp.body,
    };
  }

  /**
   * Analyze multiple stored procedures
   */
  analyzeProcedures(procedures: StoredProcedureDef[]): SPIntelligenceResult[] {
    return procedures.map(sp => this.analyzeProcedure(sp));
  }

  /**
   * Identify action type from SP naming convention
   */
  private identifyActionType(procedureName: string): SPActionType {
    for (const { pattern, actionType } of SP_NAMING_PATTERNS) {
      if (pattern.test(procedureName)) {
        return actionType;
      }
    }
    return 'unknown';
  }

  /**
   * Identify module from SP name and content
   */
  private identifyModule(sp: StoredProcedureDef): SPModuleIdentification {
    const searchText = `${sp.procedureName} ${sp.body}`.toLowerCase();
    const matchedKeywords: string[] = [];
    let bestMatch = { moduleName: 'Core', confidence: 30, suggestedLayer: 1 };

    for (const [moduleName, keywords] of Object.entries(MODULE_KEYWORDS)) {
      const matches = keywords.filter(kw => searchText.includes(kw.toLowerCase()));
      if (matches.length > 0) {
        const confidence = Math.min(50 + matches.length * 15, 95);
        if (confidence > bestMatch.confidence) {
          matchedKeywords.push(...matches);
          bestMatch = {
            moduleName,
            confidence,
            suggestedLayer: this.getLayerForModule(moduleName),
          };
        }
      }
    }

    return {
      moduleName: bestMatch.moduleName,
      confidence: bestMatch.confidence,
      matchedKeywords: [...new Set(matchedKeywords)],
      suggestedLayer: bestMatch.suggestedLayer,
    };
  }

  /**
   * Get suggested layer for module
   */
  private getLayerForModule(moduleName: string): number {
    const layerMap: Record<string, number> = {
      'Patient': 1, 'ADT': 1, 'Admin': 1,
      'Appointment': 2, 'Billing': 2, 'Insurance': 2,
      'Laboratory': 3, 'Radiology': 3, 'Pharmacy': 3,
      'Nursing': 4, 'OperatingRoom': 4, 'Emergency': 4,
      'Inventory': 5, 'HR': 5, 'Finance': 5,
      'Reports': 6,
    };
    return layerMap[moduleName] || 3;
  }

  /**
   * Extract table dependencies from SP body
   */
  private extractTableDependencies(body: string): TableDependency[] {
    const dependencies: Map<string, TableDependency> = new Map();

    // Extract tables from SELECT statements
    const selectRegex = /FROM\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?(?:\s+(?:AS\s+)?(\w+))?/gi;
    let match;
    while ((match = selectRegex.exec(body)) !== null) {
      const tableName = match[2];
      const alias = match[3];
      const existing = dependencies.get(tableName.toLowerCase());
      if (existing) {
        existing.accessType = 'both';
      } else {
        dependencies.set(tableName.toLowerCase(), {
          tableName,
          accessType: 'read',
          columns: this.extractColumnsForTable(body, tableName, alias),
          isViaJoin: false,
        });
      }
    }

    // Extract tables from JOIN clauses
    const joinRegex = /(INNER|LEFT|RIGHT|FULL|CROSS)\s+JOIN\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?(?:\s+(?:AS\s+)?(\w+))?\s+ON\s+([^\n]+)/gi;
    while ((match = joinRegex.exec(body)) !== null) {
      const joinType = match[1] as TableDependency['joinType'];
      const tableName = match[3];
      const existing = dependencies.get(tableName.toLowerCase());
      if (existing) {
        existing.joinType = joinType;
        existing.isViaJoin = true;
      } else {
        dependencies.set(tableName.toLowerCase(), {
          tableName,
          accessType: 'read',
          columns: this.extractColumnsForTable(body, tableName, match[4]),
          joinType,
          isViaJoin: true,
        });
      }
    }

    // Extract tables from INSERT statements
    const insertRegex = /INSERT\s+INTO\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/gi;
    while ((match = insertRegex.exec(body)) !== null) {
      const tableName = match[2];
      const existing = dependencies.get(tableName.toLowerCase());
      if (existing) {
        existing.accessType = existing.accessType === 'read' ? 'both' : 'write';
      } else {
        dependencies.set(tableName.toLowerCase(), {
          tableName,
          accessType: 'write',
          columns: this.extractInsertedColumns(body, tableName),
          isViaJoin: false,
        });
      }
    }

    // Extract tables from UPDATE statements
    const updateRegex = /UPDATE\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/gi;
    while ((match = updateRegex.exec(body)) !== null) {
      const tableName = match[2];
      const existing = dependencies.get(tableName.toLowerCase());
      if (existing) {
        existing.accessType = existing.accessType === 'read' ? 'both' : 'write';
      } else {
        dependencies.set(tableName.toLowerCase(), {
          tableName,
          accessType: 'write',
          columns: [],
          isViaJoin: false,
        });
      }
    }

    // Extract tables from DELETE statements
    const deleteRegex = /DELETE\s+FROM\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/gi;
    while ((match = deleteRegex.exec(body)) !== null) {
      const tableName = match[2];
      const existing = dependencies.get(tableName.toLowerCase());
      if (existing) {
        existing.accessType = existing.accessType === 'read' ? 'both' : 'write';
      } else {
        dependencies.set(tableName.toLowerCase(), {
          tableName,
          accessType: 'write',
          columns: [],
          isViaJoin: false,
        });
      }
    }

    return Array.from(dependencies.values());
  }

  /**
   * Extract columns used for a table
   */
  private extractColumnsForTable(body: string, tableName: string, alias?: string): string[] {
    const columns: Set<string> = new Set();
    
    // Look for table.column or alias.column patterns
    const patterns = [
      new RegExp(`\\b${tableName}\\.[\\[]?(\\w+)\\]?`, 'gi'),
    ];
    
    if (alias) {
      patterns.push(new RegExp(`\\b${alias}\\.[\\[]?(\\w+)\\]?`, 'gi'));
    }

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(body)) !== null) {
        columns.add(match[1]);
      }
    }

    return Array.from(columns);
  }

  /**
   * Extract columns from INSERT statement
   */
  private extractInsertedColumns(body: string, tableName: string): string[] {
    const insertMatch = body.match(
      new RegExp(`INSERT\\s+INTO\\s+\\[?${tableName}\\]?\\s*\\(([^)]+)\\)`, 'i')
    );
    
    if (insertMatch) {
      return insertMatch[1]
        .split(',')
        .map(c => c.replace(/[\[\]\s]/g, ''))
        .filter(Boolean);
    }
    
    return [];
  }

  /**
   * Extract JOIN relationships that reveal implicit FK relationships
   */
  private extractJoinRelationships(body: string, spName: string): SPJoinRelationship[] {
    const joins: SPJoinRelationship[] = [];
    
    const joinRegex = /(INNER|LEFT|RIGHT|FULL|CROSS)\s+JOIN\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s+(?:AS\s+)?(\w+)?\s*ON\s+([^\n]+)/gi;
    
    // Find FROM table first
    const fromMatch = body.match(/FROM\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/i);
    const fromTable = fromMatch ? fromMatch[2] : '';
    
    let match;
    while ((match = joinRegex.exec(body)) !== null) {
      const joinType = match[1] as SPJoinRelationship['joinType'];
      const toTable = match[3];
      const onClause = match[5];
      
      // Parse ON clause to find columns
      const onMatch = onClause.match(/(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/i);
      
      joins.push({
        fromTable,
        toTable,
        fromColumn: onMatch ? (onMatch[1] === fromTable ? onMatch[2] : onMatch[4]) : undefined,
        toColumn: onMatch ? (onMatch[3] === toTable ? onMatch[4] : onMatch[2]) : undefined,
        joinType,
        confidence: 90,
        discoveredInSP: spName,
      });
    }
    
    return joins;
  }

  /**
   * Find tables referenced in SP but not in uploaded DDL
   */
  private findDiscoveredTables(tablesReferenced: TableDependency[]): DiscoveredTable[] {
    const discovered: DiscoveredTable[] = [];
    
    for (const dep of tablesReferenced) {
      if (!this.existingTables.has(dep.tableName.toLowerCase())) {
        discovered.push({
          tableName: dep.tableName,
          discoveredInSP: '', // Will be set by caller
          accessType: dep.accessType === 'write' ? 'write' : 'read',
          columns: dep.columns,
          suggestedModule: this.suggestModuleForTable(dep.tableName),
          priority: dep.accessType === 'write' ? 'high' : 'medium',
        });
      }
    }
    
    return discovered;
  }

  /**
   * Suggest module for unknown table
   */
  private suggestModuleForTable(tableName: string): string {
    const tableLower = tableName.toLowerCase();
    
    for (const [moduleName, keywords] of Object.entries(MODULE_KEYWORDS)) {
      if (keywords.some(kw => tableLower.includes(kw.toLowerCase()))) {
        return moduleName;
      }
    }
    
    return 'Core';
  }

  /**
   * Extract business rules from WHERE clauses
   */
  private extractBusinessRules(body: string): BusinessFilterRule[] {
    const rules: BusinessFilterRule[] = [];
    
    // Find WHERE clauses
    const whereRegex = /WHERE\s+([\s\S]*?)(?=ORDER\s+BY|GROUP\s+BY|HAVING|$)/gi;
    let match;
    
    while ((match = whereRegex.exec(body)) !== null) {
      const whereClause = match[1];
      
      // Parse individual conditions
      const conditionRegex = /(\w+)\.?\[?(\w+)?\]?\s*(=|<>|>|<|>=|<=|LIKE|IN|BETWEEN|IS)\s*(@?\w+|'[^']*'|\d+)/gi;
      let condMatch;
      
      while ((condMatch = conditionRegex.exec(whereClause)) !== null) {
        const table = condMatch[1];
        const column = condMatch[2] || condMatch[1];
        const operator = condMatch[3];
        const value = condMatch[4];
        const isParam = value.startsWith('@');
        
        rules.push({
          tableName: table,
          column,
          operator,
          valuePattern: value,
          isParameterized: isParam,
          parameterName: isParam ? value : undefined,
          description: `Filter ${table}.${column} ${operator} ${isParam ? 'by parameter' : value}`,
        });
      }
    }
    
    return rules;
  }

  /**
   * Extract write operations
   */
  private extractWriteOperations(body: string): SQLOperation[] {
    const operations: SQLOperation[] = [];
    
    // INSERT
    const insertRegex = /INSERT\s+INTO\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s*(?:\(([^)]+)\))?/gi;
    let match;
    while ((match = insertRegex.exec(body)) !== null) {
      operations.push({
        type: 'INSERT',
        tables: [match[2]],
        columns: match[3] ? match[3].split(',').map(c => c.trim()) : undefined,
      });
    }
    
    // UPDATE
    const updateRegex = /UPDATE\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s+SET\s+([\s\S]*?)(?:WHERE|$)/gi;
    while ((match = updateRegex.exec(body)) !== null) {
      operations.push({
        type: 'UPDATE',
        tables: [match[2]],
        columns: match[3] ? match[3].split(',').map(c => c.split('=')[0].trim()) : undefined,
      });
    }
    
    // DELETE
    const deleteRegex = /DELETE\s+FROM\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/gi;
    while ((match = deleteRegex.exec(body)) !== null) {
      operations.push({
        type: 'DELETE',
        tables: [match[2]],
      });
    }
    
    return operations;
  }

  /**
   * Extract read operations
   */
  private extractReadOperations(body: string): SQLOperation[] {
    const operations: SQLOperation[] = [];
    
    const selectRegex = /SELECT\s+([\s\S]*?)\s+FROM\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/gi;
    let match;
    while ((match = selectRegex.exec(body)) !== null) {
      operations.push({
        type: 'SELECT',
        tables: [match[3]],
        columns: this.parseSelectColumns(match[1]),
      });
    }
    
    return operations;
  }

  /**
   * Parse SELECT column list
   */
  private parseSelectColumns(columnList: string): string[] {
    return columnList
      .split(',')
      .map(c => c.trim().split(/\s+(?:AS\s+)?/i)[0].replace(/[\[\]]/g, ''))
      .filter(c => c !== '*' && !c.includes('('));
  }

  /**
   * Generate API input schema from SP parameters
   */
  private generateAPISchema(parameters: ProcedureParameter[]): APIInputSchema {
    const properties: Record<string, APIProperty> = {};
    const required: string[] = [];
    const example: Record<string, unknown> = {};

    for (const param of parameters) {
      const propName = param.name.replace('@', '');
      const tsType = this.mapSQLTypeToJS(param.dataType);
      
      properties[propName] = {
        type: tsType,
        format: this.getFormat(param.dataType),
        description: `${param.name} parameter`,
        default: param.defaultValue ? this.parseDefaultValue(param.defaultValue) : undefined,
        isOutput: param.isOutput,
        source: 'parameter',
      };
      
      if (!param.isOutput && param.defaultValue === undefined) {
        required.push(propName);
      }
      
      example[propName] = this.getExampleValue(param.dataType);
    }

    return { properties, required, example };
  }

  /**
   * Map SQL type to JavaScript type
   */
  private mapSQLTypeToJS(sqlType: string): string {
    const type = sqlType.toUpperCase();
    
    if (['INT', 'BIGINT', 'SMALLINT', 'TINYINT'].includes(type)) return 'integer';
    if (['DECIMAL', 'NUMERIC', 'FLOAT', 'REAL', 'MONEY', 'SMALLMONEY'].includes(type)) return 'number';
    if (['BIT'].includes(type)) return 'boolean';
    if (['DATE'].includes(type)) return 'string';
    if (['DATETIME', 'DATETIME2', 'SMALLDATETIME'].includes(type)) return 'string';
    if (['UNIQUEIDENTIFIER'].includes(type)) return 'string';
    if (['TABLE'].includes(type)) return 'array';
    
    return 'string';
  }

  /**
   * Get format for type
   */
  private getFormat(sqlType: string): string | undefined {
    const type = sqlType.toUpperCase();
    
    if (type === 'DATE') return 'date';
    if (['DATETIME', 'DATETIME2'].includes(type)) return 'date-time';
    if (type === 'UNIQUEIDENTIFIER') return 'uuid';
    if (type === 'MONEY' || type === 'SMALLMONEY') return 'currency';
    
    return undefined;
  }

  /**
   * Parse default value
   */
  private parseDefaultValue(value: string): unknown {
    if (value.startsWith("'") && value.endsWith("'")) {
      return value.slice(1, -1);
    }
    if (value === '0') return 0;
    if (value === '1') return 1;
    if (value.toUpperCase() === 'NULL') return null;
    if (value.toUpperCase() === 'GETDATE()') return 'now()';
    
    return value;
  }

  /**
   * Get example value for type
   */
  private getExampleValue(sqlType: string): unknown {
    const type = sqlType.toUpperCase();
    
    if (['INT', 'BIGINT'].includes(type)) return 1;
    if (['DECIMAL', 'MONEY'].includes(type)) return 100.00;
    if (type === 'BIT') return true;
    if (type === 'DATE') return '2024-01-01';
    if (type === 'DATETIME') return '2024-01-01T00:00:00Z';
    if (type === 'UNIQUEIDENTIFIER') return '00000000-0000-0000-0000-000000000000';
    
    return 'string';
  }

  /**
   * Analyze commented code for historical context
   */
  private analyzeCommentedCode(body: string): CommentedCodeAnalysis {
    const lineCount = (body.match(/--.*$/gm) || []).length;
    const blockComments = body.match(/\/\*[\s\S]*?\*\//g) || [];
    
    const historicalContext: string[] = [];
    const deprecatedLogic: string[] = [];
    const businessRulesRemoved: string[] = [];
    
    // Analyze single-line comments
    const singleLineComments = body.match(/--.*$/gm) || [];
    for (const comment of singleLineComments) {
      const text = comment.replace(/^--\s?/, '').toLowerCase();
      
      if (text.includes('deprecated') || text.includes('obsolete') || text.includes('old')) {
        deprecatedLogic.push(comment);
      }
      if (text.includes('removed') || text.includes('deleted') || text.includes('no longer')) {
        businessRulesRemoved.push(comment);
      }
      if (text.includes('history') || text.includes('was ') || text.includes('used to')) {
        historicalContext.push(comment);
      }
    }
    
    // Analyze block comments
    for (const block of blockComments) {
      const text = block.toLowerCase();
      
      if (text.includes('deprecated') || text.includes('obsolete')) {
        deprecatedLogic.push(block);
      }
      if (text.includes('removed') || text.includes('no longer')) {
        businessRulesRemoved.push(block);
      }
      historicalContext.push(block.substring(0, 100) + '...');
    }
    
    return {
      lineCount,
      historicalContext: historicalContext.slice(0, 5),
      deprecatedLogic: deprecatedLogic.slice(0, 5),
      businessRulesRemoved: businessRulesRemoved.slice(0, 5),
    };
  }

  /**
   * Calculate complexity score
   */
  private calculateComplexity(body: string): number {
    let score = 0;
    
    // Base complexity from length
    score += Math.floor(body.length / 100);
    
    // Control flow
    score += (body.match(/\bIF\b/gi) || []).length * 3;
    score += (body.match(/\bWHILE\b/gi) || []).length * 5;
    score += (body.match(/\bCURSOR\b/gi) || []).length * 10;
    score += (body.match(/\bTRY\b/gi) || []).length * 4;
    score += (body.match(/\bCATCH\b/gi) || []).length * 4;
    
    // Temp tables
    score += (body.match(/#/g) || []).length * 3;
    
    // Dynamic SQL
    if (body.includes('sp_executesql') || body.includes('EXEC(@')) {
      score += 15;
    }
    
    // Transactions
    score += (body.match(/\bBEGIN\s+TRAN/gi) || []).length * 5;
    
    // Nested operations
    score += (body.match(/\bEXEC(?:UTE)?\s+\w+/gi) || []).length * 2;
    
    return score;
  }

  /**
   * Assess risk level
   */
  private assessRiskLevel(sp: StoredProcedureDef, complexity: number): 'low' | 'medium' | 'high' | 'critical' {
    // Critical: Dynamic SQL with user input
    if (sp.body.includes('sp_executesql') && sp.parameters.some(p => !p.isOutput)) {
      return 'critical';
    }
    
    // High: Delete operations or high complexity
    if (sp.body.match(/DELETE\s+FROM/i) || complexity > 50) {
      return 'high';
    }
    
    // Medium: Update operations or moderate complexity
    if (sp.body.match(/UPDATE\s+/i) || complexity > 25) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Suggest API endpoint from SP name
   */
  private suggestEndpoint(procedureName: string, actionType: SPActionType): string {
    // Extract entity name from SP name
    const entityMatch = procedureName.match(/SP_(?:Get|Add|Update|Delete|Search|DDL_)?(\w+)/i);
    const entity = entityMatch ? entityMatch[1].toLowerCase() : 'entity';
    
    const endpointMap: Record<SPActionType, string> = {
      dropdown: `GET /api/${entity}/dropdown`,
      read: `GET /api/${entity}/:id`,
      create: `POST /api/${entity}`,
      update: `PUT /api/${entity}/:id`,
      delete: `DELETE /api/${entity}/:id`,
      search: `GET /api/${entity}/search`,
      report: `GET /api/reports/${entity}`,
      validate: `POST /api/${entity}/validate`,
      process: `POST /api/${entity}/process`,
      import: `POST /api/${entity}/import`,
      export: `GET /api/${entity}/export`,
      calculate: `POST /api/${entity}/calculate`,
      workflow: `POST /api/${entity}/workflow`,
      unknown: `POST /api/${entity}/action`,
    };
    
    return endpointMap[actionType];
  }
}

// Export singleton factory
export function createSPParser(tables: TableDef[] = []): SPParserEngine {
  return new SPParserEngine(tables);
}
