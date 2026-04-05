import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseSqlServer } from '@/lib/sql-parser'

// ============================================================================
// Types
// ============================================================================

interface ParsedTable {
  name: string
  columns: Array<{
    name: string
    dataType: string
    isNullable: boolean
    isPrimaryKey: boolean
    isIdentity: boolean
    defaultValue?: string
  }>
  foreignKeys: Array<{
    columnName: string
    referencesTable: string
    referencesColumn: string
  }>
}

interface PreviewResult {
  tables: ParsedTable[]
  totalTables: number
  totalColumns: number
  totalForeignKeys: number
  warnings: string[]
  errors: string[]
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  tables: string[]
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse SQL DDL and extract table definitions
 */
function parseSQLSchema(content: string): PreviewResult {
  const result = parseSqlServer(content)
  
  const tables: ParsedTable[] = result.tables.map(t => ({
    name: t.tableName,
    columns: t.columns.map(c => ({
      name: c.name,
      dataType: c.dataType,
      isNullable: c.isNullable,
      isPrimaryKey: c.isPrimaryKey,
      isIdentity: c.isIdentity,
      defaultValue: c.defaultValue
    })),
    foreignKeys: t.foreignKeys.map(fk => ({
      columnName: fk.columnName,
      referencesTable: fk.referencesTable,
      referencesColumn: fk.referencesColumn
    }))
  }))

  return {
    tables,
    totalTables: result.tables.length,
    totalColumns: result.stats.totalColumns,
    totalForeignKeys: result.stats.totalForeignKeys,
    warnings: result.warnings,
    errors: result.errors
  }
}

/**
 * Parse Prisma schema and extract model definitions
 */
function parsePrismaSchema(content: string): PreviewResult {
  const errors: string[] = []
  const warnings: string[] = []
  const tables: ParsedTable[] = []

  // Basic Prisma schema parsing
  const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g
  let match

  while ((match = modelRegex.exec(content)) !== null) {
    const modelName = match[1]
    const body = match[2]
    const columns: ParsedTable['columns'] = []
    const foreignKeys: ParsedTable['foreignKeys'] = []

    // Parse fields
    const lines = body.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) continue

      // Match field pattern: fieldName Type @attributes
      const fieldMatch = trimmed.match(/^(\w+)\s+(\w+)(?:\(([^)]*)\))?(.*)$/)
      if (fieldMatch) {
        const [, fieldName, fieldType, , attributes] = fieldMatch
        
        const isPrimaryKey = attributes?.includes('@id') || false
        const isNullable = attributes?.includes('?') || false
        const isIdentity = attributes?.includes('@default(autoincrement())') || false
        
        // Check for relation
        const relationMatch = attributes?.match(/@relation\([^)]*fields:\[(\w+)\][^)]*references:\[(\w+)\]/)
        if (relationMatch) {
          foreignKeys.push({
            columnName: relationMatch[1],
            referencesTable: fieldType,
            referencesColumn: relationMatch[2]
          })
        }

        columns.push({
          name: fieldName,
          dataType: fieldType,
          isNullable,
          isPrimaryKey,
          isIdentity,
          defaultValue: undefined
        })
      }
    }

    tables.push({ name: modelName, columns, foreignKeys })
  }

  return {
    tables,
    totalTables: tables.length,
    totalColumns: tables.reduce((sum, t) => sum + t.columns.length, 0),
    totalForeignKeys: tables.reduce((sum, t) => sum + t.foreignKeys.length, 0),
    warnings,
    errors
  }
}

/**
 * Validate schema content
 */
function validateSchema(content: string, schemaType: string): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const tables: string[] = []

  if (!content || content.trim().length === 0) {
    return { isValid: false, errors: ['Schema content is empty'], warnings: [], tables: [] }
  }

  if (schemaType === 'sql') {
    const result = parseSqlServer(content)
    
    if (result.errors.length > 0) {
      errors.push(...result.errors)
    }
    
    if (result.warnings.length > 0) {
      warnings.push(...result.warnings)
    }

    tables.push(...result.tables.map(t => t.tableName))

    // Check for common issues
    if (result.tables.length === 0) {
      errors.push('No tables found in schema')
    }

    // Check for tables without primary keys
    for (const table of result.tables) {
      const hasPK = table.columns.some(c => c.isPrimaryKey)
      if (!hasPK) {
        warnings.push(`Table "${table.tableName}" has no primary key defined`)
      }
    }

  } else if (schemaType === 'prisma') {
    const result = parsePrismaSchema(content)
    
    if (result.errors.length > 0) {
      errors.push(...result.errors)
    }
    
    if (result.warnings.length > 0) {
      warnings.push(...result.warnings)
    }

    tables.push(...result.tables.map(t => t.name))

    if (result.tables.length === 0) {
      errors.push('No models found in Prisma schema')
    }

    // Check for models without @id
    for (const table of result.tables) {
      const hasID = table.columns.some(c => c.isPrimaryKey)
      if (!hasID) {
        warnings.push(`Model "${table.name}" has no @id field`)
      }
    }
  } else {
    errors.push(`Unsupported schema type: ${schemaType}`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    tables
  }
}

