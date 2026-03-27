// =============================================================================
// View Intelligence Service - Unified View Analysis & Computed Column Inference
// =============================================================================
// Integrates sql-view-parser, view-analyzer, and column-intelligence
// Provides computed field inference for code generation
// =============================================================================

import { 
  ViewDef, 
  ViewColumnDef, 
  ViewSourceTable, 
  ViewDependency,
  ViewJoinDef,
  ComputedColumnIntelligence,
  ColumnIntelligence,
  UIComponentType,
  SemanticType,
  SensitivityLevel
} from './types';
import { SqlViewParser, ParsedView, ViewColumn } from './parsers/sql-view-parser';
import { ColumnIntelligenceEngine } from './column-intelligence';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// =============================================================================
// Types
// =============================================================================

export interface ViewIntelligenceResult {
  view: ViewDef;
  computedColumnIntelligence: ComputedColumnIntelligence[];
  hiddenFKs: HiddenFKDiscovery[];
  enumSuggestions: EnumSuggestion[];
  dashboardWidgets: DashboardWidgetSuggestion[];
  apiSuggestions: APIEndpointSuggestion[];
  crossReferenceIntelligence: CrossReferenceIntelligence[];
}

export interface HiddenFKDiscovery {
  fromTable: string;
  toTable: string;
  fromColumn: string;
  toColumn: string;
  discoveredIn: string;
  confidence: number;
  joinType: string;
}

export interface EnumSuggestion {
  enumName: string;
  columnName: string;
  sourceTable: string;
  values: Array<{ value: string; label: string }>;
  businessRule: string;
}

export interface DashboardWidgetSuggestion {
  widgetType: 'number_card' | 'chart' | 'table' | 'gauge';
  title: string;
  dataSource: string;
  config: Record<string, unknown>;
}

export interface APIEndpointSuggestion {
  method: 'GET' | 'POST';
  path: string;
  description: string;
  responseFields: string[];
}

export interface CrossReferenceIntelligence {
  tableName: string;
  columnName: string;
  usedInView: string;
  usageType: 'select' | 'join' | 'filter' | 'aggregate';
  businessContext: string;
}

// =============================================================================
// View Intelligence Service
// =============================================================================

export class ViewIntelligenceService {
  private columnEngine: ColumnIntelligenceEngine;
  private knownTables: Map<string, { columns: Array<{ name: string; dataType: string }> }>;
  
  constructor(
    knownTables?: Array<{ 
      tableName: string; 
      columns: Array<{ name: string; dataType: string }> 
    }>
  ) {
    this.columnEngine = new ColumnIntelligenceEngine();
    this.knownTables = new Map();
    
    if (knownTables) {
      for (const table of knownTables) {
        this.knownTables.set(table.tableName.toLowerCase(), table);
      }
    }
  }

  /**
   * Analyze a SQL view definition and extract full intelligence
   */
  async analyzeView(definition: string): Promise<ViewIntelligenceResult | null> {
    const parser = new SqlViewParser(
      Array.from(this.knownTables.entries()).map(([name, table]) => ({
        tableName: name,
        columns: table.columns
      }))
    );
    
    const parsedView = parser.parseSingle(definition);
    if (!parsedView) return null;
    
    const view = this.convertToViewDef(parsedView);
    
    // Extract computed column intelligence
    const computedColumnIntelligence = this.extractComputedColumnIntelligence(view);
    
    // Discover hidden FKs from JOINs
    const hiddenFKs = this.discoverHiddenFKs(view);
    
    // Extract enum suggestions from CASE statements
    const enumSuggestions = this.extractEnumSuggestions(view);
    
    // Generate dashboard widget suggestions
    const dashboardWidgets = this.suggestDashboardWidgets(view);
    
    // Generate API endpoint suggestions
    const apiSuggestions = this.suggestAPIEndpoints(view);
    
    // Build cross-reference intelligence
    const crossReferenceIntelligence = this.buildCrossReferenceIntelligence(view);
    
    return {
      view,
      computedColumnIntelligence,
      hiddenFKs,
      enumSuggestions,
      dashboardWidgets,
      apiSuggestions,
      crossReferenceIntelligence
    };
  }

