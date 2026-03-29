/**
 * SQL View Parser - Comprehensive SQL Server View Analysis
 * 
 * Parses CREATE VIEW statements and extracts:
 * - View metadata (name, schema, columns)
 * - Source tables and their aliases
 * - JOIN relationships within the view
 * - Computed columns and expressions
 * - Dependencies (tables, other views, functions)
 * - Column type inference from source tables
 * 
 * Part of Schema Architect - SQL Metadata Bank Enhancement
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ViewColumn {
  /** Column name in the view (alias if specified) */
  name: string
  /** Original column name in source table (if different) */
  sourceColumn?: string
  /** Source table name or alias */
  sourceTable?: string
  /** Inferred or explicit data type */
  dataType?: string
  /** Is this a computed/expression column */
  isComputed: boolean
  /** Original expression (for computed columns) */
  expression?: string
  /** Is the column nullable */
  isNullable?: boolean
  /** Column position in SELECT */
  position: number
  /** Is this an aggregate column */
  isAggregate: boolean
  /** Aggregate function used (SUM, COUNT, etc.) */
  aggregateFunction?: string
}

export interface ViewSourceTable {
  /** Table name */
  tableName: string
  /** Schema name (default: dbo) */
  schemaName: string
  /** Alias used in the query */
  alias?: string
  /** Join type (for joined tables) */
  joinType?: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS'
  /** Join condition */
  joinCondition?: string
  /** Is this the primary table (first in FROM) */
  isPrimary: boolean
}

export interface ViewDependency {
  /** Dependency name */
  name: string
  /** Schema name */
  schema: string
  /** Dependency type */
  type: 'TABLE' | 'VIEW' | 'FUNCTION' | 'SYNONYM'
  /** How it's used */
  usage: 'SELECT' | 'JOIN' | 'SUBQUERY' | 'FUNCTION_CALL'
}

export interface ViewJoin {
  /** From table/alias */
  fromTable: string
  /** To table/alias */
  toTable: string
  /** Join type */
  joinType: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS'
  /** Join condition (ON clause) */
  condition: string
  /** Parsed join columns */
  joinColumns: {
    fromColumn: string
    toColumn: string
  }[]
}

export interface ViewWhereClause {
  /** Raw WHERE clause text */
  rawText: string
  /** Column references in WHERE */
  columnReferences: string[]
  /** Is parameterized */
  hasParameters: boolean
}

export interface ParsedView {
  /** View name */
  viewName: string
  /** Schema name */
  schemaName: string
  /** Fully qualified name */
  fullName: string
  /** View definition (CREATE VIEW statement) */
  definition: string
  /** SELECT statement body */
  selectStatement: string
  /** Parsed columns */
  columns: ViewColumn[]
  /** Source tables */
  sourceTables: ViewSourceTable[]
  /** Dependencies */
  dependencies: ViewDependency[]
  /** JOIN relationships */
  joins: ViewJoin[]
  /** WHERE clause info */
  whereClause?: ViewWhereClause
  /** GROUP BY columns */
  groupByColumns: string[]
  /** HAVING clause */
  havingClause?: string
  /** ORDER BY columns */
  orderByColumns: string[]
  /** Is schema bound */
  isSchemaBound: boolean
  /** Is encrypted */
  isEncrypted: boolean
  /** View type */
  viewType: 'STANDARD' | 'INDEXED' | 'PARTITIONED'
  /** Check option */
  checkOption?: 'CASCADED' | 'LOCAL'
  /** WITH hints */
  hints: string[]
  /** Complexity score (1-10) */
  complexityScore: number
  /** Estimated row count (if determinable) */
  estimatedRows?: number
  /** Contains DISTINCT */
  hasDistinct: boolean
  /** Contains TOP */
  hasTop: boolean
  /** TOP value */
  topValue?: number
  /** Contains UNION */
  hasUnion: boolean
  /** Contains subqueries */
  hasSubqueries: boolean
  /** Contains CTEs */
  hasCTEs: boolean
  /** CTE definitions */
  ctes: { name: string; definition: string }[]
  /** Metadata */
  metadata: {
    createdAt?: Date
    modifiedAt?: Date
    definitionLength: number
    parseTime: number
  }
}

export interface ViewParseResult {
  views: ParsedView[]
  errors: string[]
  warnings: string[]
  stats: {
    totalViews: number
    totalColumns: number
    totalSourceTables: number
    totalDependencies: number
    totalJoins: number
    parseTimeMs: number
  }
}

// ============================================================================
// REGEX PATTERNS
// ============================================================================

