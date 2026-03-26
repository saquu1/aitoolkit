/**
 * SP Body Analyzer - Deep Analysis Engine for Stored Procedure Bodies
 * 
 * GAP-SP-002 Implementation
 * 
 * This module performs comprehensive analysis of SQL Server stored procedure
 * body content to extract intelligence including:
 * - Parameter extraction with full metadata
 * - Business rule extraction from conditional logic
 * - Table access pattern analysis
 * - Error code mapping
 * - Transaction and flow control detection
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface SPBodyAnalysis {
  /** Procedure name */
  procedureName: string;
  /** Schema (dbo, etc.) */
  schema: string;
  /** Original body text */
  bodyText: string;
  
  // Parameter Intelligence
  parameters: SPParameterDetail[];
  
  // Table Access Patterns
  tableAccess: SPTableAccessPattern[];
  
  // Business Rules
  businessRules: SPBusinessRuleDetail[];
  
  // Error Codes
  errorCodes: SPErrorCodeDetail[];
  
  // Transaction Analysis
  transactionInfo: SPTransactionInfo;
  
  // Flow Control
  flowControl: SPFlowControl;
  
  // Dynamic SQL
  dynamicSQLInfo: SPDynamicSQLInfo;
  
  // Complexity Metrics
  complexity: SPComplexityMetrics;
  
  // Sub-procedure calls
  subProcedureCalls: SPSubProcedureCall[];
  
  // Temp tables
  tempTables: SPTempTable[];
  
  // CTEs
  ctes: SPCTEDefinition[];
  
  // Analysis metadata
  analysisMetadata: {
    analyzedAt: Date;
    analyzerVersion: string;
    confidence: number;
    parsingErrors: string[];
  };
}

export interface SPParameterDetail {
  name: string;
  position: number;
  type: string;
  direction: 'input' | 'output' | 'input_output';
  isOptional: boolean;
  defaultValue: string | null;
  maxLength: number | null;
  precision: number | null;
  scale: number | null;
  isTableValued: boolean;
  tableType: string | null;
  usageInBody: {
    locations: number[];
    contexts: string[];
    isModified: boolean;
  };
  inferredPurpose: string | null;
  semanticType: string | null;
}

export interface SPTableAccessPattern {
  tableName: string;
  schema: string;
  alias: string | null;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'MERGE';
  columns: {
    name: string;
    usage: 'read' | 'write' | 'condition' | 'output';
  }[];
  joinType: string | null;
  joinCondition: string | null;
  isMainOperation: boolean;
  estimatedRows: 'single' | 'few' | 'many' | 'unknown';
  whereConditions: string[];
}

export interface SPBusinessRuleDetail {
  id: string;
  type: SPBusinessRuleType;
  description: string;
  tableName: string | null;
  columnName: string | null;
  condition: string;
  action: string;
  errorCode: number | null;
  errorMessage: string | null;
  isBlocking: boolean;
  severity: 'error' | 'warning' | 'info';
  sourceCode: string;
  lineNumber: number;
  relatedParameters: string[];
}

export type SPBusinessRuleType = 
  | 'existence_check'
  | 'availability_check'
  | 'status_check'
  | 'permission_check'
  | 'date_range_check'
  | 'uniqueness_check'
  | 'referential_check'
  | 'calculation_check'
  | 'limit_check'
  | 'format_validation'
  | 'business_constraint'
  | 'workflow_rule'
  | 'audit_rule';

export interface SPErrorCodeDetail {
  code: number;
  message: string;
  condition: string;
  severity: 'critical' | 'error' | 'warning' | 'info';
  isCustom: boolean;
  lineNumber: number;
  suggestedHTTPStatus: number;
  suggestedResponse: {
    success: boolean;
    errorCode: number;
    message: string;
    details?: Record<string, any>;
  };
}

export interface SPTransactionInfo {
  hasTransaction: boolean;
  transactionName: string | null;
  isolationLevel: string | null;
  savePoints: string[];
  commitCount: number;
  rollbackCount: number;
  nestedTransactions: boolean;
  xactAbortOn: boolean;
}

export interface SPFlowControl {
  hasTryCatch: boolean;
  hasWhile: boolean;
  hasCursor: boolean;
  hasIfElse: boolean;
  hasCase: boolean;
  hasGoto: boolean;
  hasReturn: boolean;
  cursorCount: number;
  loopDepth: number;
  conditionalBlocks: number;
  estimatedComplexity: 'simple' | 'moderate' | 'complex' | 'very_complex';
}

export interface SPDynamicSQLInfo {
  hasDynamicSQL: boolean;
  spExecutesQLUsage: boolean;
  execUsage: boolean;
  injectedParameters: string[];
  sqlInjectionRisk: 'none' | 'low' | 'medium' | 'high';
  dynamicSQLPatterns: string[];
}

export interface SPComplexityMetrics {
  totalLines: number;
  codeLines: number;
  commentLines: number;
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  halsteadVolume: number;
  maintainabilityIndex: number;
  estimatedExecutionTime: 'fast' | 'moderate' | 'slow' | 'unknown';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  migrationComplexity: 'simple' | 'moderate' | 'complex' | 'very_complex';
}

export interface SPSubProcedureCall {
  procedureName: string;
  parameters: {
    name: string | null;
    value: string;
    isOutput: boolean;
  }[];
  lineNumber: number;
  returnType: 'resultset' | 'output_params' | 'return_value' | 'unknown';
}

export interface SPTempTable {
  name: string;
  type: 'local_temp' | 'global_temp' | 'table_variable';
  columns: {
    name: string;
    type: string;
  }[];
  created: number;
  dropped: boolean;
  usageCount: number;
}

export interface SPCTEDefinition {
  name: string;
  isRecursive: boolean;
  columns: string[];
  body: string;
  usageCount: number;
}

// ============================================================================
// SP BODY ANALYZER CLASS
// ============================================================================

export class SPBodyAnalyzer {
  private readonly version = '1.0.0';
  