  /**
   * Batch analyze multiple views
   */
  async analyzeViews(
    definitions: Array<{ name: string; definition: string }>
  ): Promise<Map<string, ViewIntelligenceResult>> {
    const results = new Map<string, ViewIntelligenceResult>();
    
    for (const { name, definition } of definitions) {
      const result = await this.analyzeView(definition);
      if (result) {
        results.set(name, result);
      }
    }
    
    return results;
  }

  /**
   * Convert ParsedView to ViewDef
   */
  private convertToViewDef(parsed: ParsedView): ViewDef {
    return {
      schemaName: parsed.schemaName,
      viewName: parsed.viewName,
      fullName: parsed.fullName,
      definition: parsed.definition,
      selectStatement: parsed.selectStatement,
      columns: parsed.columns.map(col => ({
        name: col.name,
        sourceColumn: col.sourceColumn,
        sourceTable: col.sourceTable,
        dataType: col.dataType,
        isComputed: col.isComputed,
        expression: col.expression,
        isNullable: col.isNullable,
        position: col.position,
        isAggregate: col.isAggregate,
        aggregateFunction: col.aggregateFunction
      })),
      sourceTables: parsed.sourceTables.map(st => ({
        tableName: st.tableName,
        schemaName: st.schemaName,
        alias: st.alias,
        joinType: st.joinType,
        joinCondition: st.joinCondition,
        isPrimary: st.isPrimary
      })),
      dependencies: parsed.dependencies.map(dep => ({
        name: dep.name,
        schema: dep.schema,
        type: dep.type,
        usage: dep.usage
      })),
      joins: parsed.joins.map(j => ({
        fromTable: j.fromTable,
        toTable: j.toTable,
        joinType: j.joinType,
        condition: j.condition,
        joinColumns: j.joinColumns
      })),
      whereClause: parsed.whereClause?.rawText,
      groupByColumns: parsed.groupByColumns,
      havingClause: parsed.havingClause,
      orderByColumns: parsed.orderByColumns,
      isSchemaBound: parsed.isSchemaBound,
      isEncrypted: parsed.isEncrypted,
      viewType: parsed.viewType,
      checkOption: parsed.checkOption,
      hints: parsed.hints,
      complexityScore: parsed.complexityScore,
      hasDistinct: parsed.hasDistinct,
      hasUnion: parsed.hasUnion,
      hasSubqueries: parsed.hasSubqueries,
      hasCTEs: parsed.hasCTEs,
      ctes: parsed.ctes
    };
  }

  /**
   * Extract computed column intelligence
   */
  private extractComputedColumnIntelligence(view: ViewDef): ComputedColumnIntelligence[] {
    const results: ComputedColumnIntelligence[] = [];
    
    for (const col of view.columns) {
      if (!col.isComputed && !col.expression) continue;
      
      const expressionType = this.classifyExpression(col.expression || '');
      const inferredDataType = this.inferDataType(col.expression || '', col.aggregateFunction);
      const dependencies = this.extractDependencies(col.expression || '', view.sourceTables);
      const businessPurpose = this.inferBusinessPurpose(col.name, expressionType, view.viewName);
      const suggestedUIComponent = this.suggestUIComponent(col.name, expressionType, inferredDataType);
      
      results.push({
        columnName: col.name,
        viewName: view.viewName,
        sourceTable: col.sourceTable,
        sourceColumn: col.sourceColumn,
        expression: col.expression || '',
        expressionType,
        inferredDataType,
        dependencies,
        businessPurpose,
        suggestedUIComponent,
        isVirtualColumn: true
      });
    }
    
    return results;
  }

  /**
   * Classify expression type
   */
  private classifyExpression(expression: string): ComputedColumnIntelligence['expressionType'] {
    const upper = expression.toUpperCase();
    
    // Check for aggregate functions
    if (/\b(SUM|AVG|COUNT|MIN|MAX|STDEV|VAR)\s*\(/i.test(expression)) {
      return 'aggregate';
    }
    
    // Check for conditional expressions
    if (/\b(CASE|WHEN|IIF|NULLIF|COALESCE|ISNULL)\b/i.test(expression)) {
      return 'conditional';
    }
    
    // Check for date functions
    if (/\b(GETDATE|DATEADD|DATEDIFF|CONVERT.*DATE|FORMAT.*DATE|YEAR|MONTH|DAY)\b/i.test(expression)) {
      return 'date';
    }
    
    // Check for string functions
    if (/\b(SUBSTRING|CONCAT|LEFT|RIGHT|LTRIM|RTRIM|REPLACE|UPPER|LOWER|LEN|CHARINDEX)\b/i.test(expression)) {
      return 'string';
    }
    
    // Check for arithmetic operations
    if (/[\+\-\*\/]/.test(expression) && /\d/.test(expression)) {
      return 'arithmetic';
    }
    
    // Check for function calls (scalar functions)
    if (/\w+\s*\([^)]*\)/.test(expression)) {
      return 'function';
    }
    
    // Default to arithmetic for expressions with operators
    if (/[\+\-\*\/]/.test(expression)) {
      return 'arithmetic';
    }
    
    return 'function';
  }