const PATTERNS = {
  // CREATE VIEW patterns
  CREATE_VIEW: /CREATE\s+VIEW\s+(?:(\w+)\.)?(\w+)\s*(?:\(([^)]+)\))?\s*(WITH\s+(?:SCHEMABINDING|ENCRYPTION|VIEW_METADATA)(?:\s*,\s*(?:SCHEMABINDING|ENCRYPTION|VIEW_METADATA))*)?\s*AS\s+(.*?)(?:\s*WITH\s+(?:CHECK\s+OPTION)?(?:\s+(CASCADED|LOCAL))?)?$/is,
  
  // View options
  SCHEMABINDING: /WITH\s+SCHEMABINDING/i,
  ENCRYPTION: /WITH\s+ENCRYPTION/i,
  CHECK_OPTION: /WITH\s+CHECK\s+OPTION(?:\s+(CASCADED|LOCAL))?/i,
  
  // SELECT components
  SELECT_CLAUSE: /SELECT\s+(ALL\s+|DISTINCT\s+|DISTINCTROW\s+)?(TOP\s+(\d+|\(@\w+\))\s+)?(.*?)\s+FROM/is,
  FROM_CLAUSE: /FROM\s+(.*?)(?:\s+WHERE\s+|\s+GROUP\s+BY\s+|\s+HAVING\s+|\s+ORDER\s+BY\s+|\s+OPTION\s+|$)/is,
  WHERE_CLAUSE: /WHERE\s+(.*?)(?:\s+GROUP\s+BY\s+|\s+HAVING\s+|\s+ORDER\s+BY\s+|\s+OPTION\s+|$)/is,
  GROUP_BY: /GROUP\s+BY\s+(.*?)(?:\s+HAVING\s+|\s+ORDER\s+BY\s+|\s+OPTION\s+|$)/is,
  HAVING: /HAVING\s+(.*?)(?:\s+ORDER\s+BY\s+|\s+OPTION\s+|$)/is,
  ORDER_BY: /ORDER\s+BY\s+(.*?)(?:\s+OPTION\s+|$)/is,
  
  // JOIN patterns
  JOIN: /(?:INNER\s+|LEFT\s+(?:OUTER\s+)?|RIGHT\s+(?:OUTER\s+)?|FULL\s+(?:OUTER\s+)?|CROSS\s+)?JOIN\s+(\[?(\w+)\]?\.)?(\w+)(?:\s+(?:AS\s+)?(\w+))?\s+ON\s+(.+?)(?=(?:INNER\s+|LEFT\s+|RIGHT\s+|FULL\s+|CROSS\s+)?JOIN\s+|WHERE\s+|GROUP\s+BY\s+|HAVING\s+|ORDER\s+BY\s+|OPTION\s+|$)/gis,
  
  // Table reference in FROM
  TABLE_REF: /(?:^|,)\s*(?:\[?(\w+)\]?\.)?(\w+)(?:\s+(?:AS\s+)?(\w+))?(?:\s+(?:WITH\s*\([^)]+\)|TABLESAMPLE|NOLOCK|READUNCOMMITTED|READCOMMITTED|REPEATABLEREAD|SERIALIZABLE|ROWLOCK|PAGLOCK|TABLOCK|TABLOCKX|UPDLOCK|XLOCK|NOEXPAND))?/gi,
  
  // Column in SELECT
  COLUMN: /(?:^|,)\s*(?:(\w+)\.)?(\*|[\w\s\(\)\[\]+"'<>!=+-]+?)(?:\s+(?:AS\s+)?(\w+))?\s*(?=,|$)/gi,
  
  // Aggregate functions
  AGGREGATE: /\b(SUM|AVG|COUNT|MIN|MAX|STDEV|STDEVP|VAR|VARP|STRING_AGG)\s*\(/gi,
  
  // Subquery detection
  SUBQUERY: /\(\s*SELECT\s+/i,
  
  // CTE detection
  CTE: /WITH\s+(\w+)\s*(?:\(([^)]+)\))?\s*AS\s*\((.*?)\)(?:\s*,\s*(\w+)\s*(?:\(([^)]+)\))?\s*AS\s*\((.*?)\))*/is,
  
  // UNION detection
  UNION: /\bUNION\s+(?:ALL\s+)?SELECT\b/i,
  
  // Function calls
  FUNCTION: /(\w+)\s*\([^)]*\)/g,
  
  // Parameter detection
  PARAMETER: /@(\w+)/g,
  
  // Column reference
  COLUMN_REF: /(?:\[?(\w+)\]?\.)?(\w+)/g,
}

// SQL Server data types for inference
const SQL_TYPES = {
  numeric: ['INT', 'BIGINT', 'SMALLINT', 'TINYINT', 'DECIMAL', 'NUMERIC', 'FLOAT', 'REAL', 'MONEY', 'SMALLMONEY'],
  string: ['VARCHAR', 'NVARCHAR', 'CHAR', 'NCHAR', 'TEXT', 'NTEXT'],
  date: ['DATE', 'DATETIME', 'DATETIME2', 'SMALLDATETIME', 'TIME', 'DATETIMEOFFSET'],
  binary: ['BINARY', 'VARBINARY', 'IMAGE'],
  other: ['BIT', 'UNIQUEIDENTIFIER', 'SQL_VARIANT', 'XML', 'JSON'],
  aggregate: ['BIGINT'] // COUNT returns bigint
}

// Aggregate functions and their return types
const AGGREGATE_RETURN_TYPES: Record<string, string> = {
  'COUNT': 'BIGINT',
  'SUM': 'NUMERIC',
  'AVG': 'NUMERIC',
  'MIN': 'SAME_AS_INPUT',
  'MAX': 'SAME_AS_INPUT',
  'STDEV': 'FLOAT',
  'STDEVP': 'FLOAT',
  'VAR': 'FLOAT',
  'VARP': 'FLOAT',
  'STRING_AGG': 'NVARCHAR'
}

// ============================================================================
// SQL VIEW PARSER CLASS
// ============================================================================

export class SqlViewParser {
  private views: ParsedView[] = []
  private errors: string[] = []
  private warnings: string[] = []
  private startTime: number = 0
  
  // Existing table definitions for type inference
  private knownTables: Map<string, { columns: { name: string; dataType: string }[] }> = new Map()
  
  constructor(knownTables?: { tableName: string; columns: { name: string; dataType: string }[] }[]) {
    if (knownTables) {
      for (const table of knownTables) {
        this.knownTables.set(table.tableName.toLowerCase(), table)
      }
    }
  }
  
