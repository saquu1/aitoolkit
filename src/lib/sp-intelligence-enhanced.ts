// =============================================================================
// Enhanced Stored Procedure Intelligence Engine - Type Definitions
// =============================================================================
// This file provides type definitions for SP intelligence extraction
// =============================================================================

// Re-export types from sp-parser.ts for compatibility
export type SPActionType =
  | 'dropdown'
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'search'
  | 'report'
  | 'validate'
  | 'process'
  | 'import'
  | 'export'
  | 'calculate'
  | 'workflow'
  | 'unknown';

/**
 * Validation Rule extracted from SP logic
 */
export interface ExtractedValidationRule {
  id: string;
  type: 'required' | 'unique' | 'range' | 'pattern' | 'exists' | 'custom' | 'business';
  columnName: string;
  tableName?: string;
  description: string;
  condition?: string;
  errorMessage?: string;
  severity: 'error' | 'warning' | 'info';
  codeSnippet?: string;
  lineNumber?: number;
}

/**
 * Form mode detection result
 */
export interface FormModeDetection {
  mode: 'create' | 'edit' | 'both' | 'view' | 'unknown';
  confidence: number;
  indicators: string[];
  primaryKeyParameter?: string;
  insertTables: string[];
  updateTables: string[];
  conditionalLogic: string[];
}

/**
 * Index recommendation from SP analysis
 */
export interface IndexRecommendation {
  tableName: string;
  columns: string[];
  indexType: 'clustered' | 'nonclustered' | 'unique' | 'covering';
  reason: 'where_clause' | 'join_condition' | 'order_by' | 'group_by' | 'frequent_filter';
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: string;
  supportingCode?: string;
}

/**
 * Missing constraint suggestion
 */
export interface MissingConstraintSuggestion {
  tableName: string;
  columnName: string;
  constraintType: 'UNIQUE' | 'CHECK' | 'FOREIGN_KEY' | 'NOT_NULL' | 'DEFAULT';
  description: string;
  suggestedSQL: string;
  detectedInLogic: string;
  priority: 'high' | 'medium' | 'low';
  rationale: string;
}

/**
 * UI Component suggestion from SP
 */
export interface UIComponentSuggestion {
  parameterName: string;
  dataType: string;
  suggestedComponent: 'text_input' | 'dropdown' | 'date_picker' | 'checkbox' | 'textarea' | 'number_input' | 'file_upload' | 'hidden' | 'auto_complete' | 'radio_group';
  isRequired: boolean;
  defaultValue?: string;
  options?: { label: string; value: string }[];
  validation: ExtractedValidationRule[];
  placeholder?: string;
  label?: string;
  displayOrder: number;
}

/**
 * Workflow step detected in SP
 */
export interface WorkflowStep {
  stepNumber: number;
  operation: string;
  tableName?: string;
  description: string;
  isConditional: boolean;
  condition?: string;
  onFailure?: 'rollback' | 'continue' | 'throw_error';
}

/**
 * Transaction pattern analysis
 */
export interface TransactionPattern {
  hasTransaction: boolean;
  transactionType: 'explicit' | 'implicit' | 'none';
  isolationLevel?: string;
  savePoints: string[];
  errorHandling: 'try_catch' | 'error_check' | 'none';
  rollbackConditions: string[];
  affectedTables: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * API Endpoint suggestion
 */
export interface APIEndpointSuggestion {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  operation: string;
  parameters: APIParam[];
  requestBody?: Record<string, unknown>;
  responseBody?: Record<string, unknown>;
  description: string;
}

/**
 * API Parameter
 */
export interface APIParam {
  name: string;
  type: string;
  required: boolean;
  source: 'path' | 'query' | 'body';
  description?: string;
}

/**
 * Table relationship from JOIN analysis
 */
export interface TableRelationship {
  fromTable: string;
  toTable: string;
  fromColumn: string;
  toColumn: string;
  relationshipType: 'one-to-one' | 'one-to-many' | 'many-to-many';
  joinType: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  confidence: number;
}

/**
 * Complete Enhanced SP Intelligence
 */
export interface EnhancedSPIntelligence {
  procedureName: string;
  schemaName: string;
  
  // Basic classification
  actionType: SPActionType;
  moduleName: string;
  moduleConfidence: number;
  
  // Enhanced features
  validationRules: ExtractedValidationRule[];
  formMode: FormModeDetection;
  indexRecommendations: IndexRecommendation[];
  missingConstraints: MissingConstraintSuggestion[];
  uiComponentSuggestions: UIComponentSuggestion[];
  workflowSteps: WorkflowStep[];
  transactionPattern: TransactionPattern;
  apiEndpoint: APIEndpointSuggestion;
  tableRelationships: TableRelationship[];
  
  // Tables
  tablesReferenced: string[];
  tablesModified: string[];
  discoveredTables: string[];
  