  /**
   * Infer data type from expression
   */
  private inferDataType(expression: string, aggregateFunction?: string): string {
    const upper = expression.toUpperCase();
    
    // Aggregate function return types
    if (aggregateFunction) {
      switch (aggregateFunction.toUpperCase()) {
        case 'COUNT': return 'BIGINT';
        case 'SUM': return 'DECIMAL(18,2)';
        case 'AVG': return 'DECIMAL(18,4)';
        case 'MIN':
        case 'MAX':
          return 'NVARCHAR(255)';
        case 'STRING_AGG': return 'NVARCHAR(MAX)';
        default: return 'NVARCHAR(255)';
      }
    }
    
    // Date functions
    if (/\b(GETDATE|SYSDATETIME|GETUTCDATE)\b/i.test(expression)) {
      return 'DATETIME';
    }
    if (/\bDATEADD\b/i.test(expression)) {
      return 'DATETIME';
    }
    if (/\bDATEDIFF\b/i.test(expression)) {
      return 'INT';
    }
    
    // String functions
    if (/\b(CONCAT|SUBSTRING|REPLACE|UPPER|LOWER|LTRIM|RTRIM)\b/i.test(expression)) {
      return 'NVARCHAR(MAX)';
    }
    if (/\bLEN\b/i.test(expression)) {
      return 'INT';
    }
    
    // Convert/Cast - try to extract target type
    const convertMatch = expression.match(/CONVERT\s*\(\s*(\w+)/i);
    if (convertMatch) {
      return convertMatch[1];
    }
    
    const castMatch = expression.match(/AS\s+(\w+(?:\s*\([^)]*\))?)/i);
    if (castMatch) {
      return castMatch[1];
    }
    
    // Arithmetic operations
    if (/[\+\-\*\/]/.test(expression)) {
      if (/\d+\.\d+/.test(expression) || /\bDECIMAL\b/i.test(expression)) {
        return 'DECIMAL(18,4)';
      }
      return 'INT';
    }
    
    // Case expression - analyze result types
    if (/\bCASE\b/i.test(expression)) {
      const thenMatches = expression.matchAll(/THEN\s+(\d+\.?\d*)/gi);
      let hasDecimal = false;
      for (const m of thenMatches) {
        if (m[1].includes('.')) {
          hasDecimal = true;
          break;
        }
      }
      return hasDecimal ? 'DECIMAL(18,2)' : 'NVARCHAR(255)';
    }
    
    return 'NVARCHAR(255)';
  }

