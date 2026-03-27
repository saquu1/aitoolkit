// =============================================================================
// View Analyzer Engine - SQL View Intelligence
// =============================================================================
// SQL Views reveal report requirements and hidden relationships
// =============================================================================

import { TableDef } from './types';

/**
 * View Definition with intelligence
 */
export interface ViewDef {
  schemaName: string;
  viewName: string;
  body: string;
  sourceTables: string[];
  joinRelationships: ViewJoinRelationship[];
  columns: ViewColumn[];
  calculatedFields: CalculatedField[];
  caseStatements: CaseStatementMapping[];
  purpose: 'report' | 'dashboard' | 'lookup' | 'api' | 'unknown';
  complexity: number;
  businessContext: string;
}

/**
 * View Column with metadata
 */
export interface ViewColumn {
  name: string;
  sourceTable: string | null;
  sourceColumn: string | null;
  dataType: string;
  isCalculated: boolean;
  isAggregated: boolean;
  aggregationFunction?: string;
}

/**
 * Calculated field in view
 */
export interface CalculatedField {
  columnName: string;
  expression: string;
  description: string;
  dataType: string;
  businessMeaning: string;
}

/**
 * JOIN relationship in view
 */
export interface ViewJoinRelationship {
  fromTable: string;
  toTable: string;
  fromColumn?: string;
  toColumn?: string;
  joinType: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS';
  implicitFK: boolean;
}

/**
 * CASE statement mapping (reveals enum values)
 */
export interface CaseStatementMapping {
  columnName: string;
  mappingType: 'value_to_label' | 'id_to_name' | 'status_mapping' | 'range_mapping';
  mappings: { when: string; then: string }[];
  elseValue?: string;
  suggestedEnum: string;
  businessRule: string;
}

/**
 * View analysis result
 */
export interface ViewAnalysisResult {
  view: ViewDef;
  suggestedReportType: string;
  suggestedDashboardWidgets: string[];
  hiddenRelationships: HiddenRelationship[];
  enumSuggestions: EnumSuggestion[];
  apiEndpointSuggestions: string[];
}

/**
 * Hidden relationship discovered from view
 */
export interface HiddenRelationship {
  fromTable: string;
  toTable: string;
  discoveredVia: string;
  relationshipType: 'one_to_many' | 'many_to_many' | 'one_to_one';
  confidence: number;
}

/**
 * Enum suggestion from CASE statements
 */
export interface EnumSuggestion {
  enumName: string;
  values: { value: string; label: string }[];
  sourceTable: string;
  sourceColumn: string;
  usageCount: number;
}

/**
 * View Analyzer Engine
 */
export class ViewAnalyzerEngine {
  private existingTables: Set<string>;

  constructor(tables: TableDef[] = []) {
    this.existingTables = new Set(tables.map(t => t.tableName.toLowerCase()));
  }

  /**
   * Parse CREATE VIEW statement
   */
  parseView(sql: string): ViewDef | null {
    const viewRegex = /CREATE\s+VIEW\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s+AS\s+([\s\S]*?)(?=GO|CREATE\s+VIEW|$)/i;
    const match = sql.match(viewRegex);
    
    if (!match) return null;
    
    const schemaName = match[1] || 'dbo';
    const viewName = match[2];
    const body = match[3].trim();
    
    const sourceTables = this.extractSourceTables(body);
    const joinRelationships = this.extractJoinRelationships(body);
    const columns = this.extractColumns(body, sourceTables);
    const calculatedFields = this.extractCalculatedFields(body);
    const caseStatements = this.extractCaseStatements(body);
    const purpose = this.determinePurpose(viewName, body);
    const complexity = this.calculateComplexity(body);
    const businessContext = this.inferBusinessContext(viewName, body);
    
    return {
      schemaName,
      viewName,
      body,
      sourceTables,
      joinRelationships,
      columns,
      calculatedFields,
      caseStatements,
      purpose,
      complexity,
      businessContext,
    };
  }