  // Metrics
  complexity: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  
  // Raw
  parameters: any[];
  body: string;
}

/**
 * Create a basic SP intelligence result from SP data
 */
export function createEnhancedSPIntelligenceEngine(tables: any[]): {
  analyzeProcedure: (sp: any) => EnhancedSPIntelligence;
} {
  return {
    analyzeProcedure: (sp: any): EnhancedSPIntelligence => {
      const name = sp.procedureName || 'Unknown';
      const body = sp.body || '';
      
      // Basic classification
      const actionType = detectActionType(name, body);
      const moduleName = detectModule(name, body);
      
      // Extract table references
      const tablesReferenced = extractTablesReferenced(body);
      const tablesModified = extractTablesModified(body);
      
      // Detect form mode
      const formMode = detectFormMode(body, sp.parameters || [], name);
      
      // Extract validation rules
      const validationRules = extractValidationRules(body, name);
      
      // Extract UI suggestions
      const uiComponentSuggestions = extractUISuggestions(sp.parameters || [], validationRules);
      
      // Analyze transaction pattern
      const transactionPattern = analyzeTransactionPattern(body);
      
      // Extract workflow steps
      const workflowSteps = extractWorkflowSteps(body);
      
      // Generate API endpoint
      const apiEndpoint = generateAPIEndpoint(name, actionType, sp.parameters || []);
      
      // Calculate complexity
      const complexity = calculateComplexity(body);
      const riskLevel = assessRiskLevel(body, complexity, transactionPattern);
      
      return {
        procedureName: name,
        schemaName: sp.schemaName || 'dbo',
        actionType,
        moduleName,
        moduleConfidence: 70,
        validationRules,
        formMode,
        indexRecommendations: [],
        missingConstraints: [],
        uiComponentSuggestions,
        workflowSteps,
        transactionPattern,
        apiEndpoint,
        tableRelationships: [],
        tablesReferenced,
        tablesModified,
        discoveredTables: [],
        complexity,
        riskLevel,
        parameters: sp.parameters || [],
        body,
      };
    }
  };
}

// Helper functions
function detectActionType(name: string, body: string): SPActionType {
  const nameLower = name.toLowerCase();
  
  if (nameLower.includes('ddl') || nameLower.includes('dropdown')) return 'dropdown';
  if (nameLower.includes('get') && !nameLower.includes('getall')) return 'read';
  if (nameLower.includes('add') || nameLower.includes('create') || nameLower.includes('insert')) return 'create';
  if (nameLower.includes('update') || nameLower.includes('edit') || nameLower.includes('modify')) return 'update';
  if (nameLower.includes('delete') || nameLower.includes('remove')) return 'delete';
  if (nameLower.includes('search') || nameLower.includes('find') || nameLower.includes('getall')) return 'search';
  if (nameLower.includes('report') || nameLower.includes('rpt')) return 'report';
  if (nameLower.includes('validate') || nameLower.includes('check')) return 'validate';
  if (nameLower.includes('process') || nameLower.includes('execute')) return 'process';
  if (nameLower.includes('import')) return 'import';
  if (nameLower.includes('export')) return 'export';
  
  return 'unknown';
}

function detectModule(name: string, body: string): string {
  const searchText = `${name} ${body}`.toLowerCase();
  
  const moduleKeywords: Record<string, string[]> = {
    'Patient': ['patient', 'mrn', 'demographic'],
    'Appointment': ['appointment', 'schedule', 'booking'],
    'Billing': ['billing', 'invoice', 'payment', 'charge'],
    'Pharmacy': ['pharmacy', 'medication', 'drug', 'prescription'],
    'Laboratory': ['lab', 'test', 'specimen', 'result'],
    'Radiology': ['radiology', 'imaging', 'xray', 'ct', 'mri'],
    'Inventory': ['inventory', 'stock', 'item', 'supply'],
    'HR': ['employee', 'staff', 'payroll'],
    'Finance': ['finance', 'account', 'journal', 'ledger'],
    'Admin': ['user', 'role', 'permission', 'config'],
  };
  
  for (const [module, keywords] of Object.entries(moduleKeywords)) {
    if (keywords.some(kw => searchText.includes(kw))) {
      return module;
    }
  }
  
  return 'Core';
}

function extractTablesReferenced(body: string): string[] {
  const tables: string[] = [];
  const patterns = [
    /FROM\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/gi,
    /JOIN\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/gi,
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(body)) !== null) {
      if (match[2] && !tables.includes(match[2])) {
        tables.push(match[2]);
      }
    }
  }
  
  return tables;
}

function extractTablesModified(body: string): string[] {
  const tables: string[] = [];
  const patterns = [
    /INSERT\s+INTO\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/gi,
    /UPDATE\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/gi,
    /DELETE\s+FROM\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/gi,
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(body)) !== null) {
      if (match[2] && !tables.includes(match[2])) {
        tables.push(match[2]);
      }
    }
  }
  
  return tables;
}

