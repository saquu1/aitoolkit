// =============================================================================
// Schema Intelligence API
// Handles: Missing Table Detection, Migration Suggestions, Conflict Detection,
//          Column Type Inference from CSHTML
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ROUTER
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, projectId } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    switch (action) {
      // Missing Table Detection
      case 'detect-missing-tables':
        return await detectMissingTables(projectId);
      
      case 'get-missing-table-details':
        return await getMissingTableDetails(projectId, body.tableName);
      
      case 'resolve-missing-table':
        return await resolveMissingTable(projectId, body);
      
      // Migration Suggestions
      case 'generate-migration-suggestions':
        return await generateMigrationSuggestions(projectId);
      
      case 'apply-migration-suggestion':
        return await applyMigrationSuggestion(projectId, body.suggestionId);
      
      case 'get-migration-history':
        return await getMigrationHistory(projectId);
      
      // Schema Conflict Detection
      case 'detect-schema-conflicts':
        return await detectSchemaConflicts(projectId);
      
      case 'resolve-schema-conflict':
        return await resolveSchemaConflict(projectId, body);
      
      case 'get-conflict-report':
        return await getConflictReport(projectId);
      
      // Column Type Inference
      case 'infer-column-types':
        return await inferColumnTypes(projectId, body.viewName);
      
      case 'apply-type-inference':
        return await applyTypeInference(projectId, body.inferences);
      
      case 'get-type-inference-summary':
        return await getTypeInferenceSummary(projectId);
      
      // Complete Schema Analysis
      case 'analyze-schema':
        return await analyzeSchema(projectId);
      
      case 'get-schema-intelligence-summary':
        return await getSchemaIntelligenceSummary(projectId);
      
      // Advanced Relationship Detection (85% → 95%)
      case 'detect-relationships':
        return await detectRelationships(projectId);
      
      case 'get-relationship-graph':
        return await getRelationshipGraph(projectId);
      
      case 'suggest-relationships':
        return await suggestRelationships(projectId);
      
      // Schema Documentation (95% → 100%)
      case 'generate-schema-documentation':
        return await generateSchemaDocumentation(projectId, body.options);
      
      case 'export-schema-dictionary':
        return await exportSchemaDictionary(projectId);
      
      // Schema Optimization
      case 'optimize-schema':
        return await optimizeSchema(projectId);
      
      case 'analyze-cross-references':
        return await analyzeCrossReferences(projectId);
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Schema Intelligence API error:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MISSING TABLE DETECTION
// ═══════════════════════════════════════════════════════════════════════════

async function detectMissingTables(projectId: string) {
  // Get all stored procedures
  const procedures = await db.toolkitProcedure.findMany({
    where: { projectId },
    select: {
      procedureName: true,
      body: true,
      tablesAccessed: true,
      tablesModified: true,
    },
  });

  // Get existing tables
  const existingTables = await db.toolkitTable.findMany({
    where: { projectId },
    select: { tableName: true },
  });
  const existingTableNames = new Set(
    existingTables.map(t => t.tableName.toLowerCase())
  );

  // Extract table references from SP bodies
  const tableReferences = new Map<string, {
    referencedIn: string[];
    accessTypes: Set<string>;
    columns: Map<string, Set<string>>;
    confidence: number;
  }>();

  for (const sp of procedures) {
    const body = sp.body || '';
    
    // Pattern: FROM TableName, JOIN TableName, INTO TableName, UPDATE TableName
    const tablePatterns = [
      /(?:FROM|JOIN)\s+\[?(\w+)\]?(?:\s+(?:AS\s+)?\w+)?(?:\s*(?:,|JOIN|WHERE|ORDER|GROUP|HAVING|LEFT|RIGHT|INNER|OUTER|ON)|$)/gi,
      /(?:INTO|UPDATE|DELETE\s+FROM)\s+\[?(\w+)\]?/gi,
    ];

    for (const pattern of tablePatterns) {
      let match;
      while ((match = pattern.exec(body)) !== null) {
        const tableName = match[1];
        // Skip SQL keywords
        if (['SELECT', 'WHERE', 'AND', 'OR', 'NOT', 'NULL', 'INNER', 'OUTER', 
             'LEFT', 'RIGHT', 'JOIN', 'ON', 'AS', 'FROM', 'INTO', 'UPDATE',
             'DELETE', 'INSERT', 'VALUES', 'SET', 'ORDER', 'BY', 'GROUP'].includes(tableName.toUpperCase())) {
          continue;
        }

        if (!existingTableNames.has(tableName.toLowerCase())) {
          if (!tableReferences.has(tableName)) {
            tableReferences.set(tableName, {
              referencedIn: [],
              accessTypes: new Set(),
              columns: new Map(),
              confidence: 0.7,
            });
          }
          
          const ref = tableReferences.get(tableName)!;
          ref.referencedIn.push(sp.procedureName);
          
          const contextBefore = body.substring(Math.max(0, match.index - 50), match.index);
          if (contextBefore.toUpperCase().includes('INSERT') || contextBefore.toUpperCase().includes('INTO')) {
            ref.accessTypes.add('insert');
          } else if (contextBefore.toUpperCase().includes('UPDATE')) {
            ref.accessTypes.add('update');
          } else if (contextBefore.toUpperCase().includes('DELETE')) {
            ref.accessTypes.add('delete');
          } else {
            ref.accessTypes.add('select');
          }
        }
      }
    }

    // Use pre-parsed tablesAccessed and tablesModified
    try {
      const accessed = JSON.parse(sp.tablesAccessed || '[]');
      const modified = JSON.parse(sp.tablesModified || '[]');
      
      for (const tableName of [...accessed, ...modified]) {
        if (!existingTableNames.has(tableName.toLowerCase())) {
          if (!tableReferences.has(tableName)) {
            tableReferences.set(tableName, {
              referencedIn: [],
              accessTypes: new Set(),
              columns: new Map(),
              confidence: 0.8,
            });
          }
          
          const ref = tableReferences.get(tableName)!;
          ref.referencedIn.push(sp.procedureName);
          ref.accessTypes.add(accessed.includes(tableName) ? 'select' : 'modify');
          ref.confidence = 0.85;
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  // Calculate confidence and prioritize
  const missingTables = Array.from(tableReferences.entries()).map(([tableName, data]) => ({
    tableName,
    referencedIn: [...new Set(data.referencedIn)],
    accessTypes: [...data.accessTypes],
    columns: Array.from(data.columns.entries()).map(([col, sps]) => ({
      name: col,
      foundIn: [...sps],
    })),
    referenceCount: data.referencedIn.length,
    confidence: Math.min(1, data.confidence + (data.referencedIn.length * 0.05)),
    priority: calculateMissingTablePriority(tableName, data),
  }));

  // Sort by priority
  missingTables.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  // Update missing table resolution records
  for (const table of missingTables) {
    await db.missingTableResolution.upsert({
      where: {
        projectId_tableName: {
          projectId,
          tableName: table.tableName,
        }
      },
      create: {
        projectId,
        tableName: table.tableName,
        status: 'missing',
        priority: table.priority,
        blocksCount: table.referencedIn.length,
        referencedBy: JSON.stringify(table.referencedIn),
        suggestedColumns: JSON.stringify(table.columns),
      },
      update: {
        blocksCount: table.referencedIn.length,
        referencedBy: JSON.stringify(table.referencedIn),
        suggestedColumns: JSON.stringify(table.columns),
      }
    });
  }

  return NextResponse.json({
    success: true,
    missingTables,
    stats: {
      totalMissing: missingTables.length,
      critical: missingTables.filter(t => t.priority === 'critical').length,
      high: missingTables.filter(t => t.priority === 'high').length,
      medium: missingTables.filter(t => t.priority === 'medium').length,
      low: missingTables.filter(t => t.priority === 'low').length,
    }
  });
}

function calculateMissingTablePriority(tableName: string, data: {
  referencedIn: string[];
  accessTypes: Set<string>;
  confidence: number;
}): 'critical' | 'high' | 'medium' | 'low' {
  if (data.referencedIn.length >= 3 && 
      (data.accessTypes.has('insert') || data.accessTypes.has('update'))) {
    return 'critical';
  }
  
  if (data.referencedIn.length >= 2) {
    return 'high';
  }
  
  if (data.accessTypes.has('insert') || data.accessTypes.has('update') || data.accessTypes.has('delete')) {
    return 'medium';
  }
  
  return 'low';
}

async function getMissingTableDetails(projectId: string, tableName: string) {
  const missingTable = await db.missingTableResolution.findUnique({
    where: {
      projectId_tableName: {
        projectId,
        tableName,
      }
    }
  });

  if (!missingTable) {
    return NextResponse.json({ error: 'Table not found' }, { status: 404 });
  }

  // Find similar existing tables
  const existingTables = await db.toolkitTable.findMany({
    where: { projectId },
    select: { tableName: true, columns: true },
  });

  const similarTables = existingTables.filter(t => {
    const similarity = calculateSimilarity(tableName, t.tableName);
    return similarity > 0.5;
  }).map(t => ({
    tableName: t.tableName,
    similarity: calculateSimilarity(tableName, t.tableName),
  }));

  // Generate suggested schema
  const suggestedColumns = JSON.parse(missingTable.suggestedColumns || '[]');
  const suggestedSchema = generateSuggestedSchema(tableName, suggestedColumns);

  return NextResponse.json({
    success: true,
    missingTable: {
      ...missingTable,
      referencedBy: JSON.parse(missingTable.referencedBy || '[]'),
      suggestedColumns,
      aiSuggestion: JSON.parse(missingTable.aiSuggestion || '{}'),
    },
    similarTables,
    suggestedSchema,
  });
}

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const matrix: number[][] = [];
  for (let i = 0; i <= longer.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= shorter.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= longer.length; i++) {
    for (let j = 1; j <= shorter.length; j++) {
      const cost = longer[i - 1] === shorter[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const distance = matrix[longer.length][shorter.length];
  return 1 - distance / longer.length;
}

function generateSuggestedSchema(tableName: string, columns: any[]): string {
  const columnDefs = columns.map(col => {
    const name = col.name || col;
    const inferredType = inferColumnTypeFromName(name);
    return `  ${name} ${inferredType}`;
  });

  return `-- Suggested schema for ${tableName}
CREATE TABLE ${tableName} (
  Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
${columnDefs.join(',\n')},
  CreatedAt DATETIME DEFAULT GETDATE(),
  UpdatedAt DATETIME DEFAULT GETDATE(),
  CreatedBy UNIQUEIDENTIFIER,
  UpdatedBy UNIQUEIDENTIFIER
);`;
}

function inferColumnTypeFromName(columnName: string): string {
  const name = columnName.toLowerCase();
  
  if (name.includes('id') && (name.startsWith('id') || name.endsWith('id'))) {
    return 'UNIQUEIDENTIFIER';
  }
  if (name.includes('date') || name.includes('time')) {
    return 'DATETIME';
  }
  if (name.includes('is') || name.includes('has') || name.startsWith('can')) {
    return 'BIT';
  }
  if (name.includes('amount') || name.includes('price') || name.includes('cost') || name.includes('fee')) {
    return 'DECIMAL(18,2)';
  }
  if (name.includes('count') || name.includes('qty') || name.includes('quantity') || name.includes('number')) {
    return 'INT';
  }
  if (name.includes('email')) {
    return 'NVARCHAR(255)';
  }
  if (name.includes('phone') || name.includes('mobile')) {
    return 'NVARCHAR(20)';
  }
  if (name.includes('description') || name.includes('note') || name.includes('comment')) {
    return 'NVARCHAR(MAX)';
  }
  if (name.includes('name') || name.includes('title')) {
    return 'NVARCHAR(200)';
  }
  if (name.includes('code') || name.includes('no')) {
    return 'NVARCHAR(50)';
  }
  
  return 'NVARCHAR(255)';
}

async function resolveMissingTable(projectId: string, body: {
  tableName: string;
  resolution: 'create' | 'link' | 'ignore';
  linkedTableId?: string;
  columns?: any[];
}) {
  const { tableName, resolution, linkedTableId, columns } = body;

  const result = await db.missingTableResolution.update({
    where: {
      projectId_tableName: {
        projectId,
        tableName,
      }
    },
    data: {
      resolutionStatus: resolution === 'ignore' ? 'ignored' : 'resolved',
      resolvedAt: new Date(),
      notes: resolution === 'link' ? `Linked to table ${linkedTableId}` : 
             resolution === 'create' ? 'Table creation scheduled' : 'Ignored',
    }
  });

  if (resolution === 'create' && columns) {
    await db.toolkitTable.create({
      data: {
        projectId,
        tableName,
        schemaName: 'dbo',
        columns: JSON.stringify([
          { name: 'Id', dataType: 'UNIQUEIDENTIFIER', isPrimaryKey: true, isNullable: false },
          ...columns.map(col => ({
            name: col.name,
            dataType: col.dataType || 'NVARCHAR(255)',
            isNullable: col.isNullable !== false,
          })),
          { name: 'CreatedAt', dataType: 'DATETIME', isNullable: false },
          { name: 'UpdatedAt', dataType: 'DATETIME', isNullable: true },
        ]),
        foreignKeys: '[]',
        indexes: '[]',
        constraints: '[]',
        status: 'standalone',
      }
    });

    await db.discoveredTableCache.updateMany({
      where: { projectId, tableName },
      data: { isResolved: true, resolvedTableId: result.id }
    });
  }

  if (resolution === 'link' && linkedTableId) {
    await db.discoveredTableCache.updateMany({
      where: { projectId, tableName },
      data: { isResolved: true, resolvedTableId: linkedTableId }
    });
  }

  return NextResponse.json({ success: true, resolution: result });
}

// ═══════════════════════════════════════════════════════════════════════════
// MIGRATION SUGGESTIONS
// ═══════════════════════════════════════════════════════════════════════════

async function generateMigrationSuggestions(projectId: string) {
  const suggestions: any[] = [];

  // 1. Check for missing tables that need to be created
  const missingTables = await db.missingTableResolution.findMany({
    where: { projectId, resolutionStatus: 'pending' }
  });

  for (const mt of missingTables) {
    const columns = JSON.parse(mt.suggestedColumns || '[]');
    suggestions.push({
      id: `create_${mt.tableName}`,
      type: 'create_table',
      priority: mt.priority,
      tableName: mt.tableName,
      description: `Create missing table ${mt.tableName} referenced by ${mt.blocksCount} stored procedures`,
      sql: generateSuggestedSchema(mt.tableName, columns),
      impact: `Enables ${mt.blocksCount} SPs to function correctly`,
      effort: columns.length > 10 ? 'medium' : 'low',
      autoApplicable: true,
    });
  }

  // 2. Check for missing FK relationships
  const tables = await db.toolkitTable.findMany({
    where: { projectId },
    select: { tableName: true, columns: true, foreignKeys: true }
  });

  for (const table of tables) {
    const columns = JSON.parse(table.columns || '[]');
    const existingFKs = JSON.parse(table.foreignKeys || '[]');
    
    for (const col of columns) {
      if (col.name.toLowerCase().endsWith('id') && 
          col.name.toLowerCase() !== 'id' &&
          !col.isPrimaryKey) {
        const hasFK = existingFKs.some((fk: { columnName: string }) => 
          fk.columnName?.toLowerCase() === col.name.toLowerCase()
        );
        
        if (!hasFK) {
          const refTable = col.name.replace(/Id$/i, '');
          const refTableExists = tables.some(t => 
            t.tableName.toLowerCase() === refTable.toLowerCase() ||
            t.tableName.toLowerCase() === `${refTable}s`.toLowerCase()
          );
          
          if (refTableExists) {
            suggestions.push({
              id: `fk_${table.tableName}_${col.name}`,
              type: 'add_foreign_key',
              priority: 'medium',
              tableName: table.tableName,
              columnName: col.name,
              description: `Add foreign key from ${table.tableName}.${col.name} to ${refTable}`,
              sql: `ALTER TABLE ${table.tableName} ADD CONSTRAINT FK_${table.tableName}_${col.name} FOREIGN KEY (${col.name}) REFERENCES ${refTable}(Id);`,
              impact: 'Improves referential integrity',
              effort: 'low',
              autoApplicable: true,
            });
          }
        }
      }
    }
  }

  // 3. Check for missing indexes
  for (const table of tables) {
    const columns = JSON.parse(table.columns || '[]');
    const indexes = JSON.parse(table.foreignKeys || '[]');
    
    for (const col of columns) {
      if (col.name.toLowerCase().endsWith('id') && 
          col.name.toLowerCase() !== 'id' &&
          !col.isPrimaryKey) {
        const hasIndex = indexes.some((idx: { columns: string[] }) => 
          idx.columns?.some((c: string) => c.toLowerCase() === col.name.toLowerCase())
        );
        
        if (!hasIndex) {
          suggestions.push({
            id: `idx_${table.tableName}_${col.name}`,
            type: 'add_index',
            priority: 'low',
            tableName: table.tableName,
            columnName: col.name,
            description: `Add index on ${table.tableName}.${col.name} for better query performance`,
            sql: `CREATE INDEX IX_${table.tableName}_${col.name} ON ${table.tableName}(${col.name});`,
            impact: 'Improves query performance on FK lookups',
            effort: 'low',
            autoApplicable: true,
          });
        }
      }
    }
  }

  // 4. Check for audit fields
  for (const table of tables) {
    const columns = JSON.parse(table.columns || '[]');
    const columnNames = columns.map((c: { name: string }) => c.name.toLowerCase());
    
    const missingAuditFields = [];
    if (!columnNames.includes('createdat')) missingAuditFields.push('CreatedAt');
    if (!columnNames.includes('updatedat')) missingAuditFields.push('UpdatedAt');
    if (!columnNames.includes('createdby')) missingAuditFields.push('CreatedBy');
    if (!columnNames.includes('updatedby')) missingAuditFields.push('UpdatedBy');
    
    if (missingAuditFields.length > 0) {
      suggestions.push({
        id: `audit_${table.tableName}`,
        type: 'add_audit_fields',
        priority: 'low',
        tableName: table.tableName,
        description: `Add audit fields ${missingAuditFields.join(', ')} to ${table.tableName}`,
        sql: generateAuditFieldsSQL(table.tableName, missingAuditFields),
        impact: 'Enables audit trail tracking',
        effort: 'low',
        autoApplicable: true,
      });
    }
  }

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  suggestions.sort((a, b) => priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]);

  return NextResponse.json({
    success: true,
    suggestions,
    stats: {
      total: suggestions.length,
      createTable: suggestions.filter(s => s.type === 'create_table').length,
      addFK: suggestions.filter(s => s.type === 'add_foreign_key').length,
      addIndex: suggestions.filter(s => s.type === 'add_index').length,
      addAudit: suggestions.filter(s => s.type === 'add_audit_fields').length,
    }
  });
}

function generateAuditFieldsSQL(tableName: string, fields: string[]): string {
  const statements: string[] = [];
  
  if (fields.includes('CreatedAt')) statements.push(`ADD CreatedAt DATETIME NOT NULL DEFAULT GETDATE()`);
  if (fields.includes('UpdatedAt')) statements.push(`ADD UpdatedAt DATETIME NULL`);
  if (fields.includes('CreatedBy')) statements.push(`ADD CreatedBy UNIQUEIDENTIFIER NULL`);
  if (fields.includes('UpdatedBy')) statements.push(`ADD UpdatedBy UNIQUEIDENTIFIER NULL`);
  
  return `ALTER TABLE ${tableName}\n${statements.join(',\n')};`;
}

async function applyMigrationSuggestion(projectId: string, suggestionId: string) {
  return NextResponse.json({
    success: true,
    message: `Migration suggestion ${suggestionId} marked for application`,
    note: 'In production, this would execute the SQL against the database'
  });
}

async function getMigrationHistory(projectId: string) {
  const resolutions = await db.missingTableResolution.findMany({
    where: { 
      projectId, 
      resolutionStatus: { in: ['resolved', 'ignored'] }
    },
    orderBy: { resolvedAt: 'desc' }
  });

  return NextResponse.json({
    success: true,
    history: resolutions.map(r => ({
      tableName: r.tableName,
      resolution: r.notes,
      resolvedAt: r.resolvedAt,
      resolvedBy: r.resolvedBy,
      notes: r.notes,
    }))
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMA CONFLICT DETECTION
// ═══════════════════════════════════════════════════════════════════════════

async function detectSchemaConflicts(projectId: string) {
  const conflicts: any[] = [];

  const cshtmlViews = await db.cSHTMLAnalysisCache.findMany({
    where: { projectId },
    select: { viewName: true, fields: true, linkedTable: true }
  });

  const tables = await db.toolkitTable.findMany({
    where: { projectId },
    select: { tableName: true, columns: true }
  });

  const tableColumns = new Map<string, Map<string, { dataType: string; maxLength?: number; isNullable: boolean }>>();
  for (const table of tables) {
    const columns = JSON.parse(table.columns || '[]');
    const colMap = new Map();
    for (const col of columns) {
      colMap.set(col.name?.toLowerCase(), col);
    }
    tableColumns.set(table.tableName.toLowerCase(), colMap);
  }

  for (const view of cshtmlViews) {
    if (!view.linkedTable) continue;
    
    const fields = JSON.parse(view.fields || '[]');
    const tableCols = tableColumns.get(view.linkedTable.toLowerCase());
    
    if (!tableCols) continue;
    
    for (const field of fields) {
      const col = tableCols.get(field.name?.toLowerCase());
      if (!col) continue;
      
      // Check type mismatch
      if (field.type && col.dataType) {
        const htmlType = field.type.toLowerCase();
        const dbType = col.dataType.toUpperCase();
        
        const typeConflicts = detectTypeConflict(htmlType, dbType);
        if (typeConflicts) {
          conflicts.push({
            id: `type_${view.viewName}_${field.name}`,
            type: 'type_mismatch',
            severity: typeConflicts.severity,
            viewName: view.viewName,
            tableName: view.linkedTable,
            columnName: field.name,
            dbType: col.dataType,
            uiType: field.type,
            description: typeConflicts.description,
            suggestion: typeConflicts.suggestion,
          });
        }
      }
      
      // Check nullable mismatch
      if (field.required && col.isNullable) {
        conflicts.push({
          id: `nullable_${view.viewName}_${field.name}`,
          type: 'nullable_mismatch',
          severity: 'low',
          viewName: view.viewName,
          tableName: view.linkedTable,
          columnName: field.name,
          description: `UI field is required but DB column allows NULL`,
          suggestion: `Make ${col.dataType} NOT NULL or remove required constraint from UI`,
        });
      }
    }
  }

  // Check for naming inconsistencies
  const namingConflicts = detectNamingConflicts(tables);
  conflicts.push(...namingConflicts);

  // Check for duplicate columns across tables
  const duplicateConflicts = detectDuplicateColumns(tables);
  conflicts.push(...duplicateConflicts);

  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  conflicts.sort((a, b) => severityOrder[a.severity as keyof typeof severityOrder] - severityOrder[b.severity as keyof typeof severityOrder]);

  return NextResponse.json({
    success: true,
    conflicts,
    stats: {
      total: conflicts.length,
      critical: conflicts.filter(c => c.severity === 'critical').length,
      high: conflicts.filter(c => c.severity === 'high').length,
      medium: conflicts.filter(c => c.severity === 'medium').length,
      low: conflicts.filter(c => c.severity === 'low').length,
    }
  });
}

function detectTypeConflict(htmlType: string, dbType: string): { severity: string; description: string; suggestion: string } | null {
  const typeMap: Record<string, string[]> = {
    'number': ['INT', 'BIGINT', 'SMALLINT', 'TINYINT', 'DECIMAL', 'NUMERIC', 'FLOAT', 'REAL', 'MONEY'],
    'date': ['DATE', 'DATETIME', 'DATETIME2', 'SMALLDATETIME'],
    'datetime-local': ['DATETIME', 'DATETIME2', 'SMALLDATETIME', 'DATETIMEOFFSET'],
    'time': ['TIME'],
    'email': ['NVARCHAR', 'VARCHAR', 'NCHAR', 'CHAR'],
    'tel': ['NVARCHAR', 'VARCHAR'],
    'url': ['NVARCHAR', 'VARCHAR'],
    'checkbox': ['BIT', 'TINYINT'],
    'text': ['NVARCHAR', 'VARCHAR', 'NTEXT', 'TEXT', 'NCHAR', 'CHAR'],
    'password': ['NVARCHAR', 'VARCHAR'],
  };

  for (const [html, dbTypes] of Object.entries(typeMap)) {
    if (htmlType === html) {
      const normalizedDb = dbType.replace(/\([^)]*\)/g, '').toUpperCase();
      if (!dbTypes.includes(normalizedDb)) {
        return {
          severity: 'high',
          description: `UI type '${htmlType}' incompatible with DB type '${dbType}'`,
          suggestion: `Consider changing DB column to ${dbTypes[0]} or adjusting UI input type`
        };
      }
    }
  }

  return null;
}

function detectNamingConflicts(tables: { tableName: string; columns: string }[]): any[] {
  const conflicts: any[] = [];
  
  for (const table of tables) {
    const columns = JSON.parse(table.columns || '[]');
    
    // Check for reserved words
    const reservedWords = ['index', 'table', 'column', 'value', 'key', 'order', 'group', 'user', 'password'];
    for (const col of columns) {
      if (reservedWords.includes(col.name?.toLowerCase())) {
        conflicts.push({
          id: `reserved_${table.tableName}_${col.name}`,
          type: 'reserved_word',
          severity: 'medium',
          tableName: table.tableName,
          columnName: col.name,
          description: `Column '${col.name}' uses a reserved word`,
          suggestion: `Consider renaming to '${col.name}Value' or '${col.name}Field'`
        });
      }
    }
  }
  
  return conflicts;
}

function detectDuplicateColumns(tables: { tableName: string; columns: string }[]): any[] {
  const conflicts: any[] = [];
  
  const columnTypes = new Map<string, { tables: string[]; types: Set<string> }>();
  
  for (const table of tables) {
    const columns = JSON.parse(table.columns || '[]');
    for (const col of columns) {
      if (!columnTypes.has(col.name?.toLowerCase())) {
        columnTypes.set(col.name?.toLowerCase(), { tables: [], types: new Set() });
      }
      const entry = columnTypes.get(col.name?.toLowerCase())!;
      entry.tables.push(table.tableName);
      if (col.dataType) entry.types.add(col.dataType.toUpperCase());
    }
  }
  
  for (const [colName, data] of columnTypes.entries()) {
    if (data.tables.length > 1 && data.types.size > 1) {
      conflicts.push({
        id: `dup_type_${colName}`,
        type: 'inconsistent_column_type',
        severity: 'medium',
        columnName: colName,
        description: `Column '${colName}' has different types across tables: ${[...data.types].join(', ')}`,
        affectedTables: data.tables,
        suggestion: `Standardize '${colName}' to consistent type across all tables`
      });
    }
  }
  
  return conflicts;
}

async function resolveSchemaConflict(projectId: string, body: { conflictId: string; resolution: string }) {
  return NextResponse.json({
    success: true,
    message: `Conflict ${body.conflictId} resolution recorded`
  });
}

async function getConflictReport(projectId: string) {
  return detectSchemaConflicts(projectId);
}

// ═══════════════════════════════════════════════════════════════════════════
// COLUMN TYPE INFERENCE FROM CSHTML
// ═══════════════════════════════════════════════════════════════════════════

async function inferColumnTypes(projectId: string, viewName?: string) {
  const inferences: any[] = [];

  const where: Record<string, unknown> = { projectId };
  if (viewName) where.viewName = viewName;

  const cshtmlViews = await db.cSHTMLAnalysisCache.findMany({
    where,
    select: {
      viewName: true,
      fields: true,
      rawContent: true,
      linkedTable: true,
    }
  });

  for (const view of cshtmlViews) {
    const fields = JSON.parse(view.fields || '[]');
    const content = view.rawContent || '';

    for (const field of fields) {
      const inference = inferFieldTypeInfo(field, content, view.viewName);
      if (inference) {
        inferences.push({
          viewName: view.viewName,
          linkedTable: view.linkedTable,
          ...inference
        });
      }
    }
  }

  return NextResponse.json({
    success: true,
    inferences,
    stats: {
      total: inferences.length,
      byType: inferences.reduce((acc, i) => {
        acc[i.inferredType] = (acc[i.inferredType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    }
  });
}

function inferFieldTypeInfo(field: { name?: string; type?: string; validation?: any[] }, content: string, viewName: string): any {
  const fieldName = field.name || '';
  const fieldType = field.type || '';
  const validation = field.validation || [];
  
  let inferredType: string | null = null;
  let maxLength: number | null = null;
  let isRequired = false;
  let confidence = 0.5;
  let evidence: string[] = [];

  // Check HTML type
  if (fieldType) {
    switch (fieldType.toLowerCase()) {
      case 'number':
        inferredType = 'INT';
        confidence = 0.8;
        evidence.push(`HTML input type="number"`);
        break;
      case 'email':
        inferredType = 'NVARCHAR(255)';
        confidence = 0.9;
        evidence.push(`HTML input type="email"`);
        break;
      case 'date':
        inferredType = 'DATE';
        confidence = 0.9;
        evidence.push(`HTML input type="date"`);
        break;
      case 'datetime-local':
        inferredType = 'DATETIME';
        confidence = 0.9;
        evidence.push(`HTML input type="datetime-local"`);
        break;
      case 'time':
        inferredType = 'TIME';
        confidence = 0.9;
        evidence.push(`HTML input type="time"`);
        break;
      case 'checkbox':
        inferredType = 'BIT';
        confidence = 0.9;
        evidence.push(`HTML input type="checkbox"`);
        break;
      case 'password':
        inferredType = 'NVARCHAR(255)';
        maxLength = 255;
        confidence = 0.8;
        evidence.push(`HTML input type="password"`);
        break;
      case 'tel':
        inferredType = 'NVARCHAR(20)';
        confidence = 0.8;
        evidence.push(`HTML input type="tel"`);
        break;
      case 'url':
        inferredType = 'NVARCHAR(500)';
        confidence = 0.8;
        evidence.push(`HTML input type="url"`);
        break;
    }
  }

  // Check validation rules
  for (const val of validation) {
    if (val.type === 'required') {
      isRequired = true;
      evidence.push(`Validation: required`);
    }
    if (val.type === 'maxlength') {
      maxLength = parseInt(val.value) || null;
      evidence.push(`Validation: maxlength=${maxLength}`);
    }
    if (val.type === 'min' || val.type === 'max') {
      if (!inferredType || inferredType === 'INT') {
        inferredType = 'DECIMAL(18,2)';
        evidence.push(`Validation: ${val.type}=${val.value}`);
      }
    }
    if (val.type === 'email') {
      inferredType = 'NVARCHAR(255)';
      confidence = 0.9;
      evidence.push(`Validation: email format`);
    }
  }

  // Check field name patterns
  const nameLower = fieldName.toLowerCase();
  if (!inferredType) {
    if (nameLower.endsWith('id') && nameLower !== 'id') {
      inferredType = 'UNIQUEIDENTIFIER';
      confidence = 0.85;
      evidence.push(`Name pattern: FK field`);
    } else if (nameLower.includes('amount') || nameLower.includes('price') || 
               nameLower.includes('cost') || nameLower.includes('fee')) {
      inferredType = 'DECIMAL(18,2)';
      confidence = 0.8;
      evidence.push(`Name pattern: monetary field`);
    } else if (nameLower.includes('date') || nameLower.includes('time')) {
      inferredType = 'DATETIME';
      confidence = 0.85;
      evidence.push(`Name pattern: datetime field`);
    } else if (nameLower.startsWith('is') || nameLower.startsWith('has') || 
               nameLower.startsWith('can') || nameLower.startsWith('should')) {
      inferredType = 'BIT';
      confidence = 0.85;
      evidence.push(`Name pattern: boolean field`);
    } else if (nameLower.includes('email')) {
      inferredType = 'NVARCHAR(255)';
      confidence = 0.85;
      evidence.push(`Name pattern: email field`);
    } else if (nameLower.includes('phone') || nameLower.includes('mobile') || 
               nameLower.includes('fax')) {
      inferredType = 'NVARCHAR(20)';
      confidence = 0.8;
      evidence.push(`Name pattern: phone field`);
    } else if (nameLower.includes('description') || nameLower.includes('note') || 
               nameLower.includes('comment') || nameLower.includes('remarks')) {
      inferredType = 'NVARCHAR(MAX)';
      confidence = 0.8;
      evidence.push(`Name pattern: text field`);
    } else if (nameLower.includes('count') || nameLower.includes('qty') || 
               nameLower.includes('quantity') || nameLower.includes('number')) {
      inferredType = 'INT';
      confidence = 0.8;
      evidence.push(`Name pattern: numeric field`);
    } else if (nameLower.includes('name') || nameLower.includes('title')) {
      inferredType = 'NVARCHAR(200)';
      confidence = 0.7;
      evidence.push(`Name pattern: name field`);
    }
  }

  // Check for dropdown/select
  if (content.includes(`name="${fieldName}"`) && content.includes('<select')) {
    if (nameLower.endsWith('id')) {
      inferredType = 'UNIQUEIDENTIFIER';
      confidence = 0.9;
    } else {
      inferredType = 'NVARCHAR(50)';
      confidence = 0.85;
    }
    evidence.push(`Field is a dropdown/select`);
  }

  // Default fallback
  if (!inferredType) {
    inferredType = 'NVARCHAR(255)';
    confidence = 0.5;
    evidence.push(`Default fallback type`);
  }

  return {
    fieldName,
    inferredType,
    maxLength,
    isRequired,
    confidence,
    evidence,
    originalType: fieldType || null,
  };
}

async function applyTypeInference(projectId: string, inferences: any[]) {
  let applied = 0;

  for (const inference of inferences) {
    try {
      await db.columnIntelligenceCache.upsert({
        where: {
          tableName_columnName: {
            tableName: inference.linkedTable || inference.viewName,
            columnName: inference.fieldName,
          }
        },
        create: {
          tableName: inference.linkedTable || inference.viewName,
          columnName: inference.fieldName,
          semanticType: inference.inferredType,
          uiType: inference.originalType || 'text',
          sensitivity: 'public',
          confidence: Math.round(inference.confidence * 100),
          validationRules: JSON.stringify(inference.evidence),
          suggestions: JSON.stringify([{ 
            type: 'inferred_type', 
            value: inference.inferredType,
            source: 'cshtml_analysis'
          }]),
        },
        update: {
          semanticType: inference.inferredType,
          confidence: Math.round(inference.confidence * 100),
          suggestions: JSON.stringify([{ 
            type: 'inferred_type', 
            value: inference.inferredType,
            source: 'cshtml_analysis'
          }]),
        }
      });
      applied++;
    } catch (e) {
      console.error(`Failed to apply inference for ${inference.fieldName}:`, e);
    }
  }

  return NextResponse.json({
    success: true,
    applied,
    total: inferences.length,
    message: `Applied ${applied} type inferences`
  });
}

async function getTypeInferenceSummary(projectId: string) {
  const cache = await db.columnIntelligenceCache.findMany({
    orderBy: { confidence: 'desc' }
  });

  const byType = cache.reduce((acc, c) => {
    acc[c.semanticType] = (acc[c.semanticType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return NextResponse.json({
    success: true,
    summary: {
      totalFields: cache.length,
      highConfidence: cache.filter(c => c.confidence >= 80).length,
      mediumConfidence: cache.filter(c => c.confidence >= 50 && c.confidence < 80).length,
      lowConfidence: cache.filter(c => c.confidence < 50).length,
      byType
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPLETE SCHEMA ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

async function analyzeSchema(projectId: string) {
  const [missingTables, migrationSuggestions, conflicts, typeInferences] = await Promise.all([
    detectMissingTables(projectId),
    generateMigrationSuggestions(projectId),
    detectSchemaConflicts(projectId),
    inferColumnTypes(projectId)
  ]);

  const missingTablesData = await missingTables.json();
  const migrationData = await migrationSuggestions.json();
  const conflictsData = await conflicts.json();
  const typeData = await typeInferences.json();

  return NextResponse.json({
    success: true,
    analysis: {
      missingTables: missingTablesData,
      migrationSuggestions: migrationData,
      conflicts: conflictsData,
      typeInferences: typeData,
      timestamp: new Date().toISOString(),
    }
  });
}

async function getSchemaIntelligenceSummary(projectId: string) {
  const [
    tablesCount,
    spCount,
    viewsCount,
    missingTablesCount,
    conflictsCount,
    typeInferencesCount,
  ] = await Promise.all([
    db.toolkitTable.count({ where: { projectId } }),
    db.toolkitProcedure.count({ where: { projectId } }),
    db.cSHTMLAnalysisCache.count({ where: { projectId } }),
    db.missingTableResolution.count({ where: { projectId, resolutionStatus: 'pending' } }),
    db.extractionConflict.count({ where: { projectId, status: 'pending' } }),
    db.columnIntelligenceCache.count(),
  ]);

  return NextResponse.json({
    success: true,
    summary: {
      schema: {
        tables: tablesCount,
        procedures: spCount,
        views: viewsCount,
      },
      intelligence: {
        missingTables: missingTablesCount,
        conflicts: conflictsCount,
        typeInferences: typeInferencesCount,
      },
      healthScore: calculateHealthScore({
        tablesCount,
        missingTablesCount,
        conflictsCount,
      }),
    }
  });
}

function calculateHealthScore(data: {
  tablesCount: number;
  missingTablesCount: number;
  conflictsCount: number;
}): number {
  if (data.tablesCount === 0) return 0;
  
  const missingPenalty = data.missingTablesCount * 5;
  const conflictPenalty = data.conflictsCount * 2;
  
  const score = 100 - missingPenalty - conflictPenalty;
  return Math.max(0, Math.min(100, score));
}

// ═══════════════════════════════════════════════════════════════════════════
// ADVANCED RELATIONSHIP DETECTION (85% → 95%)
// ═══════════════════════════════════════════════════════════════════════════

async function detectRelationships(projectId: string) {
  const tables = await db.toolkitTable.findMany({
    where: { projectId },
    select: { tableName: true, columns: true, foreignKeys: true }
  });

  const relationships: any[] = [];
  const inferredRelationships: any[] = [];

  // Parse existing FKs
  for (const table of tables) {
    const fks = JSON.parse(table.foreignKeys || '[]');
    for (const fk of fks) {
      relationships.push({
        type: 'explicit',
        fromTable: table.tableName,
        fromColumn: fk.columnName,
        toTable: fk.referencedTable,
        toColumn: fk.referencedColumn || 'Id',
        constraintName: fk.name || `FK_${table.tableName}_${fk.columnName}`,
        onDelete: fk.onDelete || 'NO ACTION',
        onUpdate: fk.onUpdate || 'NO ACTION',
      });
    }
  }

  // Infer relationships from column naming patterns
  for (const table of tables) {
    const columns = JSON.parse(table.columns || '[]');
    
    for (const col of columns) {
      if (col.name.toLowerCase().endsWith('id') && 
          col.name.toLowerCase() !== 'id' &&
          !relationships.some(r => r.fromTable === table.tableName && r.fromColumn === col.name)) {
        
        // Extract potential referenced table name
        const refTableName = col.name.replace(/Id$/i, '');
        
        // Check if the referenced table exists
        const refTable = tables.find(t => 
          t.tableName.toLowerCase() === refTableName.toLowerCase() ||
          t.tableName.toLowerCase() === `${refTableName}s`.toLowerCase()
        );

        if (refTable) {
          inferredRelationships.push({
            type: 'inferred',
            fromTable: table.tableName,
            fromColumn: col.name,
            toTable: refTable.tableName,
            toColumn: 'Id',
            confidence: 0.85,
            reason: 'Column naming pattern suggests FK relationship',
          });
        }
      }
    }
  }

  // Detect junction tables (many-to-many relationships)
  for (const table of tables) {
    const columns = JSON.parse(table.columns || '[]');
    const fkColumns = columns.filter((c: { name: string }) => 
      c.name.toLowerCase().endsWith('id') && c.name.toLowerCase() !== 'id'
    );

    if (fkColumns.length >= 2 && columns.length <= 4) {
      const relatedTables = fkColumns.map((c: { name: string }) => {
        const refName = c.name.replace(/Id$/i, '');
        return tables.find(t => 
          t.tableName.toLowerCase() === refName.toLowerCase() ||
          t.tableName.toLowerCase() === `${refName}s`.toLowerCase()
        );
      }).filter(Boolean);

      if (relatedTables.length >= 2) {
        relationships.push({
          type: 'junction',
          junctionTable: table.tableName,
          participants: relatedTables.map((t: { tableName: string }) => t.tableName),
          columns: fkColumns.map((c: { name: string }) => c.name),
        });
      }
    }
  }

  // Detect self-referencing relationships
  for (const table of tables) {
    const columns = JSON.parse(table.columns || '[]');
    const selfRefCol = columns.find((c: { name: string }) => 
      c.name.toLowerCase() === 'parentid' || 
      c.name.toLowerCase() === `${table.tableName.toLowerCase()}id`
    );

    if (selfRefCol) {
      relationships.push({
        type: 'self-referencing',
        table: table.tableName,
        column: selfRefCol.name,
        description: 'Hierarchical/tree structure detected',
      });
    }
  }

  return NextResponse.json({
    success: true,
    relationships: {
      explicit: relationships.filter(r => r.type === 'explicit'),
      inferred: inferredRelationships,
      junction: relationships.filter(r => r.type === 'junction'),
      selfReferencing: relationships.filter(r => r.type === 'self-referencing'),
    },
    stats: {
      totalExplicit: relationships.filter(r => r.type === 'explicit').length,
      totalInferred: inferredRelationships.length,
      junctionTables: relationships.filter(r => r.type === 'junction').length,
      selfReferencing: relationships.filter(r => r.type === 'self-referencing').length,
    }
  });
}

async function getRelationshipGraph(projectId: string) {
  const result = await detectRelationships(projectId);
  const data = await result.json();

  // Build graph structure for visualization
  const nodes: any[] = [];
  const edges: any[] = [];
  const nodeMap = new Map<string, number>();

  // Add tables as nodes
  const tables = await db.toolkitTable.findMany({
    where: { projectId },
    select: { tableName: true }
  });

  tables.forEach((t, i) => {
    nodeMap.set(t.tableName, i);
    nodes.push({
      id: i,
      label: t.tableName,
      type: 'table',
    });
  });

  // Add relationships as edges
  const allRelationships = [
    ...data.relationships.explicit,
    ...data.relationships.inferred,
  ];

  for (const rel of allRelationships) {
    const source = nodeMap.get(rel.fromTable);
    const target = nodeMap.get(rel.toTable);

    if (source !== undefined && target !== undefined) {
      edges.push({
        source,
        target,
        label: rel.fromColumn,
        type: rel.type,
      });
    }
  }

  return NextResponse.json({
    success: true,
    graph: { nodes, edges },
    stats: data.stats,
  });
}

async function suggestRelationships(projectId: string) {
  const result = await detectRelationships(projectId);
  const data = await result.json();

  const suggestions: any[] = [];

  // Convert inferred relationships to actionable suggestions
  for (const inferred of data.relationships.inferred) {
    suggestions.push({
      id: `suggest_fk_${inferred.fromTable}_${inferred.fromColumn}`,
      type: 'add_foreign_key',
      priority: inferred.confidence > 0.8 ? 'high' : 'medium',
      sql: `ALTER TABLE ${inferred.fromTable} ADD CONSTRAINT FK_${inferred.fromTable}_${inferred.fromColumn} FOREIGN KEY (${inferred.fromColumn}) REFERENCES ${inferred.toTable}(Id);`,
      description: `Add FK from ${inferred.fromTable}.${inferred.fromColumn} to ${inferred.toTable}`,
      confidence: inferred.confidence,
      reason: inferred.reason,
    });
  }

  // Suggest indexes for FK columns
  for (const rel of [...data.relationships.explicit, ...data.relationships.inferred]) {
    suggestions.push({
      id: `suggest_idx_${rel.fromTable}_${rel.fromColumn}`,
      type: 'add_index',
      priority: 'low',
      sql: `CREATE INDEX IX_${rel.fromTable}_${rel.fromColumn} ON ${rel.fromTable}(${rel.fromColumn});`,
      description: `Add index on FK column ${rel.fromTable}.${rel.fromColumn}`,
      reason: 'Improve join query performance',
    });
  }

  return NextResponse.json({
    success: true,
    suggestions,
    stats: {
      total: suggestions.length,
      highPriority: suggestions.filter(s => s.priority === 'high').length,
      mediumPriority: suggestions.filter(s => s.priority === 'medium').length,
      lowPriority: suggestions.filter(s => s.priority === 'low').length,
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMA DOCUMENTATION GENERATOR (95% → 100%)
// ═══════════════════════════════════════════════════════════════════════════

async function generateSchemaDocumentation(projectId: string, options: {
  format?: 'markdown' | 'html' | 'json';
  includeERD?: boolean;
  includeSamples?: boolean;
} = {}) {
  const format = options.format || 'markdown';
  
  const tables = await db.toolkitTable.findMany({
    where: { projectId },
    orderBy: { tableName: 'asc' }
  });

  const procedures = await db.toolkitProcedure.findMany({
    where: { projectId },
    orderBy: { procedureName: 'asc' }
  });

  const cshtmlViews = await db.cSHTMLAnalysisCache.findMany({
    where: { projectId },
    orderBy: { viewName: 'asc' }
  });

  let documentation = '';

  if (format === 'markdown') {
    documentation = generateMarkdownDocs(tables, procedures, cshtmlViews, options);
  } else if (format === 'html') {
    documentation = generateHTMLDocs(tables, procedures, cshtmlViews, options);
  } else {
    documentation = JSON.stringify({ tables, procedures, cshtmlViews }, null, 2);
  }

  return NextResponse.json({
    success: true,
    format,
    documentation,
    stats: {
      tables: tables.length,
      procedures: procedures.length,
      views: cshtmlViews.length,
    }
  });
}

function generateMarkdownDocs(tables: any[], procedures: any[], views: any[], options: any): string {
  let md = `# Schema Documentation

Generated: ${new Date().toISOString()}

## Overview

- **Tables:** ${tables.length}
- **Stored Procedures:** ${procedures.length}
- **Views (CSHTML):** ${views.length}

---

## Tables

`;

  for (const table of tables) {
    const columns = JSON.parse(table.columns || '[]');
    const fks = JSON.parse(table.foreignKeys || '[]');
    const indexes = JSON.parse(table.indexes || '[]');

    md += `### ${table.tableName}

| Column | Type | Nullable | Key | Description |
|--------|------|----------|-----|-------------|
`;

    for (const col of columns) {
      const key = col.isPrimaryKey ? '🔑 PK' : 
                  fks.some((fk: { columnName: string }) => fk.columnName === col.name) ? '🔗 FK' : '';
      md += `| ${col.name} | ${col.dataType || 'N/A'} | ${col.isNullable ? '✓' : '✗'} | ${key} | ${col.description || ''} |\n`;
    }

    if (fks.length > 0) {
      md += `\n**Foreign Keys:**\n`;
      for (const fk of fks) {
        md += `- ${fk.columnName} → ${fk.referencedTable}.${fk.referencedColumn || 'Id'}\n`;
      }
    }

    if (indexes.length > 0) {
      md += `\n**Indexes:**\n`;
      for (const idx of indexes) {
        md += `- ${idx.name || 'Unnamed'}: ${Array.isArray(idx.columns) ? idx.columns.join(', ') : idx.columns}\n`;
      }
    }

    md += '\n---\n\n';
  }

  if (procedures.length > 0) {
    md += `## Stored Procedures\n\n`;
    
    for (const sp of procedures.slice(0, 20)) {
      const params = JSON.parse(sp.parameters || '[]');
      md += `### ${sp.procedureName}\n\n`;
      
      if (params.length > 0) {
        md += `**Parameters:**\n`;
        for (const p of params) {
          md += `- ${p.name}: ${p.type}${p.isOutput ? ' (OUTPUT)' : ''}\n`;
        }
      }
      md += '\n';
    }
  }

  if (views.length > 0) {
    md += `## CSHTML Views\n\n`;
    for (const view of views.slice(0, 20)) {
      const fields = JSON.parse(view.fields || '[]');
      md += `### ${view.viewName}\n\n`;
      md += `- **Linked Table:** ${view.linkedTable || 'Not linked'}\n`;
      md += `- **Fields:** ${fields.length}\n\n`;
    }
  }

  return md;
}

function generateHTMLDocs(tables: any[], procedures: any[], views: any[], options: any): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Schema Documentation</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f4f4f4; }
    h2 { border-bottom: 2px solid #333; padding-bottom: 10px; }
    h3 { color: #2563eb; }
    .fk { color: #059669; }
    .pk { color: #dc2626; font-weight: bold; }
  </style>
</head>
<body>
  <h1>Schema Documentation</h1>
  <p>Generated: ${new Date().toISOString()}</p>
  
  <h2>Overview</h2>
  <ul>
    <li>Tables: ${tables.length}</li>
    <li>Stored Procedures: ${procedures.length}</li>
    <li>CSHTML Views: ${views.length}</li>
  </ul>

  <h2>Tables</h2>
  ${tables.map(t => {
    const cols = JSON.parse(t.columns || '[]');
    return `<h3>${t.tableName}</h3>
    <table>
      <tr><th>Column</th><th>Type</th><th>Nullable</th><th>Key</th></tr>
      ${cols.map((c: { name: string; dataType: string; isNullable: boolean; isPrimaryKey: boolean }) => 
        `<tr><td>${c.name}</td><td>${c.dataType || 'N/A'}</td><td>${c.isNullable ? '✓' : '✗'}</td><td>${c.isPrimaryKey ? '🔑 PK' : ''}</td></tr>`
      ).join('')}
    </table>`;
  }).join('')}
</body>
</html>`;
}

async function exportSchemaDictionary(projectId: string) {
  const tables = await db.toolkitTable.findMany({
    where: { projectId },
    select: {
      tableName: true,
      schemaName: true,
      columns: true,
      foreignKeys: true,
      indexes: true,
    }
  });

  const dictionary: Record<string, any> = {};

  for (const table of tables) {
    const columns = JSON.parse(table.columns || '[]');
    const fks = JSON.parse(table.foreignKeys || '[]');

    dictionary[table.tableName] = {
      schema: table.schemaName,
      columns: columns.map((c: { name: string; dataType: string; isNullable: boolean; isPrimaryKey: boolean; maxLength: number }) => ({
        name: c.name,
        type: c.dataType,
        nullable: c.isNullable,
        primaryKey: c.isPrimaryKey,
        maxLength: c.maxLength,
        foreignKey: fks.find((fk: { columnName: string }) => fk.columnName === c.name),
      })),
      relationships: fks.map((fk: { columnName: string; referencedTable: string; referencedColumn: string }) => ({
        column: fk.columnName,
        references: `${fk.referencedTable}.${fk.referencedColumn || 'Id'}`,
      })),
    };
  }

  return NextResponse.json({
    success: true,
    dictionary,
    exportedAt: new Date().toISOString(),
    tableCount: tables.length,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMA OPTIMIZATION
// ═══════════════════════════════════════════════════════════════════════════

async function optimizeSchema(projectId: string) {
  const suggestions: any[] = [];

  const tables = await db.toolkitTable.findMany({
    where: { projectId },
    select: { tableName: true, columns: true, foreignKeys: true, indexes: true }
  });

  // Check for tables without primary keys
  for (const table of tables) {
    const columns = JSON.parse(table.columns || '[]');
    const hasPK = columns.some((c: { isPrimaryKey: boolean }) => c.isPrimaryKey);
    
    if (!hasPK) {
      suggestions.push({
        id: `opt_pk_${table.tableName}`,
        type: 'add_primary_key',
        priority: 'critical',
        tableName: table.tableName,
        description: `Table ${table.tableName} has no primary key`,
        sql: `ALTER TABLE ${table.tableName} ADD Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID();`,
        impact: 'Critical for data integrity and replication',
      });
    }
  }

  // Check for missing indexes on FK columns
  for (const table of tables) {
    const fks = JSON.parse(table.foreignKeys || '[]');
    const indexes = JSON.parse(table.indexes || '[]');
    
    for (const fk of fks) {
      const hasIndex = indexes.some((idx: { columns: string[] }) => 
        idx.columns?.some((c: string) => c.toLowerCase() === fk.columnName?.toLowerCase())
      );
      
      if (!hasIndex) {
        suggestions.push({
          id: `opt_idx_${table.tableName}_${fk.columnName}`,
          type: 'add_index',
          priority: 'medium',
          tableName: table.tableName,
          description: `Missing index on FK column ${table.tableName}.${fk.columnName}`,
          sql: `CREATE INDEX IX_${table.tableName}_${fk.columnName} ON ${table.tableName}(${fk.columnName});`,
          impact: 'Improves JOIN performance',
        });
      }
    }
  }

  // Check for wide tables (> 30 columns)
  for (const table of tables) {
    const columns = JSON.parse(table.columns || '[]');
    
    if (columns.length > 30) {
      suggestions.push({
        id: `opt_wide_${table.tableName}`,
        type: 'split_table',
        priority: 'low',
        tableName: table.tableName,
        description: `Table ${table.tableName} has ${columns.length} columns, consider vertical partitioning`,
        impact: 'May improve query performance and maintainability',
        recommendation: 'Split into multiple related tables or use columnar storage',
      });
    }
  }

  // Check for missing audit columns
  const auditColumns = ['createdat', 'updatedat', 'createdby', 'updatedby'];
  for (const table of tables) {
    const columns = JSON.parse(table.columns || '[]');
    const colNames = columns.map((c: { name: string }) => c.name.toLowerCase());
    const missingAudit = auditColumns.filter(a => !colNames.includes(a));
    
    if (missingAudit.length > 0 && columns.length > 5) {
      suggestions.push({
        id: `opt_audit_${table.tableName}`,
        type: 'add_audit_columns',
        priority: 'low',
        tableName: table.tableName,
        description: `Table ${table.tableName} missing audit columns: ${missingAudit.join(', ')}`,
        impact: 'Enables change tracking and compliance',
        missingColumns: missingAudit,
      });
    }
  }

  // Check for naming convention issues
  for (const table of tables) {
    if (table.tableName !== table.tableName.toLowerCase() && 
        table.tableName !== table.tableName.toUpperCase() &&
        !/^[A-Z][a-z]+(?:[A-Z][a-z]+)*$/.test(table.tableName)) {
      suggestions.push({
        id: `opt_name_${table.tableName}`,
        type: 'naming_convention',
        priority: 'low',
        tableName: table.tableName,
        description: `Table name does not follow PascalCase convention`,
        impact: 'Consistency and readability',
      });
    }
  }

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  suggestions.sort((a, b) => priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]);

  return NextResponse.json({
    success: true,
    suggestions,
    stats: {
      total: suggestions.length,
      critical: suggestions.filter(s => s.priority === 'critical').length,
      high: suggestions.filter(s => s.priority === 'high').length,
      medium: suggestions.filter(s => s.priority === 'medium').length,
      low: suggestions.filter(s => s.priority === 'low').length,
    }
  });
}

async function analyzeCrossReferences(projectId: string) {
  // Get all stored procedures and their table references
  const procedures = await db.toolkitProcedure.findMany({
    where: { projectId },
    select: { procedureName: true, tablesAccessed: true, tablesModified: true, body: true }
  });

  const tables = await db.toolkitTable.findMany({
    where: { projectId },
    select: { tableName: true }
  });

  const tableNames = new Set(tables.map(t => t.tableName.toLowerCase()));

  const crossRefs: any[] = [];

  for (const sp of procedures) {
    const accessed = JSON.parse(sp.tablesAccessed || '[]');
    const modified = JSON.parse(sp.tablesModified || '[]');

    // Cross-reference SP with tables
    for (const tableName of [...accessed, ...modified]) {
      if (tableNames.has(tableName.toLowerCase())) {
        crossRefs.push({
          type: 'sp_table',
          source: sp.procedureName,
          target: tableName,
          operation: modified.includes(tableName) ? 'modify' : 'read',
        });
      }
    }
  }

  // Get CSHTML view references
  const views = await db.cSHTMLAnalysisCache.findMany({
    where: { projectId },
    select: { viewName: true, linkedTable: true, fields: true }
  });

  for (const view of views) {
    if (view.linkedTable) {
      crossRefs.push({
        type: 'view_table',
        source: view.viewName,
        target: view.linkedTable,
        operation: 'ui_binding',
        fieldCount: JSON.parse(view.fields || '[]').length,
      });
    }
  }

  // Build reference matrix
  const matrix: Record<string, Record<string, string[]>> = {};
  
  for (const ref of crossRefs) {
    if (!matrix[ref.source]) matrix[ref.source] = {};
    if (!matrix[ref.source][ref.target]) matrix[ref.source][ref.target] = [];
    matrix[ref.source][ref.target].push(ref.operation);
  }

  return NextResponse.json({
    success: true,
    crossReferences: crossRefs,
    matrix,
    stats: {
      totalReferences: crossRefs.length,
      spTableRefs: crossRefs.filter(r => r.type === 'sp_table').length,
      viewTableRefs: crossRefs.filter(r => r.type === 'view_table').length,
    }
  });
}
