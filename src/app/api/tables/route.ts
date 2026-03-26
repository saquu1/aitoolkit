/**
 * TABLES API ROUTE
 * =================
 * Memory-optimized with pagination support
 * 
 * Features:
 * - Cursor-based pagination for large datasets
 * - Offset-based pagination for traditional navigation
 * - Summary-only mode for lightweight listings
 * - Backward compatible with existing endpoints
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseSqlServer } from '@/lib/sql-parser'
import {
  getPaginationParams,
  apiSuccess,
  apiError,
} from '@/lib/api/paginated-response'

// =============================================================================
// GET /api/tables?projectId=xxx - Fetch tables for a project (WITH PAGINATION)
// =============================================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const tableName = searchParams.get('tableName')
    
    // NEW: Pagination parameters
    const paginated = searchParams.get('paginated') === 'true'
    const summaryOnly = searchParams.get('summary') === 'true'

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    // Get single table
    if (tableName) {
      const table = await db.toolkitTable.findFirst({
        where: { projectId, tableName }
      })

      if (!table) {
        return NextResponse.json({ error: 'Table not found' }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        table: {
          ...table,
          columns: JSON.parse(table.columns || '[]'),
          foreignKeys: JSON.parse(table.foreignKeys || '[]'),
          indexes: JSON.parse(table.indexes || '[]'),
          constraints: JSON.parse(table.constraints || '[]')
        }
      })
    }

    // PAGINATED LIST - Memory efficient for large datasets
    if (paginated) {
      const params = getPaginationParams(request)
      const searchFilter = searchParams.get('search')
      
      const where: Record<string, unknown> = { projectId }
      
      // Add search filter
      if (searchFilter) {
        where.OR = [
          { tableName: { contains: searchFilter, mode: 'insensitive' } },
          { schemaName: { contains: searchFilter, mode: 'insensitive' } },
        ]
      }
      
      // Summary-only mode for lightweight listings
      const select = summaryOnly ? {
        id: true,
        tableName: true,
        schemaName: true,
        status: true,
        sourceDDL: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { columns: true } },
      } : undefined
      
      // Get total count
      const totalCount = await db.toolkitTable.count({ where })
      
      // Cursor-based pagination
      if (params.mode === 'cursor') {
        const take = params.limit + 1
        
        const tables = await db.toolkitTable.findMany({
          where,
          select,
          take,
          skip: params.cursor ? 1 : 0,
          cursor: params.cursor ? { id: Buffer.from(params.cursor, 'base64url').toString('utf-8') } : undefined,
          orderBy: { tableName: 'asc' },
        })
        
        const hasMore = tables.length > params.limit
        const data = hasMore ? tables.slice(0, -1) : tables
        const nextCursor = hasMore && data.length > 0
          ? Buffer.from(data[data.length - 1].id).toString('base64url')
          : null
        
        // Parse JSON fields if not summary mode
        const parsedData = summaryOnly ? data : data.map(t => ({
          ...t,
          columns: JSON.parse(t.columns || '[]'),
          foreignKeys: JSON.parse(t.foreignKeys || '[]'),
          indexes: JSON.parse(t.indexes || '[]'),
          constraints: JSON.parse(t.constraints || '[]')
        }))
        
        return apiSuccess(parsedData, {
          pagination: {
            hasMore,
            hasPrevious: !!params.cursor,
            nextCursor,
            previousCursor: null,
            pageSize: params.limit,
          },
          meta: { totalCount },
        })
      }
      
      // Offset pagination
      const tables = await db.toolkitTable.findMany({
        where,
        select,
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        orderBy: { tableName: 'asc' },
      })
      
      const totalPages = Math.ceil(totalCount / params.pageSize)
      
      // Parse JSON fields if not summary mode
      const parsedTables = summaryOnly ? tables : tables.map(t => ({
        ...t,
        columns: JSON.parse(t.columns || '[]'),
        foreignKeys: JSON.parse(t.foreignKeys || '[]'),
        indexes: JSON.parse(t.indexes || '[]'),
        constraints: JSON.parse(t.constraints || '[]')
      }))
      
      return apiSuccess(parsedTables, {
        pagination: {
          hasMore: params.page < totalPages,
          hasPrevious: params.page > 1,
          nextCursor: null,
          previousCursor: null,
          totalCount,
          page: params.page,
          pageSize: params.pageSize,
          totalPages,
        },
      })
    }

    // LEGACY: Get all tables for project (backward compatible)
    const tables = await db.toolkitTable.findMany({
      where: { projectId },
      orderBy: { tableName: 'asc' }
    })

    return NextResponse.json({
      success: true,
      tables: tables.map(t => ({
        ...t,
        columns: JSON.parse(t.columns || '[]'),
        foreignKeys: JSON.parse(t.foreignKeys || '[]'),
        indexes: JSON.parse(t.indexes || '[]'),
        constraints: JSON.parse(t.constraints || '[]')
      }))
    })
  } catch (error: any) {
    console.error('Error fetching tables:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, projectId, tableName, sqlDefinition, columns, foreignKeys } = body

    switch (action) {
      case 'create-from-sql':
        return await createFromSQL(projectId, tableName, sqlDefinition)

      case 'create-manual':
        return await createManual(projectId, tableName, columns, foreignKeys)

      case 'update-table':
        return await updateTable(projectId, tableName, columns, foreignKeys)

      case 'delete-table':
        return await deleteTable(projectId, tableName)

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Error in tables API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function createFromSQL(projectId: string, tableName: string, sqlDefinition: string) {
  if (!projectId || !tableName || !sqlDefinition) {
    return NextResponse.json({
      error: 'projectId, tableName and sqlDefinition are required'
    }, { status: 400 })
  }

  try {
    // Parse the SQL to extract table structure
    const parseResult = parseSqlServer(sqlDefinition)

    if (parseResult.tables.length === 0) {
      // If parsing fails, create a basic table entry
      const table = await db.toolkitTable.create({
        data: {
          projectId,
          tableName,
          schemaName: 'dbo',
          columns: JSON.stringify([
            { name: 'Id', dataType: 'INT', isPrimaryKey: true, isIdentity: true, isNullable: false },
            { name: 'Name', dataType: 'NVARCHAR(200)', isNullable: false }
          ]),
          foreignKeys: '[]',
          indexes: '[]',
          constraints: '[]',
          sourceDDL: sqlDefinition.substring(0, 5000),
          status: 'standalone'
        }
      })

      return NextResponse.json({
        success: true,
        table,
        message: `Table ${tableName} created (basic structure)`
      })
    }

    // Use the parsed table
    const parsedTable = parseResult.tables[0]
    const finalTableName = parsedTable.tableName || tableName

    const table = await db.toolkitTable.create({
      data: {
        projectId,
        tableName: finalTableName,
        schemaName: parsedTable.schema || 'dbo',
        columns: JSON.stringify(parsedTable.columns || []),
        foreignKeys: JSON.stringify(parsedTable.foreignKeys || []),
        indexes: JSON.stringify(parsedTable.indexes || []),
        constraints: JSON.stringify(parsedTable.constraints || []),
        sourceDDL: parsedTable.sourceDDL || sqlDefinition.substring(0, 5000),
        status: 'standalone'
      }
    })

    return NextResponse.json({
      success: true,
      table,
      message: `Table ${finalTableName} created successfully`
    })
  } catch (error: any) {
    // Check for unique constraint violation (table already exists)
    if (error.code === 'P2002') {
      return NextResponse.json({
        success: false,
        error: `Table ${tableName} already exists in this project`
      }, { status: 409 })
    }

    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

async function createManual(
  projectId: string,
  tableName: string,
  columns: any[],
  foreignKeys: any[]
) {
  if (!projectId || !tableName) {
    return NextResponse.json({ error: 'projectId and tableName are required' }, { status: 400 })
  }

  const table = await db.toolkitTable.create({
    data: {
      projectId,
      tableName,
      schemaName: 'dbo',
      columns: JSON.stringify(columns || []),
      foreignKeys: JSON.stringify(foreignKeys || []),
      indexes: '[]',
      constraints: '[]',
      status: 'standalone'
    }
  })

  return NextResponse.json({
    success: true,
    table,
    message: `Table ${tableName} created successfully`
  })
}

async function updateTable(
  projectId: string,
  tableName: string,
  columns: any[],
  foreignKeys: any[]
) {
  if (!projectId || !tableName) {
    return NextResponse.json({ error: 'projectId and tableName are required' }, { status: 400 })
  }

  const table = await db.toolkitTable.update({
    where: {
      projectId_tableName: { projectId, tableName }
    },
    data: {
      columns: JSON.stringify(columns || []),
      foreignKeys: JSON.stringify(foreignKeys || [])
    }
  })

  return NextResponse.json({
    success: true,
    table,
    message: `Table ${tableName} updated successfully`
  })
}

async function deleteTable(projectId: string, tableName: string) {
  if (!projectId || !tableName) {
    return NextResponse.json({ error: 'projectId and tableName are required' }, { status: 400 })
  }

  await db.toolkitTable.delete({
    where: {
      projectId_tableName: { projectId, tableName }
    }
  })

  return NextResponse.json({
    success: true,
    message: `Table ${tableName} deleted successfully`
  })
}