function detectFormMode(body: string, parameters: any[], name: string): FormModeDetection {
  const indicators: string[] = [];
  const insertTables: string[] = [];
  const updateTables: string[] = [];
  
  // Check for INSERT operations
  const insertMatches = body.matchAll(/INSERT\s+(?:INTO\s+)?(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/gi);
  for (const match of insertMatches) {
    insertTables.push(match[2]);
    indicators.push(`INSERT into ${match[2]}`);
  }
  
  // Check for UPDATE operations
  const updateMatches = body.matchAll(/UPDATE\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/gi);
  for (const match of updateMatches) {
    updateTables.push(match[2]);
    indicators.push(`UPDATE on ${match[2]}`);
  }
  
  // Determine mode
  let mode: FormModeDetection['mode'] = 'unknown';
  let confidence = 50;
  
  if (insertTables.length > 0 && updateTables.length === 0) {
    mode = 'create';
    confidence = 85;
  } else if (updateTables.length > 0 && insertTables.length === 0) {
    mode = 'edit';
    confidence = 85;
  } else if (insertTables.length > 0 && updateTables.length > 0) {
    mode = 'both';
    confidence = 90;
  }
  
  return {
    mode,
    confidence,
    indicators,
    insertTables,
    updateTables,
    conditionalLogic: [],
  };
}

function extractValidationRules(body: string, spName: string): ExtractedValidationRule[] {
  const rules: ExtractedValidationRule[] = [];
  let ruleId = 0;
  
  // NULL checks
  const nullCheckPattern = /IF\s+@(\w+)\s+IS\s+NULL\s*(?:BEGIN)?/gi;
  let match;
  while ((match = nullCheckPattern.exec(body)) !== null) {
    rules.push({
      id: `${spName}_val_${++ruleId}`,
      type: 'required',
      columnName: match[1],
      description: `Parameter @${match[1]} is required`,
      severity: 'error',
      codeSnippet: match[0],
    });
  }
  
  // EXISTS checks
  const existsPattern = /IF\s+NOT\s+EXISTS\s*\(\s*SELECT[^)]+WHERE\s+(\w+)\s*=\s*@(\w+)/gi;
  while ((match = existsPattern.exec(body)) !== null) {
    rules.push({
      id: `${spName}_val_${++ruleId}`,
      type: 'exists',
      columnName: match[2],
      tableName: match[1],
      description: `@${match[2]} must exist in ${match[1]}`,
      severity: 'error',
      codeSnippet: match[0],
    });
  }
  
  return rules;
}

function extractUISuggestions(parameters: any[], validationRules: ExtractedValidationRule[]): UIComponentSuggestion[] {
  return parameters
    .filter((p: any) => !p.isOutput)
    .map((p: any, idx: number) => {
      const paramName = p.name?.replace('@', '') || '';
      const paramValidations = validationRules.filter(r => 
        r.columnName.toLowerCase() === paramName.toLowerCase()
      );
      
      return {
        parameterName: p.name || `@param${idx}`,
        dataType: p.dataType || 'NVARCHAR',
        suggestedComponent: inferUIComponent(paramName, p.dataType),
        isRequired: !p.isOutput && (paramValidations.some(v => v.type === 'required') || !p.defaultValue),
        defaultValue: p.defaultValue,
        validation: paramValidations,
        placeholder: `Enter ${paramName.toLowerCase()}`,
        label: formatLabel(paramName),
        displayOrder: idx,
      };
    });
}

function inferUIComponent(name: string, dataType: string): UIComponentSuggestion['suggestedComponent'] {
  const nameLower = name.toLowerCase();
  const type = dataType?.toUpperCase() || '';
  
  if (nameLower.includes('password')) return 'text_input';
  if (nameLower.includes('email')) return 'text_input';
  if (nameLower.includes('phone') || nameLower.includes('mobile')) return 'text_input';
  if (nameLower.includes('date') || nameLower.includes('dob')) return 'date_picker';
  if (nameLower.includes('description') || nameLower.includes('notes')) return 'textarea';
  if (nameLower.includes('isactive') || nameLower.includes('isenabled')) return 'checkbox';
  if (nameLower.includes('status') || nameLower.includes('type')) return 'dropdown';
  if (type === 'BIT') return 'checkbox';
  if (type === 'DATE' || type === 'DATETIME') return 'date_picker';
  if (['INT', 'BIGINT', 'DECIMAL', 'MONEY'].includes(type)) return 'number_input';
  if (nameLower.endsWith('id') && !nameLower.startsWith('is')) return 'hidden';
  
  return 'text_input';
}

function formatLabel(columnName: string): string {
  return columnName
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

function analyzeTransactionPattern(body: string): TransactionPattern {
  const hasTransaction = /\bBEGIN\s+TRAN/i.test(body);
  const hasTryCatch = /\bBEGIN\s+TRY\b/i.test(body);
  
  return {
    hasTransaction,
    transactionType: hasTransaction ? 'explicit' : 'none',
    savePoints: [],
    errorHandling: hasTryCatch ? 'try_catch' : /@@ERROR/i.test(body) ? 'error_check' : 'none',
    rollbackConditions: [],
    affectedTables: [],
    riskLevel: hasTransaction && !hasTryCatch ? 'high' : 'low',
  };
}

function extractWorkflowSteps(body: string): WorkflowStep[] {
  const steps: WorkflowStep[] = [];
  let stepNumber = 0;
  
  const operationPattern = /(INSERT\s+INTO|UPDATE|DELETE\s+FROM|SELECT)\s+(?:\[?(\w+)\]?\.)?\[?(\w+)?\]?/gi;
  let match;
  const seen = new Set<string>();
  
  while ((match = operationPattern.exec(body)) !== null) {
    const operation = match[1].toUpperCase();
    const tableName = match[3] || match[2] || '';
    const key = `${operation}_${tableName}`;
    
    if (!seen.has(key) && tableName) {
      seen.add(key);
      steps.push({
        stepNumber: ++stepNumber,
        operation,
        tableName,
        description: `${operation} operation on ${tableName}`,
        isConditional: false,
      });
    }
  }
  
  return steps;
}

function generateAPIEndpoint(name: string, actionType: SPActionType, parameters: any[]): APIEndpointSuggestion {
  const entityMatch = name.match(/SP_(?:Get|Add|Update|Delete|Search|DDL_)?(\w+)/i);
  const entity = entityMatch ? entityMatch[1].toLowerCase() : 'entity';
  
  const methodMap: Record<SPActionType, 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'> = {
    dropdown: 'GET',
    read: 'GET',
    create: 'POST',
    update: 'PUT',
    delete: 'DELETE',
    search: 'GET',
    report: 'GET',
    validate: 'POST',
    process: 'POST',
    import: 'POST',
    export: 'GET',
    calculate: 'POST',
    workflow: 'POST',
    unknown: 'POST',
  };
  
  const pathMap: Record<SPActionType, string> = {
    dropdown: `/api/${entity}/dropdown`,
    read: `/api/${entity}/:id`,
    create: `/api/${entity}`,
    update: `/api/${entity}/:id`,
    delete: `/api/${entity}/:id`,
    search: `/api/${entity}/search`,
    report: `/api/reports/${entity}`,
    validate: `/api/${entity}/validate`,
    process: `/api/${entity}/process`,
    import: `/api/${entity}/import`,
    export: `/api/${entity}/export`,
    calculate: `/api/${entity}/calculate`,
    workflow: `/api/${entity}/workflow`,
    unknown: `/api/${entity}/action`,
  };
  
  return {
    method: methodMap[actionType],
    path: pathMap[actionType],
    operation: actionType,
    parameters: parameters
      .filter((p: any) => !p.isOutput)
      .map((p: any) => ({
        name: p.name?.replace('@', '') || '',
        type: mapDataType(p.dataType),
        required: !p.defaultValue,
        source: 'body' as const,
      })),
    description: `${actionType} operation for ${entity}`,
  };
}

function mapDataType(sqlType: string): string {
  const type = sqlType?.toUpperCase() || '';
  
  if (['INT', 'BIGINT', 'SMALLINT', 'TINYINT'].includes(type)) return 'number';
  if (['DECIMAL', 'NUMERIC', 'FLOAT', 'MONEY'].includes(type)) return 'number';
  if (['BIT'].includes(type)) return 'boolean';
  if (['DATE', 'DATETIME', 'DATETIME2'].includes(type)) return 'string';
  if (['UNIQUEIDENTIFIER'].includes(type)) return 'string';
  
  return 'string';
}

function calculateComplexity(body: string): number {
  let score = 0;
  score += (body.match(/\bIF\b/gi) || []).length * 3;
  score += (body.match(/\bWHILE\b/gi) || []).length * 5;
  score += (body.match(/\bCURSOR\b/gi) || []).length * 10;
  score += (body.match(/#/g) || []).length * 3;
  if (/sp_executesql/i.test(body)) score += 15;
  return score;
}

function assessRiskLevel(
  body: string,
  complexity: number,
  transaction: TransactionPattern
): 'low' | 'medium' | 'high' | 'critical' {
  if (/sp_executesql/i.test(body)) return 'critical';
  if (transaction.hasTransaction && transaction.errorHandling === 'none') return 'high';
  if (complexity > 40) return 'high';
  if (complexity > 20 || body.match(/DELETE\s+FROM/i)) return 'medium';
  return 'low';
}
