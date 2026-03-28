// =============================================================================
// Schema Toolkit - SQL Server Parser
// =============================================================================

import {
  TableDef,
  ColumnDef,
  ForeignKeyDef,
  IndexDef,
  CheckConstraintDef,
  StoredProcedureDef,
  ProcedureParameter,
  SQLOperation,
  ParseResult,
  ParseStats,
  InsertStatementDef,
  SeedDataSummary,
} from './types';

/**
 * Parse SQL Server DDL script
 */
export function parseSqlServer(sql: string): ParseResult {
  const startTime = Date.now();
  const tables: TableDef[] = [];
  const storedProcedures: StoredProcedureDef[] = [];
  const insertStatements: InsertStatementDef[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Clean up the SQL - remove comments
  let cleaned = sql;

  // Remove single-line comments
  cleaned = cleaned.replace(/--.*$/gm, '');

  // Remove multi-line comments
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');

  // Store extracted FKs from DROP CONSTRAINT statements
  const extractedFKs: Map<string, ForeignKeyDef[]> = new Map();

  // Parse ALTER TABLE DROP CONSTRAINT statements to extract FK info from naming convention
  // Format: FK_{sourceSchema}.{sourceTable}_{refSchema}.{refTable}_{columnName}
  const dropFkRegex =
    /ALTER\s+TABLE\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s+DROP\s+CONSTRAINT\s+\[?(FK_[\w.]+)\]?/gi;

  let dropMatch: RegExpExecArray | null;
  while ((dropMatch = dropFkRegex.exec(cleaned)) !== null) {
    const tableName = dropMatch[2];
    const constraintName = dropMatch[3];
    
    // Parse FK constraint name to extract reference info
    // Format: FK_dbo.SourceTable_dbo.RefTable_ColumnName
    const fkParts = constraintName.match(/FK_([\w]+)\.([\w]+)_([\w]+)\.([\w]+)_([\w]+)/i);
    
    if (fkParts) {
      const sourceTable = fkParts[2];
      const refTable = fkParts[4];
      const columnName = fkParts[5];
      
      // Get or create FK array for this table
      if (!extractedFKs.has(tableName)) {
        extractedFKs.set(tableName, []);
      }
      
      extractedFKs.get(tableName)!.push({
        constraintName: constraintName,
        columnName: columnName,
        referencesTable: refTable,
        referencesColumn: 'Id', // Assume Id as default
      });
    }
  }

  // Parse CREATE TABLE statements with a more robust approach
  // Find CREATE TABLE and extract body by matching parentheses
  const createTableStart = /CREATE\s+TABLE\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s*\(/gi;
  
  let match: RegExpExecArray | null;

  while ((match = createTableStart.exec(cleaned)) !== null) {
    try {
      const schemaName = match[1] || 'dbo';
      const tableName = match[2];
      const startIndex = match[0].length + match.index;
      
      // Find matching closing parenthesis
      let depth = 1;
      let endIndex = startIndex;
      while (endIndex < cleaned.length && depth > 0) {
        if (cleaned[endIndex] === '(') depth++;
        if (cleaned[endIndex] === ')') depth--;
        endIndex++;
      }
      
      const body = cleaned.substring(startIndex, endIndex - 1);

      const { columns, foreignKeys, indexes, checkConstraints, primaryKeys } =
        parseTableBody(body, tableName);

      // Mark primary key columns
      primaryKeys.forEach((pk) => {
        const col = columns.find(
          (c) => c.name.toLowerCase() === pk.toLowerCase()
        );
        if (col) col.isPrimaryKey = true;
      });

      // Add extracted FKs from DROP CONSTRAINT statements
      const extractedFKsForTable = extractedFKs.get(tableName) || [];
      for (const fk of extractedFKsForTable) {
        const exists = foreignKeys.some(
          (existingFk) => existingFk.columnName.toLowerCase() === fk.columnName.toLowerCase()
        );
        if (!exists) {
          foreignKeys.push(fk);
        }
      }

      // Store source DDL for reference
      const sourceDDL = match[0];

      tables.push({
        schemaName,
        tableName,
        columns,
        foreignKeys,
        indexes,
        checkConstraints,
        sourceDDL,
      });
    } catch (e) {
      const error = e as Error;
      errors.push(`Error parsing table: ${match[2]} — ${error.message}`);
    }
  }

  // Parse ALTER TABLE ... ADD CONSTRAINT FK statements
  const alterFkRegex =
    /ALTER\s+TABLE\s+(?:\[?\w+\]?\.)?\[?(\w+)\]?\s+.*?ADD\s+CONSTRAINT\s+\[?(\w+)\]?\s+FOREIGN\s+KEY\s*\(\s*\[?(\w+)\]?\s*\)\s*REFERENCES\s+(?:\[?\w+\]?\.)?\[?(\w+)\]?\s*\(\s*\[?(\w+)\]?\s*\)/gi;

  while ((match = alterFkRegex.exec(cleaned)) !== null) {
    const tableName = match[1];
    const constraintName = match[2];
    const columnName = match[3];
    const refTable = match[4];
    const refColumn = match[5];

    const table = tables.find(
      (t) => t.tableName.toLowerCase() === tableName.toLowerCase()
    );

    if (table) {
      const exists = table.foreignKeys.some(
        (fk) =>
          fk.columnName.toLowerCase() === columnName.toLowerCase() &&
          fk.referencesTable.toLowerCase() === refTable.toLowerCase()
      );

      if (!exists) {
        table.foreignKeys.push({
          constraintName,
          columnName,
          referencesTable: refTable,
          referencesColumn: refColumn,
        });
      }
    } else {
      warnings.push(`ALTER TABLE FK: table "${tableName}" not found`);
    }
  }

  // Parse CREATE INDEX statements
  const createIndexRegex =
    /CREATE\s+(UNIQUE\s+)?(?:CLUSTERED\s+|NONCLUSTERED\s+)?INDEX\s+\[?(\w+)\]?\s+ON\s+(?:\[?\w+\]?\.)?\[?(\w+)\]?\s*\(([^)]+)\)/gi;

  while ((match = createIndexRegex.exec(cleaned)) !== null) {
    const isUnique = !!match[1];
    const indexName = match[2];
    const tableName = match[3];
    const columnsStr = match[4];

    const table = tables.find(
      (t) => t.tableName.toLowerCase() === tableName.toLowerCase()
    );

    if (table) {
      const columns = columnsStr
        .split(',')
        .map((c) => c.replace(/[\[\]\s]/g, '').split(' ')[0])
        .filter(Boolean);

      if (!table.indexes) table.indexes = [];

      table.indexes.push({
        name: indexName,
        columns,
        isUnique,
      });
    }
  }

  // Parse CREATE PROCEDURE statements
  const createProcRegex =
    /CREATE\s+(?:OR\s+ALTER\s+)?PROC(?:EDURE)?\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s*([\s\S]*?)\s+AS\s+([\s\S]*?)(?=GO|CREATE\s+(?:OR\s+ALTER\s+)?PROC|CREATE\s+FUNCTION|$)/gi;

  while ((match = createProcRegex.exec(cleaned)) !== null) {
    try {
      const schemaName = match[1] || 'dbo';
      const procName = match[2];
      const paramsStr = match[3];
      const body = match[4];

      const parameters = parseProcedureParameters(paramsStr);
      const operations = extractSQLOperations(body);
      const tablesAccessed = extractTablesFromOperations(operations, 'read');
      const tablesModified = extractTablesFromOperations(operations, 'write');

      storedProcedures.push({
        schemaName,
        procedureName: procName,
        parameters,
        body: body.trim(),
        operations,
        tablesAccessed,
        tablesModified,
        complexity: calculateComplexity(body, operations),
      });
    } catch (e) {
      const error = e as Error;
      warnings.push(`Error parsing procedure: ${error.message}`);
    }
  }

  // ===========================================================================
  // Parse INSERT statements (Seed Data)
  // ===========================================================================
  
  // Track IDENTITY_INSERT state per table
  const identityInsertTables = new Set<string>();
  
  // Parse SET IDENTITY_INSERT ON/OFF statements
  const identityInsertRegex = /SET\s+IDENTITY_INSERT\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s+(ON|OFF)/gi;
  let identityMatch: RegExpExecArray | null;
  while ((identityMatch = identityInsertRegex.exec(cleaned)) !== null) {
    const tableName = identityMatch[2];
    const state = identityMatch[3].toUpperCase();
    if (state === 'ON') {
      identityInsertTables.add(tableName.toLowerCase());
    }
  }

  // Parse INSERT statements
  // Pattern: INSERT [schema].[Table] ([columns]) VALUES (...)
  const insertRegex = /INSERT\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/gi;
  
  // Group inserts by table for aggregation
  const insertsByTable = new Map<string, { 
    schemaName: string; 
    tableName: string; 
    columns: Set<string>; 
    count: number;
    statements: string[];
  }>();

  while ((match = insertRegex.exec(cleaned)) !== null) {
    try {
      const schemaName = match[1] || 'dbo';
      const tableName = match[2];
      const columnsStr = match[3];
      const valuesStr = match[4];

      // Parse columns
      const columns = columnsStr
        .split(',')
        .map(c => c.replace(/[\[\]\s]/g, '').trim())
        .filter(Boolean);

      const tableKey = `${schemaName}.${tableName}`.toLowerCase();
      
      if (!insertsByTable.has(tableKey)) {
        insertsByTable.set(tableKey, {
          schemaName,
          tableName,
          columns: new Set(),
          count: 0,
          statements: []
        });
      }

      const tableInserts = insertsByTable.get(tableKey)!;
      columns.forEach(c => tableInserts.columns.add(c));
      tableInserts.count++;
      tableInserts.statements.push(match[0]);

      insertStatements.push({
        schemaName,
        tableName,
        columns,
        valueCount: 1,
        hasExplicitIdentity: identityInsertTables.has(tableName.toLowerCase()),
        sourceDDL: match[0]
      });
    } catch (e) {
      // Skip malformed INSERT statements silently
    }
  }

  // Generate seed data summaries
  const seedDataSummaries: SeedDataSummary[] = [];
  for (const [key, data] of insertsByTable) {
    const totalRows = data.count;
    const isLookupTable = totalRows <= 1000 && data.columns.size <= 10; // Heuristic for lookup tables
    const estimatedImportTime = Math.ceil(totalRows / 100); // ~100 rows/second estimate

    seedDataSummaries.push({
      schemaName: data.schemaName,
      tableName: data.tableName,
      totalRows,
      columns: Array.from(data.columns),
      isLookupTable,
      hasIdentityInsert: identityInsertTables.has(data.tableName.toLowerCase()),
      estimatedImportTime
    });
  }

  // Calculate stats
  const stats: ParseStats = {
    totalTables: tables.length,
    totalColumns: tables.reduce((a, t) => a + t.columns.length, 0),
    totalForeignKeys: tables.reduce((a, t) => a + t.foreignKeys.length, 0),
    totalStoredProcedures: storedProcedures.length,
    totalInsertStatements: insertStatements.length,
    totalSeedDataRows: insertStatements.length,
    lookupTablesDetected: seedDataSummaries.filter(s => s.isLookupTable).length,
    parseTimeMs: Date.now() - startTime,
  };

  return { tables, storedProcedures, insertStatements, seedDataSummaries, errors, warnings, stats };
}

/**
 * Parse table body definition
 */
function parseTableBody(
  body: string,
  _tableName: string
): {
  columns: ColumnDef[];
  foreignKeys: ForeignKeyDef[];
  indexes: IndexDef[];
  checkConstraints: CheckConstraintDef[];
  primaryKeys: string[];
} {
  const columns: ColumnDef[] = [];
  const foreignKeys: ForeignKeyDef[] = [];
  const indexes: IndexDef[] = [];
  const checkConstraints: CheckConstraintDef[] = [];
  const primaryKeys: string[] = [];

  // First, strip out WITH (...) clauses that can contain commas
  let cleanedBody = body.replace(/WITH\s*\([^)]*\)/gi, '');
  
  // Split on commas that are NOT inside parentheses
  const parts = splitTopLevel(cleanedBody);

  for (const raw of parts) {
    const part = raw.trim();
    if (!part) continue;

    const upper = part.toUpperCase();

    // CONSTRAINT ... PRIMARY KEY
    if (upper.includes('PRIMARY KEY')) {
      const pkMatch = part.match(
        /PRIMARY\s+KEY\s*(?:CLUSTERED|NONCLUSTERED)?\s*\(([^)]+)\)/i
      );
      if (pkMatch) {
        pkMatch[1].split(',').forEach((c) => {
          primaryKeys.push(c.replace(/[\[\]\s]/g, '').split(' ')[0]);
        });
      }
      continue;
    }

    // CONSTRAINT ... FOREIGN KEY (inline)
    if (upper.includes('FOREIGN KEY')) {
      const fkMatch = part.match(
        /(?:CONSTRAINT\s+\[?(\w+)\]?\s+)?FOREIGN\s+KEY\s*\(\s*\[?(\w+)\]?\s*\)\s*REFERENCES\s+(?:\[?\w+\]?\.)?\[?(\w+)\]?\s*\(\s*\[?(\w+)\]?\s*\)/i
      );
      if (fkMatch) {
        foreignKeys.push({
          constraintName: fkMatch[1],
          columnName: fkMatch[2],
          referencesTable: fkMatch[3],
          referencesColumn: fkMatch[4],
        });
      }
      continue;
    }

    // CONSTRAINT ... CHECK
    if (upper.includes('CHECK')) {
      const checkMatch = part.match(
        /(?:CONSTRAINT\s+\[?(\w+)\]?\s+)?CHECK\s*\(([^)]+)\)/i
      );
      if (checkMatch) {
        checkConstraints.push({
          name: checkMatch[1],
          expression: checkMatch[2],
        });
      }
      continue;
    }

    // Skip CONSTRAINT ... UNIQUE
    if (upper.includes('UNIQUE') && upper.startsWith('CONSTRAINT')) {
      continue;
    }

    // Skip other constraint types
    if (
      upper.startsWith('CONSTRAINT') ||
      upper.startsWith('CHECK') ||
      upper.startsWith('UNIQUE') ||
      upper.startsWith('INDEX') ||
      upper.startsWith('PRIMARY') ||
      upper.startsWith('FOREIGN')
    ) {
      continue;
    }

    // Column definition
    const col = parseColumn(part);
    if (col) {
      columns.push(col);
    }
  }

  return { columns, foreignKeys, indexes, checkConstraints, primaryKeys };
}

