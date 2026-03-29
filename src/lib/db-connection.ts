// =============================================================================
// Schema Toolkit - Database Connection & Introspection
// =============================================================================

import { TableDef, ColumnDef, ForeignKeyDef, IndexDef, ParseResult, ParseStats, StoredProcedureDef } from './types';

/**
 * Supported database types
 */
export type DatabaseType = 'sqlserver' | 'mysql' | 'postgresql' | 'sqlite';

/**
 * Database connection configuration
 */
export interface DatabaseConnectionConfig {
  type: DatabaseType;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database: string;
  schema?: string; // For PostgreSQL
  ssl?: boolean;
  connectionTimeout?: number;
}

/**
 * Connection test result
 */
export interface ConnectionTestResult {
  success: boolean;
  message: string;
  serverVersion?: string;
  databaseSize?: string;
  tableCount?: number;
  error?: string;
}

/**
 * Database introspection result
 */
export interface IntrospectionResult {
  tables: TableDef[];
  views: TableDef[];
  storedProcedures: StoredProcedureDef[];
  functions: StoredProcedureDef[];
  triggers: TriggerDef[];
  sequences: SequenceDef[];
  enums: EnumDef[];
  stats: IntrospectionStats;
}

/**
 * Trigger definition
 */
export interface TriggerDef {
  name: string;
  tableName: string;
  timing: 'BEFORE' | 'AFTER' | 'INSTEAD OF';
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  body: string;
  enabled: boolean;
}

/**
 * Sequence definition (PostgreSQL/Oracle)
 */
export interface SequenceDef {
  name: string;
  startValue: number;
  increment: number;
  minValue?: number;
  maxValue?: number;
  cycle: boolean;
}

/**
 * Enum definition (PostgreSQL)
 */
export interface EnumDef {
  name: string;
  schema: string;
  values: string[];
}

/**
 * Introspection statistics
 */
export interface IntrospectionStats {
  totalTables: number;
  totalViews: number;
  totalColumns: number;
  totalForeignKeys: number;
  totalIndexes: number;
  totalStoredProcedures: number;
  totalFunctions: number;
  totalTriggers: number;
  introspectionTimeMs: number;
  databaseType: DatabaseType;
  serverVersion: string;
}

/**
 * SQL type mapping to universal types
 */
export interface SQLTypeMapping {
  universalType: string;
  nativeTypes: string[];
  prismaType: string;
  javascriptType: string;
}

/**
 * SQL type mappings by database
 */