  /**
   * Analyze a view and generate insights
   */
  analyzeView(viewDef: ViewDef): ViewAnalysisResult {
    const suggestedReportType = this.suggestReportType(viewDef);
    const suggestedDashboardWidgets = this.suggestDashboardWidgets(viewDef);
    const hiddenRelationships = this.discoverHiddenRelationships(viewDef);
    const enumSuggestions = this.generateEnumSuggestions(viewDef);
    const apiEndpointSuggestions = this.suggestAPIEndpoints(viewDef);
    
    return {
      view: viewDef,
      suggestedReportType,
      suggestedDashboardWidgets,
      hiddenRelationships,
      enumSuggestions,
      apiEndpointSuggestions,
    };
  }

  /**
   * Parse and analyze multiple views
   */
  parseAndAnalyzeViews(sql: string): ViewAnalysisResult[] {
    const results: ViewAnalysisResult[] = [];
    const viewRegex = /CREATE\s+VIEW[\s\S]*?(?=GO|CREATE\s+VIEW|$)/gi;
    
    let match;
    while ((match = viewRegex.exec(sql)) !== null) {
      const viewDef = this.parseView(match[0]);
      if (viewDef) {
        results.push(this.analyzeView(viewDef));
      }
    }
    
    return results;
  }

  /**
   * Extract source tables from view body
   */
  private extractSourceTables(body: string): string[] {
    const tables: Set<string> = new Set();
    
    // FROM clause
    const fromMatch = body.match(/FROM\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/i);
    if (fromMatch) {
      tables.add(fromMatch[2]);
    }
    
    // JOIN clauses
    const joinRegex = /JOIN\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/gi;
    let match;
    while ((match = joinRegex.exec(body)) !== null) {
      tables.add(match[2]);
    }
    
    return Array.from(tables);
  }

  /**
   * Extract JOIN relationships from view
   */
  private extractJoinRelationships(body: string): ViewJoinRelationship[] {
    const relationships: ViewJoinRelationship[] = [];
    
    // Find FROM table first
    const fromMatch = body.match(/FROM\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/i);
    const fromTable = fromMatch ? fromMatch[2] : '';
    
    // Parse JOINs
    const joinRegex = /(INNER|LEFT|RIGHT|FULL|CROSS)\s+JOIN\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s*(?:AS\s+)?(\w+)?\s*ON\s+([^\n]+)/gi;
    let match;
    
    while ((match = joinRegex.exec(body)) !== null) {
      const joinType = match[1] as ViewJoinRelationship['joinType'];
      const toTable = match[3];
      const onClause = match[5];
      
      // Parse ON clause
      const onMatch = onClause.match(/(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/i);
      
      relationships.push({
        fromTable,
        toTable,
        fromColumn: onMatch ? (onMatch[1].toLowerCase() === fromTable.toLowerCase() ? onMatch[2] : onMatch[4]) : undefined,
        toColumn: onMatch ? (onMatch[3].toLowerCase() === toTable.toLowerCase() ? onMatch[4] : onMatch[2]) : undefined,
        joinType,
        implicitFK: true,
      });
    }
    
    return relationships;
  }

  /**
   * Extract column definitions from view
   */
  private extractColumns(body: string, sourceTables: string[]): ViewColumn[] {
    const columns: ViewColumn[] = [];
    
    // Extract SELECT list
    const selectMatch = body.match(/SELECT\s+([\s\S]*?)\s+FROM/i);
    if (!selectMatch) return columns;
    
    const selectList = selectMatch[1];
    
    // Parse each column
    const parts = this.splitSelectList(selectList);
    
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed || trimmed === '*') continue;
      
      const col = this.parseSelectColumn(trimmed, sourceTables);
      if (col) {
        columns.push(col);
      }
    }
    
