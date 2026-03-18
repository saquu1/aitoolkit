// =============================================================================
// Schema Toolkit - PostgreSQL Parser
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
} from './types';

/**
 * Parse PostgreSQL DDL script
 */
export function parsePostgreSQL(sql: string): ParseResult {
  const startTime = Date.now();
  const tables: TableDef[] = [];
  const storedProcedures: StoredProcedureDef[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Clean up the SQL - remove comments
  let cleaned = sql;

  // Remove single-line comments
  cleaned = cleaned.replace(/--.*$/gm, '');
  
  // Remove multi-line comments
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');

  // Track sequences for SERIAL columns
  const sequences: Map<string, string> = new Map();

  // Parse CREATE SEQUENCE statements first
  const createSeqRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?SEQUENCE\s+(?:(\w+)\.)?(\w+)/gi;
  let match: RegExpExecArray | null;
  while ((match = createSeqRegex.exec(cleaned)) !== null) {
    const schemaName = match[1] || 'public';
    const seqName = match[2];
    sequences.set(seqName.toLowerCase(), `${schemaName}.${seqName}`);
  }

  // Parse CREATE TABLE statements
  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:(\w+)\.)?(\w+)\s*\(([\s\S]*?)\)\s*;?(?=\s*(?:CREATE|ALTER|DROP|INSERT|$))/gi;

  while ((match = createTableRegex.exec(cleaned)) !== null) {
    try {
      const schemaName = match[1] || 'public';
      const tableName = match[2];
      const body = match[3];

      const { columns, foreignKeys, indexes: parsedIndexes, checkConstraints, primaryKeys, uniqueConstraints } =
        parsePostgreSQLTableBody(body, tableName);

      // Mark primary key columns
      primaryKeys.forEach((pk) => {
        const col = columns.find(
          (c) => c.name.toLowerCase() === pk.toLowerCase()
        );
        if (col) col.isPrimaryKey = true;
      });

      // Add unique constraints as indexes
      const indexes = parsedIndexes ? [...parsedIndexes] : [];
      for (const uc of uniqueConstraints) {
        indexes.push({
          name: uc.name || `uk_${uc.columns.join('_')}`,
          columns: uc.columns,
          isUnique: true,
        });
      }

      tables.push({
        schemaName,
        tableName,
        columns,
        foreignKeys,
        indexes,
        checkConstraints,
        sourceDDL: match[0],
      });
    } catch (e) {
      const error = e as Error;
      errors.push(`Error parsing table: ${match[2]} — ${error.message}`);
    }
  }

  // Parse ALTER TABLE ... ADD FOREIGN KEY statements
  const alterFkRegex =
    /ALTER\s+TABLE\s+(?:(\w+)\.)?(\w+)\s+ADD\s+(?:CONSTRAINT\s+(\w+)\s+)?FOREIGN\s+KEY\s*\(\s*(\w+)\s*\)\s*REFERENCES\s+(?:(\w+)\.)?(\w+)\s*\(\s*(\w+)\s*\)(?:\s+ON\s+DELETE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION))?(?:\s+ON\s+UPDATE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION))?/gi;

  while ((match = alterFkRegex.exec(cleaned)) !== null) {
    const tableName = match[2];
    const constraintName = match[3];
    const columnName = match[4];
    const refSchema = match[5];
    const refTable = match[6];
    const refColumn = match[7];
    const onDelete = match[8] as ForeignKeyDef['onDelete'];
    const onUpdate = match[9] as ForeignKeyDef['onUpdate'];

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
          onDelete: onDelete?.toUpperCase().replace(' ', '_') as ForeignKeyDef['onDelete'],
          onUpdate: onUpdate?.toUpperCase().replace(' ', '_') as ForeignKeyDef['onUpdate'],
        });
      }
    } else {
      warnings.push(`ALTER TABLE FK: table "${tableName}" not found`);
    }
  }

  // Parse CREATE INDEX statements
  const createIndexRegex =
    /CREATE\s+(UNIQUE\s+)?INDEX\s+(?:(\w+)\.)?(\w+)\s+ON\s+(?:(\w+)\.)?(\w+)\s*\(([^)]+)\)/gi;

  while ((match = createIndexRegex.exec(cleaned)) !== null) {
    const isUnique = !!match[1];
    const indexName = match[3];
    const tableName = match[5];
    const columnsStr = match[6];

    const table = tables.find(
      (t) => t.tableName.toLowerCase() === tableName.toLowerCase()
    );

    if (table) {
      const columns = columnsStr
        .split(',')
        .map((c) => c.trim().split(' ')[0].replace(/"/g, ''))
        .filter(Boolean);

      if (!table.indexes) table.indexes = [];

      table.indexes.push({
        name: indexName,
        columns,
        isUnique,
      });
    }
  }

  // Parse CREATE FUNCTION/PROCEDURE statements
  const createFuncRegex =
    /CREATE\s+(?:OR\s+REPLACE\s+)?(?:FUNCTION|PROCEDURE)\s+(?:(\w+)\.)?(\w+)\s*\(([\s\S]*?)\)\s*(?:RETURNS\s+(\w+(?:\s*\([^)]*\))?(?:\s*\[\])?|TABLE\s*\(([^)]+)\)|SETOF\s+\w+))?\s*(?:LANGUAGE\s+(\w+))?\s*(?:AS\s+\$\$([\s\S]*?)\$\$|AS\s+'([^']+)')?/gi;

  while ((match = createFuncRegex.exec(cleaned)) !== null) {
    try {
      const schemaName = match[1] || 'public';
      const funcName = match[2];
      const paramsStr = match[3];
      const returnType = match[4] || match[5];
      const language = match[6] || 'plpgsql';
      const body = match[7] || match[8];

      const parameters = parsePostgreSQLParameters(paramsStr);
      const operations = body ? extractPostgreSQLOperations(body) : [];
      const tablesAccessed = extractTablesFromOperations(operations, 'read');
      const tablesModified = extractTablesFromOperations(operations, 'write');

      storedProcedures.push({
        schemaName,
        procedureName: funcName,
        parameters,
        returnType,
        body: body?.trim() || '',
        operations,
        tablesAccessed,
        tablesModified,
        complexity: body ? calculateComplexity(body, operations) : 0,
      });
    } catch (e) {
      const error = e as Error;
      warnings.push(`Error parsing function: ${error.message}`);
    }
  }

  // Parse CREATE TYPE (ENUM) statements
  const createEnumRegex = /CREATE\s+TYPE\s+(?:(\w+)\.)?(\w+)\s+AS\s+ENUM\s*\(([^)]+)\)/gi;
  const enums: { schema: string; name: string; values: string[] }[] = [];

  while ((match = createEnumRegex.exec(cleaned)) !== null) {
    const schemaName = match[1] || 'public';
    const enumName = match[2];
    const valuesStr = match[3];

    const values = valuesStr
      .split(',')
      .map((v) => v.trim().replace(/'/g, ''))
      .filter(Boolean);

    enums.push({ schema: schemaName, name: enumName, values });
  }

  // Calculate stats
  const stats: ParseStats = {
    totalTables: tables.length,
    totalColumns: tables.reduce((a, t) => a + t.columns.length, 0),
    totalForeignKeys: tables.reduce((a, t) => a + t.foreignKeys.length, 0),
    totalStoredProcedures: storedProcedures.length,
    totalInsertStatements: 0,
    totalSeedDataRows: 0,
    lookupTablesDetected: 0,
    parseTimeMs: Date.now() - startTime,
  };

  return { tables, storedProcedures, insertStatements: [], seedDataSummaries: [], errors, warnings, stats };
}

/**
 * Parse PostgreSQL table body definition
 */
function parsePostgreSQLTableBody(
  body: string,
  _tableName: string
): {
  columns: ColumnDef[];
  foreignKeys: ForeignKeyDef[];
  indexes: IndexDef[];
  checkConstraints: CheckConstraintDef[];
  primaryKeys: string[];
  uniqueConstraints: { name?: string; columns: string[] }[];
} {
  const columns: ColumnDef[] = [];
  const foreignKeys: ForeignKeyDef[] = [];
  const indexes: IndexDef[] = [];
  const checkConstraints: CheckConstraintDef[] = [];
  const primaryKeys: string[] = [];
  const uniqueConstraints: { name?: string; columns: string[] }[] = [];

  // Split on commas that are NOT inside parentheses
  const parts = splitTopLevel(body);

  for (const raw of parts) {
    const part = raw.trim();
    if (!part) continue;

    const upper = part.toUpperCase();

    // PRIMARY KEY constraint (table-level)
    if (upper.startsWith('PRIMARY KEY')) {
      const pkMatch = part.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (pkMatch) {
        pkMatch[1].split(',').forEach((c) => {
          primaryKeys.push(c.trim().replace(/"/g, ''));
        });
      }
      continue;
    }

    // FOREIGN KEY constraint (table-level)
    if (upper.includes('FOREIGN KEY')) {
      const fkMatch = part.match(
        /(?:CONSTRAINT\s+(\w+)\s+)?FOREIGN\s+KEY\s*\(\s*(\w+)\s*\)\s*REFERENCES\s+(?:(\w+)\.)?(\w+)\s*\(\s*(\w+)\s*\)(?:\s+ON\s+DELETE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION))?(?:\s+ON\s+UPDATE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION))?/i
      );
      if (fkMatch) {
        foreignKeys.push({
          constraintName: fkMatch[1],
          columnName: fkMatch[2],
          referencesTable: fkMatch[4],
          referencesColumn: fkMatch[5],
          onDelete: fkMatch[6]?.toUpperCase().replace(' ', '_') as ForeignKeyDef['onDelete'],
          onUpdate: fkMatch[7]?.toUpperCase().replace(' ', '_') as ForeignKeyDef['onUpdate'],
        });
      }
      continue;
    }

    // UNIQUE constraint (table-level)
    if (upper.startsWith('UNIQUE')) {
      const uqMatch = part.match(/(?:CONSTRAINT\s+(\w+)\s+)?UNIQUE\s*\(([^)]+)\)/i);
      if (uqMatch) {
        uniqueConstraints.push({
          name: uqMatch[1],
          columns: uqMatch[2].split(',').map((c) => c.trim().replace(/"/g, '')),
        });
      }
      continue;
    }

    // CHECK constraint
    if (upper.includes('CHECK')) {
      const checkMatch = part.match(
        /(?:CONSTRAINT\s+(\w+)\s+)?CHECK\s*\(([^)]+(?:\([^)]*\)[^)]*)*)\)/i
      );
      if (checkMatch) {
        checkConstraints.push({
          name: checkMatch[1],
          expression: checkMatch[2],
        });
      }
      continue;
    }

    // EXCLUDE constraint (PostgreSQL specific)
    if (upper.startsWith('EXCLUDE')) {
      // Skip for now, complex constraint type
      continue;
    }

    // Skip other constraint types
    if (
      upper.startsWith('CONSTRAINT') ||
      upper.startsWith('PRIMARY') ||
      upper.startsWith('FOREIGN')
    ) {
      continue;
    }

    // Column definition
    const col = parsePostgreSQLColumn(part);
    if (col) {
      columns.push(col);
    }
  }

  return { columns, foreignKeys, indexes, checkConstraints, primaryKeys, uniqueConstraints };
}