export const SQL_TYPE_MAPPINGS: Record<DatabaseType, Record<string, SQLTypeMapping>> = {
  sqlserver: {
    // Strings
    'NVARCHAR': { universalType: 'VARCHAR', nativeTypes: ['NVARCHAR', 'VARCHAR', 'NCHAR', 'CHAR', 'TEXT', 'NTEXT'], prismaType: 'String', javascriptType: 'string' },
    'VARCHAR': { universalType: 'VARCHAR', nativeTypes: ['VARCHAR', 'NVARCHAR'], prismaType: 'String', javascriptType: 'string' },
    'CHAR': { universalType: 'CHAR', nativeTypes: ['CHAR', 'NCHAR'], prismaType: 'String', javascriptType: 'string' },
    'TEXT': { universalType: 'TEXT', nativeTypes: ['TEXT', 'NTEXT'], prismaType: 'String', javascriptType: 'string' },
    
    // Numbers
    'INT': { universalType: 'INT', nativeTypes: ['INT', 'INTEGER'], prismaType: 'Int', javascriptType: 'number' },
    'BIGINT': { universalType: 'BIGINT', nativeTypes: ['BIGINT'], prismaType: 'BigInt', javascriptType: 'bigint' },
    'SMALLINT': { universalType: 'SMALLINT', nativeTypes: ['SMALLINT', 'TINYINT'], prismaType: 'Int', javascriptType: 'number' },
    'TINYINT': { universalType: 'TINYINT', nativeTypes: ['TINYINT'], prismaType: 'Int', javascriptType: 'number' },
    'DECIMAL': { universalType: 'DECIMAL', nativeTypes: ['DECIMAL', 'NUMERIC'], prismaType: 'Decimal', javascriptType: 'number' },
    'NUMERIC': { universalType: 'DECIMAL', nativeTypes: ['NUMERIC', 'DECIMAL'], prismaType: 'Decimal', javascriptType: 'number' },
    'FLOAT': { universalType: 'FLOAT', nativeTypes: ['FLOAT', 'REAL'], prismaType: 'Float', javascriptType: 'number' },
    'MONEY': { universalType: 'MONEY', nativeTypes: ['MONEY', 'SMALLMONEY'], prismaType: 'Decimal', javascriptType: 'number' },
    
    // Boolean
    'BIT': { universalType: 'BOOLEAN', nativeTypes: ['BIT'], prismaType: 'Boolean', javascriptType: 'boolean' },
    
    // Date/Time
    'DATETIME': { universalType: 'DATETIME', nativeTypes: ['DATETIME', 'DATETIME2', 'SMALLDATETIME'], prismaType: 'DateTime', javascriptType: 'Date' },
    'DATE': { universalType: 'DATE', nativeTypes: ['DATE'], prismaType: 'DateTime', javascriptType: 'Date' },
    'TIME': { universalType: 'TIME', nativeTypes: ['TIME'], prismaType: 'DateTime', javascriptType: 'Date' },
    'DATETIMEOFFSET': { universalType: 'DATETIMEOFFSET', nativeTypes: ['DATETIMEOFFSET'], prismaType: 'DateTime', javascriptType: 'Date' },
    
    // Binary
    'VARBINARY': { universalType: 'VARBINARY', nativeTypes: ['VARBINARY', 'BINARY', 'IMAGE'], prismaType: 'Bytes', javascriptType: 'Buffer' },
    'IMAGE': { universalType: 'IMAGE', nativeTypes: ['IMAGE'], prismaType: 'Bytes', javascriptType: 'Buffer' },
    
    // Unique Identifier
    'UNIQUEIDENTIFIER': { universalType: 'UUID', nativeTypes: ['UNIQUEIDENTIFIER'], prismaType: 'String', javascriptType: 'string' },
    
    // XML
    'XML': { universalType: 'XML', nativeTypes: ['XML'], prismaType: 'String', javascriptType: 'string' },
  },
  
  mysql: {
    // Strings
    'VARCHAR': { universalType: 'VARCHAR', nativeTypes: ['VARCHAR', 'CHAR', 'TEXT', 'TINYTEXT', 'MEDIUMTEXT', 'LONGTEXT'], prismaType: 'String', javascriptType: 'string' },
    'CHAR': { universalType: 'CHAR', nativeTypes: ['CHAR', 'VARCHAR'], prismaType: 'String', javascriptType: 'string' },
    'TEXT': { universalType: 'TEXT', nativeTypes: ['TEXT', 'TINYTEXT', 'MEDIUMTEXT', 'LONGTEXT'], prismaType: 'String', javascriptType: 'string' },
    'ENUM': { universalType: 'ENUM', nativeTypes: ['ENUM', 'SET'], prismaType: 'String', javascriptType: 'string' },
    
    // Numbers
    'INT': { universalType: 'INT', nativeTypes: ['INT', 'INTEGER', 'MEDIUMINT'], prismaType: 'Int', javascriptType: 'number' },
    'BIGINT': { universalType: 'BIGINT', nativeTypes: ['BIGINT'], prismaType: 'BigInt', javascriptType: 'bigint' },
    'SMALLINT': { universalType: 'SMALLINT', nativeTypes: ['SMALLINT'], prismaType: 'Int', javascriptType: 'number' },
    'TINYINT': { universalType: 'TINYINT', nativeTypes: ['TINYINT'], prismaType: 'Int', javascriptType: 'number' },
    'DECIMAL': { universalType: 'DECIMAL', nativeTypes: ['DECIMAL', 'NUMERIC'], prismaType: 'Decimal', javascriptType: 'number' },
    'FLOAT': { universalType: 'FLOAT', nativeTypes: ['FLOAT', 'DOUBLE'], prismaType: 'Float', javascriptType: 'number' },
    'DOUBLE': { universalType: 'DOUBLE', nativeTypes: ['DOUBLE', 'FLOAT'], prismaType: 'Float', javascriptType: 'number' },
    
    // Boolean
    'BOOLEAN': { universalType: 'BOOLEAN', nativeTypes: ['BOOLEAN', 'BOOL', 'TINYINT(1)'], prismaType: 'Boolean', javascriptType: 'boolean' },
    
    // Date/Time
    'DATETIME': { universalType: 'DATETIME', nativeTypes: ['DATETIME'], prismaType: 'DateTime', javascriptType: 'Date' },
    'DATE': { universalType: 'DATE', nativeTypes: ['DATE'], prismaType: 'DateTime', javascriptType: 'Date' },
    'TIME': { universalType: 'TIME', nativeTypes: ['TIME'], prismaType: 'DateTime', javascriptType: 'Date' },
    'TIMESTAMP': { universalType: 'TIMESTAMP', nativeTypes: ['TIMESTAMP'], prismaType: 'DateTime', javascriptType: 'Date' },
    'YEAR': { universalType: 'YEAR', nativeTypes: ['YEAR'], prismaType: 'Int', javascriptType: 'number' },
    
    // Binary
    'BLOB': { universalType: 'BLOB', nativeTypes: ['BLOB', 'TINYBLOB', 'MEDIUMBLOB', 'LONGBLOB', 'BINARY', 'VARBINARY'], prismaType: 'Bytes', javascriptType: 'Buffer' },
    'BINARY': { universalType: 'BINARY', nativeTypes: ['BINARY', 'VARBINARY'], prismaType: 'Bytes', javascriptType: 'Buffer' },
    
    // JSON
    'JSON': { universalType: 'JSON', nativeTypes: ['JSON'], prismaType: 'Json', javascriptType: 'object' },
  },
  
  postgresql: {
    // Strings
    'VARCHAR': { universalType: 'VARCHAR', nativeTypes: ['VARCHAR', 'CHARACTER VARYING', 'CHAR', 'CHARACTER', 'TEXT'], prismaType: 'String', javascriptType: 'string' },
    'CHAR': { universalType: 'CHAR', nativeTypes: ['CHAR', 'CHARACTER'], prismaType: 'String', javascriptType: 'string' },
    'TEXT': { universalType: 'TEXT', nativeTypes: ['TEXT'], prismaType: 'String', javascriptType: 'string' },
    
    // Numbers
    'INTEGER': { universalType: 'INT', nativeTypes: ['INTEGER', 'INT', 'INT4', 'SERIAL', 'SMALLSERIAL'], prismaType: 'Int', javascriptType: 'number' },
    'BIGINT': { universalType: 'BIGINT', nativeTypes: ['BIGINT', 'INT8', 'BIGSERIAL'], prismaType: 'BigInt', javascriptType: 'bigint' },
    'SMALLINT': { universalType: 'SMALLINT', nativeTypes: ['SMALLINT', 'INT2'], prismaType: 'Int', javascriptType: 'number' },
    'DECIMAL': { universalType: 'DECIMAL', nativeTypes: ['DECIMAL', 'NUMERIC'], prismaType: 'Decimal', javascriptType: 'number' },
    'REAL': { universalType: 'FLOAT', nativeTypes: ['REAL', 'FLOAT4'], prismaType: 'Float', javascriptType: 'number' },
    'DOUBLE': { universalType: 'DOUBLE', nativeTypes: ['DOUBLE PRECISION', 'FLOAT8'], prismaType: 'Float', javascriptType: 'number' },
    
    // Boolean
    'BOOLEAN': { universalType: 'BOOLEAN', nativeTypes: ['BOOLEAN', 'BOOL'], prismaType: 'Boolean', javascriptType: 'boolean' },
    
    // Date/Time
    'TIMESTAMP': { universalType: 'TIMESTAMP', nativeTypes: ['TIMESTAMP', 'TIMESTAMP WITHOUT TIME ZONE'], prismaType: 'DateTime', javascriptType: 'Date' },
    'TIMESTAMPTZ': { universalType: 'TIMESTAMPTZ', nativeTypes: ['TIMESTAMPTZ', 'TIMESTAMP WITH TIME ZONE'], prismaType: 'DateTime', javascriptType: 'Date' },
    'DATE': { universalType: 'DATE', nativeTypes: ['DATE'], prismaType: 'DateTime', javascriptType: 'Date' },
    'TIME': { universalType: 'TIME', nativeTypes: ['TIME', 'TIME WITHOUT TIME ZONE'], prismaType: 'DateTime', javascriptType: 'Date' },
    'TIMETZ': { universalType: 'TIMETZ', nativeTypes: ['TIMETZ', 'TIME WITH TIME ZONE'], prismaType: 'DateTime', javascriptType: 'Date' },
    
    // Binary
    'BYTEA': { universalType: 'BYTEA', nativeTypes: ['BYTEA'], prismaType: 'Bytes', javascriptType: 'Buffer' },
    
    // UUID
    'UUID': { universalType: 'UUID', nativeTypes: ['UUID'], prismaType: 'String', javascriptType: 'string' },
    
    // JSON
    'JSON': { universalType: 'JSON', nativeTypes: ['JSON', 'JSONB'], prismaType: 'Json', javascriptType: 'object' },
    
    // Arrays
    'ARRAY': { universalType: 'ARRAY', nativeTypes: ['ARRAY', '[]'], prismaType: 'Json', javascriptType: 'array' },
    
    // Network types
    'INET': { universalType: 'INET', nativeTypes: ['INET', 'CIDR'], prismaType: 'String', javascriptType: 'string' },
    'MACADDR': { universalType: 'MACADDR', nativeTypes: ['MACADDR', 'MACADDR8'], prismaType: 'String', javascriptType: 'string' },
    
    // Geometry
    'GEOMETRY': { universalType: 'GEOMETRY', nativeTypes: ['GEOMETRY', 'GEOGRAPHY', 'POINT', 'LINE', 'LSEG', 'BOX', 'PATH', 'POLYGON', 'CIRCLE'], prismaType: 'Json', javascriptType: 'object' },
  },
  
  sqlite: {
    // SQLite uses dynamic typing but these are common type affinities
    'TEXT': { universalType: 'TEXT', nativeTypes: ['TEXT', 'VARCHAR', 'CHAR', 'CLOB'], prismaType: 'String', javascriptType: 'string' },
    'INTEGER': { universalType: 'INT', nativeTypes: ['INTEGER', 'INT', 'TINYINT', 'SMALLINT', 'MEDIUMINT', 'BIGINT'], prismaType: 'Int', javascriptType: 'number' },
    'REAL': { universalType: 'FLOAT', nativeTypes: ['REAL', 'DOUBLE', 'FLOAT'], prismaType: 'Float', javascriptType: 'number' },
    'BLOB': { universalType: 'BLOB', nativeTypes: ['BLOB'], prismaType: 'Bytes', javascriptType: 'Buffer' },
    'NUMERIC': { universalType: 'DECIMAL', nativeTypes: ['NUMERIC', 'DECIMAL', 'BOOLEAN', 'DATE', 'DATETIME'], prismaType: 'Decimal', javascriptType: 'number' },
  },
};

