// =============================================================================
// Schema Toolkit - MySQL Parser
// =============================================================================
// Comprehensive MySQL/MariaDB DDL parser with support for:
// - CREATE TABLE with all MySQL-specific features
// - ALTER TABLE statements
// - CREATE INDEX statements
// - Stored procedures and functions
// - INSERT statements for seed data
// - Triggers
// - Views
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
} from '../types';

/**
 * MySQL-specific column attributes
 */
export interface MySQLColumnAttributes {
  unsigned?: boolean;
  zerofill?: boolean;
  characterSet?: string;
  collation?: string;
  comment?: string;
  autoIncrement?: boolean;
  onUpdateCurrentTimestamp?: boolean;
  generated?: {
    type: 'VIRTUAL' | 'STORED';
    expression: string;
  };
}

/**
 * MySQL-specific table options
 */
export interface MySQLTableOptions {
  engine?: string;
  autoIncrement?: number;
  charset?: string;
  collation?: string;
  rowFormat?: string;
  comment?: string;
}

/**
 * MySQL Parser result with extended information
 */
export interface MySQLParseResult extends ParseResult {
  mysqlVersion?: string;
  tableOptions?: Map<string, MySQLTableOptions>;
  triggers?: MySQLTriggerDef[];
  views?: MySQLViewDef[];
}

/**
 * MySQL Trigger definition
 */
export interface MySQLTriggerDef {
  triggerName: string;
  tableName: string;
  timing: 'BEFORE' | 'AFTER';
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  body: string;
  order?: { precedes?: string; follows?: string };
}

/**
 * MySQL View definition
 */
export interface MySQLViewDef {
  viewName: string;
  schemaName: string;
  selectStatement: string;
  checkOption?: 'CASCADED' | 'LOCAL';
  security?: 'DEFINER' | 'INVOKER';
}

/**
 * MySQL Parser options
 */
export interface MySQLOptions {
  strictMode?: boolean;
  parseTriggers?: boolean;
  parseViews?: boolean;
  detectVersion?: boolean;
}

/**
 * Parse MySQL DDL script
 */
