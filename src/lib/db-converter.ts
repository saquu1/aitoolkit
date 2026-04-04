// =============================================================================
// DB Script Converter - SQL Server to PostgreSQL/Prisma Migration
// =============================================================================
// Converts SQL Server DDL to PostgreSQL and Prisma schema
// =============================================================================

/**
 * Type Conversion Rule
 */
export interface TypeConversion {
  sqlServer: string;
  postgresql: string;
  prisma: string;
  notes?: string;
}

/**
 * Converted Table
 */
export interface ConvertedTable {
  originalName: string;
  postgresName: string;
  prismaName: string;
  columns: ConvertedColumn[];
  primaryKey: string[];
  indexes: ConvertedIndex[];
  foreignKeys: ConvertedForeignKey[];
  constraints: ConvertedConstraint[];
  warnings: string[];
}

/**
 * Converted Column
 */
export interface ConvertedColumn {
  originalName: string;
  postgresName: string;
  prismaName: string;
  originalType: string;
  postgresType: string;
  prismaType: string;
  isNullable: boolean;
  isIdentity: boolean;
  defaultValue?: string;
  defaultValueConverted?: string;
  maxLength?: string;
  isPrimaryKey: boolean;
  warnings: string[];
}

/**
 * Converted Index
 */
export interface ConvertedIndex {
  name: string;
  columns: string[];
  isUnique: boolean;
  isClustered: boolean;
  postgresDDL: string;
}

/**
 * Converted Foreign Key
 */
export interface ConvertedForeignKey {
  name: string;
  columns: string[];
  referencesTable: string;
  referencesColumns: string[];
  onDelete: string;
  onUpdate: string;
  postgresDDL: string;
}

/**
 * Converted Constraint
 */
export interface ConvertedConstraint {
  name: string;
  type: 'check' | 'unique' | 'default';
  definition: string;
  postgresDDL: string;
}

/**
 * Conversion Result
 */
export interface ConversionResult {
  tables: ConvertedTable[];
  storedProcedures: ConvertedStoredProcedure[];
  views: ConvertedView[];
  typeConversions: TypeConversionLog[];
  warnings: string[];
  stats: {
    tablesProcessed: number;
    columnsConverted: number;
    foreignKeysConverted: number;
    storedProceduresConverted: number;
    viewsConverted: number;
  };
}

/**
 * Converted Stored Procedure
 */
export interface ConvertedStoredProcedure {
  originalName: string;
  parameters: ConvertedParameter[];
  body: string;
  nodeJSOutline: string;
  warnings: string[];
}

/**
 * Converted Parameter
 */
export interface ConvertedParameter {
  name: string;
  originalType: string;
  jsType: string;
  isOutput: boolean;
}

/**
 * Converted View
 */
export interface ConvertedView {
  name: string;
  postgresDDL: string;
  warnings: string[];
}

/**
 * Type Conversion Log
 */
export interface TypeConversionLog {
  original: string;
  converted: string;
  count: number;
}

/**
 * SQL Server to PostgreSQL/Prisma Type Mappings
 */