/**
 * Normalize SQL type to universal type
 */
export function normalizeSQLType(
  nativeType: string,
  dbType: DatabaseType
): { universalType: string; prismaType: string; javascriptType: string } {
  const upperType = nativeType.toUpperCase().split('(')[0].trim();
  const mappings = SQL_TYPE_MAPPINGS[dbType];
  
  // Look for direct match
  for (const [key, mapping] of Object.entries(mappings)) {
    if (key === upperType || mapping.nativeTypes.includes(upperType)) {
      return {
        universalType: mapping.universalType,
        prismaType: mapping.prismaType,
        javascriptType: mapping.javascriptType,
      };
    }
  }
  
  // Default to String
  return {
    universalType: upperType,
    prismaType: 'String',
    javascriptType: 'string',
  };
}

/**
 * Get database default port
 */
export function getDefaultPort(dbType: DatabaseType): number {
  switch (dbType) {
    case 'sqlserver':
      return 1433;
    case 'mysql':
      return 3306;
    case 'postgresql':
      return 5432;
    case 'sqlite':
      return 0; // SQLite doesn't use ports
    default:
      return 0;
  }
}

/**
 * Build connection string from config
 */
export function buildConnectionString(config: DatabaseConnectionConfig): string {
  switch (config.type) {
    case 'sqlserver':
      return `Server=${config.host},${config.port || 1433};Database=${config.database};User Id=${config.username};Password=${config.password};TrustServerCertificate=True;`;
    
    case 'mysql':
      return `mysql://${config.username}:${config.password}@${config.host}:${config.port || 3306}/${config.database}`;
    
    case 'postgresql':
      const sslParam = config.ssl ? '?ssl=true' : '';
      const schemaParam = config.schema ? `?schema=${config.schema}` : '';
      return `postgresql://${config.username}:${config.password}@${config.host}:${config.port || 5432}/${config.database}${sslParam || schemaParam}`;
    
    case 'sqlite':
      return `file:${config.database}`;
    
    default:
      throw new Error(`Unsupported database type: ${config.type}`);
  }
}