export function parseMySQL(
  sql: string,
  options: MySQLOptions = {}
): MySQLParseResult {
  const startTime = Date.now();
  const tables: TableDef[] = [];
  const storedProcedures: StoredProcedureDef[] = [];
  const insertStatements: InsertStatementDef[] = [];
  const triggers: MySQLTriggerDef[] = [];
  const views: MySQLViewDef[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const tableOptions = new Map<string, MySQLTableOptions>();

  // Clean up the SQL - remove comments
  let cleaned = preprocessSQL(sql);

  // Detect MySQL version if requested
  let mysqlVersion: string | undefined;
  if (options.detectVersion) {
    mysqlVersion = detectMySQLVersion(cleaned);
  }

  // Parse CREATE TABLE statements
  parseCreateTables(cleaned, tables, tableOptions, errors, warnings);

  // Parse ALTER TABLE statements
  parseAlterTables(cleaned, tables, errors, warnings);

  // Parse CREATE INDEX statements
  parseCreateIndexes(cleaned, tables, warnings);

  // Parse stored procedures and functions
  parseStoredProcedures(cleaned, storedProcedures, errors, warnings);

  // Parse INSERT statements
  const seedDataSummaries = parseInserts(cleaned, insertStatements, errors);

  // Parse triggers if requested
  if (options.parseTriggers !== false) {
    parseTriggers(cleaned, triggers, errors, warnings);
  }

  // Parse views if requested
  if (options.parseViews !== false) {
    parseViews(cleaned, views, errors, warnings);
  }

  // Calculate stats
  const stats: ParseStats = {
    totalTables: tables.length,
    totalColumns: tables.reduce((a, t) => a + t.columns.length, 0),
    totalForeignKeys: tables.reduce((a, t) => a + t.foreignKeys.length, 0),
    totalStoredProcedures: storedProcedures.length,
    totalInsertStatements: insertStatements.length,
    totalSeedDataRows: insertStatements.length,
    lookupTablesDetected: seedDataSummaries.filter((s) => s.isLookupTable).length,
    parseTimeMs: Date.now() - startTime,
  };

  return {
    tables,
    storedProcedures,
    insertStatements,
    seedDataSummaries,
    errors,
    warnings,
    stats,
    mysqlVersion,
    tableOptions,
    triggers,
    views,
  };
}

/**
 * Preprocess SQL - remove comments and normalize
 */
function preprocessSQL(sql: string): string {
  let cleaned = sql;

  // Remove single-line comments (-- and #)
  cleaned = cleaned.replace(/--[^\n]*/g, '');
  cleaned = cleaned.replace(/#[^\n]*/g, '');

  // Remove multi-line comments
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');

  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ');

  return cleaned;
}

/**
 * Detect MySQL version from SQL hints
 */
function detectMySQLVersion(sql: string): string | undefined {
  const versionMatch = sql.match(/\/\*!\d{5}\s*|\*\//);
  if (versionMatch) {
    const versionNum = versionMatch[0].match(/\d{5}/)?.[0];
    if (versionNum) {
      const major = versionNum.substring(0, 2);
      const minor = versionNum.substring(2, 4);
      const patch = versionNum.substring(4);
      return `${parseInt(major)}.${parseInt(minor)}.${parseInt(patch)}`;
    }
  }

  // Check for version-specific syntax
  if (sql.includes('JSON_TABLE')) return '8.0.0+';
  if (sql.includes('CHECK CONSTRAINT')) return '8.0.16+';
  if (sql.includes('GENERATED ALWAYS AS')) return '5.7.0+';

  return undefined;
}

/**
 * Parse CREATE TABLE statements
 */
function parseCreateTables(
  sql: string,
  tables: TableDef[],
  tableOptions: Map<string, MySQLTableOptions>,
  errors: string[],
  warnings: string[]
): void {
  // Match CREATE TABLE with optional IF NOT EXISTS
  const createTableRegex =
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`?(\w+)`?\.)?`?(\w+)`?\s*\(([\s\S]*?)\)([\s\S]*?)(?=CREATE\s+(?:TABLE|VIEW|PROCEDURE|FUNCTION|TRIGGER|INDEX)|ALTER\s+|DROP\s+|DELIMITER\s+|INSERT\s+INTO|$)/gi;

  let match: RegExpExecArray | null;
  while ((match = createTableRegex.exec(sql)) !== null) {
    try {
      const schemaName = match[1] || 'public';
      const tableName = match[2];
      const body = match[3];
      const optionsStr = match[4];

      const { columns, foreignKeys, indexes, checkConstraints, primaryKeys } =
        parseTableBody(body, tableName);

      // Mark primary key columns
      primaryKeys.forEach((pk) => {
        const col = columns.find(
          (c) => c.name.toLowerCase() === pk.toLowerCase()
        );
        if (col) col.isPrimaryKey = true;
      });

      // Parse table options
      const options = parseTableOptions(optionsStr);
      tableOptions.set(tableName, options);

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
}

/**
 * Parse table body (columns and constraints)
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

  // Split body by top-level commas
  const parts = splitTopLevel(body);

  for (const raw of parts) {
    const part = raw.trim();
    if (!part) continue;

    const upper = part.toUpperCase();

    // PRIMARY KEY constraint
    if (upper.includes('PRIMARY KEY')) {
      const pkMatch = part.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (pkMatch) {
        pkMatch[1].split(',').forEach((c) => {
          primaryKeys.push(c.replace(/[`\s]/g, '').trim());
        });
      }
      continue;
    }

    // FOREIGN KEY constraint
    if (upper.includes('FOREIGN KEY') || upper.includes('REFERENCES')) {
      // Inline foreign key: col_name INT REFERENCES other_table(col)
      const inlineFkMatch = part.match(
        /`?(\w+)`?\s+[\w\(\),\s]+\s+REFERENCES\s+`?(\w+)`?\s*\(\s*`?(\w+)`?\s*\)/i
      );

      // Named foreign key: CONSTRAINT name FOREIGN KEY (col) REFERENCES ...
      const namedFkMatch = part.match(
        /(?:CONSTRAINT\s+`?(\w+)`?\s+)?FOREIGN\s+KEY\s*\(\s*`?(\w+)`?\s*\)\s*REFERENCES\s+`?(\w+)`?\s*\(\s*`?(\w+)`?\s*\)/i
      );

      if (namedFkMatch) {
        const onDeleteMatch = part.match(/ON\s+DELETE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION)/i);
        const onUpdateMatch = part.match(/ON\s+UPDATE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION)/i);

        foreignKeys.push({
          constraintName: namedFkMatch[1],
          columnName: namedFkMatch[2],
          referencesTable: namedFkMatch[3],
          referencesColumn: namedFkMatch[4],
          onDelete: onDeleteMatch?.[1]?.toUpperCase().replace(' ', '_') as ForeignKeyDef['onDelete'],
          onUpdate: onUpdateMatch?.[1]?.toUpperCase().replace(' ', '_') as ForeignKeyDef['onUpdate'],
        });
      } else if (inlineFkMatch) {
        foreignKeys.push({
          columnName: inlineFkMatch[1],
          referencesTable: inlineFkMatch[2],
          referencesColumn: inlineFkMatch[3],
        });
      }
      continue;
    }

    // CHECK constraint
    if (upper.includes('CHECK')) {
      const checkMatch = part.match(
        /(?:CONSTRAINT\s+`?(\w+)`?\s+)?CHECK\s*\(([\s\S]+)\)/i
      );
      if (checkMatch) {
        checkConstraints.push({
          name: checkMatch[1],
          expression: checkMatch[2],
        });
      }
      continue;
    }

    // UNIQUE constraint (table-level)
    if (upper.startsWith('UNIQUE') || (upper.startsWith('CONSTRAINT') && upper.includes('UNIQUE'))) {
      const uniqueMatch = part.match(/UNIQUE\s+(?:KEY\s+)?`?(\w+)`?\s*\(([^)]+)\)/i);
      if (uniqueMatch) {
        indexes.push({
          name: uniqueMatch[1],
          columns: uniqueMatch[2].split(',').map((c) => c.replace(/[`\s]/g, '').trim()),
          isUnique: true,
        });
      }
      continue;
    }

    // KEY/INDEX (MySQL syntax)
    if (upper.startsWith('KEY') || upper.startsWith('INDEX')) {
      const indexMatch = part.match(/(?:KEY|INDEX)\s+`?(\w+)`?\s*\(([^)]+)\)/i);
      if (indexMatch) {
        indexes.push({
          name: indexMatch[1],
          columns: indexMatch[2].split(',').map((c) => c.replace(/[`\s]/g, '').trim()),
          isUnique: false,
        });
      }
      continue;
    }

    // FULLTEXT index
    if (upper.startsWith('FULLTEXT')) {
      const fulltextMatch = part.match(/FULLTEXT\s+(?:KEY|INDEX)\s+`?(\w+)`?\s*\(([^)]+)\)/i);
      if (fulltextMatch) {
        indexes.push({
          name: fulltextMatch[1],
          columns: fulltextMatch[2].split(',').map((c) => c.replace(/[`\s]/g, '').trim()),
          isUnique: false,
        });
      }
      continue;
    }

    // Skip other constraint types
    if (
      upper.startsWith('CONSTRAINT') ||
      upper.startsWith('CHECK') ||
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
  // Pattern: `column_name` DATA_TYPE(size) [UNSIGNED] [ZEROFILL] [CHARACTER SET charset] 
  //          [COLLATE collation] [NULL | NOT NULL] [DEFAULT value] [AUTO_INCREMENT] 
  //          [UNIQUE] [PRIMARY KEY] [COMMENT 'text'] [ON UPDATE CURRENT_TIMESTAMP]
  const colRegex =
    /^`?(\w+)`?\s+`?([\w]+)`?(?:\s*\(([^)]*)\))?\s*(.*)$/i;

  const m = part.match(colRegex);
  if (!m) return null;

  const name = m[1];
  const dataType = m[2].toUpperCase();
  const lengthSpec = m[3];
  const rest = m[4]?.toUpperCase() || '';

  // Skip SQL keywords that look like column names
  const reserved = [
    'CONSTRAINT',
    'PRIMARY',
    'FOREIGN',
    'CHECK',
    'UNIQUE',
    'INDEX',
    'KEY',
    'FULLTEXT',
    'SPATIAL',
  ];
  if (reserved.includes(name.toUpperCase())) return null;

  // Handle length specification
  let maxLength: string | undefined;
  if (lengthSpec) {
    maxLength = lengthSpec.trim();
  }

  // Parse column attributes
  const isNullable = !rest.includes('NOT NULL');
  const isPrimaryKey = rest.includes('PRIMARY KEY');
  const isIdentity = rest.includes('AUTO_INCREMENT');

  // Parse DEFAULT value
  let defaultValue: string | undefined;
  const defMatch = part.match(/DEFAULT\s+('[^']*'|"[^"]*"|NULL|CURRENT_TIMESTAMP|[\w]+)/i);
  if (defMatch) {
    defaultValue = defMatch[1].trim();
  }

  // Parse MySQL-specific attributes
  const mySqlAttrs = parseMySQLColumnAttributes(rest);

  // Handle generated columns
  if (mySqlAttrs.generated) {
    // Generated columns are read-only
    return {
      name,
      dataType,
      maxLength,
      isNullable: true,
      isPrimaryKey: false,
      isIdentity: false,
      defaultValue,
    };
  }

  return {
    name,
    dataType: normalizeMySQLDataType(dataType, mySqlAttrs.unsigned),
    maxLength,
    isNullable,
    isPrimaryKey,
    isIdentity,
    defaultValue,
  };
}

/**
 * Parse MySQL-specific column attributes
 */
function parseMySQLColumnAttributes(rest: string): MySQLColumnAttributes {
  const attrs: MySQLColumnAttributes = {};

  attrs.unsigned = rest.includes('UNSIGNED');
  attrs.zerofill = rest.includes('ZEROFILL');
  attrs.autoIncrement = rest.includes('AUTO_INCREMENT');
  attrs.onUpdateCurrentTimestamp = rest.includes('ON UPDATE CURRENT_TIMESTAMP');

  // CHARACTER SET
  const charsetMatch = rest.match(/CHARACTER\s+SET\s+(\w+)/i);
  if (charsetMatch) {
    attrs.characterSet = charsetMatch[1];
  }

  // COLLATE
  const collateMatch = rest.match(/COLLATE\s+(\w+)/i);
  if (collateMatch) {
    attrs.collation = collateMatch[1];
  }

  // COMMENT
  const commentMatch = rest.match(/COMMENT\s+'([^']*)'/i);
  if (commentMatch) {
    attrs.comment = commentMatch[1];
  }

  // GENERATED ALWAYS AS
  const generatedMatch = rest.match(/GENERATED\s+ALWAYS\s+AS\s*\(([^)]+)\)\s*(VIRTUAL|STORED)/i);
  if (generatedMatch) {
    attrs.generated = {
      type: generatedMatch[2].toUpperCase() as 'VIRTUAL' | 'STORED',
      expression: generatedMatch[1],
    };
  }

  return attrs;
}

/**
 * Normalize MySQL data type to standard form
 */
function normalizeMySQLDataType(dataType: string, unsigned?: boolean): string {
  // Map MySQL types to standard types
  const typeMap: Record<string, string> = {
    TINYINT: 'TINYINT',
    SMALLINT: 'SMALLINT',
    MEDIUMINT: 'MEDIUMINT',
    INT: 'INT',
    INTEGER: 'INT',
    BIGINT: 'BIGINT',
    FLOAT: 'FLOAT',
    DOUBLE: 'DOUBLE',
    DECIMAL: 'DECIMAL',
    NUMERIC: 'DECIMAL',
    BIT: 'BIT',
    CHAR: 'CHAR',
    VARCHAR: 'VARCHAR',
    TINYTEXT: 'TINYTEXT',
    TEXT: 'TEXT',
    MEDIUMTEXT: 'MEDIUMTEXT',
    LONGTEXT: 'LONGTEXT',
    BINARY: 'BINARY',
    VARBINARY: 'VARBINARY',
    TINYBLOB: 'TINYBLOB',
    BLOB: 'BLOB',
    MEDIUMBLOB: 'MEDIUMBLOB',
    LONGBLOB: 'LONGBLOB',
    DATE: 'DATE',
    TIME: 'TIME',
    DATETIME: 'DATETIME',
    TIMESTAMP: 'TIMESTAMP',
    YEAR: 'YEAR',
    JSON: 'JSON',
    ENUM: 'ENUM',
    SET: 'SET',
    GEOMETRY: 'GEOMETRY',
    POINT: 'POINT',
    LINESTRING: 'LINESTRING',
    POLYGON: 'POLYGON',
  };

  let normalized = typeMap[dataType] || dataType;
  if (unsigned && ['TINYINT', 'SMALLINT', 'INT', 'MEDIUMINT', 'BIGINT'].includes(dataType)) {
    normalized += ' UNSIGNED';
  }

  return normalized;
}

/**
 * Parse table options (ENGINE, CHARSET, etc.)
 */
function parseTableOptions(optionsStr: string): MySQLTableOptions {
  const options: MySQLTableOptions = {};

  // ENGINE
  const engineMatch = optionsStr.match(/ENGINE\s*=\s*(\w+)/i);
  if (engineMatch) {
    options.engine = engineMatch[1];
  }

  // AUTO_INCREMENT
  const autoIncMatch = optionsStr.match(/AUTO_INCREMENT\s*=\s*(\d+)/i);
  if (autoIncMatch) {
    options.autoIncrement = parseInt(autoIncMatch[1]);
  }

  // CHARSET / CHARACTER SET
  const charsetMatch = optionsStr.match(/(?:CHARSET|CHARACTER\s+SET)\s*=?\s*(\w+)/i);
  if (charsetMatch) {
    options.charset = charsetMatch[1];
  }

  // COLLATE
  const collateMatch = optionsStr.match(/COLLATE\s*=?\s*(\w+)/i);
  if (collateMatch) {
    options.collation = collateMatch[1];
  }

  // ROW_FORMAT
  const rowFormatMatch = optionsStr.match(/ROW_FORMAT\s*=\s*(\w+)/i);
  if (rowFormatMatch) {
    options.rowFormat = rowFormatMatch[1];
  }

  // COMMENT
  const commentMatch = optionsStr.match(/COMMENT\s*=?\s*'([^']*)'/i);
  if (commentMatch) {
    options.comment = commentMatch[1];
  }

  return options;
}

/**
 * Parse ALTER TABLE statements
 */
function parseAlterTables(
  sql: string,
  tables: TableDef[],
  errors: string[],
  warnings: string[]
): void {
  // ALTER TABLE ... ADD PRIMARY KEY
  const addPkRegex =
    /ALTER\s+TABLE\s+(?:`?(\w+)`?\.)?`?(\w+)`?\s+ADD\s+PRIMARY\s+KEY\s*\(([^)]+)\)/gi;
  let match: RegExpExecArray | null;
  while ((match = addPkRegex.exec(sql)) !== null) {
    const tableName = match[2];
    const table = tables.find(
      (t) => t.tableName.toLowerCase() === tableName.toLowerCase()
    );
    if (table) {
      const pkCols = match[3].split(',').map((c) => c.replace(/[`\s]/g, '').trim());
      pkCols.forEach((pk) => {
        const col = table.columns.find(
          (c) => c.name.toLowerCase() === pk.toLowerCase()
        );
        if (col) col.isPrimaryKey = true;
      });
    }
  }

  // ALTER TABLE ... ADD FOREIGN KEY
  const addFkRegex =
    /ALTER\s+TABLE\s+(?:`?(\w+)`?\.)?`?(\w+)`?\s+ADD\s+(?:CONSTRAINT\s+`?(\w+)`?\s+)?FOREIGN\s+KEY\s*\(\s*`?(\w+)`?\s*\)\s*REFERENCES\s+(?:`?(\w+)`?\.)?`?(\w+)`?\s*\(\s*`?(\w+)`?\s*\)/gi;
  while ((match = addFkRegex.exec(sql)) !== null) {
    const tableName = match[2];
    const constraintName = match[3];
    const columnName = match[4];
    const refTable = match[6];
    const refColumn = match[7];

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

  // ALTER TABLE ... ADD COLUMN
  const addColRegex =
    /ALTER\s+TABLE\s+(?:`?(\w+)`?\.)?`?(\w+)`?\s+ADD\s+(?:COLUMN\s+)?`?(\w+)`?\s+([\w\(\)]+)([^,;]*)/gi;
  while ((match = addColRegex.exec(sql)) !== null) {
    const tableName = match[2];
    const colName = match[3];
    const dataType = match[4];
    const rest = match[5];

    const table = tables.find(
      (t) => t.tableName.toLowerCase() === tableName.toLowerCase()
    );
    if (table) {
      const exists = table.columns.some(
        (c) => c.name.toLowerCase() === colName.toLowerCase()
      );
      if (!exists) {
        table.columns.push({
          name: colName,
          dataType: dataType.toUpperCase(),
          isNullable: !rest.toUpperCase().includes('NOT NULL'),
          isPrimaryKey: false,
          isIdentity: rest.toUpperCase().includes('AUTO_INCREMENT'),
        });
      }
    }
  }

  // ALTER TABLE ... ADD INDEX
  const addIdxRegex =
    /ALTER\s+TABLE\s+(?:`?(\w+)`?\.)?`?(\w+)`?\s+ADD\s+(?:UNIQUE\s+)?(?:INDEX|KEY)\s+`?(\w+)`?\s*\(([^)]+)\)/gi;
  while ((match = addIdxRegex.exec(sql)) !== null) {
    const tableName = match[2];
    const indexName = match[3];
    const columnsStr = match[4];

    const table = tables.find(
      (t) => t.tableName.toLowerCase() === tableName.toLowerCase()
    );
    if (table) {
      if (!table.indexes) table.indexes = [];
      table.indexes.push({
        name: indexName,
        columns: columnsStr.split(',').map((c) => c.replace(/[`\s]/g, '').trim()),
        isUnique: match[0].toUpperCase().includes('UNIQUE'),
      });
    }
  }

  // ALTER TABLE ... MODIFY COLUMN
  const modifyColRegex =
    /ALTER\s+TABLE\s+(?:`?(\w+)`?\.)?`?(\w+)`?\s+MODIFY\s+(?:COLUMN\s+)?`?(\w+)`?\s+([\w\(\)]+)([^,;]*)/gi;
  while ((match = modifyColRegex.exec(sql)) !== null) {
    const tableName = match[2];
    const colName = match[3];
    const dataType = match[4];
    const rest = match[5];

    const table = tables.find(
      (t) => t.tableName.toLowerCase() === tableName.toLowerCase()
    );
    if (table) {
      const col = table.columns.find(
        (c) => c.name.toLowerCase() === colName.toLowerCase()
      );
      if (col) {
        col.dataType = dataType.toUpperCase();
        col.isNullable = !rest.toUpperCase().includes('NOT NULL');
      }
    }
  }
}

