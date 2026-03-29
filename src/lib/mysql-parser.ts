// =============================================================================
// Schema Toolkit - MySQL Parser
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
 * Parse MySQL DDL script
 */
export function parseMySQL(sql: string): ParseResult {
  const startTime = Date.now();
  const tables: TableDef[] = [];
  const storedProcedures: StoredProcedureDef[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Clean up the SQL - remove comments
  let cleaned = sql;

  // Remove single-line comments
  cleaned = cleaned.replace(/--.*$/gm, '');
  
  // Remove multi-line comments (but keep MySQL directives like /*!...*/)
  cleaned = cleaned.replace(/\/\*(?!\!)[\s\S]*?\*\//g, '');
  
  // Remove MySQL version-specific comments content but keep the code
  cleaned = cleaned.replace(/\/\*!\d+\s*/gi, '');
  cleaned = cleaned.replace(/\*\//gi, '');

  // Parse CREATE TABLE statements
  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`?(\w+)`?\.)?`?(\w+)`?\s*\(([\s\S]*?)\)(?:\s*ENGINE\s*=?\s*[\w]+)?(?:\s*DEFAULT\s+CHARSET\s*=?\s*[\w]+)?(?:\s*COLLATE\s*=?\s*[\w]+)?(?:\s*AUTO_INCREMENT\s*=?\s*\d+)?\s*;?/gi;

  let match: RegExpExecArray | null;

  while ((match = createTableRegex.exec(cleaned)) !== null) {
    try {
      const schemaName = match[1] || 'public';
      const tableName = match[2];
      const body = match[3];

      const { columns, foreignKeys, indexes, checkConstraints, primaryKeys } =
        parseMySQLTableBody(body, tableName);

      // Mark primary key columns
      primaryKeys.forEach((pk) => {
        const col = columns.find(
          (c) => c.name.toLowerCase() === pk.toLowerCase()
        );
        if (col) col.isPrimaryKey = true;
      });

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
    /ALTER\s+TABLE\s+`?(\w+)`?\s+ADD\s+(?:CONSTRAINT\s+`?(\w+)`?\s+)?FOREIGN\s+KEY\s*\(\s*`?(\w+)`?\s*\)\s*REFERENCES\s+(?:`?(\w+)`?\.)?`?(\w+)`?\s*\(\s*`?(\w+)`?\s*\)(?:\s*ON\s+DELETE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION))?(?:\s*ON\s+UPDATE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION))?/gi;

  while ((match = alterFkRegex.exec(cleaned)) !== null) {
    const tableName = match[1];
    const constraintName = match[2];
    const columnName = match[3];
    const refSchema = match[4];
    const refTable = match[5];
    const refColumn = match[6];
    const onDelete = match[7] as ForeignKeyDef['onDelete'];
    const onUpdate = match[8] as ForeignKeyDef['onUpdate'];

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
    /CREATE\s+(UNIQUE\s+)?(?:FULLTEXT\s+|SPATIAL\s+)?INDEX\s+`?(\w+)`?\s+ON\s+(?:`?(\w+)`?\.)?`?(\w+)`?\s*\(([^)]+)\)/gi;

  while ((match = createIndexRegex.exec(cleaned)) !== null) {
    const isUnique = !!match[1];
    const indexName = match[2];
    const tableName = match[4];
    const columnsStr = match[5];

    const table = tables.find(
      (t) => t.tableName.toLowerCase() === tableName.toLowerCase()
    );

    if (table) {
      const columns = columnsStr
        .split(',')
        .map((c) => c.replace(/[`\s]/g, '').split(' ')[0])
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
    /CREATE\s+(?:DEFINER\s*=\s*`?[\w]+`?@`?[\w]+`?\s+)?PROCEDURE\s+`?(\w+)`?\s*\(([\s\S]*?)\)\s*(?:BEGIN|([\s\S]*?)\s+BEGIN)\s*([\s\S]*?)(?:END\s*;?|$)/gi;

  while ((match = createProcRegex.exec(cleaned)) !== null) {
    try {
      const procName = match[1];
      const paramsStr = match[2];
      const body = match[4] || match[3];

      const parameters = parseMySQLProcedureParameters(paramsStr);
      const operations = extractMySQLOperations(body);
      const tablesAccessed = extractTablesFromOperations(operations, 'read');
      const tablesModified = extractTablesFromOperations(operations, 'write');

      storedProcedures.push({
        schemaName: 'public',
        procedureName: procName,
        parameters,
        body: body?.trim() || '',
        operations,
        tablesAccessed,
        tablesModified,
        complexity: calculateComplexity(body || '', operations),
      });
    } catch (e) {
      const error = e as Error;
      warnings.push(`Error parsing procedure: ${error.message}`);
    }
  }

  // Parse CREATE FUNCTION statements
  const createFuncRegex =
    /CREATE\s+(?:DEFINER\s*=\s*`?[\w]+`?@`?[\w]+`?\s+)?FUNCTION\s+`?(\w+)`?\s*\(([\s\S]*?)\)\s*RETURNS\s+(\w+(?:\s*\([^)]*\))?)\s*(?:DETERMINISTIC|NOT\s+DETERMINISTIC)?\s*(?:BEGIN|([\s\S]*?)\s+BEGIN)\s*([\s\S]*?)(?:END\s*;?|$)/gi;

  while ((match = createFuncRegex.exec(cleaned)) !== null) {
    try {
      const funcName = match[1];
      const paramsStr = match[2];
      const returnType = match[3];
      const body = match[5] || match[4];

      const parameters = parseMySQLProcedureParameters(paramsStr);

      storedProcedures.push({
        schemaName: 'public',
        procedureName: funcName,
        parameters,
        returnType,
        body: body?.trim() || '',
        operations: [],
        tablesAccessed: [],
        tablesModified: [],
        complexity: 0,
      });
    } catch (e) {
      const error = e as Error;
      warnings.push(`Error parsing function: ${error.message}`);
    }
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
 * Parse MySQL table body definition
 */
function parseMySQLTableBody(
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

  // Split on commas that are NOT inside parentheses
  const parts = splitTopLevel(body);

  for (const raw of parts) {
    const part = raw.trim();
    if (!part) continue;

    const upper = part.toUpperCase();

    // PRIMARY KEY constraint (table-level)
    if (upper.includes('PRIMARY KEY') && !upper.startsWith('PRIMARY')) {
      // Inline primary key on column - handled in column parsing
      const colMatch = part.match(/`?(\w+)`?\s+[\w]+(?:\([^)]*\))?.*PRIMARY\s+KEY/i);
      if (colMatch) {
        primaryKeys.push(colMatch[1]);
      }
    } else if (upper.startsWith('PRIMARY KEY')) {
      const pkMatch = part.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (pkMatch) {
        pkMatch[1].split(',').forEach((c) => {
          primaryKeys.push(c.replace(/[`\s]/g, ''));
        });
      }
      continue;
    }

    // FOREIGN KEY constraint (table-level)
    if (upper.includes('FOREIGN KEY')) {
      const fkMatch = part.match(
        /(?:CONSTRAINT\s+`?(\w+)`?\s+)?FOREIGN\s+KEY\s*\(\s*`?(\w+)`?\s*\)\s*REFERENCES\s+(?:`?(\w+)`?\.)?`?(\w+)`?\s*\(\s*`?(\w+)`?\s*\)(?:\s*ON\s+DELETE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION))?(?:\s*ON\s+UPDATE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION))?/i
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

    // INDEX/KEY constraint (table-level)
    if (upper.startsWith('KEY') || upper.startsWith('INDEX') || upper.startsWith('UNIQUE') || upper.startsWith('FULLTEXT')) {
      const indexMatch = part.match(
        /(?:UNIQUE\s+|FULLTEXT\s+|SPATIAL\s+)?(?:KEY|INDEX)\s+`?(\w+)`?\s*\(([^)]+)\)/i
      );
      if (indexMatch) {
        const idxCols = indexMatch[2]
          .split(',')
          .map((c) => c.replace(/[`\s]/g, '').split(' ')[0])
          .filter(Boolean);
        
        indexes.push({
          name: indexMatch[1],
          columns: idxCols,
          isUnique: upper.startsWith('UNIQUE'),
        });
      }
      continue;
    }

    // CHECK constraint
    if (upper.includes('CHECK')) {
      const checkMatch = part.match(
        /(?:CONSTRAINT\s+`?(\w+)`?\s+)?CHECK\s*\(([^)]+)\)/i
      );
      if (checkMatch) {
        checkConstraints.push({
          name: checkMatch[1],
          expression: checkMatch[2],
        });
      }
      continue;
    }

    // Skip other constraints
    if (
      upper.startsWith('CONSTRAINT') ||
      upper.startsWith('CHECK') ||
      upper.startsWith('UNIQUE') ||
      upper.startsWith('PRIMARY') ||
      upper.startsWith('FOREIGN')
    ) {
      continue;
    }

    // Column definition
    const col = parseMySQLColumn(part);
    if (col) {
      columns.push(col);
    }
  }

  return { columns, foreignKeys, indexes, checkConstraints, primaryKeys };
}

/**
 * Parse individual MySQL column definition
 */
function parseMySQLColumn(part: string): ColumnDef | null {
  // Pattern: `ColumnName` DATATYPE(size) [UNSIGNED] [ZEROFILL] [NOT NULL | NULL] [DEFAULT ...] [AUTO_INCREMENT] [COMMENT '...']
  const colRegex = /^`?(\w+)`?\s+(\w+)(?:\s*\(([^)]*)\))?(.*)$/i;

  const m = part.match(colRegex);
  if (!m) return null;

  const name = m[1];
  const dataType = m[2].toUpperCase();
  const maxLength = m[3] || undefined;
  const rest = m[4]?.toUpperCase() || '';

  // Skip MySQL keywords
  const reserved = [
    'CONSTRAINT',
    'PRIMARY',
    'FOREIGN',
    'CHECK',
    'UNIQUE',
    'INDEX',
    'KEY',
    'ENGINE',
    'DEFAULT',
    'CHARSET',
    'COLLATE',
    'AUTO_INCREMENT',
  ];
  if (reserved.includes(name.toUpperCase())) return null;

  const isNullable = !rest.includes('NOT NULL');
  const isPrimaryKey = rest.includes('PRIMARY KEY');
  const isIdentity = rest.includes('AUTO_INCREMENT');

  // Handle UNSIGNED and ZEROFILL
  const unsigned = rest.includes('UNSIGNED');
  const zerofill = rest.includes('ZEROFILL');

  let defaultValue: string | undefined;
  const defMatch = part.match(/DEFAULT\s+(?:'([^']*)'|"([^"]*)"|(\S+))/i);
  if (defMatch) {
    defaultValue = defMatch[1] || defMatch[2] || defMatch[3];
  }

  // Extract comment
  let comment: string | undefined;
  const commentMatch = part.match(/COMMENT\s+'([^']*)'/i);
  if (commentMatch) {
    comment = commentMatch[1];
  }

  return {
    name,
    dataType: unsigned ? `${dataType} UNSIGNED` : dataType,
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
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];

    if ((ch === "'" || ch === '"') && !inString) {
      inString = true;
      stringChar = ch;
    } else if (ch === stringChar && inString) {
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
 * Parse MySQL procedure parameters
 */
function parseMySQLProcedureParameters(paramsStr: string): ProcedureParameter[] {
  const parameters: ProcedureParameter[] = [];

  if (!paramsStr.trim()) return parameters;

  // MySQL params: IN/OUT/INOUT param_name TYPE
  const paramRegex = /(IN|OUT|INOUT)?\s*`?(\w+)`?\s+(\w+(?:\s*\([^)]*\))?)/gi;

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
 * Extract SQL operations from MySQL procedure body
 */
function extractMySQLOperations(body: string): SQLOperation[] {
  const operations: SQLOperation[] = [];

  // SELECT operations
  const selectRegex = /SELECT\s+[\s\S]*?\s+FROM\s+`?(\w+)`?/gi;
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
  const insertRegex = /INSERT\s+(?:INTO\s+)?`?(\w+)`?/gi;
  while ((match = insertRegex.exec(body)) !== null) {
    operations.push({ type: 'INSERT', tables: [match[1]] });
  }

  // UPDATE operations
  const updateRegex = /UPDATE\s+`?(\w+)`?/gi;
  while ((match = updateRegex.exec(body)) !== null) {
    operations.push({ type: 'UPDATE', tables: [match[1]] });
  }

  // DELETE operations
  const deleteRegex = /DELETE\s+FROM\s+`?(\w+)`?/gi;
  while ((match = deleteRegex.exec(body)) !== null) {
    operations.push({ type: 'DELETE', tables: [match[1]] });
  }

  // CALL operations
  const callRegex = /CALL\s+`?(\w+)`?/gi;
  while ((match = callRegex.exec(body)) !== null) {
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
  const repeatCount = (body.match(/\bREPEAT\b/gi) || []).length;
  const caseCount = (body.match(/\bCASE\b/gi) || []).length;

  score += ifCount * 3;
  score += whileCount * 5;
  score += loopCount * 5;
  score += repeatCount * 4;
  score += caseCount * 3;

  // Cursor usage
  const cursorCount = (body.match(/\bCURSOR\b/gi) || []).length;
  score += cursorCount * 10;

  // Dynamic SQL
  if (body.includes('PREPARE') || body.includes('EXECUTE')) {
    score += 15;
  }

  // Body length factor
  score += Math.floor(body.length / 500);

  return score;
}

/**
 * Quick parse for just table names (lightweight)
 */
export function quickParseMySQLTableNames(sql: string): string[] {
  const tableNames: string[] = [];
  const createTableRegex =
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`?(\w+)`?\.)?`?(\w+)`?/gi;

  let match: RegExpExecArray | null;
  while ((match = createTableRegex.exec(sql)) !== null) {
    tableNames.push(match[2]);
  }

  return tableNames;
}