    return columns;
  }

  /**
   * Split SELECT list on commas (not inside parentheses)
   */
  private splitSelectList(list: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let current = '';
    
    for (const ch of list) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && depth === 0) {
        parts.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    
    if (current.trim()) {
      parts.push(current);
    }
    
    return parts;
  }

  /**
   * Parse individual SELECT column
   */
  private parseSelectColumn(expr: string, sourceTables: string[]): ViewColumn | null {
    // Handle alias: expression AS alias or expression alias
    const aliasMatch = expr.match(/(.+?)\s+(?:AS\s+)?(\w+)$/i);
    const alias = aliasMatch ? aliasMatch[2] : null;
    const expression = aliasMatch ? aliasMatch[1].trim() : expr.trim();
    
    // Check for aggregation functions
    const aggMatch = expression.match(/(COUNT|SUM|AVG|MIN|MAX)\s*\(\s*(DISTINCT\s+)?(.+?)\s*\)/i);
    if (aggMatch) {
      return {
        name: alias || `${aggMatch[1].toLowerCase()}_${aggMatch[3].replace(/\./g, '_')}`,
        sourceTable: null,
        sourceColumn: aggMatch[3],
        dataType: aggMatch[1] === 'COUNT' ? 'INT' : 'DECIMAL',
        isCalculated: true,
        isAggregated: true,
        aggregationFunction: aggMatch[1].toUpperCase(),
      };
    }
    
    // Check for table.column reference
    const tableColMatch = expression.match(/^(\w+)\.(\w+)$/);
    if (tableColMatch) {
      return {
        name: alias || tableColMatch[2],
        sourceTable: tableColMatch[1],
        sourceColumn: tableColMatch[2],
        dataType: 'UNKNOWN',
        isCalculated: false,
        isAggregated: false,
      };
    }
    
    // Check for simple column
    if (/^\w+$/.test(expression)) {
      return {
        name: alias || expression,
        sourceTable: sourceTables[0] || null,
        sourceColumn: expression,
        dataType: 'UNKNOWN',
        isCalculated: false,
        isAggregated: false,
      };
    }
    
    // Calculated expression
    return {
      name: alias || 'calculated',
      sourceTable: null,
      sourceColumn: null,
      dataType: 'UNKNOWN',
      isCalculated: true,
      isAggregated: false,
    };
  }

  /**
   * Extract calculated fields (like Age from DOB)
   */
  private extractCalculatedFields(body: string): CalculatedField[] {
    const fields: CalculatedField[] = [];
    
    // Age from DOB calculation
    const agePatterns = [
      /DATEDIFF\s*\(\s*YEAR\s*,\s*(\w+)\s*,\s*GETDATE\s*\(\s*\)\s*\)\s*(?:AS\s+(\w+))?/gi,
      /FLOOR\s*\(\s*DATEDIFF\s*\(\s*DAY\s*,\s*(\w+)\s*,\s*GETDATE\s*\(\s*\)\s*\)\s*\/\s*365\.?\d*\)\s*(?:AS\s+(\w+))?/gi,
    ];
    
    for (const pattern of agePatterns) {
      let match;
      while ((match = pattern.exec(body)) !== null) {
        fields.push({
          columnName: match[2] || 'Age',
          expression: match[0],
          description: 'Calculated age from date of birth',
          dataType: 'INT',
          businessMeaning: `Age calculated from ${match[1]}`,
        });
      }
    }
    
    // Full name concatenation
    const namePattern = /(\w+)\s*\+\s*' '\s*\+\s*(\w+)\s*(?:AS\s+(\w+))?/gi;
    let match;
    while ((match = namePattern.exec(body)) !== null) {
      fields.push({
        columnName: match[3] || 'FullName',
        expression: match[0],
        description: 'Concatenated full name',
        dataType: 'NVARCHAR',
        businessMeaning: `Full name from ${match[1]} and ${match[2]}`,
      });
    }
    
    // COALESCE / ISNULL
    const coalescePattern = /(?:COALESCE|ISNULL)\s*\(([^,]+),\s*([^)]+)\)\s*(?:AS\s+(\w+))?/gi;
    while ((match = coalescePattern.exec(body)) !== null) {
      fields.push({
        columnName: match[3] || match[1].trim(),
        expression: match[0],
        description: 'Null-safe field with default',
        dataType: 'UNKNOWN',
        businessMeaning: `${match[1].trim()} with fallback to ${match[2].trim()}`,
      });
    }
    
    return fields;
  }

  /**
   * Extract CASE statements (reveals enum mappings)
   */
  private extractCaseStatements(body: string): CaseStatementMapping[] {
    const statements: CaseStatementMapping[] = [];
    
    // Find CASE statements
    const caseRegex = /CASE\s+(?:([\w.]+)\s+)?([\s\S]*?)\s+END\s*(?:AS\s+(\w+))?/gi;
    let match;
    
    while ((match = caseRegex.exec(body)) !== null) {
      const sourceColumn = match[1] || '';
      const caseBody = match[2];
      const alias = match[3];
      
      // Parse WHEN/THEN clauses
      const mappings: { when: string; then: string }[] = [];
      const whenRegex = /WHEN\s+(.+?)\s+THEN\s+(.+?)(?=WHEN|ELSE|END)/gi;
      let whenMatch;
      
      while ((whenMatch = whenRegex.exec(caseBody)) !== null) {
        mappings.push({
          when: whenMatch[1].trim(),
          then: whenMatch[2].trim().replace(/^'|'$/g, ''),
        });
      }
      
      // Parse ELSE clause
      const elseMatch = caseBody.match(/ELSE\s+(.+?)(?=END)/i);
      const elseValue = elseMatch ? elseMatch[1].trim().replace(/^'|'$/g, '') : undefined;
      
      // Determine mapping type
      const mappingType = this.determineMappingType(mappings);
      
      // Suggest enum name
      const enumName = this.suggestEnumName(alias || sourceColumn, mappings);
      
      // Generate business rule description
      const businessRule = this.generateBusinessRule(alias || sourceColumn, mappings);
      
      statements.push({
        columnName: alias || sourceColumn.split('.').pop() || 'mapped_column',
        mappingType,
        mappings,
        elseValue,
        suggestedEnum: enumName,
        businessRule,
      });
    }
    
    return statements;
  }

  /**
   * Determine the type of CASE mapping
   */
  private determineMappingType(mappings: { when: string; then: string }[]): CaseStatementMapping['mappingType'] {
    if (mappings.length === 0) return 'value_to_label';
    
    const firstWhen = mappings[0].when;
    const firstThen = mappings[0].then;
    
    // Check if it's ID to name mapping
    if (/^\d+$/.test(firstWhen) && /^[A-Za-z]/.test(firstThen)) {
      return 'id_to_name';
    }
    
    // Check if it's status mapping
    if (/status/i.test(firstThen) || /active|inactive|pending|approved/i.test(firstThen)) {
      return 'status_mapping';
    }
    
    // Check if it's range mapping
    if (firstWhen.includes('>=') || firstWhen.includes('<=') || firstWhen.includes('BETWEEN')) {
      return 'range_mapping';
    }
    
    return 'value_to_label';
  }

  /**
   * Suggest enum name from column and mappings
   */
  private suggestEnumName(columnName: string, mappings: { when: string; then: string }[]): string {
    const name = columnName.replace(/_?id$/i, '').replace(/_?code$/i, '');
    
    // Convert to PascalCase
    const pascalName = name
      .split(/[_\s]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
    
    return `${pascalName}Enum`;
  }

  /**
   * Generate business rule description
   */
  private generateBusinessRule(columnName: string, mappings: { when: string; then: string }[]): string {
    if (mappings.length <= 3) {
      const parts = mappings.map(m => `${m.when} = ${m.then}`);
      return `${columnName}: ${parts.join(', ')}`;
    }
    
    return `${columnName} has ${mappings.length} possible values`;
  }

  /**
   * Determine view purpose
   */
  private determinePurpose(viewName: string, body: string): ViewDef['purpose'] {
    const nameLower = viewName.toLowerCase();
    const bodyLower = body.toLowerCase();
    
    // Check naming patterns
    if (nameLower.includes('report') || nameLower.includes('rpt')) {
      return 'report';
    }
    if (nameLower.includes('dashboard') || nameLower.includes('dash') || nameLower.includes('summary')) {
      return 'dashboard';
    }
    if (nameLower.includes('lookup') || nameLower.includes('list') || nameLower.includes('ddl')) {
      return 'lookup';
    }
    if (nameLower.includes('api') || nameLower.includes('v_') || nameLower.startsWith('vw_')) {
      return 'api';
    }
    
    // Check body characteristics
    const hasAggregates = /COUNT|SUM|AVG|MIN|MAX/i.test(body);
    const hasGroupBy = /GROUP\s+BY/i.test(body);
    const hasManyJoins = (body.match(/JOIN/gi) || []).length >= 3;
    
    if (hasAggregates && hasGroupBy) {
      return 'report';
    }
    
    if (hasAggregates && !hasGroupBy) {
      return 'dashboard';
    }
    
    if (hasManyJoins) {
      return 'api';
    }
    
    return 'lookup';
  }

  /**
   * Calculate complexity score
   */
  private calculateComplexity(body: string): number {
    let score = 0;
    
    score += (body.match(/JOIN/gi) || []).length * 5;
    score += (body.match(/CASE/gi) || []).length * 3;
    score += (body.match(/GROUP\s+BY/gi) || []).length * 3;
    score += (body.match(/HAVING/gi) || []).length * 4;
    score += (body.match(/UNION/gi) || []).length * 5;
    score += (body.match(/SUBSTRING|CONCAT|REPLACE/gi) || []).length * 2;
    score += (body.match(/DATEDIFF|DATEADD|GETDATE/gi) || []).length * 2;
    
    return score;
  }

  /**
   * Infer business context from view name and body
   */
  private inferBusinessContext(viewName: string, body: string): string {
    const nameLower = viewName.toLowerCase();
    
    // Map common prefixes/suffixes to business contexts
    const contextMap: Record<string, string> = {
      'patient': 'Patient Management',
      'appointment': 'Appointment Scheduling',
      'billing': 'Billing & Revenue',
      'invoice': 'Billing & Revenue',
      'lab': 'Laboratory Services',
      'radiology': 'Radiology & Imaging',
      'pharmacy': 'Pharmacy Management',
      'inventory': 'Inventory Management',
      'staff': 'Staff Management',
      'doctor': 'Doctor/Physician Management',
      'nursing': 'Nursing Care',
      'admission': 'Admission/ADT',
      'discharge': 'Discharge/ADT',
      'report': 'Reporting & Analytics',
      'dashboard': 'Dashboard & KPIs',
      'transaction': 'Transaction Processing',
      'audit': 'Audit & Compliance',
    };
    
    for (const [key, context] of Object.entries(contextMap)) {
      if (nameLower.includes(key)) {
        return context;
      }
    }
    
    return 'General Operations';
  }

  /**
   * Suggest report type
   */
  private suggestReportType(viewDef: ViewDef): string {
    const { purpose, columns, calculatedFields } = viewDef;
    
    if (purpose === 'dashboard') {
      return 'KPI Dashboard';
    }
    
    const hasAggregates = columns.some(c => c.isAggregated);
    const hasGrouping = viewDef.body.includes('GROUP BY');
    
    if (hasAggregates && hasGrouping) {
      if (viewDef.body.includes('DATEDIFF') || viewDef.body.includes('DATEADD')) {
        return 'Time-based Trend Report';
      }
      return 'Summary Report';
    }
    
    if (calculatedFields.length > 0) {
      return 'Calculated Metrics Report';
    }
    
    return 'Detail Listing Report';
  }

  /**
   * Suggest dashboard widgets
   */
  private suggestDashboardWidgets(viewDef: ViewDef): string[] {
    const widgets: string[] = [];
    
    for (const col of viewDef.columns) {
      if (col.isAggregated) {
        switch (col.aggregationFunction) {
          case 'COUNT':
            widgets.push(`Number Card: ${col.name}`);
            break;
          case 'SUM':
            widgets.push(`Total Card: ${col.name}`);
            break;
          case 'AVG':
            widgets.push(`Average Card: ${col.name}`);
            break;
        }
      }
    }
    
    // Check for time-based columns
    if (/DATEDIFF|DATEADD|GETDATE/i.test(viewDef.body)) {
      widgets.push('Time Series Chart');
    }
    
    // Check for categorical grouping
    if (/GROUP\s+BY/i.test(viewDef.body)) {
      widgets.push('Pie/Donut Chart');
      widgets.push('Bar Chart');
    }
    
    return widgets.slice(0, 5);
  }

  /**
   * Discover hidden relationships from view JOINs
   */
  private discoverHiddenRelationships(viewDef: ViewDef): HiddenRelationship[] {
    const relationships: HiddenRelationship[] = [];
    
    for (const join of viewDef.joinRelationships) {
      // Check if this relationship exists in FK definitions
      // If not, it's a "hidden" relationship discovered through the view
      relationships.push({
        fromTable: join.fromTable,
        toTable: join.toTable,
        discoveredVia: `View: ${viewDef.viewName}`,
        relationshipType: join.joinType === 'LEFT' ? 'one_to_many' : 'one_to_one',
        confidence: 85,
      });
    }
    
    return relationships;
  }

  /**
   * Generate enum suggestions from CASE statements
   */
  private generateEnumSuggestions(viewDef: ViewDef): EnumSuggestion[] {
    const suggestions: EnumSuggestion[] = [];
    
    for (const caseStmt of viewDef.caseStatements) {
      if (caseStmt.mappingType === 'value_to_label' || caseStmt.mappingType === 'status_mapping') {
        const values = caseStmt.mappings.map(m => ({
          value: m.when.replace(/'/g, ''),
          label: m.then,
        }));
        
        if (caseStmt.elseValue) {
          values.push({ value: 'OTHER', label: caseStmt.elseValue });
        }
        
        suggestions.push({
          enumName: caseStmt.suggestedEnum,
          values,
          sourceTable: viewDef.sourceTables[0] || '',
          sourceColumn: caseStmt.columnName,
          usageCount: 1,
        });
      }
    }
    
    return suggestions;
  }

  /**
   * Suggest API endpoints from view
   */
  private suggestAPIEndpoints(viewDef: ViewDef): string[] {
    const endpoints: string[] = [];
    const baseName = viewDef.viewName.replace(/^(vw_|v_|View_)/i, '').toLowerCase();
    
    switch (viewDef.purpose) {
      case 'report':
        endpoints.push(`GET /api/reports/${baseName}`);
        break;
      case 'dashboard':
        endpoints.push(`GET /api/dashboard/${baseName}`);
        break;
      case 'lookup':
        endpoints.push(`GET /api/lookup/${baseName}`);
        break;
      case 'api':
        endpoints.push(`GET /api/${baseName}`);
        endpoints.push(`GET /api/${baseName}/:id`);
        break;
      default:
        endpoints.push(`GET /api/views/${baseName}`);
    }
    
    return endpoints;
  }
}

// Export singleton factory
export function createViewAnalyzer(tables: TableDef[] = []): ViewAnalyzerEngine {
  return new ViewAnalyzerEngine(tables);
}