/**
 * Database introspector base class
 */
export abstract class DatabaseIntrospector {
  protected config: DatabaseConnectionConfig;
  
  constructor(config: DatabaseConnectionConfig) {
    this.config = config;
  }
  
  abstract testConnection(): Promise<ConnectionTestResult>;
  abstract introspect(): Promise<IntrospectionResult>;
  abstract getTableList(): Promise<string[]>;
  abstract getTableSchema(tableName: string): Promise<TableDef>;
  abstract getStoredProcedures(): Promise<StoredProcedureDef[]>;
  abstract getViews(): Promise<TableDef[]>;
  abstract getIndexes(tableName: string): Promise<IndexDef[]>;
}

/**
 * Parse result from DDL (string-based parsing)
 */
export function parseDDLToResult(ddl: string, dbType: DatabaseType): ParseResult {
  const startTime = Date.now();
  
  // Import parsers dynamically based on type
  let tables: TableDef[] = [];
  let storedProcedures: StoredProcedureDef[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    switch (dbType) {
      case 'sqlserver':
        // Use existing SQL Server parser
        const { parseSqlServer } = require('./sql-parser');
        const result = parseSqlServer(ddl);
        tables = result.tables;
        storedProcedures = result.storedProcedures;
        errors.push(...result.errors);
        warnings.push(...result.warnings);
        break;
      
      case 'mysql':
        const { parseMySQL } = require('./mysql-parser');
        const mysqlResult = parseMySQL(ddl);
        tables = mysqlResult.tables;
        storedProcedures = mysqlResult.storedProcedures;
        errors.push(...mysqlResult.errors);
        warnings.push(...mysqlResult.warnings);
        break;
      
      case 'postgresql':
        const { parsePostgreSQL } = require('./postgresql-parser');
        const pgResult = parsePostgreSQL(ddl);
        tables = pgResult.tables;
        storedProcedures = pgResult.storedProcedures;
        errors.push(...pgResult.errors);
        warnings.push(...pgResult.warnings);
        break;
      
      default:
        errors.push(`Unsupported database type: ${dbType}`);
    }
  } catch (error) {
    errors.push(`Parse error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  const stats: ParseStats = {
    totalTables: tables.length,
    totalColumns: tables.reduce((a, t) => a + t.columns.length, 0),
    totalForeignKeys: tables.reduce((a, t) => a + t.foreignKeys.length, 0),
    totalStoredProcedures: storedProcedures.length,
    parseTimeMs: Date.now() - startTime,
  };
  
  return { tables, storedProcedures, errors, warnings, stats };
}

/**
 * Detect database type from DDL content
 */
export function detectDatabaseType(ddl: string): DatabaseType {
  const upperDDL = ddl.toUpperCase();
  
  // SQL Server specific patterns
  if (
    upperDDL.includes('UNIQUEIDENTIFIER') ||
    upperDDL.includes('NVARCHAR') ||
    upperDDL.includes('NCHAR') ||
    upperDDL.includes('[DBO].') ||
    upperDDL.includes('IDENTITY(1,1)') ||
    upperDDL.includes('GETDATE()') ||
    upperDDL.includes('NEWID()') ||
    upperDDL.includes('GO\n') ||
    /CREATE\s+PROC(?:EDURE)?\s+\[?dbo\]?/i.test(ddl)
  ) {
    return 'sqlserver';
  }
  
  // MySQL specific patterns
  if (
    upperDDL.includes('AUTO_INCREMENT') ||
    upperDDL.includes('ENGINE=') ||
    upperDDL.includes('ENGINE =') ||
    upperDDL.includes('TINYINT(1)') ||
    upperDDL.includes('MEDIUMTEXT') ||
    upperDDL.includes('LONGTEXT') ||
    upperDDL.includes('`') && upperDDL.includes('`') ||
    /CREATE\s+TABLE\s+`/i.test(ddl)
  ) {
    return 'mysql';
  }
  
  // PostgreSQL specific patterns
  if (
    upperDDL.includes('SERIAL') ||
    upperDDL.includes('BIGSERIAL') ||
    upperDDL.includes('BYTEA') ||
    upperDDL.includes('TIMESTAMPTZ') ||
    upperDDL.includes('JSONB') ||
    upperDDL.includes('UUID') ||
    upperDDL.includes('RETURNING') ||
    /CREATE\s+TABLE\s+(?:public|schema)\./i.test(ddl) ||
    /CREATE\s+TYPE\s+/i.test(ddl) ||
    /CREATE\s+FUNCTION\s+/i.test(ddl) && upperDDL.includes('RETURNS')
  ) {
    return 'postgresql';
  }
  
  // SQLite patterns
  if (
    upperDDL.includes('AUTOINCREMENT') ||
    upperDDL.includes('WITHOUT ROWID') ||
    /^:\s*sqlite/i.test(ddl)
  ) {
    return 'sqlite';
  }
  
  // Default to SQL Server for generic DDL
  return 'sqlserver';
}
