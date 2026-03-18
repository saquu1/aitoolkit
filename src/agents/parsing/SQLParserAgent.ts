/**
 * SQL Parser Agent
 * 
 * Parses SQL DDL scripts to extract table definitions, columns,
 * foreign keys, stored procedures, and views.
 * 
 * Task: TASK-3.2d - Specialized Agent
 */

import { BaseAgent, AgentContext, AgentResult } from "@/agents/core/agent-interface"
import { z } from "zod"
import { prisma } from "@/lib/db"

// ============================================================================
// Types
// ============================================================================

export const SQLParserInputSchema = z.object({
  content: z.string().min(1, "SQL content is required"),
  fileName: z.string().optional(),
  fileType: z.enum(['sql', 'ddl', 'dml']).default('sql'),
  options: z.object({
    extractDefaults: z.boolean().default(true),
    extractComments: z.boolean().default(true),
    inferRelations: z.boolean().default(true)
  }).optional()
})

export type SQLParserInput = z.infer<typeof SQLParserInputSchema>

export interface ParsedTable {
  tableName: string
  schemaName: string
  columns: ParsedColumn[]
  primaryKey: string[]
  foreignKeys: ParsedFK[]
  indexes: ParsedIndex[]
  constraints: ParsedConstraint[]
  sourceDDL: string
}

export interface ParsedColumn {
  columnName: string
  dataType: string
  maxLength?: number
  precision?: number
  scale?: number
  isNullable: boolean
  isPrimaryKey: boolean
  isIdentity: boolean
  defaultValue?: string
  computed?: string
  collation?: string
  position: number
}

export interface ParsedFK {
  constraintName: string
  columnName: string
  referencedTable: string
  referencedSchema: string
  referencedColumn: string
  onDelete?: string
  onUpdate?: string
}

export interface ParsedIndex {
  indexName: string
  indexType: 'clustered' | 'nonclustered' | 'unique' | 'primary'
  columns: string[]
  isUnique: boolean
  filter?: string
}

export interface ParsedConstraint {
  constraintName: string
  constraintType: 'check' | 'default' | 'unique'
  definition: string
}

export interface ParsedStoredProcedure {
  spName: string
  schemaName: string
  parameters: ParsedParameter[]
  returnType?: string
  body: string
  tablesAccessed: string[]
  tablesModified: string[]
  operations: string[]
}

export interface ParsedParameter {
  parameterName: string
  dataType: string
  maxLength?: number
  precision?: number
  scale?: number
  isOutput: boolean
  isNullable?: boolean
  defaultValue?: string
  position: number
}

export interface ParsedView {
  viewName: string
  schemaName: string
  columns: string[]
  sourceTables: string[]
  sourceDDL: string
}

export interface SQLParserOutput {
  tables: ParsedTable[]
  procedures: ParsedStoredProcedure[]
  views: ParsedView[]
  parseErrors: string[]
  parseWarnings: string[]
  statistics: {
    tableCount: number
    columnCount: number
    fkCount: number
    spCount: number
    viewCount: number
    parseTime: number
  }
}

// ============================================================================
// SQL Parser Agent
// ============================================================================

export class SQLParserAgent extends BaseAgent {
  readonly id = "sql-parser"
  readonly name = "SQL Parser Agent"
  readonly version = "1.0.0"
  readonly description = "Parses SQL DDL scripts to extract table definitions, columns, foreign keys, stored procedures, and views"
  readonly category = 'parsing' as const
  readonly layer = 'schema' as const
  readonly dependsOn: string[] = []
  readonly produces = ["parsedTables", "parsedColumns", "parsedFKs", "parsedSPs", "parsedViews"]
  
  readonly inputSchema = SQLParserInputSchema
  readonly estimatedDuration = 30
  readonly requiresAI = false

  async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now()
    const input = context.input as SQLParserInput