/**
 * Parse individual column definition
 */
function parseColumn(part: string): ColumnDef | null {
  // Pattern: [ColumnName] [DATATYPE](size) [IDENTITY] [NOT NULL | NULL] [DEFAULT ...]
  // Handles both [Type] and Type formats
  const colRegex = /^\[?(\w+)\]?\s+\[?([\w]+)\]?(?:\s*\(([^)]*)\))?(.*)$/i;

  const m = part.match(colRegex);
  if (!m) return null;

  const name = m[1];
  const dataType = m[2].toUpperCase();
  const maxLength = m[3] || undefined;
  const rest = m[4]?.toUpperCase() || '';

  // Skip SQL keywords that look like column names
  const reserved = [
    'CONSTRAINT',
    'PRIMARY',
    'FOREIGN',
    'CHECK',
    'UNIQUE',
    'INDEX',
    'GO',
    'WITH',
    'ON',
  ];
  if (reserved.includes(name.toUpperCase())) return null;

  const isNullable = !rest.includes('NOT NULL');
  const isPrimaryKey = rest.includes('PRIMARY KEY');
  const isIdentity = rest.includes('IDENTITY');

  let defaultValue: string | undefined;
  const defMatch = part.match(/DEFAULT\s+(.+?)(?:\s*,?\s*$)/i);
  if (defMatch) {
    defaultValue = defMatch[1].trim();
  }

  return {
    name,
    dataType,
    maxLength,
    isNullable,
    isPrimaryKey,
    isIdentity,
    defaultValue,
  };
}