/**
 * Parse individual PostgreSQL column definition
 */
function parsePostgreSQLColumn(part: string): ColumnDef | null {
  // Pattern: "ColumnName" DATATYPE(size) [NOT NULL | NULL] [DEFAULT ...] [REFERENCES ...]
  const colRegex = /^"?(\w+)"?\s+(\w+(?:\s*\([^)]*\))?(?:\s*\[\])?)(.*)$/i;

  const m = part.match(colRegex);
  if (!m) return null;

  const name = m[1];
  let dataType = m[2].toUpperCase();
  const rest = m[3]?.toUpperCase() || '';

  // Skip PostgreSQL keywords
  const reserved = [
    'CONSTRAINT',
    'PRIMARY',
    'FOREIGN',
    'CHECK',
    'UNIQUE',
    'EXCLUDE',
    'LIKE',
    'INHERITS',
    'WITH',
    'ON',
  ];
  if (reserved.includes(name.toUpperCase())) return null;

  // Handle SERIAL types (PostgreSQL auto-increment)
  let isIdentity = false;
  if (['SERIAL', 'BIGSERIAL', 'SMALLSERIAL'].includes(dataType)) {
    isIdentity = true;
    // Convert to base type
    if (dataType === 'SERIAL') dataType = 'INTEGER';
    else if (dataType === 'BIGSERIAL') dataType = 'BIGINT';
    else if (dataType === 'SMALLSERIAL') dataType = 'SMALLINT';
  }

  // Handle GENERATED ... AS IDENTITY
  if (rest.includes('GENERATED') && rest.includes('IDENTITY')) {
    isIdentity = true;
  }

  const isNullable = !rest.includes('NOT NULL');
  const isPrimaryKey = rest.includes('PRIMARY KEY');

  // Handle DEFAULT values
  let defaultValue: string | undefined;
  const defMatch = part.match(/DEFAULT\s+('(?:[^'\\]|\\.)*'|\S+)(?:\s+|\s*$|,)/i);
  if (defMatch) {
    defaultValue = defMatch[1].replace(/'/g, '');
  }

  // Handle REFERENCES (inline FK)
  // This is handled separately in the table body parser

  // Handle array types
  const isArray = dataType.endsWith('[]');
  if (isArray) {
    dataType = dataType.replace('[]', '');
  }

  return {
    name,
    dataType: isArray ? `${dataType}[]` : dataType,
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
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];

    if ((ch === "'" || ch === '"') && !inString) {
      inString = true;
      stringChar = ch;
    } else if (ch === stringChar && inString && str[i - 1] !== '\\') {
      inString = false;
    }

    if (!inString) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && depth === 0) {
        results.push(current);
        current = '';
        continue;
      }
    }

    current += ch;
  }

  if (current.trim()) results.push(current);

  return results;
}

