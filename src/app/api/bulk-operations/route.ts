// =============================================================================
// API Route - Bulk Operations Generator
// =============================================================================
// Generates bulk CRUD operations for tables
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { 
  BulkAPIGenerator,
  createBulkAPIGenerator,
  generateBulkOperations,
  generateAllBulkOperations
} from '@/lib/parsers/bulk-api-generator';
import { TableDef } from '@/lib/types';

// POST /api/bulk-operations/generate
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, tableName, options } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing required field: projectId' },
        { status: 400 }
      );
    }

    // Load tables from database
    const dbTables = await prisma.toolkitTable.findMany({
      where: { 
        projectId,
        ...(tableName && { tableName })
      },
      include: {
        columns: true,
        foreignKeys: true
      }
    });

    if (dbTables.length === 0) {
      return NextResponse.json(
        { error: 'No tables found for the specified criteria' },
        { status: 404 }
      );
    }

    // Convert to TableDef format
    const tableDefs: TableDef[] = dbTables.map(t => ({
      schemaName: t.tableSchema,
      tableName: t.tableName,
      columns: t.columns.map(c => ({
        name: c.columnName,
        dataType: c.dataType || 'NVARCHAR',
        maxLength: c.maxLength,
        isNullable: c.isNullable ?? true,
        isPrimaryKey: c.isPK ?? false,
        isIdentity: false,
        defaultValue: c.defaultValue
      })),
      foreignKeys: t.foreignKeys.map(fk => ({
        constraintName: fk.fkName,
        columnName: fk.fromColumn,
        referencesTable: fk.toTable,
        referencesColumn: fk.toColumn
      })),
      indexes: [],
      checkConstraints: []
    }));

    // Generate bulk operations
    let results;
    if (tableName) {
      // Single table
      const tableDef = tableDefs[0];
      results = {
        [tableName]: generateBulkOperations(tableDef)
      };
    } else {
      // All tables
      results = Object.fromEntries(generateAllBulkOperations(tableDefs));
    }

    return NextResponse.json({
      success: true,
      projectId,
      tablesProcessed: Object.keys(results).length,
      results
    });

  } catch (error) {
    console.error('Bulk operations generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate bulk operations', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// GET /api/bulk-operations?projectId=xxx&tableName=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const tableName = searchParams.get('tableName');
    const operationType = searchParams.get('operationType');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing required parameter: projectId' },
        { status: 400 }
      );
    }

    // Load tables
    const dbTables = await prisma.toolkitTable.findMany({
      where: { 
        projectId,
        ...(tableName && { tableName })
      },
      include: {
        columns: true,
        foreignKeys: true
      }
    });

    if (dbTables.length === 0) {
      return NextResponse.json(
        { error: 'No tables found' },
        { status: 404 }
      );
    }

    // Convert to TableDef format
    const tableDefs: TableDef[] = dbTables.map(t => ({
      schemaName: t.tableSchema,
      tableName: t.tableName,
      columns: t.columns.map(c => ({
        name: c.columnName,
        dataType: c.dataType || 'NVARCHAR',
        maxLength: c.maxLength,
        isNullable: c.isNullable ?? true,
        isPrimaryKey: c.isPK ?? false,
        isIdentity: false,
        defaultValue: c.defaultValue
      })),
      foreignKeys: t.foreignKeys.map(fk => ({
        columnName: fk.fromColumn,
        referencesTable: fk.toTable,
        referencesColumn: fk.toColumn
      })),
      indexes: [],
      checkConstraints: []
    }));

    // Generate operations
    const results = new Map<string, ReturnType<typeof generateBulkOperations>>();
    
    for (const tableDef of tableDefs) {
      results.set(tableDef.tableName, generateBulkOperations(tableDef));
    }

    // Filter by operation type if requested
    let response = Object.fromEntries(results);
    if (operationType) {
      response = Object.fromEntries(
        Array.from(results.entries()).map(([name, result]) => [
          name,
          {
            ...result,
            operations: result.operations.filter(op => op.type === operationType)
          }
        ])
      );
    }

    return NextResponse.json({
      success: true,
      projectId,
      tables: Object.keys(response),
      results: response
    });

  } catch (error) {
    console.error('Bulk operations fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bulk operations', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// OPTIONS - Return available operation types
export async function OPTIONS() {
  return NextResponse.json({
    operationTypes: [
      { type: 'bulk_create', description: 'Create multiple records in a single request' },
      { type: 'bulk_update', description: 'Update multiple records matching criteria' },
      { type: 'bulk_delete', description: 'Delete multiple records matching criteria' },
      { type: 'bulk_upsert', description: 'Insert or update multiple records' },
      { type: 'bulk_import', description: 'Import records from CSV/JSON file' }
    ],
    features: {
      transactionSupport: true,
      batchSizeLimit: 1000,
      importFormats: ['csv', 'json'],
      softDelete: true,
      auditFields: true
    }
  });
}