const TYPE_MAPPINGS: TypeConversion[] = [
  // String types
  { sqlServer: 'NVARCHAR', postgresql: 'VARCHAR', prisma: 'String', notes: 'NVARCHAR(n) → VARCHAR(n), removes Unicode prefix' },
  { sqlServer: 'VARCHAR', postgresql: 'VARCHAR', prisma: 'String' },
  { sqlServer: 'NCHAR', postgresql: 'CHAR', prisma: 'String' },
  { sqlServer: 'CHAR', postgresql: 'CHAR', prisma: 'String' },
  { sqlServer: 'NTEXT', postgresql: 'TEXT', prisma: 'String' },
  { sqlServer: 'TEXT', postgresql: 'TEXT', prisma: 'String' },

  // Numeric types
  { sqlServer: 'INT', postgresql: 'INTEGER', prisma: 'Int' },
  { sqlServer: 'BIGINT', postgresql: 'BIGINT', prisma: 'BigInt' },
  { sqlServer: 'SMALLINT', postgresql: 'SMALLINT', prisma: 'Int' },
  { sqlServer: 'TINYINT', postgresql: 'SMALLINT', prisma: 'Int', notes: 'TINYINT → SMALLINT (PostgreSQL has no TINYINT)' },
  { sqlServer: 'DECIMAL', postgresql: 'NUMERIC', prisma: 'Decimal' },
  { sqlServer: 'NUMERIC', postgresql: 'NUMERIC', prisma: 'Decimal' },
  { sqlServer: 'FLOAT', postgresql: 'DOUBLE PRECISION', prisma: 'Float' },
  { sqlServer: 'REAL', postgresql: 'REAL', prisma: 'Float' },
  { sqlServer: 'MONEY', postgresql: 'NUMERIC(19,4)', prisma: 'Decimal' },
  { sqlServer: 'SMALLMONEY', postgresql: 'NUMERIC(10,4)', prisma: 'Decimal' },

  // Boolean
  { sqlServer: 'BIT', postgresql: 'BOOLEAN', prisma: 'Boolean' },

  // Date/Time
  { sqlServer: 'DATE', postgresql: 'DATE', prisma: 'DateTime' },
  { sqlServer: 'TIME', postgresql: 'TIME', prisma: 'DateTime' },
  { sqlServer: 'DATETIME', postgresql: 'TIMESTAMP', prisma: 'DateTime' },
  { sqlServer: 'DATETIME2', postgresql: 'TIMESTAMP', prisma: 'DateTime' },
  { sqlServer: 'SMALLDATETIME', postgresql: 'TIMESTAMP', prisma: 'DateTime' },
  { sqlServer: 'DATETIMEOFFSET', postgresql: 'TIMESTAMP WITH TIME ZONE', prisma: 'DateTime' },

  // Unique Identifier
  { sqlServer: 'UNIQUEIDENTIFIER', postgresql: 'UUID', prisma: 'String', notes: 'UNIQUEIDENTIFIER → UUID' },

  // Binary
  { sqlServer: 'BINARY', postgresql: 'BYTEA', prisma: 'Bytes' },
  { sqlServer: 'VARBINARY', postgresql: 'BYTEA', prisma: 'Bytes' },
  { sqlServer: 'IMAGE', postgresql: 'BYTEA', prisma: 'Bytes' },

  // XML/JSON
  { sqlServer: 'XML', postgresql: 'XML', prisma: 'String' },
  { sqlServer: 'JSON', postgresql: 'JSONB', prisma: 'Json' },

  // Other
  { sqlServer: 'SQL_VARIANT', postgresql: 'JSONB', prisma: 'Json', notes: 'SQL_VARIANT → JSONB (approximate)' },
  { sqlServer: 'HIERARCHYID', postgresql: 'TEXT', prisma: 'String', notes: 'HIERARCHYID → TEXT (custom handling needed)' },
  { sqlServer: 'GEOMETRY', postgresql: 'GEOMETRY', prisma: 'String', notes: 'Requires PostGIS extension' },
  { sqlServer: 'GEOGRAPHY', postgresql: 'GEOGRAPHY', prisma: 'String', notes: 'Requires PostGIS extension' },
];

/**
 * Function Mappings SQL Server → PostgreSQL
 */