  /**
   * Parse SQL content for CREATE VIEW statements
   */
  parse(sqlContent: string): ViewParseResult {
    this.startTime = Date.now()
    this.views = []
    this.errors = []
    this.warnings = []
    
    // Split by GO statements
    const batches = this.splitBatches(sqlContent)
    
    for (const batch of batches) {
      // Find CREATE VIEW statements
      const viewMatches = this.extractViewStatements(batch)
      
      for (const viewMatch of viewMatches) {
        try {
          const parsed = this.parseViewStatement(viewMatch.statement, viewMatch.schema, viewMatch.name)
          if (parsed) {
            this.views.push(parsed)
          }
        } catch (error: any) {
          this.errors.push(`Failed to parse view ${viewMatch.name}: ${error.message}`)
        }
      }
    }
    
    return this.buildResult()
  }
  
  /**
   * Parse a single CREATE VIEW statement
   */
  parseSingle(statement: string): ParsedView | null {
    try {
      return this.parseViewStatement(statement)
    } catch (error: any) {
      this.errors.push(`Failed to parse view: ${error.message}`)
      return null
    }
  }
  
  /**
   * Split SQL content by GO statements
   */
  private splitBatches(content: string): string[] {
    return content.split(/^\s*GO\s*$/im).filter(b => b.trim())
  }
  
  /**
   * Extract CREATE VIEW statements from SQL batch
   */
  private extractViewStatements(batch: string): { statement: string; schema: string; name: string }[] {
    const results: { statement: string; schema: string; name: string }[] = []
    
    // Match CREATE VIEW with various options
    const regex = /CREATE\s+VIEW\s+(?:(\w+)\.)?(\w+)\s*(?:\([^)]+\))?\s*(?:WITH\s+[^A]+)?\s*AS\s+[\s\S]*?(?=(?:CREATE\s+(?:VIEW|PROCEDURE|FUNCTION|TABLE|TRIGGER)|ALTER\s+|DROP\s+|GO\s*$|$))/gi
    
    let match
    while ((match = regex.exec(batch)) !== null) {
      const fullMatch = match[0]
      const schema = match[1] || 'dbo'
      const name = match[2]
      
      // Clean up the statement - remove trailing GO or next statement start
      let statement = fullMatch.trim()
      
      // Remove trailing GO
      statement = statement.replace(/\s*GO\s*$/i, '')
      
      results.push({
        statement,
        schema,
        name
      })
    }
    