/**
 * Split string on top-level commas (not inside parentheses)
 */
function splitTopLevel(str: string): string[] {
  const results: string[] = [];
  let depth = 0;
  let current = '';

  for (const ch of str) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      results.push(current);
      current = '';
    } else {
      current += ch;
    }
  }

  if (current.trim()) results.push(current);

  return results;
}

/**
 * Parse stored procedure parameters
 */
function parseProcedureParameters(paramsStr: string): ProcedureParameter[] {
  const parameters: ProcedureParameter[] = [];

  if (!paramsStr.trim()) return parameters;

  // Match parameters like @ParamName INT = 0 OUTPUT
  const paramRegex =
    /@(\w+)\s+([\w]+(?:\s*\([^)]*\))?)\s*(?:=\s*([^,\s]+))?\s*(OUTPUT)?\s*,?/gi;

  let match: RegExpExecArray | null;
  while ((match = paramRegex.exec(paramsStr)) !== null) {
    parameters.push({
      name: '@' + match[1],
      dataType: match[2].toUpperCase(),
      defaultValue: match[3],
      isOutput: !!match[4],
    });
  }

  return parameters;
}

/**
 * Extract SQL operations from procedure body
 */
function extractSQLOperations(body: string): SQLOperation[] {
  const operations: SQLOperation[] = [];

  // SELECT operations
  const selectRegex = /SELECT\s+[\s\S]*?\s+FROM\s+\[?(\w+)\]?/gi;
  let match: RegExpExecArray | null;
  while ((match = selectRegex.exec(body)) !== null) {
    const tables = [match[1]];
    const existing = operations.find(
      (o) => o.type === 'SELECT' && o.tables.includes(tables[0])
    );
    if (!existing) {
      operations.push({ type: 'SELECT', tables });
    }
  }

  // INSERT operations
  const insertRegex = /INSERT\s+INTO\s+\[?(\w+)\]?/gi;
  while ((match = insertRegex.exec(body)) !== null) {
    operations.push({ type: 'INSERT', tables: [match[1]] });
  }

  // UPDATE operations
  const updateRegex = /UPDATE\s+\[?(\w+)\]?/gi;
  while ((match = updateRegex.exec(body)) !== null) {
    operations.push({ type: 'UPDATE', tables: [match[1]] });
  }

  // DELETE operations
  const deleteRegex = /DELETE\s+FROM\s+\[?(\w+)\]?/gi;
  while ((match = deleteRegex.exec(body)) !== null) {
    operations.push({ type: 'DELETE', tables: [match[1]] });
  }

  // EXEC operations
  const execRegex = /EXEC(?:UTE)?\s+\[?(\w+)\]?/gi;
  while ((match = execRegex.exec(body)) !== null) {
    operations.push({ type: 'EXECUTE', tables: [match[1]] });
  }

  return operations;
}