const FUNCTION_MAPPINGS: Record<string, string> = {
  // Date/Time functions
  'GETDATE()': 'NOW()',
  'GETUTCDATE()': 'NOW() AT TIME ZONE \'UTC\'',
  'SYSDATETIME()': 'NOW()',
  'SYSUTCDATETIME()': 'NOW() AT TIME ZONE \'UTC\'',
  'DATEADD(day,': "CURRENT_DATE + INTERVAL '1 day' *",
  'DATEADD(month,': "CURRENT_DATE + INTERVAL '1 month' *",
  'DATEADD(year,': "CURRENT_DATE + INTERVAL '1 year' *",
  'DATEDIFF(day,': "DATE_PART('day',",
  'DATEDIFF(month,': "DATE_PART('month',",
  'DATEDIFF(year,': "DATE_PART('year',",
  'YEAR(': 'EXTRACT(YEAR FROM ',
  'MONTH(': 'EXTRACT(MONTH FROM ',
  'DAY(': 'EXTRACT(DAY FROM ',

  // String functions
  'LEN(': 'LENGTH(',
  'SUBSTRING(': 'SUBSTRING(',
  'CHARINDEX(': 'POSITION(',
  'REPLACE(': 'REPLACE(',
  'STUFF(': 'OVERLAY(',
  'PATINDEX(': 'REGEXP_MATCHES(',
  'QUOTENAME(': 'QUOTE_IDENT(',

  // UUID functions
  'NEWID()': 'GEN_RANDOM_UUID()',
  'NEWSEQUENTIALID()': 'GEN_RANDOM_UUID()',

  // NULL handling
  'ISNULL(': 'COALESCE(',
  'NULLIF(': 'NULLIF(',
  'COALESCE(': 'COALESCE(',

  // Type conversion
  'CAST(': 'CAST(',
  'CONVERT(VARCHAR,': 'CAST(',
  'CONVERT(INT,': 'CAST(',
  'CONVERT(DATE,': 'CAST(',

  // Aggregation
  'COUNT_BIG(': 'COUNT(',

  // Conditional
  'IIF(': 'CASE WHEN ',

  // System functions
  'SCOPE_IDENTITY()': 'LASTVAL()',
  '@@IDENTITY': 'LASTVAL()',
  '@@ROWCOUNT': 'ROW_COUNT()',
};

/**
 * DB Script Converter Engine
 */
export class DBConverter {
  private typeConversionLog: Map<string, { original: string; converted: string; count: number }>;
  private globalWarnings: string[];

  constructor() {
    this.typeConversionLog = new Map();
    this.globalWarnings = [];
  }

  /**
   * Convert SQL Server DDL to PostgreSQL and Prisma
   */
  convert(sqlServerDDL: string): ConversionResult {
    const tables = this.convertTables(sqlServerDDL);
    const storedProcedures = this.convertStoredProcedures(sqlServerDDL);
    const views = this.convertViews(sqlServerDDL);

    const stats = {
      tablesProcessed: tables.length,
      columnsConverted: tables.reduce((sum, t) => sum + t.columns.length, 0),
      foreignKeysConverted: tables.reduce((sum, t) => sum + t.foreignKeys.length, 0),
      storedProceduresConverted: storedProcedures.length,
      viewsConverted: views.length,
    };

    return {
      tables,
      storedProcedures,
      views,
      typeConversions: Array.from(this.typeConversionLog.values()),
      warnings: this.globalWarnings,
      stats,
    };
  }

  /**
   * Convert tables from SQL Server DDL
   */
  private convertTables(ddl: string): ConvertedTable[] {
    const tables: ConvertedTable[] = [];

    // Find CREATE TABLE statements
    const createTableRegex = /CREATE\s+TABLE\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s*\(([\s\S]*?)\)(?:\s*ON\s+[\w]+\s*)?(?=GO|CREATE\s+TABLE|$)/gi;
    let match;

    while ((match = createTableRegex.exec(ddl)) !== null) {
      const schemaName = match[1] || 'dbo';
      const tableName = match[2];
      const body = match[3];

      tables.push(this.parseAndConvertTable(tableName, body, schemaName));
    }

    return tables;
  }

  /**
   * Parse and convert a single table
   */
  private parseAndConvertTable(tableName: string, body: string, schemaName: string): ConvertedTable {
    const warnings: string[] = [];
    const columns: ConvertedColumn[] = [];
    const primaryKey: string[] = [];
    const indexes: ConvertedIndex[] = [];
    const foreignKeys: ConvertedForeignKey[] = [];
    const constraints: ConvertedConstraint[] = [];

    // Parse body
    const parts = this.splitTableBody(body);

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      const upper = trimmed.toUpperCase();

      // PRIMARY KEY constraint
      if (upper.includes('PRIMARY KEY')) {
        const pkMatch = trimmed.match(/PRIMARY\s+KEY\s*(?:CLUSTERED)?\s*\(([^)]+)\)/i);
        if (pkMatch) {
          const pkCols = pkMatch[1].split(',').map(c => c.replace(/[\[\]\s]/g, ''));
          primaryKey.push(...pkCols);
        }
        continue;
      }

