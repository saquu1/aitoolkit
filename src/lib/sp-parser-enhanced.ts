/**
 * Enhanced Stored Procedure Parser
 * Parses SQL Server stored procedures with full parameter extraction,
 * table access patterns, business rules, and complexity analysis
 * 
 * TASK-4.2: Enhanced SP Parser
 * Part of Phase 4: Features & User Experience
 */

export interface SPParameter {
  name: string
  type: string
  maxLength?: number
  precision?: number
  scale?: number
  isOutput: boolean
  isReadOnly: boolean
  isNullable: boolean
  defaultValue?: string
  description?: string
}

export interface TableAccess {
  tableName: string
  schema?: string
  alias?: string
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'MERGE' | 'TRUNCATE'
  columns?: string[]
  joinType?: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS'
  joinCondition?: string
}

export interface BusinessRule {
  type: 'validation' | 'constraint' | 'transformation' | 'conditional' | 'loop' | 'transaction'
  description: string
  code?: string
  lineNumber?: number
}

export interface VariableReference {
  name: string
  type: string
  scope: 'local' | 'parameter' | 'global'
  usage: 'read' | 'write' | 'both'
}

export interface SPIntelligence {
  purpose: 'dropdown' | 'crud' | 'report' | 'workflow' | 'batch' | 'utility' | 'api' | 'trigger'
  returnType: 'table' | 'scalar' | 'none' | 'multiple'
  estimatedRuntime: 'fast' | 'medium' | 'slow' | 'unknown'
  complexity: number
  riskLevel: 'low' | 'medium' | 'high'
  containsDynamicSQL: boolean
  usesTransactions: boolean
  usesCursors: boolean
  hasErrorHandling: boolean
  hasLogging: boolean
}

export interface ParsedStoredProcedure {
  // Identity
  name: string
  schema: string
  fullName: string

  // Parameters
  parameters: SPParameter[]

  // Table Operations
  tablesAccessed: TableAccess[]

  // Business Logic
  businessRules: BusinessRule[]
  validations: string[]

  // Variables
  variables: VariableReference[]

  // Intelligence
  intelligence: SPIntelligence

  // Metrics
  metrics: {
    lineCount: number
    characterCount: number
    statementCount: number
    joinCount: number
    subqueryCount: number
    tempTableCount: number
    cteCount: number
  }

  // Raw
  body: string
  headerComments: string[]
}

export interface ParseResult<T> {
  data: T
  errors: string[]
  warnings: string[]
}

/**
 * Enhanced Stored Procedure Parser Class
 */
export class EnhancedSPParser {
  private errors: string[] = []
  private warnings: string[] = []

  /**
   * Parse stored procedure content
   */
  parse(content: string): ParseResult<ParsedStoredProcedure[]> {
    this.errors = []
    this.warnings = []

    const procedures: ParsedStoredProcedure[] = []

    // Find all CREATE PROCEDURE statements
    const procMatches = this.findProcedures(content)

    for (const match of procMatches) {
      try {
        const procedure = this.parseProcedure(match.content, match.startLine)
        if (procedure) {
          procedures.push(procedure)
        }
      } catch (e: any) {
        this.errors.push(`Failed to parse procedure: ${e.message}`)
      }
    }

    return {
      data: procedures,
      errors: this.errors,
      warnings: this.warnings
    }
  }

  /**
   * Find all procedure definitions in content
   */
  private findProcedures(content: string): Array<{ content: string; startLine: number }> {
    const procedures: Array<{ content: string; startLine: number }> = []

    // Multiple patterns to match different SP formats
    const patterns = [
      // Standard CREATE PROCEDURE
      /CREATE\s+(?:OR\s+ALTER\s+)?(?:PROC|PROCEDURE)\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s*(?:\(([^)]*)\)|([^\n]*))?\s*AS\s*([\s\S]*?)(?=(?:CREATE|ALTER|GO|$))/gi,
      // CREATE PROC with @params after name
      /CREATE\s+(?:OR\s+ALTER\s+)?(?:PROC|PROCEDURE)\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s*\n?\s*(@[\s\S]*?)\s*AS\s*([\s\S]*?)(?=(?:CREATE|ALTER|GO|$))/gi
    ]

