// =============================================================================
// API Route - Business Rules Extraction
// =============================================================================
// Extracts business rules from stored procedures and constraints
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { 
  BusinessRulesExtractor,
  createBusinessRulesExtractor,
  extractBusinessRules
} from '@/lib/parsers/business-rules-extractor';
import { parseSqlServer } from '@/lib/sql-parser';
import { TableDef, StoredProcedureDef } from '@/lib/types';

// POST /api/business-rules/extract
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, sqlContent } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing required field: projectId' },
        { status: 400 }
      );
    }

    let tables: TableDef[] = [];
    let storedProcedures: StoredProcedureDef[] = [];

    // If SQL content provided, parse it
    if (sqlContent) {
      const parseResult = parseSqlServer(sqlContent);
      tables = parseResult.tables;
      storedProcedures = parseResult.storedProcedures;
    } else {
      // Load from database
      const dbTables = await prisma.toolkitTable.findMany({
        where: { projectId },
        include: {
          columns: true,
          foreignKeys: true
        }
      });

      const dbSPs = await prisma.toolkitSP.findMany({
        where: { projectId }
      });

      // Convert to TableDef format
      tables = dbTables.map(t => ({
        schemaName: t.tableSchema,
        tableName: t.tableName,
        columns: t.columns.map(c => ({
          name: c.columnName,
          dataType: c.dataType || 'NVARCHAR',
          isNullable: c.isNullable ?? true,
          isPrimaryKey: c.isPK ?? false,
          isIdentity: false
        })),
        foreignKeys: t.foreignKeys.map(fk => ({
          columnName: fk.fromColumn,
          referencesTable: fk.toTable,
          referencesColumn: fk.toColumn
        })),
        indexes: [],
        checkConstraints: []
      }));

      storedProcedures = dbSPs.map(sp => ({
        schemaName: sp.spSchema,
        procedureName: sp.spName,
        parameters: [],
        body: '',
        tablesAccessed: [],
        tablesModified: []
      }));
    }

    // Extract business rules
    const extractor = createBusinessRulesExtractor(projectId);
    const result = extractor.extractRules(tables, storedProcedures);

    // Convert to standard BusinessRule format
    const businessRules = extractor.toBusinessRules(result.rules);

    return NextResponse.json({
      success: true,
      projectId,
      summary: result.summary,
      rules: result.rules,
      businessRules,
      validationPatterns: result.validationPatterns,
      workflowPatterns: result.workflowPatterns,
      recommendations: result.recommendations
    });

  } catch (error) {
    console.error('Business rules extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract business rules', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// GET /api/business-rules?projectId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const category = searchParams.get('category');
    const tableName = searchParams.get('tableName');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing required parameter: projectId' },
        { status: 400 }
      );
    }

    // Load tables and SPs from database
    const tables = await prisma.toolkitTable.findMany({
      where: { 
        projectId,
        ...(tableName && { tableName })
      },
      include: {
        columns: true,
        foreignKeys: true
      }
    });

    const sps = await prisma.toolkitSP.findMany({
      where: { projectId }
    });

    // Convert to internal format
    const tableDefs: TableDef[] = tables.map(t => ({
      schemaName: t.tableSchema,
      tableName: t.tableName,
      columns: t.columns.map(c => ({
        name: c.columnName,
        dataType: c.dataType || 'NVARCHAR',
        isNullable: c.isNullable ?? true,
        isPrimaryKey: c.isPK ?? false,
        isIdentity: false
      })),
      foreignKeys: t.foreignKeys.map(fk => ({
        columnName: fk.fromColumn,
        referencesTable: fk.toTable,
        referencesColumn: fk.toColumn
      })),
      indexes: [],
      checkConstraints: []
    }));

    const spDefs: StoredProcedureDef[] = sps.map(sp => ({
      schemaName: sp.spSchema,
      procedureName: sp.spName,
      parameters: [],
      body: '',
      tablesAccessed: [],
      tablesModified: []
    }));

    // Extract rules
    const result = extractBusinessRules(projectId, tableDefs, spDefs);

    // Filter by category if requested
    let filteredRules = result.rules;
    if (category) {
      filteredRules = filteredRules.filter(r => r.category === category);
    }

    return NextResponse.json({
      success: true,
      projectId,
      summary: result.summary,
      rules: filteredRules,
      byTable: Object.fromEntries(result.byTable),
      byCategory: Object.fromEntries(result.byCategory),
      recommendations: result.recommendations
    });

  } catch (error) {
    console.error('Business rules fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch business rules', message: (error as Error).message },
      { status: 500 }
    );
  }
}