/**
 * Parse PostgreSQL function parameters
 */
function parsePostgreSQLParameters(paramsStr: string): ProcedureParameter[] {
  const parameters: ProcedureParameter[] = [];

  if (!paramsStr.trim()) return parameters;

  // PostgreSQL params: param_name TYPE or IN param_name TYPE
  const paramRegex = /(IN|OUT|INOUT|VARIADIC)?\s*(\w+)\s+(\w+(?:\s*\([^)]*\))?(?:\s*\[\])?)/gi;

  let match: RegExpExecArray | null;
  while ((match = paramRegex.exec(paramsStr)) !== null) {
    parameters.push({
      name: match[2],
      dataType: match[3].toUpperCase(),
      isOutput: match[1]?.toUpperCase() === 'OUT' || match[1]?.toUpperCase() === 'INOUT',
    });
  }

  return parameters;
}

/**
 * Extract SQL operations from PostgreSQL function body
 */
function extractPostgreSQLOperations(body: string): SQLOperation[] {
  const operations: SQLOperation[] = [];

  // SELECT operations
  const selectRegex = /SELECT\s+[\s\S]*?\s+FROM\s+(?:(\w+)\.)?(\w+)/gi;
  let match: RegExpExecArray | null;
  while ((match = selectRegex.exec(body)) !== null) {
    const tableName = match[2];
    const existing = operations.find(
      (o) => o.type === 'SELECT' && o.tables.includes(tableName)
    );
    if (!existing) {
      operations.push({ type: 'SELECT', tables: [tableName] });
    }
  }

  // INSERT operations
  const insertRegex = /INSERT\s+INTO\s+(?:(\w+)\.)?(\w+)/gi;
  while ((match = insertRegex.exec(body)) !== null) {
    operations.push({ type: 'INSERT', tables: [match[2]] });
  }

  // UPDATE operations
  const updateRegex = /UPDATE\s+(?:(\w+)\.)?(\w+)/gi;
  while ((match = updateRegex.exec(body)) !== null) {
    operations.push({ type: 'UPDATE', tables: [match[2]] });
  }

  // DELETE operations
  const deleteRegex = /DELETE\s+FROM\s+(?:(\w+)\.)?(\w+)/gi;
  while ((match = deleteRegex.exec(body)) !== null) {
    operations.push({ type: 'DELETE', tables: [match[2]] });
  }

  // PERFORM (PostgreSQL equivalent of EXEC for void functions)
  const performRegex = /PERFORM\s+\w+\s*\(/gi;
  while ((match = performRegex.exec(body)) !== null) {
    operations.push({ type: 'EXECUTE', tables: [] });
  }

  // EXECUTE for dynamic SQL
  const execRegex = /EXECUTE\s+/gi;
  while ((match = execRegex.exec(body)) !== null) {
    operations.push({ type: 'EXECUTE', tables: [] });
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
  const types = type === 'read' ? ['SELECT'] : ['INSERT', 'UPDATE', 'DELETE'];

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
  const loopCount = (body.match(/\bLOOP\b/gi) || []).length;
  const forCount = (body.match(/\bFOR\b/gi) || []).length;
  const caseCount = (body.match(/\bCASE\b/gi) || []).length;

  score += ifCount * 3;
  score += whileCount * 5;
  score += loopCount * 5;
  score += forCount * 4;
  score += caseCount * 3;

  // Cursor usage
  const cursorCount = (body.match(/\bCURSOR\b/gi) || []).length;
  score += cursorCount * 10;

  // Dynamic SQL
  if (body.includes('EXECUTE')) {
    score += 15;
  }

  // Exception handling
  const exceptionCount = (body.match(/\bEXCEPTION\b/gi) || []).length;
  score += exceptionCount * 5;

  // Body length factor
  score += Math.floor(body.length / 500);

  return score;
}

/**
 * Quick parse for just table names (lightweight)
 */
export function quickParsePostgreSQLTableNames(sql: string): string[] {
  const tableNames: string[] = [];
  const createTableRegex =
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:(\w+)\.)?(\w+)/gi;

  let match: RegExpExecArray | null;
  while ((match = createTableRegex.exec(sql)) !== null) {
    tableNames.push(match[2]);
  }

  return tableNames;
}