    return results
  }
  
  /**
   * Parse a CREATE VIEW statement
   */
  private parseViewStatement(statement: string, defaultSchema: string = 'dbo', defaultName?: string): ParsedView {
    const parseStart = Date.now()
    
    // Extract view name and schema
    const nameMatch = statement.match(/CREATE\s+VIEW\s+(?:(\w+)\.)?(\w+)/i)
    const schemaName = nameMatch?.[1] || defaultSchema
    const viewName = nameMatch?.[2] || defaultName || 'Unknown'
    
    // Extract view options
    const isSchemaBound = PATTERNS.SCHEMABINDING.test(statement)
    const isEncrypted = PATTERNS.ENCRYPTION.test(statement)
    const checkOptionMatch = statement.match(PATTERNS.CHECK_OPTION)
    const checkOption = checkOptionMatch ? (checkOptionMatch[1]?.toUpperCase() as 'CASCADED' | 'LOCAL') || 'CASCADED' : undefined
    
    // Extract explicit column list if present
    const explicitColumnsMatch = statement.match(/CREATE\s+VIEW\s+(?:\w+\.)?\w+\s*\(([^)]+)\)/i)
    const explicitColumns = explicitColumnsMatch 
      ? explicitColumnsMatch[1].split(',').map(c => c.trim())
      : null
    
    // Extract SELECT statement
    const selectStatement = this.extractSelectStatement(statement)
    
    if (!selectStatement) {
      this.warnings.push(`Could not extract SELECT statement from view ${viewName}`)
    }
    
    // Parse SELECT components
    const selectComponents = selectStatement ? this.parseSelectStatement(selectStatement) : null
    
    // Parse columns
    const columns = selectComponents 
      ? this.parseColumns(selectComponents.selectList, explicitColumns, selectComponents.sourceTables)
      : []
    
    // Parse source tables
    const sourceTables = selectComponents?.sourceTables || []
    
    // Parse JOINs
    const joins = selectComponents?.joins || []
    
    // Parse dependencies
    const dependencies = this.extractDependencies(sourceTables, selectStatement)
    
    // Parse WHERE clause
    const whereClause = selectComponents?.whereClause
      ? this.parseWhereClause(selectComponents.whereClause)
      : undefined
    
    // Parse GROUP BY
    const groupByColumns = selectComponents?.groupBy 
      ? this.parseGroupBy(selectComponents.groupBy)
      : []
    
    // Parse HAVING
    const havingClause = selectComponents?.having
    
    // Parse ORDER BY
    const orderByColumns = selectComponents?.orderBy 
      ? this.parseOrderBy(selectComponents.orderBy)
      : []
    
    // Detect CTEs
    const ctes = this.parseCTEs(statement)
    
    // Calculate complexity score
    const complexityScore = this.calculateComplexity({
      sourceTables: sourceTables.length,
      joins: joins.length,
      columns: columns.length,
      hasSubqueries: PATTERNS.SUBQUERY.test(selectStatement || ''),
      hasCTEs: ctes.length > 0,
      hasUnion: PATTERNS.UNION.test(selectStatement || ''),
      hasGroupBy: groupByColumns.length > 0,
      hasHaving: !!havingClause
    })
    
    // Detect SELECT options
    const hasDistinct = /\bDISTINCT\b/i.test(selectStatement || '')
    const topMatch = selectStatement?.match(/TOP\s+(\d+|\(@\w+\))/i)
    const hasTop = !!topMatch
    const topValue = topMatch ? parseInt(topMatch[1]) || undefined : undefined
    
    return {
      viewName,
      schemaName,
      fullName: `${schemaName}.${viewName}`,
      definition: statement,
      selectStatement: selectStatement || '',
      columns,
      sourceTables,
      dependencies,
      joins,
      whereClause,
      groupByColumns,
      havingClause,
      orderByColumns,
      isSchemaBound,
      isEncrypted,
      viewType: this.detectViewType(statement),
      checkOption,
      hints: this.extractHints(statement),
      complexityScore,
      hasDistinct,
      hasTop,
      topValue,
      hasUnion: PATTERNS.UNION.test(selectStatement || ''),
      hasSubqueries: PATTERNS.SUBQUERY.test(selectStatement || ''),
      hasCTEs: ctes.length > 0,
      ctes,
      metadata: {
        definitionLength: statement.length,
        parseTime: Date.now() - parseStart
      }
    }
  }
  
  /**
   * Extract SELECT statement from CREATE VIEW
   */
  private extractSelectStatement(statement: string): string | null {
    // Find AS followed by SELECT
    const asSelectMatch = statement.match(/\bAS\s+(SELECT\s+[\s\S]*?)(?:\s*WITH\s+CHECK\s+OPTION)?$/i)
    
    if (asSelectMatch) {
      return asSelectMatch[1].trim()
    }
    
    // Try to find just the SELECT part
    const selectMatch = statement.match(/SELECT\s+[\s\S]*/i)
    return selectMatch ? selectMatch[0].trim() : null
  }
  
  /**
   * Parse SELECT statement into components
   */
  private parseSelectStatement(select: string): {
    selectList: string
    sourceTables: ViewSourceTable[]
    joins: ViewJoin[]
    whereClause?: string
    groupBy?: string
    having?: string
    orderBy?: string
  } | null {
    // Handle CTEs first
    let workingSelect = select
    let cteRemoved = ''
    
    if (/^WITH\s+/i.test(select)) {
      // Remove CTEs for main parsing
      cteRemoved = select.replace(/^WITH\s+[\s\S]*?\)\s*,?\s*/i, '')
      workingSelect = cteRemoved || select.substring(select.indexOf(')') + 1)
    }
    
    // Extract SELECT list
    const selectMatch = workingSelect.match(/SELECT\s+(ALL\s+|DISTINCT\s+|DISTINCTROW\s+)?(TOP\s+(?:\d+|\(@\w+\))\s+)?(.*?)(?=\s+FROM\s+)/is)
    if (!selectMatch) return null
    
    const selectList = selectMatch[3]
    
    // Extract FROM clause
    const fromMatch = workingSelect.match(/FROM\s+(.*?)(?=\s+WHERE\s+|\s+GROUP\s+BY\s+|\s+HAVING\s+|\s+ORDER\s+BY\s+|\s+OPTION\s+|$)/is)
    const fromClause = fromMatch?.[1] || ''
    
    // Parse source tables and JOINs
    const { sourceTables, joins } = this.parseFromClause(fromClause)
    
    // Extract WHERE clause
    const whereMatch = workingSelect.match(/WHERE\s+(.*?)(?=\s+GROUP\s+BY\s+|\s+HAVING\s+|\s+ORDER\s+BY\s+|\s+OPTION\s+|$)/is)
    const whereClause = whereMatch?.[1]?.trim()
    
    // Extract GROUP BY
    const groupByMatch = workingSelect.match(/GROUP\s+BY\s+(.*?)(?=\s+HAVING\s+|\s+ORDER\s+BY\s+|\s+OPTION\s+|$)/is)
    const groupBy = groupByMatch?.[1]?.trim()
    
    // Extract HAVING
    const havingMatch = workingSelect.match(/HAVING\s+(.*?)(?=\s+ORDER\s+BY\s+|\s+OPTION\s+|$)/is)
    const having = havingMatch?.[1]?.trim()
    
    // Extract ORDER BY
    const orderByMatch = workingSelect.match(/ORDER\s+BY\s+(.*?)(?=\s+OPTION\s+|$)/is)
    const orderBy = orderByMatch?.[1]?.trim()
    
    return {
      selectList,
      sourceTables,
      joins,
      whereClause,
      groupBy,
      having,
      orderBy
    }
  }
  
  /**
   * Parse FROM clause to extract source tables and JOINs
   */
  private parseFromClause(fromClause: string): { sourceTables: ViewSourceTable[]; joins: ViewJoin[] } {
    const sourceTables: ViewSourceTable[] = []
    const joins: ViewJoin[] = []
    
    // First, extract the primary table (before any JOIN)
    const primaryMatch = fromClause.match(/^(\[?(\w+)\]?\.)?(\w+)(?:\s+(?:AS\s+)?(\w+))?/i)
    
    if (primaryMatch) {
      sourceTables.push({
        tableName: primaryMatch[3],
        schemaName: primaryMatch[2] || 'dbo',
        alias: primaryMatch[4],
        isPrimary: true
      })
    }
    
    // Extract JOINs
    const joinRegex = /(INNER\s+|LEFT\s+(?:OUTER\s+)?|RIGHT\s+(?:OUTER\s+)?|FULL\s+(?:OUTER\s+)?|CROSS\s+)?JOIN\s+(?:\[?(\w+)\]?\.)?(\w+)(?:\s+(?:AS\s+)?(\w+))?\s+ON\s+(.+?)(?=(?:INNER\s+|LEFT\s+|RIGHT\s+|FULL\s+|CROSS\s+)?JOIN\s+|WHERE\s+|GROUP\s+BY\s+|HAVING\s+|ORDER\s+BY\s+|OPTION\s+|$)/gis
    
    let joinMatch
    while ((joinMatch = joinRegex.exec(fromClause)) !== null) {
      const joinType = (joinMatch[1]?.trim().toUpperCase() || 'INNER') as 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS'
      const schemaName = joinMatch[2] || 'dbo'
      const tableName = joinMatch[3]
      const alias = joinMatch[4]
      const condition = joinMatch[5].trim()
      
      sourceTables.push({
        tableName,
        schemaName,
        alias,
        joinType,
        joinCondition: condition,
        isPrimary: false
      })
      
      // Parse join columns from condition
      const joinColumns = this.parseJoinCondition(condition)
      
      joins.push({
        fromTable: sourceTables[sourceTables.length - 2]?.alias || sourceTables[sourceTables.length - 2]?.tableName || '',
        toTable: alias || tableName,
        joinType,
        condition,
        joinColumns
      })
    }
    
    // Also handle comma-separated tables (implicit cross join)
    const commaTables = fromClause.match(/,\s*(?:\[?(\w+)\]?\.)?(\w+)(?:\s+(?:AS\s+)?(\w+))?/gi)
    if (commaTables) {
      for (const tableRef of commaTables) {
        const match = tableRef.match(/,\s*(?:\[?(\w+)\]?\.)?(\w+)(?:\s+(?:AS\s+)?(\w+))?/i)
        if (match) {
          sourceTables.push({
            tableName: match[2],
            schemaName: match[1] || 'dbo',
            alias: match[3],
            joinType: 'CROSS',
            isPrimary: false
          })
        }
      }
    }
    
    return { sourceTables, joins }
  }
  
  /**
   * Parse join condition to extract column pairs
   */
  private parseJoinCondition(condition: string): { fromColumn: string; toColumn: string }[] {
    const columns: { fromColumn: string; toColumn: string }[] = []
    
    // Match patterns like: t1.col1 = t2.col2
    const eqMatches = condition.matchAll(/(?:\[?(\w+)\]?\.)?(\w+)\s*=\s*(?:\[?(\w+)\]?\.)?(\w+)/g)
    
    for (const match of eqMatches) {
      columns.push({
        fromColumn: match[2], // Column from first side
        toColumn: match[4]    // Column from second side
      })
    }
    
    return columns
  }
  
  /**
   * Parse SELECT column list
   */
  private parseColumns(
    selectList: string, 
    explicitColumns: string[] | null,
    sourceTables: ViewSourceTable[]
  ): ViewColumn[] {
    const columns: ViewColumn[] = []
    
    // Split by comma, but handle nested parentheses
    const columnParts = this.splitSelectList(selectList)
    
    columnParts.forEach((part, index) => {
      const trimmed = part.trim()
      if (!trimmed) return
      
      // Check for * (all columns)
      if (trimmed === '*' || trimmed.endsWith('.*')) {
        // Wildcard - we'll note it but can't expand without table info
        const tablePrefix = trimmed === '*' ? '' : trimmed.replace('.*', '')
        columns.push({
          name: trimmed,
          isComputed: false,
          position: index + 1,
          isAggregate: false,
          sourceTable: tablePrefix || undefined
        })
        return
      }
      
      // Parse column expression
      const column = this.parseColumnExpression(trimmed, index, sourceTables)
      
      // Override name with explicit column name if provided
      if (explicitColumns && explicitColumns[index]) {
        column.name = explicitColumns[index]
      }
      
      columns.push(column)
    })
    
    return columns
  }
  
  /**
   * Split SELECT list respecting parentheses
   */
  private splitSelectList(selectList: string): string[] {
    const parts: string[] = []
    let current = ''
    let depth = 0
    
    for (let i = 0; i < selectList.length; i++) {
      const char = selectList[i]
      
      if (char === '(') depth++
      else if (char === ')') depth--
      else if (char === ',' && depth === 0) {
        parts.push(current.trim())
        current = ''
        continue
      }
      
      current += char
    }
    
    if (current.trim()) {
      parts.push(current.trim())
    }
    
    return parts
  }
  
  /**
   * Parse a single column expression
   */
  private parseColumnExpression(expr: string, position: number, sourceTables: ViewSourceTable[]): ViewColumn {
    // Check for alias
    // Pattern: expression AS alias or expression alias
    const aliasMatch = expr.match(/^(.+?)\s+(?:AS\s+)?(\w+)$/i)
    
    let expression = expr
    let alias: string | undefined
    
    if (aliasMatch && !expr.includes('(') || (aliasMatch && aliasMatch[1].includes(')'))) {
      expression = aliasMatch[1].trim()
      alias = aliasMatch[2]
    }
    
    // Check for aggregate functions
    const aggregateMatch = expression.match(PATTERNS.AGGREGATE)
    const isAggregate = !!aggregateMatch
    const aggregateFunction = aggregateMatch?.[0]?.replace('(', '').toUpperCase()
    
    // Check if it's a simple column reference
    const simpleRef = expression.match(/^(?:\[?(\w+)\]?\.)?(\w+)$/)
    
    if (simpleRef && !isAggregate) {
      return {
        name: alias || simpleRef[2],
        sourceColumn: simpleRef[2],
        sourceTable: simpleRef[1] || this.findSourceTable(simpleRef[2], sourceTables),
        isComputed: false,
        position: position + 1,
        isAggregate: false,
        dataType: this.inferColumnType(simpleRef[2], simpleRef[1], sourceTables)
      }
    }
    
    // Computed/expression column
    return {
      name: alias || this.generateColumnName(expression, position),
      expression: expression,
      isComputed: true,
      position: position + 1,
      isAggregate,
      aggregateFunction,
      dataType: isAggregate ? AGGREGATE_RETURN_TYPES[aggregateFunction!] : 'UNKNOWN'
    }
  }
  
  /**
   * Find source table for a column
   */
  private findSourceTable(columnName: string, sourceTables: ViewSourceTable[]): string | undefined {
    // Try to find the column in known tables
    for (const table of sourceTables) {
      const knownTable = this.knownTables.get(table.tableName.toLowerCase())
      if (knownTable) {
        const found = knownTable.columns.find(c => c.name.toLowerCase() === columnName.toLowerCase())
        if (found) {
          return table.alias || table.tableName
        }
      }
    }
    
    // Return first table if only one
    if (sourceTables.length === 1) {
      return sourceTables[0].alias || sourceTables[0].tableName
    }
    
    return undefined
  }
  
  /**
   * Infer column type from known tables
   */
  private inferColumnType(columnName: string, tableAlias: string | undefined, sourceTables: ViewSourceTable[]): string | undefined {
    // If we have a table alias, find the actual table
    if (tableAlias) {
      const table = sourceTables.find(t => 
        t.alias?.toLowerCase() === tableAlias.toLowerCase() || 
        t.tableName.toLowerCase() === tableAlias.toLowerCase()
      )
      
      if (table) {
        const knownTable = this.knownTables.get(table.tableName.toLowerCase())
        if (knownTable) {
          const column = knownTable.columns.find(c => c.name.toLowerCase() === columnName.toLowerCase())
          if (column) return column.dataType
        }
      }
    }
    
    // Try all tables
    for (const table of sourceTables) {
      const knownTable = this.knownTables.get(table.tableName.toLowerCase())
      if (knownTable) {
        const column = knownTable.columns.find(c => c.name.toLowerCase() === columnName.toLowerCase())
        if (column) return column.dataType
      }
    }
    
    return undefined
  }
  
  /**
   * Generate a column name from expression
   */
  private generateColumnName(expression: string, position: number): string {
    // If it's a function call, use function name
    const funcMatch = expression.match(/^(\w+)\s*\(/)
    if (funcMatch) {
      return `${funcMatch[1].toLowerCase()}_${position + 1}`
    }
    
    // If it's a simple reference, use that
    const refMatch = expression.match(/\.?(\w+)$/)
    if (refMatch) {
      return refMatch[1]
    }
    
    return `column_${position + 1}`
  }
  
  /**
   * Parse WHERE clause
   */
  private parseWhereClause(whereClause: string): ViewWhereClause {
    // Extract column references
    const columnRefs: string[] = []
    const refMatches = whereClause.matchAll(/(?:\[?(\w+)\]?\.)?(\w+)/g)
    
    for (const match of refMatches) {
      if (!['AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'LIKE', 'BETWEEN', 'WHERE'].includes(match[2].toUpperCase())) {
        columnRefs.push(match[0])
      }
    }
    
    // Check for parameters
    const hasParameters = /@(\w+)/.test(whereClause)
    
    return {
      rawText: whereClause,
      columnReferences: [...new Set(columnRefs)],
      hasParameters
    }
  }
  
  /**
   * Parse GROUP BY clause
   */
  private parseGroupBy(groupBy: string): string[] {
    return groupBy.split(',').map(c => c.trim())
  }
  
  /**
   * Parse ORDER BY clause
   */
  private parseOrderBy(orderBy: string): string[] {
    return orderBy.split(',').map(c => {
      const trimmed = c.trim()
      // Remove ASC/DESC
      return trimmed.replace(/\s+(ASC|DESC)\s*$/i, '').trim()
    })
  }
  
  /**
   * Parse CTEs (Common Table Expressions)
   */
  private parseCTEs(statement: string): { name: string; definition: string }[] {
    const ctes: { name: string; definition: string }[] = []
    
    const cteMatch = statement.match(/^WITH\s+(.*)$/is)
    if (!cteMatch) return ctes
    
    const cteSection = cteMatch[1]
    
    // Find CTE definitions
    const cteRegex = /(\w+)\s*(?:\([^)]+\))?\s*AS\s*\(([^)]+(?:\([^)]*\)[^)]*)*)\)/gi
    
    let match
    while ((match = cteRegex.exec(cteSection)) !== null) {
      ctes.push({
        name: match[1],
        definition: match[2].trim()
      })
    }
    
    return ctes
  }
  
  /**
   * Extract dependencies from view
   */
  private extractDependencies(sourceTables: ViewSourceTable[], selectStatement: string | null): ViewDependency[] {
    const dependencies: ViewDependency[] = []
    const seen = new Set<string>()
    
    // Add source tables as dependencies
    for (const table of sourceTables) {
      const key = `${table.schemaName}.${table.tableName}`.toLowerCase()
      if (!seen.has(key)) {
        dependencies.push({
          name: table.tableName,
          schema: table.schemaName,
          type: 'TABLE', // Could be VIEW - we'd need to check
          usage: table.isPrimary ? 'SELECT' : 'JOIN'
        })
        seen.add(key)
      }
    }
    
    // Check for function calls in SELECT
    if (selectStatement) {
      const funcMatches = selectStatement.matchAll(/\b(\w+)\s*\(/g)
      for (const match of funcMatches) {
        const funcName = match[1].toUpperCase()
        // Check if it's a built-in function
        const builtinFunctions = ['SUM', 'COUNT', 'AVG', 'MIN', 'MAX', 'COALESCE', 'ISNULL', 'CONVERT', 
          'CAST', 'SUBSTRING', 'LEN', 'GETDATE', 'DATEADD', 'DATEDIFF', 'UPPER', 'LOWER', 'LTRIM', 
          'RTRIM', 'REPLACE', 'NULLIF', 'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'NTILE', 'LAG', 'LEAD',
          'FIRST_VALUE', 'LAST_VALUE', 'STRING_AGG', 'CONCAT', 'STUFF', 'CHARINDEX', 'PATINDEX']
        
        if (!builtinFunctions.includes(funcName)) {
          const key = `dbo.${funcName}`.toLowerCase()
          if (!seen.has(key)) {
            dependencies.push({
              name: funcName,
              schema: 'dbo',
              type: 'FUNCTION',
              usage: 'FUNCTION_CALL'
            })
            seen.add(key)
          }
        }
      }
      
      // Check for subqueries that might reference other tables
      const subqueryMatches = selectStatement.matchAll(/\(\s*SELECT\s+.*?\s+FROM\s+(\w+)/gi)
      for (const match of subqueryMatches) {
        const tableName = match[1]
        const key = `dbo.${tableName}`.toLowerCase()
        if (!seen.has(key)) {
          dependencies.push({
            name: tableName,
            schema: 'dbo',
            type: 'TABLE',
            usage: 'SUBQUERY'
          })
          seen.add(key)
        }
      }
    }
    
    return dependencies
  }
  
  /**
   * Detect view type
   */
  private detectViewType(statement: string): 'STANDARD' | 'INDEXED' | 'PARTITIONED' {
    if (/CREATE\s+UNIQUE\s+CLUSTERED\s+INDEX/i.test(statement)) {
      return 'INDEXED'
    }
    // Note: Partitioned views have specific structure, would need more analysis
    return 'STANDARD'
  }
  
  /**
   * Extract WITH hints
   */
  private extractHints(statement: string): string[] {
    const hints: string[] = []
    
    if (PATTERNS.SCHEMABINDING.test(statement)) hints.push('SCHEMABINDING')
    if (PATTERNS.ENCRYPTION.test(statement)) hints.push('ENCRYPTION')
    if (/VIEW_METADATA/i.test(statement)) hints.push('VIEW_METADATA')
    
    return hints
  }
  
  /**
   * Calculate complexity score (1-10)
   */
  private calculateComplexity(params: {
    sourceTables: number
    joins: number
    columns: number
    hasSubqueries: boolean
    hasCTEs: boolean
    hasUnion: boolean
    hasGroupBy: boolean
    hasHaving: boolean
  }): number {
    let score = 1
    
    // Base complexity from table count
    score += Math.min(params.sourceTables * 0.5, 2)
    
    // JOIN complexity
    score += Math.min(params.joins * 0.5, 2)
    
    // Subqueries add significant complexity
    if (params.hasSubqueries) score += 1.5
    
    // CTEs add moderate complexity
    if (params.hasCTEs) score += 1
    
    // UNION adds complexity
    if (params.hasUnion) score += 1
    
    // GROUP BY / HAVING
    if (params.hasGroupBy) score += 0.5
    if (params.hasHaving) score += 0.5
    
    return Math.min(Math.round(score), 10)
  }
  
  /**
   * Build final result
   */
  private buildResult(): ViewParseResult {
    const parseTime = Date.now() - this.startTime
    
    return {
      views: this.views,
      errors: this.errors,
      warnings: this.warnings,
      stats: {
        totalViews: this.views.length,
        totalColumns: this.views.reduce((sum, v) => sum + v.columns.length, 0),
        totalSourceTables: this.views.reduce((sum, v) => sum + v.sourceTables.length, 0),
        totalDependencies: this.views.reduce((sum, v) => sum + v.dependencies.length, 0),
        totalJoins: this.views.reduce((sum, v) => sum + v.joins.length, 0),
        parseTimeMs: parseTime
      }
    }
  }
  
  /**
   * Generate ERD-like dependency graph for views
   */
  generateDependencyGraph(): { nodes: { id: string; type: string }[]; edges: { from: string; to: string }[] } {
    const nodes: { id: string; type: string }[] = []
    const edges: { from: string; to: string }[] = []
    const nodeSet = new Set<string>()
    
    for (const view of this.views) {
      // Add view node
      if (!nodeSet.has(view.fullName)) {
        nodes.push({ id: view.fullName, type: 'VIEW' })
        nodeSet.add(view.fullName)
      }
      
      // Add dependency nodes and edges
      for (const dep of view.dependencies) {
        const depId = `${dep.schema}.${dep.name}`
        
        if (!nodeSet.has(depId)) {
          nodes.push({ id: depId, type: dep.type })
          nodeSet.add(depId)
        }
        
        edges.push({
          from: view.fullName,
          to: depId
        })
      }
    }
    
    return { nodes, edges }
  }
  
  /**
   * Analyze view for potential issues
   */
  analyzeViewIssues(view: ParsedView): { severity: 'LOW' | 'MEDIUM' | 'HIGH'; issue: string; suggestion: string }[] {
    const issues: { severity: 'LOW' | 'MEDIUM' | 'HIGH'; issue: string; suggestion: string }[] = []
    
    // Check for SELECT *
    if (view.columns.some(c => c.name === '*' || c.name.endsWith('.*'))) {
      issues.push({
        severity: 'MEDIUM',
        issue: 'View uses SELECT *',
        suggestion: 'Explicitly list columns for better maintainability and schema binding compatibility'
      })
    }
    
    // Check for missing schema binding on complex views
    if (!view.isSchemaBound && view.complexityScore >= 5) {
      issues.push({
        severity: 'LOW',
        issue: 'Complex view without SCHEMABINDING',
        suggestion: 'Consider adding SCHEMABINDING to prevent schema changes from breaking the view'
      })
    }
    
    // Check for ORDER BY in view (can cause performance issues)
    if (view.orderByColumns.length > 0) {
      issues.push({
        severity: 'LOW',
        issue: 'View contains ORDER BY clause',
        suggestion: 'ORDER BY in views can cause performance issues. Consider ordering in the query instead.'
      })
    }
    
    // Check for high complexity
    if (view.complexityScore >= 8) {
      issues.push({
        severity: 'HIGH',
        issue: `Very high complexity score (${view.complexityScore}/10)`,
        suggestion: 'Consider breaking down into multiple simpler views or using stored procedures'
      })
    }
    
    // Check for nested subqueries
    if (view.hasSubqueries && view.joins.length > 3) {
      issues.push({
        severity: 'MEDIUM',
        issue: 'View combines subqueries with multiple JOINs',
        suggestion: 'Consider using CTEs for better readability and potential performance improvement'
      })
    }
    
    // Check for UNION without ALL
    if (view.hasUnion && view.selectStatement?.includes('UNION ') && !view.selectStatement?.includes('UNION ALL')) {
      issues.push({
        severity: 'LOW',
        issue: 'UNION without ALL performs distinct operation',
        suggestion: 'If duplicates are expected/acceptable, use UNION ALL for better performance'
      })
    }
    
    return issues
  }
}

// ============================================================================
// EXPORT CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick parse SQL content for views
 */
export function parseViews(sqlContent: string): ViewParseResult {
  const parser = new SqlViewParser()
  return parser.parse(sqlContent)
}

/**
 * Parse a single view statement
 */
export function parseView(statement: string): ParsedView | null {
  const parser = new SqlViewParser()
  return parser.parseSingle(statement)
}

/**
 * Create parser with known table definitions for type inference
 */
export function createViewParserWithTables(
  tables: { tableName: string; columns: { name: string; dataType: string }[] }[]
): SqlViewParser {
  return new SqlViewParser(tables)
}

// ============================================================================
// ADDITIONAL ANALYSIS METHODS (Extended SqlViewParser class)
// ============================================================================

/**
 * Extended parser with additional analysis methods
 * Note: Base SqlViewParser already has parseSingle() method
 */
export class ExtendedSqlViewParser extends SqlViewParser {
  /**
   * Analyze view for potential issues
   */
  analyzeViewIssues(view: ParsedView): { severity: 'LOW' | 'MEDIUM' | 'HIGH'; issue: string; suggestion: string }[] {
    const issues: { severity: 'LOW' | 'MEDIUM' | 'HIGH'; issue: string; suggestion: string }[] = []
    
    // Check for SELECT *
    if (view.columns.some(c => c.name === '*' || c.name.endsWith('.*'))) {
      issues.push({
        severity: 'MEDIUM',
        issue: 'View uses SELECT *',
        suggestion: 'Explicitly list columns for better maintainability and schema binding compatibility'
      })
    }
    
    // Check for missing schema binding on complex views
    if (!view.isSchemaBound && view.complexityScore >= 5) {
      issues.push({
        severity: 'LOW',
        issue: 'Complex view without SCHEMABINDING',
        suggestion: 'Consider adding SCHEMABINDING to prevent schema changes from breaking the view'
      })
    }
    
    // Check for ORDER BY in view (can cause performance issues)
    if (view.orderByColumns.length > 0) {
      issues.push({
        severity: 'LOW',
        issue: 'View contains ORDER BY clause',
        suggestion: 'ORDER BY in views can cause performance issues. Consider ordering in the query instead.'
      })
    }
    
    // Check for high complexity
    if (view.complexityScore >= 8) {
      issues.push({
        severity: 'HIGH',
        issue: `Very high complexity score (${view.complexityScore}/10)`,
        suggestion: 'Consider breaking down into multiple simpler views or using stored procedures'
      })
    }
    
    // Check for nested subqueries
    if (view.hasSubqueries && view.joins.length > 3) {
      issues.push({
        severity: 'MEDIUM',
        issue: 'View combines subqueries with multiple JOINs',
        suggestion: 'Consider using CTEs for better readability and potential performance improvement'
      })
    }
    
    // Check for UNION without ALL
    if (view.hasUnion && view.selectStatement?.includes('UNION ') && !view.selectStatement?.includes('UNION ALL')) {
      issues.push({
        severity: 'LOW',
        issue: 'UNION without ALL performs distinct operation',
        suggestion: 'If duplicates are expected/acceptable, use UNION ALL for better performance'
      })
    }
    
    // Check for many computed columns
    const computedCount = view.columns.filter(c => c.isComputed).length
    const computedRatio = view.columns.length > 0 ? computedCount / view.columns.length : 0
    if (computedRatio > 0.7 && view.columns.length > 5) {
      issues.push({
        severity: 'MEDIUM',
        issue: `${Math.round(computedRatio * 100)}% columns are computed`,
        suggestion: 'Consider using a stored procedure instead for complex transformations'
      })
    }
    
    // Check for missing source table (dependency issue)
    if (view.sourceTables.length === 0 && view.selectStatement) {
      issues.push({
        severity: 'HIGH',
        issue: 'No source tables detected',
        suggestion: 'View may have parsing issues or reference non-existent objects'
      })
    }
    
    return issues
  }
}