    for (const pattern of patterns) {
      let match
      while ((match = pattern.exec(content)) !== null) {
        const startLine = content.substring(0, match.index).split('\n').length
        const fullMatch = match[0]

        // Check if this procedure was already found
        const alreadyFound = procedures.some(p =>
          fullMatch.includes(p.content) || p.content.includes(fullMatch)
        )

        if (!alreadyFound) {
          procedures.push({
            content: fullMatch,
            startLine
          })
        }
      }
    }

    return procedures
  }

  /**
   * Parse individual procedure
   */
  private parseProcedure(content: string, startLine: number): ParsedStoredProcedure | null {
    // Extract procedure name
    const nameMatch = content.match(/(?:CREATE|ALTER)\s+(?:OR\s+ALTER\s+)?(?:PROC|PROCEDURE)\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/i)
    if (!nameMatch) return null

    const schema = nameMatch[1] || 'dbo'
    const name = nameMatch[2]

    // Extract parameter section
    const paramSection = this.extractParameterSection(content)
    const parameters = this.parseParameters(paramSection)

    // Extract body
    const body = this.extractBody(content)

    // Extract header comments
    const headerComments = this.extractHeaderComments(content)

    // Parse table access
    const tablesAccessed = this.extractTableAccess(body)

    // Extract business rules
    const businessRules = this.extractBusinessRules(body)

    // Extract validations
    const validations = this.extractValidations(body)

    // Extract variables
    const variables = this.extractVariables(body, parameters)

    // Calculate intelligence
    const intelligence = this.analyzeIntelligence(name, body, parameters, tablesAccessed)

    // Calculate metrics
    const metrics = this.calculateMetrics(body)

    return {
      name,
      schema,
      fullName: `[${schema}].[${name}]`,
      parameters,
      tablesAccessed,
      businessRules,
      validations,
      variables,
      intelligence,
      metrics,
      body,
      headerComments
    }
  }

  /**
   * Extract parameter section from procedure definition
   */
  private extractParameterSection(content: string): string {
    // Find content between procedure name and AS
    const match = content.match(/(?:PROC|PROCEDURE)\s+(?:\[?\w+\]?\.)?\[?\w+\]?\s*([\s\S]*?)\s*AS\s/i)
    return match ? match[1].trim() : ''
  }

  /**
   * Parse parameters from parameter section
   */
  private parseParameters(paramSection: string): SPParameter[] {
    const parameters: SPParameter[] = []

    if (!paramSection || paramSection.length === 0) return parameters

    // Match @param_name patterns
    const paramRegex = /@(\w+)\s+((?:\w+(?:\s*\(\s*\d+\s*(?:,\s*\d+)?\s*\))?)?)\s*(OUTPUT|OUT|READONLY)?\s*(?:=\s*([^,\n]+))?\s*(?:,|$)/gi

    let match
    while ((match = paramRegex.exec(paramSection)) !== null) {
      const name = match[1]
      const typeStr = match[2].trim()
      const modifier = match[3]?.toUpperCase() || ''
      const defaultValue = match[4]?.trim()

      const { type, maxLength, precision, scale } = this.parseDataType(typeStr)

      parameters.push({
        name: `@${name}`,
        type,
        maxLength,
        precision,
        scale,
        isOutput: modifier === 'OUTPUT' || modifier === 'OUT',
        isReadOnly: modifier === 'READONLY',
        isNullable: !defaultValue || defaultValue.toUpperCase() === 'NULL',
        defaultValue: defaultValue?.trim()
      })
    }

    return parameters
  }

  /**
   * Parse SQL data type
   */
  private parseDataType(typeStr: string): {
    type: string
    maxLength?: number
    precision?: number
    scale?: number
  } {
    const match = typeStr.match(/(\w+)(?:\s*\(\s*(\d+)(?:\s*,\s*(\d+))?\s*\))?/)
    if (!match) return { type: typeStr }

    const type = match[1].toUpperCase()
    const firstNum = match[2] ? parseInt(match[2]) : undefined
    const secondNum = match[3] ? parseInt(match[3]) : undefined

    // Determine if it's length, precision, or both
    if (['DECIMAL', 'NUMERIC'].includes(type)) {
      return { type, precision: firstNum, scale: secondNum }
    } else if (['VARCHAR', 'NVARCHAR', 'CHAR', 'NCHAR', 'VARBINARY'].includes(type)) {
      return { type, maxLength: firstNum === -1 ? -1 : firstNum }
    }

    return { type }
  }

  /**
   * Extract procedure body
   */
  private extractBody(content: string): string {
    // Find AS followed by body
    const match = content.match(/AS\s+([\s\S]*?)$/i)
    return match ? match[1].trim() : ''
  }

  /**
   * Extract header comments
   */
  private extractHeaderComments(content: string): string[] {
    const comments: string[] = []
    const lines = content.split('\n')
    let inComment = false
    let currentComment = ''

    for (const line of lines) {
      const trimmed = line.trim()

      if (trimmed.startsWith('/*')) {
        inComment = true
        currentComment = trimmed.substring(2)
      } else if (inComment) {
        if (trimmed.includes('*/')) {
          currentComment += trimmed.replace('*/', '')
          comments.push(currentComment.trim())
          currentComment = ''
          inComment = false
        } else {
          currentComment += ' ' + trimmed
        }
      } else if (trimmed.startsWith('--')) {
        comments.push(trimmed.substring(2).trim())
      }

      // Stop at AS keyword
      if (trimmed.toUpperCase().startsWith('AS ') || trimmed.toUpperCase() === 'AS') {
        break
      }
    }

    return comments.filter(c => c.length > 0)
  }

  /**
   * Extract table access patterns
   */
  private extractTableAccess(body: string): TableAccess[] {
    const accesses: TableAccess[] = []
    const seen = new Set<string>()

    // INSERT patterns
    this.extractInsertStatements(body, accesses, seen)

    // UPDATE patterns
    this.extractUpdateStatements(body, accesses, seen)

    // DELETE patterns
    this.extractDeleteStatements(body, accesses, seen)

    // MERGE patterns
    this.extractMergeStatements(body, accesses, seen)

    // SELECT patterns
    this.extractSelectStatements(body, accesses, seen)

    return accesses
  }

  /**
   * Extract INSERT statements
   */
  private extractInsertStatements(body: string, accesses: TableAccess[], seen: Set<string>): void {
    const insertRegex = /INSERT\s+(?:INTO\s+)?(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s*(?:\(([^)]+)\))?\s*(?:VALUES|SELECT|DEFAULT\s+VALUES|EXEC)/gi

    let match
    while ((match = insertRegex.exec(body)) !== null) {
      const schema = match[1] || 'dbo'
      const tableName = match[2]
      const columns = match[3]?.split(',').map(c => c.trim().replace(/[\[\]]/g, ''))

      const key = `${schema}.${tableName}.INSERT`
      if (!seen.has(key)) {
        seen.add(key)
        accesses.push({
          tableName,
          schema,
          operation: 'INSERT',
          columns
        })
      }
    }
  }

  /**
   * Extract UPDATE statements
   */
  private extractUpdateStatements(body: string, accesses: TableAccess[], seen: Set<string>): void {
    const updateRegex = /UPDATE\s+(?:TOP\s*\(\s*\d+\s*\)\s+)?(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s*(?:AS\s+\w+)?\s+SET/gi

    let match
    while ((match = updateRegex.exec(body)) !== null) {
      const schema = match[1] || 'dbo'
      const tableName = match[2]

      const key = `${schema}.${tableName}.UPDATE`
      if (!seen.has(key)) {
        seen.add(key)
        accesses.push({
          tableName,
          schema,
          operation: 'UPDATE'
        })
      }
    }
  }

  /**
   * Extract DELETE statements
   */
  private extractDeleteStatements(body: string, accesses: TableAccess[], seen: Set<string>): void {
    const deleteRegex = /DELETE\s+(?:TOP\s*\(\s*\d+\s*\)\s+)?FROM\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/gi

    let match
    while ((match = deleteRegex.exec(body)) !== null) {
      const schema = match[1] || 'dbo'
      const tableName = match[2]

      const key = `${schema}.${tableName}.DELETE`
      if (!seen.has(key)) {
        seen.add(key)
        accesses.push({
          tableName,
          schema,
          operation: 'DELETE'
        })
      }
    }
  }

  /**
   * Extract MERGE statements
   */
  private extractMergeStatements(body: string, accesses: TableAccess[], seen: Set<string>): void {
    const mergeRegex = /MERGE\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s+AS\s+\w+/gi

    let match
    while ((match = mergeRegex.exec(body)) !== null) {
      const schema = match[1] || 'dbo'
      const tableName = match[2]

      const key = `${schema}.${tableName}.MERGE`
      if (!seen.has(key)) {
        seen.add(key)
        accesses.push({
          tableName,
          schema,
          operation: 'MERGE'
        })
      }
    }
  }

  /**
   * Extract SELECT statements
   */
  private extractSelectStatements(body: string, accesses: TableAccess[], seen: Set<string>): void {
    // FROM clause patterns
    const fromRegex = /FROM\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s*(?:AS\s+)?(\w+)?/gi

    let match
    while ((match = fromRegex.exec(body)) !== null) {
      const schema = match[1] || 'dbo'
      const tableName = match[2]
      const alias = match[3]

      const key = `${schema}.${tableName}.SELECT`
      if (!seen.has(key)) {
        seen.add(key)
        accesses.push({
          tableName,
          schema,
          alias,
          operation: 'SELECT'
        })
      }
    }

    // JOIN patterns
    const joinRegex = /((?:LEFT|RIGHT|INNER|FULL|CROSS)\s+)?OUTER\s+)?JOIN\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s*(?:AS\s+)?(\w+)?\s*ON\s+([\w.\s=]+)/gi

    while ((match = joinRegex.exec(body)) !== null) {
      const joinType = (match[1] || 'INNER').trim().toUpperCase() as TableAccess['joinType']
      const schema = match[2] || 'dbo'
      const tableName = match[3]
      const alias = match[4]
      const joinCondition = match[5]

      const key = `${schema}.${tableName}.JOIN`
      if (!seen.has(key)) {
        seen.add(key)
        accesses.push({
          tableName,
          schema,
          alias,
          operation: 'SELECT',
          joinType,
          joinCondition
        })
      }
    }
  }

  /**
   * Extract business rules
   */
  private extractBusinessRules(body: string): BusinessRule[] {
    const rules: BusinessRule[] = []
    const lines = body.split('\n')

    lines.forEach((line, idx) => {
      // IF conditions - conditional logic
      if (/\bIF\s+(?:NOT\s+)?EXISTS\b/i.test(line)) {
        rules.push({
          type: 'conditional',
          description: 'Existence check before operation',
          code: line.trim(),
          lineNumber: idx + 1
        })
      }

      // WHILE loops
      if (/\bWHILE\s+/i.test(line)) {
        rules.push({
          type: 'loop',
          description: 'Iterative processing loop',
          code: line.trim(),
          lineNumber: idx + 1
        })
      }

      // Transactions
      if (/\bBEGIN\s+TRAN/i.test(line)) {
        rules.push({
          type: 'transaction',
          description: 'Transaction boundary start',
          code: line.trim(),
          lineNumber: idx + 1
        })
      }
    })

    // RAISERROR/THROW - error handling
    if (/RAISERROR|THROW/i.test(body)) {
      rules.push({
        type: 'validation',
        description: 'Error handling with custom error messages'
      })
    }

    // RETURN with value
    if (/RETURN\s+@?\w+/i.test(body)) {
      rules.push({
        type: 'transformation',
        description: 'Returns status/error code'
      })
    }

    return rules
  }

  /**
   * Extract validations
   */
  private extractValidations(body: string): string[] {
    const validations: string[] = []

    // Check for common validation patterns
    const patterns = [
      { regex: /IF\s+@(\w+)\s+IS\s+NULL/i, description: 'Null parameter check for @%s' },
      { regex: /IF\s+NOT\s+EXISTS\s*\(/i, description: 'Existence validation' },
      { regex: /IF\s+@@ROWCOUNT\s*=\s*0/i, description: 'No rows affected check' },
      { regex: /IF\s+@@ERROR\s*<>\s*0/i, description: 'Error check' },
      { regex: /LEN\s*\(\s*@\w+\s*\)\s*=\s*0/i, description: 'Empty string check' },
      { regex: /LIKE\s+['"][^'"]+['"]/gi, description: 'Pattern validation' },
      { regex: /BETWEEN\s+\S+\s+AND\s+\S+/i, description: 'Range validation' },
      { regex: /IN\s*\([^)]+\)/gi, description: 'Allowed values check' }
    ]

    for (const pattern of patterns) {
      if (pattern.regex.test(body)) {
        const match = body.match(pattern.regex)
        if (match) {
          const desc = pattern.description.replace('%s', match[1] || '')
          if (!validations.includes(desc)) {
            validations.push(desc)
          }
        }
      }
    }

    return validations
  }

  /**
   * Extract variables
   */
  private extractVariables(body: string, parameters: SPParameter[]): VariableReference[] {
    const variables: VariableReference[] = []
    const seen = new Set<string>()

    // Parameters are already variables
    for (const param of parameters) {
      seen.add(param.name)
      variables.push({
        name: param.name,
        type: param.type,
        scope: 'parameter',
        usage: param.isOutput ? 'both' : 'read'
      })
    }

    // DECLARE statements
    const declareRegex = /DECLARE\s+@(\w+)\s+((?:\w+(?:\s*\(\s*\d+\s*(?:,\s*\d+)?\s*\))?)?)/gi
    let match
    while ((match = declareRegex.exec(body)) !== null) {
      const name = `@${match[1]}`
      const type = match[2].trim()

      if (!seen.has(name)) {
        seen.add(name)
        variables.push({
          name,
          type,
          scope: 'local',
          usage: 'write' // Will be updated if read
        })
      }
    }

    // Check for reads/writes
    for (const v of variables) {
      const name = v.name.replace('@', '')
      const readPattern = new RegExp(`[@\\s]${name}[^=]`, 'i')
      const writePattern = new RegExp(`@${name}\\s*=`, 'i')

      const hasRead = readPattern.test(body)
      const hasWrite = writePattern.test(body)

      if (hasRead && hasWrite) {
        v.usage = 'both'
      } else if (hasRead) {
        v.usage = v.scope === 'parameter' ? 'read' : 'both'
      } else if (hasWrite) {
        v.usage = 'write'
      }
    }

    return variables
  }

  /**
   * Analyze procedure intelligence
   */
  private analyzeIntelligence(
    name: string,
    body: string,
    parameters: SPParameter[],
    tablesAccessed: TableAccess[]
  ): SPIntelligence {
    // Determine purpose from name patterns
    const purpose = this.inferPurpose(name, body)

    // Determine return type
    const returnType = this.determineReturnType(body)

    // Calculate complexity
    const complexity = this.calculateComplexity(body)

    // Check for dynamic SQL
    const containsDynamicSQL = this.checkDynamicSQL(body)

    // Check for transactions
    const usesTransactions = /\bBEGIN\s+TRAN/i.test(body)

    // Check for cursors
    const usesCursors = /\bDECLARE\s+\w+\s+CURSOR/i.test(body)

    // Check for error handling
    const hasErrorHandling = /\bTRY\s*\{/i.test(body) || /\bCATCH\b/i.test(body) ||
      /@@ERROR/i.test(body)

    // Check for logging
    const hasLogging = body.toLowerCase().includes('log') ||
      body.toLowerCase().includes('audit') ||
      body.toLowerCase().includes('history')

    // Estimate runtime
    const estimatedRuntime = this.estimateRuntime(complexity, tablesAccessed, usesCursors)

    // Risk level
    const riskLevel = this.assessRisk(complexity, containsDynamicSQL, usesTransactions)

    return {
      purpose,
      returnType,
      estimatedRuntime,
      complexity,
      riskLevel,
      containsDynamicSQL,
      usesTransactions,
      usesCursors,
      hasErrorHandling,
      hasLogging
    }
  }

  /**
   * Infer procedure purpose
   */
  private inferPurpose(name: string, body: string): SPIntelligence['purpose'] {
    const nameLower = name.toLowerCase()

    // Dropdown/list procedures
    if (nameLower.includes('ddl') || nameLower.includes('dropdown') ||
      nameLower.includes('list') || nameLower.includes('getall')) {
      return 'dropdown'
    }

    // Report procedures
    if (nameLower.includes('report') || nameLower.includes('rpt') ||
      nameLower.includes('summary') || nameLower.includes('stats')) {
      return 'report'
    }

    // CRUD operations
    if (nameLower.includes('add') || nameLower.includes('create') ||
      nameLower.includes('insert') || nameLower.includes('save')) {
      return 'crud'
    }
    if (nameLower.includes('update') || nameLower.includes('modify') ||
      nameLower.includes('edit')) {
      return 'crud'
    }
    if (nameLower.includes('delete') || nameLower.includes('remove')) {
      return 'crud'
    }

    // Workflow procedures
    if (body.includes('BEGIN TRANSACTION') || body.includes('BEGIN TRAN') ||
      body.includes('COMMIT') || body.includes('ROLLBACK')) {
      return 'workflow'
    }

    // Batch procedures
    if (nameLower.includes('batch') || nameLower.includes('process') ||
      nameLower.includes('import') || nameLower.includes('export')) {
      return 'batch'
    }

    // API procedures (typically return JSON)
    if (nameLower.includes('api') || body.toLowerCase().includes('for json')) {
      return 'api'
    }

    return 'utility'
  }

  /**
   * Determine return type
   */
  private determineReturnType(body: string): SPIntelligence['returnType'] {
    // Check for SELECT at end (table return)
    const selectMatches = body.match(/SELECT[\s\S]*?(?=$|ORDER\s+BY)/gi) || []

    if (selectMatches.length > 1) {
      return 'multiple'
    }

    if (selectMatches.length === 1) {
      return 'table'
    }

    // Check for RETURN with value
    if (/RETURN\s+@?\w+\s*$/im.test(body)) {
      return 'scalar'
    }

    return 'none'
  }

  /**
   * Calculate complexity score
   */
  private calculateComplexity(body: string): number {
    let score = 0

    // Control structures
    score += (body.match(/\bIF\b/gi) || []).length * 2
    score += (body.match(/\bWHILE\b/gi) || []).length * 5
    score += (body.match(/\bCASE\b/gi) || []).length * 2

    // Cursors add significant complexity
    score += (body.match(/\bCURSOR\b/gi) || []).length * 15

    // Dynamic SQL
    if (/sp_executesql|EXEC\s*\(/i.test(body)) {
      score += 10
    }

    // Joins
    score += (body.match(/\bJOIN\b/gi) || []).length * 2

    // Subqueries
    score += (body.match(/\(SELECT/gi) || []).length * 3

    // CTEs
    score += (body.match(/\bWITH\s+\w+\s+AS\s*\(/gi) || []).length * 4

    // Temp tables
    score += (body.match(/#\w+/g) || []).length * 3

    // Transactions
    score += (body.match(/\bBEGIN\s+TRAN/gi) || []).length * 3

    // Error handling
    score += (body.match(/\bTRY\b/gi) || []).length * 2
    score += (body.match(/\bCATCH\b/gi) || []).length * 2

    return score
  }

  /**
   * Check for dynamic SQL
   */
  private checkDynamicSQL(body: string): boolean {
    return /sp_executesql|EXEC\s*\(|EXECUTE\s*\(/i.test(body)
  }

  /**
   * Estimate runtime
   */
  private estimateRuntime(
    complexity: number,
    tablesAccessed: TableAccess[],
    usesCursors: boolean
  ): SPIntelligence['estimatedRuntime'] {
    if (usesCursors) return 'slow'

    if (complexity > 50 || tablesAccessed.length > 5) return 'slow'
    if (complexity > 20 || tablesAccessed.length > 2) return 'medium'
    return 'fast'
  }

  /**
   * Assess risk level
   */
  private assessRisk(
    complexity: number,
    containsDynamicSQL: boolean,
    usesTransactions: boolean
  ): SPIntelligence['riskLevel'] {
    if (containsDynamicSQL) return 'high'
    if (complexity > 40 && usesTransactions) return 'high'
    if (complexity > 20 || usesTransactions) return 'medium'
    return 'low'
  }

  /**
   * Calculate metrics
   */
  private calculateMetrics(body: string): ParsedStoredProcedure['metrics'] {
    return {
      lineCount: body.split('\n').length,
      characterCount: body.length,
      statementCount: (body.match(/;/g) || []).length + (body.match(/\bSELECT\b/gi) || []).length,
      joinCount: (body.match(/\bJOIN\b/gi) || []).length,
      subqueryCount: (body.match(/\(SELECT/gi) || []).length,
      tempTableCount: (body.match(/#\w+/g) || []).length,
      cteCount: (body.match(/\bWITH\s+\w+\s+AS\s*\(/gi) || []).length
    }
  }
}

// Export singleton
export const spParser = new EnhancedSPParser()

/**
 * Quick parse function
 */
export function parseStoredProcedure(content: string): ParseResult<ParsedStoredProcedure[]> {
  return spParser.parse(content)
}