    // Validate input
    const validation = this.validateInput(context)
    if (!validation.valid) {
      return this.createErrorResult(
        [`Invalid input: ${validation.errors.join(', ')}`]
      )
    }

    try {
      // Parse SQL content
      const output = await this.parseSQL(input)

      // Store results in shared state
      this.setSharedState(context, "parsedTables", output.tables)
      this.setSharedState(context, "parsedColumns", output.tables.flatMap(t => 
        t.columns.map(c => ({ ...c, tableName: t.tableName }))
      ))
      this.setSharedState(context, "parsedFKs", output.tables.flatMap(t =>
        t.foreignKeys.map(fk => ({ ...fk, fromTable: t.tableName }))
      ))
      this.setSharedState(context, "parsedSPs", output.procedures)
      this.setSharedState(context, "parsedViews", output.views)

      return this.createSuccessResult(
        { output },
        output.statistics.tableCount,
        output.statistics.columnCount,
        output.parseWarnings,
        {
          parsedTables: output.tables,
          parsedSPs: output.procedures,
          parsedViews: output.views
        }
      )
    } catch (error) {
      return this.createErrorResult(
        [`SQL parsing failed: ${error instanceof Error ? error.message : String(error)}`]
      )
    }
  }

  /**
   * Parse SQL content
   */
  private async parseSQL(input: SQLParserInput): Promise<SQLParserOutput> {
    const startTime = Date.now()
    const tables: ParsedTable[] = []
    const procedures: ParsedStoredProcedure[] = []
    const views: ParsedView[] = []
    const parseErrors: string[] = []
    const parseWarnings: string[] = []

    const content = input.content

    // Extract CREATE TABLE statements
    const tableMatches = this.extractCreateTables(content)
    for (const match of tableMatches) {
      try {
        const table = this.parseCreateTable(match.ddl, match.tableName, match.schema)
        tables.push(table)
      } catch (error) {
        parseWarnings.push(`Failed to parse table ${match.tableName}: ${error}`)
      }
    }

    // Extract CREATE PROCEDURE statements
    const spMatches = this.extractCreateProcedures(content)
    for (const match of spMatches) {
      try {
        const sp = this.parseStoredProcedure(match.ddl, match.spName, match.schema)
        procedures.push(sp)
      } catch (error) {
        parseWarnings.push(`Failed to parse procedure ${match.spName}: ${error}`)
      }
    }

    // Extract CREATE VIEW statements
    const viewMatches = this.extractCreateViews(content)
    for (const match of viewMatches) {
      try {
        const view = this.parseView(match.ddl, match.viewName, match.schema)
        views.push(view)
      } catch (error) {
        parseWarnings.push(`Failed to parse view ${match.viewName}: ${error}`)
      }
    }

    const columnCount = tables.reduce((sum, t) => sum + t.columns.length, 0)
    const fkCount = tables.reduce((sum, t) => sum + t.foreignKeys.length, 0)

    return {
      tables,
      procedures,
      views,
      parseErrors,
      parseWarnings,
      statistics: {
        tableCount: tables.length,
        columnCount,
        fkCount,
        spCount: procedures.length,
        viewCount: views.length,
        parseTime: Date.now() - startTime
      }
    }
  }

  /**
   * Extract CREATE TABLE statements
   */
  private extractCreateTables(content: string): Array<{
    ddl: string
    tableName: string
    schema: string
  }> {
    const results: Array<{ ddl: string; tableName: string; schema: string }> = []
    
    // Match CREATE TABLE patterns
    const regex = /CREATE\s+TABLE\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s*\(([\s\S]*?)(?:;|(?=CREATE\s+(?:TABLE|PROC|VIEW|FUNCTION))/gi
    
    let match
    while ((match = regex.exec(content)) !== null) {
      const schema = match[1] || 'dbo'
      const tableName = match[2]
      const columnDefs = match[3]
      
      results.push({
        ddl: match[0],
        tableName,
        schema
      })
    }

    return results
  }

  /**
   * Parse CREATE TABLE DDL
   */
  private parseCreateTable(
    ddl: string,
    tableName: string,
    schema: string
  ): ParsedTable {
    const columns: ParsedColumn[] = []
    const foreignKeys: ParsedFK[] = []
    const indexes: ParsedIndex[] = []
    const constraints: ParsedConstraint[] = []
    const primaryKey: string[] = []

    // Extract content between parentheses
    const contentMatch = ddl.match(/\(([\s\S]*)\)/)
    if (!contentMatch) {
      throw new Error(`Invalid table definition for ${tableName}`)
    }

    const content = contentMatch[1]
    
    // Parse columns and constraints
    const lines = this.splitColumns(content)
    
    let position = 0
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      // Check for PRIMARY KEY constraint
      if (/PRIMARY\s+KEY/i.test(trimmed)) {
        const pkMatch = trimmed.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i)
        if (pkMatch) {
          const pkColumns = pkMatch[1].split(',').map(c => 
            c.trim().replace(/[\[\]]/g, '')
          )
          primaryKey.push(...pkColumns)
        }
        continue
      }

      // Check for FOREIGN KEY constraint
      if (/FOREIGN\s+KEY/i.test(trimmed)) {
        const fkMatch = trimmed.match(
          /(?:CONSTRAINT\s+(\[?\w+\]?)\s*)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s*\(([^)]+)\)/i
        )
        if (fkMatch) {
          foreignKeys.push({
            constraintName: fkMatch[1]?.replace(/[\[\]]/g, '') || `FK_${tableName}_${fkMatch[2].replace(/[\[\]]/g, '')}`,
            columnName: fkMatch[2].replace(/[\[\]]/g, '').trim(),
            referencedSchema: fkMatch[3] || 'dbo',
            referencedTable: fkMatch[4].replace(/[\[\]]/g, ''),
            referencedColumn: fkMatch[5].replace(/[\[\]]/g, '').trim()
          })
        }
        continue
      }

      // Check for CHECK constraint
      if (/CHECK/i.test(trimmed)) {
        const checkMatch = trimmed.match(/(?:CONSTRAINT\s+(\[?\w+\]?)\s*)?CHECK\s*\(([^)]+)\)/i)
        if (checkMatch) {
          constraints.push({
            constraintName: checkMatch[1]?.replace(/[\[\]]/g, '') || `CHK_${tableName}`,
            constraintType: 'check',
            definition: checkMatch[2]
          })
        }
        continue
      }

      // Parse as column definition
      const column = this.parseColumn(trimmed, position)
      if (column) {
        columns.push(column)
        if (column.isPrimaryKey) {
          primaryKey.push(column.columnName)
        }
        position++
      }
    }

    return {
      tableName,
      schemaName: schema,
      columns,
      primaryKey,
      foreignKeys,
      indexes,
      constraints,
      sourceDDL: ddl
    }
  }

  /**
   * Parse a column definition
   */
  private parseColumn(line: string, position: number): ParsedColumn | null {
    // Skip constraint definitions
    if (/^(CONSTRAINT|PRIMARY|FOREIGN|CHECK|UNIQUE|DEFAULT)/i.test(line)) {
      return null
    }

    // Match column pattern
    const match = line.match(
      /^(\[?\w+\]?)\s+(\w+)(?:\s*\(\s*(\d+)(?:\s*,\s*(\d+))?\s*\))?\s*(IDENTITY\s*\(\s*\d+\s*,\s*\d+\s*\))?\s*(.+)?$/i
    )
    
    if (!match) return null

    const columnName = match[1].replace(/[\[\]]/g, '')
    const dataType = match[2].toUpperCase()
    const maxLength = match[3] ? parseInt(match[3]) : undefined
    const scale = match[4] ? parseInt(match[4]) : undefined
    const isIdentity = /IDENTITY/i.test(match[5] || '')
    const rest = match[6] || ''

    const isNullable = !/NOT\s+NULL/i.test(rest)
    const isPrimaryKey = /PRIMARY\s+KEY/i.test(rest)

    // Extract default value
    let defaultValue: string | undefined
    const defaultMatch = rest.match(/DEFAULT\s+([^,\s]+)/i)
    if (defaultMatch) {
      defaultValue = defaultMatch[1]
    }

    // Determine max length for common types
    let actualMaxLength = maxLength
    if (!maxLength) {
      switch (dataType) {
        case 'INT':
        case 'INTEGER':
          actualMaxLength = 4
          break
        case 'BIGINT':
          actualMaxLength = 8
          break
        case 'SMALLINT':
          actualMaxLength = 2
          break
        case 'TINYINT':
          actualMaxLength = 1
          break
        case 'BIT':
          actualMaxLength = 1
          break
        case 'DATE':
          actualMaxLength = 3
          break
        case 'DATETIME':
        case 'DATETIME2':
          actualMaxLength = 8
          break
        case 'UNIQUEIDENTIFIER':
          actualMaxLength = 16
          break
      }
    }

    return {
      columnName,
      dataType,
      maxLength: actualMaxLength,
      isNullable,
      isPrimaryKey,
      isIdentity,
      defaultValue,
      position
    }
  }

  /**
   * Split column definitions
   */
  private splitColumns(content: string): string[] {
    const result: string[] = []
    let current = ''
    let parenDepth = 0

    for (const char of content) {
      if (char === '(') parenDepth++
      else if (char === ')') parenDepth--
      else if (char === ',' && parenDepth === 0) {
        result.push(current.trim())
        current = ''
        continue
      }
      current += char
    }

    if (current.trim()) {
      result.push(current.trim())
    }

    return result
  }

  /**
   * Extract CREATE PROCEDURE statements
   */
  private extractCreateProcedures(content: string): Array<{
    ddl: string
    spName: string
    schema: string
  }> {
    const results: Array<{ ddl: string; spName: string; schema: string }> = []
    
    const regex = /CREATE\s+(?:OR\s+ALTER\s+)?PROC(?:EDURE)?\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s*\(([\s\S]*?)\)\s*AS\s*([\s\S]*?)(?=GO|CREATE\s+(?:OR\s+ALTER\s+)?(?:PROC|VIEW|FUNCTION|TABLE))/gi
    
    let match
    while ((match = regex.exec(content)) !== null) {
      results.push({
        ddl: match[0],
        spName: match[2],
        schema: match[1] || 'dbo'
      })
    }

    return results
  }

  /**
   * Parse stored procedure
   */
  private parseStoredProcedure(
    ddl: string,
    spName: string,
    schema: string
  ): ParsedStoredProcedure {
    const parameters: ParsedParameter[] = []
    let position = 0

    // Extract parameters
    const paramsMatch = ddl.match(/\(([\s\S]*?)\)\s*AS/i)
    if (paramsMatch) {
      const paramLines = paramsMatch[1].split(',').map(p => p.trim())
      
      for (const line of paramLines) {
        if (!line) continue

        const paramMatch = line.match(
          /(@\w+)\s+(\w+)(?:\s*\(\s*(\d+)(?:\s*,\s*(\d+))?\s*\))?\s*(OUTPUT|OUT)?\s*(?:=\s*(.+))?/i
        )

        if (paramMatch) {
          parameters.push({
            parameterName: paramMatch[1],
            dataType: paramMatch[2].toUpperCase(),
            maxLength: paramMatch[3] ? parseInt(paramMatch[3]) : undefined,
            scale: paramMatch[4] ? parseInt(paramMatch[4]) : undefined,
            isOutput: !!paramMatch[5],
            defaultValue: paramMatch[6]?.trim(),
            position: position++
          })
        }
      }
    }

    // Extract body
    const bodyMatch = ddl.match(/AS\s*([\s\S]*?)$/i)
    const body = bodyMatch ? bodyMatch[1] : ''

    // Find tables accessed
    const tablesAccessed: string[] = []
    const tablesModified: string[] = []
    const operations: string[] = []

    // Simple pattern matching for table access
    const selectMatch = body.matchAll(/FROM\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/gi)
    for (const m of selectMatch) {
      const tableName = m[2]
      if (!tablesAccessed.includes(tableName)) {
        tablesAccessed.push(tableName)
      }
      if (!operations.includes('SELECT')) operations.push('SELECT')
    }

    const insertMatch = body.matchAll(/INSERT\s+INTO\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/gi)
    for (const m of insertMatch) {
      const tableName = m[2]
      if (!tablesModified.includes(tableName)) {
        tablesModified.push(tableName)
      }
      if (!operations.includes('INSERT')) operations.push('INSERT')
    }

    const updateMatch = body.matchAll(/UPDATE\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/gi)
    for (const m of updateMatch) {
      const tableName = m[2]
      if (!tablesModified.includes(tableName)) {
        tablesModified.push(tableName)
      }
      if (!operations.includes('UPDATE')) operations.push('UPDATE')
    }

    const deleteMatch = body.matchAll(/DELETE\s+FROM\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/gi)
    for (const m of deleteMatch) {
      const tableName = m[2]
      if (!tablesModified.includes(tableName)) {
        tablesModified.push(tableName)
      }
      if (!operations.includes('DELETE')) operations.push('DELETE')
    }

    return {
      spName,
      schemaName: schema,
      parameters,
      body,
      tablesAccessed,
      tablesModified,
      operations
    }
  }

  /**
   * Extract CREATE VIEW statements
   */
  private extractCreateViews(content: string): Array<{
    ddl: string
    viewName: string
    schema: string
  }> {
    const results: Array<{ ddl: string; viewName: string; schema: string }> = []
    
    const regex = /CREATE\s+(?:OR\s+ALTER\s+)?VIEW\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s*AS\s*([\s\S]*?)(?=GO|CREATE\s+(?:OR\s+ALTER\s+)?(?:PROC|VIEW|FUNCTION|TABLE))/gi
    
    let match
    while ((match = regex.exec(content)) !== null) {
      results.push({
        ddl: match[0],
        viewName: match[2],
        schema: match[1] || 'dbo'
      })
    }

    return results
  }

  /**
   * Parse view
   */
  private parseView(
    ddl: string,
    viewName: string,
    schema: string
  ): ParsedView {
    // Extract tables from FROM and JOIN clauses
    const sourceTables: string[] = []
    
    const fromMatch = ddl.matchAll(/(?:FROM|JOIN)\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/gi)
    for (const m of fromMatch) {
      const tableName = m[2]
      if (!sourceTables.includes(tableName)) {
        sourceTables.push(tableName)
      }
    }

    // Extract column names from SELECT
    const columns: string[] = []
    const selectMatch = ddl.match(/SELECT\s+([\s\S]*?)\s+FROM/i)
    if (selectMatch) {
      const columnList = selectMatch[1]
      const columnNames = columnList.split(',').map(c => {
        const trimmed = c.trim()
        // Extract column name (last part after AS or last dot)
        const parts = trimmed.split(/\s+AS\s+/i)
        return parts[parts.length - 1].replace(/[\[\]]/g, '').split('.').pop() || ''
      }).filter(c => c && c !== '*')
      
      columns.push(...columnNames)
    }

    return {
      viewName,
      schemaName: schema,
      columns,
      sourceTables,
      sourceDDL: ddl
    }
  }
}

// Export singleton
export const sqlParserAgent = new SQLParserAgent()

// Register with registry
import { agentRegistry } from "@/agents/core/registry"
agentRegistry.register(sqlParserAgent)