/**
 * Generate migration preview
 */
function generateMigrationPreview(tables: ParsedTable[], projectId: string): string {
  const lines: string[] = [
    '-- Migration Preview',
    `-- Project: ${projectId}`,
    `-- Generated: ${new Date().toISOString()}`,
    '-- Tables to be created/updated:',
    ''
  ]

  for (const table of tables) {
    lines.push(`-- Table: ${table.name}`)
    lines.push(`--   Columns: ${table.columns.length}`)
    lines.push(`--   Foreign Keys: ${table.foreignKeys.length}`)
    
    // Show column details
    for (const col of table.columns) {
      const constraints = []
      if (col.isPrimaryKey) constraints.push('PK')
      if (!col.isNullable) constraints.push('NOT NULL')
      if (col.isIdentity) constraints.push('IDENTITY')
      lines.push(`--     ${col.name} ${col.dataType}${constraints.length ? ' [' + constraints.join(', ') + ']' : ''}`)
    }
    
    // Show foreign key details
    for (const fk of table.foreignKeys) {
      lines.push(`--     FK: ${fk.columnName} -> ${fk.referencesTable}(${fk.referencesColumn})`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

// ============================================================================
// API Handlers
// ============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const projectId = searchParams.get('projectId')

  try {
    switch (action) {
      case 'list': {
        if (!projectId) {
          return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
        }

        const applies = await db.schemaApply.findMany({
          where: { projectId },
          orderBy: { createdAt: 'desc' },
          take: 50
        })

        return NextResponse.json({ 
          success: true, 
          applies,
          total: applies.length
        })
      }

      case 'get': {
        const id = searchParams.get('id')
        if (!id) {
          return NextResponse.json({ error: 'id is required' }, { status: 400 })
        }

        const apply = await db.schemaApply.findUnique({
          where: { id }
        })

        if (!apply) {
          return NextResponse.json({ error: 'Schema apply not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true, apply })
      }

      case 'stats': {
        if (!projectId) {
          return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
        }

        const stats = await db.schemaApply.groupBy({
          by: ['status'],
          where: { projectId },
          _count: { id: true }
        })

        const total = await db.schemaApply.count({
          where: { projectId }
        })

        const statusCounts: Record<string, number> = {}
        for (const stat of stats) {
          statusCounts[stat.status] = stat._count.id
        }

        return NextResponse.json({
          success: true,
          stats: {
            total,
            byStatus: statusCounts
          }
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Schema Apply GET error:', error)
    return NextResponse.json({ 
      error: 'Failed to process request',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, projectId, schemaContent, schemaType, name, id } = body

    switch (action) {
      // ========================================================================
      // Preview - Dry run to see what changes would be made
      // ========================================================================
      case 'preview': {
        if (!schemaContent || !schemaType) {
          return NextResponse.json({ 
            error: 'schemaContent and schemaType are required' 
          }, { status: 400 })
        }

        const preview = schemaType === 'sql' 
          ? parseSQLSchema(schemaContent)
          : parsePrismaSchema(schemaContent)

        const validation = validateSchema(schemaContent, schemaType)

        const migrationPreview = generateMigrationPreview(preview.tables, projectId || 'preview')

        return NextResponse.json({
          success: true,
          preview: {
            ...preview,
            validation,
            migrationPreview,
            canApply: validation.isValid
          }
        })
      }

      // ========================================================================
      // Validate - Check schema syntax and structure
      // ========================================================================
      case 'validate': {
        if (!schemaContent || !schemaType) {
          return NextResponse.json({ 
            error: 'schemaContent and schemaType are required' 
          }, { status: 400 })
        }

        const validation = validateSchema(schemaContent, schemaType)

        return NextResponse.json({
          success: true,
          validation
        })
      }

      // ========================================================================
      // Apply - Save schema and mark as pending for actual application
      // ========================================================================
      case 'apply': {
        if (!projectId || !schemaContent || !schemaType || !name) {
          return NextResponse.json({ 
            error: 'projectId, schemaContent, schemaType, and name are required' 
          }, { status: 400 })
        }

        // First validate
        const validation = validateSchema(schemaContent, schemaType)
        if (!validation.isValid) {
          return NextResponse.json({ 
            error: 'Schema validation failed',
            validation 
          }, { status: 400 })
        }

        // Parse schema
        const preview = schemaType === 'sql' 
          ? parseSQLSchema(schemaContent)
          : parsePrismaSchema(schemaContent)

        // Create SchemaApply record
        const apply = await db.schemaApply.create({
          data: {
            projectId,
            name,
            schemaType,
            schemaContent,
            status: 'pending'
          }
        })

        // For each table in the schema, create or update in ToolkitTable
        let tablesCreated = 0
        let tablesUpdated = 0

        for (const table of preview.tables) {
          const existing = await db.toolkitTable.findFirst({
            where: { projectId, tableName: table.name }
          })

          const tableData = {
            columns: JSON.stringify(table.columns),
            foreignKeys: JSON.stringify(table.foreignKeys),
            indexes: '[]',
            constraints: '[]',
            status: 'complete'
          }

          if (existing) {
            await db.toolkitTable.update({
              where: { id: existing.id },
              data: tableData
            })
            tablesUpdated++
          } else {
            await db.toolkitTable.create({
              data: {
                projectId,
                tableName: table.name,
                ...tableData
              }
            })
            tablesCreated++
          }
        }

        // Mark as applied
        await db.schemaApply.update({
          where: { id: apply.id },
          data: {
            status: 'applied',
            appliedAt: new Date()
          }
        })

        return NextResponse.json({
          success: true,
          apply: {
            id: apply.id,
            name: apply.name,
            status: 'applied',
            tablesCreated,
            tablesUpdated,
            appliedAt: new Date()
          }
        })
      }

      // ========================================================================
      // Rollback - Mark schema as rolled back
      // ========================================================================
      case 'rollback': {
        if (!id) {
          return NextResponse.json({ 
            error: 'id is required' 
          }, { status: 400 })
        }

        const apply = await db.schemaApply.findUnique({
          where: { id }
        })

        if (!apply) {
          return NextResponse.json({ 
            error: 'Schema apply not found' 
          }, { status: 404 })
        }

        if (apply.status !== 'applied') {
          return NextResponse.json({ 
            error: 'Can only rollback applied schemas' 
          }, { status: 400 })
        }

        // Parse the schema to find tables
        const preview = apply.schemaType === 'sql' 
          ? parseSQLSchema(apply.schemaContent)
          : parsePrismaSchema(apply.schemaContent)

        // Delete the tables that were created
        let tablesRemoved = 0
        for (const table of preview.tables) {
          const deleted = await db.toolkitTable.deleteMany({
            where: { 
              projectId: apply.projectId, 
              tableName: table.name 
            }
          })
          tablesRemoved += deleted.count
        }

        // Mark as rolled back
        await db.schemaApply.update({
          where: { id },
          data: {
            status: 'rolled_back',
            rolledBackAt: new Date()
          }
        })

        return NextResponse.json({
          success: true,
          message: 'Schema rolled back successfully',
          tablesRemoved
        })
      }

      // ========================================================================
      // Delete - Remove a pending schema apply
      // ========================================================================
      case 'delete': {
        if (!id) {
          return NextResponse.json({ 
            error: 'id is required' 
          }, { status: 400 })
        }

        const apply = await db.schemaApply.findUnique({
          where: { id }
        })

        if (!apply) {
          return NextResponse.json({ 
            error: 'Schema apply not found' 
          }, { status: 404 })
        }

        if (apply.status === 'applied') {
          return NextResponse.json({ 
            error: 'Cannot delete applied schemas. Use rollback first.' 
          }, { status: 400 })
        }

        await db.schemaApply.delete({
          where: { id }
        })

        return NextResponse.json({
          success: true,
          message: 'Schema apply deleted'
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Schema Apply POST error:', error)
    return NextResponse.json({ 
      error: 'Failed to process request',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