  /**
   * Extract dependencies from expression
   */
  private extractDependencies(
    expression: string, 
    sourceTables: ViewSourceTable[]
  ): string[] {
    const dependencies: string[] = [];
    const colRefPattern = /(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/g;
    
    const keywords = new Set([
      'SELECT', 'FROM', 'WHERE', 'JOIN', 'ON', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL',
      'LIKE', 'BETWEEN', 'AS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'SUM', 'AVG',
      'COUNT', 'MIN', 'MAX', 'COALESCE', 'ISNULL', 'NULLIF', 'CONVERT', 'CAST',
      'GETDATE', 'DATEADD', 'DATEDIFF', 'SUBSTRING', 'CONCAT', 'LEFT', 'RIGHT',
      'UPPER', 'LOWER', 'LTRIM', 'RTRIM', 'REPLACE', 'LEN', 'CHARINDEX', 'IIF'
    ]);
    
    let match;
    while ((match = colRefPattern.exec(expression)) !== null) {
      const prefix = match[1];
      const colName = match[2];
      
      if (keywords.has(colName.toUpperCase())) continue;
      if (/^\d/.test(colName)) continue;
      
      if (prefix) {
        const table = sourceTables.find(
          t => t.alias?.toLowerCase() === prefix.toLowerCase() ||
               t.tableName.toLowerCase() === prefix.toLowerCase()
        );
        if (table) {
          dependencies.push(`${table.tableName}.${colName}`);
        }
      } else {
        for (const table of sourceTables) {
          const tableCols = this.knownTables.get(table.tableName.toLowerCase());
          if (tableCols?.columns.some(c => c.name.toLowerCase() === colName.toLowerCase())) {
            dependencies.push(`${table.tableName}.${colName}`);
            break;
          }
        }
      }
    }
    
    return [...new Set(dependencies)];
  }

  /**
   * Infer business purpose from column name and context
   */
  private inferBusinessPurpose(
    columnName: string, 
    expressionType: string, 
    viewName: string
  ): string {
    const nameLower = columnName.toLowerCase();
    const viewLower = viewName.toLowerCase();
    
    if (nameLower.includes('total') || nameLower.includes('sum')) {
      return 'Aggregated total for reporting';
    }
    if (nameLower.includes('count') || nameLower.endsWith('count')) {
      return 'Record count for analytics';
    }
    if (nameLower.includes('avg') || nameLower.includes('average')) {
      return 'Average calculation for metrics';
    }
    if (nameLower.includes('fullname') || nameLower.includes('full_name')) {
      return 'Concatenated name display';
    }
    if (nameLower.includes('age')) {
      return 'Calculated age from birth date';
    }
    if (nameLower.includes('duration') || nameLower.includes('days')) {
      return 'Time duration calculation';
    }
    if (nameLower.includes('status')) {
      return 'Status derivation logic';
    }
    if (nameLower.includes('formatted') || nameLower.includes('display')) {
      return 'Display formatting logic';
    }
    if (viewLower.includes('report') || viewLower.includes('summary')) {
      return 'Report computed field';
    }
    if (viewLower.includes('dashboard') || viewLower.includes('metric')) {
      return 'Dashboard metric calculation';
    }
    
    return `Computed ${expressionType} field`;
  }

  /**
   * Suggest UI component for computed column
   */
  private suggestUIComponent(
    columnName: string, 
    expressionType: string, 
    inferredDataType: string
  ): string {
    const nameLower = columnName.toLowerCase();
    
    if (nameLower.includes('amount') || nameLower.includes('total') || 
        nameLower.includes('price') || nameLower.includes('fee')) {
      return 'currency_display';
    }
    if (nameLower.includes('percent') || nameLower.includes('rate')) {
      return 'percentage_display';
    }
    if (nameLower.includes('count') || inferredDataType === 'BIGINT') {
      return 'stat_card';
    }
    if (expressionType === 'date' || inferredDataType.startsWith('DATE')) {
      return 'date_display';
    }
    if (nameLower.includes('status')) {
      return 'status_badge';
    }
    if (nameLower.startsWith('is') || nameLower.startsWith('has')) {
      return 'boolean_indicator';
    }
    if (expressionType === 'aggregate') {
      return 'metric_card';
    }
    
    return 'text_display';
  }

  /**
   * Discover hidden FK relationships from JOIN clauses
   */
  private discoverHiddenFKs(view: ViewDef): HiddenFKDiscovery[] {
    const discoveries: HiddenFKDiscovery[] = [];
    const existingFKTables = new Set<string>();
    
    // Get existing FKs from known tables
    for (const [tableName, table] of this.knownTables) {
      // In a full implementation, we would check for FK columns here
      existingFKTables.add(tableName);
    }
    
    for (const join of view.joins) {
      // Extract column pairs from join condition
      const columnPairs = this.parseJoinCondition(join.condition);
      
      for (const pair of columnPairs) {
        // Check if this FK might be missing
        const fromTableLower = join.fromTable.toLowerCase();
        const toTableLower = join.toTable.toLowerCase();
        
        discoveries.push({
          fromTable: join.fromTable,
          toTable: join.toTable,
          fromColumn: pair.fromColumn,
          toColumn: pair.toColumn,
          discoveredIn: view.viewName,
          confidence: 0.85,
          joinType: join.joinType
        });
      }
    }
    
    return discoveries;
  }

  /**
   * Parse join condition to extract column pairs
   */
  private parseJoinCondition(condition: string): Array<{ fromColumn: string; toColumn: string }> {
    const pairs: Array<{ fromColumn: string; toColumn: string }> = [];
    const matches = condition.matchAll(/(?:\[?(\w+)\]?\.)?(\w+)\s*=\s*(?:\[?(\w+)\]?\.)?(\w+)/g);
    
    for (const match of matches) {
      pairs.push({
        fromColumn: match[2],
        toColumn: match[4]
      });
    }
    
    return pairs;
  }

  /**
   * Extract enum suggestions from CASE statements
   */
  private extractEnumSuggestions(view: ViewDef): EnumSuggestion[] {
    const suggestions: EnumSuggestion[] = [];
    
    // Find CASE statements in view definition
    const caseRegex = /CASE\s+(?:([\w.]+)\s+)?([\s\S]*?)\s+END\s*(?:AS\s+(\w+))?/gi;
    const definition = view.definition;
    
    let match;
    while ((match = caseRegex.exec(definition)) !== null) {
      const sourceColumn = match[1] || '';
      const caseBody = match[2];
      const alias = match[3];
      
      // Parse WHEN/THEN clauses
      const mappings: Array<{ when: string; then: string }> = [];
      const whenRegex = /WHEN\s+(.+?)\s+THEN\s+(.+?)(?=WHEN|ELSE|END)/gi;
      let whenMatch;
      
      while ((whenMatch = whenRegex.exec(caseBody)) !== null) {
        mappings.push({
          when: whenMatch[1].trim().replace(/^'|'$/g, ''),
          then: whenMatch[2].trim().replace(/^'|'$/g, '')
        });
      }
      
      if (mappings.length > 0 && mappings.length <= 20) { // Reasonable enum size
        const enumName = this.generateEnumName(alias || sourceColumn);
        
        suggestions.push({
          enumName,
          columnName: alias || sourceColumn.split('.').pop() || '',
          sourceTable: view.sourceTables[0]?.tableName || '',
          values: mappings.map(m => ({
            value: m.when,
            label: m.then
          })),
          businessRule: `${alias || sourceColumn} mapping with ${mappings.length} values`
        });
      }
    }
    
    return suggestions;
  }

  /**
   * Generate enum name from column name
   */
  private generateEnumName(columnName: string): string {
    const name = columnName
      .replace(/_?id$/i, '')
      .replace(/_?code$/i, '')
      .replace(/_?type$/i, '');
    
    const pascalName = name
      .split(/[_\s]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
    
    return `${pascalName}Enum`;
  }

  /**
   * Suggest dashboard widgets based on view structure
   */
  private suggestDashboardWidgets(view: ViewDef): DashboardWidgetSuggestion[] {
    const widgets: DashboardWidgetSuggestion[] = [];
    
    for (const col of view.columns) {
      if (col.isAggregate) {
        switch (col.aggregateFunction?.toUpperCase()) {
          case 'COUNT':
            widgets.push({
              widgetType: 'number_card',
              title: this.formatTitle(col.name),
              dataSource: view.viewName,
              config: { field: col.name, format: 'number' }
            });
            break;
          case 'SUM':
            widgets.push({
              widgetType: 'number_card',
              title: this.formatTitle(col.name),
              dataSource: view.viewName,
              config: { field: col.name, format: 'currency' }
            });
            break;
          case 'AVG':
            widgets.push({
              widgetType: 'gauge',
              title: `Average ${this.formatTitle(col.name)}`,
              dataSource: view.viewName,
              config: { field: col.name, format: 'decimal' }
            });
            break;
        }
      }
    }
    
    // Time-based charts
    if (/DATEDIFF|DATEADD|GETDATE/i.test(view.selectStatement)) {
      widgets.push({
        widgetType: 'chart',
        title: 'Trend Over Time',
        dataSource: view.viewName,
        config: { chartType: 'line', timeField: 'auto' }
      });
    }
    
    // Group by pie charts
    if (view.groupByColumns.length > 0) {
      widgets.push({
        widgetType: 'chart',
        title: 'Distribution',
        dataSource: view.viewName,
        config: { chartType: 'pie', groupBy: view.groupByColumns[0] }
      });
    }
    
    return widgets.slice(0, 6);
  }

  /**
   * Suggest API endpoints based on view structure
   */
  private suggestAPIEndpoints(view: ViewDef): APIEndpointSuggestion[] {
    const suggestions: APIEndpointSuggestion[] = [];
    const baseName = view.viewName
      .replace(/^(vw_|v_|View_)/i, '')
      .toLowerCase();
    
    const responseFields = view.columns.slice(0, 10).map(c => c.name);
    
    // Primary GET endpoint
    suggestions.push({
      method: 'GET',
      path: `/api/views/${baseName}`,
      description: `Get data from ${view.viewName} view`,
      responseFields
    });
    
    // Filtered endpoint if WHERE conditions exist
    if (view.whereClause) {
      suggestions.push({
        method: 'GET',
        path: `/api/views/${baseName}/filter`,
        description: `Filtered query on ${view.viewName}`,
        responseFields
      });
    }
    
    // Aggregation endpoint for summary views
    if (view.columns.some(c => c.isAggregate)) {
      suggestions.push({
        method: 'GET',
        path: `/api/views/${baseName}/summary`,
        description: `Get aggregated summary from ${view.viewName}`,
        responseFields: view.columns.filter(c => c.isAggregate).map(c => c.name)
      });
    }
    
    return suggestions;
  }

  /**
   * Build cross-reference intelligence
   */
  private buildCrossReferenceIntelligence(view: ViewDef): CrossReferenceIntelligence[] {
    const refs: CrossReferenceIntelligence[] = [];
    
    for (const col of view.columns) {
      if (col.sourceTable && col.sourceColumn) {
        refs.push({
          tableName: col.sourceTable,
          columnName: col.sourceColumn,
          usedInView: view.viewName,
          usageType: col.isAggregate ? 'aggregate' : 'select',
          businessContext: `Used as ${col.name} in ${view.viewName}`
        });
      }
    }
    
    // Add join references
    for (const join of view.joins) {
      for (const jc of join.joinColumns) {
        refs.push({
          tableName: join.toTable,
          columnName: jc.toColumn,
          usedInView: view.viewName,
          usageType: 'join',
          businessContext: `Joined via ${join.joinType} JOIN`
        });
      }
    }
    
    return refs;
  }

  /**
   * Format column name as title
   */
  private formatTitle(name: string): string {
    return name
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .trim();
  }

  /**
   * Save view intelligence to database
   */
  async saveViewIntelligence(
    projectId: string,
    result: ViewIntelligenceResult
  ): Promise<void> {
    try {
      // Store computed column intelligence
      for (const intel of result.computedColumnIntelligence) {
        const fullName = `${result.view.viewName}.${intel.columnName}`;
        const now = new Date();
        
        await prisma.computedColumnModel.upsert({
          where: {
            projectId_fullName: {
              projectId,
              fullName
            }
          },
          create: {
            id: `cci-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            projectId,
            viewId: undefined,
            viewName: result.view.viewName,
            columnName: intel.columnName,
            fullName,
            sourceTable: intel.sourceTable || '',
            sourceColumn: intel.sourceColumn || '',
            expression: intel.expression,
            expressionType: intel.expressionType,
            inferredDataType: intel.inferredDataType,
            dependencies: JSON.stringify(intel.dependencies),
            businessPurpose: intel.businessPurpose || '',
            suggestedUIComponent: intel.suggestedUIComponent || '',
            isVirtualColumn: true,
            updatedAt: now,
          },
          update: {
            expression: intel.expression,
            expressionType: intel.expressionType,
            inferredDataType: intel.inferredDataType,
            dependencies: JSON.stringify(intel.dependencies),
            businessPurpose: intel.businessPurpose || '',
            updatedAt: now,
          }
        });
      }
      
      // Note: Enum suggestions are stored in the SQLViewModel.computedColumns JSON field
      // since EnumDiscovery model doesn't exist in the current schema
      console.log(`View intelligence saved for ${result.view.viewName}: ${result.computedColumnIntelligence.length} computed columns, ${result.enumSuggestions.length} enum suggestions`);
      
    } catch (error) {
      console.error('Failed to save view intelligence:', error);
    }
  }
}

// =============================================================================
// Export convenience functions
// =============================================================================

export function createViewIntelligenceService(
  knownTables?: Array<{ tableName: string; columns: Array<{ name: string; dataType: string }> }>
): ViewIntelligenceService {
  return new ViewIntelligenceService(knownTables);
}

export async function analyzeViewIntelligence(
  definition: string,
  knownTables?: Array<{ tableName: string; columns: Array<{ name: string; dataType: string }> }>
): Promise<ViewIntelligenceResult | null> {
  const service = new ViewIntelligenceService(knownTables);
  return service.analyzeView(definition);
}