      // FOREIGN KEY constraint
      if (upper.includes('FOREIGN KEY')) {
        const fk = this.parseForeignKey(trimmed);
        if (fk) foreignKeys.push(fk);
        continue;
      }

      // UNIQUE constraint
      if (upper.includes('UNIQUE') && !upper.includes('IDENTITY')) {
        const uniqueMatch = trimmed.match(/(?:CONSTRAINT\s+\[?(\w+)\]?\s+)?UNIQUE\s*(?:CLUSTERED|NONCLUSTERED)?\s*\(([^)]+)\)/i);
        if (uniqueMatch) {
          constraints.push({
            name: uniqueMatch[1] || `UQ_${tableName}`,
            type: 'unique',
            definition: uniqueMatch[2],
            postgresDDL: `CONSTRAINT ${uniqueMatch[1] || `UQ_${tableName}`} UNIQUE (${this.convertColumnNames(uniqueMatch[2])})`,
          });
        }
        continue;
      }

      // CHECK constraint
      if (upper.includes('CHECK')) {
        const checkMatch = trimmed.match(/(?:CONSTRAINT\s+\[?(\w+)\]?\s+)?CHECK\s*\(([^)]+)\)/i);
        if (checkMatch) {
          constraints.push({
            name: checkMatch[1] || `CK_${tableName}`,
            type: 'check',
            definition: checkMatch[2],
            postgresDDL: `CONSTRAINT ${checkMatch[1] || `CK_${tableName}`} CHECK (${this.convertExpression(checkMatch[2])})`,
          });
        }
        continue;
      }

      // DEFAULT constraint
      if (upper.includes('DEFAULT') && !upper.includes('CREATE')) {
        const defaultMatch = trimmed.match(/(?:CONSTRAINT\s+\[?(\w+)\]?\s+)?DEFAULT\s+([^\s,]+)/i);
        if (defaultMatch) {
          constraints.push({
            name: defaultMatch[1] || `DF_${tableName}`,
            type: 'default',
            definition: defaultMatch[2],
            postgresDDL: `DEFAULT ${this.convertDefaultValue(defaultMatch[2])}`,
          });
        }
        continue;
      }

      // Column definition
      const col = this.parseColumn(trimmed, tableName);
      if (col) {
        columns.push(col);
        if (col.isPrimaryKey) {
          primaryKey.push(col.originalName);
        }
      }
    }

    // Parse ALTER TABLE statements for additional FKs
    const alterFkRegex = /ALTER\s+TABLE\s+(?:\[?\w+\]?\.)?\[?(\w+)\]?\s+.*?ADD\s+CONSTRAINT\s+\[?(\w+)\]?\s+FOREIGN\s+KEY\s*\(\s*\[?(\w+)\]?\s*\)\s*REFERENCES\s+(?:\[?\w+\]?\.)?\[?(\w+)\]?\s*\(\s*\[?(\w+)\]?\s*\)/gi;
    let alterMatch;
    while ((alterMatch = alterFkRegex.exec(body)) !== null) {
      if (alterMatch[1].toLowerCase() === tableName.toLowerCase()) {
        foreignKeys.push({
          name: alterMatch[2],
          columns: [alterMatch[3]],
          referencesTable: alterMatch[4],
          referencesColumns: [alterMatch[5]],
          onDelete: 'NO ACTION',
          onUpdate: 'NO ACTION',
          postgresDDL: `CONSTRAINT ${alterMatch[2]} FOREIGN KEY (${alterMatch[3]}) REFERENCES ${alterMatch[4]}(${alterMatch[5]})`,
        });
      }
    }

    // Generate PostgreSQL names
    const postgresName = this.toSnakeCase(tableName);
    const prismaName = this.toPascalCase(tableName);

    return {
      originalName: tableName,
      postgresName,
      prismaName,
      columns,
      primaryKey,
      indexes,
      foreignKeys,
      constraints,
      warnings,
    };
  }

  /**
   * Split table body on top-level commas
   */
  private splitTableBody(body: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let current = '';

    for (const ch of body) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && depth === 0) {
        parts.push(current);
        current = '';
      } else {
        current += ch;
      }
    }

    if (current.trim()) parts.push(current);

    return parts;
  }

  /**
   * Parse a column definition
   */
  private parseColumn(part: string, tableName: string): ConvertedColumn | null {
    const warnings: string[] = [];

    // Match column: [Name] [TYPE](size) [IDENTITY] [NULL|NOT NULL] [DEFAULT]
    const colRegex = /^\[?(\w+)\]?\s+\[?(\w+)\]?(?:\s*\(([^)]*)\))?\s*(.*)$/i;
    const match = part.match(colRegex);

    if (!match) return null;

    const originalName = match[1];
    const originalType = match[2].toUpperCase();
    const maxLength = match[3] || undefined;
    const rest = match[4]?.toUpperCase() || '';

    // Skip SQL keywords that look like columns
    const reserved = ['CONSTRAINT', 'PRIMARY', 'FOREIGN', 'UNIQUE', 'CHECK', 'INDEX', 'KEY'];
    if (reserved.includes(originalName.toUpperCase())) return null;

    // Convert type
    const { postgresType, prismaType, warning } = this.convertType(originalType, maxLength);
    if (warning) warnings.push(warning);

    // Check for identity
    const isIdentity = /IDENTITY\s*\(\s*\d+\s*,\s*\d+\s*\)/i.test(rest);

    // Check for primary key
    const isPrimaryKey = /PRIMARY\s+KEY/i.test(rest);

    // Check for nullable
    const isNullable = !rest.includes('NOT NULL');

    // Extract default value
    const defaultMatch = rest.match(/DEFAULT\s+([^\s,]+)/i);
    const defaultValue = defaultMatch ? defaultMatch[1] : undefined;
    const defaultValueConverted = defaultValue ? this.convertDefaultValue(defaultValue) : undefined;

    // Log type conversion
    this.logTypeConversion(originalType, prismaType);

    return {
      originalName,
      postgresName: this.toSnakeCase(originalName),
      prismaName: this.toCamelCase(originalName),
      originalType,
      postgresType,
      prismaType,
      isNullable,
      isIdentity,
      defaultValue,
      defaultValueConverted,
      maxLength,
      isPrimaryKey,
      warnings,
    };
  }

  /**
   * Convert SQL Server type to PostgreSQL/Prisma
   */
  private convertType(sqlServerType: string, maxLength?: string): {
    postgresType: string;
    prismaType: string;
    warning?: string;
  } {
    const baseType = sqlServerType.toUpperCase().split('(')[0];

    const mapping = TYPE_MAPPINGS.find(m => m.sqlServer === baseType);

    if (!mapping) {
      return {
        postgresType: 'TEXT',
        prismaType: 'String',
        warning: `Unknown type ${sqlServerType}, defaulting to TEXT/String`,
      };
    }

    let postgresType = mapping.postgresql;
    let prismaType = mapping.prisma;

    // Handle length for string types
    if (maxLength && ['VARCHAR', 'CHAR', 'NVARCHAR', 'NCHAR'].includes(baseType)) {
      if (maxLength === 'MAX') {
        postgresType = 'TEXT';
      } else {
        postgresType = `${mapping.postgresql}(${maxLength})`;
      }
    }

    // Handle precision for decimal types
    if (maxLength && ['DECIMAL', 'NUMERIC'].includes(baseType)) {
      postgresType = `${mapping.postgresql}(${maxLength})`;
    }

    return { postgresType, prismaType };
  }

  /**
   * Convert default value
   */
  private convertDefaultValue(value: string): string {
    // Handle common SQL Server default values
    const conversions: Record<string, string> = {
      'GETDATE()': 'NOW()',
      'GETUTCDATE()': "NOW() AT TIME ZONE 'UTC'",
      'NEWID()': 'GEN_RANDOM_UUID()',
      'NEWSEQUENTIALID()': 'GEN_RANDOM_UUID()',
      'NULL': 'NULL',
      "'": "'", // Already a string literal
    };

    for (const [sql, pg] of Object.entries(conversions)) {
      if (value.toUpperCase().includes(sql)) {
        return value.replace(new RegExp(sql, 'gi'), pg);
      }
    }

    // Handle ((1)) style defaults for bit
    if (/^\(\((\d+)\)\)$/.test(value)) {
      return value.replace(/^\(\((\d+)\)\)$/, '$1');
    }

    return value;
  }

  /**
   * Parse foreign key definition
   */
  private parseForeignKey(part: string): ConvertedForeignKey | null {
    const fkMatch = part.match(
      /(?:CONSTRAINT\s+\[?(\w+)\]?\s+)?FOREIGN\s+KEY\s*\(\s*\[?(\w+)\]?\s*\)\s*REFERENCES\s+(?:\[?\w+\]?\.)?\[?(\w+)\]?\s*\(\s*\[?(\w+)\]?\s*\)/i
    );

    if (!fkMatch) return null;

    return {
      name: fkMatch[1] || `FK_${fkMatch[2]}_${fkMatch[3]}`,
      columns: [fkMatch[2]],
      referencesTable: fkMatch[3],
      referencesColumns: [fkMatch[4]],
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
      postgresDDL: `CONSTRAINT ${fkMatch[1] || `FK_${fkMatch[2]}_${fkMatch[3]}`} FOREIGN KEY (${fkMatch[2]}) REFERENCES ${fkMatch[3]}(${fkMatch[4]})`,
    };
  }

  /**
   * Convert expression from SQL Server to PostgreSQL
   */
  private convertExpression(expr: string): string {
    let converted = expr;

    for (const [sql, pg] of Object.entries(FUNCTION_MAPPINGS)) {
      converted = converted.replace(new RegExp(sql.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), pg);
    }

    // Convert brackets to double quotes
    converted = converted.replace(/\[([^\]]+)\]/g, '"$1"');

    return converted;
  }

  /**
   * Convert column names
   */
  private convertColumnNames(cols: string): string {
    return cols
      .split(',')
      .map(c => c.replace(/[\[\]]/g, ''))
      .map(c => this.toSnakeCase(c.trim()))
      .join(', ');
  }

  /**
   * Convert stored procedures
   */
  private convertStoredProcedures(ddl: string): ConvertedStoredProcedure[] {
    const procedures: ConvertedStoredProcedure[] = [];

    const procRegex = /CREATE\s+(?:OR\s+ALTER\s+)?PROC(?:EDURE)?\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s*([\s\S]*?)\s+AS\s+([\s\S]*?)(?=GO|CREATE\s+(?:OR\s+ALTER\s+)?PROC|$)/gi;
    let match;

    while ((match = procRegex.exec(ddl)) !== null) {
      const procName = match[2];
      const paramsStr = match[3];
      const body = match[4];

      const parameters = this.parseProcedureParameters(paramsStr);
      const nodeJSOutline = this.generateNodeJSOutline(procName, parameters, body);

      procedures.push({
        originalName: procName,
        parameters,
        body: body.trim(),
        nodeJSOutline,
        warnings: [],
      });
    }

    return procedures;
  }

  /**
   * Parse procedure parameters
   */
  private parseProcedureParameters(paramsStr: string): ConvertedParameter[] {
    const parameters: ConvertedParameter[] = [];

    if (!paramsStr.trim()) return parameters;

    const paramRegex = /@(\w+)\s+([\w]+(?:\s*\([^)]*\))?)\s*(?:=\s*([^,\s]+))?\s*(OUTPUT)?\s*,?/gi;
    let match;

    while ((match = paramRegex.exec(paramsStr)) !== null) {
      const name = match[1];
      const type = match[2].toUpperCase();
      const jsType = this.mapToJSType(type);

      parameters.push({
        name: `@${name}`,
        originalType: type,
        jsType,
        isOutput: !!match[4],
      });
    }

    return parameters;
  }

  /**
   * Map SQL type to JavaScript type
   */
  private mapToJSType(sqlType: string): string {
    const baseType = sqlType.toUpperCase().split('(')[0];

    const typeMap: Record<string, string> = {
      'INT': 'number',
      'BIGINT': 'number',
      'SMALLINT': 'number',
      'TINYINT': 'number',
      'DECIMAL': 'number',
      'NUMERIC': 'number',
      'FLOAT': 'number',
      'REAL': 'number',
      'MONEY': 'number',
      'BIT': 'boolean',
      'VARCHAR': 'string',
      'NVARCHAR': 'string',
      'CHAR': 'string',
      'NCHAR': 'string',
      'TEXT': 'string',
      'NTEXT': 'string',
      'DATE': 'Date',
      'DATETIME': 'Date',
      'DATETIME2': 'Date',
      'SMALLDATETIME': 'Date',
      'UNIQUEIDENTIFIER': 'string',
      'XML': 'string',
    };

    return typeMap[baseType] || 'any';
  }

  /**
   * Generate Node.js function outline from SP
   */
  private generateNodeJSOutline(name: string, parameters: ConvertedParameter[], body: string): string {
    const inputParams = parameters.filter(p => !p.isOutput);
    const outputParams = parameters.filter(p => p.isOutput);

    const paramList = inputParams.map(p => `${p.name.replace('@', '')}: ${p.jsType}`).join(', ');

    let outline = `/**\n * Converted from SQL Server SP: ${name}\n * Auto-generated outline - requires manual implementation\n */\n`;
    outline += `async function ${this.toCamelCase(name)}(${paramList}): Promise<`;

    if (outputParams.length > 0) {
      outline += `{ ${outputParams.map(p => `${p.name.replace('@', '')}: ${p.jsType}`).join(', ')} }`;
    } else {
      outline += 'any';
    }
    outline += '> {\n';

    // Detect operations in body
    if (/SELECT/i.test(body)) {
      outline += '  // TODO: Implement SELECT query\n';
      outline += '  // const result = await prisma.$queryRaw`SELECT ...`\n';
    }
    if (/INSERT/i.test(body)) {
      outline += '  // TODO: Implement INSERT operation\n';
      outline += '  // await prisma.table.create({ data: {...} })\n';
    }
    if (/UPDATE/i.test(body)) {
      outline += '  // TODO: Implement UPDATE operation\n';
      outline += '  // await prisma.table.update({ where: {...}, data: {...} })\n';
    }
    if (/DELETE/i.test(body)) {
      outline += '  // TODO: Implement DELETE operation\n';
      outline += '  // await prisma.table.delete({ where: {...} })\n';
    }
    if (/IF\s*@/i.test(body)) {
      outline += '  // TODO: Implement conditional logic\n';
    }
    if (/WHILE/i.test(body)) {
      outline += '  // TODO: Implement loop logic (consider refactoring)\n';
    }
    if (/CURSOR/i.test(body)) {
      outline += '  // WARNING: CURSOR detected - consider set-based operations\n';
    }
    if (/sp_executesql|EXEC\s*\(/i.test(body)) {
      outline += '  // WARNING: Dynamic SQL detected - review for injection risks\n';
    }

    outline += '\n  throw new Error("Not implemented")\n';
    outline += '}\n';

    return outline;
  }

  /**
   * Convert views
   */
  private convertViews(ddl: string): ConvertedView[] {
    const views: ConvertedView[] = [];

    const viewRegex = /CREATE\s+VIEW\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s+AS\s+([\s\S]*?)(?=GO|CREATE\s+VIEW|$)/gi;
    let match;

    while ((match = viewRegex.exec(ddl)) !== null) {
      const viewName = match[2];
      const body = match[3];

      const convertedBody = this.convertViewBody(body);

      views.push({
        name: viewName,
        postgresDDL: `CREATE OR REPLACE VIEW ${this.toSnakeCase(viewName)} AS\n${convertedBody}`,
        warnings: [],
      });
    }

    return views;
  }

  /**
   * Convert view body
   */
  private convertViewBody(body: string): string {
    let converted = body;

    // Convert TOP n to LIMIT n
    converted = converted.replace(/TOP\s+(\d+)\s+/gi, '');

    // Convert function calls
    for (const [sql, pg] of Object.entries(FUNCTION_MAPPINGS)) {
      converted = converted.replace(new RegExp(sql.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), pg);
    }

    // Convert brackets to double quotes
    converted = converted.replace(/\[([^\]]+)\]/g, '"$1"');

    // Handle TOP with ORDER BY
    const topMatch = body.match(/TOP\s+(\d+)/i);
    if (topMatch) {
      converted = converted + `\nLIMIT ${topMatch[1]}`;
    }

    return converted;
  }

  /**
   * Generate PostgreSQL DDL
   */
  generatePostgreSQLDDL(tables: ConvertedTable[]): string {
    let ddl = '-- Auto-generated PostgreSQL DDL from SQL Server\n\n';

    for (const table of tables) {
      ddl += `-- Table: ${table.postgresName} (was ${table.originalName})\n`;
      ddl += `CREATE TABLE "${table.postgresName}" (\n`;

      const columnDefs: string[] = [];

      for (const col of table.columns) {
        let def = `  "${col.postgresName}" ${col.postgresType}`;

        if (col.isIdentity) {
          def += ' GENERATED ALWAYS AS IDENTITY';
        } else if (!col.isNullable) {
          def += ' NOT NULL';
        }

        if (col.defaultValueConverted) {
          def += ` DEFAULT ${col.defaultValueConverted}`;
        }

        columnDefs.push(def);
      }

      // Primary key
      if (table.primaryKey.length > 0) {
        columnDefs.push(`  CONSTRAINT "PK_${table.postgresName}" PRIMARY KEY (${table.primaryKey.map(pk => `"${this.toSnakeCase(pk)}"`).join(', ')})`);
      }

      ddl += columnDefs.join(',\n');
      ddl += '\n);\n\n';

      // Foreign keys
      for (const fk of table.foreignKeys) {
        ddl += `ALTER TABLE "${table.postgresName}" ADD CONSTRAINT "${fk.name}" `;
        ddl += `FOREIGN KEY (${fk.columns.map(c => `"${this.toSnakeCase(c)}"`).join(', ')}) `;
        ddl += `REFERENCES "${this.toSnakeCase(fk.referencesTable)}" (${fk.referencesColumns.map(c => `"${this.toSnakeCase(c)}"`).join(', ')});\n`;
      }

      if (table.foreignKeys.length > 0) ddl += '\n';

      // Constraints
      for (const constraint of table.constraints) {
        ddl += `ALTER TABLE "${table.postgresName}" ADD ${constraint.postgresDDL};\n`;
      }

      if (table.constraints.length > 0) ddl += '\n';

      ddl += '\n';
    }

    return ddl;
  }

  /**
   * Generate Prisma schema
   */
  generatePrismaSchema(tables: ConvertedTable[]): string {
    let schema = '// Auto-generated Prisma schema from SQL Server\n\n';
    schema += 'generator client {\n  provider = "prisma-client-js"\n}\n\n';
    schema += 'datasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}\n\n';

    for (const table of tables) {
      schema += `model ${table.prismaName} {\n`;

      for (const col of table.columns) {
        let line = `  ${col.prismaName.padEnd(20)} ${col.prismaType}`;

        if (col.isIdentity) {
          line += ' @id @default(autoincrement())';
        } else if (col.isPrimaryKey && table.primaryKey.length === 1) {
          line += ' @id';
        } else if (col.defaultValueConverted && !col.isNullable) {
          line += ` @default(${col.defaultValueConverted})`;
        }

        if (!col.isNullable && !col.isPrimaryKey && !col.isIdentity) {
          line += ' @notNull';
        }

        schema += line + '\n';
      }

      // Add @@index for foreign keys
      for (const fk of table.foreignKeys) {
        schema += `  @@index([${fk.columns.map(c => this.toCamelCase(c)).join(', ')}])\n`;
      }

      schema += `  @@map("${table.postgresName}")\n`;
      schema += '}\n\n';
    }

    return schema;
  }

  /**
   * Log type conversion
   */
  private logTypeConversion(original: string, converted: string): void {
    const key = `${original}→${converted}`;
    const existing = this.typeConversionLog.get(key);

    if (existing) {
      existing.count++;
    } else {
      this.typeConversionLog.set(key, { original, converted, count: 1 });
    }
  }

  /**
   * Convert to snake_case
   */
  private toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '')
      .replace(/_+/g, '_');
  }

  /**
   * Convert to camelCase
   */
  private toCamelCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
      .replace(/^(.)/, c => c.toLowerCase());
  }

  /**
   * Convert to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
      .replace(/^(.)/, c => c.toUpperCase());
  }
}

// Export singleton instance
export const dbConverter = new DBConverter();