/**
 * Extract tables from operations by type
 */
function extractTablesFromOperations(
  operations: SQLOperation[],
  type: 'read' | 'write'
): string[] {
  const tables: string[] = [];
  const types =
    type === 'read' ? ['SELECT'] : ['INSERT', 'UPDATE', 'DELETE'];

  for (const op of operations) {
    if (types.includes(op.type)) {
      tables.push(...op.tables);
    }
  }

  return [...new Set(tables)];
}

/**
 * Calculate procedure complexity score
 */
function calculateComplexity(body: string, operations: SQLOperation[]): number {
  let score = 0;

  // Base score for operations
  score += operations.length * 5;

  // Control flow
  const ifCount = (body.match(/\bIF\b/gi) || []).length;
  const whileCount = (body.match(/\bWHILE\b/gi) || []).length;
  const cursorCount = (body.match(/\bCURSOR\b/gi) || []).length;
  const tryCount = (body.match(/\bTRY\b/gi) || []).length;

  score += ifCount * 3;
  score += whileCount * 5;
  score += cursorCount * 10;
  score += tryCount * 4;

  // Temp tables
  const tempTableCount = (body.match(/#/g) || []).length;
  score += tempTableCount * 3;

  // Dynamic SQL
  if (body.includes('sp_executesql') || body.includes('EXEC(@')) {
    score += 15;
  }

  // Body length factor
  score += Math.floor(body.length / 500);

  return score;
}

/**
 * Analyze FK dependencies between tables
 */
export function analyzeFKDependencies(
  tables: TableDef[]
): {
  missingTables: string[];
  dependencyGraph: Map<string, string[]>;
  resolutionOrder: string[];
} {
  const tableNames = new Set(tables.map((t) => t.tableName.toLowerCase()));
  const missingTables: string[] = [];
  const dependencyGraph = new Map<string, string[]>();

  // Build dependency graph
  for (const table of tables) {
    const deps: string[] = [];
    for (const fk of table.foreignKeys) {
      const refTableLower = fk.referencesTable.toLowerCase();
      deps.push(refTableLower);

      if (!tableNames.has(refTableLower)) {
        if (!missingTables.includes(fk.referencesTable)) {
          missingTables.push(fk.referencesTable);
        }
      }
    }
    dependencyGraph.set(table.tableName.toLowerCase(), deps);
  }

  // Topological sort for resolution order
  const visited = new Set<string>();
  const resolutionOrder: string[] = [];

  function visit(tableName: string) {
    if (visited.has(tableName)) return;
    visited.add(tableName);

    const deps = dependencyGraph.get(tableName) || [];
    for (const dep of deps) {
      if (tableNames.has(dep)) {
        visit(dep);
      }
    }

    resolutionOrder.push(tableName);
  }

  for (const table of tables) {
    visit(table.tableName.toLowerCase());
  }

  return { missingTables, dependencyGraph, resolutionOrder };
}

/**
 * Quick parse for just table names (lightweight)
 */
export function quickParseTableNames(sql: string): string[] {
  const tableNames: string[] = [];
  const createTableRegex =
    /CREATE\s+TABLE\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s*\(/gi;

  let match: RegExpExecArray | null;
  while ((match = createTableRegex.exec(sql)) !== null) {
    tableNames.push(match[2]);
  }

  return tableNames;
}

/**
 * SQLParser class for object-oriented usage
 */
export class SQLParser {
  parse(sql: string): ParseResult {
    return parseSqlServer(sql);
  }

  quickParseTableNames(sql: string): string[] {
    return quickParseTableNames(sql);
  }

  analyzeFKDependencies(tables: TableDef[]) {
    return analyzeFKDependencies(tables);
  }
}