  // Regex patterns for parsing
  private readonly patterns = {
    parameter: /@(?:@)?(\w+)\s+([\w\s\(\),]+?)(?:\s*=\s*([^,\)]+))?(?:\s+(OUTPUT|OUT|READONLY))?/gi,
    tableSelect: /(?:FROM|JOIN)\s+(\[?(\w+)\]?\.)?(\[?(\w+)\]?)\s*(?:AS\s+(\w+)|(\w+))?/gi,
    tableInsert: /INSERT\s+(?:INTO\s+)?(\[?(\w+)\]?\.)?(\[?(\w+)\]?)/gi,
    tableUpdate: /UPDATE\s+(\[?(\w+)\]?\.)?(\[?(\w+)\]?)/gi,
    tableDelete: /DELETE\s+(?:FROM\s+)?(\[?(\w+)\]?\.)?(\[?(\w+)\]?)/gi,
    columnSelect: /SELECT\s+(.*?)\s+FROM/gi,
    whereClause: /WHERE\s+(.*?)(?:GROUP|ORDER|$)/gi,
    errorCode: /RAISERROR\s*\(\s*N?'([^']+)'\s*,\s*(\d+)\s*,\s*(\d+)/gi,
    errorCodeThrow: /THROW\s+(\d+)\s*,\s*N?'([^']+)'/gi,
    errorCodeIf: /@ErrorCode\s*=\s*(\d+)/gi,
    transaction: /BEGIN\s+(TRAN(?:SACTION)?)\s*(\w*)/gi,
    commit: /COMMIT(?:\s+(TRAN|TRANSACTION))?\s*(\w*)/gi,
    rollback: /ROLLBACK(?:\s+(TRAN|TRANSACTION))?\s*(\w*)/gi,
    tryCatch: /BEGIN\s+TRY[\s\S]*?END\s+TRY\s*BEGIN\s+CATCH/gi,
    cursor: /DECLARE\s+(@?\w+)\s+CURSOR/gi,
    while: /WHILE\s+([\s\S]+?)\s+BEGIN/gi,
    ifElse: /IF\s+(?:NOT\s+)?EXISTS\s*\(|IF\s+@?\w+\s*(?:=|<>|!=|>|<|>=|<=|IS|IS\s+NOT)/gi,
    dynamicSQL: /(?:sp_executesql|EXEC\s*\(|EXECUTE\s*\()/gi,
    spExecutesql: /sp_executesql\s+(@?\w+|N'[^']+')/gi,
    subProcedure: /(?:EXEC|EXECUTE)\s+(\[?(\w+)\]?\.)?(\[?(SP_\w+)\]?)/gi,
    tempTable: /(?:CREATE\s+TABLE\s+#(\w+)|DECLARE\s+@(\w+)\s+TABLE)/gi,
    cte: /WITH\s+(\w+)\s*(?:\(([^)]+)\))?\s*AS\s*\(/gi,
    raiseError: /RAISERROR\s*\(/gi,
    print: /PRINT\s+N?'([^']+)'/gi,
    setVariable: /SET\s+@(\w+)\s*=/gi,
    selectVariable: /SELECT\s+@(\w+)\s*=/gi,
  };

  /**
   * Analyze a stored procedure body
   */
  analyze(procedureName: string, schema: string, bodyText: string): SPBodyAnalysis {
    const parsingErrors: string[] = [];
    
    try {
      // Normalize body text
      const normalizedBody = this.normalizeBody(bodyText);
      
      // Extract all intelligence layers
      const parameters = this.extractParameters(normalizedBody, parsingErrors);
      const tableAccess = this.extractTableAccess(normalizedBody, parsingErrors);
      const businessRules = this.extractBusinessRules(normalizedBody, tableAccess, parsingErrors);
      const errorCodes = this.extractErrorCodes(normalizedBody, parsingErrors);
      const transactionInfo = this.analyzeTransaction(normalizedBody, parsingErrors);
      const flowControl = this.analyzeFlowControl(normalizedBody, parsingErrors);
      const dynamicSQLInfo = this.analyzeDynamicSQL(normalizedBody, parsingErrors);
      const complexity = this.calculateComplexity(normalizedBody, flowControl, tableAccess);
      const subProcedureCalls = this.extractSubProcedureCalls(normalizedBody, parsingErrors);
      const tempTables = this.extractTempTables(normalizedBody, parsingErrors);
      const ctes = this.extractCTEs(normalizedBody, parsingErrors);

      // Calculate overall confidence
      const confidence = this.calculateConfidence(
        parameters,
        tableAccess,
        businessRules,
        errorCodes,
        parsingErrors
      );

      return {
        procedureName,
        schema,
        bodyText,
        parameters,
        tableAccess,
        businessRules,
        errorCodes,
        transactionInfo,
        flowControl,
        dynamicSQLInfo,
        complexity,
        subProcedureCalls,
        tempTables,
        ctes,
        analysisMetadata: {
          analyzedAt: new Date(),
          analyzerVersion: this.version,
          confidence,
          parsingErrors
        }
      };
    } catch (error) {
      parsingErrors.push(`Analysis error: ${error instanceof Error ? error.message : String(error)}`);
      
      return {
        procedureName,
        schema,
        bodyText,
        parameters: [],
        tableAccess: [],
        businessRules: [],
        errorCodes: [],
        transactionInfo: this.getDefaultTransactionInfo(),
        flowControl: this.getDefaultFlowControl(),
        dynamicSQLInfo: this.getDefaultDynamicSQLInfo(),
        complexity: this.getDefaultComplexity(),
        subProcedureCalls: [],
        tempTables: [],
        ctes: [],
        analysisMetadata: {
          analyzedAt: new Date(),
          analyzerVersion: this.version,
          confidence: 0,
          parsingErrors
        }
      };
    }
  }

  /**
   * Normalize body text for parsing
   */
  private normalizeBody(bodyText: string): string {
    return bodyText
      .replace(/--.*$/gm, '') // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Extract parameters from SP body
   */
  private extractParameters(body: string, errors: string[]): SPParameterDetail[] {
    const parameters: SPParameterDetail[] = [];
    const paramPattern = this.patterns.parameter;
    let match;
    let position = 0;

    while ((match = paramPattern.exec(body)) !== null) {
      position++;
      const name = match[1];
      const typeStr = match[2].trim();
      const defaultValue = match[3] ? match[3].trim() : null;
      const direction = match[4] ? 
        (match[4].toUpperCase() === 'OUTPUT' || match[4].toUpperCase() === 'OUT' ? 'output' : 'input') : 
        'input';

      // Check if it's actually optional (has default or is output)
      const isOptional = defaultValue !== null || direction === 'output';

      // Parse type details
      const typeInfo = this.parseSQLType(typeStr);

      // Find parameter usage in body
      const usageInBody = this.findParameterUsage(body, name);

      // Infer semantic type
      const semanticType = this.inferSemanticType(name, typeInfo.type);

      parameters.push({
        name: `@${name}`,
        position,
        type: typeInfo.type,
        direction: direction === 'output' ? 'output' : 'input',
        isOptional,
        defaultValue,
        maxLength: typeInfo.maxLength,
        precision: typeInfo.precision,
        scale: typeInfo.scale,
        isTableValued: typeInfo.isTableValued,
        tableType: typeInfo.tableType,
        usageInBody,
        inferredPurpose: this.inferParameterPurpose(name, typeInfo.type, usageInBody.contexts),
        semanticType
      });
    }

    return parameters;
  }

  /**
   * Parse SQL type string into components
   */
  private parseSQLType(typeStr: string): {
    type: string;
    maxLength: number | null;
    precision: number | null;
    scale: number | null;
    isTableValued: boolean;
    tableType: string | null;
  } {
    const upperType = typeStr.toUpperCase().trim();
    
    // Check for table type
    if (upperType.includes('TABLE') || upperType.includes('READONLY')) {
      const tableMatch = upperType.match(/(\w+)\s+(?:AS\s+)?TABLE|READONLY/);
      return {
        type: 'TABLE',
        maxLength: null,
        precision: null,
        scale: null,
        isTableValued: true,
        tableType: tableMatch ? tableMatch[1] : null
      };
    }

    // Parse type with parameters
    const typeMatch = upperType.match(/(\w+)(?:\s*\(\s*(\d+)(?:\s*,\s*(\d+))?\s*\))?/);
    if (!typeMatch) {
      return {
        type: upperType,
        maxLength: null,
        precision: null,
        scale: null,
        isTableValued: false,
        tableType: null
      };
    }

    const baseType = typeMatch[1];
    const param1 = typeMatch[2] ? parseInt(typeMatch[2]) : null;
    const param2 = typeMatch[3] ? parseInt(typeMatch[3]) : null;

    // Determine if param1 is length or precision
    let maxLength: number | null = null;
    let precision: number | null = null;
    let scale: number | null = null;

    if (param1 !== null) {
      if (['DECIMAL', 'NUMERIC'].includes(baseType)) {
        precision = param1;
        scale = param2;
      } else if (['DATETIME2', 'DATETIMEOFFSET', 'TIME'].includes(baseType)) {
        precision = param1; // Scale for datetime
      } else {
        maxLength = param1;
      }
    }

    return {
      type: baseType,
      maxLength,
      precision,
      scale,
      isTableValued: false,
      tableType: null
    };
  }

  /**
   * Find parameter usage locations in body
   */
  private findParameterUsage(body: string, paramName: string): {
    locations: number[];
    contexts: string[];
    isModified: boolean;
  } {
    const locations: number[] = [];
    const contexts: string[] = [];
    let isModified = false;

    // Find all occurrences
    const regex = new RegExp(`@${paramName}\\b`, 'gi');
    let match;

    while ((match = regex.exec(body)) !== null) {
      locations.push(match.index);
      
      // Get context around the match
      const start = Math.max(0, match.index - 30);
      const end = Math.min(body.length, match.index + 50);
      const context = body.substring(start, end);
      contexts.push(context);

      // Check if parameter is being modified
      if (/(?:SET|SELECT)\s+@/i.test(context)) {
        isModified = true;
      }
    }

    return { locations, contexts, isModified };
  }

  /**
   * Infer semantic type from parameter name and SQL type
   */
  private inferSemanticType(name: string, sqlType: string): string | null {
    const lowerName = name.toLowerCase();
    
    // Common patterns
    if (lowerName.includes('id') && sqlType === 'INT') return 'primary_key';
    if (lowerName.endsWith('id') && sqlType === 'INT') return 'foreign_key';
    if (lowerName.includes('email')) return 'email';
    if (lowerName.includes('phone') || lowerName.includes('mobile')) return 'phone';
    if (lowerName.includes('name')) return 'name';
    if (lowerName.includes('date') || lowerName.includes('time')) return 'datetime';
    if (lowerName.includes('status')) return 'status';
    if (lowerName.includes('code')) return 'code';
    if (lowerName.includes('amount') || lowerName.includes('price') || lowerName.includes('total')) return 'currency';
    if (lowerName.includes('count') || lowerName.includes('qty')) return 'count';
    if (lowerName.includes('is') || lowerName.includes('has') || lowerName.includes('active')) return 'boolean';
    if (lowerName.includes('address')) return 'address';
    if (lowerName.includes('description') || lowerName.includes('notes')) return 'text';
    
    return null;
  }

  /**
   * Infer parameter purpose from name, type, and usage contexts
   */
  private inferParameterPurpose(name: string, type: string, contexts: string[]): string | null {
    const lowerName = name.toLowerCase();
    const contextStr = contexts.join(' ').toLowerCase();

    if (lowerName.includes('action') || contextStr.includes('action')) {
      return 'Action type selector';
    }
    if (lowerName.includes('userid') || lowerName.includes('createdby')) {
      return 'User performing the action';
    }
    if (lowerName.includes('page') || lowerName.includes('pagenum')) {
      return 'Pagination - page number';
    }
    if (lowerName.includes('pagesize') || lowerName.includes('rows')) {
      return 'Pagination - page size';
    }
    if (lowerName.includes('search') || lowerName.includes('query')) {
      return 'Search query parameter';
    }
    if (lowerName.includes('sort') || lowerName.includes('orderby')) {
      return 'Sort order specification';
    }
    if (lowerName.includes('filter')) {
      return 'Filter criteria';
    }
    
    return null;
  }

  /**
   * Extract table access patterns from SP body
   */
  private extractTableAccess(body: string, errors: string[]): SPTableAccessPattern[] {
    const tableMap = new Map<string, SPTableAccessPattern>();

    // Extract SELECT operations
    this.extractSelectOperations(body, tableMap);

    // Extract INSERT operations
    this.extractInsertOperations(body, tableMap);

    // Extract UPDATE operations
    this.extractUpdateOperations(body, tableMap);

    // Extract DELETE operations
    this.extractDeleteOperations(body, tableMap);

    // Determine main operation
    this.determineMainOperation(tableMap);

    return Array.from(tableMap.values());
  }

  /**
   * Extract SELECT operations
   */
  private extractSelectOperations(body: string, tableMap: Map<string, SPTableAccessPattern>): void {
    // Find FROM clauses
    const fromPattern = /FROM\s+(\[?(\w+)\]?\.)?(\[?(\w+)\]?)\s*(?:AS\s+(\w+)|(\w+))?/gi;
    let match;

    while ((match = fromPattern.exec(body)) !== null) {
      const schema = match[2] || 'dbo';
      const tableName = match[4] || match[3];
      const alias = match[5] || match[6] || null;

      const key = `${schema}.${tableName}`;
      
      if (!tableMap.has(key)) {
        tableMap.set(key, {
          tableName,
          schema,
          alias,
          operation: 'SELECT',
          columns: [],
          joinType: null,
          joinCondition: null,
          isMainOperation: false,
          estimatedRows: 'unknown',
          whereConditions: []
        });
      }

      const entry = tableMap.get(key)!;
      entry.operation = 'SELECT';
    }

    // Find JOIN clauses
    const joinPattern = /(LEFT|RIGHT|INNER|OUTER|CROSS)?\s*(?:JOIN)\s+(\[?(\w+)\]?\.)?(\[?(\w+)\]?)\s*(?:AS\s+(\w+)|(\w+))?\s+ON\s+(.*?)(?=LEFT|RIGHT|INNER|OUTER|CROSS|JOIN|WHERE|GROUP|ORDER|$)/gi;
    
    while ((match = joinPattern.exec(body)) !== null) {
      const joinType = match[1] ? match[1].toUpperCase() : 'INNER';
      const schema = match[3] || 'dbo';
      const tableName = match[5] || match[4];
      const alias = match[6] || match[7] || null;
      const joinCondition = match[8] ? match[8].trim() : null;

      const key = `${schema}.${tableName}`;
      
      if (!tableMap.has(key)) {
        tableMap.set(key, {
          tableName,
          schema,
          alias,
          operation: 'SELECT',
          columns: [],
          joinType,
          joinCondition,
          isMainOperation: false,
          estimatedRows: 'unknown',
          whereConditions: []
        });
      } else {
        const entry = tableMap.get(key)!;
        entry.joinType = joinType;
        entry.joinCondition = joinCondition;
      }
    }
  }

  /**
   * Extract INSERT operations
   */
  private extractInsertOperations(body: string, tableMap: Map<string, SPTableAccessPattern>): void {
    const insertPattern = /INSERT\s+(?:INTO\s+)?(\[?(\w+)\]?\.)?(\[?(\w+)\]?)\s*(?:\(([^)]+)\))?/gi;
    let match;

    while ((match = insertPattern.exec(body)) !== null) {
      const schema = match[2] || 'dbo';
      const tableName = match[4] || match[3];
      const columns = match[5] ? match[5].split(',').map(c => c.trim()) : [];

      const key = `${schema}.${tableName}`;
      
      const existing = tableMap.get(key);
      if (existing) {
        existing.operation = 'INSERT';
        existing.columns = columns.map(c => ({
          name: c.replace(/[\[\]]/g, ''),
          usage: 'write' as const
        }));
      } else {
        tableMap.set(key, {
          tableName,
          schema,
          alias: null,
          operation: 'INSERT',
          columns: columns.map(c => ({
            name: c.replace(/[\[\]]/g, ''),
            usage: 'write' as const
          })),
          joinType: null,
          joinCondition: null,
          isMainOperation: false,
          estimatedRows: 'single',
          whereConditions: []
        });
      }
    }
  }

  /**
   * Extract UPDATE operations
   */
  private extractUpdateOperations(body: string, tableMap: Map<string, SPTableAccessPattern>): void {
    const updatePattern = /UPDATE\s+(\[?(\w+)\]?\.)?(\[?(\w+)\]?)\s+SET\s+(.*?)(?:FROM|WHERE|$)/gi;
    let match;

    while ((match = updatePattern.exec(body)) !== null) {
      const schema = match[2] || 'dbo';
      const tableName = match[4] || match[3];
      const setClause = match[5];

      // Extract columns from SET clause
      const columns = this.extractColumnsFromSet(setClause);

      const key = `${schema}.${tableName}`;
      
      const existing = tableMap.get(key);
      if (existing) {
        existing.operation = 'UPDATE';
        existing.columns = columns.map(c => ({
          name: c,
          usage: 'write' as const
        }));
      } else {
        tableMap.set(key, {
          tableName,
          schema,
          alias: null,
          operation: 'UPDATE',
          columns: columns.map(c => ({
            name: c,
            usage: 'write' as const
          })),
          joinType: null,
          joinCondition: null,
          isMainOperation: false,
          estimatedRows: 'few',
          whereConditions: []
        });
      }
    }
  }

  /**
   * Extract DELETE operations
   */
  private extractDeleteOperations(body: string, tableMap: Map<string, SPTableAccessPattern>): void {
    const deletePattern = /DELETE\s+(?:FROM\s+)?(\[?(\w+)\]?\.)?(\[?(\w+)\]?)/gi;
    let match;

    while ((match = deletePattern.exec(body)) !== null) {
      const schema = match[2] || 'dbo';
      const tableName = match[4] || match[3];

      const key = `${schema}.${tableName}`;
      
      const existing = tableMap.get(key);
      if (existing) {
        existing.operation = 'DELETE';
      } else {
        tableMap.set(key, {
          tableName,
          schema,
          alias: null,
          operation: 'DELETE',
          columns: [],
          joinType: null,
          joinCondition: null,
          isMainOperation: false,
          estimatedRows: 'few',
          whereConditions: []
        });
      }
    }
  }

  /**
   * Extract columns from SET clause
   */
  private extractColumnsFromSet(setClause: string): string[] {
    const columns: string[] = [];
    const parts = setClause.split(',');
    
    for (const part of parts) {
      const match = part.trim().match(/(\[?(\w+)\]?)\s*=/);
      if (match) {
        columns.push(match[2] || match[1]);
      }
    }
    
    return columns;
  }

  /**
   * Determine the main operation for each table
   */
  private determineMainOperation(tableMap: Map<string, SPTableAccessPattern>): void {
    // The first table operation is usually the main one
    let first = true;
    for (const entry of tableMap.values()) {
      if (first && ['INSERT', 'UPDATE', 'DELETE'].includes(entry.operation)) {
        entry.isMainOperation = true;
        first = false;
      }
    }
  }

  /**
   * Extract business rules from SP body
   */
  private extractBusinessRules(body: string, tableAccess: SPTableAccessPattern[], errors: string[]): SPBusinessRuleDetail[] {
    const rules: SPBusinessRuleDetail[] = [];
    let ruleId = 0;

    // Pattern 1: IF NOT EXISTS checks
    const notExistsPattern = /IF\s+NOT\s+EXISTS\s*\(\s*SELECT\s+.*?FROM\s+(\[?(\w+)\]?\.)?(\[?(\w+)\]?)\s+WHERE\s+(.*?)\)/gi;
    let match;

    while ((match = notExistsPattern.exec(body)) !== null) {
      ruleId++;
      const tableName = match[4] || match[3];
      const condition = match[5];

      rules.push({
        id: `BR-${ruleId.toString().padStart(3, '0')}`,
        type: 'existence_check',
        description: `Check if record does not exist in ${tableName}`,
        tableName,
        columnName: null,
        condition: `NOT EXISTS: ${condition}`,
        action: 'Continue execution',
        errorCode: null,
        errorMessage: null,
        isBlocking: false,
        severity: 'info',
        sourceCode: match[0].substring(0, 200),
        lineNumber: this.getLineNumber(body, match.index),
        relatedParameters: this.extractParametersFromCondition(condition)
      });
    }

    // Pattern 2: IF EXISTS checks
    const existsPattern = /IF\s+EXISTS\s*\(\s*SELECT\s+.*?FROM\s+(\[?(\w+)\]?\.)?(\[?(\w+)\]?)\s+WHERE\s+(.*?)\)/gi;

    while ((match = existsPattern.exec(body)) !== null) {
      ruleId++;
      const tableName = match[4] || match[3];
      const condition = match[5];

      rules.push({
        id: `BR-${ruleId.toString().padStart(3, '0')}`,
        type: 'availability_check',
        description: `Check if record exists in ${tableName}`,
        tableName,
        columnName: null,
        condition: `EXISTS: ${condition}`,
        action: 'Conditional execution',
        errorCode: null,
        errorMessage: null,
        isBlocking: false,
        severity: 'info',
        sourceCode: match[0].substring(0, 200),
        lineNumber: this.getLineNumber(body, match.index),
        relatedParameters: this.extractParametersFromCondition(condition)
      });
    }

    // Pattern 3: Error code assignments
    const errorAssignPattern = /IF\s+(@?\w+)\s*(=|<>|!=)\s*(\d+)\s*(?:BEGIN\s*)?RAISERROR/gi;

    while ((match = errorAssignPattern.exec(body)) !== null) {
      ruleId++;
      const variable = match[1];
      const operator = match[2];
      const value = parseInt(match[3]);

      rules.push({
        id: `BR-${ruleId.toString().padStart(3, '0')}`,
        type: 'business_constraint',
        description: `Error check on ${variable}`,
        tableName: null,
        columnName: null,
        condition: `${variable} ${operator} ${value}`,
        action: 'RAISERROR',
        errorCode: value,
        errorMessage: null,
        isBlocking: true,
        severity: 'error',
        sourceCode: match[0].substring(0, 200),
        lineNumber: this.getLineNumber(body, match.index),
        relatedParameters: [variable]
      });
    }

    // Pattern 4: Status checks
    const statusPattern = /(?:IF|WHERE)\s+.*?(Status|IsActive|IsDeleted)\s*(=|<>|!=)\s*('?[^'\s]+'?|\d+)/gi;

    while ((match = statusPattern.exec(body)) !== null) {
      ruleId++;
      const column = match[1];
      const operator = match[2];
      const value = match[3];

      rules.push({
        id: `BR-${ruleId.toString().padStart(3, '0')}`,
        type: 'status_check',
        description: `Status check on ${column}`,
        tableName: null,
        columnName: column,
        condition: `${column} ${operator} ${value}`,
        action: 'Filtering logic',
        errorCode: null,
        errorMessage: null,
        isBlocking: false,
        severity: 'info',
        sourceCode: match[0].substring(0, 200),
        lineNumber: this.getLineNumber(body, match.index),
        relatedParameters: []
      });
    }

    // Pattern 5: Date range checks
    const datePattern = /(?:IF|WHERE)\s+.*?(@?\w*(?:Date|From|To))\s*(>=|<=|>|<)\s*(@?\w*(?:Date|From|To)?)/gi;

    while ((match = datePattern.exec(body)) !== null) {
      ruleId++;
      const date1 = match[1];
      const operator = match[2];
      const date2 = match[3];

      rules.push({
        id: `BR-${ruleId.toString().padStart(3, '0')}`,
        type: 'date_range_check',
        description: `Date validation: ${date1} ${operator} ${date2}`,
        tableName: null,
        columnName: null,
        condition: `${date1} ${operator} ${date2}`,
        action: 'Date validation',
        errorCode: null,
        errorMessage: null,
        isBlocking: true,
        severity: 'warning',
        sourceCode: match[0].substring(0, 200),
        lineNumber: this.getLineNumber(body, match.index),
        relatedParameters: [date1, date2].filter(p => p.startsWith('@'))
      });
    }

    // Pattern 6: Uniqueness checks (common pattern)
    const uniquePattern = /IF\s+EXISTS\s*\(\s*SELECT.*?WHERE\s+.*?(\w+Code|\w+Name|\w+Email)\s*=/gi;

    while ((match = uniquePattern.exec(body)) !== null) {
      ruleId++;
      const column = match[1];

      rules.push({
        id: `BR-${ruleId.toString().padStart(3, '0')}`,
        type: 'uniqueness_check',
        description: `Uniqueness check on ${column}`,
        tableName: null,
        columnName: column,
        condition: `${column} already exists`,
        action: 'Reject duplicate',
        errorCode: null,
        errorMessage: `${column} already exists`,
        isBlocking: true,
        severity: 'error',
        sourceCode: match[0].substring(0, 200),
        lineNumber: this.getLineNumber(body, match.index),
        relatedParameters: []
      });
    }

    return rules;
  }

  /**
   * Extract parameters from a condition string
   */
  private extractParametersFromCondition(condition: string): string[] {
    const params: string[] = [];
    const paramPattern = /@(\w+)/g;
    let match;

    while ((match = paramPattern.exec(condition)) !== null) {
      if (!params.includes(match[0])) {
        params.push(match[0]);
      }
    }

    return params;
  }

  /**
   * Get line number from character index
   */
  private getLineNumber(text: string, index: number): number {
    return text.substring(0, index).split('\n').length;
  }

  /**
   * Extract error codes from SP body
   */
  private extractErrorCodes(body: string, errors: string[]): SPErrorCodeDetail[] {
    const errorCodes: SPErrorCodeDetail[] = [];

    // Pattern 1: RAISERROR
    const raiserrorPattern = /RAISERROR\s*\(\s*N?'([^']+)'\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([^)]+))?\s*\)/gi;
    let match;

    while ((match = raiserrorPattern.exec(body)) !== null) {
      const message = match[1];
      const severity = parseInt(match[2]);
      const state = parseInt(match[3]);
      const params = match[4];

      // Map severity to suggested HTTP status
      const httpStatus = this.mapSeverityToHTTP(severity);

      errorCodes.push({
        code: 50000 + state, // RAISERROR uses base 50000
        message,
        condition: 'RAISERROR called',
        severity: severity >= 16 ? 'error' : severity >= 11 ? 'warning' : 'info',
        isCustom: true,
        lineNumber: this.getLineNumber(body, match.index),
        suggestedHTTPStatus: httpStatus,
        suggestedResponse: {
          success: false,
          errorCode: 50000 + state,
          message,
          details: params ? { params } : undefined
        }
      });
    }

    // Pattern 2: THROW
    const throwPattern = /THROW\s+(\d+)\s*,\s*N?'([^']+)'\s*,\s*(\d+)/gi;

    while ((match = throwPattern.exec(body)) !== null) {
      const code = parseInt(match[1]);
      const message = match[2];
      const state = parseInt(match[3]);

      errorCodes.push({
        code,
        message,
        condition: 'THROW statement',
        severity: 'error',
        isCustom: true,
        lineNumber: this.getLineNumber(body, match.index),
        suggestedHTTPStatus: 400,
        suggestedResponse: {
          success: false,
          errorCode: code,
          message
        }
      });
    }

    // Pattern 3: Error code variables (common pattern)
    const errorVarPattern = /@ErrorCode\s*=\s*(\d+)/gi;

    while ((match = errorVarPattern.exec(body)) !== null) {
      const code = parseInt(match[1]);

      // Try to find associated message
      const nearbyText = body.substring(Math.max(0, match.index - 200), match.index + 200);
      const msgMatch = nearbyText.match(/@ErrorMessage\s*=\s*N?'([^']+)'/i);
      const message = msgMatch ? msgMatch[1] : `Error ${code}`;

      // Skip if already added
      if (!errorCodes.some(e => e.code === code)) {
        errorCodes.push({
          code,
          message,
          condition: 'Error code variable assignment',
          severity: code >= 50000 ? 'error' : 'warning',
          isCustom: true,
          lineNumber: this.getLineNumber(body, match.index),
          suggestedHTTPStatus: this.mapErrorCodeToHTTP(code),
          suggestedResponse: {
            success: false,
            errorCode: code,
            message
          }
        });
      }
    }

    return errorCodes;
  }

  /**
   * Map SQL Server severity to HTTP status
   */
  private mapSeverityToHTTP(severity: number): number {
    if (severity >= 20) return 500; // Fatal
    if (severity >= 16) return 400; // User error
    if (severity >= 11) return 422; // Constraint violation
    return 200; // Informational
  }

  /**
   * Map error code to HTTP status
   */
  private mapErrorCodeToHTTP(code: number): number {
    // Common SQL Server error codes
    if (code === 547) return 400; // FK constraint
    if (code === 2601 || code === 2627) return 409; // Unique constraint
    if (code === 515) return 400; // NULL constraint
    if (code >= 50000) return 400; // Custom errors
    return 500;
  }

  /**
   * Analyze transaction handling
   */
  private analyzeTransaction(body: string, errors: string[]): SPTransactionInfo {
    const hasTransaction = /BEGIN\s+TRAN/i.test(body);
    const tranMatch = body.match(/BEGIN\s+TRAN(?:SACTION)?\s*(\w*)/i);
    const isolationMatch = body.match(/SET\s+TRANSACTION\s+ISOLATION\s+LEVEL\s+(\w+)/i);

    // Find save points
    const savePoints: string[] = [];
    const savePattern = /SAVE\s+TRAN(?:SACTION)?\s+(\w+)/gi;
    let match;
    while ((match = savePattern.exec(body)) !== null) {
      savePoints.push(match[1]);
    }

    return {
      hasTransaction,
      transactionName: tranMatch ? tranMatch[1] || null : null,
      isolationLevel: isolationMatch ? isolationMatch[1] : null,
      savePoints,
      commitCount: (body.match(/COMMIT/gi) || []).length,
      rollbackCount: (body.match(/ROLLBACK/gi) || []).length,
      nestedTransactions: /BEGIN\s+TRAN[\s\S]*?BEGIN\s+TRAN/i.test(body),
      xactAbortOn: /SET\s+XACT_ABORT\s+ON/i.test(body)
    };
  }

  /**
   * Analyze flow control structures
   */
  private analyzeFlowControl(body: string, errors: string[]): SPFlowControl {
    const hasTryCatch = this.patterns.tryCatch.test(body);
    const hasWhile = /WHILE\s+/i.test(body);
    const hasCursor = /CURSOR/i.test(body);
    const hasIfElse = this.patterns.ifElse.test(body);
    const hasCase = /CASE\s+/i.test(body);
    const hasGoto = /GOTO\s+/i.test(body);
    const hasReturn = /RETURN\b/i.test(body);

    // Count cursors
    const cursorMatches = body.match(/DECLARE\s+@?\w+\s+CURSOR/gi) || [];
    const cursorCount = cursorMatches.length;

    // Estimate loop depth
    let loopDepth = 0;
    let tempBody = body;
    while (tempBody.includes('WHILE')) {
      loopDepth++;
      tempBody = tempBody.replace('WHILE', '');
    }

    // Count conditional blocks
    const conditionalBlocks = (body.match(/IF\s+/gi) || []).length;

    // Estimate complexity
    let estimatedComplexity: SPFlowControl['estimatedComplexity'] = 'simple';
    if (hasCursor || loopDepth > 2) {
      estimatedComplexity = 'very_complex';
    } else if (hasWhile || conditionalBlocks > 5 || hasGoto) {
      estimatedComplexity = 'complex';
    } else if (hasIfElse || hasTryCatch || conditionalBlocks > 2) {
      estimatedComplexity = 'moderate';
    }

    return {
      hasTryCatch,
      hasWhile,
      hasCursor,
      hasIfElse,
      hasCase,
      hasGoto,
      hasReturn,
      cursorCount,
      loopDepth,
      conditionalBlocks,
      estimatedComplexity
    };
  }

  /**
   * Analyze dynamic SQL usage
   */
  private analyzeDynamicSQL(body: string, errors: string[]): SPDynamicSQLInfo {
    const hasDynamicSQL = this.patterns.dynamicSQL.test(body);
    const spExecutesQLUsage = /sp_executesql/i.test(body);
    const execUsage = /EXEC\s*\(/i.test(body) && !spExecutesQLUsage;

    // Find injected parameters
    const injectedParameters: string[] = [];
    const paramPattern = /@(\w+)\s*=/g;
    let match;
    while ((match = paramPattern.exec(body)) !== null) {
      injectedParameters.push(match[1]);
    }

    // Find dynamic SQL patterns
    const dynamicSQLPatterns: string[] = [];
    const dynamicPattern = /N'([^']+)'|'([^']+)'/g;
    while ((match = dynamicPattern.exec(body)) !== null) {
      const sql = match[1] || match[2];
      if (sql && (sql.includes('SELECT') || sql.includes('INSERT') || 
          sql.includes('UPDATE') || sql.includes('DELETE'))) {
        dynamicSQLPatterns.push(sql.substring(0, 100));
      }
    }

    // Assess SQL injection risk
    let sqlInjectionRisk: SPDynamicSQLInfo['sqlInjectionRisk'] = 'none';
    if (hasDynamicSQL) {
      if (body.includes('+') && /@/.test(body)) {
        // String concatenation with parameters - HIGH risk
        sqlInjectionRisk = 'high';
      } else if (spExecutesQLUsage) {
        // Parameterized - LOW risk
        sqlInjectionRisk = 'low';
      } else {
        sqlInjectionRisk = 'medium';
      }
    }

    return {
      hasDynamicSQL,
      spExecutesQLUsage,
      execUsage,
      injectedParameters,
      sqlInjectionRisk,
      dynamicSQLPatterns
    };
  }

  /**
   * Calculate complexity metrics
   */
  private calculateComplexity(body: string, flowControl: SPFlowControl, tableAccess: SPTableAccessPattern[]): SPComplexityMetrics {
    const lines = body.split('\n');
    const totalLines = lines.length;
    
    const codeLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('--');
    }).length;

    const commentLines = totalLines - codeLines;

    // Cyclomatic complexity (simplified)
    let cyclomaticComplexity = 1;
    cyclomaticComplexity += (body.match(/IF\s+/gi) || []).length;
    cyclomaticComplexity += (body.match(/ELSE\s+/gi) || []).length;
    cyclomaticComplexity += (body.match(/WHILE\s+/gi) || []).length;
    cyclomaticComplexity += (body.match(/CASE\s+/gi) || []).length;
    cyclomaticComplexity += (body.match(/WHEN\s+/gi) || []).length;
    cyclomaticComplexity += (body.match(/\|\|/g) || []).length;
    cyclomaticComplexity += (body.match(/&&/g) || []).length;

    // Cognitive complexity (simplified)
    let cognitiveComplexity = cyclomaticComplexity;
    if (flowControl.hasCursor) cognitiveComplexity += 5;
    if (flowControl.hasGoto) cognitiveComplexity += 3;
    cognitiveComplexity += flowControl.loopDepth * 2;

    // Halstead volume (simplified estimation)
    const operators = (body.match(/[\+\-\*\/\=\<\>\!\&\|\~\^]/g) || []).length;
    const operands = (body.match(/@?\w+/g) || []).length;
    const vocabulary = operators + operands;
    const halsteadVolume = vocabulary > 0 ? 
      Math.round(operands * Math.log2(vocabulary)) : 0;

    // Maintainability index (simplified)
    const maintainabilityIndex = Math.max(0, Math.min(100,
      171 - 5.2 * Math.log(halsteadVolume) - 0.23 * cyclomaticComplexity - 16.2 * Math.log(codeLines)
    ));

    // Determine risk level
    let riskLevel: SPComplexityMetrics['riskLevel'] = 'low';
    if (cyclomaticComplexity > 20 || cognitiveComplexity > 30 || flowControl.hasCursor) {
      riskLevel = 'critical';
    } else if (cyclomaticComplexity > 15 || cognitiveComplexity > 20) {
      riskLevel = 'high';
    } else if (cyclomaticComplexity > 10 || cognitiveComplexity > 15) {
      riskLevel = 'medium';
    }

    // Estimate execution time
    let estimatedExecutionTime: SPComplexityMetrics['estimatedExecutionTime'] = 'moderate';
    if (flowControl.hasCursor || flowControl.loopDepth > 1) {
      estimatedExecutionTime = 'slow';
    } else if (cyclomaticComplexity < 5 && tableAccess.length <= 2) {
      estimatedExecutionTime = 'fast';
    }

    // Migration complexity
    let migrationComplexity: SPComplexityMetrics['migrationComplexity'] = 'simple';
    if (flowControl.hasCursor || flowControl.hasDynamicSQL) {
      migrationComplexity = 'very_complex';
    } else if (flowControl.hasWhile || flowControl.hasGoto || tableAccess.length > 5) {
      migrationComplexity = 'complex';
    } else if (flowControl.hasTryCatch || tableAccess.length > 3) {
      migrationComplexity = 'moderate';
    }

    return {
      totalLines,
      codeLines,
      commentLines,
      cyclomaticComplexity,
      cognitiveComplexity,
      halsteadVolume,
      maintainabilityIndex: Math.round(maintainabilityIndex),
      estimatedExecutionTime,
      riskLevel,
      migrationComplexity
    };
  }

  /**
   * Extract sub-procedure calls
   */
  private extractSubProcedureCalls(body: string, errors: string[]): SPSubProcedureCall[] {
    const calls: SPSubProcedureCall[] = [];
    const pattern = /(?:EXEC|EXECUTE)\s+(\[?(\w+)\]?\.)?(\[?(SP_\w+)\]?)(?:\s+(.*?))?(?:;|$)/gi;
    let match;

    while ((match = pattern.exec(body)) !== null) {
      const procedureName = match[4] || match[3];
      const paramsStr = match[5] || '';
      
      // Parse parameters
      const parameters = this.parseExecParameters(paramsStr);

      calls.push({
        procedureName,
        parameters,
        lineNumber: this.getLineNumber(body, match.index),
        returnType: 'unknown'
      });
    }

    return calls;
  }

  /**
   * Parse EXEC statement parameters
   */
  private parseExecParameters(paramsStr: string): SPSubProcedureCall['parameters'] {
    const parameters: SPSubProcedureCall['parameters'] = [];
    const parts = paramsStr.split(',').map(p => p.trim()).filter(p => p);

    for (const part of parts) {
      // Named parameter: @Name = Value
      const namedMatch = part.match(/@(\w+)\s*=\s*(.+)/);
      if (namedMatch) {
        parameters.push({
          name: namedMatch[1],
          value: namedMatch[2].trim(),
          isOutput: part.toUpperCase().includes('OUTPUT') || part.toUpperCase().includes('OUT')
        });
      } else {
        // Positional parameter
        parameters.push({
          name: null,
          value: part,
          isOutput: part.toUpperCase().includes('OUTPUT') || part.toUpperCase().includes('OUT')
        });
      }
    }

    return parameters;
  }

  /**
   * Extract temp tables
   */
  private extractTempTables(body: string, errors: string[]): SPTempTable[] {
    const tempTables: SPTempTable[] = [];
    
    // Local temp tables (#Table)
    const localTempPattern = /CREATE\s+TABLE\s+#(\w+)\s*\(([^)]+)\)/gi;
    let match;
    while ((match = localTempPattern.exec(body)) !== null) {
      const name = `#${match[1]}`;
      const columnsStr = match[2];
      const columns = this.parseColumns(columnsStr);

      tempTables.push({
        name,
        type: 'local_temp',
        columns,
        created: this.getLineNumber(body, match.index),
        dropped: new RegExp(`DROP\\s+TABLE\\s+${name}`, 'i').test(body),
        usageCount: (body.match(new RegExp(name, 'gi')) || []).length
      });
    }

    // Table variables (@Table)
    const tableVarPattern = /DECLARE\s+@(\w+)\s+TABLE\s*\(([^)]+)\)/gi;
    while ((match = tableVarPattern.exec(body)) !== null) {
      const name = `@${match[1]}`;
      const columnsStr = match[2];
      const columns = this.parseColumns(columnsStr);

      tempTables.push({
        name,
        type: 'table_variable',
        columns,
        created: this.getLineNumber(body, match.index),
        dropped: false,
        usageCount: (body.match(new RegExp(name, 'gi')) || []).length
      });
    }

    return tempTables;
  }

  /**
   * Parse column definitions
   */
  private parseColumns(columnsStr: string): { name: string; type: string }[] {
    const columns: { name: string; type: string }[] = [];
    const parts = columnsStr.split(',');

    for (const part of parts) {
      const trimmed = part.trim();
      const match = trimmed.match(/(\[?(\w+)\]?)\s+([\w\s\(\),]+)/);
      if (match) {
        columns.push({
          name: match[2] || match[1],
          type: match[3].trim().split(' ')[0] // First word is type
        });
      }
    }

    return columns;
  }

  /**
   * Extract CTE definitions
   */
  private extractCTEs(body: string, errors: string[]): SPCTEDefinition[] {
    const ctes: SPCTEDefinition[] = [];
    const pattern = /WITH\s+(\w+)\s*(?:\(([^)]+)\))?\s*AS\s*\(([^)]+(?:\([^)]*\)[^)]*)*)\)/gi;
    let match;

    while ((match = pattern.exec(body)) !== null) {
      const name = match[1];
      const columns = match[2] ? match[2].split(',').map(c => c.trim()) : [];
      const cteBody = match[3];
      const isRecursive = cteBody.includes(name);

      ctes.push({
        name,
        isRecursive,
        columns,
        body: cteBody.substring(0, 500),
        usageCount: (body.substring(match.index + match[0].length).match(new RegExp(name, 'gi')) || []).length
      });
    }

    return ctes;
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidence(
    parameters: SPParameterDetail[],
    tableAccess: SPTableAccessPattern[],
    businessRules: SPBusinessRuleDetail[],
    errorCodes: SPErrorCodeDetail[],
    parsingErrors: string[]
  ): number {
    let score = 0.5; // Base score

    // Parameters found
    if (parameters.length > 0) score += 0.15;

    // Tables identified
    if (tableAccess.length > 0) score += 0.15;

    // Business rules extracted
    if (businessRules.length > 0) score += 0.1;

    // Error codes found
    if (errorCodes.length > 0) score += 0.05;

    // Deduct for parsing errors
    score -= parsingErrors.length * 0.05;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Get default transaction info
   */
  private getDefaultTransactionInfo(): SPTransactionInfo {
    return {
      hasTransaction: false,
      transactionName: null,
      isolationLevel: null,
      savePoints: [],
      commitCount: 0,
      rollbackCount: 0,
      nestedTransactions: false,
      xactAbortOn: false
    };
  }

  /**
   * Get default flow control
   */
  private getDefaultFlowControl(): SPFlowControl {
    return {
      hasTryCatch: false,
      hasWhile: false,
      hasCursor: false,
      hasIfElse: false,
      hasCase: false,
      hasGoto: false,
      hasReturn: false,
      cursorCount: 0,
      loopDepth: 0,
      conditionalBlocks: 0,
      estimatedComplexity: 'simple'
    };
  }

  /**
   * Get default dynamic SQL info
   */
  private getDefaultDynamicSQLInfo(): SPDynamicSQLInfo {
    return {
      hasDynamicSQL: false,
      spExecutesQLUsage: false,
      execUsage: false,
      injectedParameters: [],
      sqlInjectionRisk: 'none',
      dynamicSQLPatterns: []
    };
  }

  /**
   * Get default complexity
   */
  private getDefaultComplexity(): SPComplexityMetrics {
    return {
      totalLines: 0,
      codeLines: 0,
      commentLines: 0,
      cyclomaticComplexity: 1,
      cognitiveComplexity: 1,
      halsteadVolume: 0,
      maintainabilityIndex: 100,
      estimatedExecutionTime: 'unknown',
      riskLevel: 'low',
      migrationComplexity: 'simple'
    };
  }
}

// Export singleton instance
export const spBodyAnalyzer = new SPBodyAnalyzer();

// Export convenience function
export function analyzeSPBody(procedureName: string, schema: string, bodyText: string): SPBodyAnalysis {
  return spBodyAnalyzer.analyze(procedureName, schema, bodyText);
}