/**
 * Parse CREATE INDEX statements
 */
function parseCreateIndexes(
  sql: string,
  tables: TableDef[],
  warnings: string[]
): void {
  const createIndexRegex =
    /CREATE\s+(UNIQUE\s+)?(?:FULLTEXT\s+|SPATIAL\s+)?INDEX\s+`?(\w+)`?\s+ON\s+(?:`?(\w+)`?\.)?`?(\w+)`?\s*\(([^)]+)\)/gi;

  let match: RegExpExecArray | null;
  while ((match = createIndexRegex.exec(sql)) !== null) {
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
        .map((c) => c.replace(/[`\s]/g, '').trim())
        .filter(Boolean);

      if (!table.indexes) table.indexes = [];

      table.indexes.push({
        name: indexName,
        columns,
        isUnique,
      });
    } else {
      warnings.push(`CREATE INDEX: table "${tableName}" not found`);
    }
  }
}

/**
 * Parse stored procedures and functions
 */
function parseStoredProcedures(
  sql: string,
  storedProcedures: StoredProcedureDef[],
  errors: string[],
  warnings: string[]
): void {
  // Handle DELIMITER changes
  let processedSQL = sql;
  const delimiterMatch = sql.match(/DELIMITER\s+([^\s]+)/i);
  const delimiter = delimiterMatch ? delimiterMatch[1] : ';';

  // CREATE PROCEDURE
  const procRegex = new RegExp(
    `CREATE\\s+(?:DEFINER\\s*=\\s*[^\\s]+\\s+)?PROCEDURE\\s+(?:\\\`?(\\w+)\\\`?\\.)?\\\`?(\\w+)\\\`?\\s*\\(([\\s\\S]*?)\\)\\s*([\\s\\S]*?)(?=DELIMITER\\s|CREATE\\s+(?:PROCEDURE|FUNCTION)|$)`,
    'gi'
  );

  let match: RegExpExecArray | null;
  while ((match = procRegex.exec(processedSQL)) !== null) {
    try {
      const schemaName = match[1] || 'public';
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

  // CREATE FUNCTION
  const funcRegex = new RegExp(
    `CREATE\\s+(?:DEFINER\\s*=\\s*[^\\s]+\\s+)?FUNCTION\\s+(?:\\\`?(\\w+)\\\`?\\.)?\\\`?(\\w+)\\\`?\\s*\\(([\\s\\S]*?)\\)\\s*RETURNS\\s+(\\w+(?:\\s*\\([^)]*\\))?)\\s*([\\s\\S]*?)(?=DELIMITER\\s|CREATE\\s+(?:PROCEDURE|FUNCTION)|$)`,
    'gi'
  );

  while ((match = funcRegex.exec(processedSQL)) !== null) {
    try {
      const schemaName = match[1] || 'public';
      const procName = match[2];
      const paramsStr = match[3];
      const returnType = match[4];
      const body = match[5];

      const parameters = parseProcedureParameters(paramsStr);
      const operations = extractSQLOperations(body);

      storedProcedures.push({
        schemaName,
        procedureName: procName,
        parameters,
        returnType,
        body: body.trim(),
        operations,
        complexity: calculateComplexity(body, operations),
      });
    } catch (e) {
      const error = e as Error;
      warnings.push(`Error parsing function: ${error.message}`);
    }
  }
}

/**
 * Parse stored procedure parameters
 */
function parseProcedureParameters(paramsStr: string): ProcedureParameter[] {
  const parameters: ProcedureParameter[] = [];

  if (!paramsStr.trim()) return parameters;

  // Match parameters like IN/OUT/INOUT param_name INT DEFAULT value
  const paramRegex =
    /(?:IN\s+|OUT\s+|INOUT\s+)?`?(\w+)`?\s+([\w]+(?:\s*\([^)]*\))?)\s*(?:DEFAULT\s+([^,]+))?\s*,?/gi;

  let match: RegExpExecArray | null;
  while ((match = paramRegex.exec(paramsStr)) !== null) {
    parameters.push({
      name: match[1],
      dataType: match[2].toUpperCase(),
      defaultValue: match[3]?.trim(),
      isOutput: paramsStr.toUpperCase().includes('OUT ' + match[1].toUpperCase()),
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
  const selectRegex = /SELECT\s+[\s\S]*?\s+FROM\s+`?(\w+)`?/gi;
  let match: RegExpExecArray | null;
  while ((match = selectRegex.exec(body)) !== null) {
    const table = match[1];
    const existing = operations.find(
      (o) => o.type === 'SELECT' && o.tables.includes(table)
    );
    if (!existing) {
      operations.push({ type: 'SELECT', tables: [table] });
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
  const loopCount = (body.match(/\bLOOP\b/gi) || []).length;
  const repeatCount = (body.match(/\bREPEAT\b/gi) || []).length;
  const caseCount = (body.match(/\bCASE\b/gi) || []).length;

  score += ifCount * 3;
  score += whileCount * 5;
  score += loopCount * 5;
  score += repeatCount * 5;
  score += caseCount * 4;

  // Cursors
  const cursorCount = (body.match(/\bCURSOR\b/gi) || []).length;
  score += cursorCount * 10;

  // Handlers
  const handlerCount = (body.match(/\bHANDLER\b/gi) || []).length;
  score += handlerCount * 5;

  // Dynamic SQL
  if (body.includes('PREPARE') || body.includes('EXECUTE')) {
    score += 15;
  }

  // Body length factor
  score += Math.floor(body.length / 500);

  return score;
}

/**
 * Parse INSERT statements
 */
function parseInserts(
  sql: string,
  insertStatements: InsertStatementDef[],
  errors: string[]
): SeedDataSummary[] {
  // Parse INSERT statements
  const insertRegex =
    /INSERT\s+(?:IGNORE\s+)?INTO\s+(?:`?(\w+)`?\.)?`?(\w+)`?\s*(?:\(([^)]+)\)\s*)?VALUES\s*\(([^)]+)\)/gi;

  // Group inserts by table for aggregation
  const insertsByTable = new Map<
    string,
    {
      schemaName: string;
      tableName: string;
      columns: Set<string>;
      count: number;
    }
  >();

  let match: RegExpExecArray | null;
  while ((match = insertRegex.exec(sql)) !== null) {
    try {
      const schemaName = match[1] || 'public';
      const tableName = match[2];
      const columnsStr = match[3];
      const valuesStr = match[4];

      // Parse columns (if specified)
      const columns = columnsStr
        ? columnsStr.split(',').map((c) => c.replace(/[`\s]/g, '').trim())
        : [];

      const tableKey = `${schemaName}.${tableName}`.toLowerCase();

      if (!insertsByTable.has(tableKey)) {
        insertsByTable.set(tableKey, {
          schemaName,
          tableName,
          columns: new Set(),
          count: 0,
        });
      }

      const tableInserts = insertsByTable.get(tableKey)!;
      columns.forEach((c) => tableInserts.columns.add(c));
      tableInserts.count++;

      insertStatements.push({
        schemaName,
        tableName,
        columns,
        valueCount: 1,
        hasExplicitIdentity: false,
        sourceDDL: match[0],
      });
    } catch (e) {
      // Skip malformed INSERT statements silently
    }
  }

  // Generate seed data summaries
  const seedDataSummaries: SeedDataSummary[] = [];
  for (const [key, data] of insertsByTable) {
    const totalRows = data.count;
    const isLookupTable = totalRows <= 1000 && data.columns.size <= 10;
    const estimatedImportTime = Math.ceil(totalRows / 100);

    seedDataSummaries.push({
      schemaName: data.schemaName,
      tableName: data.tableName,
      totalRows,
      columns: Array.from(data.columns),
      isLookupTable,
      hasIdentityInsert: false,
      estimatedImportTime,
    });
  }

  return seedDataSummaries;
}

/**
 * Parse triggers
 */
function parseTriggers(
  sql: string,
  triggers: MySQLTriggerDef[],
  errors: string[],
  warnings: string[]
): void {
  const triggerRegex =
    /CREATE\s+(?:DEFINER\s*=\s*[^\s]+\s+)?TRIGGER\s+(?:`?(\w+)`?\.)?`?(\w+)`?\s+(BEFORE|AFTER)\s+(INSERT|UPDATE|DELETE)\s+ON\s+(?:`?(\w+)`?\.)?`?(\w+)`?\s+FOR\s+EACH\s+ROW\s*([\s\S]*?)(?=CREATE\s+(?:TRIGGER|PROCEDURE|FUNCTION|VIEW)|DELIMITER\s|$)/gi;

  let match: RegExpExecArray | null;
  while ((match = triggerRegex.exec(sql)) !== null) {
    try {
      triggers.push({
        triggerName: match[2],
        tableName: match[6],
        timing: match[3] as 'BEFORE' | 'AFTER',
        event: match[4] as 'INSERT' | 'UPDATE' | 'DELETE',
        body: match[7].trim(),
      });
    } catch (e) {
      const error = e as Error;
      warnings.push(`Error parsing trigger: ${error.message}`);
    }
  }
}

/**
 * Parse views
 */
function parseViews(
  sql: string,
  views: MySQLViewDef[],
  errors: string[],
  warnings: string[]
): void {
  const viewRegex =
    /CREATE\s+(?:OR\s+REPLACE\s+)?(?:ALGORITHM\s*=\s*(\w+)\s+)?(?:DEFINER\s*=\s*[^\s]+\s+)?(?:SQL\s+SECURITY\s+(DEFINER|INVOKER)\s+)?VIEW\s+(?:`?(\w+)`?\.)?`?(\w+)`?\s+AS\s+([\s\S]*?)(?=CREATE\s+(?:VIEW|TABLE|PROCEDURE|FUNCTION|TRIGGER)|ALTER\s+|DROP\s+|DELIMITER\s|$)/gi;

  let match: RegExpExecArray | null;
  while ((match = viewRegex.exec(sql)) !== null) {
    try {
      views.push({
        viewName: match[4],
        schemaName: match[3] || 'public',
        selectStatement: match[5].trim(),
        security: match[2] as 'DEFINER' | 'INVOKER' | undefined,
      });
    } catch (e) {
      const error = e as Error;
      warnings.push(`Error parsing view: ${error.message}`);
    }
  }
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

  for (const ch of str) {
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
 * Analyze FK dependencies between tables
 */
export function analyzeFKDependencies(tables: TableDef[]): {
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
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`?(\w+)`?\.)?`?(\w+)`?\s*\(/gi;

  let match: RegExpExecArray | null;
  while ((match = createTableRegex.exec(sql)) !== null) {
    tableNames.push(match[2]);
  }

  return tableNames;
}

/**
 * Convert MySQL types to common format for cross-database compatibility
 */
export function convertMySQLToCommon(mysqlType: string): string {
  const conversions: Record<string, string> = {
    TINYINT: 'SMALLINT',
    SMALLINT: 'SMALLINT',
    MEDIUMINT: 'INTEGER',
    INT: 'INTEGER',
    INTEGER: 'INTEGER',
    BIGINT: 'BIGINT',
    FLOAT: 'REAL',
    DOUBLE: 'DOUBLE',
    DECIMAL: 'DECIMAL',
    NUMERIC: 'DECIMAL',
    CHAR: 'CHAR',
    VARCHAR: 'VARCHAR',
    TINYTEXT: 'VARCHAR(255)',
    TEXT: 'TEXT',
    MEDIUMTEXT: 'TEXT',
    LONGTEXT: 'TEXT',
    DATE: 'DATE',
    TIME: 'TIME',
    DATETIME: 'TIMESTAMP',
    TIMESTAMP: 'TIMESTAMP',
    YEAR: 'SMALLINT',
    JSON: 'JSON',
    BLOB: 'BLOB',
    LONGBLOB: 'BLOB',
    MEDIUMBLOB: 'BLOB',
    TINYBLOB: 'BLOB',
  };

  const baseType = mysqlType.split('(')[0].split(' ')[0].toUpperCase();
  return conversions[baseType] || baseType;
}

// Export default parser function
export default parseMySQL;
